function msToHuman(ms) {
  if (ms < 1000) return '0 min';
  const sec = Math.floor(ms / 1000);
  const m = Math.floor(sec / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}j ${h % 24}h ${m % 60}min`;
  if (h > 0) return `${h}h ${m % 60}min`;
  return `${m} min`;
}

module.exports = { msToHuman };
