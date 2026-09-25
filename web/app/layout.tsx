import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Visor del Web Map",
  description: "Inspeccionar el mapa que sale del crawler.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
