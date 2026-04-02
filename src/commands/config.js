const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');

function isAdmin(member) {
  return member.permissions.has(PermissionFlagsBits.Administrator);
}

async function getOrCreate(guildId) {
  let gc = await GuildConfig.findOne({ guildId });
  if (!gc) gc = await GuildConfig.create({ guildId });
  return gc;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configuration du bot (administrateurs)')
    .addSubcommand((sc) =>
      sc
        .setName('gestion-role')
        .setDescription('Définir le rôle Gestion pour check / podium')
        .addRoleOption((o) => o.setName('role').setDescription('Rôle Gestion').setRequired(true))
    )
    .addSubcommand((sc) =>
      sc
        .setName('modlog')
        .setDescription('Salon des logs (modération / BLR). Laisser vide pour désactiver.')
        .addChannelOption((o) =>
          o
            .setName('salon')
            .setDescription('Salon texte')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
    )
    .addSubcommand((sc) => sc.setName('voir').setDescription('Afficher la configuration actuelle')),
  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: 'Réservé aux administrateurs.', ephemeral: true });
    }
    const sub = interaction.options.getSubcommand();
    const gc = await getOrCreate(interaction.guild.id);

    if (sub === 'gestion-role') {
      const role = interaction.options.getRole('role', true);
      gc.gestionRoleId = role.id;
      await gc.save();
      return interaction.reply({ content: `Rôle Gestion défini : ${role}` });
    }

    if (sub === 'modlog') {
      const ch = interaction.options.getChannel('salon');
      gc.modLogChannelId = ch ? ch.id : null;
      await gc.save();
      return interaction.reply({
        content: ch ? `Logs modération : ${ch}` : 'Logs modération désactivés.',
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('Configuration Sayuri Gestion')
      .addFields(
        {
          name: 'Rôle Gestion',
          value: gc.gestionRoleId ? `<@&${gc.gestionRoleId}>` : '—',
          inline: true,
        },
        {
          name: 'Salon logs',
          value: gc.modLogChannelId ? `<#${gc.modLogChannelId}>` : '—',
          inline: true,
        },
        {
          name: 'Rôles BLR',
          value:
            gc.blrRestrictedRoleIds.length > 0
              ? gc.blrRestrictedRoleIds.map((id) => `<@&${id}>`).join(', ')
              : '—',
          inline: false,
        }
      )
      .setColor(0x95a5a6);
    await interaction.reply({ embeds: [embed] });
  },
  async executePrefix(message, args) {
    if (!isAdmin(message.member)) {
      return message.reply('Réservé aux administrateurs.');
    }
    const sub = (args[0] || '').toLowerCase();
    const gc = await getOrCreate(message.guild.id);

    if (sub === 'gestion' || sub === 'gestion-role') {
      const role =
        message.mentions.roles.first() ||
        (args[1] && /^\d+$/.test(args[1]) ? await message.guild.roles.fetch(args[1]).catch(() => null) : null);
      if (!role) return message.reply('Usage : `+config gestion @Rôle`');
      gc.gestionRoleId = role.id;
      await gc.save();
      return message.reply(`Rôle Gestion défini : ${role}`);
    }

    if (sub === 'modlog') {
      const ch = message.mentions.channels.first();
      const arg1 = (args[1] || '').toLowerCase();
      if (!ch && ['off', 'disable', 'aucun', 'rien'].includes(arg1)) {
        gc.modLogChannelId = null;
        await gc.save();
        return message.reply('Logs modération désactivés.');
      }
      gc.modLogChannelId = ch ? ch.id : null;
      await gc.save();
      return message.reply(
        ch ? `Logs modération : ${ch}` : 'Aucun salon : mentionne un salon ou utilise +config modlog off.'
      );
    }

    if (sub === 'voir' || sub === 'view') {
      const embed = new EmbedBuilder()
        .setTitle('Configuration Sayuri Gestion')
        .addFields(
          {
            name: 'Rôle Gestion',
            value: gc.gestionRoleId ? `<@&${gc.gestionRoleId}>` : '—',
            inline: true,
          },
          {
            name: 'Salon logs',
            value: gc.modLogChannelId ? `<#${gc.modLogChannelId}>` : '—',
            inline: true,
          },
          {
            name: 'Rôles BLR',
            value:
              gc.blrRestrictedRoleIds.length > 0
                ? gc.blrRestrictedRoleIds.map((id) => `<@&${id}>`).join(', ')
                : '—',
            inline: false,
          }
        )
        .setColor(0x95a5a6);
      return message.reply({ embeds: [embed] });
    }

    return message.reply('Usage : `+config gestion @Rôle` · `+config modlog #salon` · `+config voir`');
  },
};
