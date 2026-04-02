const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { isStaff } = require('../util/permissions');
const { sendModLog } = require('../util/modlog');

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/** Pause entre chaque assignation pour limiter les 429 Discord (grands serveurs). */
const BETWEEN_MS = 220;

async function run(guild, executorMember, role) {
  const me = guild.members.me;
  if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return { error: 'Je n’ai pas la permission **Gérer les rôles**.' };
  }
  if (role.managed) {
    return {
      error:
        'Ce rôle est géré par une intégration (bot / Twitch, etc.). Assignation en masse impossible ou déconseillée.',
    };
  }
  if (role.id === guild.id) {
    return { error: 'Impossible d’assigner le rôle @everyone ainsi.' };
  }
  if (me.roles.highest.position <= role.position) {
    return { error: 'Mon rôle le plus haut doit être **au-dessus** du rôle à assigner.' };
  }

  await guild.members.fetch().catch(() => null);

  const humans = guild.members.cache.filter((m) => !m.user.bot);
  const already = humans.filter((m) => m.roles.cache.has(role.id)).size;
  const targets = humans.filter((m) => !m.roles.cache.has(role.id));

  let added = 0;
  let failed = 0;

  for (const member of targets.values()) {
    if (!member.manageable) {
      failed += 1;
      continue;
    }
    try {
      await member.roles.add(role, `addallrole par ${executorMember.user.tag}`);
      added += 1;
      await delay(BETWEEN_MS);
    } catch {
      failed += 1;
    }
  }

  return {
    added,
    failed,
    already,
    botsIgnored: guild.members.cache.filter((m) => m.user.bot).size,
    roleName: role.name,
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addallrole')
    .setDescription('Ajoute un rôle à tous les membres humains qui ne l’ont pas encore (bots exclus).')
    .addRoleOption((o) =>
      o.setName('role').setDescription('Rôle à donner à tout le monde').setRequired(true)
    ),
  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: 'Permission refusée.', ephemeral: true });
    }
    const role = interaction.options.getRole('role', true);
    await interaction.deferReply();
    const result = await run(interaction.guild, interaction.member, role);
    if (result.error) {
      return interaction.editReply({ content: result.error });
    }
    await sendModLog(interaction.guild, {
      content: `**addallrole** · rôle **${result.roleName}** — +${result.added} / échecs ${result.failed} / déjà ${result.already} — par <@${interaction.user.id}>`,
    });
    return interaction.editReply({
      content:
        `**Terminé.** Rôle **${result.roleName}**\n` +
        `· **${result.added}** membre(s) ont reçu le rôle\n` +
        `· **${result.already}** l’avaient déjà\n` +
        `· **${result.failed}** échec(s) (hiérarchie / limite API)\n` +
        `· Bots ignorés (**${result.botsIgnored}** sur le serveur)`,
    });
  },
  async executePrefix(message, args) {
    if (!isStaff(message.member)) {
      return message.reply('Permission refusée.');
    }
    const role =
      message.mentions.roles.first() ||
      (args[0] && /^\d+$/.test(args[0]) ? await message.guild.roles.fetch(args[0]).catch(() => null) : null);
    if (!role) {
      return message.reply('Usage : `+addallrole @Rôle` ou `+addallrole <id_du_rôle>`');
    }
    const status = await message.reply('Assignation du rôle en cours… (peut prendre plusieurs minutes sur un gros serveur)');
    const result = await run(message.guild, message.member, role);
    if (result.error) {
      return status.edit({ content: result.error });
    }
    await sendModLog(message.guild, {
      content: `**addallrole** · rôle **${result.roleName}** — +${result.added} / échecs ${result.failed} / déjà ${result.already} — par <@${message.author.id}>`,
    });
    return status.edit({
      content:
        `**Terminé.** Rôle **${result.roleName}**\n` +
        `· **${result.added}** membre(s) ont reçu le rôle\n` +
        `· **${result.already}** l’avaient déjà\n` +
        `· **${result.failed}** échec(s) (hiérarchie / limite API)\n` +
        `· Bots ignorés (**${result.botsIgnored}** sur le serveur)`,
    });
  },
};
