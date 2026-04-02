const { EmbedBuilder } = require('discord.js');
const { CATEGORIES } = require('../data/helpManifest');
const { guildEmbedColor } = require('../lib/embedUtil');
const { helpMainComponents } = require('./admin');
const bodies = require('../data/categoryBodies');

function chunkByLines(text, maxLen = 1000) {
  const lines = text.split('\n');
  const chunks = [];
  let cur = '';
  for (const line of lines) {
    const add = (cur ? '\n' : '') + line;
    if (cur.length + add.length > maxLen) {
      if (cur) chunks.push(cur);
      cur = line;
    } else {
      cur += add;
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

function buildCategoryEmbed(catId, color) {
  const cat = CATEGORIES.find((c) => c.id === catId) || CATEGORIES[0];
  const body = bodies[catId] || '_Contenu indisponible._';
  const embed = new EmbedBuilder()
    .setTitle(`${cat.emoji} ${cat.label}`)
    .setColor(color)
    .setFooter({ text: 'Sayuri Gestion — +help · /help · /run' });

  if (body.length <= 4096) {
    embed.setDescription(body);
    return embed;
  }

  const parts = chunkByLines(body, 1020);
  embed.setDescription(`Liste longue découpée en **${parts.length}** partie(s).`);
  const maxFields = 24;
  for (let i = 0; i < Math.min(parts.length, maxFields); i++) {
    embed.addFields({ name: `Suite ${i + 1}`, value: parts[i], inline: false });
  }
  if (parts.length > maxFields) {
    embed.addFields({
      name: '…',
      value: `_Encore ${parts.length - maxFields} bloc(s) — texte trop long pour Discord._`,
      inline: false,
    });
  }
  return embed;
}

async function help(message, client) {
  const color = await guildEmbedColor(message.guild.id);
  const embed = new EmbedBuilder()
    .setTitle('📚 Sayuri Gestion')
    .setDescription(
      '**Menu complet** (type Crow Bots) : choisis une **catégorie** ci-dessous.\n\n' +
        '• **/run** + autocomplete : lance une commande comme avec `+`.\n' +
        '• Par défaut : **admin Discord**, **botadmin** ou **owner** ; sinon **+publiccmd** / **+publiccmd add**.\n' +
        '• **+help** et **/help** affichent la même chose.'
    )
    .setColor(color);
  const msg = await message.reply({
    embeds: [embed],
    components: [helpMainComponents()],
  });
  if (client?.helpAuthors) client.helpAuthors.set(msg.id, message.author.id);
  return msg;
}

async function helpSlash(interaction, client) {
  const color = await guildEmbedColor(interaction.guild.id);
  const embed = new EmbedBuilder()
    .setTitle('📚 Sayuri Gestion')
    .setDescription(
      '**Menu complet** (type Crow Bots) : choisis une **catégorie** ci-dessous.\n\n' +
        '• **/run** + autocomplete : toutes les commandes listées ici.\n' +
        '• Permissions : **admin**, **botadmin**, **owner**, ou commandes **+publiccmd**.\n' +
        '• Équivalent **+help**.'
    )
    .setColor(color);
  await interaction.reply({ embeds: [embed], components: [helpMainComponents()], fetchReply: true });
  const reply = await interaction.fetchReply();
  if (client?.helpAuthors) client.helpAuthors.set(reply.id, interaction.user.id);
}

module.exports = { help, helpSlash, buildCategoryEmbed };
