const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { isStaff } = require('../util/permissions');
const { sendModLog } = require('../util/modlog');

const MAX_MIN = 28 * 24 * 60;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('to')
    .setDescription('Exclure temporairement un membre avec une raison.')
    .addUserOption((o) => o.setName('membre').setDescription('Membre à exclure').setRequired(true))
    .addIntegerOption((o) =>
      o
        .setName('minutes')
        .setDescription('Durée en minutes (max 40320)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(MAX_MIN)
    )
    .addStringOption((o) =>
      o.setName('raison').setDescription('Raison du timeout').setRequired(true).setMaxLength(400)
    ),
  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: 'Permission refusée.', ephemeral: true });
    }
    const target = interaction.options.getMember('membre');
    if (!target) {
      return interaction.reply({ content: 'Membre introuvable.', ephemeral: true });
    }
    const minutes = interaction.options.getInteger('minutes', true);
    const reason = interaction.options.getString('raison', true);
    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({
        content: 'Je n’ai pas la permission **Modérer les membres**.',
        ephemeral: true,
      });
    }
    if (!target.moderatable) {
      return interaction.reply({ content: 'Je ne peux pas modérer ce membre.', ephemeral: true });
    }
    const ms = minutes * 60 * 1000;
    await target.timeout(ms, reason);
    await sendModLog(interaction.guild, {
      content: `**Timeout** ${minutes} min · ${target.user.tag} (\`${target.id}\`)\nRaison : ${reason}\nPar <@${interaction.user.id}>`,
    });
    await interaction.reply({ content: `Timeout appliqué à **${target.user.tag}** (${minutes} min).` });
  },
  async executePrefix(message, args) {
    if (!isStaff(message.member)) {
      return message.reply('Permission refusée.');
    }
    const targetMember =
      message.mentions.members.first() ||
      (args[0] && /^\d+$/.test(args[0]) ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
    const minutes = parseInt(args[1], 10);
    const reason = args.slice(2).join(' ').trim();
    if (!targetMember || !Number.isFinite(minutes) || minutes < 1 || minutes > MAX_MIN || !reason) {
      return message.reply('Usage : `+to @membre <minutes> <raison>`');
    }
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply('Je n’ai pas la permission **Modérer les membres**.');
    }
    if (!targetMember.moderatable) {
      return message.reply('Je ne peux pas modérer ce membre.');
    }
    const ms = minutes * 60 * 1000;
    await targetMember.timeout(ms, reason);
    await sendModLog(message.guild, {
      content: `**Timeout** ${minutes} min · ${targetMember.user.tag} (\`${targetMember.id}\`)\nRaison : ${reason}\nPar <@${message.author.id}>`,
    });
    return message.reply(`Timeout appliqué à **${targetMember.user.tag}** (${minutes} min).`);
  },
};
