import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Helper to detect magnitude based on name
function detectMagnitud(name: string): string {
  const lower = name.toLowerCase();
  if (
    lower.includes('circómetro') ||
    lower.includes('circometro') ||
    lower.includes('micrómetro') ||
    lower.includes('micrometro') ||
    lower.includes('pie de metro') ||
    lower.includes('flexómetro') ||
    lower.includes('flexometro')
  ) {
    return 'LONGITUD';
  }
  if (
    lower.includes('termómetro') ||
    lower.includes('termometro') ||
    lower.includes('logger') ||
    lower.includes('termocupla')
  ) {
    return 'TEMPERATURA';
  }
  if (lower.includes('masa') || lower.includes('balanza') || lower.includes('peso')) {
    return 'MASA';
  }
  if (lower.includes('manómetro') || lower.includes('manometro')) {
    return 'PRESION';
  }
  return 'OTRA';
}

async function main() {
  console.log('=== STARTING DATABASE RECOVERY ===');

  const equiposPath = path.join(__dirname, '../../excel_equipos.json');
  const patronesPath = path.join(__dirname, '../../excel_patrones.json');

  if (!fs.existsSync(equiposPath) || !fs.existsSync(patronesPath)) {
    console.error('Error: Clean JSON dumps not found. Run dump_excel_data.py first.');
    process.exit(1);
  }

  const equiposData = JSON.parse(fs.readFileSync(equiposPath, 'utf8'));
  const patronesData = JSON.parse(fs.readFileSync(patronesPath, 'utf8'));

  console.log(`Loaded ${equiposData.length} equipments and ${patronesData.length} patterns from JSON dumps.`);

  // 1. Process Patterns (PatronReferencia)
  console.log('\n--- Seeding Patterns ---');
  for (const row of patronesData) {
    const codeNew = row['Código  nuevo'];
    if (!codeNew) continue;

    const idPatron = codeNew.trim();
    const codigo = codeNew.trim();
    const nombre = row['Nombre del Patrón'] ? row['Nombre del Patrón'].trim() : 'Sin Nombre';
    const nCertificado = row['N° de ültimo Certificado'] ? row['N° de ültimo Certificado'].trim() : null;
    const laboratory = row['Marca'] ? row['Marca'].trim() : 'Laboratorio Externo';

    // Date parsing
    let lastCal: Date | null = null;
    const rawLastCal = row['Última calibración'];
    if (rawLastCal) {
      if (rawLastCal.trim() === '23-01-20243') {
        lastCal = new Date('2024-01-23');
      } else {
        const parsedDate = new Date(rawLastCal);
        if (!isNaN(parsedDate.getTime())) {
          lastCal = parsedDate;
        }
      }
    }

    // Expiration date (3 years after last calibration)
    let nextCal: Date | null = null;
    if (lastCal) {
      nextCal = new Date(lastCal);
      nextCal.setFullYear(nextCal.getFullYear() + 3);
    }

    // Vigencia
    let vigencia = 'SIN CERTIFICADO';
    if (lastCal && nextCal) {
      const now = new Date();
      vigencia = nextCal.getTime() < now.getTime() ? 'VENCIDO' : 'VIGENTE';
    }

    const magnitude = detectMagnitud(nombre);

    const patronData = {
      Codigo: codigo,
      Nombre_Patron: nombre,
      Fecha_Calibracion_Externa: lastCal,
      Fecha_Vencimiento_Certificado: nextCal,
      N_Certificado: nCertificado,
      Proveedor_Laboratorio: laboratory,
      Estado_Vigencia: vigencia,
      Magnitud: magnitude,
    };

    console.log(`Upserting pattern ${idPatron}: "${nombre}" - Status: ${vigencia} - Mag: ${magnitude}`);
    await prisma.patronReferencia.upsert({
      where: { ID_Patron: idPatron },
      update: patronData,
      create: {
        ID_Patron: idPatron,
        ...patronData,
      },
    });
  }

  // 2. Process Equipments (InstrumentoEquipo)
  console.log('\n--- Seeding Equipments ---');
  for (const row of equiposData) {
    const code = row['CODIGO'];
    if (!code) continue;

    const idEquipo = code.trim();
    const nombre = row['EQUIPOS'] ? row['EQUIPOS'].trim() : 'Sin Nombre';

    // Map Estado
    let estado = 'OPERATIVO';
    const rawEstado = row['Estado'] ? row['Estado'].toLowerCase() : '';
    const rawComentario = row['Otro comentario'] ? row['Otro comentario'].toLowerCase() : '';
    const rawObs = row['observacion'] ? row['observacion'].toLowerCase() : '';

    if (rawEstado.includes('detalle')) {
      estado = 'OPERATIVO_CON_DETALLES';
    } else if (rawEstado.includes('no operativo')) {
      if (
        rawComentario.includes('baja') ||
        rawComentario.includes('obsoleto') ||
        rawObs.includes('baja') ||
        rawObs.includes('obsoleto')
      ) {
        estado = 'DE_BAJA_OBSOLETO';
      } else {
        estado = 'FUERA_DE_SERVICIO';
      }
    }

    // Build Detalles_Estado (observacion + tiene reparacion + otro comentario)
    let detalles = row['observacion'] || '';
    if (row['Tiene reparación?']) {
      detalles += `\n¿Tiene reparación?: ${row['Tiene reparación?']}`;
    }
    if (row['Otro comentario']) {
      detalles += `\nComentario: ${row['Otro comentario']}`;
    }
    detalles = detalles.trim() || null;

    const accesorios = row['Accesorios del equipo'] ? row['Accesorios del equipo'].trim() : null;
    const insumos = row['Insumos que consume el equipo'] ? row['Insumos que consume el equipo'].trim() : null;

    const existing = await prisma.instrumentoEquipo.findUnique({
      where: { ID_Equipo: idEquipo },
    });

    if (existing) {
      console.log(`Updating existing equipment ${idEquipo}: "${nombre}" - Status: ${estado}`);
      await prisma.instrumentoEquipo.update({
        where: { ID_Equipo: idEquipo },
        data: {
          Nombre_Equipo: nombre,
          Estado: estado,
          Accesorios: accesorios,
          Insumos: insumos,
          Detalles_Estado: detalles,
        },
      });
    } else {
      console.log(`Creating new equipment ${idEquipo}: "${nombre}" - Status: ${estado}`);
      await prisma.instrumentoEquipo.create({
        data: {
          ID_Equipo: idEquipo,
          Tipo: 'EQUIPO',
          Codigo_Interno: idEquipo,
          Nombre_Equipo: nombre,
          Estado: estado,
          Accesorios: accesorios,
          Insumos: insumos,
          Detalles_Estado: detalles,
          Tolerancia_Aceptable: 1.0,
          Periodicidad_Meses: 6,
          Area_Asignada: 'Control de calidad',
          Responsable: 'Cesar Munizaga',
          Tiene_Solucion: true,
          Requiere_Seguimiento: false,
        },
      });
    }
  }

  console.log('\n=== DATABASE RECOVERY COMPLETED SUCCESSFULLY ===');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
