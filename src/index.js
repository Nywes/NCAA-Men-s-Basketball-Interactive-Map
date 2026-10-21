// index.js
import { StrictMode, Suspense, lazy, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
// HashRouter (URLs en /#/usa, /#/france) : compatible GitHub Pages sans config serveur.
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

import App from './App';
import Navbar from './Navbar';
import LeaguePicker from './LeaguePicker';
import { LEAGUES } from './leagues';

// France / EuroLeague (code + JSON effectifs) chargés seulement à l'ouverture
// de leur univers : la page NCAA (entrée du site) s'affiche plus vite.
const FranceMap = lazy(() => import('./FranceMap'));
const EuroleagueMap = lazy(() => import('./EuroleagueMap'));
const AcbMap = lazy(() => import('./AcbMap'));
const LbaMap = lazy(() => import('./LbaMap'));
const BblMap = lazy(() => import('./BblMap'));
// Championnats nationaux de clubs (une carte = une configuration de ClubLeagueMap)
const NATIONAL_MAPS = { spain: AcbMap, italy: LbaMap, germany: BblMap };

// Titre d'onglet + méta-description propres à chaque univers/genre (SEO et
// lisibilité des onglets). Le titre par défaut est dans public/index.html.
const SITE = 'Interactive Basketball Map';
const PAGE_META = {
  'usa:men': {
    title: `NCAA Men's Basketball Map — D1 Teams, Rosters, Legends & March Madness | ${SITE}`,
    description:
      "Interactive map of all 364 NCAA Division I men's college basketball teams: rosters, player stats, standings, arenas, NBA legends and every March Madness bracket since 2009.",
  },
  'usa:women': {
    title: `NCAA Women's Basketball Map — D1 Teams, Rosters, Legends & March Madness | ${SITE}`,
    description:
      "Interactive map of all NCAA Division I women's college basketball teams: rosters, player stats, standings, arenas, WNBA legends and every March Madness bracket since 2005.",
  },
  'france:men': {
    title: `Carte du basket français — Betclic ÉLITE & ÉLITE 2 (LNB) | ${SITE}`,
    description:
      "Carte interactive des clubs de Betclic ÉLITE et ÉLITE 2 : effectifs, statistiques des joueurs, classements, salles et palmarès de chaque club de basket professionnel français.",
  },
  'france:women': {
    title: `Carte du basket féminin français — Wonderligue & LF2 | ${SITE}`,
    description:
      'Carte interactive des clubs de La Boulangère Wonderligue et de Ligue Féminine 2 : classements, salles et palmarès du basket féminin français.',
  },
  germany: {
    title: `Basketball Bundesliga (BBL) Map — Teams, Rosters & Standings | ${SITE}`,
    description:
      'Interactive map of the 18 easyCredit Basketball Bundesliga (BBL) clubs in Germany: rosters, player stats, standings and arenas, updated daily.',
  },
  italy: {
    title: `Serie A (LBA) Map — Teams, Rosters & Standings | ${SITE}`,
    description:
      'Interactive map of the 16 Lega Basket Serie A (LBA) clubs in Italy: rosters, player stats, standings and arenas, updated daily.',
  },
  spain: {
    title: `Liga Endesa (ACB) Map — Teams, Rosters & Standings | ${SITE}`,
    description:
      'Interactive map of the 18 Liga Endesa (ACB) basketball clubs in Spain: rosters, player stats, standings and arenas, updated daily.',
  },
  eurocup: {
    title: `EuroCup Map — Teams, Rosters & Standings | ${SITE}`,
    description:
      'Interactive map of every BKT EuroCup basketball team: rosters, player stats, standings and arenas, updated daily.',
  },
  europe: {
    title: `EuroLeague Map — Teams, Rosters, Standings & Final Four | ${SITE}`,
    description:
      'Interactive map of every Turkish Airlines EuroLeague team: rosters, standings, team analytics, rivalries and the playoffs & Final Four bracket.',
  },
};

// Méta statiques de la page d'entrée (/, /fr/, /france/, /europe/ — cf.
// scripts/seo-pages.js), capturées au chargement avant toute modification.
const descTag = document.querySelector('meta[name="description"]');
const ENTRY_META = {
  section: document.documentElement.dataset.entry,
  title: document.title,
  description: descTag ? descTag.getAttribute('content') : '',
  lang: document.documentElement.lang,
};

function usePageMeta(leagueId, gender) {
  useEffect(() => {
    // Dans la section d'entrée : on garde (ou restaure) les méta statiques de la page.
    const meta =
      ENTRY_META.section === leagueId
        ? ENTRY_META
        : {
            ...(PAGE_META[`${leagueId}:${gender}`] || PAGE_META[leagueId]),
            lang: leagueId === 'france' ? 'fr' : 'en',
          };
    if (!meta.title) return;
    document.title = meta.title;
    if (descTag) descTag.setAttribute('content', meta.description);
    document.documentElement.lang = meta.lang;
  }, [leagueId, gender]);
}

const rootElement = document.getElementById('root');
const root = createRoot(rootElement);

// Un "univers" = navbar + carte + sélecteur de ligue. La recherche est locale
// à chaque univers (elle se réinitialise quand on change de ligue), mais le genre
// (Men/Women) est remonté dans Root pour PERSISTER quand on change de championnat.
function Shell({ leagueId, gender, setGender }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSubmit, setSearchSubmit] = useState(null);

  const league = LEAGUES.find((l) => l.id === leagueId);
  usePageMeta(leagueId, gender);
  const Map =
    leagueId === 'france' ? FranceMap : leagueId === 'europe' || leagueId === 'eurocup' ? EuroleagueMap : NATIONAL_MAPS[leagueId] || App;
  // Titre imposé par la carte (Europe : EuroLeague / EuroCup / les deux selon le filtre).
  const [titleOverride, setTitleOverride] = useState(null);

  // Le titre suit le genre sélectionné (Men's / Women's) selon l'univers.
  let navLeague = league;
  if (titleOverride) navLeague = { ...league, ...titleOverride };
  if (league && gender === 'women') {
    if (leagueId === 'usa') {
      navLeague = { ...league, title: "NCAA Division I Women's Basketball" };
    } else if (leagueId === 'france') {
      navLeague = { ...league, title: 'French Women’s Basketball — FFBB', shortTitle: 'FFBB' };
    }
  }

  return (
    <>
      <Navbar
        league={navLeague}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSubmit={(q) => setSearchSubmit((prev) => ({ q, n: (prev?.n || 0) + 1 }))}
      />
      <Suspense fallback={null}>
        <Map
          searchQuery={searchQuery}
          searchSubmit={searchSubmit}
          gender={gender}
          setGender={setGender}
          onTitle={setTitleOverride}
          leagueId={leagueId}
        />
      </Suspense>
      <LeaguePicker currentLeague={leagueId} gender={gender} />
    </>
  );
}

function Root() {
  // Genre partagé entre tous les univers (persiste au changement de championnat).
  const [gender, setGender] = useState('men');
  return (
    <StrictMode>
      <HashRouter>
        <Routes>
          <Route
            path="/usa"
            element={<Shell key="usa" leagueId="usa" gender={gender} setGender={setGender} />}
          />
          <Route
            path="/france"
            element={<Shell key="france" leagueId="france" gender={gender} setGender={setGender} />}
          />
          <Route
            path="/europe"
            element={<Shell key="europe" leagueId="europe" gender={gender} setGender={setGender} />}
          />
          <Route
            path="/eurocup"
            element={<Shell key="eurocup" leagueId="eurocup" gender={gender} setGender={setGender} />}
          />
          <Route
            path="/spain"
            element={<Shell key="spain" leagueId="spain" gender={gender} setGender={setGender} />}
          />
          <Route
            path="/italy"
            element={<Shell key="italy" leagueId="italy" gender={gender} setGender={setGender} />}
          />
          <Route
            path="/germany"
            element={<Shell key="germany" leagueId="germany" gender={gender} setGender={setGender} />}
          />
          <Route path="*" element={<Navigate to="/usa" replace />} />
        </Routes>
      </HashRouter>
    </StrictMode>
  );
}

root.render(<Root />);
