import './styles.css';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { FullscreenControl } from 'react-leaflet-fullscreen';
import 'react-leaflet-fullscreen/styles.css';

import { Icon } from 'leaflet';
import { useEffect, useState, useRef } from 'react';

import euroleagueTeamsData from './euroleague-teams.json';
import EuroleagueTeamPanels from './EuroleagueTeamPanels';
import EuroleagueBracket from './EuroleagueBracket';

// Logo de secours (ballon) pour les rares clubs sans crest disponible.
const FALLBACK_LOGO = `${process.env.PUBLIC_URL}/basketball.png`;

const ICON_SIZE = 32;
const CO_LOCATED_GAP = 1; // px entre deux logos qui partagent la même salle
// En dessous de ce zoom, les clubs co-localisés restent superposés (un seul
// logo visible, façon "un seul club à cet endroit") ; à partir de ce zoom,
// ils se séparent côte à côte pour redevenir individuellement cliquables.
const CO_LOCATED_ZOOM_THRESHOLD = 10;

// Certains clubs jouent EXACTEMENT dans la même salle (ex: le Hapoel et le
// Maccabi Tel-Aviv, tous deux à la Menora Mivtachim Arena). Plutôt que de
// décaler leurs coordonnées géographiques (l'écart change avec le zoom, et
// finit par sembler faux), on garde les DEUX marqueurs sur le point réel et on
// décale uniquement leur icône en pixels via `iconAnchor` : les deux logos se
// collent côte à côte, à largeur fixe quel que soit le zoom, avec le milieu de
// la paire exactement sur la salle. Calcul : Leaflet positionne le coin
// haut-gauche de l'icône à `pixelDuPoint - iconAnchor`, donc pour un logo
// d'index i (de gauche à droite) dans une ligne de largeur totale `width`
// centrée sur le point, `iconAnchor.x = width/2 - i * (ICON_SIZE + gap)`.
function buildCoLocatedAnchors(teams) {
  const groups = new Map();
  teams.forEach((t) => {
    const key = `${t.latitude.toFixed(4)},${t.longitude.toFixed(4)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  });
  const anchorById = {};
  groups.forEach((group) => {
    if (group.length < 2) return; // seul club sur ce point -> ancrage par défaut (centré)
    const ordered = [...group].sort((a, b) => a.id.localeCompare(b.id));
    const n = ordered.length;
    const width = n * ICON_SIZE + (n - 1) * CO_LOCATED_GAP;
    ordered.forEach((t, i) => {
      anchorById[t.id] = [width / 2 - i * (ICON_SIZE + CO_LOCATED_GAP), ICON_SIZE / 2];
    });
  });
  return anchorById;
}

const CO_LOCATED_ANCHORS = buildCoLocatedAnchors(euroleagueTeamsData);

const customIcon = function (logo, anchor) {
  return new Icon({
    iconUrl: logo,
    iconSize: [ICON_SIZE, ICON_SIZE],
    ...(anchor ? { iconAnchor: anchor } : {}),
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
      map.flyTo([target.lat, target.lng], 6, { duration: 1.2 });
    }
  }, [target, map]);
  return null;
}

// Suit le niveau de zoom courant de la carte (valeur initiale + à chaque
// zoomend) et le remonte au parent, pour décider si les clubs co-localisés
// doivent être superposés ou séparés.
function ZoomTracker({ onZoomChange }) {
  const map = useMap();
  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);
  useMapEvents({
    zoomend: (e) => onZoomChange(e.target.getZoom()),
  });
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

export default function EuroleagueMap({ searchQuery, searchSubmit }) {
  const [flyTarget, setFlyTarget] = useState(null);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [mapZoom, setMapZoom] = useState(4);
  const [bracketOpen, setBracketOpen] = useState(false);
  const showCoLocatedSideBySide = mapZoom >= CO_LOCATED_ZOOM_THRESHOLD;

  const teams = euroleagueTeamsData;

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

  const filteredTeams = teams.filter((team) =>
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
        <MapContainer center={[48, 15]} zoom={4} style={{ zIndex: 0 }}>
          <TileLayer
            attribution="Jawg Sunny"
            url="https://tile.jawg.io/jawg-sunny/{z}/{x}/{y}{r}.png?access-token=Lko8BbD9udqn97TlGKDf86gU5pvGzg1Tao375U3VUY0l0odxgtIsHzr2vVQIvX0B"
            updateWhenZooming={false}
            updateWhenIdle={true}
            keepBuffer={2}
          />
          <CustomAttribution />
          <MapController target={flyTarget} />
          <ZoomTracker onZoomChange={setMapZoom} />

          <FullscreenControl position="topleft" />
          {filteredTeams.map((team) => (
            <Marker
              key={team.id}
              position={[team.latitude, team.longitude]}
              icon={customIcon(
                team.logo || FALLBACK_LOGO,
                showCoLocatedSideBySide ? CO_LOCATED_ANCHORS[team.id] : undefined
              )}
            >
              <AutoPanPopup isSmallScreen={isSmallScreen}>
                <div className="modal-wrapper">
                  <div className="modal-header" style={{ background: getTeamGradient(team.color) }}>
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
                      {team.location && <div className="modal-team-alt">{team.location}</div>}
                      <div className="modal-meta-row">
                        <span
                          className="modal-conf-chip"
                          style={{
                            background: '#F47216',
                            borderColor: 'transparent',
                            color: '#fff',
                          }}
                        >
                          EUROLEAGUE
                        </span>
                        {team.venue && <span className="modal-venue">{team.venue}</span>}
                      </div>
                      {(team.color || team.secondaryColor) && (
                        <div className="modal-colors-row">
                          {[team.color, team.secondaryColor].filter(Boolean).map((c, i) => (
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
                  <EuroleagueTeamPanels team={team} isSmallScreen={isSmallScreen} />
                </div>
              </AutoPanPopup>
            </Marker>
          ))}
        </MapContainer>

        <button
          className="brk-trigger"
          onClick={() => setBracketOpen(true)}
          title="Playoffs & Final Four"
          aria-label="Playoffs & Final Four"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 21h8M12 17v4M7 4h10v3a5 5 0 0 1-10 0V4zM7 4H3v2a4 4 0 0 0 4 4M17 4h4v2a4 4 0 0 1-4 4" />
          </svg>
        </button>
        {bracketOpen && (
          <EuroleagueBracket onClose={() => setBracketOpen(false)} isSmallScreen={isSmallScreen} />
        )}
      </div>
    </div>
  );
}
