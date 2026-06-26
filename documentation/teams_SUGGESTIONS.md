# Suggestions & roadmap — Carte NCAA D1

Idées d'amélioration pour le site (carte interactive des joueurs notables).

---

## 1. Nouvelles données par joueur (badges & trophées)

Idée validée : remplacer le simple n° de draft par des **badges** plus parlants.

### Schéma `oldPlayers` proposé (rétro-compatible — on ajoute des champs, on ne casse rien)
```json
{
  "id": "1035",                    // ESPN id (photo/lien)
  "name": "Michael Jordan",
  "years": "1981-1984",
  "position": "SG",               // NEW
  "country": "USA",               // NEW (drapeau)
  "draftPosition": "3",
  "draftYear": "1984",
  "draftTeam": "Chicago Bulls",
  "trophy": ["1982"],             // titres NCAA gagnés AVEC la fac
  "awards": {                      // NEW — données qui grossissent avec le temps
    "schoolHOF": true,            // Hall of Fame de la fac
    "naismithHOF": true,          // Naismith (NBA/basket mondial) HOF
    "allStar": 14,                // nb de sélections All-Star
    "mvp": 5,                     // MVP saison régulière
    "nbaChampion": 6,
    "fibaGold": ["1984","1992"],  // médailles d'or olympiques/FIBA
    "euroleagueTitles": 0
  },
  "wikidataId": "Q41421",          // NEW — clé de mise à jour auto (voir §4)
  "brefId": "jordami01"            // NEW — id Basketball-Reference (optionnel)
}
```

### Affichage : une **rangée d'icônes** sous le nom
- 🏀 = Naismith Hall of Fame · 🎓 = Hall of Fame de la fac
- ⭐×14 = sélections All-Star · 🏆×6 = titres NBA · 👑×5 = MVP
- 🥇 = or olympique/FIBA · 🇪🇺 = titre EuroLeague, etc.
- Au survol d'un badge → tooltip avec le détail (années, etc.).

> Conseil : définis un **set fermé de badges** que tu veux vraiment afficher plutôt que « tous les trophées du monde » — sinon c'est ingérable et la couverture des données est trop inégale. Un bon socle : Naismith HOF, All-Star, MVP, champion NBA, or olympique. Tu en rajoutes au besoin.

---

## 2. Nouvelles données par équipe

```json
{
  "id": "150",
  "name": "Duke Blue Devils",
  "tournament": {                                  // NEW — on stocke TOUT
    "titles":       ["1991","1992","2001","2010","2015"],
    "finalFours":   ["1963","1964","1966","1978","1986","1988","1989","1990","1991","1992","1994","1999","2001","2004","2010","2015","2022"],
    "eliteEights":  ["..."],
    "sweetSixteens":["..."],
    "appearances":  44
  }
}
```

### Affichage : 2-3 meilleures lignes (pas juste la meilleure)
Tu as raison — n'afficher que le titre serait dommage si une fac a 1 titre mais 8 Final Four. On stocke tout, et on affiche les **2 à 3 lignes les plus hautes non vides**, par paliers décroissants :
```
🏆 Champion NCAA : 2 (1991, 1992)
4️⃣ Final Four : 4
8️⃣ Elite Eight : 14
```
- On part du palier le plus prestigieux (Titre) et on descend (Final Four → Elite Eight → Sweet 16 → Participations) en s'arrêtant après 2-3 lignes renseignées.
- Petite fac sans rien de mieux → on tombe direct sur `🎟️ March Madness : 1 (2025)`, ou rien si jamais qualifiée.
- C'est une donnée quasi statique (seuls ~40 programmes ont déjà gagné un titre, +1/an) → **en dur**, mise à jour 1×/an en avril après le tournoi.

---

## 3. Recherche d'un joueur → zoom sur sa fac
Faisable simplement avec ce que tu as déjà (Leaflet + barre de recherche) :
1. Construire un index `nom joueur → équipe` au chargement.
2. Sur sélection : `map.flyTo([lat, lng], 8)` puis ouvrir le popup/modale de l'équipe.
3. Bonus : autocomplétion qui mélange équipes **et** joueurs dans la même liste de résultats.

---

## 4. ⭐ Mise à jour dynamique des trophées (ta question)

**Constat honnête : il n'existe pas d'API unique, gratuite et propre** qui donne « HOF + All-Star + MVP » pour un joueur passé par telle fac. Mais voici le paysage et la meilleure stratégie.

### Les sources possibles
| Source | Donne quoi | Verdict |
|---|---|---|
| **ESPN hidden API** (`site.api.espn.com`) | rosters actuels, standings, infos équipe | ✅ parfait pour roster/standing dynamiques (tu utilises déjà les ESPN id). ❌ ne donne pas les palmarès All-Star/HOF |
| **NBA Stats API** (`stats.nba.com`, endpoint `playerawards`) | All-Star, MVP, All-NBA, champion, HOF | ⚠️ non officielle, headers requis, rate-limit, ne couvre que les joueurs NBA |
| **Basketball-Reference / Sports-Ref** | le plus complet (palmarès, stats college, HOF) | ❌ pas d'API, scraping contre leurs CGU + rate-limit. Données fiables mais à éviter en auto |
| **Wikidata (SPARQL)** | « award received » (P166) : NBA All-Star, MVP, Naismith HOF, médailles FIBA/JO, titres EuroLeague… | ✅ **le meilleur choix** : gratuit, légal, requêtable, structuré, et ça se met à jour tout seul côté Wikidata |

### Stratégie recommandée : **id stable + script de refresh périodique**
Le principe : tu stockes une **clé stable** par joueur (le `wikidataId`, ex. `Q41421` pour Jordan), et un script va chercher les palmarès et **réécrit** les champs `awards` dans le JSON.

- Données **qui grossissent** (All-Star, HOF, titres) → champ dérivé, régénéré par script.
- Données **stables** (years, draft, titres NCAA, la liste des joueurs elle-même) → en dur dans le JSON, jamais touchées par le script.
- Fréquence : **1×/an suffit** (classe HOF annoncée en août, saison NBA finie en juin). Pas besoin de temps réel.

### Concrètement
Je peux t'écrire un script `scripts/refresh-awards.mjs` (Node) qui :
1. lit `teams.json`,
2. pour chaque joueur ayant un `wikidataId`, interroge le SPARQL Wikidata (P166 « award received » + P1344, etc.),
3. mappe vers tes badges (All-Star → `awards.allStar`, Naismith → `awards.naismithHOF`…),
4. réécrit le JSON, en loggant les changements.

Tu le lances à la main une fois par an, ou via une **GitHub Action** programmée (cron annuel) qui commit le JSON mis à jour automatiquement. Le coût d'amorçage = renseigner le `wikidataId` une fois par joueur (et ça aussi je peux t'aider à le faire en masse, comme pour les ESPN id).

> Pour le roster et le classement « live » de chaque saison, c'est l'**API ESPN** qu'il faut taper (et tu as déjà les ESPN id des équipes). C'est un autre script, séparé.

---

## 5. UI / UX de la modale

La modale est trop petite pour les nouvelles infos. Pistes :

- **Passer d'une modale centrée à un panneau latéral** (slide depuis la droite) : beaucoup plus de hauteur, scroll naturel, et la carte reste visible derrière → l'utilisateur garde le contexte géographique.
- **Carte joueur compacte** : photo à gauche, à droite `Nom` + rangée de badges + 1 ligne draft discrète. Le détail (palmarès complet) au survol/clic.
- **Onglets** plutôt que 3 boutons : `Joueurs notables` · `Roster` · `Classement`.
- Garder le style épuré (c'est une bonne base) mais **hiérarchiser** : nom en gros, badges colorés, draft en gris clair secondaire.
- Sur la carte : couleur du marker = conférence, **taille du marker = nb de joueurs NBA produits** (la carte raconte direct les bassins de talent).

### Maquette ASCII d'une carte joueur
```
┌────────────────────────────────────────────┐
│ ┌──────┐  Michael Jordan        🏀 ⭐×14    │
│ │ photo│  SG · 🇺🇸 · 1981-1984   🏆×6 👑×5   │
│ └──────┘  #3 — Chicago Bulls, 1984          │
└────────────────────────────────────────────┘
   (survol d'un badge → "All-Star : 14 sélections")
```

---

## 6. Autres idées (vrac, à piocher)
- **Filtres** : par conférence, par décennie, « facs avec ≥1 Hall of Famer », par franchise NBA de draft.
- **Lien sortant** : badge cliquable → page ESPN/Basketball-Reference du joueur (tu as déjà l'id).
- **Mode « heatmap »** : densité de joueurs NBA par région/État.
- **Compteur global** en coin d'écran : « 364 équipes · 1 248 joueurs notables ».
- **Conférences** : à terme, mettre la conférence comme champ explicite dans le JSON (aujourd'hui c'est trié ailleurs dans le code) — utile pour les filtres et pour fiabiliser le réalignement 2024.

---

## 5 bis. Visuels en réserve (à trancher plus tard)

### « Maillot retiré » — 3 pistes gardées
1. **Bannière au plafond** (reco) — fanion suspendu avec le numéro, aux couleurs de la fac (= image culturelle exacte, les n° retirés sont hissés au plafond).
2. **Maillot stylisé** — petit maillot dessiné aux couleurs de la fac + numéro (plus littéral, un peu plus chargé).
3. **Pastille texte** — `[ 👕 #22 retiré ]`, sobre, s'intègre dans la rangée de badges.
> Les couleurs viennent gratuitement de l'API ESPN (`color` + `alternateColor`).

### Layout de la modale — 3 pistes gardées
- **A. Panneau latéral** (reco) : glisse depuis la droite, beaucoup de hauteur + scroll, carte visible derrière.
- **B. Grille de cartes** : modale large, joueurs en grille 2-3 colonnes, vue d'ensemble immédiate.
- **C. Liste accordéon** : replié = nom + badges sur 1 ligne ; déplier = palmarès complet. Très dense.

Décision : **en attente** (ni maillot ni layout tranchés au 2026-06-26).

## 7. URLs / endpoints ESPN utiles (testés)

| Besoin | URL | Note |
|---|---|---|
| Photo joueur (id **NBA**) | `https://a.espncdn.com/i/headshots/nba/players/full/{id}.png` | ✅ ; 404 si très vieux joueur sans photo (ex. Jordan) |
| Photo joueur (id **college**) | `https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/{id}.png` | ✅ |
| Logo de fac | `https://a.espncdn.com/i/teamlogos/ncaa/500/{teamId}.png` | ✅ (le `{teamId}` = l'`id` de ta fac) |
| Infos + couleurs + roster fac | `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams/{teamId}` | JSON : `color`, `alternateColor`, logos, venue, record |
| Bio joueur (poste, pays…) | `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/athletes/{id}` | poste, taille, `birthPlace` (→ drapeau), n° |

> ⚠️ Tes id sont des **id NBA** (confirmé : Curry `3975` renvoie bien sa photo). C'est OK. Seuls les joueurs jamais passés en NBA n'en ont pas → photo via id college, ou pas de photo.

## 8. Amorçage des `wikidataId` (le matching) — oui, je peux le faire

Méthode automatique, par joueur déjà saisi :
1. Requête `wbsearchentities` (API Wikidata) sur le **nom**.
2. Pour chaque candidat, on vérifie 2 propriétés pour **désambiguïser** les homonymes :
   - `P106` (occupation) contient « basketball player », **et/ou**
   - `P69` (educated at) ou `P641`(sport) cohérents, idéalement croisés avec **la fac** et **l'année de draft** déjà dans ton JSON.
3. On garde le meilleur match + un **score de confiance**. Les cas douteux (homonymes, pas de fiche) sont **listés à part** pour relecture, pas écrits aveuglément.
4. Sortie : un CSV `nom, équipe, wikidataId, confiance` que je réinjecte dans `teams.json`.

→ Couverture attendue : ~quasi 100 % des joueurs NBA notables, partielle pour les obscurs (mais eux n'ont pas de palmarès à afficher de toute façon).
→ **Je peux lancer ça** sur les ~420 joueurs nommés actuels. Proposition : un **lot pilote** (une conf' déjà remplie) pour te montrer le taux de bon match, puis on déroule.

## 9. Autres infos de fac à afficher (en plus de Nom / Logo / Secondary / Colors)

Aujourd'hui tu as 3 boutons (Roster, Standing, Notable Players). Idées à ajouter (✅ = dispo via API ESPN, ✋ = à mettre en dur) :

- ✅ **Salle + capacité** (venue) et **ville/État**.
- ✅ **Bilan saison en cours + ranking AP** (« 24-6, #8 AP »).
- ✅ **Entraîneur actuel**.
- ✅ **Conférence** (avec logo) — utile aussi pour les filtres.
- ✋ **Palmarès tournoi** (les 2-3 lignes du §2) — la donnée la plus « waouh ».
- ✋ **Nb de joueurs NBA produits** (compteur calculé depuis ton propre JSON) — super stat identitaire.
- ✋ **Numéros retirés** (liste) — lien direct avec le badge maillot.
- ✋ **Rivalités** (ex. Duke–UNC) — fun, très « culture NCAA ».
- ✅/✋ **Lien sortant** vers la page ESPN officielle de la fac.
- 🟡 **Fun fact** / année de fondation du programme.

> Reco priorité : Palmarès tournoi > Nb de joueurs NBA produits > Bilan/ranking saison > Salle/ville. Les 4 premiers transforment la modale d'« annuaire » en « fiche identité » de la fac.

## Ordre d'attaque conseillé
1. Corriger les bugs (`teams_ERREURS.md`).
2. Finir de remplir les `oldPlayers` (par conférence, avec mon aide).
3. Ajouter `ncaaTitles` par équipe (petite liste statique).
4. Ajouter les champs `position`/`country` + la rangée de badges (refonte modale).
5. Brancher la mise à jour auto des palmarès (Wikidata + script annuel).
6. Recherche joueur → zoom, puis filtres.
