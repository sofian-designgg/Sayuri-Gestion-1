const { Client, GatewayIntentBits, Events, REST, Routes } = require('discord.js');
const config = require('./config');
const { connect } = require('./database');
const commands = require('./commands');
const VoiceStat = require('./models/VoiceStat');
const { buildEmbed, buildRow } = require('./commands/help');

function validateConfig() {
  const missing = [];
  if (!config.token) missing.push('DISCORD_TOKEN');
  if (!config.clientId) missing.push('DISCORD_CLIENT_ID');
  if (!config.mongoUrl) missing.push('MONGO_URL');
  if (missing.length) {
    throw new Error(`Variables manquantes : ${missing.join(', ')}`);
  }
}

async function registerSlash(client) {
  const body = commands.map((c) => c.data.toJSON());
  const rest = new REST({ version: '10' }).setToken(config.token);
  if (config.guildId) {
    await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body });
  } else {
    await rest.put(Routes.applicationCommands(config.clientId), { body });
  }
  console.log(`[slash] ${body.length} commande(s) enregistrée(s).`);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Map();
for (const cmd of commands) {
  client.commands.set(cmd.data.name, cmd);
}

client.voiceSessions = new Map();
client.helpOwners = new Map();

client.once(Events.ClientReady, async (c) => {
  console.log(`Sayuri Gestion connecté : ${c.user.tag}`);
  if (config.registerOnStart) {
    try {
      await registerSlash(client);
    } catch (e) {
      console.error('[slash] échec enregistrement :', e.message);
    }
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isButton()) {
    const m = interaction.customId.match(/^help_show_(\d+)$/);
    if (m) {
      const idx = parseInt(m[1], 10);
      const owner = client.helpOwners.get(interaction.message.id);
      if (owner && interaction.user.id !== owner) {
        return interaction.reply({
          content: 'Ce panneau d’aide ne t’est pas destiné.',
          ephemeral: true,
        });
      }
      return interaction.update({
        embeds: [buildEmbed(idx)],
        components: [buildRow(idx)],
      });
    }
  }

  if (!interaction.isChatInputCommand()) return;
  const cmd = client.commands.get(interaction.commandName);
  if (!cmd?.execute) return;
  try {
    await cmd.execute(interaction);
    if (interaction.commandName === 'help') {
      const reply = await interaction.fetchReply().catch(() => null);
      if (reply?.id) {
        client.helpOwners.set(reply.id, interaction.user.id);
        setTimeout(() => client.helpOwners.delete(reply.id), 3_600_000);
      }
    }
  } catch (e) {
    console.error(e);
    const payload = { content: 'Erreur pendant la commande.', ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(payload).catch(() => null);
    } else {
      await interaction.reply(payload).catch(() => null);
    }
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild) return;
  if (!message.content.startsWith(config.prefix)) return;
  const raw = message.content.slice(config.prefix.length).trim();
  if (!raw) return;
  const args = raw.split(/\s+/);
  const name = args.shift().toLowerCase();
  const cmd = client.commands.get(name);
  if (!cmd?.executePrefix) return;
  try {
    const out = await cmd.executePrefix(message, args);
    if (name === 'help' && out?.id) {
      client.helpOwners.set(out.id, message.author.id);
      setTimeout(() => client.helpOwners.delete(out.id), 3_600_000);
    }
  } catch (e) {
    console.error(e);
    await message.reply('Erreur pendant la commande.').catch(() => null);
  }
});

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  const member = newState.member || oldState.member;
  if (!member || member.user.bot) return;
  const guildId = member.guild.id;
  const userId = member.id;
  const key = `${guildId}_${userId}`;

  if (oldState.channelId && !newState.channelId) {
    const start = client.voiceSessions.get(key);
    if (start) {
      const ms = Date.now() - start;
      await VoiceStat.findOneAndUpdate(
        { guildId, userId },
        { $inc: { totalMs: ms } },
        { upsert: true }
      );
      client.voiceSessions.delete(key);
    }
  } else if (!oldState.channelId && newState.channelId) {
    client.voiceSessions.set(key, Date.now());
  }
});

async function main() {
  validateConfig();
  await connect(config.mongoUrl);
  await client.login(config.token);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
