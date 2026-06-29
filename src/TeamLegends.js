import React, { useRef, useEffect } from 'react';
import blankHeadshot from './assets/player.png';
import hofLogo from './assets/hof.png';

const getImageSrc = (id) => {
  try {
    return require(`./assets/players/${id}.jpg`);
  } catch {
    return blankHeadshot;
  }
};


const PlayerCard = ({ player }) => {
  const imgRef = useRef(null);
  const hasTrophy = player.trophy && player.trophy.length > 0;
  const isDrafted = player.draftPosition && player.draftTeam && player.draftYear;

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const applyFit = () => {
      const containerRatio = img.parentElement.offsetWidth / img.parentElement.offsetHeight;
      const photoRatio = img.naturalWidth / img.naturalHeight;
      if (photoRatio > containerRatio) {
        // Photo wider than container → contain leaves empty space top/bottom → use cover
        img.style.objectFit = 'cover';
        img.style.objectPosition = 'center';
      } else {
        // Photo narrower than container → empty space on sides → keep contain
        img.style.objectFit = 'contain';
        img.style.objectPosition = 'top center';
      }
    };
    if (img.complete && img.naturalWidth > 0) applyFit();
    else img.addEventListener('load', applyFit);
    return () => img.removeEventListener('load', applyFit);
  }, [player.id]);

  return (
    <div className="lc">
      <div className="lc-pbox">
        <img
          ref={imgRef}
          src={getImageSrc(player.id)}
          alt={player.name}
          className="lc-photo"
        />
        <div className="lc-grad" />
        <div className="lc-meta">
          <div className="lc-meta-left">
            <div className="lc-name">{player.name}</div>
            <div className="lc-years">{player.years}</div>
          </div>
          {player.hof && (
            <div className="lc-meta-right">
              <img src={hofLogo} alt="HOF" className="lc-hof-img" />
              <span className="lc-hof-lbl">Hall of Famer</span>
            </div>
          )}
        </div>
      </div>

      <div className="lc-body">
        <div className="lc-draft">
          {isDrafted ? (
            <>
              <strong>Drafted #{player.draftPosition}</strong> by the {player.draftTeam} in {player.draftYear}
            </>
          ) : (
            'Undrafted'
          )}
        </div>

        {hasTrophy && (
          <>
            <div className="lc-cat lc-cat-ncaa">NCAA</div>
            <div className="lc-brow">
              <span className="lc-b lc-b3">
                Champion {player.trophy.join(', ')}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const TeamLegends = ({ team }) => {
  const players = (team.oldPlayers || []).filter(
    (p) => p.id && p.name && p.years
  );

  if (players.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '16px 0' }}>
        No notable players
      </div>
    );
  }

  return (
    <div className="lc-grid">
      {players.map((player) => (
        <PlayerCard key={player.id} player={player} />
      ))}
    </div>
  );
};

export default TeamLegends;
