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

~~IBM Bob no está instalado ni configurado en el VPS.~~ Actualizado abajo.

## IBM Bob en el VPS (26/09/2026, autorizado por Franco)

- Node 24.13.0 aparte en `/opt/wayfinder/node24` (verificado con SHASUMS256 de
  nodejs.org). El Node 22 del sistema no se tocó: el resto del VPS lo sigue usando.
- Bob Shell 2.0.5 en `/opt/wayfinder/bob-runtime` desde `/opt/wayfinder/bobshell.tgz`
  (el mismo paquete que en la PC de Franco, sha256 `eff232eb…f566`).
- `/etc/wayfinder.env` (root, 600) suma `BOB_ENTRY`, `BOB_MAX_COST=0.20`,
  `HOME=/var/lib/wayfinder/bobhome` y `BOB_API_KEY` (clave Inference de Franco;
  nunca en Git). Licencia aceptada una vez como usuario `wayfinder`.
- Drop-in `/etc/systemd/system/wayfinder.service.d/bob.conf`: arranca el motor con
  Node 24 y sube el tope a `MemoryMax=700M` / `MemoryHigh=600M`. Bob solo usa
  ~320 MB por análisis y corre de a uno; el pico medido del servicio fue 330 MB.
- Respaldo previo: `/var/backups/wayfinder/bob-20260926T060338Z/`.
- Prueba pública: recorrido con `bob:true` sobre info.cern.ch → 3/3 páginas con
  `origen: bob`, USD 0,008. 9/9 pruebas en Node 24. PIDs del bot y la API sin cambios.

Cada análisis con Bob se cobra al saldo de Franco. Para quitar Bob sin tocar
nada más: borrar el drop-in y las líneas `BOB_*`/`HOME` del env, `daemon-reload`
y `restart wayfinder`.

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

## Publicar desde GitHub, sin acceso al servidor (26/09/2026)

Pedido de Franco: que Cande (o su Claude) pueda publicar sin tener acceso al VPS.

**Cómo se usa:** GitHub → pestaña *Actions* → *Publicar en el servidor* → *Run workflow*.
Desde Claude: `gh workflow run publicar.yml -f modo=publicar -f pantalla=true`.
- `publicar` (por defecto): arma, prueba y **cambia la página**. Si no arranca, vuelve sola a la anterior.
- `probar`: arma y prueba **sin cambiar la página** (26/09: Cande perdió dos horas porque el modo por defecto era este; ahora el resumen de la corrida lo dice en grande).
- `pantalla: true` además arma `public/extension/wayfinder-extension.zip` desde `extension/`, para que no se rompa "Añadir al navegador".
- `pantalla: true`: publica también `visor/out`. Requiere que `visor/next.config.mjs`
  exporte estático con basePath `/wayfinder`; si no, falla antes de tocar el servidor.
  Sin esa opción se conserva la pantalla publicada tal cual (incluida la descarga
  de la extensión en `public/extension/`).

**Qué puede hacer la llave:** nada más que esto. Cómo está armado:
- Usuario `wfdeploy` sin contraseña. En su `authorized_keys` la llave tiene
  `restrict,command="sudo -n /usr/local/sbin/wayfinder-publicar <modo>"`: no abre
  consola, no reenvía puertos y siempre corre ese único programa.
- `/etc/sudoers.d/wfdeploy` permite solo `wayfinder-publicar publicar` y `… probar`.
- La llave privada vive **solo** en el secreto `WF_DEPLOY_KEY` de GitHub (también
  `WF_KNOWN_HOSTS` con la huella verificada del VPS y `WF_HOST`). No está en ninguna PC.
- `wayfinder-publicar` (copia en `motor/deploy/wayfinder-publicar.sh`) recibe el
  paquete por stdin, acepta solo `./motor/…` y `./public/…` (sin rutas absolutas,
  `..` ni enlaces, máx. 40 MB), copia la versión activa, reemplaza `motor/src`,
  `test`, `package.json` y `package-lock.json` (reinstala dependencias solo si
  cambió el lock), corre `npm test` con Node 24 y recién ahí cambia el enlace
  `current` y reinicia **solo** `wayfinder`. No toca `/etc/wayfinder.env` (la clave
  de Bob sigue ahí), ni nginx, ni el bot, ni la API de Andrómeda.
- Una publicación por vez (lock). Registro en `/var/log/wayfinder-publicar.log`.
  Se conservan las últimas 5 versiones `releases/gh-*`; las otras no se borran.

**Para sacar el acceso:** borrar `/var/lib/wfdeploy/.ssh/authorized_keys` en el VPS
(o el secreto en GitHub). Para cambiar la llave: generar otra, poner la pública en
ese archivo con el mismo prefijo `restrict,command=…` y la privada en el secreto.
