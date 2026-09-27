# Distinguir trámites parecidos

Estado: experimento GPU ejecutado y respaldado el 27/09/2026. Una época con
40 contrastes no mejoró la validación: 78,717% a 78,134% (270 a 268 aciertos
sobre 343). No se guardó una candidata nueva; se conserva la anterior.
Detalle: `../RESULTADO-CONTRASTES-V1.json`. No desplegado.
Autor y revisión de fuentes: Astra (IA). No son consultas ciudadanas ni validación
humana; no se verificó vigencia legal en línea. Son consultas para encontrar fichas,
no respuestas sobre requisitos, precios o plazos.

## Qué incluye

- 40 consultas: 20 ES y 20 EN, sobre 20 fichas que ya pertenecían a entrenamiento.
- 10 pares contrastivos: reservar/cambiar turno práctico; reservar/cancelar
  teórico; pagar/consultar impuesto vehicular; solicitar financiación/consultar
  cuenta; cuentas anuales/declaración societaria; impuesto actual/anterior;
  conversión SAS parcial/total; registro de envases inicial/anual; habilitación
  RUNAEV inicial/extensión; viabilidad urbanística/habilitación comercial.
- Para cada consulta: ficha preferida, ficha cercana menos apropiada, textos
  literales, enlaces, hash de fuentes y razón de distinción. La segunda ficha no
  es universalmente incorrecta: el contraste vale para la intención explícita.
- 20 ejemplos separados para la conversación: falta una distinción, por lo que
  se pregunta antes de derivar. NO se incorporan a la pérdida del encoder ni se
  convierten en etiquetas con una ficha elegida a ciegas. Tampoco se conectaron
  automáticamente al asistente en producción.
- Dos pares excluidos: las descripciones de habilitación/modificación pesquera
  no aclaraban bien la diferencia; pensionista/discapacidad pueden superponerse.
  El manifiesto conserva la exclusión y sus motivos.

No usamos partidas/nacimientos para generar estos ejemplos porque sus fichas
están reservadas en el examen anterior. Tampoco utilizamos las regresiones DVLA
de la evaluación v2 como entrenamiento. Los idiomas fuente no están equilibrados:
24 consultas apuntan a fichas británicas y 16 a uruguayas. No mide Argentina.

## Cómo se incorporan al siguiente experimento

`entrenar.py --contrasts contrastes-v1` valida hashes, fuentes y exclusión de
validación/examen/reserva antes de importar librerías GPU. Sin esa opción, sigue
el entrenamiento anterior sin cambios de objetivo.

Se mantiene el objetivo general con las 3.565 consultas originales y se agrega
un término pequeño que favorece la ficha correcta sobre su vecina. Por paso se
usan hasta cuatro contrastes; se recorren de forma cíclica, con orden reproducible.
La diferencia de similitud buscada es 0,1 y el peso adicional es 0,1. Son decisiones
del primer experimento, no parámetros optimizados ni una mejora demostrada.
No se tratan otras consultas del mismo lote de contrastes como negativas.

Propuesta fijada antes de medir: partir de la candidata guardada, una época,
lr 2e-6, validación solamente, máximo 600 segundos. Comparar por dirección contra
la candidata inicial y el original. Si no mejora el promedio o una dirección
retrocede más de 2 puntos respecto de cualquiera de las referencias, no promover.
No abrir de nuevo el examen para escoger parámetros. Hace falta además una
prueba de integración GPU de la nueva pérdida; los tests locales son de datos.

```bash
python entrenar.py --data datos/paquete --contrasts contrastes-v1 --check-data
timeout 600 python entrenar.py --data datos/paquete --contrasts contrastes-v1 --initial-model /workspace/comparacion/modelo-lr5e6/best --reference-validation /workspace/comparacion/modelo-lr5e6/baseline-validation.json --output modelos/contrastes-v1 --validation-only --epochs 1 --learning-rate 0.000002
```

Las rutas de candidata/referencia corresponden a la L4 de la sesión previa:
verificarlas y restaurar desde respaldo si se detuvo/eliminó ese Pod. No iniciar
una GPU ni el comando automáticamente. El timeout termina el proceso, no la
facturación del Pod. Respaldar antes de apagar. No promete ningún porcentaje.
