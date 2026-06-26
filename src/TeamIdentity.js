import React from 'react';

// Paliers du tournoi NCAA, du plus prestigieux au moins. On affiche les 3 premiers
// paliers non vides (cf. documentation/teams_SUGGESTIONS.md §2).
const TIERS = [
  { key: 'titles', label: 'NCAA Champion', showYears: true },
  { key: 'finalFours', label: 'Final Four' },
  { key: 'eliteEights', label: 'Elite Eight' },
  { key: 'sweetSixteens', label: 'Sweet Sixteen' },
];

const TeamIdentity = ({ team }) => {
  const tournament = team.tournament || {};

  const rows = TIERS.map((tier) => ({
    ...tier,
    list: Array.isArray(tournament[tier.key]) ? tournament[tier.key] : [],
  }))
    .filter((tier) => tier.list.length > 0)
    .slice(0, 3);

  const meta = [team.venue, team.conference].filter(Boolean);
  const hasPalmares = rows.length > 0 || tournament.appearances;

  if (meta.length === 0 && !hasPalmares) return null;

  return (
    <div style={{ width: '100%', marginTop: '4px' }}>
      {meta.length > 0 && (
        <div style={{ fontSize: '0.9em', color: '#555', textAlign: 'center', marginBottom: '6px' }}>
          {meta.join(' · ')}
        </div>
      )}

      {hasPalmares && (
        <div
          style={{
            border: `2px solid #${team.color}`,
            borderRadius: '8px',
            padding: '8px 12px',
            backgroundColor: '#f9f9f9',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {rows.map((tier) => (
            <div
              key={tier.key}
              style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}
            >
              <span style={{ fontWeight: 600 }}>{tier.label}</span>
              <span style={{ textAlign: 'right' }}>
                {tier.list.length}
                {tier.showYears ? ` (${tier.list.join(', ')})` : ''}
              </span>
            </div>
          ))}
          {tournament.appearances ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ fontWeight: 600 }}>March Madness</span>
              <span>{tournament.appearances} appearances</span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default TeamIdentity;
