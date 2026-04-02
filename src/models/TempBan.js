const mongoose = require('mongoose');

const tempBanSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  unbanAt: { type: Date, required: true },
});

tempBanSchema.index({ guildId: 1, userId: 1 }, { unique: true });
tempBanSchema.index({ unbanAt: 1 });

module.exports = mongoose.model('TempBan', tempBanSchema);
