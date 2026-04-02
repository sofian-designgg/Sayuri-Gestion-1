const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const VoiceStat = require('../models/VoiceStat');
const { isStaff } = require('../util/permissions');
const { msToHuman } = require('../util/format');
const { getGuildEmbedColor, progressBar } = require('../util/embedTheme');

/** Durée de référence pour la barre « graphique » (100 % = ce temps en vocal). */
const VC_BAR_CAP_MS = 72 * 3600 * 1000;

function buildVcEmbed(targetUser, ms, color) {
  const ratio = Math.min(1, ms / VC_BAR_CAP_MS);
  const line = '─'.repeat(22);

  return new EmbedBuilder()
    .setAuthor({ name: `${targetUser.username} · vocal`, iconURL: targetUser.displayAvatarURL({ size: 64 }) })
    .setTitle('🔊 Temps vocal')
    .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
    .setColor(color)
    .setDescription(
      `\`\`\`\n${line}\n   ${msToHuman(ms)}\n${line}\n\`\`\``
    )
    .addFields(
      {
        name: 'Résumé',
        value: `**${msToHuman(ms)}** cumulés sur ce serveur`,
        inline: false,
      },
      {
        name: '📊 Niveau d’activité (aperçu)',
        value: `${progressBar(ratio, 16)}\n_Jauge décorative : 72 h en vocal = 100 %_`,
        inline: false,
      }
    )
    .setFooter({ text: 'Sayuri Gestion · stats depuis le déploiement du bot' });
}

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
    const color = await getGuildEmbedColor(interaction.guild.id);
    const doc = await VoiceStat.findOne({ guildId: interaction.guild.id, userId: target.id }).lean();
    const ms = doc?.totalMs || 0;
    const embed = buildVcEmbed(target, ms, color);
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
    const color = await getGuildEmbedColor(message.guild.id);
    const doc = await VoiceStat.findOne({ guildId: message.guild.id, userId: target.id }).lean();
    const ms = doc?.totalMs || 0;
    const embed = buildVcEmbed(target, ms, color);
    return message.reply({ embeds: [embed] });
  },
};
