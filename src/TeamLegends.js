import React, { useRef, useEffect } from 'react';
import blankHeadshot from './assets/player.png';
import hofLogo from './assets/hof.png';
import medalGold from './assets/medals/medal-gold.svg';
import medalSilver from './assets/medals/medal-silver.svg';
import medalBronze from './assets/medals/medal-bronze.svg';

const MEDAL_IMG = { gold: medalGold, silver: medalSilver, bronze: medalBronze };

// Teinte claire (70% vers le blanc) de la couleur de la fac — même rendu que l'en-tête.
const lightTint = (color) => {
  if (!color) return '#2a2a2a';
  const hex = color.replace('#', '');
  if (hex.length !== 6) return '#2a2a2a';
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const t = (c) => Math.round(c + (255 - c) * 0.7);
  return `rgb(${t(r)}, ${t(g)}, ${t(b)})`;
};

const getImageSrc = (id) => {
  try {
    return require(`./assets/players/${id}.jpg`);
  } catch {
    return blankHeadshot;
  }
};

const yrs = (v) => (Array.isArray(v) ? v.join(', ') : v);

// Construit la liste des badges NCAA (du plus prestigieux au moins).
const ncaaBadges = (player) => {
  const a = (player.awards && player.awards.ncaa) || {};
  const champ = a.champion || player.trophy; // rétro-compat: trophy = titres NCAA
  const out = [];
  if (champ && champ.length) out.push({ tier: 3, label: `Champion ${yrs(champ)}` });
  if (a.naismithPOY) out.push({ tier: 3, label: `National POY ${a.naismithPOY}` });
  if (a.tournamentMOP) out.push({ tier: 2, label: `Tournament MOP ${a.tournamentMOP}` });
  if (a.allAmerican)
    out.push({ tier: 1, label: `All-American${typeof a.allAmerican === 'string' ? ` ${a.allAmerican}` : ''}` });
  return out;
};

// Badges NBA.
const nbaBadges = (player) => {
  const a = (player.awards && player.awards.nba) || {};
  const out = [];
  if (a.champion && a.champion.length) out.push({ tier: 3, label: `Champion ${yrs(a.champion)}` });
  if (a.mvp) out.push({ tier: 3, label: `MVP ${a.mvp}` });
  if (a.finalsMVP && a.finalsMVP.length) out.push({ tier: 2, label: `Finals MVP ${yrs(a.finalsMVP)}` });
  if (a.roty) out.push({ tier: 2, label: `ROY ${a.roty}` });
  if (a.allStar) out.push({ tier: 1, label: `All-Star ×${a.allStar}` });
  if (a.allNBA) out.push({ tier: 1, label: typeof a.allNBA === 'number' ? `All-NBA ×${a.allNBA}` : 'All-NBA' });
  return out;
};

// Médailles internationales — regroupées par métal + épreuve, naming court.
// Ex: "Olympic Gold 2020, 2024" · "World Cup Bronze 1990"
const eventShort = (e) => {
  const l = (e || '').toLowerCase();
  if (l.includes('olymp')) return 'Olympic';
  if (l.includes('world') || l.includes('fiba') || l.includes('monde')) return 'World Cup';
  return e || '';
};
const metalWord = { gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };

const intlBadges = (player) => {
  const list = (player.awards && player.awards.intl) || [];
  const groups = {};
  for (const m of list) {
    const ev = eventShort(m.event);
    const key = `${m.medal}|${ev}`;
    if (!groups[key]) groups[key] = { medal: m.medal, event: ev, years: [] };
    if (m.year) groups[key].years.push(m.year);
  }
  return Object.values(groups).map((g) => {
    const cls = ['gold', 'silver', 'bronze'].includes(g.medal) ? `lc-${g.medal}` : 'lc-intl';
    const years = g.years.sort((a, b) => parseInt(a) - parseInt(b)).join(', ');
    const label = [g.event, metalWord[g.medal]].filter(Boolean).join(' ') + (years ? ` ${years}` : '');
    return { medal: g.medal, cls, label };
  });
};

const BadgeRow = ({ badges }) => (
  <div className="lc-brow">
    {badges.map((b, i) => (
      <span key={i} className={`lc-b lc-b${b.tier}`}>
        {b.label}
      </span>
    ))}
  </div>
);

const PlayerCard = ({ player, tint, gender }) => {
  const imgRef = useRef(null);
  const isDrafted = player.draftPosition && player.draftTeam && player.draftYear;

  const ncaa = ncaaBadges(player);
  const nba = nbaBadges(player);
  const intl = intlBadges(player);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const applyFit = () => {
      const containerRatio = img.parentElement.offsetWidth / img.parentElement.offsetHeight;
      const photoRatio = img.naturalWidth / img.naturalHeight;
      if (photoRatio > containerRatio) {
        img.style.objectFit = 'cover';
        img.style.objectPosition = 'center';
      } else {
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
      <div className="lc-pbox" style={{ background: tint }}>
        <img ref={imgRef} src={getImageSrc(player.id)} alt={player.name} className="lc-photo" />
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
              <strong>Drafted #{player.draftPosition}</strong> by the {player.draftTeam} in{' '}
              {player.draftYear}
            </>
          ) : (
            'Undrafted'
          )}
        </div>

        {ncaa.length > 0 && (
          <>
            <div className="lc-cat lc-cat-ncaa">NCAA</div>
            <BadgeRow badges={ncaa} />
          </>
        )}
        {nba.length > 0 && (
          <>
            <div className="lc-cat lc-cat-nba">{gender === 'women' ? 'WNBA' : 'NBA'}</div>
            <BadgeRow badges={nba} />
          </>
        )}
        {intl.length > 0 && (
          <>
            <div className="lc-cat lc-cat-intl">International</div>
            <div className="lc-brow">
              {intl.map((b, i) => (
                <span key={i} className={`lc-b ${b.cls}`}>
                  {MEDAL_IMG[b.medal] && (
                    <img className="lc-medal" src={MEDAL_IMG[b.medal]} alt="" />
                  )}
                  {b.label}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Score de "grandeur" d'une légende -> tri de la plus grande à la plus petite.
// Pondérations ajustables : le pro (HOF/MVP/titres/All-Star) pèse le plus, puis le college, puis l'international.
const MEDAL_PTS = { gold: 40, silver: 25, bronze: 15 };
const legendScore = (p) => {
  const a = p.awards || {};
  const ncaa = a.ncaa || {};
  const nba = a.nba || {};
  const intl = a.intl || [];
  let s = 0;
  // NBA
  if (p.hof) s += 1000;
  if (nba.mvp) s += 400;
  s += (Array.isArray(nba.finalsMVP) ? nba.finalsMVP.length : 0) * 200;
  s += (Array.isArray(nba.champion) ? nba.champion.length : 0) * 60;
  s += (typeof nba.allNBA === 'number' ? nba.allNBA : 0) * 50;
  s += (typeof nba.allStar === 'number' ? nba.allStar : 0) * 45;
  if (nba.roty) s += 60;
  // College
  if (ncaa.naismithPOY) s += 120;
  const ncaaChamps =
    Array.isArray(ncaa.champion) && ncaa.champion.length
      ? ncaa.champion.length
      : Array.isArray(p.trophy)
      ? p.trophy.length
      : 0;
  s += ncaaChamps * 35;
  if (ncaa.tournamentMOP) s += 60;
  if (ncaa.allAmerican) s += 45;
  // International
  intl.forEach((m) => (s += MEDAL_PTS[m.medal] || 0));
  // Départage : pick de draft plus haut = léger bonus
  const dp = parseInt(p.draftPosition, 10);
  if (!isNaN(dp) && dp > 0) s += Math.max(0, 61 - dp) * 0.5;
  return s;
};

const TeamLegends = ({ team, gender }) => {
  // Ordre : joueurs "épinglés" (legendRank: 1, 2, 3…) d'abord dans cet ordre,
  // puis les autres triés automatiquement par score de grandeur décroissant.
  const players = (team.oldPlayers || [])
    .filter((p) => p.id && p.name && p.years)
    .sort((a, b) => {
      const ra = typeof a.legendRank === 'number' ? a.legendRank : Infinity;
      const rb = typeof b.legendRank === 'number' ? b.legendRank : Infinity;
      if (ra !== rb) return ra - rb;
      return legendScore(b) - legendScore(a);
    });
  const tint = lightTint(team.color);

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
        <PlayerCard key={player.id} player={player} tint={tint} gender={gender} />
      ))}
    </div>
  );
};

export default TeamLegends;
