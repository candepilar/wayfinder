# Ejecutar el experimento en la GPU

Este documento describe el siguiente paso; no afirma que ya se haya ejecutado. Los scripts no crean Pods ni compran servicios.

## Máquina

Una GPU NVIDIA con 24 GB o más, imagen PyTorch/CUDA compatible, unos 30 GB de disco. Si se elige 48 GB, comparar el modelo concreto y no asumir doble velocidad. Guardar archivos persistentes en `/workspace` y copiar el resultado fuera de RunPod antes de terminar/eliminar la máquina; el almacenamiento puede seguir facturándose al detener un Pod.

## Preparación

Subir el paquete de datos y esta carpeta, sin `.env`, claves de Bob ni credenciales. El entrenamiento no llama a Bob/OpenAI: las consultas ya están preparadas. Mantener las notas de origen/licencia del corpus.

Desde esta carpeta, en la máquina GPU:

```bash
python -m pip install --no-cache-dir -r requirements-gpu.txt
python entrenar.py --data datos/paquete --check-data
python entrenar.py --data datos/paquete --output modelos/experimento-01
```

La primera orden requiere red e instala dependencias. No ejecutarla en el VPS de producción ni en la PC con poco disco. El modelo se descarga automáticamente desde una revisión fija de IBM. Registrar `pip freeze`, nombre de la GPU, memoria pico y tiempos del experimento junto al resultado.

## Lo que hace el programa

1. Comprueba hashes, referencias y separación de familias de trámites.
2. Carga Granite original y mide búsqueda en validación y examen. Ambos usan las mismas fichas y filtro de jurisdicción que la versión entrenada.
3. Ajusta el modelo con consultas ES/EN y su ficha correcta. Cada lote evita repetir una misma ficha como falso negativo. Aun así, trámites distintos pueden compartir relevancia: es una limitación de las etiquetas, no un problema resuelto por este muestreo.
4. Prueba hasta tres pasadas y elige por validación, sin seleccionar con el examen. Se permite como máximo una caída de 2 puntos porcentuales por dirección lingüística frente al original, y se exige mejorar la media de validación. Este criterio de ingeniería no prueba significación estadística.
5. Si ninguna versión mejora, informa `selected_epoch: 0`. No fuerza un resultado positivo ni publica nada.
6. Si hay una candidata, libera las asignaciones del entrenamiento y la evalúa en el examen reservado. Guarda `RESULTADO.json` y `best/`.

## Alcance y puertas pendientes

Las entradas del buscador son título y descripción oficiales (máximo 512 tokens, con conteo de documentos truncados). Los cuerpos completos están en el corpus como respaldo y se usaron para revisar consultas. Este entrenamiento enseña a elegir una ficha; no enseña a producir requisitos o costos ni a completar formularios.

La evaluación usa preguntas sintéticas revisadas en otra llamada a Bob, no un examen humano independiente. Las familias de identidad/registro civil quedan como test; vivienda/ambiente como validación. Los mismos sitios están presentes en entrenamiento y evaluación: falta medir generalización a un municipio nuevo, en especial Rosario/VGG.

El código de GPU tiene verificación de sintaxis y datos, pero su ejecución real/integración con las dependencias sigue pendiente hasta contar con la máquina. No hay precisión ni duración GPU medidas todavía. Antes de producción: revisión de errores, consultas de ciudadanos, casos sin respuesta, comparación con la búsqueda actual de la extensión y benchmark de CPU/memoria en un entorno aislado del VPS.
