import React from 'react';
import blankHeadshot from './assets/player.png';

const TeamRoster = ({ roster, rosterLoading, team, isSmallScreen }) => {
  return (
    <div style={{ textAlign: 'center', width: '100%' }}>
      {rosterLoading ? (
        <p>Loading the roster...</p>
      ) : roster && roster.athletes ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '10px',
            marginTop: '10px',
            maxHeight: '260px',
            overflowY: 'auto',
          }}
        >
          {roster.athletes.map((player, index) => {
            const height = player.height ? Math.floor(player.height * 2.54) + ' cm' : null;
            const city = player.birthPlace?.city;
            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 8px',
                  border: '2px solid',
                  borderRadius: '6px',
                  borderColor: `#${team.color}`,
                  backgroundColor: '#f9f9f9',
                  minHeight: '52px',
                }}
              >
                <img
                  src={`https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/${player.id}.png&h=96&w=96&scale=crop`}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = blankHeadshot;
                  }}
                  alt="playerPhoto"
                  style={{
                    width: '40px',
                    height: '40px',
                    flex: 'none',
                    objectFit: 'cover',
                    borderRadius: '4px',
                  }}
                />
                <div style={{ textAlign: 'left', minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={player.fullName}
                  >
                    {player.fullName}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.82em',
                      color: '#555',
                      marginTop: '2px',
                    }}
                  >
                    <span>{player.position?.abbreviation || '—'}</span>
                    {height && <span>{height}</span>}
                    <span>{player.jersey ? 'n°' + player.jersey : 'n°?'}</span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      {!isSmallScreen && city && (
                        <span
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={city}
                        >
                          {city}
                        </span>
                      )}
                      {player.flag && player.flag.href && (
                        <img
                          src={player.flag.href}
                          alt={player.flag.alt || 'birthCountry'}
                          title={player.flag.alt || player.birthPlace?.country || ''}
                          className="flag-image"
                          style={{
                            width: '16px',
                            height: '12px',
                            objectFit: 'cover',
                            flex: 'none',
                          }}
                        />
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p>No roster available</p>
      )}
    </div>
  );
};

export default TeamRoster;
