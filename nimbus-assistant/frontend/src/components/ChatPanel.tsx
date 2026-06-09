import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useChatContext } from "../chat/ChatContext";
import { useAuth } from "../auth/AuthContext";
import Message from "./Message";

/**
 * Floating glassmorphic chat panel — the core interactive feature.
 *
 * Reads the SHARED chat context (so this works identically whether it's the
 * inline Live-Demo panel or the FAB modal) and gates behind auth: signed-out
 * users see a sign-in prompt instead of the composer. `onClose` is provided
 * when rendered inside the modal.
 */
export default function ChatPanel({ onClose }: { onClose?: () => void }) {
  const { user, isAuthenticated, promptLogin, logout } = useAuth();
  const { messages, send, stop, clear, isStreaming, error } = useChatContext();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the newest token as the assistant streams.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    send(input);
    setInput("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5 }}
      className="glass pointer-events-auto flex h-[28rem] w-full max-w-md flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-nimbus-cyan shadow-[0_0_10px] shadow-nimbus-cyan" />
          <div className="leading-tight">
            <span className="block text-sm font-semibold text-white">
              NimbusCloud Assistant
            </span>
            {isAuthenticated && (
              <span className="block text-[11px] text-white/40">
                {user?.name} ·{" "}
                <button
                  onClick={logout}
                  className="underline-offset-2 hover:text-white/70 hover:underline"
                >
                  sign out
                </button>
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAuthenticated && (
            <button
              onClick={clear}
              className="btn-ghost"
              disabled={messages.length === 0 && !isStreaming}
            >
              Clear
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="btn-ghost px-2"
              aria-label="Close chat"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Auth gate — shown when signed out */}
      {!isAuthenticated ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 text-2xl">
            🔒
          </div>
          <p className="text-sm text-white/60">
            Sign in to start chatting with your fine-tuned assistant.
          </p>
          <button
            onClick={() => promptLogin()}
            className="rounded-xl bg-gradient-to-r from-nimbus-cyan to-nimbus-violet px-5 py-2.5 text-sm font-semibold text-nimbus-ink transition hover:opacity-90"
          >
            Sign in
          </button>
        </div>
      ) : (
        <>
          {/* Messages */}
          <div
            ref={scrollRef}
            className="chat-scroll flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
          >
            {messages.length === 0 && (
              <div className="m-auto max-w-xs text-center text-sm text-white/50">
                Hi {user?.name?.split(" ")[0]} 👋 Ask me anything about
                NimbusCloud — backups, API keys, regions, billing…
              </div>
            )}
            {messages.map((m, i) => (
              <Message key={i} message={m} />
            ))}
            {error && (
              <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {error}
              </div>
            )}
          </div>

          {/* Composer */}
          <form
            onSubmit={onSubmit}
            className="flex items-center gap-2 border-t border-white/10 p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-white/40 focus:border-nimbus-cyan/60"
            />
            {isStreaming ? (
              <button
                type="button"
                onClick={stop}
                className="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
              >
                Stop
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="rounded-xl bg-gradient-to-r from-nimbus-cyan to-nimbus-violet px-4 py-2 text-sm font-semibold text-nimbus-ink transition disabled:opacity-40"
              >
                Send
              </button>
            )}
          </form>
        </>
      )}
    </motion.div>
  );
}
