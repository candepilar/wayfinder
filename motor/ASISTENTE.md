# Bob como guía del catálogo

El asistente está en Inicio (con selector de sitio), en cada catálogo genérico y en
las vistas de Rosario/VGG. No ejecuta trámites ni envía formularios: conversa y
ofrece fichas y accesos del catálogo. Conserva la paleta de Cande.

## Contrato y ejecución

- `GET /api/asistente/sitios`: sitios con catálogo guardado y municipios con snapshot.
- `POST /api/asistente`: `{contexto, pregunta, historial}`. Contexto es un ID devuelto
  por el GET (`municipio:rosario` o `sitio:<URL guardada>`). El servidor resuelve la
  fuente; no acepta documentos ni direcciones de destino proporcionados por el cliente.
- Pregunta de hasta 1000 caracteres; historial de hasta 8 mensajes user/assistant,
  hasta 1600 caracteres cada uno. No se admite rol system. JSON máximo 16 KB.
- Invoca `runBob` real en modo ask, sin herramientas, MCP ni subagentes. No modifica
  el adaptador reservado. Una ejecución por consulta, 55 s máximo; fallo explícito,
  nunca una respuesta ficticia atribuida a Bob.
- Devuelve mensaje, estado, fichas, citas literales, sugerencias, contactos de origen,
  alcance y `bob.task_id`. Las URLs se materializan del catálogo, nunca del modelo.
- Hasta 80 fichas, índice de nombres y hasta 28.000 caracteres de bloques completos,
  priorizados por consulta/historial. No se cortan requisitos a mitad de frase; se
  declaran omisiones. Solo ve el catálogo leído, no toda la web en vivo.

## Límites de validación

Se validan IDs, pertenencia de citas a fichas, esquema, longitud y cifras citadas.
Las citas se copian de la fuente. Si el modelo no encuentra información, se usa un
mensaje controlado y solo sus fichas relacionadas válidas, más contacto del sitio
o su portada si no se encontró contacto. Las sugerencias de aclaración son opciones.
Esto **no prueba la corrección semántica de todo el resumen generado**, la vigencia
de una ficha ni el funcionamiento del destino. La UI muestra fuentes, fecha de lectura
y aviso de generación automática. Cobertura faltante no se soluciona con conversación.

## Recursos y conversación

Una consulta de Bob a la vez; puede correr mientras se arma un catálogo (27/09), no durante una revisión de código. Una pregunta repetida sobre la misma lectura se responde desde memoria (1 h) sin llamar a Bob. Hasta 8 consultas
por IP/10 minutos y 60 totales/hora por proceso. Límites en memoria, reinician al
reiniciar el servicio; no son una cuota persistente de cuenta. Cada llamada además
respeta `BOB_MAX_COST` configurado en el adaptador existente.
Desconectar/cancelar aborta el proceso. El workspace temporal se elimina en `finally`.
La API no guarda preguntas/historial en la base de mapas; el proveedor recibe el
mensaje, el historial enviado y la evidencia. La pantalla conserva hasta 10 turnos y
envía los últimos 4; cambiar de sitio, salir o reiniciar la conversación la limpia.

## Verificación

`npm test` en motor incluye contrato, fuentes/URLs inventadas, cifras sin cita,
presupuesto de bloques, errores reales, contexto desconocido, cancelación por
desconexión, exclusión mutua, limpieza de workspace y límites.
`visor/test/asistente-browser.cjs` verifica UI con API interceptada (sin créditos):
consulta, seguimiento, enlaces/fuentes, cambio de sitio, fallo/reintento, cancelación,
teclado y ancho móvil. No constituye una evaluación del modelo.

Bob real fue ejecutado con catálogos de Rosario, VGG y La Económica. Ejemplos:
«tasa de mi casa» → Pagar TGI; «registro civil, partida de nacimiento» → Solicitud
de partidas; «arquitecto, materiales para una obra» → Canal profesional. La consulta
de pasaporte en el catálogo comercial declara ausencia de información. Muestras
observadas de 5,6–12,5 s en desarrollo, no garantía de latencia. Las referencias
temáticas a Sanidad Animal se tratan como alternativa relacionada cuando no hay
evidencia del servicio exacto, no como prueba de atención de abandono.

La confirmación de publicación y ejecuciones en producción se registra en BUZON.md.
