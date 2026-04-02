const {
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
  ActivityType,
} = require('discord.js');
const GuildConfig = require('../models/GuildConfig');
const GlobalConfig = require('../models/GlobalConfig');
const Sanction = require('../models/Sanction');
const TempBan = require('../models/TempBan');
const Giveaway = require('../models/Giveaway');
const { guildEmbedColor } = require('../lib/embedUtil');
const { resolveMember, resolveRole, resolveUser } = require('../lib/resolvers');
const { parseDurationMs, parseDurationMsLong } = require('../lib/duration');
const { assertOwner, assertAccess, isOwner, canManagePublicCommands } = require('../lib/access');
const { COMMAND_META } = require('../meta');
const mod = require('./mod');
const util = require('./util');
const { invalidateGuild, invalidateGlobal, clearAllGuildPrefixes } = require('../lib/prefixCache');
const config = require('../config');

async function getOrCreateGuild(guildId) {
  let g = await GuildConfig.findOne({ guildId });
  if (!g) g = await GuildConfig.create({ guildId });
  return g;
}

async function colorOf(message) {
  return guildEmbedColor(message.guild.id);
}

function isTextChannel(ch) {
  return ch?.isTextBased?.() && ch.type !== ChannelType.PublicThread && ch.type !== ChannelType.PrivateThread;
}

/** @returns {Promise<boolean>} */
async function tryClearSubcommands(message, client, parsed) {
  const { args } = parsed;
  if (!args.length) return false;
  const a0 = args[0];
  if (/^\d+$/.test(a0)) return false;
  if (a0.startsWith('<@')) return false;
  const sub = a0.toLowerCase();
  const guildId = message.guild.id;
  const c = await colorOf(message);

  if (sub === 'all' && args[1]?.toLowerCase() === 'sanctions') {
    await Sanction.deleteMany({ guildId });
    await message.reply({ embeds: [new EmbedBuilder().setTitle('Sanctions').setDescription('Toutes les sanctions de ce serveur ont été supprimées.').setColor(c)] });
    return true;
  }

  if (sub === 'sanctions') {
    const m = await resolveMember(message, args.slice(1));
    if (!m) {
      await message.reply('Usage : `+clear sanctions @membre`');
      return true;
    }
    const r = await Sanction.deleteMany({ guildId, userId: m.id });
    await message.reply({ embeds: [new EmbedBuilder().setTitle('Sanctions').setDescription(`${r.deletedCount} sanction(s) supprimée(s) pour ${m}.`).setColor(c)] });
    return true;
  }

  if (sub === 'owners') {
    if (!(await assertOwner(message))) return true;
    const gc = await getOrCreateGuild(guildId);
    gc.botOwnerUserIds = [];
    await gc.save();
    await message.reply('Liste des **owners** serveur vidée.');
    return true;
  }

  if (sub === 'webhooks') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageWebhooks)) {
      await message.reply('Permission **Gérer les webhooks** requise.');
      return true;
    }
    const hooks = await message.guild.fetchWebhooks();
    let n = 0;
    for (const h of hooks.values()) {
      await h.delete('clear webhooks').catch(() => null);
      n += 1;
    }
    await message.reply(`**${n}** webhook(s) supprimé(s).`);
    return true;
  }

  if (sub === 'bl' || sub === 'blacklist') {
    const gc = await getOrCreateGuild(guildId);
    gc.blacklistUserIds = [];
    await gc.save();
    await message.reply('**Blacklist** vidée.');
    return true;
  }

  if (sub === 'wl' || sub === 'whitelist') {
    const gc = await getOrCreateGuild(guildId);
    gc.whitelistUserIds = [];
    await gc.save();
    await message.reply('**Whitelist** vidée.');
    return true;
  }

  if (sub === 'badwords') {
    const gc = await getOrCreateGuild(guildId);
    gc.badwordsList = [];
    await gc.save();
    await message.reply('Liste des **mots interdits** vidée.');
    return true;
  }

  if (sub === 'perms') {
    await message.reply('Utilise `+clear perms` sur un salon : réinitialisation manuelle des overwrites Discord (non automatisée ici). Indique un salon : `+perms` pour voir les droits.');
    return true;
  }

  if (sub === 'customs') {
    const gc = await getOrCreateGuild(guildId);
    gc.customCommands = [];
    await gc.save();
    await message.reply('**Commandes custom** supprimées.');
    return true;
  }

  if (sub === 'limit') {
    const gc = await getOrCreateGuild(guildId);
    gc.clearDefaultLimit = 10;
    await gc.save();
    await message.reply('Limite **clear** réinitialisée à **10**.');
    return true;
  }

  return false;
}

async function cmdSay(message, client, parsed) {
  if (!(await assertAccess(message, 'say', COMMAND_META.say))) return;
  const text = parsed.args.join(' ').trim();
  if (!text) return message.reply('Usage : `+say <texte>`');
  await message.delete().catch(() => null);
  await message.channel.send(text);
}

async function cmdEmbed(message, client, parsed) {
  if (!(await assertAccess(message, 'embed', COMMAND_META.embed))) return;
  const raw = parsed.args.join(' ').trim();
  if (!raw) return message.reply('Usage : `+embed Titre | description`');
  const [title, ...rest] = raw.split('|').map((s) => s.trim());
  const desc = rest.join('|') || '—';
  const c = await colorOf(message);
  await message.channel.send({ embeds: [new EmbedBuilder().setTitle(title.slice(0, 256)).setDescription(desc.slice(0, 4000)).setColor(c)] });
  await message.delete().catch(() => null);
}

async function cmdSlowmode(message, client, parsed) {
  if (!(await assertAccess(message, 'slowmode', COMMAND_META.slowmode))) return;
  const n = parseInt(parsed.args[0], 10);
  const ch = message.channel;
  if (!isTextChannel(ch)) return;
  const sec = Number.isNaN(n) ? 0 : Math.min(21600, Math.max(0, n));
  if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return message.reply('Permission **Gérer les salons** requise.');
  }
  await ch.setRateLimitPerUser(sec);
  const c = await colorOf(message);
  await message.reply({ embeds: [new EmbedBuilder().setTitle('Slowmode').setDescription(`Ce salon : **${sec}s** entre chaque message.`).setColor(c)] });
}

async function cmdHide(message, client, parsed) {
  if (!(await assertAccess(message, 'hide', COMMAND_META.hide))) return;
  const ch =
    message.mentions.channels.first() ||
    (parsed.args[0] && /^\d+$/.test(parsed.args[0])
      ? await message.guild.channels.fetch(parsed.args[0]).catch(() => null)
      : message.channel);
  if (!isTextChannel(ch)) return message.reply('Salon texte requis.');
  if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return message.reply('Permission **Gérer les salons** requise.');
  }
  await ch.permissionOverwrites.edit(message.guild.id, { ViewChannel: false });
  const c = await colorOf(message);
  await message.reply({ embeds: [new EmbedBuilder().setTitle('Salon masqué').setDescription(`${ch}`).setColor(c)] });
}

async function cmdUnhide(message, client, parsed) {
  if (!(await assertAccess(message, 'unhide', COMMAND_META.unhide))) return;
  const ch =
    message.mentions.channels.first() ||
    (parsed.args[0] && /^\d+$/.test(parsed.args[0])
      ? await message.guild.channels.fetch(parsed.args[0]).catch(() => null)
      : message.channel);
  if (!isTextChannel(ch)) return message.reply('Salon texte requis.');
  if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return message.reply('Permission **Gérer les salons** requise.');
  }
  await ch.permissionOverwrites.edit(message.guild.id, { ViewChannel: null });
  const c = await colorOf(message);
  await message.reply({ embeds: [new EmbedBuilder().setTitle('Salon visible').setDescription(`${ch}`).setColor(c)] });
}

async function massChannelOp(message, parsed, mode) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return message.reply('Permission **Gérer les salons** requise.');
  }
  const channels = message.guild.channels.cache.filter((ch) => ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement);
  let n = 0;
  for (const ch of channels.values()) {
    try {
      if (mode === 'hide') await ch.permissionOverwrites.edit(message.guild.id, { ViewChannel: false });
      else if (mode === 'unhide') await ch.permissionOverwrites.edit(message.guild.id, { ViewChannel: null });
      else if (mode === 'lock') await ch.permissionOverwrites.edit(message.guild.id, { SendMessages: false });
      else if (mode === 'unlock') await ch.permissionOverwrites.edit(message.guild.id, { SendMessages: null });
      n += 1;
    } catch {
      /* ignore */
    }
  }
  const c = await colorOf(message);
  const titles = { hide: 'Masqué', unhide: 'Visible', lock: 'Verrouillé', unlock: 'Déverrouillé' };
  await message.reply({ embeds: [new EmbedBuilder().setTitle(titles[mode]).setDescription(`**${n}** salon(s) traité(s).`).setColor(c)] });
}

async function cmdHideall(message, client, parsed) {
  if (!(await assertAccess(message, 'hideall', COMMAND_META.hideall))) return;
  await massChannelOp(message, parsed, 'hide');
}

async function cmdUnhideall(message, client, parsed) {
  if (!(await assertAccess(message, 'unhideall', COMMAND_META.unhideall))) return;
  await massChannelOp(message, parsed, 'unhide');
}

async function cmdLockall(message, client, parsed) {
  if (!(await assertAccess(message, 'lockall', COMMAND_META.lockall))) return;
  await massChannelOp(message, parsed, 'lock');
}

async function cmdUnlockall(message, client, parsed) {
  if (!(await assertAccess(message, 'unlockall', COMMAND_META.unlockall))) return;
  await massChannelOp(message, parsed, 'unlock');
}

async function cmdBanlist(message, client, parsed) {
  if (!(await assertAccess(message, 'banlist', COMMAND_META.banlist))) return;
  const bans = await message.guild.bans.fetch({ limit: 100 });
  const lines = [...bans.values()].slice(0, 25).map((b) => `• ${b.user.tag} (\`${b.user.id}\`)`);
  const c = await colorOf(message);
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle('Liste des bannis')
        .setDescription(lines.length ? lines.join('\n') : 'Aucun ban.')
        .setFooter({ text: `${bans.size} ban(s) (max 100 chargés)` })
        .setColor(c),
    ],
  });
}

async function cmdMute(message, client, parsed) {
  if (!(await assertAccess(message, 'mute', COMMAND_META.mute))) return;
  const gc = await getOrCreateGuild(message.guild.id);
  const m = await resolveMember(message, parsed.args);
  if (!m) return message.reply('Usage : `+mute @membre [durée] [raison]`');
  const rest = parsed.args.filter((a) => !a.includes(m.id) && !a.startsWith('<@'));
  if (gc.muteRoleId) {
    const role = await message.guild.roles.fetch(gc.muteRoleId).catch(() => null);
    if (!role) return message.reply('Rôle mute introuvable. `+set muterole @Rôle`');
    if (!m.manageable) return message.reply('Je ne peux pas modifier ce membre.');
    await m.roles.add(role).catch((e) => message.reply(e.message));
    const c = await colorOf(message);
    return message.reply({ embeds: [new EmbedBuilder().setTitle('Mute (rôle)').setDescription(`${m} a reçu ${role}.`).setColor(c)] });
  }
  const fake = { ...parsed, args: [m.toString(), ...rest] };
  return mod.timeout(message, [m.toString(), ...rest]);
}

async function cmdUnmute(message, client, parsed) {
  if (!(await assertAccess(message, 'unmute', COMMAND_META.unmute))) return;
  const gc = await getOrCreateGuild(message.guild.id);
  const m = await resolveMember(message, parsed.args);
  if (!m) return message.reply('Usage : `+unmute @membre`');
  if (gc.muteRoleId) {
    const role = await message.guild.roles.fetch(gc.muteRoleId).catch(() => null);
    if (role && m.roles.cache.has(role.id)) await m.roles.remove(role).catch(() => null);
  }
  await m.timeout(null).catch(() => null);
  const c = await colorOf(message);
  await message.reply({ embeds: [new EmbedBuilder().setTitle('Unmute').setDescription(`${m} peut à nouveau parler.`).setColor(c)] });
}

async function cmdTempmute(message, client, parsed) {
  if (!(await assertAccess(message, 'tempmute', COMMAND_META.tempmute))) return;
  const m = await resolveMember(message, parsed.args);
  if (!m) return message.reply('Usage : `+tempmute @membre 10m [raison]`');
  const rest = parsed.args.filter((a) => !a.includes(m.id) && !a.startsWith('<@'));
  return mod.timeout(message, [m.toString(), ...rest]);
}

async function cmdTempban(message, client, parsed) {
  if (!(await assertAccess(message, 'tempban', COMMAND_META.tempban))) return;
  const m = await resolveMember(message, parsed.args);
  if (!m) return message.reply('Usage : `+tempban @membre 7d [raison]`');
  const rest = parsed.args.filter((a) => !a.includes(m.id) && !a.startsWith('<@'));
  const dur = rest[0];
  const ms = parseDurationMsLong(dur, 400);
  if (!ms) return message.reply('Durée invalide (ex. `7d`, `12h`).');
  const reason = rest.slice(1).join(' ') || 'Tempban';
  if (!m.bannable) return message.reply('Je ne peux pas bannir ce membre.');
  await message.guild.members.ban(m.id, { reason });
  await TempBan.findOneAndUpdate(
    { guildId: message.guild.id, userId: m.id },
    { unbanAt: new Date(Date.now() + ms) },
    { upsert: true }
  );
  const c = await colorOf(message);
  await message.reply({ embeds: [new EmbedBuilder().setTitle('Tempban').setDescription(`${m} banni jusqu’à <t:${Math.floor((Date.now() + ms) / 1000)}:F>.`).setColor(c)] });
}

async function cmdCmute(message, client, parsed) {
  return cmdTempmute(message, client, parsed);
}

async function cmdUncmute(message, client, parsed) {
  return cmdUnmute(message, client, parsed);
}

async function cmdTempcmute(message, client, parsed) {
  return cmdTempmute(message, client, parsed);
}

async function cmdMutelist(message, client, parsed) {
  if (!(await assertAccess(message, 'mutelist', COMMAND_META.mutelist))) return;
  await message.guild.members.fetch().catch(() => null);
  const gc = await getOrCreateGuild(message.guild.id);
  const role = gc.muteRoleId ? await message.guild.roles.fetch(gc.muteRoleId).catch(() => null) : null;
  const out = [];
  for (const m of message.guild.members.cache.values()) {
    if (m.user.bot) continue;
    if (m.communicationDisabledUntil && m.communicationDisabledUntil > Date.now()) {
      out.push(`• ${m.user.tag} — timeout <t:${Math.floor(m.communicationDisabledUntil.getTime() / 1000)}:R>`);
    } else if (role && m.roles.cache.has(role.id)) {
      out.push(`• ${m.user.tag} — rôle mute`);
    }
    if (out.length >= 30) break;
  }
  const c = await colorOf(message);
  await message.reply({
    embeds: [new EmbedBuilder().setTitle('Membres mute / timeout').setDescription(out.length ? out.join('\n') : 'Personne.').setColor(c)],
  });
}

async function cmdUnmuteall(message, client, parsed) {
  if (!(await assertAccess(message, 'unmuteall', COMMAND_META.unmuteall))) return;
  await message.guild.members.fetch().catch(() => null);
  const gc = await getOrCreateGuild(message.guild.id);
  const role = gc.muteRoleId ? await message.guild.roles.fetch(gc.muteRoleId).catch(() => null) : null;
  let n = 0;
  for (const m of message.guild.members.cache.values()) {
    if (m.communicationDisabledUntil) {
      await m.timeout(null).catch(() => null);
      n += 1;
    }
    if (role && m.roles.cache.has(role.id)) {
      await m.roles.remove(role).catch(() => null);
      n += 1;
    }
  }
  await message.reply(`**${n}** action(s) de démute / retrait timeout effectuée(s).`);
}

async function cmdDerank(message, client, parsed) {
  if (!(await assertAccess(message, 'derank', COMMAND_META.derank))) return;
  const m = await resolveMember(message, parsed.args);
  if (!m) return message.reply('Usage : `+derank @membre`');
  if (!m.manageable) return message.reply('Impossible.');
  const me = message.guild.members.me;
  const removable = m.roles.cache.filter((r) => r.id !== message.guild.id && r.position < me.roles.highest.position);
  await m.roles.remove(removable).catch((e) => message.reply(e.message));
  const c = await colorOf(message);
  await message.reply({ embeds: [new EmbedBuilder().setTitle('Derank').setDescription(`${m} : rôles retirés (sous mon plus haut rôle).`).setColor(c)] });
}

async function cmdNoderank(message, client, parsed) {
  return cmdDerank(message, client, parsed);
}

async function cmdRename(message, client, parsed) {
  if (!(await assertAccess(message, 'rename', COMMAND_META.rename))) return;
  const name = parsed.args.join(' ').trim();
  if (!name) return message.reply('Usage : `+rename nouveau-nom` (renomme le salon courant)');
  const ch = message.channel;
  if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return message.reply('Permission **Gérer les salons** requise.');
  }
  await ch.setName(name.slice(0, 100)).catch((e) => message.reply(e.message));
  await message.reply('Nom du salon mis à jour.');
}

async function cmdCleanup(message, client, parsed) {
  if (!(await assertAccess(message, 'cleanup', COMMAND_META.cleanup))) return;
  const me = message.guild.members.me;
  if (!me.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply('Il me faut **Gérer les messages**.');
  const collected = await message.channel.messages.fetch({ limit: 50 });
  const botMsgs = [...collected.values()].filter((m) => m.author.bot && !m.pinned);
  for (const m of botMsgs.slice(0, 25)) {
    await m.delete().catch(() => null);
  }
  await message.reply(`**${Math.min(botMsgs.length, 25)}** message(s) bot supprimé(s).`);
}

async function cmdInvite(message, client, parsed) {
  if (!(await assertAccess(message, 'invite', COMMAND_META.invite))) return;
  const ch = message.channel;
  if (!ch.isTextBased()) return;
  const inv = await ch.createInvite({ maxAge: 86400, maxUses: 0, unique: true }).catch((e) => {
    message.reply(`Impossible : ${e.message}`);
    return null;
  });
  if (inv) await message.reply(inv.url);
}

async function cmdVoicemove(message, client, parsed) {
  if (!(await assertAccess(message, 'voicemove', COMMAND_META.voicemove))) return;
  const m = await resolveMember(message, parsed.args);
  const dest =
    message.mentions.channels.first() ||
    (parsed.args.find((x) => /^\d+$/.test(x)) ? await message.guild.channels.fetch(parsed.args.find((x) => /^\d+$/.test(x))).catch(() => null) : null);
  if (!m || !dest || dest.type !== ChannelType.GuildVoice) {
    return message.reply('Usage : `+voicemove @membre #salon-vocal`');
  }
  if (!m.voice.channel) return message.reply('Ce membre n’est pas en vocal.');
  await m.voice.setChannel(dest).catch((e) => message.reply(e.message));
  await message.reply('Déplacé.');
}

async function cmdVoicekick(message, client, parsed) {
  if (!(await assertAccess(message, 'voicekick', COMMAND_META.voicekick))) return;
  const m = await resolveMember(message, parsed.args);
  if (!m) return message.reply('Usage : `+voicekick @membre`');
  if (!m.voice.channel) return message.reply('Pas en vocal.');
  await m.voice.disconnect().catch((e) => message.reply(e.message));
  await message.reply('Déconnecté du vocal.');
}

async function cmdSync(message, client, parsed) {
  if (!(await assertAccess(message, 'sync', COMMAND_META.sync))) return;
  const ch = message.channel;
  if (!ch.parent) return message.reply('Ce salon n’a pas de catégorie.');
  if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return message.reply('Permission **Gérer les salons** requise.');
  }
  await ch.lockPermissions().catch((e) => message.reply(e.message));
  await message.reply('Permissions synchronisées avec la catégorie.');
}

async function cmdUnbanall(message, client, parsed) {
  if (!(await assertOwner(message))) return;
  if (parsed.args[0]?.toLowerCase() !== 'confirm') {
    return message.reply('⚠️ Tape `+unbanall confirm` pour débannir **tout le monde** sur ce serveur.');
  }
  const bans = await message.guild.bans.fetch();
  let n = 0;
  for (const b of bans.values()) {
    await message.guild.bans.remove(b.user.id).catch(() => null);
    n += 1;
  }
  await message.reply(`**${n}** déban(s) effectué(s).`);
}

async function cmdChoose(message, client, parsed) {
  if (!(await assertAccess(message, 'choose', COMMAND_META.choose))) return;
  const opts = parsed.args.length ? parsed.args : parsed.raw.split(/\s+/).slice(1);
  if (opts.length < 2) return message.reply('Usage : `+choose a b c`');
  const pick = opts[Math.floor(Math.random() * opts.length)];
  await message.reply(`🎲 **${pick}**`);
}

async function cmdBackup(message, client, parsed) {
  if (!(await assertAccess(message, 'backup', COMMAND_META.backup))) return;
  const g = message.guild;
  await g.channels.fetch().catch(() => null);
  await g.roles.fetch().catch(() => null);
  const data = {
    exportedAt: new Date().toISOString(),
    guild: { id: g.id, name: g.name },
    roles: g.roles.cache.map((r) => ({ id: r.id, name: r.name, color: r.color, position: r.position })),
    channels: g.channels.cache.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      parentId: c.parentId,
      position: c.position,
    })),
  };
  const json = JSON.stringify(data, null, 2);
  await message.reply({
    content: 'Export JSON (rôles + salons).',
    files: [{ attachment: Buffer.from(json, 'utf8'), name: `backup-${g.id}.json` }],
  });
}

async function cmdLoading(message, client, parsed) {
  if (!(await assertAccess(message, 'loading', COMMAND_META.loading))) return;
  const m = await message.channel.send('⏳ …');
  await new Promise((r) => setTimeout(r, 1500));
  await m.edit('✅ Terminé.').catch(() => null);
}

async function cmdCreate(message, client, parsed) {
  if (!(await assertAccess(message, 'create', COMMAND_META.create))) return;
  const name = parsed.args.join(' ') || 'nouveau-salon';
  if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return message.reply('Permission **Gérer les salons** requise.');
  }
  const ch = await message.guild.channels
    .create({ name: name.slice(0, 100), type: ChannelType.GuildText, parent: message.channel.parentId })
    .catch((e) => message.reply(e.message));
  if (ch) await message.reply(`Salon créé : ${ch}`);
}

async function cmdMassiverole(message, client, parsed) {
  if (!(await assertAccess(message, 'massiverole', COMMAND_META.massiverole))) return;
  const role = await resolveRole(message, parsed.args);
  if (!role) return message.reply('Usage : `+massiverole @Rôle`');
  await message.guild.members.fetch().catch(() => null);
  let n = 0;
  for (const m of message.guild.members.cache.values()) {
    if (m.user.bot || m.roles.cache.has(role.id)) continue;
    if (!m.manageable) continue;
    await m.roles.add(role).catch(() => null);
    n += 1;
    if (n >= 200) break;
  }
  await message.reply(`Rôle ajouté à **${n}** membre(s) (plafond 200/tour).`);
}

async function cmdUnmassiverole(message, client, parsed) {
  if (!(await assertAccess(message, 'unmassiverole', COMMAND_META.unmassiverole))) return;
  const role = await resolveRole(message, parsed.args);
  if (!role) return message.reply('Usage : `+unmassiverole @Rôle`');
  await message.guild.members.fetch().catch(() => null);
  let n = 0;
  for (const m of message.guild.members.cache.values()) {
    if (!m.roles.cache.has(role.id) || !m.manageable) continue;
    await m.roles.remove(role).catch(() => null);
    n += 1;
    if (n >= 200) break;
  }
  await message.reply(`Rôle retiré pour **${n}** membre(s).`);
}

async function cmdRenew(message, client, parsed) {
  if (!(await assertAccess(message, 'renew', COMMAND_META.renew))) return;
  const ch = message.channel;
  if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return message.reply('Permission **Gérer les salons** requise.');
  }
  const name = ch.name;
  const parent = ch.parentId;
  const pos = ch.position;
  const newCh = await ch.clone().catch((e) => message.reply(e.message));
  if (!newCh) return;
  await ch.delete().catch(() => null);
  await newCh.setPosition(pos).catch(() => null);
  if (parent) await newCh.setParent(parent).catch(() => null);
  await newCh.send(`Salon renouvelé (anciennement **${name}**).`).catch(() => null);
}

async function cmdTemprole(message, client, parsed) {
  if (!(await assertAccess(message, 'temprole', COMMAND_META.temprole))) return;
  const m = message.mentions.members.first();
  const role = message.mentions.roles.first();
  if (!m || !role) return message.reply('Usage : `+temprole @membre @Rôle` (retrait manuel ou timeout séparé)');
  await m.roles.add(role).catch((e) => message.reply(e.message));
  await message.reply(`${m} a reçu ${role} — pense à le retirer avec \`+untemprole\`.`);
}

async function cmdUntemprole(message, client, parsed) {
  if (!(await assertAccess(message, 'untemprole', COMMAND_META.untemprole))) return;
  const m = message.mentions.members.first();
  const role = message.mentions.roles.first();
  if (!m || !role) return message.reply('Usage : `+untemprole @membre @Rôle`');
  await m.roles.remove(role).catch((e) => message.reply(e.message));
  await message.reply('Rôle retiré.');
}

async function cmdBringall(message, client, parsed) {
  if (!(await assertAccess(message, 'bringall', COMMAND_META.bringall))) return;
  const dest =
    message.mentions.channels.first() ||
    (parsed.args[0] && /^\d+$/.test(parsed.args[0]) ? await message.guild.channels.fetch(parsed.args[0]).catch(() => null) : null);
  if (!dest || dest.type !== ChannelType.GuildVoice) {
    return message.reply('Usage : `+bringall #vocal-destination`');
  }
  await message.guild.members.fetch().catch(() => null);
  let n = 0;
  for (const m of message.guild.members.cache.values()) {
    if (m.voice.channel && m.voice.channelId !== dest.id) {
      await m.voice.setChannel(dest).catch(() => null);
      n += 1;
    }
  }
  await message.reply(`**${n}** membre(s) déplacé(s) vers ${dest}.`);
}

async function cmdOpenmodmail(message, client, parsed) {
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle('Modmail')
        .setDescription('Sayuri ne gère pas de thread modmail complet ici. Utilise un salon tickets + `+ticket settings` (catégorie) ou un bot dédié.')
        .setColor(await colorOf(message)),
    ],
  });
}

async function cmdPrefix(message, client, parsed) {
  if (!(await canManagePublicCommands(message.member))) {
    return message.reply('Réservé aux **administrateurs**.');
  }
  const p = parsed.args[0];
  const gc = await getOrCreateGuild(message.guild.id);
  if (!p || p.toLowerCase() === 'off' || p.toLowerCase() === 'reset') {
    gc.customPrefix = null;
    await gc.save();
    invalidateGuild(message.guild.id);
    return message.reply('Préfixe personnalisé désactivé pour ce serveur.');
  }
  if (p.length > 12) return message.reply('Max 12 caractères.');
  gc.customPrefix = p;
  await gc.save();
  invalidateGuild(message.guild.id);
  await message.reply(`Préfixe serveur : \`${p}\` (en plus du préfixe global).`);
}

async function cmdMainprefix(message, client, parsed) {
  if (!(await assertOwner(message))) return;
  const p = parsed.args[0];
  const glob = await GlobalConfig.findOneAndUpdate(
    { _id: 'global' },
    { $setOnInsert: { botAdminUserIds: [] } },
    { upsert: true, new: true }
  );
  if (!p || p.toLowerCase() === 'reset') {
    glob.overridePrefix = null;
    await glob.save();
    invalidateGlobal();
    return message.reply(`Préfixe global : \`${config.prefix}\` (.env)`);
  }
  if (p.length > 12) return message.reply('Max 12 caractères.');
  glob.overridePrefix = p;
  await glob.save();
  invalidateGlobal();
  await message.reply(`Préfixe global mis à \`${p}\` pour tous les serveurs (sans préfixe custom).`);
}

async function cmdMuterole(message, client, parsed) {
  if (!(await assertAccess(message, 'muterole', COMMAND_META.muterole))) return;
  const gc = await getOrCreateGuild(message.guild.id);
  if (!parsed.args.length) {
    return message.reply(
      gc.muteRoleId ? `Rôle mute : <@&${gc.muteRoleId}>` : 'Aucun. Utilise `+set muterole @Rôle` ou `+muterole @Rôle`.'
    );
  }
  const role = await resolveRole(message, parsed.args);
  if (!role) return message.reply('Rôle introuvable.');
  gc.muteRoleId = role.id;
  await gc.save();
  await message.reply(`Rôle mute : ${role}`);
}

async function cmdSet(message, client, parsed) {
  const sub = (parsed.args[0] || '').toLowerCase();
  const rest = parsed.args.slice(1);
  if (sub === 'lang') {
    if (!(await assertAccess(message, 'set', COMMAND_META.set))) return;
    const code = (rest[0] || 'fr').toLowerCase().slice(0, 8);
    const gc = await getOrCreateGuild(message.guild.id);
    gc.guildLang = code;
    await gc.save();
    return message.reply(`Langue enregistrée : **${code}** (affichage Sayuri).`);
  }
  if (sub === 'muterole') {
    if (!(await assertAccess(message, 'set', COMMAND_META.set))) return;
    const role = message.mentions.roles.first() || (await resolveRole(message, rest));
    if (!role) return message.reply('Usage : `+set muterole @Rôle`');
    const gc = await getOrCreateGuild(message.guild.id);
    gc.muteRoleId = role.id;
    await gc.save();
    return message.reply(`Rôle mute : ${role}`);
  }
  if (sub === 'name' && isOwner(message.author.id)) {
    const name = rest.join(' ').trim();
    if (!name) return message.reply('Usage : `+set name Nouveau nom`');
    await message.client.user.setUsername(name.slice(0, 32)).catch((e) => message.reply(e.message));
    return message.reply('Pseudo du bot mis à jour.');
  }
  if ((sub === 'pic' || sub === 'avatar') && isOwner(message.author.id)) {
    const url = message.attachments.first()?.url || rest[0];
    if (!url) return message.reply('Envoie une **image** avec la commande ou une URL.');
    await message.client.user.setAvatar(url).catch((e) => message.reply(e.message));
    return message.reply('Avatar mis à jour.');
  }
  if (sub === 'banner' && isOwner(message.author.id)) {
    const url = message.attachments.first()?.url || rest[0];
    if (!url) return message.reply('URL ou pièce jointe requise.');
    await message.client.user.setBanner(url).catch((e) => message.reply(e.message));
    return message.reply('Bannière mise à jour (si le compte le permet).');
  }
  if (sub === 'profil') {
    return cmdSet(message, client, { ...parsed, args: ['name', ...rest] });
  }
  if (sub === 'perm' || sub === 'lang') {
    return message.reply('Paramètre enregistré côté Crow ; ici utilise `+theme` / préfixe ou ouvre les paramètres Discord du serveur.');
  }
  return message.reply('Sous-commandes : `muterole`, `name`, `pic`, `banner` (owner bot), `profil`.');
}

async function cmdDelSanction(message, client, parsed) {
  if (!(await assertAccess(message, 'del', COMMAND_META.del))) return;
  const sub0 = (parsed.args[0] || '').toLowerCase();
  if (sub0 === 'perm') {
    return cmdDelPerm(message, client, parsed);
  }
  if (sub0 !== 'sanction') {
    return message.reply('Usage : `+del sanction @membre`');
  }
  const m = await resolveMember(message, parsed.args.slice(1));
  if (!m) return message.reply('Membre introuvable.');
  const last = await Sanction.findOne({ guildId: message.guild.id, userId: m.id }).sort({ createdAt: -1 });
  if (!last) return message.reply('Aucune sanction à supprimer.');
  await last.deleteOne();
  await message.reply('Dernière sanction supprimée.');
}

async function cmdBl(message, client, parsed) {
  if (!(await assertAccess(message, 'bl', COMMAND_META.bl))) return;
  const u = await resolveUser(message, parsed.args);
  if (!u) return message.reply('Usage : `+bl @user|id`');
  const gc = await getOrCreateGuild(message.guild.id);
  if (!gc.blacklistUserIds.includes(u.id)) gc.blacklistUserIds.push(u.id);
  await gc.save();
  await message.reply(`${u.tag} ajouté à la **blacklist** (kick à l’arrivée si actif).`);
}

async function cmdUnbl(message, client, parsed) {
  if (!(await assertAccess(message, 'unbl', COMMAND_META.unbl))) return;
  const u = await resolveUser(message, parsed.args);
  if (!u) return message.reply('Usage : `+unbl @user|id`');
  const gc = await getOrCreateGuild(message.guild.id);
  gc.blacklistUserIds = gc.blacklistUserIds.filter((id) => id !== u.id);
  await gc.save();
  await message.reply(`${u.tag} retiré de la blacklist.`);
}

async function cmdBlinfo(message, client, parsed) {
  if (!(await assertAccess(message, 'blinfo', COMMAND_META.blinfo))) return;
  const u = await resolveUser(message, parsed.args);
  if (!u) return message.reply('Usage : `+blinfo @user|id`');
  const gc = await getOrCreateGuild(message.guild.id);
  const ok = gc.blacklistUserIds.includes(u.id);
  await message.reply(ok ? `**${u.tag}** est blacklisté.` : `**${u.tag}** n’est pas blacklisté.`);
}

async function cmdWl(message, client, parsed) {
  if (!(await assertAccess(message, 'wl', COMMAND_META.wl))) return;
  const u = await resolveUser(message, parsed.args);
  if (!u) return message.reply('Usage : `+wl @user|id`');
  const gc = await getOrCreateGuild(message.guild.id);
  if (!gc.whitelistUserIds.includes(u.id)) gc.whitelistUserIds.push(u.id);
  await gc.save();
  await message.reply(`${u.tag} ajouté à la **whitelist** (antibot / exceptions).`);
}

async function cmdUnwl(message, client, parsed) {
  if (!(await assertAccess(message, 'unwl', COMMAND_META.unwl))) return;
  const u = await resolveUser(message, parsed.args);
  if (!u) return message.reply('Usage : `+unwl @user|id`');
  const gc = await getOrCreateGuild(message.guild.id);
  gc.whitelistUserIds = gc.whitelistUserIds.filter((id) => id !== u.id);
  await gc.save();
  await message.reply(`${u.tag} retiré de la whitelist.`);
}

async function cmdOwner(message, client, parsed) {
  if (!(await canManagePublicCommands(message.member))) {
    return message.reply('Réservé aux **administrateurs Discord**.');
  }
  const sub = (parsed.args[0] || '').toLowerCase();
  const gc = await getOrCreateGuild(message.guild.id);
  if (sub === 'list' || !sub) {
    const lines = gc.botOwnerUserIds.length ? gc.botOwnerUserIds.map((id) => `• <@${id}>`).join('\n') : '_Aucun owner secondaire._';
    return message.reply({ embeds: [new EmbedBuilder().setTitle('Owners (serveur)').setDescription(lines).setColor(await colorOf(message))] });
  }
  const target = message.mentions.users.first() || (parsed.args[1] && /^\d+$/.test(parsed.args[1]) ? await client.users.fetch(parsed.args[1]).catch(() => null) : null);
  if (sub === 'add' && target) {
    if (!gc.botOwnerUserIds.includes(target.id)) gc.botOwnerUserIds.push(target.id);
    await gc.save();
    return message.reply(`${target.tag} ajouté.`);
  }
  if ((sub === 'remove' || sub === 'del') && target) {
    gc.botOwnerUserIds = gc.botOwnerUserIds.filter((id) => id !== target.id);
    await gc.save();
    return message.reply(`${target.tag} retiré.`);
  }
  return message.reply('Usage : `+owner add|remove|list @user`');
}

async function cmdUnowner(message, client, parsed) {
  parsed.args = ['remove', ...parsed.args];
  return cmdOwner(message, client, parsed);
}

async function cmdLeaveGuild(message, client, parsed) {
  if (!(await assertOwner(message))) return;
  await message.reply('Je quitte ce serveur…');
  await message.guild.leave().catch(() => null);
}

async function cmdLeaveRouter(message, client, parsed) {
  if ((parsed.args[0] || '').toLowerCase() === 'settings') {
    return cmdLeaveSettings(message, client, parsed);
  }
  return cmdLeaveGuild(message, client, parsed);
}

async function cmdServerList(message, client, parsed) {
  if (!(await assertOwner(message))) return;
  const lines = client.guilds.cache
    .map((g) => `• **${g.name}** (\`${g.id}\`) — ${g.memberCount} membres`)
    .slice(0, 40);
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle('Serveurs')
        .setDescription(lines.join('\n') || '—')
        .setColor(await colorOf(message)),
    ],
  });
}

async function cmdOnline(message, client, parsed) {
  if (!(await assertOwner(message))) return;
  await client.user.setPresence({ status: 'online' });
  await message.reply('Statut : **en ligne**.');
}

async function cmdIdle(message, client, parsed) {
  if (!(await assertOwner(message))) return;
  await client.user.setPresence({ status: 'idle' });
  await message.reply('Statut : **inactif**.');
}

async function cmdDnd(message, client, parsed) {
  if (!(await assertOwner(message))) return;
  await client.user.setPresence({ status: 'dnd' });
  await message.reply('Statut : **ne pas déranger**.');
}

async function cmdInvisible(message, client, parsed) {
  if (!(await assertOwner(message))) return;
  await client.user.setPresence({ status: 'invisible' });
  await message.reply('Statut : **invisible**.');
}

async function cmdRemove(message, client, parsed) {
  if ((parsed.args[0] || '').toLowerCase() !== 'activity') {
    return message.reply('Usage : `+remove activity`');
  }
  if (!(await assertOwner(message))) return;
  await client.user.setActivity(null);
  await message.reply('Activité Discord supprimée.');
}

async function cmdPlayto(message, client, parsed) {
  if (!(await assertOwner(message))) return;
  const name = parsed.args.join(' ') || 'Sayuri Gestion';
  await client.user.setActivity(name, { type: ActivityType.Playing });
  await message.reply(`Joue à **${name}**.`);
}

async function cmdListen(message, client, parsed) {
  if (!(await assertOwner(message))) return;
  const name = parsed.args.join(' ') || 'musique';
  await client.user.setActivity(name, { type: ActivityType.Listening });
  await message.reply(`Écoute **${name}**.`);
}

async function cmdWatch(message, client, parsed) {
  if (!(await assertOwner(message))) return;
  const name = parsed.args.join(' ') || 'vous';
  await client.user.setActivity(name, { type: ActivityType.Watching });
  await message.reply(`Regarde **${name}**.`);
}

async function cmdCompet(message, client, parsed) {
  if (!(await assertOwner(message))) return;
  const name = parsed.args.join(' ') || 'Crow';
  await client.user.setActivity(name, { type: ActivityType.Competing });
  await message.reply(`En compétition : **${name}**.`);
}

async function cmdStream(message, client, parsed) {
  if (!(await assertOwner(message))) return;
  const url = parsed.args[0]?.startsWith('http') ? parsed.args.shift() : 'https://twitch.tv/discord';
  const name = parsed.args.join(' ') || 'Sayuri';
  await client.user.setActivity(name, { type: ActivityType.Streaming, url });
  await message.reply(`Stream : **${name}**`);
}

async function cmdRaidlog(message, client, parsed) {
  if (!(await assertAccess(message, 'raidlog', COMMAND_META.raidlog))) return;
  const ch = message.mentions.channels.first();
  const gc = await getOrCreateGuild(message.guild.id);
  if (!ch) {
    return message.reply(
      gc.raidLogChannelId ? `Salon raidlog : <#${gc.raidLogChannelId}>` : 'Aucun salon. Usage : `+raidlog #salon`'
    );
  }
  gc.raidLogChannelId = ch.id;
  await gc.save();
  await message.reply(`Raidlog : ${ch}`);
}

async function cmdRaidping(message, client, parsed) {
  if (!(await assertAccess(message, 'raidping', COMMAND_META.raidping))) return;
  const role = message.mentions.roles.first();
  const gc = await getOrCreateGuild(message.guild.id);
  if (!role) {
    return message.reply(
      gc.raidPingRoleId ? `Rôle ping : <@&${gc.raidPingRoleId}>` : 'Usage : `+raidping @Rôle`'
    );
  }
  gc.raidPingRoleId = role.id;
  await gc.save();
  await message.reply(`Rôle de ping raid : ${role}`);
}

async function toggleAntiraid(message, field, label, commandKey) {
  const metaKey = commandKey || field;
  if (!(await assertAccess(message, metaKey, COMMAND_META[metaKey]))) return;
  const gc = await getOrCreateGuild(message.guild.id);
  const cur = gc[field];
  gc[field] = !cur;
  await gc.save();
  await message.reply(`**${label}** : ${gc[field] ? 'activé' : 'désactivé'}.`);
}

async function cmdSecur(message, client, parsed) {
  if ((parsed.args[0] || '').toLowerCase() === 'invite') {
    return message.reply(
      'Sécurité des invitations : vérifie le **tableau de bord** Discord (Intégrations) et les bots avec permission **Administrateur**.'
    );
  }
  if (!(await assertAccess(message, 'secur', COMMAND_META.secur))) return;
  const gc = await getOrCreateGuild(message.guild.id);
  const lines = [
    `Anti-bot : **${gc.antiraidAntiBot ? 'oui' : 'non'}**`,
    `Anti-webhook : **${gc.antiraidAntiWebhook ? 'oui' : 'non'}**`,
    `Anti-salon : **${gc.antiraidAntiChannel ? 'oui' : 'non'}**`,
    `Anti-rôle : **${gc.antiraidAntiRole ? 'oui' : 'non'}**`,
    `Anti-ban : **${gc.antiraidAntiBan ? 'oui' : 'non'}**`,
    `Anti-unban : **${gc.antiraidAntiUnban ? 'oui' : 'non'}**`,
    `Anti-everyone : **${gc.antiraidAntiEveryone ? 'oui' : 'non'}**`,
    `Antispam : **${gc.antispamEnabled ? 'oui' : 'non'}**`,
    `Antilink : **${gc.antilinkEnabled ? 'oui' : 'non'}**`,
    `Mots interdits : **${gc.badwordsList.length}**`,
  ];
  await message.reply({ embeds: [new EmbedBuilder().setTitle('Sécurité (Sayuri)').setDescription(lines.join('\n')).setColor(await colorOf(message))] });
}

async function cmdPunition(message, client, parsed) {
  if (!(await assertAccess(message, 'punition', COMMAND_META.punition))) return;
  const v = (parsed.args[0] || '').toLowerCase();
  const gc = await getOrCreateGuild(message.guild.id);
  if (!v) return message.reply(`Punition par défaut : **${gc.defaultPunish}**. Usage : \`+punition timeout|kick|ban\``);
  if (!['timeout', 'kick', 'ban'].includes(v)) return message.reply('Valeurs : timeout, kick, ban.');
  gc.defaultPunish = v;
  await gc.save();
  await message.reply(`Punition par défaut : **${v}**.`);
}

async function cmdModlog(message, client, parsed) {
  if (!(await assertAccess(message, 'modlog', COMMAND_META.modlog))) return;
  const ch = message.mentions.channels.first();
  const gc = await getOrCreateGuild(message.guild.id);
  if (!ch) {
    return message.reply(gc.modLogChannelId ? `Modlog : <#${gc.modLogChannelId}>` : 'Usage : `+modlog #salon`');
  }
  gc.modLogChannelId = ch.id;
  await gc.save();
  await message.reply(`Modlog : ${ch}`);
}

async function cmdMessagelog(message, client, parsed) {
  if (!(await assertAccess(message, 'messagelog', COMMAND_META.messagelog))) return;
  const ch = message.mentions.channels.first();
  const gc = await getOrCreateGuild(message.guild.id);
  if (!ch) {
    return message.reply(gc.messageLogChannelId ? `Messagelog : <#${gc.messageLogChannelId}>` : 'Usage : `+messagelog #salon`');
  }
  gc.messageLogChannelId = ch.id;
  await gc.save();
  await message.reply(`Messagelog : ${ch}`);
}

async function cmdVoicelog(message, client, parsed) {
  if (!(await assertAccess(message, 'voicelog', COMMAND_META.voicelog))) return;
  const ch = message.mentions.channels.first();
  const gc = await getOrCreateGuild(message.guild.id);
  if (!ch) {
    return message.reply(gc.voiceLogChannelId ? `Voicelog : <#${gc.voiceLogChannelId}>` : 'Usage : `+voicelog #salon`');
  }
  gc.voiceLogChannelId = ch.id;
  await gc.save();
  await message.reply(`Voicelog : ${ch}`);
}

async function cmdBoostlog(message, client, parsed) {
  if (!(await assertAccess(message, 'boostlog', COMMAND_META.boostlog))) return;
  const ch = message.mentions.channels.first();
  const gc = await getOrCreateGuild(message.guild.id);
  if (!ch) {
    return message.reply(gc.boostLogChannelId ? `Boostlog : <#${gc.boostLogChannelId}>` : 'Usage : `+boostlog #salon`');
  }
  gc.boostLogChannelId = ch.id;
  await gc.save();
  await message.reply(`Boostlog : ${ch}`);
}

async function cmdRolelog(message, client, parsed) {
  if (!(await assertAccess(message, 'rolelog', COMMAND_META.rolelog))) return;
  const ch = message.mentions.channels.first();
  const gc = await getOrCreateGuild(message.guild.id);
  if (!ch) {
    return message.reply(gc.roleLogChannelId ? `Rolelog : <#${gc.roleLogChannelId}>` : 'Usage : `+rolelog #salon`');
  }
  gc.roleLogChannelId = ch.id;
  await gc.save();
  await message.reply(`Rolelog : ${ch}`);
}

async function cmdAutoconfiglog(message, client, parsed) {
  if (!(await assertAccess(message, 'autoconfiglog', COMMAND_META.autoconfiglog))) return;
  const ch = message.mentions.channels.first();
  const gc = await getOrCreateGuild(message.guild.id);
  if (!ch) {
    return message.reply(
      gc.autoconfigLogChannelId ? `Autoconfiglog : <#${gc.autoconfigLogChannelId}>` : 'Usage : `+autoconfiglog #salon`'
    );
  }
  gc.autoconfigLogChannelId = ch.id;
  await gc.save();
  await message.reply(`Autoconfiglog : ${ch}`);
}

async function cmdNolog(message, client, parsed) {
  if (!(await assertAccess(message, 'nolog', COMMAND_META.nolog))) return;
  const gc = await getOrCreateGuild(message.guild.id);
  gc.modLogChannelId = null;
  gc.messageLogChannelId = null;
  gc.voiceLogChannelId = null;
  gc.boostLogChannelId = null;
  gc.roleLogChannelId = null;
  gc.autoconfigLogChannelId = null;
  gc.raidLogChannelId = null;
  await gc.save();
  await message.reply('Tous les salons de **logs** Sayuri ont été réinitialisés.');
}

async function cmdBoostembed(message, client, parsed) {
  if (!(await assertAccess(message, 'boostembed', COMMAND_META.boostembed))) return;
  const gc = await getOrCreateGuild(message.guild.id);
  gc.boostLogAsEmbed = !gc.boostLogAsEmbed;
  await gc.save();
  await message.reply(`Logs boost en embed : **${gc.boostLogAsEmbed ? 'oui' : 'non'}**.`);
}

async function cmdPublic(message, client, parsed) {
  if (!(await assertAccess(message, 'public', COMMAND_META.public))) return;
  const ch = message.mentions.channels.first() || message.channel;
  if (!isTextChannel(ch)) return;
  await ch.permissionOverwrites.edit(message.guild.id, { ViewChannel: true, SendMessages: null });
  await message.reply(`${ch} rendu **visible / public** pour @everyone.`);
}

async function cmdPiconly(message, client, parsed) {
  if (!(await assertAccess(message, 'piconly', COMMAND_META.piconly))) return;
  const ch = message.mentions.channels.first() || message.channel;
  const gc = await getOrCreateGuild(message.guild.id);
  const arr = gc.piconlyChannelIds || [];
  const idx = arr.indexOf(ch.id);
  if (idx >= 0) {
    arr.splice(idx, 1);
    gc.piconlyChannelIds = arr;
    await gc.save();
    return message.reply(`${ch} retiré du mode **image only**.`);
  }
  arr.push(ch.id);
  gc.piconlyChannelIds = arr;
  await gc.save();
  await message.reply(`${ch} : mode **image only** (texte sans image supprimé par le bot).`);
}

async function cmdSpam(message, client, parsed) {
  return toggleAntiraid(message, 'antispamEnabled', 'Antispam', 'spam');
}

async function cmdLink(message, client, parsed) {
  return toggleAntiraid(message, 'antilinkEnabled', 'Antilink', 'link');
}

async function cmdAntispam(message, client, parsed) {
  return toggleAntiraid(message, 'antispamEnabled', 'Antispam', 'antispam');
}

async function cmdAntilink(message, client, parsed) {
  return toggleAntiraid(message, 'antilinkEnabled', 'Antilink', 'antilink');
}

async function cmdAntimassmention(message, client, parsed) {
  return toggleAntiraid(message, 'antimassmentionEnabled', 'Anti mass-mention', 'antimassmention');
}

async function cmdAutoreact(message, client, parsed) {
  if (!(await assertAccess(message, 'autoreact', COMMAND_META.autoreact))) return;
  const gc = await getOrCreateGuild(message.guild.id);
  gc.autoreactChannelEmoji = gc.autoreactChannelEmoji || [];
  const chId = message.channel.id;
  if (!parsed.args.length || (parsed.args[0] || '').toLowerCase() === 'off') {
    gc.autoreactChannelEmoji = gc.autoreactChannelEmoji.filter((x) => x.channelId !== chId);
    await gc.save();
    return message.reply('Auto-réaction désactivée sur ce salon.');
  }
  const emoji = parsed.args.join(' ').trim();
  const i = gc.autoreactChannelEmoji.findIndex((x) => x.channelId === chId);
  const row = { channelId: chId, emoji };
  if (i >= 0) gc.autoreactChannelEmoji[i] = row;
  else gc.autoreactChannelEmoji.push(row);
  await gc.save();
  await message.reply(`Auto-réaction sur ce salon : ${emoji}`);
}

async function cmdBadwords(message, client, parsed) {
  if (!(await assertAccess(message, 'badwords', COMMAND_META.badwords))) return;
  const sub = (parsed.args[0] || '').toLowerCase();
  const gc = await getOrCreateGuild(message.guild.id);
  if (sub === 'list' || !sub) {
    const t = gc.badwordsList.length ? gc.badwordsList.map((w) => `• ${w}`).join('\n') : '_Aucun._';
    return message.reply({ embeds: [new EmbedBuilder().setTitle('Mots interdits').setDescription(t.slice(0, 3900)).setColor(await colorOf(message))] });
  }
  if (sub === 'add') {
    const w = parsed.args.slice(1).join(' ').trim().toLowerCase();
    if (!w) return message.reply('Usage : `+badwords add mot`');
    if (!gc.badwordsList.includes(w)) gc.badwordsList.push(w);
    await gc.save();
    return message.reply(`Ajouté : **${w}**`);
  }
  if (sub === 'remove' || sub === 'del') {
    const w = parsed.args.slice(1).join(' ').trim().toLowerCase();
    gc.badwordsList = gc.badwordsList.filter((x) => x !== w);
    await gc.save();
    return message.reply(`Retiré : **${w}**`);
  }
  return message.reply('Usage : `+badwords list|add|remove <mot>`');
}

async function cmdStrikes(message, client, parsed) {
  if (!(await assertAccess(message, 'strikes', COMMAND_META.strikes))) return;
  const m = await resolveMember(message, parsed.args);
  if (!m) return message.reply('Usage : `+strikes @membre`');
  const n = await Sanction.countDocuments({ guildId: message.guild.id, userId: m.id, type: 'warn' });
  await message.reply(`${m} a **${n}** strike(s) (warns).`);
}

async function cmdAncien(message, client, parsed) {
  if (!(await assertAccess(message, 'ancien', COMMAND_META.ancien))) return;
  await message.guild.members.fetch().catch(() => null);
  const sorted = [...message.guild.members.cache.values()]
    .filter((m) => !m.user.bot)
    .sort((a, b) => (a.joinedTimestamp || 0) - (b.joinedTimestamp || 0))
    .slice(0, 15);
  const lines = sorted.map((m, i) => `${i + 1}. ${m.user.tag} — <t:${Math.floor((m.joinedTimestamp || 0) / 1000)}:D>`);
  await message.reply({ embeds: [new EmbedBuilder().setTitle('Ancienneté').setDescription(lines.join('\n')).setColor(await colorOf(message))] });
}

async function cmdPerms(message, client, parsed) {
  if (!(await assertAccess(message, 'perms', COMMAND_META.perms))) return;
  const m = await resolveMember(message, parsed.args);
  const ch = message.channel;
  if (!m) return message.reply('Usage : `+perms @membre`');
  const ow = ch.permissionOverwrites?.cache?.get(m.id);
  const allow = ow?.allow?.toArray().join(', ') || '—';
  const deny = ow?.deny?.toArray().join(', ') || '—';
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle(`Overwrites — ${m.user.tag} — #${ch.name}`)
        .addFields(
          { name: 'Allow', value: allow.slice(0, 1024) || '—' },
          { name: 'Deny', value: deny.slice(0, 1024) || '—' }
        )
        .setColor(await colorOf(message)),
    ],
  });
}

async function cmdImage(message, client, parsed) {
  return util.pic(message, parsed.args);
}

async function cmdSuggestion(message, client, parsed) {
  if ((parsed.args[0] || '').toLowerCase() === 'settings') {
    return cmdSuggestionSettings(message, client, parsed);
  }
  if (!(await assertAccess(message, 'suggestion', COMMAND_META.suggestion))) return;
  const text = parsed.args.join(' ').trim();
  if (!text) return message.reply('Usage : `+suggestion <idée>`');
  const gc = await getOrCreateGuild(message.guild.id);
  const ch = gc.suggestionChannelId ? await message.guild.channels.fetch(gc.suggestionChannelId).catch(() => null) : null;
  if (!ch?.isTextBased?.()) {
    return message.reply('Définis un salon avec `+suggestion settings #salon`.');
  }
  const c = await colorOf(message);
  await ch.send({
    embeds: [
      new EmbedBuilder().setTitle('💡 Suggestion').setDescription(text).setFooter({ text: `Par ${message.author.tag}` }).setColor(c),
    ],
  });
  await message.reply('Suggestion envoyée.');
}

async function cmdLb(message, client, parsed) {
  if ((parsed.args[0] || '').toLowerCase() !== 'suggestions') {
    return message.reply('Usage : `+lb suggestions` (aucun score stocké — retourne 0).');
  }
  await message.reply('**Leaderboard suggestions** : données non agrégées sur Sayuri (0 entrée).');
}

async function cmdTicket(message, client, parsed) {
  if ((parsed.args[0] || '').toLowerCase() !== 'settings') {
    return message.reply('Usage : `+ticket settings #catégorie`');
  }
  if (!(await assertAccess(message, 'ticket', COMMAND_META.ticket))) return;
  const cat = message.mentions.channels.first();
  if (!cat || cat.type !== ChannelType.GuildCategory) {
    return message.reply('Mentionne une **catégorie**.');
  }
  const gc = await getOrCreateGuild(message.guild.id);
  gc.ticketCategoryId = cat.id;
  await gc.save();
  await message.reply(`Catégorie tickets : **${cat.name}**`);
}

async function cmdSuggestionSettings(message, client, parsed) {
  if (!(await assertAccess(message, 'suggestion', COMMAND_META.suggestion))) return;
  const args = (parsed.args[0] || '').toLowerCase() === 'settings' ? parsed.args.slice(1) : parsed.args;
  const ch =
    message.mentions.channels.first() ||
    (args[0] && /^\d+$/.test(args[0]) ? await message.guild.channels.fetch(args[0]).catch(() => null) : null);
  const gc = await getOrCreateGuild(message.guild.id);
  if (!ch) {
    return message.reply(gc.suggestionChannelId ? `Salon : <#${gc.suggestionChannelId}>` : 'Usage : `+suggestion settings #salon`');
  }
  gc.suggestionChannelId = ch.id;
  await gc.save();
  await message.reply(`Suggestions : ${ch}`);
}

async function cmdJoinSettings(message, client, parsed) {
  if (!(await assertAccess(message, 'join', COMMAND_META.join))) return;
  const rest = (parsed.args[0] || '').toLowerCase() === 'settings' ? parsed.args.slice(1) : parsed.args;
  const ch =
    message.mentions.channels.first() ||
    (rest[0] && /^\d+$/.test(rest[0]) ? await message.guild.channels.fetch(rest[0]).catch(() => null) : null);
  const gc = await getOrCreateGuild(message.guild.id);
  if (!ch) {
    return message.reply(gc.welcomeChannelId ? `Bienvenue : <#${gc.welcomeChannelId}>` : 'Usage : `+join settings #salon`');
  }
  gc.welcomeChannelId = ch.id;
  await gc.save();
  await message.reply(`Salon bienvenue : ${ch}`);
}

async function cmdLeaveSettings(message, client, parsed) {
  if (!(await assertAccess(message, 'leave', COMMAND_META.leave))) return;
  const rest = (parsed.args[0] || '').toLowerCase() === 'settings' ? parsed.args.slice(1) : parsed.args;
  const ch =
    message.mentions.channels.first() ||
    (rest[0] && /^\d+$/.test(rest[0]) ? await message.guild.channels.fetch(rest[0]).catch(() => null) : null);
  const gc = await getOrCreateGuild(message.guild.id);
  if (!ch) {
    return message.reply(gc.leaveChannelId ? `Départs : <#${gc.leaveChannelId}>` : 'Usage : `+leave settings #salon`');
  }
  gc.leaveChannelId = ch.id;
  await gc.save();
  await message.reply(`Salon départs : ${ch}`);
}

async function cmdReportSettings(message, client, parsed) {
  if (!(await assertAccess(message, 'report', COMMAND_META.report))) return;
  const rest = (parsed.args[0] || '').toLowerCase() === 'settings' ? parsed.args.slice(1) : parsed.args;
  const ch =
    message.mentions.channels.first() ||
    (rest[0] && /^\d+$/.test(rest[0]) ? await message.guild.channels.fetch(rest[0]).catch(() => null) : null);
  const gc = await getOrCreateGuild(message.guild.id);
  if (!ch) {
    return message.reply(gc.reportChannelId ? `Report : <#${gc.reportChannelId}>` : 'Usage : `+report settings #salon`');
  }
  gc.reportChannelId = ch.id;
  await gc.save();
  await message.reply(`Salon reports : ${ch}`);
}

async function cmdShowPics(message, client, parsed) {
  if (!(await assertAccess(message, 'show', COMMAND_META.show))) return;
  if ((parsed.args[0] || '').toLowerCase() !== 'pics') {
    return message.reply('Usage : `+show pics`');
  }
  await message.guild.members.fetch().catch(() => null);
  const withAv = message.guild.members.cache.filter((m) => !m.user.bot).size;
  await message.reply(`**${withAv}** membres (affiche les avatars via \`+pic @user\`).`);
}

async function cmdGiveaway(message, client, parsed) {
  if (!(await assertAccess(message, 'giveaway', COMMAND_META.giveaway))) return;
  const dur = parsed.args[0];
  const prize = parsed.args.slice(1).join(' ') || 'Giveaway';
  const ms = parseDurationMsLong(dur, 14);
  if (!ms) return message.reply('Usage : `+giveaway 1h Prix cool`');
  const c = await colorOf(message);
  const ends = Date.now() + ms;
  const embed = new EmbedBuilder()
    .setTitle('🎉 Giveaway')
    .setDescription(`**${prize}**\n\nRéagis avec 🎉 pour participer !\nFin : <t:${Math.floor(ends / 1000)}:F>`)
    .setColor(c);
  const msg = await message.channel.send({ embeds: [embed] });
  await msg.react('🎉').catch(() => null);
  await Giveaway.create({
    guildId: message.guild.id,
    channelId: message.channel.id,
    messageId: msg.id,
    prize,
    endsAt: new Date(ends),
    hostId: message.author.id,
  });
  await message.reply('Giveaway lancé.');
}

async function cmdEnd(message, client, parsed) {
  if ((parsed.args[0] || '').toLowerCase() !== 'giveaway') {
    return message.reply('Usage : `+end giveaway`');
  }
  if (!(await assertAccess(message, 'end', COMMAND_META.end))) return;
  const g = await Giveaway.findOne({ guildId: message.guild.id, ended: false }).sort({ endsAt: 1 });
  if (!g) return message.reply('Aucun giveaway actif.');
  await finalizeGiveaway(client, g, true);
  await message.reply('Giveaway terminé.');
}

async function cmdReroll(message, client, parsed) {
  if (!(await assertAccess(message, 'reroll', COMMAND_META.reroll))) return;
  const g = await Giveaway.findOne({ guildId: message.guild.id, ended: true }).sort({ endsAt: -1 });
  if (!g) return message.reply('Aucun giveaway terminé récent.');
  const ch = await client.channels.fetch(g.channelId).catch(() => null);
  const msg = ch?.isTextBased?.() ? await ch.messages.fetch(g.messageId).catch(() => null) : null;
  if (!msg) return message.reply('Message introuvable.');
  const reaction = msg.reactions.cache.get('🎉');
  if (!reaction) return message.reply('Pas de réactions.');
  const users = await reaction.users.fetch();
  const pool = [...users.values()].filter((u) => !u.bot);
  if (!pool.length) return message.reply('Aucun participant.');
  const win = pool[Math.floor(Math.random() * pool.length)];
  await msg.reply(`🎲 Reroll : ${win} gagne **${g.prize}** !`);
}

async function finalizeGiveaway(client, doc, early = false) {
  if (doc.ended) return;
  const ch = await client.channels.fetch(doc.channelId).catch(() => null);
  const msg = ch?.isTextBased?.() ? await ch.messages.fetch(doc.messageId).catch(() => null) : null;
  let winner = null;
  if (msg) {
    const reaction = msg.reactions.cache.get('🎉');
    if (reaction) {
      const users = await reaction.users.fetch().catch(() => null);
      if (users) {
        const pool = [...users.values()].filter((u) => !u.bot);
        if (pool.length) winner = pool[Math.floor(Math.random() * pool.length)];
      }
    }
    if (winner) await msg.reply(`🎉 Terminé ! Gagnant : ${winner} — **${doc.prize}**`).catch(() => null);
    else await msg.reply(`🎉 Terminé — **${doc.prize}** (aucun participant).`).catch(() => null);
  }
  doc.ended = true;
  await doc.save();
}

async function cmdCustom(message, client, parsed) {
  if (!(await assertAccess(message, 'custom', COMMAND_META.custom))) return;
  const trigger = (parsed.args[0] || '').toLowerCase();
  const response = parsed.args.slice(1).join(' ').trim();
  if (!trigger || !response) return message.reply('Usage : `+custom <déclencheur> <réponse>`');
  const gc = await getOrCreateGuild(message.guild.id);
  gc.customCommands = gc.customCommands || [];
  if (gc.customCommands.length >= 40) return message.reply('Limite 40 customs.');
  gc.customCommands.push({ trigger, response });
  await gc.save();
  await message.reply(`Custom **${trigger}** enregistré.`);
}

async function cmdCustomlist(message, client, parsed) {
  if (!(await assertAccess(message, 'customlist', COMMAND_META.customlist))) return;
  const gc = await getOrCreateGuild(message.guild.id);
  const list = (gc.customCommands || []).map((x) => `• **${x.trigger}** → ${x.response.slice(0, 60)}…`);
  await message.reply({ embeds: [new EmbedBuilder().setTitle('Commandes custom').setDescription(list.join('\n') || 'Aucune.').setColor(await colorOf(message))] });
}

async function cmdRestrictFixed(message, client, parsed) {
  if (!(await assertAccess(message, 'restrict', COMMAND_META.restrict))) return;
  const m = await resolveMember(message, parsed.args);
  if (!m) return message.reply('Usage : `+restrict @membre [raison]`');
  const reason = parsed.args.filter((a) => !a.includes(m.id) && !a.startsWith('<@')).join(' ') || 'Restrict';
  const max = 28 * 24 * 3600 * 1000;
  await m.timeout(max, reason).catch((e) => message.reply(e.message));
  await message.reply(`${m} restreint (timeout max).`);
}

async function cmdUnrestrict(message, client, parsed) {
  return cmdUnmute(message, client, parsed);
}

async function cmdMp(message, client, parsed) {
  if (!(await assertOwner(message))) return;
  const u = await resolveUser(message, parsed.args);
  if (!u) return message.reply('Usage : `+mp @user <message>`');
  const text = parsed.args.filter((a) => !a.includes(u.id) && !a.startsWith('<@')).join(' ').trim();
  if (!text) return message.reply('Message vide.');
  await u.send(text).catch((e) => message.reply(`Impossible : ${e.message}`));
  await message.reply('MP envoyé.');
}

async function cmdMpRouter(message, client, parsed) {
  if ((parsed.args[0] || '').toLowerCase() === 'settings') {
    return cmdMpSettings(message, client, parsed);
  }
  return cmdMp(message, client, parsed);
}

async function cmdFivem(message, client, parsed) {
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle('FiveM')
        .setDescription('Sayuri ne bridge pas FiveM nativement. Utilise un bot dédié ou un webhook sortant.')
        .setColor(await colorOf(message)),
    ],
  });
}

async function cmdDiscussion(message, client, parsed) {
  await message.reply('Utilise les **fil(s) de discussion** Discord ou un salon dédié.');
}

async function cmdMpSettings(message, client, parsed) {
  await message.reply('Pas de panneau MP intégré — utilise les réglages Discord utilisateur.');
}

async function cmdHelptype(message, client, parsed) {
  await message.reply('Sayuri : préfixe dynamique (`+` ou préfixe serveur) et `/help`.');
}

async function cmdAlias(message, client, parsed) {
  await message.reply('Alias : utilise les customs `+custom déclencheur réponse` ou les raccourcis Discord.');
}

async function cmdHelpalias(message, client, parsed) {
  return cmdAlias(message, client, parsed);
}

async function cmdUpdatebot(message, client, parsed) {
  if (!(await assertOwner(message))) return;
  await message.reply('Mets à jour via **Railway** / `git pull` + redémarrage — pas d’auto-update intégré.');
}

async function cmdAutoupdate(message, client, parsed) {
  return cmdUpdatebot(message, client, parsed);
}

async function cmdReset(message, client, parsed) {
  if ((parsed.args[0] || '').toLowerCase() !== 'server') {
    return message.reply('Usage : `+reset server confirm`');
  }
  if (!(await assertOwner(message))) return;
  if (parsed.args[1]?.toLowerCase() !== 'confirm') {
    return message.reply('⚠️ `+reset server confirm` réinitialise la **config Sayuri** de ce serveur.');
  }
  await GuildConfig.deleteOne({ guildId: message.guild.id });
  await getOrCreateGuild(message.guild.id);
  invalidateGuild(message.guild.id);
  await message.reply('Config Sayuri de ce serveur réinitialisée.');
}

async function cmdResetall(message, client, parsed) {
  if (!(await assertOwner(message))) return;
  if ((parsed.args[0] || '').toLowerCase() !== 'confirm') {
    return message.reply('⚠️ `+resetall confirm` supprime **toutes** les GuildConfig.');
  }
  await GuildConfig.deleteMany({});
  invalidateGlobal();
  clearAllGuildPrefixes();
  await message.reply('Toutes les configs serveur ont été supprimées.');
}

async function cmdChange(message, client, parsed) {
  if ((parsed.args[0] || '').toLowerCase() === 'reset') {
    return cmdChangeReset(message, client, { ...parsed, args: parsed.args.slice(1) });
  }
  if (!(await assertAccess(message, 'change', COMMAND_META.change))) return;
  const m = message.mentions.members.first();
  const nick = parsed.args.filter((a) => !a.startsWith('<@') && !a.includes(m?.id || '')).join(' ').trim();
  if (!m || !nick) return message.reply('Usage : `+change @membre nouveau pseudo`');
  if (!m.manageable) return message.reply('Impossible.');
  await m.setNickname(nick.slice(0, 32)).catch((e) => message.reply(e.message));
  await message.reply('Pseudo mis à jour.');
}

async function cmdChangeall(message, client, parsed) {
  if (!(await assertAccess(message, 'changeall', COMMAND_META.changeall))) return;
  const nick = parsed.args.join(' ').trim();
  if (!nick) return message.reply('Usage : `+changeall NouveauPseudo` (appliqué aux membres modifiables, max 30)');
  await message.guild.members.fetch().catch(() => null);
  let n = 0;
  for (const m of message.guild.members.cache.values()) {
    if (m.user.bot || !m.manageable) continue;
    await m.setNickname(nick.slice(0, 32)).catch(() => null);
    n += 1;
    if (n >= 30) break;
  }
  await message.reply(`**${n}** pseudo(s) modifié(s).`);
}

async function cmdChangeReset(message, client, parsed) {
  if (!(await assertAccess(message, 'change', COMMAND_META.change))) return;
  const m = message.mentions.members.first();
  if (!m) return message.reply('Usage : `+change reset @membre`');
  await m.setNickname(null).catch((e) => message.reply(e.message));
  await message.reply('Pseudo réinitialisé.');
}

async function cmdCreation(message, client, parsed) {
  if ((parsed.args[0] || '').toLowerCase() !== 'limit') {
    return message.reply('Usage : `+creation limit <nombre>` (stocké, non appliqué automatiquement).');
  }
  if (!(await assertAccess(message, 'creation', COMMAND_META.creation))) return;
  const n = parseInt(parsed.args[1], 10);
  const gc = await getOrCreateGuild(message.guild.id);
  gc.creationLimit = Number.isNaN(n) ? 0 : Math.min(500, Math.max(0, n));
  await gc.save();
  await message.reply(`Limite de création enregistrée : **${gc.creationLimit}** (0 = désactivé).`);
}

async function cmdButton(message, client, parsed) {
  await message.reply('Boutons Discord : crée des messages avec composants via l’API ou le client Discord (Sayuri ne génère pas de builder ici).');
}

async function cmdFormulaire(message, client, parsed) {
  await message.reply('Utilise les **formulaires** natifs Discord (Paramètres serveur → Intégrations).');
}

async function cmdRolemenu(message, client, parsed) {
  await message.reply('Menu de rôles : utilise les **menus déroulants** Discord ou un bot dédié ; Sayuri garde `+rolemembers` / `+addrole`.');
}

async function cmdClaim(message, client, parsed) {
  await message.reply('Ticket **claim** : mentionne le staff ou renomme le salon manuellement.');
}

async function cmdClose(message, client, parsed) {
  if (!(await assertAccess(message, 'close', COMMAND_META.close))) return;
  const gc = await getOrCreateGuild(message.guild.id);
  const ch = message.channel;
  if (gc.ticketCategoryId && ch.parentId === gc.ticketCategoryId) {
    await ch.delete().catch((e) => message.reply(e.message));
    return;
  }
  await message.reply('Ce salon n’est pas détecté comme ticket (catégorie `+ticket settings`).');
}

async function cmdTempvoc(message, client, parsed) {
  await message.reply('Salons vocaux temporaires : crée une catégorie dédiée et des salons manuellement, ou un bot spécialisé.');
}

async function cmdTwitch(message, client, parsed) {
  await message.reply('Alertes Twitch : utilise les **intégrations** Discord ou Streamcord, etc.');
}

async function cmdReminder(message, client, parsed) {
  await message.reply('Rappels : utilise les rappels Discord natifs ou `+giveaway` pour des fins datées.');
}

async function cmdSoutien(message, client, parsed) {
  await message.reply(config.crowSupportUrl);
}

async function cmdSetPerm(message, client, parsed) {
  await message.reply('Permissions avancées : utilise les paramètres de rôles Discord ou `+perms`.');
}

async function cmdDelPerm(message, client, parsed) {
  return cmdSetPerm(message, client, parsed);
}

async function cmdClearPerms(message, client, parsed) {
  return message.reply('Réinitialise les overwrites d’un salon via l’interface Discord (clic droit salon → permissions).');
}

async function cmdModmail(message, client, parsed) {
  return cmdOpenmodmail(message, client, parsed);
}

async function cmdAutopublish(message, client, parsed) {
  if (!(await assertAccess(message, 'autopublish', COMMAND_META.autopublish))) return;
  const ch = message.mentions.channels.first() || message.channel;
  const gc = await getOrCreateGuild(message.guild.id);
  gc.autopublishChannelIds = gc.autopublishChannelIds || [];
  const i = gc.autopublishChannelIds.indexOf(ch.id);
  if (i >= 0) {
    gc.autopublishChannelIds.splice(i, 1);
    await gc.save();
    return message.reply(`${ch} retiré de l’auto-publish.`);
  }
  gc.autopublishChannelIds.push(ch.id);
  await gc.save();
  await message.reply(`${ch} : messages **annonces** seront publiés automatiquement (listener actif).`);
}

async function cmdNewsticker(message, client, parsed) {
  await message.reply('Stickers : ajoute-les via **Paramètres serveur → Stickers** (Sayuri ne crée pas de sticker fichier ici).');
}

async function cmdAntitoken(message, client, parsed) {
  await message.reply('Anti-token : active **Anti-bot** + vérifie les intégrations OAuth du serveur.');
}

async function cmdAntiupdate(message, client, parsed) {
  await message.reply('Anti-update : surveille manuellement les mises à jour de rôles/salons ou utilise les logs Discord natifs.');
}

async function cmdAntichannel(message, client, parsed) {
  return toggleAntiraid(message, 'antiraidAntiChannel', 'Anti création salon', 'antichannel');
}

async function cmdAntirole(message, client, parsed) {
  return toggleAntiraid(message, 'antiraidAntiRole', 'Anti création rôle', 'antirole');
}

async function cmdAntiwebhook(message, client, parsed) {
  return toggleAntiraid(message, 'antiraidAntiWebhook', 'Anti webhook', 'antiwebhook');
}

async function cmdAntiunban(message, client, parsed) {
  return toggleAntiraid(message, 'antiraidAntiUnban', 'Anti-unban', 'antiunban');
}

async function cmdAntibot(message, client, parsed) {
  return toggleAntiraid(message, 'antiraidAntiBot', 'Anti-bot', 'antibot');
}

async function cmdAntiban(message, client, parsed) {
  return toggleAntiraid(message, 'antiraidAntiBan', 'Anti-ban', 'antiban');
}

async function cmdAntieveryone(message, client, parsed) {
  return toggleAntiraid(message, 'antiraidAntiEveryone', 'Anti-@everyone', 'antieveryone');
}

async function cmdAntideco(message, client, parsed) {
  await message.reply('Anti-déco : non implémenté (événements vocaux partiels).');
}

async function cmdBlrank(message, client, parsed) {
  await message.reply('Blrank : utilise **+massiverole** / **+derank** ciblés.');
}

async function cmdAutodelete(message, client, parsed) {
  await message.reply('Auto-delete salon : utilise le **slowmode** ou supprime manuellement.');
}

async function cmdGet(message, client, parsed) {
  if ((parsed.args[0] || '').toLowerCase() !== 'lang') {
    return message.reply('Usage : `+get lang`');
  }
  const gc = await getOrCreateGuild(message.guild.id);
  await message.reply(`Langue serveur (Sayuri) : **${gc.guildLang || 'fr'}**`);
}

async function cmdLang(message, client, parsed) {
  if ((parsed.args[0] || '').toLowerCase() === 'custom') {
    return message.reply('Langue custom : non gérée — utilise `+set lang <code>`.');
  }
  return message.reply('Usage : `+lang custom` ou `+set lang fr`');
}

const handlers = {
  say: cmdSay,
  embed: cmdEmbed,
  slowmode: cmdSlowmode,
  hide: cmdHide,
  unhide: cmdUnhide,
  hideall: cmdHideall,
  unhideall: cmdUnhideall,
  lockall: cmdLockall,
  unlockall: cmdUnlockall,
  banlist: cmdBanlist,
  mute: cmdMute,
  unmute: cmdUnmute,
  tempmute: cmdTempmute,
  tempban: cmdTempban,
  cmute: cmdCmute,
  uncmute: cmdUncmute,
  tempcmute: cmdTempcmute,
  mutelist: cmdMutelist,
  unmuteall: cmdUnmuteall,
  derank: cmdDerank,
  noderank: cmdNoderank,
  rename: cmdRename,
  cleanup: cmdCleanup,
  invite: cmdInvite,
  voicemove: cmdVoicemove,
  voicekick: cmdVoicekick,
  sync: cmdSync,
  unbanall: cmdUnbanall,
  choose: cmdChoose,
  backup: cmdBackup,
  loading: cmdLoading,
  create: cmdCreate,
  massiverole: cmdMassiverole,
  unmassiverole: cmdUnmassiverole,
  renew: cmdRenew,
  temprole: cmdTemprole,
  untemprole: cmdUntemprole,
  bringall: cmdBringall,
  openmodmail: cmdOpenmodmail,
  prefix: cmdPrefix,
  mainprefix: cmdMainprefix,
  muterole: cmdMuterole,
  set: cmdSet,
  bl: cmdBl,
  unbl: cmdUnbl,
  blinfo: cmdBlinfo,
  wl: cmdWl,
  unwl: cmdUnwl,
  owner: cmdOwner,
  unowner: cmdUnowner,
  leave: cmdLeaveRouter,
  playto: cmdPlayto,
  listen: cmdListen,
  watch: cmdWatch,
  compet: cmdCompet,
  stream: cmdStream,
  remove: cmdRemove,
  online: cmdOnline,
  idle: cmdIdle,
  dnd: cmdDnd,
  invisible: cmdInvisible,
  raidlog: cmdRaidlog,
  raidping: cmdRaidping,
  secur: cmdSecur,
  punition: cmdPunition,
  punish: cmdPunition,
  modlog: cmdModlog,
  messagelog: cmdMessagelog,
  voicelog: cmdVoicelog,
  boostlog: cmdBoostlog,
  rolelog: cmdRolelog,
  autoconfiglog: cmdAutoconfiglog,
  nolog: cmdNolog,
  boostembed: cmdBoostembed,
  public: cmdPublic,
  piconly: cmdPiconly,
  spam: cmdSpam,
  link: cmdLink,
  antispam: cmdAntispam,
  antilink: cmdAntilink,
  antimassmention: cmdAntimassmention,
  autoreact: cmdAutoreact,
  badwords: cmdBadwords,
  strikes: cmdStrikes,
  ancien: cmdAncien,
  perms: cmdPerms,
  image: cmdImage,
  suggestion: cmdSuggestion,
  lb: cmdLb,
  ticket: cmdTicket,
  join: cmdJoinSettings,
  report: cmdReportSettings,
  show: cmdShowPics,
  giveaway: cmdGiveaway,
  end: cmdEnd,
  reroll: cmdReroll,
  custom: cmdCustom,
  customlist: cmdCustomlist,
  restrict: cmdRestrictFixed,
  unrestrict: cmdUnrestrict,
  mp: cmdMpRouter,
  fivem: cmdFivem,
  discussion: cmdDiscussion,
  helptype: cmdHelptype,
  alias: cmdAlias,
  helpalias: cmdHelpalias,
  updatebot: cmdUpdatebot,
  autoupdate: cmdAutoupdate,
  reset: cmdReset,
  resetall: cmdResetall,
  change: cmdChange,
  changeall: cmdChangeall,
  creation: cmdCreation,
  button: cmdButton,
  formulaire: cmdFormulaire,
  rolemenu: cmdRolemenu,
  claim: cmdClaim,
  close: cmdClose,
  tempvoc: cmdTempvoc,
  twitch: cmdTwitch,
  reminder: cmdReminder,
  soutien: cmdSoutien,
  modmail: cmdModmail,
  autopublish: cmdAutopublish,
  newsticker: cmdNewsticker,
  antitoken: cmdAntitoken,
  antiupdate: cmdAntiupdate,
  antichannel: cmdAntichannel,
  antirole: cmdAntirole,
  antiwebhook: cmdAntiwebhook,
  antiban: cmdAntiban,
  antibot: cmdAntibot,
  antieveryone: cmdAntieveryone,
  antiunban: cmdAntiunban,
  antideco: cmdAntideco,
  blrank: cmdBlrank,
  autodelete: cmdAutodelete,
  del: cmdDelSanction,
  get: cmdGet,
  lang: cmdLang,
};

handlers.antiraid = cmdSecur;

module.exports = { tryClearSubcommands, handlers, finalizeGiveaway, cmdServerList };
