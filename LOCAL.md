# Correr todo en tu compu

Guía para Cande (o su Claude). Verificada el 26/09/2026 con una copia limpia del
repo: `npm ci` + 16/16 tests del motor y `next build` del visor sin errores.

## 0. Lo que necesitás

- **Node 24** (Bob Shell pide 22.15 como mínimo; nosotros probamos todo con 24).
- **Tu propia clave de Bob.** La de Franco no se comparte. Sacala desde tu cuenta
  del hackatón: [bob.ibm.com](https://bob.ibm.com) → API keys → *Create a new API key*
  → tipo **Inference**. Se muestra una sola vez: guardala.

## 1. Bajar lo último

```bash
git pull
```

## 2. La pantalla (visor) — no necesita Bob ni el motor

```bash
cd visor
npm ci
npm run dev
```

Abre en http://localhost:3000 (o 3001 si el 3000 está ocupado). Muestra el escaneo
real de Rosario que está commiteado en `demo/rosario/` (20 páginas y su revisión
de seguridad), sin conectarse a nada.

## 3. El motor (recorre sitios y le pide a Bob las revisiones)

**Instalar Bob Shell** (una vez):

```bash
# Mac / Linux
curl -fsSL https://bob.ibm.com/download/bobshell.sh | bash
# Windows (PowerShell)
powershell -c "irm -Uri https://bob.ibm.com/download/bobshell.ps1 | iex"
```

Se instala como paquete global de npm. La ruta que necesita el motor es:

```bash
echo "$(npm root -g)/bobshell/dist/bob.js"
```

**Configurar el motor:**

```bash
cd motor
npm ci
cp .env.example .env
```

En `motor/.env` completá (sin comillas y sin espacios después del `=`):

```
BOB_ENTRY=<la ruta que te dio el comando de arriba>
BOB_API_KEY=<tu clave Inference>
```

`.env` está en `.gitignore`: **nunca se sube**. Revisalo antes de cada commit igual.

**Aceptar la licencia de Bob** (una vez por compu; es aceptar los términos de IBM):

```bash
node "<la ruta de BOB_ENTRY>" run --accept-license "hola"
```

**Probar y prender:**

```bash
npm test          # 16/16
npm start         # http://127.0.0.1:3101
```

Comprobá que Bob quedó bien: http://127.0.0.1:3101/api/salud tiene que decir
`"disponible": true`.

## 4. Usarlo

Revisión de seguridad de un sitio (pasiva: solo lo que ve cualquier visitante):

```bash
curl -X POST http://127.0.0.1:3101/api/recorridos -H "Content-Type: application/json" \
  -d '{"url":"https://www.rosario.gob.ar/inicio/","maxPaginas":20,"seguridad":true,"bob":true}'
```

Te devuelve un `id`. Seguís el avance en `/api/recorridos/<id>` y, al terminar,
el mapa completo (con `auditoria.seguridad`) está en `/api/mapas/<mapaId>`.
Cuesta unos centavos de dólar de tu saldo de Bob (Rosario, 20 páginas: ~USD 0,10
con resúmenes y seguridad).

Revisión de código con Bob (del Codex de Franco): ver `motor/integracion/CODIGO.md`.

Contrato de datos y API completos: `motor/README.md`.

## 5. Publicar lo que hiciste

No hace falta acceso al servidor: GitHub → *Actions* → *Publicar en el servidor*,
o `gh workflow run publicar.yml -f modo=probar`. Detalle en `motor/deploy/README.md`.
