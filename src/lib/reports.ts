import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import { formatFecha, semaforoLabel, calcularSemaforo, getScanUrl } from './metrologia'

/**
 * Convierte una URL de imagen (relativa, absoluta o blob) a base64 para uso seguro en jsPDF,
 * retornando también las dimensiones naturales de la imagen para respetar su relación de aspecto.
 */
async function getBase64FromUrl(url: string): Promise<{ data: string, format: string, width: number, height: number } | null> {
  if (!url) return null;
  if (url.startsWith('data:image/')) {
    const format = url.split(';')[0].split('/')[1]?.toUpperCase() || 'PNG';
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ data: url, format: format === 'SVG+XML' ? 'PNG' : format, width: img.naturalWidth || 1, height: img.naturalHeight || 1 });
      };
      img.onerror = () => {
        resolve({ data: url, format: format === 'SVG+XML' ? 'PNG' : format, width: 1, height: 1 });
      };
      img.src = url;
    });
  }
  try {
    const fullUrl = url.startsWith('/') && typeof window !== 'undefined' 
      ? `${window.location.origin}${url}` 
      : url;
      
    const res = await fetch(fullUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const format = result.split(';')[0].split('/')[1]?.toUpperCase() || 'PNG';
        const img = new Image();
        img.onload = () => {
          resolve({ 
            data: result, 
            format: format === 'SVG+XML' ? 'PNG' : format, 
            width: img.naturalWidth || 1, 
            height: img.naturalHeight || 1 
          });
        };
        img.onerror = () => {
          resolve({ 
            data: result, 
            format: format === 'SVG+XML' ? 'PNG' : format, 
            width: 1, 
            height: 1 
          });
        };
        img.src = result;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error("Error converting image to base64:", err);
    return null;
  }
}

/**
 * Filtra si un campo tiene un valor válido (no vacío ni nulo).
 */
function hasValue(val: any): boolean {
  if (val === null || val === undefined) return false;
  const str = String(val).trim();
  return str !== '' && str !== '—' && str !== 'No definida' && str !== 'No asignado' && str !== 'N/A' && str !== 'No definido' && str !== 'Sin fecha';
}

/**
 * Asigna color de texto al estado del activo según la norma metrológica.
 */
function getStatusColor(valStr: string): [number, number, number] {
  const s = valStr.toLowerCase();
  if (
    s.includes('vencido') || 
    s.includes('critico') || 
    s.includes('crítico') ||
    s.includes('baja') || 
    s.includes('obsoleto') || 
    s.includes('no apto') || 
    s.includes('fuera de servicio') || 
    s.includes('inoperativo') || 
    s.includes('dañado') ||
    s.includes('rojo')
  ) {
    return [239, 68, 68]; // Rojo (Peligro/No Operativo)
  }
  if (
    s.includes('detalles') || 
    s.includes('mantenimiento') || 
    s.includes('pendiente') || 
    s.includes('amarillo')
  ) {
    return [245, 158, 11]; // Amarillo / Naranja (Advertencia)
  }
  return [16, 185, 129]; // Verde (Operativo)
}

/**
 * Renderiza un encabezado de sección con estilo premium (Fondo oscuro y acento lateral).
 */
function renderSectionTitle(doc: jsPDF, title: string, yPos: number, accentColor: [number, number, number] = [0, 229, 255]): number {
  doc.setFillColor(30, 41, 59); // Slate 800
  doc.rect(16, yPos, 178, 8, 'F');
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]); // Franja de acento
  doc.rect(16, yPos, 3, 8, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(title.toUpperCase(), 23, yPos + 5.5);
  return yPos + 11;
}

/**
 * Dibuja un grupo de ítems dinámicamente en columnas o filas completas, ajustando el alto y previniendo colisiones.
 */
function renderGroupOfItems(doc: jsPDF, items: any[], startY: number, printableWidth: number, margin: number): number {
  let currY = startY;
  const colW = printableWidth / 2 - 1.5;
  let i = 0;
  
  while (i < items.length) {
    const item = items[i];
    const valStr = String(item.value).trim();
    
    // Decidir si debe ocupar toda la fila
    const isName = item.isNameField || item.label.toLowerCase().includes('nombre') || item.label.toLowerCase().includes('responsable') || item.label.toLowerCase().includes('detalles') || item.label.toLowerCase().includes('proveedor');
    const isLongVal = valStr.length > 35 || valStr.includes('\n');
    const isFullWidth = isName || isLongVal || item.colSpan === 2;
    
    if (isFullWidth) {
      const w = printableWidth;
      const x = margin;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      const splitVal = doc.splitTextToSize(valStr, w - 43);
      const boxHeight = Math.max(8, splitVal.length * 4.2 + 3);
      
      if (currY + boxHeight > 275) {
        doc.addPage();
        currY = 20;
      }
      
      // Caja de fondo
      doc.setFillColor(248, 250, 252);
      doc.rect(x, currY, w, boxHeight, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(x, currY, w, boxHeight, 'S');
      
      // Etiqueta
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text(item.label, x + 3, currY + 5.5);
      
      // Valor
      doc.setFont('helvetica', 'normal');
      if (item.isStatus) {
        doc.setFont('helvetica', 'bold');
        const color = getStatusColor(valStr);
        doc.setTextColor(color[0], color[1], color[2]);
      } else {
        doc.setTextColor(15, 23, 42);
      }
      
      splitVal.forEach((line: string, lineIdx: number) => {
        doc.text(line, x + 40, currY + 5.5 + (lineIdx * 4.2));
      });
      
      currY += boxHeight + 2.5;
      i++;
    } else {
      const nextItem = i + 1 < items.length ? items[i + 1] : null;
      const nextValStr = nextItem ? String(nextItem.value).trim() : '';
      const nextIsName = nextItem ? (nextItem.isNameField || nextItem.label.toLowerCase().includes('nombre') || nextItem.label.toLowerCase().includes('responsable') || nextItem.label.toLowerCase().includes('detalles') || nextItem.label.toLowerCase().includes('proveedor')) : false;
      const nextIsLongVal = nextValStr.length > 35;
      const nextIsFullWidth = nextItem ? (nextIsName || nextIsLongVal || nextItem.colSpan === 2) : true;
      
      if (nextItem && !nextIsFullWidth) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        const splitVal1 = doc.splitTextToSize(valStr, colW - 41);
        const splitVal2 = doc.splitTextToSize(nextValStr, colW - 41);
        const boxHeight = Math.max(8, Math.max(splitVal1.length, splitVal2.length) * 4.2 + 3);
        
        if (currY + boxHeight > 275) {
          doc.addPage();
          currY = 20;
        }
        
        // Izquierdo
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, currY, colW, boxHeight, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.rect(margin, currY, colW, boxHeight, 'S');
        
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text(item.label, margin + 3, currY + 5.5);
        
        doc.setFont('helvetica', 'normal');
        if (item.isStatus) {
          doc.setFont('helvetica', 'bold');
          const color = getStatusColor(valStr);
          doc.setTextColor(color[0], color[1], color[2]);
        } else {
          doc.setTextColor(15, 23, 42);
        }
        splitVal1.forEach((line: string, lineIdx: number) => {
          doc.text(line, margin + 38, currY + 5.5 + (lineIdx * 4.2));
        });
        
        // Derecho
        const x2 = margin + colW + 3;
        doc.setFillColor(248, 250, 252);
        doc.rect(x2, currY, colW, boxHeight, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.rect(x2, currY, colW, boxHeight, 'S');
        
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text(nextItem.label, x2 + 3, currY + 5.5);
        
        doc.setFont('helvetica', 'normal');
        if (nextItem.isStatus) {
          doc.setFont('helvetica', 'bold');
          const color = getStatusColor(nextValStr);
          doc.setTextColor(color[0], color[1], color[2]);
        } else {
          doc.setTextColor(15, 23, 42);
        }
        splitVal2.forEach((line: string, lineIdx: number) => {
          doc.text(line, x2 + 38, currY + 5.5 + (lineIdx * 4.2));
        });
        
        currY += boxHeight + 2.5;
        i += 2;
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        const splitVal = doc.splitTextToSize(valStr, colW - 41);
        const boxHeight = Math.max(8, splitVal.length * 4.2 + 3);
        
        if (currY + boxHeight > 275) {
          doc.addPage();
          currY = 20;
        }
        
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, currY, colW, boxHeight, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.rect(margin, currY, colW, boxHeight, 'S');
        
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text(item.label, margin + 3, currY + 5.5);
        
        doc.setFont('helvetica', 'normal');
        if (item.isStatus) {
          doc.setFont('helvetica', 'bold');
          const color = getStatusColor(valStr);
          doc.setTextColor(color[0], color[1], color[2]);
        } else {
          doc.setTextColor(15, 23, 42);
        }
        splitVal.forEach((line: string, lineIdx: number) => {
          doc.text(line, margin + 38, currY + 5.5 + (lineIdx * 4.2));
        });
        
        currY += boxHeight + 2.5;
        i++;
      }
    }
  }
  return currY;
}

/**
 * Genera una Ficha Técnica profesional en formato PDF para un equipo específico.
 */
export async function generateTechnicalSheetPDF(equipo: any) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const margin = 16;
  const printableWidth = 178;

  // Cargar Logo e imágenes
  const logoBase64 = await getBase64FromUrl('/logo.png');
  const fotoBase64 = equipo.Foto_Equipo ? await getBase64FromUrl(equipo.Foto_Equipo) : null;
  
  // Generar QR
  const qrUrl = getScanUrl(equipo.Codigo_Interno);
  let qrBase64 = null;
  try {
    qrBase64 = await QRCode.toDataURL(qrUrl, { margin: 1, width: 180, color: { dark: '#0f172a', light: '#ffffff' } });
  } catch(e) {
    console.error("Error generando QR:", e);
  }

  // --- Encabezado Moderno con Fondo Azul Profundo ---
  doc.setFillColor(15, 23, 42); // Azul profundo (Slate 900)
  doc.rect(16, 15, 178, 30, 'F');
  
  // Línea de acento Cyan en la parte inferior del encabezado
  doc.setFillColor(0, 229, 255);
  doc.rect(16, 45, 178, 1.5, 'F');

  // Separadores verticales sutiles en el encabezado
  doc.setDrawColor(51, 65, 85); // Slate 700
  doc.setLineWidth(0.3);
  doc.line(60, 17, 60, 43);
  doc.line(146, 17, 146, 43);
  
  // Celda Izquierda: Logo de la Empresa
  if (logoBase64) {
    try {
      const maxLogoW = 34;
      const maxLogoH = 20;
      const aspect = logoBase64.width / logoBase64.height;
      let logoW = maxLogoW;
      let logoH = maxLogoW / aspect;
      if (logoH > maxLogoH) {
        logoH = maxLogoH;
        logoW = maxLogoH * aspect;
      }
      const logoX = 16 + (44 - logoW) / 2;
      const logoY = 15 + (30 - logoH) / 2;
      doc.addImage(logoBase64.data, logoBase64.format, logoX, logoY, logoW, logoH);
    } catch(e) {
      console.error("Error dibujando logo:", e);
    }
  }
  
  // Celda Central: Título
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255); // Blanco
  doc.text('FICHA TÉCNICA DE ACTIVO', 103, 26, { align: 'center' });
  
  doc.line(68, 29, 138, 29); // Divisor horizontal sutil
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 229, 255); // Cyan
  doc.text('SISTEMA DE CONTROL METROLÓGICO', 103, 35, { align: 'center' });
  
  // Celda Derecha: Metadatos
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // Gris claro
  doc.text('CÓDIGO:', 148, 23);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text(equipo.Codigo_Interno, 192, 23, { align: 'right' });
  
  doc.line(148, 26, 192, 26);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(148, 163, 184);
  doc.text('EMISIÓN:', 148, 31);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text(formatFecha(new Date().toISOString()), 192, 31, { align: 'right' });
  
  doc.line(148, 34, 192, 34);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(148, 163, 184);
  doc.text('REVISIÓN:', 148, 39);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text('01', 192, 39, { align: 'right' });

  let currY = 52;

  // --- 1. DATOS GENERALES E IDENTIFICACIÓN ---
  const rawIdentItems = [
    { label: 'Nombre Activo:', value: equipo.Nombre_Equipo, isNameField: true },
    { label: 'Tipo de Activo:', value: equipo.Tipo },
    { label: 'Marca:', value: equipo.Marca },
    { label: 'Modelo:', value: equipo.Modelo },
    { label: 'Número Serie:', value: equipo.Serie },
    { label: 'Rango Medida:', value: equipo.Rango_Medida },
    { label: 'Resolución:', value: equipo.Resolucion },
    { label: 'Magnitud:', value: equipo.Magnitud },
    { label: 'Ubicación / Área:', value: equipo.Area_Asignada },
    { label: 'Responsable:', value: equipo.Responsable }
  ];

  const identItems = rawIdentItems.filter(item => hasValue(item.value));

  if (identItems.length > 0) {
    currY = renderSectionTitle(doc, '1. Datos de Identificación y Ubicación', currY);
    currY = renderGroupOfItems(doc, identItems, currY, printableWidth, margin);
  }

  // --- 2. ESPECIFICACIONES TÉCNICAS Y METROLÓGICAS ---
  const semaforo = calcularSemaforo(equipo.Fecha_Proximo_Control, equipo.Estado);
  const estadoTxt = semaforoLabel(semaforo, equipo.Estado);

  let tolValue = equipo.Tolerancia_Aceptable != null ? `+/- ${equipo.Tolerancia_Aceptable} ${equipo.Unidad_Tolerancia ?? ''}` : null;
  if (equipo.Tolerancias_Multimagnitud) {
    try {
      const map = JSON.parse(equipo.Tolerancias_Multimagnitud);
      const entries = Object.entries(map).map(([mag, info]: [string, any]) => {
        return `${mag}: +/- ${info.tolerancia} ${info.unidad ?? ''}`;
      });
      if (entries.length > 0) {
        tolValue = entries.join('\n');
      }
    } catch(e) {}
  }

  const rawMetrologyItems = [
    { label: 'Tolerancia Admitida:', value: tolValue },
    { label: 'Intervalo de Control:', value: equipo.Periodicidad_Meses ? `${equipo.Periodicidad_Meses} Meses` : null },
    { label: 'Fecha de Ingreso:', value: formatFecha(equipo.Fecha_Ingreso) },
    { label: 'Última Verificación:', value: formatFecha(equipo.Fecha_Ultima_Verificacion) },
    { label: 'Próximo Control:', value: formatFecha(equipo.Fecha_Proximo_Control) },
    { label: 'Estado del Activo:', value: estadoTxt, isStatus: true },
    { label: 'Detalles de Estado:', value: equipo.Detalles_Estado },
    { label: 'N° Certificado:', value: equipo.N_Certificado },
    { label: 'Proveedor Servicio:', value: equipo.Proveedor_Servicio },
    { label: 'Vence Certificado:', value: formatFecha(equipo.Fecha_Vencimiento_Certificado) },
    { label: 'Accesorios:', value: equipo.Accesorios, colSpan: 2 },
    { label: 'Insumos:', value: equipo.Insumos, colSpan: 2 }
  ];

  const metrologyItems = rawMetrologyItems.filter(item => hasValue(item.value));

  if (metrologyItems.length > 0) {
    currY = renderSectionTitle(doc, '2. Especificaciones Metrológicas y de Operación', currY);
    currY = renderGroupOfItems(doc, metrologyItems, currY, printableWidth, margin);
  }

  // --- 3. EVIDENCIA FOTOGRÁFICA Y CÓDIGO QR ---
  if (currY + 70 > 275) { doc.addPage(); currY = 20; }
  currY = renderSectionTitle(doc, '3. Evidencia Fotográfica y Trazabilidad Digital QR', currY);

  doc.setFillColor(248, 250, 252);
  doc.rect(margin, currY, printableWidth, 65, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, currY, printableWidth, 65, 'S');

  // Foto a la izquierda respetando aspect ratio
  if (fotoBase64) {
    try {
      const maxPhotoW = 95;
      const maxPhotoH = 55;
      const aspect = fotoBase64.width / fotoBase64.height;
      let photoW = maxPhotoW;
      let photoH = maxPhotoW / aspect;
      if (photoH > maxPhotoH) {
        photoH = maxPhotoH;
        photoW = maxPhotoH * aspect;
      }
      const photoX = margin + 5 + (95 - photoW) / 2;
      const photoY = currY + 5 + (55 - photoH) / 2;
      doc.addImage(fotoBase64.data, fotoBase64.format, photoX, photoY, photoW, photoH);
    } catch(e) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text('[Fotografía disponible en sistema]', margin + 30, currY + 33);
    }
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text('[Sin fotografía registrada en el activo]', margin + 25, currY + 33);
  }

  // QR a la derecha
  if (qrBase64) {
    try {
      doc.addImage(qrBase64, 'PNG', margin + 120, currY + 6, 42, 42);
    } catch(e) {
      console.error(e);
    }
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('CÓDIGO QR DE TRAZABILIDAD', margin + 141, currY + 52, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Escanee para verificar autenticidad\ny registros en tiempo real.', margin + 141, currY + 57, { align: 'center' });

  currY += 75;

  // --- 4. HISTORIAL DE VERIFICACIONES ---
  if (equipo.historiales && equipo.historiales.length > 0) {
    if (currY + 40 > 275) { doc.addPage(); currY = 20; }
    currY = renderSectionTitle(doc, '4. Historial de Controles y Verificaciones Metrológicas', currY);

    // Column layout - tighter to fit more info
    // F.Control | Tipo | Magnitud | Patrón | Variación | Resultado | Observaciones
    const colX = {
      fecha:     margin + 2,
      tipo:      margin + 20,
      magnitud:  margin + 40,
      patron:    margin + 58,
      variacion: margin + 86,
      resultado: margin + 108,
      notas:     margin + 133
    }
    const colWidths = {
      notas: printableWidth - (133 - 2)  // remaining width for notes column
    }

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, currY, printableWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('F. Control', colX.fecha, currY + 5.5);
    doc.text('Tipo', colX.tipo, currY + 5.5);
    doc.text('Magnitud', colX.magnitud, currY + 5.5);
    doc.text('Patrón', colX.patron, currY + 5.5);
    doc.text('Variación', colX.variacion, currY + 5.5);
    doc.text('Resultado', colX.resultado, currY + 5.5);
    doc.text('Observaciones', colX.notas, currY + 5.5);
    currY += 8;

    equipo.historiales.slice(0, 10).forEach((h: any, idx: number) => {
      let ptsString = ''
      if (h.Mediciones_Puntos) {
        try {
          const pts = JSON.parse(h.Mediciones_Puntos)
          if (Array.isArray(pts) && pts.length > 0) {
            const formattedPts = pts.map((p: any, i: number) => {
              const diff = (p.patron !== null && p.instrumento !== null) ? (p.instrumento - p.patron) : null
              const diffStr = diff !== null ? `${diff > 0 ? '+' : ''}${parseFloat(diff.toFixed(3))}` : '—'
              return `P${i+1}(${diffStr})`
            }).join(', ')
            ptsString = `Pts: ${formattedPts}`
          }
        } catch (e) {}
      }

      // Build notes text combining observations and acciones
      const obsText = h.Observaciones ? h.Observaciones.trim() : '';
      let accionText = h.Acciones_Pendientes ? h.Acciones_Pendientes.trim() : '';
      
      // Deduplicate if observations and actions are identical
      if (accionText && obsText && accionText.toLowerCase() === obsText.toLowerCase()) {
        accionText = '';
      }
      const accionPart = accionText ? `Acciones: ${accionText}` : '';
      const fullNotes = [ptsString, obsText, accionPart].filter(Boolean).join(' | ') || '—';

      // Determine result label
      let resultLabel = h.Resultado_Status;
      if (h.Resultado_Status === 'ACCION_PENDIENTE') resultLabel = 'ACCIÓN REQUERIDA';
      else if (h.Resultado_Status === 'NO_APTO') resultLabel = 'NO APTO';

      // Calculate needed text lines for the notes column (max width ~45mm)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      const notesMaxWidth = colWidths.notas - 2;
      const notesLines = doc.splitTextToSize(fullNotes, notesMaxWidth);
      const rowH = Math.max(8, notesLines.length * 4 + 3);

      // Page break check
      if (currY + rowH > 280) { doc.addPage(); currY = 20; }

      // Row background
      const bg = idx % 2 === 0 ? 255 : 248;
      doc.setFillColor(bg, bg, bg);
      doc.rect(margin, currY, printableWidth, rowH, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, currY + rowH, margin + printableWidth, currY + rowH);

      const cellY = currY + 4.5;

      // Date
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(formatFecha(h.Fecha_Ejecucion), colX.fecha, cellY);

      // Tipo badge text
      const tipoLabel = h.Tipo_Verificacion === 'OPERATIVIDAD' ? 'Operativ.' : 'Calibrac.';
      doc.setTextColor(h.Tipo_Verificacion === 'OPERATIVIDAD' ? 180 : 14, h.Tipo_Verificacion === 'OPERATIVIDAD' ? 120 : 165, h.Tipo_Verificacion === 'OPERATIVIDAD' ? 0 : 233);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.text(tipoLabel, colX.tipo, cellY);

      // Magnitud
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text((h.Magnitud_Controlada || '—').substring(0, 10), colX.magnitud, cellY);

      // Patron
      doc.text((h.patron?.Codigo || '—').substring(0, 10), colX.patron, cellY);

      // Variacion
      doc.setTextColor(100, 116, 139);
      doc.text(h.Variacion_Calculada?.toFixed(4) || '—', colX.variacion, cellY);

      // Resultado - color coded
      const colorStatus = getStatusColor(h.Resultado_Status);
      doc.setTextColor(colorStatus[0], colorStatus[1], colorStatus[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.text(resultLabel, colX.resultado, cellY);

      // Notes - wrapped, multi-line
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(80, 100, 120);
      const notesStartY = currY + 4.5;
      notesLines.forEach((line: string, lineIdx: number) => {
        doc.text(line, colX.notas, notesStartY + lineIdx * 4);
      });

      currY += rowH;
    });
  }

  // Pie de Página
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, 282, pageWidth - margin, 282);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistema de Control Metrológico · Documento de Control Metrológico Oficial', margin, 287);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, 287, { align: 'right' });
  }

  doc.save(`FICHA_TECNICA_${equipo.Codigo_Interno}.pdf`);
}

/**
 * Genera una Ficha Técnica profesional para un Patrón de Referencia.
 */
export async function generatePatronSheetPDF(patron: any) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const margin = 16;
  const printableWidth = 178;

  const logoBase64 = await getBase64FromUrl('/logo.png');
  const fotoBase64 = patron.Foto_Patron ? await getBase64FromUrl(patron.Foto_Patron) : null;
  
  const qrUrl = getScanUrl(patron.Codigo);
  let qrBase64 = null;
  try {
    qrBase64 = await QRCode.toDataURL(qrUrl, { margin: 1, width: 180, color: { dark: '#581c87', light: '#ffffff' } });
  } catch(e) {
    console.error(e);
  }

  // --- Encabezado Moderno con Fondo Púrpura Oscuro ---
  doc.setFillColor(76, 29, 149); // Púrpura profundo (Purple 900)
  doc.rect(16, 15, 178, 30, 'F');
  
  // Línea de acento lila
  doc.setFillColor(192, 132, 252);
  doc.rect(16, 45, 178, 1.5, 'F');

  // Separadores verticales sutiles en el encabezado
  doc.setDrawColor(124, 58, 237); // Purple 600
  doc.setLineWidth(0.3);
  doc.line(60, 17, 60, 43);
  doc.line(146, 17, 146, 43);
  
  // Celda Izquierda: Logo
  if (logoBase64) {
    try {
      const maxLogoW = 34;
      const maxLogoH = 20;
      const aspect = logoBase64.width / logoBase64.height;
      let logoW = maxLogoW;
      let logoH = maxLogoW / aspect;
      if (logoH > maxLogoH) {
        logoH = maxLogoH;
        logoW = maxLogoH * aspect;
      }
      const logoX = 16 + (44 - logoW) / 2;
      const logoY = 15 + (30 - logoH) / 2;
      doc.addImage(logoBase64.data, logoBase64.format, logoX, logoY, logoW, logoH);
    } catch(e) {
      console.error(e);
    }
  }
  
  // Celda Central: Título
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('CERTIFICADO DE PATRÓN', 103, 26, { align: 'center' });
  
  doc.line(68, 29, 138, 29); // Divisor horizontal sutil
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(192, 132, 252); // Lila
  doc.text('SISTEMA DE CONTROL METROLÓGICO', 103, 35, { align: 'center' });
  
  // Celda Derecha: Metadatos
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(216, 180, 254); // Lila claro
  doc.text('CÓDIGO:', 148, 23);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text(patron.Codigo, 192, 23, { align: 'right' });
  
  doc.line(148, 26, 192, 26);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(216, 180, 254);
  doc.text('EMISIÓN:', 148, 31);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text(formatFecha(new Date().toISOString()), 192, 31, { align: 'right' });
  
  doc.line(148, 34, 192, 34);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(216, 180, 254);
  doc.text('REVISIÓN:', 148, 39);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text('01', 192, 39, { align: 'right' });

  let currY = 52;

  // --- 1. INFORMACIÓN DEL PATRÓN ---
  const rawPItems = [
    { label: 'Nombre Patrón:', value: patron.Nombre_Patron, isNameField: true },
    { label: 'Código Interno:', value: patron.Codigo },
    { label: 'Magnitud:', value: patron.Magnitud },
    { label: 'Laboratorio Calib.:', value: patron.Proveedor_Laboratorio },
    { label: 'N° Certificado:', value: patron.N_Certificado },
    { label: 'Fecha Calibración:', value: formatFecha(patron.Fecha_Calibracion_Externa) },
    { label: 'Vencimiento Cert.:', value: formatFecha(patron.Fecha_Vencimiento_Certificado) },
    { label: 'Estado Vigencia:', value: patron.Estado_Vigencia, isStatus: true }
  ];

  const pItems = rawPItems.filter(item => hasValue(item.value));

  if (pItems.length > 0) {
    currY = renderSectionTitle(doc, '1. Especificaciones y Datos del Patrón', currY, [168, 85, 247]);
    currY = renderGroupOfItems(doc, pItems, currY, printableWidth, margin);
  }

  // --- 2. EVIDENCIA FOTOGRÁFICA Y QR ---
  if (currY + 70 > 280) { doc.addPage(); currY = 20; }
  currY = renderSectionTitle(doc, '2. Evidencia Fotográfica y Trazabilidad QR', currY, [168, 85, 247]);

  doc.setFillColor(250, 250, 250);
  doc.rect(margin, currY, printableWidth, 65, 'F');
  doc.setDrawColor(230, 230, 230);
  doc.rect(margin, currY, printableWidth, 65, 'S');

  if (fotoBase64) {
    try {
      const maxPhotoW = 95;
      const maxPhotoH = 55;
      const aspect = fotoBase64.width / fotoBase64.height;
      let photoW = maxPhotoW;
      let photoH = maxPhotoW / aspect;
      if (photoH > maxPhotoH) {
        photoH = maxPhotoH;
        photoW = maxPhotoH * aspect;
      }
      const photoX = margin + 5 + (95 - photoW) / 2;
      const photoY = currY + 5 + (55 - photoH) / 2;
      doc.addImage(fotoBase64.data, fotoBase64.format, photoX, photoY, photoW, photoH);
    } catch(e) {}
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text('[Sin fotografía registrada en el patrón]', margin + 25, currY + 33);
  }

  if (qrBase64) {
    try {
      doc.addImage(qrBase64, 'PNG', margin + 120, currY + 6, 42, 42);
    } catch(e) {}
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('CÓDIGO QR DE TRAZABILIDAD', margin + 141, currY + 52, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Escanee para verificar autenticidad\ny uso metrológico en tiempo real.', margin + 141, currY + 57, { align: 'center' });

  currY += 75;

  // --- 3. HISTORIAL DE USO ---
  if (patron.historiales && patron.historiales.length > 0) {
    if (currY + 40 > 280) { doc.addPage(); currY = 20; }
    currY = renderSectionTitle(doc, '3. Historial de Uso en Verificaciones Metrológicas', currY, [168, 85, 247]);

    doc.setFillColor(88, 28, 135);
    doc.rect(margin, currY, printableWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Fecha', margin + 4, currY + 5.5);
    doc.text('Equipo / Instrumento Verificado', margin + 35, currY + 5.5);
    doc.text('Resultado Control', margin + 135, currY + 5.5);

    currY += 8;

    patron.historiales.slice(0, 10).forEach((h: any, idx: number) => {
      if (currY + 10 > 280) { doc.addPage(); currY = 20; }
      const bg = idx % 2 === 0 ? 255 : 249;
      doc.setFillColor(bg, bg, bg);
      doc.rect(margin, currY, printableWidth, 8, 'F');
      doc.setDrawColor(230, 230, 230);
      doc.line(margin, currY + 8, margin + printableWidth, currY + 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(formatFecha(h.Fecha_Ejecucion), margin + 4, currY + 5.5);
      doc.text(h.equipo?.Nombre_Equipo?.substring(0, 50) || 'Equipo no vinculado', margin + 35, currY + 5.5);

      const colorStatus = getStatusColor(h.Resultado_Status);
      doc.setTextColor(colorStatus[0], colorStatus[1], colorStatus[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(h.Resultado_Status, margin + 135, currY + 5.5);

      currY += 8;
    });
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, 282, pageWidth - margin, 282);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistema de Control Metrológico · Estándar de Referencia Oficial', margin, 287);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, 287, { align: 'right' });
  }

  doc.save(`PATRON_${patron.Codigo}.pdf`);
}

/**
 * Auxiliar para renderizar un título de sección minimalista con una línea de acento sutil.
 */
function renderSectionTitleMinimal(doc: jsPDF, title: string, yPos: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.text(title.toUpperCase(), 16, yPos + 4);
  
  // Línea sutil de separación
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.setLineWidth(0.3);
  doc.line(16, yPos + 6, 194, yPos + 6);
  return yPos + 10;
}

/**
 * Genera un Reporte Ejecutivo Mensual consolidado del Dashboard.
 */
export async function generateExecutiveSummaryPDF(stats: any, filterInfo?: { tipo?: string | null, fechaDesde?: string, fechaHasta?: string, status?: string | null }) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const margin = 16;
  const printableWidth = 178;

  const logoBase64 = await getBase64FromUrl('/logo.png');

  // --- Encabezado Moderno Compacto con Fondo Slate Oscuro ---
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(16, 15, 178, 24, 'F'); // Reducido a 24mm de alto para compactación
  
  // Línea de acento Cyan sutil
  doc.setFillColor(0, 229, 255);
  doc.rect(16, 39, 178, 1, 'F');

  // Separadores verticales sutiles en el encabezado
  doc.setDrawColor(51, 65, 85); // Slate 700
  doc.setLineWidth(0.3);
  doc.line(60, 17, 60, 37);
  doc.line(146, 17, 146, 37);
  
  // Celda Izquierda: Logo
  if (logoBase64) {
    try {
      const maxLogoW = 34;
      const maxLogoH = 16;
      const aspect = logoBase64.width / logoBase64.height;
      let logoW = maxLogoW;
      let logoH = maxLogoW / aspect;
      if (logoH > maxLogoH) {
        logoH = maxLogoH;
        logoW = maxLogoH * aspect;
      }
      const logoX = 16 + (44 - logoW) / 2;
      const logoY = 15 + (24 - logoH) / 2;
      doc.addImage(logoBase64.data, logoBase64.format, logoX, logoY, logoW, logoH);
    } catch(e) {
      console.error(e);
    }
  }
  
  // Celda Central: Título
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('REPORTE EJECUTIVO METROLÓGICO', 103, 23, { align: 'center' });
  
  doc.line(68, 26, 138, 26); // Divisor horizontal sutil
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text('SISTEMA DE CONTROL METROLÓGICO', 103, 31, { align: 'center' });
  
  // Celda Derecha: Metadatos
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text('PERIODO:', 148, 21);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text(new Date().toLocaleString('es-ES', { month: 'short', year: 'numeric' }).toUpperCase(), 192, 21, { align: 'right' });
  
  doc.line(148, 23, 192, 23);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(148, 163, 184);
  doc.text('EMISIÓN:', 148, 28);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text(formatFecha(new Date().toISOString()), 192, 28, { align: 'right' });
  
  doc.line(148, 30, 192, 30);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(148, 163, 184);
  doc.text('TIPO:', 148, 35);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text('DIAGNÓSTICO', 192, 35, { align: 'right' });

  let currY = 44;

  // --- Filtros Aplicados ---
  let filterText = 'Filtro aplicado: Ninguno (Vista Global)';
  if (filterInfo) {
    const parts = [];
    if (filterInfo.tipo) {
      parts.push(`Tipo: ${filterInfo.tipo === 'PATRON' ? 'Patrón' : filterInfo.tipo === 'EQUIPO' ? 'Equipo' : 'Instrumento'}`);
    }
    if (filterInfo.status) {
      parts.push(`Estado: ${filterInfo.status === 'VERDE' ? 'Al Día' : filterInfo.status === 'AMARILLO' ? 'Por Vencer' : 'Crítico'}`);
    }
    if (filterInfo.fechaDesde || filterInfo.fechaHasta) {
      const desde = filterInfo.fechaDesde ? formatFecha(filterInfo.fechaDesde) : 'Inicio';
      const hasta = filterInfo.fechaHasta ? formatFecha(filterInfo.fechaHasta) : 'Fin';
      parts.push(`Rango: ${desde} a ${hasta}`);
    }
    if (parts.length > 0) {
      filterText = `Filtro aplicado: ${parts.join(' | ')}`;
    }
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text(filterText, margin, currY + 4);

  // Línea sutil bajo filtros
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(margin, currY + 6, margin + printableWidth, currY + 6);

  currY += 12;

  // --- Sección 1: Resumen de Indicadores Metrológicos ---
  currY = renderSectionTitleMinimal(doc, '1. Resumen de Indicadores Metrológicos', currY);

  const isPatron = filterInfo?.tipo === 'PATRON';
  const isEquipo = filterInfo?.tipo === 'EQUIPO';
  const isInstrumento = filterInfo?.tipo === 'INSTRUMENTO';

  const rows: { label: string; value: string | number; detail: string; color?: [number, number, number] }[] = [];

  // Cumplimiento
  let compLabel = 'Cumplimiento Global del Sistema';
  if (isPatron) compLabel = 'Cumplimiento de Patrones';
  else if (isEquipo) compLabel = 'Cumplimiento de Equipos';
  else if (isInstrumento) compLabel = 'Cumplimiento de Instrumentos';

  const compliance = stats.complianceGlobal ?? 100;
  const compColor: [number, number, number] = compliance >= 90 ? [22, 163, 74] : compliance >= 70 ? [217, 119, 6] : [220, 38, 38];

  rows.push({
    label: compLabel,
    value: `${compliance}%`,
    detail: compliance >= 90 ? 'Excelente (Dentro de norma)' : compliance >= 70 ? 'Aceptable (Bajo observación)' : 'Crítico (Atención requerida)',
    color: compColor
  });

  // Total Activos
  let totalLabel = 'Total Activos en Inventario';
  if (isPatron) totalLabel = 'Total Patrones de Referencia';
  else if (isEquipo) totalLabel = 'Total Equipos de Medición';
  else if (isInstrumento) totalLabel = 'Total Instrumentos de Medición';

  rows.push({
    label: totalLabel,
    value: stats.totalActivos ?? 0,
    detail: 'Unidades totales registradas'
  });

  // Solo mostrar desglose si NO hay filtro específico
  if (!isPatron && !isEquipo && !isInstrumento) {
    rows.push({
      label: '  • Equipos de Medición',
      value: stats.totalEquipos ?? 0,
      detail: 'Activos principales'
    });
    rows.push({
      label: '  • Instrumentos de Medición',
      value: stats.totalInstrumentos ?? 0,
      detail: 'Equipos auxiliares'
    });
    rows.push({
      label: '  • Patrones de Referencia',
      value: stats.totalPatrones ?? 0,
      detail: 'Estándares certificados'
    });
  }

  // Estados
  const stateSuffix = isPatron ? 'Patrones' : isEquipo ? 'Equipos' : isInstrumento ? 'Instrumentos' : 'Activos';

  rows.push({
    label: `  - ${stateSuffix} Vigentes (Al Día)`,
    value: stats.alDia ?? 0,
    detail: 'Operación normal permitida',
    color: [22, 163, 74]
  });

  rows.push({
    label: `  - ${stateSuffix} Próximos a Vencer (Advertencia)`,
    value: stats.proximos ?? 0,
    detail: 'Vencimiento menor a 30 días',
    color: [217, 119, 6]
  });

  rows.push({
    label: `  - ${stateSuffix} fuera de Vigencia (Críticos)`,
    value: stats.vencidos ?? 0,
    detail: 'Calibración / Inspección pendiente',
    color: [220, 38, 38]
  });

  // Renderizar la tabla minimalista de KPIs
  doc.setFillColor(250, 250, 250);
  doc.rect(margin, currY, printableWidth, 6.5 * rows.length + 6, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, currY, printableWidth, 6.5 * rows.length + 6, 'S');

  // Cabecera de la tabla
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('INDICADOR METROLÓGICO', margin + 4, currY + 4.5);
  doc.text('VALOR', margin + 120, currY + 4.5, { align: 'right' });
  doc.text('ESTADO / DETALLE', margin + 174, currY + 4.5, { align: 'right' });

  // Línea divisoria bajo cabecera
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, currY + 6, margin + printableWidth, currY + 6);

  let rowY = currY + 6;
  rows.forEach((r, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, rowY, printableWidth, 6.5, 'F');
    }
    
    // Etiqueta
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(r.label, margin + 4, rowY + 4.5);

    // Valor
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    if (r.color) {
      doc.setTextColor(r.color[0], r.color[1], r.color[2]);
    } else {
      doc.setTextColor(15, 23, 42);
    }
    doc.text(String(r.value), margin + 120, rowY + 4.5, { align: 'right' });

    // Detalle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(r.detail, margin + 174, rowY + 4.5, { align: 'right' });

    rowY += 6.5;
  });

  currY = rowY + 8;

  // --- Sección 2: Distribución de Inventario Activo (Solo en Vista Global) ---
  if (!isPatron && !isEquipo && !isInstrumento) {
    currY = renderSectionTitleMinimal(doc, '2. Distribución de Inventario Activo', currY);

    const totalActivosVal = (stats.totalEquipos ?? 0) + (stats.totalPatrones ?? 0) + (stats.totalInstrumentos ?? 0);
    const eqPct = totalActivosVal > 0 ? (stats.totalEquipos ?? 0) / totalActivosVal : 0;
    const instPct = totalActivosVal > 0 ? (stats.totalInstrumentos ?? 0) / totalActivosVal : 0;
    const patPct = totalActivosVal > 0 ? (stats.totalPatrones ?? 0) / totalActivosVal : 0;

    const distRows = [
      { label: 'Equipos de Medición', count: stats.totalEquipos ?? 0, pct: `${Math.round(eqPct * 100)}%` },
      { label: 'Instrumentos de Medición', count: stats.totalInstrumentos ?? 0, pct: `${Math.round(instPct * 100)}%` },
      { label: 'Patrones de Referencia', count: stats.totalPatrones ?? 0, pct: `${Math.round(patPct * 100)}%` },
    ];

    doc.setFillColor(250, 250, 250);
    doc.rect(margin, currY, printableWidth, 6.5 * distRows.length + 3, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, currY, printableWidth, 6.5 * distRows.length + 3, 'S');

    let distY = currY + 1.5;
    distRows.forEach((dr) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text(dr.label, margin + 4, distY + 4.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(`${dr.count} unidades (${dr.pct})`, margin + printableWidth - 6, distY + 4.5, { align: 'right' });

      distY += 6.5;
    });

    currY = distY + 8;
  }

  // --- Sección 3: Alertas Críticas (El número de sección cambia dinámicamente) ---
  if (stats.alertasCriticas && stats.alertasCriticas.length > 0) {
    const sectionNum = (!isPatron && !isEquipo && !isInstrumento) ? '3' : '2';
    currY = renderSectionTitleMinimal(doc, `${sectionNum}. Alertas Críticas de Atención Inmediata`, currY);

    // Tabla de Alertas
    doc.setFillColor(30, 41, 59); // Slate 800 cabecera
    doc.rect(margin, currY, printableWidth, 7, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('CÓDIGO', margin + 4, currY + 4.8);
    doc.text('NOMBRE DEL ACTIVO', margin + 30, currY + 4.8);
    doc.text('MOTIVO / ESTADO DE ALERTA', margin + printableWidth - 4, currY + 4.8, { align: 'right' });

    currY += 7;

    stats.alertasCriticas.slice(0, 15).forEach((a: any, idx: number) => {
      const nombreText = a.nombre || 'Sin nombre';
      const splitNombre = doc.splitTextToSize(nombreText, 100); // 100mm para el nombre
      const rowHeight = Math.max(6.5, splitNombre.length * 4 + 2.5);

      if (currY + rowHeight > 275) {
        doc.addPage();
        currY = 20;
        
        // Repetir cabecera
        doc.setFillColor(30, 41, 59);
        doc.rect(margin, currY, printableWidth, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        doc.text('CÓDIGO', margin + 4, currY + 4.8);
        doc.text('NOMBRE DEL ACTIVO', margin + 30, currY + 4.8);
        doc.text('MOTIVO / ESTADO DE ALERTA', margin + printableWidth - 4, currY + 4.8, { align: 'right' });
        currY += 7;
      }

      const bg = idx % 2 === 0 ? 255 : 250;
      doc.setFillColor(bg, bg, bg);
      doc.rect(margin, currY, printableWidth, rowHeight, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, currY + rowHeight, margin + printableWidth, currY + rowHeight);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      doc.text(a.codigo || '', margin + 4, currY + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      splitNombre.forEach((line: string, lineIdx: number) => {
        doc.text(line, margin + 30, currY + 4.5 + (lineIdx * 4));
      });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(185, 28, 28); // Rojo
      const motivoText = a.status === 'ROJO' ? 'Calibración Expirada / Crítico' : 'Estado NO APTO';
      doc.text(motivoText, margin + printableWidth - 4, currY + 4.5, { align: 'right' });

      currY += rowHeight;
    });
  }

  // Pie de Página
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, 282, pageWidth - margin, 282);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistema de Control Metrológico · Reporte de Dirección', margin, 287);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, 287, { align: 'right' });
  }

  doc.save(`REPORTE_EJECUTIVO_${new Date().getMonth() + 1}_${new Date().getFullYear()}.pdf`);
}
