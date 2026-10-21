import ClubLeagueMap from './ClubLeagueMap';
import lbaLogo from './assets/icons/lba-logo.png';
import { withResolvedLogos } from './logoUrl';
import lbaTeamsRaw from './lba-teams.json';
import lbaRostersData from './lba-rosters.json';
import lbaStandingsData from './lba-standings.json';

// Serie A italienne (LBA) — données : scripts/update-lba-data.js (legabasket.it),
// écussons sans sponsor : scripts/crop-lba-logos.py -> public/lba-logos/.
const lbaTeamsData = withResolvedLogos(lbaTeamsRaw);
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
        tag: 'LBA',
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
