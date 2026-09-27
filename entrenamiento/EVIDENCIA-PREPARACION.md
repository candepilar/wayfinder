# Preparación del experimento Granite para Wayfinder

## Actualización: preparación trasladada a RunPod

Franco pidió detener Windows y usar un modelo abierto en la GPU. Se detuvo el generador/finalizador local preservando 62 lotes completos y 3.889 consultas antes del filtro final. El checkpoint de migración (SHA-256 `70f415cd13f4819166d2335bac9ec101038910311c1a1b01cc5e12b2a147117b`) se transfirió por SSH y coincidió en destino.

Hardware verificado: A100-SXM4-80GB, 81.920 MiB de VRAM; disco de contenedor de 30 GB. El panel del usuario muestra 250 GB de RAM, distintos del disco y de la VRAM. PyTorch 2.8.0+cu128, entorno virtual separado, Transformers 4.56.2 y Sentence Transformers 5.1.1.

Se descargó IBM Granite 4.1 8B, revisión `1504002f650e656a0a3789d99574df12e3e94ed0`, para GENERAR ejemplos localmente en la GPU. No se está ajustando ese modelo generativo. Una segunda llamada local al mismo modelo revisa las consultas; sigue sin ser validación humana. La primera prueba omitió algunas decisiones y se descartó el lote; tras ajustar la instrucción y rechazar toda decisión ausente, la repetición aceptó 52 consultas y rechazó 12. Generación: 20,07 s; revisión: 33,14 s; pico de memoria asignada PyTorch: 20,34 GiB. Son medidas de una tanda de ocho documentos, no duración total ni calidad general.

`generar_gpu.py` reanuda los lotes no completados, registra procedencia distinta de Bob y no llama a APIs de Bob/OpenAI. `ejecutar_gpu.py` está iniciado en RunPod: generación/revisión con tandas de hasta 32 documentos, exportación completa, verificación y luego entrenamiento/comparación de Granite embedding 97M. Si falla una etapa, informa el estado y no publica. El generador se libera antes de cargar el modelo de búsqueda. Estado remoto: `ESTADO-GPU.json`.

La automatización de aviso pasó a revisar el Pod cada diez minutos. El registro de procesos Windows y estimación de cuatro horas que sigue abajo es histórico y ya no describe la ejecución actual. El embedding todavía no tiene resultados de entrenamiento; no se publicó nada. Se mantiene pendiente la evidencia real de Bob IDE del concurso.


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
