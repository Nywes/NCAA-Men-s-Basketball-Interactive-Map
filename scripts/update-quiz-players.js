#!/usr/bin/env node
/**
 * Base du quiz "Quelle fac ?" : joueurs NBA (toutes époques) -> fac(s) NCAA D1.
 *   -> src/quiz-players.json
 *
 * Aucune API ne donne "joueur -> fac" proprement, on croise 3 sources gratuites :
 *   1. Wikidata (SPARQL) : tous les joueurs NBA avec un id ESPN (P3685), leur
 *      titre d'article Wikipédia EN et une éventuelle photo Wikimedia.
 *   2. Wikipédia EN : la catégorie "<Équipe> men's basketball players" de chaque
 *      fac de teams.json liste tous ses anciens joueurs (toutes époques) -> on
 *      relie par le titre d'article. C'est LA source de la fac : ESPN ne la
 *      connaît que pour les joueurs récents.
 *   3. ESPN (core API) : matchs joués en carrière, année de début, draft, photo.
 *   + Wikipédia pageviews (12 mois) : notoriété, pour les niveaux de difficulté
 *     et pour trier les anciens dont ESPN n'a pas les stats.
 *
 * Filtre : fac en D1 (teams.json) ET (>= 82 matchs NBA, OU stats inconnues
 * mais joueur notoire, OU joueur actuellement sous contrat NBA s'il a été
 * drafté ou a déjà joué une demi-saison — les rookies comptent, pas les
 * simples invités de camp). Les joueurs sans fac (LeBron, internationaux) ou
 * passés par une fac hors D1 (Ben Wallace) sortent naturellement.
 * Les joueurs actifs absents de Wikidata (rookies) sont ajoutés depuis la
 * liste ESPN des effectifs, avec la fac ESPN.
 *
 * Usage : node scripts/update-quiz-players.js   (~15 min, à relancer 1x/an)
 * Les appels ESPN/pageviews sont mis en cache dans $TMPDIR pour les relances.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const TEAMS_PATH = path.join(__dirname, '..', 'src', 'teams.json');
const OUT_PATH = path.join(__dirname, '..', 'src', 'quiz-players.json');
const CACHE_PATH = path.join(process.env.QUIZ_CACHE_DIR || os.tmpdir(), 'quiz-players-cache.json');
const UA = 'NCAA-interactive-map quiz builder/1.0 (https://nywes.github.io/NCAA-Men-s-Basketball-Interactive-Map/)';

const MIN_GAMES = 82; // "au moins une saison complète"
const MIN_GAMES_ACTIVE_UNDRAFTED = 41; // joueur actif non drafté : une demi-saison
const MIN_VIEWS_IF_UNKNOWN = 5000; // vues Wikipédia/an si ESPN n'a pas les stats (anciens)

// Nom de catégorie Wikipédia quand il diffère du nom teams.json. Plusieurs
// candidats possibles (programme renommé : on fusionne les listes).
const CATEGORY_OVERRIDES = {
  'Queens University Royals': ['Queens Royals'],
  'Loyola Chicago Ramblers': ['Loyola Ramblers'],
  "Gardner-Webb Runnin' Bulldogs": ["Gardner–Webb Runnin' Bulldogs"],
  'South Carolina Upstate Spartans': ['USC Upstate Spartans'],
  'Delaware Blue Hens': ["Delaware Fightin' Blue Hens"],
  'Florida International Panthers': ['FIU Panthers'],
  'IU Indianapolis Jaguars': ['IU Indy Jaguars', 'IUPUI Jaguars'],
  'Pennsylvania Quakers': ['Penn Quakers'],
  'San José State Spartans': ['San Jose State Spartans'],
  'Long Island University Sharks': ['LIU Sharks', 'LIU Brooklyn Blackbirds'],
  'American University Eagles': ['American Eagles'],
  'Loyola Maryland Greyhounds': ['Loyola Greyhounds'],
  'Arkansas-Pine Bluff Golden Lions': ['Arkansas–Pine Bluff Golden Lions'],
  'Bethune-Cookman Wildcats': ['Bethune–Cookman Wildcats'],
  'Grambling Tigers': ['Grambling State Tigers'],
  'New Orleans Privateers': ['New Orleans Privateers', 'LSU New Orleans Privateers'],
  'Texas A&M-Corpus Christi Islanders': ['Texas A&M–Corpus Christi Islanders'],
  'St. Thomas-Minnesota Tommies': ['St. Thomas Tommies (Minnesota)'],
  'UAlbany Great Danes': ['Albany Great Danes'],
  'Massachusetts Minutemen': ['UMass Minutemen'],
  "Hawai'i Rainbow Warriors": ['Hawaii Rainbow Warriors'],
  'Miami (OH) RedHawks': ['Miami RedHawks'],
  'St. Francis (PA) Red Flash': ['Saint Francis Red Wolves', 'Saint Francis Red Flash'], // renommé Red Wolves en 2025
  'App State Mountaineers': ['Appalachian State Mountaineers'],
  'UL Monroe Warhawks': ['Louisiana–Monroe Warhawks'],
  'SE Louisiana Lions': ['Southeastern Louisiana Lions'],
  'McNeese Cowboys': ['McNeese Cowboys', 'McNeese State Cowboys'],
  'Grand Canyon Lopes': ['Grand Canyon Antelopes'],
  'Seattle U Redhawks': ['Seattle Redhawks'],
  'Little Rock Trojans': ['Little Rock Trojans', 'Arkansas–Little Rock Trojans'],
  'East Texas A&M Lions': ['East Texas A&M Lions', 'Texas A&M–Commerce Lions'],
  'Utah Tech Trailblazers': ['Utah Tech Trailblazers', 'Dixie State Trailblazers'],
  'Kansas City Roos': ['Kansas City Roos', 'UMKC Kangaroos'],
  'Purdue Fort Wayne Mastodons': ['Purdue Fort Wayne Mastodons', 'IPFW Mastodons'],
  'Detroit Mercy Titans': ['Detroit Mercy Titans', 'Detroit Titans'],
  'Green Bay Phoenix': ['Green Bay Phoenix', 'Wisconsin–Green Bay Phoenix'],
  'Milwaukee Panthers': ['Milwaukee Panthers', 'Wisconsin–Milwaukee Panthers'],
  'UIC Flames': ['UIC Flames', 'Illinois–Chicago Flames'],
  'Long Beach State Beach': ['Long Beach State Beach', 'Long Beach State 49ers'],
  'Charleston Cougars': ['College of Charleston Cougars'],
  'Houston Christian Huskies': ['Houston Christian Huskies', 'Houston Baptist Huskies'],
  'Omaha Mavericks': ['Omaha Mavericks', 'Nebraska–Omaha Mavericks'],
  'Texas State Bobcats': ['Texas State Bobcats', 'Southwest Texas State Bobcats'],
  'UT Rio Grande Valley Vaqueros': ['UT Rio Grande Valley Vaqueros', 'Texas–Pan American Broncs'],
  'Cal State Bakersfield Roadrunners': ['Cal State Bakersfield Roadrunners'],
  'UNC Wilmington Seahawks': ['UNC Wilmington Seahawks'],
  'Tennessee State Tigers': ['Tennessee State Tigers'],
  'UNLV Rebels': ["UNLV Runnin' Rebels"],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, { headers = {}, tries = 5, method = 'GET' } = {}) {
  for (let k = 1; k <= tries; k++) {
    try {
      const res = await fetch(url, { method, headers: { 'User-Agent': UA, Accept: 'application/json', ...headers } });
      if (res.status === 404) return null;
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) return null;
      return method === 'HEAD' ? true : await res.json();
    } catch (e) {
      if (k === tries) throw new Error(`${url} -> ${e.message}`);
      // 429 (Wikipédia) : on attend franchement avant de réessayer.
      await sleep((e.message.includes('429') ? 8000 : 1500) * k);
    }
  }
}

// Pool de promesses avec concurrence bornée.
async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx], idx);
      }
    })
  );
  return out;
}

// ── 1. Wikidata ──────────────────────────────────────────────────────────────
async function fetchWikidataPlayers() {
  const query = `SELECT ?p ?pLabel ?espn ?title ?img WHERE {
    ?p wdt:P118 wd:Q155223; wdt:P3685 ?espn.
    ?article schema:about ?p; schema:isPartOf <https://en.wikipedia.org/>; schema:name ?title.
    OPTIONAL { ?p wdt:P18 ?img }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
  }`;
  const url = 'https://query.wikidata.org/sparql?query=' + encodeURIComponent(query);
  const d = await getJson(url, { headers: { Accept: 'application/sparql-results+json' }, tries: 3 });
  const byId = new Map();
  for (const b of d.results.bindings) {
    const id = b.espn.value;
    if (byId.has(id)) continue; // doublons (plusieurs photos)
    byId.set(id, {
      id,
      name: b.pLabel.value.startsWith('Q') ? b.title.value.replace(/\s*\(.*\)$/, '') : b.pLabel.value,
      title: b.title.value,
      img: b.img ? b.img.value : null,
    });
  }
  return [...byId.values()];
}

// ── 2. Wikipédia : membres des catégories ────────────────────────────────────
const WP = 'https://en.wikipedia.org/w/api.php?format=json&';
async function wp(params) {
  const d = await getJson(WP + new URLSearchParams(params));
  await sleep(250); // l'API Wikipédia renvoie 429 si on enchaîne trop vite
  return d;
}
async function categoryExists(cat) {
  const d = await wp({ action: 'query', prop: 'categoryinfo', titles: 'Category:' + cat });
  const p = Object.values(d.query.pages)[0];
  return !('missing' in p) && (p.categoryinfo?.pages || 0) > 0;
}
async function categoryMembers(cat) {
  const out = [];
  let cont = null;
  do {
    const q = { action: 'query', list: 'categorymembers', cmtitle: 'Category:' + cat, cmlimit: '500', cmtype: 'page' };
    if (cont) q.cmcontinue = cont;
    const d = await wp(q);
    out.push(...d.query.categorymembers.map((m) => m.title));
    cont = d.continue?.cmcontinue;
  } while (cont);
  return out;
}
async function searchCategories(name) {
  const d = await wp({ action: 'query', list: 'search', srsearch: `"men's basketball players" ${name}`, srnamespace: '14', srlimit: '5' });
  return d.query.search.map((r) => r.title.replace(/^Category:/, '')).filter((t) => t.endsWith('basketball players'));
}

// ── 3. ESPN ──────────────────────────────────────────────────────────────────
const ESPN = 'https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/athletes/';
// Ids des joueurs actuellement sous contrat NBA (une page suffit).
async function fetchActiveIds() {
  const d = await getJson(ESPN.replace(/\/$/, '') + '?limit=1000&active=true');
  return (d.items || []).map((i) => (i.$ref.match(/\/athletes\/(\d+)/) || [])[1]).filter(Boolean);
}
async function fetchEspn(id) {
  const a = (await getJson(ESPN + id)) || {};
  const col = (a.college && a.college.$ref) || '';
  const st = (await getJson(ESPN + id + '/statistics')) || {};
  const gp = (st.splits?.categories || []).flatMap((c) => c.stats).find((s) => s.name === 'gamesPlayed');
  let photo = false;
  try {
    photo = !!(await getJson(`https://a.espncdn.com/i/headshots/nba/players/full/${id}.png`, { method: 'HEAD', tries: 2 }));
  } catch (e) {
    /* pas de photo */
  }
  return {
    name: a.displayName || null,
    college: col.includes('/colleges/') ? col.split('/colleges/')[1].split('?')[0] : null,
    debut: a.debutYear || null,
    draft: a.draft?.year || null,
    pick: a.draft?.selection || null,
    seasons: a.experience?.years ?? null,
    gp: gp ? Math.round(gp.value) : null,
    photo,
  };
}

// ── 4. Pageviews Wikipédia : 50 titres par requête, 60 derniers jours (max de
// l'API), annualisés (x6). L'API REST par article limite trop vite (429).
async function fetchViewsBatch(titles) {
  const out = {};
  let cont = null;
  // L'API ne traite qu'une partie du lot par appel et renvoie `pvipcontinue`
  // pour la suite : on boucle jusqu'à avoir les vues de tous les titres.
  do {
    const q = { action: 'query', prop: 'pageviews', pvipdays: '60', titles: titles.join('|') };
    if (cont) q.pvipcontinue = cont;
    const d = await wp(q);
    const normalized = Object.fromEntries((d.query.normalized || []).map((n) => [n.to, n.from]));
    for (const page of Object.values(d.query.pages)) {
      if (!page.pageviews) continue; // pas encore traité -> au prochain tour
      const views = Object.values(page.pageviews).reduce((s, v) => s + (v || 0), 0);
      out[normalized[page.title] || page.title] = Math.round(views * 6);
    }
    cont = d.continue?.pvipcontinue || null;
  } while (cont);
  return out;
}

(async () => {
  const teams = JSON.parse(fs.readFileSync(TEAMS_PATH, 'utf8'));
  let cache = {};
  try {
    cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
  } catch (e) {
    /* premier run */
  }
  const saveCache = () => fs.writeFileSync(CACHE_PATH, JSON.stringify(cache));

  console.log('1/4 Wikidata…');
  const players = await fetchWikidataPlayers();
  console.log(`   ${players.length} joueurs NBA avec id ESPN + article Wikipédia`);

  console.log('2/4 Catégories Wikipédia (364 facs)…');
  const titleToColleges = new Map();
  const unresolved = [];
  let resolved = 0;
  await mapPool(teams, 1, async (t) => {
    const key = 'cat:' + t.id;
    if (!cache[key] || !cache[key].found) {
      // Wikipédia nomme les catégories "X men's basketball players" OU, pour les
      // programmes anciens, "X basketball players" : on teste les deux.
      const candidates = [t.name, ...(CATEGORY_OVERRIDES[t.name] || [])].flatMap((n) => [
        `${n} men's basketball players`,
        `${n} basketball players`,
      ]);
      const members = [];
      let found = false;
      for (const cat of candidates) {
        if (!(await categoryExists(cat))) continue;
        found = true;
        members.push(...(await categoryMembers(cat)));
      }
      cache[key] = { found, members, suggestions: found ? [] : await searchCategories(t.name).catch(() => []) };
      saveCache();
    }
    const c = cache[key];
    for (const title of c.members) {
      if (!titleToColleges.has(title)) titleToColleges.set(title, new Set());
      titleToColleges.get(title).add(t.id);
    }
    if (c.found) resolved += 1;
    else unresolved.push({ team: t.name, suggestions: c.suggestions });
  });
  console.log(`   ${resolved}/${teams.length} facs reliées à une catégorie`);
  for (const u of unresolved) console.warn(`   ⚠ ${u.team} : catégorie introuvable — suggestions : ${u.suggestions.join(' | ') || 'aucune'}`);

  const pool = players
    .map((p) => ({ ...p, colleges: [...(titleToColleges.get(p.title) || [])].sort() }))
    .filter((p) => p.colleges.length);
  console.log(`   ${pool.length} joueurs NBA reliés à une fac D1`);

  console.log(`3/4 ESPN (stats, draft, photo) — ${pool.length} joueurs…`);
  let n = 0;
  await mapPool(pool, 8, async (p) => {
    if (!cache['espn:' + p.id]) {
      cache['espn:' + p.id] = await fetchEspn(p.id);
      if (++n % 200 === 0) {
        saveCache();
        console.log(`   ${n}…`);
      }
    }
    Object.assign(p, cache['espn:' + p.id]);
  });
  saveCache();

  // ── 3b. Joueurs actuellement en NBA : marquage + ajout des absents (rookies…) ──
  const activeIds = await fetchActiveIds();
  const inPool = new Set(pool.map((p) => p.id));
  const teamIds = new Set(teams.map((t) => t.id));
  let added = 0;
  await mapPool(activeIds.filter((id) => !inPool.has(id)), 8, async (id) => {
    if (!cache['espn:' + id] || cache['espn:' + id].college === undefined) cache['espn:' + id] = await fetchEspn(id);
    const e = cache['espn:' + id];
    if (!e.name || !e.college || !teamIds.has(e.college)) return;
    pool.push({ id, name: e.name, title: e.name, img: null, colleges: [e.college], ...e });
    added += 1;
  });
  saveCache();
  const activeSet = new Set(activeIds);
  for (const p of pool) p.active = activeSet.has(p.id);
  console.log(`   actifs NBA : ${activeIds.length}, dont ${added} ajoutés via ESPN (fac ESPN en D1)`);

  console.log('4/4 Pageviews Wikipédia…');
  const todo = pool.filter((p) => !cache['views:' + p.title]).map((p) => p.title);
  for (let i = 0; i < todo.length; i += 50) {
    const views = await fetchViewsBatch(todo.slice(i, i + 50));
    for (const t of todo.slice(i, i + 50)) cache['views:' + t] = views[t] ?? 0;
    if ((i / 50) % 20 === 0) saveCache();
  }
  for (const p of pool) p.views = cache['views:' + p.title];
  saveCache();

  const keep = pool.filter(
    (p) =>
      (p.active && (p.draft || (p.gp || 0) >= MIN_GAMES_ACTIVE_UNDRAFTED)) ||
      (p.gp != null ? p.gp >= MIN_GAMES : p.views >= MIN_VIEWS_IF_UNKNOWN)
  );
  const decade = (p) => (p.debut ? `${Math.floor(p.debut / 10) * 10}s` : 'inconnu');
  const stats = {};
  for (const p of keep) stats[decade(p)] = (stats[decade(p)] || 0) + 1;
  console.log(`\nRetenus : ${keep.length}/${pool.length} (>= ${MIN_GAMES} matchs, ou anciens notoires)`);
  console.log('   par décennie de début :', JSON.stringify(stats));
  console.log(`   avec photo ESPN : ${keep.filter((p) => p.photo).length} | photo Wikimedia : ${keep.filter((p) => p.img).length}`);
  const now = new Date();
  const season = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  const young = keep.filter((p) => p.active && (p.draft || p.debut || 0) >= season - 1).length;
  console.log(`   actifs NBA retenus : ${keep.filter((p) => p.active).length} (dont rookies/sophomores ${season - 1}-${season} : ${young})`);

  const out = {
    updated: new Date().toISOString().slice(0, 10),
    minGames: MIN_GAMES,
    players: keep
      .sort((a, b) => b.views - a.views)
      .map((p) => ({
        id: p.id,
        name: p.name,
        colleges: p.colleges,
        debut: p.debut,
        draft: p.draft,
        pick: p.pick,
        gp: p.gp,
        views: p.views,
        photo: p.photo || undefined,
        active: p.active || undefined,
        img: p.img ? p.img.replace('http://commons.wikimedia.org/wiki/Special:FilePath/', '') : undefined,
      })),
  };
  fs.writeFileSync(OUT_PATH, JSON.stringify(out) + '\n');
  console.log(`→ ${OUT_PATH} (${(fs.statSync(OUT_PATH).size / 1024).toFixed(0)} KB)`);
})();
