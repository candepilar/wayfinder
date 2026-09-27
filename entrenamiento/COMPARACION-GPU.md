# Próxima sesión GPU: comparar antes de volver a entrenar

Paquete preparado y comprobado localmente, inferencia pendiente. No se necesita
Bob/OpenAI para ejecutar esta comparación. El script carga original y candidata
secuencialmente, no mantiene ambos modelos simultáneamente.

Archivos a transferir una vez disponible SSH:

- `datos/comparacion-v2.zip` (unos 2 MB), hashes en COMPARACION-PREPARADA.json.
- `datos/piloto-suave.tar.gz` (246.578.946 bytes), respaldo de la candidata.

Usar una carpeta nueva, sin sobrescribir resultados anteriores. En una plantilla
PyTorch con CUDA y entorno aislado, instalar requirements-gpu.txt. Extraer la
candidata dentro de la carpeta de esta sesión y verificar el SHA256 del archivo
contra el respaldo antes de extraer. El programa también verifica los pesos.

```bash
python comparar_encoder.py --data . --check-data
timeout 600 python comparar_encoder.py --data . --candidate modelo-lr5e6/best --output resultado-comparacion-v2
```

El límite de 600 segundos incluye carga/descarga del modelo original dentro del
programa e inferencia; no incluye preparación, instalación ni transferencias.
Timeout detiene el proceso, NO apaga el Pod ni cancela su facturación. Respaldar
resultados y detener el Pod después; no reintentar automáticamente.

Se puntúan 48 preguntas de recuperación (12 por dirección lingüística) contra
las mismas 3.750 fichas del piloto, con país conocido. Los otros 24 casos exigen
una política de conversación/rechazo: el encoder no los resuelve por sí mismo
y quedan explícitamente sin puntuar. Estas etiquetas son un borrador escrito
por IA, no validación humana: la corrida es diagnóstica, sin aprobación de
producción ni búsqueda de parámetros que hagan ganar sobre el examen.

No descarga Granite generativo 8B, no genera más datos, no modifica pesos ni
despliega. El pico medido del entrenamiento anterior fue 4,62 GiB; 24 GB de VRAM
dejan margen para esta comparación del encoder 97M con lote 16, sujeto a comprobar
el entorno real. No se necesita volver a alquilar 80 GB para esta prueba.

Próximo ajuste: debe formularse con entrenamiento/validación de desarrollo;
no convertir los errores del examen inspeccionado en ejemplos de entrenamiento.
