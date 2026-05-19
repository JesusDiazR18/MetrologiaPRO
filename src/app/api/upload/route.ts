import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    let fileBase64 = ''
    let assetId = ''
    let assetType = ''
    let uploadType = ''
    let nCert = ''
    let prov = ''
    let fechaCal = ''
    let fechaVenc = ''
    let fileType = ''

    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const body = await request.json()
      fileBase64 = body.file
      assetId = body.assetId
      assetType = body.assetType || 'PATRON'
      uploadType = body.uploadType || 'CERTIFICADO'
      nCert = body.nCert
      prov = body.prov
      fechaCal = body.fechaCal
      fechaVenc = body.fechaVenc
      fileType = body.fileType || (uploadType === 'FOTO' ? 'image/png' : 'application/pdf')
    } else {
      const formData = await request.formData()
      const file = formData.get('file') as File
      assetId = (formData.get('assetId') as string) || (formData.get('idPatron') as string)
      assetType = (formData.get('assetType') as string) || 'PATRON'
      uploadType = (formData.get('uploadType') as string) || 'CERTIFICADO'
      nCert = formData.get('nCert') as string
      prov = formData.get('prov') as string
      fechaCal = formData.get('fechaCal') as string
      fechaVenc = formData.get('fechaVenc') as string

      if (!file || !assetId) {
        return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 })
      }

      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const base64 = buffer.toString('base64')
      fileType = file.type || (uploadType === 'FOTO' ? 'image/png' : 'application/pdf')
      fileBase64 = `data:${fileType};base64,${base64}`
    }

    if (!fileBase64 || !assetId) {
      return NextResponse.json({ error: 'Faltan datos obligatorios o archivo' }, { status: 400 })
    }

    const publicPath = fileBase64.startsWith('data:') ? fileBase64 : `data:${fileType};base64,${fileBase64}`

    let updated

    if (uploadType === 'FOTO') {
      if (assetType === 'EQUIPO' || assetType === 'INSTRUMENTO') {
        updated = await prisma.instrumentoEquipo.update({
          where: { ID_Equipo: assetId },
          data: { Foto_Equipo: publicPath }
        })
      } else if (assetType === 'PATRON') {
        updated = await prisma.patronReferencia.update({
          where: { ID_Patron: assetId },
          data: { Foto_Patron: publicPath }
        })
      } else if (assetType === 'HISTORIAL') {
        updated = await prisma.historialVerificacion.update({
          where: { ID_Log: assetId },
          data: { Evidencia_Foto: publicPath }
        })
      }
    } else {
      if (assetType === 'EQUIPO' || assetType === 'INSTRUMENTO') {
        const updateData: any = { PDF_Certificado: publicPath }
        if (nCert) updateData.N_Certificado = nCert
        if (prov) updateData.Proveedor_Servicio = prov
        if (fechaCal) updateData.Fecha_Ultima_Verificacion = new Date(fechaCal)
        if (fechaVenc) updateData.Fecha_Vencimiento_Certificado = new Date(fechaVenc)

        updated = await prisma.instrumentoEquipo.update({
          where: { ID_Equipo: assetId },
          data: updateData
        })
      } else {
        const updateData: any = { PDF_Certificado: publicPath, Estado_Vigencia: 'VIGENTE' }
        if (nCert) updateData.N_Certificado = nCert
        if (prov) updateData.Proveedor_Laboratorio = prov
        if (fechaCal) updateData.Fecha_Calibracion_Externa = new Date(fechaCal)
        if (fechaVenc) {
          const vDate = new Date(fechaVenc)
          updateData.Fecha_Vencimiento_Certificado = vDate
          if (vDate.getTime() < Date.now()) {
            updateData.Estado_Vigencia = 'VENCIDO'
          }
        }

        updated = await prisma.patronReferencia.update({
          where: { ID_Patron: assetId },
          data: updateData
        })
      }
    }

    return NextResponse.json({ success: true, path: publicPath, updated })
  } catch (error) {
    console.error('Error in upload:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
