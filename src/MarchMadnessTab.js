import React, { useEffect, useState } from 'react';
import {
  fetchBracket,
  regionsOf,
  teamLogo,
  shortRegion,
  REGION_COLORS,
  LATEST_SEASON,
} from './bracket';

// Onglet « March Madness » de la modale d'équipe : le parcours de l'équipe
// dans le tournoi de la dernière saison (défaite éventuelle en rouge).
const MarchMadnessTab = ({ team, gender, onOpenBracket }) => {
  const [games, setGames] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setGames(null);
    setError(false);
    fetchBracket(gender, LATEST_SEASON)
      .then((gs) => !cancelled && setGames(gs))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [gender, team.id]);

  if (error) return <div className="rt-empty">Couldn't load the bracket</div>;
  if (!games) return <div className="rt-empty">Loading…</div>;

  const regions = regionsOf(games);
  const rcolor = (rg) => REGION_COLORS[regions.indexOf(rg)] || '#64748b';
  const path = games
    .filter((g) => g.teams.some((t) => String(t.id) === String(team.id)))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (!path.length) return <div className="rt-empty">Not in the {LATEST_SEASON} tournament</div>;

  return (
    <div className="mmt">
      <div className="mmt-season">March Madness {LATEST_SEASON}</div>
      {path.map((g, i) => {
        const me = g.teams.find((t) => String(t.id) === String(team.id));
        const op = g.teams.find((t) => String(t.id) !== String(team.id));
        return (
          <div className={`mmt-step ${me.winner ? 'win' : 'loss'}`} key={i}>
            <div className="rd">
              {g.round}
              {g.region && (
                <>
                  <br />
                  <span style={{ color: rcolor(g.region) }}>{shortRegion(g.region)}</span>
                </>
              )}
            </div>
            <img src={teamLogo(op.id, 52)} alt="" />
            <div className="op">
              {op.seed} {op.name}
              <small>{g.date}</small>
            </div>
            <div className="wl">
              {me.winner ? 'W' : 'L'} {me.score}–{op.score}
            </div>
          </div>
        );
      })}
      {onOpenBracket && (
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          <button className="mmt-open" onClick={() => onOpenBracket(String(team.id))}>
            View full bracket →
          </button>
        </div>
      )}
    </div>
  );
};

export default MarchMadnessTab;
