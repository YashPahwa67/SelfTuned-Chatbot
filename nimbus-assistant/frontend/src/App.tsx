import { Suspense, lazy, useEffect, useState } from "react";
import { Loader } from "@react-three/drei";
import { usePerformanceTier } from "./hooks/usePerformanceTier";
import { checkHealth } from "./lib/api";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { ChatProvider } from "./chat/ChatContext";
import ChatModal from "./components/ChatModal";

// Lazy-load the entire WebGL scene so the initial HTML paints instantly and
// the heavy three.js bundle is fetched on demand (perf requirement #5).
const Scene = lazy(() => import("./three/Scene"));

function AppInner() {
  const [lowPower, setLowPower] = useState(false);
  const tier = usePerformanceTier(lowPower);
  const [backendUp, setBackendUp] = useState<boolean | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const { isAuthenticated, promptLogin, user, logout } = useAuth();

  // Ping /health once so we can warn the user if the model server is down.
  useEffect(() => {
    checkHealth().then(setBackendUp);
  }, []);

  // Open the chat from anywhere; if signed out, sign in first then open.
  const openChat = () => {
    if (isAuthenticated) setChatOpen(true);
    else promptLogin(() => setChatOpen(true));
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-nimbus-ink">
      {/* Fixed top bar (sits above the canvas). */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-5">
        <div className="pointer-events-auto flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-gradient-to-r from-nimbus-cyan to-nimbus-violet" />
          <span className="font-semibold tracking-tight text-white">
            NimbusCloud
          </span>
        </div>

        <div className="pointer-events-auto flex items-center gap-3">
          {isAuthenticated ? (
            <span className="flex items-center gap-2 text-sm text-white/70">
              <span className="hidden sm:inline">Hi, {user?.name?.split(" ")[0]}</span>
              <button onClick={logout} className="btn-ghost">
                Sign out
              </button>
            </span>
          ) : (
            <button onClick={() => promptLogin()} className="btn-ghost">
              Sign in
            </button>
          )}
          <button
            onClick={() => setLowPower((v) => !v)}
            className="btn-ghost"
            title="Toggle low-power mode (fewer particles, no bloom)"
          >
            {tier.low ? "⚡ Low power" : "✨ Full quality"}
          </button>
        </div>
      </header>

      {/* Backend-down banner. */}
      {backendUp === false && (
        <div className="absolute inset-x-0 top-16 z-20 mx-auto w-fit rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-200">
          Backend not reachable — start the FastAPI server to enable chat.
        </div>
      )}

      {/* The 3D experience. */}
      <Suspense fallback={null}>
        <Scene tier={tier} onOpenChat={openChat} />
      </Suspense>

      {/* Floating chat button — always available on the front screen. */}
      {!chatOpen && (
        <button
          onClick={openChat}
          className="group fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full bg-gradient-to-r from-nimbus-cyan to-nimbus-violet px-5 py-3 font-semibold text-nimbus-ink shadow-[0_0_30px] shadow-nimbus-cyan/40 transition hover:scale-105"
          aria-label="Open chat"
        >
          {/* Soft pulsing ring to draw the eye. */}
          <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-nimbus-cyan/30" />
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8A8.5 8.5 0 0 1 12.5 3a8.5 8.5 0 0 1 8.5 8.5z" />
          </svg>
          Chat
        </button>
      )}

      {/* The floating chat overlay. */}
      <ChatModal open={chatOpen} onClose={() => setChatOpen(false)} />

      {/* drei's progress loader overlay (shows while models/assets stream in). */}
      <Loader
        containerStyles={{ background: "#05060a" }}
        barStyles={{
          background: "linear-gradient(90deg,#22d3ee,#8b5cf6)",
          height: 4,
        }}
        dataStyles={{ color: "#9ca3af", fontSize: 12 }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <AppInner />
      </ChatProvider>
    </AuthProvider>
  );
}
