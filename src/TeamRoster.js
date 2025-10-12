import React from 'react';
import blankHeadshot from './assets/player.png';

const TeamRoster = ({ roster, rosterLoading, team, isSmallScreen }) => {
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
                gridTemplateColumns: isSmallScreen
                  ? '20% 40% 15% 15% 10%'
                  : '15% 25% 5% 15% 10% 30%',
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
              <div
                style={{
                  height: '100%',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  borderRadius: '4px',
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
                    height: '100%',
                    width: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    maxWidth: '100%',
                    maxHeight: '100%',
                  }}
                />
              </div>
              <div style={{ textAlign: 'left' }}>
                <strong>{player.fullName}</strong>
              </div>
              <div style={{ textAlign: 'left', margin: 'auto' }}>
                {player.position?.abbreviation || 'Position N/A'}
              </div>
              {!isSmallScreen && (
                <div style={{ textAlign: 'left', margin: 'auto' }}>
                  {Math.floor(player.height * 2.54) + ' cm' || 'Height N/A'}
                </div>
              )}
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
                  width: '100%',
                }}
              >
                {!isSmallScreen && (
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
                )}
                {player.flag && player.flag.href ? (
                  <img
                    src={player.flag.href}
                    alt={player.flag.alt || 'birthCountry'}
                    title={player.flag.alt || 'birthCountry'}
                    className="flag-image"
                    style={{
                      marginLeft: '4px',
                      marginRight: '8px',
                      width: '16px',
                      height: '12px',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <div
                    title={player.birthPlace.country || 'birthCountry'}
                    style={{
                      marginLeft: '4px',
                      marginRight: '8px',
                      width: isSmallScreen ? '12px' : '16px',
                      height: isSmallScreen ? '8px' : '12px',
                      backgroundColor: '#333',
                      color: 'white',
                      fontSize: isSmallScreen ? '6px' : '8px',
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
