# Wayfinder para el navegador · 0.3.0

Panel lateral para Chrome, Brave y Edge 116+. Mantiene las guías de Rosario/VGG,
y permite trabajar con otras páginas públicas sin una lista fija de municipios.

1. Abrí el sitio y tocá el ícono de Wayfinder en esa pestaña.
2. **Buscar accesos de esta página** lee los nombres/enlaces visibles del DOM ya
   renderizado, incluidos los generados con JavaScript. Podés buscar por texto,
   marcar un enlace y abrirlo. Esto no confirma requisitos ni completa gestiones.
3. **Consultar catálogo con Bob** envía la dirección mostrada (sin query/hash)
   al motor. Recupera un catálogo disponible o inicia un recorrido público con
   progreso, cancelación y recuperación al reabrir el panel. El botón de volver
   a recorrer permite actualizar un catálogo guardado.
4. Las fichas conservan condiciones completas y fuente; no se inventan destinos.
   Las condiciones tomadas de otra ficha municipal se rotulan como referencias
   que requieren confirmar si aplican. El resaltado se confirma solo si ocurrió.

## Alcance y datos

`activeTab` da acceso temporal al tocar el ícono. Al cambiar a otro dominio,
volvé a tocarlo. No se solicitan permisos generales sobre todas las webs.
Se mantienen permisos municipales existentes y se agrega el dominio de la API.
No funciona en páginas internas del navegador, frames ajenos, Shadow DOM cerrado
ni con controles sin enlace HTML. Para un menú oculto, abrilo y volvé a buscar.

Los enlaces/textos de la página abierta se procesan localmente, sin enviarse a
Bob ni persistirse. Se excluyen formularios, enlaces ocultos y varios parámetros
de sesión/acciones. No se leen valores de formularios, cookies ni contraseñas;
no se envían solicitudes del usuario. Una etiqueta visible puede contener datos
personales: se conserva solo en memoria del panel, no se promete clasificar toda PII.

El catálogo público se guarda en almacenamiento local (hasta ocho sitios).
El motor no recibe la sesión del navegador, respeta robots y límites de red/cola.
Su lectura HTML no ejecuta JavaScript: Coto es un ejemplo de catálogo sin evidencia
suficiente, aunque la extensión sí puede encontrar accesos de su página renderizada.
Una ficha puede estar desactualizada o incompleta. Abrir un destino no prueba que
la gestión terminó. No se promete compatibilidad con cualquier web.

La API es pública y tiene límites de frecuencia/capacidad; el Origin de una extensión
no es autenticación. Solo se permiten desde extensiones las rutas públicas de
catálogo y recorridos, nunca las de revisión de código. No hay secretos en el paquete.

## Instalación / actualización de prueba

Descomprimí el ZIP, abrí `chrome://extensions` (o `brave://extensions` /
`edge://extensions`), activá Modo desarrollador y elegí Cargar descomprimida.
Seleccioná la carpeta que contiene `manifest.json` y fijá el ícono.
Si actualizaste la misma carpeta, tocá **Recargar** en la tarjeta de Wayfinder;
el navegador puede pedir habilitar los nuevos permisos. Conservá la carpeta.
Todavía no está publicada en Chrome Web Store.

## Pruebas

```sh
node --test extension/test.mjs
cd motor && npm test
# Requiere Playwright instalado o PLAYWRIGHT_MODULE apuntando al módulo:
node extension/browser-test.cjs
# LIVE=1 agrega prueba anónima contra Coto; PLAYWRIGHT_CHANNEL=msedge es opcional.
```

La prueba de navegador usa DOM real con un puente controlado de las APIs Chrome;
no certifica permisos ni instalación nativa. La prueba pública no usa una sesión
del usuario ni envía formularios. El panel estático permite previsualización con
`panel.html?url=https://example.org/`, pero la lectura de otra pestaña requiere extensión.

Las rutas municipales siguen generándose con `node extension/generar-rutas.mjs`.
No se alteró el catálogo municipal empaquetado ni los módulos reservados de Cande.
