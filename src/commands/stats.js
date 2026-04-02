const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const { getGuildEmbedColor } = require('../util/embedTheme');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Affiche les statistiques du serveur.'),
  async execute(interaction) {
    const g = interaction.guild;
    await g.members.fetch().catch(() => null);
    const text = g.channels.cache.filter((c) => c.type === ChannelType.GuildText).size;
    const voice = g.channels.cache.filter((c) => c.type === ChannelType.GuildVoice).size;
    const cats = g.channels.cache.filter((c) => c.type === ChannelType.GuildCategory).size;
    const color = await getGuildEmbedColor(g.id);
    const embed = new EmbedBuilder()
      .setTitle(`Statistiques — ${g.name}`)
      .addFields(
        { name: 'Membres', value: `${g.memberCount}`, inline: true },
        { name: 'Humains', value: `${g.members.cache.filter((m) => !m.user.bot).size}`, inline: true },
        { name: 'Bots', value: `${g.members.cache.filter((m) => m.user.bot).size}`, inline: true },
        { name: 'Salons texte', value: `${text}`, inline: true },
        { name: 'Salons vocaux', value: `${voice}`, inline: true },
        { name: 'Catégories', value: `${cats}`, inline: true },
        { name: 'Rôles', value: `${g.roles.cache.size - 1}`, inline: true },
        { name: 'Boosts', value: `${g.premiumSubscriptionCount ?? 0} (niv. ${g.premiumTier})`, inline: true },
        {
          name: 'Création',
          value: `<t:${Math.floor(g.createdTimestamp / 1000)}:D>`,
          inline: true,
        }
      )
      .setThumbnail(g.iconURL({ size: 256 }))
      .setColor(color);
    await interaction.reply({ embeds: [embed] });
  },
  async executePrefix(message) {
    const g = message.guild;
    await g.members.fetch().catch(() => null);
    const text = g.channels.cache.filter((c) => c.type === ChannelType.GuildText).size;
    const voice = g.channels.cache.filter((c) => c.type === ChannelType.GuildVoice).size;
    const cats = g.channels.cache.filter((c) => c.type === ChannelType.GuildCategory).size;
    const color = await getGuildEmbedColor(g.id);
    const embed = new EmbedBuilder()
      .setTitle(`Statistiques — ${g.name}`)
      .addFields(
        { name: 'Membres', value: `${g.memberCount}`, inline: true },
        { name: 'Humains', value: `${g.members.cache.filter((m) => !m.user.bot).size}`, inline: true },
        { name: 'Bots', value: `${g.members.cache.filter((m) => m.user.bot).size}`, inline: true },
        { name: 'Salons texte', value: `${text}`, inline: true },
        { name: 'Salons vocaux', value: `${voice}`, inline: true },
        { name: 'Catégories', value: `${cats}`, inline: true },
        { name: 'Rôles', value: `${g.roles.cache.size - 1}`, inline: true },
        { name: 'Boosts', value: `${g.premiumSubscriptionCount ?? 0} (niv. ${g.premiumTier})`, inline: true },
        {
          name: 'Création',
          value: `<t:${Math.floor(g.createdTimestamp / 1000)}:D>`,
          inline: true,
        }
      )
      .setThumbnail(g.iconURL({ size: 256 }))
      .setColor(color);
    return message.reply({ embeds: [embed] });
  },
};
