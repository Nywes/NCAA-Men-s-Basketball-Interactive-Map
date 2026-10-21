# 🗓️ Mise à jour annuelle — aide-mémoire

Ce qui doit être **mis à jour à la main chaque année**. Tout le reste (rosters, classements,
stats des joueurs) est **récupéré en direct depuis ESPN** → aucune intervention.

## Les 2 seuls fichiers de données à éditer
| Fichier | Contenu manuel |
|---|---|
| `src/teams.json` | Équipes **masculines** : `tournament` (palmarès March Madness) + `oldPlayers` (légendes) |
| `src/teams-women.json` | Équipes **féminines** : idem |

Après toute édition : `npm run build` pour valider, puis `git push` sur `main` = **déploiement auto** (voir la mémoire *reference-deployment*).

---

## Calendrier de l'année

### 🏆 Mars — Bracket March Madness (automatique, rien à faire)
- Le **bracket interactif** (bouton sous le switch M/W) se nourrit **en direct de l'API ESPN** :
  la nouvelle édition apparaît toute seule dans le sélecteur de saison dès avril.
- 💡 **Idée notée pour mars** : activer le **mode LIVE** (scores en direct pendant le tournoi,
  badge « LIVE » + rafraîchissement auto — l'API expose déjà les matchs en cours).

### 🏀 Mars–Avril — March Madness (le gros morceau)
Dès la fin des deux tournois NCAA :
- **Hommes** → `src/teams.json` · **Femmes** → `src/teams-women.json`
- Pour **chaque équipe** ayant progressé, ajouter la nouvelle année dans son `tournament` :
  - `titles` (championne), `finalFours` (Final Four), `eliteEights`, `sweetSixteens`
  - **⚠️ cumulatif** : une championne s'ajoute AUSSI dans finalFours/eliteEights/sweetSixteens de la même année ; F4 ⊂ E8 ⊂ S16
  - `appearances` : **+1** pour **chaque** équipe du tableau (participation)
- Méthode la moins chère : lire **le bracket par année** (1 page Wikipédia « YYYY NCAA Division I men's/women's basketball tournament ») plutôt que fac par fac.
- Aussi annoncés à cette période → voir « Récompenses universitaires » plus bas.

### 🏆 Avril (mi) — WNBA Draft
- Nouvelles stars féminines qui quittent la fac. Option « fun » : ajouter les tout premiers choix à leur fac (comme les hommes 2026). Draft WNBA depuis **1997** seulement.

### 🏀 Mai–Juin — Fin de saison NBA
- **Finales NBA** (~juin) : titre + Finals MVP.
- **Récompenses NBA** (~mai-juin) : MVP, ROY, All-NBA.
- **NBA Draft** (~fin juin) : nouveaux prospects (option « fun »).
→ mettre à jour les `awards.nba` des légendes concernées dans `src/teams.json`.

### 🏀 Septembre–Octobre — Fin de saison WNBA
- **Finales WNBA** : titre + Finals MVP.
- **Récompenses WNBA** : MVP, ROY, All-WNBA.
→ mettre à jour les `awards.nba` (= WNBA) des légendes dans `src/teams-women.json`.

### ⭐ All-Star (à ne pas oublier)
- **NBA All-Star** : ~**février** → incrémenter `awards.nba.allStar` des légendes sélectionnées (hommes).
- **WNBA All-Star** : ~**juillet** → idem dans le fichier femmes.

### 🎖️ Hall of Fame (~avril, intronisation ~septembre)
- **Naismith Memorial HOF** (hommes ET femmes) + **Women's Basketball HOF** (femmes).
- Nouvelle intronisée/intronisé déjà dans nos légendes → passer `hof: true`.

---

## 🌍 Récompenses universitaires (fin mars / avril)
À vérifier chaque année — peuvent créer une **nouvelle légende** ou compléter une fiche :
- **National Player of the Year** (AP / Naismith / Wooden / Wade[F] / USBWA) → `awards.ncaa.naismithPOY`
- **Consensus All-American** → `awards.ncaa.allAmerican`
- **Final Four Most Outstanding Player** → `awards.ncaa.tournamentMOP`
- Une joueuse/joueur actuel qui devient consensus AA ou POY national **peut** entrer dans les légendes (barre stricte, cf. *feedback-legends-inclusion-criteria*).

---

## 🌍 Compétitions internationales (médailles SENIOR)
`awards.intl` = `[{ medal, event, year }]`. **Prochaines échéances :**
| Compétition | Prochaines éditions |
|---|---|
| Jeux Olympiques | **2028** (Los Angeles), 2032 |
| Coupe du monde FIBA **féminine** | **2026** (Allemagne, sept.), 2030 |
| Coupe du monde FIBA **masculine** | **2027** (Qatar), 2031 |
| EuroBasket (H et F) | 2025 ✓, H **2029** / F **2027** |
| AmeriCup, AfroBasket, Asia Cup | ~tous les 4 ans |
→ Médaille senior d'une légende (Team USA **ou** pays étranger, ex. Gabby Williams/France) = à ajouter.

---

## 📐 Conventions à respecter (sinon l'affichage casse)
- **Années = chaînes** (`"2026"`), jamais des nombres. `appearances` = **compteur** (entier).
- **⚠️ Pas de tournoi 2020** (COVID) — ne jamais l'ajouter, ni hommes ni femmes.
- **Palmarès cumulatif** (cf. Mars-Avril ci-dessus).
- **Médailles** : `medal` en **minuscules** (`"gold"`/`"silver"`/`"bronze"`) sinon l'image + la couleur disparaissent. `event` normalisé : `"Olympics"` / `"FIBA World Cup"` / `"EuroBasket"`.
- **Femmes = mêmes champs `awards.nba`** pour les honneurs **WNBA** (l'app affiche « WNBA » automatiquement). Idem `nba.champion` = titres WNBA, `nba.mvp` = MVP WNBA, etc.
- `awards.nba.allStar` = entier · `awards.nba.allNBA` = `false` ou entier.
- `legendRank` = ordre d'affichage (1 = en premier). Nouvelle légende ajoutée en fin = rang max + 1.
- **`id` = chaîne, unique.** Préférer le **vrai id ESPN** (photo auto via `assets/players/{id}.jpg`). ⚠️ **Un id femme ne doit jamais réutiliser un id homme** (photos partagées) — sinon générer un placeholder (série 9xxxxxxx).
- Écriture du JSON : `JSON.stringify(obj, null, 2) + "\n"` (diff propre).

---

## 🇪🇺 EuroLeague — rentrée (octobre)
- Les scripts détectent **seuls** la saison en cours (`scripts/euroleague-common.js`, `resolveSeason`) : clubs sortants archivés dans `scripts/euroleague-teams-archive.json`, nouveaux clubs créés automatiquement (salle/capacité via leur 1er match à domicile, coordonnées géocodées — sinon ajouter une entrée `COORDS_OVERRIDES` dans `update-euroleague-data.js`, et les couleurs dans `COLOR_OVERRIDES`).
- **Une seule chose à faire à la main, dès l'annonce officielle** : le lieu et les dates du prochain Final Four dans `UPCOMING_FINAL_FOUR` (euroleague-common.js), affichés tant que les playoffs ne sont pas joués. Si une nouvelle salle de Final Four apparaît, ajouter sa ville dans `FINAL_FOUR_CITIES` (l'API ne la donne pas ; le script signale « ville inconnue »).
- Le tableau conserve l'historique de toutes les saisons depuis 2004-05 (sélecteur dans l'overlay).
- **EuroCup** : mêmes scripts, compétition `U` (`node scripts/update-euroleague-data.js U`) → `src/eurocup-*.json`. Nouveaux clubs géocodés automatiquement (Photon puis Nominatim) ; en cas de point aberrant ou de salle délocalisée, ajouter une entrée `TEAM_OVERRIDES` dans `update-euroleague-data.js` (ex. Derthona, Hapoel Jerusalem). Le filtre EuroLeague / EuroCup et le titre de la carte Europe sont dans `EURO_COMPETITIONS` (`src/leagues.js`).

## 🇪🇸 Liga ACB — rentrée (septembre / octobre)
- `scripts/update-acb-data.js` (workflow quotidien, API `api2.acb.com`) détecte **seul** la saison (dernier `editionId` listé), archive les relégués dans `scripts/acb-teams-archive.json` et crée les promus automatiquement (logo, couleur, salle, capacité, site via l'API ; coordonnées géocodées Photon puis Nominatim). Point aberrant → entrée `TEAM_OVERRIDES` (clé = `clubId`, ex. Real Madrid, Andorra).
- Joueur **sans drapeau** : l'API donne les pays en espagnol ; le script liste « pays sans code » → ajouter le nom dans `COUNTRIES` (→ code FIBA) et, si le code est nouveau, dans `NAT_TO_ISO2` (`src/EuroleagueTeamPanels.js`).
- Si l'API répond 401/403 : la clé publique `X-APIKEY` du site a changé → la relire dans le JS de acb.com (onglet réseau).
- Palmarès (`honours`) des clubs : vides pour l'instant, à remplir à la main si souhaité (même format que l'EuroLeague).
- La carte (`src/AcbMap.js`) est une configuration de `src/ClubLeagueMap.js`, commune à l'Europe : nouvelle ligue nationale = même schéma de données + un wrapper.

## 🇮🇹 Serie A (LBA) — rentrée (septembre / octobre)
- `scripts/update-lba-data.js` (workflow quotidien, API interne `legabasket.it/api`, sans clé) détecte **seul** la saison (championnat « Regular Season » courant), archive les relégués dans `scripts/lba-teams-archive.json` et crée les promus automatiquement (logo via le CDN `lba-media`, salle et ville via le calendrier, coordonnées géocodées Photon puis Nominatim — un résultat hors d'Italie est rejeté). Les ids d'équipe changent chaque saison : nos clubs sont indexés par `club_id`. Point aberrant ou ville mal libellée → `TEAM_OVERRIDES` (clé = `club_id`, ex. Reyer Venezia).
- Nationalités en codes ISO3 (`SVN`, `HRV`, `DEU`…) : un drapeau manquant → ajouter l'alias dans `NAT_TO_ISO2` (`src/EuroleagueTeamPanels.js`). Nouveau poste italien → `POSITIONS` (le script liste « postes inconnus »).
- L'API ne donne ni couleurs ni capacités : l'accent de la compétition sert de couleur ; `color` / `capacity` / `website` / `honours` peuvent être remplis à la main dans `src/lba-teams.json` (jamais écrasés).
- **Logos** : ceux du CDN LBA contiennent le sponsor sous l'écusson ; `scripts/crop-lba-logos.py` (Pillow, lancé par le workflow après le script LBA) détecte le filet horizontal, garde l'écusson seul et écrit `public/lba-logos/<club_id>.png` (`logo` du JSON = chemin relatif, `logoSource` = URL CDN). Un écusson mal recadré → vérifier la planche (`python3 scripts/crop-lba-logos.py` puis ouvrir le PNG) ; en dernier recours remplacer le fichier à la main (il n'est réécrit qu'à partir de `logoSource`).

## 🇩🇪 Bundesliga (BBL) — rentrée (septembre / octobre)
- `scripts/update-bbl-data.js` (workflow quotidien) lit le JSON serveur `__NEXT_DATA__` des pages `easycredit-bbl.de` (pas d'API publique) : `/saison/tabelle` (saison active, classement, liste des clubs avec salle/capacité/adresse) puis `/teams/<id>/<saison>` (effectif, stats, couleurs de maillot). Promus créés automatiquement (coords géocodées Photon puis Nominatim, résultat hors d'Allemagne rejeté), relégués archivés dans `scripts/bbl-teams-archive.json`. Ville mal libellée (adresse du club ≠ salle) → `TEAM_OVERRIDES` (ex. Bamberg).
- Si le site change de structure (widget `acf/bbl-standings-table` ou `teamNavigatorData` absents), le script échoue proprement : ouvrir la page, chercher `__NEXT_DATA__` et adapter les chemins.
- Nationalités en ISO2 (`DE`, `US`…) : acceptées telles quelles par le panneau. Couleurs = noms allemands des maillots (`SHIRT_COLORS`) ; une couleur déjà présente dans `src/bbl-teams.json` n'est jamais écrasée (corriger à la main si besoin).

## 🇦🇺 NBL — rentrée (septembre)
- `scripts/update-nbl-data.js` (workflow quotidien, API « rosetta » `prod.rosetta.nbl.com.au`, sans clé mais en-têtes `Origin`/`Referer` nbl.com.au obligatoires) détecte **seul** la saison (`seasons/current`), lit le classement (`running_ladder`), les clubs (`teams`) et l'effectif de chaque équipe via ses stats de saison (`stats/leaders/.../team/<code>`) complétées par les fiches `players`. Un joueur n'ayant encore joué aucun match peut manquer tant qu'il n'a pas de ligne de stats.
- **Nouveau club (expansion)** : ajouter sa ville dans `CITIES` (code d'équipe → ville, pays) pour un géocodage correct (l'API ne donne que le nom de la salle) ; sinon le script géocode la salle seule.
- Codes de nationalité mélangés (FIBA et ISO3, ex. `GRC`, `SUD`) : un drapeau manquant → alias dans `NAT_TO_ISO2` (`src/EuroleagueTeamPanels.js`).

## 🔧 Cas ponctuels (pas annuels, mais à surveiller)
- **Réalignement de conférences** (chaque été, effectif au 1er juillet) → champ `conference` des équipes concernées, dans les **deux** fichiers. Source fiable : `src/espn-teams.json` (`groups.id` ESPN, régénéré chaque jour) — attention, ESPN marque parfois un groupe bidon (`isConference: false`, ex. l'American en 2026) : garder la conférence existante dans ce cas. Les ids de conférence doivent exister dans `divisions` (App.js) et chaque badge avoir son `.webp` dans `public/conferences/`. Fait pour 2026-27 (Pac-12 relancé, WAC → UAC, MAAC → Metro, Saint Francis parti en D3, West Florida arrivé).
- **Renommage / rebranding** d'une fac (ex. George Washington → Revolutionaries, IUPUI → IU Indianapolis) → champ `name`.
- **Nouvelles équipes D1 / passages en D2** → ajout/retrait d'équipe (rappel : The Citadel & VMI n'ont **pas** d'équipe féminine).

## 🇫🇷 France — rentrée (septembre)
- Les scripts (workflow quotidien) détectent **seuls** la nouvelle saison LNB/FFBB, déplacent les clubs sortants (relégués, engagement refusé…) dans `scripts/fr-teams-archive.json` / `scripts/fr-women-teams-archive.json` (palmarès conservé, retour auto s'ils remontent).
- **Hommes : un club promu jamais vu fait échouer le workflow** (« Clubs sans fiche ») → l'ajouter à la main dans `src/fr-teams.json` (id libre, `displayName`, coords, salle, logo, `honours`) + au besoin une entrée `NAME_OVERRIDES` dans `scripts/update-fr-data.js`, puis relancer.
- Femmes : un nouveau club est créé automatiquement (coords géocodées) → ajouter juste son nom propre (`NAME_OVERRIDES`) et son logo Proballers (`PROBALLERS_ID`) dans `scripts/update-fr-women-data.js`. Les champs déjà remplis (salle, nom, coords, palmarès) ne sont jamais écrasés par l'API.

---

## ✅ Checklist express « après March Madness »
1. [ ] Palmarès hommes (`teams.json`) : champion, F4, E8, S16, appearances++
2. [ ] Palmarès femmes (`teams-women.json`) : idem
3. [ ] POY national / consensus AA / F4 MOP → nouvelles légendes éventuelles
4. [ ] (plus tard) titres + récompenses NBA/WNBA, All-Star, HOF, médailles internationales
5. [ ] `npm run build` OK → `git push` sur `main`
