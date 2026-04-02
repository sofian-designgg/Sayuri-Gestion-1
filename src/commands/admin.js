const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');
const GlobalConfig = require('../models/GlobalConfig');
const { assertOwner, assertAccess, canManagePublicCommands } = require('../lib/access');
const { COMMAND_META } = require('../meta');
const { guildEmbedColor, parseHex, intToHex } = require('../lib/embedUtil');

async function getOrCreateGuild(guildId) {
  let g = await GuildConfig.findOne({ guildId });
  if (!g) g = await GuildConfig.create({ guildId });
  return g;
}

async function getOrCreateGlobal() {
  return GlobalConfig.findOneAndUpdate(
    { _id: 'global' },
    { $setOnInsert: { botAdminUserIds: [] } },
    { upsert: true, new: true }
  );
}

async function botadmin(message, args) {
  if (!(await assertOwner(message))) return;
  const sub = (args[0] || '').toLowerCase();
  const global = await getOrCreateGlobal();

  if (sub === 'list' || !sub) {
    const c = await guildEmbedColor(message.guild.id);
    const lines = global.botAdminUserIds.length
      ? global.botAdminUserIds.map((id) => `• <@${id}> (\`${id}\`)`).join('\n')
      : '_Aucun botadmin._';
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('Botadmins')
          .setDescription(lines)
          .setColor(c),
      ],
    });
  }

  const target =
    message.mentions.users.first() ||
    (args[1] && /^\d+$/.test(args[1]) ? await message.client.users.fetch(args[1]).catch(() => null) : null);

  if (sub === 'add') {
    if (!target) return message.reply('Usage : `+botadmin add @membre`');
    if (global.botAdminUserIds.includes(target.id)) return message.reply('Déjà botadmin.');
    global.botAdminUserIds.push(target.id);
    await global.save();
    return message.reply(`**${target.tag}** est maintenant **botadmin**.`);
  }

  if (sub === 'remove' || sub === 'del') {
    if (!target) return message.reply('Usage : `+botadmin remove @membre`');
    global.botAdminUserIds = global.botAdminUserIds.filter((id) => id !== target.id);
    await global.save();
    return message.reply(`**${target.tag}** retiré des botadmins.`);
  }

  return message.reply('Usage : `+botadmin add|remove|list @membre`');
}

async function publiccmd(message, args) {
  if (!(await canManagePublicCommands(message.member))) {
    return message.reply('Réservé aux **administrateurs Discord** ou au **propriétaire du bot**.');
  }
  const sub = (args[0] || '').toLowerCase();
  const gc = await getOrCreateGuild(message.guild.id);
  const c = await guildEmbedColor(message.guild.id);

  if (sub === 'list' || !sub) {
    const cmds = gc.publicCommands.length ? gc.publicCommands.map((x) => `\`${x}\``).join(', ') : '_Aucune._';
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('Commandes publiques (everyone)')
          .setDescription(cmds)
          .setFooter({ text: 'Seules les commandes marquées allowPublic peuvent être ajoutées.' })
          .setColor(c),
      ],
    });
  }

  const key = (args[1] || '').toLowerCase();
  const meta = COMMAND_META[key];
  if (sub === 'add') {
    if (!key) return message.reply('Usage : `+publiccmd add <commande>`');
    if (!meta?.allowPublic) {
      return message.reply(
        'Cette commande ne peut pas être rendue publique (modération / config).'
      );
    }
    if (gc.publicCommands.includes(key)) return message.reply('Déjà publique.');
    gc.publicCommands.push(key);
    await gc.save();
    return message.reply(`Commande **${key}** : maintenant utilisable par **tout le monde** sur ce serveur.`);
  }

  if (sub === 'remove' || sub === 'del') {
    if (!key) return message.reply('Usage : `+publiccmd remove <commande>`');
    gc.publicCommands = gc.publicCommands.filter((x) => x !== key);
    await gc.save();
    return message.reply(`Commande **${key}** retirée des commandes publiques.`);
  }

  return message.reply('Usage : `+publiccmd add|remove|list <commande>`');
}

async function settings(message) {
  if (!(await assertAccess(message, 'settings', COMMAND_META.settings))) return;
  const gc = await getOrCreateGuild(message.guild.id);
  const global = await getOrCreateGlobal();
  const c = await guildEmbedColor(message.guild.id);
  const pub = gc.publicCommands.length ? gc.publicCommands.map((x) => `\`${x}\``).join(', ') : '—';
  const col = gc.embedColor != null ? intToHex(gc.embedColor) : `défaut (**${intToHex(c)}** affiché)`;
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle('⚙️ Paramètres Sayuri (ce serveur)')
        .addFields(
          { name: 'Commandes publiques', value: pub.slice(0, 1024), inline: false },
          { name: 'Couleur embeds', value: col, inline: true },
          { name: 'Botadmins (global)', value: `${global.botAdminUserIds.length} compte(s)`, inline: true }
        )
        .setColor(c),
    ],
  });
}

async function theme(message, args) {
  if (!(await assertAccess(message, 'theme', COMMAND_META.theme))) return;
  const raw = args.join(' ').trim();
  if (!raw) return message.reply('Usage : `+theme #RRGGBB` ou `+theme default`');
  const gc = await getOrCreateGuild(message.guild.id);
  const low = raw.toLowerCase();
  if (['default', 'defaut', 'reset'].includes(low)) {
    gc.embedColor = null;
    await gc.save();
    const c = await guildEmbedColor(message.guild.id);
    return message.reply(`Couleur réinitialisée. Aperçu : **${intToHex(c)}**`);
  }
  const parsed = parseHex(raw);
  if (parsed == null) return message.reply('Hex invalide (ex. `#5865F2`).');
  gc.embedColor = parsed;
  await gc.save();
  return message.reply(`Couleur des embeds : **${intToHex(parsed)}**`);
}

/** Menu principal aide (select) */
function helpMainComponents() {
  const { CATEGORIES } = require('../data/helpManifest');
  const menu = new StringSelectMenuBuilder()
    .setCustomId('help_tab')
    .setPlaceholder('Choisir un onglet…')
    .addOptions(
      CATEGORIES.map((cat) => ({
        label: cat.label.slice(0, 100),
        value: cat.id,
        description: 'Voir les commandes',
        emoji: cat.emoji,
      }))
    );
  return new ActionRowBuilder().addComponents(menu);
}

module.exports = {
  botadmin,
  publiccmd,
  settings,
  theme,
  helpMainComponents,
};
