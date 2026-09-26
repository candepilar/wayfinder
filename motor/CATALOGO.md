# Catálogo genérico por sitio

El producto organiza gestiones para el usuario final. La misma entrada por URL
sirve para sitios municipales, educativos, comerciales u otros. No hay lista de
dominios admitidos ni configuración de un municipio en este circuito.

## Flujo real

`POST /api/recorridos` con `{url, maxPaginas:40, catalogo:true}` ejecuta el planificador
municipal reutilizable por URL, extrae bloques completos/enlaces y organiza el catálogo
con IBM Bob. Comparte cola, cancelación, límite de tiempo, red pública y robots con
las protecciones existentes. No entra en formularios ni acciones detectadas de carrito.

El adaptador de Bob se usa sin modificarlo: modo ask, sin herramientas, documentos
como datos no confiables. No se implementaron subagentes ni se atribuye a Bob una
revisión técnica cuando solamente organiza fichas. Su análisis técnico anterior sigue
siendo una función separada.

Bob selecciona IDs de bloques y enlaces de cada documento. El motor devuelve el texto
original, valida pertenencia, conserva orden y contexto cercano y rechaza referencias
inventadas. Las fichas detectadas por estructura HTML se conservan; Bob puede completar
campos ausentes sin eliminar los requisitos ya extraídos. Esto comprueba procedencia,
no exactitud semántica, vigencia, exhaustividad ni funcionamiento de un formulario.

## Contrato y descarga

El mapa incluye `catalogo`: versión, sitio/fecha, cobertura, fichas, estado de Bob,
task_id/costo cuando están disponibles, omisiones y descartes. Una ficha contiene
nombre, tipo, requisitos, pasos, costo, donde_se_hace, destinos, formulario, fuente,
fecha, origen, faltantes y `validacion_humana:false`. Campos de contenido contienen
`{texto,fuente,tipo}`. Datos desconocidos quedan vacíos, nunca se rellenan por inferencia.

`GET /api/mapas/:id/catalogo?descargar=1` descarga ese contrato; la pantalla también
permite descargar el JSON del catálogo abierto. La vista ciudadana permite filtrar,
abrir ficha, revisar indicaciones y continuar por enlaces reales en otra pestaña.
El mapa técnico anterior permanece accesible.

Reproducción local desde motor/:

```powershell
node --env-file-if-exists=.env src/catalogo-cli.mjs https://www.gov.uk/renew-driving-licence 5
node --env-file-if-exists=.env src/catalogo-cli.mjs https://laeconomica.com.ar/ 12
```

## Límites explícitos

- La entrada es genérica; no está demostrada la compatibilidad universal. Solo HTML
  público: login, sitios basados en JavaScript, PDFs y recorridos multipágina pueden
  quedar sin resolver. No se completan trámites ni se envían datos.
- Bob recibe hasta 20 páginas pendientes de organización, 100.000 caracteres en total
  y 10.000 por página; se omiten bloques completos de más de 5.000 caracteres, sin
  cortarlos. Todos esos límites y sus omisiones quedan registrados.
- Una ficha por página. No se combinan automáticamente requisitos de páginas distintas.
  Encabezados/párrafos de contexto se preservan; categorías complejas requieren revisión.
- Un catálogo vacío no significa que el sitio no tenga gestiones. Si Bob falla, quedan
  las fichas HTML y un estado de error explícito. Volver a abrir la URL reintenta en ese caso.
- Las fuentes no gubernamentales no se presentan como oficiales. La fecha es la de
  lectura, no una prueba de actualización o vigencia del contenido.

## Evidencia de IBM Bob (26/09/2026)

- Revisión de arquitectura sobre código real: task `e2a2b8027ee9b802d860fa124348c778`,
  costo reportado 0,033484. Alertó sobre sesgo de verbos, contexto, truncamiento y
  diferencia entre evidencia literal y validez semántica. No se adoptó su sugerencia
  de usar la cabecera HTTP Date como fecha de vigencia: no demuestra actualización.
- Prueba local La Económica: 12 páginas, 4 fichas organizadas por Bob, task
  `4a7cd2b96163a873f816cc4b43e78f47`, costo 0,087884. Incluyó alquileres y canal
  profesional; campos y destinos ausentes se mantuvieron explícitos.
- Prueba local GOV.UK: 5 páginas, 5 fichas en inglés y accesos enlazados, task
  `1aac3d08c3be612179d3ab1cdd37cf5a`, costo 0,036698. No se visitaron ni completaron
  los formularios. Estos resultados locales no prueban por sí solos el despliegue.

Pruebas automatizadas: procedencia/rechazo de referencias inventadas, idiomas y
dominios independientes, presupuestos sin cortar frases, contexto, enriquecimiento
sin pérdida de requisitos, fallo/cancelación de Bob, API/descarga y no envío de formularios.
Pruebas de navegador en `visor/test/`: inicio/seguimiento y ficha/búsqueda/descarga.
