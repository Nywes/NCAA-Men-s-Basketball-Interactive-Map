import ClubLeagueMap from './ClubLeagueMap';
import lbaLogo from './assets/icons/lba-logo.png';
import lbaTeamsData from './lba-teams.json';
import lbaRostersData from './lba-rosters.json';
import lbaStandingsData from './lba-standings.json';

// Serie A italienne (LBA) — données : scripts/update-lba-data.js (legabasket.it).
const CONFIG = {
  center: [42.3, 12.5],
  zoom: 6,
  competitions: [
    {
      id: 'lba',
      leagueId: 'italy',
      name: 'SERIE A',
      badge: lbaLogo,
      title: 'Lega Basket Serie A',
      shortTitle: 'LBA',
      color: '2B2850',
      data: {
        label: 'Serie A',
        accent: '#2B2850',
        logo: lbaLogo,
        teams: lbaTeamsData,
        rosters: lbaRostersData,
        standings: lbaStandingsData,
        analytics: null,
        rivalries: null,
        logoById: Object.fromEntries(lbaTeamsData.map((t) => [t.id, t.logo])),
      },
    },
  ],
};

export default function LbaMap(props) {
  return <ClubLeagueMap config={CONFIG} {...props} />;
}
