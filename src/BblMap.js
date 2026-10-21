import ClubLeagueMap from './ClubLeagueMap';
import bblLogo from './assets/icons/bbl-logo.png';
import bblTeamsData from './bbl-teams.json';
import bblRostersData from './bbl-rosters.json';
import bblStandingsData from './bbl-standings.json';

// Basketball-Bundesliga (easyCredit BBL) — données : scripts/update-bbl-data.js (easycredit-bbl.de).
const CONFIG = {
  center: [51.2, 10.4],
  zoom: 6,
  competitions: [
    {
      id: 'bbl',
      leagueId: 'germany',
      name: 'BUNDESLIGA',
      badge: bblLogo,
      title: 'easyCredit Basketball Bundesliga',
      shortTitle: 'BBL',
      color: '0A3D91',
      data: {
        label: 'Bundesliga',
        tag: 'BBL',
        accent: '#0A3D91',
        logo: bblLogo,
        teams: bblTeamsData,
        rosters: bblRostersData,
        standings: bblStandingsData,
        analytics: null,
        rivalries: null,
        logoById: Object.fromEntries(bblTeamsData.map((t) => [t.id, t.logo])),
      },
    },
  ],
};

export default function BblMap(props) {
  return <ClubLeagueMap config={CONFIG} {...props} />;
}
