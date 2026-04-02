const mongoose = require('mongoose');

const voiceStatSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  totalMs: { type: Number, default: 0 },
});

voiceStatSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('VoiceStat', voiceStatSchema);
