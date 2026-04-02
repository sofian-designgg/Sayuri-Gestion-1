const { PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const GuildConfig = require('../models/GuildConfig');
const GlobalConfig = require('../models/GlobalConfig');

function isOwner(userId) {
  return config.ownerIds.includes(userId);
}

function isDiscordAdmin(member) {
  return member.permissions.has(PermissionFlagsBits.Administrator);
}

async function isBotAdminUser(userId) {
  const doc = await GlobalConfig.findById('global').lean();
  return doc?.botAdminUserIds?.includes(userId) ?? false;
}

/**
 * Peut configurer les commandes publiques (+publiccmd).
 */
async function canManagePublicCommands(member) {
  if (isOwner(member.id)) return true;
  return isDiscordAdmin(member);
}

/**
 * Peut utiliser une commande du registre.
 * @param {string} commandKey clé exacte du registre (ex: serverinfo, server)
 */
async function canRunCommand(member, guild, commandKey, meta) {
  /** Toujours autoriser l’aide pour comprendre les permissions */
  if (commandKey === 'help') return true;
  if (isOwner(member.id)) return true;
  if (await isBotAdminUser(member.id)) return true;
  if (isDiscordAdmin(member)) return true;

  const gc = await GuildConfig.findOne({ guildId: guild.id }).lean();
  if (gc?.botOwnerUserIds?.includes(member.id)) return true;
  const pub = gc?.publicCommands || [];
  if (meta?.allowPublic && pub.includes(commandKey)) return true;
  return false;
}

async function assertAccess(message, commandKey, meta) {
  const ok = await canRunCommand(message.member, message.guild, commandKey, meta);
  if (!ok) {
    await message.reply({
      content:
        '**Permission refusée.** Réservé aux **administrateurs Discord**, aux **botadmins** (`+botadmin`), ou aux **commandes rendues publiques** (`+publiccmd`).',
    });
    return false;
  }
  return true;
}

async function assertOwner(message) {
  if (!isOwner(message.author.id)) {
    await message.reply('**Réservé au propriétaire du bot** (variable `BOT_OWNER_IDS`).');
    return false;
  }
  return true;
}

module.exports = {
  isOwner,
  isDiscordAdmin,
  isBotAdminUser,
  canManagePublicCommands,
  canRunCommand,
  assertAccess,
  assertOwner,
};
