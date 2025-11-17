// src/main.jsx
import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { Canvas } from "@react-three/fiber";
import "./App.css";
import { SRGBColorSpace } from "three";
import { requestResetImmediate } from "./controls";

// NOTE: filename is case-sensitive on many systems. If your file is ControlsOverlay.jsx
// import with the exact same casing as the file.
import ControlsOverlay from "./components/Temp.jsx";


import menuBg from "./assets/R.png";
import resumBg from "./assets/plane.png";
import looseBg from "./assets/noSignal.jpg";

const LEVELS = [
  null,
  { timer: 300, coinsRequired: 2, reward: 100 },
  { timer: 300, coinsRequired: 2, reward: 250 },
  { timer: 240, coinsRequired: 3, reward: 400 },
  { timer: 180, coinsRequired: 5, reward: 500 },
];

function isWebGLAvailable() {
  if (typeof window === "undefined") return false;
  if (!window.WebGLRenderingContext) return false;

  // Quick, non-persistent capability check.
  // Create a temporary canvas/context and immediately release it (if possible)
  try {
    const canvas = document.createElement("canvas");
    // Prefer webgl2, otherwise webgl / experimental-webgl
    const ctx =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");

    if (!ctx) return false;

    // If the browser supports losing contexts, ask to lose it immediately to avoid accumulating contexts.
    try {
      const loseExt = ctx.getExtension && (ctx.getExtension("WEBGL_lose_context") || ctx.getExtension("MOZ_WEBGL_lose_context") || ctx.getExtension("WEBKIT_WEBGL_lose_context"));
      if (loseExt && typeof loseExt.loseContext === "function") {
        loseExt.loseContext();
      }
    } catch (e) {
      // ignore - losing context is best-effort
    }

    // If we got a context, WebGL is available
    return true;
  } catch (e) {
    return false;
  }
}
// Basic ErrorBoundary (keeps your previous behavior)
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, color: "#fff", textAlign: "center" }}>
          <h2>Renderer Error</h2>
          <p>Something went wrong creating the 3D renderer.</p>
          <pre style={{ color: "#ffd86b" }}>{String(this.state.error)}</pre>
          <p>Try reloading the page or using a different browser.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppRoot() {
  const [warning, setWarning] = React.useState(false);
  const [warningType, setWarningType] = React.useState(null);
  const [gameOver, setGameOver] = React.useState(false);

  const [showMainMenu, setShowMainMenu] = React.useState(true);
  const [showPauseMenu, setShowPauseMenu] = React.useState(false);
  const [showVictoryMenu, setShowVictoryMenu] = React.useState(false);
  const [showLoseMenu, setShowLoseMenu] = React.useState(false);
  const [victory, setVictory] = React.useState(false);

  const [level, setLevel] = React.useState(1);
  const levelRef = React.useRef(1);
  const setLevelAndRef = (n) => { setLevel(n); levelRef.current = n; };

  const [score, setScore] = React.useState(0);
  const [money, setMoney] = React.useState(0);

  const [timeLeft, setTimeLeft] = React.useState(LEVELS[1].timer);
  const [remainingCoins, setRemainingCoins] = React.useState(LEVELS[1].coinsRequired);
  const [initialCoinCount, setInitialCoinCount] = React.useState(LEVELS[1].coinsRequired);
  const [winThreshold, setWinThreshold] = React.useState(LEVELS[1].coinsRequired);

  const [showControlsMenu, setShowControlsMenu] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      window.__GAME_STARTED ??= false;
      window.__GAME_PAUSED ??= false;
      window.__GAME_OVER ??= false;
      window.__INVULNERABLE ??= false;
      window.__AUDIO_UNLOCKED ??= false;
    }

    function onWarn(e) {
      const { warning: w, type } = e.detail || {};
      setWarning(Boolean(w));
      setWarningType(w ? (type || null) : null);
    }
    function onCrash() {
      setGameOver(true);
      window.__GAME_OVER = true;
      window.__GAME_PAUSED = true;
      setShowPauseMenu(false);
      setShowVictoryMenu(false);
      setShowLoseMenu(true);
    }
    function onCollected(e) {
      const delta = Number(e.detail?.value ?? 1);
      setScore((s) => s + delta);
      setRemainingCoins((r) => Math.max(0, r - delta));
    }
    function onTargetsPlaced(e) {
      const count = Number(e.detail?.count ?? 0);
      if (count && count > 0) {
        setInitialCoinCount(count);
        setRemainingCoins(count);
        const cfg = LEVELS[levelRef.current] ?? null;
        setWinThreshold(cfg ? cfg.coinsRequired : count);
      }
    }
    window.addEventListener("plane:warning", onWarn);
    window.addEventListener("plane:crash", onCrash);
    window.addEventListener("target:collected", onCollected);
    window.addEventListener("targets:placed", onTargetsPlaced);
    return () => {
      window.removeEventListener("plane:warning", onWarn);
      window.removeEventListener("plane:crash", onCrash);
      window.removeEventListener("target:collected", onCollected);
      window.removeEventListener("targets:placed", onTargetsPlaced);
    };
  }, []);

  React.useEffect(() => {
    let timerId = null;
    function tick() {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (!victory) {
            window.__GAME_OVER = true;
            window.__GAME_PAUSED = true;
            setGameOver(true);
            setShowPauseMenu(false);
            setShowVictoryMenu(false);
            setShowLoseMenu(true);
          }
          return 0;
        }
        return t - 1;
      });
    }
    if (window.__GAME_STARTED && !window.__GAME_PAUSED && !window.__GAME_OVER && !victory) {
      timerId = setInterval(tick, 1000);
    }
    return () => timerId && clearInterval(timerId);
  }, [window?.__GAME_STARTED, window?.__GAME_PAUSED, window?.__GAME_OVER, victory]);

  React.useEffect(() => {
    const collected = initialCoinCount - remainingCoins;
    if (window.__GAME_STARTED && collected >= winThreshold && !victory && !window.__GAME_OVER) {
      const lvlCfg = LEVELS[levelRef.current] ?? null;
      const reward = lvlCfg ? Number(lvlCfg.reward ?? 0) : 0;
      if (reward) setMoney((m) => m + reward);
      setVictory(true);
      setShowVictoryMenu(true);
      window.__GAME_PAUSED = true;
    }
  }, [remainingCoins, initialCoinCount, winThreshold, victory]);

  function startLevel(targetLevel = 1) {
    const cfg = LEVELS[targetLevel];
    if (!cfg) return;
    setShowMainMenu(false);
    setShowPauseMenu(false);
    setShowVictoryMenu(false);
    setShowLoseMenu(false);
    setVictory(false);
    setGameOver(false);
    setLevelAndRef(targetLevel);
    setTimeLeft(cfg.timer);
    setWinThreshold(cfg.coinsRequired);
    setRemainingCoins(cfg.coinsRequired);
    setInitialCoinCount(cfg.coinsRequired);
    setScore(0);
    window.__GAME_STARTED = true;
    window.__GAME_PAUSED = false;
    window.__GAME_OVER = false;
    try { requestResetImmediate(); } catch (e) { console.warn("requestResetImmediate() failed:", e); }
    window.__INVULNERABLE = true;
    setTimeout(() => { window.__INVULNERABLE = false; }, 700);
    requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent("level:start", { detail: { level: targetLevel, timer: cfg.timer, coinsRequired: cfg.coinsRequired } }));
      window.dispatchEvent(new CustomEvent("targets:placed", { detail: { count: cfg.coinsRequired } }));
      console.log("startLevel -> dispatched events for level", targetLevel);
    });
  }
  function startGame() { unlockAudio(); startLevel(1); }
  function unlockAudio() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === "suspended") ctx.resume().catch(() => {});
        window.__AUDIO_UNLOCKED = true;
      } else window.__AUDIO_UNLOCKED = true;
    } catch (e) { window.__AUDIO_UNLOCKED = true; }
  }
  function resumeGame() { window.__GAME_PAUSED = false; setShowPauseMenu(false); }
  function restartCurrentLevel() { unlockAudio(); startLevel(levelRef.current || 1); }

  function exitGame() {
    try {
      window.__GAME_STARTED = false;
      window.__GAME_PAUSED = true;
      window.__GAME_OVER = true;
      try { window.dispatchEvent(new CustomEvent("game:reset", { detail: {} })); } catch (e) {}
    } catch (e) {}
    try { window.close(); } catch (e) {}
    setTimeout(() => {
      try { window.location.href = "about:blank"; } catch (e) { try { location.reload(); } catch (e) {} }
    }, 150);
  }

  function showControls() {
    setShowControlsMenu(true);
    try { window.__GAME_PAUSED = true; } catch (e) {}
  }
  function closeControls() {
    setShowControlsMenu(false);
    try { if (!window.__GAME_OVER) window.__GAME_PAUSED = false; } catch (e) {}
  }

  function onNextLevel() { const next = levelRef.current + 1; if (LEVELS[next]) startLevel(next); else alert(`Done: ₹${money}`); }
  function onPlayAgain() { unlockAudio(); startLevel(levelRef.current || 1); }
  function onMainMenu() {
    setShowMainMenu(true);
    setShowPauseMenu(false);
    setShowVictoryMenu(false);
    setShowLoseMenu(false);
    window.__GAME_STARTED = false;
    window.__GAME_PAUSED = false;
    window.__GAME_OVER = false;
    try { window.dispatchEvent(new CustomEvent("game:reset", { detail: {} })); } catch (e) {}
    setVictory(false);
    setScore(0);
  }

  const mainMenuItems = [
    { label: "Start Game", onClick: startGame },
    { label: "Controls", onClick: showControls },
    { label: "Exit", onClick: exitGame },
  ];
  const pauseMenuItems = [
    { label: "Resume", onClick: resumeGame },
    { label: "Restart", onClick: restartCurrentLevel },
    { label: "Controls", onClick: showControls },
    { label: "Exit", onClick: exitGame },
  ];
  const victoryItems = [
    { label: "Next Level", onClick: onNextLevel },
    { label: "Play Again", onClick: onPlayAgain },
    { label: "Main Menu", onClick: onMainMenu },
    { label: "Exit", onClick: exitGame },
  ];
  const loseItems = [
    { label: "Retry Level", onClick: restartCurrentLevel },
    { label: "Main Menu", onClick: onMainMenu },
    { label: "Exit", onClick: exitGame },
  ];
  const bgMain = resumBg;
  const bgPause = menuBg;
  const bgLose = looseBg;

  React.useEffect(() => {
    function onKeyDown(e) {
      const active = document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) return;
      if (e.key === "Escape" || e.key === "Esc") {
        if (showMainMenu) return;
        if (!window.__GAME_STARTED) return;
        if (window.__GAME_OVER) return;
        if (showVictoryMenu || showLoseMenu) return;
        if (!window.__GAME_PAUSED) {
          window.__GAME_PAUSED = true;
          setShowPauseMenu(true);
          setShowVictoryMenu(false);
        } else {
          window.__GAME_PAUSED = false;
          setShowPauseMenu(false);
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showMainMenu, showVictoryMenu, showLoseMenu]);

  const webglOK = isWebGLAvailable();

  // HUD component minimal
  function HUD({ warning, warningType, gameOver, score, timeLeft, remaining, level, money }) {
    const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
    const ss = String(timeLeft % 60).padStart(2, "0");
    let warningMessage = "⚠️ Restricted Area — Move Back!";
    if (warningType === "terrain") warningMessage = "⚠️ Terrain ahead — Pull up!";
    if (warningType === "boundary") warningMessage = " You are in the ⚠️Restricted area — Move back!";
    return (
      <div id="hud">
        <div className="hud-left" style={{ position: "fixed", left: 18, top: 12, zIndex: 11110 }}>
          <div style={{ color: "#fff", fontWeight: 700, marginBottom: 8 }}>LEVEL {level}</div>
          <div style={{ color: "#ffd86b", fontWeight: 800 }}>💰 ₹{money}</div>
        </div>

        <div className="hud-timer" style={{ pointerEvents: "none", zIndex: 11100 }}>
          <div className="timer-label">TIME LEFT</div>
          <div className="timer-value">{mm}:{ss}</div>
          <div className="timer-sub">Coins left to collect: {remaining}</div>

          <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
            {warning && (
              <div className={`warning warning-inline ${warningType ? `warning-${warningType}` : ""}`}>
                {warningMessage}
              </div>
            )}
          </div>
        </div>

        <div className="hud-score">
          <div className="score-label">SCORE</div>
          <div className="score-value">{score}</div>
        </div>

        {gameOver && <div className="gameover"> Game Over — You Crashed!</div>}
      </div>
    );
  }

  return (
    <>
      {!webglOK ? (
        <div style={{ color: "#fff", padding: 28 }}>
          <h2>WebGL not available</h2>
          <p>Your browser or device can't start the 3D renderer.</p>
          <ul>
            <li>Enable hardware acceleration in browser settings.</li>
            <li>Try Chrome / Firefox / Edge on desktop with updated GPU drivers.</li>
            <li>Close other GPU-heavy tabs or apps and reload.</li>
          </ul>
        </div>
      ) : (
        <ErrorBoundary>
          <Canvas
            shadows
            gl={{
              antialias: true,
              outputColorSpace: SRGBColorSpace,
              preserveDrawingBuffer: false,
              powerPreference: "high-performance",
            }}
            onCreated={({ gl }) => {
              try {
                if (gl && "outputColorSpace" in gl) {
                  gl.outputColorSpace = SRGBColorSpace;
                }
              } catch (e) {
                console.warn("Could not set renderer color space:", e);
              }
            }}
          >
            <Suspense fallback={null}>
              <App />
            </Suspense>
          </Canvas>
        </ErrorBoundary>
      )}

      <HUD warning={warning} warningType={warningType} gameOver={gameOver} score={score} timeLeft={timeLeft} remaining={remainingCoins} level={level} money={money} />

      {showMainMenu && <div><MenuOverlay title="AIRBORNE BLING" items={mainMenuItems} backgroundImage={bgMain} opaque={true} /></div>}

      {showPauseMenu && !showMainMenu && !showLoseMenu && <MenuOverlay title={`Airborne Bling — Paused (Level ${level})`} items={pauseMenuItems} backgroundImage={bgPause} opaque={false} />}

      {showVictoryMenu && <VictoryOverlay title="VICTORY" items={victoryItems} backgroundImage={bgMain} timeLeft={timeLeft} />}

      {showLoseMenu && <LossOverlay title="YOU LOST" items={loseItems} backgroundImage={bgLose} audioSrc="/assets/sfx/noSignal.mp3" />}

      {showControlsMenu && <ControlsOverlay onClose={closeControls} />}
    </>
  );
}

// small MenuOverlay / Victory / Loss components used above
function MenuOverlay({ title, items, backgroundImage, opaque = false }) {
  return (
    <div className={`menu-screen ${opaque ? "menu-opaque" : ""}`} role="dialog" aria-modal="true">
      {backgroundImage && <div className="menu-bg" style={{ backgroundImage: `url(${backgroundImage})` }} />}
      {!opaque && <div className="menu-dim" />}
      <div className="menu-layout">
        <div className="menu-left">
          <h1 className="menu-title">{title}</h1>
          <nav className="menu-items">
            {items.map((it, idx) => (
              <button key={idx} className="menu-btn" onClick={it.onClick} type="button">{it.label}</button>
            ))}
          </nav>
        </div>
        <div className="menu-right" aria-hidden="true" />
      </div>
    </div>
  );
}

function VictoryOverlay({ title, items, backgroundImage, timeLeft }) {
  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");
  return (
    <div className="menu-screen menu-opaque">
      {backgroundImage && <div className="menu-bg" style={{ backgroundImage: `url(${backgroundImage})` }} />}
      <div className="menu-layout" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="menu-left" style={{ textAlign: "center" }}>
          <h1 className="menu-title">{title}</h1>
          <div className="menu-items">
            {items.map((it, i) => <button key={i} className="menu-btn" onClick={it.onClick}>{it.label}</button>)}
          </div>
          <div style={{ marginTop: 12 }}>Time remaining: {mm}:{ss}</div>
        </div>
      </div>
    </div>
  );
}

function LossOverlay({ title = "You Lost", items = [], backgroundImage, audioSrc = noSignalAudioUrl }) {
  React.useEffect(() => {
    if (!audioSrc) return;
    const id = "overlay-lose-audio";
    let audio = document.getElementById(id);
    if (!audio) {
      audio = document.createElement("audio");
      audio.id = id;
      audio.loop = true;
      audio.preload = "auto";
      audio.style.display = "none";
      document.body.appendChild(audio);
    }
    audio.src = audioSrc;
    audio.volume = 0.6;
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise && playPromise.catch) playPromise.catch(() => {});
    return () => {
      try { audio.pause(); audio.currentTime = 0; } catch (e) {}
    };
  }, [audioSrc]);

  return (
    <div className="menu-screen menu-opaque">
      {backgroundImage && <div className="menu-bg" style={{ backgroundImage: `url(${backgroundImage})` }} />}
      <div className="menu-layout" style={{ alignItems: "center", justifyContent: "flex-start", paddingLeft: "8vw" }}>
        <div className="menu-left" style={{ textAlign: "left", maxWidth: 520, padding: "40px", background: "rgba(0,0,0,0.0)" }}>
          <h1 className="menu-title" style={{ textAlign: "left" }}>{title}</h1>
          <div className="menu-items" style={{ alignItems: "flex-start" }}>
            {items.map((it, i) => (
              <button key={i} className="menu-btn" onClick={it.onClick} style={{ width: "300px", textAlign: "left" }}>
                {it.label}
              </button>
            ))}
          </div>
        </div>
        <div className="menu-right" aria-hidden="true" />
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<AppRoot />);
