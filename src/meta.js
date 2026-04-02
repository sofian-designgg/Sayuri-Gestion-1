const { parseCommandLine } = require('./lib/parser');
const { AUTOCOMPLETE_VALUES } = require('./data/autocompleteList');

/** Métadonnées explicites (prioritaires sur l’auto-généré). */
const BASE_META = {
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

const COMMAND_META = { ...BASE_META };
for (const line of AUTOCOMPLETE_VALUES) {
  const p = parseCommandLine(line);
  if (p?.key && COMMAND_META[p.key] === undefined) {
    COMMAND_META[p.key] = { allowPublic: false };
  }
}

/** Clés avec handler complet (pas le stub). */
const IMPLEMENTED_KEYS = new Set([
  'help',
  'changelogs',
  'allbots',
  'alladmins',
  'botadmins',
  'boosters',
  'rolemembers',
  'serverinfo',
  'vocinfo',
  'role',
  'channel',
  'user',
  'member',
  'pic',
  'banner',
  'server',
  'snipe',
  'emoji',
  'calc',
  'wiki',
  'searchwiki',
  'crowbots',
  'botadmin',
  'publiccmd',
  'settings',
  'theme',
  'clear',
  'kick',
  'ban',
  'unban',
  'timeout',
  'warn',
  'sanctions',
  'lock',
  'unlock',
  'addrole',
  'delrole',
]);

module.exports.COMMAND_META = COMMAND_META;
module.exports.IMPLEMENTED_KEYS = IMPLEMENTED_KEYS;
