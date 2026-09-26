#!/bin/bash
# Publica Wayfinder con el paquete que manda GitHub Actions por stdin.
# Lo ejecuta SOLO la llave de wfdeploy (authorized_keys con command= forzado).
# Alcance: /opt/wayfinder y reiniciar wayfinder. No toca nada más del VPS.
# Uso: wayfinder-publicar [publicar|probar]   ("probar" arma y testea sin activar)
set -euo pipefail
umask 022
export PATH=/opt/wayfinder/node24/bin:/usr/sbin:/usr/bin:/sbin:/bin
LOG=/var/log/wayfinder-publicar.log
exec > >(tee -a "$LOG") 2>&1
MODO="${1:-publicar}"
[[ "$MODO" == "publicar" || "$MODO" == "probar" ]] || { echo "Modo no permitido: usá publicar o probar."; exit 2; }

exec 9>/run/wayfinder-publicar.lock
flock -n 9 || { echo "Ya hay una publicación en curso."; exit 1; }

TS=$(date -u +%Y%m%dT%H%M%SZ)
echo "== $TS modo=$MODO"
WORK=$(mktemp -d /tmp/wfpub.XXXXXX)
NEW=/opt/wayfinder/releases/gh-$TS
trap 'rm -rf "$WORK"' EXIT

# El paquete: como máximo 40 MB y solo ./motor/... y ./public/...
head -c 41943041 > "$WORK/paquete.tgz"
[[ $(stat -c %s "$WORK/paquete.tgz") -le 41943040 ]] || { echo "Paquete demasiado grande."; exit 1; }
if tar -tzf "$WORK/paquete.tgz" | grep -vE '^\./$|^\./(motor|public)(/|$)' | grep -q .; then echo "El paquete trae rutas no permitidas."; exit 1; fi
if tar -tzf "$WORK/paquete.tgz" | grep -qE '(^/|(^|/)\.\.(/|$))'; then echo "El paquete trae rutas peligrosas."; exit 1; fi
if tar -tvzf "$WORK/paquete.tgz" | grep -qE '^[lhbcp]'; then echo "El paquete trae enlaces o archivos especiales."; exit 1; fi
mkdir "$WORK/x"
tar -xzf "$WORK/paquete.tgz" -C "$WORK/x" --no-same-owner --no-same-permissions
[[ -d "$WORK/x/motor/src" && -f "$WORK/x/motor/package-lock.json" ]] || { echo "Falta motor/src o motor/package-lock.json."; exit 1; }
if [[ -d "$WORK/x/public" ]]; then [[ -f "$WORK/x/public/index.html" ]] || { echo "La pantalla no trae index.html."; exit 1; }; fi

OLD=$(readlink -f /opt/wayfinder/current)
echo "Versión activa: $OLD"
cp -a "$OLD" "$NEW"
touch "$NEW/.publicado-por-github"
for f in src test package.json package-lock.json; do rm -rf "$NEW/motor/$f"; cp -r "$WORK/x/motor/$f" "$NEW/motor/$f"; done
if ! cmp -s <(tr -d '\r' < "$OLD/motor/package-lock.json") <(tr -d '\r' < "$NEW/motor/package-lock.json"); then
  echo "Cambiaron las dependencias: instalando."
  rm -rf "$NEW/motor/node_modules"
  (cd "$NEW/motor" && npm ci --omit=dev --ignore-scripts --no-audit --no-fund)
fi
if [[ -d "$WORK/x/public" ]]; then echo "Se publica también la pantalla."; rm -rf "$NEW/public"; cp -r "$WORK/x/public" "$NEW/public"; fi
chown -R root:wayfinder "$NEW"
chmod -R u=rwX,g=rX,o=rX "$NEW"

echo "Corriendo pruebas..."
if ! (cd "$NEW/motor" && npm test > "$WORK/tests.txt" 2>&1); then tail -30 "$WORK/tests.txt"; echo "FALLARON LAS PRUEBAS: no se publica."; rm -rf "$NEW"; exit 1; fi
grep -E '^ℹ (tests|pass|fail)' "$WORK/tests.txt"

if [[ "$MODO" == "probar" ]]; then echo "PRUEBA OK: la versión se armó y pasó las pruebas. No se activó."; rm -rf "$NEW"; exit 0; fi

switch() { ln -sfn "$1" /opt/wayfinder/current.tmp && mv -Tf /opt/wayfinder/current.tmp /opt/wayfinder/current; systemctl restart wayfinder; }
switch "$NEW"
for i in $(seq 1 20); do curl -fsS -m 3 http://127.0.0.1:3117/api/salud >/dev/null 2>&1 && break; sleep 1; done
if ! curl -fsS -m 3 http://127.0.0.1:3117/api/salud; then
  echo; echo "LA PÁGINA NO ARRANCÓ: vuelvo a la versión anterior."
  switch "$OLD"; exit 1
fi
echo; echo "PUBLICADO: $NEW (anterior: $OLD)"
# Guarda las últimas 5 versiones publicadas desde GitHub; las demás no se tocan.
ls -1dt /opt/wayfinder/releases/gh-* 2>/dev/null | tail -n +6 | while read -r d; do [[ "$d" != "$(readlink -f /opt/wayfinder/current)" && "$d" != "$OLD" ]] && rm -rf "$d"; done
