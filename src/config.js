require('dotenv').config();

module.exports = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.DISCORD_CLIENT_ID || '',
  mongoUrl: process.env.MONGO_URL,
  prefix: process.env.BOT_PREFIX || '+',
  guildId: process.env.GUILD_ID || '',
  registerSlash: String(process.env.REGISTER_SLASH_COMMANDS || 'true').toLowerCase() === 'true',
  ownerIds: (process.env.BOT_OWNER_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  defaultEmbedColor: parseInt(
    (process.env.DEFAULT_EMBED_COLOR || '9b59b6').replace(/^#/, ''),
    16
  ),
  crowSupportUrl: process.env.CROW_SUPPORT_INVITE || 'https://discord.gg/',
};
