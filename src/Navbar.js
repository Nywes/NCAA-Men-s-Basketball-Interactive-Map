import { useEffect, useState } from 'react';
import './styles.css';
import profileLogo from './assets/profile.png';

export default function Navbar({ searchQuery, setSearchQuery }) {
  const [text, setText] = useState("NCAA Division I Men's Basketball");
  const [hover, setHover] = useState(false);
  const [activeIndex, setActiveIndex] = useState(null);
  const [showText, setShowText] = useState(true);

  const updateText = () => {
    if (window.innerWidth < 600) {
      setShowText(false);
    } else if (window.innerWidth < 1200) {
      setText("NCAA");
      setShowText(true);
    } else {
      setText("NCAA Division I Men's Basketball");
      setShowText(true);
    }
  };

  useEffect(() => {
    updateText();
    window.addEventListener('resize', updateText);

    return () => {
      window.removeEventListener('resize', updateText);
    };
  }, []);

  useEffect(() => {
    let interval;
    if (hover) {
      interval = setInterval(() => {
        setActiveIndex((prevIndex) => (prevIndex === null ? 0 : (prevIndex + 1) % text.length));
      }, 75);
    } else {
      setActiveIndex(null);
    }
    return () => clearInterval(interval);
  }, [hover, text.length]);

  return (
    <div
      style={{
        width: '100%',
        minHeight: '40px',
        backgroundColor: '#333',
        display: 'grid',
        gridTemplateColumns: showText ? 'calc(50% - 140px) 280px calc(50% - 140px)' : '80% 20%',
        alignItems: 'center',
        position: 'relative',
      }}
    >
      {showText && (
        <p
          style={{
            margin: 0,
            color: '#fff',
            fontSize: '1.25rem',
            fontFamily: 'MasqueFont, serif',
            zIndex: 1,
            paddingLeft: '20px',
            cursor: 'default',
            display: 'flex',
            overflow: 'hidden',
            textWrap: 'nowrap',
            textOverflow: 'ellipsis'
          }}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          {text.split('').map((char, index) => (
            <span
              key={index}
              style={{
                color: index === activeIndex ? 'rgb(69, 155, 217)' : '#FFF',
                transition: 'color 0.075s ease',
                whiteSpace: char === ' ' ? 'pre' : 'normal',
              }}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          ))}
        </p>
      )}
      <input
        type="text"
        placeholder="Search a team..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{
          padding: '8px',
          fontSize: '16px',
          zIndex: 1,
          height: '80%',
          borderRadius: '8px',
          border: 'none',
          maxWidth: '280px',
          outline: 'none',
          margin: showText ? 'auto' : 'inherit',
          marginLeft: showText ? 'inherit' : '8px'
        }}
      />
      <button
        onClick={() =>
          window.open(
            'https://www.linkedin.com/feed/update/urn:li:activity:7242089253717864449/',
            '_blank'
          )
        }
        title='Nywes'
        style={{
          height: '75%',
          aspectRatio: '1 / 1',
          marginLeft: 'auto',
          marginRight: '20px',
          backgroundImage: `url(${profileLogo})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundColor: '#333',
          border: 'none',
          cursor: 'pointer'
        }}
      />
    </div>
  );
}
