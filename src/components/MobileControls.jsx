// src/components/MobileControls.jsx
import React, { useState } from "react";
import { setMobileControl, isMobileDevice } from "../controls";
import "../styles/MobileControls.css";

export default function MobileControls() {
  const [showControls, setShowControls] = useState(isMobileDevice());

  if (!showControls) return null;

  // Helper to create touch handlers for a key
  const createTouchHandlers = (key) => ({
    onTouchStart: () => setMobileControl(key, true),
    onTouchEnd: () => setMobileControl(key, false),
    onMouseDown: () => setMobileControl(key, true),
    onMouseUp: () => setMobileControl(key, false),
    onMouseLeave: () => setMobileControl(key, false),
  });

  return (
    <div className="mobile-controls-container">
      {/* Movement Controls - Top Center */}
      <div className="mobile-dpad">
        <button
          className="mobile-btn mobile-btn-up"
          title="Pitch Up"
          {...createTouchHandlers("w")}
        >
          ▲
        </button>
        <div className="mobile-dpad-middle">
          <button
            className="mobile-btn mobile-btn-left"
            title="Yaw Left"
            {...createTouchHandlers("a")}
          >
            ◄
          </button>
          <button
            className="mobile-btn mobile-btn-center"
            title="Reset"
            {...createTouchHandlers("r")}
          >
            ↻
          </button>
          <button
            className="mobile-btn mobile-btn-right"
            title="Yaw Right"
            {...createTouchHandlers("d")}
          >
            ►
          </button>
        </div>
        <button
          className="mobile-btn mobile-btn-down"
          title="Pitch Down"
          {...createTouchHandlers("s")}
        >
          ▼
        </button>
      </div>

      {/* Speed Controls - Bottom Right */}
      <div className="mobile-speed-controls">
        <button
          className="mobile-btn mobile-btn-turbo"
          title="Turbo"
          {...createTouchHandlers("arrowup")}
        >
          🚀
        </button>
        <button
          className="mobile-btn mobile-btn-slow"
          title="Slow Down"
          {...createTouchHandlers("arrowdown")}
        >
          ⏸
        </button>
      </div>

      {/* Strafe Controls - Bottom Left */}
      <div className="mobile-strafe-controls">
        <button
          className="mobile-btn mobile-btn-strafe-left"
          title="Strafe Left"
          {...createTouchHandlers("arrowleft")}
        >
          ◀◀
        </button>
        <button
          className="mobile-btn mobile-btn-strafe-right"
          title="Strafe Right"
          {...createTouchHandlers("arrowright")}
        >
          ▶▶
        </button>
      </div>

      {/* Toggle Controls Button */}
      <button
        className="mobile-controls-toggle"
        onClick={() => setShowControls(!showControls)}
        title="Toggle Controls"
      >
        ◉
      </button>
    </div>
  );
}
