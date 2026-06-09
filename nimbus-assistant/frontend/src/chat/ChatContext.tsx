import { createContext, useContext, type ReactNode } from "react";
import { useChat } from "../hooks/useChat";
import { useAuth } from "../auth/AuthContext";

/**
 * Hoists the chat state to a single shared instance so the inline "Live Demo"
 * panel and the floating chat modal show the SAME conversation. The system
 * prompt is personalized with the signed-in user's name.
 */
type ChatValue = ReturnType<typeof useChat>;
const ChatCtx = createContext<ChatValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const systemPrompt =
    "You are a helpful assistant for NimbusCloud." +
    (user ? ` You are chatting with ${user.name}.` : "");
  const chat = useChat(systemPrompt);
  return <ChatCtx.Provider value={chat}>{children}</ChatCtx.Provider>;
}

export function useChatContext(): ChatValue {
  const ctx = useContext(ChatCtx);
  if (!ctx) throw new Error("useChatContext must be used within <ChatProvider>");
  return ctx;
}
