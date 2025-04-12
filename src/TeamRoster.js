import React from 'react';
import blankHeadshot from './assets/player.png';

const TeamRoster = ({ roster, rosterLoading, team }) => {
  console.log(roster);
  return (
    <div style={{ textAlign: 'center', width: '100%' }}>
      {rosterLoading ? (
        <p>Loading the roster...</p>
      ) : roster && roster.athletes ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '10px',
            marginTop: '10px',
            maxHeight: '200px',
            overflow: 'scroll',
          }}
        >
          {roster.athletes.map((player, index) => (
            <div
              key={index}
              style={{
                display: 'grid',
                gridTemplateColumns: '15% 25% 5% 15% 10% 30%',
                width: '100%',
                alignItems: 'center',
                paddingY: '4px',
                border: '2px solid',
                borderRadius: '5px',
                borderColor: `#${team.color}`,
                backgroundColor: '#f9f9f9',
                height: '54px',
              }}
            >
              <img
                src={`https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/${player.id}.png&h=96&w=96&scale=crop`}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = blankHeadshot;
                }}
                alt="playerPhoto"
                style={{ width: '50px', margin: 'auto' }}
              />
              <div style={{ textAlign: 'left' }}>
                <strong>{player.fullName}</strong>
              </div>
              <div style={{ textAlign: 'left', margin: 'auto' }}>
                {player.position?.abbreviation || 'Position N/A'}
              </div>
              <div style={{ textAlign: 'left', margin: 'auto' }}>
                {Math.floor(player.height * 2.54) + ' cm' || 'Height N/A'}
              </div>
              <div style={{ textAlign: 'left', margin: 'auto' }}>
                {player.jersey ? 'n°' + player.jersey : 'n°?'}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginRight: '12px',
                  textAlign: 'left',
                  width: '100%', // Assurez-vous que le conteneur occupe tout l'espace disponible
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                    maxWidth: 'calc(100% - 20px)',
                  }}
                >
                  {player.birthPlace.city}
                </div>
                {player.flag && player.flag.href ? (
                  <img
                    src={player.flag.href}
                    alt={player.flag.alt || 'birthCountry'}
                    title={player.flag.alt || 'birthCountry'}
                    style={{ marginLeft: '4px', marginRight: '8px', width: '16px' }}
                  />
                ) : (
                  <div
                    title={player.birthPlace.country || 'birthCountry'}
                    style={{
                      marginLeft: '4px',
                      marginRight: '8px',
                      width: '16px',
                      height: '12px',
                      backgroundColor: '#333',
                      color: 'white',
                      fontSize: '8px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    ?
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p>No roster available</p>
      )}
    </div>
  );
};

export default TeamRoster;
