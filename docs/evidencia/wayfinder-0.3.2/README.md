# URL explícita y recuperación de pestaña — 0.3.2

Integra sin modificar `fondo.js` de Cande (`87de876`, 0.3.1): el clic llama
`sidePanel.open`, en lugar de alternar/cerrar el panel. Agrega un campo URL
siempre visible y análisis independiente del permiso sobre la pestaña.

- [Prueba controlada](extension-032-browser.json): regresión del panel, cambio
  de pestaña sin URL expuesta, mensaje de permiso (no página interna), ventana
  correcta, URL inválida, Novogar/GOV.UK pegados, no solicitudes/navegación al
  tipear, progreso, recarga sin duplicar recorrido y recuperación al aviso del ícono.
- [Captura móvil controlada](extension-032-url.png): interfaz y campo URL. El
  contenido «Ayuda del sitio ingresado» de esa captura es un fixture de prueba.
- [Prueba nativa](extension-032-native-url.json): extensión real 0.3.2 en perfil
  aislado Edge headless, APIs Chrome reales sin puente; panel abierto como pestaña
  de extensión para probar el formulario (no clic en la barra nativa). Pegar
  Novogar inicia recorrido público y devuelve una ficha; GOV.UK consulta catálogo.
  No cambia la URL de la pestaña al escribir ni al analizar.
- [Captura Novogar real](extension-032-native-novogar.png) y
  [catálogo público consultado](novogar-catalogo.json): fuente, cobertura y task
  de Bob. Recorrido `83fa3d1d-10d4-449a-ab17-2bcb8ea66dd8`, mapa
  `10797c850b575d0cba6e`, ficha «Políticas de devoluciones y reembolsos».
- [GOV.UK nativo por teclado](extension-032-native-govuk.json) y
  [captura](extension-032-native-govuk.png): Enter recupera la guía real
  «Renew your driving licence» desde la API, sin nuevo POST/recorrido ni navegación;
  ancho móvil sin desborde. Perfil aislado, no navegador personal.

## Entrega publicada

[Actions 36298754598](https://github.com/candepilar/bob/actions/runs/36298754598)
exitoso; release integrado `e98b5b3` incluye la corrección de ícono y el catálogo
paralelo de Cande sin modificar esos módulos. 53 pruebas motor + 12 extensión y
build CI OK. [ZIP/carpeta verificados](publicacion.json): 43888 bytes, 17 archivos
coincidentes con repo y copia de escritorio, manifest 0.3.2. Se mantuvo la ruta
registrada `Desktop/Wayfinder-Chrome-0.2.0`; backup anterior
`outputs/Wayfinder-backup-0.3.0-before-0.3.2`. Falta Recargar y comprobar en Brave.

Novogar se analizó antes de desplegar el scheduler paralelo: sus tiempos/task no
miden la mejora de concurrencia. La comparación real solicitada por Cande sigue
pendiente, igual que evidencia Bob IDE. La salud pública posterior al despliegue
fue OK, Bob disponible, sin trabajos activos.

12 pruebas de extensión pasan, incluyendo las de Cande; el test de apertura
es controlado. No se certifica el clic en la barra de Brave del usuario ni cobertura
completa de Novogar. No se completaron compras/formularios. La evidencia corresponde
a esta ejecución y se conserva junto con los [límites anteriores](../wayfinder-0.3.0/README.md).

Probar: recargar Wayfinder en `brave://extensions`, comprobar **0.3.2**, pegar
`novogar.com.ar` en **Dirección del sitio** y tocar **Analizar URL**. Para trabajar
con enlaces de la pestaña, abrir el sitio y tocar el ícono; **Usar pestaña actual**
abandona la selección manual. [Instrucciones y datos](../../../extension/README.md).
