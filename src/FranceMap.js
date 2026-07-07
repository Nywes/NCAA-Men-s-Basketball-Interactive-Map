import './styles.css';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { FullscreenControl } from 'react-leaflet-fullscreen';
import 'react-leaflet-fullscreen/styles.css';

import { Icon } from 'leaflet';
import { useEffect, useState, useRef } from 'react';

import frTeamsData from './fr-teams.json';
import frWomenTeamsData from './fr-women-teams.json';
import { FR_DIVISIONS, FR_WOMEN_DIVISIONS } from './leagues';
import FrTeamPanels from './FrTeamPanels';
import GenderSwitch from './GenderSwitch';

const DIVISION_LABELS = {
  elite: 'BETCLIC ÉLITE',
  prob: 'PRO B',
  d1: 'LA BOULANGÈRE WONDERLIGUE',
  d2: 'LIGUE FÉMININE 2',
};

// Couleur par défaut quand TheSportsDB n'a pas les couleurs du club.
const DEFAULT_COLOR = '1d428a';

// Logo de secours (ballon) pour les rares clubs sans badge disponible.
const FALLBACK_LOGO = `${process.env.PUBLIC_URL}/basketball.png`;

const customIcon = function (logo) {
  return new Icon({
    iconUrl: logo,
    iconSize: [32, 32],
  });
};

// En-tête de modale : teinte CLAIRE de la couleur du club (70% vers le blanc).
const getTeamGradient = (color) => {
  if (!color) return undefined;
  const hex = color.replace('#', '');
  if (hex.length !== 6) return undefined;
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const t = (c) => Math.round(c + (255 - c) * 0.7);
  return `rgb(${t(r)}, ${t(g)}, ${t(b)})`;
};

// Version foncée de la couleur (pour le chip division sur fond clair).
const getDarkAccent = (color) => {
  if (!color) return '#334155';
  const hex = color.replace('#', '');
  if (hex.length !== 6) return '#334155';
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  return `rgb(${Math.round(r * 0.5)}, ${Math.round(g * 0.5)}, ${Math.round(b * 0.5)})`;
};

function CustomAttribution() {
  const map = useMap();

  useEffect(() => {
    const attributionControl = L.control.attribution({ position: 'bottomleft' });
    attributionControl.addTo(map);

    return () => {
      attributionControl.remove();
    };
  }, [map]);

  return null;
}

const normalize = (s) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[.'`’]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

function findBestTeam(teams, rawQuery) {
  const q = normalize(rawQuery);
  if (!q) return null;
  let best = null;
  let bestScore = 0;
  for (const team of teams) {
    if (!team || !team.latitude || !team.longitude) continue;
    const fields = [team.location, team.displayName, team.shortDisplayName];
    let score = 0;
    for (const f of fields) {
      const nf = normalize(f);
      if (!nf) continue;
      let s = 0;
      if (nf === q) s = 100;
      else if (nf.startsWith(q + ' ')) s = 80;
      else if (nf.startsWith(q)) s = 70;
      else if (nf.includes(' ' + q)) s = 50;
      else if (nf.includes(q)) s = 40;
      if (s > 0) s -= Math.min(nf.length, 30) * 0.1;
      if (s > score) score = s;
    }
    if (score > bestScore) {
      bestScore = score;
      best = team;
    }
  }
  return bestScore > 0 ? best : null;
}

// Fait voler la carte vers la cible (zoom modéré) à chaque nouveau submit de recherche.
function MapController({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target && target.lat != null && target.lng != null) {
      map.flyTo([target.lat, target.lng], 11, { duration: 1.2 });
    }
  }, [target, map]);
  return null;
}

function AutoPanPopup({ children, isSmallScreen }) {
  const popupRef = useRef(null);

  useEffect(() => {
    if (popupRef.current) {
      const popup = popupRef.current;

      const observer = new ResizeObserver(() => {
        setTimeout(() => {
          if (popup.isOpen()) {
            popup._updateLayout();
            popup._adjustPan();
          }
        }, 100);
      });

      const popupContent = popup.getElement()?.querySelector('.leaflet-popup-content');
      if (popupContent) {
        observer.observe(popupContent);
      }

      return () => {
        observer.disconnect();
      };
    }
  }, []);

  return (
    <Popup
      ref={popupRef}
      autoPan={true}
      autoPanPaddingTopLeft={[isSmallScreen ? 20 : 70, 100]}
      autoPanPaddingBottomRight={[isSmallScreen ? 20 : window.innerWidth * 0.15 + 20, 20]}
      className={isSmallScreen ? 'mobile-popup' : ''}
    >
      {children}
    </Popup>
  );
}

export default function FranceMap({ searchQuery, searchSubmit, gender = 'men', setGender }) {
  const [selectedDivisions, setSelectedDivisions] = useState([]);
  const [flyTarget, setFlyTarget] = useState(null);
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  const isWomen = gender === 'women';
  const teams = isWomen ? frWomenTeamsData : frTeamsData;
  const divisions = isWomen ? FR_WOMEN_DIVISIONS : FR_DIVISIONS;

  // Les divisions masculines (elite/prob) et féminines (d1/d2) diffèrent :
  // on réinitialise le filtre au changement de genre.
  useEffect(() => {
    setSelectedDivisions([]);
  }, [gender]);

  const updateScreenSize = () => {
    setIsSmallScreen(window.innerWidth < 600);
  };

  useEffect(() => {
    updateScreenSize();

    window.addEventListener('resize', updateScreenSize);

    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  // Sur soumission de la recherche (Entrée), on vole vers le meilleur club trouvé.
  useEffect(() => {
    if (!searchSubmit || !searchSubmit.q) return;
    const t = findBestTeam(teams, searchSubmit.q);
    if (t) {
      setFlyTarget({ lat: t.latitude, lng: t.longitude, n: searchSubmit.n });
    }
  }, [searchSubmit, teams]);

  const toggleDivision = (division) => {
    if (selectedDivisions.includes(division)) {
      setSelectedDivisions(selectedDivisions.filter((d) => d !== division));
    } else {
      setSelectedDivisions([...selectedDivisions, division]);
    }
  };

  const filteredTeams = teams.filter(
    (team) =>
      (selectedDivisions.length === 0 || selectedDivisions.includes(team.division)) &&
      team.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <div
        style={{
          position: 'relative',
          height: '100%',
          width: '100%',
        }}
      >
        <MapContainer center={[46.6, 2.4]} zoom={6} style={{ zIndex: 0 }}>
          <TileLayer
            attribution="Jawg Sunny"
            url="https://tile.jawg.io/jawg-sunny/{z}/{x}/{y}{r}.png?access-token=Lko8BbD9udqn97TlGKDf86gU5pvGzg1Tao375U3VUY0l0odxgtIsHzr2vVQIvX0B"
            updateWhenZooming={false}
            updateWhenIdle={true}
            keepBuffer={2}
          />
          <CustomAttribution />
          <MapController target={flyTarget} />

          <FullscreenControl position="topleft" />
          {filteredTeams.map((team) => {
            const color = team.color || DEFAULT_COLOR;
            return (
              <Marker
                key={team.id}
                position={[team.latitude, team.longitude]}
                icon={customIcon(team.logo || FALLBACK_LOGO)}
              >
                <AutoPanPopup isSmallScreen={isSmallScreen}>
                  <div className="modal-wrapper">
                    <div className="modal-header" style={{ background: getTeamGradient(color) }}>
                      <img
                        className="modal-logo"
                        src={team.logo || FALLBACK_LOGO}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = FALLBACK_LOGO;
                        }}
                        alt={team.displayName}
                      />
                      <div className="modal-header-text">
                        <div className="modal-team-name">{team.displayName}</div>
                        {team.location && (
                          <div className="modal-team-alt">{team.location}</div>
                        )}
                        <div className="modal-meta-row">
                          <span
                            className="modal-conf-chip"
                            style={{
                              cursor: 'pointer',
                              background: getDarkAccent(color),
                              borderColor: 'transparent',
                              color: '#fff',
                            }}
                            onClick={() =>
                              setSelectedDivisions((prev) =>
                                prev.includes(team.division) ? [] : [team.division]
                              )
                            }
                          >
                            {DIVISION_LABELS[team.division] || team.division}
                          </span>
                          {team.venue && <span className="modal-venue">{team.venue}</span>}
                        </div>
                        {(team.color || team.secondaryColor || team.tertiaryColor) && (
                          <div className="modal-colors-row">
                            {[team.color, team.secondaryColor, team.tertiaryColor]
                              .filter(Boolean)
                              .map((c, i) => (
                                <div
                                  key={i}
                                  className="modal-color-cap"
                                  style={{
                                    width: 40,
                                    background: `#${c}`,
                                    borderColor: i > 0 ? 'rgba(0,0,0,.18)' : undefined,
                                  }}
                                />
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <FrTeamPanels
                      team={{ ...team, color }}
                      isSmallScreen={isSmallScreen}
                      gender={gender}
                    />
                  </div>
                </AutoPanPopup>
              </Marker>
            );
          })}
        </MapContainer>

        {setGender && <GenderSwitch gender={gender} onChange={setGender} />}

        {/* Sidebar adaptée : 2 divisions seulement, cartes larges avec logo + compteur */}
        <div className={`fr-side${isSmallScreen ? ' fr-side-mobile' : ''}`}>
          {divisions.map((division) => {
            const active =
              selectedDivisions.length === 0 || selectedDivisions.includes(division.id);
            const count = teams.filter((t) => t.division === division.id).length;
            return (
              <button
                key={division.id}
                onClick={() => toggleDivision(division.id)}
                className={`fr-div-btn${active ? '' : ' fr-div-off'}`}
              >
                {division.badge ? (
                  <img className="fr-div-badge" src={division.badge} alt={division.name} />
                ) : (
                  <span className="fr-div-badge fr-div-badge-empty">🏀</span>
                )}
                <span className="fr-div-name">{division.name}</span>
                <span className="fr-div-count">{count} teams</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
