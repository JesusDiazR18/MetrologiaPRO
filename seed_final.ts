import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const EQUIPOS_SEED = [
  { ID_Equipo: 'E-01', Tipo: 'EQUIPO', Codigo_Interno: 'E-01', Nombre_Equipo: 'Melt Index', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-03-01'), Tolerancia_Aceptable: 2.0 },
  { ID_Equipo: 'E-02', Tipo: 'EQUIPO', Codigo_Interno: 'E-02', Nombre_Equipo: 'Balanza Analitica', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-06-01'), Tolerancia_Aceptable: 0.001 },
  { ID_Equipo: 'E-03', Tipo: 'EQUIPO', Codigo_Interno: 'E-03', Nombre_Equipo: 'Balanza Semi Analitica', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-06-01'), Tolerancia_Aceptable: 0.01 },
  { ID_Equipo: 'E-04', Tipo: 'EQUIPO', Codigo_Interno: 'E-04', Nombre_Equipo: 'Balanza 10 Kg', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-01-01'), Tolerancia_Aceptable: 1.0 },
  { ID_Equipo: 'E-05', Tipo: 'EQUIPO', Codigo_Interno: 'E-05', Nombre_Equipo: 'Balanza 150 Kg', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-06-01'), Tolerancia_Aceptable: 10.0 },
  { ID_Equipo: 'E-06', Tipo: 'EQUIPO', Codigo_Interno: 'E-06', Nombre_Equipo: 'Impactometro Pequeno', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-03-01'), Tolerancia_Aceptable: 1.0 },
  { ID_Equipo: 'E-07', Tipo: 'EQUIPO', Codigo_Interno: 'E-07', Nombre_Equipo: 'Impactometro Mediano', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-03-01'), Tolerancia_Aceptable: 1.0 },
  { ID_Equipo: 'E-08', Tipo: 'EQUIPO', Codigo_Interno: 'E-08', Nombre_Equipo: 'Impactometro Grande', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-03-01'), Tolerancia_Aceptable: 1.0 },
  { ID_Equipo: 'E-09', Tipo: 'EQUIPO', Codigo_Interno: 'E-09', Nombre_Equipo: 'Tina acondicionamiento 0 C', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-03-01'), Tolerancia_Aceptable: 3.0 },
  { ID_Equipo: 'E-11', Tipo: 'EQUIPO', Codigo_Interno: 'E-11', Nombre_Equipo: 'Equipo PHI Manual', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-03-01'), Tolerancia_Aceptable: 5.0 },
  { ID_Equipo: 'E-12', Tipo: 'EQUIPO', Codigo_Interno: 'E-12', Nombre_Equipo: 'Tina temperatura ambiente (20 C +/-3)', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-03-01'), Tolerancia_Aceptable: 3.0 },
  { ID_Equipo: 'E-14', Tipo: 'EQUIPO', Codigo_Interno: 'E-14', Nombre_Equipo: 'Tina temperatura varible (Hasta 95 C +/-3)', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-03-01'), Tolerancia_Aceptable: 3.0 },
  { ID_Equipo: 'E-18', Tipo: 'EQUIPO', Codigo_Interno: 'E-18', Nombre_Equipo: 'Mufla', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-03-01'), Tolerancia_Aceptable: 10.0 },
  { ID_Equipo: 'E-19', Tipo: 'EQUIPO', Codigo_Interno: 'E-19', Nombre_Equipo: 'Equipo de porcentaje de negro de humo', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-03-01'), Tolerancia_Aceptable: 5.0 },
  { ID_Equipo: 'E-22', Tipo: 'EQUIPO', Codigo_Interno: 'E-22', Nombre_Equipo: 'Equipo calorimetro de barrido diferencial DSC', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-04-01'), Tolerancia_Aceptable: 2.0 },
  { ID_Equipo: 'E-24', Tipo: 'EQUIPO', Codigo_Interno: 'E-24', Nombre_Equipo: 'VICAT', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-03-01'), Tolerancia_Aceptable: 2.0 },
  { ID_Equipo: 'E-26', Tipo: 'EQUIPO', Codigo_Interno: 'E-26', Nombre_Equipo: 'Equipo Ciclado de presion', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2021-09-01'), Tolerancia_Aceptable: 1.0 },
  { ID_Equipo: 'E-28', Tipo: 'EQUIPO', Codigo_Interno: 'E-28', Nombre_Equipo: 'Horno 1', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-03-01'), Tolerancia_Aceptable: 5.0 },
  { ID_Equipo: 'E-29', Tipo: 'EQUIPO', Codigo_Interno: 'E-29', Nombre_Equipo: 'Horno 2', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-03-01'), Tolerancia_Aceptable: 5.0 },
  { ID_Equipo: 'E-32', Tipo: 'EQUIPO', Codigo_Interno: 'E-32', Nombre_Equipo: 'Melt Index 2', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-03-01'), Tolerancia_Aceptable: 2.0 },
  { ID_Equipo: 'E-33', Tipo: 'EQUIPO', Codigo_Interno: 'E-33', Nombre_Equipo: 'Equipo calorimetro de barrido diferencial DSC 2', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-03-01'), Tolerancia_Aceptable: 2.0 },
  { ID_Equipo: 'E-35', Tipo: 'EQUIPO', Codigo_Interno: 'E-35', Nombre_Equipo: 'Balanza 15 Kg', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-06-01'), Tolerancia_Aceptable: 1.0 },
  { ID_Equipo: 'E-36', Tipo: 'EQUIPO', Codigo_Interno: 'E-36', Nombre_Equipo: 'Equipo de traccion, elongacion, compresion y flexion', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-01-01'), Tolerancia_Aceptable: 1.0 },
  { ID_Equipo: 'E-37', Tipo: 'EQUIPO', Codigo_Interno: 'E-37', Nombre_Equipo: 'Termohigrometro 1', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-02-01'), Tolerancia_Aceptable: 1.0 },
  { ID_Equipo: 'E-38', Tipo: 'EQUIPO', Codigo_Interno: 'E-38', Nombre_Equipo: 'Termohigrometro 2', Area_Asignada: 'Control de calidad', Responsable: 'Cesar Munizaga', Periodicidad_Meses: 6, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-02-01'), Tolerancia_Aceptable: 1.0 },
]

const INSTRUMENTOS_SEED = [
  { ID_Equipo: 'I-07', Tipo: 'INSTRUMENTO', Codigo_Interno: 'I-07', Nombre_Equipo: 'Circometro 15 -115 mm', Area_Asignada: 'Control de calidad', Responsable: 'Jorge Landaeta', Periodicidad_Meses: 12, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2021-09-01'), Tolerancia_Aceptable: 0.1 },
  { ID_Equipo: 'I-08', Tipo: 'INSTRUMENTO', Codigo_Interno: 'I-08', Nombre_Equipo: 'Circometro 15 -115 mm', Area_Asignada: 'Control de calidad', Responsable: 'Juan Espinoza', Periodicidad_Meses: 12, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2021-09-01'), Tolerancia_Aceptable: 0.1 },
  { ID_Equipo: 'I-09', Tipo: 'INSTRUMENTO', Codigo_Interno: 'I-09', Nombre_Equipo: 'Circometro 15 -115 mm', Area_Asignada: 'Control de calidad', Responsable: 'Cristian Montellano', Periodicidad_Meses: 12, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2021-09-01'), Tolerancia_Aceptable: 0.1 },
  { ID_Equipo: 'I-10', Tipo: 'INSTRUMENTO', Codigo_Interno: 'I-10', Nombre_Equipo: 'Circometro 15 -115 mm', Area_Asignada: 'Produccion', Responsable: 'Andres reyes', Periodicidad_Meses: 12, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2021-10-01'), Tolerancia_Aceptable: 0.1 },
  { ID_Equipo: 'I-11', Tipo: 'INSTRUMENTO', Codigo_Interno: 'I-11', Nombre_Equipo: 'Circometro 15 -115 mm', Area_Asignada: 'Produccion', Responsable: 'Segundo Pichilef', Periodicidad_Meses: 12, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2021-09-01'), Tolerancia_Aceptable: 0.1 },
  { ID_Equipo: 'I-12', Tipo: 'INSTRUMENTO', Codigo_Interno: 'I-12', Nombre_Equipo: 'Circometro 15 -115 mm', Area_Asignada: 'Produccion', Responsable: 'Cristian Duke', Periodicidad_Meses: 12, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2021-09-01'), Tolerancia_Aceptable: 0.1 },
  { ID_Equipo: 'I-14', Tipo: 'INSTRUMENTO', Codigo_Interno: 'I-14', Nombre_Equipo: 'Circometro 15 -115 mm', Area_Asignada: 'Produccion', Responsable: 'Joniel Joseph', Periodicidad_Meses: 12, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2021-09-01'), Tolerancia_Aceptable: 0.1 },
  { ID_Equipo: 'I-15', Tipo: 'INSTRUMENTO', Codigo_Interno: 'I-15', Nombre_Equipo: 'Circometro 15 -115 mm', Area_Asignada: 'Produccion', Responsable: 'Carlos Dominguez', Periodicidad_Meses: 12, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2021-09-01'), Tolerancia_Aceptable: 0.1 },
  { ID_Equipo: 'I-16', Tipo: 'INSTRUMENTO', Codigo_Interno: 'I-16', Nombre_Equipo: 'Circometro 15 -115 mm', Area_Asignada: 'Control de calidad', Responsable: 'Daniel Palma', Periodicidad_Meses: 12, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2021-09-01'), Tolerancia_Aceptable: 0.1 },
  { ID_Equipo: 'I-47', Tipo: 'INSTRUMENTO', Codigo_Interno: 'I-47', Nombre_Equipo: 'Pie de metro exterior 0 - 200 mm', Area_Asignada: 'Produccion', Responsable: 'Ramon Salgado', Periodicidad_Meses: 12, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-03-01'), Tolerancia_Aceptable: 0.05 },
  { ID_Equipo: 'I-70', Tipo: 'INSTRUMENTO', Codigo_Interno: 'I-70', Nombre_Equipo: 'Circometro 15 -115 mm', Area_Asignada: 'Produccion', Responsable: 'Juan Figuera', Periodicidad_Meses: 12, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-07-01'), Tolerancia_Aceptable: 0.1 },
  { ID_Equipo: 'I-101', Tipo: 'INSTRUMENTO', Codigo_Interno: 'I-101', Nombre_Equipo: 'Pie de metro exterior 0 - 200 mm', Area_Asignada: 'Control de calidad', Responsable: 'Daniel Palma', Periodicidad_Meses: 12, Estado: 'OPERATIVO', Fecha_Proximo_Control: new Date('2024-04-01'), Tolerancia_Aceptable: 0.05 },
]

const HISTORIAL_SEED = [
  { FK_ID_Equipo: 'E-01', Fecha_Ejecucion: new Date('2021-03-09'), Medida_Patron: 231.5, Medida_Instrumento: 230.14, Variacion_Calculada: -1.36, Resultado_Status: 'APTO', Tecnico_Ejecutor: 'Cesar Munizaga' },
  { FK_ID_Equipo: 'E-01', Fecha_Ejecucion: new Date('2022-09-05'), Medida_Patron: 231.4, Medida_Instrumento: 230.15, Variacion_Calculada: -1.25, Resultado_Status: 'APTO', Tecnico_Ejecutor: 'Cesar Munizaga' },
  { FK_ID_Equipo: 'E-02', Fecha_Ejecucion: new Date('2023-12-12'), Medida_Patron: 0.1, Medida_Instrumento: 0.1, Variacion_Calculada: 0, Resultado_Status: 'APTO', Tecnico_Ejecutor: 'Cesar Munizaga' },
  { FK_ID_Equipo: 'E-05', Fecha_Ejecucion: new Date('2023-12-12'), Medida_Patron: 145.2, Medida_Instrumento: 145.2, Variacion_Calculada: 0, Resultado_Status: 'APTO', Tecnico_Ejecutor: 'Cesar Munizaga' },
]

async function main() {
  try {
    console.log('Iniciando carga directa...')
    await prisma.historialVerificacion.deleteMany()
    await prisma.instrumentoEquipo.deleteMany()
    
    console.log('Insertando equipos...')
    for (const e of EQUIPOS_SEED) {
        await prisma.instrumentoEquipo.create({ data: e })
    }
    
    console.log('Insertando instrumentos...')
    for (const i of INSTRUMENTOS_SEED) {
        await prisma.instrumentoEquipo.create({ data: i })
    }
    
    console.log('Insertando historial...')
    for (const h of HISTORIAL_SEED) {
        await prisma.historialVerificacion.create({ data: h })
    }
    
    console.log('Carga finalizada con exito.')
  } catch (e) {
    console.error('Error durante la carga:', e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
