# Wayfinder: búsqueda bilingüe de trámites

Paquete inicial completado (antes de la ampliación a todas las fuentes): **2.482 consultas** (1.238 ES, 1.244 EN) sobre **313 trámites**, con **3.750 fichas oficiales** en el corpus de búsqueda. División: 1.939 entrenamiento, 343 validación y 200 examen. Se excluyeron 60 consultas en la cadena Bob y 2 en la exportación/revisión puntual. No hay un modelo entrenado, descargado ni conectado a producción.

Entrega: `paquete-entrenamiento.zip`, verificable con `PAQUETE.json`. Ejecutar según `RUNPOD.md`. El ZIP incluye fuentes, etiquetas y auditoría; no pesos ni credenciales.

## Ampliación a todas las fuentes utilizables

Franco pidió procesar todos los trámites encontrados. Se agregaron 3.309 fichas a la cola: 3.629 documentos utilizables, 454 lotes totales y hasta 29.032 consultas antes de rechazos. La generación/revisión ampliada está en curso; `ESTADO-AMPLIACION.json` registra el estado y `COBERTURA-AMPLIADA.json` la selección completa. `DATOS-PREPARADOS.json` y el ZIP siguen describiendo el último paquete terminado hasta que la exportación ampliada pase sus controles. El proceso `finalizar_ampliacion.py` reintenta errores una vez, verifica hashes y arma el nuevo paquete; no entrena, publica ni hace operaciones Git.

Se descargaron además 148 títulos/enlaces municipales de Lorca y San Lorenzo de El Escorial. Son candidatos para evaluación en sitios nuevos, no 148 fichas completas ni ejemplos entrenados. Ver `FUENTES-ADICIONALES.json` y `fuentes-adicionales.zip`.

La clasificación temática actual es heurística: muchas fichas quedan en `other`. No equivale a cobertura semántica verificada de todos los tipos de trámite. El catálogo contiene más fuentes españolas que inglesas, aunque se generan consultas en ambos idiomas. Bob debe revisar estos sesgos antes de afirmar calidad general.

## Recopilación inicial del 27/09

Se recopilaron **3.802 registros oficiales**: 3.512 del catálogo abierto AGESIC/Uruguay, 51 snapshots municipales argentinos y 239 fichas inglesas del índice GOV.UK. La Content API permitió recuperar cuerpo completo de 238 de las 239 fichas inglesas; el restante no tiene cuerpo suficiente. Se conserva la fecha de cada fuente y los errores en `FUENTES-RECOPILADAS.json`.

Para las consultas sintéticas se seleccionaron **320 trámites** (160 por idioma fuente, 14 áreas) y se ejecutó Bob Shell sin herramientas para producir hasta 8 consultas por ficha, cuatro ES y cuatro EN. Una segunda llamada revisa pertinencia y confusiones; se exigen IDs existentes y evidencia literal. Las respuestas conservan IDs de tareas Bob y rechazos. Esta revisión automática del mismo proveedor **no es validación humana ni prueba de precisión de Granite**.

Fuentes nuevas: [Catálogo de trámites y servicios del Estado, AGESIC](https://catalogodatos.gub.uy/dataset/agesic-guia-de-tramites), bajo Licencia de Datos Abiertos – Uruguay (permite adaptación y traducción con atribución). Se seleccionaron campos y normalizaron HTML/espacios; no se usaron datos de ciudadanos. [GOV.UK Content API](https://www.gov.uk/help/reuse-govuk-content), OGL v3.0 excepto indicación contraria. MIRACL y WebFAQ continúan excluidos.

```powershell
python entrenamiento/ampliar.py
python entrenamiento/seleccionar.py
node --env-file=motor/.env entrenamiento/generar-bob.mjs 40 2
python entrenamiento/exportar.py
python entrenamiento/diagnostico_bm25.py
python -m unittest discover -s entrenamiento -p test_datos.py -v
```

La orden Node utiliza credenciales locales existentes y consume Bob durante la **preparación** de ejemplos. No enviar `.env` al equipo GPU. `exportar.py` falla si faltan lotes; `--parcial` sirve solo para diagnóstico durante el trabajo. El paquete registra hashes, etiquetas sintéticas y familias separadas. No necesita Bob durante el entrenamiento/inferencia de Granite.

`entrenar.py` y `requirements-gpu.txt` preparan el experimento GPU reproducible; ver `RUNPOD.md`. Su ejecución real todavía está pendiente. La verificación local cubre sintaxis y contratos de datos, no compatibilidad CUDA ni calidad del modelo.

Franco y Cande autorizan avanzar y priorizar calidad. El entrenamiento principal se centra en trámites; quedan fuera Wikipedia y FAQ comerciales generales. Granite embedding relaciona una consulta con una ficha: no genera respuestas ni realiza la gestión.

## Archivos y reproducción

Con Python 3, sin instalar paquetes ni alquilar una GPU:

```powershell
python entrenamiento/preparar.py
python entrenamiento/revisar.py
```

`preparar.py` reúne las 51 fichas municipales ya presentes en el proyecto y descarga el índice oficial GOV.UK filtrado por transaction. Conserva fuente, fecha, jurisdicción y hash. La descarga del índice no equivale a descargar el contenido íntegro de cada trámite. La cantidad puede cambiar en nuevas ejecuciones.

`semillas.json` contiene diez pares de preguntas español/inglés: 20 consultas de desarrollo, con destino correcto y uno que no corresponde. `EJEMPLOS.md` permite revisarlas con enlaces. `revisar.py` verifica referencias, jurisdicciones, duplicados y caracteres corruptos; no certifica calidad semántica.

`datos/` permanece fuera de Git como directorio de trabajo. El paquete ZIP se construye con una lista explícita de archivos y permite entregar corpus, particiones y auditoría sin credenciales. `DATOS-PREPARADOS.json` es el informe ampliado vigente; `INFORME.json` corresponde únicamente a la muestra inicial de 20 consultas.

## Fuentes y procedencia

- Rosario y Villa Gobernador Gálvez: snapshots del 26/09/2026 en `motor/src/municipal-demo/`, enlazados desde `extension/rutas.json`. Se usa únicamente contenido de la propia ficha; nunca requisitos trasladados desde otra. Falta revalidar extracción/vigencia y condiciones de reutilización. No se presume una licencia abierta por ser contenido público.
- GOV.UK: https://www.gov.uk/help/reuse-govuk-content y su Search API. Atribución: Contains public sector information licensed under the Open Government Licence v3.0. Licencia: https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/ . Excepto contenido que indique otra condición. Se conservan título, descripción y enlace; no logos ni identidades de ciudadanos.
- Argentina.gob.ar: se exploró el listado de servicios; una lectura posterior respondió 403. No se eludió la restricción ni se incorporó su contenido.
- MIRACL y WebFAQ se investigaron, pero NO se incorporan al corpus principal por la aclaración de foco en trámites. No se descargaron esos datasets.
- Modelo previsto: https://huggingface.co/ibm-granite/granite-embedding-97m-multilingual-r2 (Apache-2.0). Mantener atribución a IBM y registrar revisión exacta al descargar.

## Qué significa calidad aquí

1. Cubrir trámites de identidad, transporte, pagos y tasas, certificados, turnos, educación, vivienda, habilitaciones y solicitudes. Separar iniciar, renovar, duplicar, modificar, cancelar y consultar estado. Son objetivos de cobertura, no capacidades ya demostradas.
2. Curar contenido completo y crear preguntas naturales con vocabulario argentino e inglés; no entrenar solo con variaciones del título ni reemplazar revisión por miles de paráfrasis automáticas.
3. Conservar jurisdicción explícita. El idioma no determina el país. Una pregunta en inglés puede buscar un trámite argentino. Si falta contexto, el producto necesita aclaración; el embedding solo no la formula.
4. Incluir condiciones difíciles: primera solicitud frente a renovación, pago frente a certificado, requisitos frente a turno, consulta ambigua y trámite ausente. Las respuestas sin coincidencia y las aclaraciones deben probarse en la aplicación, no simularse como enlaces correctos.
5. Separar por familias de trámites y páginas ANTES de generar variantes. Todas las traducciones/paráfrasis de una familia permanecen juntas. Reservar municipios/sitios nuevos para generalización; una división aleatoria por frase infla el resultado.
6. Evaluar en español, inglés, español→inglés e inglés→español por separado. Comparar con búsqueda actual y Granite original usando idéntico corpus, jurisdicción y preguntas. Reportar acierto del primer destino, presencia en los tres primeros, errores de jurisdicción y comportamiento cuando no hay respuesta; no confundir similitud con probabilidad.
7. Medir latencia, memoria y CPU en VPS aislado antes de conectar usuarios. Cuantizar o entrenar más no autoriza a omitir otra evaluación.

## Próximas etapas concretas

- Ejecutar `entrenar.py` en la GPU: medir Granite original, ajustar hasta tres pasadas, elegir con validación y contrastar en el examen reservado.
- Revisar los errores y crear un examen independiente con consultas de ciudadanos; ampliar datos según los fallos, no según una cantidad arbitraria.
- Medir generalización en Rosario/VGG, casos ambiguos y sin respuesta. Este corpus internacional enseña relaciones lingüísticas; no reemplaza el catálogo del municipio del usuario.
- Exportar solamente una candidata que supere el original y probar latencia/memoria en un entorno aislado antes de integrar la extensión.

## Infraestructura y Bob

24 GB de VRAM es una hipótesis razonable para textos cortos, a confirmar con una corrida pequeña. 48 GB permite más margen; no implica el doble de velocidad. No se alquiló ninguna GPU. El disco local tenía aproximadamente 500 MB libres al comenzar; no descargar pesos, entornos de ML ni grandes corpus allí.

Bob mantiene su rol de organizar catálogos y ayudar en desarrollo/pruebas. Este módulo propone reducir llamadas de búsqueda en tiempo de uso; no elimina por sí solo las llamadas actuales del chat. La evidencia de Bob IDE del concurso sigue siendo necesaria y no se reemplaza por entrenar Granite.

No se promete exactitud universal ni cobertura del 100 %. La ficha oficial vigente sigue siendo la referencia para requisitos, costos y elegibilidad; no se memorizan como verdad permanente en los pesos.
