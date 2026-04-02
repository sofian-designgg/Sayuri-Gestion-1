const GuildConfig = require('../models/GuildConfig');

/** Violet Sayuri par défaut */
const DEFAULT_HEX = 0x9b59b6;

/**
 * @param {string} input ex. #a1b2c3 ou a1B2C3
 * @returns {number|null}
 */
function parseHexColor(input) {
  if (!input || typeof input !== 'string') return null;
  let s = input.trim();
  if (s.startsWith('#')) s = s.slice(1);
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
  return parseInt(s, 16);
}

/**
 * @param {number} n
 * @returns {string}
 */
function intToHex(n) {
  return `#${(n >>> 0).toString(16).padStart(6, '0')}`;
}

/**
 * Couleur d’embed pour un serveur (config Mongo ou DEFAULT_EMBED_COLOR).
 * @param {string} guildId
 */
async function getGuildEmbedColor(guildId) {
  const gc = await GuildConfig.findOne({ guildId }).select('embedColor').lean();
  if (gc?.embedColor != null && Number.isFinite(gc.embedColor)) {
    return gc.embedColor >>> 0;
  }
  const env = process.env.DEFAULT_EMBED_COLOR;
  if (env) {
    const p = parseHexColor(env);
    if (p != null) return p;
  }
  return DEFAULT_HEX;
}

/**
 * Barre type « graphique » (ratio 0–1).
 * @param {number} ratio
 * @param {number} width
 */
function progressBar(ratio, width = 14) {
  const r = Math.max(0, Math.min(1, ratio));
  const filled = Math.round(r * width);
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
  return `${bar} **${Math.round(r * 100)}%**`;
}

/**
 * Lignes de classement avec barre relative au max.
 * @param {{ label: string, value: number, medal?: string }[]} rows
 * @param {number} barWidth
 */
function rankingLines(rows, barWidth = 10) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const medals = ['🥇', '🥈', '🥉'];
  return rows
    .map((row, i) => {
      const m = row.medal || medals[i] || `**${i + 1}.**`;
      const pct = row.value / max;
      const filled = Math.round(pct * barWidth);
      const bar = '▰'.repeat(filled) + '▱'.repeat(barWidth - filled);
      return `${m} ${row.label}\n\`${bar}\` · **${row.value.toLocaleString('fr-FR')}** msgs`;
    })
    .join('\n\n');
}

module.exports = {
  DEFAULT_HEX,
  parseHexColor,
  intToHex,
  getGuildEmbedColor,
  progressBar,
  rankingLines,
};
