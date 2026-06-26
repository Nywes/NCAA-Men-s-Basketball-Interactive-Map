# Badges avec vrais logos — faisabilité

Tu préfères de **vrais logos de trophées** plutôt que les badges SVG maison. C'est faisable, mais avec une vérité à connaître : **tous les trophées n'ont pas de logo propre.** Certains n'existent qu'en **photo du trophée physique**, d'autres n'ont **rien**.

## État réel par badge (sur ta sélection de 19)

| Badge | Logo propre ? | Quoi utiliser |
|---|---|---|
| **Naismith HOF** | ✅ oui | Logo officiel HOF (celui que tu as donné, testé 200) |
| **Champion NBA** | ✅ oui | Trophée **Larry O'Brien** (image nette dispo) |
| **Champion NCAA** | ✅ oui | Logo **NCAA March Madness** ou trophée NCAA |
| **Médaille JO** | ✅ oui | **Anneaux olympiques** (iconique, libre-ish) |
| **EuroLeague** | ✅ oui | Logo EuroLeague |
| **FIBA World Cup** | ✅ oui | Logo **FIBA** / trophée Naismith FIBA |
| **All-Star** | 🟡 partiel | Pas de logo intemporel (change chaque année) → logo **NBA** générique, ou une étoile |
| **MVP** | 🟡 photo | Trophée **Michael Jordan** (photo, pas un logo plat) |
| **Finals MVP** | 🟡 photo | Trophée **Bill Russell** (photo) |
| **DPOY** | 🟡 photo | Trophée **Hakeem Olajuwon** (photo) |
| **ROTY** | 🟡 photo | Trophée **Eddie Gottlieb** (photo) |
| **Naismith College POY** | 🟡 oui-ish | Trophée Naismith (college) |
| **Champion EuroLeague MVP** | 🟡 partiel | Logo EuroLeague + mention MVP |
| **All-NBA Team** | ❌ non | Aucun logo → badge maison / logo NBA |
| **NCAA Tournament MOP** | ❌ non | Aucun logo dédié → badge maison |
| **Consensus All-American** | ❌ non | Aucun logo unique (AP/NABC/USBWA…) → badge maison |
| **National scoring leader** | ❌ non | Aucun logo → badge maison |
| **Maillot retiré (fac)** | ❌ non | Par nature propre à chaque fac → mini-maillot aux couleurs + n° |

**Bilan : ~6 logos nets, ~6 photos de trophées, ~5 sans rien.** → un **hybride est inévitable**.

## Reco
1. **Vrais logos** pour les prestigieux qui en ont un (HOF, Champion NBA/NCAA, JO, EuroLeague, FIBA) — ce sont justement ceux qui claquent le plus.
2. **Photo de trophée** pour les awards NBA nommés (MVP, Finals MVP, DPOY, ROTY).
3. **Badge maison** (style A/B/C du preview) en **fallback** pour les sans-logo + le maillot retiré.

## Pièges techniques
- **Les URLs directes Wikimedia sont fragiles** (nom de fichier exact qui casse — vu en test : HOF ✅, NBA ✅, mais 2 autres en 404). → ne pas hardcoder des URLs hotlinkées.
- **Tailles/formats hétérogènes** (PNG de tailles random, fonds transparents ou non) → à **normaliser**.
- **Licence** : ces logos sont **sous copyright**. Pour un projet **perso non commercial sur GitHub**, c'est généralement toléré, mais à savoir (pas d'usage commercial).

## Ce que je peux faire pour toi
Plutôt qu'une liste d'URLs qui casseront, je peux **assembler un dossier `/badges`** :
- trouver le bon fichier pour chaque badge,
- **normaliser** tout à une taille/format unique (ex. PNG 48×48 transparent, ou SVG),
- te livrer le dossier + un **mapping** `awardKey → /badges/xxx.png` prêt à brancher dans le front.

→ Dis-moi si tu veux que je monte ce dossier (et en quel format/taille tu le veux).
