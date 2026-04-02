const mongoose = require('mongoose');

const sanctionSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  type: { type: String, default: 'warn' },
  reason: { type: String, default: '' },
  moderatorId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

sanctionSchema.index({ guildId: 1, userId: 1 });

module.exports = mongoose.model('Sanction', sanctionSchema);
