const mongoose = require('mongoose');

const guildConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  gestionRoleId: { type: String, default: null },
  /** Rôles retirés automatiquement quand un membre est ajouté au BLR */
  blrRestrictedRoleIds: { type: [String], default: [] },
  modLogChannelId: { type: String, default: null },
});

module.exports = mongoose.model('GuildConfig', guildConfigSchema);
