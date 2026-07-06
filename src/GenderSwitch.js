import { useState } from 'react';

// Bouton Men ⇄ Women, sous le globe (même gabarit que le LeaguePicker).
// Animation « spin 360 » : à chaque clic, un tour complet dans le même sens.
// La symétrie M/W fait que le M retourné (rotateX 180°) donne un W.
export default function GenderSwitch({ gender, onChange }) {
  const [angle, setAngle] = useState(gender === 'women' ? 180 : 0);

  const toggle = () => {
    const next = angle + 180;
    setAngle(next);
    onChange((next / 180) % 2 === 1 ? 'women' : 'men');
  };

  return (
    <button
      className="gsw"
      onClick={toggle}
      title={gender === 'women' ? 'Women — cliquer pour Men' : 'Men — cliquer pour Women'}
      aria-label="Switch entre équipes masculines et féminines"
    >
      <span className="gsw-scene">
        <span className="gsw-inner" style={{ transform: `rotateX(${angle}deg)` }}>
          <span className="gsw-face gsw-front">M</span>
          <span className="gsw-face gsw-back">W</span>
        </span>
      </span>
    </button>
  );
}
