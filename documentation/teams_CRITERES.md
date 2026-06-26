# Critères de sélection des joueurs notables — pour un script de pré-sélection

But : à partir de **tous** les anciens d'une fac, faire remonter automatiquement les joueurs « notables » + un score pour trier/capper. Conçu pour être implémentable.

## Sources de données exploitables par un script
- **Basketball-Reference / Sports-Reference** : stats college + NBA, draft, awards, All-American, conference POY, records de fac.
- **Wikidata (P166 « award received », P39, etc.)** : All-Star, MVP, HOF, médailles JO/FIBA, titres EuroLeague.
- **API NBA (`playerawards`)** : palmarès NBA structuré.
> Beaucoup de ces signaux sont **lisibles par machine** (✅). Quelques-uns demandent du **jugement** (✋).

---

## Principe central : un seuil **relatif à la fac**, pas de règle absolue

⚠️ Le piège serait de poser des règles « auto-inclus » universelles (« a joué en NBA » → dedans). Sur une grosse fac ça donne 100+ joueurs ; sur une petite ça ne déclenche jamais. **On ne fait pas ça.**

À la place : on calcule un **score de notoriété** (plus bas) pour **tous** les anciens, on les classe, et le **seuil d'inclusion flotte selon le niveau de la fac**.
- **Grosse fac (Duke…)** : seuil **haut** → beaucoup de joueurs notables, et **c'est normal et voulu**. « A joué en NBA » ou « 1er tour » n'y est que le minimum syndical, pas un ticket d'entrée.
- **Petite fac** : seuil **bas** → on garde le(s) meilleur(s) **même avec un CV modeste**, *à condition* qu'il ait laissé une vraie trace (un minimum connu : grand parcours en tournoi, record de fac, carrière pro à l'étranger…).
- **Garde-fou petite fac** : si même le meilleur joueur de la fac **n'a vraiment rien fait**, on n'en met **aucun**. Mieux vaut une fac vide qu'un joueur bidon.

→ Donc les « signaux » ci-dessous **nourrissent le score**, ils ne sont pas des inclusions automatiques. C'est leur **poids relatif aux autres anciens de la même fac** qui décide.

### Signaux qui pèsent lourd (score élevé)
- Carrière NBA réelle (longévité, matchs joués), **All-Star**, MVP/DPOY, **champion NBA**, **HOF**.
- **Haut pick** de draft (1er tour, surtout loterie), **encore plus** s'il est jeune et **encore actif** (« on le voit jouer maintenant »).
- **National POY** (Naismith/Wooden), **Consensus All-American**, **NCAA Tournament MOP**, membre clé d'un **titre / Final Four**.
- **Médaille JO / Mondial FIBA**, **titre ou MVP d'EuroLeague**.

### Signaux moyens (font la différence sur les petites/moyennes facs)
- **Conference Player of the Year**, 1re équipe All-Conference.
- **Record majeur de la fac** (meilleur marqueur all-time, etc.), **maillot retiré**.
- **Grand parcours en tournoi NCAA** porté par le joueur (même sans NBA derrière).
- Carrière pro de **haut niveau à l'étranger** (EuroLeague, ou star d'une ligue nationale).

### Signaux faibles / à exclure
- Jamais arrivé au pro **et** aucune distinction college **et** aucun record de fac → score quasi nul.
- « Cup of coffee » NBA sans rien d'autre → en bas de tableau ; coupé sur une grosse fac, potentiellement gardé sur une toute petite s'il n'y a personne d'autre.

---

## Cap par taille de fac (sinon les blue-bloods débordent)
| Type de fac | Barre | Cap conseillé |
|---|---|---|
| Blue-bloods (Duke, UNC, Kentucky, Kansas, UCLA…) | All-Star / pick loterie / titre national / starter NBA pluriannuel | ~8-12 |
| Moyennes / mid-majors | 1er tour, Conference POY, légende de fac | ~5 |
| Petites / low-majors | tout joueur NBA, ou top 1-2 légendes même obscures | ~3 |

---

## Score de notoriété (pour classer et capper) ✅
Idée de pondération (à ajuster) — le script calcule un score, trie, garde le top selon le cap :
- **NBA** : HOF (+100), MVP (+40/sél.), All-Star (+15/sél.), champion (+10/titre), Finals MVP (+20), titulaire pluriannuel/longévité (+1/saison), slot de draft (+ (61 − pick)/3).
- **College** : National POY (+50), Consensus AA 1re (+30) / 2e (+18), NCAA MOP (+25), Conference POY (+15), record all-time de la fac (+15), maillot retiré (+12).
- **International** : médaille JO (+30 or / +20 argent / +15 bronze), EuroLeague titre (+12) / MVP (+18).
- **Bonus « actuel »** : drafté ≤ 5 ans **et** encore actif (+15) → garde les jeunes hauts picks visibles.

→ Tri décroissant, on coupe au cap. Les ex æquo / cas TIER 3 passent en revue manuelle.

---

## Exemple appliqué : George Mason Patriots (petite fac)

Cas concret où tu n'avais rien trouvé. George Mason n'a quasiment **aucun joueur NBA** (3 en 45 ans : Rob Rose, Ricky Wilson, Jason Miskiri — anecdotiques). Une règle « NBA = notable » ne sort donc presque personne.

Mais la fac a un **fait d'armes énorme** : le **Final Four 2006** en tant que **11e seed** (Cinderella, victoire sur UConn #1 en Elite Eight — un des plus gros exploits mid-major de l'histoire).

### Règle « équipe historique → le(s) joueur(s) emblématique(s) »
On ne met **pas tout le cinq** (les joueurs ne sont pas notables individuellement), mais **1, parfois 2-3** joueurs qui incarnent le run historique — **ça dépend de l'équipe** : un run très marquant ou une fac un peu plus cotée peut justifier 2-3 noms, une toute petite fac souvent 1 seul. Jugement au cas par cas (et l'utilisateur repasse derrière). Pour George Mason, le(s) visage(s) de l'équipe 2006 :
- **Jai Lewis** (pivot, figure du run) — choix par défaut, OU
- **Will Thomas** (recordman de rebonds du programme), OU
- **Gabe Norwood** (celui avec la plus grosse carrière pro ensuite — star en PBA aux Philippines).

→ Résultat : **1 joueur**, zéro NBA, mais légitime via un parcours en tournoi mythique. Principe généralisable : pour toute équipe historique d'une petite fac, on retient **le joueur emblématique**, pas le roster entier. *(À confirmer en passe agent — données issues d'une recherche rapide.)*

## Notes
- **Pas de badge « légende de fac »** (trop vague, pas de critère net) ni **MIP** (pas assez prestigieux). Mais « top-3 marqueur all-time » et « Conference POY » restent des **critères de sélection** (pour décider qui afficher), pas des badges.
- Le « meilleur marqueur all-time » est **volatil** (surtout petites facs) → bon comme critère, **mauvais comme valeur figée affichée**. Si jamais affiché un jour, le faire via script de refresh, pas en dur.
