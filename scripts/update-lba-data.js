#!/usr/bin/env node
/**
 * Serie A italienne (LBA) depuis l'API interne du site legabasket.it
 * (JSON public, sans clé ; images sur le CDN S3 lba-media) :
 *   - src/lba-teams.json      : clubs (logo, salle, ville, coords)
 *   - src/lba-rosters.json    : effectifs + moyennes de la saison (même format qu'EuroLeague)
 *   - src/lba-standings.json  : classement
 * La saison en cours = championnat « Regular Season » marqué current par l'API.
 * Les ids d'équipe changent chaque saison : nos clubs sont indexés par `club_id`
 * (stable). Nouveaux clubs géocodés automatiquement (Photon), corrections
 * manuelles dans TEAM_OVERRIDES.
 *
 * Usage : node scripts/update-lba-data.js
 */
const fs = require('fs');
const path = require('path');

const BASE = 'https://www.legabasket.it/api';
const CDN = 'https://lba-media.s3.eu-south-1.amazonaws.com';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';
const HEADERS = { 'User-Agent': UA, Accept: 'application/json', Referer: 'https://www.legabasket.it/' };

const TEAMS_PATH = path.join(__dirname, '..', 'src', 'lba-teams.json');
const ROSTERS_PATH = path.join(__dirname, '..', 'src', 'lba-rosters.json');
const STANDINGS_PATH = path.join(__dirname, '..', 'src', 'lba-standings.json');
const ARCHIVE_PATH = path.join(__dirname, 'lba-teams-archive.json');

// Corrections appliquées à chaque run (géocodage aberrant, etc.) — clé = club_id.
const TEAM_OVERRIDES = {
  61: { location: 'Venezia' }, // Reyer : l'API indique « Annone Veneto » pour le Taliercio (Mestre)
};

// Postes LBA (italien) -> libellés du panneau.
const POSITIONS = {
  Playmaker: 'Guard',
  Guardia: 'Guard',
  'Play/Guardia': 'Guard',
  'Guardia/Ala': 'Guard-Forward',
  Ala: 'Forward',
  'Ala/Centro': 'Forward-Center',
  Centro: 'Center',
  '-': '',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url) {
  for (let k = 1; k <= 3; k++) {
    const res = await fetch(url, { headers: HEADERS });
    if (res.ok) {
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('json')) return res.json();
      throw new Error(`${url} -> réponse non JSON (${ct.split(';')[0]})`);
    }
    if ((res.status === 429 || res.status >= 500) && k < 3) {
      await sleep(5000 * k);
      continue;
    }
    throw new Error(`${url} -> HTTP ${res.status}`);
  }
  return null;
}
// Images du CDN : variante « thumb » (logo 220 px, photo 160x211), le fichier brut étant très lourd.
const img = (key) => (key ? `${CDN}/variants/${key}/thumb` : null);

// Photon (komoot) d'abord, Nominatim en secours ; un résultat hors d'Italie est rejeté.
const inItaly = (g) => g && g.latitude > 35 && g.latitude < 48 && g.longitude > 6 && g.longitude < 19;
async function geocode(q) {
  const H = { 'User-Agent': 'ncaa-basket-map/1.0 (team@enemat.fr)' };
  try {
    await sleep(400);
    const r = await fetch('https://photon.komoot.io/api/?limit=1&q=' + encodeURIComponent(q), { headers: H });
    const j = await r.json();
    const f = j.features && j.features[0];
    if (f && f.geometry) {
      const g = { latitude: f.geometry.coordinates[1], longitude: f.geometry.coordinates[0] };
      if (inItaly(g)) return g;
    }
  } catch (e) {
    /* secours */
  }
  try {
    await sleep(1100);
    const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(q), { headers: H });
    const j = await r.json();
    const g = j[0] ? { latitude: +j[0].lat, longitude: +j[0].lon } : null;
    return inItaly(g) ? g : null;
  } catch (e) {
    return null;
  }
}
const avg = (sum, gp, d = 1) => (gp > 0 && sum != null ? Math.round((sum / gp) * 10 ** d) / 10 ** d : null);
const pct = (v) => (v != null ? Math.round(v * 10) / 10 : null);
const ageFrom = (birth) => {
  if (!birth) return null;
  const b = new Date(birth);
  const n = new Date();
  return n.getFullYear() - b.getFullYear() - (n < new Date(n.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0);
};

(async () => {
  let active = [];
  try {
    active = JSON.parse(fs.readFileSync(TEAMS_PATH, 'utf8'));
  } catch (e) {
    console.log("(pas encore de lba-teams.json : les clubs seront créés depuis l'API)");
  }
  let archive = [];
  try {
    archive = JSON.parse(fs.readFileSync(ARCHIVE_PATH, 'utf8'));
  } catch (e) {
    /* pas d'archive */
  }
  const teams = [...active, ...archive];
  const byId = Object.fromEntries(teams.map((t) => [t.id, t]));

  // ── saison en cours = « Regular Season » (ctype RS) la plus récente parmi les championnats courants ──
  const comps = (await get(`${BASE}/championships/get-championships?current=1&items=1000`)).competitions || [];
  const rs = comps.filter((c) => c.ctype_code === 'RS' && c.championship_series_id === 1).sort((a, b) => b.year - a.year)[0];
  if (!rs) throw new Error('Aucune Regular Season courante dans get-championships');
  const champId = rs.id;
  const seasonLabel = `${rs.year}-${String(rs.year + 1).slice(2)}`;
  console.log(`Saison: ${seasonLabel} (${rs.full_name}, id ${champId})`);

  const apiTeams = ((await get(`${BASE}/teams/get-teams?items=50`)).teams || []).filter((t) => t.year === rs.year);
  const clubByTeamId = Object.fromEntries(apiTeams.map((t) => [t.id, String(t.club_id)]));
  console.log(`${apiTeams.length} clubs`);

  // ── calendrier : salle + ville des matchs à domicile, résultats joués (forme) ──
  const home = {}; // team_id -> { venue, city }
  const results = {}; // team_id -> [{ date, win }]
  const first = await get(`${BASE}/championships/get-championships-calendar-by-id?id=${champId}&d=1`);
  const nDays = ((first.filters || {}).days || []).length || 30;
  for (let d = 1; d <= nDays; d++) {
    const cal = d === 1 ? first : await get(`${BASE}/championships/get-championships-calendar-by-id?id=${champId}&d=${d}`);
    let played = 0;
    for (const m of cal.matches || []) {
      if (m.plant_name && !home[m.h_team_id]) home[m.h_team_id] = { venue: m.plant_name, city: m.town_name || null };
      // matchs futurs : scores à 0 mais game_status '0' → seuls les matchs terminés ('2') comptent
      if (String(m.game_status) === '2' && m.home_final_score != null && m.visitor_final_score != null) {
        played++;
        (results[m.h_team_id] = results[m.h_team_id] || []).push({ date: m.match_datetime, win: m.home_final_score > m.visitor_final_score });
        (results[m.v_team_id] = results[m.v_team_id] || []).push({ date: m.match_datetime, win: m.visitor_final_score > m.home_final_score });
      }
    }
    const allVenues = apiTeams.every((t) => home[t.id]);
    if (!played && allVenues) break; // journées futures : plus rien à apprendre
    await sleep(300);
  }

  // ── clubs : fiche, géocodage des nouveaux, effectif + stats ──
  const rosters = {};
  const allPlayers = [];
  const unknownRoles = new Set();
  for (const t of apiTeams) {
    const id = String(t.club_id);
    const h = home[t.id] || {};
    let team = byId[id];
    if (!team) {
      const g = (h.venue && (await geocode(`${h.venue}, ${h.city || ''}, Italia`))) || (h.city && (await geocode(`${h.city}, Italia`))) || {};
      team = { id, latitude: g.latitude || null, longitude: g.longitude || null, honours: {} };
      teams.push(team);
      byId[id] = team;
      console.log(`  + nouveau club : ${t.name} — ${h.venue || '?'} @ ${h.city || '?'} [${team.latitude ? 'coords ok' : '⚠ SANS COORDS'}]`);
    }
    Object.assign(team, {
      displayName: t.name,
      shortDisplayName: t.name,
      division: 'lba',
      code: t.club_code,
      logo: img(t.logo_key),
      color: team.color || null, // l'API ne donne pas les couleurs : accent de la compétition par défaut
      secondaryColor: null,
      venue: h.venue || team.venue || null,
      location: h.city || team.location || null,
      capacity: team.capacity || null,
      website: team.website || null,
    });
    if (TEAM_OVERRIDES[id]) Object.assign(team, TEAM_OVERRIDES[id]);

    const roster = (await get(`${BASE}/teams/get-team-roster?id=${t.id}`)).players || [];
    await sleep(300);
    const stats = (await get(`${BASE}/teams/get-team-players-stats?id=${t.id}`)).players || [];
    const statById = Object.fromEntries(stats.map((s) => [s.player_id, s]));
    rosters[id] = roster.map((p) => {
      const s = statById[p.id] || {};
      const gp = s.played_matches || 0;
      if (p.player_role && !(p.player_role in POSITIONS)) unknownRoles.add(p.player_role);
      const row = {
        code: String(p.id),
        firstName: p.name || '',
        lastName: p.surname || '',
        photo: img(p.player_picture_key),
        height: p.height || null,
        age: ageFrom(p.birth_date),
        nationality: p.country || null, // code ISO3 (ITA, USA, SVN…)
        position: POSITIONS[p.player_role] ?? p.player_role ?? '',
        number: p.player_number || null,
        gp,
        min: avg(s.played_minutes_sum, gp),
        ppg: avg(s.points_sum, gp),
        rpg: avg(s.total_rebound_sum, gp),
        apg: avg(s.assists_sum, gp),
        spg: avg(s.regain_balls_sum, gp),
        bpg: avg(s.ball_stop_given_sum, gp),
        tov: avg(s.lost_balls_sum, gp),
        p2: pct(s.shots_2p_perc_sum),
        p3: pct(s.shots_3p_perc_sum),
        ft: pct(s.free_throws_perc_sum),
        pir: avg(s.rating_lega_sum, gp),
        leagueRank: { pts: null, reb: null, ast: null },
      };
      allPlayers.push(row);
      return row;
    });
    console.log(`  ${t.name}: ${rosters[id].length} joueurs (${stats.length} avec stats) — ${team.venue || '?'}, ${team.location || '?'}`);
    await sleep(300);
  }
  if (unknownRoles.size) console.log(`  ⚠ postes inconnus (à ajouter dans POSITIONS) : ${[...unknownRoles].join(', ')}`);

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
  const rk = await get(`${BASE}/championships/get-championship-ranking?id=${champId}`);
  const standings = (rk.standings || [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((r) => {
      const form = (results[r.team_id] || []).sort((a, b) => a.date.localeCompare(b.date)).slice(-5);
      return {
        rank: r.position,
        group: null,
        teamId: clubByTeamId[r.team_id] || String(r.team_id),
        name: r.team_name,
        wins: r.wins,
        losses: r.defeats,
        winPct: r.game_played ? Math.round((r.wins / r.game_played) * 1000) / 10 : 0, // en %
        lastFive: form.map((m) => (m.win ? 'W' : 'L')),
        pointsFor: r.points_made,
        pointsAgainst: r.points_suffered,
        diff: r.points_made - r.points_suffered,
      };
    });

  const engaged = new Set(apiTeams.map((t) => String(t.club_id)));
  const nextActive = teams.filter((t) => engaged.has(t.id));
  const nextArchive = teams.filter((t) => !engaged.has(t.id));
  for (const t of active.filter((t) => !engaged.has(t.id))) console.log(`  ↓ quitte la Serie A (archivé) : ${t.displayName}`);
  for (const t of archive.filter((t) => engaged.has(t.id))) console.log(`  ↑ revient en Serie A : ${t.displayName}`);

  const meta = { updated: new Date().toISOString().slice(0, 10), season: seasonLabel, source: 'legabasket.it' };
  fs.writeFileSync(TEAMS_PATH, JSON.stringify(nextActive, null, 2));
  fs.writeFileSync(ARCHIVE_PATH, JSON.stringify(nextArchive, null, 2) + '\n');
  fs.writeFileSync(ROSTERS_PATH, JSON.stringify({ ...meta, rosters }, null, 2));
  fs.writeFileSync(STANDINGS_PATH, JSON.stringify({ ...meta, standings }, null, 2));
  console.log(`\nClassement: ${standings.length} lignes\n→ ${TEAMS_PATH} (${nextActive.length} clubs)\n→ ${ROSTERS_PATH}\n→ ${STANDINGS_PATH}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
