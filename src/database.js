const mongoose = require('mongoose');

async function connect(mongoUrl) {
  if (!mongoUrl) throw new Error('MONGO_URL manquant.');
  await mongoose.connect(mongoUrl);
}

module.exports = { connect };
