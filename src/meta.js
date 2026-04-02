/**
 * Métadonnées des commandes enregistrées.
 * allowPublic: si true, la commande peut être ajoutée à +publiccmd pour @everyone.
 * ownerOnly: réservé BOT_OWNER_IDS
 */
module.exports.COMMAND_META = {
  help: { allowPublic: true },
  changelogs: { allowPublic: true },
  allbots: { allowPublic: true },
  alladmins: { allowPublic: true },
  botadmins: { allowPublic: true },
  boosters: { allowPublic: true },
  rolemembers: { allowPublic: true },
  serverinfo: { allowPublic: true },
  vocinfo: { allowPublic: true },
  role: { allowPublic: true },
  channel: { allowPublic: true },
  user: { allowPublic: true },
  member: { allowPublic: true },
  pic: { allowPublic: true },
  banner: { allowPublic: true },
  server: { allowPublic: true },
  snipe: { allowPublic: true },
  emoji: { allowPublic: true },
  calc: { allowPublic: true },
  wiki: { allowPublic: true },
  searchwiki: { allowPublic: true },
  crowbots: { allowPublic: true },

  settings: { allowPublic: false },
  theme: { allowPublic: false },
  publiccmd: { allowPublic: false },
  botadmin: { allowPublic: false, ownerOnly: true },

  clear: { allowPublic: false },
  kick: { allowPublic: false },
  ban: { allowPublic: false },
  unban: { allowPublic: false },
  timeout: { allowPublic: false },
  warn: { allowPublic: false },
  sanctions: { allowPublic: false },
  lock: { allowPublic: false },
  unlock: { allowPublic: false },
  addrole: { allowPublic: false },
  delrole: { allowPublic: false },
};

/** Clés réellement codées dans le bot */
module.exports.IMPLEMENTED = new Set(Object.keys(module.exports.COMMAND_META));
