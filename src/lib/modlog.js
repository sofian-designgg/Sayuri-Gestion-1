const { EmbedBuilder } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');
const { guildEmbedColor } = require('./embedUtil');

/**
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').Client} client
 * @param {string} title
 * @param {string} description
 */
async function sendModLog(guild, client, title, description) {
  const gc = await GuildConfig.findOne({ guildId: guild.id }).lean();
  if (!gc?.modLogChannelId) return;
  const ch = await guild.channels.fetch(gc.modLogChannelId).catch(() => null);
  if (!ch?.isTextBased?.()) return;
  const color = await guildEmbedColor(guild.id);
  await ch
    .send({
      embeds: [new EmbedBuilder().setTitle(title).setDescription(description.slice(0, 4000)).setColor(color).setTimestamp()],
    })
    .catch(() => null);
}

module.exports = { sendModLog };
