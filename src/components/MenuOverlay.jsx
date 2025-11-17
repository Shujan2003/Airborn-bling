// src/components/MenuOverlay.jsx
import React from "react";
import "../styles/Menu.css"; // ✅ import its own CSS

export default function MenuOverlay({ title, items }) {
  return (
    <div className="menu-overlay">
      <div className="menu">
        <h1>{title}</h1>
        <div className="menu-items">
          {items.map((it, idx) => (
            <button key={idx} className="menu-btn" onClick={it.onClick}>
              {it.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
