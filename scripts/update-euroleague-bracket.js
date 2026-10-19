#!/usr/bin/env node
/**
 * Arbres Playoffs + Final Four EuroLeague, TOUTES les saisons depuis 2004-05
 * (api-live.euroleague.net, gratuite, sans clé) -> src/euroleague-bracket.json
 *   { current: 'E2026', updated, seasons: { E2026: {...}, E2025: {...}, ... } }
 *
 * La saison en cours est détectée automatiquement (euroleague-common.js). Tant
 * qu'elle n'a pas de playoffs, son entrée porte `upcoming` (lieu/dates du Final
 * Four, table UPCOMING_FINAL_FOUR à compléter à la main chaque été).
 * Les saisons sans arbre complet (ex. 2019-20 annulée) sont ignorées.
 *
 * Usage : node scripts/update-euroleague-bracket.js
 */
const fs = require('fs');
const path = require('path');
const { BASE, COMPETITION, get, resolveSeason, FINAL_FOUR_CITIES, UPCOMING_FINAL_FOUR } = require('./euroleague-common');

const TEAMS_PATH = path.join(__dirname, '..', 'src', 'euroleague-teams.json');
const OUT_PATH = path.join(__dirname, '..', 'src', 'euroleague-bracket.json');
const FIRST_YEAR = 2004; // playoffs en 4 séries + Final Four disponibles dans l'API depuis 2004-05

// "PLAYOFF A", "A", "Quarterfinal 3" (2004-05) -> lettre A..D
const DIGIT_LETTER = { 1: 'A', 2: 'B', 3: 'C', 4: 'D' };
function groupLetter(group) {
  const raw = (group.rawName || group.name || '').trim();
  const m = raw.match(/([A-D])$/i) || raw.match(/([1-4])$/);
  if (!m) return raw;
  return DIGIT_LETTER[m[1]] || m[1].toUpperCase();
}
const venueName = (v) => ((typeof v === 'string' ? v : v && v.name) || '').trim() || null;
const venueCapacity = (v) => (v && typeof v === 'object' && v.capacity) || null;

function clubRef(club, byCode) {
  const team = byCode[club.code];
  return {
    code: club.code,
    name: team ? team.shortDisplayName || team.displayName : club.abbreviatedName || club.name,
    logo: team ? team.logo : (club.images && club.images.crest) || null,
  };
}

function buildSeason(seasonCode, seasonLabel, poGames, ffGames, byCode) {
  // ── Playoffs (séries au meilleur des 3/5 selon l'époque) ──
  const poByGroup = {};
  for (const g of poGames.filter((g) => g.played)) {
    const letter = groupLetter(g.group);
    (poByGroup[letter] = poByGroup[letter] || []).push(g);
  }
  const playoffs = Object.keys(poByGroup)
    .sort()
    .map((letter) => {
      const games = poByGroup[letter].sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
      const first = games[0];
      const codeA = first.local.club.code;
      const codeB = first.road.club.code;
      let winsA = 0;
      let winsB = 0;
      for (const g of games) {
        if (g.local.club.code === codeA) g.local.score > g.road.score ? winsA++ : winsB++;
        else g.local.score > g.road.score ? winsB++ : winsA++;
      }
      const winnerCode = winsA > winsB ? codeA : codeB;
      const loserCode = winnerCode === codeA ? codeB : codeA;
      const winnerClub = (winnerCode === codeA ? first.local : first.road).club;
      const loserClub = (loserCode === codeA ? first.local : first.road).club;
      const dots = games.map((g) => {
        const winnerIsLocal = g.local.club.code === winnerCode;
        const winnerScore = winnerIsLocal ? g.local.score : g.road.score;
        const loserScore = winnerIsLocal ? g.road.score : g.local.score;
        return winnerScore > loserScore ? 'w' : 'l';
      });
      return {
        code: letter,
        label: `Playoff ${letter}`,
        winner: { ...clubRef(winnerClub, byCode), wins: Math.max(winsA, winsB) },
        loser: { ...clubRef(loserClub, byCode), wins: Math.min(winsA, winsB) },
        dots,
      };
    });

  // ── Final Four (demies + finale, match unique ; le match pour la 3e place est ignoré) ──
  const played = ffGames.filter((g) => g.played);
  const nameOf = (g) => g.group.rawName || g.group.name || '';
  const semiGames = played.filter((g) => /SEMIFINAL/i.test(nameOf(g)));
  const finalGame = played.find((g) => /CHAMPIONSHIP|FINAL\s*$/i.test(nameOf(g)) && !/SEMI|THIRD|3RD/i.test(nameOf(g)));

  function gameToResult(g, letter) {
    const winnerIsLocal = g.local.score > g.road.score;
    const winner = winnerIsLocal ? g.local : g.road;
    const loser = winnerIsLocal ? g.road : g.local;
    return {
      code: letter,
      label: letter ? `Semifinal ${letter}` : 'Final',
      winner: { ...clubRef(winner.club, byCode), score: winner.score },
      loser: { ...clubRef(loser.club, byCode), score: loser.score },
      date: g.utcDate,
    };
  }

  const semifinals = semiGames
    .sort((a, b) => groupLetter(a.group).localeCompare(groupLetter(b.group)))
    .map((g) => gameToResult(g, groupLetter(g.group)));

  // associe chaque demie à ses deux séries de playoffs
  for (const semi of semifinals) {
    semi.feeders = playoffs
      .filter((p) => p.winner.code === semi.winner.code || p.winner.code === semi.loser.code)
      .map((p) => p.code);
  }
  if (semifinals.length === 2) {
    const usedByA = new Set(semifinals[0].feeders);
    if (usedByA.size < 2) {
      semifinals[0].feeders = playoffs.filter((p) => !semifinals[1].feeders.includes(p.code)).map((p) => p.code);
    }
  }

  const final = finalGame ? gameToResult(finalGame, null) : null;
  const venueGame = finalGame || semiGames[0];
  const vName = venueGame ? venueName(venueGame.venue) : null;
  const sortedSemis = semiGames.slice().sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
  const finalFour = venueGame
    ? {
        venue: vName,
        city: (vName && FINAL_FOUR_CITIES[vName.toUpperCase()]) || null,
        capacity: venueCapacity(venueGame.venue),
        dateStart: sortedSemis[0] ? sortedSemis[0].utcDate : null,
        dateEnd: finalGame ? finalGame.utcDate : null,
      }
    : null;

  return { season: seasonCode, seasonLabel, playoffs, semifinals, final, finalFour };
}

(async () => {
  const teams = JSON.parse(fs.readFileSync(TEAMS_PATH, 'utf8'));
  const byCode = Object.fromEntries(teams.map((t) => [t.id, t]));
  const current = await resolveSeason();
  console.log(`Saison en cours : ${current.code} (${current.alias})`);

  // L'API limite le débit sur les rafales : pause entre appels + 3 tentatives.
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function games(code, phase) {
    for (let k = 1; k <= 3; k++) {
      try {
        const res = await get(`${BASE}/v2/competitions/${COMPETITION}/seasons/${code}/games?phaseTypeCode=${phase}`);
        await sleep(400);
        return res.data || [];
      } catch (e) {
        if (k === 3) throw e;
        await sleep(2000 * k);
      }
    }
    return [];
  }

  const seasons = {};
  for (const s of current.seasons.filter((s) => s.year >= FIRST_YEAR && s.year <= current.year)) {
    const built = buildSeason(s.code, s.alias, await games(s.code, 'PO'), await games(s.code, 'FF'), byCode);
    const complete = built.playoffs.length === 4 && built.semifinals.length === 2 && built.final;
    if (complete) {
      seasons[s.code] = built;
      const missingCity = built.finalFour && built.finalFour.venue && !built.finalFour.city;
      console.log(`  ${s.alias}: ${built.final.winner.name} bat ${built.final.loser.name} — ${built.finalFour.venue}${missingCity ? '  ⚠ ville inconnue (compléter FINAL_FOUR_CITIES)' : ` (${built.finalFour.city})`}`);
    } else if (s.code === current.code) {
      seasons[s.code] = { ...built, upcoming: UPCOMING_FINAL_FOUR[s.code] || null };
      console.log(`  ${s.alias}: playoffs pas encore joués${UPCOMING_FINAL_FOUR[s.code] ? ` — Final Four annoncé : ${UPCOMING_FINAL_FOUR[s.code].venue}, ${UPCOMING_FINAL_FOUR[s.code].city} (${UPCOMING_FINAL_FOUR[s.code].dates})` : '  ⚠ UPCOMING_FINAL_FOUR à renseigner'}`);
    } else {
      console.log(`  ${s.alias}: arbre incomplet (${built.playoffs.length} séries, ${built.semifinals.length} demies${built.final ? ', finale' : ''}) — ignorée`);
    }
    await new Promise((r) => setTimeout(r, 120));
  }

  const out = { current: current.code, updated: new Date().toISOString(), seasons };
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(`OK -> ${OUT_PATH} (${Object.keys(seasons).length} saisons)`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
