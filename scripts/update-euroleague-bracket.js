#!/usr/bin/env node
/**
 * Construit l'arbre Playoffs + Final Four EuroLeague depuis l'API officielle
 * (api-live.euroleague.net, gratuite, sans clé) -> src/euroleague-bracket.json
 *
 * Usage : node scripts/update-euroleague-bracket.js
 * SEASON_CODE à incrémenter chaque été (E2025 -> E2026...).
 */
const fs = require('fs');
const path = require('path');

const BASE = 'https://api-live.euroleague.net';
const COMPETITION = 'E';
const SEASON_CODE = 'E2025';
const UA = 'Mozilla/5.0 (compatible; ncaa-basket-map/1.0)';

const TEAMS_PATH = path.join(__dirname, '..', 'src', 'euroleague-teams.json');
const OUT_PATH = path.join(__dirname, '..', 'src', 'euroleague-bracket.json');

async function get(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

function groupLetter(group) {
  const raw = (group.rawName || group.name || '').trim();
  const m = raw.match(/([A-Z])\s*$/);
  return m ? m[1] : raw;
}

function clubRef(club, byCode) {
  const team = byCode[club.code];
  return {
    code: club.code,
    name: team ? team.shortDisplayName || team.displayName : club.abbreviatedName,
    logo: team ? team.logo : club.images?.crest || null,
  };
}

(async () => {
  const teams = JSON.parse(fs.readFileSync(TEAMS_PATH, 'utf8'));
  const byCode = Object.fromEntries(teams.map((t) => [t.id, t]));

  // ── Playoffs (best-of-5 par groupe) ──
  const { data: poGames } = await get(
    `${BASE}/v2/competitions/${COMPETITION}/seasons/${SEASON_CODE}/games?phaseTypeCode=PO`
  );
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

  // ── Final Four (demies + finale, match unique) ──
  const { data: ffGames } = await get(
    `${BASE}/v2/competitions/${COMPETITION}/seasons/${SEASON_CODE}/games?phaseTypeCode=FF`
  );
  const played = ffGames.filter((g) => g.played);
  const semiGames = played.filter((g) => /SEMIFINAL/i.test(g.group.rawName || g.group.name || ''));
  const finalGame = played.find((g) => /CHAMPIONSHIP/i.test(g.group.rawName || g.group.name || ''));

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

  // associe chaque demie à ses deux séries de playoffs (peu importe le seeding réel)
  for (const semi of semifinals) {
    semi.feeders = playoffs
      .filter((p) => p.winner.code === semi.winner.code || p.winner.code === semi.loser.code)
      .map((p) => p.code);
  }
  // playoffs non référencés par la demie A vont à la demie B (fallback si feeders incomplet)
  if (semifinals.length === 2) {
    const usedByA = new Set(semifinals[0].feeders);
    if (usedByA.size < 2) {
      semifinals[0].feeders = playoffs.filter((p) => !semifinals[1].feeders.includes(p.code)).map((p) => p.code);
    }
  }

  const final = finalGame ? gameToResult(finalGame, null) : null;

  const venueGame = finalGame || semiGames[0];
  const finalFour = venueGame
    ? {
        venueName: venueGame.local.club ? venueGame.venue?.name || null : null,
        venue: venueGame.venue?.name || null,
        city: venueGame.venue?.address?.city || null,
        capacity: venueGame.venue?.capacity || null,
        dateStart: semiGames[0] ? semiGames.sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate))[0].utcDate : null,
        dateEnd: finalGame ? finalGame.utcDate : null,
      }
    : null;

  const out = {
    season: SEASON_CODE,
    seasonLabel: '2025-26',
    updated: new Date().toISOString(),
    playoffs,
    semifinals,
    final,
    finalFour,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(`OK -> ${OUT_PATH}`);
  console.log(`  Playoffs: ${playoffs.map((p) => `${p.label} ${p.winner.code} ${p.winner.wins}-${p.loser.wins} ${p.loser.code}`).join(' | ')}`);
  console.log(`  Semis: ${semifinals.map((s) => `${s.label} ${s.winner.code} ${s.winner.score}-${s.loser.score} ${s.loser.code} (feeders: ${s.feeders})`).join(' | ')}`);
  if (final) console.log(`  Final: ${final.winner.code} ${final.winner.score}-${final.loser.score} ${final.loser.code}`);
  if (finalFour) console.log(`  Venue: ${finalFour.venue}, ${finalFour.city}, cap ${finalFour.capacity}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
