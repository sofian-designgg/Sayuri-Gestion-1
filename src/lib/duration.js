/** Ex. 10m, 2h, 30s, 1d — max 28 jours (Discord timeout) */
function parseDurationMs(text) {
  if (!text) return null;
  const m = /^(\d+)\s*([smhd])$/i.exec(String(text).trim());
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const u = m[2].toLowerCase();
  const mult = { s: 1000, m: 60 * 1000, h: 3600 * 1000, d: 86400 * 1000 };
  const ms = n * mult[u];
  const max = 28 * 24 * 3600 * 1000;
  if (ms > max) return max;
  return ms;
}

module.exports = { parseDurationMs };
