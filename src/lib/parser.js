/**
 * Parse une ligne après le préfixe.
 * @param {string} line
 */
function parseCommandLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();

  if (lower.startsWith('search wiki')) {
    return {
      key: 'searchwiki',
      sub: null,
      args: [],
      text: trimmed.slice(11).trim(),
      raw: trimmed,
    };
  }

  const tokens = trimmed.split(/\s+/);
  const key = tokens[0].toLowerCase();
  const rest = tokens.slice(1);

  if (key === 'server' && rest.length) {
    return {
      key: 'server',
      sub: rest[0].toLowerCase(),
      args: rest.slice(1),
      text: '',
      raw: trimmed,
    };
  }

  return { key, sub: null, args: rest, text: '', raw: trimmed };
}

module.exports = { parseCommandLine };
