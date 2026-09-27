# Qué corregir antes de volver a alquilar GPU

27/09/2026 — Astra, de Franco. Auditoría offline de respaldos; sin inferencia,
entrenamiento, llamadas a Bob/OpenAI ni cambios en producción.

## Resultado comprobado

La candidata acertó 127/200 primeras opciones frente a 116/200 del original.
Corrigió 21 respuestas, empeoró 10 y mantuvo 63 errores y 106 aciertos. No pasó
el control final por idioma. Las preguntas y etiquetas son sintéticas; el 63,5%
no describe la precisión esperable de ciudadanos reales ni todos los trámites.

El corpus contiene 3.750 fichas: 3.512 de Uruguay y 238 británicas. Entrenamiento:
3.565 preguntas sobre 453 fichas; validación: 343 sobre 43; examen: 200 sobre 25.
El examen solo incluye las categorías heurísticas `civil` e `identity` y cada
dirección hacia inglés tiene 12 preguntas. La validación solo incluye vivienda
y ambiente. Es una prueba de temas separados, no una muestra representativa de
todas las gestiones. Negocios concentra 1.249/3.565 consultas de entrenamiento.

No se encontraron consultas idénticas normalizadas repetidas ni cruzadas entre
particiones. Sí hay 14 grupos de títulos repetidos y 79 grupos de descripciones
largas idénticas. Eso requiere revisar rutas y subcasos; NO autoriza a borrar
fichas distintas ni a aceptar todas como equivalentes.

## Revisión de las diez regresiones

Comparación de las consultas y las descripciones oficiales guardadas, sin
verificación web actual. Son diagnósticos de recuperación, no asesoramiento
sobre requisitos legales vigentes. Se conservan las etiquetas históricas.

| Consulta / ID abreviado | Confusión observada | Corrección que debe evaluarse |
|---|---|---|
| Defunción en Maldonado, `0edc4f` | Eligió inscripción tardía sin que la consulta indique demora | Pedir el dato faltante; no inferir que está fuera de plazo |
| Partida digital de nacimiento, `cc6226` | Eligió Salto sin municipio especificado | Separar ámbito nacional/local; admitir aclaración cuando corresponde |
| Birth certificate online, `914d09` | Confundió partida con constancia de nacido vivo | Revisar diferencias de documento, no solo palabras comunes |
| Partida nacimiento Paysandú, `560a1f` | Inscribir un nacimiento en lugar de pedir la partida | Usar ejemplos contrastivos de intención |
| Partida defunción Paysandú, `661cd6` | Inscribir defunción en lugar de pedir la partida | Mismo contraste, conservando municipio |
| Marriage certificate Paysandú, `93eebb` | Inscribir matrimonio en lugar de pedir certificado | Contraste bilingüe de solicitud/registro |
| Pasaporte británico desde exterior, `b31faa` | Devolvió ruta genérica de pasaporte | Preservar residencia en el exterior como dato discriminante |
| Ciudadano natural, `acb9f1` | Variante de nacionalidad equivocada; descripciones idénticas | Conservar la variante del título y estructura de la fuente |
| Cédula diplomática, `b8a6e7` | Devolvió desbloqueo de firma/PIN | Dar prioridad a objeto e intención; pago no significa certificado digital |
| Nacional uruguayo, `2c845e` | Eligió ficha general; consulta no distingue inequívocamente el subcaso legal etiquetado | Revisar si necesita aclaración o varias rutas aceptables; no relabel automático |

Las 94 consultas donde hubo cambio o persistió un fallo están en
`ERRORES-PILOTO.jsonl`, con enlaces, respuesta esperada y predicción. Algunas
consultas omiten ciudadanía/municipio presentes solo en la ficha de origen:
una etiqueta única puede penalizar una alternativa razonable. Hay que adjudicar
esos casos antes de usarlos como negativos de entrenamiento.

## Cambios preparados

- Auditor reproducible de datos y resultados, solo con Python estándar.
- Borrador de 72 casos nuevos: 36 ES y 36 EN. 48 de recuperación, 16 de
  aclaración y 8 fuera de alcance. Los 48 tienen 12 casos por dirección de
  idioma y abarcan 13 categorías; no se limita a licencias.
- 24 fichas sin consultas etiquetadas en ninguna partición del piloto.
  Ya estaban en el corpus de candidatos: esto no prueba sitios nuevos.
- Reserva de esas fichas: `entrenar.py` y `empaquetar.py` rechazan incluirlas
  en entrenamiento o validación. El manifiesto debe viajar con el código.
- Evaluador de predicciones guardadas con múltiples respuestas aceptables,
  detección de rutas inventadas/de otro país y cobertura completa de casos.
  Se niega a producir evaluación revisada si faltan aprobaciones humanas.
- Guion Bob IDE actualizado para auditar estos cambios y registrar evidencia
  real de su uso. Preparar el guion no equivale a ejecutarlo.

## Siguiente ejecución: todavía no alquilar

1. Revisar el borrador `evaluacion-v2/REVISION.md`: validar intención, idioma,
   rutas alternativas y preguntas de aclaración. Está escrito por una IA y
   explícitamente pendiente de revisión humana. No es un examen independiente
   de ciudadanos; los 72 casos son 36 escenarios bilingües correlacionados.
2. Agregar preguntas recogidas de personas sin mostrarles el título de la
   respuesta. Para Rosario/VGG hace falta un conjunto local: el piloto actual
   no mide Argentina. Separar por escenario y trámite los casos para desarrollo
   y los del examen final antes de experimentar. Nunca entrenar con el examen.
3. Revisar contexto de municipio, intención y variantes antes de cambiar
   parámetros. Probar una representación de ficha con información discriminante
   y negativos cercanos SOLO de entrenamiento; no reutilizar errores del examen
   como nuevos ejemplos de entrenamiento. No mezclar toda la página sin medir
   ruido y truncamiento.
4. Una vez fijados datos y criterio, comparar original y candidata guardada
   sobre validación de desarrollo. Recién entonces decidir si hace falta otra
   época. Registrar recuperación por idioma, desvíos de municipio, abstenciones,
   tiempo y memoria. El encoder solo ordena fichas: las aclaraciones/rechazos
   requieren una política del producto y no salen solos del entrenamiento.

No se cambió el modelo, no se ejecutó la evaluación nueva, no se seleccionó un
umbral de rechazo ni se desplegó nada. El próximo alquiler debe tener una prueba
concreta, un límite de tiempo y datos preparados, no una búsqueda abierta.

## Reproducir

`python entrenamiento/auditar_piloto.py` lee los dos respaldos locales y escribe
la auditoría. No requiere pesos cargados ni GPU.

`python -m unittest discover -s entrenamiento -p 'test_*.py'` verifica contratos
de datos, exclusión de fichas reservadas y puntuación segura. Esas pruebas de
código no son una medición de calidad del modelo.
