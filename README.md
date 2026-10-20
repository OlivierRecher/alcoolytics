# Alcoolytics

Simulateur 3D d'alcoolémie : estomac, sang, élimination — et ce que l'alcool fait au corps.

Vanilla JS + [Three.js](https://threejs.org) (installé via npm, version figée `0.160.0`), bundlé avec [Vite](https://vite.dev).

## Démarrer

```bash
npm install
npm run dev       # serveur de dev sur http://localhost:5173
npm run build     # build de production dans dist/
npm run preview   # sert dist/ en local
```

Node ≥ 20.19 requis.

## Déployer sur Vercel

Le projet est détecté automatiquement (preset Vite, voir `vercel.json`) :

- import du dépôt sur vercel.com, **ou**
- `npx vercel` puis `npx vercel --prod` depuis ce dossier.

Build : `npm run build` · sortie : `dist/`. Les fichiers de `dist/assets/` sont hashés et servis avec un cache immuable.

## Architecture

```
index.html                  structure du HUD (panneau, alertes, textes)
public/favicon.svg
src/
  main.js                   point d'entrée : construit le monde, branche l'UI, boucle d'animation
  styles/                   CSS découpé par zone (ordre d'import significatif, voir index.css)

  core/
    alcoholCalculator.js    modèle pharmacocinétique pur (aucune dépendance, aucun DOM)

  engine/                   socle Three.js
    renderer.js             renderer, scène, caméra, lumières
    controls.js             OrbitControls
    viewport.js             cadrage caméra selon l'écran et le panneau (fit)
    time.js                 temps d'animation partagé

  world/                    décor statique
    constants.js            dimensions, positions, obstacles
    platform.js             bloc de terre, route (roadCurve), pelouse
    decor.js                bar, arbres, buissons, banc, herbe et fleurs
    bin.js                  poubelle (couvercle animé)
    lampPost.js             poteau (ressort quand la voiture le percute)

  game/                     logique de jeu
    state.js                simulation d'alcoolémie, stats, projection du pic
    character/
      rig.js                construction du personnage (homme / femme)
      animation.js          poses, ivresse, danse, titubation
      character.js          machine à états du personnage
    drinks/
      models.js             modèles 3D des verres
      drinking.js           servir / boire
      bottles.js            bouteilles au sol : physique, lancer, poubelle
    vomit.js                vomi et flaques
    car.js                  voiture, trajet sobre / ivre, accident
    effects.js              fumée, étoiles, anneau de coma
    dog.js, birds.js        ambiance
    history.js              annuler la dernière action
    actions.js              taps sur le perso / la voiture, réinitialisation

  input/
    pointer.js              raycasting et gestes (tap, maintien, glisser une bouteille)

  ui/                       DOM
    hud.js                  jauge, pic, estimations, compteurs
    drinkMenu.js            boutons « Servir un verre »
    settings.js             profil, estomac, boutons
    sheet.js                tiroir mobile à 3 crans
    hint.js, dom.js

  pwa/
    manifest.js             manifeste PWA et icônes générés à l'exécution
```

Chaque module 3D expose une fonction `createX()` (appelée une fois depuis `main.js`) et, s'il est animé, `updateX(dt)` (appelée à chaque frame).

## Temps accéléré

La simulation tourne en temps réel (1 s = 1 s). Pour retester le mode accéléré, décommenter les blocs marqués `[accéléré]` (`index.html`, `game/state.js`, `game/actions.js`, `ui/settings.js`, `ui/hud.js`, `main.js`).
