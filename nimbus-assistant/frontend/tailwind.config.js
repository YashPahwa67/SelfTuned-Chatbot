/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand accents: cyan -> violet gradient family.
        nimbus: {
          cyan: "#22d3ee",
          violet: "#8b5cf6",
          ink: "#05060a",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        blink: { "0%,100%": { opacity: "0.2" }, "50%": { opacity: "1" } },
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out both",
        blink: "blink 1.2s infinite",
      },
    },
  },
  plugins: [],
};
