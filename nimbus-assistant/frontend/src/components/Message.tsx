import { motion } from "framer-motion";
import type { ChatMessage } from "../lib/api";

/** A single chat bubble. User messages align right (cyan), assistant left (glass). */
export default function Message({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={[
          "max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-gradient-to-br from-nimbus-cyan/90 to-nimbus-violet/90 text-nimbus-ink font-medium"
            : "bg-white/8 border border-white/10 text-white/90",
        ].join(" ")}
      >
        {message.content}
        {/* Blinking caret while an assistant message is still empty/streaming. */}
        {!isUser && message.content === "" && (
          <span className="inline-flex gap-1 py-1">
            <span className="h-1.5 w-1.5 animate-blink rounded-full bg-white/70" />
            <span className="h-1.5 w-1.5 animate-blink rounded-full bg-white/70 [animation-delay:0.2s]" />
            <span className="h-1.5 w-1.5 animate-blink rounded-full bg-white/70 [animation-delay:0.4s]" />
          </span>
        )}
      </div>
    </motion.div>
  );
}
