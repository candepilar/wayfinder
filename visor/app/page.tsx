"use client";

import { useEffect, useState } from "react";

import Inicio from "@/components/Inicio";
import Visor from "@/components/Visor";
import Municipal from "@/components/Municipal";
import Catalogo from "@/components/Catalogo";
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
  const [municipio, setMunicipio] = useState<string | null>(null);
  const [technical, setTechnical] = useState(false);
  useEffect(() => {
    const read = () => { const id = new URLSearchParams(window.location.search).get('municipio'); setMunicipio(id === 'rosario' || id === 'vgg' ? id : null); };
    read(); window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, []);
  function choose(id: string | null) {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set('municipio', id); else url.searchParams.delete('municipio');
    window.history.pushState({}, '', url); setMunicipio(id);
  }
  if (municipio) return <Municipal key={municipio} municipio={municipio} onVolver={() => choose(null)} />;

  if (!mapa) return <Inicio onAbrir={m => { setTechnical(false); setMapa(m); }} onMunicipio={choose} />;
  if (mapa.catalogo && !technical) return <Catalogo mapa={mapa} onVolver={() => setMapa(null)} onMapa={() => setTechnical(true)} />;
  if (mapa.catalogo) return <Visor mapa={mapa} onVolver={() => setTechnical(false)} />;
  return <Visor mapa={mapa} onVolver={() => setMapa(null)} />;
}
