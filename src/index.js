// index.js
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import Navbar from './Navbar';

const rootElement = document.getElementById('root');
const root = createRoot(rootElement);

function Root() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <StrictMode>
      <Navbar searchQuery={searchQuery} setSearchQuery={setSearchQuery}/>
      <App searchQuery={searchQuery}/>
    </StrictMode>
  );
}

root.render(<Root />);
