import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const ensayos = await prisma.documentoEnsayo.findMany({
      where: { FK_ID_Equipo: id },
      orderBy: { Creado_En: 'desc' }
    })
    return NextResponse.json(ensayos)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { Nombre_Ensayo, Norma, PDF } = body

    if (!Nombre_Ensayo || !PDF) {
      return NextResponse.json({ error: 'Faltan datos obligatorios (Nombre_Ensayo, PDF)' }, { status: 400 })
    }

    const nuevo = await prisma.documentoEnsayo.create({
      data: {
        Nombre_Ensayo,
        Norma: Norma || null,
        PDF_Url: PDF,
        FK_ID_Equipo: id
      }
    })

    return NextResponse.json(nuevo)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { searchParams } = new URL(request.url)
    const ensayoId = searchParams.get('ensayoId')

    if (!ensayoId) {
      return NextResponse.json({ error: 'Falta ID de ensayo (ensayoId)' }, { status: 400 })
    }

    await prisma.documentoEnsayo.delete({
      where: { ID_Ensayo: ensayoId }
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
