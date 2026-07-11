import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import blankHeadshot from './assets/player.png';
import euroleagueLogo from './assets/icons/euroleague-logo.png';
import euroleagueRostersData from './euroleague-rosters.json';
import euroleagueStandingsData from './euroleague-standings.json';
import euroleagueTeamsData from './euroleague-teams.json';
import euroleagueAnalyticsData from './euroleague-analytics.json';
import euroleagueRivalriesData from './euroleague-rivalries.json';

const TABS = [
  { id: 'roster', label: 'Roster' },
  { id: 'standing', label: 'Standing' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'club', label: 'Club' },
];

const SEASON = euroleagueStandingsData.season || '';
const LOGO_BY_ID = Object.fromEntries(euroleagueTeamsData.map((t) => [t.id, t.logo]));

const toHex = (c) => (c ? (c[0] === '#' ? c : `#${c}`) : '#F47216');

const rgbParts = (hex) => {
  const h = toHex(hex).replace('#', '');
  if (h.length !== 6) return null;
  return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
};


// Teinte très claire (90% vers le blanc) — fond des lignes actives.
const veryLightTint = (hex) => {
  const p = rgbParts(hex);
  if (!p) return '#fdeee2';
  const t = (v) => Math.round(v + (255 - v) * 0.9);
  return `rgb(${t(p[0])}, ${t(p[1])}, ${t(p[2])})`;
};

// Teinte claire (70% vers le blanc) — bannière palmarès, cohérente avec l'en-tête.
const lightTint = (hex) => {
  const p = rgbParts(hex);
  if (!p) return '#fbdcc3';
  const t = (v) => Math.round(v + (255 - v) * 0.7);
  return `rgb(${t(p[0])}, ${t(p[1])}, ${t(p[2])})`;
};

const darken = (hex, f) => {
  const p = rgbParts(hex);
  if (!p) return '#7a3200';
  return `rgb(${Math.round(p[0] * f)}, ${Math.round(p[1] * f)}, ${Math.round(p[2] * f)})`;
};

/* ═══════════════ Palmarès (titres EuroLeague) ═══════════════ */

const EuroleagueTeamIdentity = ({ team, isOpen, setIsOpen, onMeasure }) => {
  const honours = team.honours || {};
  const titles = honours.titles || [];

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

  if (titles.length === 0) return null;

  const years = [...titles].sort((a, b) => a - b);

  return (
    <div>
      <div className="palm-toggle" onClick={() => setIsOpen(!isOpen)}>
        <span className="palm-toggle-label">Trophies</span>
        <span className={`palm-chevron${isOpen ? '' : ' closed'}`}>▼</span>
      </div>

      {isOpen && (
        <div ref={contentRef} style={{ display: 'flow-root' }}>
          <div className="palm-hero" style={{ background: lightTint(team.color) }}>
            <img src={euroleagueLogo} alt="" className="palm-trophy-wm" />
            <div className="palm-hero-left">
              <div className="palm-hero-label">EuroLeague Champion</div>
              <div className="palm-num-row">
                <span className="palm-num">{years.length}</span>
                <span className="palm-unit">{years.length === 1 ? 'title' : 'titles'}</span>
              </div>
            </div>
            <div className="palm-hero-divider" />
            <div className="palm-hero-years">{years.join(' · ')}</div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════ Effectif ═══════════════ */

const fmtAvg = (v) => (v == null ? '—' : Number(v).toFixed(1));
const ppgValue = (p) => (p.ppg == null ? -1 : Number(p.ppg));

// Drapeau depuis le code pays (souvent ISO3, parfois code FIBA maison) fourni par
// l'API -> ISO2 pour flagcdn. Liste construite depuis tous les codes réellement
// présents dans les effectifs EuroLeague 2025-26.
const NAT_TO_ISO2 = {
  FRA: 'fr', USA: 'us', SRB: 'rs', ESP: 'es', GRE: 'gr', ITA: 'it', TUR: 'tr',
  LTU: 'lt', ISR: 'il', GER: 'de', CRO: 'hr', SLO: 'si', MNE: 'me', BIH: 'ba',
  GEO: 'ge', RUS: 'ru', CAN: 'ca', AUS: 'au', SEN: 'sn', BRA: 'br',
  ARG: 'ar', DOM: 'do', PUR: 'pr', BEL: 'be', NED: 'nl', POL: 'pl',
  CZE: 'cz', SUI: 'ch', SWE: 'se', FIN: 'fi', LAT: 'lv', UKR: 'ua', MKD: 'mk',
  KOS: 'xk', CMR: 'cm', MLI: 'ml', TUN: 'tn', VEN: 've', JPN: 'jp', NZL: 'nz',
  ANG: 'ao', BAH: 'bs', BUR: 'bf', CHI: 'cl', COL: 'co', CPV: 'cv', CUB: 'cu',
  DEN: 'dk', GAB: 'ga', GUI: 'gn', HUN: 'hu', IRL: 'ie', IVO: 'ci', NGR: 'ng',
  'UK ': 'gb', UK: 'gb',
};
const flagUrl = (code) => {
  const c2 = code && NAT_TO_ISO2[code.trim()];
  return c2 ? `https://flagcdn.com/w20/${c2}.png` : null;
};

const StatBox = ({ v, l }) => (
  <div className="rt-s">
    <div className="rt-v">{v}</div>
    <div className="rt-l">{l}</div>
  </div>
);

// Même chose que StatBox, mais réserve TOUJOURS une ligne de hauteur fixe pour
// le rang ligue (même vide) — les 3 cases PPG/RPG/APG restent alignées à la
// même hauteur, que le joueur soit classé ou non dans cette catégorie.
const HeroStatBox = ({ v, l, rank }) => (
  <div className="rt-s">
    <div className="rt-v">{v}</div>
    <div className="rt-l">{l}</div>
    <div className="rt-rank">{rank ? `#${rank} EL` : ' '}</div>
  </div>
);

const EuroPlayerPanel = ({ p }) => (
  <>
    <div className="rt-season">{SEASON} · Season averages</div>
    <div className="rt-hero">
      <HeroStatBox v={fmtAvg(p.ppg)} l="PPG" rank={p.leagueRank?.pts} />
      <HeroStatBox v={fmtAvg(p.rpg)} l="RPG" rank={p.leagueRank?.reb} />
      <HeroStatBox v={fmtAvg(p.apg)} l="APG" rank={p.leagueRank?.ast} />
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

const posShort = (pos) => {
  if (!pos) return '—';
  if (pos === 'Guard') return 'G';
  if (pos === 'Forward') return 'F';
  if (pos === 'Center') return 'C';
  return pos;
};

const EuroleagueRoster = ({ team, isSmallScreen }) => {
  const [openIdx, setOpenIdx] = useState(null);

  const players = euroleagueRostersData.rosters[team.id] || [];
  const teamHex = toHex(team.color);
  const tint = veryLightTint(teamHex);

  if (!players.length) return <div className="rt-empty">No roster available</div>;

  const ordered = players.slice().sort((a, b) => ppgValue(b) - ppgValue(a));
  const cols = isSmallScreen ? 4 : 6;

  return (
    <div className="rt-scroll" style={{ '--rt-team': teamHex, '--rt-tint': tint }}>
      <table className="rt">
        <thead>
          <tr>
            <th style={{ background: teamHex }}>#</th>
            <th style={{ background: teamHex }}>Player</th>
            <th style={{ background: teamHex }}>Pos</th>
            {!isSmallScreen && <th style={{ background: teamHex }}>Height</th>}
            {!isSmallScreen && <th style={{ background: teamHex }}>Nat</th>}
            <th style={{ background: teamHex }} aria-label="expand"></th>
          </tr>
        </thead>
        <tbody>
          {ordered.map((p, idx) => {
            const isOpen = openIdx === idx;
            const fullName = `${p.firstName} ${p.lastName}`.trim();
            const flag = flagUrl(p.nationality);
            return (
              <React.Fragment key={`${p.code}-${idx}`}>
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
                  {!isSmallScreen && <td className="rt-mut">{p.height ? `${p.height} cm` : '—'}</td>}
                  {!isSmallScreen && (
                    <td className="rt-mut">
                      {flag && <img className="rt-flag" src={flag} alt="" title={p.nationality} />}
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
                        <EuroPlayerPanel p={p} />
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

/* ═══════════════ Classement ═══════════════ */

const EuroleagueStanding = ({ team, isSmallScreen }) => {
  const scrollRef = useRef(null);
  const meRowRef = useRef(null);

  const rows = euroleagueStandingsData.standings || [];
  const teamHex = toHex(team.color);

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
        <span className="t">EuroLeague</span>
        <span className="s">{SEASON} · Regular season</span>
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
              const logo = r.teamId ? LOGO_BY_ID[r.teamId] : null;
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

/* ═══════════════ Analytics équipe (Offense/Défense/Pace + avancées) ═══════════════ */

// Libellés + formatage des métriques secondaires (tableau détaillé).
const METRIC_LABELS = {
  ppg: { label: 'Points scored', fmt: (v) => v.toFixed(1) },
  oppPpg: { label: 'Points allowed', fmt: (v) => v.toFixed(1) },
  efgPct: { label: 'Effective FG%', fmt: (v) => `${v.toFixed(1)}%` },
  tsPct: { label: 'True shooting%', fmt: (v) => `${v.toFixed(1)}%` },
  astRatio: { label: 'Assist ratio', fmt: (v) => `${v.toFixed(1)}%` },
  tovRatio: { label: 'Turnover ratio', fmt: (v) => `${v.toFixed(1)}%` },
  orebPct: { label: 'Off. rebound%', fmt: (v) => `${v.toFixed(1)}%` },
  drebPct: { label: 'Def. rebound%', fmt: (v) => `${v.toFixed(1)}%` },
  threePtRate: { label: '3PT rate', fmt: (v) => `${v.toFixed(1)}%` },
  ftRate: { label: 'FT rate', fmt: (v) => `${v.toFixed(1)}%` },
};

// Palier de couleur pour les 3 chips d'en-tête (1-5 = vert, 6-14 = orange, 15-20 = rouge).
const rankTier = (rank) => (rank <= 5 ? 'top' : rank <= 14 ? 'mid' : 'low');

const HeadlineChip = ({ label, rank, neutral }) => {
  if (!rank) return null;
  const tier = neutral ? 'neutral' : rankTier(rank);
  return (
    <div className={`an-chip an-chip-${tier}`}>
      <div className="an-chip-num">#{rank}</div>
      <div className="an-chip-lbl">{label}</div>
    </div>
  );
};

const EuroleagueAnalytics = ({ team }) => {
  const data = euroleagueAnalyticsData.byClub[team.id];
  if (!data) return <div className="rt-empty">No analytics available</div>;

  return (
    <div className="an-wrap">
      <div className="an-headline">
        <HeadlineChip label="Offense" rank={data.offRating.rank} />
        <HeadlineChip label="Defense" rank={data.defRating.rank} />
        <HeadlineChip label="Pace" rank={data.pace.rank} neutral />
      </div>
      <table className="an-table">
        <tbody>
          {Object.entries(METRIC_LABELS).map(([key, meta]) => {
            const m = data[key];
            if (!m || m.value == null) return null;
            const barPct = m.rank ? Math.round(((21 - m.rank) / 20) * 100) : 0;
            return (
              <tr key={key}>
                <td className="an-mlbl">{meta.label}</td>
                <td className="an-mval">{meta.fmt(m.value)}</td>
                <td className="an-mbar">
                  <span className="an-bar-track">
                    <span className="an-bar-fill" style={{ width: `${barPct}%` }} />
                  </span>
                </td>
                <td className="an-mrank">#{m.rank}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="meta-updated">
        {euroleagueAnalyticsData.season} · updated {euroleagueAnalyticsData.updated}
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

// Rivalité historique du club (si l'une des 5 grandes rivalités EuroLeague le
// concerne) : bilan cumulé sur plusieurs saisons + dernière confrontation,
// calculé à partir des vrais résultats de matchs (pas d'estimation).
const RivalryCard = ({ team }) => {
  const r = euroleagueRivalriesData.byClub[team.id];
  if (!r) return null;

  const last = r.lastMeeting;
  const homeIsSelf = last && last.homeCode === team.id;
  const homeName = homeIsSelf ? team.shortDisplayName : r.opponent.name;
  const awayName = homeIsSelf ? r.opponent.name : team.shortDisplayName;

  return (
    <div className="frc-rivalry">
      <div className="frc-rivalry-title">⚔️ {r.label}</div>
      <div className="frc-rivalry-row">
        <img className="frc-rivalry-logo" src={team.logo} alt="" />
        <div className="frc-rivalry-score">
          {r.wins}<span className="sep">–</span>{r.losses}
        </div>
        <img className="frc-rivalry-logo" src={r.opponent.logo} alt="" />
      </div>
      <div className="frc-rivalry-opp">vs {r.opponent.name}</div>
      <div className="frc-rivalry-meta">
        {r.totalMeetings} meetings · {euroleagueRivalriesData.seasonsRange}
      </div>
      {last && (
        <div className="frc-rivalry-last">
          Last meeting: {homeName} {last.homeScore}–{last.awayScore} {awayName} ({last.season.replace('E', '')})
        </div>
      )}
    </div>
  );
};

const EuroleagueClub = ({ team }) => (
  <div className="frc">
    {team.arenaPhoto && (
      <div className="frc-photo-card">
        <img className="frc-photo" src={team.arenaPhoto} alt={team.venue} />
      </div>
    )}
    <div className="frc-grid">
      <ClubFact label="Arena" value={team.venue} />
      <ClubFact
        label="Capacity"
        value={team.capacity ? Number(team.capacity).toLocaleString('en-US') : null}
      />
      <ClubFact label="City" value={team.location} />
    </div>
    {team.website && (
      <a
        className="frc-site"
        href={team.website}
        target="_blank"
        rel="noreferrer"
      >
        {team.website.replace(/^https?:\/\//, '')} ↗
      </a>
    )}
    <RivalryCard team={team} />
  </div>
);

/* ═══════════════ Assemblage : palmarès repliable + onglets ═══════════════ */

const EuroleagueTeamPanels = ({ team, isSmallScreen }) => {
  const [activeTab, setActiveTab] = useState('roster');
  const [palmOpen, setPalmOpen] = useState(true);
  const [palmH, setPalmH] = useState(0);

  const accentColor = toHex(team.color);

  return (
    <>
      <EuroleagueTeamIdentity
        team={team}
        isOpen={palmOpen}
        setIsOpen={setPalmOpen}
        onMeasure={setPalmH}
      />
      <div style={{ '--tab-accent': accentColor, '--palm-extra': `${palmOpen ? 0 : palmH}px` }}>
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
          {activeTab === 'roster' && <EuroleagueRoster team={team} isSmallScreen={isSmallScreen} />}
          {activeTab === 'standing' && <EuroleagueStanding team={team} isSmallScreen={isSmallScreen} />}
          {activeTab === 'analytics' && <EuroleagueAnalytics team={team} />}
          {activeTab === 'club' && <EuroleagueClub team={team} />}
        </div>
      </div>
    </>
  );
};

export default EuroleagueTeamPanels;
