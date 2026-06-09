import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useScroll, Float } from "@react-three/drei";
import * as THREE from "three";
import HeroObject from "./HeroObject";

/**
 * Scroll-driven cinematography. Lives inside <ScrollControls>, so useScroll()
 * gives a normalized offset 0..1 across the 4 pages.
 *
 * As you scroll we move the camera on a gentle arc — it dollies in, swings
 * slightly sideways and lowers — so each section frames a different 3D accent.
 * Camera target also lowers via lookAt, producing a smooth "fly-through".
 *
 * Accent meshes (a torus knot for Features, an octahedron crystal for the Demo)
 * grow in only while their section is on screen, using scroll.range(start,len).
 */
export default function ScrollScenes() {
  const scroll = useScroll();
  const knot = useRef<THREE.Mesh>(null!);
  const crystal = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    const o = scroll.offset; // 0 (top) .. 1 (bottom)

    // --- Camera path -------------------------------------------------------
    // Swing up to a quarter turn around the origin while dollying in slightly.
    const radius = 6;
    const angle = o * Math.PI * 0.5; // 0..90°
    const targetX = Math.sin(angle) * radius * 0.35 + state.pointer.x * 0.4;
    const targetZ = Math.cos(angle) * radius;
    const targetY = -o * 1.6 + state.pointer.y * 0.3;

    // Lerp toward the target each frame for buttery motion (damping == 0.06).
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, targetX, 0.06);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, targetY, 0.06);
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, targetZ, 0.06);
    state.camera.lookAt(0, -o * 1.3, 0);

    // --- Accent reveals ----------------------------------------------------
    // range(start, distance) returns 0..1 progress while the window is active.
    const knotV = scroll.range(1 / 4, 1 / 4); // page 2 (Features)
    knot.current.scale.setScalar(THREE.MathUtils.lerp(knot.current.scale.x, knotV, 0.1));
    knot.current.rotation.x += 0.004;
    knot.current.rotation.y += 0.006;

    const crystalV = scroll.range(2 / 4, 1 / 4); // page 3 (Live Demo)
    crystal.current.scale.setScalar(
      THREE.MathUtils.lerp(crystal.current.scale.x, crystalV * 0.9, 0.1),
    );
    crystal.current.rotation.y += 0.01;
  });

  return (
    <group>
      {/* Hero centerpiece — Float adds a lazy bob so it never feels static. */}
      <Float speed={1.2} rotationIntensity={0.2} floatIntensity={0.6}>
        <HeroObject />
      </Float>

      {/* Features accent: glowing torus knot off to the right, lower down. */}
      <mesh ref={knot} position={[2.6, -1.6, -1]} scale={0}>
        <torusKnotGeometry args={[0.6, 0.18, 160, 24]} />
        <meshStandardMaterial
          color="#8b5cf6"
          emissive="#5b21b6"
          emissiveIntensity={0.6}
          roughness={0.2}
          metalness={0.7}
        />
      </mesh>

      {/* Live Demo accent: a faceted cyan crystal on the left. */}
      <mesh ref={crystal} position={[-2.8, -3.0, -1]} scale={0}>
        <octahedronGeometry args={[0.8, 0]} />
        <meshStandardMaterial
          color="#22d3ee"
          emissive="#0e7490"
          emissiveIntensity={0.7}
          roughness={0.1}
          metalness={0.8}
          flatShading
        />
      </mesh>
    </group>
  );
}
