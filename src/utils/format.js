export const fmtG = (v) => v.toFixed(2);

export const fmtDur = (h) => {
  const m = Math.round(h * 60);
  if (m < 1) return '< 1 min';
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
};
