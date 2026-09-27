# Evaluación v2: borrador reservado, todavía sin puntuación

72 casos / 36 escenarios bilingües. Autor: asistente Astra. No son consultas
recolectadas de ciudadanos ni etiquetas humanas independientes. No usar para
entrenar, escoger hiperparámetros ni calibrar umbrales. Si se usa para desarrollo,
deja de ser examen final y hace falta otro conjunto independiente.

`casos.jsonl` contiene fuente y descripción guardada para los casos positivos.
`manifest.json` reserva 24 IDs y fija el hash original del borrador. La revisión
debe verificar si hay otras rutas válidas; `acceptable_document_ids` admite
múltiples IDs, pero no se amplía solo porque el modelo eligió otra ficha.
La jurisdicción se proporciona como contexto: no se mide aquí su extracción.

Para aprobar una fila, una persona revisa fuente y consulta, escribe su nombre
en `reviewer` y cambia `review_status` a `human_approved`. Registrar también
fecha y motivo si cambia etiqueta. Una revisión Bob/IA no cuenta como humana.
Después de cambios de revisión, conservar el borrador original en Git y
registrar un nuevo hash/versionado antes de puntuar. Los hashes de los archivos
realmente evaluados quedan en el resultado del evaluador.

Las aclaraciones requieren una pregunta útil sobre el dato faltante; el control
automático solo verifica presencia de texto y ausencia de derivación. Una persona
debe evaluar pertinencia, lenguaje y facilidad de uso. `not_found` significa que
no se puede ofrecer una ruta válida en el catálogo elegido, no que el trámite
no exista en el mundo.

Formato de predicciones JSONL (una por caso, ninguna omitida):

```json
{"id":"v2-p01-es","action":"retrieve","document_ids":["d1bcddb574cc3bb2c084"]}
{"id":"v2-c01-es","action":"clarify","document_ids":[],"question":"¿En qué país necesitás hacerlo?"}
```

No guardar esos ejemplos como resultados reales. Para puntuar predicciones
obtenidas realmente del producto o adaptador, sin cargar modelos:

```powershell
python entrenamiento/evaluar_casos.py --cases entrenamiento/evaluacion-v2/casos.jsonl --predictions predicciones.jsonl --corpus corpus.jsonl --output resultado-nuevo.json
```

El comando se bloquea mientras falten revisiones humanas. `--allow-draft` produce
solo un diagnóstico marcado como borrador. No hay aprobación automática para
producción ni descarga de modelos. No está construido todavía el adaptador de
inferencia/política que genere esas predicciones para el producto.
