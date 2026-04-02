const util = require('./commands/util');
const mod = require('./commands/mod');
const admin = require('./commands/admin');
const { help } = require('./commands/helpCmd');
const { stubFromParsed } = require('./commands/stub');
const extended = require('./commands/extended');

module.exports = async function dispatchCore(message, client, key, parsed) {
  const { sub, args, text } = parsed;

  switch (key) {
    case 'help':
      return help(message, client);
    case 'changelogs':
      return util.changelogs(message);
    case 'allbots':
      return util.allbots(message);
    case 'alladmins':
      return util.alladmins(message);
    case 'botadmins':
      return util.botadmins(message);
    case 'boosters':
      return util.boosters(message);
    case 'rolemembers':
      return util.rolemembers(message, args);
    case 'serverinfo':
      return util.serverinfo(message);
    case 'vocinfo':
      return util.vocinfo(message);
    case 'role':
      return util.role(message, args);
    case 'channel':
      return util.channel(message, args);
    case 'user':
      return util.user(message, args);
    case 'member':
      return util.member(message, args);
    case 'pic':
      return util.pic(message, args);
    case 'banner':
      return util.banner(message, args);
    case 'server':
      if (sub === 'list') {
        return extended.cmdServerList(message, client, parsed);
      }
      return util.serverAsset(message, sub);
    case 'snipe':
      return util.snipe(message, client);
    case 'emoji':
      return util.emoji(message, args);
    case 'calc':
      return util.calc(message, args);
    case 'wiki':
      return util.wiki(message, args.join(' '));
    case 'searchwiki':
      return util.searchwiki(message, text);
    case 'crowbots':
      return util.crowbots(message);

    case 'botadmin':
      return admin.botadmin(message, args);
    case 'publiccmd':
      return admin.publiccmd(message, args);
    case 'settings':
      return admin.settings(message);
    case 'theme':
      return admin.theme(message, args);

    case 'clear':
      if (await extended.tryClearSubcommands(message, client, parsed)) return;
      return mod.clear(message, args);
    case 'kick':
      return mod.kick(message, args);
    case 'ban':
      return mod.ban(message, args);
    case 'unban':
      return mod.unban(message, args);
    case 'timeout':
      return mod.timeout(message, args);
    case 'warn':
      return mod.warn(message, args);
    case 'sanctions':
      return mod.sanctions(message, args);
    case 'lock':
      return mod.lock(message, args);
    case 'unlock':
      return mod.unlock(message, args);
    case 'addrole':
      return mod.addrole(message, args);
    case 'delrole':
      return mod.delrole(message, args);

    default:
      if (extended.handlers[key]) {
        return extended.handlers[key](message, client, parsed);
      }
      return stubFromParsed(message, parsed);
  }
};
