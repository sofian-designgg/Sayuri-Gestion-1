const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const config = require('../config');

const commands = [
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Liste complète des commandes (menu par catégorie — comme Crow Bots).')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('run')
    .setDescription('Exécuter une commande Sayuri (équivalent au préfixe +)')
    .addStringOption((o) =>
      o
        .setName('commande')
        .setDescription('Tape pour chercher — toutes les commandes de l’aide')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((o) =>
      o
        .setName('arguments')
        .setDescription('Suite (ex. @membre, salon, raison…) — optionnel')
        .setRequired(false)
    )
    .toJSON(),
];

async function registerSlashCommands() {
  if (!config.clientId || !config.token) {
    console.warn('[slash] DISCORD_CLIENT_ID ou token manquant — pas d’enregistrement.');
    return;
  }
  const rest = new REST({ version: '10' }).setToken(config.token);
  if (config.guildId) {
    await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commands });
    console.log(`[slash] ${commands.length} commande(s) guild (${config.guildId}).`);
  } else {
    await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
    console.log(`[slash] ${commands.length} commande(s) globales (propagation jusqu’à 1 h).`);
  }
}

module.exports = { registerSlashCommands, commands };
