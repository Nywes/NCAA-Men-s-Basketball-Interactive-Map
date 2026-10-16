import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { Marker } from 'react-leaflet';

// ═══ Quiz « Which college? » ═══
// Un joueur NBA s'affiche, il faut cliquer sur le logo de sa fac sur la carte
// (ou passer en mode « 4 choices »). 3 tentatives par joueur : chaque erreur
// débloque un indice (draft, puis conférence) ; à la 3e, la fac est révélée et
// la série repart à zéro. 3/2/1 points selon le nombre d'indices utilisés.
// Données : src/quiz-players.json (généré par scripts/update-quiz-players.js),
// chargé à la première ouverture. Score conservé dans le localStorage.

const STORAGE_KEY = 'qz-which-college-v1';
const TRIES = 3;
const US_VIEW = { lat: 37.0902, lng: -105.7129, zoom: 4 };
const REVEAL_ZOOM = 7;
const EMPTY_STATS = { streak: 0, best: 0, found: 0, played: 0, points: 0 };

const loadStats = () => {
  try {
    return { ...EMPTY_STATS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
  } catch (e) {
    return { ...EMPTY_STATS };
  }
};
const saveStats = (s) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch (e) {
    /* navigation privée, etc. */
  }
};

const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export function useQuiz({ teams, onFly }) {
  const [active, setActive] = useState(false);
  const [players, setPlayers] = useState(null); // pool complet (chargé à l'ouverture)
  const [player, setPlayer] = useState(null);
  const [misses, setMisses] = useState([]); // ids des facs tentées à tort
  const [result, setResult] = useState(null); // { kind: 'found' | 'failed', teamId, pts }
  const [choices, setChoices] = useState(null); // 4 ids d'équipes (mode 4 choices) ou null
  const [stats, setStats] = useState(loadStats);
  const [rings, setRings] = useState([]); // anneaux de feedback sur la carte
  const seen = useRef(new Set());
  const ringSeq = useRef(0);

  const teamById = useMemo(() => {
    const m = {};
    for (const t of teams) if (t && t.latitude && t.longitude) m[String(t.id)] = t;
    return m;
  }, [teams]);

  // La fac « officielle » du joueur (première de sa liste présente sur la carte).
  const revealTeam = useMemo(
    () => (player ? teamById[player.colleges.find((c) => teamById[c])] || null : null),
    [player, teamById]
  );

  const addRing = useCallback((team, kind, ttl) => {
    const key = ++ringSeq.current;
    setRings((r) => [...r, { key, lat: +team.latitude, lng: +team.longitude, kind }]);
    if (ttl) setTimeout(() => setRings((r) => r.filter((x) => x.key !== key)), ttl);
  }, []);

  const nextPlayer = useCallback(() => {
    if (!players) return;
    const unseen = players.filter((p) => !seen.current.has(p.id));
    if (!unseen.length) seen.current.clear();
    const pool = unseen.length ? unseen : players;
    // Tirage pondéré : notoriété (vues Wikipédia, log³), joueurs actuellement
    // en NBA favorisés (x1,8), rookies et sophomores de la saison en cours
    // encore plus (x2 : draftés lors des deux dernières drafts, calculé à la
    // volée), anciens peu connus freinés (x0,4). Résultat : ~50 % de joueurs
    // en activité dont ~15 % de rookies/sophomores ; ~34 % de stars, ~52 % de
    // joueurs confirmés, ~14 % de rôle players.
    const now = new Date();
    const season = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1; // 2026-27 -> 2026
    const isYoung = (p) => p.active && (p.draft || p.debut || 0) >= season - 1;
    const weights = pool.map(
      (p) =>
        Math.pow(Math.log10((p.views || 0) + 10), 3) *
        (p.active ? 1.8 : 1) *
        (isYoung(p) ? 2 : 1) *
        (!p.active && (p.views || 0) < 20000 ? 0.4 : 1)
    );
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    let idx = 0;
    while (idx < pool.length - 1 && (r -= weights[idx]) > 0) idx++;
    const p = pool[idx];
    seen.current.add(p.id);
    setPlayer(p);
    setMisses([]);
    setResult(null);
    setChoices(null);
    setRings([]);
    onFly(US_VIEW);
  }, [players, onFly]);

  const open = useCallback(async () => {
    setActive(true);
    if (players) return;
    const mod = await import('./quiz-players.json');
    setPlayers(mod.default.players.filter((p) => p.colleges.some((c) => teamById[c])));
  }, [players, teamById]);

  const close = useCallback(() => {
    setActive(false);
    setPlayer(null);
    setMisses([]);
    setResult(null);
    setChoices(null);
    setRings([]);
  }, []);

  // Premier joueur dès que le pool est chargé.
  useEffect(() => {
    if (active && players && !player) nextPlayer();
  }, [active, players, player, nextPlayer]);

  const fail = useCallback(() => {
    if (!revealTeam || result) return;
    setResult({ kind: 'failed', teamId: String(revealTeam.id), pts: 0 });
    setStats((s) => {
      const n = { ...s, streak: 0, played: s.played + 1 };
      saveStats(n);
      return n;
    });
    addRing(revealTeam, 'ko', 0);
    onFly({ lat: +revealTeam.latitude, lng: +revealTeam.longitude, zoom: REVEAL_ZOOM });
  }, [revealTeam, result, addRing, onFly]);

  const answer = useCallback(
    (teamId) => {
      if (!active || !player || result) return;
      const id = String(teamId);
      const team = teamById[id];
      if (!team || misses.includes(id)) return;
      if (player.colleges.includes(id)) {
        const pts = TRIES - misses.length;
        setResult({ kind: 'found', teamId: id, pts });
        setStats((s) => {
          const n = { ...s, streak: s.streak + 1, found: s.found + 1, played: s.played + 1, points: s.points + pts };
          n.best = Math.max(n.best, n.streak);
          saveStats(n);
          return n;
        });
        addRing(team, 'ok', 0);
        return;
      }
      const m = [...misses, id];
      setMisses(m);
      addRing(team, 'ko', 1200);
      if (m.length >= TRIES) {
        // révélation : même logique que « give up », avec l'état à jour
        setResult({ kind: 'failed', teamId: String(revealTeam.id), pts: 0 });
        setStats((s) => {
          const n = { ...s, streak: 0, played: s.played + 1 };
          saveStats(n);
          return n;
        });
        addRing(revealTeam, 'ko', 0);
        onFly({ lat: +revealTeam.latitude, lng: +revealTeam.longitude, zoom: REVEAL_ZOOM });
      }
    },
    [active, player, result, misses, teamById, revealTeam, addRing, onFly]
  );

  // Mode « 4 choices » : la bonne fac + 3 autres, de préférence de la même conférence.
  const toggleChoices = useCallback(() => {
    if (choices) return setChoices(null);
    if (!player || !revealTeam) return;
    const others = Object.values(teamById).filter((t) => !player.colleges.includes(String(t.id)));
    const sameConf = shuffle(others.filter((t) => t.conference && t.conference === revealTeam.conference));
    const rest = shuffle(others.filter((t) => !sameConf.includes(t)));
    const picked = [...sameConf, ...rest].slice(0, 3);
    setChoices(shuffle([revealTeam, ...picked]).map((t) => String(t.id)));
  }, [choices, player, revealTeam, teamById]);

  // Clavier : Entrée / Espace = joueur suivant, Échap = quitter.
  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      else if ((e.key === 'Enter' || e.key === ' ') && result) {
        e.preventDefault();
        nextPlayer();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, result, close, nextPlayer]);

  const lastMiss = misses.length ? teamById[misses[misses.length - 1]] : null;
  const hints = useMemo(() => {
    if (!player) return [];
    const h1 = player.draft
      ? `Draft ${player.draft}${player.pick ? ` · #${player.pick}` : ''}`
      : player.debut
      ? `NBA debut ${player.debut}`
      : player.gp
      ? `${player.gp} NBA games`
      : 'Undrafted';
    return [
      { k: player.draft ? 'Draft' : 'Career', v: h1 },
      { k: 'Conf.', v: (revealTeam && revealTeam.conference) || '—' },
    ];
  }, [player, revealTeam]);

  return {
    active,
    loading: active && !players,
    player,
    revealTeam,
    teamById,
    misses,
    lastMiss,
    result,
    choices,
    hints,
    unlocked: result && result.kind === 'failed' ? 2 : Math.min(misses.length, 2),
    stats,
    rings,
    open,
    close,
    answer,
    giveUp: fail,
    toggleChoices,
    nextPlayer,
  };
}

// Bouton d'entrée (sous le bouton March Madness, même gabarit).
export function QuizButton({ quiz, onOpen }) {
  return (
    <button
      className={`qzb${quiz.active ? ' on' : ''}`}
      onClick={quiz.active ? quiz.close : onOpen}
      title="Which college? — guess the college of NBA players"
      aria-label="Which college? quiz"
    >
      ?
    </button>
  );
}

// Anneaux de feedback autour des logos (vert = trouvé, rouge = raté / révélé).
const ringIcon = (kind) =>
  L.divIcon({ className: 'qz-ring-wrap', html: `<div class="qz-ring ${kind}"></div>`, iconSize: [56, 56], iconAnchor: [28, 28] });
export function QuizRings({ rings }) {
  return rings.map((r) => (
    <Marker key={r.key} position={[r.lat, r.lng]} icon={ringIcon(r.kind)} interactive={false} zIndexOffset={1000} />
  ));
}

const Tries = ({ used }) => (
  <div className="qz-tries">
    {Array.from({ length: TRIES }, (_, i) => (
      <i key={i} className={i < used ? 'used' : ''} />
    ))}
    {used < TRIES && <small>{TRIES - used === 1 ? '1 try left' : `${TRIES - used} tries left`}</small>}
  </div>
);

export function QuizPanel({ quiz, isSmallScreen }) {
  if (!quiz.active) return null;
  const { player, result, revealTeam, stats, hints, unlocked, choices, teamById, lastMiss } = quiz;
  const cls = `qz-panel${isSmallScreen ? ' qz-mobile' : ''}${result ? ` ${result.kind}` : ''}`;

  return (
    <div className={cls} role="dialog" aria-label="Which college? quiz">
      <div className="qz-head">
        <span className="qz-title">Which college?</span>
        <button className="qz-x" onClick={quiz.close} title="Quit (Esc)">
          ✕
        </button>
      </div>

      {!player ? (
        <div className="qz-loading">{quiz.loading ? 'Loading players…' : 'No player available.'}</div>
      ) : (
        <>
          <div className="qz-who">
            <div className="qz-lbl">Player</div>
            <div className="qz-name">{player.name}</div>
            <Tries used={quiz.misses.length} />
          </div>

          {result ? (
            <div className={`qz-found ${result.kind}`}>
              {revealTeam && <img src={revealTeam.logo} alt="" />}
              <div>
                <div className="qz-found-n">{revealTeam ? revealTeam.location || revealTeam.displayName : '?'}</div>
                <div className="qz-found-p">
                  {result.kind === 'found' ? `Correct · +${result.pts} pt${result.pts > 1 ? 's' : ''}` : 'Missed · it was here'}
                </div>
              </div>
            </div>
          ) : (
            lastMiss && <div className="qz-miss">✕ Not {lastMiss.location || lastMiss.displayName}</div>
          )}

          <div className="qz-hints">
            {hints.map((h, i) => (
              <div key={i} className={`qz-hint${i < unlocked ? '' : ' locked'}`}>
                <span className="k">{i < unlocked ? h.k : `Hint ${i + 1}`}</span>
                <span className="v">{i < unlocked ? h.v : '----'}</span>
              </div>
            ))}
          </div>

          {choices && !result && (
            <div className="qz-choices">
              {choices.map((id) => {
                const t = teamById[id];
                const out = quiz.misses.includes(id);
                return (
                  <button key={id} className={`qz-choice${out ? ' out' : ''}`} onClick={() => quiz.answer(id)} disabled={out}>
                    <img src={t.logo} alt="" />
                    <span>{t.location || t.displayName}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="qz-scores">
            <div className="qz-sc">
              <b>{stats.streak}</b>
              <small>Streak</small>
            </div>
            <div className="qz-sc">
              <b>{stats.best}</b>
              <small>Best</small>
            </div>
            <div className="qz-sc">
              <b>{stats.found}</b>
              <small>Found</small>
            </div>
          </div>

          <div className="qz-act">
            {result ? (
              <button className="qz-b main" onClick={quiz.nextPlayer} title="Enter">
                Next player →
              </button>
            ) : (
              <>
                <button className="qz-b main" onClick={quiz.toggleChoices}>
                  {choices ? 'On the map' : '4 choices'}
                </button>
                <button className="qz-b" onClick={quiz.giveUp} title="Reveal the answer (ends the streak)">
                  Give up
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
