const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isStaff } = require('../util/permissions');

const CHUNK = 4000;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rlm')
    .setDescription('Récupère les membres d’un rôle spécifique (Scan Séquentiel Stable).')
    .addRoleOption((o) => o.setName('role').setDescription('Rôle à scanner').setRequired(true)),
  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: 'Permission refusée.', ephemeral: true });
    }
    const role = interaction.options.getRole('role', true);
    await interaction.deferReply();
    await interaction.guild.members.fetch().catch(() => null);
    const members = interaction.guild.members.cache
      .filter((m) => m.roles.cache.has(role.id) && !m.user.bot)
      .sort((a, b) => a.displayName.localeCompare(b.displayName, 'fr', { sensitivity: 'base' }));
    const list = members.map((m) => m.user.tag).join('\n') || 'Aucun membre.';
    const embed = new EmbedBuilder()
      .setTitle(`Membres — ${role.name}`)
      .setDescription(list.length > CHUNK ? `${list.slice(0, CHUNK - 20)}…` : list)
      .setColor(role.color || 0x5865f2)
      .setFooter({ text: `${members.size} membre(s)` });
    await interaction.editReply({ embeds: [embed] });
  },
  async executePrefix(message, args) {
    if (!isStaff(message.member)) {
      return message.reply('Permission refusée.');
    }
    const role =
      message.mentions.roles.first() ||
      (args[0] && /^\d+$/.test(args[0]) ? await message.guild.roles.fetch(args[0]).catch(() => null) : null);
    if (!role) {
      return message.reply('Usage : `+rlm @Rôle` ou `+rlm <id_du_rôle>`');
    }
    const msg = await message.reply('Scan des membres en cours…');
    await message.guild.members.fetch().catch(() => null);
    const members = message.guild.members.cache
      .filter((m) => m.roles.cache.has(role.id) && !m.user.bot)
      .sort((a, b) => a.displayName.localeCompare(b.displayName, 'fr', { sensitivity: 'base' }));
    const list = members.map((m) => m.user.tag).join('\n') || 'Aucun membre.';
    const embed = new EmbedBuilder()
      .setTitle(`Membres — ${role.name}`)
      .setDescription(list.length > CHUNK ? `${list.slice(0, CHUNK - 20)}…` : list)
      .setColor(role.color || 0x5865f2)
      .setFooter({ text: `${members.size} membre(s)` });
    await msg.edit({ content: null, embeds: [embed] });
  },
};
