import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";

/**
 * Post-processing stack. Bloom makes the emissive materials (the core, the
 * accents, the particles) actually glow — it's the single biggest contributor
 * to the "premium" look. Vignette darkens the edges to focus the eye.
 *
 * Only mounted on the high-performance tier (see Scene.tsx) — bloom is the
 * first thing we drop on mobile / low-power.
 */
export default function Effects() {
  return (
    <EffectComposer>
      <Bloom
        intensity={0.85}
        luminanceThreshold={0.2} // only bright (emissive) pixels bloom
        luminanceSmoothing={0.9}
        mipmapBlur // cheaper, softer bloom
      />
      <Vignette eskil={false} offset={0.25} darkness={0.85} />
    </EffectComposer>
  );
}
