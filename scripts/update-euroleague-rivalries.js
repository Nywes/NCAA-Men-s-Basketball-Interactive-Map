#!/usr/bin/env node
/**
 * Calcule le head-to-head historique des grandes rivalités EuroLeague, à
 * partir des résultats réels de matchs (API officielle, gratuite).
 *
 * Les paires sont curées à la main (rivalités réellement établies et connues
 * des amateurs de basket — pas de rivalité inventée pour les clubs qui n'en
 * ont pas). Le bilan est agrégé sur plusieurs saisons en cumulant les matchs
 * joués entre les deux clubs (saison régulière + playoffs + Final Four).
 *
 * Usage : node scripts/update-euroleague-rivalries.js
 */
const fs = require('fs');
const path = require('path');

const { BASE, COMPETITION, get: apiGet, resolveSeason } = require('./euroleague-common');

// Saisons agrégées pour le bilan : la saison en cours + les 7 précédentes (rempli au lancement).
let SEASONS = [];

// Rivalités réelles et notoires parmi les clubs actuellement en EuroLeague.
const RIVALRIES = [
  { a: 'OLY', b: 'PAN', label: 'Derby of the Eternal Enemies (Athens)' },
  { a: 'MAD', b: 'BAR', label: 'El Clásico' },
  { a: 'PAR', b: 'RED', label: 'Eternal Derby (Belgrade)' },
  { a: 'TEL', b: 'HTA', label: 'Tel Aviv Derby' },
  { a: 'ULK', b: 'IST', label: 'Istanbul Derby' },
];

const TEAMS_PATH = path.join(__dirname, '..', 'src', 'euroleague-teams.json');
const OUT_PATH = path.join(__dirname, '..', 'src', 'euroleague-rivalries.json');

const get = (url) => apiGet(url, { optional: true });

(async () => {
  const current = await resolveSeason();
  SEASONS = Array.from({ length: 8 }, (_, i) => `E${current.year - 7 + i}`);
  console.log('Saisons:', SEASONS.join(' '));
  const teams = JSON.parse(fs.readFileSync(TEAMS_PATH, 'utf8'));
  const byId = Object.fromEntries(teams.map((t) => [t.id, t]));

  const pairsIndex = {};
  RIVALRIES.forEach((r) => {
    pairsIndex[`${r.a}-${r.b}`] = r;
    pairsIndex[`${r.b}-${r.a}`] = r;
  });

  const meetingsByPair = {};
  RIVALRIES.forEach((r) => (meetingsByPair[`${r.a}-${r.b}`] = []));

  for (const season of SEASONS) {
    const res = await get(`${BASE}/v2/competitions/${COMPETITION}/seasons/${season}/games`);
    if (!res) {
      console.log(`  ${season}: indisponible, ignorée`);
      continue;
    }
    const games = (res.data || []).filter((g) => g.played);
    let found = 0;
    for (const g of games) {
      const codeA = g.local?.club?.code;
      const codeB = g.road?.club?.code;
      if (!codeA || !codeB) continue;
      const key1 = `${codeA}-${codeB}`;
      const key2 = `${codeB}-${codeA}`;
      const rivalry = pairsIndex[key1] || pairsIndex[key2];
      if (!rivalry) continue;
      const pairKey = `${rivalry.a}-${rivalry.b}`;
      meetingsByPair[pairKey].push({
        season,
        date: g.date,
        phase: g.phaseType?.code || 'RS',
        homeCode: codeA,
        homeScore: g.local?.score,
        awayCode: codeB,
        awayScore: g.road?.score,
      });
      found += 1;
    }
    console.log(`  ${season}: ${found} match(s) de rivalité trouvé(s)`);
  }

  const byClub = {};
  for (const r of RIVALRIES) {
    const pairKey = `${r.a}-${r.b}`;
    const meetings = meetingsByPair[pairKey].sort((x, y) => new Date(x.date) - new Date(y.date));
    let aWins = 0;
    let bWins = 0;
    meetings.forEach((m) => {
      const homeIsA = m.homeCode === r.a;
      const aScore = homeIsA ? m.homeScore : m.awayScore;
      const bScore = homeIsA ? m.awayScore : m.homeScore;
      if (aScore > bScore) aWins += 1;
      else if (bScore > aScore) bWins += 1;
    });
    const last = meetings[meetings.length - 1] || null;

    const clubA = byId[r.a];
    const clubB = byId[r.b];
    if (!clubA || !clubB) continue;

    const summary = (selfCode, oppCode, selfWins, oppWins) => ({
      label: r.label,
      opponent: { id: oppCode, name: byId[oppCode].displayName, logo: byId[oppCode].logo },
      wins: selfWins,
      losses: oppWins,
      totalMeetings: meetings.length,
      lastMeeting: last
        ? {
            date: last.date,
            season: last.season,
            phase: last.phase,
            homeCode: last.homeCode,
            homeScore: last.homeScore,
            awayCode: last.awayCode,
            awayScore: last.awayScore,
          }
        : null,
    });

    byClub[r.a] = summary(r.a, r.b, aWins, bWins);
    byClub[r.b] = summary(r.b, r.a, bWins, aWins);

    console.log(
      `${clubA.displayName} vs ${clubB.displayName}: ${aWins}-${bWins} sur ${meetings.length} matchs (${SEASONS[0]}-${SEASONS[SEASONS.length - 1]})`
    );
  }

  const out = {
    updated: new Date().toISOString().slice(0, 10),
    seasonsRange: `${SEASONS[0]}–${SEASONS[SEASONS.length - 1]}`,
    source: 'api-live.euroleague.net (résultats agrégés localement)',
    byClub,
  };
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(`\n→ ${OUT_PATH}`);
})();
