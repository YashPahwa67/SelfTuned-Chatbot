/**
 * Thin client for the FastAPI backend.
 *
 * The /chat endpoint returns Server-Sent Events. EventSource can't do POST
 * (we need to send the message history in the body), so we use fetch() and
 * parse the SSE frames off the ReadableStream by hand. streamChat is an async
 * generator that yields decoded tokens — the UI just `for await`s over it.
 */

export type Role = "user" | "assistant" | "system";

export interface ChatMessage {
  role: Role;
  content: string;
}

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`);
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === "ok";
  } catch {
    return false;
  }
}

/** Yields generated tokens as they stream in. Throws on network / server error. */
export async function* streamChat(
  messages: ChatMessage[],
  systemPrompt: string,
  signal: AbortSignal,
): AsyncGenerator<string, void, unknown> {
  const res = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, system_prompt: systemPrompt }),
    signal,
  });

  if (!res.ok || !res.body) {
    // Try to surface the FastAPI error detail.
    let detail = `Request failed (${res.status})`;
    try {
      const err = await res.json();
      if (err?.detail) detail = err.detail;
    } catch {
      /* non-JSON body — keep the generic message */
    }
    throw new Error(detail);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line. Keep the trailing partial
    // frame in `buffer` until its terminator arrives.
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const line = frame.trim();
      if (!line.startsWith("data:")) continue;

      const payload = JSON.parse(line.slice(5).trim());
      if (payload.error) throw new Error(payload.error);
      if (payload.done) return;
      if (payload.token) yield payload.token as string;
    }
  }
}
