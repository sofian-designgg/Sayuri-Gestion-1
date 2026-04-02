const { EmbedBuilder, ChannelType } = require('discord.js');
const { Parser } = require('expr-eval');
const changelogsText = require('../data/changelogs');
const config = require('../config');
const { guildEmbedColor } = require('../lib/embedUtil');
const { resolveMember, resolveRole, resolveUser } = require('../lib/resolvers');

const calcParser = new Parser();

async function colorOf(message) {
  return guildEmbedColor(message.guild.id);
}

async function changelogs(message) {
  const c = await colorOf(message);
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle('📋 Changelogs')
        .setDescription(changelogsText)
        .setColor(c),
    ],
  });
}

async function allbots(message) {
  await message.guild.members.fetch().catch(() => null);
  const bots = message.guild.members.cache.filter((m) => m.user.bot);
  const list = bots.map((m) => `• ${m.user.tag} (\`${m.id}\`)`).join('\n') || 'Aucun bot.';
  const c = await colorOf(message);
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle('🤖 Bots sur le serveur')
        .setDescription(list.slice(0, 3900))
        .setFooter({ text: `${bots.size} bot(s)` })
        .setColor(c),
    ],
  });
}

async function alladmins(message) {
  await message.guild.members.fetch().catch(() => null);
  const { PermissionFlagsBits } = require('discord.js');
  const admins = message.guild.members.cache.filter(
    (m) => !m.user.bot && m.permissions.has(PermissionFlagsBits.Administrator)
  );
  const list = admins.map((m) => `• ${m.user.tag}`).join('\n') || 'Aucun.';
  const c = await colorOf(message);
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle('👑 Administrateurs (hors bots)')
        .setDescription(list.slice(0, 3900))
        .setFooter({ text: `${admins.size} membre(s)` })
        .setColor(c),
    ],
  });
}

async function botadmins(message) {
  await message.guild.members.fetch().catch(() => null);
  const { PermissionFlagsBits } = require('discord.js');
  const bots = message.guild.members.cache.filter(
    (m) => m.user.bot && m.permissions.has(PermissionFlagsBits.Administrator)
  );
  const list = bots.map((m) => `• ${m.user.tag}`).join('\n') || 'Aucun bot admin.';
  const c = await colorOf(message);
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle('🤖 Bots avec permission Administrateur')
        .setDescription(list.slice(0, 3900))
        .setFooter({ text: `${bots.size} bot(s)` })
        .setColor(c),
    ],
  });
}

async function boosters(message) {
  await message.guild.members.fetch().catch(() => null);
  const boosters = message.guild.members.cache.filter((m) => m.premiumSince);
  const list = boosters
    .sort((a, b) => (b.premiumSince || 0) - (a.premiumSince || 0))
    .map((m) => `• ${m.user.tag} — <t:${Math.floor(m.premiumSince.getTime() / 1000)}:R>`)
    .join('\n');
  const c = await colorOf(message);
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle('💎 Boosters')
        .setDescription((list || 'Aucun booster.').slice(0, 3900))
        .setFooter({ text: `${boosters.size} booster(s)` })
        .setColor(c),
    ],
  });
}

async function rolemembers(message, args) {
  const role = await resolveRole(message, args);
  if (!role) {
    return message.reply('Usage : `+rolemembers @Rôle` ou `+rolemembers <id>` ou nom du rôle.');
  }
  await message.guild.members.fetch().catch(() => null);
  const members = message.guild.members.cache
    .filter((m) => m.roles.cache.has(role.id) && !m.user.bot)
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'fr'));
  const list = members.map((m) => m.user.tag).join('\n') || 'Aucun membre.';
  const c = await colorOf(message);
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle(`Membres — ${role.name}`)
        .setDescription(list.length > 3800 ? `${list.slice(0, 3780)}…` : list)
        .setColor(c)
        .setFooter({ text: `${members.size} membre(s)` }),
    ],
  });
}

async function serverinfo(message) {
  const g = message.guild;
  await g.members.fetch().catch(() => null);
  const text = g.channels.cache.filter((c) => c.type === ChannelType.GuildText).size;
  const voice = g.channels.cache.filter((c) => c.type === ChannelType.GuildVoice).size;
  const c = await colorOf(message);
  const embed = new EmbedBuilder()
    .setTitle(`📊 ${g.name}`)
    .setThumbnail(g.iconURL({ size: 256 }))
    .addFields(
      { name: 'ID', value: g.id, inline: true },
      { name: 'Propriétaire', value: `<@${g.ownerId}>`, inline: true },
      { name: 'Membres', value: `${g.memberCount}`, inline: true },
      { name: 'Salons texte', value: `${text}`, inline: true },
      { name: 'Salons vocaux', value: `${voice}`, inline: true },
      { name: 'Boosts', value: `${g.premiumSubscriptionCount ?? 0} (niv. ${g.premiumTier})`, inline: true },
      { name: 'Création', value: `<t:${Math.floor(g.createdTimestamp / 1000)}:F>`, inline: false }
    )
    .setColor(c);
  await message.reply({ embeds: [embed] });
}

async function vocinfo(message) {
  await message.guild.members.fetch().catch(() => null);
  const inVoice = message.guild.members.cache.filter((m) => m.voice.channel);
  const byChannel = new Map();
  for (const m of inVoice.values()) {
    const ch = m.voice.channel;
    if (!ch) continue;
    byChannel.set(ch.id, (byChannel.get(ch.id) || 0) + 1);
  }
  const lines = [];
  for (const [id, n] of [...byChannel.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    const ch = message.guild.channels.cache.get(id);
    lines.push(`• ${ch ? ch.name : id} — **${n}**`);
  }
  const c = await colorOf(message);
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle('🔊 Activité vocale')
        .setDescription(
          `**${inVoice.size}** membre(s) en vocal\n\n${lines.length ? lines.join('\n') : 'Personne en vocal.'}`.slice(
            0,
            3900
          )
        )
        .setColor(c),
    ],
  });
}

async function role(message, args) {
  const role = await resolveRole(message, args);
  if (!role) return message.reply('Précise un rôle : `+role @Rôle`');
  await message.guild.members.fetch().catch(() => null);
  const memberCount = message.guild.members.cache.filter((m) => m.roles.cache.has(role.id)).size;
  const c = await colorOf(message);
  const embed = new EmbedBuilder()
    .setTitle(`Rôle : ${role.name}`)
    .setColor(role.color || c)
    .addFields(
      { name: 'ID', value: role.id, inline: true },
      { name: 'Membres', value: `${memberCount}`, inline: true },
      { name: 'Couleur', value: role.hexColor || '—', inline: true },
      { name: 'Mentionnable', value: role.mentionable ? 'oui' : 'non', inline: true },
      { name: 'Affichage séparé', value: role.hoist ? 'oui' : 'non', inline: true },
      { name: 'Position', value: `${role.position}`, inline: true }
    );
  await message.reply({ embeds: [embed] });
}

async function channel(message, args) {
  const ch =
    message.mentions.channels.first() ||
    (args[0] && /^\d+$/.test(args[0])
      ? await message.guild.channels.fetch(args[0]).catch(() => null)
      : message.channel);
  if (!ch || !ch.guild) return message.reply('Salon introuvable.');
  const c = await colorOf(message);
  const embed = new EmbedBuilder().setTitle(`Salon : ${ch.name}`).setColor(c).addFields(
    { name: 'ID', value: ch.id, inline: true },
    { name: 'Type', value: `${ch.type}`, inline: true },
    { name: 'NSFW', value: 'nsfw' in ch && ch.nsfw ? 'oui' : 'non', inline: true }
  );
  if ('topic' in ch && ch.topic) embed.addFields({ name: 'Sujet', value: String(ch.topic).slice(0, 1024) });
  if ('rateLimitPerUser' in ch) {
    embed.addFields({ name: 'Slowmode', value: `${ch.rateLimitPerUser || 0}s`, inline: true });
  }
  await message.reply({ embeds: [embed] });
}

async function user(message, args) {
  const u = await resolveUser(message, args);
  if (!u) return message.reply('Utilisateur introuvable.');
  const c = await colorOf(message);
  const embed = new EmbedBuilder()
    .setTitle(`Utilisateur : ${u.tag}`)
    .setThumbnail(u.displayAvatarURL({ size: 256 }))
    .setColor(c)
    .addFields(
      { name: 'ID', value: u.id, inline: true },
      { name: 'Compte créé', value: `<t:${Math.floor(u.createdTimestamp / 1000)}:R>`, inline: true },
      { name: 'Bot', value: u.bot ? 'oui' : 'non', inline: true }
    );
  await message.reply({ embeds: [embed] });
}

async function member(message, args) {
  const m = await resolveMember(message, args);
  if (!m) return message.reply('Membre introuvable.');
  const u = m.user;
  const c = await colorOf(message);
  const embed = new EmbedBuilder()
    .setTitle(`Membre : ${u.tag}`)
    .setThumbnail(u.displayAvatarURL({ size: 256 }))
    .setColor(c)
    .addFields(
      { name: 'ID', value: u.id, inline: true },
      { name: 'Pseudo serveur', value: m.nickname || '—', inline: true },
      { name: 'A rejoint', value: m.joinedTimestamp ? `<t:${Math.floor(m.joinedTimestamp / 1000)}:R>` : '—', inline: true },
      {
        name: 'Boost depuis',
        value: m.premiumSince ? `<t:${Math.floor(m.premiumSince.getTime() / 1000)}:R>` : '—',
        inline: true,
      },
      {
        name: 'Rôles',
        value:
          m.roles.cache.size > 1
            ? m.roles.cache
                .filter((r) => r.id !== message.guild.id)
                .sort((a, b) => b.position - a.position)
                .map((r) => r.toString())
                .slice(0, 20)
                .join(' ') || '—'
            : '—',
        inline: false,
      }
    );
  await message.reply({ embeds: [embed] });
}

async function pic(message, args) {
  const u = await resolveUser(message, args);
  if (!u) return message.reply('Utilisateur introuvable.');
  const url = u.displayAvatarURL({ size: 4096 });
  const c = await colorOf(message);
  await message.reply({
    embeds: [new EmbedBuilder().setTitle(`Avatar — ${u.tag}`).setImage(url).setColor(c)],
  });
}

async function banner(message, args) {
  const u = await resolveUser(message, args);
  if (!u) return message.reply('Utilisateur introuvable.');
  const full = await u.fetch().catch(() => null);
  const b = full?.bannerURL?.({ size: 4096 });
  if (!b) return message.reply('Pas de bannière ou impossible à récupérer.');
  const c = await colorOf(message);
  await message.reply({
    embeds: [new EmbedBuilder().setTitle(`Bannière — ${u.tag}`).setImage(b).setColor(c)],
  });
}

async function serverAsset(message, sub) {
  const g = message.guild;
  const c = await colorOf(message);
  if (sub === 'pic' || sub === 'icon') {
    const url = g.iconURL({ size: 4096 });
    if (!url) return message.reply('Le serveur n’a pas d’icône.');
    return message.reply({
      embeds: [new EmbedBuilder().setTitle(`Icône — ${g.name}`).setImage(url).setColor(c)],
    });
  }
  if (sub === 'banner') {
    const url = g.bannerURL({ size: 4096 });
    if (!url) return message.reply('Pas de bannière serveur.');
    return message.reply({
      embeds: [new EmbedBuilder().setTitle(`Bannière — ${g.name}`).setImage(url).setColor(c)],
    });
  }
  return message.reply('Usage : `+server pic` ou `+server banner`');
}

async function snipe(message, client) {
  const data = client.snipes?.get(message.channel.id);
  if (!data) return message.reply('Rien à snipe dans ce salon.');
  const c = await colorOf(message);
  const embed = new EmbedBuilder()
    .setTitle('🎯 Snipe')
    .setDescription(data.content ? data.content.slice(0, 3900) : '_pièce jointe / vide_')
    .addFields(
      { name: 'Auteur', value: `${data.tag} (\`${data.id}\`)`, inline: false },
      { name: 'Supprimé', value: `<t:${Math.floor(data.at / 1000)}:R>`, inline: true }
    )
    .setColor(c);
  if (data.image) embed.setImage(data.image);
  await message.reply({ embeds: [embed] });
}

async function emoji(message, args) {
  const raw = args.join(' ') || message.content;
  const custom = /<a?:(\w+):(\d+)>/.exec(raw);
  const c = await colorOf(message);
  if (custom) {
    const animated = raw.includes('<a:');
    const url = `https://cdn.discordapp.com/emojis/${custom[2]}.${animated ? 'gif' : 'png'}?size=256`;
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`Émoji :${custom[1]}:`)
          .setImage(url)
          .setColor(c),
      ],
    });
  }
  return message.reply('Envoie un émoji **custom** du serveur ou colle son format `<:nom:id>`.');
}

async function calc(message, args) {
  const expr = args.join(' ');
  if (!expr) return message.reply('Usage : `+calc 2+2`');
  let out;
  try {
    out = calcParser.evaluate(expr);
  } catch {
    return message.reply('Expression invalide.');
  }
  const c = await colorOf(message);
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle('🔢 Calcul')
        .setDescription(`\`${expr}\` = **${out}**`)
        .setColor(c),
    ],
  });
}

async function wiki(message, text) {
  if (!text) return message.reply('Usage : `+wiki mot-clé`');
  const url = `https://fr.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro&explaintext&redirects=1&titles=${encodeURIComponent(
    text
  )}`;
  const res = await fetch(url).then((r) => r.json());
  const pages = res.query?.pages;
  if (!pages) return message.reply('Aucun résultat.');
  const p = Object.values(pages)[0];
  if (p.missing != null) return message.reply('Article introuvable.');
  const extract = (p.extract || '').slice(0, 3500);
  const c = await colorOf(message);
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle(p.title)
        .setDescription(extract || 'Pas d’extrait.')
        .setURL(`https://fr.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, '_'))}`)
        .setColor(c),
    ],
  });
}

async function searchwiki(message, text) {
  if (!text) return message.reply('Usage : `+search wiki mot-clé`');
  const url = `https://fr.wikipedia.org/w/api.php?action=opensearch&format=json&search=${encodeURIComponent(
    text
  )}&limit=12`;
  const res = await fetch(url).then((r) => r.json());
  const [, titles] = res;
  if (!titles?.length) return message.reply('Aucun article trouvé.');
  const lines = titles.map((t, i) => `${i + 1}. **${t}**`).join('\n');
  const c = await colorOf(message);
  await message.reply({
    embeds: [new EmbedBuilder().setTitle('🔍 Wikipedia — résultats').setDescription(lines).setColor(c)],
  });
}

async function crowbots(message) {
  const c = await colorOf(message);
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle('Crow Bots — support')
        .setDescription(`Invitation / serveur support :\n${config.crowSupportUrl}`)
        .setFooter({ text: 'ζ͜͡Crow Bots • Préfixe actuel : +' })
        .setColor(c),
    ],
  });
}

module.exports = {
  changelogs,
  allbots,
  alladmins,
  botadmins,
  boosters,
  rolemembers,
  serverinfo,
  vocinfo,
  role,
  channel,
  user,
  member,
  pic,
  banner,
  serverAsset,
  snipe,
  emoji,
  calc,
  wiki,
  searchwiki,
  crowbots,
};
