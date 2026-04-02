const { EmbedBuilder } = require('discord.js');
const { guildEmbedColor } = require('../lib/embedUtil');

function formatParsed(parsed) {
  let s = parsed.key;
  if (parsed.sub) s += ` ${parsed.sub}`;
  if (parsed.args?.length) s += ` ${parsed.args.join(' ')}`;
  if (parsed.text) s += ` ${parsed.text}`.trim();
  return s.trim();
}

/**
 * Réponse neutre pour une commande reconnue mais sans logique métier encore branchée.
 */
async function stubFromParsed(message, parsed) {
  const label = formatParsed(parsed);
  const c = await guildEmbedColor(message.guild.id);
  return message.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle(`+${label}`)
        .setDescription(
          'Commande **reconnue** sans handler dédié dans cette version. Vérifie `+help` / `/help` ou une variante proche (ex. `+secur`, `+modlog`).'
        )
        .setColor(c),
    ],
  });
}

module.exports = { stubFromParsed, formatParsed };
