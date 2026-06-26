# Dossier badges — manifeste

Assets des badges de palmarès. Objectif : 1 fichier par type de distinction, à brancher dans le front via le mapping ci-dessous. Transférable tel quel sur l'autre ordi.

## Déjà présent
| Fichier | Type | Source |
|---|---|---|
| `hof.png` | Naismith HOF | logo officiel (Wikimedia) — réel |
| `medal-gold.svg` / `-silver.svg` / `-bronze.svg` | Médaille JO (or/argent/bronze) | **SVG maison** — anneaux à la **géométrie officielle CIO** (diamètre = 12× l'épaisseur, écart entre anneaux = 1 épaisseur, décalage rangées 6×) et **couleurs officielles des médailles** : or `#9F8F5E`, argent `#969696`, bronze `#996B4F`. Pas de souci de licence. |

> Pas de logo NBA générique ni de coupe placeholder : on préfère **rien** (ou un badge texte) plutôt qu'un visuel par défaut peu signifiant.

## À ajouter (TODO) — vrais logos / trophées
Récupérer depuis la page Wikipédia de chaque trophée (les URLs directes Wikimedia cassent, donc passer par la page, télécharger le fichier, le déposer ici en taille normalisée) :

| Fichier cible | Badge | Où le prendre |
|---|---|---|
| `champ-nba.png` | Champion NBA | trophée **Larry O'Brien** (page "NBA Finals") |
| `champ-ncaa.png` | Champion NCAA | logo **NCAA / March Madness** ou trophée NCAA |
| `euroleague.png` | EuroLeague | page "EuroLeague" |
| `fiba.png` | FIBA World Cup | logo **FIBA** |
| `mvp.png` | MVP | trophée **Michael Jordan** |
| `finals-mvp.png` | Finals MVP | trophée **Bill Russell** |
| `dpoy.png` | DPOY | trophée **Hakeem Olajuwon** |
| `roty.png` | ROTY | trophée **Eddie Gottlieb** |
| `naismith-poy.png` | Naismith College POY | trophée Naismith (college) |

## Badges SANS logo → texte seul (pas de fichier image)
Rendus par un chip texte (cf. `teams_BADGES_preview.html`, style A sans glyphe) :
- All-NBA Team · Consensus All-American · NCAA Tournament MOP · National scoring leader
- **Maillot retiré** : généré dynamiquement (mini-maillot aux couleurs de la fac + n°), pas un fichier fixe.

## Mapping `awardKey → asset` (proposé)
```
naismithHOF        -> hof.png
nbaChampion        -> champ-nba.png        (TODO)
ncaaChampion       -> champ-ncaa.png       (TODO)
olympicGold        -> medal-gold.svg
olympicSilver      -> medal-silver.svg
olympicBronze      -> medal-bronze.svg
fibaWorldCup       -> fiba.png             (TODO)
euroleague         -> euroleague.png       (TODO)
euroleagueMvp      -> euroleague.png + "MVP"(TODO)
mvp                -> mvp.png              (TODO)
finalsMvp          -> finals-mvp.png       (TODO)
dpoy               -> dpoy.png             (TODO)
roty               -> roty.png             (TODO)
allStar            -> texte "All-Star ×N"
allNba             -> texte "All-NBA"
naismithCollegePoy -> naismith-poy.png     (TODO)
ncaaMop            -> texte "NCAA MOP"
consensusAA1       -> texte "All-American"
nationalScoringLeader -> texte "Top scorer"
retiredJersey      -> maillot dynamique (couleurs fac + n°)
```

## Format conseillé
- **SVG** quand possible (net à toute taille), sinon **PNG transparent** normalisé à **96×96** (affiché ~16-24px).
- Garde un padding homogène pour que tous les badges aient l'air de la même famille.

## Licence
Logos NBA/NCAA/HOF/FIBA = **marques déposées + copyright**. Usage **perso non commercial** = généralement toléré, mais ce ne sont pas des assets libres. Les médailles et la coupe ici sont **maison** (réutilisables sans contrainte). Voir la note légale dans la discussion.
