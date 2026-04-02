const mongoose = require('mongoose');

const messageStatSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  channelId: { type: String, required: true },
  count: { type: Number, default: 0 },
});

messageStatSchema.index({ guildId: 1, userId: 1, channelId: 1 }, { unique: true });

module.exports = mongoose.model('MessageStat', messageStatSchema);
