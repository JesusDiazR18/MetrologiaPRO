# Walkthrough: Eliminación de Certificados en Instrumentos y Mejora en Equipos

## 1. Condicionamiento de Certificados Digitales
De acuerdo con las normativas metrológicas internas del QMS, los **Instrumentos** se verifican exclusivamente a partir de un patrón de referencia interno, por lo que nunca requieren de un certificado externo. En cambio, los **Equipos** pueden o no contar con certificados de calibración externa.

### Cambios Implementados
1. **Catálogo de Fichas Técnicas (`src/app/equipos/page.tsx`)**:
   - Cuando se expande la ficha de un activo cuyo `Tipo` es `'INSTRUMENTO'`, la tarjeta de "Certificado Digital" se oculta completamente. El diseño de cuadrícula redistribuye las tarjetas restantes al 50% / 50% de ancho de pantalla de manera fluida y elegante.
   - Para los activos de tipo `'EQUIPO'` que no tengan un certificado cargado (`!N_Certificado && !PDF_Certificado`), en lugar de mostrar guiones vacíos (`—`), se presenta un estado vacío informativo y profesional con un botón directo `+ Cargar Certificado Externo`.
2. **Modal de Creación (`CreateEquipoModal.tsx`)**:
   - La Sección 3 ("Certificado de Calibración / Servicio") se oculta condicionalmente si se elige `INSTRUMENTO`.
   - Al cambiar el tipo de activo a `INSTRUMENTO` en el selector, se reinician de forma automática todos los campos del certificado (`N_Certificado`, `Proveedor_Servicio`, `Fecha_Vencimiento_Certificado`).
3. **Modal de Edición (`EditEquipoModal.tsx`)**:
   - De manera idéntica, la sección de certificados solo se muestra cuando se está editando un activo de tipo `'EQUIPO'`.

---

## 2. Verificación y Despliegue
- La compilación en producción (`npm run build`) se ha ejecutado de manera exitosa en 6.2s sin ningún error.
- Los cambios se han confirmado en Git (`32eb715`) y están en proceso de despliegue automatizado en Vercel (`metrologia-plf.vercel.app`).
