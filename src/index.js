const { Client, Events, GatewayIntentBits, ChannelType } = require('discord.js');
const config = require('./config');
const { connect } = require('./database');
const { parseCommandLine } = require('./lib/parser');
const { canRunCommand, isOwner } = require('./lib/access');
const { COMMAND_META } = require('./meta');
const { helpSlash, buildCategoryEmbed } = require('./commands/helpCmd');
const { guildEmbedColor } = require('./lib/embedUtil');
const admin = require('./commands/admin');
const { createSlashProxy } = require('./lib/slashProxy');
const dispatchCore = require('./dispatchCore');
const { registerSlashCommands } = require('./slash/register');
const { AUTOCOMPLETE_VALUES } = require('./data/autocompleteList');
const { matchPrefix } = require('./lib/prefixCache');
const GuildConfig = require('./models/GuildConfig');
const TempBan = require('./models/TempBan');
const Giveaway = require('./models/Giveaway');
const extended = require('./commands/extended');

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

const antispamBuckets = new Map();

async function sweepTempBans(client) {
  const due = await TempBan.find({ unbanAt: { $lte: new Date() } }).limit(80).lean();
  for (const t of due) {
    const g = client.guilds.cache.get(t.guildId);
    if (g) await g.bans.remove(t.userId).catch(() => null);
    await TempBan.deleteOne({ _id: t._id });
  }
}

async function sweepGiveaways(client) {
  const due = await Giveaway.find({ ended: false, endsAt: { $lte: new Date() } }).limit(30);
  for (const doc of due) {
    await extended.finalizeGiveaway(client, doc, false);
  }
}

async function maybeAutoMod(message) {
  if (message.author.bot || !message.guild) return;
  const gc = await GuildConfig.findOne({ guildId: message.guild.id }).lean();
  if (!gc) return;

  if (gc.antimassmentionEnabled) {
    const nm = message.mentions.users.size + message.mentions.roles.size + (message.mentions.everyone ? 1 : 0);
    if (nm >= 5) {
      await message.delete().catch(() => null);
      return;
    }
  }

  if (gc.piconlyChannelIds?.length && gc.piconlyChannelIds.includes(message.channel.id)) {
    const hasImg =
      message.attachments.some((a) => a.contentType?.startsWith('image/')) ||
      /(\.png|\.jpg|\.jpeg|\.gif|\.webp)(\?|$)/i.test(message.content);
    if (!hasImg && message.content.trim().length > 0) {
      await message.delete().catch(() => null);
      return;
    }
  }

  const low = message.content.toLowerCase();
  if (gc.badwordsList?.length && gc.badwordsList.some((w) => w && low.includes(String(w).toLowerCase()))) {
    await message.delete().catch(() => null);
    return;
  }

  if (gc.antilinkEnabled && /https?:\/\//i.test(message.content)) {
    await message.delete().catch(() => null);
    return;
  }

  if (gc.antispamEnabled) {
    const k = `${message.guild.id}:${message.channel.id}:${message.author.id}`;
    const now = Date.now();
    let arr = antispamBuckets.get(k) || [];
    arr = arr.filter((t) => now - t < 4000);
    arr.push(now);
    antispamBuckets.set(k, arr);
    if (arr.length >= 6) {
      await message.delete().catch(() => null);
      const m = message.member;
      if (m?.moderatable) await m.timeout(5 * 60 * 1000, 'Antispam Sayuri').catch(() => null);
    }
  }

  if (
    message.channel.type === ChannelType.GuildAnnouncement &&
    gc.autopublishChannelIds?.includes(message.channel.id)
  ) {
    await message.crosspost().catch(() => null);
  }

  const ar = (gc.autoreactChannelEmoji || []).find((x) => x.channelId === message.channel.id);
  if (ar?.emoji) {
    await message.react(ar.emoji).catch(() => null);
  }
}

client.once(Events.ClientReady, async (c) => {
  console.log(`Sayuri Gestion prêt : ${c.user.tag}`);
  setInterval(() => sweepTempBans(c).catch((e) => console.error('[tempban]', e)), 60_000);
  setInterval(() => sweepGiveaways(c).catch((e) => console.error('[giveaway]', e)), 30_000);
  sweepTempBans(c).catch(() => null);
  sweepGiveaways(c).catch(() => null);
  if (config.registerSlash) {
    try {
      await registerSlashCommands();
    } catch (e) {
      console.error('[slash]', e.message);
    }
  } else {
    console.log('[slash] REGISTER_SLASH_COMMANDS=false — pas d’enregistrement.');
  }
});

client.on(Events.GuildMemberAdd, async (member) => {
  const gc = await GuildConfig.findOne({ guildId: member.guild.id }).lean();
  if (!gc) return;
  if (member.user.bot) {
    if (gc.antiraidAntiBot && !(gc.whitelistUserIds || []).includes(member.id)) {
      await member.kick('Sayuri — anti-bot').catch(() => null);
    }
    return;
  }
  if ((gc.blacklistUserIds || []).includes(member.id)) {
    await member.kick('Sayuri — blacklist').catch(() => null);
    return;
  }
  if (gc.welcomeChannelId) {
    const ch = await member.guild.channels.fetch(gc.welcomeChannelId).catch(() => null);
    if (ch?.isTextBased?.()) {
      await ch.send(`Bienvenue ${member} sur **${member.guild.name}** !`).catch(() => null);
    }
  }
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
  if (interaction.isStringSelectMenu() && interaction.customId === 'help_tab') {
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
    return;
  }

  if (interaction.isAutocomplete()) {
    if (interaction.commandName !== 'run') return;
    const focused = interaction.options.getFocused(true);
    if (focused.name !== 'commande') return;
    const q = (focused.value || '').toLowerCase();
    let matches = AUTOCOMPLETE_VALUES.filter((v) => v.toLowerCase().includes(q));
    if (!matches.length) matches = AUTOCOMPLETE_VALUES.slice(0, 25);
    else matches = matches.slice(0, 25);
    await interaction.respond(
      matches.map((name) => ({
        name: name.length > 100 ? `${name.slice(0, 97)}…` : name,
        value: name.slice(0, 100),
      }))
    );
    return;
  }

  if (!interaction.isChatInputCommand() || !interaction.inGuild()) return;

  if (interaction.commandName === 'help') {
    try {
      await helpSlash(interaction, client);
    } catch (e) {
      console.error(e);
      if (!interaction.replied) await interaction.reply({ content: 'Erreur /help', ephemeral: true });
    }
    return;
  }

  if (interaction.commandName === 'run') {
    const cmd = interaction.options.getString('commande', true);
    const rest = interaction.options.getString('arguments') || '';
    const line = `${cmd}${rest ? ` ${rest}` : ''}`.trim();
    const parsed = parseCommandLine(line);
    if (!parsed?.key) {
      return interaction.reply({ content: 'Ligne vide.', ephemeral: true });
    }
    const key = parsed.key;
    const meta = COMMAND_META[key];

    if (meta?.ownerOnly && !isOwner(interaction.user.id)) {
      return interaction.reply({
        content: 'Réservé au **propriétaire du bot** (`BOT_OWNER_IDS`).',
        ephemeral: true,
      });
    }

    if (!(await canRunCommand(interaction.member, interaction.guild, key, meta))) {
      return interaction.reply({
        content:
          '**Permission refusée.** Admin Discord, **botadmin**, **owner**, ou commande **+publiccmd**.',
        ephemeral: true,
      });
    }

    const proxy = createSlashProxy(interaction);
    try {
      await dispatchCore(proxy, client, key, parsed);
    } catch (e) {
      console.error(e);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: `Erreur : ${e.message}`, ephemeral: true }).catch(() => null);
      }
    }
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild) return;

  const matched = await matchPrefix(message);
  if (matched) {
    const parsed = parseCommandLine(matched.rest);
    if (parsed?.key) {
      const key = parsed.key;
      const meta = COMMAND_META[key];

      if (meta?.ownerOnly && !isOwner(message.author.id)) {
        await message.reply('Réservé au **propriétaire du bot** (`BOT_OWNER_IDS`).').catch(() => null);
        return;
      }

      if (!(await canRunCommand(message.member, message.guild, key, meta))) {
        await message
          .reply({
            content:
              '**Permission refusée.** Il faut être **administrateur Discord**, **botadmin**, **owner serveur**, ou utiliser une commande rendue publique (`+publiccmd`).',
          })
          .catch(() => null);
        return;
      }

      try {
        await dispatchCore(message, client, key, parsed);
      } catch (e) {
        console.error(e);
        await message.reply(`Erreur : ${e.message}`).catch(() => null);
      }
      return;
    }
  }

  await maybeAutoMod(message);
});

async function main() {
  validate();
  await connect(config.mongoUrl);
  await client.login(config.token);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
