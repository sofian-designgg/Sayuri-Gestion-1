const mongoose = require('mongoose');

const blrEntrySchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  addedBy: { type: String, required: true },
  addedAt: { type: Date, default: Date.now },
});

blrEntrySchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('BlrEntry', blrEntrySchema);
