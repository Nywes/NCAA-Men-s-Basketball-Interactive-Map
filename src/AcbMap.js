import ClubLeagueMap from './ClubLeagueMap';
import acbLogo from './assets/icons/acb-logo.svg';
import acbTeamsData from './acb-teams.json';
import acbRostersData from './acb-rosters.json';
import acbStandingsData from './acb-standings.json';

// Liga ACB (Liga Endesa) — données : scripts/update-acb-data.js (api2.acb.com).
const CONFIG = {
  center: [40.2, -3.5],
  zoom: 6,
  fitTeams: true, // Tenerife (Canaries) doit rester visible
  competitions: [
    {
      id: 'acb',
      leagueId: 'spain',
      name: 'LIGA ENDESA',
      badge: acbLogo,
      title: 'Liga Endesa — ACB',
      shortTitle: 'ACB',
      color: 'E9510E',
      data: {
        label: 'Liga Endesa',
        tag: 'ACB',
        accent: '#E9510E',
        logo: acbLogo,
        teams: acbTeamsData,
        rosters: acbRostersData,
        standings: acbStandingsData,
        analytics: null,
        rivalries: null,
        logoById: Object.fromEntries(acbTeamsData.map((t) => [t.id, t.logo])),
      },
    },
  ],
};

export default function AcbMap(props) {
  return <ClubLeagueMap config={CONFIG} {...props} />;
}
