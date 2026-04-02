const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const VoiceStat = require('../models/VoiceStat');
const { isStaff, getGestionRoleId } = require('../util/permissions');
const { msToHuman } = require('../util/format');
const { getGuildEmbedColor } = require('../util/embedTheme');

async function canUse(member) {
  const rid = await getGestionRoleId(member.guild.id);
  if (rid && member.roles.cache.has(rid)) return true;
  return isStaff(member);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('podium')
    .setDescription(
      'Affiche le top 20 des personnes ayant le plus de temps en vocal (Rôle Gestion).'
    ),
  async execute(interaction) {
    if (!(await canUse(interaction.member))) {
      return interaction.reply({
        content: 'Réservé au staff ou au rôle Gestion.',
        ephemeral: true,
      });
    }
    const rid = await getGestionRoleId(interaction.guild.id);
    if (!rid) {
      return interaction.reply({
        content:
          'Aucun rôle Gestion configuré. Utilise `/config gestion-role` ou `GESTION_ROLE_ID`.',
        ephemeral: true,
      });
    }
    await interaction.guild.members.fetch().catch(() => null);
    const stats = await VoiceStat.find({ guildId: interaction.guild.id }).sort({ totalMs: -1 }).limit(200).lean();
    const rows = [];
    for (const s of stats) {
      const m = interaction.guild.members.cache.get(s.userId);
      if (m && m.roles.cache.has(rid) && !m.user.bot) {
        rows.push({ m, ms: s.totalMs });
      }
      if (rows.length >= 20) break;
    }
    const lines = rows.map((r, i) => {
      return `**${i + 1}.** ${r.m.displayName} — ${msToHuman(r.ms)}`;
    });
    const color = await getGuildEmbedColor(interaction.guild.id);
    const embed = new EmbedBuilder()
      .setTitle('Podium vocal — Gestion (top 20)')
      .setDescription(lines.length ? lines.join('\n') : 'Pas encore de données vocales.')
      .setColor(color);
    await interaction.reply({ embeds: [embed] });
  },
  async executePrefix(message) {
    if (!(await canUse(message.member))) {
      return message.reply('Réservé au staff ou au rôle Gestion.');
    }
    const rid = await getGestionRoleId(message.guild.id);
    if (!rid) {
      return message.reply(
        'Aucun rôle Gestion configuré. Utilise `+config gestion @Rôle` ou `GESTION_ROLE_ID`.'
      );
    }
    await message.guild.members.fetch().catch(() => null);
    const stats = await VoiceStat.find({ guildId: message.guild.id }).sort({ totalMs: -1 }).limit(200).lean();
    const rows = [];
    for (const s of stats) {
      const m = message.guild.members.cache.get(s.userId);
      if (m && m.roles.cache.has(rid) && !m.user.bot) {
        rows.push({ m, ms: s.totalMs });
      }
      if (rows.length >= 20) break;
    }
    const lines = rows.map((r, i) => {
      return `**${i + 1}.** ${r.m.displayName} — ${msToHuman(r.ms)}`;
    });
    const color = await getGuildEmbedColor(message.guild.id);
    const embed = new EmbedBuilder()
      .setTitle('Podium vocal — Gestion (top 20)')
      .setDescription(lines.length ? lines.join('\n') : 'Pas encore de données vocales.')
      .setColor(color);
    return message.reply({ embeds: [embed] });
  },
};
