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
 * Genera una Ficha Técnica profesional en formato PDF para un equipo o instrumento específico.
 */
export async function generateTechnicalSheetPDF(equipo: any) {
  let targetEquipo = equipo;
  if (typeof window !== 'undefined' && (!targetEquipo.historiales || targetEquipo.historiales.length === 0)) {
    try {
      const res = await fetch(`/api/equipos/${equipo.ID_Equipo || equipo.Codigo_Interno}`);
      if (res.ok) {
        const full = await res.json();
        if (full && full.ID_Equipo) targetEquipo = full;
      }
    } catch (e) {}
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const margin = 16;
  const printableWidth = 178;
  const isInstrumento = targetEquipo.Tipo === 'INSTRUMENTO';

  // Cargar Logo e imágenes
  const logoBase64 = await getBase64FromUrl('/logo.png');
  const fotoBase64 = targetEquipo.Foto_Equipo ? await getBase64FromUrl(targetEquipo.Foto_Equipo) : null;
  
  // Generar QR SOLO SI ES EQUIPO (Los instrumentos NO llevan QR)
  let qrBase64 = null;
  if (!isInstrumento) {
    const qrUrl = getScanUrl(targetEquipo.Codigo_Interno);
    try {
      qrBase64 = await QRCode.toDataURL(qrUrl, { margin: 1, width: 180, color: { dark: '#0f172a', light: '#ffffff' } });
    } catch(e) {
      console.error("Error generando QR:", e);
    }
  }

  // --- Encabezado Moderno con Fondo Azul Profundo ---
  doc.setFillColor(15, 23, 42); // Azul profundo (Slate 900)
  doc.rect(margin, 14, printableWidth, 28, 'F');
  
  // Línea de acento Cyan en la parte inferior del encabezado
  doc.setFillColor(0, 229, 255);
  doc.rect(margin, 42, printableWidth, 1.2, 'F');

  // Separadores verticales sutiles en el encabezado
  doc.setDrawColor(51, 65, 85); // Slate 700
  doc.setLineWidth(0.3);
  doc.line(52, 16, 52, 40);
  doc.line(152, 16, 152, 40);
  
  // Celda Izquierda: Logo de la Empresa
  if (logoBase64) {
    try {
      const maxLogoW = 32;
      const maxLogoH = 18;
      const aspect = logoBase64.width / logoBase64.height;
      let logoW = maxLogoW;
      let logoH = maxLogoW / aspect;
      if (logoH > maxLogoH) {
        logoH = maxLogoH;
        logoW = maxLogoH * aspect;
      }
      const logoX = margin + (36 - logoW) / 2;
      const logoY = 14 + (28 - logoH) / 2;
      doc.addImage(logoBase64.data, logoBase64.format, logoX, logoY, logoW, logoH);
    } catch(e) {
      console.error("Error dibujando logo:", e);
    }
  }
  
  // Celda Central: Título
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  const docTitle = isInstrumento ? 'FICHA TÉCNICA DE INSTRUMENTO' : 'FICHA TÉCNICA DE EQUIPO';
  doc.text(docTitle, 102, 24, { align: 'center' });
  
  doc.setDrawColor(51, 65, 85);
  doc.line(65, 27, 139, 27);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 229, 255);
  doc.text('SISTEMA DE CONTROL METROLÓGICO · POLIFUSIÓN', 102, 34, { align: 'center' });
  
  // Celda Derecha: Metadatos
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('CÓDIGO:', 155, 21);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text(targetEquipo.Codigo_Interno || '—', 191, 21, { align: 'right' });
  
  doc.line(155, 24, 191, 24);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(148, 163, 184);
  doc.text('EMISIÓN:', 155, 29);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text(formatFecha(new Date().toISOString()), 191, 29, { align: 'right' });
  
  doc.line(155, 32, 191, 32);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(148, 163, 184);
  doc.text('REVISIÓN:', 155, 37);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text('01', 191, 37, { align: 'right' });

  let currY = 48;

  // --- 1. DATOS GENERALES E IDENTIFICACIÓN ---
  const rawIdentItems = [
    { label: 'Nombre Activo:', value: targetEquipo.Nombre_Equipo, isNameField: true },
    { label: 'Tipo de Activo:', value: targetEquipo.Tipo },
    { label: 'Marca:', value: targetEquipo.Marca },
    { label: 'Modelo:', value: targetEquipo.Modelo },
    { label: 'Número Serie:', value: targetEquipo.Serie },
    { label: 'Rango Medida:', value: targetEquipo.Rango_Medida },
    { label: 'Resolución:', value: targetEquipo.Resolucion },
    { label: 'Magnitud:', value: targetEquipo.Magnitud },
    { label: 'Ubicación / Área:', value: targetEquipo.Area_Asignada },
    { label: 'Responsable:', value: targetEquipo.Responsable }
  ];

  const identItems = rawIdentItems.filter(item => hasValue(item.value));

  if (identItems.length > 0) {
    currY = renderSectionTitle(doc, '1. Datos de Identificación y Ubicación', currY);
    currY = renderGroupOfItems(doc, identItems, currY, printableWidth, margin);
  }

  // --- 2. ESPECIFICACIONES TÉCNICAS Y METROLÓGICAS ---
  const semaforo = calcularSemaforo(targetEquipo.Fecha_Proximo_Control, targetEquipo.Estado);
  const estadoTxt = semaforoLabel(semaforo, targetEquipo.Estado);

  let tolValue = targetEquipo.Tolerancia_Aceptable != null ? `+/- ${targetEquipo.Tolerancia_Aceptable} ${targetEquipo.Unidad_Tolerancia ?? ''}` : null;
  if (targetEquipo.Tolerancias_Multimagnitud) {
    try {
      const map = JSON.parse(targetEquipo.Tolerancias_Multimagnitud);
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
    { label: 'Intervalo de Control:', value: targetEquipo.Periodicidad_Meses ? `${targetEquipo.Periodicidad_Meses} Meses` : null },
    { label: 'Fecha de Ingreso:', value: formatFecha(targetEquipo.Fecha_Ingreso) },
    { label: 'Última Verificación:', value: formatFecha(targetEquipo.Fecha_Ultima_Verificacion) },
    { label: 'Próximo Control:', value: formatFecha(targetEquipo.Fecha_Proximo_Control) },
    { label: 'Estado del Activo:', value: estadoTxt, isStatus: true },
    { label: 'Detalles de Estado:', value: targetEquipo.Detalles_Estado },
    { label: 'N° Certificado:', value: targetEquipo.N_Certificado },
    { label: 'Proveedor Servicio:', value: targetEquipo.Proveedor_Servicio },
    { label: 'Vence Certificado:', value: formatFecha(targetEquipo.Fecha_Vencimiento_Certificado) },
    { label: 'Accesorios:', value: targetEquipo.Accesorios, colSpan: 2 },
    { label: 'Insumos:', value: targetEquipo.Insumos, colSpan: 2 }
  ];

  const metrologyItems = rawMetrologyItems.filter(item => hasValue(item.value));

  if (metrologyItems.length > 0) {
    currY = renderSectionTitle(doc, '2. Especificaciones Metrológicas y de Operación', currY);
    currY = renderGroupOfItems(doc, metrologyItems, currY, printableWidth, margin);
  }

  // --- 3. EVIDENCIA FOTOGRÁFICA Y/O CÓDIGO QR ---
  let section3Rendered = false;
  if (!isInstrumento) {
    // EQUIPOS TIENEN QR
    if (currY + 65 > 275) { doc.addPage(); currY = 20; }
    currY = renderSectionTitle(doc, '3. Evidencia Fotográfica y Trazabilidad Digital QR', currY);

    if (fotoBase64) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, currY, printableWidth, 60, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, currY, printableWidth, 60, 'S');

      try {
        const maxPhotoW = 95;
        const maxPhotoH = 50;
        const aspect = fotoBase64.width / fotoBase64.height;
        let photoW = maxPhotoW;
        let photoH = maxPhotoW / aspect;
        if (photoH > maxPhotoH) {
          photoH = maxPhotoH;
          photoW = maxPhotoH * aspect;
        }
        const photoX = margin + 5 + (95 - photoW) / 2;
        const photoY = currY + 5 + (50 - photoH) / 2;
        doc.addImage(fotoBase64.data, fotoBase64.format, photoX, photoY, photoW, photoH);
      } catch(e) {}

      if (qrBase64) {
        try {
          doc.addImage(qrBase64, 'PNG', margin + 122, currY + 5, 38, 38);
        } catch(e) {}
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('CÓDIGO QR DE TRAZABILIDAD', margin + 141, currY + 48, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text('Escanee para verificar autenticidad\ny registros en tiempo real.', margin + 141, currY + 53, { align: 'center' });

      currY += 66;
    } else {
      // Sin foto: Caja centrada y elegante para el QR
      const boxW = 100;
      const boxX = margin + (printableWidth - boxW) / 2;
      doc.setFillColor(248, 250, 252);
      doc.rect(boxX, currY, boxW, 58, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(boxX, currY, boxW, 58, 'S');

      if (qrBase64) {
        try {
          doc.addImage(qrBase64, 'PNG', boxX + (boxW - 36) / 2, currY + 4, 36, 36);
        } catch(e) {}
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('CÓDIGO QR DE TRAZABILIDAD DIGITAL', boxX + boxW / 2, currY + 46, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text('Escanee para verificar autenticidad y registros en tiempo real.', boxX + boxW / 2, currY + 51, { align: 'center' });

      currY += 64;
    }
    section3Rendered = true;
  } else if (fotoBase64) {
    // INSTRUMENTOS CON FOTO (SIN QR)
    if (currY + 65 > 275) { doc.addPage(); currY = 20; }
    currY = renderSectionTitle(doc, '3. Evidencia Fotográfica del Instrumento', currY);

    doc.setFillColor(248, 250, 252);
    doc.rect(margin, currY, printableWidth, 60, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, currY, printableWidth, 60, 'S');

    try {
      const maxPhotoW = 150;
      const maxPhotoH = 50;
      const aspect = fotoBase64.width / fotoBase64.height;
      let photoW = maxPhotoW;
      let photoH = maxPhotoW / aspect;
      if (photoH > maxPhotoH) {
        photoH = maxPhotoH;
        photoW = maxPhotoH * aspect;
      }
      const photoX = margin + (printableWidth - photoW) / 2;
      const photoY = currY + 5 + (50 - photoH) / 2;
      doc.addImage(fotoBase64.data, fotoBase64.format, photoX, photoY, photoW, photoH);
    } catch(e) {}

    currY += 66;
    section3Rendered = true;
  }

  // --- HISTORIAL DE VERIFICACIONES ---
  const sectionTitleNum = section3Rendered ? '4' : '3';
  if (targetEquipo.historiales && targetEquipo.historiales.length > 0) {
    if (currY + 40 > 275) { doc.addPage(); currY = 20; }
    currY = renderSectionTitle(doc, `${sectionTitleNum}. Historial de Controles y Verificaciones Metrológicas`, currY);

    const colX = {
      fecha:     margin + 2,
      tipo:      margin + 22,
      magnitud:  margin + 42,
      patron:    margin + 62,
      variacion: margin + 88,
      resultado: margin + 110,
      notas:     margin + 135
    };
    const colWidths = {
      notas: printableWidth - (135 - 2)
    };

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

    targetEquipo.historiales.slice(0, 10).forEach((h: any, idx: number) => {
      let ptsString = '';
      if (h.Mediciones_Puntos) {
        try {
          const pts = JSON.parse(h.Mediciones_Puntos);
          if (Array.isArray(pts) && pts.length > 0) {
            const formattedPts = pts.map((p: any, i: number) => {
              const diff = (p.patron !== null && p.instrumento !== null) ? (p.instrumento - p.patron) : null;
              const diffStr = diff !== null ? `${diff > 0 ? '+' : ''}${parseFloat(diff.toFixed(3))}` : '—';
              return `P${i+1}(${diffStr})`;
            }).join(', ');
            ptsString = `Pts: ${formattedPts}`;
          }
        } catch (e) {}
      }

      const obsText = h.Observaciones ? h.Observaciones.trim() : '';
      let accionText = h.Acciones_Pendientes ? h.Acciones_Pendientes.trim() : '';
      if (accionText && obsText && accionText.toLowerCase() === obsText.toLowerCase()) {
        accionText = '';
      }
      const accionPart = accionText ? `Acciones: ${accionText}` : '';
      const fullNotes = [ptsString, obsText, accionPart].filter(Boolean).join(' | ') || '—';

      let resultLabel = h.Resultado_Status;
      if (h.Resultado_Status === 'ACCION_PENDIENTE') resultLabel = 'ACCIÓN REQUERIDA';
      else if (h.Resultado_Status === 'NO_APTO') resultLabel = 'NO APTO';

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      const notesMaxWidth = colWidths.notas - 2;
      const notesLines = doc.splitTextToSize(fullNotes, notesMaxWidth);
      const rowH = Math.max(8, notesLines.length * 4 + 3);

      if (currY + rowH > 280) { doc.addPage(); currY = 20; }

      const bg = idx % 2 === 0 ? 255 : 248;
      doc.setFillColor(bg, bg, bg);
      doc.rect(margin, currY, printableWidth, rowH, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, currY + rowH, margin + printableWidth, currY + rowH);

      const cellY = currY + 4.5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(formatFecha(h.Fecha_Ejecucion), colX.fecha, cellY);

      const tipoLabel = h.Tipo_Verificacion === 'OPERATIVIDAD' ? 'Operativ.' : 'Calibrac.';
      doc.setTextColor(h.Tipo_Verificacion === 'OPERATIVIDAD' ? 180 : 14, h.Tipo_Verificacion === 'OPERATIVIDAD' ? 120 : 165, h.Tipo_Verificacion === 'OPERATIVIDAD' ? 0 : 233);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.text(tipoLabel, colX.tipo, cellY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text((h.Magnitud_Controlada || '—').substring(0, 10), colX.magnitud, cellY);
      doc.text((h.patron?.Codigo || '—').substring(0, 10), colX.patron, cellY);

      doc.setTextColor(100, 116, 139);
      doc.text(h.Variacion_Calculada != null ? h.Variacion_Calculada.toFixed(4) : '—', colX.variacion, cellY);

      const colorStatus = getStatusColor(h.Resultado_Status);
      doc.setTextColor(colorStatus[0], colorStatus[1], colorStatus[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.text(resultLabel, colX.resultado, cellY);

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

  doc.save(`FICHA_TECNICA_${targetEquipo.Codigo_Interno || 'ACTIVO'}.pdf`);
}

/**
 * Genera una Ficha Técnica profesional para un Patrón de Referencia.
 */
export async function generatePatronSheetPDF(patron: any) {
  let targetPatron = patron;
  if (typeof window !== 'undefined' && (!targetPatron.historiales || targetPatron.historiales.length === 0 || !targetPatron.historiales[0]?.equipo)) {
    try {
      const res = await fetch(`/api/patrones/${patron.ID_Patron || patron.Codigo}`);
      if (res.ok) {
        const full = await res.json();
        if (full && full.ID_Patron) targetPatron = full;
      }
    } catch (e) {}
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const margin = 16;
  const printableWidth = 178;

  const logoBase64 = await getBase64FromUrl('/logo.png');
  const fotoBase64 = targetPatron.Foto_Patron ? await getBase64FromUrl(targetPatron.Foto_Patron) : null;
  
  const qrUrl = getScanUrl(targetPatron.Codigo);
  let qrBase64 = null;
  try {
    qrBase64 = await QRCode.toDataURL(qrUrl, { margin: 1, width: 180, color: { dark: '#0f172a', light: '#ffffff' } });
  } catch(e) {
    console.error(e);
  }

  // --- Encabezado Moderno con Fondo Azul Profundo ---
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(margin, 14, printableWidth, 28, 'F');
  
  // Línea de acento Cyan
  doc.setFillColor(0, 229, 255);
  doc.rect(margin, 42, printableWidth, 1.2, 'F');

  // Separadores verticales sutiles en el encabezado
  doc.setDrawColor(51, 65, 85);
  doc.setLineWidth(0.3);
  doc.line(52, 16, 52, 40);
  doc.line(152, 16, 152, 40);
  
  // Celda Izquierda: Logo
  if (logoBase64) {
    try {
      const maxLogoW = 32;
      const maxLogoH = 18;
      const aspect = logoBase64.width / logoBase64.height;
      let logoW = maxLogoW;
      let logoH = maxLogoW / aspect;
      if (logoH > maxLogoH) {
        logoH = maxLogoH;
        logoW = maxLogoH * aspect;
      }
      const logoX = margin + (36 - logoW) / 2;
      const logoY = 14 + (28 - logoH) / 2;
      doc.addImage(logoBase64.data, logoBase64.format, logoX, logoY, logoW, logoH);
    } catch(e) {
      console.error(e);
    }
  }
  
  // Celda Central: Título
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text('FICHA TÉCNICA DE PATRÓN DE REFERENCIA', 102, 24, { align: 'center' });
  
  doc.setDrawColor(51, 65, 85);
  doc.line(65, 27, 139, 27);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 229, 255);
  doc.text('SISTEMA DE CONTROL METROLÓGICO · POLIFUSIÓN', 102, 34, { align: 'center' });
  
  // Celda Derecha: Metadatos
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('CÓDIGO:', 155, 21);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text(targetPatron.Codigo || '—', 191, 21, { align: 'right' });
  
  doc.line(155, 24, 191, 24);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(148, 163, 184);
  doc.text('EMISIÓN:', 155, 29);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text(formatFecha(new Date().toISOString()), 191, 29, { align: 'right' });
  
  doc.line(155, 32, 191, 32);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(148, 163, 184);
  doc.text('REVISIÓN:', 155, 37);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text('01', 191, 37, { align: 'right' });

  let currY = 48;

  // --- 1. INFORMACIÓN DEL PATRÓN ---
  const rawPItems = [
    { label: 'Nombre Patrón:', value: targetPatron.Nombre_Patron, isNameField: true },
    { label: 'Código Interno:', value: targetPatron.Codigo },
    { label: 'Magnitud Física:', value: targetPatron.Magnitud },
    { label: 'Laboratorio Calib.:', value: targetPatron.Proveedor_Laboratorio },
    { label: 'N° Certificado:', value: targetPatron.N_Certificado },
    { label: 'Fecha Calibración:', value: formatFecha(targetPatron.Fecha_Calibracion_Externa) },
    { label: 'Vencimiento Cert.:', value: formatFecha(targetPatron.Fecha_Vencimiento_Certificado) },
    { label: 'Estado Vigencia:', value: targetPatron.Estado_Vigencia, isStatus: true }
  ];

  const pItems = rawPItems.filter(item => hasValue(item.value));

  if (pItems.length > 0) {
    currY = renderSectionTitle(doc, '1. Especificaciones y Datos del Patrón', currY);
    currY = renderGroupOfItems(doc, pItems, currY, printableWidth, margin);
  }

  // --- 2. EVIDENCIA FOTOGRÁFICA Y QR ---
  if (currY + 65 > 280) { doc.addPage(); currY = 20; }
  currY = renderSectionTitle(doc, '2. Evidencia Fotográfica y Trazabilidad Digital QR', currY);

  if (fotoBase64) {
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, currY, printableWidth, 60, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, currY, printableWidth, 60, 'S');

    try {
      const maxPhotoW = 95;
      const maxPhotoH = 50;
      const aspect = fotoBase64.width / fotoBase64.height;
      let photoW = maxPhotoW;
      let photoH = maxPhotoW / aspect;
      if (photoH > maxPhotoH) {
        photoH = maxPhotoH;
        photoW = maxPhotoH * aspect;
      }
      const photoX = margin + 5 + (95 - photoW) / 2;
      const photoY = currY + 5 + (50 - photoH) / 2;
      doc.addImage(fotoBase64.data, fotoBase64.format, photoX, photoY, photoW, photoH);
    } catch(e) {}

    if (qrBase64) {
      try {
        doc.addImage(qrBase64, 'PNG', margin + 122, currY + 5, 38, 38);
      } catch(e) {}
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('CÓDIGO QR DE TRAZABILIDAD', margin + 141, currY + 48, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('Escanee para verificar autenticidad\ny uso metrológico en tiempo real.', margin + 141, currY + 53, { align: 'center' });

    currY += 66;
  } else {
    // Sin foto: Caja centrada y elegante para el QR del Patrón
    const boxW = 100;
    const boxX = margin + (printableWidth - boxW) / 2;
    doc.setFillColor(248, 250, 252);
    doc.rect(boxX, currY, boxW, 58, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(boxX, currY, boxW, 58, 'S');

    if (qrBase64) {
      try {
        doc.addImage(qrBase64, 'PNG', boxX + (boxW - 36) / 2, currY + 4, 36, 36);
      } catch(e) {}
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('CÓDIGO QR DE TRAZABILIDAD DIGITAL', boxX + boxW / 2, currY + 46, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('Escanee para verificar certificados y calibración en tiempo real.', boxX + boxW / 2, currY + 51, { align: 'center' });

    currY += 64;
  }

  // --- 3. HISTORIAL DE CALIBRACIONES EXTERNAS ---
  if (targetPatron.calibraciones && targetPatron.calibraciones.length > 0) {
    if (currY + 40 > 280) { doc.addPage(); currY = 20; }
    currY = renderSectionTitle(doc, '3. Historial de Calibraciones Externas (Laboratorios Acreditados)', currY);

    doc.setFillColor(15, 23, 42);
    doc.rect(margin, currY, printableWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('F. Calibración', margin + 4, currY + 5.5);
    doc.text('Laboratorio', margin + 30, currY + 5.5);
    doc.text('N° Certificado', margin + 80, currY + 5.5);
    doc.text('Vence Cert.', margin + 120, currY + 5.5);
    doc.text('Resultado', margin + 155, currY + 5.5);
    currY += 8;

    targetPatron.calibraciones.slice(0, 10).forEach((c: any, idx: number) => {
      if (currY + 10 > 280) { doc.addPage(); currY = 20; }
      const bg = idx % 2 === 0 ? 255 : 249;
      doc.setFillColor(bg, bg, bg);
      doc.rect(margin, currY, printableWidth, 8, 'F');
      doc.setDrawColor(230, 230, 230);
      doc.line(margin, currY + 8, margin + printableWidth, currY + 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(formatFecha(c.Fecha_Calibracion), margin + 4, currY + 5.2);
      doc.text((c.Laboratorio || '—').substring(0, 24), margin + 30, currY + 5.2);
      doc.text((c.N_Certificado || '—').substring(0, 20), margin + 80, currY + 5.2);
      doc.text(formatFecha(c.Fecha_Vencimiento), margin + 120, currY + 5.2);

      const isAprob = c.Resultado === 'APROBADO';
      doc.setTextColor(isAprob ? 22 : 220, isAprob ? 163 : 38, isAprob ? 74 : 38);
      doc.setFont('helvetica', 'bold');
      doc.text(c.Resultado || 'APROBADO', margin + 155, currY + 5.2);

      currY += 8;
    });
  }

  // --- 4. HISTORIAL DE USO EN VERIFICACIONES ---
  if (targetPatron.historiales && targetPatron.historiales.length > 0) {
    if (currY + 40 > 280) { doc.addPage(); currY = 20; }
    const sectionNum = (targetPatron.calibraciones && targetPatron.calibraciones.length > 0) ? '4' : '3';
    currY = renderSectionTitle(doc, `${sectionNum}. Historial de Uso en Verificaciones Metrológicas`, currY);

    const colX = {
      fecha: margin + 3,
      codigo: margin + 26,
      activo: margin + 48,
      area: margin + 108,
      variacion: margin + 138,
      resultado: margin + 158
    };

    doc.setFillColor(15, 23, 42);
    doc.rect(margin, currY, printableWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('Fecha', colX.fecha, currY + 5.5);
    doc.text('Código', colX.codigo, currY + 5.5);
    doc.text('Activo Verificado', colX.activo, currY + 5.5);
    doc.text('Área / Ubicación', colX.area, currY + 5.5);
    doc.text('Variación', colX.variacion, currY + 5.5);
    doc.text('Resultado', colX.resultado, currY + 5.5);

    currY += 8;

    targetPatron.historiales.slice(0, 15).forEach((h: any, idx: number) => {
      if (currY + 10 > 280) { doc.addPage(); currY = 20; }
      const bg = idx % 2 === 0 ? 255 : 249;
      doc.setFillColor(bg, bg, bg);
      doc.rect(margin, currY, printableWidth, 8, 'F');
      doc.setDrawColor(230, 230, 230);
      doc.line(margin, currY + 8, margin + printableWidth, currY + 8);

      const eqCodigo = h.equipo?.Codigo_Interno || h.FK_ID_Equipo || '—';
      const eqNombre = h.equipo?.Nombre_Equipo || 'Activo verificado';
      const eqArea = h.equipo?.Area_Asignada || '—';

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(formatFecha(h.Fecha_Ejecucion), colX.fecha, currY + 5.3);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(2, 132, 199);
      doc.text(eqCodigo, colX.codigo, currY + 5.3);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(eqNombre.substring(0, 30), colX.activo, currY + 5.3);

      doc.setTextColor(100, 116, 139);
      doc.text(eqArea.substring(0, 16), colX.area, currY + 5.3);
      doc.text(h.Variacion_Calculada != null ? h.Variacion_Calculada.toFixed(4) : '—', colX.variacion, currY + 5.3);

      const colorStatus = getStatusColor(h.Resultado_Status);
      doc.setTextColor(colorStatus[0], colorStatus[1], colorStatus[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(h.Resultado_Status || 'APTO', colX.resultado, currY + 5.3);

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

  doc.save(`FICHA_PATRON_${targetPatron.Codigo || 'PATRON'}.pdf`);
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

/**
 * Genera un Reporte Metrológico General consolidado en PDF conteniendo:
 * 1. Resumen de KPIs y Portada de Diagnóstico.
 * 2. Tabla completa de Equipos e Instrumentos con su última verificación.
 * 3. Tabla completa de Patrones de Referencia con su última calibración.
 * 4. Tabla completa de la Biblioteca de Documentos de Ensayo y sus equipos asociados.
 */
export async function generateGeneralMetrologicalReportPDF(
  documentos: any[],
  equipos: any[],
  patrones: any[]
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 16;
  const printableWidth = 178;

  const logoBase64 = await getBase64FromUrl('/logo.png');

  // Helper para dibujar pie de página estándar
  const drawPageFooter = (pageNum: number, total: number) => {
    doc.setPage(pageNum);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, 282, pageWidth - margin, 282);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.text('POLIFUSION QMS · REPORTE METROLÓGICO GENERAL CONSOLIDADO', margin, 287);
    doc.text(`Página ${pageNum} de ${total}`, pageWidth - margin, 287, { align: 'right' });
  };

  // Helper para dibujar encabezado estándar en páginas internas
  const drawPageHeader = (title: string) => {
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(margin, 12, printableWidth, 12, 'F');
    doc.setFillColor(0, 229, 255); // Cyan accent
    doc.rect(margin, 24, printableWidth, 0.8, 'F');
    
    // Logo si existe
    let titleX = margin + 35;
    if (logoBase64) {
      try {
        const aspect = logoBase64.width / logoBase64.height;
        const logoH = 8;
        const logoW = 8 * aspect;
        doc.addImage(logoBase64.data, logoBase64.format, margin + 4, 14, logoW, logoH);
        titleX = Math.max(margin + 35, margin + 4 + logoW + 4);
      } catch (e) {}
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text(title.toUpperCase(), titleX, 19.5);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(formatFecha(new Date().toISOString()), margin + printableWidth - 4, 19.5, { align: 'right' });
  };

  // ==========================================
  // PÁGINA 1: PORTADA Y DIAGNÓSTICO EJECUTIVO
  // ==========================================
  
  // Encabezado Portada
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(16, 15, 178, 30, 'F');
  doc.setFillColor(0, 229, 255); // Cyan line
  doc.rect(16, 45, 178, 1.5, 'F');

  // Separadores verticales
  doc.setDrawColor(51, 65, 85);
  doc.setLineWidth(0.3);
  doc.line(60, 17, 60, 43);
  doc.line(146, 17, 146, 43);

  // Logo
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
    } catch (e) {}
  }

  // Título Central
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('REPORTE METROLÓGICO GENERAL', 103, 26, { align: 'center' });
  doc.line(68, 29, 138, 29);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(0, 229, 255);
  doc.text('INVENTARIO, ESTADO DE CONTROL Y BIBLIOTECA', 103, 35, { align: 'center' });

  // Metadatos Portada
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('INFORME N°:', 148, 23);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text(`RMG-${new Date().getFullYear()}-${new Date().getMonth() + 1}`, 192, 23, { align: 'right' });
  doc.line(148, 26, 192, 26);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(148, 163, 184);
  doc.text('FECHA:', 148, 31);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text(formatFecha(new Date().toISOString()), 192, 31, { align: 'right' });
  doc.line(148, 34, 192, 34);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(148, 163, 184);
  doc.text('EMISOR:', 148, 39);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text('SISTEMA QMS', 192, 39, { align: 'right' });

  let currY = 56;

  // Resumen Ejecutivo de la Portada
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.text('DIAGNÓSTICO EJECUTIVO DE CONTROL METROLÓGICO', margin, currY);
  
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.setLineWidth(0.3);
  doc.line(margin, currY + 2, margin + printableWidth, currY + 2);
  
  currY += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Este informe consolida el estado actual de calibraciones, verificaciones y documentación del laboratorio metrológico. A continuación se presentan los KPIs del sistema actualizados a la fecha de hoy.', margin, currY, { maxWidth: printableWidth });

  currY += 12;

  // Calcular métricas 100% reales basadas en el inventario actual
  const equiposReporte = equipos;

  // 1. Equipos
  const totalEquipos = equiposReporte.length;
  const eqAlDia = equiposReporte.filter(e => {
    const sem = e.Estado === 'NO_APTO' || e.Estado === 'FUERA_DE_SERVICIO' || e.Estado === 'DE_BAJA_OBSOLETO' || e.Estado === 'OBSOLETO' || e.Estado === 'BAJA'
      ? 'ROJO'
      : calcularSemaforo(e.Fecha_Proximo_Control, e.Estado);
    return sem === 'VERDE';
  }).length;
  const eqAdvertencia = equiposReporte.filter(e => {
    const sem = e.Estado === 'NO_APTO' || e.Estado === 'FUERA_DE_SERVICIO' || e.Estado === 'DE_BAJA_OBSOLETO' || e.Estado === 'OBSOLETO' || e.Estado === 'BAJA'
      ? 'ROJO'
      : calcularSemaforo(e.Fecha_Proximo_Control, e.Estado);
    return sem === 'AMARILLO';
  }).length;
  const eqCriticos = equiposReporte.filter(e => {
    const sem = e.Estado === 'NO_APTO' || e.Estado === 'FUERA_DE_SERVICIO' || e.Estado === 'DE_BAJA_OBSOLETO' || e.Estado === 'OBSOLETO' || e.Estado === 'BAJA'
      ? 'ROJO'
      : calcularSemaforo(e.Fecha_Proximo_Control, e.Estado);
    return sem === 'ROJO';
  }).length;

  // 2. Patrones
  const totalPatrones = patrones.length;
  const patVigentes = patrones.filter(p => p.Estado_Vigencia === 'VIGENTE').length;
  const patVencidos = patrones.filter(p => p.Estado_Vigencia !== 'VIGENTE').length;

  // 3. Documentos
  const totalDocs = documentos.length;

  // Pintar Cuadros Resumen KPIs
  // Cuadro 1: Equipos
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, currY, printableWidth, 38, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, currY, printableWidth, 38, 'S');

  doc.setFillColor(15, 23, 42); // Header del cuadro
  doc.rect(margin, currY, printableWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('EQUIPOS E INSTRUMENTOS DE MEDICIÓN', margin + 4, currY + 5);

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Total Activos Registrados: ${totalEquipos} unidades`, margin + 6, currY + 14);
  
  doc.setFillColor(22, 163, 74); // Verde
  doc.rect(margin + 6, currY + 19, 3, 3, 'F');
  doc.text(`Al Día / Operativos: ${eqAlDia} unidades`, margin + 12, currY + 21.5);

  doc.setFillColor(217, 119, 6); // Amarillo
  doc.rect(margin + 6, currY + 25, 3, 3, 'F');
  doc.text(`Próximos a Vencer (Advertencia): ${eqAdvertencia} unidades`, margin + 12, currY + 27.5);

  doc.setFillColor(220, 38, 38); // Rojo
  doc.rect(margin + 6, currY + 31, 3, 3, 'F');
  doc.text(`Expirados / Fuera de Servicio (Críticos): ${eqCriticos} unidades`, margin + 12, currY + 33.5);

  // Cuadro 2: Patrones
  currY += 44;
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, currY, printableWidth, 26, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, currY, printableWidth, 26, 'S');

  doc.setFillColor(88, 28, 135); // Purple 900
  doc.rect(margin, currY, printableWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('PATRONES DE REFERENCIA Y CALIBRACIÓN', margin + 4, currY + 5);

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Total Estándares Certificados: ${totalPatrones} unidades`, margin + 6, currY + 14);

  doc.setFillColor(22, 163, 74); // Verde
  doc.rect(margin + 6, currY + 19, 3, 3, 'F');
  doc.text(`Vigentes: ${patVigentes} unidades`, margin + 12, currY + 21.5);

  doc.setFillColor(220, 38, 38); // Rojo
  doc.rect(margin + 66, currY + 19, 3, 3, 'F');
  doc.text(`Vencidos / Sin Certificado: ${patVencidos} unidades`, margin + 72, currY + 21.5);

  // Cuadro 3: Biblioteca
  currY += 32;
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, currY, printableWidth, 20, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, currY, printableWidth, 20, 'S');

  doc.setFillColor(21, 94, 117); // Cyan 800
  doc.rect(margin, currY, printableWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('BIBLIOTECA DE ENSAYOS Y PROCEDIMIENTOS', margin + 4, currY + 5);

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Total Procedimientos de Calidad Cargados: ${totalDocs} archivos PDF asociados a Equipos.`, margin + 6, currY + 14);

  // ==========================================
  // PÁGINA 2: TABLA DE EQUIPOS E INSTRUMENTOS
  // ==========================================
  doc.addPage();
  currY = 28;
  drawPageHeader('Inventario de Equipos e Instrumentos');

  // Cabecera Tabla Equipos
  const colXEq = {
    codigo: margin + 2,
    nombre: margin + 22,
    ubicacion: margin + 72,
    ultima: margin + 104,
    proxima: margin + 128,
    estado: margin + 152
  };

  doc.setFillColor(30, 41, 59); // Slate 800
  doc.rect(margin, currY, printableWidth, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Código', colXEq.codigo, currY + 5.5);
  doc.text('Nombre del Equipo', colXEq.nombre, currY + 5.5);
  doc.text('Ubicación / Área', colXEq.ubicacion, currY + 5.5);
  doc.text('Última Ver.', colXEq.ultima, currY + 5.5);
  doc.text('Próxima Ver.', colXEq.proxima, currY + 5.5);
  doc.text('Estado', colXEq.estado, currY + 5.5);
  
  currY += 8;

  equiposReporte.forEach((e, idx) => {
    const fechaUltima = e.Fecha_Ultima_Verificacion;
    const fechaProxima = e.Fecha_Proximo_Control;

    // Calculo semáforo real
    const sem = e.Estado === 'NO_APTO' || e.Estado === 'FUERA_DE_SERVICIO' || e.Estado === 'DE_BAJA_OBSOLETO' || e.Estado === 'OBSOLETO' || e.Estado === 'BAJA'
      ? 'ROJO' 
      : calcularSemaforo(fechaProxima, e.Estado);
    const estLabel = semaforoLabel(sem, e.Estado).toUpperCase();
    const estColor = sem === 'VERDE' ? [22, 163, 74] : sem === 'AMARILLO' ? [217, 119, 6] : [220, 38, 38];

    const rowH = 8;
    if (currY + rowH > 270) {
      doc.addPage();
      currY = 28;
      drawPageHeader('Inventario de Equipos e Instrumentos');
      
      // Re-draw table header
      doc.setFillColor(30, 41, 59);
      doc.rect(margin, currY, printableWidth, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text('Código', colXEq.codigo, currY + 5.5);
      doc.text('Nombre del Equipo', colXEq.nombre, currY + 5.5);
      doc.text('Ubicación / Área', colXEq.ubicacion, currY + 5.5);
      doc.text('Última Ver.', colXEq.ultima, currY + 5.5);
      doc.text('Próxima Ver.', colXEq.proxima, currY + 5.5);
      doc.text('Estado', colXEq.estado, currY + 5.5);
      currY += 8;
    }

    const bg = idx % 2 === 0 ? 255 : 248;
    doc.setFillColor(bg, bg, bg);
    doc.rect(margin, currY, printableWidth, rowH, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, currY + rowH, margin + printableWidth, currY + rowH);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(e.Codigo_Interno || e.ID_Equipo || '', colXEq.codigo, currY + 5.2);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text((e.Nombre_Equipo || '').substring(0, 28), colXEq.nombre, currY + 5.2);
    doc.text((e.Area_Asignada || '—').substring(0, 18), colXEq.ubicacion, currY + 5.2);
    doc.text(formatFecha(fechaUltima), colXEq.ultima, currY + 5.2);
    doc.text(formatFecha(fechaProxima), colXEq.proxima, currY + 5.2);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(estColor[0], estColor[1], estColor[2]);
    doc.text(estLabel, colXEq.estado, currY + 5.2);

    currY += rowH;
  });

  // ==========================================
  // PÁGINA X: TABLA DE PATRONES DE REFERENCIA
  // ==========================================
  doc.addPage();
  currY = 28;
  drawPageHeader('Patrones de Referencia');

  const colXPat = {
    codigo: margin + 2,
    nombre: margin + 22,
    laboratorio: margin + 74,
    certificado: margin + 110,
    vencimiento: margin + 138,
    estado: margin + 160
  };

  doc.setFillColor(30, 41, 59); // Slate 800
  doc.rect(margin, currY, printableWidth, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Código', colXPat.codigo, currY + 5.5);
  doc.text('Nombre del Patrón', colXPat.nombre, currY + 5.5);
  doc.text('Laboratorio Cal.', colXPat.laboratorio, currY + 5.5);
  doc.text('N° Certificado', colXPat.certificado, currY + 5.5);
  doc.text('Vence Cert.', colXPat.vencimiento, currY + 5.5);
  doc.text('Estado', colXPat.estado, currY + 5.5);

  currY += 8;

  patrones.forEach((p, idx) => {
    const isVig = p.Estado_Vigencia === 'VIGENTE';
    const estLabel = isVig ? 'VIGENTE' : 'VENCIDO';
    const estColor = isVig ? [22, 163, 74] : [220, 38, 38];

    const rowH = 8;
    if (currY + rowH > 270) {
      doc.addPage();
      currY = 28;
      drawPageHeader('Patrones de Referencia');

      doc.setFillColor(30, 41, 59);
      doc.rect(margin, currY, printableWidth, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text('Código', colXPat.codigo, currY + 5.5);
      doc.text('Nombre del Patrón', colXPat.nombre, currY + 5.5);
      doc.text('Laboratorio Cal.', colXPat.laboratorio, currY + 5.5);
      doc.text('N° Certificado', colXPat.certificado, currY + 5.5);
      doc.text('Vence Cert.', colXPat.vencimiento, currY + 5.5);
      doc.text('Estado', colXPat.estado, currY + 5.5);
      currY += 8;
    }

    const bg = idx % 2 === 0 ? 255 : 248;
    doc.setFillColor(bg, bg, bg);
    doc.rect(margin, currY, printableWidth, rowH, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, currY + rowH, margin + printableWidth, currY + rowH);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(p.Codigo || p.ID_Patron || '', colXPat.codigo, currY + 5.2);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text((p.Nombre_Patron || '').substring(0, 26), colXPat.nombre, currY + 5.2);
    doc.text((p.Proveedor_Laboratorio || '—').substring(0, 18), colXPat.laboratorio, currY + 5.2);
    doc.text(p.N_Certificado || '—', colXPat.certificado, currY + 5.2);
    doc.text(formatFecha(p.Fecha_Vencimiento_Certificado), colXPat.vencimiento, currY + 5.2);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(estColor[0], estColor[1], estColor[2]);
    doc.text(estLabel, colXPat.estado, currY + 5.2);

    currY += rowH;
  });

  // ==========================================
  // PÁGINA X: TABLA DE DOCUMENTOS DE ENSAYO
  // ==========================================
  doc.addPage();
  currY = 28;
  drawPageHeader('Biblioteca de Ensayos y Procedimientos');

  const colXDoc = {
    nombre: margin + 4,
    norma: margin + 85,
    equipo: margin + 125
  };

  doc.setFillColor(30, 41, 59); // Slate 800
  doc.rect(margin, currY, printableWidth, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('Procedimiento / Ensayo', colXDoc.nombre, currY + 5.5);
  doc.text('Norma de Referencia', colXDoc.norma, currY + 5.5);
  doc.text('Equipo Relacionado', colXDoc.equipo, currY + 5.5);

  currY += 8;

  if (documentos.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text('No hay documentos registrados en la biblioteca de ensayos.', margin + 10, currY + 8);
  } else {
    documentos.forEach((d, idx) => {
      const rowH = 8;
      if (currY + rowH > 270) {
        doc.addPage();
        currY = 28;
        drawPageHeader('Biblioteca de Ensayos y Procedimientos');

        doc.setFillColor(30, 41, 59);
        doc.rect(margin, currY, printableWidth, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text('Procedimiento / Ensayo', colXDoc.nombre, currY + 5.5);
        doc.text('Norma de Referencia', colXDoc.norma, currY + 5.5);
        doc.text('Equipo Relacionado', colXDoc.equipo, currY + 5.5);
        currY += 8;
      }

      const bg = idx % 2 === 0 ? 255 : 248;
      doc.setFillColor(bg, bg, bg);
      doc.rect(margin, currY, printableWidth, rowH, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, currY + rowH, margin + printableWidth, currY + rowH);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text((d.Nombre_Ensayo || '').substring(0, 45), colXDoc.nombre, currY + 5.2);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(d.Norma || '—', colXDoc.norma, currY + 5.2);
      
      const eqCode = d.equipo?.Codigo_Interno || d.FK_ID_Equipo || '—';
      const eqNombre = d.equipo?.Nombre_Equipo ? ` - ${d.equipo.Nombre_Equipo}` : '';
      doc.text(`${eqCode}${eqNombre}`.substring(0, 30), colXDoc.equipo, currY + 5.2);

      currY += rowH;
    });
  }

  // ==========================================
  // GENERAL: CONSTRUIR PIES DE PÁGINA
  // ==========================================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    drawPageFooter(i, totalPages);
  }

  doc.save(`REPORTE_METROLOGICO_GENERAL_${new Date().getDate()}_${new Date().getMonth() + 1}_${new Date().getFullYear()}.pdf`);
}

