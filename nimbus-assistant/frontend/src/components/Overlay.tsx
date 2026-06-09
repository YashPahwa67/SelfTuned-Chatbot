import { motion } from "framer-motion";

/**
 * The HTML content layer rendered inside drei's <Scroll html>. It scrolls in
 * lockstep with the 3D camera. Four full-height sections map to the 4
 * ScrollControls pages: Hero -> Features -> Live Demo -> Footer/CTA.
 *
 * IMPORTANT: this renders INSIDE the R3F <Canvas> tree, and React Context does
 * NOT cross the Canvas boundary. So nothing here may call useAuth/useChat — the
 * real chat lives in <ChatModal> outside the Canvas. The Live-Demo section just
 * opens it via the `onOpenChat` prop (props DO cross the boundary).
 *
 * Everything is pointer-events-none by default so the mouse can still orbit the
 * 3D behind it; interactive bits (links, the launch button) opt back in with
 * pointer-events-auto.
 */

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.4 },
  transition: { duration: 0.6 },
};

const FEATURES = [
  {
    title: "Fine-tuned, on-brand",
    body: "A LoRA-adapted Qwen/Llama model that answers in your product's voice — not a generic chatbot.",
  },
  {
    title: "Self-hosted & private",
    body: "Runs entirely on your hardware (Apple Silicon, CUDA or CPU). No external API, no data leaving your box.",
  },
  {
    title: "Streaming responses",
    body: "Tokens render live over SSE for that instant, conversational feel.",
  },
];

export default function Overlay({ onOpenChat }: { onOpenChat: () => void }) {
  return (
    <div className="pointer-events-none w-full text-white">
      {/* ---------------------------------------------------------------- */}
      {/* SECTION 1 — HERO                                                  */}
      {/* ---------------------------------------------------------------- */}
      <section className="flex h-screen flex-col items-center justify-center px-6 text-center">
        <motion.div {...fadeUp}>
          <p className="mb-4 text-sm uppercase tracking-[0.3em] text-nimbus-cyan/80">
            Self-hosted · Fine-tuned
          </p>
          <h1 className="text-5xl font-bold leading-tight md:text-7xl">
            <span className="text-gradient">NimbusCloud</span> Assistant
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-white/60 md:text-lg">
            Your own LLM, tuned to your product and served from your own
            machine. Cinematic on the outside, fully private on the inside.
          </p>
        </motion.div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* SECTION 2 — FEATURES                                             */}
      {/* ---------------------------------------------------------------- */}
      <section className="flex h-screen flex-col items-start justify-center gap-8 px-6 md:px-24">
        <motion.h2 {...fadeUp} className="text-3xl font-bold md:text-5xl">
          Built for <span className="text-gradient">production</span>
        </motion.h2>
        <div className="grid w-full max-w-3xl gap-4 md:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              {...fadeUp}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="glass p-5"
            >
              <h3 className="mb-2 text-lg font-semibold text-white">
                {f.title}
              </h3>
              <p className="text-sm text-white/60">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* SECTION 3 — LIVE DEMO (chat)                                     */}
      {/* ---------------------------------------------------------------- */}
      <section className="flex h-screen flex-col items-center justify-center gap-8 px-6 md:flex-row md:justify-end md:px-24">
        <motion.div {...fadeUp} className="max-w-sm md:mr-auto">
          <h2 className="text-3xl font-bold md:text-5xl">
            Talk to it <span className="text-gradient">live</span>
          </h2>
          <p className="mt-4 text-white/60">
            Wired to the real FastAPI backend running your fine-tuned model.
            Multi-turn memory, live token streaming.
          </p>
        </motion.div>

        {/* Launcher card — opens the real chat (which lives outside the Canvas
            so it can use auth + chat context). */}
        <motion.div
          {...fadeUp}
          className="glass pointer-events-auto w-full max-w-md p-6"
        >
          <div className="mb-4 flex items-center gap-2">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-nimbus-cyan shadow-[0_0_10px] shadow-nimbus-cyan" />
            <span className="text-sm font-semibold text-white">
              NimbusCloud Assistant
            </span>
          </div>
          <p className="mb-5 text-sm text-white/60">
            Sign in and ask anything about NimbusCloud — backups, API keys,
            regions, billing. Responses stream in live.
          </p>
          <button
            onClick={onOpenChat}
            className="w-full rounded-xl bg-gradient-to-r from-nimbus-cyan to-nimbus-violet px-5 py-3 font-semibold text-nimbus-ink transition hover:opacity-90"
          >
            Launch live chat
          </button>
        </motion.div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* SECTION 4 — FOOTER / CTA                                         */}
      {/* ---------------------------------------------------------------- */}
      <section className="flex h-screen flex-col items-center justify-center px-6 text-center">
        <motion.h2 {...fadeUp} className="text-4xl font-bold md:text-6xl">
          Ship your own <span className="text-gradient">assistant</span>
        </motion.h2>
        <motion.p
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-6 max-w-lg text-white/60"
        >
          Train a LoRA adapter, point the backend at it, and you have a private,
          on-brand AI in minutes.
        </motion.p>
        <motion.a
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.3 }}
          href="#"
          className="pointer-events-auto mt-10 rounded-full bg-gradient-to-r from-nimbus-cyan to-nimbus-violet px-8 py-3 font-semibold text-nimbus-ink transition hover:opacity-90"
        >
          Read the docs
        </motion.a>
      </section>
    </div>
  );
}
