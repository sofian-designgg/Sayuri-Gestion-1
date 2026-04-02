const { PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const GuildConfig = require('../models/GuildConfig');

function hasDiscordModPerms(member) {
  return (
    member.permissions.has(PermissionFlagsBits.Administrator) ||
    member.permissions.has(PermissionFlagsBits.ManageGuild) ||
    member.permissions.has(PermissionFlagsBits.ModerateMembers)
  );
}

function hasStaffRole(member) {
  if (!config.staffRoleIds.length) return false;
  return config.staffRoleIds.some((id) => member.roles.cache.has(id));
}

/** Modération / BLR / timeouts / config */
function isStaff(member) {
  return hasStaffRole(member) || hasDiscordModPerms(member);
}

async function getGestionRoleId(guildId) {
  const gc = await GuildConfig.findOne({ guildId }).lean();
  if (gc?.gestionRoleId) return gc.gestionRoleId;
  return config.gestionRoleId || null;
}

module.exports = {
  isStaff,
  hasDiscordModPerms,
  getGestionRoleId,
};
