import ClubLeagueMap from './ClubLeagueMap';
import EuroleagueBracket from './EuroleagueBracket';
import { EUROLEAGUE_DATA } from './EuroleagueTeamPanels';
import { EURO_COMPETITIONS } from './leagues';
import euroleagueTeamsData from './euroleague-teams.json';
import eurocupTeamsData from './eurocup-teams.json';
import eurocupRostersData from './eurocup-rosters.json';
import eurocupStandingsData from './eurocup-standings.json';

// Carte Europe = EuroLeague + EuroCup (même API, même format), filtre latéral.
const [EL, EC] = EURO_COMPETITIONS;
const CONFIG = {
  center: [48, 15],
  zoom: 4,
  Bracket: EuroleagueBracket,
  bracketCompetition: 'euroleague',
  competitions: [
    { ...EL, data: { ...EUROLEAGUE_DATA, teams: euroleagueTeamsData } },
    {
      ...EC,
      data: {
        label: 'EuroCup',
        accent: `#${EC.color}`,
        logo: EC.badge,
        teams: eurocupTeamsData,
        rosters: eurocupRostersData,
        standings: eurocupStandingsData,
        analytics: null,
        rivalries: null,
        logoById: Object.fromEntries(eurocupTeamsData.map((t) => [t.id, t.logo])),
      },
    },
  ],
};

export default function EuroleagueMap(props) {
  return <ClubLeagueMap config={CONFIG} {...props} />;
}
