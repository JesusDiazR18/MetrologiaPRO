import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const ensayos = await prisma.documentoEnsayo.findMany({
      include: {
        equipo: {
          select: {
            Codigo_Interno: true,
            Nombre_Equipo: true
          }
        }
      },
      orderBy: { Creado_En: 'desc' }
    })
    return NextResponse.json(ensayos)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { Nombre_Ensayo, Norma, PDF, FK_ID_Equipo } = body

    if (!Nombre_Ensayo || !PDF || !FK_ID_Equipo) {
      return NextResponse.json(
        { error: 'Faltan datos obligatorios (Nombre_Ensayo, PDF, FK_ID_Equipo)' },
        { status: 400 }
      )
    }

    const nuevo = await prisma.documentoEnsayo.create({
      data: {
        Nombre_Ensayo,
        Norma: Norma || null,
        PDF_Url: PDF,
        FK_ID_Equipo
      }
    })

    return NextResponse.json(nuevo)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const ensayoId = searchParams.get('ensayoId')

    if (!ensayoId) {
      return NextResponse.json({ error: 'Falta el ID del ensayo (ensayoId)' }, { status: 400 })
    }

    await prisma.documentoEnsayo.delete({
      where: { ID_Ensayo: ensayoId }
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
