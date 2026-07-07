import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import blankHeadshot from './assets/player.png';
import lnbTrophy from './assets/lnb_trophy.png';
import frRostersData from './fr-rosters.json';
import frStandingsData from './fr-standings.json';
import frTeamsData from './fr-teams.json';
import frWomenStandingsData from './fr-women-standings.json';
import frWomenTeamsData from './fr-women-teams.json';

const TABS = [
  { id: 'roster', label: 'Roster' },
  { id: 'standing', label: 'Standing' },
  { id: 'club', label: 'Club' },
];

const DIVISION_NAMES = {
  elite: 'Betclic ÉLITE',
  prob: 'ÉLITE 2',
  d1: 'La Boulangère Wonderligue',
  d2: 'Ligue Féminine 2',
};
const MEN_SEASON = frStandingsData.season || '';

// Données de classement / logos selon le genre.
const STANDINGS_BY_GENDER = { men: frStandingsData, women: frWomenStandingsData };
const LOGO_BY_ID = {
  men: Object.fromEntries(frTeamsData.map((t) => [t.id, t.logo])),
  women: Object.fromEntries(frWomenTeamsData.map((t) => [t.id, t.logo])),
};

const toHex = (c) => (c ? (c[0] === '#' ? c : `#${c}`) : '#1d428a');

const rgbParts = (hex) => {
  const h = toHex(hex).replace('#', '');
  if (h.length !== 6) return null;
  return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
};

// Teinte très claire (90% vers le blanc) — fond des lignes actives.
const veryLightTint = (hex) => {
  const p = rgbParts(hex);
  if (!p) return '#e7eff7';
  const t = (v) => Math.round(v + (255 - v) * 0.9);
  return `rgb(${t(p[0])}, ${t(p[1])}, ${t(p[2])})`;
};

// Teinte claire (70% vers le blanc) — bannière palmarès, cohérente avec l'en-tête.
const lightTint = (hex) => {
  const p = rgbParts(hex);
  if (!p) return '#e8edf2';
  const t = (v) => Math.round(v + (255 - v) * 0.7);
  return `rgb(${t(p[0])}, ${t(p[1])}, ${t(p[2])})`;
};

const darken = (hex, f) => {
  const p = rgbParts(hex);
  if (!p) return '#022f5c';
  return `rgb(${Math.round(p[0] * f)}, ${Math.round(p[1] * f)}, ${Math.round(p[2] * f)})`;
};

/* ═══════════════ Palmarès (même design que le panneau NCAA Tournament) ═══════════════ */

// Choix de la bannière : Champion de France > Champion ÉLITE 2 > 1er titre européen.
const heroOf = (honours) => {
  if ((honours.titles || []).length > 0)
    return { label: 'Champion de France', years: honours.titles };
  if (honours.elite2 && honours.elite2.count > 0)
    return { label: 'Champion ÉLITE 2 / Pro B', years: honours.elite2.years || [] };
  if ((honours.european || []).length > 0) {
    const e = honours.european[0];
    return { label: e.label, years: e.years || [] };
  }
  return null;
};

const FrTeamIdentity = ({ team, isOpen, setIsOpen, onMeasure }) => {
  const honours = team.honours || {};

  const contentRef = useRef(null);
  useEffect(() => {
    const el = contentRef.current;
    if (!el || !onMeasure) return undefined;
    const report = () => onMeasure(el.getBoundingClientRect().height);
    report();
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isOpen, team, onMeasure]);

  const hero = heroOf(honours);
  const heroIsTitles = hero && hero.label === 'Champion de France';

  // Cartes secondaires : tout ce qui n'est pas déjà dans la bannière.
  const cards = [];
  if (honours.cups && honours.cups.count > 0)
    cards.push({ key: 'cups', label: 'Coupe de France', val: honours.cups.count });
  if (honours.leadersCup && honours.leadersCup.count > 0)
    cards.push({ key: 'lc', label: 'Leaders Cup', val: honours.leadersCup.count });
  if (heroIsTitles && honours.elite2 && honours.elite2.count > 0)
    cards.push({ key: 'e2', label: 'ÉLITE 2 / Pro B', val: honours.elite2.count });
  (honours.european || []).forEach((e, i) => {
    if (hero && !heroIsTitles && hero.label === e.label) return; // déjà en bannière
    cards.push({ key: `eu${i}`, label: e.label, val: (e.years || []).length || 1 });
  });

  if (!hero && cards.length === 0) return null;

  const heroYears = hero ? [...hero.years].sort((a, b) => a - b) : [];

  return (
    <div>
      <div className="palm-toggle" onClick={() => setIsOpen(!isOpen)}>
        <span className="palm-toggle-label">Trophies</span>
        <span className={`palm-chevron${isOpen ? '' : ' closed'}`}>▼</span>
      </div>

      {isOpen && (
        <div ref={contentRef} style={{ display: 'flow-root' }}>
          {hero && (
            <div className="palm-hero" style={{ background: lightTint(team.color) }}>
              <img src={lnbTrophy} alt="" className="palm-trophy-wm" />
              <div className="palm-hero-left">
                <div className="palm-hero-label">{hero.label}</div>
                <div className="palm-num-row">
                  <span className="palm-num">{heroYears.length}</span>
                  <span className="palm-unit">{heroYears.length === 1 ? 'title' : 'titles'}</span>
                </div>
              </div>
              {heroYears.length > 0 && (
                <>
                  <div className="palm-hero-divider" />
                  <div className="palm-hero-years">{heroYears.join(' · ')}</div>
                </>
              )}
            </div>
          )}

          {cards.length > 0 && (
            <div
              className="palm-stats"
              style={
                cards.length === 1
                  ? { display: 'flex', justifyContent: 'center' }
                  : { gridTemplateColumns: `repeat(${Math.min(cards.length, 4)}, 1fr)` }
              }
            >
              {cards.map((c) => (
                <div
                  key={c.key}
                  className={`palm-stat${cards.length === 1 ? ' palm-stat-solo' : ''}`}
                >
                  <div className="palm-stat-val">{c.val}</div>
                  <div className="palm-stat-label">{c.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ═══════════════ Effectif (données officielles LNB, stats de la saison) ═══════════════ */

// "1 - Meneur" -> "1" (compact) ; l'intitulé complet reste en title.
const posShort = (pos) => {
  if (!pos) return '—';
  const m = pos.match(/^([0-9/]+)\s*-/);
  return m ? m[1] : pos;
};

const fmtAvg = (v) => (v == null ? '—' : Number(v).toFixed(1));

const ppgValue = (p) => (p.ppg == null ? -1 : Number(p.ppg));

// Drapeau depuis le code pays ISO2 fourni par la LNB (ex: FR, US, NG).
const flagUrl = (code) =>
  code && code.length === 2 ? `https://flagcdn.com/w20/${code.toLowerCase()}.png` : null;

const StatBox = ({ v, l }) => (
  <div className="rt-s">
    <div className="rt-v">{v}</div>
    <div className="rt-l">{l}</div>
  </div>
);

// Panneau déplié : uniquement les stats de la saison (les infos joueur — âge,
// taille, drapeau — sont déjà visibles sur la ligne repliée).
const FrPlayerPanel = ({ p }) => (
  <>
    <div className="rt-season">{MEN_SEASON} · Season averages</div>
    <div className="rt-hero">
      <StatBox v={fmtAvg(p.ppg)} l="PPG" />
      <StatBox v={fmtAvg(p.rpg)} l="RPG" />
      <StatBox v={fmtAvg(p.apg)} l="APG" />
    </div>
    <div className="rt-strip">
      <StatBox v={p.gp ?? '—'} l="GP" />
      <StatBox v={fmtAvg(p.min)} l="MIN" />
      <StatBox v={fmtAvg(p.spg)} l="STL" />
      <StatBox v={fmtAvg(p.bpg)} l="BLK" />
      <StatBox v={fmtAvg(p.tov)} l="TO" />
      <StatBox v={fmtAvg(p.p2)} l="2P%" />
      <StatBox v={fmtAvg(p.p3)} l="3P%" />
      <StatBox v={fmtAvg(p.ft)} l="FT%" />
    </div>
  </>
);

const FrTeamRoster = ({ team, isSmallScreen }) => {
  const [openIdx, setOpenIdx] = useState(null);

  const players = frRostersData.rosters[team.id] || [];
  const teamHex = toHex(team.color);
  const tint = veryLightTint(teamHex);

  if (!players.length) return <div className="rt-empty">No roster available</div>;

  const ordered = players.slice().sort((a, b) => ppgValue(b) - ppgValue(a));
  const cols = isSmallScreen ? 5 : 7;

  return (
    <div className="rt-scroll" style={{ '--rt-team': teamHex, '--rt-tint': tint }}>
      <table className="rt">
        <thead>
          <tr>
            <th style={{ background: teamHex }}>#</th>
            <th style={{ background: teamHex }}>Player</th>
            <th style={{ background: teamHex }}>Pos</th>
            <th style={{ background: teamHex }}>PTS</th>
            {!isSmallScreen && <th style={{ background: teamHex }}>Height</th>}
            {!isSmallScreen && <th style={{ background: teamHex }}>Age</th>}
            <th style={{ background: teamHex }} aria-label="expand"></th>
          </tr>
        </thead>
        <tbody>
          {ordered.map((p, idx) => {
            const isOpen = openIdx === idx;
            const fullName = `${p.firstName} ${p.lastName}`.trim();
            const flag = flagUrl(p.nationality);
            return (
              <React.Fragment key={`${p.lastName}-${idx}`}>
                <tr
                  className={`rt-row${isOpen ? ' rt-open' : ''}`}
                  onClick={() => setOpenIdx((cur) => (cur === idx ? null : idx))}
                >
                  <td className="rt-num">{p.number || '—'}</td>
                  <td>
                    <div className="rt-pl">
                      <img
                        className="rt-av"
                        src={p.photo || blankHeadshot}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = blankHeadshot;
                        }}
                        alt={fullName}
                      />
                      <span className="rt-nm" title={fullName}>
                        {isSmallScreen && flag && (
                          <img className="rt-flag" src={flag} alt="" title={p.nationality} />
                        )}
                        {fullName}
                      </span>
                    </div>
                  </td>
                  <td title={p.position || ''}>{posShort(p.position)}</td>
                  <td className="rt-mut">{fmtAvg(p.ppg)}</td>
                  {!isSmallScreen && <td className="rt-mut">{p.height ? `${p.height} cm` : '—'}</td>}
                  {!isSmallScreen && (
                    <td className="rt-mut">
                      {flag && (
                        <img className="rt-flag" src={flag} alt="" title={p.nationality} />
                      )}
                      {p.age ?? '—'}
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
                        <FrPlayerPanel p={p} />
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

/* ═══════════════ Classement (snapshot officiel LNB) ═══════════════ */

const FrTeamStanding = ({ team, isSmallScreen, gender = 'men' }) => {
  const scrollRef = useRef(null);
  const meRowRef = useRef(null);

  const data = STANDINGS_BY_GENDER[gender] || frStandingsData;
  const season = data.season || '';
  const logoById = LOGO_BY_ID[gender] || LOGO_BY_ID.men;
  const rows = data.standings[team.division] || [];
  const teamHex = toHex(team.color);

  // Centre le tableau sur l'équipe courante à l'ouverture.
  useLayoutEffect(() => {
    const c = scrollRef.current;
    const m = meRowRef.current;
    if (!c || !m) return;
    const cRect = c.getBoundingClientRect();
    const mRect = m.getBoundingClientRect();
    c.scrollTop += mRect.top - cRect.top - (c.clientHeight - mRect.height) / 2;
  }, [isSmallScreen]);

  if (!rows.length) return <div className="st-empty">No standings available</div>;

  return (
    <div
      className="st-wrap"
      style={{
        '--st-team': teamHex,
        '--st-teamd': darken(teamHex, 0.8),
        '--st-tint': veryLightTint(teamHex),
      }}
    >
      <div className="st-chead" style={{ background: teamHex }}>
        <span className="t">{DIVISION_NAMES[team.division] || team.division}</span>
        <span className="s">
          {season} · Regular season
        </span>
      </div>
      <div className="st-scroll" ref={scrollRef}>
        <table className="st">
          <thead>
            <tr>
              <th style={{ background: darken(teamHex, 0.8) }}>#</th>
              <th className="l" style={{ background: darken(teamHex, 0.8) }}>Team</th>
              <th style={{ background: darken(teamHex, 0.8) }}>W</th>
              <th style={{ background: darken(teamHex, 0.8) }}>L</th>
              {!isSmallScreen && <th style={{ background: darken(teamHex, 0.8) }}>Win%</th>}
              <th style={{ background: darken(teamHex, 0.8) }}>Last 5</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isMe = r.teamId === team.id;
              const logo = r.teamId ? logoById[r.teamId] : null;
              return (
                <tr key={r.rank} className={isMe ? 'st-me' : ''} ref={isMe ? meRowRef : null}>
                  <td className="st-rk">{r.rank}</td>
                  <td className="l">
                    <div className="st-tm">
                      {logo && <img className="st-logo" src={logo} alt="" />}
                      <span title={r.name}>{r.name}</span>
                    </div>
                  </td>
                  <td>{r.wins}</td>
                  <td className="st-mut">{r.losses}</td>
                  {!isSmallScreen && (
                    <td className="st-mut">
                      {r.winPct != null ? `${Math.round(r.winPct)}%` : '—'}
                    </td>
                  )}
                  <td>
                    {r.lastFive && r.lastFive.length ? (
                      <span className="st-l5" title="Oldest → most recent">
                        {r.lastFive.map((res, i) => (
                          <i key={i} className={res === 'W' ? 'st-l5w' : 'st-l5l'} />
                        ))}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ═══════════════ Onglet Club ═══════════════ */

const ClubFact = ({ label, value }) => {
  if (!value) return null;
  return (
    <div className="frc-fact">
      <div className="frc-label">{label}</div>
      <div className="frc-value">{value}</div>
    </div>
  );
};

const FrTeamClub = ({ team }) => (
  <div className="frc">
    <div className="frc-grid">
      <ClubFact label="Arena" value={team.venue} />
      <ClubFact
        label="Capacity"
        value={team.capacity ? Number(team.capacity).toLocaleString('en-US') : null}
      />
      <ClubFact label="City" value={team.location} />
      <ClubFact label="Founded" value={team.formedYear} />
    </div>
    {team.website && (
      <a
        className="frc-site"
        href={`https://${team.website.replace(/^https?:\/\//, '')}`}
        target="_blank"
        rel="noreferrer"
      >
        {team.website.replace(/^https?:\/\//, '')} ↗
      </a>
    )}
  </div>
);

/* ═══════════════ Assemblage : palmarès repliable + onglets ═══════════════ */

const FrTeamPanels = ({ team, isSmallScreen, gender = 'men' }) => {
  const isWomen = gender === 'women';
  // Côté féminin : pas de roster/stats (aucune API JSON propre) -> onglet masqué.
  const tabs = isWomen ? TABS.filter((t) => t.id !== 'roster') : TABS;
  const [activeTab, setActiveTab] = useState(isWomen ? 'standing' : 'roster');
  const [palmOpen, setPalmOpen] = useState(true);
  const [palmH, setPalmH] = useState(0);

  const accentColor = toHex(team.color);

  return (
    <>
      <FrTeamIdentity
        team={team}
        isOpen={palmOpen}
        setIsOpen={setPalmOpen}
        onMeasure={setPalmH}
      />
      <div
        style={{ '--tab-accent': accentColor, '--palm-extra': `${palmOpen ? 0 : palmH}px` }}
      >
        <div className="tab-bar">
          {tabs.map((tab) => (
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
          {activeTab === 'roster' && !isWomen && (
            <FrTeamRoster team={team} isSmallScreen={isSmallScreen} />
          )}
          {activeTab === 'standing' && (
            <FrTeamStanding team={team} isSmallScreen={isSmallScreen} gender={gender} />
          )}
          {activeTab === 'club' && <FrTeamClub team={team} />}
        </div>
      </div>
    </>
  );
};

export default FrTeamPanels;
