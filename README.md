# MetrologiaPRO

Sistema de gestión metrológica: inventario de equipos e instrumentos, patrones de referencia con trazabilidad, verificaciones multipunto con regla de decisión ILAC-G8, calendario, etiquetas QR con visor público, reportes PDF y alertas por correo.

Stack: Next.js 16 (App Router) · React 19 · Prisma 5 · PostgreSQL.

## Puesta en marcha
```bash
cp .env.example .env   # complete DATABASE_URL, SESSION_SECRET, CRON_SECRET, SMTP_*
npm install
npx prisma migrate deploy
npm run dev
```

## Scripts
| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm test` | Pruebas del motor metrológico y de la autenticación |
| `npm run lint` | ESLint |

## Seguridad y roles
Todas las rutas `/api/*` pasan por `src/proxy.ts`:
- **Lector**: solo consulta.
- **Técnico**: consulta y registro de verificaciones y activos.
- **Admin**: además elimina registros, gestiona usuarios y ejecuta tareas programadas.

Las sesiones son tokens firmados (HMAC-SHA256) en cookie `HttpOnly`, y las contraseñas se guardan con `scrypt`.

## Regla de decisión metrológica
`src/lib/metrologia.ts` — E = lectura del instrumento − valor del patrón. Un punto es conforme si |E| + U ≤ EMP (aceptación con banda de guarda, ILAC-G8:09/2019). Sin incertidumbre declarada se aplica |E| ≤ EMP. El servidor recalcula siempre el dictamen y exige que el patrón tenga su certificado vigente.

Ver [AUDITORIA.md](AUDITORIA.md) para los hallazgos y la hoja de ruta.
