#!/usr/bin/env node
/**
 * Pages d'entrée SEO générées après le build (lancé par "postbuild").
 *
 * Le site est une SPA en HashRouter : pour Google, /#/france === /. On crée donc
 * de vraies URL (/fr/, /france/, /europe/) qui chargent EXACTEMENT la même app
 * (copie de build/index.html), mais avec leur propre langue, titre, description,
 * texte <noscript> et un mini-script qui ouvre la bonne section (#/france…).
 * Aucun impact visuel : seul le contenu lu par les moteurs change.
 *
 * <html data-entry="…"> indique à usePageMeta (src/index.js) de ne pas écraser
 * le titre statique tant qu'on reste dans la section d'entrée.
 */
const fs = require('fs');
const path = require('path');

const BUILD = path.join(__dirname, '..', 'build');
const BASE = 'https://nywes.github.io/NCAA-Men-s-Basketball-Interactive-Map/';

const PAGES = [
  {
    dir: 'fr',
    lang: 'fr',
    locale: 'fr_FR',
    entry: 'usa',
    hash: '#/usa',
    alternates: { en: '', fr: 'fr/' },
    title: 'Carte des équipes NCAA de basket — carte interactive NCAA, LNB & EuroLeague',
    description:
      "Carte interactive de toutes les équipes de basket universitaire NCAA Division I (hommes et femmes) : effectifs, statistiques, classements, salles, légendes NBA et tableaux March Madness. Aussi : clubs français (Betclic ÉLITE, ÉLITE 2, Wonderligue, LF2) et EuroLeague.",
    noscript: `
		<h1>Carte des équipes NCAA de basket</h1>
		<p>Activez JavaScript pour utiliser la carte.</p>
		<p>Carte interactive de toutes les équipes de basket universitaire américain NCAA Division I, chez les hommes comme chez les femmes : plus de 360 universités placées sur la carte des États-Unis. Cliquez sur une équipe pour voir son effectif et les statistiques des joueurs, son classement, sa salle, son histoire, ses légendes (anciens joueurs NBA et WNBA, membres du Hall of Fame) et son palmarès.</p>
		<h2>Les 32 conférences NCAA</h2>
		<p>ACC, Big Ten, Big 12, SEC, Big East, American, Atlantic 10, Mountain West, West Coast, Missouri Valley, Ivy League, Patriot League et toutes les autres conférences de Division I, filtrables sur la carte.</p>
		<h2>March Madness</h2>
		<p>Le tableau complet du tournoi NCAA (March Madness) pour chaque saison depuis 2009 chez les hommes et 2005 chez les femmes : parcours de chaque équipe, Final Four et titres nationaux.</p>
		<h2>Basket français et EuroLeague</h2>
		<p>La même carte couvre aussi les clubs professionnels français (Betclic ÉLITE, ÉLITE 2, La Boulangère Wonderligue, Ligue Féminine 2) et toutes les équipes de l'EuroLeague.</p>`,
  },
  {
    dir: 'france',
    lang: 'fr',
    locale: 'fr_FR',
    entry: 'france',
    hash: '#/france',
    title: 'Carte des clubs de basket en France — Betclic ÉLITE, ÉLITE 2, Wonderligue & LF2',
    description:
      'Carte interactive de tous les clubs de basket professionnel français : Betclic ÉLITE et ÉLITE 2 (LNB), La Boulangère Wonderligue et LF2. Effectifs, statistiques des joueurs, classements, salles et palmarès de chaque club.',
    noscript: `
		<h1>Carte des clubs de basket en France</h1>
		<p>Activez JavaScript pour utiliser la carte.</p>
		<p>Carte interactive de tous les clubs de basket professionnel en France, mise à jour chaque jour : Betclic ÉLITE et ÉLITE 2 (Ligue Nationale de Basket) chez les hommes, La Boulangère Wonderligue et Ligue Féminine 2 (LF2) chez les femmes.</p>
		<h2>Pour chaque club</h2>
		<p>Effectif et statistiques des joueurs (points, rebonds, passes, évaluation), classement de la saison, salle et capacité, ville, et palmarès : titres de champion de France, Coupe de France, Leaders Cup, titres d'ÉLITE 2 et coupes d'Europe.</p>
		<h2>Aussi sur la carte</h2>
		<p>Les équipes de basket universitaire américain NCAA Division I et les équipes de l'EuroLeague.</p>`,
  },
  {
    dir: 'spain',
    lang: 'en',
    locale: 'en_US',
    entry: 'spain',
    hash: '#/spain',
    title: 'Liga Endesa (ACB) Teams Map — Rosters, Standings & Arenas | Interactive Basketball Map',
    description:
      'Interactive map of the 18 Liga Endesa (ACB) basketball clubs in Spain: rosters with player stats, standings and arenas, updated daily.',
    noscript: `
		<h1>Liga Endesa (ACB) Teams Map</h1>
		<p>You need to enable JavaScript to run this app.</p>
		<p>An interactive map of the 18 Liga ACB (Liga Endesa) basketball clubs in Spain. Click a club to see its roster and player stats, the standings, its arena and city.</p>`,
  },
  {
    dir: 'italy',
    lang: 'en',
    locale: 'en_US',
    entry: 'italy',
    hash: '#/italy',
    title: 'Serie A (LBA) Teams Map — Rosters, Standings & Arenas | Interactive Basketball Map',
    description:
      'Interactive map of the 16 Lega Basket Serie A (LBA) basketball clubs in Italy: rosters with player stats, standings and arenas, updated daily.',
    noscript: `
		<h1>Serie A (LBA) Teams Map</h1>
		<p>You need to enable JavaScript to run this app.</p>
		<p>An interactive map of the 16 Lega Basket Serie A (LBA) basketball clubs in Italy. Click a club to see its roster and player stats, the standings, its arena and city.</p>`,
  },
  {
    dir: 'eurocup',
    lang: 'en',
    locale: 'en_US',
    entry: 'eurocup',
    hash: '#/eurocup',
    title: 'EuroCup Teams Map — Rosters, Standings & Arenas | Interactive Basketball Map',
    description:
      'Interactive map of every BKT EuroCup basketball team: rosters, player stats, group standings and arenas, updated daily. Toggle the EuroLeague teams on the same map of Europe.',
    noscript: `
		<h1>EuroCup Teams Map</h1>
		<p>You need to enable JavaScript to run this app.</p>
		<p>An interactive map of the 32 BKT EuroCup basketball teams across Europe. Click a team to see its roster and player stats, the standings of its group, its arena and city. The EuroLeague teams can be displayed on the same map.</p>`,
  },
  {
    dir: 'europe',
    lang: 'en',
    locale: 'en_US',
    entry: 'europe',
    hash: '#/europe',
    title: 'EuroLeague Teams Map — Rosters, Standings & Final Four | Interactive Basketball Map',
    description:
      'Interactive map of every Turkish Airlines EuroLeague basketball team: rosters, player stats, standings, team analytics, rivalries and the playoffs & Final Four bracket.',
    noscript: `
		<h1>EuroLeague Teams Map</h1>
		<p>You need to enable JavaScript to run this app.</p>
		<p>An interactive map of every Turkish Airlines EuroLeague basketball team across Europe. Click a team to see its roster and player stats, standings, arena, team analytics (offense, defense, pace), head-to-head rivalries and the playoffs and Final Four bracket.</p>
		<h2>Also on the map</h2>
		<p>Every NCAA Division I men's and women's college basketball team and every French professional club (Betclic ÉLITE, ÉLITE 2, Wonderligue, LF2).</p>`,
  },
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function replaceOnce(html, re, value, label) {
  if (!re.test(html)) throw new Error(`seo-pages: balise introuvable (${label})`);
  return html.replace(re, value);
}

const template = fs.readFileSync(path.join(BUILD, 'index.html'), 'utf8');

for (const p of PAGES) {
  const url = BASE + p.dir + '/';
  let html = template;
  html = replaceOnce(html, /<html[^>]*>/, `<html lang="${p.lang}" data-entry="${p.entry}">`, 'html');
  html = replaceOnce(html, /<title>[^<]*<\/title>/, `<title>${esc(p.title)}</title>`, 'title');
  html = replaceOnce(html, /(<meta name="description" content=")[^"]*/, `$1${esc(p.description)}`, 'description');
  html = replaceOnce(html, /(<link rel="canonical" href=")[^"]*/, `$1${url}`, 'canonical');
  html = replaceOnce(html, /(<meta property="og:title" content=")[^"]*/, `$1${esc(p.title)}`, 'og:title');
  html = replaceOnce(html, /(<meta property="og:description" content=")[^"]*/, `$1${esc(p.description)}`, 'og:description');
  html = replaceOnce(html, /(<meta property="og:url" content=")[^"]*/, `$1${url}`, 'og:url');
  html = replaceOnce(html, /(<meta property="og:locale" content=")[^"]*/, `$1${p.locale}`, 'og:locale');
  html = replaceOnce(html, /(<meta name="twitter:title" content=")[^"]*/, `$1${esc(p.title)}`, 'twitter:title');
  html = replaceOnce(html, /(<meta name="twitter:description" content=")[^"]*/, `$1${esc(p.description)}`, 'twitter:description');
  html = replaceOnce(html, /<noscript>[\s\S]*?<\/noscript>/, `<noscript>${p.noscript}\n\t</noscript>`, 'noscript');
  // Paires de langues : on remplace les hreflang de la page d'accueil.
  html = html.replace(/\s*<link rel="alternate" hreflang="[^"]*" href="[^"]*">/g, '');
  if (p.alternates) {
    const links = Object.entries(p.alternates)
      .map(([l, rel]) => `<link rel="alternate" hreflang="${l}" href="${BASE}${rel}">`)
      .concat(`<link rel="alternate" hreflang="x-default" href="${BASE}">`)
      .join('');
    html = html.replace('<link rel="canonical"', `${links}<link rel="canonical"`);
  }
  // Ouvre la bonne section avant le démarrage de l'app (HashRouter).
  html = html.replace(
    '</title>',
    `</title><script>if(!location.hash||location.hash==="#/")location.replace("${p.hash}")</script>`
  );
  fs.mkdirSync(path.join(BUILD, p.dir), { recursive: true });
  fs.writeFileSync(path.join(BUILD, p.dir, 'index.html'), html);
  console.log(`seo-pages: /${p.dir}/ (${p.lang}) — ${p.title}`);
}
