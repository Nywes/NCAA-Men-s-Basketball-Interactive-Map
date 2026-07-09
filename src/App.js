import './styles.css';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { FullscreenControl } from 'react-leaflet-fullscreen';
import 'react-leaflet-fullscreen/styles.css';

import { Icon } from 'leaflet';
import { useEffect, useState, useRef } from 'react';

import teamsData from './teams.json';
import teamsWomenData from './teams-women.json';

import ncaaLogo from './assets/icons/ncaa-logo.png';
import mmLogo from './assets/march-madness-logo.png';
import TeamPanels from './TeamPanels';
import GenderSwitch from './GenderSwitch';
import MarchMadnessOverlay from './MarchMadnessOverlay';
import { fetchBracket, LATEST_SEASON } from './bracket';
import { sportPath } from './espn';

// Résultats du fetch ESPN (couleurs/logos/division) mis en cache par genre,
// pour ne pas re-télécharger tout le dataset à chaque bascule Men/Women.
const TEAMS_CACHE = { men: null, women: null };

// Filtre par NOM de conférence (champ `conference` de teams.json, identique
// hommes/femmes) — les ids de groupes ESPN diffèrent selon le genre
// (ex. Summit League = 49 chez les hommes, 47 chez les femmes).
const divisions = [
  { id: 'ACC', name: 'ACC', imgLinkName: 'Atlantic_Coast_Conference_ACC_logo.png' },
  { id: 'ASUN', name: 'ASUN', imgLinkName: 'Atlantic-Sun-Conference-ASUN-logo.png' },
  { id: 'America East', name: 'America East', imgLinkName: 'America-East-Conference-logo.png' },
  { id: 'American', name: 'American', imgLinkName: 'American_Athletic_Conference_logo.png' },
  { id: 'A-10', name: 'A-10', imgLinkName: 'Atlantic-10-Conference-logo.png' },
  { id: 'Big 12', name: 'Big 12', imgLinkName: 'Big_12_Conference_logo.png' },
  { id: 'Big East', name: 'Big East', imgLinkName: 'Big-East-Conference-logo.png' },
  { id: 'Big Sky', name: 'Big Sky', imgLinkName: 'Big-Sky-Conference-logo.png' },
  { id: 'Big South', name: 'Big South', imgLinkName: 'Big-South-Conference-logo.png' },
  { id: 'Big Ten', name: 'Big Ten', imgLinkName: 'Big_Ten_Conference_logo.png' },
  { id: 'Big West', name: 'Big West', imgLinkName: 'Big-West-Conference-logo.png' },
  { id: 'CAA', name: 'Coastal', imgLinkName: 'Colonial-Athletic-Association-logo.png' },
  { id: 'Conference USA', name: 'Conference USA', imgLinkName: 'Conference_USA_logo.png' },
  { id: 'Horizon', name: 'Horizon', imgLinkName: 'Horizon-League-logo.png' },
  { id: 'Ivy', name: 'Ivy', imgLinkName: 'Ivy-League-logo.png' },
  { id: 'MAAC', name: 'MAAC', imgLinkName: 'Metro-Atlantic-Athletic-Conference-MAAC-logo.png' },
  { id: 'MEAC', name: 'MEAC', imgLinkName: 'Mid-Eastern-Athletic-Conference-MEAC-logo.png' },
  { id: 'Mid-American', name: 'Mid-American', imgLinkName: 'Mid-American_Conference_logo.png' },
  { id: 'Missouri Valley', name: 'Missouri Valley', imgLinkName: 'Missouri-Valley-Conference-logo.png' },
  { id: 'Mountain West', name: 'Mountain West', imgLinkName: 'Mountain_West_Conference_logo.png' },
  { id: 'Northeast', name: 'Northeast', imgLinkName: 'Northeast-Conference-logo.png' },
  { id: 'Ohio Valley', name: 'Ohio Valley', imgLinkName: 'Ohio-Valley-Conference-logo.png' },
  { id: 'Patriot League', name: 'Patriot League', imgLinkName: 'Patriot-League-Conference-logo.png' },
  { id: 'SEC', name: 'SEC', imgLinkName: 'Southeastern_Conference_logo.png' },
  { id: 'SWAC', name: 'SWAC', imgLinkName: 'Southwestern-Athletic-Conference-logo.png' },
  { id: 'Southern', name: 'Southern', imgLinkName: 'Southern-Conference-logo-1.png' },
  { id: 'Southland', name: 'Southland', imgLinkName: 'Southland-Conference-logo.png' },
  { id: 'Summit League', name: 'Summit League', imgLinkName: 'Summit-League-logo.png' },
  { id: 'Sun Belt', name: 'Sun Belt', imgLinkName: 'Sun_Belt_Conference_2020_logo.png' },
  { id: 'WAC', name: 'WAC', imgLinkName: 'Western-Athletic-Conference-logo.png' },
  { id: 'West Coast', name: 'West Coast', imgLinkName: 'West-Coast-Conference-logo.png' },
];

const customIcon = function (logo) {
  return new Icon({
    iconUrl: logo,
    iconSize: [32, 32],
  });
};

// En-tête de modale : teinte CLAIRE de la couleur de la fac (70% vers le blanc).
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

// Version foncée de la couleur (pour le chip conférence sur fond clair).
const getDarkAccent = (color) => {
  if (!color) return '#334155';
  const hex = color.replace('#', '');
  if (hex.length !== 6) return '#334155';
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  return `rgb(${Math.round(r * 0.5)}, ${Math.round(g * 0.5)}, ${Math.round(b * 0.5)})`;
};


const fetchTeamInfo = async (teamId, gender) => {
  try {
    const response = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/basketball/${sportPath(gender)}/teams/${teamId}`
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching team info:', error);
  }
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

// Recherche intelligente : on normalise (minuscules, sans accents/ponctuation) et on
// gère "state" <-> "st" pour distinguer ex. "Michigan" (Wolverines) de "Michigan St".
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
    const fields = [
      team.location,
      team.displayName,
      team.shortDisplayName,
      team.name,
      team.nickname,
      team.abbreviation,
    ];
    let score = 0;
    for (const f of fields) {
      const nf = normalize(f);
      if (!nf) continue;
      const variants = nf.includes('state') ? [nf, nf.replace(/\bstate\b/g, 'st')] : [nf];
      for (const v of variants) {
        let s = 0;
        if (v === q) s = 100;
        else if (v.startsWith(q + ' ')) s = 80;
        else if (v.startsWith(q)) s = 70;
        else if (v.includes(' ' + q)) s = 50;
        else if (v.includes(q)) s = 40;
        if (s > 0) s -= Math.min(nf.length, 30) * 0.1; // à score égal, le nom le plus court gagne
        if (s > score) score = s;
      }
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

function AutoPanPopup({ children, isSmallScreen, rosterLoading }) {
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
  }, [rosterLoading]);

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

export default function App({ searchQuery, searchSubmit, gender = 'men', setGender }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDivisions, setSelectedDivisions] = useState([]);
  const [flyTarget, setFlyTarget] = useState(null);

  const [roster, setRoster] = useState(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  // March Madness : overlay + équipe pré-surlignée + participantes de la
  // dernière édition (pour afficher l'onglet dans la modale des équipes du tournoi).
  const [bracketOpen, setBracketOpen] = useState(false);
  const [bracketPreselect, setBracketPreselect] = useState(null);
  const [bracketTeams, setBracketTeams] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setBracketTeams(null);
    fetchBracket(gender, LATEST_SEASON)
      .then((games) => {
        if (cancelled) return;
        const ids = new Set();
        games.forEach((g) => g.teams.forEach((t) => ids.add(String(t.id))));
        setBracketTeams(ids);
      })
      .catch(() => !cancelled && setBracketTeams(new Set()));
    return () => {
      cancelled = true;
    };
  }, [gender]);

  const openBracket = (teamId) => {
    setBracketPreselect(teamId || null);
    setBracketOpen(true);
  };
  // « Show on map » depuis le bracket : ferme l'overlay et vole vers la fac.
  const showTeamOnMap = (espnId) => {
    setBracketOpen(false);
    const t = teams.find((x) => String(x.id) === String(espnId));
    if (t && t.latitude && t.longitude) {
      setFlyTarget({ lat: parseFloat(t.latitude), lng: parseFloat(t.longitude), n: Date.now() });
    }
  };

  const updateScreenSize = () => {
    setIsSmallScreen(window.innerWidth < 600);
  };

  useEffect(() => {
    updateScreenSize();

    window.addEventListener('resize', updateScreenSize);

    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  // Sur soumission de la recherche (Entrée), on vole vers la meilleure équipe trouvée.
  useEffect(() => {
    if (!searchSubmit || !searchSubmit.q) return;
    const t = findBestTeam(teams, searchSubmit.q);
    if (t) {
      setFlyTarget({ lat: parseFloat(t.latitude), lng: parseFloat(t.longitude), n: searchSubmit.n });
    }
  }, [searchSubmit, teams]);

  const toggleDivision = (division) => {
    if (selectedDivisions.includes(division)) {
      setSelectedDivisions(selectedDivisions.filter((d) => d !== division));
    } else {
      setSelectedDivisions([...selectedDivisions, division]);
    }
  };

  const fetchTeamRoster = async (teamId) => {
    setRosterLoading(true);
    try {
      const response = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/basketball/${sportPath(gender)}/teams/${teamId}/roster`
      );
      const data = await response.json();
      setRoster(data);
    } catch (error) {
      console.error('Error fetching team roster:', error);
      return null;
    } finally {
      setRosterLoading(false);
    }
  };

  // Au changement de genre avec une modale ouverte : on recharge le roster de
  // l'équipe sélectionnée depuis le bon endpoint (sinon photos/stats cherchées
  // avec des ids du mauvais genre -> rien ne charge).
  useEffect(() => {
    if (selectedTeamId) fetchTeamRoster(selectedTeamId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gender]);

  const filteredTeams = teams.filter(
    (team) =>
      (selectedDivisions.length === 0 || selectedDivisions.includes(team.conference)) &&
      team.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    let cancelled = false;
    const source = gender === 'women' ? teamsWomenData : teamsData;

    const fetchAllTeams = async () => {
      // Déjà en cache pour ce genre -> rendu immédiat, aucun re-fetch.
      if (TEAMS_CACHE[gender]) {
        setTeams(TEAMS_CACHE[gender]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const updatedTeams = await Promise.all(
          source.map(async (team) => {
            try {
              const teamInfo = await fetchTeamInfo(team.id, gender);

              return {
                ...team,
                location: teamInfo?.team?.location || 'Unknown location',
                name: teamInfo?.team?.name || 'Unknown name',
                nickname: teamInfo?.team?.nickname || 'Unknown nickname',
                abbreviation: teamInfo?.team?.abbreviation || 'N/A',
                displayName: teamInfo?.team?.displayName || 'Unknown displayName',
                shortDisplayName: teamInfo?.team?.shortDisplayName || 'Unknown shortDisplayName',
                color: teamInfo?.team?.color || '#000000',
                alternateColor: teamInfo?.team?.alternateColor,
                logo: teamInfo?.team?.logos?.[0]?.href || '/default-logo.png',
                groups: teamInfo?.team?.groups || 'No groups info',
                standingSummary: teamInfo?.team?.standingSummary || 'No standing info',
                division: teamInfo?.team?.groups?.id || 'No division info',
              };
            } catch (error) {
              console.error(`Error fetching data for team ID ${team.id}:`, error);
              return {
                ...team,
                error: `Failed to load team info for team ID ${team.id}`,
              };
            }
          })
        );

        if (cancelled) return;
        TEAMS_CACHE[gender] = updatedTeams;
        setTeams(updatedTeams);
      } catch (error) {
        console.error('Error fetching teams:', error);
        if (!cancelled) setTeams([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAllTeams();
    return () => {
      cancelled = true;
    };
  }, [gender]);

  if (loading && teams.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <img
          src={ncaaLogo}
          alt="ncaa"
          style={{
            width: '100px',
            animation: 'spin 5s linear infinite',
          }}
        />
        <style>
          {`
            @keyframes spin {
              from {
                transform: rotate(0deg);
              }
              to {
                transform: rotate(360deg);
              }
            }
          `}
        </style>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <div
        style={{
          position: 'relative',
          height: '100%',
          width: '100%',
        }}
      >
        <MapContainer center={[37.0902, -105.7129]} zoom={4} style={{ zIndex: 0 }}>
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
          {filteredTeams.map(
            (team) =>
              team &&
              team.latitude &&
              team.longitude && (
                <Marker
                  key={team.id}
                  position={[team.latitude, team.longitude]}
                  icon={customIcon(team.logo)}
                  eventHandlers={{
                    click: () => {
                      setSelectedTeamId(team.id);
                      fetchTeamRoster(team.id);
                    },
                  }}
                >
                  <AutoPanPopup isSmallScreen={isSmallScreen} rosterLoading={rosterLoading}>
                    <div className="modal-wrapper">
                      <div className="modal-header" style={{ background: getTeamGradient(team.color) }}>
                        <img className="modal-logo" src={team.logo} alt={team.displayName} />
                        <div className="modal-header-text">
                          <div className="modal-team-name">{team.displayName}</div>
                          {(team.location || team.abbreviation) && (
                            <div className="modal-team-alt">
                              {[team.location, team.abbreviation]
                                .filter(Boolean)
                                .join(' · ')}
                            </div>
                          )}
                          <div className="modal-meta-row">
                            {team.conference && (
                              <span
                                className="modal-conf-chip"
                                style={{
                                  cursor: 'pointer',
                                  background: getDarkAccent(team.color),
                                  borderColor: 'transparent',
                                  color: '#fff',
                                }}
                                onClick={() =>
                                  setSelectedDivisions((prev) =>
                                    prev.includes(team.conference) ? [] : [team.conference]
                                  )
                                }
                              >
                                {team.conference}
                              </span>
                            )}
                            {team.venue && (
                              <span className="modal-venue">{team.venue}</span>
                            )}
                          </div>
                          <div className="modal-colors-row">
                            {team.color && (
                              <div
                                className="modal-color-cap"
                                style={{ width: 40, background: `#${team.color}` }}
                              />
                            )}
                            {team.alternateColor && (
                              <div
                                className="modal-color-cap"
                                style={{
                                  width: 40,
                                  background: `#${team.alternateColor}`,
                                  borderColor: 'rgba(0,0,0,.18)',
                                }}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                      <TeamPanels
                        team={team}
                        roster={roster}
                        rosterLoading={rosterLoading}
                        isSmallScreen={isSmallScreen}
                        gender={gender}
                        inBracket={!!(bracketTeams && bracketTeams.has(String(team.id)))}
                        onOpenBracket={openBracket}
                      />
                    </div>
                  </AutoPanPopup>
                </Marker>
              )
          )}
        </MapContainer>

        <div style={styles.divisionButtonsContainer(isSmallScreen)}>
          {divisions.map((division) => (
            <button
              key={division.id}
              onClick={() => toggleDivision(division.id)}
              style={styles.divisionButton(selectedDivisions, division, isSmallScreen)}
            >
              <img
                src={`https://loodibee.com/wp-content/uploads/${division.imgLinkName}`}
                alt={division.name}
                style={styles.divisionButtonImg(selectedDivisions, division)}
              />
            </button>
          ))}
        </div>

        <GenderSwitch gender={gender} onChange={setGender} />

        <button className="mmb" onClick={() => openBracket(null)} title="March Madness">
          <img src={mmLogo} alt="March Madness" />
        </button>

        <MarchMadnessOverlay
          open={bracketOpen}
          onClose={() => setBracketOpen(false)}
          gender={gender}
          preselect={bracketPreselect}
          onShowOnMap={showTeamOnMap}
          isSmallScreen={isSmallScreen}
        />
      </div>
    </div>
  );
}

const styles = {
  divisionButtonsContainer: (isSmallScreen) => ({
    position: 'absolute',
    right: isSmallScreen ? null : 0,
    left: isSmallScreen ? 0 : null,
    top: isSmallScreen ? null : 0,
    bottom: isSmallScreen ? 0 : null,
    width: isSmallScreen ? '100%' : '15%',
    minWidth: isSmallScreen ? '86.5px' : '150px',
    height: isSmallScreen ? '100px' : '100%',
    backdropFilter: 'blur(8px)',
    zIndex: 1,
    display: isSmallScreen ? 'flex' : 'grid',
    flexDirection: 'row',
    gridTemplateColumns: isSmallScreen ? null : 'repeat(2, 1fr)',
    gap: '8px',
    padding: '8px',
    alignItems: isSmallScreen ? null : 'center',
    justifyContent: isSmallScreen ? null : 'center',
    overflowX: 'auto',
  }),
  divisionButton: (selectedDivisions, division, isSmallScreen) => ({
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    cursor: 'pointer',
    width: isSmallScreen ? '84' : null,
    aspectRatio: '1 / 1',
    minWidth: isSmallScreen ? '84px' : null,
    minHeight: isSmallScreen ? '84px' : null,
    maxWidth: isSmallScreen ? '84px' : null,
    maxHeight: isSmallScreen ? '84px' : null,
    borderRadius: '12px',
    backgroundColor:
      selectedDivisions.length === 0 || selectedDivisions.includes(division.id)
        ? 'rgba(240, 240, 240, 0.9)'
        : 'initial',
  }),
  divisionButtonImg: (selectedDivisions, division) => ({
    height: '100%',
    width: '100%',
    opacity: 1,
    objectFit: 'contain',
    filter:
      selectedDivisions.length === 0 || selectedDivisions.includes(division.id)
        ? 'none'
        : 'grayscale(100%)',
  }),
};
