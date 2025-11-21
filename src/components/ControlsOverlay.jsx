// src/components/ControlsOverlay.jsx
import React, { useEffect } from "react";
import planeBg from "../assets/plane.png";  // ✅ import asset correctly so Vite resolves it

export default function ControlsOverlay({ onClose = () => {} }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" || e.key === "Esc") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Use imported URL (handled by Vite)
  const bgUrl = planeBg;

  const rows = [
    ["W", "Pitch Up"],
    ["S", "Pitch Down"],
    ["A", "Yaw Left"],
    ["D", "Yaw Right"],
    ["Arrow ↑", "Turbo Boost"],
    ["Arrow ↓", "Slow Down"],
    ["Arrow ←", "Strafe Left"],
    ["Arrow →", "Strafe Right"],
    ["R", "Respawn / Reset Plane"],
    ["ESC", "Pause / Back"],
  ];

  return (
    <div
      className="menu-screen menu-opaque controls-overlay"
      role="dialog"
      aria-modal="true"
      style={{ zIndex: 99999 }}
    >
      <div
        className="menu-bg"
        style={{
          backgroundImage: `url(${bgUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "brightness(0.6)",
        }}
        aria-hidden="true"
      />

      <div className="controls-box" style={styles.controlsBox}>
        <h1 className="controls-title" style={styles.title}>GAME CONTROLS</h1>

        <div className="controls-list" style={styles.list}>
          {rows.map(([k, desc]) => (
            <div key={k} className="controls-row" style={styles.row}>
              <span className="key" style={styles.key}>{k}</span>
              <span className="desc" style={styles.desc}>{desc}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 18 }}>
          <button
            className="menu-btn controls-close"
            style={styles.button}
            onClick={onClose}
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  controlsBox: {
    position: "fixed",
    left: "8vw",
    top: "10vh",
    maxWidth: 520,
    padding: "28px",
    background: "rgba(0,0,0,0.45)",
    borderRadius: 12,
    color: "#fff",
    zIndex: 100000,
  },
  title: {
    margin: 0,
    marginBottom: 12,
    fontSize: 22,
    letterSpacing: 1,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  row: {
    display: "flex",
    alignItems: "center",
  },
  key: {
    display: "inline-block",
    minWidth: 76,
    textAlign: "center",
    fontWeight: 700,
    padding: "6px 10px",
    borderRadius: 8,
    background: "rgba(255,255,255,0.06)",
    marginRight: 12,
    border: "1px solid rgba(255,255,255,0.04)",
  },
  desc: {
    flex: 1,
    opacity: 0.95,
  },
  button: {
    padding: "10px 14px",
    borderRadius: 10,
    background: "#ffd86b",
    border: "none",
    fontWeight: 700,
    cursor: "pointer",
  },
};
