const GuildConfig = require('../models/GuildConfig');
const config = require('../config');

async function guildEmbedColor(guildId) {
  const gc = await GuildConfig.findOne({ guildId }).select('embedColor').lean();
  if (gc?.embedColor != null && Number.isFinite(gc.embedColor)) return gc.embedColor >>> 0;
  return config.defaultEmbedColor >>> 0;
}

function parseHex(input) {
  if (!input || typeof input !== 'string') return null;
  let s = input.trim();
  if (s.startsWith('#')) s = s.slice(1);
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
  return parseInt(s, 16);
}

function intToHex(n) {
  return `#${(n >>> 0).toString(16).padStart(6, '0')}`;
}

module.exports = { guildEmbedColor, parseHex, intToHex };
