import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import {
  ScrollControls,
  Scroll,
  Preload,
  AdaptiveDpr,
  AdaptiveEvents,
} from "@react-three/drei";
import Lighting from "./Lighting";
import ParticleField from "./ParticleField";
import ScrollScenes from "./ScrollScenes";
import Effects from "./Effects";
import Overlay from "../components/Overlay";
import type { PerfTier } from "../hooks/usePerformanceTier";

/**
 * The single WebGL canvas for the whole site.
 *
 * Layout: ScrollControls creates a 4-page scroll region. Inside it:
 *   - <ScrollScenes> drives the camera + 3D accents off the scroll offset.
 *   - <Scroll html> renders the normal-DOM overlay (copy + the chat panel)
 *     that scrolls in lockstep with the 3D.
 * ParticleField sits outside ScrollControls as a fixed ambient backdrop.
 *
 * Perf: dpr/particleCount/bloom all come from the PerfTier. AdaptiveDpr drops
 * resolution under load; AdaptiveEvents throttles raycasting while moving.
 */
export default function Scene({
  tier,
  onOpenChat,
}: {
  tier: PerfTier;
  onOpenChat: () => void;
}) {
  return (
    <Canvas
      shadows
      dpr={tier.dpr}
      camera={{ position: [0, 0, 6], fov: 45 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#05060a"]} />
      {/* Fog hides the far edge of the particle shell and adds depth. */}
      <fog attach="fog" args={["#05060a", 9, 26]} />

      <Suspense fallback={null}>
        <Lighting />
        <ParticleField count={tier.particleCount} />

        <ScrollControls pages={4} damping={0.28}>
          <ScrollScenes />
          {/* The HTML overlay. Pointer events are enabled per-element. */}
          <Scroll html style={{ width: "100%" }}>
            <Overlay onOpenChat={onOpenChat} />
          </Scroll>
        </ScrollControls>

        {tier.bloom && <Effects />}
        <Preload all />
      </Suspense>

      <AdaptiveDpr pixelated />
      <AdaptiveEvents />
    </Canvas>
  );
}
