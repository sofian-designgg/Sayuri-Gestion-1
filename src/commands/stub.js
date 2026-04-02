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
          'Commande **reconnue**. Tous les paramètres seront **optionnels** dès que le module sera branché.\n' +
            'Pour l’instant aucune action supplémentaire — utilise une commande déjà complète via `+help` / `/help`.'
        )
        .setColor(c),
    ],
  });
}

module.exports = { stubFromParsed, formatParsed };
