import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { sportPath } from './espn';
import { readableTeamColor } from './teamColors';

// Récupère le classement complet une seule fois par session ET PAR GENRE
// (grosse réponse -> mise en cache séparée hommes/femmes).
const STANDINGS_PROMISE = { men: null, women: null };
const STANDINGS_DATA = { men: null, women: null }; // résolu -> rendu synchrone (pas de flash "Loading")
const getStandings = (gender) => {
  if (STANDINGS_DATA[gender]) return Promise.resolve(STANDINGS_DATA[gender]);
  if (!STANDINGS_PROMISE[gender]) {
    STANDINGS_PROMISE[gender] = fetch(
      `https://site.api.espn.com/apis/v2/sports/basketball/${sportPath(gender)}/standings`
    )
      .then((r) => r.json())
      .then((d) => {
        STANDINGS_DATA[gender] = (d && d.children) || [];
        return STANDINGS_DATA[gender];
      })
      .catch((e) => {
        STANDINGS_PROMISE[gender] = null; // permet un nouvel essai après un échec
        throw e;
      });
  }
  return STANDINGS_PROMISE[gender];
};

const toHex = (c) => (c ? (c[0] === '#' ? c : `#${c}`) : '#00539b');

const rgbParts = (hex) => {
  const h = toHex(hex).replace('#', '');
  if (h.length !== 6) return null;
  return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
};

// Teinte très claire (90% vers le blanc) -> fond de la ligne de l'équipe courante.
const veryLightTint = (hex) => {
  const p = rgbParts(hex);
  if (!p) return '#e7eff7';
  const t = (v) => Math.round(v + (255 - v) * 0.9);
  return `rgb(${t(p[0])}, ${t(p[1])}, ${t(p[2])})`;
};

// Version plus sombre (pour l'en-tête des colonnes).
const darken = (hex, f) => {
  const p = rgbParts(hex);
  if (!p) return '#022f5c';
  return `rgb(${Math.round(p[0] * f)}, ${Math.round(p[1] * f)}, ${Math.round(p[2] * f)})`;
};

const byType = (entry, type) => (entry.stats || []).find((s) => s.type === type);
const dispOf = (entry, type) => {
  const s = byType(entry, type);
  return s ? s.displayValue : null;
};
const valOf = (entry, type) => {
  const s = byType(entry, type);
  return s && s.value != null ? s.value : null;
};

const diffFmt = (pf, pa) => {
  if (pf == null || pa == null) return { txt: '—', cls: 'st-mut' };
  const d = pf - pa;
  return { txt: (d >= 0 ? '+' : '') + d.toFixed(1), cls: d >= 0 ? 'st-pos' : 'st-neg' };
};

const logoUrl = (id) =>
  `https://a.espncdn.com/combiner/i?img=/i/teamlogos/ncaa/500/${id}.png&h=40&w=40`;

// Classement d'un seul groupe (ex. conférence absente de la liste générale,
// comme le Pac-12 relancé en 2026-27 avant que ses classements soient publiés).
const GROUP_PROMISE = { men: {}, women: {} };
const getGroupStandings = (gender, groupId) => {
  if (!GROUP_PROMISE[gender][groupId]) {
    GROUP_PROMISE[gender][groupId] = fetch(
      `https://site.api.espn.com/apis/v2/sports/basketball/${sportPath(gender)}/standings?group=${groupId}`
    )
      .then((r) => r.json())
      .catch(() => null);
  }
  return GROUP_PROMISE[gender][groupId];
};

const hasEntries = (c) => !!(c && c.standings && c.standings.entries && c.standings.entries.length);

// Conférence de l'équipe : d'abord par APPARTENANCE (le classement qui contient
// l'équipe), car le champ `groups` renvoyé par ESPN est parfois faux (en 2026-27
// les équipes de l'American pointent vers un groupe "50" qui n'est pas une
// conférence). Repli sur groups.id s'il est marqué comme conférence.
const findConf = (children, team) => {
  const id = String(team.id);
  const byMembership = children.find((c) =>
    (c.standings && c.standings.entries ? c.standings.entries : []).some((e) => e.team && String(e.team.id) === id)
  );
  if (byMembership) return byMembership;
  const g = team.groups;
  return (g && g.isConference && children.find((c) => c.id === g.id)) || null;
};

const TeamStanding = ({ team, isSmallScreen, gender }) => {
  // Rendu synchrone si le classement est déjà en cache -> pas d'état "Loading" au retour sur l'onglet.
  const cachedConf = STANDINGS_DATA[gender] ? findConf(STANDINGS_DATA[gender], team) : null;
  const [conf, setConf] = useState(cachedConf);
  const [loading, setLoading] = useState(!cachedConf);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);
  const meRowRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    if (!STANDINGS_DATA[gender]) {
      setLoading(true);
      setError(null);
    }
    getStandings(gender)
      .then(async (children) => {
        if (cancelled) return;
        let c = findConf(children, team);
        if (!c && team.groups && team.groups.id) {
          // Groupe absent de la liste générale : on l'interroge directement.
          const g = await getGroupStandings(gender, team.groups.id);
          if (cancelled) return;
          if (hasEntries(g)) c = g;
          else if (g && g.name) {
            setError(`${g.name} standings aren't available yet`);
            setLoading(false);
            return;
          }
        }
        if (c) setConf(c);
        else setError('No standings available');
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Error loading standings');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.id, gender]);

  // Centre le tableau sur l'équipe courante à l'ouverture (clampé : #1 -> vue normale en haut).
  useLayoutEffect(() => {
    const c = scrollRef.current;
    const m = meRowRef.current;
    if (!c || !m) return;
    const cRect = c.getBoundingClientRect();
    const mRect = m.getBoundingClientRect();
    c.scrollTop += mRect.top - cRect.top - (c.clientHeight - mRect.height) / 2;
  }, [conf, isSmallScreen]);

  if (loading) return <div className="st-empty">Loading standings…</div>;
  if (error) return <div className="st-empty">{error}</div>;
  if (!conf || !conf.standings || !conf.standings.entries) return <div className="st-empty">No standings available</div>;

  const teamHex = readableTeamColor(team, toHex());
  const entries = conf.standings.entries
    .slice()
    .sort((a, b) => {
      const sa = valOf(a, 'playoffseed');
      const sb = valOf(b, 'playoffseed');
      if (sa == null && sb == null) return 0;
      if (sa == null) return 1;
      if (sb == null) return -1;
      return sa - sb;
    });

  return (
    <div
      className="st-wrap"
      style={{ '--st-team': teamHex, '--st-teamd': darken(teamHex, 0.8), '--st-tint': veryLightTint(teamHex) }}
    >
      <div className="st-chead" style={{ background: teamHex }}>
        <span className="t">{conf.name}</span>
        <span className="s">{conf.standings.seasonDisplayName}</span>
      </div>
      <div className="st-scroll" ref={scrollRef}>
        <table className="st">
          <thead>
            <tr>
              <th style={{ background: darken(teamHex, 0.8) }}>#</th>
              <th className="l" style={{ background: darken(teamHex, 0.8) }}>Team</th>
              <th style={{ background: darken(teamHex, 0.8) }}>Conf</th>
              {!isSmallScreen && <th style={{ background: darken(teamHex, 0.8) }}>Ovr</th>}
              <th style={{ background: darken(teamHex, 0.8) }}>Strk</th>
              <th style={{ background: darken(teamHex, 0.8) }}>Diff</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => {
              const isMe = String(entry.team.id) === String(team.id);
              const rank = valOf(entry, 'playoffseed') != null ? valOf(entry, 'playoffseed') : index + 1;
              const confRec = dispOf(entry, 'vsconf') || '—';
              const overall = dispOf(entry, 'total') || '—';
              const streak = dispOf(entry, 'streak');
              const diff = diffFmt(valOf(entry, 'avgpointsfor'), valOf(entry, 'avgpointsagainst'));
              const name = entry.team.shortDisplayName || entry.team.displayName;
              return (
                <tr key={entry.team.id} className={isMe ? 'st-me' : ''} ref={isMe ? meRowRef : null}>
                  <td className="st-rk">{rank}</td>
                  <td className="l">
                    <div className="st-tm">
                      <img className="st-logo" src={logoUrl(entry.team.id)} alt="" />
                      <span title={name}>{name}</span>
                    </div>
                  </td>
                  <td>{confRec}</td>
                  {!isSmallScreen && <td className="st-mut">{overall}</td>}
                  <td>
                    {streak && streak !== '-' ? (
                      <span className={`st-strk ${streak[0] === 'W' ? 'st-win' : 'st-los'}`}>{streak}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className={diff.cls}>{diff.txt}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeamStanding;
