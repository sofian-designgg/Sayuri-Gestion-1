const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isStaff, getGestionRoleId } = require('../util/permissions');
const { getGuildEmbedColor } = require('../util/embedTheme');

async function canUse(member) {
  const rid = await getGestionRoleId(member.guild.id);
  if (rid && member.roles.cache.has(rid)) return true;
  return isStaff(member);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('check')
    .setDescription('Vérifie le statut vocal des membres des Gestions.'),
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
          'Aucun rôle Gestion configuré. Utilise `/config gestion-role` ou la variable `GESTION_ROLE_ID`.',
        ephemeral: true,
      });
    }
    await interaction.guild.members.fetch().catch(() => null);
    const withRole = interaction.guild.members.cache.filter((m) => m.roles.cache.has(rid) && !m.user.bot);
    const lines = [];
    for (const m of withRole.sort((a, b) => a.displayName.localeCompare(b.displayName)).values()) {
      const vc = m.voice.channel;
      if (vc) {
        lines.push(`**${m.displayName}** → 🔊 ${vc.name}`);
      } else {
        lines.push(`**${m.displayName}** → pas en vocal`);
      }
    }
    const color = await getGuildEmbedColor(interaction.guild.id);
    const embed = new EmbedBuilder()
      .setTitle('Statut vocal — Gestion')
      .setDescription(lines.length ? lines.join('\n') : 'Aucun membre avec ce rôle.')
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
    const withRole = message.guild.members.cache.filter((m) => m.roles.cache.has(rid) && !m.user.bot);
    const lines = [];
    for (const m of withRole.sort((a, b) => a.displayName.localeCompare(b.displayName)).values()) {
      const vc = m.voice.channel;
      if (vc) {
        lines.push(`**${m.displayName}** → 🔊 ${vc.name}`);
      } else {
        lines.push(`**${m.displayName}** → pas en vocal`);
      }
    }
    const color = await getGuildEmbedColor(message.guild.id);
    const embed = new EmbedBuilder()
      .setTitle('Statut vocal — Gestion')
      .setDescription(lines.length ? lines.join('\n') : 'Aucun membre avec ce rôle.')
      .setColor(color);
    return message.reply({ embeds: [embed] });
  },
};
