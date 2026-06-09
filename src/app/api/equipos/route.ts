import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') ?? ''
    const tipo = searchParams.get('tipo') ?? ''
    const estado = searchParams.get('estado') ?? ''
    const suggest = searchParams.get('suggestId') === 'true'

    if (suggest && tipo) {
      const prefix = tipo === 'EQUIPO' ? 'E' : 'I'
      const equipos = await prisma.instrumentoEquipo.findMany({
        where: { Tipo: tipo },
        select: { ID_Equipo: true }
      })
      let maxNum = 0
      equipos.forEach(eq => {
        const parts = eq.ID_Equipo.split('-')
        if (parts.length === 2 && parts[0] === prefix) {
          const num = parseInt(parts[1], 10)
          if (!isNaN(num) && num > maxNum) {
            maxNum = num
          }
        }
      })
      const nextId = `${prefix}-${(maxNum + 1).toString().padStart(2, '0')}`
      return NextResponse.json({ nextId })
    }

    console.log(`[API Equipos] GET q="${q}", tipo="${tipo}", estado="${estado}"`)

    const selectLightEquipo = {
      ID_Equipo: true,
      Tipo: true,
      Codigo_Interno: true,
      Nombre_Equipo: true,
      Marca: true,
      Modelo: true,
      Serie: true,
      Rango_Medida: true,
      Resolucion: true,
      Tolerancia_Aceptable: true,
      Unidad_Tolerancia: true,
      Area_Asignada: true,
      Responsable: true,
      Periodicidad_Meses: true,
      Fecha_Ultima_Verificacion: true,
      Fecha_Proximo_Control: true,
      Fecha_Ingreso: true,
      Estado: true,
      Detalles_Estado: true,
      Tiene_Solucion: true,
      Requiere_Seguimiento: true,
      Periodicidad_Seguimiento: true,
      Fecha_Vencimiento_Certificado: true,
      N_Certificado: true,
      Proveedor_Servicio: true,
      Magnitud: true,
      Tolerancias_Multimagnitud: true,
      Accesorios: true,
      Insumos: true,
    }

    const selectLightHistorial = {
      ID_Log: true,
      FK_ID_Equipo: true,
      Fecha_Ejecucion: true,
      FK_ID_Patron_Usado: true,
      Medida_Instrumento: true,
      Medida_Patron: true,
      Variacion_Calculada: true,
      Resultado_Status: true,
      Tecnico_Ejecutor: true,
      Observaciones: true,
      Tipo_Verificacion: true,
      Acciones_Pendientes: true,
      Estado_Seguimiento: true,
      Magnitud_Controlada: true,
      Mediciones_Puntos: true,
    }

    const [equipos, pdfCheck, histCheck] = await Promise.all([
      prisma.instrumentoEquipo.findMany({
        where: {
          AND: [
            q ? {
              OR: [
                { Nombre_Equipo: { contains: q, mode: 'insensitive' as any } },
                { Codigo_Interno: { contains: q, mode: 'insensitive' as any } },
                { Responsable: { contains: q, mode: 'insensitive' as any } },
              ]
            } : {},
            tipo ? { Tipo: tipo } : {},
            estado ? { Estado: estado } : {},
          ]
        },
        orderBy: { Codigo_Interno: 'asc' },
        select: {
          ...selectLightEquipo,
          historiales: {
            select: {
              ...selectLightHistorial,
              patron: {
                select: {
                  Codigo: true,
                  Nombre_Patron: true
                }
              }
            },
            orderBy: { Fecha_Ejecucion: 'desc' },
            take: 15
          }
        }
      }),
      prisma.$queryRaw<Array<{ ID_Equipo: string, Has_PDF: any, Has_Foto: any }>>`
        SELECT "ID_Equipo", 
               ("PDF_Certificado" IS NOT NULL AND "PDF_Certificado" <> '') AS "Has_PDF", 
               ("Foto_Equipo" IS NOT NULL AND "Foto_Equipo" <> '') AS "Has_Foto" 
        FROM "InstrumentoEquipo"
      `,
      prisma.$queryRaw<Array<{ ID_Log: string, Has_PDF: any, Has_Foto: any }>>`
        SELECT "ID_Log", 
               ("PDF_Certificado_interno" IS NOT NULL AND "PDF_Certificado_interno" <> '') AS "Has_PDF", 
               ("Evidencia_Foto" IS NOT NULL AND "Evidencia_Foto" <> '') AS "Has_Foto" 
        FROM "HistorialVerificacion"
      `
    ])

    const eqPdfMap = new Map(pdfCheck.map(x => [x.ID_Equipo, !!x.Has_PDF]))
    const eqFotoMap = new Map(pdfCheck.map(x => [x.ID_Equipo, !!x.Has_Foto]))
    const histPdfMap = new Map(histCheck.map(x => [x.ID_Log, !!x.Has_PDF]))
    const histFotoMap = new Map(histCheck.map(x => [x.ID_Log, !!x.Has_Foto]))

    const processed = equipos.map(e => ({
      ...e,
      PDF_Certificado: eqPdfMap.get(e.ID_Equipo) ? 'dummy_exists' : null,
      Foto_Equipo: eqFotoMap.get(e.ID_Equipo) ? 'dummy_exists' : null,
      historiales: e.historiales.map(h => ({
        ...h,
        PDF_Certificado_interno: histPdfMap.get(h.ID_Log) ? 'dummy_exists' : null,
        Evidencia_Foto: histFotoMap.get(h.ID_Log) ? 'dummy_exists' : null
      }))
    }))

    return NextResponse.json(processed)
  } catch (error: any) {
    console.error('[API Equipos GET Error]:', error)
    // Devolvemos un array vacío para evitar que el frontend falle con .map()
    return NextResponse.json([], { 
      status: 500,
      statusText: error.message 
    })
  }
}

export async function POST(request: Request) {
  let body: any = null
  try {
    body = await request.json()
    console.log('[API Equipos] POST body:', body)
    
    // Si no tiene fecha de última verificación, le asignamos hoy
    const now = new Date()
    const ultima = body.Fecha_Ultima_Verificacion ? new Date(body.Fecha_Ultima_Verificacion) : now
    
    // Calculamos próxima fecha según la periodicidad
    const meses = parseInt(body.Periodicidad_Meses) || 12
    const proximo = body.Fecha_Proximo_Control ? new Date(body.Fecha_Proximo_Control) : new Date(ultima)
    if (!body.Fecha_Proximo_Control) {
      proximo.setMonth(proximo.getMonth() + meses)
    }

    const targetEstado = (body.Estado === 'OBSOLETO' || body.Estado === 'BAJA') ? 'DE_BAJA_OBSOLETO' : (body.Estado || 'OPERATIVO');

    const equipo = await prisma.instrumentoEquipo.create({ 
      data: {
        ...body,
        Estado: targetEstado,
        Detalles_Estado: body.Detalles_Estado ?? null,
        Tiene_Solucion: body.Tiene_Solucion !== undefined ? Boolean(body.Tiene_Solucion) : true,
        Requiere_Seguimiento: body.Requiere_Seguimiento !== undefined ? Boolean(body.Requiere_Seguimiento) : false,
        Fecha_Ultima_Verificacion: ultima,
        Fecha_Proximo_Control: proximo,
        Fecha_Ingreso: body.Fecha_Ingreso ? new Date(body.Fecha_Ingreso) : new Date(),
        Periodicidad_Meses: meses,
        Tolerancia_Aceptable: parseFloat(body.Tolerancia_Aceptable) || 0
      } 
    })
    return NextResponse.json(equipo, { status: 201 })
  } catch (error: any) {
    console.error('[API Equipos POST Error]:', error)
    if (error.code === 'P2002' || error.message?.includes('Unique constraint') || error.message?.includes('ID_Equipo')) {
      return NextResponse.json({ 
        error: `El ID de equipo "${body?.ID_Equipo || ''}" ya está registrado en el sistema. Por favor, asigne un identificador único.` 
      }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
