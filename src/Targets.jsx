// src/Targets.jsx
import { useState, useEffect, useRef } from "react";
import { Vector3, Raycaster } from "three";
import { useFrame } from "@react-three/fiber";
import { planePosition } from "./Airplane";
import { landscapeMeshes, landscapeBounds } from "./Landscape";
import { coinAudio } from "./sfx";


// Tweakables
const TARGET_RAD = 0.15;
const COIN_THICKNESS = 0.05;
const COIN_SEGMENTS = 32;
const NUM_TARGETS = 25;
const ROTATION_SPEED = 2.2;
const COLLECT_RADIUS = TARGET_RAD * 1.6;
const FLOAT_HEIGHT = 1.2;

const BOB_AMPLITUDE = 0.08;
const BOB_SPEED = 1.2;
const SMOOTH_LERP = 0.12;

export function Targets() {
  const [targets, setTargets] = useState([]);
  const meshesRef = useRef([]);
  const rayRef = useRef(new Raycaster());

  function sampleYAboveTerrain(x, z, sceneMaxY, meshes) {
    if (!meshes || meshes.length === 0) return sceneMaxY + FLOAT_HEIGHT;
    const origin = new Vector3(x, sceneMaxY + 60, z);
    const dir = new Vector3(0, -1, 0);
    rayRef.current.set(origin, dir);
    rayRef.current.far = 400;
    const hits = rayRef.current.intersectObjects(meshes, true);
    if (hits && hits.length) return hits[0].point.y + FLOAT_HEIGHT;
    return sceneMaxY + FLOAT_HEIGHT;
  }

  useEffect(() => {
    function buildTargets(bounds, meshList) {
      const { min, max } = bounds;
      const sceneMaxY = max.y ?? 0;
      meshesRef.current = Array.isArray(meshList) ? meshList : [];

      const arr = [];
      for (let i = 0; i < NUM_TARGETS; i++) {
        const x = min.x + Math.random() * (max.x - min.x);
        const z = min.z + Math.random() * (max.z - min.z);
        const baseY = sampleYAboveTerrain(x, z, sceneMaxY, meshesRef.current);
        const jitterY = (Math.random() - 0.5) * 0.12;

        arr.push({
          id: `coin_${i}_${Math.round(Math.random() * 10000)}`,
          center: new Vector3(x, baseY + jitterY, z),
          rotY: Math.random() * Math.PI * 2,
          spin: Math.random() * Math.PI * 2,
          bobOffset: Math.random() * Math.PI * 2,
          renderY: baseY + jitterY,
          hit: false,
        });
      }

      setTargets(arr);

      // notify UI how many targets were created
      try {
        window.dispatchEvent(new CustomEvent("targets:placed", { detail: { count: arr.length } }));
      } catch (e) {
        console.warn("Could not dispatch targets:placed", e);
      }

      console.log("Targets: placed", arr.length, "coins (gentle bobbing).");
    }

    if (landscapeBounds && landscapeBounds.min && landscapeBounds.max) {
      const meshesNow = Array.isArray(landscapeMeshes)
        ? landscapeMeshes.map((m) => m.mesh).filter(Boolean)
        : [];
      buildTargets(landscapeBounds, meshesNow);
    }

    function onReady(e) {
      const { bounds, meshes } = e.detail || {};
      if (bounds) {
        buildTargets(
          bounds,
          meshes ||
            (Array.isArray(landscapeMeshes) ? landscapeMeshes.map((m) => m.mesh).filter(Boolean) : [])
        );
      }
    }

    window.addEventListener("landscape:ready", onReady);
    return () => window.removeEventListener("landscape:ready", onReady);
  }, []);

  useFrame((state, delta) => {
    // global guard
    if (typeof window !== "undefined") {
      if (!window.__GAME_STARTED || window.__GAME_PAUSED || window.__GAME_OVER) return;
    }

    if (!targets || targets.length === 0) return;

    const time = state.clock.getElapsedTime();
    let anyCollected = false;

    const updated = targets.map((t) => {
      const nt = { ...t };
      nt.spin = (nt.spin + ROTATION_SPEED * delta) % (Math.PI * 2);
      const bob = Math.sin(time * BOB_SPEED + nt.bobOffset) * BOB_AMPLITUDE;
      const targetRenderY = nt.center.y + bob;
      nt.renderY = nt.renderY === undefined ? targetRenderY : nt.renderY + (targetRenderY - nt.renderY) * SMOOTH_LERP;
      const distance = planePosition.distanceTo(new Vector3(nt.center.x, nt.renderY, nt.center.z));
      if (!nt.hit && distance < COLLECT_RADIUS) {
        nt.hit = true;
        anyCollected = true;
      }
      return nt;
    });

    if (anyCollected) {
  const remaining = updated.filter((t) => !t.hit);
  setTargets(remaining);
  window.dispatchEvent(new CustomEvent("target:collected", { detail: { value: 1 } }));
  try {
    if (coinAudio) {
      // rewind and play; catch any autoplay rejection
      coinAudio.currentTime = 0;
      const p = coinAudio.play();
      if (p && p.catch) p.catch((err) => console.warn("Coin audio play blocked:", err));
    } else {
      // fallback (rare)
      const sfx = new Audio("/assets/sfx/coin.mp3");
      sfx.volume = 0.35;
      sfx.play().catch(() => {});
    }
  } catch (e) {
    console.warn("Coin audio error:", e);
  }
}

  });

  const goldMat = {
    color: "#FFD700",
    metalness: 1,
    roughness: 0.18,
    emissive: "#443300",
    emissiveIntensity: 0.08,
  };

  return (
    <group>
      {targets.map((t) => (
        <mesh
          key={t.id}
          position={[t.center.x, t.renderY ?? t.center.y, t.center.z]}
          rotation={[Math.PI / 2, 0, t.spin]}
          castShadow
          frustumCulled={false}
        >
          <cylinderGeometry args={[TARGET_RAD, TARGET_RAD, COIN_THICKNESS, COIN_SEGMENTS]} />
          <meshStandardMaterial {...goldMat} />
        </mesh>
      ))}
    </group>
  );
}

export default Targets;
