/**
 * alcoholCalculator.js — modèle pharmacocinétique de l'alcoolémie (aucune dépendance, aucun DOM).
 *
 * Modèle à deux compartiments :
 *
 *   ESTOMAC (S, en grammes) ──ka──▶ SANG / eau corporelle (A, en grammes) ──Michaelis-Menten──▶ éliminé
 *                          └─(1-F)─▶ métabolisme de premier passage (ADH gastrique + foie)
 *
 *  • Absorption : cinétique d'ordre 1 (décroissance exponentielle du contenu gastrique),
 *    dS/dt = -ka·S. La constante ka dépend du remplissage de l'estomac : à jeun la demi-vie
 *    d'absorption est de ~7 min (pic en 30-45 min), après un repas copieux de ~35 min (pic en 1h30-2h).
 *  • Biodisponibilité F : une partie de l'alcool est détruite avant d'atteindre la circulation
 *    (premier passage). Elle augmente quand l'estomac est plein. L'ADH gastrique est moins active
 *    chez la femme, d'où un F un peu plus élevé.
 *  • Diffusion (Widmark) : l'éthanol se répartit dans l'eau totale du corps. On calcule l'eau totale
 *    (TBW) avec les équations de Watson (sexe, poids, taille, âge), puis le volume de distribution
 *    exprimé en litres de sang : Vd = TBW / 0,80 (le sang contient ~80 % d'eau).
 *    On retrouve le coefficient de Widmark r = Vd / poids (≈ 0,7 chez l'homme, ≈ 0,6 chez la femme).
 *    Alcoolémie (g/L de sang) : C = A / Vd.
 *  • Élimination : cinétique de Michaelis-Menten, -dC/dt = Vmax·C / (Km + C).
 *    Au-dessus de ~0,3 g/L elle est quasi constante (ordre 0, le β de Widmark ≈ 0,15 g/L/h),
 *    près de zéro elle devient exponentielle : la queue de courbe « logarithmique ».
 *  • Vomissement : il n'agit QUE sur le compartiment estomac. L'alcool déjà passé dans le sang reste.
 *
 * Sources des constantes : Widmark (1932) ; Watson et al. (1980) ; Jones A.W., « Evidence-based
 * survey of the elimination rates of ethanol from blood » (2010) ; Wilkinson et al. (1977) pour Km ;
 * Jones & Jönsson (1994) pour l'effet du repas ; Frezza et al. (1990) pour l'ADH gastrique.
 * Valeurs moyennes de population : la variabilité individuelle réelle est de ±20-30 %.
 *
 * Chargement : script classique, pour que la page fonctionne aussi ouverte en double-clic (file://),
 * où Chrome bloque les modules ES locaux.
 *   Navigateur : <script src="alcoholCalculator.js"></script> puis window.AlcoholCalculator
 *   Node       : const { AlcoholSimulation } = require('./alcoholCalculator.js')
 */
(function (root) {
  'use strict';

  const ETHANOL_DENSITY = 0.789;      // g/mL
  const BLOOD_WATER_FRACTION = 0.80;  // L d'eau par L de sang
  const STANDARD_DRINK_GRAMS = 10;    // « verre standard » français

  /** Seuils réglementaires (France) et cliniques, en g/L de sang. */
  const LIMITS = { probation: 0.2, legal: 0.5, offence: 0.8 };
  const THRESHOLDS = { legal: 0.5, dance: 1.0, stagger: 1.5, vomit: 2.0, coma: 3.0 };

  /** Remplissage de l'estomac : ka en h⁻¹, F = biodisponibilité. */
  const STOMACH = {
    empty: { label: 'À jeun', ka: 6.0, bioavailability: 0.95 },
    light: { label: 'Repas léger', ka: 2.5, bioavailability: 0.85 },
    full:  { label: 'Repas copieux', ka: 1.2, bioavailability: 0.75 },
  };

  /** Élimination : Vmax en g/L/h (≈ β de Widmark), Km en g/L. */
  const ELIMINATION = { male: 0.15, female: 0.17, km: 0.08 };

  /** Part du contenu gastrique évacuée par un vomissement. */
  const VOMIT_EFFICIENCY = 0.7;

  const pureAlcoholGrams = (ml, abv) => ml * abv * ETHANOL_DENSITY;
  const standardDrinks = (grams) => grams / STANDARD_DRINK_GRAMS;

  /** Catalogue de consommations courantes (volumes servis en bar, titres moyens). */
  const DRINKS = [
    { id: 'beer',     label: 'Bière',     detail: '33 cl · 5 %',  ml: 330, abv: 0.05 },
    { id: 'pint',     label: 'Pinte',     detail: '50 cl · 5 %',  ml: 500, abv: 0.05 },
    { id: 'wine',     label: 'Vin',       detail: '12 cl · 12,5 %', ml: 120, abv: 0.125 },
    { id: 'champ',    label: 'Champagne', detail: '10 cl · 12 %', ml: 100, abv: 0.12 },
    { id: 'shot',     label: 'Shot',      detail: '3 cl · 40 %',  ml: 30,  abv: 0.40 },
    { id: 'cocktail', label: 'Cocktail',  detail: '20 cl · 10 %', ml: 200, abv: 0.10 },
  ].map(d => ({ ...d, grams: pureAlcoholGrams(d.ml, d.abv) }));

  /** Eau corporelle totale (L) — équations de Watson. */
  function totalBodyWater({ sex, weight, height, age }) {
    return sex === 'female'
      ? -2.097 + 0.1069 * height + 0.2466 * weight
      : 2.447 - 0.09516 * age + 0.1074 * height + 0.3362 * weight;
  }

  /** Volume de distribution exprimé en litres de sang. */
  const distributionVolume = (profile) => totalBodyWater(profile) / BLOOD_WATER_FRACTION;

  /** Coefficient de diffusion de Widmark r (L/kg). */
  const widmarkFactor = (profile) => distributionVolume(profile) / profile.weight;

  /** Vitesse d'élimination (g/L/h) pour une concentration donnée. */
  function eliminationRate(concentration, sex) {
    const vmax = sex === 'female' ? ELIMINATION.female : ELIMINATION.male;
    return vmax * concentration / (ELIMINATION.km + concentration);
  }

  const DEFAULT_PROFILE = { sex: 'male', weight: 75, height: 178, age: 30 };

  const SUBSTEP_H = 1 / 120; // pas d'intégration interne : 30 s simulées

  class AlcoholSimulation {
    constructor(profile = DEFAULT_PROFILE, stomach = 'light') {
      this.profile = { ...DEFAULT_PROFILE, ...profile };
      this.stomachState = stomach;
      this.reset();
    }

    reset() {
      this.stomach = 0;        // g d'éthanol encore dans l'estomac
      this.body = 0;           // g d'éthanol dans le sang / l'eau corporelle
      this.elapsed = 0;        // h simulées
      this.ingested = 0;       // g bus au total
      this.expelled = 0;       // g évacués par vomissement
      this.firstPass = 0;      // g détruits au premier passage
      this.eliminated = 0;     // g éliminés par le foie
      this.maxBlood = 0;
    }

    /** Changer de profil conserve les grammes : seule la concentration est recalculée. */
    setProfile(profile) { this.profile = { ...this.profile, ...profile }; }
    setStomach(state) { if (STOMACH[state]) this.stomachState = state; }

    get volume() { return distributionVolume(this.profile); }
    get widmark() { return widmarkFactor(this.profile); }
    get ka() { return STOMACH[this.stomachState].ka; }
    get bioavailability() {
      const f = STOMACH[this.stomachState].bioavailability;
      return Math.min(1, this.profile.sex === 'female' ? f + 0.03 : f);
    }
    get vmax() { return this.profile.sex === 'female' ? ELIMINATION.female : ELIMINATION.male; }

    /** Alcoolémie actuelle, g/L de sang. */
    get blood() { return this.body / this.volume; }
    /** Alcool encore dans l'estomac, g. */
    get stomachGrams() { return this.stomach; }
    /** Hausse d'alcoolémie maximale que l'estomac peut encore produire (sans élimination). */
    get pendingBlood() { return this.stomach * this.bioavailability / this.volume; }

    drink(grams) {
      this.stomach += grams;
      this.ingested += grams;
    }

    /** Vide l'estomac d'une fraction `efficiency`. Le sang n'est pas touché. */
    vomit(efficiency = VOMIT_EFFICIENCY) {
      const expelled = this.stomach * efficiency;
      this.stomach -= expelled;
      this.expelled += expelled;
      return { expelled, remaining: this.stomach, blood: this.blood };
    }

    /** Avance la simulation de `hours` heures. */
    step(hours) {
      let left = hours;
      while (left > 1e-9) {
        const dt = Math.min(SUBSTEP_H, left);
        this._integrate(dt);
        left -= dt;
      }
      this.elapsed += hours;
      this.maxBlood = Math.max(this.maxBlood, this.blood);
    }

    _integrate(dt) {
      const V = this.volume;
      // absorption exacte d'ordre 1 sur le pas
      const absorbed = this.stomach * (1 - Math.exp(-this.ka * dt));
      this.stomach -= absorbed;
      const F = this.bioavailability;
      this.body += absorbed * F;
      this.firstPass += absorbed * (1 - F);
      // élimination Michaelis-Menten (en grammes)
      const c = this.body / V;
      const out = Math.min(this.body, eliminationRate(c, this.profile.sex) * V * dt);
      this.body -= out;
      this.eliminated += out;
      if (this.stomach < 1e-6) this.stomach = 0;
    }

    /**
     * Projette le futur sans rien boire de plus.
     * Renvoie (durées en heures) :
     *   peak       alcoolémie maximale qui sera atteinte (≥ actuelle)
     *   peakIn     dans combien de temps
     *   exceedIn   quand l'alcoolémie dépassera 0,5 g/L (null si jamais ou déjà au-dessus)
     *   legalIn    quand elle repassera durablement sous 0,5 g/L (0 si jamais au-dessus)
     *   soberIn    quand elle sera ~nulle (< 0,01 g/L, estomac vide)
     */
    project({ horizon = 48, dt = 1 / 60 } = {}) {
      const p = Object.create(AlcoholSimulation.prototype);
      Object.assign(p, this, { profile: this.profile });
      const legal = LIMITS.legal;
      let peak = p.blood, peakIn = 0, exceedIn = null, legalIn = 0, soberIn = null;
      let above = peak >= legal;
      for (let t = dt; t <= horizon; t += dt) {
        p._integrate(dt);
        const c = p.blood;
        if (c > peak) { peak = c; peakIn = t; }
        if (!above && c >= legal) { above = true; if (exceedIn === null) exceedIn = t; }
        if (above && c < legal) { above = false; legalIn = t; }
        if (c < 0.01 && p.stomach < 0.05) { soberIn = t; break; }
      }
      if (above) legalIn = horizon;
      if (soberIn === null) soberIn = horizon;
      return { peak, peakIn, exceedIn, legalIn, soberIn };
    }
  }

  const api = {
    ETHANOL_DENSITY,
    BLOOD_WATER_FRACTION,
    STANDARD_DRINK_GRAMS,
    LIMITS,
    THRESHOLDS,
    STOMACH,
    ELIMINATION,
    VOMIT_EFFICIENCY,
    pureAlcoholGrams,
    standardDrinks,
    DRINKS,
    totalBodyWater,
    distributionVolume,
    widmarkFactor,
    eliminationRate,
    DEFAULT_PROFILE,
    AlcoholSimulation,
  };
  root.AlcoholCalculator = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
