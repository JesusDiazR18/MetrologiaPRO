# Auditoría técnica — MetrologiaPRO (octubre 2026)

Alcance: código completo (Next.js 16 + Prisma/PostgreSQL), 25 k líneas. Se revisaron seguridad, exactitud metrológica, arquitectura, diseño y operación.

## 1. Hallazgos críticos (corregidos en esta entrega)

| # | Hallazgo | Riesgo | Corrección |
|---|----------|--------|------------|
| C1 | Ninguna ruta `/api/*` exigía sesión. Cualquiera en Internet podía leer, crear, modificar y eliminar equipos, patrones e historiales. | Pérdida o falsificación total de registros de calidad | `src/proxy.ts`: control de acceso central. Lector = solo lectura, Técnico = lectura + registro, Admin = todo (incluye eliminar y usuarios). |
| C2 | `POST /api/seed` era público y **borraba toda la base de datos**. | Destrucción de datos con una sola petición | `/api/seed` y `/api/test_db` deshabilitados en producción (salvo `ALLOW_SEED=true`) y solo para Admin. |
| C3 | La cookie de sesión era JSON en base64 sin firma: bastaba editarla para ser Admin. | Escalada de privilegios trivial | Token firmado con HMAC-SHA256 (`SESSION_SECRET`), cookie `HttpOnly` + `Secure`, expiración 12 h. |
| C4 | Contraseñas guardadas y comparadas en texto plano. | Filtración de credenciales | Hash `scrypt` con sal. Las contraseñas existentes se migran solas en el siguiente inicio de sesión (sin acción del usuario). |
| C5 | `/api/cron/*` público: cualquiera podía disparar correos masivos. | Spam / abuso del SMTP | Requiere `Authorization: Bearer CRON_SECRET` (lo envía Vercel Cron) o sesión Admin. |
| C6 | Sin límite de intentos de login; mensajes distintos para "usuario no existe" y "contraseña incorrecta". | Fuerza bruta y enumeración de usuarios | 8 intentos / 15 min por IP+usuario; mensaje genérico. |
| C7 | `/login?redirect=` aceptaba URLs externas. | Phishing (redirección abierta) | Solo rutas internas. |
| C8 | `/api/upload` aceptaba cualquier archivo y tamaño. | Almacenamiento de contenido malicioso, base de datos inflada | Lista blanca (PDF real verificado por cabecera `%PDF-`, PNG/JPG/WEBP/GIF), máx. 10 MB. |

## 2. Hallazgos metrológicos (corregidos)

| # | Hallazgo | Corrección |
|---|----------|------------|
| M1 | El dictamen APTO/NO APTO de un registro multipunto se calculaba en el navegador; el servidor solo recibía "el peor punto" y confiaba en él. Un cliente modificado podía ocultar el punto fuera de tolerancia. | El servidor recalcula **todos** los puntos (`evaluarPuntos`) y determina el peor punto y el dictamen. Probado: un envío que oculta un error de 0,2 mm queda NO APTO. |
| M2 | Sin regla de decisión con incertidumbre (ISO/IEC 17025:2017 §7.1.3 y §7.8.6.1). | Nuevo campo opcional **U (k=2)**. Regla de aceptación con banda de guarda ILAC-G8:09/2019: conforme solo si \|E\| + U ≤ EMP. Se muestra el **TUR** y se advierte si es < 4:1. Sin U, se mantiene la aceptación simple. |
| M3 | Se podía registrar una calibración con un patrón de **certificado vencido** (el filtro dependía de un estado guardado que podía estar desactualizado). | El servidor valida la vigencia del certificado del patrón a la fecha; si está vencido rechaza el registro (trazabilidad §6.5). |
| M4 | La tolerancia mostrada en pantalla (tras conversión de unidades) podía diferir de la usada por el servidor, así que el resultado guardado no coincidía con el mostrado. | Se envía y registra la `Tolerancia_Aplicada` y la incertidumbre en cada punto. |
| M5 | `Firma_Digital` nunca se completaba: no quedaba constancia de quién autorizó cada registro. | Se registra el usuario autenticado, la fecha/hora ISO y la regla de decisión aplicada (§7.5 registros técnicos). |
| M6 | Próximo control: 31-ene + 1 mes daba 3-mar. | `addMonths` (fin de mes correcto). |
| M7 | Valores no numéricos se guardaban como `NaN`. | Respuesta 400 con mensaje claro. |

## 3. Otras mejoras incluidas
- El visor QR pide iniciar sesión antes de registrar una verificación (antes cargaba toda la lista de equipos sin autenticar).
- Cliente Prisma único (el visor creaba una conexión nueva por petición, lo que agota conexiones en serverless).
- Cabeceras de seguridad (`nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`).
- Se eliminó `next.config.mjs` con `ignoreBuildErrors: true` (había dos archivos de configuración en conflicto). El proyecto compila sin errores de tipos.
- Se eliminaron archivos de depuración versionados (`git_log.txt`, `tracked_files.txt`, `ignored_files.txt`, `fix_git.ps1`).
- Botón de cierre de los modales alineado a la derecha.
- Pruebas automatizadas (`npm test`) del motor metrológico y de la autenticación.

## 4. Acciones requeridas al desplegar
1. En Vercel → Settings → Environment Variables, crear:
   - `SESSION_SECRET` (aleatorio, ≥ 32 caracteres): `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`
   - `CRON_SECRET` (aleatorio).
2. Todos los usuarios deberán iniciar sesión de nuevo (las cookies antiguas dejan de ser válidas).
3. Los técnicos ya no pueden **eliminar** registros; solo los Admin.

## 5. Hoja de ruta hacia un estándar de clase mundial
Prioridad alta:
1. **Audit trail inmutable** (ISO/IEC 17025 §7.5.2 y §8.4, 21 CFR Part 11): tabla de eventos con quién, qué, cuándo, valor anterior y valor nuevo. Hoy `PUT /api/historial/[id]` permite modificar resultados sin dejar rastro.
2. **Presupuesto de incertidumbre GUM** (JCGM 100): componentes tipo A (repetibilidad) y tipo B (certificado del patrón, resolución, deriva, temperatura) con k calculado por Welch-Satterthwaite, en lugar de ingresar U manualmente.
3. **Archivos fuera de la base de datos**: los PDF y fotos se guardan en base64 dentro de PostgreSQL; moverlos a almacenamiento de objetos (Vercel Blob o Supabase Storage) reduce costos y acelera las consultas.
4. **Migraciones Prisma versionadas**: solo existe la migración inicial; el esquema actual se aplicó con `db push`.

Prioridad media:
5. Cartas de control y análisis de deriva por equipo para optimizar intervalos (ILAC-G24 / OIML D 10).
6. Validación de entradas con esquemas (zod) en todas las rutas; hoy se tipan con `any`. Además, 143 errores de ESLint preexistentes.
7. Gestión de condiciones ambientales (temperatura y humedad) por registro.
8. Multiempresa (dominio `polifusion.cl` fijo → `DEFAULT_EMAIL_DOMAIN`), API pública e integración con ERP/MES.
9. Dividir los componentes de más de 1.500 líneas (`page.tsx`, `VerificationModal`, `reports.ts`) y pruebas E2E con Playwright.
