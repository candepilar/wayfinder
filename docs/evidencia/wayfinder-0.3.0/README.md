# Evidencia compartida de Wayfinder 0.3.0

Resultados de las comprobaciones del 27/09/2026 sobre la entrega `26e9461`.
Estos archivos se copiaron sin modificar desde la ejecución de Franco y se
compararon por SHA256 antes de subirlos. No son pruebas nuevas ni un despliegue.

| Archivo | Qué demuestra y qué no |
| --- | --- |
| [Navegador y Coto](extension-030-browser.json) | Escenarios controlados del panel y DOM público real de Coto: 106 accesos, 1 resaltado y apertura de Sucursales. El puente de APIs Chrome es controlado; no es certificación de instalación. |
| [Captura del panel](extension-030-coto.png) | Búsqueda de Sucursales y confirmación del resaltado; captura de la prueba anterior, sin sesión personal. |
| [API pública](extension-030-public-api.json) | Resultados, cobertura y task de Bob: Coto sin documentos; GOV.UK con 1 ficha; catálogo previo de La Económica con 5 fichas. |
| [APIs nativas](extension-030-native-api.json) | Extensión real en Edge headless aislado: versión, permisos, panel, catálogo y denegación de acceso a Coto antes de activación. No es el perfil personal de Franco. |
| [Comparación controlada](extension-030-impact.json) | Mismo fixture HTTP, scheduler anterior `a737a9c` frente a `26e9461`: 1 página/0 fichas → 2 páginas/1 ficha. No mide ahorro de tiempo. |
| [Revisión de Bob Shell](extension-030-bob-review.json) | Salida original de Bob en modo ask, task y costos. Contiene observaciones inferidas y errores del modelo; leer junto con la revisión humana enlazada abajo. No es Bob IDE ni ejecución con herramientas. |

La salida de Bob dice «cinco archivos», aunque se enviaron seis; se conserva el
original como evidencia, no como afirmación comprobada. Las recomendaciones que
se aceptaron y descartaron están en [EXTENSION-CALIDAD.md](../../../motor/EXTENSION-CALIDAD.md).

Pruebas reproducibles: [motor](../../../motor/test/extension.test.mjs),
[contrato de extensión](../../../extension/test.mjs),
[navegador](../../../extension/browser-test.cjs).
Requisitos de ejecución e instalación: [README de extensión](../../../extension/README.md).
Pruebas y build del despliegue: [Actions 36297515800](https://github.com/candepilar/bob/actions/runs/36297515800).

Las mediciones son muestras históricas de esa ejecución. No garantizan el estado
actual de las webs, cobertura completa, exactitud semántica ni gestiones terminadas.
No incluyen ni reemplazan las capturas reales de Bob IDE pendientes del concurso.
