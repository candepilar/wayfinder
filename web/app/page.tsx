"use client";

import { useState } from "react";

import Inicio from "@/components/Inicio";
import Visor from "@/components/Visor";
import { WebMap } from "@/lib/tipos";

/**
 * Dos estados y nada mas: o estas eligiendo un sitio, o estas mirando su mapa.
 *
 * Sin rutas a proposito. Una sola pantalla que cambia de estado no recarga
 * nada, y en una demo eso se nota: no hay parpadeo entre pegar la URL y ver
 * el mapa.
 */
export default function Home() {
  const [mapa, setMapa] = useState<WebMap | null>(null);

  if (!mapa) return <Inicio onAbrir={setMapa} />;
  return <Visor mapa={mapa} onVolver={() => setMapa(null)} />;
}
