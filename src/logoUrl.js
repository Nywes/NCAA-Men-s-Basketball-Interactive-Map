// Logos stockés dans public/ (ex. lba-logos/12.png, écussons LBA recadrés par
// scripts/crop-lba-logos.py) : chemin relatif dans les JSON, préfixé ici par la
// base du site (PUBLIC_URL = /NCAA-Men-s-Basketball-Interactive-Map sur GitHub Pages).
export const resolveLogo = (url) => (url && !/^(https?:)?\/\//.test(url) && !url.startsWith('data:') ? `${process.env.PUBLIC_URL}/${url}` : url);

export const withResolvedLogos = (teams) => teams.map((t) => ({ ...t, logo: resolveLogo(t.logo) }));
