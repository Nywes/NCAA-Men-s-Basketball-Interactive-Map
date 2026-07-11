#!/usr/bin/env node
/**
 * Met à jour les données EuroLeague masculine depuis l'API officielle
 * (api-live.euroleague.net, gratuite, sans clé) :
 *   - src/euroleague-rosters.json   : effectifs + stats moyennes par joueur
 *   - src/euroleague-standings.json : classement (round le plus récent joué)
 *   - src/euroleague-teams.json     : logo + site web rafraîchis
 *
 * Usage : node scripts/update-euroleague-data.js
 * SEASON_CODE à incrémenter chaque été (E2025 -> E2026...).
 */
const fs = require('fs');
const path = require('path');

const BASE = 'https://api-live.euroleague.net';
const COMPETITION = 'E'; // E = EuroLeague, U = EuroCup
const SEASON_CODE = 'E2025';
const UA = 'Mozilla/5.0 (compatible; ncaa-basket-map/1.0)';

const TEAMS_PATH = path.join(__dirname, '..', 'src', 'euroleague-teams.json');
const ROSTERS_PATH = path.join(__dirname, '..', 'src', 'euroleague-rosters.json');
const STANDINGS_PATH = path.join(__dirname, '..', 'src', 'euroleague-standings.json');

async function get(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

(async () => {
  const teams = JSON.parse(fs.readFileSync(TEAMS_PATH, 'utf8'));
  const byCode = Object.fromEntries(teams.map((t) => [t.id, t]));

  // ── saison (libellé "2025-26") ──
  const season = await get(`${BASE}/v2/competitions/${COMPETITION}/seasons/${SEASON_CODE}`);
  const seasonLabel = season.alias || '';
  console.log('Saison:', seasonLabel);

  // ── clubs (logo + site web) ──
  const { data: clubs } = await get(`${BASE}/v2/competitions/${COMPETITION}/seasons/${SEASON_CODE}/clubs`);
  for (const c of clubs) {
    const team = byCode[c.code];
    if (!team) {
      console.warn(`  ⚠ club non trouvé en local: ${c.code} (${c.name})`);
      continue;
    }
    team.logo = c.images?.crest || team.logo;
  }
  // détail par club (site web) — un appel par club, léger
  for (const c of clubs) {
    const team = byCode[c.code];
    if (!team) continue;
    try {
      const detail = await get(`${BASE}/v2/competitions/${COMPETITION}/seasons/${SEASON_CODE}/clubs/${c.code}`);
      team.website = detail.website || team.website;
    } catch (e) {
      console.warn(`  ⚠ détail club ${c.code}: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  // ── effectifs ──
  const rosters = {};
  for (const c of clubs) {
    const team = byCode[c.code];
    if (!team) continue;
    const people = await get(
      `${BASE}/v2/competitions/${COMPETITION}/seasons/${SEASON_CODE}/clubs/${c.code}/people?personType=J`
    );
    rosters[c.code] = (people || []).map((p) => ({
      code: p.person.code,
      firstName: toTitle(p.person.name.split(',')[1] || ''),
      lastName: toTitle(p.person.name.split(',')[0] || ''),
      photo: p.images?.headshot || null,
      height: p.person.height || null,
      nationality: p.person.country?.code || null,
      position: p.positionName || '',
      number: p.dorsal || null,
    }));
    console.log(`  ${team.displayName}: ${rosters[c.code].length} joueurs`);
    await new Promise((r) => setTimeout(r, 150));
  }

  // ── stats complètes de la saison (tous joueurs en un appel) ──
  const statsRes = await get(
    `${BASE}/v3/competitions/${COMPETITION}/statistics/players/traditional?SeasonMode=Single&SeasonCode=${SEASON_CODE}&limit=400`
  );
  const statsByCode = {};
  for (const row of statsRes.players || []) {
    statsByCode[row.player.code] = row;
  }
  let joined = 0;
  for (const code of Object.keys(rosters)) {
    for (const player of rosters[code]) {
      const s = statsByCode[player.code];
      if (!s) continue;
      joined += 1;
      Object.assign(player, {
        ppg: s.pointsScored ?? null,
        rpg: s.totalRebounds ?? null,
        apg: s.assists ?? null,
        gp: s.gamesPlayed ?? null,
        min: s.minutesPlayed ?? null,
        spg: s.steals ?? null,
        bpg: s.blocks ?? null,
        tov: s.turnovers ?? null,
        p2: pct(s.twoPointersPercentage),
        p3: pct(s.threePointersPercentage),
        ft: pct(s.freeThrowsPercentage),
        pir: s.pir ?? null,
      });
    }
  }
  console.log(`Stats complètes jointes: ${joined} joueurs`);

  // ── rang dans les leaders de la ligue (Points/Rebonds/Passes) ──
  // Calculé nous-mêmes par tri (plus fiable que l'endpoint "leaders" dédié,
  // qui impose un format de paramètres capricieux) à partir de la même liste
  // de stats déjà récupérée. Seuil de qualification : 15 matchs joués minimum,
  // pour éviter qu'un joueur à 1 match/40 points ne truste la 1ère place.
  const MIN_GAMES = 15;
  const qualified = (statsRes.players || []).filter((p) => (p.gamesPlayed || 0) >= MIN_GAMES);
  const rankByCode = (field) => {
    const sorted = [...qualified].sort((a, b) => (b[field] ?? -1) - (a[field] ?? -1));
    const ranks = {};
    sorted.forEach((p, i) => (ranks[p.player.code] = i + 1));
    return ranks;
  };
  const ptsRank = rankByCode('pointsScored');
  const rebRank = rankByCode('totalRebounds');
  const astRank = rankByCode('assists');
  for (const code of Object.keys(rosters)) {
    for (const player of rosters[code]) {
      const leagueRank = {
        pts: ptsRank[player.code] ?? null,
        reb: rebRank[player.code] ?? null,
        ast: astRank[player.code] ?? null,
      };
      // On ne garde que les rangs dans le top 20 (le reste n'a pas d'intérêt à afficher).
      player.leagueRank = {
        pts: leagueRank.pts && leagueRank.pts <= 20 ? leagueRank.pts : null,
        reb: leagueRank.reb && leagueRank.reb <= 20 ? leagueRank.reb : null,
        ast: leagueRank.ast && leagueRank.ast <= 20 ? leagueRank.ast : null,
      };
    }
  }

  // ── classement (dernier round de saison régulière joué) ──
  const { data: rsGames } = await get(
    `${BASE}/v2/competitions/${COMPETITION}/seasons/${SEASON_CODE}/games?phaseTypeCode=RS`
  );
  const playedRounds = (rsGames || []).filter((g) => g.played).map((g) => g.round);
  const maxRound = playedRounds.length ? Math.max(...playedRounds) : 1;
  console.log('Dernier round joué:', maxRound);

  const standingsRes = await get(
    `${BASE}/v3/competitions/${COMPETITION}/seasons/${SEASON_CODE}/rounds/${maxRound}/basicstandings`
  );
  const standings = (standingsRes.teams || []).map((r) => ({
    rank: r.position,
    teamId: byCode[r.club.code] ? r.club.code : null,
    name: byCode[r.club.code] ? byCode[r.club.code].displayName : r.club.name,
    wins: r.gamesWon,
    losses: r.gamesLost,
    winPct: parseFloat(r.winPercentage) || null,
    lastFive: r.last5Form || [],
    pointsFor: r.pointsFor,
    pointsAgainst: r.pointsAgainst,
    diff: parseInt(r.pointsDifference, 10) || 0,
  }));
  console.log('Classement:', standings.length, 'lignes');

  const meta = { updated: new Date().toISOString().slice(0, 10), season: seasonLabel, source: 'api-live.euroleague.net' };
  fs.writeFileSync(ROSTERS_PATH, JSON.stringify({ ...meta, rosters }, null, 2));
  fs.writeFileSync(STANDINGS_PATH, JSON.stringify({ ...meta, standings }, null, 2));
  fs.writeFileSync(TEAMS_PATH, JSON.stringify(teams, null, 2));
  console.log(`\n→ ${ROSTERS_PATH}\n→ ${STANDINGS_PATH}\n→ logos/sites écrits dans euroleague-teams.json`);
})();

// L'API renvoie les pourcentages en chaîne ("54.5%") -> nombre nu (54.5).
function pct(v) {
  if (v == null) return null;
  const n = parseFloat(String(v).replace('%', ''));
  return isNaN(n) ? null : n;
}

function toTitle(s) {
  return s
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
