const { EmbedBuilder } = require('discord.js');
const { CATEGORIES } = require('../data/helpManifest');
const { guildEmbedColor } = require('../lib/embedUtil');
const { helpMainComponents } = require('./admin');

function buildCategoryEmbed(catId, color) {
  const cat = CATEGORIES.find((c) => c.id === catId) || CATEGORIES[0];
  const body = cat.lines.join('\n');
  return new EmbedBuilder()
    .setTitle(`${cat.emoji} ${cat.label}`)
    .setDescription(body.length > 4096 ? `${body.slice(0, 4090)}…` : body)
    .setFooter({ text: 'Sayuri Gestion — +help' })
    .setColor(color);
}

async function help(message, client) {
  const color = await guildEmbedColor(message.guild.id);
  const embed = new EmbedBuilder()
    .setTitle('📚 Sayuri Gestion')
    .setDescription(
      'Choisis une **catégorie** dans le menu ci-dessous.\n\n' +
        '• Par défaut, les commandes sont pour **administrateurs Discord**, **botadmins** (`+botadmin`) ou **propriétaire**.\n' +
        '• Tu peux autoriser certaines commandes pour **everyone** avec `+publiccmd add <commande>`.'
    )
    .setColor(color);
  const msg = await message.reply({
    embeds: [embed],
    components: [helpMainComponents()],
  });
  if (client?.helpAuthors) client.helpAuthors.set(msg.id, message.author.id);
  return msg;
}

module.exports = { help, buildCategoryEmbed };
