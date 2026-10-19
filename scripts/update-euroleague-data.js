#!/usr/bin/env node
/**
 * Met à jour les données EuroLeague masculine depuis l'API officielle
 * (api-live.euroleague.net, gratuite, sans clé) :
 *   - src/euroleague-rosters.json   : effectifs + stats moyennes par joueur
 *   - src/euroleague-standings.json : classement (round le plus récent joué)
 *   - src/euroleague-teams.json     : logo + site web rafraîchis
 *
 * Usage : node scripts/update-euroleague-data.js
 * La saison en cours est détectée automatiquement (euroleague-common.js).
 */
const fs = require('fs');
const path = require('path');

const { BASE, COMPETITION, get, resolveSeason } = require('./euroleague-common');
let SEASON_CODE = null; // résolu au lancement (saison en cours)
const ARCHIVE_PATH = path.join(__dirname, '..', 'scripts', 'euroleague-teams-archive.json');

// Coordonnées des salles que le géocodage ne trouve pas (nouveaux clubs).
const COORDS_OVERRIDES = {
  BES: { latitude: 40.9925, longitude: 28.919 }, // Turkcell Basketball Development Center, Zeytinburnu (Istanbul)
};
const COLOR_OVERRIDES = { BES: { color: '000000', secondaryColor: 'FFFFFF' } };

const TEAMS_PATH = path.join(__dirname, '..', 'src', 'euroleague-teams.json');
const ROSTERS_PATH = path.join(__dirname, '..', 'src', 'euroleague-rosters.json');
const STANDINGS_PATH = path.join(__dirname, '..', 'src', 'euroleague-standings.json');

// Géocodage (Nominatim, sans clé) pour un nouveau club dont la salle n'est pas dans COORDS_OVERRIDES.
async function geocode(q) {
  try {
    const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(q), {
      headers: { 'User-Agent': 'ncaa-basket-map/1.0 (team@enemat.fr)' },
    });
    const j = await r.json();
    return j[0] ? { latitude: +j[0].lat, longitude: +j[0].lon } : null;
  } catch (e) {
    return null;
  }
}

(async () => {
  const active = JSON.parse(fs.readFileSync(TEAMS_PATH, 'utf8'));
  let archive = [];
  try {
    archive = JSON.parse(fs.readFileSync(ARCHIVE_PATH, 'utf8'));
  } catch (e) {
    /* pas encore d'archive */
  }
  // clubs actifs + archivés (un club peut revenir en EuroLeague)
  const teams = [...active, ...archive];
  const byCode = Object.fromEntries(teams.map((t) => [t.id, t]));

  // ── saison en cours (libellé "2026-27") ──
  const season = await resolveSeason();
  SEASON_CODE = season.code;
  const seasonLabel = season.alias || '';
  console.log('Saison:', SEASON_CODE, seasonLabel);

  // ── clubs : logo, et création de la fiche des nouveaux venus ──
  const { data: clubs } = await get(`${BASE}/v2/competitions/${COMPETITION}/seasons/${SEASON_CODE}/clubs`);
  let rsGamesForVenues = null;
  for (const c of clubs) {
    let team = byCode[c.code];
    if (!team) {
      // nouveau club : salle + capacité via son premier match à domicile, coords via overrides/géocodage
      if (!rsGamesForVenues) rsGamesForVenues = (await get(`${BASE}/v2/competitions/${COMPETITION}/seasons/${SEASON_CODE}/games?phaseTypeCode=RS`)).data || [];
      const home = rsGamesForVenues.find((g) => g.local.club.code === c.code && g.venue);
      const venue = home && home.venue;
      const detail = await get(`${BASE}/v2/competitions/${COMPETITION}/seasons/${SEASON_CODE}/clubs/${c.code}`, { optional: true });
      const city = detail && detail.city ? detail.city.charAt(0) + detail.city.slice(1).toLowerCase() : null;
      const coords = COORDS_OVERRIDES[c.code] || (venue && (await geocode(`${venue.name}, ${city || ''}`))) || (city && (await geocode(city))) || { latitude: null, longitude: null };
      team = {
        id: c.code,
        displayName: c.editorialName || c.abbreviatedName || c.name,
        shortDisplayName: c.abbreviatedName || c.editorialName || c.name,
        division: 'euroleague',
        latitude: coords.latitude,
        longitude: coords.longitude,
        logo: c.images?.crest || null,
        venue: venue ? toTitle(venue.name) : null,
        location: city,
        color: (COLOR_OVERRIDES[c.code] || {}).color || null,
        secondaryColor: (COLOR_OVERRIDES[c.code] || {}).secondaryColor || null,
        capacity: venue ? venue.capacity || null : null,
        website: (detail && detail.website) || null,
        honours: {},
        arenaPhoto: null,
      };
      teams.push(team);
      byCode[c.code] = team;
      console.log(`  + nouveau club : ${team.displayName} — ${team.venue || '?'} @ ${city || '?'} [${coords.latitude ? 'coords ok' : '⚠ SANS COORDS'}]`);
    }
    team.logo = c.images?.crest || team.logo;
  }
  const engaged = new Set(clubs.map((c) => c.code));
  for (const t of active.filter((t) => !engaged.has(t.id))) console.log(`  ↓ quitte l'EuroLeague (archivé) : ${t.displayName}`);
  for (const t of archive.filter((t) => engaged.has(t.id))) console.log(`  ↑ revient en EuroLeague : ${t.displayName}`);
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
  const nextActive = teams.filter((t) => engaged.has(t.id));
  const nextArchive = teams.filter((t) => !engaged.has(t.id));
  fs.writeFileSync(TEAMS_PATH, JSON.stringify(nextActive, null, 2));
  fs.writeFileSync(ARCHIVE_PATH, JSON.stringify(nextArchive, null, 2) + '\n');
  console.log(`\n→ ${ROSTERS_PATH}\n→ ${STANDINGS_PATH}\n→ ${TEAMS_PATH} (${nextActive.length} clubs)\n→ ${ARCHIVE_PATH} (${nextArchive.length} archivés)`);
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
