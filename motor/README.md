# Motor de Wayfinder

Node 22 o superior (Bob Shell requiere Node 24). Desde esta carpeta:

```powershell
npm ci
npm test
npm start
```

API local en `http://127.0.0.1:3101`. El proceso escucha solamente en loopback.
Los mapas quedan en `motor/data/mapas/` y sobreviven al reinicio. No se suben a Git.
Los recorridos en curso y sus eventos se conservan en memoria; al reiniciar hay que
iniciarlos nuevamente. Un mapa anterior no se sustituye hasta terminar y guardar
el nuevo recorrido. No se envían formularios ni se accede a sesiones autenticadas.

## Contrato para el visor de Cande

Se respeta `visor/lib/tipos.ts`. IDs estables: `p_` más 16 caracteres SHA-256 de
la URL normalizada. Se conservan parámetros de consulta; se quitan fragmentos y
parámetros de seguimiento. `camino` distingue páginas con diferente query string.

Campos adicionales compatibles:

- Página: `descripcion` (meta description literal), `origen: html|bob`.
- Mapa: `ejecucion`, con estado de cobertura, límite, pendientes, errores,
  advertencias, duración y resultado de Bob si se solicitó.
- `resumen` y `entidades` se llenan exclusivamente tras una respuesta válida de Bob.

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/salud` | Motor y configuración de Bob; no valida saldo ni credencial |
| GET | `/api/mapas` | Lista `{id, mapa}` de mapas guardados |
| GET | `/api/mapas/:id` | JSON compatible con el visor |
| GET | `/api/mapas/:id/archivo` | Descarga JSON con Content-Disposition attachment |
| POST | `/api/recorridos` | `{url, maxPaginas:40, bob:false}` → HTTP 202 con id |
| GET | `/api/recorridos/:id` | Estado y eventos; alternativa al stream |
| GET | `/api/recorridos/:id/eventos` | SSE con progreso y replay usando Last-Event-ID |
| POST | `/api/recorridos/:id/cancelar` | Cancela el trabajo |
| POST | `/api/mapas/:id/consulta` | `{pregunta:"…"}` → extracto y fuentes |

Eventos: `inicio`, `leyendo`, `pagina`, `error_pagina`, `crawl_completado`,
`bob_inicio`, `bob_evento`, `completado`, `error`, `cancelado`.
`completado` significa que el trabajo terminó; consultar `ejecucion.estado` para
distinguir cobertura parcial y `ejecucion.bob` para el resultado del análisis.

La consulta actual es recuperación textual ponderada, tolerante a tildes, con
extractos literales y URLs. **No es búsqueda semántica ni una respuesta generada.**
No hay pgvector/embeddings implementados en esta entrega.

## Bob Shell

Instalar el paquete oficial según https://bob.ibm.com/docs/shell/getting-started/install-and-setup
y copiar `.env.example` a `.env`. Configurar `BOB_ENTRY` con el archivo
`bobshell/dist/bob.js` y `BOB_API_KEY` con una clave de inferencia del portal de IBM.
No guardar la clave en Git. `npm start` carga `.env` automáticamente.

El adaptador ejecuta Bob sin shell, entrega documentos por stdin, procesa
`stream-json`, limita costo/turnos/tiempo y valida IDs antes de incorporar resúmenes.
Esta primera integración usa modo `ask` con herramientas deshabilitadas para
mantener el contenido web como datos. **No demuestra todavía agentes o subagentes
de Bob en paralelo.** La concurrencia del crawler es de peticiones HTTP.
Los resúmenes siguen siendo texto generado: verificar contra las fuentes antes
de usar la demo para decisiones. Si Bob falla, el HTML guardado sigue disponible
y la falla queda explícita en el mapa.

~~La prueba de inferencia devolvió `Bob API key is required`.~~ Resuelto el 26/09:
con clave Inference, Bob responde (PC de Franco y VPS). Bob Shell 2.x manda el texto
en eventos `message` y el `result` final no trae `last_message`; `runBob()` junta
los pedazos. La licencia se acepta una vez por máquina con `--accept-license`.

## Revisión de seguridad con Bob (26/09)

Decisión de Cande: Bob revisa lo técnico del sitio (ver `CLAUDE.md`, Decisiones).
Pedirla al crear el recorrido: `POST /api/recorridos` con `{"url":…, "seguridad": true}`.
El resultado queda en `mapa.auditoria.seguridad`. Código en `src/seguridad.mjs`.

Cómo funciona, en tres pasos:

1. **Evidencia pasiva** (código, sin IA). El crawler guarda en `pagina.tecnico` las
   cabeceras de seguridad, las cookies **sin su valor** (nombre y atributos), los
   scripts (externo, con o sin `integrity`), contenido mixto, formularios (destino,
   método, si piden clave), iframes (sandbox), scripts y manejadores en línea y
   `target=_blank` sin `noopener`. Además `siteChecks()` mira si http redirige a
   https, el certificado (protocolo, validez, días para vencer) y `security.txt`.
   No se prueban ataques, no se buscan archivos ocultos, no se envían formularios.
2. **Bob revisa** (`securityPrompt`): con la evidencia como datos no confiables,
   devuelve hallazgos con severidad (alta/media/baja con criterio escrito en el
   prompt) y riesgo en lenguaje simple. **No devuelve arreglos ni código**
   (decisión de Franco, 26/09): aunque Bob los mande, `verifyFindings` no los guarda.
3. **Control anti-invento** (`verifyFindings`): cada hallazgo tiene que citar un
   fragmento que exista TEXTUAL en la evidencia (sin importar mayúsculas, comillas
   ni espacios). Lo que no se puede probar va a `descartados_por_falta_de_prueba`
   con su cita y motivo. Las URLs que Bob nombra se filtran contra las recorridas.

Prueba real (26/09, www.rosario.gob.ar, 5 páginas): 12 hallazgos probados
(4 media, 8 baja: faltan CSP y HSTS, script de jsDelivr sin integrity, iframe sin
sandbox, Drupal y Apache expuestos, etc.), 0 descartados, USD 0,017, 41 s.
Los tests cubren la extracción (y que no se guarde el valor de las cookies) y que
un hallazgo inventado ("inyección SQL" sin prueba) se descarte.

Pendiente: mostrarlo en el visor (reservado por Cande), velocidad y calidad de
código, y repartir las tres revisiones entre subagentes de Bob en paralelo.

## Alcance del crawler

HTML público enlazado del mismo origen; límite configurable de 1 a 200 intentos.
Respeta robots.txt, nofollow y Crawl-delay. Sin ejecutar JavaScript ni leer PDF,
sitemaps, páginas huérfanas o contenido detrás de login. URLs que resuelven a
direcciones privadas/reservadas son rechazadas, también en redirecciones. DNS se
fija a la IP validada. Descargas limitadas a 2 MB y 15 segundos por petición.
Si faltan páginas o hubo errores, el mapa indica cobertura parcial.

Para un JSON desde terminal:

```powershell
npm run crawl -- https://www.argentina.gob.ar/ 6
```

## Verificación

`npm test` usa un servidor HTTP controlado y verifica robots, formularios sin
envío, deduplicación, errores, límites, persistencia, consultas, SSE y rechazo de
redes privadas. La prueba pública inicial leyó seis páginas de Argentina.gob.ar,
guardó sus textos y detectó 49 URLs pendientes. Es una muestra real, no un mapa
completo del dominio. La integración de frontend está preparada fuera de
`visor/`, pendiente de resolver su reserva en BUZON.md. El parche está en
`motor/integracion/visor.patch`: desde la raíz, revisar con
`git apply --check --ignore-whitespace motor/integracion/visor.patch` y aplicar con
`git apply --ignore-whitespace motor/integracion/visor.patch` una vez coordinado con Cande.
La copia de revisión pasó `npm run build` y las pruebas de navegador para
crear, consultar, navegar el árbol y cancelar un recorrido real.
