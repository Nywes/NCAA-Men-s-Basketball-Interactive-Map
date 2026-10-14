#!/usr/bin/env node
/**
 * Snapshot des fiches équipes ESPN (nom, couleurs, logo, conférence, bilan)
 * pour les équipes NCAA hommes et femmes -> src/espn-teams.json
 *
 * Pourquoi un snapshot : depuis octobre 2026, l'endpoint ESPN
 * `site.api.espn.com/.../teams/{id}` n'envoie plus d'en-tête CORS, donc le
 * navigateur bloque la réponse (logos cassés sur la carte). Les autres
 * endpoints (roster, standings, scoreboard, stats joueurs) restent appelables
 * depuis le navigateur. Rafraîchi chaque jour par le workflow update-fr-data.yml.
 *
 * Usage : node scripts/update-espn-teams.js
 */
const fs = require('fs');
const path = require('path');

const OUT_PATH = path.join(__dirname, '..', 'src', 'espn-teams.json');
const SOURCES = {
  men: { file: 'teams.json', sport: 'mens-college-basketball' },
  women: { file: 'teams-women.json', sport: 'womens-college-basketball' },
};
const CONCURRENCY = 8;

async function fetchTeam(sport, id) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/basketball/${sport}/teams/${id}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const t = (await res.json()).team;
      if (!t) throw new Error('réponse sans "team"');
      return {
        location: t.location,
        name: t.name,
        nickname: t.nickname,
        abbreviation: t.abbreviation,
        displayName: t.displayName,
        shortDisplayName: t.shortDisplayName,
        color: t.color,
        alternateColor: t.alternateColor,
        logo: t.logos?.[0]?.href,
        groups: t.groups,
        standingSummary: t.standingSummary,
      };
    } catch (e) {
      if (attempt === 3) throw new Error(`${sport} ${id}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}

(async () => {
  let previous = {};
  try {
    previous = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'));
  } catch (e) {
    /* premier run */
  }

  const out = { updated: new Date().toISOString().slice(0, 10) };
  let failures = 0;
  for (const [gender, { file, sport }] of Object.entries(SOURCES)) {
    const ids = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', file), 'utf8')).map(
      (t) => String(t.id)
    );
    out[gender] = {};
    for (let i = 0; i < ids.length; i += CONCURRENCY) {
      const batch = ids.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(batch.map((id) => fetchTeam(sport, id)));
      results.forEach((r, j) => {
        const id = batch[j];
        if (r.status === 'fulfilled') out[gender][id] = r.value;
        else {
          failures += 1;
          console.warn(`  ⚠ ${r.reason.message} (on garde l'ancienne fiche)`);
          if (previous[gender]?.[id]) out[gender][id] = previous[gender][id];
        }
      });
    }
    console.log(`${gender}: ${Object.keys(out[gender]).length}/${ids.length} équipes`);
  }

  // Garde-fou : panne ESPN massive -> on n'écrase pas un snapshot sain.
  if (failures > 50) {
    console.error(`✖ ${failures} échecs : réponse ESPN suspecte, rien n'est écrit.`);
    process.exit(1);
  }
  fs.writeFileSync(OUT_PATH, JSON.stringify(out) + '\n');
  console.log(`→ ${OUT_PATH}`);
})();
