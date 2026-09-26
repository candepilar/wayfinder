/** @type {import('next').NextConfig} */

/**
 * El visor siempre le habla a `/api/motor/...`, una direccion relativa. Quien la
 * redirige cambia segun donde corra, y por eso el codigo del navegador es el mismo
 * en los dos casos:
 *
 * - En desarrollo la redirige Next, con el `rewrite` de abajo. Como la hace el
 *   servidor de Next y no el navegador, no hay CORS de por medio.
 * - Publicado, la redirige Nginx en el VPS: `/wayfinder/api/motor/` va al motor.
 *
 * `WAYFINDER_MOTOR` elige a que motor le habla el desarrollo. Sin la variable es
 * el motor local, que es lo que espera Franco. Para trabajar contra el motor del
 * VPS, que si tiene la clave de Bob:
 *
 *   WAYFINDER_MOTOR=https://andromedaweb.store/wayfinder/api/motor npm run dev
 */
const motor = process.env.WAYFINDER_MOTOR || 'http://127.0.0.1:3101/api';

// La exportacion estatica es para publicar: no hay servidor Next en produccion.
const exportarEstatico = process.env.WAYFINDER_STATIC_EXPORT === '1';

const nextConfig = {
  outputFileTracingRoot: process.cwd(),
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  ...(exportarEstatico
    ? { output: 'export', trailingSlash: true }
    : {
        async rewrites() {
          return [{ source: '/api/motor/:path*', destination: `${motor}/:path*` }];
        },
      }),
};

export default nextConfig;
