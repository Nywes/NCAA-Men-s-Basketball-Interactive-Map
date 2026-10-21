// Couleur d'habillage lisible d'un club (onglet actif, en-têtes de tableaux à
// texte blanc) : sa couleur principale, sauf si elle est trop claire (blanc du
// Real Madrid, jaune des Metropolitans, or de Purdue…) → couleur secondaire /
// alternative / tertiaire si assez foncée, sinon `fallback` (accent de la ligue).
const toHex = (c) => (c[0] === '#' ? c : `#${c}`);

// Luminance approximative (0 = noir, 1 = blanc) d'une couleur hex « RRGGBB ».
const luminance = (hex) => {
  const h = toHex(hex).slice(1);
  if (h.length !== 6) return 0;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const isLight = (hex) => luminance(hex) > 0.72;

export const readableTeamColor = (team, fallback) =>
  [team.color, team.secondaryColor, team.alternateColor, team.tertiaryColor]
    .filter(Boolean)
    .map(toHex)
    .find((c) => !isLight(c)) || fallback;
