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

## Publicación y comprobación externa

Commit `26e9461`, Actions `36297515800` exitoso: motor, pruebas de extensión,
build y despliegue. ZIP público 0.3.0 de 41798 bytes; 17 archivos coinciden con
el repo (texto normalizando CRLF). SHA256:
`710C3123D6DD81495986E8267187553471505D73ED62060CEDCD97DC91D6F8D2`.

API pública con Origin de extensión: La Económica conserva 5 fichas. Coto,
recorrido `c788a241-d4bf-45e5-99e7-e192efb7caf0`: 1 página, 0 fichas, parcial,
Bob `sin_documentos`. GOV.UK, recorrido `29f2a1ca-3f27-4000-9ec8-992626064a31`:
5 páginas, 1 ficha (Renew your driving licence) y 1 destino, 19.587 s totales.
Bob task `206a2949ecdd7061758dbc050dd50e19`, costo 0.024828. Son muestras,
no una comparación de tiempos ni garantía de cobertura/vigencia.

Edge headless con perfil aislado cargó la extensión real 0.3.0; APIs nativas:
service worker, panel configurado al clic, fetch de catálogo público (1 ficha)
y rechazo de inyección en Coto antes de una acción explícita comprobados. Esto
complementa el puente controlado; no demuestra activación en Chrome/Brave de Franco.

Comparación medida ejecutando el scheduler de `a737a9c` contra el nuevo en el
mismo fixture HTTP: antes 1 página/0 fichas; después 2 páginas/1 ficha.

Fuentes técnicas: [activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab).
Consigna: [guía oficial](https://lablab-ibm-bob-2-hackathon-guide.s3.us.cloud-object-storage.appdomain.cloud/index.html).

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
