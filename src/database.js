const mongoose = require('mongoose');

async function connect(mongoUrl) {
  if (!mongoUrl) {
    throw new Error('MONGO_URL manquant dans les variables d’environnement.');
  }
  await mongoose.connect(mongoUrl);
}

module.exports = { connect };
