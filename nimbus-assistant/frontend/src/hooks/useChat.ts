import { useCallback, useRef, useState } from "react";
import { ChatMessage, streamChat } from "../lib/api";

/**
 * Owns the conversation: full multi-turn history, streaming state, errors.
 * `send` appends the user message + an empty assistant placeholder, then fills
 * that placeholder token-by-token as the stream arrives. The full history
 * (minus the placeholder) is sent to the backend so the model has context.
 */
export function useChat(systemPrompt: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      setError(null);
      const userMsg: ChatMessage = { role: "user", content: trimmed };

      // History sent to the backend: everything so far + this user turn.
      const history = [...messages, userMsg];
      // Local view also shows an empty assistant bubble we stream into.
      setMessages([...history, { role: "assistant", content: "" }]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        for await (const token of streamChat(
          history,
          systemPrompt,
          controller.signal,
        )) {
          // Append the token to the last (assistant) message immutably.
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            next[next.length - 1] = { ...last, content: last.content + token };
            return next;
          });
        }
      } catch (e) {
        const err = e as Error;
        if (err.name === "AbortError") return; // user stopped/cleared — not an error
        setError(err.message || "Something went wrong.");
        // If nothing streamed, drop the empty assistant bubble.
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant" && last.content === "") next.pop();
          return next;
        });
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, isStreaming, systemPrompt],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const clear = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
  }, []);

  return { messages, send, stop, clear, isStreaming, error };
}
