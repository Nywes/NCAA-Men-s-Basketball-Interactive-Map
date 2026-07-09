import React, { useEffect, useRef, useState } from 'react';
import mmLogo from './assets/march-madness-logo.png';
import {
  fetchBracket,
  regionsOf,
  regionRounds,
  teamLogo,
  bracketTint,
  shortRegion,
  ROUNDS,
  REGION_COLORS,
  LATEST_SEASON,
  FIRST_SEASON,
} from './bracket';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

/* Ligne d'équipe : survol = aperçu du parcours, clic = sélection (parcours
   peint aux couleurs de l'équipe + chip d'action). Hoisté au niveau module
   pour garder une identité stable (pas de re-mount à chaque re-render). */
function TLine({ t, small, ui }) {
  const isSel = ui.selId === t.id;
  const isHov = ui.hoverId === t.id && !isSel;
  return (
    <div
      className={`mm-tline${t.winner ? ' w' : ''}${isHov ? ' hov' : ''}`}
      style={
        isSel
          ? { background: bracketTint(t.color), boxShadow: `inset 3px 0 0 #${t.color}` }
          : undefined
      }
      onMouseEnter={() => ui.onHover(t.id)}
      onMouseLeave={() => ui.onHover(null)}
      onClick={(e) => {
        e.stopPropagation();
        ui.onSel(t.id);
      }}
    >
      <span className="seed">{t.seed ?? ''}</span>
      <img src={teamLogo(t.id)} alt="" />
      <span className="nm">{small ? t.abbr || t.name : t.name}</span>
      <span className="sc">{t.score || ''}</span>
    </div>
  );
}

function MatchBox({ g, small, ui }) {
  return (
    <div className="mm-match">
      <TLine t={g.teams[0]} small={small} ui={ui} />
      <TLine t={g.teams[1]} small={small} ui={ui} />
    </div>
  );
}

/* ═══════════ Overlay plein écran : le bracket March Madness ═══════════ */
export default function MarchMadnessOverlay({
  open,
  onClose,
  gender,
  preselect,
  onShowOnMap,
  isSmallScreen,
}) {
  const [year, setYear] = useState(LATEST_SEASON);
  const [games, setGames] = useState(null);
  const [error, setError] = useState(false);
  const [view, setView] = useState('Overview');
  const [sel, setSel] = useState(null);
  const [hover, setHover] = useState(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const phScrollRef = useRef(null);
  const [phDot, setPhDot] = useState(0);

  // Pré-sélection (depuis l'onglet March Madness d'une modale d'équipe).
  useEffect(() => {
    if (open) {
      setSel(preselect || null);
      setView('Overview');
      setAboutOpen(false);
      setYear(LATEST_SEASON);
    }
  }, [open, preselect]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setGames(null);
    setError(false);
    fetchBracket(gender, year)
      .then((gs) => !cancelled && setGames(gs))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [open, gender, year]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Changement d'onglet (mobile) : on repart au premier tour.
  useEffect(() => {
    setPhDot(0);
    if (phScrollRef.current) phScrollRef.current.scrollLeft = 0;
  }, [view, games]);

  if (!open) return null;

  const regions = games ? regionsOf(games) : [];
  const rcolor = (rg) => REGION_COLORS[regions.indexOf(rg)] || '#64748b';
  const teamById = {};
  if (games) games.forEach((g) => g.teams.forEach((t) => (teamById[t.id] = t)));
  const selTeam = sel ? teamById[sel] : null;

  const years = [];
  for (let y = LATEST_SEASON; y >= (FIRST_SEASON[gender] || 2009); y--) years.push(y);

  const ui = {
    selId: sel,
    hoverId: hover,
    onHover: setHover,
    onSel: (id) => setSel((s) => (s === id ? null : id)),
  };

  /* ── vues (fonctions simples : pas de re-mount, hooks au niveau du composant) ── */

  const ffStrip = (list, label, compact) =>
    list.length ? (
      <div className={`mm-ffstrip${compact ? ' compact' : ''}`}>
        <div className="t">{label}</div>
        <div className="g">
          {list.map((g, i) => (
            <div key={i}>
              <MatchBox g={g} small ui={ui} />
              {g.region && (
                <div className="rg" style={{ color: rcolor(g.region) }}>
                  {shortRegion(g.region)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    ) : null;

  const renderOverview = () => {
    const f4 = games.filter((g) => g.round === 'Final Four');
    const fin = games.find((g) => g.round === 'National Championship');
    const ff = games.filter((g) => g.round === 'First Four');
    const regionOf = {};
    games.forEach((g) => {
      if (g.region)
        g.teams.forEach((t) => {
          if (!(t.id in regionOf)) regionOf[t.id] = g.region;
        });
    });
    // Moitiés gauche/droite = les vraies affiches des demi-finales.
    const left = f4[0] ? f4[0].teams.map((t) => regionOf[t.id]) : regions.slice(0, 2);
    const right = f4[1] ? f4[1].teams.map((t) => regionOf[t.id]) : regions.slice(2, 4);
    const champ = fin && fin.teams.find((t) => t.winner);

    const half = (regs, mirror) => (
      <div className="mm-half">
        {regs.filter(Boolean).map((rg) => {
          const rr = regionRounds(games, rg);
          const cols = ROUNDS.map((rd) => (
            <div className="mm-col" key={rd}>
              {rr[rd].map((g, i) => (
                <MatchBox g={g} small ui={ui} key={i} />
              ))}
            </div>
          ));
          return (
            <div key={rg}>
              <div
                className="mm-rtitle"
                style={{ color: rcolor(rg), textAlign: mirror ? 'right' : 'left' }}
                onClick={() => setView(rg)}
                title={`Zoom on ${shortRegion(rg)}`}
              >
                {shortRegion(rg)} ⌕
              </div>
              <div className="mm-cols">{mirror ? cols.slice().reverse() : cols}</div>
            </div>
          );
        })}
      </div>
    );

    return (
      <>
        <div style={{ overflowX: 'auto' }}>
          <div className="mm-bcast">
            {half(left, false)}
            <div className="mm-center">
              {f4[0] && (
                <div>
                  <div className="mm-lbl">Semifinal</div>
                  <MatchBox g={f4[0]} ui={ui} />
                </div>
              )}
              <div className="mm-final-block">
                {champ && (
                  <div className="mm-champ">
                    <div className="lbl">Champion</div>
                    <img src={teamLogo(champ.id, 116)} alt="" />
                    <div className="nm">{champ.name}</div>
                  </div>
                )}
                {fin && (
                  <>
                    <div className="mm-lbl" style={{ marginTop: 12 }}>
                      National Championship
                    </div>
                    <MatchBox g={fin} ui={ui} />
                  </>
                )}
              </div>
              {f4[1] && (
                <div>
                  <div className="mm-lbl">Semifinal</div>
                  <MatchBox g={f4[1]} ui={ui} />
                </div>
              )}
            </div>
            {half(right, true)}
          </div>
        </div>
        {ffStrip(ff, 'First Four')}
      </>
    );
  };

  const renderRegionZoom = (rg) => {
    const rr = regionRounds(games, rg);
    const ff = games.filter((g) => g.round === 'First Four' && g.region === rg);
    const col = (rd, links) => {
      const gs = rr[rd];
      const pairs = [];
      for (let i = 0; i < gs.length; i += 2) pairs.push(gs.slice(i, i + 2));
      return (
        <div className="mm-zrcol">
          <div className="hd">{rd}</div>
          <div className="mm-zrslots">
            {pairs.map((p, i) => (
              <div className={`mm-pair${links && gs.length > 1 ? ' link' : ''}`} key={i}>
                {p.map((g, k) => (
                  <MatchBox g={g} ui={ui} key={k} />
                ))}
              </div>
            ))}
          </div>
        </div>
      );
    };
    return (
      <>
        {ffStrip(ff, `First Four (play-in) · ${shortRegion(rg)}`, true)}
        <div style={{ overflowX: 'auto' }}>
          <div className="mm-zr">
            {col('1st Round', true)}
            {col('2nd Round', true)}
            {col('Sweet 16', true)}
            {col('Elite 8', false)}
          </div>
        </div>
      </>
    );
  };

  const renderFinalFour = () => {
    const f4 = games.filter((g) => g.round === 'Final Four');
    const fin = games.find((g) => g.round === 'National Championship');
    if (!fin) return <div className="mm-empty">Final Four not played yet</div>;
    const champ = fin.teams.find((t) => t.winner);
    const wins = games.filter((g) => g.teams.some((t) => t.id === champ.id && t.winner)).length;
    return (
      <div className="mm-ffstage">
        <div className="top">
          <img className="wordmark" src={mmLogo} alt="March Madness" />
          <div className="where">
            Final Four{fin.venue ? ` · ${fin.venue}` : ''}
            {fin.city ? ` — ${fin.city}` : ''} · {fmtDate(f4[0] && f4[0].date)}–{fmtDate(fin.date)}
          </div>
        </div>
        <div className="grid">
          <div>
            <div className="colhd">Semifinals</div>
            <div className="semis">
              {f4.map((g, i) => (
                <div className="ffm" key={i}>
                  <MatchBox g={g} ui={ui} />
                  <div className="sub2">{fmtDate(g.date)}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="colhd">National Championship</div>
            <div className="ffm big">
              <MatchBox g={fin} ui={ui} />
              <div className="sub2">{fmtDate(fin.date)}</div>
            </div>
          </div>
          <div className="champ">
            <div className="ring">
              <img src={teamLogo(champ.id, 168)} alt="" />
            </div>
            <div className="lbl">National Champion</div>
            <div className="nm">{champ.name}</div>
            <div className="rec">
              {wins}–0 in the tournament · seed {champ.seed}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMobile = () => {
    const rg = view === 'Overview' || !regions.includes(view) ? regions[0] : view;
    if (view === 'Final Four') {
      const f4 = games.filter((g) => g.round === 'Final Four');
      const fin = games.find((g) => g.round === 'National Championship');
      return (
        <div className="mm-phcol" style={{ overflowY: 'auto' }}>
          <div className="mm-phround">Final Four</div>
          {f4.map((g, i) => (
            <MatchBox g={g} ui={ui} key={i} />
          ))}
          {fin && (
            <>
              <div className="mm-phround" style={{ marginTop: 14 }}>
                Championship
              </div>
              <MatchBox g={fin} ui={ui} />
            </>
          )}
        </div>
      );
    }
    const rr = regionRounds(games, rg);
    const ff = games.filter((g) => g.round === 'First Four' && g.region === rg);
    const cols = [
      ...(ff.length ? [{ rd: 'First Four', gs: ff }] : []),
      ...ROUNDS.map((rd) => ({ rd, gs: rr[rd] })),
    ];
    return (
      <>
        <div
          className="mm-phscroll"
          ref={phScrollRef}
          onScroll={() => {
            const el = phScrollRef.current;
            if (el) setPhDot(Math.round(el.scrollLeft / el.clientWidth));
          }}
        >
          {cols.map((c) => (
            <div className="mm-phcol" key={c.rd}>
              <div className="mm-phround" style={{ color: rcolor(rg) }}>
                {shortRegion(rg)} · {c.rd}
              </div>
              {c.gs.map((g, i) => (
                <MatchBox g={g} ui={ui} key={i} />
              ))}
            </div>
          ))}
        </div>
        <div className="mm-phdots">
          {cols.map((c, i) => (
            <i key={i} className={i === phDot ? 'on' : ''} />
          ))}
        </div>
      </>
    );
  };

  const tabs = isSmallScreen ? [...regions, 'Final Four'] : ['Overview', ...regions, 'Final Four'];
  const activeView = isSmallScreen && view === 'Overview' ? regions[0] : view;

  return (
    <div
      className="mm-ov"
      onClick={(e) =>
        aboutOpen &&
        !e.target.closest('.mm-about') &&
        !e.target.closest('.mm-aboutbtn') &&
        setAboutOpen(false)
      }
    >
      <div className="mm-head">
        <div className="mm-title">
          <img className="wordmark" src={mmLogo} alt="March Madness" />
          <select className="mm-yrsel" value={year} onChange={(e) => setYear(+e.target.value)}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <span className="mm-gchip">{gender === 'women' ? 'Women' : 'Men'}</span>
        </div>
        <div className="mm-tabs">
          {!isSmallScreen && (
            <button className="mm-tab ghost mm-aboutbtn" onClick={() => setAboutOpen((o) => !o)}>
              About the format
            </button>
          )}
          {games &&
            tabs.map((v) => (
              <button
                key={v}
                className={`mm-tab${v === activeView ? ' on' : ''}`}
                style={
                  regions.includes(v) && v === activeView ? { background: rcolor(v) } : undefined
                }
                onClick={() => setView(v)}
              >
                {v === 'Overview' || v === 'Final Four' ? v : shortRegion(v)}
              </button>
            ))}
        </div>
        <button className="mm-x" onClick={onClose} title="Close">
          ✕
        </button>
      </div>

      <div className="mm-body">
        {error && <div className="mm-empty">Couldn't load the bracket — try again later.</div>}
        {!error && !games && <div className="mm-empty">Loading bracket…</div>}
        {games && games.length === 0 && (
          <div className="mm-empty">No tournament data for {year}.</div>
        )}
        {games && games.length > 0 && !isSmallScreen && (
          <>
            {activeView === 'Overview' && renderOverview()}
            {regions.includes(activeView) && renderRegionZoom(activeView)}
            {activeView === 'Final Four' && renderFinalFour()}
          </>
        )}
        {games && games.length > 0 && isSmallScreen && renderMobile()}
      </div>

      {!isSmallScreen && (
        <div className="mm-foot">
          Hover a team to preview its run · click to pin it · <kbd>Esc</kbd> to close
        </div>
      )}

      {selTeam && (
        <div className="mm-selchip">
          <img src={teamLogo(selTeam.id, 40)} alt="" />
          <span className="n">{selTeam.name}</span>
          <button className="act" onClick={() => onShowOnMap && onShowOnMap(selTeam.id)}>
            Show on map
          </button>
          <button className="clr" onClick={() => setSel(null)} title="Clear">
            ✕
          </button>
        </div>
      )}

      {aboutOpen && (
        <div className="mm-about">
          <button className="x" onClick={() => setAboutOpen(false)}>✕</button>
          <h4>About the format</h4>
          <p><b>68 teams, one Sunday.</b> On Selection Sunday (mid-March), the champions of the 31 conferences receive an automatic bid, and a selection committee awards 37 at-large bids to the best remaining teams.</p>
          <p><b>The four regions are not conferences</b> — they are the four quarters of the bracket. The committee first ranks all 68 teams from 1 to 68 (the "seed list"), then deals them out following an <b>S-curve</b>: the top four teams become the four No. 1 seeds (one per region), the next four the No. 2 seeds, and so on — snaking the order at each pass so the four regions end up as balanced as possible.</p>
          <p><b>Geography and separation rules</b> then adjust the placement: top seeds play their opening games as close to campus as possible, teams from the same conference are kept apart until the deep rounds, and regular-season rematches are avoided early.</p>
          <p><b>First Four.</b> The four weakest automatic qualifiers and the four last at-large teams play four play-in games to trim the field from 68 to 64.</p>
          <p><b>Then it's single elimination.</b> 1st Round → 2nd Round → Sweet 16 → Elite 8 crowns each region's champion; the four region champions meet at the Final Four — two semifinals and the National Championship. Lose once and you're out: that's the madness.</p>
        </div>
      )}
    </div>
  );
}
