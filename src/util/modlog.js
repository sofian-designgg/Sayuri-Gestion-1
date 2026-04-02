const GuildConfig = require('../models/GuildConfig');

async function sendModLog(guild, payload) {
  const gc = await GuildConfig.findOne({ guildId: guild.id }).lean();
  const chId = gc?.modLogChannelId;
  if (!chId) return;
  const ch = guild.channels.cache.get(chId) || (await guild.channels.fetch(chId).catch(() => null));
  if (!ch || !ch.isTextBased()) return;
  await ch.send(payload).catch(() => null);
}

module.exports = { sendModLog };
