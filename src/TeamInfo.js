import React, { useState } from 'react';
import TeamRoster from './TeamRoster';
import TeamStanding from './TeamStanding';
import TeamLegends from './TeamLegends';

const TABS = [
  { id: 'legends', label: 'Legends' },
  { id: 'roster', label: 'Roster' },
  { id: 'standing', label: 'Standing' },
];

const TeamInfo = ({ roster, rosterLoading, team, isSmallScreen }) => {
  const [activeTab, setActiveTab] = useState('legends');

  const accentColor =
    team.color && !team.color.startsWith('#') ? `#${team.color}` : team.color || '#4B9CD3';

  return (
    <div style={{ '--tab-accent': accentColor }}>
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
        {activeTab === 'legends' && <TeamLegends team={team} isSmallScreen={isSmallScreen} />}
        {activeTab === 'roster' && (
          <TeamRoster
            roster={roster}
            rosterLoading={rosterLoading}
            team={team}
            isSmallScreen={isSmallScreen}
          />
        )}
        {activeTab === 'standing' && <TeamStanding team={team} isSmallScreen={isSmallScreen} />}
      </div>
    </div>
  );
};

export default TeamInfo;
