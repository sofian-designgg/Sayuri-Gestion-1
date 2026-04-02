require('dotenv').config();

module.exports = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.DISCORD_CLIENT_ID,
  mongoUrl: process.env.MONGO_URL,
  guildId: process.env.GUILD_ID || null,
  gestionRoleId: process.env.GESTION_ROLE_ID || null,
  staffRoleIds: (process.env.STAFF_ROLE_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  registerOnStart: String(process.env.REGISTER_ON_START || 'true').toLowerCase() === 'true',
  prefix: '+',
};
