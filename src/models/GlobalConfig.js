const mongoose = require('mongoose');

/** Config globale du bot (une seule ligne) */
const globalConfigSchema = new mongoose.Schema({
  _id: { type: String, default: 'global' },
  botAdminUserIds: { type: [String], default: [] },
  /** Remplace le préfixe par défaut (.env) pour tous les serveurs si défini */
  overridePrefix: { type: String, default: null },
});

module.exports = mongoose.model('GlobalConfig', globalConfigSchema);
