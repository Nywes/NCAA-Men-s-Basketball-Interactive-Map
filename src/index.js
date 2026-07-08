// index.js
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
// HashRouter (URLs en /#/usa, /#/france) : compatible GitHub Pages sans config serveur.
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

import App from './App';
import FranceMap from './FranceMap';
import Navbar from './Navbar';
import LeaguePicker from './LeaguePicker';
import { LEAGUES } from './leagues';

const rootElement = document.getElementById('root');
const root = createRoot(rootElement);

// Un "univers" = navbar + carte + sélecteur de ligue. La recherche est locale
// à chaque univers (elle se réinitialise quand on change de ligue), mais le genre
// (Men/Women) est remonté dans Root pour PERSISTER quand on change de championnat.
function Shell({ leagueId, gender, setGender }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSubmit, setSearchSubmit] = useState(null);

  const league = LEAGUES.find((l) => l.id === leagueId);
  const Map = leagueId === 'france' ? FranceMap : App;

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
          <Route path="*" element={<Navigate to="/usa" replace />} />
        </Routes>
      </HashRouter>
    </StrictMode>
  );
}

root.render(<Root />);
