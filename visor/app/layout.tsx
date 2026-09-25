import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Web Map",
  description: "El mapa navegable de un sitio web.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        {/*
          Las fuentes se piden por <link> y no con next/font a proposito:
          next/font las descarga durante el build, y en esta maquina el TLS
          falla de forma intermitente (ver el README de fragua). Asi, si la
          descarga falla, el navegador cae a la fuente del sistema y no se
          rompe nada.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
