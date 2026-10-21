#!/usr/bin/env node
/**
 * NBL (Australie / Nouvelle-Zélande) depuis l'API « rosetta » du site nbl.com.au
 * (JSON public, sans clé, mais les en-têtes Origin/Referer nbl.com.au sont obligatoires) :
 *   - src/nbl-teams.json      : clubs (logo, couleurs, salle, capacité, ville, coords, site)
 *   - src/nbl-rosters.json    : effectifs + moyennes de la saison (même format qu'EuroLeague)
 *   - src/nbl-standings.json  : classement
 * Saison en cours = `seasons/current`. Effectif d'une équipe = ses lignes de stats
 * de la saison (`stats/leaders/.../team/<code>`), complétées par la fiche joueur
 * (`players`). Nouveaux clubs géocodés automatiquement (Photon), corrections
 * manuelles dans TEAM_OVERRIDES.
 *
 * Usage : node scripts/update-nbl-data.js
 */
const fs = require('fs');
const path = require('path');

const BASE = 'https://prod.rosetta.nbl.com.au';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';
const HEADERS = { 'User-Agent': UA, Accept: 'application/json', Origin: 'https://www.nbl.com.au', Referer: 'https://www.nbl.com.au/' };

const TEAMS_PATH = path.join(__dirname, '..', 'src', 'nbl-teams.json');
const ROSTERS_PATH = path.join(__dirname, '..', 'src', 'nbl-rosters.json');
const STANDINGS_PATH = path.join(__dirname, '..', 'src', 'nbl-standings.json');
const ARCHIVE_PATH = path.join(__dirname, 'nbl-teams-archive.json');

// Corrections appliquées à chaque run — clé = id d'équipe (uuid rosetta).
const TEAM_OVERRIDES = {};

// Ville de chaque club (l'API ne donne que le nom de la salle) — nouveau club : géocodé sur la salle seule.
const CITIES = {
  NZL: ['Auckland', 'New Zealand'],
  PER: ['Perth', 'Australia'],
  BRI: ['Brisbane', 'Australia'],
  SEM: ['Melbourne', 'Australia'],
  SYD: ['Sydney', 'Australia'],
  ADL: ['Adelaide', 'Australia'],
  ILL: ['Wollongong', 'Australia'],
  TAS: ['Hobart', 'Australia'],
  CNS: ['Cairns', 'Australia'],
  MEL: ['Melbourne', 'Australia'],
};

// Postes NBL -> libellés du panneau.
const POSITIONS = { G: 'Guard', PG: 'Guard', SG: 'Guard', F: 'Forward', SF: 'Forward', PF: 'Forward', C: 'Center', GF: 'Guard-Forward', FC: 'Forward-Center' };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url) {
  for (let k = 1; k <= 3; k++) {
    const res = await fetch(url, { headers: HEADERS });
    if (res.ok) return res.json();
    if ((res.status === 429 || res.status >= 500) && k < 3) {
      await sleep(5000 * k);
      continue;
    }
    throw new Error(`${url} -> HTTP ${res.status}`);
  }
  return null;
}

// Photon (komoot) d'abord, Nominatim en secours ; un résultat hors Australie / NZ est rejeté.
const inOceania = (g) => g && g.latitude > -48 && g.latitude < -9 && g.longitude > 110 && g.longitude < 180;
async function geocode(q) {
  const H = { 'User-Agent': 'ncaa-basket-map/1.0 (team@enemat.fr)' };
  try {
    await sleep(400);
    const r = await fetch('https://photon.komoot.io/api/?limit=1&q=' + encodeURIComponent(q), { headers: H });
    const j = await r.json();
    const f = j.features && j.features[0];
    if (f && f.geometry) {
      const g = { latitude: f.geometry.coordinates[1], longitude: f.geometry.coordinates[0] };
      if (inOceania(g)) return g;
    }
  } catch (e) {
    /* secours */
  }
  try {
    await sleep(1100);
    const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(q), { headers: H });
    const j = await r.json();
    const g = j[0] ? { latitude: +j[0].lat, longitude: +j[0].lon } : null;
    return inOceania(g) ? g : null;
  } catch (e) {
    return null;
  }
}
const hex = (c) => (c ? c.replace('#', '').toUpperCase() : null);
const r1 = (v) => (v != null ? Math.round(v * 10) / 10 : null);
const pct = (v) => (v != null ? Math.round(v * 1000) / 10 : null); // 0.483871 -> 48.4
const ageFrom = (birth) => {
  if (!birth) return null;
  const b = new Date(birth);
  const n = new Date();
  return n.getFullYear() - b.getFullYear() - (n < new Date(n.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0);
};
// Photos sportradar : « ?size=800 » -> 200 px (tailles acceptées : 100, 200, 400, 800).
const photo = (p) => (p.external_player_image || p.image || null) && String(p.external_player_image || p.image).replace(/size=\d+/, 'size=200');

(async () => {
  let active = [];
  try {
    active = JSON.parse(fs.readFileSync(TEAMS_PATH, 'utf8'));
  } catch (e) {
    console.log("(pas encore de nbl-teams.json : les clubs seront créés depuis l'API)");
  }
  let archive = [];
  try {
    archive = JSON.parse(fs.readFileSync(ARCHIVE_PATH, 'utf8'));
  } catch (e) {
    /* pas d'archive */
  }
  const teams = [...active, ...archive];
  const byId = Object.fromEntries(teams.map((t) => [t.id, t]));

  // ── saison en cours ──
  const season = ((await get(`${BASE}/get/nbl/seasons/current`)).data || [])[0];
  if (!season) throw new Error('seasons/current vide');
  const year = +season.year;
  const seasonLabel = `${year}-${String(year + 1).slice(2)}`;
  console.log(`Saison: ${season.name} (${seasonLabel}, id ${season.id})`);

  // ── classement (+ fiches d'équipes) ──
  const ladder = (await get(`${BASE}/calc/nbl/running_ladder/for/season/year/${year}/regular`)).data || [];
  if (!ladder.length) throw new Error('running_ladder vide');
  const allTeams = (await get(`${BASE}/get/nbl/teams`)).data || [];
  const apiTeamById = Object.fromEntries(allTeams.map((t) => [t.id, t]));
  console.log(`${ladder.length} clubs`);

  // ── fiches joueurs (taille, naissance, nationalité, poste/numéro par défaut) ──
  const master = {};
  for (let offset = 0; offset < 5000; offset += 1000) {
    const page = (await get(`${BASE}/get/nbl/players?limit=1000&offset=${offset}`)).data || [];
    for (const row of page) master[row.player.id] = row.player;
    if (page.length < 1000) break;
    await sleep(300);
  }
  console.log(`${Object.keys(master).length} fiches joueur`);

  // ── clubs : fiche, géocodage des nouveaux, effectif + stats ──
  const rosters = {};
  const allPlayers = [];
  const unknownPositions = new Set();
  for (const row of ladder) {
    const lt = row.team || {};
    const at = apiTeamById[lt.id] || {};
    const id = String(lt.id);
    const code = lt.team_code || at.team_code;
    const venue = (at.venue || {}).name || null;
    const [city, country] = CITIES[code] || [null, 'Australia'];
    let team = byId[id];
    if (!team) {
      const g = (venue && (await geocode(`${venue}, ${city || ''}, ${country}`))) || (city && (await geocode(`${city}, ${country}`))) || {};
      team = { id, latitude: g.latitude || null, longitude: g.longitude || null, honours: {} };
      teams.push(team);
      byId[id] = team;
      console.log(`  + nouveau club : ${lt.name} — ${venue || '?'} @ ${city || '?'} [${team.latitude ? 'coords ok' : '⚠ SANS COORDS'}]`);
    }
    Object.assign(team, {
      displayName: lt.name || at.name,
      shortDisplayName: lt.name || at.name,
      division: 'nbl',
      code,
      // logo sportradar (webp 200 px) de préférence : le PNG du CDN NBL pèse ~150 Ko
      logo: lt.external_team_logo || at.external_team_logo || lt.team_logo || at.team_logo || null,
      color: hex(lt.color_primary || at.color_primary),
      secondaryColor: hex(lt.color_secondary || at.color_secondary),
      venue: venue || team.venue || null,
      capacity: (at.venue || {}).capacity || team.capacity || null,
      location: city || team.location || null,
      website: at.website || team.website || null,
      founded: at.established ? parseInt(String(at.established), 10) || null : team.founded || null,
    });
    if (TEAM_OVERRIDES[id]) Object.assign(team, TEAM_OVERRIDES[id]);

    const stats = (await get(`${BASE}/get/nbl/stats/leaders/for/season/id/${season.id}/team/${String(code).toLowerCase()}?limit=500&offset=0`)).data || [];
    rosters[id] = stats.map((s) => {
      const p = s.player || {};
      const m = master[p.id] || {};
      const posCode = p.playing_position || m.latest_playing_position || null;
      if (posCode && !(posCode in POSITIONS)) unknownPositions.add(posCode);
      const rowP = {
        code: String(p.id),
        firstName: p.first_name || m.first_name || '',
        lastName: p.last_name || m.last_name || '',
        photo: photo(p) || photo(m),
        height: m.height || null,
        age: ageFrom(m.date_of_birth),
        nationality: m.nationality_code || null,
        position: POSITIONS[posCode] || posCode || '',
        number: p.jersey_number ?? m.latest_jersey_number ?? null,
        gp: s.games || 0,
        min: r1(s.minutes_average),
        ppg: r1(s.points_average),
        rpg: r1(s.rebounds_average),
        apg: r1(s.assists_average),
        spg: r1(s.steals_average),
        bpg: r1(s.blocks_average),
        tov: r1(s.turnovers_average),
        p2: pct(s.two_points_percentage),
        p3: pct(s.three_points_percentage),
        ft: pct(s.free_throws_percentage),
        pir: r1(s.efficiency_average),
        leagueRank: { pts: null, reb: null, ast: null },
      };
      allPlayers.push(rowP);
      return rowP;
    });
    console.log(`  ${team.displayName}: ${rosters[id].length} joueurs — ${team.venue || '?'}, ${team.location || '?'}`);
    await sleep(400);
  }
  if (unknownPositions.size) console.log(`  ⚠ postes inconnus (à ajouter dans POSITIONS) : ${[...unknownPositions].join(', ')}`);

  // rangs ligue (top 20) sur pts / reb / ast, joueurs avec au moins 1 match
  for (const [key, field] of [['pts', 'ppg'], ['reb', 'rpg'], ['ast', 'apg']]) {
    allPlayers
      .filter((p) => p.gp > 0 && p[field] != null)
      .sort((a, b) => b[field] - a[field])
      .forEach((p, i) => {
        if (i < 20) p.leagueRank[key] = i + 1;
      });
  }

  // ── classement ──
  const standings = ladder
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((r) => ({
      rank: r.position,
      group: null,
      teamId: String((r.team || {}).id),
      name: (r.team || {}).name || '?',
      wins: r.won,
      losses: r.lost,
      winPct: r.played ? Math.round((r.won / r.played) * 1000) / 10 : 0,
      lastFive: (r.win_loss_record || []).slice(-5),
      pointsFor: r.points_for,
      pointsAgainst: r.points_against,
      diff: r.points_for - r.points_against,
    }));

  const engaged = new Set(ladder.map((r) => String((r.team || {}).id)));
  const nextActive = teams.filter((t) => engaged.has(t.id));
  const nextArchive = teams.filter((t) => !engaged.has(t.id));
  for (const t of active.filter((t) => !engaged.has(t.id))) console.log(`  ↓ quitte la NBL (archivé) : ${t.displayName}`);
  for (const t of archive.filter((t) => engaged.has(t.id))) console.log(`  ↑ revient en NBL : ${t.displayName}`);

  const meta = { updated: new Date().toISOString().slice(0, 10), season: seasonLabel, seasonName: season.name, source: 'nbl.com.au' };
  fs.writeFileSync(TEAMS_PATH, JSON.stringify(nextActive, null, 2));
  fs.writeFileSync(ARCHIVE_PATH, JSON.stringify(nextArchive, null, 2) + '\n');
  fs.writeFileSync(ROSTERS_PATH, JSON.stringify({ ...meta, rosters }, null, 2));
  fs.writeFileSync(STANDINGS_PATH, JSON.stringify({ ...meta, standings }, null, 2));
  console.log(`\nClassement: ${standings.length} lignes\n→ ${TEAMS_PATH} (${nextActive.length} clubs)\n→ ${ROSTERS_PATH}\n→ ${STANDINGS_PATH}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
