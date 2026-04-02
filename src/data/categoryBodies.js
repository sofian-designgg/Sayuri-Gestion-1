/**
 * Texte intégral des listes (référence type Crow Bots) pour /help et +help.
 * Les arguments sont en général optionnels là où la logique le permettra.
 */
module.exports = {
  util: `**Rappel** — noms, mentions ou IDs ; sinon séparer par \`,,\` si besoin.

**+changelogs** — Notes de mise à jour
**+allbots** — Liste des bots
**+alladmins** — Humains administrateurs
**+botadmins** — Bots administrateurs
**+boosters** — Membres qui boostent
**+rolemembers** — Membres d’un rôle
**+serverinfo** — Infos serveur
**+vocinfo** — Infos activité vocale
**+role** — Infos rôle
**+channel** — Infos salon (défaut : salon actuel)
**+user** — Infos utilisateur (défaut : toi)
**+member** — Infos membre (défaut : toi)
**+pic** — Avatar (défaut : toi)
**+banner** — Bannière (défaut : toi)
**+server pic** / **+server banner** — Icône / bannière du serveur
**+snipe** — Dernier message supprimé
**+emoji** — Image d’un émoji custom
**+image** — Recherche Google Images
**+suggestion** — Publier une suggestion
**+lb suggestions** — Classement suggestions
**+wiki** — Wikipédia
**+search wiki** — Liste d’articles Wikipédia
**+calc** — Calcul
**+crowbots** — Lien support CrowBots`,

  control: `**Contrôle du bot**

**+set name / pic / banner** · **+set profil** · **+theme** · **+playto listen watch compet stream** · **+remove activity** · **+online idle dnd invisible** · **+mp settings** · **+server list** · **+invite** · **+leave** · **+discussion** · **+mp** · **+fivem** · **+owner** · **+unowner** · **+clear owners** · **+bl unbl blinfo clear bl** · **+say** · **+change changeall change reset** · **+mainprefix** · **+secur invite** · **+helptype** · **+alias helpalias** · **+set lang lang custom get lang** · **+updatebot autoupdate** · **+reset server resetall** · **+botadmin** · **+publiccmd** · **+settings**

*Déjà actifs sur Sayuri :* **+botadmin** · **+publiccmd** · **+settings** · **+theme**`,

  antiraid: `**Antiraid**

**+raidlog** · **+raidping** · **+antitoken** · **+secur** · **+antiupdate** · **+antichannel** · **+antirole** · **+antiwebhook** · **+clear webhooks** · **+antiunban** · **+antibot** · **+antiban** · **+antieveryone** · **+antideco** · **+blrank** · **+punition** · **+creation limit** · **+wl unwl clear wl**`,

  gestion: `**Gestion du serveur**

**+giveaway** · **+end giveaway** · **+reroll** · **+choose** · **+embed** · **+backup** (+ list / delete / load / autobackup) · **+loading** · **+create** · **+newsticker** · **+massiverole unmassiverole** · **+voicemove** · **+voicekick** · **+cleanup** · **+bringall** · **+renew** · **+unbanall** · **+temprole untemprole** · **+sync** · **+openmodmail** · **+button** · **+autoreact** · **+formulaire** · **+perms** · **+slowmode** · **+autodelete** · **+rolemenu** · **+ticket settings** · **+claim rename add/del close** · **+tempvoc** · **+twitch** · **+join settings leave settings** · **+reminder** · **+custom customlist clear customs custom transfer** · **+restrict unrestrict** · **+soutien** · **+set perm del perm clear perms** · **+prefix** · **+modmail** · **+report settings** · **+show pics** · **+autopublish** · **+suggestion settings**

*Côté Sayuri déjà utile :* **+addrole** · **+delrole** · **+lock** · **+unlock** · **+clear**`,

  logs: `**Logs**

**+settings** · **+modlog** · **+set modlogs** · **+messagelog** · **+voicelog** · **+boostlog** · **+rolelog** · **+raidlog** · **+autoconfiglog** · **+join settings leave settings** · **+boostembed** · **+modmail** · **+nolog**`,

  modset: `**Paramètres modération**

**+settings** · **+timeout on/off** · **+clear limit** · **+piconly** · **+join settings leave settings** · **+public on/off** (+ allow/deny/reset salon)

*Sur Sayuri :* commandes publiques via **+publiccmd**`,

  mod: `**Modération**

**+sanctions** · **+del sanction** · **+clear sanctions** · **+clear all sanctions** · **+clear** · **+warn** · **+mute tempmute unmute** · **+cmute tempcmute uncmute** · **+mutelist unmuteall** · **+kick** · **+ban tempban unban banlist** · **+lock unlock lockall unlockall** · **+hide unhide hideall unhideall** · **+addrole delrole derank** · **+muterole set muterole** · **+antispam antilink antimassmention** · **+badwords clear badwords spam link** · **+strikes ancien punish noderank**

*Déjà actifs :* **+clear** · **+warn** · **+sanctions** · **+kick** · **+ban** · **+unban** · **+timeout** · **+lock** · **+unlock** · **+addrole** · **+delrole**`,
};
