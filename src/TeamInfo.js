import React, { useState } from 'react';
import TeamRoster from './TeamRoster';
import TeamStanding from './TeamStanding';
import TeamLegends from './TeamLegends';

const TABS = [
  { id: 'roster', label: 'Roster' },
  { id: 'standing', label: 'Standing' },
  { id: 'legends', label: 'Legends' },
];

const TeamInfo = ({ roster, rosterLoading, team, isSmallScreen, gender, extraListH = 0 }) => {
  const [activeTab, setActiveTab] = useState('roster');

  const accentColor =
    team.color && !team.color.startsWith('#') ? `#${team.color}` : team.color || '#4B9CD3';

  return (
    <div style={{ '--tab-accent': accentColor, '--palm-extra': `${extraListH}px` }}>
      <div className="tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="tab-content">
        {activeTab === 'legends' && (
          <TeamLegends team={team} isSmallScreen={isSmallScreen} gender={gender} />
        )}
        {activeTab === 'roster' && (
          <TeamRoster
            roster={roster}
            rosterLoading={rosterLoading}
            team={team}
            isSmallScreen={isSmallScreen}
            gender={gender}
          />
        )}
        {activeTab === 'standing' && (
          <TeamStanding team={team} isSmallScreen={isSmallScreen} gender={gender} />
        )}
      </div>
    </div>
  );
};

export default TeamInfo;
