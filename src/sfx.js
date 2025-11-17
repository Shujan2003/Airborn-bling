// src/sfx.js
// Centralized audio assets & preloaded elements for reuse.
// We only have a.mp3 and noSignal.mp3 in your folder, so use a.mp3 for coin/crash for now.

import sfxA from "./assets/sfx/a.mp3";
import noSignalUrl from "./assets/sfx/noSignal.mp3";

function makeAudio(url, { loop = false, volume = 1.0 } = {}) {
  if (typeof window === "undefined") return null;
  try {
    const a = new Audio(url);
    a.loop = !!loop;
    a.preload = "auto";
    a.volume = volume;
    return a;
  } catch (e) {
    console.warn("Audio creation failed for", url, e);
    return null;
  }
}

// Reuse a single Audio instance for coin & crash to avoid repeated allocations.
// Replace with separate files later if you add coin.mp3/crash.mp3.
export const coinAudio = makeAudio(sfxA, { volume: 0.35 });
export const crashAudio = makeAudio(sfxA, { volume: 0.7 });

// URL for the lose-overlay background audio (LossOverlay creates its own element)
export const noSignalAudioUrl = noSignalUrl;
