const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

const SECTIONS = [
  {
    id: 'gestion',
    label: 'Gestion & BLR',
    lines: [
      '`/blr add` / `+blr add` — Ajouter au BLR (retrait des rôles configurés)',
      '`/blr list` / `+blr list` — Liste des membres BLR',
      '`/blr remove` / `+blr remove` — Retirer du BLR',
      '`/blr roles` / `+blr roles` — Rôles retirés à l’ajout au BLR',
      '`/check` / `+check` — Statut vocal des membres avec le rôle Gestion',
      '`/podium` / `+podium` — Top 20 temps vocal (rôle Gestion)',
      '`/config` / `+config` — Rôle Gestion, salon logs (admin)',
    ],
  },
  {
    id: 'mod',
    label: 'Modération',
    lines: [
      '`/to` / `+to` — Timeout (minutes + raison)',
      '`/unto` / `+unto` — Retirer le timeout',
      '`/untoall` / `+untoall` — Retirer tous les timeouts',
      '`/rlm` / `+rlm` — Membres d’un rôle (liste stable)',
    ],
  },
  {
    id: 'info',
    label: 'Infos',
    lines: [
      '`/stats` / `+stats` — Statistiques du serveur',
      '`/vc` / `+vc` — Temps vocal (vous ou un membre)',
      '`/help` / `+help` — Ce panneau',
    ],
  },
];

function buildEmbed(sectionIndex) {
  const s = SECTIONS[sectionIndex] || SECTIONS[0];
  return new EmbedBuilder()
    .setTitle('Sayuri Gestion — Aide')
    .setDescription(
      `Préfixe : **+** · Slash : **/**\n\n**${s.label}**\n${s.lines.join('\n')}`
    )
    .setColor(0x9b59b6)
    .setFooter({ text: `Section ${sectionIndex + 1}/${SECTIONS.length}` });
}

function buildRow(sectionIndex) {
  const prev = Math.max(0, sectionIndex - 1);
  const next = Math.min(SECTIONS.length - 1, sectionIndex + 1);
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`help_show_${prev}`)
      .setLabel('◀')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(sectionIndex === 0),
    new ButtonBuilder()
      .setCustomId(`help_show_${next}`)
      .setLabel('▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(sectionIndex >= SECTIONS.length - 1)
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Affiche le centre d’aide interactif du bot.'),
  async execute(interaction) {
    const i = 0;
    await interaction.reply({
      embeds: [buildEmbed(i)],
      components: [buildRow(i)],
    });
  },
  async executePrefix(message) {
    const i = 0;
    const msg = await message.reply({
      embeds: [buildEmbed(i)],
      components: [buildRow(i)],
    });
    return msg;
  },
  SECTIONS,
  buildEmbed,
  buildRow,
};
