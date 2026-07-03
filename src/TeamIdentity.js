import React, { useEffect, useRef } from 'react';
import ncaaTrophy from './assets/ncaa-trophy.jpg';

// Bannière titre : teinte CLAIRE de la couleur de la fac (70% vers le blanc).
const getHeroGradient = (color) => {
  if (!color) return undefined;
  const hex = color.replace('#', '');
  if (hex.length !== 6) return undefined;
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const t = (c) => Math.round(c + (255 - c) * 0.7);
  return `rgb(${t(r)}, ${t(g)}, ${t(b)})`;
};

// Carte "meilleur résultat" : teinte CLAIRE de la couleur de la fac (70% vers le blanc),
// cohérente avec l'en-tête de la modale.
const getAccentCardBg = (color) => {
  if (!color) return '#e8edf2';
  const hex = color.replace('#', '');
  if (hex.length !== 6) return '#e8edf2';
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const t = (c) => Math.round(c + (255 - c) * 0.7);
  return `rgb(${t(r)}, ${t(g)}, ${t(b)})`;
};

// Toutes les années, triées. On laisse le CSS gérer le retour à la ligne
// (plus d'années par ligne sur desktop, moins sur mobile).
const sortYears = (years) =>
  !years || years.length === 0 ? [] : [...years].sort((a, b) => parseInt(a) - parseInt(b));

// Règle d'affichage des dates : on montre tout, mais au-dessus de 10 années on
// n'affiche que le nombre — SAUF pour les titres et les Final Four (toujours datés).
const DATE_LIMIT = 10;
const showsDates = (key, count) => key === 'titles' || key === 'finalFours' || count <= DATE_LIMIT;

const ALL_STATS = [
  {
    key: 'finalFours',
    label: 'Final Four',
    getVal: (t) => (t.finalFours || []).length,
    getYears: (t) => t.finalFours || [],
  },
  {
    key: 'eliteEights',
    label: 'Elite Eight',
    getVal: (t) => (t.eliteEights || []).length,
    getYears: (t) => t.eliteEights || [],
  },
  {
    key: 'sweetSixteens',
    label: 'Sweet 16',
    getVal: (t) => (t.sweetSixteens || []).length,
    getYears: (t) => t.sweetSixteens || [],
  },
  {
    key: 'appearances',
    label: 'Appearances',
    getVal: (t) => t.appearances || 0,
    getYears: (t) => t.appearanceYears || [],
  },
];

const TeamIdentity = ({ team, isOpen, setIsOpen, onMeasure }) => {
  const tournament = team.tournament || {};

  // Mesure la hauteur du contenu du palmarès (déplié) et la remonte au parent,
  // pour qu'elle soit reversée au contenu des onglets une fois replié.
  const contentRef = useRef(null);
  useEffect(() => {
    const el = contentRef.current;
    if (!el || !onMeasure) return undefined;
    // getBoundingClientRect().height = hauteur fractionnaire (sous-pixel), plus précise
    // qu'offsetHeight (arrondi à l'entier) -> compensation exacte, aucun micro-écart.
    const report = () => onMeasure(el.getBoundingClientRect().height);
    report();
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isOpen, team, onMeasure]);

  const hasTitles = (tournament.titles || []).length > 0;
  const titleCount = (tournament.titles || []).length;
  const titleYears = sortYears(tournament.titles);

  const statsToShow = ALL_STATS.map((s) => ({ ...s, val: s.getVal(tournament) })).filter(
    (s) => s.val > 0
  );

  // Si le palmarès tournoi a été renseigné mais que la fac n'a aucun résultat
  // (0 participation), on affiche quand même une carte neutre "0 Appearances".
  const hasTournamentData = team.tournament != null;
  if (!hasTitles && statsToShow.length === 0 && !hasTournamentData) return null;

  const displayStats =
    statsToShow.length > 0
      ? statsToShow
      : [{ key: 'appearances', label: 'Appearances', getYears: () => [], val: tournament.appearances || 0 }];

  return (
    <div>
      <div className="palm-toggle" onClick={() => setIsOpen(!isOpen)}>
        <span className="palm-toggle-label">NCAA Tournament</span>
        <span className={`palm-chevron${isOpen ? '' : ' closed'}`}>▼</span>
      </div>

      {isOpen && (
        // display:flow-root -> la marge haute de .palm-hero reste interne au bloc,
        // donc incluse dans offsetHeight : la hauteur reversée aux onglets est exacte
        // et la modale ne bouge plus du tout au repli.
        <div ref={contentRef} style={{ display: 'flow-root' }}>
          {hasTitles && (
            <div className="palm-hero" style={{ background: getHeroGradient(team.color) }}>
              <img src={ncaaTrophy} alt="" className="palm-trophy-wm" />
              <div className="palm-hero-left">
                <div className="palm-hero-label">NCAA Champion</div>
                <div className="palm-num-row">
                  <span className="palm-num">{titleCount}</span>
                  <span className="palm-unit">{titleCount === 1 ? 'title' : 'titles'}</span>
                </div>
              </div>
              {titleYears.length > 0 && (
                <>
                  <div className="palm-hero-divider" />
                  <div className="palm-hero-years">{titleYears.join(' · ')}</div>
                </>
              )}
            </div>
          )}

          {displayStats.length > 0 && (
            <div
              className="palm-stats"
              style={
                displayStats.length === 1
                  ? { display: 'flex', justifyContent: 'center' }
                  : { gridTemplateColumns: `repeat(${Math.min(displayStats.length, 4)}, 1fr)` }
              }
            >
              {displayStats.map((stat, i) => {
                // Accent (couleur de la fac) réservé au meilleur RÉSULTAT (un vrai
                // tour atteint) — jamais sur "Appearances".
                const isAccent = !hasTitles && i === 0 && stat.key !== 'appearances';
                const years = isAccent ? sortYears(stat.getYears(tournament)) : null;
                const showYears = isAccent && years.length > 0 && showsDates(stat.key, stat.val);

                if (isAccent) {
                  return (
                    <div
                      key={stat.key}
                      className={`palm-stat${displayStats.length === 1 ? ' palm-stat-solo' : ''}`}
                      style={{
                        background: getAccentCardBg(team.color),
                        borderColor: 'transparent',
                      }}
                    >
                      <div className="palm-stat-val" style={{ color: '#13294b' }}>
                        {stat.val}
                      </div>
                      <div className="palm-stat-label" style={{ color: '#5b6470' }}>
                        {stat.label}
                      </div>
                      {showYears && (
                        <div className="palm-stat-yrs">{years.join(' · ')}</div>
                      )}
                    </div>
                  );
                }

                return (
                  <div
                    key={stat.key}
                    className={`palm-stat${displayStats.length === 1 ? ' palm-stat-solo' : ''}`}
                  >
                    <div className="palm-stat-val">{stat.val}</div>
                    <div className="palm-stat-label">{stat.label}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TeamIdentity;
