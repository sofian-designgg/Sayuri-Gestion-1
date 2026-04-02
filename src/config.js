require('dotenv').config();

module.exports = {
  token: process.env.DISCORD_TOKEN,
  mongoUrl: process.env.MONGO_URL,
  prefix: process.env.BOT_PREFIX || '+',
  ownerIds: (process.env.BOT_OWNER_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  defaultEmbedColor: parseInt(
    (process.env.DEFAULT_EMBED_COLOR || '9b59b6').replace(/^#/, ''),
    16
  ),
  /** Lien affiché par +crowbots */
  crowSupportUrl: process.env.CROW_SUPPORT_INVITE || 'https://discord.gg/',
};
