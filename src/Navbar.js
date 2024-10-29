import './styles.css';

export default function Navbar({ searchQuery, setSearchQuery }) {
  return (
    <div
      style={{
        width: '100%',
        height: '5vh',
        backgroundColor: '#333',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: '20px',
      }}
    >
      <p
        style={{
          margin: 0,
          color: '#fff',
          fontSize: '1.25rem',
          fontFamily: 'MasqueFont, serif',
        }}
      >
        NCAA Division I Men's Basketball - Interactive Map
      </p>
      <input
        type="text"
        placeholder="Rechercher une équipe..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{ padding: '8px', marginLeft: '20px', fontSize: '16px' }}
      />
    </div>
  );
}
