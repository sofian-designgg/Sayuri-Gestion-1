const { Collection } = require('discord.js');

/**
 * Permet de réutiliser les handlers préfixe avec une interaction slash (/run).
 */
function createSlashProxy(interaction) {
  const empty = new Collection();
  return {
    guild: interaction.guild,
    member: interaction.member,
    author: interaction.user,
    channel: interaction.channel,
    client: interaction.client,
    id: interaction.id,
    content: '',
    mentions: {
      users: empty,
      members: empty,
      roles: empty,
      channels: empty,
      has: () => false,
      crosses: () => false,
    },
    async reply(payload) {
      const opt = typeof payload === 'string' ? { content: payload } : { ...payload };
      if (interaction.replied || interaction.deferred) {
        return interaction.channel.send(opt);
      }
      await interaction.reply({ ...opt, fetchReply: true });
      return interaction.fetchReply();
    },
  };
}

module.exports = { createSlashProxy };
