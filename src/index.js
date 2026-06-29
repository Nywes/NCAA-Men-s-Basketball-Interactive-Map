// index.js
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import Navbar from './Navbar';

const rootElement = document.getElementById('root');
const root = createRoot(rootElement);

function Root() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSubmit, setSearchSubmit] = useState(null);

  return (
    <StrictMode>
      <Navbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSubmit={(q) => setSearchSubmit((prev) => ({ q, n: (prev?.n || 0) + 1 }))}
      />
      <App searchQuery={searchQuery} searchSubmit={searchSubmit} />
    </StrictMode>
  );
}

root.render(<Root />);
