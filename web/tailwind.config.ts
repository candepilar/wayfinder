import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        fondo: "var(--fondo)",
        superficie: "var(--superficie)",
        "superficie-alta": "var(--superficie-alta)",
        linea: "var(--linea)",
        "linea-fuerte": "var(--linea-fuerte)",
        tinta: "var(--tinta)",
        "tinta-media": "var(--tinta-media)",
        "tinta-suave": "var(--tinta-suave)",
        acento: "var(--acento)",
        "acento-tinta": "var(--acento-tinta)",
        "acento-suave": "var(--acento-suave)",
        "acento-borde": "var(--acento-borde)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "Consolas", "monospace"],
      },
      boxShadow: { panel: "var(--sombra)" },
    },
  },
} satisfies Config;
