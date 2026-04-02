/**
 * Texte intégral des listes (équivalent doc Crow Bots) pour /help et +help.
 * Les commandes sans ✓ sont en général **à venir** sur Sayuri ; voir aussi les notes en jeu.
 */
module.exports = {
  util: `**Rappel** — paramètres : noms, mentions ou IDs ; si ce ne sont pas des mentions, séparer par \`,,\`.

**+changelogs** — Affiche les dernières notes de mise à jour
**+allbots** — Liste des bots sur le serveur
**+alladmins** — Membres (hors bots) avec permission administrateur
**+botadmins** — Bots ayant la permission administrateur
**+boosters** — Membres boostant le serveur
**+rolemembers <rôle>** — Membres ayant un rôle précis
**+serverinfo** — Infos du serveur
**+vocinfo** — Infos activité vocale du serveur
**+role <rôle>** — Infos sur un rôle
**+channel [salon]** — Infos sur un salon
**+user [membre]** — Infos utilisateur
**+member [membre]** — Infos membre sur le serveur
**+pic [membre]** — Photo de profil
**+banner [membre]** — Bannière
**+server pic** — Icône du serveur
**+server banner** — Bannière du serveur
**+snipe** — Dernier message supprimé du salon
**+emoji <émoji>** — Image d’un émoji
**+image <mot-clé>** — Recherche Google Images *(à venir)*
**+suggestion <message>** — Publier une suggestion *(à venir)*
**+lb suggestions** — Suggestions les mieux notées *(à venir)*
**+wiki <mot-clé>** — Recherche Wikipédia
**+search wiki <mot-clé>** — Liste d’articles Wikipédia
**+calc <calcul>** — Calcul / équation
**+crowbots** — Invitation serveur support CrowBots`,

  control: `**Contrôle du bot** — mêmes règles de paramètres (mentions / IDs / \`,,\`).

**+set name / set pic / set banner** — Profil du bot *(à venir)*
**+set profil** — Modifier le profil d’un coup *(à venir)*
**+theme <couleur>** — Couleur des embeds *(✓ Sayuri)*
**+playto / listen / watch / compet / stream** — Activité du bot *(à venir)*
**+remove activity** — Retire l’activité *(à venir)*
**+online / idle / dnd / invisible** — Statut *(à venir)*
**+mp settings** — MP du bot *(à venir)*
**+server list** — Serveurs du bot *(à venir)*
**+invite <ID/nombre>** — Invitation vers un serveur *(à venir)*
**+leave [ID/nombre]** — Quitter un serveur *(à venir)*
**+discussion <ID/nombre>** — Parler via le bot *(à venir)*
**+mp <membre> <message>** — Envoyer un MP *(à venir)*
**+fivem** — Lier FiveM *(à venir)*
**+owner** — Liste des owners *(à venir)*
**+owner <@membre/ID>** — Ajouter owner *(à venir)*
**+unowner** — Retirer owner *(à venir)*
**+clear owners** — Vider les owners *(à venir)*
**+bl / unbl / blinfo / clear bl** — Blacklist globale *(à venir)*
**+say <message>** — Faire parler le bot *(à venir)*
**+change / changeall / change reset** — Permissions des commandes *(à venir)*
**+mainprefix** — Préfixe global *(à venir)*
**+secur invite** — Quitte les serveurs sans owner *(à venir)*
**+helptype** — Menu help boutons/select *(à venir)*
**+alias / helpalias** — Alias *(à venir)*
**+set lang / lang custom / get lang** — Langues *(à venir)*
**+updatebot / autoupdate** — Mises à jour *(à venir)*
**+reset server / resetall** — Reset config *(à venir)*

**Sayuri ✓** : **+botadmin** (owners) · **+publiccmd** (admin) · **+settings** · **+theme**`,

  antiraid: `**Antiraid** — paramètres : noms, mentions ou IDs ; sinon \`,,\`.

**+raidlog** · **+raidping** · **+antitoken** · **+secur** · **+antiupdate** · **+antichannel** · **+antirole** · **+antiwebhook** · **+clear webhooks** · **+antiunban** · **+antibot** · **+antiban** · **+antieveryone** · **+antideco** · **+blrank** · **+punition** · **+creation limit** · **+wl / unwl / clear wl**

*Toutes ces commandes sont prévues ; non actives sur Sayuri pour l’instant.*`,

  gestion: `**Gestion du serveur** — paramètres : noms, mentions ou IDs ; sinon \`,,\`.

**+giveaway** · **+end giveaway** · **+reroll** · **+choose** · **+embed** · **+backup** (+ list / delete / load / autobackup) · **+loading** · **+create** · **+newsticker** · **+massiverole / unmassiverole** · **+voicemove** · **+voicekick** · **+cleanup** · **+bringall** · **+renew** · **+unbanall** · **+temprole / untemprole** · **+sync** · **+openmodmail** · **+button** · **+autoreact** · **+formulaire** · **+perms** · **+slowmode** · **+autodelete** · **+rolemenu** · **+ticket settings** · **+claim** · **+rename** · **+add/del membre** · **+close** · **+tempvoc** · **+twitch** · **+join settings** · **+leave settings** · **+reminder** · **+custom / customlist / clear customs / custom transfer** · **+restrict / unrestrict** · **+soutien** · **+set perm / del perm / clear perms** · **+prefix** · **+modmail** · **+report settings** · **+show pics** · **+autopublish** · **+suggestion settings**

*Prévu — non actif sauf modération de base Sayuri :* **+addrole** **+delrole** **+lock** **+unlock** **+clear**`,

  logs: `**Logs** — paramètres : noms, mentions ou IDs ; sinon \`,,\`.

**+settings** — Paramètres du bot *(à venir sur Sayuri)*
**+modlog on/off** · **+set modlogs**
**+messagelog on/off**
**+voicelog on/off**
**+boostlog on/off**
**+rolelog on/off**
**+raidlog [salon] / off**
**+autoconfiglog**
**+join settings** · **+leave settings**
**+boostembed** (+ set / test)
**+modmail**
**+nolog**

*Toutes prévues — non actives pour l’instant.*`,

  modset: `**Paramètres de modération**

**+settings**
**+timeout on/off** — Timeout Discord vs rôle mute *(à venir)*
**+clear limit** — Max messages par clear *(à venir)*
**+piconly** — Salon selfie *(à venir)*
**+join settings** · **+leave settings**
**+public on/off** — Commandes publiques *(Sayuri : voir +publiccmd)*
**+public allow/deny/reset [salon]** *(à venir)*`,

  mod: `**Modération** — paramètres : noms, mentions ou IDs ; sinon \`,,\`.

**Sayuri ✓** : **+clear** · **+warn** · **+sanctions** · **+kick** · **+ban** · **+unban** · **+timeout** · **+lock** · **+unlock** · **+addrole** · **+delrole**

**+del sanction** · **+clear sanctions** · **+clear all sanctions** *(à venir)*
**+mute / tempmute / unmute** · **+cmute / tempcmute / uncmute** · **+mutelist** · **+unmuteall** *(à venir)*
**+tempban** · **+banlist** *(à venir)*
**+lockall / unlockall** · **+hide / unhide / hideall / unhideall** *(à venir)*
**+derank** · **+muterole** · **+set muterole** *(à venir)*
**+antispam** · **+antilink** · **+antimassmention** · **+badwords** · **+clear badwords** · **+spam** · **+link** *(à venir)*
**+strikes** · **+ancien** · **+punish** · **+noderank** *(à venir)*`,
};
