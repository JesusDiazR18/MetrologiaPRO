'use client'
import React from 'react'
import { FileText, ExternalLink } from 'lucide-react'

interface DocumentoEnsayo {
  ID_Ensayo: string
  Nombre_Ensayo: string
  Norma: string | null
  PDF_Url: string
  FK_ID_Equipo: string
  Creado_En: any
}

interface Props {
  documentos: DocumentoEnsayo[]
}

export default function VisorAssaysList({ documentos }: Props) {
  const handleViewPDF = (base64: string) => {
    try {
      // Remover prefijo data:application/pdf;base64, si existe
      const pureBase64 = base64.includes('base64,') ? base64.split('base64,')[1] : base64
      
      const byteCharacters = atob(pureBase64)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'application/pdf' })
      const fileURL = URL.createObjectURL(blob)
      
      // Abrir en nueva pestaña
      window.open(fileURL, '_blank')
    } catch (err) {
      console.error('Error al decodificar y abrir el PDF:', err)
      alert('Error: No se pudo visualizar el archivo PDF. Puede estar dañado o tener un formato incorrecto.')
    }
  }

  if (!documentos || documentos.length === 0) {
    return (
      <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>
        No hay documentos de ensayo asociados a este equipo.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {documentos.map((doc) => (
        <div 
          key={doc.ID_Ensayo}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', minWidth: 0 }}>
            <div style={{
              width: '32px',
              height: '32px',
              background: '#eff6ff',
              color: '#3b82f6',
              borderRadius: '8px',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0
            }}>
              <FileText size={16} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ 
                fontSize: '13px', 
                fontWeight: 700, 
                color: '#1e293b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {doc.Nombre_Ensayo}
              </div>
              {doc.Norma && (
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  Norma: {doc.Norma}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => handleViewPDF(doc.PDF_Url)}
            style={{
              padding: '6px 12px',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              flexShrink: 0,
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#2563eb'}
            onMouseLeave={e => e.currentTarget.style.background = '#3b82f6'}
          >
            Ver PDF <ExternalLink size={12} />
          </button>
        </div>
      ))}
    </div>
  )
}
