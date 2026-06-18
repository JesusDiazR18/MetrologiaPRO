'use client'
import React from 'react'
import { X, FileText, ExternalLink } from 'lucide-react'

interface DocumentoEnsayo {
  ID_Ensayo: string
  Nombre_Ensayo: string
  Norma: string | null
  PDF_Url: string
  FK_ID_Equipo: string
  Creado_En: any
}

interface Props {
  equipoNombre: string
  documentos: DocumentoEnsayo[]
  onClose: () => void
}

export default function VisorProceduresModal({ equipoNombre, documentos, onClose }: Props) {
  
  const handleViewPDF = (base64: string) => {
    try {
      const pureBase64 = base64.includes('base64,') ? base64.split('base64,')[1] : base64
      const byteCharacters = atob(pureBase64)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'application/pdf' })
      const fileURL = URL.createObjectURL(blob)
      window.open(fileURL, '_blank')
    } catch (err) {
      console.error('Error rendering PDF:', err)
      alert('Error: No se pudo visualizar el archivo PDF. Puede estar dañado.')
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.75)', // Slate-900 backdrop
      backdropFilter: 'blur(8px)',
      display: 'grid',
      placeItems: 'center',
      padding: '16px',
      zIndex: 5100,
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div 
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '480px',
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div>
            <span style={{
              fontSize: '10px',
              fontWeight: 800,
              color: '#3b82f6',
              background: '#eff6ff',
              padding: '2px 8px',
              borderRadius: '999px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Procedimientos
            </span>
            <h3 style={{
              fontSize: '16px',
              fontWeight: 900,
              color: '#0f172a',
              marginTop: '4px',
              lineHeight: 1.3
            }}>
              {equipoNombre}
            </h3>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              color: '#64748b',
              flexShrink: 0,
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
            onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {documentos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b', fontSize: '13px' }}>
              No hay procedimientos de ensayo asociados a este equipo.
            </div>
          ) : (
            documentos.map((doc) => (
              <div 
                key={doc.ID_Ensayo}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', minWidth: 0 }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    background: '#eff6ff',
                    color: '#3b82f6',
                    borderRadius: '10px',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0
                  }}>
                    <FileText size={18} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ 
                      fontSize: '13px', 
                      fontWeight: 800, 
                      color: '#1e293b',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {doc.Nombre_Ensayo}
                    </div>
                    {doc.Norma && (
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontWeight: 600 }}>
                        Norma: {doc.Norma}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleViewPDF(doc.PDF_Url)}
                  style={{
                    padding: '8px 14px',
                    background: '#3b82f6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    flexShrink: 0,
                    transition: 'background 0.2s',
                    boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.2)'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#2563eb'}
                  onMouseLeave={e => e.currentTarget.style.background = '#3b82f6'}
                >
                  Ver PDF <ExternalLink size={12} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #f1f5f9',
          background: '#f8fafc',
          display: 'flex',
          justifyContent: 'flex-end',
          borderBottomLeftRadius: '24px',
          borderBottomRightRadius: '24px'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              background: '#0f172a',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#1e293b'}
            onMouseLeave={e => e.currentTarget.style.background = '#0f172a'}
          >
            Cerrar
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(15px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
