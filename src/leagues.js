import ncaaLogo from './assets/icons/ncaa-logo.png';
import lnbLogo from './assets/icons/Logo LNB 2024.jpg';

// Config des "univers" disponibles. Ajouter une ligue = ajouter une entrée ici
// (le LeaguePicker et les routes se construisent depuis cet objet).
export const LEAGUES = [
  {
    id: 'usa',
    path: '/usa',
    flag: '🇺🇸',
    name: 'NCAA Division I',
    sub: '350+ American colleges',
    title: "NCAA Division I Men's Basketball",
    shortTitle: 'NCAA',
    logo: ncaaLogo,
  },
  {
    id: 'france',
    path: '/france',
    flag: '🇫🇷',
    name: 'LNB — Élite & Pro B',
    sub: '36 French pro clubs',
    title: 'French Pro Basketball — LNB',
    shortTitle: 'LNB',
    logo: lnbLogo,
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
