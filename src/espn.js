// Chemin de sport ESPN selon le genre sélectionné (hommes / femmes).
// Les ids d'équipe/conférence, couleurs et logos sont identiques entre les deux
// univers — seul ce segment d'URL change.
export const sportPath = (gender) =>
  gender === 'women' ? 'womens-college-basketball' : 'mens-college-basketball';
