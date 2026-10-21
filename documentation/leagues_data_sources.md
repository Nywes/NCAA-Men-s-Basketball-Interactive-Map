# Ligues de basket mondiales — disponibilité des données (audit du 20 octobre 2026)

Objectif : savoir quelles grandes ligues (hors NBA / WNBA / NCAA / championnats français / EuroLeague, déjà couverts) peuvent être ajoutées au site avec **des sources gratuites, interrogeables par un script Node dans GitHub Actions** (donc sans contrainte CORS, mais sans clé payante et sans rendu navigateur), pour obtenir : équipes + logos, salles (pour les marqueurs), classement, effectifs (photo, poste, taille, nationalité) et statistiques joueurs de la saison en cours.

Chaque endpoint cité a été **appelé réellement** (curl) le 20/10/2026. Les quatre premières lignes (ACB, Serie A, BBL, ABA) viennent d'une première passe d'agents, les autres d'une enquête manuelle.

## Verdicts

- **A** — source JSON gratuite et stable (API officielle ou équivalent) avec équipes + classement + effectifs + stats.
- **B** — tout ou presque est disponible, mais via le JSON interne (non documenté) d'un site officiel, ou avec une donnée manquante.
- **C** — uniquement du HTML à parser (fragile), ou une API payante.
- **D** — rien d'exploitable.

## Tableau récapitulatif

| Ligue | Pays | Verdict | Source principale | Équipes / logos | Salles | Classement | Effectifs (photos) | Stats joueurs | Effort | Remarques |
|---|---|---|---|---|---|---|---|---|---|---|
| **EuroCup** | Europe | **A** | `api-live.euroleague.net` (compétition `U`) | ✓ ✓ | ✓ (par match) | ✓ (v3 basicstandings) | ✓ (✓) | ✓ | très faible | Même API que l'EuroLeague : 32 clubs, 224 matchs, 348 joueurs. Copie des scripts existants. |
| **Liga ACB** | Espagne | **B** | `api2.acb.com` (clé publique `X-APIKEY` embarquée dans le site) | ✓ ✓ (+ couleurs) | ✓ nom, adresse, capacité (coords via Wikidata) | ✓ | ✓ (✓) | ✓ | faible | 18 équipes. Saison détectée automatiquement (dernier `editionId` listé). **Intégrée le 21/10/2026** → carte `/spain`, `scripts/update-acb-data.js`. |
| **Serie A (LBA)** | Italie | **B** | `legabasket.it/api/*` (JSON interne) | ✓ ✓ (CDN S3) | coords via Wikidata | ✓ | ✓ | ✓ | faible | 16 équipes. `teams/get-teams`, `championships/get-championship-ranking?id=`, `teams/get-team-roster?id=`, `teams/get-team-players-stats?id=`, `championships/get-championships-calendar-by-id?id=&d=` (salles). Images : `lba-media.s3…/variants/<key>/thumb`. **Intégrée le 21/10/2026** → carte `/italy`, `scripts/update-lba-data.js`. |
| **Bundesliga (BBL)** | Allemagne | **B** | `__NEXT_DATA__` des pages `easycredit-bbl.de` | ✓ ✓ | ✓ adresse + capacité | ✓ | ✓ (✓) | ✓ (218 joueurs) | moyen | 18 équipes. JSON serveur embarqué dans chaque page : `/saison/tabelle` (widget `acf/bbl-standings-table` + `teamNavigatorData` : clubs, salles, capacités, adresses), `/teams/<id>/<saison>` (effectif, stats par match, couleurs), `/statistiken/spieler`. Images webp sur `api.basketball-bundesliga.de`. **Intégrée le 21/10/2026** → carte `/germany`, `scripts/update-bbl-data.js`. |
| **NBL** | Australie / NZ | **B+** | `prod.rosetta.nbl.com.au` (API officielle non documentée, sans clé, exige `Origin`/`Referer` nbl.com.au) | ✓ ✓ (+ couleurs) | ✓ (par match et par équipe) | ✓ `calc/nbl/running_ladder/...` | ✓ `get/nbl/players` | partiel (ladder détaillé ; endpoints stats joueurs non découverts) | faible / moyen | 10 équipes, saison NBL27 en cours. Sans les en-têtes, 403. Stats joueurs par équipe : `get/nbl/stats/leaders/for/season/id/<season.id>/team/<code>?limit=500` ; classement `get/nbl/standings/<année>/regular`. **Intégrée le 21/10/2026** → carte `/australia`, `scripts/update-nbl-data.js`. |
| **TPBL** | Taïwan | **B+** | `api.tpbl.basketball/api/*` (JSON sans clé) | ✓ ✓ (logos dans le classement) | ✓ (par match) | ✓ | fiches joueurs `players/<id>` (images, stats, équipe) ; pas de liste par équipe → à dériver des stats | ✓ stats de tous les joueurs par match (343 Ko) → moyennes calculables | faible / moyen | 7 équipes, saison 2026-27 (season 3). Noms en chinois traditionnel. |
| **Basketball Champions League** | Europe (FIBA) | **B** | données serveur (React flight) embarquées dans les pages `championsleague.basketball` + **FIBA LiveStats** `fibalivestats.dcd.shared.geniussports.com/data/<gameId>/data.json` (sans clé) | ✓ (pages) | ✓ (LiveStats) | ✓ (`teamsStats` par groupe dans le HTML) | ✓ via les box-scores LiveStats | ✓ à agréger depuis les box-scores | moyen / élevé | API officielle `digital-api.fiba.basketball/hapi` = 401 (réservée). Parsing du HTML SSR nécessaire. |
| **CBA** | Chine | **B−** | `portal-server.cbaleague.com` (JSON sans clé) | ✓ ✓ (`home/head_team_logo`) | ✗ | ✓ `team/rank` (20 équipes, forme, dom./ext.) | ✗ | ✗ | faible (classement seul) | Le site officiel n'a pas de pages équipes / joueurs ; seules les données CBDL (ligue de développement) existent. Stats joueurs introuvables en libre. |
| **BAL** | Afrique (NBA) | **B−** | `bal.nba.com/api/teams` (CMS) + `__NEXT_DATA__` des pages | ✓ ✓ (photo) | ✗ | ✓ stats d'équipe dans le HTML des pages | HTML embarqué (`teamProfile.roster`) | HTML embarqué | moyen / élevé | 12 équipes, saison courte avril–juin (hors saison aujourd'hui). Pas d'API stats. |
| **B.League** | Japon | **C+** | `bleague.jp` : stats joueurs en JSON (`/stats/?data_format=json…`, lignes HTML dans le JSON) ; clubs, salles et classement en HTML | ✓ (HTML) | ✓ (`arena_detail`) | HTML (le JSON du classement renvoie 403 « 携帯非対応 ») | HTML (`roster_detail?PlayerID=`) | ✓ (JSON, en-tête `X-Requested-With` requis) | élevé | Tout en japonais ; 50 joueurs par page. |
| **Greek Basket League** | Grèce | **C** | `esake.gr` (HTML : `EsakeTeams`, `EsaketeamView?idteam=`, `EsakePlayers`, `EsakeStats`) + widget Genius Sports (HTML dans une iframe) | HTML | HTML | HTML | HTML | HTML | élevé | Aucune API visible ; le widget Genius ne révèle pas de clé. |
| **ABA League** | Adriatique | **C** | `aba-liga.com` (HTML) | HTML (+ `/images/club/150x150/<id>.png`) | HTML | HTML | HTML (+ photos) | HTML (moyennes par joueur) | élevé | Données complètes mais tout est à parser. |
| **EuroLeague Women** | Europe (FIBA) | **B ?** | même plateforme que la BCL (`fiba.basketball`) | à confirmer | à confirmer | à confirmer | à confirmer | à confirmer | moyen / élevé | L'URL de l'édition 2026-27 n'a pas été trouvée (404 sur les slugs testés) ; LiveStats renvoie 403 sur un match ELW. À reprendre quand la bonne page est identifiée. |
| **BSL** | Turquie | **D** | — | ✗ | ✗ | ✗ | ✗ | ✗ | — | `tbf.org.tr` derrière un défi Cloudflare, `tbl.org.tr` hors ligne, Proballers 403, TheSportsDB inutilisable en gratuit. Seule issue : API payante (API-Basketball). |

### Sondées rapidement, sans approfondir (une requête chacune)

| Ligue | Pays | Première impression |
|---|---|---|
| Liga Femenina Endesa | Espagne (F) | `baloncestoenvivo.feb.es` répond (ASP.NET), pas d'API visible dans le HTML → probablement C. |
| NBB | Brésil | `lnb.com.br` utilise des widgets Sportradar (pas d'API publique) → probablement C. |
| Liga Nacional | Argentine | `laliganacional.com.ar` sans API visible ; la ligue utilise FIBA LiveStats (à vérifier) → inconnu. |
| KBL | Corée du Sud | données servies par `kbl-data.sports2i.com` (application React, pas d'API repérée) → inconnu. |
| PBA | Philippines | `pba.ph/standings` en HTML → probablement C. |

## Fournisseurs transversaux

| Fournisseur | Résultat |
|---|---|
| **API EuroLeague** (`api-live.euroleague.net`) | Couvre EuroLeague (`E`) **et EuroCup (`U`)** avec le même format : la seule vraie « A ». |
| **Plateforme FIBA** (`fiba.basketball`, `championsleague.basketball`) | Données rendues côté serveur dans le HTML (flight data), API `hapi` réservée (401), mais **FIBA LiveStats** reste accessible sans clé par identifiant de match (box-scores complets, 270 Ko par match). |
| **Genius Sports** (widgets `widget.wh.geniussports.com`) | Le widget renvoie du HTML prêt à afficher, pas de JSON ni de clé visible : scraping seulement. |
| **TheSportsDB** | La clé gratuite « 3 » est **désactivée définitivement** ; la clé de test « 123 » ne renvoie que des données de démonstration (équipes de football anglais quel que soit l'id). Inutilisable sans abonnement. |
| **API-Basketball** (api-sports.io) | Non testée (clé personnelle requise). D'après sa documentation : classements, matchs, équipes pour des centaines de ligues, 100 requêtes/jour en gratuit, pas de statistiques joueurs par saison. Repli possible pour un classement (Turquie…), pas pour les effectifs. |
| **Proballers** | Pages HTML derrière Cloudflare (403 en script) ; seul l'endpoint d'images (`/api/getTeamLogo`) est ouvert. |
| **Wikidata / Wikipédia** | Repli universel pour les métadonnées (salles, coordonnées, logos), jamais pour les stats. |

## Recommandations d'intégration (par rapport gain / effort)

1. **EuroCup** — quasi gratuit : dupliquer les scripts EuroLeague avec `COMPETITION = 'U'`.
2. **Liga ACB** — API propre, 18 équipes, le plus gros public après l'EuroLeague.
3. **Serie A (LBA)** — JSON interne complet.
4. **Bundesliga (BBL)** — JSON serveur complet, un peu plus de parsing.
5. **NBL Australie** — API officieuse complète ; vérifier les endpoints de stats saison.
6. **TPBL** — API ouverte mais petite ligue (7 équipes) et noms en chinois.
7. **Basketball Champions League** — faisable grâce à LiveStats, mais parsing du HTML SSR.
8. **CBA** — classement + logos seulement, sans effectifs : intérêt limité pour le site.
9. **BAL, B.League, Grèce, ABA** — scraping HTML, à n'envisager que si la demande est forte.
10. **BSL turque** — à écarter tant qu'une source gratuite n'existe pas.

## Détails des endpoints testés

### EuroCup
- `GET /v2/competitions/U/seasons` → 25 saisons, dernière `U2026` (2026-27)
- `GET /v2/competitions/U/seasons/U2026/clubs` → 32 clubs (crest, ville)
- `GET /v2/competitions/U/seasons/U2026/games?phaseTypeCode=RS` → 224 matchs (salle par match)
- `GET /v3/competitions/U/seasons/U2026/rounds/3/basicstandings` → 32 lignes
- `GET /v3/competitions/U/statistics/players/traditional?SeasonMode=Single&SeasonCode=U2026` → 348 joueurs
- `GET /v2/competitions/U/seasons/U2026/clubs/<code>/people?personType=J` → effectif avec photo, taille, poste

### NBL (en-têtes `Origin: https://www.nbl.com.au`, `Referer: https://www.nbl.com.au/` obligatoires)
- `GET https://prod.rosetta.nbl.com.au/get/nbl/seasons/current` → saison NBL27, 165 matchs avec salles
- `GET https://prod.rosetta.nbl.com.au/calc/nbl/running_ladder/for/season/year/2026/regular` → classement (victoires, défaites, forme, net rating…)
- `GET https://prod.rosetta.nbl.com.au/get/nbl/teams` → 86 équipes (toutes compétitions) : logo, couleurs, salle, réseaux
- `GET https://prod.rosetta.nbl.com.au/get/nbl/players` → 500 fiches joueur/saison
- `GET https://prod.services.nbl.com.au/api_cache/nbl/cms?route=players&format=true&passthrough=true` → joueurs (CMS)

### TPBL
- `GET https://api.tpbl.basketball/api/seasons` · `/events/3/divisions` · `/events/3/teams`
- `GET https://api.tpbl.basketball/api/divisions/656/games/standings` → classement avec logos
- `GET https://api.tpbl.basketball/api/seasons/3/games` → calendrier/résultats
- `GET https://api.tpbl.basketball/api/players/77` → fiche joueur (images, stats, équipe, numéro)
- `GET https://api.tpbl.basketball/api/games/stats/players?division_id=656` → stats de tous les joueurs par match
- `GET https://api.tpbl.basketball/api/games/stats/top-players?division_id=656` → leaders

### CBA
- `GET https://portal-server.cbaleague.com/team/rank?ranktype=` → 20 équipes (classement détaillé)
- `GET https://portal-server.cbaleague.com/home/head_team_logo` → logos
- `GET https://portal-server.cbaleague.com/home/home_schedules` → résultats récents
- Rien pour les effectifs / stats (`/team/list`, `/player/…` → 404).

### BCL / FIBA
- Pages `championsleague.basketball/en/standings` : `self.__next_f.push(...)` contient `groups[].teamsStats[]` (rank, gamesWon, gamesLost, points…) et les `gameIds`
- `GET https://fibalivestats.dcd.shared.geniussports.com/data/136223/data.json` → box-score complet (équipes, 12 joueurs par équipe, play-by-play)
- `GET https://www.fiba.basketball/en/events/api/game-live-info/<gameId>/light` → score en direct
- `GET https://digital-api.fiba.basketball/hapi/...` → 401

### B.League
- `GET https://www.bleague.jp/stats/?data_format=json&year=2026&tab=1&target=player-b1&value=AveragePoints&o=desc&e=2&dt=avg&index=0` (en-tête `X-Requested-With: XMLHttpRequest`) → 50 lignes HTML par page (joueur, équipe, moyennes), lien `roster_detail/?PlayerID=`
- `GET https://www.bleague.jp/standings/?data_format=json…` → 403 « 携帯非対応 » (même avec cookies/Referer)
- `club_detail/?TeamID=<id>` → salle (`arena_detail/?ArenaCD=`)

### BAL
- `GET https://bal.nba.com/api/teams` → 12 équipes (photo, réseaux, `teamProfile.roster/schedule/statistics` en HTML)
- `__NEXT_DATA__` de `/standings` → stats d'équipe (`team_key`, `ppg`, `conference`…)
- `/api/standings`, `/api/players`, `/api/stats/*` → 404

### Sources écartées
- `tbf.org.tr` → 403 Cloudflare (`cf-mitigated: challenge`) ; `tbl.org.tr` → injoignable
- TheSportsDB clé 3 → « permanently disabled » ; clé 123 → données de démo
- Proballers pages → 403 Cloudflare
