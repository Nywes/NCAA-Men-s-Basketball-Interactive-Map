#!/usr/bin/env node
/**
 * Met à jour les données françaises depuis l'API officielle LNB (api-prod.lnb.fr) :
 *   - src/fr-rosters.json    : effectifs + stats moyennes par joueur
 *   - src/fr-standings.json  : classements Betclic ÉLITE et ÉLITE 2
 *   - src/fr-teams.json      : ajoute/rafraîchit l'id LNB de chaque club
 *
 * Usage : node scripts/update-fr-data.js
 * À relancer en début de saison ou après le mercato (l'API n'autorise pas
 * les appels cross-origin depuis le navigateur, d'où ces snapshots statiques).
 */
const fs = require('fs');
const path = require('path');

const API = 'https://api-prod.lnb.fr/';
const COMPETITIONS = [
  { extId: 302, division: 'elite' }, // Betclic ÉLITE
  { extId: 303, division: 'prob' }, // ÉLITE 2 (ex Pro B)
];

const TEAMS_PATH = path.join(__dirname, '..', 'src', 'fr-teams.json');
const ROSTERS_PATH = path.join(__dirname, '..', 'src', 'fr-rosters.json');
const STANDINGS_PATH = path.join(__dirname, '..', 'src', 'fr-standings.json');

// Nom d'équipe côté LNB -> displayName dans fr-teams.json (quand la
// correspondance floue ne suffit pas).
const NAME_OVERRIDES = {
  'chalon/saône': 'Élan Chalon',
  'chalon/saone': 'Élan Chalon',
  asvel: 'Lyon-Villeurbanne',
  'lyon-villeurbanne': 'Lyon-Villeurbanne',
  monaco: 'AS Monaco Basket',
  'le mans': 'Le Mans Sarthe Basket',
  'le portel': 'ESSM Le Portel',
  nancy: 'SLUC Nancy Basket',
  paris: 'Paris Basketball',
  'saint-quentin': 'Saint-Quentin Basket-Ball',
  boulazac: 'Boulazac Basket Dordogne',
  blois: 'ADA Blois',
  'gries-souffel': 'Alliance Sport Alsace',
  'gries souffel': 'Alliance Sport Alsace',
  souffelweyersheim: 'Alliance Sport Alsace',
  évreux: 'ALM Évreux Basket',
  evreux: 'ALM Évreux Basket',
  'aix-maurienne': 'AMSB',
  roanne: 'Chorale Roanne Basket',
  denain: 'Denain Voltaire Basket',
  'pau-lacq-orthez': 'Élan Béarnais',
  pau: 'Élan Béarnais',
  nantes: 'Hermine Nantes Basket',
  'hyères-toulon': 'HTV Basket',
  'hyeres-toulon': 'HTV Basket',
  vichy: 'JA Vichy',
  orléans: 'Orléans Loiret Basket',
  orleans: 'Orléans Loiret Basket',
  poitiers: 'Poitiers Basket 86',
  rouen: 'Rouen Métropole Basket',
  'saint-chamond': 'Saint-Chamond Basket',
  'la rochelle': 'Stade Rochelais Basket',
  quimper: 'UJAP Quimper 29',
  caen: 'Caen Basket Calvados',
  challans: 'Challans Basket',
  antibes: 'Antibes Sharks',
  'châlons-reims': 'Châlons-Reims',
  'chalons-reims': 'Châlons-Reims',
};

const norm = (s) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

// Couleurs officielles LNB -> color / secondaryColor / tertiaryColor.
// Si la couleur principale est quasi blanche (maillot domicile blanc), on la
// permute avec la secondaire pour garder un en-tête de modale teinté.
const cleanHex = (c) => {
  const h = (c || '').replace('#', '').trim().toUpperCase();
  return /^[0-9A-F]{6}$/.test(h) ? h : null;
};
const isNearWhite = (h) => {
  if (!h) return false;
  const v = [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16));
  return (v[0] * 299 + v[1] * 587 + v[2] * 114) / 1000 > 230;
};
function syncColors(team, lt) {
  let primary = cleanHex(lt.colour_primary);
  let secondary = cleanHex(lt.colour_secondary);
  const tertiary = cleanHex(lt.colour_tertiary);
  if (!primary && !secondary && !tertiary) return; // rien côté LNB -> on garde l'existant
  if (isNearWhite(primary) && secondary && !isNearWhite(secondary)) {
    [primary, secondary] = [secondary, primary];
  }
  team.color = primary || team.color || null;
  team.secondaryColor = secondary || null;
  team.tertiaryColor = tertiary || null;
  delete team.alternateColor;
}

async function get(endpoint) {
  const res = await fetch(API + endpoint, { headers: { language_code: 'fr' } });
  if (!res.ok) throw new Error(`${endpoint} -> HTTP ${res.status}`);
  return res.json();
}

async function post(endpoint, body) {
  const res = await fetch(API + endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', language_code: 'fr' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${endpoint} -> HTTP ${res.status}`);
  return res.json();
}

// Retrouve le club fr-teams correspondant à un nom d'équipe LNB.
function matchTeam(teams, lnbName) {
  const key = norm(lnbName);
  const overridden = NAME_OVERRIDES[key];
  if (overridden) return teams.find((t) => t.displayName === overridden);
  return teams.find(
    (t) =>
      norm(t.displayName) === key ||
      norm(t.displayName).includes(key) ||
      key.includes(norm(t.location))
  );
}

(async () => {
  const teams = JSON.parse(fs.readFileSync(TEAMS_PATH, 'utf8'));
  const rosters = {};
  const standings = {};

  // Libellé de saison ("2025-26") déduit de la date de fin de la compétition ÉLITE.
  let season = '';
  try {
    const { data: comps } = await get('competition/getMainCompetition');
    const elite = (comps || []).find((c) => c.external_id === COMPETITIONS[0].extId) || comps?.[0];
    if (elite?.end_date) {
      const endYear = new Date(elite.end_date).getFullYear();
      season = `${endYear - 1}-${String(endYear).slice(2)}`;
    }
  } catch (e) {
    console.warn('Saison non déterminée:', e.message);
  }
  console.log('Saison:', season || '(inconnue)');

  for (const comp of COMPETITIONS) {
    // ── équipes de la compétition -> ids LNB ──
    const { data: lnbTeams } = await get(
      `competition/getCompetitionTeams?competition_external_id=${comp.extId}`
    );
    console.log(`\n${comp.division}: ${lnbTeams.length} équipes LNB`);

    const byLnbId = {};
    for (const lt of lnbTeams) {
      const team = matchTeam(teams, lt.team_name);
      if (!team) {
        console.warn(`  ⚠ non appariée: "${lt.team_name}" (external_id ${lt.external_id})`);
        continue;
      }
      team.lnbId = lt.external_id;
      syncColors(team, lt);
      byLnbId[lt.external_id] = team;
    }

    // ── effectifs ──
    for (const lt of lnbTeams) {
      const team = byLnbId[lt.external_id];
      if (!team) continue;
      const { data: players } = await get(`teams/getRoster?team_external_id=${lt.external_id}`);
      rosters[team.id] = (players || []).map((p) => ({
        personId: p.person.external_id ?? null,
        firstName: p.person.first_name || '',
        lastName: p.person.family_name || '',
        photo: p.person.photo?.sm || p.person.photo?.md || null,
        age: p.person.age ?? null,
        height: p.person.height ?? null,
        nationality: p.person.nationality_code || null,
        position: p.player_role?.playing_position || '',
        number: p.player_role?.shirt_number || null,
        ppg: p.s_points_average ?? null,
        rpg: p.s_rebounds_total_average ?? null,
        apg: p.s_assists_average ?? null,
        eval: p.s_efficiency_custom_average ?? null,
      }));
      console.log(`  ${team.displayName}: ${rosters[team.id].length} joueurs`);
      await new Promise((r) => setTimeout(r, 400));
    }

    // ── stats complètes (interceptions, contres, minutes, adresse…) ──
    // Un seul appel par division : table de tous les joueurs qualifiés, jointe
    // aux effectifs par person.external_id.
    const statsYear = season ? parseInt(season.slice(0, 4), 10) : new Date().getFullYear();
    const criterion = await post('altrstats/getPersonCriterion', {
      competitionExternalId: comp.extId,
      year: statsYear,
    });
    const statsById = {};
    for (const row of criterion.data || []) {
      if (row.person?.external_id != null) statsById[row.person.external_id] = row;
    }
    let joined = 0;
    for (const lt of lnbTeams) {
      const team = byLnbId[lt.external_id];
      if (!team) continue;
      for (const player of rosters[team.id] || []) {
        const s = statsById[player.personId];
        if (!s) continue;
        joined += 1;
        Object.assign(player, {
          ppg: s.s_points_average ?? player.ppg,
          rpg: s.s_rebounds_total_average ?? player.rpg,
          apg: s.s_assists_average ?? player.apg,
          eval: s.s_efficiency_average ?? player.eval,
          gp: s.s_games ?? null,
          min: s.s_minutes_average ?? null,
          spg: s.s_steals_average ?? null,
          bpg: s.s_blocks_average ?? null,
          tov: s.s_turnovers_average ?? null,
          p2: s.s_two_pointers_percentage ?? null,
          p3: s.s_three_pointers_percentage ?? null,
          ft: s.s_free_throws_percentage ?? null,
        });
      }
    }
    console.log(`  stats complètes jointes: ${joined} joueurs`);

    // ── classement ──
    const standing = await post('altrstats/getStandingByCompetition', {
      competition_external_id: comp.extId,
      competition_filter_name: 'overall',
      round_numbers: [],
    });
    const rows = standing.data?.[0]?.data || [];
    standings[comp.division] = rows.map((r) => {
      const team = byLnbId[r.team?.external_id] || null;
      return {
        rank: r.rank,
        teamId: team ? team.id : null,
        name: team ? team.displayName : r.team?.team_name || '?',
        wins: r.s_wins,
        losses: r.s_losses,
        winPct: r.s_wins_average ?? null, // % de victoires (ex: 73.33)
        // 5 derniers matchs, du plus ancien au plus récent : 'W' | 'L'
        lastFive: (r.last_five_details || []).map((m) => (m.result_placing === 1 ? 'W' : 'L')),
        pointsFor: r.s_points,
        pointsAgainst: r.s_points_against,
        diff: r.plus_minus,
      };
    });
    console.log(`  classement: ${standings[comp.division].length} lignes`);
  }

  const meta = {
    updated: new Date().toISOString().slice(0, 10),
    season,
    source: 'api-prod.lnb.fr',
  };
  fs.writeFileSync(ROSTERS_PATH, JSON.stringify({ ...meta, rosters }, null, 2));
  fs.writeFileSync(STANDINGS_PATH, JSON.stringify({ ...meta, standings }, null, 2));
  fs.writeFileSync(TEAMS_PATH, JSON.stringify(teams, null, 2));
  console.log(`\n→ ${ROSTERS_PATH}\n→ ${STANDINGS_PATH}\n→ ids LNB écrits dans fr-teams.json`);
})();
