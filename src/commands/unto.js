const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { isStaff } = require('../util/permissions');
const { sendModLog } = require('../util/modlog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unto')
    .setDescription('Retire le timeout d’un membre.')
    .addUserOption((o) => o.setName('membre').setDescription('Membre').setRequired(true)),
  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: 'Permission refusée.', ephemeral: true });
    }
    const target = interaction.options.getMember('membre');
    if (!target) {
      return interaction.reply({ content: 'Membre introuvable.', ephemeral: true });
    }
    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({
        content: 'Je n’ai pas la permission **Modérer les membres**.',
        ephemeral: true,
      });
    }
    if (!target.moderatable) {
      return interaction.reply({ content: 'Je ne peux pas modérer ce membre.', ephemeral: true });
    }
    await target.timeout(null, `Unto par ${interaction.user.tag}`);
    await sendModLog(interaction.guild, {
      content: `**Unto** · ${target.user.tag} (\`${target.id}\`) par <@${interaction.user.id}>`,
    });
    await interaction.reply({ content: `Timeout retiré pour **${target.user.tag}**.` });
  },
  async executePrefix(message, args) {
    if (!isStaff(message.member)) {
      return message.reply('Permission refusée.');
    }
    const targetMember =
      message.mentions.members.first() ||
      (args[0] && /^\d+$/.test(args[0]) ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
    if (!targetMember) {
      return message.reply('Usage : `+unto @membre`');
    }
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply('Je n’ai pas la permission **Modérer les membres**.');
    }
    if (!targetMember.moderatable) {
      return message.reply('Je ne peux pas modérer ce membre.');
    }
    await targetMember.timeout(null, `Unto par ${message.author.tag}`);
    await sendModLog(message.guild, {
      content: `**Unto** · ${targetMember.user.tag} (\`${targetMember.id}\`) par <@${message.author.id}>`,
    });
    return message.reply(`Timeout retiré pour **${targetMember.user.tag}**.`);
  },
};
