// src/controls.jsx
import { Vector3 } from "three";

// smooth easing curve used for turbo acceleration
function easeOutQuad(x) {
  return 1 - (1 - x) * (1 - x);
}

// exported global control states
export let controls = {};
export let turbo = 0; // MUST BE EXPORTED so MotionBlur.jsx can import it

// plane tuning constants
const PRESET = {
  planeSpeed: 0.009,
  turboIncrement: 0.015,
  turboMaxMultiplier: 0.008,
};

let maxVelocity = 0.04;
let jawVelocity = 0;
let pitchVelocity = 0;
let planeSpeed = PRESET.planeSpeed;

// Flag used to request an external reset (from UI / level restart)
let resetRequested = false;

// Flag used to request an immediate axes reset on next update (set by requestResetImmediate)
// We keep this separate so requestResetImmediate can be safely called from non-render contexts.
let immediateAxesResetRequested = false;

/**
 * Helper: ignore key events if user is typing in an input/textarea/contentEditable
 */
function isTypingInInput(e) {
  try {
    const active = document.activeElement;
    if (!active) return false;
    const tag = active.tagName || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return true;
    if (active.isContentEditable) return true;
    return false;
  } catch (e) {
    return false;
  }
}

// keyboard input event handlers (guard against typing)
window.addEventListener("keydown", (e) => {
  if (isTypingInInput(e)) return;
  controls[e.key.toLowerCase()] = true;
});
window.addEventListener("keyup", (e) => {
  if (isTypingInInput(e)) return;
  controls[e.key.toLowerCase()] = false;
});

/**
 * External API: call this to request the same reset behavior as pressing 'R'
 * (will run inside updatePlaneAxis when axes/planePosition are available).
 */
export function requestReset() {
  resetRequested = true;
}

/**
 * Also expose a convenience function to trigger reset immediately at global level.
 * This sets flags and tries to directly set window.planePosition so the plane jumps back right away.
 */
export function requestResetImmediate() {
  // request the reset to be applied inside the next updateFrame
  resetRequested = true;

  // request that updatePlaneAxis also resets axes (x,y,z) on the next frame
  immediateAxesResetRequested = true;

  // try to directly set window.planePosition (immediate visual update for consumers that read it)
  try {
    const p = (typeof window !== "undefined" ? window.planePosition : null);
    if (p && p.set) p.set(0, 3, 7);
  } catch (e) {
    // ignore if not present
  }

  // zero velocities / turbo immediately (so effects like motion blur read the new value)
  jawVelocity = 0;
  pitchVelocity = 0;
  turbo = 0;

  // small invulnerability flag to avoid immediate re-crash
  try {
    if (typeof window !== "undefined") {
      window.__INVULNERABLE = true;
      // auto-clear after short time if nothing else clears it
      setTimeout(() => {
        try { window.__INVULNERABLE = false; } catch (e) {}
      }, 700);
    }
  } catch (e) {}
}

/**
 * Fully force-reset plane position + axes immediately from any code path.
 * (This is exported in case you want to call it from UI handlers that do have access to x/y/z)
 * Note: if you call this without x/y/z objects, it will still try to set window.planePosition.
 */
export function resetPlaneNow(x, y, z) {
  jawVelocity = 0;
  pitchVelocity = 0;
  turbo = 0;

  if (x && x.set) x.set(1, 0, 0);
  if (y && y.set) y.set(0, 1, 0);
  if (z && z.set) z.set(0, 0, 1);

  try {
    const p = (typeof window !== "undefined" ? window.planePosition : null);
    if (p && p.set) p.set(0, 3, 7);
  } catch (e) {}
}

// Listen for level:start so UI-driven restarts reset the plane automatically
if (typeof window !== "undefined") {
  window.addEventListener("level:start", () => {
    // prefer immediate reset so UI Restart / Start works with one click
    requestResetImmediate();
  });

  // When UI returns to main menu we clear the plane/targets state too
  window.addEventListener("game:reset", () => {
    requestResetImmediate();
  });
}

/**
 * Updates plane orientation and movement every frame.
 * Called from Airplane.jsx useFrame().
 *
 * NOTE: x,y,z,planePosition are passed in from Airplane so this function has access to them.
 */
export function updatePlaneAxis(x, y, z, planePosition, camera) {
  // If an external reset was requested, perform the same exact reset logic used by "r"
  if (resetRequested) {
    jawVelocity = 0;
    pitchVelocity = 0;
    turbo = 0;

    // reset orientation axes
    if (x && x.set) x.set(1, 0, 0);
    if (y && y.set) y.set(0, 1, 0);
    if (z && z.set) z.set(0, 0, 1);

    // ensure planePosition is set to the exact start coordinates you specified
    try {
      if (planePosition && planePosition.set) {
        planePosition.set(0, 3, 7);
      } else if (typeof window !== "undefined" && window.planePosition && window.planePosition.set) {
        window.planePosition.set(0, 3, 7);
      }
    } catch (e) {
      // ignore if not available on this frame
    }

    // clear request so it only runs once
    resetRequested = false;
    immediateAxesResetRequested = false;
  }

  // If an immediate axes-reset was requested explicitly (from requestResetImmediate),
  // ensure axes are reset *even* if resetRequested was cleared earlier or not set.
  if (immediateAxesResetRequested) {
    if (x && x.set) x.set(1, 0, 0);
    if (y && y.set) y.set(0, 1, 0);
    if (z && z.set) z.set(0, 0, 1);

    try {
      if (planePosition && planePosition.set) planePosition.set(0, 3, 7);
      else if (typeof window !== "undefined" && window.planePosition && window.planePosition.set) window.planePosition.set(0, 3, 7);
    } catch (e) {}

    // clear the immediate request after applying
    immediateAxesResetRequested = false;
    // ensure velocities zeroed
    jawVelocity = 0;
    pitchVelocity = 0;
    turbo = 0;
  }

  if (typeof window !== "undefined" && window.__GAME_OVER) return;

  // Damping (smooth control)
  jawVelocity *= 0.95;
  pitchVelocity *= 0.95;

  if (Math.abs(jawVelocity) > maxVelocity)
    jawVelocity = Math.sign(jawVelocity) * maxVelocity;
  if (Math.abs(pitchVelocity) > maxVelocity)
    pitchVelocity = Math.sign(pitchVelocity) * maxVelocity;

  // ========================= ROTATION CONTROLS =========================
  // Only rotate with A/D if not strafing (ArrowLeft/Right)
  const strafing = controls["arrowleft"] || controls["arrowright"];

  if (!strafing) {
    if (controls["a"]) jawVelocity += 0.0012; // yaw left
    if (controls["d"]) jawVelocity -= 0.0012; // yaw right
  }

  if (controls["arrowup"]) pitchVelocity += 0.0009; // pitch up
  if (controls["arrowdown"]) pitchVelocity -= 0.0009; // pitch down

  // Reset / respawn via keyboard 'r' (keeps previous behavior)
  if (controls["r"]) {
    jawVelocity = 0;
    pitchVelocity = 0;
    turbo = 0;

    if (x && x.set) x.set(1, 0, 0);
    if (y && y.set) y.set(0, 1, 0);
    if (z && z.set) z.set(0, 0, 1);

    try {
      if (planePosition && planePosition.set) {
        planePosition.set(0, 3, 7);
      } else if (typeof window !== "undefined" && window.planePosition && window.planePosition.set) {
        window.planePosition.set(0, 3, 7);
      }
    } catch (e) {}
  }

  // Apply roll/pitch to orientation vectors
  x.applyAxisAngle(z, jawVelocity);
  y.applyAxisAngle(z, jawVelocity);
  y.applyAxisAngle(x, pitchVelocity);
  z.applyAxisAngle(x, pitchVelocity);

  // ========================= YAW / TURNING =========================
  const yawDelta = 0.01;
  if (!strafing) {
    if (controls["arrowleft"]) {
      x.applyAxisAngle(new Vector3(0, 1, 0), yawDelta);
      z.applyAxisAngle(new Vector3(0, 1, 0), yawDelta);
      planePosition.add(x.clone().multiplyScalar(-0.05)); // move left when turning left
    }
    if (controls["arrowright"]) {
      x.applyAxisAngle(new Vector3(0, 1, 0), -yawDelta);
      z.applyAxisAngle(new Vector3(0, 1, 0), -yawDelta);
      // subtle sideways movement during yaw
      planePosition.add(x.clone().multiplyScalar(0.09)); // move right when turning right
    }
  }

  // Normalize axes
  x.normalize();
  y.normalize();
  z.normalize();

  // ========================= TURBO SPEED =========================
  if (controls.w) turbo += 0.035;
  else turbo *= 0.95;
  turbo = Math.min(Math.max(turbo, 0), 1);

  const turboSpeed = easeOutQuad(turbo) * 0.02;

  if (camera) {
    camera.fov = 45 + turboSpeed * 900;
    camera.updateProjectionMatrix();
  }

  // ========================= MOVEMENT =========================
  const slowMultiplier = controls["s"] ? 0.5 : 1.0;
  const currentSpeed = (planeSpeed + turboSpeed) * slowMultiplier;

  // forward (plane faces -Z)
  planePosition.add(z.clone().multiplyScalar(-currentSpeed));

  // ========================= STRAFING (LATERAL MOVE) =========================
  if (strafing) {
    const LATERAL_MULTIPLIER = 0.85;
    const lateralSpeed = currentSpeed * LATERAL_MULTIPLIER;

    // project x onto horizontal plane to avoid vertical drift
    const horizRight = x.clone();
    horizRight.y = 0;
    if (horizRight.lengthSq() < 1e-6) horizRight.set(1, 0, 0);
    else horizRight.normalize();

    const dir = controls["arrowleft"] ? -1 : 1;
    planePosition.add(horizRight.multiplyScalar(dir * lateralSpeed));
  }
}
