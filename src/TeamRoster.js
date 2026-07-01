import React, { useState, useEffect } from 'react';
import blankHeadshot from './assets/player.png';

// Cache de session : id joueur -> { data } | { error }. Évite de re-télécharger.
const STATS_CACHE = {};

// Teinte très claire (90% vers le blanc) de la couleur de la fac — fond du panneau/ligne ouverte.
const veryLightTint = (hex) => {
  const h = (hex || '').replace('#', '');
  if (h.length !== 6) return '#eaf1f8';
  const c = (i) => parseInt(h.substr(i, 2), 16);
  const t = (v) => Math.round(v + (255 - v) * 0.9);
  return `rgb(${t(c(0))}, ${t(c(2))}, ${t(c(4))})`;
};

const headshotUrl = (id) =>
  `https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/${id}.png&h=96&w=96&scale=crop`;

const statsUrl = (id) =>
  `https://site.web.api.espn.com/apis/common/v3/sports/basketball/mens-college-basketball/athletes/${id}/stats`;

// Extrait les moyennes de la saison la plus récente (dernière ligne = plus récente).
const parseStats = (json) => {
  const avg = (json.categories || []).find((c) => c.name === 'averages');
  if (!avg || !avg.statistics || avg.statistics.length === 0) return null;
  const row = avg.statistics[avg.statistics.length - 1];
  const labels = avg.labels || [];
  const vals = row.stats || [];
  if (!vals.length) return null;
  const get = (lbl) => {
    const i = labels.indexOf(lbl);
    return i >= 0 && vals[i] != null ? vals[i] : '—';
  };
  return {
    season: (row.season && row.season.displayName) || '',
    pts: get('PTS'),
    reb: get('REB'),
    ast: get('AST'),
    gp: get('GP'),
    min: get('MIN'),
    fgp: get('FG%'),
    tpp: get('3P%'),
    ftp: get('FT%'),
    stl: get('STL'),
    blk: get('BLK'),
    to: get('TO'),
  };
};

// Récupère les stats d'un joueur ; ne rejette jamais (timeout -> error) pour ne pas bloquer le tri.
const fetchStats = (id) =>
  new Promise((resolve) => {
    const to = setTimeout(() => resolve({ id, error: true }), 8000);
    fetch(statsUrl(id))
      .then((r) => r.json())
      .then((j) => {
        clearTimeout(to);
        resolve({ id, data: parseStats(j) });
      })
      .catch(() => {
        clearTimeout(to);
        resolve({ id, error: true });
      });
  });

// Valeur de points pour le tri (joueur sans stats -> -1, donc en bas).
const ptsValue = (entry) => {
  const v = entry && entry.data ? parseFloat(entry.data.pts) : NaN;
  return isNaN(v) ? -1 : v;
};

const StatBox = ({ v, l, className }) => (
  <div className={className}>
    <div className="rt-v">{v}</div>
    <div className="rt-l">{l}</div>
  </div>
);

const StatsPanel = ({ entry }) => {
  if (!entry || entry.loading) return <div className="rt-empty">Loading stats…</div>;
  if (entry.error || !entry.data) return <div className="rt-empty">No stats available</div>;
  const s = entry.data;
  return (
    <>
      {s.season && <div className="rt-season">{s.season} · Season averages</div>}
      <div className="rt-hero">
        <StatBox className="rt-s" v={s.pts} l="PPG" />
        <StatBox className="rt-s" v={s.reb} l="RPG" />
        <StatBox className="rt-s" v={s.ast} l="APG" />
      </div>
      <div className="rt-strip">
        <StatBox className="rt-s" v={s.gp} l="GP" />
        <StatBox className="rt-s" v={s.min} l="MIN" />
        <StatBox className="rt-s" v={s.fgp} l="FG%" />
        <StatBox className="rt-s" v={s.tpp} l="3P%" />
        <StatBox className="rt-s" v={s.ftp} l="FT%" />
        <StatBox className="rt-s" v={s.stl} l="STL" />
        <StatBox className="rt-s" v={s.blk} l="BLK" />
        <StatBox className="rt-s" v={s.to} l="TO" />
      </div>
    </>
  );
};

const TeamRoster = ({ roster, rosterLoading, team, isSmallScreen }) => {
  const [openId, setOpenId] = useState(null);
  const [, setTick] = useState(0); // force le re-render quand les stats async arrivent

  const athletes = roster && roster.athletes && roster.athletes.length ? roster.athletes : null;
  // Toutes les stats déjà en cache -> on affiche le tableau dès le 1er rendu (aucun flash "Loading").
  const allCached = athletes ? athletes.every((p) => STATS_CACHE[p.id]) : false;

  // Charge les stats manquantes (parallèle, cache de session) puis re-rend.
  useEffect(() => {
    setOpenId(null);
    if (!athletes || allCached) return;
    let cancelled = false;
    const missing = athletes.filter((p) => !STATS_CACHE[p.id]);
    Promise.all(missing.map((p) => fetchStats(p.id))).then((results) => {
      results.forEach((res) => {
        STATS_CACHE[res.id] = res.data ? { data: res.data } : { error: true };
      });
      if (!cancelled) setTick((t) => t + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [athletes, allCached]);

  const teamHex =
    team && team.color ? (team.color[0] === '#' ? team.color : `#${team.color}`) : '#00539b';
  const tint = veryLightTint(teamHex);

  const toggle = (id) => setOpenId((cur) => (cur === id ? null : id));

  if (rosterLoading) return <div className="rt-empty">Loading the roster…</div>;
  if (!athletes) return <div className="rt-empty">No roster available</div>;
  if (!allCached) return <div className="rt-empty">Loading the roster…</div>;

  const ordered = athletes
    .slice()
    .sort((a, b) => ptsValue(STATS_CACHE[b.id]) - ptsValue(STATS_CACHE[a.id]));
  const cols = isSmallScreen ? 5 : 7;

  return (
    <div className="rt-scroll" style={{ '--rt-team': teamHex, '--rt-tint': tint }}>
      <table className="rt">
        <thead>
          <tr>
            <th style={{ background: teamHex }}>#</th>
            <th style={{ background: teamHex }}>Player</th>
            <th style={{ background: teamHex }}>Pos</th>
            <th style={{ background: teamHex }}>Height</th>
            {!isSmallScreen && <th style={{ background: teamHex }}>Class</th>}
            {!isSmallScreen && <th style={{ background: teamHex }}>Hometown</th>}
            <th style={{ background: teamHex }} aria-label="expand"></th>
          </tr>
        </thead>
        <tbody>
          {ordered.map((player) => {
            const id = player.id;
            const isOpen = openId === id;
            const height = player.displayHeight
              ? player.displayHeight.replace(/\s/g, '')
              : player.height
              ? `${Math.floor(player.height * 2.54)} cm`
              : '—';
            const cls = (player.experience && player.experience.abbreviation) || '—';
            const city = player.birthPlace?.displayText || player.birthPlace?.city;
            return (
              <React.Fragment key={id}>
                <tr className={`rt-row${isOpen ? ' rt-open' : ''}`} onClick={() => toggle(id)}>
                  <td className="rt-num">{player.jersey || '—'}</td>
                  <td>
                    <div className="rt-pl">
                      <img
                        className="rt-av"
                        src={headshotUrl(id)}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = blankHeadshot;
                        }}
                        alt={player.fullName}
                      />
                      <span className="rt-nm" title={player.fullName}>
                        {isSmallScreen && player.flag && player.flag.href && (
                          <img
                            className="rt-flag"
                            src={player.flag.href}
                            alt={player.flag.alt || ''}
                            title={player.flag.alt || player.birthPlace?.country || ''}
                          />
                        )}
                        {player.fullName}
                      </span>
                    </div>
                  </td>
                  <td>{player.position?.abbreviation || '—'}</td>
                  <td className="rt-mut">{height}</td>
                  {!isSmallScreen && <td className="rt-mut">{cls}</td>}
                  {!isSmallScreen && (
                    <td className="rt-mut">
                      {player.flag && player.flag.href && (
                        <img
                          className="rt-flag"
                          src={player.flag.href}
                          alt={player.flag.alt || ''}
                          title={player.flag.alt || player.birthPlace?.country || ''}
                        />
                      )}
                      {city || '—'}
                    </td>
                  )}
                  <td style={{ textAlign: 'right' }}>
                    <span className="rt-chev">▶</span>
                  </td>
                </tr>
                <tr className="rt-exp">
                  <td colSpan={cols}>
                    <div className="rt-wrap" style={{ maxHeight: isOpen ? 200 : 0 }}>
                      <div className="rt-panel">
                        <StatsPanel entry={STATS_CACHE[id]} />
                      </div>
                    </div>
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TeamRoster;
