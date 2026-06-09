import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import LoginModal from "../components/LoginModal";

/**
 * Lightweight client-side auth for the self-hosted assistant.
 *
 * Since this is a local, key-less deployment we keep a simple session in
 * localStorage (name + email) rather than a server user store. The login form
 * still validates a password for UX, but it is never stored or sent — to make
 * this real, POST credentials to a backend /login here and persist a token.
 *
 * The provider also OWNS the login modal and exposes `promptLogin(onSuccess?)`
 * so any component (the FAB, the inline chat panel) can trigger sign-in and
 * resume its action once the user is authenticated.
 */
export interface User {
  name: string;
  email: string;
}

interface AuthValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  /** Open the login modal; runs `onSuccess` after a successful sign-in. */
  promptLogin: (onSuccess?: () => void) => void;
}

const AuthCtx = createContext<AuthValue | null>(null);
const STORAGE_KEY = "nimbus_user";

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadUser);
  const [modalOpen, setModalOpen] = useState(false);
  // Action to resume after a successful login (e.g. "now open the chat").
  const pending = useRef<(() => void) | null>(null);

  const login = useCallback((u: User) => {
    setUser(u);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    } catch {
      /* storage may be unavailable (private mode) — session stays in memory */
    }
    setModalOpen(false);
    pending.current?.();
    pending.current = null;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const promptLogin = useCallback((onSuccess?: () => void) => {
    pending.current = onSuccess ?? null;
    setModalOpen(true);
  }, []);

  return (
    <AuthCtx.Provider
      value={{ user, isAuthenticated: !!user, login, logout, promptLogin }}
    >
      {children}
      <LoginModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          pending.current = null;
        }}
        onSubmit={login}
      />
    </AuthCtx.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
