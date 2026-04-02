/**
 * Onglets d’aide (menu déroulant).
 * Les listes reprennent la structure « type Crow Bots » ; les ✓ sont codées sur Sayuri.
 */
module.exports.CATEGORIES = [
  {
    id: 'util',
    label: 'Utilitaire',
    emoji: '🧰',
    lines: [
      '**Implémentées ✓** : `+help` `+changelogs` `+allbots` `+alladmins` `+botadmins` `+boosters` `+rolemembers` `+serverinfo` `+vocinfo` `+role` `+channel` `+user` `+member` `+pic` `+banner` `+server pic|banner` `+snipe` `+emoji` `+calc` `+wiki` `+search wiki` `+crowbots`',
      '',
      '**Paramètres** : noms, mentions ou IDs ; séparer par `,,` si plusieurs (support progressif).',
      '',
      '**À venir** : `+image` `+suggestion` `+lb suggestions` `+fivem` …',
    ],
  },
  {
    id: 'control',
    label: 'Contrôle du bot',
    emoji: '⚙️',
    lines: [
      '**Implémentées ✓** : `+botadmin` (owners) `+publiccmd` (admin) `+settings` `+theme`',
      '',
      '**À venir** : `+set name|pic|banner` `+playto|listen|watch…` `+online|idle|dnd` `+mp` `+leave` `+invite` `+bl|unbl` `+owner` `+mainprefix` `+change` permissions `+helptype` `+alias` `+lang` `+updatebot` `+reset` …',
    ],
  },
  {
    id: 'antiraid',
    label: 'Antiraid',
    emoji: '🛡️',
    lines: [
      '**À venir** : `+raidlog` `+antitoken` `+secur` `+antiupdate` `+antichannel` `+antirole` `+antiwebhook` `+antiunban` `+antibot` `+antiban` `+antieveryone` `+antideco` `+blrank` `+punition` `+creation limit` `+wl|unwl` …',
    ],
  },
  {
    id: 'gestion',
    label: 'Gestion du serveur',
    emoji: '🏛️',
    lines: [
      '**À venir** : `+giveaway` `+embed` `+backup` `+massiverole` `+voicemove` `+ticket` `+tempvoc` `+reminder` `+custom` `+prefix` `+modmail` `+slowmode` `+rolemenu` …',
      '',
      '**Modération déjà dispo** : `+addrole` `+delrole` `+lock|unlock` `+clear` …',
    ],
  },
  {
    id: 'logs',
    label: 'Logs',
    emoji: '📜',
    lines: [
      '**À venir** : `+modlog` `+messagelog` `+voicelog` `+boostlog` `+rolelog` `+autoconfiglog` `+nolog` `+boostembed` …',
    ],
  },
  {
    id: 'modset',
    label: 'Paramètres modération',
    emoji: '🔧',
    lines: [
      '**À venir** : `+timeout on/off` (mute Discord) `+clear limit` `+piconly` `+public on/off` `+join|leave settings` …',
    ],
  },
  {
    id: 'mod',
    label: 'Modération',
    emoji: '🔨',
    lines: [
      '**Implémentées ✓** : `+clear` `+warn` `+sanctions` `+kick` `+ban` `+unban` `+timeout` `+lock` `+unlock` `+addrole` `+delrole`',
      '',
      '**À venir** : `+mute|tempmute|unmute` `+mutelist` `+tempban` `+banlist` `+lockall` `+hide` `+derank` `+muterole` `+antispam` `+antilink` `+strikes` `+punish` …',
    ],
  },
];
