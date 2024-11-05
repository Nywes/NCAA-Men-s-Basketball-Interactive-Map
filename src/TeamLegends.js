import React from 'react';
import blankHeadshot from './assets/player.png';
import trophy from './assets/ncaa-trophy.jpg';

const TeamLegends = ({ team }) => {
  const getImageSrc = (id) => {
    try {
      return require(`./assets/players/${id}.jpg`);
    } catch {
      return blankHeadshot;
    }
  };

  return (
    <div
      style={{
        marginTop: '8px',
        gap: '8px',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxHeight: '300px',
        overflowY: 'auto',
      }}
    >
      <h2>Team Famous Players</h2>
      {team.oldPlayers ? (
        <ul style={{ padding: 0 }}>
          {team.oldPlayers
            .filter(
              (player) =>
                player.id && player.name && player.years
            )
            .reduce((rows, player, index) => {
              if (index % 2 === 0) {
                rows.push([]);
              }
              rows[rows.length - 1].push(player);
              return rows;
            }, [])
            .map((pair, index) => (
              <li
                key={index}
                style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}
              >
                {pair.map((player) => (
                  <div
                    key={player.id}
                    style={{
                      flex: '1',
                      marginRight: index % 2 === 0 ? '8px' : '0',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}
                  >
                    <img
                      src={getImageSrc(player.id)}
                      alt={player.name}
                      style={{ height: '150px', maxWidth: '100%', objectFit: 'contain' }}
                    />
                    <h3 style={{ padding: '4px 0', textAlign: 'center' }}>{player.name}</h3>
                    <h5 style={{ fontWeight: 500, textAlign: 'center' }}>Years: {player.years}</h5>
                    {player.trophy && (
                      <div style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
                        {player.trophy.map((year, index) => (
                          <h5
                            key={index}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              fontWeight: 500,
                            }}
                          >
                            <img src={trophy} alt="ncaa-trophy" width="18px" height="18px" /> {year}
                          </h5>
                        ))}
                      </div>
                    )}
                    {player.draftPosition && player.draftTeam && player.draftYear ? (
                      <h5 style={{ fontWeight: 500, textAlign: 'center' }}>
                        Drafted {player.draftPosition} by the {player.draftTeam} in{' '}
                        {player.draftYear}
                      </h5>
                    ) : (
                      <h5 style={{ fontWeight: 500, textAlign: 'center' }}>Undrafted</h5>
                    )}
                  </div>
                ))}
              </li>
            ))}
        </ul>
      ) : (
        <h3 style={{ fontWeight: 500, textAlign: 'center' }}>No notable players</h3>
      )}
    </div>
  );
};

export default TeamLegends;
