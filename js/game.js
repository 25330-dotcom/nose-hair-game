const { useState, useEffect, useRef } = React;

const GAME_TIME = 15;

const FACES = [
  {
    id: "face1",
    src: "face.png",
    name: "鼻のイラスト",
    noseX: 50,
    noseY: 75,
    defaultZoom: 1.3,
    defaultOffsetY: 50
  }
];

const App = () => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_TIME);
  const [gameState, setGameState] = useState('title');
  const [hairs, setHairs] = useState([]);
  const [popTexts, setPopTexts] = useState([]);
  const [currentFaceIndex, setCurrentFaceIndex] = useState(0);
  const [pain, setPain] = useState(false);
  const [highscores, setHighscores] = useState(() => {
    try {
      const saved = localStorage.getItem('nose_hair_highscores');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const isPlaying = gameState === 'playing';
  const currentFace = FACES[currentFaceIndex];
  const containerRef = useRef(null);
  const painTimeoutRef = useRef(null);

  const startGame = () => {
    setScore(0);
    setTimeLeft(GAME_TIME);
    setGameState('playing');
    generateHairs(20);
  };

  const generateHairs = (count) => {
    const face = FACES[currentFaceIndex];
    const newHairs = [];
    for (let i = 0; i < count; i++) {
      newHairs.push({
        id: Math.random().toString(36).substr(2, 9),
        x: face.noseX + (Math.random() * 14 - 7),
        y: face.noseY + (Math.random() * 2 - 1),
        length: 12 + Math.random() * 18,
        angle: -5 + Math.random() * 10,
        isPulled: false,
        dragY: 0,
        dragX: 0
      });
    }
    setHairs(newHairs);
  };

  useEffect(() => {
    if (isPlaying && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && isPlaying) {
      setGameState('result');
      setHairs([]);
      setHighscores(prev => {
        const newScores = [...prev, score].sort((a, b) => b - a).slice(0, 3);
        try {
          localStorage.setItem('nose_hair_highscores', JSON.stringify(newScores));
        } catch (e) {}
        return newScores;
      });
    }
  }, [timeLeft, isPlaying, score]);

  const handlePointerDown = (e, hairId) => {
    if (!isPlaying) return;
    const target = e.target;
    target.setPointerCapture(e.pointerId);
    
    const startY = e.clientY;
    const startX = e.clientX;

    const onPointerMove = (moveEv) => {
      const deltaY = moveEv.clientY - startY;
      const deltaX = moveEv.clientX - startX;
      
      setHairs(prev => prev.map(h =>
        h.id === hairId && !h.isPulled ? { ...h, dragY: deltaY, dragX: deltaX } : h
      ));
    };

    const onPointerUp = (upEv) => {
      const deltaY = upEv.clientY - startY;
      if (deltaY > 35) {
        pluckHair(hairId, upEv.clientX, upEv.clientY);
      } else {
        setHairs(prev => prev.map(h => 
          h.id === hairId ? { ...h, dragY: 0, dragX: 0 } : h
        ));
      }
      target.releasePointerCapture(e.pointerId);
      target.removeEventListener('pointermove', onPointerMove);
      target.removeEventListener('pointerup', onPointerUp);
    };

    target.addEventListener('pointermove', onPointerMove);
    target.addEventListener('pointerup', onPointerUp);
  };

  const pluckHair = (id, clientX, clientY) => {
    setHairs(prev => prev.map(h =>
      h.id === id ? { ...h, isPulled: true } : h
    ));
    setScore(s => s + 1);
    setPain(true);
    if (painTimeoutRef.current) clearTimeout(painTimeoutRef.current);
    painTimeoutRef.current = setTimeout(() => setPain(false), 250);

    const containerRect = containerRef.current.getBoundingClientRect();
    const textX = clientX - containerRect.left;
    const textY = clientY - containerRect.top;
    
    const messages = ["スポッ!", "イタッ!", "ブチッ!", "ナイス!", "抜けた!"];
    const newText = { 
      id: Math.random(), 
      x: textX, 
      y: textY, 
      text: messages[Math.floor(Math.random() * messages.length)] 
    };
    setPopTexts(prev => [...prev, newText]);

    setTimeout(() => {
      setHairs(prev => {
        const activeHairs = prev.filter(h => !h.isPulled);
        if (activeHairs.length < 6) {
          const face = FACES[currentFaceIndex];
          const fresh = [];
          for (let i = 0; i < 15; i++) {
            fresh.push({
              id: Math.random().toString(36).substr(2, 9),
              x: face.noseX + (Math.random() * 14 - 7),
              y: face.noseY + (Math.random() * 2 - 1),
              length: 12 + Math.random() * 18,
              angle: -5 + Math.random() * 10,
              isPulled: false, dragY: 0, dragX: 0
            });
          }
          return [...activeHairs, ...fresh];
        }
        return prev;
      });
    }, 300);
  };

  const shareX = () => {
    const text = `「鼻から鼻毛抜きゲーム」で、${score}本の鼻毛を引っこ抜いた！🪠\n君も限界まで抜いてみないか？\n#鼻毛抜きゲーム #鼻毛チャレンジ\n`;
    const url = window.location.href;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  return (
    <div className="game-wrapper">
      {gameState === 'title' && (
        <div className="panel">
          <h1>鼻から鼻毛抜き</h1>
          <p>15秒間でどれだけ抜けるかな？</p>
          
          <div className="high-score-card">
            <h3>🏆 Hall of Fame</h3>
            {highscores.length === 0 ? (
              <div style={{color: 'var(--text-dim)'}}>No records yet</div>
            ) : (
              highscores.map((s, idx) => (
                <div key={idx} className="score-item">
                  <span className={idx === 0 ? "rank-gold" : idx === 1 ? "rank-silver" : "rank-bronze"}>
                    {idx + 1}st
                  </span>
                  <span>{s} hairs</span>
                </div>
              ))
            )}
          </div>
          
          <button className="btn" onClick={startGame}>GAME START</button>
        </div>
      )}

      {gameState === 'result' && (
        <div className="panel">
          <h1>FINISH!</h1>
          <p>抜きまくった君の記録は...</p>
          <div className="result-score">{score}<span className="unit">本</span></div>
          <button className="btn" onClick={shareX}>𝕏 で記録をシェア</button>
          <button className="btn btn-secondary" onClick={() => setGameState('title')}>タイトルへ戻る</button>
        </div>
      )}

      {gameState === 'playing' && (
        <>
          <div className="hud">
            <div className="score-hud">SCORE: {score}</div>
            <div className="timer-hud">TIME: {timeLeft}s</div>
          </div>
          
          <div className={`game-container ${pain ? 'shake' : ''}`} ref={containerRef}>
            <div className="face-wrapper">
              <img
                src={currentFace.src}
                alt="Face"
                className={`screen-img ${pain ? 'pain-filter' : ''}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: `scale(${currentFace.defaultZoom}) translate(0, ${currentFace.defaultOffsetY - 50}%)`,
                }}
              />
              {hairs.map(hair => (
                <div
                  key={hair.id}
                  className={`hair ${hair.isPulled ? 'popped' : ''}`}
                  onPointerDown={(e) => handlePointerDown(e, hair.id)}
                  style={{
                    left: `${hair.x}%`,
                    top: `${hair.y}%`,
                    height: `${Math.max(0, hair.length + hair.dragY)}px`,
                    transform: `rotate(${hair.angle}deg)`,
                  }}
                />
              ))}
              {pain && (
                <div style={{
                  position: 'absolute', top: '42%', left: '0', width: '100%',
                  display: 'flex', justifyContent: 'center', gap: '50px',
                  pointerEvents: 'none', zIndex: 40, color: '#111',
                  fontSize: '50px', fontWeight: '900', opacity: 0.8
                }}>
                  <span>&gt;</span><span>&lt;</span>
                </div>
              )}
              {popTexts.map(pt => (
                <div
                  key={pt.id}
                  className="floating-text"
                  style={{ left: pt.x, top: pt.y }}
                  onAnimationEnd={() => setPopTexts(prev => prev.filter(p => p.id !== pt.id))}
                >
                  {pt.text}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
