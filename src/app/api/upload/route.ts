import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const idPatron = formData.get('idPatron') as string

    if (!file || !idPatron) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadDir = join(process.cwd(), 'public', 'uploads', 'certificados')
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`
    const path = join(uploadDir, fileName)

    await writeFile(path, buffer)
    const publicPath = `/uploads/certificados/${fileName}`

    const updated = await prisma.patronReferencia.update({
      where: { ID_Patron: idPatron },
      data: { PDF_Certificado: publicPath }
    })

    return NextResponse.json({ success: true, path: publicPath, updated })
  } catch (error) {
    console.error('Error in upload:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
