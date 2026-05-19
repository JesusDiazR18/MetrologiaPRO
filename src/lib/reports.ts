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
  return str !== '' && str !== '—' && str !== 'No definida' && str !== 'No asignado' && str !== 'N/A' && str !== 'No definido' && str !== 'Sin fecha' && str !== 'OTRA';
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
  doc.setFontSize(10);
  doc.text(title.toUpperCase(), 23, yPos + 5.5);
  return yPos + 12;
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
    const isLongVal = valStr.length > 35;
    const isFullWidth = isName || isLongVal || item.colSpan === 2;
    
    if (isFullWidth) {
      const w = printableWidth;
      const x = margin;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      const splitVal = doc.splitTextToSize(valStr, w - 38);
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
        if (valStr.toLowerCase().includes('vencido') || valStr.toLowerCase().includes('crítico') || valStr.toLowerCase().includes('baja') || valStr.toLowerCase().includes('no apto')) {
          doc.setTextColor(239, 68, 68);
        } else if (valStr.toLowerCase().includes('detalles') || valStr.toLowerCase().includes('mantenimiento')) {
          doc.setTextColor(245, 158, 11);
        } else {
          doc.setTextColor(16, 185, 129);
        }
      } else {
        doc.setTextColor(15, 23, 42);
      }
      
      splitVal.forEach((line: string, lineIdx: number) => {
        doc.text(line, x + 35, currY + 5.5 + (lineIdx * 4.2));
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
        const splitVal1 = doc.splitTextToSize(valStr, colW - 35);
        const splitVal2 = doc.splitTextToSize(nextValStr, colW - 35);
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
          if (valStr.toLowerCase().includes('vencido') || valStr.toLowerCase().includes('crítico') || valStr.toLowerCase().includes('baja') || valStr.toLowerCase().includes('no apto')) {
            doc.setTextColor(239, 68, 68);
          } else if (valStr.toLowerCase().includes('detalles') || valStr.toLowerCase().includes('mantenimiento')) {
            doc.setTextColor(245, 158, 11);
          } else {
            doc.setTextColor(16, 185, 129);
          }
        } else {
          doc.setTextColor(15, 23, 42);
        }
        splitVal1.forEach((line: string, lineIdx: number) => {
          doc.text(line, margin + 32, currY + 5.5 + (lineIdx * 4.2));
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
          if (nextValStr.toLowerCase().includes('vencido') || nextValStr.toLowerCase().includes('crítico') || nextValStr.toLowerCase().includes('baja') || nextValStr.toLowerCase().includes('no apto')) {
            doc.setTextColor(239, 68, 68);
          } else if (nextValStr.toLowerCase().includes('detalles') || nextValStr.toLowerCase().includes('mantenimiento')) {
            doc.setTextColor(245, 158, 11);
          } else {
            doc.setTextColor(16, 185, 129);
          }
        } else {
          doc.setTextColor(15, 23, 42);
        }
        splitVal2.forEach((line: string, lineIdx: number) => {
          doc.text(line, x2 + 32, currY + 5.5 + (lineIdx * 4.2));
        });
        
        currY += boxHeight + 2.5;
        i += 2;
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        const splitVal = doc.splitTextToSize(valStr, colW - 35);
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
          if (valStr.toLowerCase().includes('vencido') || valStr.toLowerCase().includes('crítico') || valStr.toLowerCase().includes('baja') || valStr.toLowerCase().includes('no apto')) {
            doc.setTextColor(239, 68, 68);
          } else if (valStr.toLowerCase().includes('detalles') || valStr.toLowerCase().includes('mantenimiento')) {
            doc.setTextColor(245, 158, 11);
          } else {
            doc.setTextColor(16, 185, 129);
          }
        } else {
          doc.setTextColor(15, 23, 42);
        }
        splitVal.forEach((line: string, lineIdx: number) => {
          doc.text(line, margin + 32, currY + 5.5 + (lineIdx * 4.2));
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

  // --- Encabezado Premium ---
  doc.setFillColor(15, 23, 42); // Navy premium oscuro
  doc.rect(0, 0, pageWidth, 42, 'F');
  doc.setFillColor(0, 229, 255); // Franja inferior cyan
  doc.rect(0, 42, pageWidth, 1.5, 'F');
  
  let titleStartX = 16;
  if (logoBase64) {
    try {
      const maxLogoW = 36;
      const maxLogoH = 26;
      const aspect = logoBase64.width / logoBase64.height;
      let logoW = maxLogoW;
      let logoH = maxLogoW / aspect;
      if (logoH > maxLogoH) {
        logoH = maxLogoH;
        logoW = maxLogoH * aspect;
      }
      const logoY = (42 - logoH) / 2;
      doc.addImage(logoBase64.data, logoBase64.format, 16, logoY, logoW, logoH);
      titleStartX = 16 + logoW + 6;
    } catch(e) {
      console.error("Error dibujando logo:", e);
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('FICHA TÉCNICA DE ACTIVO', titleStartX, 21);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text('SISTEMA INTEGRAL DE GESTIÓN QMS PRO · METROLOGÍA INDUSTRIAL', titleStartX, 28);

  // Cuadro derecho del encabezado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 229, 255);
  doc.text(`ID: ${equipo.Codigo_Interno}`, 194, 21, { align: 'right' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`Emisión: ${formatFecha(new Date().toISOString())}`, 194, 28, { align: 'right' });
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('ISO 9001:2015 Compliant', 194, 33, { align: 'right' });

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

  const rawMetrologyItems = [
    { label: 'Tolerancia Admitida:', value: equipo.Tolerancia_Aceptable != null ? `± ${equipo.Tolerancia_Aceptable} ${equipo.Unidad_Tolerancia ?? ''}` : null },
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

    // Cabecera
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, currY, printableWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Fecha Control', margin + 4, currY + 5.5);
    doc.text('Técnico Responsable', margin + 32, currY + 5.5);
    doc.text('Variación', margin + 85, currY + 5.5);
    doc.text('Resultado', margin + 112, currY + 5.5);
    doc.text('Observaciones / Notas', margin + 136, currY + 5.5);

    currY += 8;

    equipo.historiales.slice(0, 8).forEach((h: any, idx: number) => {
      if (currY + 10 > 275) { doc.addPage(); currY = 20; }
      
      const bg = idx % 2 === 0 ? 255 : 248;
      doc.setFillColor(bg, bg, bg);
      doc.rect(margin, currY, printableWidth, 8, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, currY + 8, margin + printableWidth, currY + 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(formatFecha(h.Fecha_Ejecucion), margin + 4, currY + 5.5);
      doc.text(h.Tecnico_Ejecutor.substring(0, 24), margin + 32, currY + 5.5);
      doc.text(h.Variacion_Calculada?.toFixed(4) || '—', margin + 85, currY + 5.5);

      if (h.Resultado_Status === 'APTO') {
        doc.setTextColor(16, 185, 129);
      } else {
        doc.setTextColor(239, 68, 68);
      }
      doc.setFont('helvetica', 'bold');
      doc.text(h.Resultado_Status, margin + 112, currY + 5.5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text((h.Observaciones || '—').substring(0, 30), margin + 136, currY + 5.5);

      currY += 8;
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
    doc.text('Sistema Integral de Gestión QMS Pro · Documento de Control Metrológico Oficial', margin, 287);
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

  // Encabezado Púrpura Premium
  doc.setFillColor(88, 28, 135); // Deep Purple 900
  doc.rect(0, 0, pageWidth, 42, 'F');
  doc.setFillColor(192, 132, 252); // Franja inferior lila
  doc.rect(0, 42, pageWidth, 1.5, 'F');
  
  let titleStartX = 16;
  if (logoBase64) {
    try {
      const maxLogoW = 36;
      const maxLogoH = 26;
      const aspect = logoBase64.width / logoBase64.height;
      let logoW = maxLogoW;
      let logoH = maxLogoW / aspect;
      if (logoH > maxLogoH) {
        logoH = maxLogoH;
        logoW = maxLogoH * aspect;
      }
      const logoY = (42 - logoH) / 2;
      doc.addImage(logoBase64.data, logoBase64.format, 16, logoY, logoW, logoH);
      titleStartX = 16 + logoW + 6;
    } catch(e) {}
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('CERTIFICADO DE PATRÓN', titleStartX, 21);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(233, 213, 255);
  doc.text('QMS PRO · CONTROL DE PATRONES DE REFERENCIA Y ESTÁNDARES', titleStartX, 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(192, 132, 252);
  doc.text(`ID: ${patron.Codigo}`, 194, 21, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`Emisión: ${formatFecha(new Date().toISOString())}`, 194, 28, { align: 'right' });
  doc.setFontSize(8);
  doc.setTextColor(216, 180, 254);
  doc.text('Estándar de Referencia Trazable', 194, 33, { align: 'right' });

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

      if (h.Resultado_Status === 'APTO') {
        doc.setTextColor(16, 185, 129);
      } else {
        doc.setTextColor(239, 68, 68);
      }
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
    doc.text('QMS Pro Metrology · Estándar de Referencia Oficial', margin, 287);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, 287, { align: 'right' });
  }

  doc.save(`PATRON_${patron.Codigo}.pdf`);
}

/**
 * Genera un Reporte Ejecutivo Mensual consolidado del Dashboard.
 */
export async function generateExecutiveSummaryPDF(stats: any) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const margin = 16;
  const printableWidth = 178;

  const logoBase64 = await getBase64FromUrl('/logo.png');

  // Header Azul Corporativo
  doc.setFillColor(30, 64, 175); // Blue 800
  doc.rect(0, 0, pageWidth, 42, 'F');
  doc.setFillColor(96, 165, 250); // Franja inferior azul clara
  doc.rect(0, 42, pageWidth, 1.5, 'F');
  
  let titleStartX = 16;
  if (logoBase64) {
    try {
      const maxLogoW = 36;
      const maxLogoH = 26;
      const aspect = logoBase64.width / logoBase64.height;
      let logoW = maxLogoW;
      let logoH = maxLogoW / aspect;
      if (logoH > maxLogoH) {
        logoH = maxLogoH;
        logoW = maxLogoH * aspect;
      }
      const logoY = (42 - logoH) / 2;
      doc.addImage(logoBase64.data, logoBase64.format, 16, logoY, logoW, logoH);
      titleStartX = 16 + logoW + 6;
    } catch(e) {}
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('REPORTE EJECUTIVO METROLÓGICO', titleStartX, 21);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(219, 234, 254);
  doc.text('SISTEMA INTEGRAL DE GESTIÓN DE CALIDAD Y METROLOGÍA INDUSTRIAL', titleStartX, 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(96, 165, 250);
  doc.text(new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase(), 194, 21, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`Emisión: ${formatFecha(new Date().toISOString())}`, 194, 28, { align: 'right' });

  let currY = 52;

  currY = renderSectionTitle(doc, '1. Resumen Global de Indicadores (KPIs)', currY, [59, 130, 246]);

  const kpis = [
    { label: 'Cumplimiento Global del Sistema:', value: `${stats.complianceGlobal}%` },
    { label: 'Total Activos en Inventario:', value: stats.totalActivos },
    { label: 'Activos en Estado Óptimo (Verde):', value: stats.alDia },
    { label: 'Activos con Vencimiento Próximo (Amarillo):', value: stats.proximos },
    { label: 'Activos fuera de Vigencia (Rojo):', value: stats.vencidos }
  ];

  kpis.forEach(kpi => {
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, currY, printableWidth, 9, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, currY, printableWidth, 9, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text(kpi.label, margin + 4, currY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(kpi.label.includes('Verde') ? '#10b981' : kpi.label.includes('Amarillo') ? '#f59e0b' : kpi.label.includes('Rojo') ? '#ef4444' : '#1e40af');
    doc.text(String(kpi.value), margin + printableWidth - 6, currY + 6, { align: 'right' });
    currY += 11;
  });

  currY += 6;
  currY = renderSectionTitle(doc, '2. Distribución de Inventario Activo', currY, [59, 130, 246]);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text(`El sistema gestiona de forma centralizada ${stats.totalEquipos} equipos e instrumentos de medición y ${stats.totalPatrones} patrones de referencia certificados y vinculados a los planes de calibración.`, margin, currY + 4, { maxWidth: printableWidth });

  currY += 16;

  if (stats.alertasCriticas && stats.alertasCriticas.length > 0) {
    currY = renderSectionTitle(doc, '3. Alertas Críticas de Atención Inmediata', currY, [239, 68, 68]);

    stats.alertasCriticas.slice(0, 6).forEach((a: any) => {
      doc.setFillColor(254, 242, 242); // Red 50
      doc.rect(margin, currY, printableWidth, 10, 'F');
      doc.setDrawColor(254, 202, 202); // Red 200
      doc.rect(margin, currY, printableWidth, 10, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(185, 28, 28);
      doc.text(`[!] ${a.codigo} - ${a.nombre}`, margin + 4, currY + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(127, 29, 29);
      doc.text(`Motivo: ${a.status === 'ROJO' ? 'Control Vencido / Requiere Calibración' : 'Estado NO APTO'}`, margin + 110, currY + 6);
      
      currY += 12;
    });
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, 282, pageWidth - margin, 282);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.text('QMS Pro Executive Management Suite · Reporte de Dirección', margin, 287);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, 287, { align: 'right' });
  }

  doc.save(`REPORTE_EJECUTIVO_${new Date().getMonth() + 1}_${new Date().getFullYear()}.pdf`);
}
