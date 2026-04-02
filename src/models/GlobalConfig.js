const mongoose = require('mongoose');

/** Config globale du bot (une seule ligne) */
const globalConfigSchema = new mongoose.Schema({
  _id: { type: String, default: 'global' },
  botAdminUserIds: { type: [String], default: [] },
});

module.exports = mongoose.model('GlobalConfig', globalConfigSchema);
