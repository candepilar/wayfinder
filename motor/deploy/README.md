# Wayfinder en el VPS de Andrómeda

URL: https://andromedaweb.store/wayfinder/

Publicación del 25/09/2026, autorizada por Franco. La copia integrada se despliega
en una sección nueva; no se modifican los archivos originales de `visor/` que
Cande tiene reservados.

## Arquitectura desplegada

- Interfaz Next exportada a archivos estáticos con basePath `/wayfinder`.
- Release: `/opt/wayfinder/releases/20260925T054134Z`.
- Enlace activo: `/opt/wayfinder/current`.
- Público: `/var/www/andromeda/wayfinder` → `/opt/wayfinder/current/public`.
- Motor: `wayfinder.service`, usuario dedicado `wayfinder`, escucha en `127.0.0.1:3117`.
- Datos persistentes: `/var/lib/wayfinder/mapas`.
- Configuración: `/etc/wayfinder.env`; no incluye claves de Bob.
- Nginx: `/etc/nginx/snippets/wayfinder.conf`, incluido una vez en el bloque HTTPS
  de `/etc/nginx/sites-enabled/andromedaweb.store`.
- Respaldo previo: `/var/backups/wayfinder/20260925T054134Z/`.

El servidor usa Node 22.22.2. El navegador accede a la API por
`/wayfinder/api/motor/`; Nginx la deriva al motor. No se ejecuta un proceso Next
en producción. La interfaz no depende de la computadora de Franco.

Límites públicos: 40 páginas por recorrido, un recorrido concurrente, tres
inicios por IP cada diez minutos, diez minutos por trabajo y veinte mapas
persistidos. Al alcanzar la capacidad se rechazan nuevos sitios; no se borran
mapas automáticamente. La consulta es textual, con fragmentos y fuentes. Todos
los mapas de esta demo son visibles para sus visitantes; ingresar solo URLs públicas.

## Reproducir la interfaz

En una copia de trabajo del repositorio, aplicar el parche de integración desde
la raíz; no aplicarlo sobre el `visor/` reservado sin coordinación:

```powershell
git apply --ignore-whitespace motor/integracion/visor.patch
cd visor
npm ci
$env:WAYFINDER_STATIC_EXPORT='1'
$env:NEXT_PUBLIC_BASE_PATH='/wayfinder'
$env:NEXT_PUBLIC_MAX_PAGES='40'
npm run build
```

La carpeta `visor/out` es el directorio `public` del release. Empaquetar también
`motor/src`, `motor/test`, `motor/deploy`, package.json y package-lock.json.
Instalar dependencias Linux con `npm ci --omit=dev --ignore-scripts`, ejecutar
`npm test`, comprobar la API local y recién entonces promover la ruta pública.
No transferir node_modules de Windows, `.env` ni datos privados.

## Evidencia del despliegue

- Paquete SHA-256 local/remoto:
  `15a48fd19c8f84a73f3ca8fec9ad590da3d07b66abaec813f839887a6ebbe752`.
- Nueve pruebas pasaron en Node 22 del VPS, incluidos origen público permitido,
  rechazo de origen ajeno, límite de páginas, capacidad y exportación JSON.
- HTTP 200 externo para interfaz, assets y salud.
- Creación real desde la interfaz pública: `https://example.com/`, una página;
  consulta `documentation` devolvió texto y su enlace.
- Los dos mapas públicos previos de Argentina.gob.ar se conservaron como ejemplos
  de cobertura parcial; no se presentan como mapas completos.
- Los hashes del HTML principal y del panel no cambiaron. Los procesos del bot y
  de la API conservaron sus PIDs durante el despliegue.
- Servicio habilitado para iniciar con el VPS, sin reinicios automáticos observados.

IBM Bob no está instalado ni configurado en el VPS. El control queda deshabilitado
y la interfaz indica análisis pendiente. No se afirma uso de sus agentes.

## Operación y reversión

```bash
systemctl status wayfinder
journalctl -u wayfinder -n 50 --no-pager
curl http://127.0.0.1:3117/api/salud
```

Antes de revertir, respaldar la configuración actual. Quitar únicamente la línea
`include /etc/nginx/snippets/wayfinder.conf;` del bloque HTTPS, validar con
`nginx -t` y recargar Nginx. Detener/deshabilitar `wayfinder.service` y trasladar
el enlace simbólico `/var/www/andromeda/wayfinder` al respaldo. Conservar release
y datos. No restaurar ciegamente el vhost antiguo si hubo otros cambios posteriores.

El `nginx -t` previo ya informaba advertencias por vhosts de respaldo duplicados
y un MIME repetido; no forman parte de esta modificación y no se alteraron.
