# Tareas de Estabilización y Resiliencia QMS

## Fase 1: Corrección de Hardware (QR Scanner)
- [ ] Solucionar error NotReadableError en Cámara V13
  - [x] Investigar conflictos en layout y modales (Descartado: No hay conflictos externos)
  - [ ] Implementar limpieza de tracks a bajo nivel (MediaDevices API)
  - [ ] Añadir selector de cámara manual y detección de dispositivos
  - [ ] Integrar guía de solución de problemas ("Troubleshooter") en la UI
  - [ ] Implementar re-intento automático con backoff exponencial

## Fase 2: Optimización de UX (Hecho)
- [x] Rediseñar Header a Ultra-Premium
- [x] Implementar búsqueda as-you-type
- [x] Sincronización de URL para búsqueda
- [x] Integración de Ficha Técnica en Calendario

## Fase 3: Estética y Componentes (Hecho)
- [x] Sidebar Dinámico V3
- [x] Modal de Registro de Verificación Pro
- [x] Galería de QR con carga diferida
