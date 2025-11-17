// src/SphereEnv.jsx
import { useTexture } from "@react-three/drei";
import { BackSide } from "three";

export function SphereEnv() {
  const map = useTexture("/assets/texture/envmap.jpg");

  // larger sphere so the sky doesn't feel too close for the scaled world
  return (
    <mesh>
      <sphereGeometry args={[120, 50, 50]} />
      <meshBasicMaterial side={BackSide} map={map} />
    </mesh>
  );
}
