// src/components/HUD.jsx
import React from "react";
import "../styles/HUD.css"; // ✅ import its own stylesheet

export default function HUD({ warning, gameOver }) {
  return (
    <div id="hud">
      {warning && <div className="warning">⚠️ Restricted Area — Move Back!</div>}
      {gameOver && <div className="gameover">✴️ Game Over — You Crashed!</div>}
    </div>
  );
}
