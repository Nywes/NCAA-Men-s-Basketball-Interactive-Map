import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LEAGUES } from './leagues';
import './styles.css';

// Bouton globe (style contrôle Leaflet) + panneau de sélection d'univers.
// Positionné sous les contrôles zoom/fullscreen, à gauche de la carte.
export default function LeaguePicker({ currentLeague, gender = 'men' }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const rootRef = useRef(null);

  // Ferme le panneau au clic en dehors ou avec Échap.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (league) => {
    setOpen(false);
    if (league.id !== currentLeague) navigate(league.path);
  };

  return (
    <div className="lp-root" ref={rootRef}>
      <button
        className={`lp-globe${open ? ' lp-globe-open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        title="Switch league"
        aria-label="Switch league"
      >
        🌍
      </button>
      <div className={`lp-panel${open ? ' lp-panel-open' : ''}`}>
        <div className="lp-title">CHOOSE A LEAGUE</div>
        {LEAGUES.map((league) => (
          <button
            key={league.id}
            className={`lp-card${league.id === currentLeague ? ' lp-card-active' : ''}`}
            onClick={() => pick(league)}
          >
            <img className="lp-logo" src={league.logo} alt="" />
            <span className="lp-text">
              <span className="lp-name">
                {(league.names && league.names[gender]) || league.name}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
