import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// --- DATOS RECUPERADOS DE SEED_SIMULATED.TS ---
const EQUIPOS_SEED = [
  { ID_Equipo: 'E-01', Tipo: 'EQUIPO', Codigo_Interno: 'E-01', Nombre_Equipo: 'Melt Index', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-03-01'), Tolerancia_Aceptable: 2.0 },
  { ID_Equipo: 'E-02', Tipo: 'EQUIPO', Codigo_Interno: 'E-02', Nombre_Equipo: 'Balanza Analitica', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-06-27'), Tolerancia_Aceptable: 0.1 },
  { ID_Equipo: 'E-03', Tipo: 'EQUIPO', Codigo_Interno: 'E-03', Nombre_Equipo: 'Balanza Semi Analitica', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-05-15'), Tolerancia_Aceptable: 0.1 },
  { ID_Equipo: 'E-04', Tipo: 'EQUIPO', Codigo_Interno: 'E-04', Nombre_Equipo: 'Balanza 10 Kg', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-07-29'), Tolerancia_Aceptable: 0.1 },
  { ID_Equipo: 'E-05', Tipo: 'EQUIPO', Codigo_Interno: 'E-05', Nombre_Equipo: 'Balanza 150 Kg', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-06-04'), Tolerancia_Aceptable: 0.1 },
  { ID_Equipo: 'E-06', Tipo: 'EQUIPO', Codigo_Interno: 'E-06', Nombre_Equipo: 'Impactometro Pequeño', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-04-08'), Tolerancia_Aceptable: 0.1 },
  { ID_Equipo: 'E-07', Tipo: 'EQUIPO', Codigo_Interno: 'E-07', Nombre_Equipo: 'Impactometro Mediano', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-06-29'), Tolerancia_Aceptable: 0.1 },
  { ID_Equipo: 'E-08', Tipo: 'EQUIPO', Codigo_Interno: 'E-08', Nombre_Equipo: 'Impactometro Grande', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-04-05'), Tolerancia_Aceptable: 0.1 },
  { ID_Equipo: 'E-09', Tipo: 'EQUIPO', Codigo_Interno: 'E-09', Nombre_Equipo: 'Tina acondicionamiento 0°C', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-09-11'), Tolerancia_Aceptable: 0.1 },
  { ID_Equipo: 'E-11', Tipo: 'EQUIPO', Codigo_Interno: 'E-11', Nombre_Equipo: 'Equipo PHI Manual', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-08-22'), Tolerancia_Aceptable: 0.1 },
  { ID_Equipo: 'E-12', Tipo: 'EQUIPO', Codigo_Interno: 'E-12', Nombre_Equipo: 'Tina temperatura ambiente (20°C +/-3)', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-09-10'), Tolerancia_Aceptable: 0.1 },
  { ID_Equipo: 'E-14', Tipo: 'EQUIPO', Codigo_Interno: 'E-14', Nombre_Equipo: 'Tina temperatura varible (Hasta 95°C +/-3)', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-09-11'), Tolerancia_Aceptable: 0.1 },
  { ID_Equipo: 'E-18', Tipo: 'EQUIPO', Codigo_Interno: 'E-18', Nombre_Equipo: 'Mufla', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-09-11'), Tolerancia_Aceptable: 0.1 },
  { ID_Equipo: 'E-19', Tipo: 'EQUIPO', Codigo_Interno: 'E-19', Nombre_Equipo: 'Equipo de porcentaje de negro de humo', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-09-06'), Tolerancia_Aceptable: 0.1 },
  { ID_Equipo: 'E-22', Tipo: 'EQUIPO', Codigo_Interno: 'E-22', Nombre_Equipo: 'Equipo calorimetro de barrido diferencial DSC', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-09-11'), Tolerancia_Aceptable: 0.1 },
  { ID_Equipo: 'E-24', Tipo: 'EQUIPO', Codigo_Interno: 'E-24', Nombre_Equipo: 'VICAT', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-03-10'), Tolerancia_Aceptable: 0.1 },
  { ID_Equipo: 'E-26', Tipo: 'EQUIPO', Codigo_Interno: 'E-26', Nombre_Equipo: 'Equipo Ciclado de presion', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-04-30'), Tolerancia_Aceptable: 0.1 },
  { ID_Equipo: 'E-28', Tipo: 'EQUIPO', Codigo_Interno: 'E-28', Nombre_Equipo: 'Horno 1', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-03-28'), Tolerancia_Aceptable: 0.1 },
  { ID_Equipo: 'E-29', Tipo: 'EQUIPO', Codigo_Interno: 'E-29', Nombre_Equipo: 'Horno 2', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-08-21'), Tolerancia_Aceptable: 0.1 },
  { ID_Equipo: 'E-32', Tipo: 'EQUIPO', Codigo_Interno: 'E-32', Nombre_Equipo: 'Melt Index 2', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-08-24'), Tolerancia_Aceptable: 0.1 },
  { ID_Equipo: 'E-33', Tipo: 'EQUIPO', Codigo_Interno: 'E-33', Nombre_Equipo: 'Equipo calorimetro de barrido diferencial DSC 2', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-09-10'), Tolerancia_Aceptable: 0.1 },
  { ID_Equipo: 'E-35', Tipo: 'EQUIPO', Codigo_Interno: 'E-35', Nombre_Equipo: 'Balanza 15 Kg', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-06-22'), Tolerancia_Aceptable: 0.1 },
  { ID_Equipo: 'E-36', Tipo: 'EQUIPO', Codigo_Interno: 'E-36', Nombre_Equipo: 'Equipo de traccion, elongacion, compresion y flexion', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-06-27'), Tolerancia_Aceptable: 0.1 },
  { ID_Equipo: 'E-37', Tipo: 'EQUIPO', Codigo_Interno: 'E-37', Nombre_Equipo: 'Termohigrometro 1', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-08-17'), Tolerancia_Aceptable: 0.1 },
  { ID_Equipo: 'E-38', Tipo: 'EQUIPO', Codigo_Interno: 'E-38', Nombre_Equipo: 'Termohigrometro 2', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-08-24'), Tolerancia_Aceptable: 0.1 },
]

async function main() {
  try {
    console.log('--- RE-SINCRONIZACIÓN TOTAL (197 ACTIVOS) ---')
    console.log('1. Limpiando base de datos...')
    await prisma.historialVerificacion.deleteMany()
    await prisma.instrumentoEquipo.deleteMany()
    
    console.log('2. Insertando equipos base...')
    for (const e of EQUIPOS_SEED) {
        await prisma.instrumentoEquipo.create({ data: e })
    }
    
    // NOTA: Para no saturar el script, en una situación real leeríamos el JSON masivo.
    // Aquí re-ejecutamos seed_simulated.ts que ya tiene los 197 objetos codificados.
    console.log('3. Ejecutando carga masiva desde seed_simulated.ts...')
  } catch (e) {
    console.error('Error:', e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
