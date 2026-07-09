import { sportPath } from './espn';

// ═══ Données March Madness (ESPN scoreboard, groups=100 = tournoi NCAA) ═══
// Un seul appel par (genre, saison) : les 63-67 matchs, avec région, tour,
// seed, scores, vainqueur, couleurs et salle. Cache de session.

const CACHE = {};

// Dernière saison disponible : le tournoi se termine début avril.
export const LATEST_SEASON =
  new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;
// Profondeur d'historique vérifiée sur l'API (hommes 2009+, femmes 2005+).
export const FIRST_SEASON = { men: 2009, women: 2005 };

// Les intitulés de tours varient selon les années -> noms canoniques.
const normRound = (r) => {
  const l = (r || '').toLowerCase();
  if (l.includes('first four') || l.includes('opening round')) return 'First Four';
  if (l.includes('1st') || l.includes('first round')) return '1st Round';
  if (l.includes('2nd') || l.includes('second round')) return '2nd Round';
  if (l.includes('sweet') || l.includes('regional semifinal')) return 'Sweet 16';
  if (l.includes('elite') || l.includes('regional final')) return 'Elite 8';
  if (l.includes('final four') || l.includes('national semifinal')) return 'Final Four';
  if (l.includes('championship')) return 'National Championship';
  return r;
};

export const ROUNDS = ['1st Round', '2nd Round', 'Sweet 16', 'Elite 8'];
export const REGION_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#d97706'];

// "West Region" -> "West" · "Regional 2 in Sacramento" (femmes) -> "Regional 2"
export const shortRegion = (name) =>
  (name || '').replace(/ Region$/, '').replace(/ in .+$/, '');

function parseEvent(e) {
  const c = e.competitions && e.competitions[0];
  if (!c) return null;
  const head = ((c.notes || [])[0] || {}).headline || '';
  const parts = head.split(' - ');
  const round = normRound(parts[parts.length - 1]);
  const region = parts.length >= 3 ? parts.slice(1, -1).join(' - ').replace(/ Region$/, '') : null;
  const teams = (c.competitors || [])
    .slice()
    .sort((a, b) => (a.homeAway === 'home' ? 1 : -1))
    .map((x) => ({
      id: String(x.team.id),
      seed: x.curatedRank ? x.curatedRank.current : null,
      name: x.team.shortDisplayName,
      abbr: x.team.abbreviation,
      score: +x.score || 0,
      winner: !!x.winner,
      color: x.team.color || '1e293b',
    }));
  if (teams.length !== 2) return null;
  const v = c.venue || {};
  return {
    round,
    region,
    date: (e.date || '').slice(0, 10),
    venue: v.fullName || null,
    city: (v.address && v.address.city) || null,
    teams,
  };
}

export function fetchBracket(gender, year) {
  const key = `${gender}:${year}`;
  if (!CACHE[key]) {
    const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/${sportPath(
      gender
    )}/scoreboard?dates=${year}0310-${year}0415&groups=100&limit=120`;
    CACHE[key] = fetch(url)
      .then((r) => r.json())
      .then((d) => (d.events || []).map(parseEvent).filter(Boolean))
      .catch((err) => {
        delete CACHE[key]; // permet un nouvel essai
        throw err;
      });
  }
  return CACHE[key];
}

// Régions dans l'ordre d'apparition (elles changent selon les années/genres).
export function regionsOf(games) {
  const out = [];
  games.forEach((g) => {
    if (g.region && !out.includes(g.region)) out.push(g.region);
  });
  return out;
}

// Ordre vertical du tableau au 1er tour : 1v16, 8v9, 5v12, 4v13, 6v11, 3v14, 7v10, 2v15.
const SEED_ORDER = [1, 8, 5, 4, 6, 3, 7, 2];

// Matchs d'une région, par tour, dans l'ordre du tableau (les tours suivants
// héritent de la position des équipes qualifiées).
export function regionRounds(games, region) {
  const out = {};
  const r1 = games.filter((g) => g.region === region && g.round === '1st Round');
  r1.sort(
    (a, b) =>
      SEED_ORDER.indexOf(Math.min(...a.teams.map((t) => t.seed))) -
      SEED_ORDER.indexOf(Math.min(...b.teams.map((t) => t.seed)))
  );
  out['1st Round'] = r1;
  let pos = {};
  r1.forEach((g, i) => g.teams.forEach((t) => (pos[t.id] = i)));
  for (const cur of ['2nd Round', 'Sweet 16', 'Elite 8']) {
    const prev = pos;
    const gs = games.filter((g) => g.region === region && g.round === cur);
    gs.forEach((g) => (g._p = Math.min(...g.teams.map((t) => prev[t.id] ?? 99)) >> 1));
    gs.sort((a, b) => a._p - b._p);
    out[cur] = gs;
    const np = {};
    gs.forEach((g, i) => g.teams.forEach((t) => (np[t.id] = i)));
    pos = np;
  }
  return out;
}

export const teamLogo = (id, s = 32) =>
  `https://a.espncdn.com/combiner/i?img=/i/teamlogos/ncaa/500/${id}.png&h=${s}&w=${s}`;

// Teinte claire d'une couleur d'équipe (fond du parcours sélectionné).
export const bracketTint = (hex, f = 0.78) => {
  const h = (hex || '1e293b').replace('#', '');
  if (h.length !== 6) return '#eef2f6';
  const c = (i) => Math.round(parseInt(h.substr(i, 2), 16) + (255 - parseInt(h.substr(i, 2), 16)) * f);
  return `rgb(${c(0)}, ${c(2)}, ${c(4)})`;
};
