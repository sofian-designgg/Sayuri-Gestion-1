const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const MessageStat = require('../models/MessageStat');
const { isStaff } = require('../util/permissions');
const { getGuildEmbedColor, progressBar, rankingLines } = require('../util/embedTheme');

function channelLabel(guild, channelId) {
  const ch = guild.channels.cache.get(channelId);
  if (!ch) return `<#${channelId}>`;
  if (ch.isThread()) return `#${ch.name} (fil)`;
  return `#${ch.name}`;
}

async function totalForUser(guildId, userId) {
  const agg = await MessageStat.aggregate([
    { $match: { guildId, userId } },
    { $group: { _id: null, t: { $sum: '$count' } } },
  ]);
  return agg[0]?.t ?? 0;
}

async function buildUserEmbed(guild, targetUser, color) {
  const guildId = guild.id;
  const userId = targetUser.id;
  const total = await totalForUser(guildId, userId);
  const rows = await MessageStat.find({ guildId, userId }).sort({ count: -1 }).limit(8).lean();

  const activityRatio = Math.min(1, total / 5000);

  const topRows = rows.map((r) => ({
    label: channelLabel(guild, r.channelId),
    value: r.count,
  }));

  const ranking =
    topRows.length > 0
      ? rankingLines(topRows, 11)
      : '_Aucun message enregistré depuis que le bot compte les stats._';

  let description =
    `**💬 Total ·** **${total.toLocaleString('fr-FR')}** messages\n\n` +
    `${progressBar(activityRatio, 16)}\n` +
    `_Indicateur : 5 000 messages ≈ jauge pleine_\n\n` +
    `**🏆 Classement de tes salons**\n` +
    ranking;

  if (description.length > 4096) {
    description = `${description.slice(0, 4090)}…`;
  }

  return new EmbedBuilder()
    .setAuthor({ name: `${targetUser.username} · messages`, iconURL: targetUser.displayAvatarURL({ size: 64 }) })
    .setTitle('📊 Statistiques de messages')
    .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
    .setColor(color)
    .setDescription(description)
    .setFooter({ text: 'Sayuri Gestion · comptage à partir du déploiement du bot' });
}

async function buildServerEmbed(guild, color) {
  const guildId = guild.id;
  const top = await MessageStat.aggregate([
    { $match: { guildId } },
    { $group: { _id: '$channelId', total: { $sum: '$count' } } },
    { $sort: { total: -1 } },
    { $limit: 12 },
  ]);

  if (!top.length) {
    return new EmbedBuilder()
      .setTitle('📈 Classement des salons')
      .setDescription('_Pas encore de données._')
      .setColor(color)
      .setFooter({ text: 'Sayuri Gestion' });
  }

  const rows = top.map((t) => ({
    label: channelLabel(guild, t._id),
    value: t.total,
  }));

  const ranking = rankingLines(rows, 14);

  const grandTotalAgg = await MessageStat.aggregate([
    { $match: { guildId } },
    { $group: { _id: null, t: { $sum: '$count' } } },
  ]);
  const grand = grandTotalAgg[0]?.t ?? 0;

  let desc =
    `**📨 Total enregistré ·** **${grand.toLocaleString('fr-FR')}** messages\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    ranking;
  if (desc.length > 4096) desc = `${desc.slice(0, 4090)}…`;

  return new EmbedBuilder()
    .setAuthor({ name: guild.name, iconURL: guild.iconURL({ size: 64 }) || undefined })
    .setTitle('📈 Classement des salons du serveur')
    .setDescription(desc)
    .setColor(color)
    .setFooter({ text: 'Sayuri Gestion · salons texte / annonces / fils' });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('msg')
    .setDescription('Statistiques de messages et classement des salons.')
    .addSubcommand((sc) =>
      sc
        .setName('stats')
        .setDescription('Nombre de messages et top des salons où tu écris le plus.')
        .addUserOption((o) =>
          o.setName('membre').setDescription('Autre membre (réservé au staff)').setRequired(false)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName('serveur')
        .setDescription('Top des salons les plus actifs sur le serveur.')
    ),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const color = await getGuildEmbedColor(interaction.guild.id);

    if (sub === 'serveur') {
      const embed = await buildServerEmbed(interaction.guild, color);
      return interaction.reply({ embeds: [embed] });
    }

    const opt = interaction.options.getUser('membre');
    const target = opt || interaction.user;
    if (opt && opt.id !== interaction.user.id && !isStaff(interaction.member)) {
      return interaction.reply({
        content: 'Tu ne peux voir que tes propres stats (ou demande au staff).',
        ephemeral: true,
      });
    }

    const embed = await buildUserEmbed(interaction.guild, target, color);
    return interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const color = await getGuildEmbedColor(message.guild.id);
    const mode = (args[0] || '').toLowerCase();

    if (mode === 'serveur' || mode === 'top' || mode === 'server') {
      const embed = await buildServerEmbed(message.guild, color);
      return message.reply({ embeds: [embed] });
    }

    let target = message.mentions.users.first();
    if (args[0] && /^\d+$/.test(args[0]) && !target) {
      target = await message.client.users.fetch(args[0]).catch(() => null);
    }
    if (!target) target = message.author;

    if (target.id !== message.author.id && !isStaff(message.member)) {
      return message.reply('Tu ne peux voir que tes propres stats (ou demande au staff).');
    }

    const embed = await buildUserEmbed(message.guild, target, color);
    return message.reply({ embeds: [embed] });
  },
};
