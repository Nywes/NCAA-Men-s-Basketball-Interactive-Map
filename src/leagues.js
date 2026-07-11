import ncaaLogo from './assets/icons/ncaa-logo.png';
import ffbbLogo from './assets/icons/ffbb-logo.png';
import euroleagueLogo from './assets/icons/euroleague-logo.png';

// Config des "univers" disponibles. Ajouter une ligue = ajouter une entrée ici
// (le LeaguePicker et les routes se construisent depuis cet objet).
// `names.men` / `names.women` : libellé du picker selon le genre actif (le logo
// reste le même pour les deux ; seul le wording change).
export const LEAGUES = [
  {
    id: 'usa',
    path: '/usa',
    name: 'NCAA Division I',
    names: {
      men: "NCAA Division I Men's Basketball",
      women: "NCAA Division I Women's Basketball",
    },
    title: "NCAA Division I Men's Basketball",
    shortTitle: 'NCAA',
    logo: ncaaLogo,
  },
  {
    id: 'france',
    path: '/france',
    name: 'French Basketball Championship',
    names: {
      men: "French Men's Basketball Championship",
      women: "French Women's Basketball Championship",
    },
    title: 'French Pro Basketball — LNB',
    shortTitle: 'LNB',
    logo: ffbbLogo,
  },
  {
    id: 'europe',
    path: '/europe',
    name: 'Turkish Airlines EuroLeague',
    title: 'Turkish Airlines EuroLeague',
    shortTitle: 'EuroLeague',
    logo: euroleagueLogo,
  },
];

export const FR_DIVISIONS = [
  {
    id: 'elite',
    name: 'BETCLIC ÉLITE',
    badge: 'https://r2.thesportsdb.com/images/media/league/badge/60detm1757608684.png',
  },
  {
    id: 'prob',
    name: 'PRO B',
    badge: 'https://r2.thesportsdb.com/images/media/league/badge/0yjbmz1754268940.png',
  },
];

// Divisions féminines françaises (FFBB) — logos officiels transparents (Proballers).
export const FR_WOMEN_DIVISIONS = [
  {
    id: 'd1',
    name: 'LA BOULANGÈRE WONDERLIGUE',
    badge: 'https://www.proballers.com/api/getLeagueLogo?id=363&width=300',
  },
  {
    id: 'd2',
    name: 'LIGUE FÉMININE 2',
    badge: 'https://www.proballers.com/api/getLeagueLogo?id=100036&width=300',
  },
];
