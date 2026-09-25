import type { Config } from "tailwindcss";

// Los mismos nombres que en fragua/web, para que los dos proyectos se lean
// igual: ink = texto principal, muted = texto secundario, line = bordes.
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        fondo: "var(--fondo)",
        surface: "var(--surface)",
        line: "var(--line)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        ember: "var(--ember)",
      },
    },
  },
} satisfies Config;
