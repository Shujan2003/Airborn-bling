// src/Landscape.jsx
import React, { useEffect, useMemo } from "react";
import { MeshReflectorMaterial, useGLTF } from "@react-three/drei";
import { Color, MeshStandardMaterial, Box3 } from "three";

// exported arrays/objects that other files will read
export let landscapeMeshes = []; // array of { mesh }
export let landscapeBounds = null;

// How much bigger to make the landscape (1.0 = original)
const SCALE = 1.8; // tweak this to make the world wider/taller

export function Landscape(props) {
  const { nodes, materials, scene } = useGLTF("/assets/models/scene.glb");

  const [lightsMaterial, waterMaterial] = useMemo(() => {
    return [
      new MeshStandardMaterial({
        envMapIntensity: 0,
        color: new Color("#ea6619"),
        roughness: 0,
        metalness: 0,
        emissive: new Color("#f6390f").multiplyScalar(1),
      }),
      <MeshReflectorMaterial
        key="water"
        transparent={true}
        opacity={0.6}
        color={"#23281b"}
        roughness={0}
        blur={[10, 10]}
        mixBlur={1}
        mixStrength={20}
        mixContrast={1.2}
        resolution={512}
        mirror={0}
        depthScale={0}
        minDepthThreshold={0}
        maxDepthThreshold={0.1}
        depthToBlurRatioBias={0.0025}
        reflectorOffset={0.0}
      />,
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // tune some materials
    const landscapeMat = materials["Material.009"];
    if (landscapeMat) landscapeMat.envMapIntensity = 0.75;

    const treesMat = materials["Material.008"];
    if (treesMat) {
      treesMat.color = new Color("#2f2f13");
      treesMat.envMapIntensity = 0.3;
      treesMat.roughness = 1;
      treesMat.metalness = 0;
    }

    // gather all meshes for raycasting AND apply scale to the actual nodes so visuals + physics match
    landscapeMeshes.length = 0;

    scene.traverse((obj) => {
      if (obj.isMesh && obj.geometry) {
        // apply the same scale to the node so raycasts/boxes match visuals
        obj.scale.set(SCALE, SCALE, SCALE);

        // if geometry has bounding box, recompute after scale
        if (obj.geometry.computeBoundingBox) obj.geometry.computeBoundingBox();

        // ensure the matrixWorld is updated before later raycasts
        obj.updateMatrixWorld(true);

        // add to list for raycasting (store actual mesh)
        landscapeMeshes.push({ mesh: obj });
      }
    });

    // compute overall bounds from the scene (nodes are scaled, so box reflects scale)
    const box = new Box3().setFromObject(scene);

    // safety: if box is empty for any reason, expand a small default
    if (box.isEmpty()) {
      box.expandByScalar(5);
    }

    landscapeBounds = { min: box.min.clone(), max: box.max.clone() };

    console.log("✅ Landscape Meshes:", landscapeMeshes.length);
    console.log("✅ Landscape bounds (scaled):", landscapeBounds.min, landscapeBounds.max);

    // notify listeners that landscape is ready (pass meshes + bounds)
    try {
      const meshList = landscapeMeshes.map((m) => m.mesh).filter(Boolean);
      window.dispatchEvent(
        new CustomEvent("landscape:ready", {
          detail: { meshes: meshList, bounds: landscapeBounds },
        })
      );
    } catch (e) {
      console.warn("Could not dispatch landscape:ready", e);
    }
  }, [scene, materials]);

  // NOTE: nodes.* already reflect scaled transforms from above traversal.
  return (
    <group {...props} dispose={null}>
      <mesh
        geometry={nodes.landscape_gltf.geometry}
        material={materials["Material.009"]}
        castShadow
        receiveShadow
        scale={[SCALE, SCALE, SCALE]}
      />
      <mesh
        geometry={nodes.landscape_borders.geometry}
        material={materials["Material.010"]}
        scale={[SCALE, SCALE, SCALE]}
      />
      <mesh
        geometry={nodes.trees_light.geometry}
        material={materials["Material.008"]}
        castShadow
        receiveShadow
        scale={[SCALE, SCALE, SCALE]}
      />
      <mesh geometry={nodes.lights.geometry} material={lightsMaterial} castShadow scale={[SCALE, SCALE, SCALE]} />

      <mesh
        position={[-2.536 * SCALE, 1.272 * SCALE, 0.79 * SCALE]}
        rotation={[-Math.PI * 0.5, 0, 0]}
        scale={[1.285 * SCALE, 1.285 * SCALE, SCALE]}
      >
        <planeGeometry args={[1, 1]} />
        {waterMaterial}
      </mesh>

      <mesh
        position={[1.729 * SCALE, 0.943 * SCALE, 2.709 * SCALE]}
        rotation={[-Math.PI * 0.5, 0, 0]}
        scale={[3 * SCALE, 3 * SCALE, SCALE]}
      >
        <planeGeometry args={[1, 1]} />
        {waterMaterial}
      </mesh>

      <mesh
        position={[0.415 * SCALE, 1.588 * SCALE, -2.275 * SCALE]}
        rotation={[-Math.PI * 0.5, 0, 0]}
        scale={[3.105 * SCALE, 2.405 * SCALE, SCALE]}
      >
        <planeGeometry args={[1, 1]} />
        {waterMaterial}
      </mesh>
    </group>
  );
}

useGLTF.preload("/assets/models/scene.glb");
