# Recorrido municipal interactivo

Implementación de Astra, autorizada por Franco el 26/09/2026, sobre las respuestas
de Cande del buzón. Conserva los estilos existentes y agrega acceso desde Inicio.

## Para probarlo

En el visor: **Rosario** o **Villa Gobernador Gálvez**. Enlaces por municipio:
`?municipio=rosario` y `?municipio=vgg`. El modo **Soy vecino** muestra consulta,
opciones, requisitos y pasos; **Vista del municipio** muestra cobertura, conexiones
y revisión técnica de Bob. Es una demo pública: cambiar de vista no autentica roles.

Tres recorridos para presentar:

1. Rosario: **quiero pagar la tasa municipal**. Encontrar Pagar TGI, elegir un
   destino si hay varios y abrir el acceso oficial. Los requisitos distinguen
   casos especiales según el texto original; no son un cálculo de obligaciones.
2. Rosario: **solicitar numeración oficial**. Requisitos y pasos junto al acceso
   «Comenzar» extraído de la ficha (`/inicio/node/1959`).
3. VGG: **necesito el carnet**. Ficha Licencia de conducir y requisitos originales.
   Cuando no hay acceso inequívoco al formulario, dice **solo ficha**, sin inventar
   un botón. La lista incluye condiciones para distintas categorías; la guía no
   determina elegibilidad ni reemplaza las instrucciones oficiales.

Probar también **medio boleto** en Rosario (aclaración entre solicitud/renovación)
y **astronauta** (sin coincidencia, alternativas y contacto). Los enlaces se abren
en otra pestaña para conservar la guía. Nunca se completan/envían formularios.

## Bob sí se ejecutó

Bob Shell se utiliza para la revisión técnica pasiva, respetando su rol acordado.
`auditSecurity()` procesa evidencia HTTP y devuelve diagnósticos; las citas se
contrastan literalmente. Ese control respalda la cita, no certifica la conclusión.
Se muestran estados fallidos/ausentes si Bob no terminó; no hay respuestas simuladas.
Los archivos de demo contienen fecha, identificador de ejecución y costo real.
No se atribuyen a Bob el crawler, la búsqueda ni la clasificación de trámites.
No se afirma que existan subagentes de Bob: el adaptador actual no los habilita.

## Actualizar datos

Desde `motor/`, Node 24 y dependencias instaladas:

```powershell
node --env-file-if-exists=.env src/municipal-cli.mjs rosario 45 --bob
node --env-file-if-exists=.env src/municipal-cli.mjs vgg 65 --bob
node --env-file-if-exists=.env src/municipal-export.mjs
npm test
```

`--bob` requiere credencial de inferencia y consume el saldo configurado. Las
consultas de vecinos no llaman a Bob ni se guardan. La actualización es manual;
no se creó un cron ni se resolvieron las decisiones 7–8 que Cande dejó pendientes.
Los mapas operativos se guardan atómicamente en `data/municipios/` (o
`WAYFINDER_DATA_DIR/municipios`). Los snapshots públicos compactos viven en
`src/municipal-demo/`, incluidos por el paquete de despliegue actual. Se usan como
respaldo cuando no hay mapa operativo; la fecha se muestra siempre, no son un crawl
en vivo al abrir la pantalla. El exportador excluye HTML crudo, cookies y enlaces
con parámetros temporales de autenticación. No exportar `.env` ni carpetas `data/`.

## Contrato HTTP

| Ruta | Resultado |
|---|---|
| `GET /api/municipios` | IDs, nombres, disponibilidad y fecha |
| `GET /api/municipios/:id/catalogo` | Fichas detectadas y cobertura; sin auditoría |
| `POST /api/municipios/:id/consulta` | `{pregunta, opcion?, destino?}` |
| `GET /api/municipios/:id/diagnostico` | Cobertura, conexiones y resultados de Bob |

Consulta devuelve `aclaracion`, `aclaracion_destino`, `listo`, `solo_ficha` o
`no_encontrado`. Si hay opciones, conservar `pregunta` y enviar el `id` elegido como
`opcion`; para elegir entre accesos, enviar además `destino`. Los IDs se resuelven
contra el catálogo del municipio; el cliente no puede inyectar una URL destino.
Cuando hay ficha, se respeta `tramite: {nombre, requisitos, formulario, encontrado_en}`.
Aquí `requisitos` es la URL de la ficha, mientras las listas están en las secciones.
La API de consulta y el contrato del visor anteriores se mantienen.

## Reconocimiento y límites

Las pistas (verbo, ruta `/tramite/`, contexto) solo ordenan la cola. La confirmación
heurística necesita contenido bajo encabezados de requisitos/pasos, o una ficha
de pago con sus formas/costos. Se eliminan encabezados vacíos y listados genéricos.
No equivale a aprobación municipal: cada ficha conserva fuente, fecha y
`validacion_humana: false`. Los destinos solo se extraen de enlaces explícitos;
se indica `enlazado_no_verificado`, sin asegurar que el formulario pueda completarse.
Algunas fichas no tienen esas secciones o requieren JavaScript y no se detectarán.
Las coincidencias son léxicas con sinónimos acotados, no un asistente semántico libre.

No hay captura de credenciales, documentos ni conversaciones. Los checkboxes son
marcas locales que se pierden al salir. No hay seguimiento de expedientes, login
municipal, renovación automática del catálogo ni medición real de ahorro aún.
Los recorridos respetan robots, límites y validación de red; no siguen los destinos
de gestión reconocidos. No se promete cobertura completa de los dos portales.

`municipal-crawler.mjs` es un planificador separado para respetar la reserva de Cande
en `crawler.mjs`; reutiliza sus primitivas de extracción/red. La futura unificación
de las colas queda coordinada, no se pisó su código ni `rutas.mjs`/`bob.mjs`.

## Validación

Pruebas automatizadas: encabezados/anidación/base URL, destino estable, rechazo de
OAuth temporal, ambigüedad, selección, ausencia, aislamiento municipal, robots,
red privada y ausencia de visitas a formularios/registro. Prueba de navegador:
consulta TGI → destino, carnet VGG → requisitos, caso sin resultado y Bob visible;
control móvil sin desborde. Build Next/TypeScript antes de publicar. Esto prueba
orientación y acceso, no la finalización de un trámite externo.
