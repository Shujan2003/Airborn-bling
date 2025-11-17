// src/App.jsx
import React, { useRef, useEffect, useState } from "react";
import { PerspectiveCamera, Environment } from "@react-three/drei";
import { HueSaturation } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { Landscape } from "./Landscape";
import { SphereEnv } from "./SphereEnv";
import { Airplane } from "./Airplane";
import { Targets } from "./Targets";
import { MotionBlur } from "./MotionBlur";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3, Raycaster } from "three";
import { landscapeMeshes, landscapeBounds } from "./Landscape";
import { clamp } from "three/src/math/MathUtils";
import { EffectComposer as Composer } from "@react-three/postprocessing";
import { warnBoundaryAudio, warnTerrainAudio, warnGenericAudio, crashAudio } from "./sfx";


/**
 * Robust SafeEffects:
 * - Ensures composer only mounts when GL canvas + context are valid.
 * - Listens for context lost/restored, forces remount after restore.
 */
// src/App.jsx (replace the existing SafeEffects function)
function SafeEffects({ children }) {
  const { gl } = useThree();
  const [ready, setReady] = useState(false);
  const [remountKey, setRemountKey] = useState(0);
  const listenersRef = useRef({});

  useEffect(() => {
    if (!gl) {
      setReady(false);
      return;
    }

    let cancelled = false;

    function checkReady() {
      try {
        const canvas = gl.domElement ?? (gl.canvas ?? null);
        if (!canvas) {
          setReady(false);
          return false;
        }

        // prefer gl.getContext if available; otherwise check canvas.getContext
        let ctx = null;
        try {
          if (typeof gl.getContext === "function") {
            // Important: some renderer wrappers return the raw WebGLRenderingContext from getContext()
            ctx = gl.getContext();
          }
        } catch (e) {
          ctx = null;
        }

        // fallback to canvas.getContext if above didn't work
        if (!ctx && canvas && typeof canvas.getContext === "function") {
          ctx = canvas.getContext("webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
        }

        // Now ensure the context attributes object is available (not null)
        const attrs = ctx && typeof ctx.getContextAttributes === "function" ? ctx.getContextAttributes() : null;

        const ok = Boolean(canvas && ctx && attrs);
        if (!cancelled) setReady(ok);
        return ok;
      } catch (e) {
        if (!cancelled) setReady(false);
        return false;
      }
    }

    // initial check
    checkReady();

    const canvas = gl.domElement ?? (gl.canvas ?? null);
    if (!canvas) return undefined;

    function onLost(ev) {
      try { ev.preventDefault(); } catch (e) {}
      setReady(false);
    }

    function onRestore() {
      // short delay so context is fully re-created
      setTimeout(() => {
        const ok = checkReady();
        if (ok) {
          // force remount of composer to avoid addPass on stale resources
          setRemountKey(k => k + 1);
          setReady(true);
        } else {
          setReady(false);
        }
      }, 60);
    }

    listenersRef.current = { onLost, onRestore };
    canvas.addEventListener("webglcontextlost", onLost, false);
    canvas.addEventListener("webglcontextrestored", onRestore, false);

    return () => {
      cancelled = true;
      try {
        if (canvas && listenersRef.current.onLost) canvas.removeEventListener("webglcontextlost", listenersRef.current.onLost, false);
        if (canvas && listenersRef.current.onRestore) canvas.removeEventListener("webglcontextrestored", listenersRef.current.onRestore, false);
      } catch (e) {}
      listenersRef.current = {};
    };
  }, [gl]);

  // If not ready, don't mount Composer or any postprocessing passes
  if (!ready) return null;

  // Render the Composer only when ready; the remountKey forces remounts after context restores
  return (
    <Composer key={remountKey}>
      {children}
    </Composer>
  );
}


/* ---------------- helpers ---------------- */
function dispatchWarning(type, state) {
  window.dispatchEvent(new CustomEvent("plane:warning", { detail: { warning: state, type } }));

  // select shared audio instance
  const audioMap = {
    boundary: warnBoundaryAudio,
    terrain: warnTerrainAudio,
    default: warnGenericAudio,
  };
  const audio = audioMap[type] || audioMap.default;

  if (state) {
    try {
      if (audio) {
        audio.currentTime = 0;
        const p = audio.play();
        if (p && p.catch) p.catch(() => {});
      } else {
        // fallback to DOM element using absolute URL if required
        const id = `plane-warning-${type}`;
        let el = document.getElementById(id);
        if (!el) {
          el = document.createElement("audio");
          el.id = id;
          el.loop = true;
          el.preload = "auto";
          el.style.display = "none";
          el.src = "/assets/sfx/warn.mp3";
          document.body.appendChild(el);
        }
        el.currentTime = 0;
        el.play().catch(() => {});
      }
    } catch (e) {
      console.warn("dispatchWarning audio error", e);
    }
  } else {
    try {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      } else {
        const id = `plane-warning-${type}`;
        const el = document.getElementById(id);
        if (el) {
          el.pause();
          el.currentTime = 0;
        }
      }
    } catch (e) {}
  }
}


function dispatchCrash(detail) {
  try {
    if (crashAudio) {
      crashAudio.currentTime = 0;
      const p = crashAudio.play();
      if (p && p.catch) p.catch(() => {});
    } else {
      const id = "plane-crash-sfx";
      let audio = document.getElementById(id);
      if (!audio) {
        audio = document.createElement("audio");
        audio.id = id;
        audio.src = "/assets/sfx/crash.mp3";
        audio.preload = "auto";
        audio.style.display = "none";
        document.body.appendChild(audio);
      }
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  } catch (e) {
    console.warn("dispatchCrash audio error", e);
  }
  window.dispatchEvent(new CustomEvent("plane:crash", { detail }));
}

/* ---------------- main App ---------------- */
export default function App() {
  const boundaryWarnRef = useRef(false);
  const terrainWarnRef = useRef(false);
  const placedRef = useRef(false);
  const meshListRef = useRef([]);
  const NUDGE = 0.25;
  const MARGIN = 1.5;

  const ray = useRef(new Raycaster());
  const down = useRef(new Vector3(0, -1, 0));

  useEffect(() => {
    if (landscapeMeshes && landscapeMeshes.length > 0) {
      meshListRef.current = landscapeMeshes.map((m) => m.mesh).filter(Boolean);
      console.log("Landscape mesh list prepared:", meshListRef.current.length);
    }
    function onReady(e) {
      const { meshes } = e.detail || {};
      if (Array.isArray(meshes) && meshes.length > 0) {
        meshListRef.current = meshes;
        console.log("Landscape mesh list prepared (event):", meshListRef.current.length);
      }
    }
    window.addEventListener("landscape:ready", onReady);
    return () => window.removeEventListener("landscape:ready", onReady);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (typeof window.__GAME_STARTED === "undefined") window.__GAME_STARTED = false;
      if (typeof window.__GAME_PAUSED === "undefined") window.__GAME_PAUSED = false;
      if (typeof window.__GAME_OVER === "undefined") window.__GAME_OVER = false;
    }
  }, []);

  useFrame(() => {
    if (typeof window !== "undefined") {
      if (!window.__GAME_STARTED) return;
      if (window.__GAME_PAUSED) return;
      if (window.__GAME_OVER) return;
    }

    const p = window.planePosition || null;
    if (!p) return;
    if (!landscapeBounds) return;

    const { min, max } = landscapeBounds;

    if (!placedRef.current) {
      const cx = (min.x + max.x) / 2;
      const cz = (min.z + max.z) / 2;
      const cy = Math.max(max.y + 6.0, 5.0);
      p.set(cx, cy, cz);
      placedRef.current = true;
      boundaryWarnRef.current = false;
      terrainWarnRef.current = false;
      dispatchWarning("boundary", false);
      dispatchWarning("terrain", false);
      return;
    }

    const near =
      p.x < min.x + MARGIN ||
      p.x > max.x - MARGIN ||
      p.y < min.y + MARGIN ||
      p.y > max.y - MARGIN ||
      p.z < min.z + MARGIN ||
      p.z > max.z - MARGIN;

    const outside =
      p.x < min.x || p.x > max.x ||
      p.y < min.y || p.y > max.y ||
      p.z < min.z || p.z > max.z;

    // BOUNDARY warnings
    if ((near || outside) && !boundaryWarnRef.current) {
      boundaryWarnRef.current = true;
      dispatchWarning("boundary", true);
    } else if (!near && !outside && boundaryWarnRef.current) {
      boundaryWarnRef.current = false;
      dispatchWarning("boundary", false);
    }

    if (outside) {
      p.x = clamp(p.x, min.x, max.x);
      p.y = clamp(p.y, min.y, max.y);
      p.z = clamp(p.z, min.z, max.z);

      if (p.x <= min.x + 0.001) p.x = min.x + NUDGE;
      if (p.x >= max.x - 0.001) p.x = max.x - NUDGE;
      if (p.y <= min.y + 0.001) p.y = min.y + NUDGE;
      if (p.y >= max.y - 0.001) p.y = max.y - NUDGE;
      if (p.z <= min.z + 0.001) p.z = min.z + NUDGE;
      if (p.z >= max.z - 0.001) p.z = max.z - NUDGE;
    }

    const meshes = meshListRef.current;
    if (!meshes || meshes.length === 0) return;

    const rayOrigin = p.clone();
    rayOrigin.y += 0.1;

    ray.current.set(rayOrigin, down.current);
    ray.current.far = 400;

    const intersects = ray.current.intersectObjects(meshes, true);
    if (!intersects || intersects.length === 0) return;

    const nearest = intersects[0];
    const dist = nearest.distance;

    const WARNING_DIST = 2.0;
    const CRASH_DIST = 0.2;

    if (dist < WARNING_DIST && !terrainWarnRef.current) {
      terrainWarnRef.current = true;
      dispatchWarning("terrain", true);
    } else if (dist >= WARNING_DIST && terrainWarnRef.current) {
      terrainWarnRef.current = false;
      dispatchWarning("terrain", false);
    }

    if (dist < CRASH_DIST && !window.__GAME_OVER && !window.__INVULNERABLE) {
      window.__GAME_OVER = true;
      console.warn("Plane collided with landscape");
      dispatchCrash({ position: p.clone(), hit: nearest });
      dispatchWarning("boundary", false);
      dispatchWarning("terrain", false);
    }
  });

  return (
    <>
      <SphereEnv />
      <Environment background={false} files={"/assets/texture/envmap.hdr"} />

      <PerspectiveCamera makeDefault position={[0, 14, 28]} fov={60} />

      <Landscape />
      <Airplane />
      <Targets />

      <directionalLight
        castShadow
        color={"#f3d29a"}
        intensity={2}
        position={[10, 5, 4]}
        shadow-bias={-0.0005}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.01}
        shadow-camera-far={50}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-camera-left={-12}
        shadow-camera-right={12}
      />

      <SafeEffects>
        <MotionBlur />
        <HueSaturation blendFunction={BlendFunction.NORMAL} hue={-0.15} saturation={0.1} />
      </SafeEffects>
    </>
  );
}
