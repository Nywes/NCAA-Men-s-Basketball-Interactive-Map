import React, { useState } from 'react';
import bracketData from './euroleague-bracket.json';

// Arbre Playoffs + Final Four EuroLeague, avec historique des saisons
// (euroleague-bracket.json = { current, seasons: { E2026: {...}, ... } }).
// La saison en cours sans playoffs affiche le Final Four à venir (`upcoming`).

function toTitle(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function Dots({ dots }) {
  if (!dots) return null;
  return (
    <div className="brk-dots">
      {dots.map((d, i) => (
        <i key={i} className={d === 'w' ? 'w' : 'l'} />
      ))}
    </div>
  );
}

function SeriesCard({ round, winner, loser, dots, style, big }) {
  return (
    <div className={`brk-card${big ? ' brk-card-final' : ''}`} style={style}>
      <div className="brk-head">
        <div className="brk-round">{round}</div>
        <Dots dots={dots} />
      </div>
      <div className="brk-team">
        <img src={winner.logo} alt="" />
        {winner.name}
        <span className="brk-sc">{winner.wins ?? winner.score}</span>
      </div>
      <div className="brk-team brk-lose">
        <img src={loser.logo} alt="" />
        {loser.name}
        <span className="brk-sc">{loser.wins ?? loser.score}</span>
      </div>
    </div>
  );
}

const SEASON_CODES = Object.keys(bracketData.seasons || {}).sort().reverse(); // récentes d'abord

function Title({ data, season, onSeason }) {
  const city = (data.finalFour && data.finalFour.city) || (data.upcoming && data.upcoming.city);
  return (
    <div className="brk-title-wrap">
      <div className="brk-title-main">{city ? `Road to ${city}` : 'Playoffs'}</div>
      <div className="brk-title-sub">
        Playoffs ·{' '}
        <select className="brk-yrsel" value={season} onChange={(e) => onSeason(e.target.value)} aria-label="Season">
          {SEASON_CODES.map((c) => (
            <option key={c} value={c}>
              {bracketData.seasons[c].seasonLabel}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default function EuroleagueBracket({ onClose, isSmallScreen }) {
  const [season, setSeason] = useState(bracketData.current || SEASON_CODES[0]);
  const data = bracketData.seasons[season] || {};
  const { playoffs, semifinals, final, finalFour, upcoming } = data;
  const ready = playoffs?.length === 4 && semifinals?.length === 2 && final;

  const stopClick = (e) => e.stopPropagation();

  if (!ready) {
    return (
      <div className="brk-overlay" onClick={onClose}>
        <div className="brk-panel brk-panel-mobile" onClick={stopClick}>
          <button className="brk-close" onClick={onClose}>×</button>
          <div className="brk-mobile">
            <Title data={data} season={season} onSeason={setSeason} />
            {upcoming ? (
              <div className="brk-upcoming">
                <div className="brk-up-row"><span>Playoffs</span><b>{upcoming.playoffsStart}</b></div>
                <div className="brk-up-row"><span>Final Four</span><b>{upcoming.venue}, {upcoming.city}</b></div>
                <div className="brk-up-row"><span>Dates</span><b>{upcoming.dates}</b></div>
                <p>The {data.seasonLabel} bracket will fill in as the playoffs are played. Pick a previous season above to browse past brackets.</p>
              </div>
            ) : (
              <p className="brk-upcoming-txt">The bracket isn't available for this season.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const semiA = semifinals[0];
  const semiB = semifinals[1];
  const pA1 = playoffs.find((p) => p.code === semiA.feeders[0]);
  const pA2 = playoffs.find((p) => p.code === semiA.feeders[1]);
  const pB1 = playoffs.find((p) => p.code === semiB.feeders[0]);
  const pB2 = playoffs.find((p) => p.code === semiB.feeders[1]);
  const venueLabel = finalFour?.venue ? toTitle(finalFour.venue) : null;

  if (isSmallScreen) {
    return (
      <div className="brk-overlay" onClick={onClose}>
        <div className="brk-panel brk-panel-mobile" onClick={stopClick}>
          <button className="brk-close" onClick={onClose}>×</button>
          <div className="brk-mobile">
            <Title data={data} season={season} onSeason={setSeason} />
            <div className="brk-mobile-list">
              <SeriesCard round={pA1.label} winner={pA1.winner} loser={pA1.loser} dots={pA1.dots} />
              <SeriesCard round={pA2.label} winner={pA2.winner} loser={pA2.loser} dots={pA2.dots} />
              <div className="brk-mobile-sep">{semiA.label}</div>
              <SeriesCard round={semiA.label} winner={semiA.winner} loser={semiA.loser} />
              <SeriesCard round={pB1.label} winner={pB1.winner} loser={pB1.loser} dots={pB1.dots} />
              <SeriesCard round={pB2.label} winner={pB2.winner} loser={pB2.loser} dots={pB2.dots} />
              <div className="brk-mobile-sep">{semiB.label}</div>
              <SeriesCard round={semiB.label} winner={semiB.winner} loser={semiB.loser} />
              <div className="brk-mobile-sep">{venueLabel ? `Final — ${venueLabel}` : 'Final'}</div>
              <SeriesCard round="Final" winner={final.winner} loser={final.loser} big />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="brk-overlay" onClick={onClose}>
      <div className="brk-panel" onClick={stopClick}>
        <button className="brk-close" onClick={onClose}>×</button>
        <div className="brk-canvas" style={{ width: 1124, height: 720 }}>
          <Title data={data} season={season} onSeason={setSeason} />

          <div className="brk-ff-label" style={{ left: 380, top: 110, width: 704 }}>
            {venueLabel ? `Final Four — ${venueLabel}` : 'Final Four'}
          </div>
          <div className="brk-ff-line" style={{ left: 380, top: 130, width: 704 }} />
          <div className="brk-ff-tick" style={{ left: 380, top: 130 }} />
          <div className="brk-ff-tick" style={{ left: 732, top: 130 }} />
          <div className="brk-ff-tick" style={{ left: 1082, top: 130 }} />

          <SeriesCard round={pA1.label} winner={pA1.winner} loser={pA1.loser} dots={pA1.dots} style={{ left: 40, top: 150, width: 280, height: 106 }} />
          <SeriesCard round={pA2.label} winner={pA2.winner} loser={pA2.loser} dots={pA2.dots} style={{ left: 40, top: 292, width: 280, height: 106 }} />
          <SeriesCard round={pB1.label} winner={pB1.winner} loser={pB1.loser} dots={pB1.dots} style={{ left: 40, top: 434, width: 280, height: 106 }} />
          <SeriesCard round={pB2.label} winner={pB2.winner} loser={pB2.loser} dots={pB2.dots} style={{ left: 40, top: 576, width: 280, height: 106 }} />

          <div className="brk-ln-h" style={{ left: 320, top: 203, width: 30 }} />
          <div className="brk-ln-h" style={{ left: 320, top: 345, width: 30 }} />
          <div className="brk-ln-v" style={{ left: 350, top: 203, height: 142 }} />
          <div className="brk-ln-h" style={{ left: 350, top: 274, width: 30 }} />

          <div className="brk-ln-h" style={{ left: 320, top: 487, width: 30 }} />
          <div className="brk-ln-h" style={{ left: 320, top: 629, width: 30 }} />
          <div className="brk-ln-v" style={{ left: 350, top: 487, height: 142 }} />
          <div className="brk-ln-h" style={{ left: 350, top: 558, width: 30 }} />

          <SeriesCard round={semiA.label} winner={semiA.winner} loser={semiA.loser} style={{ left: 380, top: 221, width: 300, height: 106 }} />
          <SeriesCard round={semiB.label} winner={semiB.winner} loser={semiB.loser} style={{ left: 380, top: 505, width: 300, height: 106 }} />

          <div className="brk-ln-h" style={{ left: 680, top: 274, width: 30 }} />
          <div className="brk-ln-h" style={{ left: 680, top: 558, width: 30 }} />
          <div className="brk-ln-v" style={{ left: 710, top: 274, height: 284 }} />
          <div className="brk-ln-h" style={{ left: 710, top: 416, width: 34 }} />

          <SeriesCard round="Final" winner={final.winner} loser={final.loser} big style={{ left: 744, top: 356, width: 340, height: 120 }} />
        </div>
      </div>
    </div>
  );
}
