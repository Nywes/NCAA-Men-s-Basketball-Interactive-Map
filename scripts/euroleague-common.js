// Partagé par les scripts update-euroleague-*.js : accès API, saison en cours,
// villes des Final Four. L'API officielle est gratuite et sans clé.
const BASE = 'https://api-live.euroleague.net';
const COMPETITION = 'E'; // E = EuroLeague, U = EuroCup
const UA = 'Mozilla/5.0 (compatible; ncaa-basket-map/1.0)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// L'API limite le débit en rafale (429) : 3 tentatives avec pause croissante.
async function get(url, { optional = false } = {}) {
  for (let k = 1; k <= 4; k++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (res.ok) return res.json();
    if ((res.status === 429 || res.status >= 500) && k < 4) {
      await sleep(30000 * k); // 30 s, 60 s, 90 s : la limite se réarme lentement
      continue;
    }
    if (optional) return null;
    throw new Error(`${url} -> HTTP ${res.status}`);
  }
  return null;
}

// Saison en cours = celle dont la fenêtre [startDate, endDate] (1er juillet ->
// 30 juin) contient aujourd'hui. Surcharge possible : EL_SEASON=E2025.
// Renvoie { code: 'E2026', alias: '2026-27', year: 2026, seasons: [{code, alias, year}...] }.
async function resolveSeason(competition = COMPETITION) {
  const res = await get(`${BASE}/v2/competitions/${competition}/seasons`);
  const seasons = (res.data || res)
    .map((s) => ({ code: s.code, alias: s.alias || s.name, year: s.year, start: s.startDate, end: s.endDate }))
    .sort((a, b) => a.year - b.year);
  const forced = process.env.EL_SEASON;
  const now = new Date();
  const current =
    (forced && seasons.find((s) => s.code === forced)) ||
    seasons.find((s) => new Date(s.start) <= now && now <= new Date(s.end)) ||
    seasons.filter((s) => new Date(s.start) <= now).pop();
  if (!current) throw new Error(`Saison ${competition} en cours introuvable`);
  return { ...current, seasons };
}

// L'API ne renseigne pas la ville des salles de Final Four -> table par nom.
const FINAL_FOUR_CITIES = {
  'OLYMPIYSKY ARENA': 'Moscow',
  'SAZKA ARENA': 'Prague',
  OAKA: 'Athens',
  'PAB. DEP. COMUNIDAD DE MADRID': 'Madrid',
  'PALACIO DE DEPORTES COMUNIDAD DE MADRID': 'Madrid',
  'O2 WORLD': 'Berlin',
  'PALAIS OMNISPORTS DE PARIS-BERCY': 'Paris',
  'PALAU SANT JORDI': 'Barcelona',
  'SINAN ERDEM DOME': 'Istanbul',
  'O2 ARENA': 'London',
  'MEDIOLANUM FORUM': 'Milan',
  'BARCLAYCARD CENTER': 'Madrid',
  'MERCEDES-BENZ ARENA': 'Berlin',
  'STARK ARENA': 'Belgrade',
  'FERNANDO BUESA ARENA': 'Vitoria-Gasteiz',
  'LANXESS ARENA': 'Cologne',
  'ZALGIRIO ARENA': 'Kaunas',
  'UBER ARENA': 'Berlin',
  'ETIHAD ARENA': 'Abu Dhabi',
  'TELEKOM CENTER ATHENS': 'Athens',
};

// Final Four pas encore dans l'API (saison en cours) : à compléter à la main
// chaque été dès l'annonce officielle (cf. MISE_A_JOUR_ANNUELLE.md).
const UPCOMING_FINAL_FOUR = {
  E2026: { venue: 'Etihad Arena', city: 'Abu Dhabi', dates: '21–23 May 2027', playoffsStart: 'April 2027' },
};

module.exports = { BASE, COMPETITION, UA, get, resolveSeason, FINAL_FOUR_CITIES, UPCOMING_FINAL_FOUR };
