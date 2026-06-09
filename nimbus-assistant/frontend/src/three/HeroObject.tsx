import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

/**
 * The hero centerpiece: a glowing, gently warping icosahedron wrapped in a
 * violet wireframe shell — reads as an abstract "AI core / brain".
 *
 * Why MeshDistortMaterial over a custom shader: it gives an organic, liquid
 * warp with bloom-friendly emissive out of the box and is rock-solid across
 * devices — i.e. it looks best in a screen recording with the least risk.
 *
 * Reactivity:
 *  - constant slow spin so it's always alive
 *  - tilts toward the mouse (pointer is normalized to [-1, 1]); we lerp the
 *    rotation each frame so the motion is smooth/damped, not snappy
 *  - the distortion amount "breathes" on a sine wave
 */
export default function HeroObject() {
  const mesh = useRef<THREE.Mesh>(null!);
  const shell = useRef<THREE.Mesh>(null!);
  // MeshDistortMaterial exposes a mutable `distort` we animate per-frame.
  const mat = useRef<any>(null!);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const { x: px, y: py } = state.pointer; // [-1, 1] across the canvas

    // Always-on rotation.
    mesh.current.rotation.y += delta * 0.15;

    // Damped tilt toward the cursor (lerp factor ~0.05 == smooth follow).
    mesh.current.rotation.x = THREE.MathUtils.lerp(
      mesh.current.rotation.x,
      py * 0.4,
      0.05,
    );
    mesh.current.rotation.z = THREE.MathUtils.lerp(
      mesh.current.rotation.z,
      -px * 0.25,
      0.05,
    );

    // Counter-rotate the wireframe shell for parallax depth.
    shell.current.rotation.y -= delta * 0.08;
    shell.current.rotation.x = mesh.current.rotation.x * 0.6;

    // Breathing surface warp.
    if (mat.current) mat.current.distort = 0.35 + Math.sin(t * 0.8) * 0.12;
  });

  return (
    <group>
      <mesh ref={mesh} castShadow>
        {/* High subdivision (detail=16) so the vertex distortion stays smooth. */}
        <icosahedronGeometry args={[1.3, 16]} />
        <MeshDistortMaterial
          ref={mat}
          color="#22d3ee"
          emissive="#0e7490"
          emissiveIntensity={0.7}
          roughness={0.15}
          metalness={0.6}
          distort={0.4}
          speed={1.6}
        />
      </mesh>

      {/* Translucent violet wireframe cage around the core. */}
      <mesh ref={shell} scale={1.5}>
        <icosahedronGeometry args={[1.3, 2]} />
        <meshBasicMaterial
          color="#8b5cf6"
          wireframe
          transparent
          opacity={0.14}
        />
      </mesh>
    </group>
  );
}
