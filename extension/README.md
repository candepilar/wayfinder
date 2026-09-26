# Wayfinder para el navegador · 0.2.0

Extensión Manifest V3 para Chrome, Brave y Edge (116 o más nuevo). Al tocar su
ícono se abre un panel al costado que **te lleva paso a paso en un trámite** del
municipio, con la información oficial ordenada por el motor de Wayfinder:

- Sabe en qué trámite y en qué paso estás por la página que tenés abierta.
- En la página oficial marca el enlace del paso siguiente (y abre el desplegable
  si está escondido).
- Para cada forma de hacerlo, dice qué vas a necesitar, cruzando las fichas del
  mismo sitio y citando la fuente.
- No lee formularios, cookies ni datos de la persona, y no completa nada.

Sitios: Rosario (36 trámites) y Villa Gobernador Gálvez (15).

## De dónde salen los datos

`rutas.json` se genera desde el catálogo municipal del motor
(`motor/src/municipal-demo/`). Después de actualizar el catálogo:

```bash
node extension/generar-rutas.mjs
```

## Instalación de prueba

1. Descomprimí el ZIP en una carpeta que vayas a conservar.
2. Abrí chrome://extensions (Brave: brave://extensions; Edge: edge://extensions).
3. Activá Modo desarrollador y elegí Cargar descomprimida.
4. Seleccioná la carpeta que contiene manifest.json.
5. Fijá Wayfinder desde el menú de extensiones. Abrí www.rosario.gob.ar y tocá su ícono.

Todavía no está publicada en Chrome Web Store.

## Probar

```bash
node --test extension/test.mjs
```

El panel también se puede mirar sin instalarlo: serví la carpeta con cualquier
servidor estático y abrí `panel.html?url=https://www.rosario.gob.ar/inicio/pagar-tgi`.
