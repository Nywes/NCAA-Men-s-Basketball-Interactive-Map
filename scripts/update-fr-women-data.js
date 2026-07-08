#!/usr/bin/env node
/**
 * Données du basket FÉMININ français depuis l'API officielle FFBB (api.ffbb.app, Directus) :
 *   - src/fr-women-teams.json      : clubs (logo, salle, ville, coords géocodées, site)
 *   - src/fr-women-standings.json  : classements Wonderligue (D1) et LF2 (D2)
 *
 * Pas de rosters/stats joueuses (pas d'API JSON propre côté féminin — volontairement écarté).
 * Le token FFBB est PUBLIC mais récupéré dynamiquement (il peut tourner).
 * Coords : géocodage via la Base Adresse Nationale (api-adresse.data.gouv.fr, sans clé).
 *
 * Usage : node scripts/update-fr-women-data.js
 */
const fs = require('fs');
const path = require('path');

const API = 'https://api.ffbb.app/';
const SEASON = '2025-26';
const DIVISIONS = [
  { division: 'd1', pouleId: '200000003017633' }, // La Boulangère Wonderligue
  { division: 'd2', pouleId: '200000003017634' }, // Ligue Féminine 2
];

const TEAMS_PATH = path.join(__dirname, '..', 'src', 'fr-women-teams.json');
const STANDINGS_PATH = path.join(__dirname, '..', 'src', 'fr-women-standings.json');
const OUT_DIR = process.env.FRW_OUT || path.join(__dirname, '..', 'src');
const outTeams = path.join(OUT_DIR, 'fr-women-teams.json');
const outStandings = path.join(OUT_DIR, 'fr-women-standings.json');

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

// Noms d'affichage propres (l'API FFBB renvoie des MAJUSCULES sans accents).
const NAME_OVERRIDES = {
  // D1 — La Boulangère Wonderligue
  '492001004613': { name: 'Basket Landes', short: 'Basket Landes' },
  '9817': { name: 'Bourges Basket', short: 'Bourges' },
  '10045': { name: 'Flammes Carolo Basket', short: 'Charleville' },
  '9603': { name: 'Landerneau Bretagne Basket', short: 'Landerneau' },
  '10596': { name: 'BLMA (Lattes-Montpellier)', short: 'Lattes-Montpellier' },
  '10276': { name: "ESB Villeneuve-d'Ascq", short: "Villeneuve-d'Ascq" },
  '9411': { name: 'Charnay Basket Bourgogne Sud', short: 'Charnay' },
  '9849': { name: "C'Chartres Basket Féminin", short: 'Chartres' },
  '9196': { name: 'Roche Vendée Basket', short: 'La Roche-sur-Yon' },
  '11158': { name: 'Lyon ASVEL Féminin', short: 'Lyon' },
  '405001018666': { name: 'Toulouse Métropole Basket', short: 'Toulouse' },
  '17001062691': { name: 'Union Féminine Angers Basket 49', short: 'Angers' },
  // D2 — Ligue Féminine 2
  '7924': { name: 'BC La Tronche-Meylan', short: 'Meylan' },
  '200000002674033': { name: 'Pays Voironnais Basket', short: 'Voiron' },
  '10938': { name: 'Montbrison Féminines Basket', short: 'Montbrison' },
  '10710': { name: 'Feytiat Basket 87', short: 'Feytiat' },
  '200000002673011': { name: 'Monaco Basket', short: 'Monaco' },
  '10354': { name: 'Saint-Amand Hainaut Basket', short: 'Saint-Amand' },
  '11415': { name: 'USO Mondeville', short: 'Mondeville' },
  '10108': { name: 'Champagne Basket Féminin', short: 'Reims' },
  '11347': { name: 'GCO Bihorel', short: 'Bihorel' },
  '10210': { name: 'AS Aulnoye', short: 'Aulnoye' },
  '71001005255': { name: 'Cavigal Nice Basket 06', short: 'Nice' },
  '8053': { name: 'SI Graffenstaden', short: 'Graffenstaden' },
  '11282': { name: 'Aplemont Le Havre Basket', short: 'Le Havre' },
  '11521': { name: 'Centre Fédéral (INSEP)', short: 'Paris' },
};
// Coords manuelles là où la Base Adresse Nationale ne couvre pas (hors France).
const COORDS_OVERRIDES = {
  '200000002673011': { latitude: 43.7384, longitude: 7.4246 }, // Monaco
};
// Logos officiels TRANSPARENTS via Proballers (source unique et cohérente pour
// les 26 clubs). Clé = id FFBB (organisme) -> id Proballers (endpoint getTeamLogo,
// ouvert, PNG transparent). Ids relevés sur basketlfb.com / lf2.ffbb.com (/equipe/{id}).
const PROBALLERS_ID = {
  // D1 Wonderligue
  '492001004613': 2653, // Basket Landes
  '9817': 2654, // Bourges
  '10045': 2656, // Flammes Carolo (Charleville)
  '9603': 13330, // Landerneau
  '10596': 2658, // BLMA (Lattes-Montpellier)
  '10276': 2664, // ESB Villeneuve-d'Ascq
  '9411': 13378, // Charnay
  '9849': 13659, // Chartres
  '9196': 449, // Roche Vendée
  '11158': 2659, // Lyon ASVEL Féminin
  '405001018666': 446, // Toulouse Métropole
  '17001062691': 2941, // UFAB Angers
  // D2 Ligue Féminine 2
  '7924': 13658, // BC La Tronche-Meylan
  '200000002674033': 14708, // Voiron
  '10938': 13657, // Montbrison
  '10710': 14901, // Feytiat
  '200000002673011': 14717, // Monaco
  '10354': 2657, // Saint-Amand
  '11415': 2660, // Mondeville
  '10108': 13655, // Champagne (Reims)
  '11347': 15455, // GCO Bihorel
  '10210': 13660, // AS Aulnoye
  '71001005255': 2662, // Cavigal Nice
  '8053': 13653, // SI Graffenstaden (Illkirch)
  '11282': 15342, // Aplemont Le Havre
  '11521': 13656, // Centre Fédéral (INSEP)
};
const proballersLogo = (pbId) => `https://www.proballers.com/api/getTeamLogo?id=${pbId}&width=200`;

const PARTICLES = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'sur', 'sous', 'en', 'et', 'd', 'l', 'au', 'aux', 'a']);
// Titre FR : capitalise chaque mot sauf les particules (garde -, ', espaces).
const titleCase = (s) =>
  (s || '')
    .toLowerCase()
    .split(/([\s\-'])/)
    .map((w, i) => {
      if (/^[\s\-']$/.test(w) || w === '') return w;
      if (PARTICLES.has(w) && i !== 0) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join('');
const cleanName = (raw) => {
  let s = (raw || '').replace(/\s+-\s+\d+$/, '').trim(); // "... - 1" (équipe réserve)
  s = s.replace(/\b(SASP|SAOS|EUSRL|ASSOCIATION|BASKET BALL|BASKET-BALL|CLUB|ELITE)\b/gi, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return titleCase(s);
};

async function ffbb(endpoint, token) {
  const res = await fetch(API + endpoint, {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': UA,
      Accept: 'application/json',
      Origin: 'https://competitions.ffbb.com',
      Referer: 'https://competitions.ffbb.com/',
    },
  });
  if (!res.ok) throw new Error(`${endpoint} -> HTTP ${res.status}`);
  return res.json();
}

async function getToken() {
  const res = await fetch(API + 'items/configuration', {
    headers: { 'User-Agent': UA, Accept: 'application/json', Referer: 'https://competitions.ffbb.com/' },
  });
  const j = await res.json();
  const t = j.data && j.data.key_dh;
  if (!t) throw new Error('token FFBB introuvable');
  return t;
}

// Géocodage FR via Base Adresse Nationale (gratuit, sans clé).
async function geocode(query, postcode) {
  try {
    const url =
      'https://api-adresse.data.gouv.fr/search/?limit=1&q=' +
      encodeURIComponent(query) +
      (postcode ? `&postcode=${postcode}` : '');
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    const j = await r.json();
    const f = j.features && j.features[0];
    if (f && f.geometry && f.geometry.coordinates) {
      const [lon, lat] = f.geometry.coordinates;
      return { latitude: lat, longitude: lon };
    }
  } catch (e) {
    /* ignore */
  }
  return null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const token = await getToken();
  console.log('Token FFBB OK.');

  // Réutilise les coords déjà géocodées (évite de re-géocoder à chaque run).
  let prevCoords = {};
  try {
    const prev = JSON.parse(fs.readFileSync(TEAMS_PATH, 'utf8'));
    prev.forEach((t) => (prevCoords[t.id] = { latitude: t.latitude, longitude: t.longitude }));
  } catch (e) {
    /* premier run */
  }

  const teams = [];
  const standings = {};

  for (const { division, pouleId } of DIVISIONS) {
    const poule = await ffbb(
      `items/ffbbserver_poules/${pouleId}?fields=nom,classements.position,classements.points,classements.gagnes,classements.perdus,classements.paniersMarques,classements.paniersEncaisses,classements.difference,classements.organisme_nom,classements.organisme.id,classements.organisme.logo`,
      token
    );
    const rows = (poule.data.classements || []).sort((a, b) => +a.position - +b.position);
    console.log(`\n${division}: ${rows.length} équipes (${poule.data.nom})`);

    standings[division] = [];
    for (const r of rows) {
      const org = r.organisme || {};
      const orgId = String(org.id);
      const wins = +r.gagnes || 0;
      const losses = +r.perdus || 0;
      const gp = wins + losses;

      // ── club (salle, ville, adresse, site) ──
      let venue = null,
        city = null,
        capacity = null,
        website = null,
        address = null,
        postcode = null;
      try {
        const o = (
          await ffbb(
            `items/ffbbserver_organismes/${orgId}?fields=nom,nom_simple,salle,commune,adresse,urlSiteWeb`,
            token
          )
        ).data;
        address = o.adresse || null;
        website = (o.urlSiteWeb || '').replace(/^https?:\/\//, '').replace(/\/$/, '') || null;
        if (o.salle) {
          const s = (
            await ffbb(
              `items/ffbbserver_salles/${o.salle}?fields=libelle,capaciteSpectateur,adresse`,
              token
            )
          ).data;
          venue = s.libelle ? titleCase(s.libelle) : null;
          capacity = s.capaciteSpectateur || null;
          if (s.adresse) address = s.adresse;
        }
        if (o.commune) {
          const c = (
            await ffbb(`items/ffbbserver_communes/${o.commune}?fields=libelle,codePostal`, token)
          ).data;
          city = c.libelle ? titleCase(c.libelle) : null;
          postcode = c.codePostal || null;
        }
      } catch (e) {
        console.warn(`  ⚠ club ${orgId}: ${e.message}`);
      }

      // ── coords (override manuel > réutilise si connues > géocode) ──
      let coords = COORDS_OVERRIDES[orgId] || prevCoords[orgId];
      if (!coords || coords.latitude == null) {
        const q = [address, city].filter(Boolean).join(' ') || city || r.organisme_nom;
        coords = (await geocode(q, postcode)) ||
          (city ? await geocode(city, postcode) : null) || { latitude: null, longitude: null };
        await sleep(200);
      }

      const ov = NAME_OVERRIDES[orgId];
      const displayName = ov ? ov.name : cleanName(r.organisme_nom);
      teams.push({
        id: orgId,
        displayName,
        shortDisplayName: ov ? ov.short : city || displayName,
        division,
        latitude: coords.latitude,
        longitude: coords.longitude,
        logo: PROBALLERS_ID[orgId]
          ? proballersLogo(PROBALLERS_ID[orgId])
          : org.logo
          ? `${API}assets/${org.logo}`
          : null,
        venue,
        location: city,
        color: null, // FFBB ne fournit pas les couleurs -> défaut côté UI
        capacity: capacity ? String(capacity) : null,
        website,
      });

      standings[division].push({
        rank: +r.position,
        teamId: orgId,
        name: displayName,
        wins,
        losses,
        winPct: gp ? (wins / gp) * 100 : null,
        pointsFor: +r.paniersMarques || null,
        pointsAgainst: +r.paniersEncaisses || null,
        diff: r.difference != null ? +r.difference : null,
        lastFive: [],
      });
      console.log(`  ${r.position}. ${displayName} (${wins}-${losses}) ${venue || '—'} @ ${city || '?'} [${coords.latitude ? '📍' : 'no geo'}]`);
    }
  }

  const meta = { updated: new Date().toISOString().slice(0, 10), season: SEASON, source: 'api.ffbb.app' };
  fs.writeFileSync(outTeams, JSON.stringify(teams, null, 2) + '\n');
  fs.writeFileSync(outStandings, JSON.stringify({ ...meta, standings }, null, 2) + '\n');
  console.log(`\n→ ${outTeams} (${teams.length} clubs)\n→ ${outStandings}`);
})();
