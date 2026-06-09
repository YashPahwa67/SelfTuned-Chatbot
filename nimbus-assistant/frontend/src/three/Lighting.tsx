import { Environment, Lightformer, ContactShadows } from "@react-three/drei";

/**
 * Cinematic lighting, fully self-contained (no external HDRI download).
 *
 * <Environment> renders the Lightformers below into an off-screen cube map that
 * lights every PBR material in the scene — that's what gives the centerpiece
 * its cyan/violet rim reflections. We build the env from colored rect/ring
 * "lightformers" instead of a preset so it works offline and matches the brand.
 * ContactShadows fakes a soft grounded shadow under the hero object cheaply.
 */
export default function Lighting() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={1.1}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />

      <Environment resolution={256} frames={1}>
        {/* Big cyan key from the left, violet fill from the right. */}
        <Lightformer
          form="rect"
          intensity={2.2}
          color="#22d3ee"
          position={[-6, 2, -6]}
          scale={[10, 10, 1]}
        />
        <Lightformer
          form="rect"
          intensity={2.2}
          color="#8b5cf6"
          position={[6, -2, -6]}
          scale={[10, 10, 1]}
        />
        {/* White ring overhead for a clean specular highlight. */}
        <Lightformer
          form="ring"
          intensity={1.4}
          color="#ffffff"
          position={[0, 6, -8]}
          scale={5}
        />
      </Environment>

      <ContactShadows
        position={[0, -2.2, 0]}
        opacity={0.45}
        scale={14}
        blur={2.6}
        far={4}
        color="#000000"
      />
    </>
  );
}
