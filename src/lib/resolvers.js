/**
 * @param {import('discord.js').Message} message
 * @param {string[]} args
 */
async function resolveMember(message, args) {
  const mention = message.mentions.members.first();
  if (mention) return mention;
  const q = args[0];
  if (!q) return message.member;
  if (/^\d{17,20}$/.test(q)) {
    return message.guild.members.fetch(q).catch(() => null);
  }
  const name = args.join(' ').toLowerCase();
  return (
    message.guild.members.cache.find(
      (m) =>
        m.user.username.toLowerCase() === name ||
        m.displayName.toLowerCase() === name ||
        m.user.tag.toLowerCase() === name
    ) || null
  );
}

/**
 * @param {import('discord.js').Message} message
 * @param {string[]} args
 */
async function resolveRole(message, args) {
  const mention = message.mentions.roles.first();
  if (mention) return mention;
  if (!args.length) return null;
  const id = args[0];
  if (/^\d+$/.test(id)) {
    return message.guild.roles.fetch(id).catch(() => null);
  }
  const name = args.join(' ').toLowerCase();
  return message.guild.roles.cache.find((r) => r.name.toLowerCase() === name) || null;
}

/**
 * @param {import('discord.js').Message} message
 * @param {string[]} args
 */
async function resolveUser(message, args) {
  const mention = message.mentions.users.first();
  if (mention) return mention;
  const q = args[0];
  if (!q) return message.author;
  if (/^\d{17,20}$/.test(q)) {
    return message.client.users.fetch(q).catch(() => null);
  }
  const m = await resolveMember(message, args);
  return m?.user || null;
}

module.exports = { resolveMember, resolveRole, resolveUser };
