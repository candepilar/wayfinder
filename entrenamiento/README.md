# Wayfinder: búsqueda bilingüe de trámites

Estado: preparación de fuentes y ejemplos. No hay un modelo entrenado, descargado ni conectado a producción.

Franco y Cande autorizan avanzar y priorizar calidad. El entrenamiento principal se centra en trámites; quedan fuera Wikipedia y FAQ comerciales generales. Granite embedding relaciona una consulta con una ficha: no genera respuestas ni realiza la gestión.

## Archivos y reproducción

Con Python 3, sin instalar paquetes ni alquilar una GPU:

```powershell
python entrenamiento/preparar.py
python entrenamiento/revisar.py
```

`preparar.py` reúne las 51 fichas municipales ya presentes en el proyecto y descarga el índice oficial GOV.UK filtrado por transaction. Conserva fuente, fecha, jurisdicción y hash. La descarga del índice no equivale a descargar el contenido íntegro de cada trámite. La cantidad puede cambiar en nuevas ejecuciones.

`semillas.json` contiene diez pares de preguntas español/inglés: 20 consultas de desarrollo, con destino correcto y uno que no corresponde. `EJEMPLOS.md` permite revisarlas con enlaces. `revisar.py` verifica referencias, jurisdicciones, duplicados y caracteres corruptos; no certifica calidad semántica.

`datos/` no se sube a Git: contiene corpus candidato, respuesta original de la API, ejemplos y conteos. `INFORME.json` registra el resultado estructural compartible. Ningún registro se habilita para entrenar automáticamente.

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

El corpus inicial es una selección candidata, no una base completa ni 290 ejemplos revisados. Los 20 ejemplos abren la revisión del formato; no bastan para entrenar el producto.

- Completar fichas y cobertura española de más organismos con reutilización permitida; balancear familias de trámites y ambos idiomas.
- Revisar fuente y emparejamiento de cada ejemplo aceptado; registrar correcciones y quién revisó. Construir un examen independiente del desarrollo, con búsquedas reales voluntarias sin información personal.
- Comenzar con 2.000 ejemplos específicos revisados y ampliar según fallos y cobertura. La cantidad es un punto de comparación, no un techo ni garantía; comparar curvas de 500/1.000/2.000 y siguientes lotes.
- Preparar entrenamiento reproducible (versiones, semilla, parámetros, hashes y evaluación) y ejecutarlo con 1–3 pasadas iniciales; seleccionar por validación, nunca por el examen final.
- Exportar la mejor versión solamente si mejora sin una regresión material en alguno de los idiomas. Conservar original y mecanismo de retorno.

## Infraestructura y Bob

24 GB de VRAM es una hipótesis razonable para textos cortos, a confirmar con una corrida pequeña. 48 GB permite más margen; no implica el doble de velocidad. No se alquiló ninguna GPU. El disco local tenía aproximadamente 500 MB libres al comenzar; no descargar pesos, entornos de ML ni grandes corpus allí.

Bob mantiene su rol de organizar catálogos y ayudar en desarrollo/pruebas. Este módulo propone reducir llamadas de búsqueda en tiempo de uso; no elimina por sí solo las llamadas actuales del chat. La evidencia de Bob IDE del concurso sigue siendo necesaria y no se reemplaza por entrenar Granite.

No se promete exactitud universal ni cobertura del 100 %. La ficha oficial vigente sigue siendo la referencia para requisitos, costos y elegibilidad; no se memorizan como verdad permanente en los pesos.
