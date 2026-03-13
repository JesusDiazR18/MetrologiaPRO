# Plan de Optimización de Infraestructura MetrologiaPRO

Este plan detalla la transición final a una arquitectura de producción gratuita y persistente.

## 1. Análisis Técnico y Diagnóstico
- **Estado Actual**: SQLite local (`dev.db`). No persistente en despliegues.
- **Problema Detectado**: Corrupción de binarios de Prisma ("prisma:engines binaries") que bloquea la migración a PostgreSQL.
- **Objetivo**: Conectividad 24/7 con Supabase (PostgreSQL) usando configuración optimizada de Pooling.

## 2. Acciones Propuestas

### Entorno y Configuración
#### [MODIFY] [.env](file:///c:/Users/Jesus%20Diaz/Desktop/APP%20EQUIPOS%20E%20INSTRUMENTOS/qms-app/.env)
Configurar una arquitectura de conexión dual para entornos serverless (Gratis):
- **DATABASE_URL**: Usará el puerto `6543` (Transaction Pooling) para Next.js.
- **DIRECT_URL**: Usará el puerto `5432` (Direct Connection) para Prisma CLI.

### Resolución de Errores de Motor
1. **Limpieza**: Ejecutar borrado manual de `node_modules/.prisma` y `node_modules/@prisma/client`.
2. **Re-generación**: Forzar `npx prisma generate` bajo el contexto de PostgreSQL.
3. **Migración**: Sincronizar con `npx prisma db push`.

## 3. Plan de Verificación

### Sincronización Cloud
- Verificar la creación de tablas en el panel de Supabase.
- Poblar la base de datos con el script `seed`.

### Validación de Despliegue
- Confirmar que la app lee y escribe datos directamente en la nube.
