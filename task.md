# Tareas de Estabilización y Resiliencia QMS

## Fase 1: Corrección de Hardware (QR Scanner)
- [ ] Solucionar error NotReadableError en Cámara V13
  - [x] Investigar conflictos en layout y modales
  - [ ] Implementar limpieza de tracks a bajo nivel (MediaDevices API)
  - [ ] Añadir selector de cámara manual y detección de dispositivos

## Fase 2 & 3: Optimización de UX y Estética (Completado)
- [x] Rediseñar Header a Ultra-Premium
- [x] Implementar búsqueda as-you-type y sincronización URL
- [x] Sidebar Dinámico V3 y Modal de Registro de Verificación Pro

## Fase 4: Correcciones Visuales de Alta Precisión (Completado)
- [x] Solución de Bug de 3 Filas Apiladas en Tabla de Patrones en Escritorio
  - [x] Eliminación de regla `display: block` de `.desktop-only` en modo escritorio
- [x] Rediseño Premium de Modales y Controles de Formulario
  - [x] Definición en `:root` de variables faltantes (`--oxford-blue`, `--cyan`, `--snow-1`, `--snow-2`, `--snow-3`, `--radius`)
  - [x] Estilización de `.form-control` y `.btn` con bordes suaves, sombras multicapa y animaciones premium
