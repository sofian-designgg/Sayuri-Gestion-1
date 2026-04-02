const mongoose = require('mongoose');

const giveawaySchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  messageId: { type: String, required: true },
  prize: { type: String, default: '' },
  endsAt: { type: Date, required: true },
  ended: { type: Boolean, default: false },
  hostId: { type: String, required: true },
});

giveawaySchema.index({ guildId: 1, ended: 1 });
giveawaySchema.index({ endsAt: 1 });

module.exports = mongoose.model('Giveaway', giveawaySchema);
