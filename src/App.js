import './styles.css';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { FullscreenControl } from 'react-leaflet-fullscreen';
import 'react-leaflet-fullscreen/styles.css';

import { Icon } from 'leaflet';
import { useEffect, useState } from 'react';

import teamsData from './teams.json';

import ncaaLogo from './assets/icons/ncaa-logo.png';
import TeamInfo from './TeamInfo';

const divisions = [
  { id: '2', name: 'ACC', imgLinkName: 'Atlantic_Coast_Conference_ACC_logo.png' },
  { id: '46', name: 'ASUN', imgLinkName: 'Atlantic-Sun-Conference-ASUN-logo.png' },
  { id: '1', name: 'America East', imgLinkName: 'America-East-Conference-logo.png' },
  { id: '62', name: 'American', imgLinkName: 'American_Athletic_Conference_logo.png' },
  { id: '3', name: 'A-10', imgLinkName: 'Atlantic-10-Conference-logo.png' },
  { id: '8', name: 'Big 12', imgLinkName: 'Big_12_Conference_logo.png' },
  { id: '4', name: 'Big East', imgLinkName: 'Big-East-Conference-logo.png' },
  { id: '5', name: 'Big Sky', imgLinkName: 'Big-Sky-Conference-logo.png' },
  { id: '6', name: 'Big South', imgLinkName: 'Big-South-Conference-logo.png' },
  { id: '7', name: 'Big Ten', imgLinkName: 'Big_Ten_Conference_logo.png' },
  { id: '9', name: 'Big West', imgLinkName: 'Big-West-Conference-logo.png' },
  { id: '10', name: 'Coastal', imgLinkName: 'Colonial-Athletic-Association-logo.png' },
  { id: '11', name: 'Conference USA', imgLinkName: 'Conference_USA_logo.png' },
  { id: '45', name: 'Horizon', imgLinkName: 'Horizon-League-logo.png' },
  { id: '12', name: 'Ivy', imgLinkName: 'Ivy-League-logo.png' },
  { id: '13', name: 'MAAC', imgLinkName: 'Metro-Atlantic-Athletic-Conference-MAAC-logo.png' },
  { id: '16', name: 'MEAC', imgLinkName: 'Mid-Eastern-Athletic-Conference-MEAC-logo.png' },
  { id: '14', name: 'Mid-American', imgLinkName: 'Mid-American_Conference_logo.png' },
  { id: '18', name: 'Missouri Valley', imgLinkName: 'Missouri-Valley-Conference-logo.png' },
  { id: '44', name: 'Mountain West', imgLinkName: 'Mountain_West_Conference_logo.png' },
  { id: '19', name: 'Northeast', imgLinkName: 'Northeast-Conference-logo.png' },
  { id: '20', name: 'Ohio Valley', imgLinkName: 'Ohio-Valley-Conference-logo.png' },
  { id: '22', name: 'Patriot League', imgLinkName: 'Patriot-League-Conference-logo.png' },
  { id: '23', name: 'SEC', imgLinkName: 'Southeastern_Conference_logo.png' },
  { id: '26', name: 'SWAC', imgLinkName: 'Southwestern-Athletic-Conference-logo.png' },
  { id: '24', name: 'Southern', imgLinkName: 'Southern-Conference-logo-1.png' },
  { id: '25', name: 'Southland', imgLinkName: 'Southland-Conference-logo.png' },
  { id: '49', name: 'Summit League', imgLinkName: 'Summit-League-logo.png' },
  { id: '27', name: 'Sun Belt', imgLinkName: 'Sun_Belt_Conference_2020_logo.png' },
  { id: '30', name: 'WAC', imgLinkName: 'Western-Athletic-Conference-logo.png' },
  { id: '29', name: 'West Coast', imgLinkName: 'West-Coast-Conference-logo.png' },
];

const customIcon = function (logo) {
  return new Icon({
    iconUrl: logo,
    iconSize: [32, 32],
  });
};

const adjustTextColor = (hexColor) => {
  const hex = hexColor.replace('#', '');

  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  const distanceFromWhite = Math.sqrt(
    (255 - r) * (255 - r) + (255 - g) * (255 - g) + (255 - b) * (255 - b)
  );

  return distanceFromWhite < 50 ? '#000000' : `#${hexColor}`;
};

const fetchTeamInfo = async (teamId) => {
  try {
    const response = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams/${teamId}`
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

export default function App({ searchQuery }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDivisions, setSelectedDivisions] = useState([]);

  const [roster, setRoster] = useState(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  const updateScreenSize = () => {
    setIsSmallScreen(window.innerWidth < 600);
  };

  useEffect(() => {
    updateScreenSize();

    window.addEventListener('resize', updateScreenSize);

    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  const toggleDivision = (division) => {
    if (selectedDivisions.includes(division)) {
      // Si la division est déjà sélectionnée, on la retire
      setSelectedDivisions(selectedDivisions.filter((d) => d !== division));
    } else {
      // Sinon, on l'ajoute
      setSelectedDivisions([...selectedDivisions, division]);
    }
  };

  const fetchTeamRoster = async (teamId) => {
    setRosterLoading(true);
    try {
      const response = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams/${teamId}/roster`
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

  const filteredTeams = teams.filter(
    (team) =>
      (selectedDivisions.length === 0 || selectedDivisions.includes(team.division)) &&
      team.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const fetchAllTeams = async () => {
      try {
        const updatedTeams = await Promise.all(
          teamsData.map(async (team) => {
            try {
              const teamInfo = await fetchTeamInfo(team.id);

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

        setTeams(updatedTeams);
      } catch (error) {
        console.error('Error fetching teams:', error);
        setTeams([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAllTeams();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: `calc(100vh - 40px)`,
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
    <div style={{ width: '100%', height: 'calc(100vh - 40px)' }}>
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
          />
          <CustomAttribution />

          <FullscreenControl position="topleft" />
          {filteredTeams.map(
            (team, index) =>
              team &&
              team.latitude &&
              team.longitude && (
                <Marker
                  key={index}
                  position={[team.latitude, team.longitude]}
                  icon={customIcon(team.logo)}
                  eventHandlers={{
                    click: () => {
                      fetchTeamRoster(team.id);
                    },
                  }}
                >
                  <Popup>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <h1 style={{ color: adjustTextColor(team.color), textAlign: 'center' }}>
                        {team.displayName}
                      </h1>
                      <img
                        src={team.logo}
                        alt={team.name}
                        style={{ width: '100px', height: 'auto' }}
                      />
                      <h3>
                        {team.shortDisplayName} / {team.abbreviation}
                      </h3>
                      <div>
                        {team.color && (
                          <div
                            style={{
                              display: 'inline-block',
                              width: '75px',
                              height: '25px',
                              backgroundColor: `#${team.color}`,
                              border: '1px solid #333',
                              borderRadius: '4px',
                            }}
                          />
                        )}
                        {team.alternateColor && (
                          <div
                            style={{
                              display: 'inline-block',
                              width: '75px',
                              height: '25px',
                              backgroundColor: `#${team.alternateColor}`,
                              border: '1px solid #333',
                              marginLeft: '5px',
                              borderRadius: '4px',
                            }}
                          />
                        )}
                      </div>
                      <TeamInfo roster={roster} rosterLoading={rosterLoading} team={team} />
                    </div>
                  </Popup>
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
