const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Sanction = require('../models/Sanction');
const { guildEmbedColor } = require('../lib/embedUtil');
const { resolveMember, resolveRole } = require('../lib/resolvers');
const { parseDurationMs } = require('../lib/duration');

async function colorOf(message) {
  return guildEmbedColor(message.guild.id);
}

async function clear(message, args) {
  const me = message.guild.members.me;
  if (!me.permissions.has(PermissionFlagsBits.ManageMessages)) {
    return message.reply('Il me faut **Gérer les messages**.');
  }
  const n = Math.min(100, Math.max(1, parseInt(args[0], 10) || 10));
  const target = message.mentions.users.first();
  const ch = message.channel;
  const collected = await ch.messages.fetch({ limit: 80 }).catch(() => null);
  if (!collected) return message.reply('Impossible de charger les messages.');
  let toDel = [...collected.values()].filter((m) => !m.pinned && m.id !== message.id);
  if (target) toDel = toDel.filter((m) => m.author.id === target.id);
  toDel = toDel.slice(0, n);
  if (!toDel.length) return message.reply('Aucun message à supprimer.');
  await ch.bulkDelete(toDel, true).catch(() => null);
  const msg = await message.reply(`**${toDel.length}** message(s) supprimé(s).`);
  setTimeout(() => msg.delete().catch(() => null), 4000);
}

async function kick(message, args) {
  let m = message.mentions.members.first();
  if (!m && args[0] && /^\d{17,20}$/.test(args[0])) {
    m = await message.guild.members.fetch(args[0]).catch(() => null);
  }
  if (!m) return message.reply('Usage : `+kick @membre` ou `+kick <id>` [raison]');
  const reason = args
    .filter((a) => !a.startsWith('<@') && a !== m.id && !a.includes(m.id))
    .join(' ')
    .trim() || 'Sans raison';
  if (!m.kickable) return message.reply('Je ne peux pas expulser ce membre.');
  await m.kick(reason);
  const c = await colorOf(message);
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle('👢 Kick')
        .setDescription(`${m} a été expulsé.\n**Raison :** ${reason}`)
        .setColor(c),
    ],
  });
}

async function ban(message, args) {
  const m = message.mentions.members.first();
  let id = m?.id;
  let reasonArgs = args.filter((x) => !x.startsWith('<@'));
  if (!id && args[0] && /^\d{17,20}$/.test(args[0])) {
    id = args[0];
    reasonArgs = args.slice(1);
  } else if (id) {
    reasonArgs = args.filter((x) => !x.startsWith('<@') && !x.includes(id));
  }
  if (!id) return message.reply('Usage : `+ban @membre` ou `+ban <id>` [raison]');
  const reason = reasonArgs.join(' ').trim() || 'Sans raison';
  const banMember = m || (await message.guild.members.fetch(id).catch(() => null));
  if (banMember && !banMember.bannable) return message.reply('Je ne peux pas bannir ce membre.');
  try {
    await message.guild.members.ban(id, { reason });
  } catch (e) {
    return message.reply(`Erreur : ${e.message}`);
  }
  const c = await colorOf(message);
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle('🔨 Ban')
        .setDescription(`<@${id}> a été banni.\n**Raison :** ${reason}`)
        .setColor(c),
    ],
  });
}

async function unban(message, args) {
  if (!args[0]) return message.reply('Usage : `+unban <id_utilisateur>`');
  const id = args[0].replace(/\D/g, '');
  if (!/^\d{17,20}$/.test(id)) return message.reply('ID invalide.');
  await message.guild.bans.remove(id).catch((e) => message.reply(`Impossible : ${e.message}`));
  const c = await colorOf(message);
  await message.reply({
    embeds: [new EmbedBuilder().setTitle('✅ Unban').setDescription(`<@${id}> débanni.`).setColor(c)],
  });
}

async function timeout(message, args) {
  const m = message.mentions.members.first();
  if (!m) return message.reply('Usage : `+timeout @membre 10m [raison]`');
  const rest = args.filter((a) => !a.includes(m.id) && !a.startsWith('<@'));
  const dur = rest[0];
  const ms = parseDurationMs(dur);
  if (!ms) return message.reply('Durée invalide. Ex. `10m`, `2h`, `1d` (max 28j).');
  const reason = rest.slice(1).join(' ').trim() || 'Timeout';
  if (!m.moderatable) return message.reply('Je ne peux pas timeout ce membre.');
  await m.timeout(ms, reason);
  const c = await colorOf(message);
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle('⏱️ Timeout')
        .setDescription(`${m} — **${dur}**\n${reason}`)
        .setColor(c),
    ],
  });
}

async function warn(message, args) {
  const m = message.mentions.members.first();
  if (!m) return message.reply('Usage : `+warn @membre [raison]`');
  const reason = args.filter((a) => !a.includes(m.id) && !a.startsWith('<@')).join(' ').trim() || 'Avertissement';
  await Sanction.create({
    guildId: message.guild.id,
    userId: m.id,
    type: 'warn',
    reason,
    moderatorId: message.author.id,
  });
  const c = await colorOf(message);
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle('⚠️ Warn')
        .setDescription(`${m} a reçu un avertissement.\n**Raison :** ${reason}`)
        .setColor(c),
    ],
  });
}

async function sanctions(message, args) {
  const m = await resolveMember(message, args);
  if (!m) return message.reply('Membre introuvable.');
  const list = await Sanction.find({ guildId: message.guild.id, userId: m.id })
    .sort({ createdAt: -1 })
    .limit(15)
    .lean();
  const c = await colorOf(message);
  if (!list.length) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`Sanctions — ${m.user.tag}`)
          .setDescription('Aucune sanction enregistrée.')
          .setColor(c),
      ],
    });
  }
  const desc = list
    .map(
      (s, i) =>
        `**${i + 1}.** [${s.type}] ${s.reason}\n<t:${Math.floor(new Date(s.createdAt).getTime() / 1000)}:f> — <@${s.moderatorId}>`
    )
    .join('\n\n');
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle(`Sanctions — ${m.user.tag}`)
        .setDescription(desc.slice(0, 3900))
        .setColor(c),
    ],
  });
}

async function lock(message, args) {
  const ch =
    message.mentions.channels.first() ||
    (args[0] && /^\d+$/.test(args[0]) ? await message.guild.channels.fetch(args[0]).catch(() => null) : message.channel);
  if (!ch?.isTextBased?.()) return message.reply('Salon texte requis.');
  await ch.permissionOverwrites.edit(message.guild.id, { SendMessages: false }).catch((e) => message.reply(e.message));
  const c = await colorOf(message);
  await message.reply({
    embeds: [new EmbedBuilder().setTitle('🔒 Salon verrouillé').setDescription(`${ch}`).setColor(c)],
  });
}

async function unlock(message, args) {
  const ch =
    message.mentions.channels.first() ||
    (args[0] && /^\d+$/.test(args[0]) ? await message.guild.channels.fetch(args[0]).catch(() => null) : message.channel);
  if (!ch?.isTextBased?.()) return message.reply('Salon texte requis.');
  await ch.permissionOverwrites.edit(message.guild.id, { SendMessages: null }).catch((e) => message.reply(e.message));
  const c = await colorOf(message);
  await message.reply({
    embeds: [new EmbedBuilder().setTitle('🔓 Salon déverrouillé').setDescription(`${ch}`).setColor(c)],
  });
}

async function addrole(message, args) {
  const m = message.mentions.members.first();
  const role = message.mentions.roles.first();
  if (!m || !role) return message.reply('Usage : `+addrole @membre @rôle`');
  if (!m.manageable) return message.reply('Je ne peux pas modifier ce membre.');
  await m.roles.add(role).catch((e) => message.reply(e.message));
  const c = await colorOf(message);
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle('➕ Rôle ajouté')
        .setDescription(`${m} → ${role}`)
        .setColor(c),
    ],
  });
}

async function delrole(message, args) {
  const m = message.mentions.members.first();
  const role = message.mentions.roles.first();
  if (!m || !role) return message.reply('Usage : `+delrole @membre @rôle`');
  if (!m.manageable) return message.reply('Je ne peux pas modifier ce membre.');
  await m.roles.remove(role).catch((e) => message.reply(e.message));
  const c = await colorOf(message);
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle('➖ Rôle retiré')
        .setDescription(`${m} → ${role}`)
        .setColor(c),
    ],
  });
}

module.exports = {
  clear,
  kick,
  ban,
  unban,
  timeout,
  warn,
  sanctions,
  lock,
  unlock,
  addrole,
  delrole,
};
