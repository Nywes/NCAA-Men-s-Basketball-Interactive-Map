# Legends — Player Selection Criteria (reference for AI agents)

This document defines **who qualifies for a team's "Legends" section** in this project (the `oldPlayers` array of each team in `src/teams.json`). It is written to be fed directly into AI/agent prompts so selection is consistent across conferences.

> Scope: this is about **inclusion** (is this player a Legend of this school — yes/no). For **ordering** the ones that qualify, see `documentation/` notes on `legendRank` (blend of fan-vote + expert/all-time consensus). This doc is only about the yes/no gate.

---

## 0. The one-sentence rule

> **A Legend is a player who genuinely mattered — to the sport or to the program. "He reached the NBA" or "he was a high draft pick" is NOT, by itself, a qualification.**

A cup-of-coffee NBA player, or a lottery pick who did nothing at his school and had an unremarkable pro career, is **NOT** a Legend. Draft position measures *potential*, not *achievement*.

---

## 1. A player QUALIFIES if he meets AT LEAST ONE of three pillars

### Pillar A — a genuinely notable NBA career
At least one of:
- **An accolade**: NBA All-Star, All-NBA, NBA champion **as a real contributor** (rotation, not a benchwarmer who got a ring), or a major award (MVP, Finals MVP, Rookie of the Year, Sixth Man, Most Improved, Defensive Player of the Year).
- **Longevity as a real player**: roughly **10+ seasons as a genuine starter/rotation contributor**, or a widely recognized standout/role player (e.g., a famous defender, elite shooter, iconic figure).
- **Hall of Fame** (Naismith).

⚠️ **NOT enough on its own:** "played ~4–8 NBA seasons as a bench/role player with no accolades." That is a *career*, not a *notable* career. Such a player needs Pillar B or C as well.

### Pillar B — a notable professional career (outside the NBA)
- Star or champion in a **top European league or the EuroLeague** (e.g., EuroLeague champion/standout, major domestic-league champion/MVP), or
- **Senior national-team medals** (Olympics / FIBA World Cup / continental championship for a real basketball nation).

### Pillar C — a strong college legacy AT THIS SCHOOL
Any one of:
- **Conference Player of the Year** (at this school).
- **All-time program record-holder** (career points, assists, rebounds, etc.).
- **Consensus All-American** (NCAA Division I).
- **Retired jersey** by the school.
- **Iconic NCAA-tournament moment/run** for the program (e.g., led the school's only/deepest tournament run, a famous upset).
- National college award (Naismith/Wooden POY, Final Four Most Outstanding Player).

---

## 2. A player is DISQUALIFIED (remove) if ALL of these are true

- No genuinely notable NBA career (Pillar A fails), **and**
- No notable pro career (Pillar B fails), **and**
- No strong college legacy at this school (Pillar C fails).

The classic disqualifying profile: **"high draft pick and/or a few NBA seasons, but did nothing standout at his school and never distinguished himself as a pro."**

---

## 3. Edge cases & rules (read carefully)

1. **Count only what the player did AT THIS school.** A transfer who was a bench player here but became a star elsewhere is **not** a Legend here (judge the elsewhere-star at the *other* school). One notable season as a graduate transfer can count if it was genuinely iconic for the program, but be strict.
2. **One-and-done: distinguish the star from the role freshman.**
   - A freshman who was a *star* (conference honors, ~18+ ppg, led a notable run) → has a real college season → can qualify on C (borderline) even if brief.
   - A freshman who was a *role/bench* player (modest minutes, no honors) → **nothing at school**; qualifies only if his NBA/pro career is genuinely notable (Pillar A/B). A high pick alone does not save him.
3. **Draft position is not an achievement.** Being #1–#10 overall does not qualify a player. What he *did* (in college or pro) qualifies him.
4. **Division/level matters for "national" honors.** D-II / NAIA / JUCO national titles, All-American, or Player-of-the-Year awards are real program legacy (Pillar C) but must **not** be recorded as NCAA **Division I** honors in the data (do not put a D-II title into `ncaaChampion`, or a conference-tournament MVP into `tournamentMOP`). For a now-D1 school, a D-II-era program legend (all-time scorer, D-II national champion/POY) still qualifies under C — just don't mislabel the award tier.
5. **Low-major reality.** Small programs may have **zero** NBA players; their Legends are conference POYs, all-time record-holders, retired jerseys, and iconic tournament heroes (Pillar C). That is correct and expected. Do not pad a low-major list with marginal names, and do not demand NBA credentials there.
6. **Recency bias — resist it.** A currently-famous recent player is not automatically a Legend. An unproven rookie or a recent lottery pick with one modest college season and no pro track record does **not** qualify yet.
7. **Quality over quantity.** Better a short, correct list than a padded one. If a school has only 1 genuine Legend, list 1. If it has none, list none.
8. **Verify obscure players; don't invent.** For thin/older/low-major names, check (Wikipedia, Sports-Reference, school HOF, RealGM). If a claim can't be verified, don't assert it. Program-official Hall-of-Fame pages are authoritative for college legacy.

---

## 4. Decision checklist (apply in order)

1. Did he have a **notable NBA career**? (All-Star / All-NBA / champion-contributor / major award / HOF / 10+ yr real starter / famous role player) → **KEEP (A).**
2. Else, did he have a **notable pro career**? (Euro/EuroLeague star or champion, senior national-team medal) → **KEEP (B).**
3. Else, does he have a **strong college legacy at this school**? (conf POY / all-time record / consensus AA / retired jersey / iconic tournament run / national award) → **KEEP (C).**
4. Else → **REMOVE.** (A high draft pick or a handful of unremarkable NBA seasons is not enough.)

If it's a genuine coin-flip after this, mark **borderline** and surface it for a human decision rather than silently including or excluding.

---

## 5. Calibration examples (from this project)

**KEEP:**
| Player (school) | Qualifies via |
|---|---|
| Scottie Pippen (Central Arkansas) | A — HOF, 6× champion, 7× All-Star |
| Artis Gilmore (Jacksonville) | A — HOF; C — led school to 1970 title game |
| Nate McMillan / Tree Rollins | A — 12/18-yr NBA starters, All-Defensive |
| Dell Curry (Virginia Tech) | A — 16-yr NBA, Sixth Man of the Year |
| Charlie Ward (Florida State) | A + C — 11-yr NBA starter; Heisman icon |
| Malcolm Delaney (Virginia Tech) | B + C — EuroLeague/Italian champion; VT all-time scorer |
| Taylor Coppenrath (Vermont) | C — 3× conference POY |
| Jamar Wilson (UAlbany) | C — all-time scorer, retired jersey, 2× conf POY |
| Jairus Lyles (UMBC) | C — led the first-ever 16-over-1 NCAA upset |
| Peter Kiss (Bryant) | C — national D-I scoring title |
| Dennis Smith Jr. (NC State) | C (star one-and-done season) + several NBA years — borderline-keep |
| Sharone Wright (Clemson) | A (All-Rookie) + program star; career cut by injury — borderline-keep |

**REMOVE:**
| Player (school) | Why removed |
|---|---|
| Rayjon Tucker (FGCU) | Bench role at school; ~39 NBA games; nothing notable anywhere |
| Symir Torrence (Binghamton) | 3.3 ppg career backup; no NBA; no pro/college legacy |
| Patrick Williams (Florida State) | #4 pick but bench freshman at FSU; modest, injury-hit NBA; no accolades |
| Bub Carrington (Pittsburgh) | High pick, one unremarkable college year, unproven rookie |
| Lonnie Walker IV (Miami) | One-and-done role freshman; modest NBA rotation, no accolades |
| Chuck Mrazovich (Eastern Kentucky) | 25 NBA games; only "4× all-conference" at a small program |
| Jerome Robinson / Justin Anderson / Sterling Brown | Bench NBA careers; no conference POY / record / retired jersey |

**Borderline kept (close calls a human chose to keep):** Shake Milton (SMU), Jonathan Isaac (FSU) — high picks / multi-season NBA but thin college legacy; kept by user discretion. When in doubt, surface rather than auto-remove.

---

## 6. Data-model notes (so cards render sensibly)

- The `awards` schema only encodes **major national/NBA honors**: NCAA D1 title / Naismith POY / Final Four MOP / consensus All-American, and NBA champion / MVP / Finals MVP / ROY / All-Star (count) / All-NBA (count), plus senior international medals. **Conference POY, all-time-scorer, and retired-jersey are NOT fields** — so many legitimate low-major Legends will have an **empty `awards` object and render as just name + years + "Undrafted."** That is expected; do not remove a Pillar-C legend just because his honors don't fit the schema.
- Preserve existing player `id`s (they key local photos in `src/assets/players/{id}.jpg`). Generate a placeholder id only for a player with no ESPN page.
- `hof` is Naismith Hall of Fame only.

---

## 7. Process (recommended)

1. Per team, an agent proposes candidates with the strict bar above (discover + fill `awards` + order). Tell it explicitly: "reaching the NBA is not enough; count only what he did at THIS school; do not pad."
2. **Audit** the output: flag any candidate whose case rests only on draft pedigree / a modest NBA career with no college legacy — remove those.
3. **Verify** obscure/older names against sources; fix any D-II/NAIA/conference honor mislabeled as an NCAA D1 award.
4. Surface genuine borderline calls to a human instead of deciding silently.
