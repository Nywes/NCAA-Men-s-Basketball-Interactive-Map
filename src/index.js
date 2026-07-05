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
// à chaque univers (elle se réinitialise quand on change de ligue).
function Shell({ leagueId }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSubmit, setSearchSubmit] = useState(null);

  const league = LEAGUES.find((l) => l.id === leagueId);
  const Map = leagueId === 'france' ? FranceMap : App;

  return (
    <>
      <Navbar
        league={league}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSubmit={(q) => setSearchSubmit((prev) => ({ q, n: (prev?.n || 0) + 1 }))}
      />
      <Map searchQuery={searchQuery} searchSubmit={searchSubmit} />
      <LeaguePicker currentLeague={leagueId} />
    </>
  );
}

function Root() {
  return (
    <StrictMode>
      <HashRouter>
        <Routes>
          <Route path="/usa" element={<Shell key="usa" leagueId="usa" />} />
          <Route path="/france" element={<Shell key="france" leagueId="france" />} />
          <Route path="*" element={<Navigate to="/usa" replace />} />
        </Routes>
      </HashRouter>
    </StrictMode>
  );
}

root.render(<Root />);
