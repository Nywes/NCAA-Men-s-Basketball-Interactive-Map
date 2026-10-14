// index.js
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
// HashRouter (URLs en /#/usa, /#/france) : compatible GitHub Pages sans config serveur.
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

import App from './App';
import FranceMap from './FranceMap';
import EuroleagueMap from './EuroleagueMap';
import Navbar from './Navbar';
import LeaguePicker from './LeaguePicker';
import { LEAGUES } from './leagues';

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
  europe: {
    title: `EuroLeague Map — Teams, Rosters, Standings & Final Four | ${SITE}`,
    description:
      'Interactive map of every Turkish Airlines EuroLeague team: rosters, standings, team analytics, rivalries and the playoffs & Final Four bracket.',
  },
};

function usePageMeta(leagueId, gender) {
  useEffect(() => {
    const meta = PAGE_META[`${leagueId}:${gender}`] || PAGE_META[leagueId];
    if (!meta) return;
    document.title = meta.title;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', meta.description);
    document.documentElement.lang = leagueId === 'france' ? 'fr' : 'en';
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
  const Map = leagueId === 'france' ? FranceMap : leagueId === 'europe' ? EuroleagueMap : App;

  // Le titre suit le genre sélectionné (Men's / Women's) selon l'univers.
  let navLeague = league;
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
      <Map
        searchQuery={searchQuery}
        searchSubmit={searchSubmit}
        gender={gender}
        setGender={setGender}
      />
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
          <Route path="*" element={<Navigate to="/usa" replace />} />
        </Routes>
      </HashRouter>
    </StrictMode>
  );
}

root.render(<Root />);
