// src/Airplane.jsx
import React, { useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Matrix4, Quaternion, Vector3 } from "three";
import { updatePlaneAxis } from "./controls";

const x = new Vector3(1, 0, 0);
const y = new Vector3(0, 1, 0);
const z = new Vector3(0, 0, 1);

// default plane position
export const planePosition = new Vector3(0, 2, 5);

// expose global pointer so App.jsx can access
if (typeof window !== "undefined") window.planePosition = planePosition;

const delayedRotMatrix = new Matrix4();
const delayedQuaternion = new Quaternion();

export function Airplane(props) {
  const { nodes, materials } = useGLTF("/assets/models/airplane.glb");
  const groupRef = useRef();
  const helixMeshRef = useRef();

  useFrame(({ camera }) => {
    // guard: stop updating while not running
    if (typeof window !== "undefined") {
      if (!window.__GAME_STARTED || window.__GAME_PAUSED || window.__GAME_OVER) return;
    }

    updatePlaneAxis(x, y, z, planePosition, camera);

    const rotMatrix = new Matrix4().makeBasis(x, y, z);

    const planeMatrix = new Matrix4()
      .multiply(new Matrix4().makeTranslation(planePosition.x, planePosition.y, planePosition.z))
      .multiply(rotMatrix);

    if (groupRef.current) {
      groupRef.current.matrixAutoUpdate = false;
      groupRef.current.matrix.copy(planeMatrix);
      groupRef.current.matrixWorldNeedsUpdate = true;
    }

    const quaternionA = new Quaternion().copy(delayedQuaternion);
    const quaternionB = new Quaternion().setFromRotationMatrix(rotMatrix);

    const interpolationFactor = 0.175;
    const interpolatedQuaternion = new Quaternion().copy(quaternionA);
    interpolatedQuaternion.slerp(quaternionB, interpolationFactor);
    delayedQuaternion.copy(interpolatedQuaternion);

    delayedRotMatrix.identity();
    delayedRotMatrix.makeRotationFromQuaternion(delayedQuaternion);

    if (camera) {
      const camRot = new Matrix4().makeRotationFromQuaternion(delayedQuaternion);
      const camLocalTrans = new Matrix4().makeTranslation(0, 0.08, 0.9);
      const cameraMatrix = new Matrix4()
        .multiply(new Matrix4().makeTranslation(planePosition.x, planePosition.y, planePosition.z))
        .multiply(camRot)
        .multiply(camLocalTrans)
        .multiply(new Matrix4().makeRotationX(-0.08));

      camera.matrixAutoUpdate = false;
      camera.matrix.copy(cameraMatrix);
      camera.matrixWorldNeedsUpdate = true;

      
    }

    if (helixMeshRef.current) helixMeshRef.current.rotation.z -= 1.0;
  });

  return (
    <group ref={groupRef}>
      <group {...props} dispose={null} scale={0.01} rotation-y={Math.PI}>
        <mesh geometry={nodes.supports.geometry} material={materials["Material.004"]} />
        <mesh geometry={nodes.chassis.geometry} material={materials["Material.005"]} />
        <mesh geometry={nodes.helix.geometry} material={materials["Material.005"]} ref={helixMeshRef} />
      </group>
    </group>
  );
}

useGLTF.preload("/assets/models/airplane.glb");
export default Airplane;
