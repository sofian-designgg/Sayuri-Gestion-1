const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const VoiceStat = require('../models/VoiceStat');
const { isStaff } = require('../util/permissions');
const { msToHuman } = require('../util/format');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vc')
    .setDescription('Affiche vos statistiques vocales ou celles d’un autre utilisateur.')
    .addUserOption((o) =>
      o.setName('utilisateur').setDescription('Utilisateur (optionnel)').setRequired(false)
    ),
  async execute(interaction) {
    const opt = interaction.options.getUser('utilisateur');
    const target = opt || interaction.user;
    if (opt && opt.id !== interaction.user.id && !isStaff(interaction.member)) {
      return interaction.reply({
        content: 'Tu ne peux voir que tes propres stats (ou demande au staff).',
        ephemeral: true,
      });
    }
    const doc = await VoiceStat.findOne({ guildId: interaction.guild.id, userId: target.id }).lean();
    const ms = doc?.totalMs || 0;
    const embed = new EmbedBuilder()
      .setTitle('Temps vocal')
      .setDescription(
        `**${target.tag}**\nTemps enregistré sur ce serveur : **${msToHuman(ms)}**`
      )
      .setThumbnail(target.displayAvatarURL({ size: 128 }))
      .setColor(0x5865f2);
    await interaction.reply({ embeds: [embed] });
  },
  async executePrefix(message, args) {
    let target = message.mentions.users.first();
    if (args[0] && /^\d+$/.test(args[0]) && !target) {
      target = await message.client.users.fetch(args[0]).catch(() => null);
    }
    if (!target) target = message.author;
    if (target.id !== message.author.id && !isStaff(message.member)) {
      return message.reply('Tu ne peux voir que tes propres stats (ou demande au staff).');
    }
    const doc = await VoiceStat.findOne({ guildId: message.guild.id, userId: target.id }).lean();
    const ms = doc?.totalMs || 0;
    const embed = new EmbedBuilder()
      .setTitle('Temps vocal')
      .setDescription(
        `**${target.tag}**\nTemps enregistré sur ce serveur : **${msToHuman(ms)}**`
      )
      .setThumbnail(target.displayAvatarURL({ size: 128 }))
      .setColor(0x5865f2);
    return message.reply({ embeds: [embed] });
  },
};
