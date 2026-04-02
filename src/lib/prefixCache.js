const GuildConfig = require('../models/GuildConfig');
const GlobalConfig = require('../models/GlobalConfig');
const config = require('../config');

const guildCache = new Map();
let globalCached = { override: null, at: 0 };
const TTL_MS = 20_000;

function invalidateGuild(guildId) {
  guildCache.delete(guildId);
}

function invalidateGlobal() {
  globalCached = { override: null, at: 0 };
}

function clearAllGuildPrefixes() {
  guildCache.clear();
}

/**
 * @returns {Promise<{ rest: string } | null>}
 */
async function matchPrefix(message) {
  const guildId = message.guild?.id;
  if (!guildId) return null;
  const now = Date.now();
  let custom = null;
  const gEnt = guildCache.get(guildId);
  if (gEnt && now - gEnt.at < TTL_MS) {
    custom = gEnt.custom;
  } else {
    const gc = await GuildConfig.findOne({ guildId }).lean();
    custom = gc?.customPrefix || null;
    guildCache.set(guildId, { custom, at: now });
  }
  let main = config.prefix;
  if (now - globalCached.at < TTL_MS && globalCached.override !== undefined) {
    main = globalCached.override ?? config.prefix;
  } else {
    const glob = await GlobalConfig.findById('global').lean();
    globalCached = { override: glob?.overridePrefix ?? null, at: now };
    main = glob?.overridePrefix || config.prefix;
  }
  const content = message.content;
  if (custom && content.startsWith(custom)) {
    return { rest: content.slice(custom.length) };
  }
  if (content.startsWith(main)) {
    return { rest: content.slice(main.length) };
  }
  return null;
}

module.exports = { matchPrefix, invalidateGuild, invalidateGlobal, clearAllGuildPrefixes };
