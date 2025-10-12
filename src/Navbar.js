import { useEffect, useState } from 'react';
import './styles.css';
import aboutMe from './assets/aboutme.png';

export default function Navbar({ searchQuery, setSearchQuery }) {
  const [text, setText] = useState("NCAA Division I Men's Basketball");
  const [hover, setHover] = useState(false);
  const [activeIndex, setActiveIndex] = useState(null);
  const [showText, setShowText] = useState(true);
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  const updateText = () => {
    const smallScreen = window.innerWidth < 600;
    setIsSmallScreen(smallScreen);

    if (smallScreen) {
      setShowText(false);
    } else if (window.innerWidth < 1000) {
      setText('NCAA');
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
        width: isSmallScreen ? 'calc(100% - 90px)' : 'calc(85% - 90px)',
        minHeight: '60px',
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(240, 240, 240, 0.5)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'absolute',
        top: '20px',
        left: '70px',
        zIndex: 2,
        borderRadius: '12px',
        padding: '8px 20px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      }}
    >
      {showText && (
        <p
          style={{
            margin: 0,
            color: '#333',
            fontSize: '1.25rem',
            fontFamily: 'MasqueFont, serif',
            zIndex: 1,
            cursor: 'default',
            display: 'flex',
            overflow: 'hidden',
            textWrap: 'nowrap',
            textOverflow: 'ellipsis',
          }}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          {text.split('').map((char, index) => (
            <span
              key={index}
              style={{
                color: index === activeIndex ? 'rgb(69, 155, 217)' : '#333',
                transition: 'color 0.075s ease',
                whiteSpace: char === ' ' ? 'pre' : 'normal',
              }}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          ))}
        </p>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
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
          }}
        />
        <button
          onClick={() =>
            window.open(
              'https://www.linkedin.com/feed/update/urn:li:activity:7242089253717864449/',
              '_blank'
            )
          }
          title="About me"
          style={{
            height: '36px',
            width: '36px',
            backgroundImage: `url(${aboutMe})`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
        />
      </div>
    </div>
  );
}
