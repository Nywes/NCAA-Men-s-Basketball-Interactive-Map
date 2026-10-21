#!/usr/bin/env node
/**
 * Basketball-Bundesliga (easyCredit BBL, Allemagne) depuis le JSON serveur
 * (`__NEXT_DATA__`) embarqué dans les pages du site easycredit-bbl.de :
 *   - src/bbl-teams.json      : clubs (logo, couleurs, salle, capacité, ville, coords, site)
 *   - src/bbl-rosters.json    : effectifs + moyennes de la saison (même format qu'EuroLeague)
 *   - src/bbl-standings.json  : classement
 * Saison en cours = `activeSeasonId` du tableau (page /saison/tabelle). Les équipes
 * viennent de `teamNavigatorData` (toutes les pages), l'effectif et les stats de
 * la page /teams/<id>/<saison>. Nouveaux clubs géocodés automatiquement (Photon),
 * corrections manuelles dans TEAM_OVERRIDES.
 *
 * Usage : node scripts/update-bbl-data.js
 */
const fs = require('fs');
const path = require('path');

const SITE = 'https://www.easycredit-bbl.de';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';
const HEADERS = { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8' };

const TEAMS_PATH = path.join(__dirname, '..', 'src', 'bbl-teams.json');
const ROSTERS_PATH = path.join(__dirname, '..', 'src', 'bbl-rosters.json');
const STANDINGS_PATH = path.join(__dirname, '..', 'src', 'bbl-standings.json');
const ARCHIVE_PATH = path.join(__dirname, 'bbl-teams-archive.json');

// Corrections appliquées à chaque run (géocodage aberrant, etc.) — clé = id d'équipe BBL.
const TEAM_OVERRIDES = {
  420: { location: 'Bamberg' }, // Bamberg Baskets : adresse du club à Strullendorf, salle à Bamberg
};

// Postes BBL -> libellés du panneau.
const POSITIONS = { POINT_GUARD: 'Guard', SHOOTING_GUARD: 'Guard', SMALL_FORWARD: 'Forward', POWER_FORWARD: 'Forward', CENTER: 'Center' };

// Couleurs de maillot (« gelb / blau ») -> hex ; le blanc n'est jamais pris comme couleur principale.
const SHIRT_COLORS = {
  gelb: 'FFD200', blau: '0046AD', dunkelblau: '0B2A5B', hellblau: '4FA3E0', marine: '0B2A5B', navy: '0B2A5B',
  rot: 'D40000', dunkelrot: '8B0000', bordeaux: '7B1E3A', weinrot: '7B1E3A', orange: 'F47216',
  grün: '008A3E', gruen: '008A3E', dunkelgrün: '0B5D2E', schwarz: '111111', anthrazit: '2F2F2F', grau: '808080',
  lila: '6A0DAD', violett: '6A0DAD', pink: 'E5007D', magenta: 'E5007D', türkis: '00B5B8', petrol: '005F6B',
  gold: 'C9A227', silber: 'A8A9AD', braun: '6B4423', beige: 'D9C7A5', weiß: 'FFFFFF', weiss: 'FFFFFF',
};
const shirtToHex = (s) => {
  const parts = String(s || '').toLowerCase().split(/[\/,\-–]+/).map((x) => x.trim()).filter(Boolean);
  const hex = parts.map((p) => SHIRT_COLORS[p]).filter(Boolean);
  return { color: hex.find((h) => h !== 'FFFFFF') || null, secondaryColor: hex.length > 1 ? hex[hex[0] === 'FFFFFF' ? 0 : 1] : null };
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Page Next.js -> props.pageProps (JSON serveur embarqué).
async function pageData(p) {
  for (let k = 1; k <= 3; k++) {
    const res = await fetch(SITE + p, { headers: HEADERS, redirect: 'follow' });
    if (res.ok) {
      const html = await res.text();
      const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (!m) throw new Error(`${p} -> pas de __NEXT_DATA__`);
      return JSON.parse(m[1]).props.pageProps;
    }
    if ((res.status === 429 || res.status >= 500) && k < 3) {
      await sleep(5000 * k);
      continue;
    }
    throw new Error(`${p} -> HTTP ${res.status}`);
  }
  return null;
}
const widget = (pp, name) => {
  const k = Object.keys(pp.preloadedWidgetData || {}).find((x) => x.startsWith(`acf/${name}`));
  return k ? pp.preloadedWidgetData[k] : null;
};

// Photon (komoot) d'abord, Nominatim en secours ; un résultat hors d'Allemagne est rejeté.
const inGermany = (g) => g && g.latitude > 47 && g.latitude < 55.2 && g.longitude > 5.5 && g.longitude < 15.3;
async function geocode(q) {
  const H = { 'User-Agent': 'ncaa-basket-map/1.0 (team@enemat.fr)' };
  try {
    await sleep(400);
    const r = await fetch('https://photon.komoot.io/api/?limit=1&q=' + encodeURIComponent(q), { headers: H });
    const j = await r.json();
    const f = j.features && j.features[0];
    if (f && f.geometry) {
      const g = { latitude: f.geometry.coordinates[1], longitude: f.geometry.coordinates[0] };
      if (inGermany(g)) return g;
    }
  } catch (e) {
    /* secours */
  }
  try {
    await sleep(1100);
    const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(q), { headers: H });
    const j = await r.json();
    const g = j[0] ? { latitude: +j[0].lat, longitude: +j[0].lon } : null;
    return inGermany(g) ? g : null;
  } catch (e) {
    return null;
  }
}
const r1 = (v) => (v != null ? Math.round(v * 10) / 10 : null);
const ageFrom = (birth) => {
  if (!birth) return null;
  const b = new Date(birth);
  const n = new Date();
  return n.getFullYear() - b.getFullYear() - (n < new Date(n.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0);
};
// « ALBA BERLIN\r\nCantianstraße 24\n10437 Berlin\r\n… » -> « Berlin »
const cityFromAddress = (a) => {
  const line = String(a || '').split(/[\r\n]+/).map((l) => l.trim()).find((l) => /^\d{5}\s+\S/.test(l));
  return line ? line.replace(/^\d{5}\s+/, '') : null;
};

(async () => {
  let active = [];
  try {
    active = JSON.parse(fs.readFileSync(TEAMS_PATH, 'utf8'));
  } catch (e) {
    console.log("(pas encore de bbl-teams.json : les clubs seront créés depuis le site)");
  }
  let archive = [];
  try {
    archive = JSON.parse(fs.readFileSync(ARCHIVE_PATH, 'utf8'));
  } catch (e) {
    /* pas d'archive */
  }
  const teams = [...active, ...archive];
  const byId = Object.fromEntries(teams.map((t) => [t.id, t]));

  // ── tableau : saison en cours + classement + liste des clubs ──
  const tab = await pageData('/saison/tabelle');
  const table = widget(tab, 'bbl-standings-table');
  if (!table || !table.standings) throw new Error('Widget bbl-standings-table introuvable sur /saison/tabelle');
  const season = table.activeSeasonId;
  const seasonLabel = `${season}-${String(season + 1).slice(2)}`;
  const nav = (tab.teamNavigatorData || []).filter((t) => (t.seasonIds || []).includes(season));
  console.log(`Saison: ${seasonLabel} — ${nav.length} clubs`);
  if (!nav.length) throw new Error('teamNavigatorData vide');

  // ── clubs : fiche, géocodage des nouveaux, effectif + stats (page équipe) ──
  const rosters = {};
  const allPlayers = [];
  const unknownPositions = new Set();
  for (const t of nav) {
    const id = String(t.id);
    const st = (t.seasonTeams || []).find((x) => x.seasonId === season) || {};
    const venues = st.seasonVenues || [];
    const main = venues.find((v) => v.isMain) || venues[0] || {};
    const city = cityFromAddress(t.address);
    let team = byId[id];
    if (!team) {
      const g = (main.name && (await geocode(`${main.name}, ${city || ''}, Deutschland`))) || (city && (await geocode(`${city}, Deutschland`))) || {};
      team = { id, latitude: g.latitude || null, longitude: g.longitude || null, honours: {} };
      teams.push(team);
      byId[id] = team;
      console.log(`  + nouveau club : ${t.nameFull} — ${main.name || '?'} @ ${city || '?'} [${team.latitude ? 'coords ok' : '⚠ SANS COORDS'}]`);
    }
    const tp = await pageData(`/teams/${id}/${season}`);
    const colors = shirtToHex((tp.seasonTeam || {}).shirtColors);
    Object.assign(team, {
      displayName: t.nameFull,
      shortDisplayName: t.nameShort || t.nameFull,
      division: 'bbl',
      code: t.tlc,
      logo: t.logoUrl,
      color: team.color || colors.color || null,
      secondaryColor: team.secondaryColor || colors.secondaryColor || null,
      venue: main.name || team.venue || null,
      capacity: main.capacity || team.capacity || null,
      location: city || team.location || null,
      website: t.homepageUrl || team.website || null,
      founded: t.yearEstablished || team.founded || null,
      arenaPhoto: team.arenaPhoto || null,
    });
    if (TEAM_OVERRIDES[id]) Object.assign(team, TEAM_OVERRIDES[id]);

    const players = ((tp.seasonTeam || {}).players || []).filter((p) => p.isVisible !== false);
    const statById = Object.fromEntries((tp.playerStatistics || []).map((s) => [String((s.seasonPlayer || {}).id), s]));
    rosters[id] = players.map((p) => {
      const s = statById[String(p.id)] || {};
      if (p.position && !(p.position in POSITIONS)) unknownPositions.add(p.position);
      const row = {
        code: String(p.id),
        firstName: p.firstName || '',
        lastName: p.lastName || '',
        photo: p.imageUrl || null,
        height: p.height ? Math.round(p.height < 3 ? p.height * 100 : p.height) : null,
        age: ageFrom(p.birthDate),
        nationality: (p.nationalities || [])[0] || null, // ISO2 (DE, US…)
        position: POSITIONS[p.position] || p.position || '',
        number: p.shirtNumber != null ? String(p.shirtNumber) : null,
        gp: s.gamesPlayed || 0,
        min: s.secondsPerGame != null ? r1(s.secondsPerGame / 60) : null,
        ppg: r1(s.pointsPerGame),
        rpg: r1(s.totalReboundsPerGame),
        apg: r1(s.assistsPerGame),
        spg: r1(s.stealsPerGame),
        bpg: r1(s.blocksPerGame),
        tov: r1(s.turnoversPerGame),
        p2: r1(s.twoPointShotSuccessPercent),
        p3: r1(s.threePointShotSuccessPercent),
        ft: r1(s.freeThrowsSuccessPercent),
        pir: r1(s.efficiencyPerGame),
        leagueRank: { pts: null, reb: null, ast: null },
      };
      allPlayers.push(row);
      return row;
    });
    console.log(`  ${t.nameFull}: ${rosters[id].length} joueurs (${(tp.playerStatistics || []).length} avec stats) — ${team.venue || '?'}, ${team.location || '?'}${colors.color ? ` #${colors.color}` : ''}`);
    await sleep(600);
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

  // ── classement (last10Outcomes : plus récent en premier) ──
  const standings = table.standings
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .map((r) => ({
      rank: r.rank,
      group: null,
      teamId: String((r.seasonTeam || {}).teamId || (r.seasonTeam || {}).id),
      name: (r.seasonTeam || {}).name || '?',
      wins: r.totalVictories,
      losses: r.totalLosses,
      winPct: r.totalVictoryPercentage,
      lastFive: (r.last10Outcomes || []).slice(0, 5).reverse(),
      pointsFor: r.totalGoalsMade,
      pointsAgainst: r.totalGoalsAgainst,
      diff: r.totalGoalDifference,
    }));

  const engaged = new Set(nav.map((t) => String(t.id)));
  const nextActive = teams.filter((t) => engaged.has(t.id));
  const nextArchive = teams.filter((t) => !engaged.has(t.id));
  for (const t of active.filter((t) => !engaged.has(t.id))) console.log(`  ↓ quitte la BBL (archivé) : ${t.displayName}`);
  for (const t of archive.filter((t) => engaged.has(t.id))) console.log(`  ↑ revient en BBL : ${t.displayName}`);

  const meta = { updated: new Date().toISOString().slice(0, 10), season: seasonLabel, source: 'easycredit-bbl.de' };
  fs.writeFileSync(TEAMS_PATH, JSON.stringify(nextActive, null, 2));
  fs.writeFileSync(ARCHIVE_PATH, JSON.stringify(nextArchive, null, 2) + '\n');
  fs.writeFileSync(ROSTERS_PATH, JSON.stringify({ ...meta, rosters }, null, 2));
  fs.writeFileSync(STANDINGS_PATH, JSON.stringify({ ...meta, standings }, null, 2));
  console.log(`\nClassement: ${standings.length} lignes\n→ ${TEAMS_PATH} (${nextActive.length} clubs)\n→ ${ROSTERS_PATH}\n→ ${STANDINGS_PATH}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
