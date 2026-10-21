#!/usr/bin/env node
/**
 * Liga ACB (Liga Endesa, Espagne) depuis l'API du site officiel acb.com
 * (api2.acb.com, clé publique embarquée dans le site) :
 *   - src/acb-teams.json      : clubs (logo, couleurs, salle, adresse, capacité, coords, site)
 *   - src/acb-rosters.json    : effectifs + moyennes de la saison (même format qu'EuroLeague)
 *   - src/acb-standings.json  : classement
 * La saison en cours est détectée (dernière saison listée par l'API). Nouveaux
 * clubs géocodés automatiquement (Photon), corrections manuelles dans TEAM_OVERRIDES.
 *
 * Usage : node scripts/update-acb-data.js
 */
const fs = require('fs');
const path = require('path');

const BASE = 'https://api2.acb.com/api/seasondata';
const COMPETITION_ID = 1; // Liga Endesa (2 = Copa del Rey, 3 = Supercopa)
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';
const HEADERS = {
  'User-Agent': UA,
  Accept: 'application/json',
  'X-APIKEY': '0dd94928-6f57-4c08-a3bd-b1b2f092976e', // clé publique du site acb.com
  Origin: 'https://www.acb.com',
  Referer: 'https://www.acb.com/',
};

const TEAMS_PATH = path.join(__dirname, '..', 'src', 'acb-teams.json');
const ROSTERS_PATH = path.join(__dirname, '..', 'src', 'acb-rosters.json');
const STANDINGS_PATH = path.join(__dirname, '..', 'src', 'acb-standings.json');
const ARCHIVE_PATH = path.join(__dirname, 'acb-teams-archive.json');

// Corrections appliquées à chaque run (géocodage aberrant, etc.) — clé = clubId.
const TEAM_OVERRIDES = {
  9: { latitude: 40.4238, longitude: -3.6718, location: 'Madrid' }, // Real Madrid : l'adresse géocode à Navalcarnero
  22: { latitude: 42.5063, longitude: 1.5218, location: 'Andorra la Vella' }, // MoraBanc Andorra : géocodé dans le Maresme
};

// Postes ACB (espagnol) -> libellés du panneau (Guard / Forward / Center).
const POSITIONS = { Base: 'Guard', Escolta: 'Guard', Alero: 'Forward', 'Ala-pívot': 'Forward', 'Ala-Pívot': 'Forward', Pívot: 'Center' };

// Pays (noms espagnols de l'API) -> codes FIBA/ISO3 attendus par le panneau
// (NAT_TO_ISO2 dans EuroleagueTeamPanels). Nom inconnu : conservé tel quel + avertissement.
const COUNTRIES = {
  'España': 'ESP', 'EE.UU.': 'USA', 'Estados Unidos': 'USA', 'Serbia': 'SRB', 'Bulgaria': 'BUL', 'Nigeria': 'NGR',
  'Italia': 'ITA', 'Finlandia': 'FIN', 'Reino Unido': 'GBR', 'Polonia': 'POL', 'República Dominicana': 'DOM',
  'Eslovenia': 'SLO', 'Francia': 'FRA', 'Jamaica': 'JAM', 'Costa de Marfil': 'IVO', 'Macedonia del Norte': 'MKD',
  'Letonia': 'LAT', 'Lituania': 'LTU', 'Rep. Democrática del Congo': 'COD', 'Brasil': 'BRA', 'Noruega': 'NOR',
  'Canadá': 'CAN', 'Chequia': 'CZE', 'República Checa': 'CZE', 'Hungría': 'HUN', 'Islandia': 'ISL',
  'Países Bajos': 'NED', 'Suecia': 'SWE', 'Croacia': 'CRO', 'Ucrania': 'UKR', 'Cabo Verde': 'CPV', 'Sudáfrica': 'RSA',
  'Guinea': 'GUI', 'Estonia': 'EST', 'Cuba': 'CUB', 'Montenegro': 'MNE', 'Rumanía': 'ROU', 'Alemania': 'GER',
  'Senegal': 'SEN', 'Bosnia y Herzegovina': 'BIH', 'Barbados': 'BAR', 'Eslovaquia': 'SVK', 'Georgia': 'GEO',
  'Azerbaiyán': 'AZE', 'Portugal': 'POR', 'Bélgica': 'BEL', 'Uruguay': 'URU', 'Argentina': 'ARG', 'Armenia': 'ARM',
  'Grecia': 'GRE', 'Turquía': 'TUR', 'Israel': 'ISR', 'Australia': 'AUS', 'Puerto Rico': 'PUR', 'Suiza': 'SUI',
  'Camerún': 'CMR', 'Malí': 'MLI', 'Mali': 'MLI', 'Túnez': 'TUN', 'Venezuela': 'VEN', 'Japón': 'JPN',
  'Nueva Zelanda': 'NZL', 'Angola': 'ANG', 'Bahamas': 'BAH', 'Chile': 'CHI', 'Colombia': 'COL', 'Dinamarca': 'DEN',
  'Gabón': 'GAB', 'Irlanda': 'IRL', 'México': 'MEX', 'Rusia': 'RUS', 'Austria': 'AUT', 'Kosovo': 'KOS',
  'Ghana': 'GHA', 'Egipto': 'EGY', 'Burkina Faso': 'BUR', 'Panamá': 'PAN', 'Luxemburgo': 'LUX', 'Marruecos': 'MAR',
  'Haití': 'HAI', 'Trinidad y Tobago': 'TTO', 'Filipinas': 'PHI', 'China': 'CHN', 'Corea del Sur': 'KOR',
};
const unknownCountries = new Set();
const countryCode = (name) => {
  if (!name) return null;
  if (COUNTRIES[name]) return COUNTRIES[name];
  unknownCountries.add(name);
  return name;
};

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

// Photon (komoot) d'abord, Nominatim en secours.
async function geocode(q) {
  const H = { 'User-Agent': 'ncaa-basket-map/1.0 (team@enemat.fr)' };
  try {
    await sleep(400);
    const r = await fetch('https://photon.komoot.io/api/?limit=1&q=' + encodeURIComponent(q), { headers: H });
    const j = await r.json();
    const f = j.features && j.features[0];
    if (f && f.geometry) return { latitude: f.geometry.coordinates[1], longitude: f.geometry.coordinates[0], city: f.properties.city || f.properties.name || null };
  } catch (e) {
    /* secours */
  }
  try {
    await sleep(1100);
    const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(q), { headers: H });
    const j = await r.json();
    return j[0] ? { latitude: +j[0].lat, longitude: +j[0].lon, city: null } : null;
  } catch (e) {
    return null;
  }
}
const hex = (c) => (c ? c.replace('#', '').toUpperCase() : null);

(async () => {
  let active = [];
  try {
    active = JSON.parse(fs.readFileSync(TEAMS_PATH, 'utf8'));
  } catch (e) {
    console.log('(pas encore de acb-teams.json : les clubs seront créés depuis l\'API)');
  }
  let archive = [];
  try {
    archive = JSON.parse(fs.readFileSync(ARCHIVE_PATH, 'utf8'));
  } catch (e) {
    /* pas d'archive */
  }
  const teams = [...active, ...archive];
  const byId = Object.fromEntries(teams.map((t) => [t.id, t]));

  // ── saison en cours = dernière saison listée (ex. id 91 = 2026-27) ──
  const probe = await get(`${BASE}/Competition/standings?competitionId=${COMPETITION_ID}`);
  const seasons = (probe.availableFilters.seasons || []).slice().sort((a, b) => a.seasonStartYear - b.seasonStartYear);
  const season = seasons[seasons.length - 1];
  const editionId = season.id;
  const seasonLabel = `${season.seasonStartYear}-${String(season.seasonEndYear).slice(2)}`;
  console.log(`Saison: ${seasonLabel} (editionId ${editionId})`);

  const st = probe.selectedFilters.season === editionId ? probe : await get(`${BASE}/Competition/standings?competitionId=${COMPETITION_ID}&editionId=${editionId}`);
  const apiTeams = st.teams || [];
  const teamIdToClub = Object.fromEntries(apiTeams.map((t) => [t.id, String(t.clubId)]));
  console.log(`${apiTeams.length} clubs`);

  // ── clubs : fiche (salle, adresse, capacité, site), géocodage des nouveaux ──
  const rosters = {};
  const allPlayers = []; // pour les rangs ligue (pts/reb/ast)
  for (const t of apiTeams) {
    const id = String(t.clubId);
    const detail = (await get(`${BASE}/TeamProfile/club-data?competitionId=${COMPETITION_ID}&editionId=${editionId}&clubId=${t.clubId}`)).clubData || {};
    let team = byId[id];
    if (!team) {
      const q = [detail.stadiumName, detail.stadiumAddress, 'España'].filter(Boolean).join(', ');
      const g = (await geocode(q)) || (await geocode(`${detail.stadiumName || t.fullName}, España`)) || {};
      team = { id, latitude: g.latitude || null, longitude: g.longitude || null, location: g.city || null, honours: {} };
      teams.push(team);
      byId[id] = team;
      console.log(`  + nouveau club : ${t.fullName} — ${detail.stadiumName || '?'} @ ${team.location || '?'} [${team.latitude ? 'coords ok' : '⚠ SANS COORDS'}]`);
    }
    Object.assign(team, {
      displayName: t.fullName,
      shortDisplayName: t.shortName || t.fullName,
      division: 'acb',
      logo: t.logo,
      color: hex(t.primaryColorHex),
      secondaryColor: null,
      venue: detail.stadiumName || team.venue || null,
      address: detail.stadiumAddress || null,
      capacity: detail.stadiumCapacity || team.capacity || null,
      website: detail.webUrl || team.website || null,
      founded: detail.foundationYear || null,
      arenaPhoto: detail.stadiumPhotoUrl || null,
    });
    if (TEAM_OVERRIDES[id]) Object.assign(team, TEAM_OVERRIDES[id]);
    await sleep(300);

    // ── effectif + moyennes ──
    const roster = (await get(`${BASE}/TeamProfile/current-roster?competitionId=${COMPETITION_ID}&editionId=${editionId}&clubId=${t.clubId}`)).players || [];
    await sleep(300);
    const stats = (await get(`${BASE}/TeamProfile/team-stats?competitionId=${COMPETITION_ID}&editionId=${editionId}&clubId=${t.clubId}`)).players || [];
    const avgById = Object.fromEntries(stats.map((s) => [s.player.id, s.averages || {}]));
    rosters[id] = roster.map((r) => {
      const p = r.player;
      const a = avgById[p.id] || {};
      const row = {
        code: String(p.id),
        firstName: p.firstName || '',
        lastName: p.lastName || '',
        photo: p.headshotImageUrl || null,
        height: r.height || null,
        age: r.age || null,
        nationality: countryCode(r.nationalityCountry),
        position: POSITIONS[p.gameRole] || p.gameRole || '',
        number: p.shirtNumber || null,
        gp: a.numGames || 0,
        min: a.timePlayed != null ? Math.round((a.timePlayed / 60) * 10) / 10 : null,
        ppg: a.points ?? null,
        rpg: a.rebounds ?? null,
        apg: a.assists ?? null,
        spg: a.steals ?? null,
        bpg: a.blocks ?? null,
        tov: a.turnovers ?? null,
        p2: a.twoPointersPercentage ?? null,
        p3: a.threePointersPercentage ?? null,
        ft: a.freeThrowsPercentage ?? null,
        pir: a.rating ?? null,
        leagueRank: { pts: null, reb: null, ast: null },
      };
      allPlayers.push(row);
      return row;
    });
    console.log(`  ${t.fullName}: ${rosters[id].length} joueurs (${stats.length} avec stats)`);
    await sleep(300);
  }

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
  const nameByClub = Object.fromEntries(apiTeams.map((t) => [String(t.clubId), t.fullName]));
  const standings = (st.standings || [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((r) => {
      const clubId = teamIdToClub[r.teamId];
      const played = (r.rounds || []).filter((x) => x.matchData && x.matchData.matchStatus === 'FINALIZED');
      const lastFive = played.slice(-5).map((x) => {
        const m = x.matchData;
        const home = m.homeTeamId === r.teamId;
        return (home ? m.homeScore > m.awayScore : m.awayScore > m.homeScore) ? 'W' : 'L';
      });
      return {
        rank: r.position,
        group: null,
        teamId: clubId,
        name: nameByClub[clubId] || '?',
        wins: r.wins,
        losses: r.loses,
        winPct: r.winPercentage,
        lastFive,
        pointsFor: r.pointsFor,
        pointsAgainst: r.pointsAgainst,
        diff: r.plusMinus,
      };
    });

  const engaged = new Set(apiTeams.map((t) => String(t.clubId)));
  const nextActive = teams.filter((t) => engaged.has(t.id));
  const nextArchive = teams.filter((t) => !engaged.has(t.id));
  for (const t of active.filter((t) => !engaged.has(t.id))) console.log(`  ↓ quitte la Liga ACB (archivé) : ${t.displayName}`);
  for (const t of archive.filter((t) => engaged.has(t.id))) console.log(`  ↑ revient en Liga ACB : ${t.displayName}`);

  if (unknownCountries.size) console.log(`  ⚠ pays sans code (à ajouter dans COUNTRIES) : ${[...unknownCountries].join(', ')}`);

  const meta = { updated: new Date().toISOString().slice(0, 10), season: seasonLabel, source: 'api2.acb.com' };
  fs.writeFileSync(TEAMS_PATH, JSON.stringify(nextActive, null, 2));
  fs.writeFileSync(ARCHIVE_PATH, JSON.stringify(nextArchive, null, 2) + '\n');
  fs.writeFileSync(ROSTERS_PATH, JSON.stringify({ ...meta, rosters }, null, 2));
  fs.writeFileSync(STANDINGS_PATH, JSON.stringify({ ...meta, standings }, null, 2));
  console.log(`\nClassement: ${standings.length} lignes\n→ ${TEAMS_PATH} (${nextActive.length} clubs)\n→ ${ROSTERS_PATH}\n→ ${STANDINGS_PATH}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
