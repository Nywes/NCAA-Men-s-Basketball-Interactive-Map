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

## 🔧 Cas ponctuels (pas annuels, mais à surveiller)
- **Réalignement de conférences** (ex. effondrement Pac-12) → champ `conference` (badge) des équipes concernées, dans les **deux** fichiers.
- **Renommage / rebranding** d'une fac (ex. George Washington → Revolutionaries, IUPUI → IU Indianapolis) → champ `name`.
- **Nouvelles équipes D1 / passages en D2** → ajout/retrait d'équipe (rappel : The Citadel & VMI n'ont **pas** d'équipe féminine).

---

## ✅ Checklist express « après March Madness »
1. [ ] Palmarès hommes (`teams.json`) : champion, F4, E8, S16, appearances++
2. [ ] Palmarès femmes (`teams-women.json`) : idem
3. [ ] POY national / consensus AA / F4 MOP → nouvelles légendes éventuelles
4. [ ] (plus tard) titres + récompenses NBA/WNBA, All-Star, HOF, médailles internationales
5. [ ] `npm run build` OK → `git push` sur `main`
