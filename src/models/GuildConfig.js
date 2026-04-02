const mongoose = require('mongoose');

const guildConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  /** Commandes utilisables par tout le monde sur ce serveur (clés du registre) */
  publicCommands: { type: [String], default: [] },
  embedColor: { type: Number, default: null },
});

module.exports = mongoose.model('GuildConfig', guildConfigSchema);
