# Generalización y mantenimiento de la guía — evidencia 27/09/2026

Problema reproducible: extensión 0.2.0 rechaza Coto antes de consultar al motor
porque depende de rutas y dominios municipales fijos. Segundo problema: Coto
entrega al lector HTML una aplicación sin contenido, pero el navegador renderiza enlaces.
No se resuelven ambos problemas agregando Coto a una lista de permisos.

0.3.0 incorpora lectura local explícita de accesos renderizados y consulta del
catálogo público por sitio. Conserva búsqueda municipal, fichas, checklist, fuentes,
resaltado, catálogo, asistente Bob y diagnóstico técnico. No ejecuta trámites.

Corrección del motor: descubre páginas desde navegación con `<base>` y `nofollow`
correctos, sin convertir el menú en requisitos. Las páginas sin contenido útil
quedan como cobertura parcial y no se envían a Bob si solo tienen título.

## Impacto observado, no extrapolado

- Fixture reproducible de biblioteca con servicio enlazado solo desde navegación:
  antes 1 página sin ficha; después 2 páginas y 1 ficha. El mismo test comprueba
  que los destinos privados por robots y nofollow no se solicitan.
- Fixture de aplicación JavaScript sin texto: ahora cobertura parcial, 0 fichas,
  Bob `sin_documentos`; no se presenta un escaneo vacío como cobertura completa.
- Coto público anónimo en Edge headless: 106 accesos locales; buscar Sucursales,
  marcar 1 enlace y abrir `https://www.coto.com.ar/sucursales/` comprobado.
  Son accesos, no 106 trámites. El puente Chrome de esta prueba es controlado;
  no certifica instalación ni permisos nativos.
- Suite: 51 pruebas motor y 9 extensión. Navegador: JS, filtros locales, búsqueda
  sin acentos, confirmación de resaltado, recorrido/catálogo, cache, permiso denegado,
  cancelación, ocupado/reintento y ancho móvil. CI incluye prueba de extensión.
- No hay medición de tiempo ahorrado al ciudadano, tasa de acierto general ni SLA.

## Uso real de Bob y revisión humana

Bob Shell revisó seis archivos enviados como contexto, task
`649cd74af13c92857ab1a348d2fb4bb3`, 32893 ms reportados, costo 0.027504,
0 llamadas de herramientas. Modo ask. Esto NO es evidencia de Bob IDE ni Agent.

Se agregó defensa adicional en URLs del catálogo (parámetros sensibles y destinos
locales) y guardia de revisión tras errores asíncronos. Se descartaron recomendaciones
incorrectas: `activeTab` permite inyección temporal sin `<all_urls>`; `tabs.update`
no necesita ese permiso; ya había guardia después de la petición de seguimiento.
El chequeo de URL antes de leer la pestaña se conserva para evitar usar una vista vieja.
La API es pública: CORS se restringe por ruta; no se agrega un supuesto secreto al
ZIP, porque eso no constituiría autenticación.

La guía del concurso exige evidencia real de Bob IDE. Sigue pendiente capturar
una sesión real y sus task summaries en `bob_sessions`; no se fabrican capturas
ni se presenta la ejecución Shell anterior como cumplimiento de ese requisito.
