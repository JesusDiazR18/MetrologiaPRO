import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const MAX_BYTES = 10 * 1024 * 1024
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const ASSET_TYPES = ['EQUIPO', 'INSTRUMENTO', 'PATRON', 'HISTORIAL']

/** Valida tipo, tamaño y contenido real del archivo antes de persistirlo. */
function validateUpload(dataUrl: string, uploadType: string, assetType: string): string | null {
  if (!ASSET_TYPES.includes(assetType)) return 'Tipo de activo no válido'
  if (uploadType !== 'FOTO' && uploadType !== 'CERTIFICADO') return 'Tipo de carga no válido'
  const match = /^data:([^;,]+);base64,([\s\S]*)$/.exec(dataUrl)
  if (!match) return 'Formato de archivo no válido'
  const [, mime, b64] = match
  const bytes = Buffer.from(b64, 'base64')
  if (bytes.length === 0) return 'El archivo está vacío'
  if (bytes.length > MAX_BYTES) return 'El archivo supera el máximo de 10 MB'
  if (uploadType === 'FOTO') {
    if (!IMAGE_TYPES.includes(mime)) return 'La foto debe ser PNG, JPG, WEBP o GIF'
  } else {
    if (mime !== 'application/pdf' || bytes.subarray(0, 5).toString('latin1') !== '%PDF-') {
      return 'El certificado debe ser un archivo PDF válido'
    }
  }
  return null
}

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

    const invalid = validateUpload(publicPath, uploadType, assetType)
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })

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
