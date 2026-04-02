const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isStaff } = require('../util/permissions');
const BlrEntry = require('../models/BlrEntry');
const GuildConfig = require('../models/GuildConfig');
const { sendModLog } = require('../util/modlog');

async function getOrCreateConfig(guildId) {
  let gc = await GuildConfig.findOne({ guildId });
  if (!gc) {
    gc = await GuildConfig.create({ guildId });
  }
  return gc;
}

async function runAdd(guild, moderator, targetUser) {
  if (!isStaff(moderator)) {
    return { ok: false, msg: 'Tu n’as pas la permission d’utiliser cette commande.' };
  }
  const member = await guild.members.fetch(targetUser.id).catch(() => null);
  if (!member) return { ok: false, msg: 'Membre introuvable sur ce serveur.' };

  try {
    await BlrEntry.create({
      guildId: guild.id,
      userId: targetUser.id,
      addedBy: moderator.id,
    });
  } catch (e) {
    if (e.code === 11000) {
      return { ok: false, msg: 'Ce membre est déjà dans le BLR.' };
    }
    throw e;
  }

  const gc = await getOrCreateConfig(guild.id);
  const toRemove = gc.blrRestrictedRoleIds.filter((id) => member.roles.cache.has(id));
  if (toRemove.length) {
    await member.roles.remove(toRemove, 'BLR — rôles restreints').catch(() => null);
  }

  await sendModLog(guild, {
    content: `**BLR add** · ${targetUser.tag} (\`${targetUser.id}\`) par <@${moderator.id}>`,
  });

  return { ok: true, msg: `${targetUser.tag} a été ajouté au BLR.` };
}

async function runRemove(guild, moderator, targetUser) {
  if (!isStaff(moderator)) {
    return { ok: false, msg: 'Tu n’as pas la permission d’utiliser cette commande.' };
  }
  const res = await BlrEntry.deleteOne({ guildId: guild.id, userId: targetUser.id });
  if (!res.deletedCount) {
    return { ok: false, msg: 'Ce membre n’est pas dans le BLR.' };
  }
  await sendModLog(guild, {
    content: `**BLR remove** · ${targetUser.tag} (\`${targetUser.id}\`) par <@${moderator.id}>`,
  });
  return { ok: true, msg: `${targetUser.tag} a été retiré du BLR.` };
}

async function runList(guild, moderator) {
  if (!isStaff(moderator)) {
    return { ok: false, msg: 'Tu n’as pas la permission d’utiliser cette commande.' };
  }
  const entries = await BlrEntry.find({ guildId: guild.id }).sort({ addedAt: -1 }).lean();
  if (!entries.length) {
    return { ok: true, embed: new EmbedBuilder().setTitle('BLR').setDescription('Liste vide.').setColor(0x3498db) };
  }
  const lines = [];
  for (const e of entries.slice(0, 40)) {
    lines.push(`<@${e.userId}> — <t:${Math.floor(new Date(e.addedAt).getTime() / 1000)}:R>`);
  }
  const embed = new EmbedBuilder()
    .setTitle(`BLR — ${entries.length} entrée(s)`)
    .setDescription(lines.join('\n') || '—')
    .setColor(0xe74c3c);
  if (entries.length > 40) {
    embed.setFooter({ text: `Affichage des 40 premiers sur ${entries.length}` });
  }
  return { ok: true, embed };
}

async function runRolesAdd(guild, moderator, role) {
  if (!isStaff(moderator)) {
    return { ok: false, msg: 'Tu n’as pas la permission d’utiliser cette commande.' };
  }
  const gc = await getOrCreateConfig(guild.id);
  if (gc.blrRestrictedRoleIds.includes(role.id)) {
    return { ok: false, msg: 'Ce rôle est déjà dans la liste.' };
  }
  gc.blrRestrictedRoleIds.push(role.id);
  await gc.save();
  return { ok: true, msg: `Rôle ${role} ajouté à la liste des rôles retirés au BLR.` };
}

async function runRolesRemove(guild, moderator, role) {
  if (!isStaff(moderator)) {
    return { ok: false, msg: 'Tu n’as pas la permission d’utiliser cette commande.' };
  }
  const gc = await getOrCreateConfig(guild.id);
  const before = gc.blrRestrictedRoleIds.length;
  gc.blrRestrictedRoleIds = gc.blrRestrictedRoleIds.filter((id) => id !== role.id);
  await gc.save();
  if (gc.blrRestrictedRoleIds.length === before) {
    return { ok: false, msg: 'Ce rôle n’était pas dans la liste.' };
  }
  return { ok: true, msg: `Rôle ${role} retiré de la liste BLR.` };
}

async function runRolesList(guild, moderator) {
  if (!isStaff(moderator)) {
    return { ok: false, msg: 'Tu n’as pas la permission d’utiliser cette commande.' };
  }
  const gc = await getOrCreateConfig(guild.id);
  const ids = gc.blrRestrictedRoleIds;
  if (!ids.length) {
    return { ok: true, embed: new EmbedBuilder().setTitle('Rôles BLR').setDescription('Aucun rôle configuré.').setColor(0x3498db) };
  }
  const desc = ids.map((id) => `<@&${id}>`).join('\n');
  return {
    ok: true,
    embed: new EmbedBuilder().setTitle('Rôles retirés à l’ajout au BLR').setDescription(desc).setColor(0x9b59b6),
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('blr')
    .setDescription('Gestion du BLR')
    .addSubcommand((sc) =>
      sc
        .setName('add')
        .setDescription('Ajouter un utilisateur au BLR')
        .addUserOption((o) =>
          o.setName('utilisateur').setDescription('Membre').setRequired(true)
        )
    )
    .addSubcommand((sc) => sc.setName('list').setDescription('Afficher la liste des utilisateurs sous BLR'))
    .addSubcommand((sc) =>
      sc
        .setName('remove')
        .setDescription('Retirer un utilisateur du BLR')
        .addUserOption((o) =>
          o.setName('utilisateur').setDescription('Membre').setRequired(true)
        )
    )
    .addSubcommandGroup((sg) =>
      sg
        .setName('roles')
        .setDescription('Gérer les rôles restreints')
        .addSubcommand((sc) =>
          sc
            .setName('add')
            .setDescription('Ajouter un rôle à retirer pour les entrées BLR')
            .addRoleOption((o) => o.setName('role').setDescription('Rôle').setRequired(true))
        )
        .addSubcommand((sc) =>
          sc
            .setName('remove')
            .setDescription('Retirer un rôle de la configuration BLR')
            .addRoleOption((o) => o.setName('role').setDescription('Rôle').setRequired(true))
        )
        .addSubcommand((sc) => sc.setName('list').setDescription('Lister les rôles configurés'))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const group = interaction.options.getSubcommandGroup();

    if (group === 'roles') {
      if (sub === 'list') {
        const r = await runRolesList(interaction.guild, interaction.member);
        return interaction.reply(
          r.ok ? { embeds: [r.embed] } : { content: r.msg, ephemeral: true }
        );
      }
      const role = interaction.options.getRole('role', true);
      if (sub === 'add') {
        const r = await runRolesAdd(interaction.guild, interaction.member, role);
        return interaction.reply(r.ok ? { content: r.msg } : { content: r.msg, ephemeral: true });
      }
      if (sub === 'remove') {
        const r = await runRolesRemove(interaction.guild, interaction.member, role);
        return interaction.reply(r.ok ? { content: r.msg } : { content: r.msg, ephemeral: true });
      }
    }

    if (sub === 'add') {
      const u = interaction.options.getUser('utilisateur', true);
      const r = await runAdd(interaction.guild, interaction.member, u);
      return interaction.reply(r.ok ? { content: r.msg } : { content: r.msg, ephemeral: true });
    }
    if (sub === 'remove') {
      const u = interaction.options.getUser('utilisateur', true);
      const r = await runRemove(interaction.guild, interaction.member, u);
      return interaction.reply(r.ok ? { content: r.msg } : { content: r.msg, ephemeral: true });
    }
    const r = await runList(interaction.guild, interaction.member);
    return interaction.reply(r.ok ? { embeds: [r.embed] } : { content: r.msg, ephemeral: true });
  },

  async executePrefix(message, args) {
    const sub = (args[0] || '').toLowerCase();
    const guild = message.guild;
    const mod = message.member;

    if (sub === 'roles') {
      const action = (args[1] || '').toLowerCase();
      if (action === 'list') {
        const r = await runRolesList(guild, mod);
        return message.reply(r.ok ? { embeds: [r.embed] } : r.msg);
      }
      if (action === 'add' || action === 'remove') {
        const roleMention = args[2];
        const role =
          message.mentions.roles.first() ||
          (roleMention && /^\d+$/.test(roleMention) ? await guild.roles.fetch(roleMention).catch(() => null) : null);
        if (!role) {
          return message.reply('Usage : `+blr roles add @Rôle` ou `+blr roles remove @Rôle`');
        }
        const r =
          action === 'add'
            ? await runRolesAdd(guild, mod, role)
            : await runRolesRemove(guild, mod, role);
        return message.reply(r.ok ? r.msg : r.msg);
      }
      return message.reply('Usage : `+blr roles add|remove|list`');
    }

    if (sub === 'add') {
      const target =
        message.mentions.users.first() ||
        (args[1] && /^\d+$/.test(args[1]) ? await guild.client.users.fetch(args[1]).catch(() => null) : null);
      if (!target) return message.reply('Usage : `+blr add @membre`');
      const r = await runAdd(guild, mod, target);
      return message.reply(r.ok ? r.msg : r.msg);
    }
    if (sub === 'remove') {
      const target =
        message.mentions.users.first() ||
        (args[1] && /^\d+$/.test(args[1]) ? await guild.client.users.fetch(args[1]).catch(() => null) : null);
      if (!target) return message.reply('Usage : `+blr remove @membre`');
      const r = await runRemove(guild, mod, target);
      return message.reply(r.ok ? r.msg : r.msg);
    }
    if (sub === 'list') {
      const r = await runList(guild, mod);
      return message.reply(r.ok ? { embeds: [r.embed] } : r.msg);
    }

    return message.reply(
      'Usage : `+blr add|remove|list` · `+blr roles add|remove|list`'
    );
  },
};
