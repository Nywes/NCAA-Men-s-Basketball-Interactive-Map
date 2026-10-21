import ClubLeagueMap from './ClubLeagueMap';
import nblLogo from './assets/icons/nbl-logo.svg';
import nblTeamsData from './nbl-teams.json';
import nblRostersData from './nbl-rosters.json';
import nblStandingsData from './nbl-standings.json';

// NBL (Australie / Nouvelle-Zélande) — données : scripts/update-nbl-data.js (API rosetta de nbl.com.au).
const CONFIG = {
  center: [-32, 145],
  zoom: 4,
  competitions: [
    {
      id: 'nbl',
      leagueId: 'australia',
      name: 'NBL',
      badge: nblLogo,
      title: 'Hungry Jack\'s NBL',
      shortTitle: 'NBL',
      color: 'F47B30',
      data: {
        label: 'NBL',
        tag: 'NBL',
        accent: '#F47B30',
        logo: nblLogo,
        teams: nblTeamsData,
        rosters: nblRostersData,
        standings: nblStandingsData,
        analytics: null,
        rivalries: null,
        logoById: Object.fromEntries(nblTeamsData.map((t) => [t.id, t.logo])),
      },
    },
  ],
};

export default function NblMap(props) {
  return <ClubLeagueMap config={CONFIG} {...props} />;
}
