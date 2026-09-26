# Revisión de código fuente

Franco pidió ambos usos: revisar Wayfinder y permitir cargar otros proyectos.
Luego aclaró que debe usarse la pantalla existente, no una página separada.

La pantalla publicada mantiene Motor, mapas y consulta. Suma un desplegable
"Revisar código de un proyecto con Bob". No se modificó `visor/` reservado:
la copia de integración usa `RevisionCodigo.tsx` y `codigo.patch` sobre Motor
(después de aplicar `visor.patch`). Copiar `RevisionCodigo.tsx` a
`visor/components/` y aplicar `codigo.patch` desde la raíz de la copia integrada.

`POST /api/codigo` recibe `{archivos:[{ruta,contenido}]}`. Revisa los archivos
enviados, sin ejecutar código ni aceptar rutas del servidor. Límite: 80 archivos,
180 KB de texto en total, 60 KB por archivo. Se excluyen rutas privadas,
dependencias, binarios, credenciales reconocibles; el filtro no garantiza detectar
todos los secretos. Se informa antes del envío que el código va a IBM Bob.

La respuesta contiene cobertura con hashes, hallazgos y descartados. Cada hallazgo
tiene archivo, líneas, cita literal, gravedad, categoría y riesgo. Las citas y
ubicaciones se validan; eso NO confirma la interpretación de Bob. No devuelve
parches. Los resultados se entregan a quien envió el código y no se agregan a la
galería pública. El workspace temporal del análisis se limpia al terminar; no
se promete borrado de los registros internos del proveedor Bob.

Un solo análisis de código o recorrido por proceso, con un minuto entre inicios
de código (límite global intencional de la demo). Bob conserva su tope de costo.
Nginx permite 400 KB de JSON; el motor mantiene límites de texto más estrictos.

Para revisar Wayfinder localmente, desde motor:

```powershell
node --env-file-if-exists=.env src/codigo-cli.mjs .. data/revision-wayfinder.json
```

La CLI selecciona fuente de motor y visor; registra excluidos, commit, cambios
locales, hashes y costo. Produce JSON y Markdown. No es una revisión exhaustiva
de todo el repositorio ni de la copia exacta del despliegue.

Verificación 26/09: 16 tests locales; 14 en release VPS (conserva los 9 tests
previos del despliegue más los 5 nuevos). Build estático Next con tipos correcto.
Bob real analizó 30 archivos de Wayfinder: 10 citas válidas, 3 candidatos
descartados por formato/cita. Revisión manual encontró falsos positivos; no deben
presentarse los 10 como problemas confirmados. Se reprodujo en datos temporales
un fallo de Store.list con crawleado_en ausente. No se aplicaron arreglos.

Release: `/opt/wayfinder/releases/20260926-code-review`. Respaldo del release
anterior y Nginx: `/var/backups/wayfinder/code-review-20260926/`.
La pantalla separada `/wayfinder/codigo/` fue retirada por indicación de Franco.

Prueba pública en la interfaz original: carga de demo-code-review.js, Bob real,
5 hallazgos con archivo/línea/cita y 0 descartados. Son diagnósticos por validar,
no cinco vulnerabilidades confirmadas. El ejemplo no se ejecuta.
