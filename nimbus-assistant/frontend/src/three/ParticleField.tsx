import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Ambient star/particle field that fills the background for depth.
 * Points are scattered on a thick spherical shell around the camera so there's
 * parallax at every scroll depth. The whole field rotates slowly and drifts
 * opposite the mouse for a subtle parallax effect.
 *
 * `count` comes from the performance tier (fewer points on mobile/low-power).
 */
export default function ParticleField({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null!);

  // Generate positions once. Uniform-on-sphere sampling avoids clumping at
  // the poles: phi = acos(2u-1) gives an even distribution over the sphere.
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 9 + Math.random() * 16; // shell thickness -> depth
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, [count]);

  useFrame((state, delta) => {
    ref.current.rotation.y += delta * 0.012;
    // Mouse parallax: ease the field toward a small offset from the pointer.
    ref.current.position.x = THREE.MathUtils.lerp(
      ref.current.position.x,
      state.pointer.x * 0.7,
      0.03,
    );
    ref.current.position.y = THREE.MathUtils.lerp(
      ref.current.position.y,
      state.pointer.y * 0.7,
      0.03,
    );
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#7dd3fc"
        transparent
        opacity={0.75}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}
