#!/usr/bin/env node
/**
 * Calcule les statistiques avancées d'équipe EuroLeague masculine (offense,
 * défense, rythme de jeu, efficacité) et le rang de chaque club sur chaque
 * métrique (1 = meilleur), depuis l'API officielle gratuite.
 *
 * L'API ne fournit pas directement de "Offensive/Defensive Rating" ni de
 * "Pace" (rythme) — on les calcule nous-mêmes avec les formules standard du
 * basket (mêmes formules que basketball-reference.com) à partir des stats
 * brutes déjà exposées :
 *   Possessions ≈ FGA - OREB + TOV + 0.44 * FTA        (par match)
 *   Pace        = Possessions                           (par match, à 40 min)
 *   Off. Rating = Points marqués     / Possessions * 100
 *   Def. Rating = Points concédés    / Possessions * 100
 *
 * Le rang (1-20) de chaque club sur chaque métrique est calculé nous-mêmes
 * par tri (le champ `teamRanking` renvoyé par l'API ne reflète qu'un seul tri
 * implicite, pas fiable pour un classement multi-métriques).
 *
 * Usage : node scripts/update-euroleague-analytics.js
 */
const fs = require('fs');
const path = require('path');

const BASE = 'https://api-live.euroleague.net';
const COMPETITION = 'E';
const SEASON_CODE = 'E2025';
const UA = 'Mozilla/5.0 (compatible; ncaa-basket-map/1.0)';

const OUT_PATH = path.join(__dirname, '..', 'src', 'euroleague-analytics.json');

async function get(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}
const pct = (v) => {
  if (v == null) return null;
  const n = parseFloat(String(v).replace('%', ''));
  return isNaN(n) ? null : n;
};

async function fetchTeamStats(endpoint) {
  const url =
    `${BASE}/v3/competitions/${COMPETITION}/statistics/teams/${endpoint}` +
    `?SeasonMode=Single&SeasonCode=${SEASON_CODE}&statisticMode=PerGame&phaseTypeCode=RS&limit=25`;
  const data = await get(url);
  const byCode = {};
  (data.teams || []).forEach((t) => (byCode[t.team.code] = t));
  return byCode;
}

// Classe les 20 clubs sur une métrique -> {code: rang}. `lowerIsBetter`
// inverse le sens du tri (ex: turnovers, points concédés).
function rankBy(rows, getValue, lowerIsBetter = false) {
  const sorted = rows
    .filter((r) => getValue(r.stats) != null)
    .sort((a, b) => {
      const va = getValue(a.stats);
      const vb = getValue(b.stats);
      return lowerIsBetter ? va - vb : vb - va;
    });
  const ranks = {};
  sorted.forEach((r, i) => (ranks[r.code] = i + 1));
  return ranks;
}

(async () => {
  console.log('Chargement des statistiques équipes (traditional, opponents, advanced)…');
  const traditional = await fetchTeamStats('traditional');
  const opponents = await fetchTeamStats('opponentsTraditional');
  const advanced = await fetchTeamStats('advanced');

  const codes = Object.keys(traditional);
  const rows = [];

  for (const code of codes) {
    const t = traditional[code];
    const o = opponents[code];
    const a = advanced[code];
    if (!t || !o) continue;

    const fga = (t.twoPointersAttempted || 0) + (t.threePointersAttempted || 0);
    const possessions = fga - (t.offensiveRebounds || 0) + (t.turnovers || 0) + 0.44 * (t.freeThrowsAttempted || 0);
    const offRating = possessions > 0 ? (t.pointsScored / possessions) * 100 : null;
    const defRating = possessions > 0 ? (o.pointsScored / possessions) * 100 : null;

    rows.push({
      code,
      name: t.team.name,
      stats: {
        ppg: t.pointsScored,
        oppPpg: o.pointsScored,
        pace: possessions,
        offRating,
        defRating,
        efgPct: a ? pct(a.effectiveFieldGoalPercentage) : null,
        tsPct: a ? pct(a.trueShootingPercentage) : null,
        astRatio: a ? pct(a.assistsRatio) : null,
        tovRatio: a ? pct(a.turnoversRatio) : null,
        orebPct: a ? pct(a.offensiveReboundsPercentage) : null,
        drebPct: a ? pct(a.defensiveReboundsPercentage) : null,
        threePtRate: a ? pct(a.threePointRate) : null,
        ftRate: a ? pct(a.freeThrowsRate) : null,
      },
    });
  }

  // Rang 1-20 par métrique. `lowerIsBetter=true` pour les métriques où un
  // chiffre plus bas est un signe de meilleure performance.
  const METRICS = [
    ['offRating', false],
    ['defRating', true],
    ['pace', false], // ni bon ni mauvais en soi -> juste un rang, pas de couleur
    ['ppg', false],
    ['oppPpg', true],
    ['efgPct', false],
    ['tsPct', false],
    ['astRatio', false],
    ['tovRatio', true],
    ['orebPct', false],
    ['drebPct', false],
    ['threePtRate', false],
    ['ftRate', false],
  ];
  const ranksByMetric = {};
  METRICS.forEach(([key, lowerIsBetter]) => {
    ranksByMetric[key] = rankBy(rows, (s) => s[key], lowerIsBetter);
  });

  const byClub = {};
  rows.forEach((r) => {
    const stats = {};
    METRICS.forEach(([key]) => {
      stats[key] = { value: r.stats[key], rank: ranksByMetric[key][r.code] || null };
    });
    byClub[r.code] = stats;
  });

  console.log(`${rows.length} clubs analysés, ${METRICS.length} métriques classées.`);
  // Exemple de contrôle
  const sample = byClub['MAD'];
  if (sample) {
    console.log(
      'Real Madrid — Off:',
      sample.offRating.value?.toFixed(1),
      '(#' + sample.offRating.rank + ')',
      '| Def:',
      sample.defRating.value?.toFixed(1),
      '(#' + sample.defRating.rank + ')',
      '| Pace:',
      sample.pace.value?.toFixed(1),
      '(#' + sample.pace.rank + ')'
    );
  }

  const out = {
    updated: new Date().toISOString().slice(0, 10),
    season: SEASON_CODE,
    source: 'api-live.euroleague.net (Off/Def Rating et Pace calculés localement, formules standard)',
    byClub,
  };
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(`→ ${OUT_PATH}`);
})();
