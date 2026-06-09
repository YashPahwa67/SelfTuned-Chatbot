import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { User } from "../auth/AuthContext";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Glassmorphic sign-in modal. Validates name/email/password client-side.
 * The password is checked for length only and discarded — see AuthContext for
 * why (key-less self-hosted demo). Animated in/out with framer-motion.
 */
export default function LoginModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (user: User) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return setErr("Please enter your name.");
    if (!EMAIL_RE.test(email)) return setErr("Please enter a valid email.");
    if (password.length < 4)
      return setErr("Password must be at least 4 characters.");
    setErr(null);
    onSubmit({ name: name.trim(), email: email.trim().toLowerCase() });
    setPassword(""); // never keep the password around
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Click-away backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.form
            onSubmit={submit}
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="glass relative z-10 w-full max-w-sm p-6"
          >
            <div className="mb-5 flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-gradient-to-r from-nimbus-cyan to-nimbus-violet" />
              <h2 className="text-lg font-semibold text-white">
                Sign in to <span className="text-gradient">NimbusCloud</span>
              </h2>
            </div>

            <label className="mb-1 block text-xs text-white/50">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ada Lovelace"
              className="mb-4 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-nimbus-cyan/60"
            />

            <label className="mb-1 block text-xs text-white/50">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mb-4 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-nimbus-cyan/60"
            />

            <label className="mb-1 block text-xs text-white/50">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mb-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-nimbus-cyan/60"
            />

            {err && <p className="mb-3 text-xs text-red-300">{err}</p>}

            <button
              type="submit"
              className="mt-2 w-full rounded-xl bg-gradient-to-r from-nimbus-cyan to-nimbus-violet px-4 py-2.5 font-semibold text-nimbus-ink transition hover:opacity-90"
            >
              Sign in & chat
            </button>

            <p className="mt-3 text-center text-[11px] text-white/30">
              Local session only · no data leaves your machine
            </p>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
