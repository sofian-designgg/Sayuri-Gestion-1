const { Client, Events, GatewayIntentBits } = require('discord.js');
const config = require('./config');
const { connect } = require('./database');
const { parseCommandLine } = require('./lib/parser');
const { canRunCommand, isOwner } = require('./lib/access');
const { COMMAND_META } = require('./meta');
const util = require('./commands/util');
const mod = require('./commands/mod');
const admin = require('./commands/admin');
const { help, buildCategoryEmbed } = require('./commands/helpCmd');
const { guildEmbedColor } = require('./lib/embedUtil');

function validate() {
  const m = [];
  if (!config.token) m.push('DISCORD_TOKEN');
  if (!config.mongoUrl) m.push('MONGO_URL');
  if (!config.ownerIds.length) m.push('BOT_OWNER_IDS (au moins un propriétaire)');
  if (m.length) throw new Error(`Manquant : ${m.join(', ')}`);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
  ],
});

client.snipes = new Map();
client.helpAuthors = new Map();

client.once(Events.ClientReady, (c) => {
  console.log(`Sayuri Gestion prêt : ${c.user.tag}`);
});

client.on(Events.MessageDelete, async (msg) => {
  if (!msg.guild || msg.author?.bot || !msg.channel?.isTextBased?.()) return;
  client.snipes.set(msg.channel.id, {
    content: msg.content || '',
    tag: msg.author?.tag || '?',
    id: msg.author?.id,
    at: Date.now(),
    image: msg.attachments?.first()?.proxyURL || null,
  });
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isStringSelectMenu() || interaction.customId !== 'help_tab') return;
  const owner = client.helpAuthors.get(interaction.message.id);
  if (owner && interaction.user.id !== owner) {
    return interaction.reply({ content: 'Ce menu d’aide ne t’est pas destiné.', ephemeral: true });
  }
  const catId = interaction.values[0];
  const color = await guildEmbedColor(interaction.guild.id);
  try {
    await interaction.update({
      embeds: [buildCategoryEmbed(catId, color)],
      components: [admin.helpMainComponents()],
    });
  } catch (e) {
    console.error(e);
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild) return;
  if (!message.content.startsWith(config.prefix)) return;

  const parsed = parseCommandLine(message.content.slice(config.prefix.length));
  if (!parsed?.key) return;

  const key = parsed.key;
  const meta = COMMAND_META[key];

  if (!meta) {
    await message.reply('Commande inconnue. Utilise `+help`.').catch(() => null);
    return;
  }

  if (meta.ownerOnly && !isOwner(message.author.id)) {
    await message.reply('Réservé au **propriétaire du bot** (`BOT_OWNER_IDS`).').catch(() => null);
    return;
  }

  if (!(await canRunCommand(message.member, message.guild, key, meta))) {
    await message
      .reply({
        content:
          '**Permission refusée.** Il faut être **administrateur Discord**, **botadmin**, ou utiliser une commande rendue publique (`+publiccmd`).',
      })
      .catch(() => null);
    return;
  }

  try {
    await dispatch(message, client, key, parsed);
  } catch (e) {
    console.error(e);
    await message.reply(`Erreur : ${e.message}`).catch(() => null);
  }
});

async function dispatch(message, client, key, parsed) {
  const { sub, args, text } = parsed;

  switch (key) {
    case 'help':
      return help(message, client);
    case 'changelogs':
      return util.changelogs(message);
    case 'allbots':
      return util.allbots(message);
    case 'alladmins':
      return util.alladmins(message);
    case 'botadmins':
      return util.botadmins(message);
    case 'boosters':
      return util.boosters(message);
    case 'rolemembers':
      return util.rolemembers(message, args);
    case 'serverinfo':
      return util.serverinfo(message);
    case 'vocinfo':
      return util.vocinfo(message);
    case 'role':
      return util.role(message, args);
    case 'channel':
      return util.channel(message, args);
    case 'user':
      return util.user(message, args);
    case 'member':
      return util.member(message, args);
    case 'pic':
      return util.pic(message, args);
    case 'banner':
      return util.banner(message, args);
    case 'server':
      return util.serverAsset(message, sub);
    case 'snipe':
      return util.snipe(message, client);
    case 'emoji':
      return util.emoji(message, args);
    case 'calc':
      return util.calc(message, args);
    case 'wiki':
      return util.wiki(message, args.join(' '));
    case 'searchwiki':
      return util.searchwiki(message, text);
    case 'crowbots':
      return util.crowbots(message);

    case 'botadmin':
      return admin.botadmin(message, args);
    case 'publiccmd':
      return admin.publiccmd(message, args);
    case 'settings':
      return admin.settings(message);
    case 'theme':
      return admin.theme(message, args);

    case 'clear':
      return mod.clear(message, args);
    case 'kick':
      return mod.kick(message, args);
    case 'ban':
      return mod.ban(message, args);
    case 'unban':
      return mod.unban(message, args);
    case 'timeout':
      return mod.timeout(message, args);
    case 'warn':
      return mod.warn(message, args);
    case 'sanctions':
      return mod.sanctions(message, args);
    case 'lock':
      return mod.lock(message, args);
    case 'unlock':
      return mod.unlock(message, args);
    case 'addrole':
      return mod.addrole(message, args);
    case 'delrole':
      return mod.delrole(message, args);

    default:
      return message.reply('Commande listée mais pas encore branchée.');
  }
}

async function main() {
  validate();
  await connect(config.mongoUrl);
  await client.login(config.token);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
