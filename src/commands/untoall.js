const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { isStaff } = require('../util/permissions');
const { sendModLog } = require('../util/modlog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('untoall')
    .setDescription('Retire le timeout de tous les membres du serveur.'),
  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: 'Permission refusée.', ephemeral: true });
    }
    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({
        content: 'Je n’ai pas la permission **Modérer les membres**.',
        ephemeral: true,
      });
    }
    await interaction.deferReply();
    await interaction.guild.members.fetch().catch(() => null);
    const timed = interaction.guild.members.cache.filter(
      (m) => m.communicationDisabledUntilTimestamp && m.communicationDisabledUntilTimestamp > Date.now()
    );
    let ok = 0;
    let fail = 0;
    for (const m of timed.values()) {
      if (!m.moderatable) {
        fail += 1;
        continue;
      }
      await m.timeout(null, `Untoall par ${interaction.user.tag}`).then(() => (ok += 1)).catch(() => (fail += 1));
    }
    await sendModLog(interaction.guild, {
      content: `**Untoall** · ${ok} retiré(s), ${fail} échec(s) — par <@${interaction.user.id}>`,
    });
    await interaction.editReply({
      content: `Terminé : **${ok}** timeout(s) retiré(s)${fail ? `, **${fail}** échec(s).` : '.'}`,
    });
  },
  async executePrefix(message) {
    if (!isStaff(message.member)) {
      return message.reply('Permission refusée.');
    }
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply('Je n’ai pas la permission **Modérer les membres**.');
    }
    const msg = await message.reply('Traitement des timeouts en cours…');
    await message.guild.members.fetch().catch(() => null);
    const timed = message.guild.members.cache.filter(
      (m) => m.communicationDisabledUntilTimestamp && m.communicationDisabledUntilTimestamp > Date.now()
    );
    let ok = 0;
    let fail = 0;
    for (const m of timed.values()) {
      if (!m.moderatable) {
        fail += 1;
        continue;
      }
      await m.timeout(null, `Untoall par ${message.author.tag}`).then(() => (ok += 1)).catch(() => (fail += 1));
    }
    await sendModLog(message.guild, {
      content: `**Untoall** · ${ok} retiré(s), ${fail} échec(s) — par <@${message.author.id}>`,
    });
    await msg.edit({
      content: `Terminé : **${ok}** timeout(s) retiré(s)${fail ? `, **${fail}** échec(s).` : '.'}`,
    });
  },
};
