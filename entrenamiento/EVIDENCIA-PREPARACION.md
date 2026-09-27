# Preparación del experimento Granite para Wayfinder

Registro del 27/09/2026, 08:55 UTC (05:55 Argentina). Este documento distingue trabajo comprobado, ejecución pendiente y resultados de modelo todavía inexistentes.

## Qué se busca mejorar

Relacionar preguntas cotidianas en español e inglés con trámites del catálogo oficial del sitio elegido. El modelo base es `ibm-granite/granite-embedding-97m-multilingual-r2`, revisión `835ad14087e140460703cf0fae09f97d469d65c2`. Es un Transformer encoder para búsqueda semántica, no un generador de requisitos ni un sistema que complete trámites automáticamente.

## Trabajo comprobado

- Recopilación de 3.802 registros oficiales. 3.750 contienen información con condiciones de reutilización verificadas para el corpus de búsqueda. Fuente, fecha, atribución y hashes quedan registrados.
- Primer paquete terminado: 2.482 consultas sintéticas, 1.238 ES y 1.244 EN, sobre 313 trámites. División: 1.939 entrenamiento, 343 validación, 200 examen. Cinco pruebas de integridad pasaron. Este es el paquete inicial, no el resultado de la ampliación posterior.
- Ampliación solicitada por Franco a todas las fichas utilizables: selección de 3.629 documentos, 454 lotes totales, hasta 29.032 consultas antes de rechazos. Se mantienen los lotes iniciales y las particiones por familias. Los registros excluidos tienen motivos en `COBERTURA-AMPLIADA.json`.
- Nuevos catálogos de Lorca y San Lorenzo de El Escorial: 148 títulos/enlaces, conservados aparte porque no equivalen a fichas completas ni ejemplos aprobados.

## Dónde corre y qué hace Bob

La preparación corre en la PC Windows de Franco, en `C:\Users\Lenovo\bob`. `generar-bob.mjs` llama a Bob Shell para generar consultas y hacer una segunda revisión en una llamada separada. Se consumen recursos de Bob durante esta preparación. Los ejemplos, rechazos, identificadores de tareas y costos reportados por Bob se guardan localmente. No se interpreta una cifra de costos como dólares sin verificar su unidad.

Se verificaron activos `node.exe` (PID 18344, inicio 05:46 Argentina) y `python.exe` (PID 3368, inicio 05:50), correspondientes al generador y finalizador. Los PID son evidencia histórica de esta comprobación, no identificadores permanentes. A las 05:55 se habían completado 55/454 lotes, con 3.442 consultas aceptadas antes del filtro final y 62 rechazos. Estado actualizado: `ESTADO-AMPLIACION.json`.

`finalizar_ampliacion.py` espera el cierre del generador, reintenta lotes fallidos una vez, exporta, verifica datos/hashes, ejecuta el diagnóstico lexical y empaqueta. No alquila GPU, no descarga Granite, no entrena, no publica y no hace operaciones Git.

La estimación inicial restante es aproximadamente cuatro horas, con un margen orientativo de tres a cinco. Se deriva del ritmo inicial, no de una medición completa; errores, cuota, red o suspensión de la PC pueden cambiarla.

## Cuándo se puede iniciar la GPU

Franco pidió aviso antes de encenderla. Se configuró una comprobación cada diez minutos en esta tarea, silenciosa mientras el proceso avance normalmente. Para avisar que los datos están preparados se exige:

1. Estado `expanded_package_verified_not_trained` y manifiesto completo con los 454 lotes revisados.
2. `python entrenamiento/entrenar.py --data entrenamiento/datos/paquete --check-data` exitoso.
3. ZIP, manifiesto y hashes coherentes. No basta con que exista un archivo ZIP del paquete anterior.

Después Franco preparará la GPU y el acceso SSH. La clave privada se usa desde su archivo local; en RunPod se configura la pública. No incluir credenciales en el repositorio, paquete ni evidencia. La PC y Codex deben permanecer activos y con conexión para continuar la preparación y recibir los avisos.

## Qué falta demostrar

No se descargó ni entrenó Granite, no se midió VRAM real, no hay mejora de precisión demostrada ni despliegue. La evaluación es sintética y del mismo proveedor; faltan consultas independientes, sitios nuevos, rechazo de búsquedas sin respuesta y medición en VPS. El diagnóstico BM25 no es una medición de Granite ni de la extensión.

El catálogo cubre distintos ámbitos administrativos; su clasificación temática es heurística y muchas fichas siguen en `other`. Cantidad de datos no implica cobertura completa ni calidad garantizada. Deben mantenerse municipio/sitio y enlaces del catálogo, sin convertir la similitud en una probabilidad de corrección.

Para el concurso, Bob Shell y este registro no sustituyen las capturas reales de resúmenes de tareas de Bob IDE. La auditoría preparada en `BOB-IDE-ENTRENAMIENTO.md` debe ejecutarse y documentarse con evidencia real antes de atribuirle resultados. La [guía oficial](https://lablab-ibm-bob-2-hackathon-guide.s3.us.cloud-object-storage.appdomain.cloud/index.html) exige que Bob IDE sea central.
