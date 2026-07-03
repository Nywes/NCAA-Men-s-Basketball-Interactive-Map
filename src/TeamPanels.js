import React, { useState } from 'react';
import TeamIdentity from './TeamIdentity';
import TeamInfo from './TeamInfo';

// Regroupe le palmarès (repliable) et les onglets pour partager l'état :
// quand le palmarès se replie, sa hauteur mesurée (palmH) est reversée au
// contenu des onglets via extraListH -> la modale garde la même taille.
const TeamPanels = ({ team, roster, rosterLoading, isSmallScreen }) => {
  const [palmOpen, setPalmOpen] = useState(true);
  const [palmH, setPalmH] = useState(0);

  return (
    <>
      <TeamIdentity
        team={team}
        isOpen={palmOpen}
        setIsOpen={setPalmOpen}
        onMeasure={setPalmH}
      />
      <TeamInfo
        roster={roster}
        rosterLoading={rosterLoading}
        team={team}
        isSmallScreen={isSmallScreen}
        extraListH={palmOpen ? 0 : palmH}
      />
    </>
  );
};

export default TeamPanels;
