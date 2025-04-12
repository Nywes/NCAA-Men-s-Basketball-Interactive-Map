import React, { useState } from 'react';
import TeamRoster from './TeamRoster';
import TeamStanding from './TeamStanding';
import TeamLegends from './TeamLegends';

const TeamInfo = ({ roster, rosterLoading, team }) => {
  const [activeButton, setActiveButton] = useState(null);

  const toggleButton = (buttonId) => {
    if (activeButton === buttonId) {
      setActiveButton(null);
    } else {
      setActiveButton(buttonId);
    }
  };

  return (
    <div
      style={{
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-evenly',
          width: '100%',
        }}
      >
        <button
          onClick={() => toggleButton(1)}
          style={{
            cursor: 'pointer',
            padding: '10px',
            color: '#333',
            backgroundColor: '#FFFF',
            border: `2px solid #${team.color}`,
            borderRadius: '5px',
          }}
        >
          {activeButton === 1 ? 'Hide Roster' : 'Show Roster'}
        </button>

        <button
          onClick={() => toggleButton(2)}
          style={{
            cursor: 'pointer',
            padding: '10px',
            color: '#333',
            backgroundColor: '#FFFF',
            border: `2px solid #${team.color}`,
            borderRadius: '5px',
          }}
        >
          {activeButton === 2 ? `Hide Standing` : `Show Standing`}
        </button>

        <button
          onClick={() => toggleButton(3)}
          style={{
            cursor: 'pointer',
            padding: '10px',
            color: '#333',
            backgroundColor: '#FFFF',
            border: `2px solid #${team.color}`,
            borderRadius: '5px',
          }}
        >
          {activeButton === 3 ? `Hide Famous Players` : `Show Famous Players`}
        </button>
      </div>
      {activeButton === 1 && (
        <TeamRoster roster={roster} rosterLoading={rosterLoading} team={team} />
      )}
      {activeButton === 2 && <TeamStanding team={team} />}
      {activeButton === 3 && <TeamLegends team={team} />}
    </div>
  );
};

export default TeamInfo;
