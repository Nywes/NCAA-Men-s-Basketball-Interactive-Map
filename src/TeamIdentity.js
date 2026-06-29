import React, { useState } from 'react';
import ncaaTrophy from './assets/ncaa-trophy.jpg';

const h = (v) => Math.round(v).toString(16).padStart(2, '0');

const getHeroGradient = (color) => {
  if (!color) return undefined;
  const hex = color.replace('#', '');
  if (hex.length !== 6) return undefined;
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const dark = `#${h(r * 0.18)}${h(g * 0.18)}${h(b * 0.18)}`;
  const mid = `#${h(r * 0.27)}${h(g * 0.27)}${h(b * 0.27)}`;
  return `linear-gradient(148deg, rgba(${r},${g},${b},.52), rgba(${r},${g},${b},.28)), linear-gradient(148deg, ${dark} 0%, ${mid} 100%)`;
};

const getAccentCardBg = (color) => {
  if (!color) return '#334155';
  const hex = color.replace('#', '');
  if (hex.length !== 6) return '#334155';
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  return `linear-gradient(135deg, rgb(${Math.round(r * 0.42)},${Math.round(g * 0.42)},${Math.round(b * 0.42)}), rgb(${Math.round(r * 0.58)},${Math.round(g * 0.58)},${Math.round(b * 0.58)}))`;
};

// Toutes les années, triées. On laisse le CSS gérer le retour à la ligne
// (plus d'années par ligne sur desktop, moins sur mobile).
const sortYears = (years) =>
  !years || years.length === 0 ? [] : [...years].sort((a, b) => parseInt(a) - parseInt(b));

// Règle d'affichage des dates : on montre tout, mais au-dessus de 10 années on
// n'affiche que le nombre — SAUF pour les titres et les Final Four (toujours datés).
const DATE_LIMIT = 10;
const showsDates = (key, count) => key === 'titles' || key === 'finalFours' || count <= DATE_LIMIT;

const ALL_STATS = [
  {
    key: 'finalFours',
    label: 'Final Four',
    getVal: (t) => (t.finalFours || []).length,
    getYears: (t) => t.finalFours || [],
  },
  {
    key: 'eliteEights',
    label: 'Elite Eight',
    getVal: (t) => (t.eliteEights || []).length,
    getYears: (t) => t.eliteEights || [],
  },
  {
    key: 'sweetSixteens',
    label: 'Sweet 16',
    getVal: (t) => (t.sweetSixteens || []).length,
    getYears: (t) => t.sweetSixteens || [],
  },
  {
    key: 'appearances',
    label: 'Appearances',
    getVal: (t) => t.appearances || 0,
    getYears: (t) => t.appearanceYears || [],
  },
];

const TeamIdentity = ({ team }) => {
  const [isOpen, setIsOpen] = useState(true);
  const tournament = team.tournament || {};

  const hasTitles = (tournament.titles || []).length > 0;
  const titleCount = (tournament.titles || []).length;
  const titleYears = sortYears(tournament.titles);

  const statsToShow = ALL_STATS.map((s) => ({ ...s, val: s.getVal(tournament) })).filter(
    (s) => s.val > 0
  );

  if (!hasTitles && statsToShow.length === 0) return null;

  return (
    <div>
      <div className="palm-toggle" onClick={() => setIsOpen(!isOpen)}>
        <span className="palm-toggle-label">NCAA Tournament</span>
        <span className={`palm-chevron${isOpen ? '' : ' closed'}`}>▼</span>
      </div>

      {isOpen && (
        <>
          {hasTitles && (
            <div className="palm-hero" style={{ background: getHeroGradient(team.color) }}>
              <img src={ncaaTrophy} alt="" className="palm-trophy-wm" />
              <div className="palm-hero-left">
                <div className="palm-hero-label">NCAA Champion</div>
                <div className="palm-num-row">
                  <span className="palm-num">{titleCount}</span>
                  <span className="palm-unit">{titleCount === 1 ? 'title' : 'titles'}</span>
                </div>
              </div>
              {titleYears.length > 0 && (
                <>
                  <div className="palm-hero-divider" />
                  <div className="palm-hero-years">{titleYears.join(' · ')}</div>
                </>
              )}
            </div>
          )}

          {statsToShow.length > 0 && (
            <div
              className="palm-stats"
              style={
                statsToShow.length === 1
                  ? { display: 'flex', justifyContent: 'center' }
                  : { gridTemplateColumns: `repeat(${Math.min(statsToShow.length, 4)}, 1fr)` }
              }
            >
              {statsToShow.map((stat, i) => {
                // For non-title teams: first stat gets team-color accent + years
                const isAccent = !hasTitles && i === 0;
                const years = isAccent ? sortYears(stat.getYears(tournament)) : null;
                const showYears = isAccent && years.length > 0 && showsDates(stat.key, stat.val);

                if (isAccent) {
                  return (
                    <div
                      key={stat.key}
                      className="palm-stat"
                      style={{
                        background: getAccentCardBg(team.color),
                        borderColor: 'transparent',
                        ...(statsToShow.length === 1 ? { width: '50%' } : {}),
                      }}
                    >
                      <div className="palm-stat-val" style={{ color: 'rgba(255,255,255,.95)' }}>
                        {stat.val}
                      </div>
                      <div className="palm-stat-label" style={{ color: 'rgba(255,255,255,.6)' }}>
                        {stat.label}
                      </div>
                      {showYears && (
                        <div className="palm-stat-yrs">{years.join(' · ')}</div>
                      )}
                    </div>
                  );
                }

                return (
                  <div
                    key={stat.key}
                    className="palm-stat"
                    style={statsToShow.length === 1 ? { width: '50%' } : {}}
                  >
                    <div className="palm-stat-val">{stat.val}</div>
                    <div className="palm-stat-label">{stat.label}</div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TeamIdentity;
