# Rapport d'erreurs — teams.json

> ✅ **Toutes les erreurs listées ici ont été corrigées dans `src/teams.json` le 2026-06-26.**
> Le détail est conservé ci-dessous comme journal. Quand de nouvelles erreurs sont repérées, les ajouter en haut ; une fois corrigées, les déplacer dans le journal.

---

## Journal des corrections — 2026-06-26

- **Duke — Zion Williamson / Brandon Ingram** : données `years`/`draft*` ré-échangées ; `trophy:["2016"]` retiré de Zion (Duke n'a pas gagné en 2016).
- **Duke — Johnny Dawkins** : `trophy:["1986"]` retiré (Duke a perdu la finale 1986 ; 1er titre = 1991).
- **`draftPosition`/`draftYear` inversés** : Dell Curry (Virginia Tech), Jeff Teague & Muggsy Bogues (Wake Forest) remis dans l'ordre.
- **`years` malformés** : Trevor Booker `2006-1010`→`2006-2010` ; Brevin Knight `11993-1997`→`1993-1997` ; Darvin Ham `193-1996`→`1993-1996`.
- **Noms corrigés** : équipe `3B` (id 24) → **Stanford Cardinal** ; `Florida States Seminoles` → **Florida State Seminoles** ; `Ralph Samson` → **Ralph Sampson** ; `Cedric Maxell` → **Cedric Maxwell**.
- **`draftPosition: "as territorial pick"`** : remplacé par `draftPosition:""` + `territorialPick:true` pour Guy Rodgers, Tom Gola, Wilt Chamberlain, Paul Arizin, Jerry Lucas, Gail Goodrich.
- **Tirets longs `–`** : 59 champs `years` uniformisés en `-`.

---

## Reste à faire (hors « erreurs »)

Ces facs ne sont pas buggées, juste **à remplir** (voir `teams_CRITERES.md` / `teams_SUGGESTIONS.md`) :

- **225 facs** ont un `oldPlayers` réduit à un objet placeholder vide → à compléter (placeholder conservé, ce n'est pas une erreur).
- **27 facs** n'ont aucune clé `oldPlayers`.
- Gros manques : toute la SEC, l'Ivy League, le MAC, le SWAC, la Mountain West, Gonzaga, etc.

> Note : certains joueurs sans fiche ESPN ont un **id « maison » volontaire** (ex. Len Bias, Artis Gilmore `5008.2`…). Ce n'est **pas une erreur**, ne pas les vider.
