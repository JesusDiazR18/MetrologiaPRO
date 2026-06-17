'use client'
import React, { useState, useEffect } from 'react'
import { FileText, Trash2, Plus, Upload, Loader2, ExternalLink } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface DocumentoEnsayo {
  ID_Ensayo: string
  Nombre_Ensayo: string
  Norma: string | null
  PDF_Url: string
  FK_ID_Equipo: string
  Creado_En: string
}

interface Props {
  equipoId: string
  equipoNombre: string
}

export default function EquipmentAssaysManager({ equipoId, equipoNombre }: Props) {
  const [documentos, setDocumentos] = useState<DocumentoEnsayo[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form states
  const [nombreEnsayo, setNombreEnsayo] = useState('')
  const [norma, setNorma] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileBase64, setFileBase64] = useState<string>('')

  // Fetch documentos
  const fetchDocs = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/equipos/${equipoId}/ensayos`)
      if (res.ok) {
        const data = await res.json()
        setDocumentos(data)
      } else {
        console.error('Error fetching assays')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocs()
  }, [equipoId])

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      toast.error('El archivo debe ser un PDF válido')
      e.target.value = ''
      return
    }

    // Limitar a 12MB para evitar problemas de payload base64
    if (file.size > 12 * 1024 * 1024) {
      toast.error('El tamaño máximo del PDF es 12MB')
      e.target.value = ''
      return
    }

    setSelectedFile(file)

    const reader = new FileReader()
    reader.onload = () => {
      setFileBase64(reader.result as string)
    }
    reader.onerror = () => {
      toast.error('Error al leer el archivo PDF')
    }
    reader.readAsDataURL(file)
  }

  // Handle view PDF
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
      toast.error('No se pudo visualizar el PDF. El archivo podría estar corrupto.')
    }
  }

  // Handle submit upload
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombreEnsayo.trim()) {
      toast.error('El nombre del ensayo es obligatorio')
      return
    }
    if (!fileBase64) {
      toast.error('Debe seleccionar un archivo PDF')
      return
    }

    try {
      setSubmitting(true)
      const res = await fetch(`/api/equipos/${equipoId}/ensayos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Nombre_Ensayo: nombreEnsayo.trim(),
          Norma: norma.trim() || null,
          PDF: fileBase64
        })
      })

      if (res.ok) {
        toast.success('Documento de ensayo asociado correctamente')
        // Reset form
        setNombreEnsayo('')
        setNorma('')
        setSelectedFile(null)
        setFileBase64('')
        // Clear file input
        const fileInput = document.getElementById('assay-pdf-input') as HTMLInputElement
        if (fileInput) fileInput.value = ''
        
        // Refresh list
        fetchDocs()
      } else {
        const err = await res.json()
        toast.error(`Error: ${err.error || 'No se pudo subir el archivo'}`)
      }
    } catch (err) {
      console.error(err)
      toast.error('Error de red al subir el documento')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle delete
  const handleDelete = async (docId: string, name: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar la asociación del ensayo "${name}"?\nEsta acción no se puede deshacer.`)) return

    try {
      const res = await fetch(`/api/equipos/${equipoId}/ensayos?ensayoId=${docId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        toast.success('Ensayo eliminado correctamente')
        fetchDocs()
      } else {
        toast.error('No se pudo eliminar el ensayo')
      }
    } catch (err) {
      console.error(err)
      toast.error('Error de red al intentar eliminar')
    }
  }

  return (
    <div className="card" style={{ overflow: 'hidden', marginTop: 24, background: 'rgba(255,255,255,0.02)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FileText size={16} color="var(--accent)" />
          <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Documentos de Ensayo (Procedimientos)</span>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Formulario de Subida */}
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'end', marginBottom: '24px', background: 'rgba(255, 255, 255, 0.01)', border: '1px dashed rgba(255, 255, 255, 0.1)', padding: '16px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-soft)', textTransform: 'uppercase' }}>Nombre del Ensayo *</label>
            <input
              type="text"
              placeholder="Ej. Tracción de Tuberías"
              value={nombreEnsayo}
              onChange={e => setNombreEnsayo(e.target.value)}
              required
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '10px 14px',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '13px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-soft)', textTransform: 'uppercase' }}>Norma de Referencia</label>
            <input
              type="text"
              placeholder="Ej. ISO 6259"
              value={norma}
              onChange={e => setNorma(e.target.value)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '10px 14px',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '13px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-soft)', textTransform: 'uppercase' }}>Archivo PDF *</label>
            <div style={{ position: 'relative' }}>
              <input
                id="assay-pdf-input"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                required
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer',
                  zIndex: 2
                }}
              />
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '10px 14px',
                borderRadius: '10px',
                color: selectedFile ? 'var(--accent)' : 'var(--text-soft)',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 600,
                pointerEvents: 'none'
              }}>
                <Upload size={16} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedFile ? selectedFile.name : 'Seleccionar PDF'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-cyan"
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              height: '38px',
              cursor: submitting ? 'not-allowed' : 'pointer'
            }}
          >
            {submitting ? (
              <>
                <Loader2 className="animate-spin" size={14} /> Subiendo...
              </>
            ) : (
              <>
                <Plus size={14} /> Asociar Ensayo
              </>
            )}
          </button>
        </form>

        {/* Tabla/Lista de Ensayos */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div className="spinner" style={{ margin: '0 auto 10px' }} />
            <p style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Cargando documentos de ensayo...</p>
          </div>
        ) : documentos.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '24px',
            background: 'rgba(255,255,255,0.01)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.03)'
          }}>
            <p style={{ color: 'var(--text-dim)', fontSize: '13px', margin: 0 }}>No hay documentos de ensayo asociados a este equipo.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre del Ensayo</th>
                  <th>Norma</th>
                  <th>Fecha de Asociación</th>
                  <th style={{ textAlign: 'center', width: '150px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {documentos.map((doc) => (
                  <tr key={doc.ID_Ensayo}>
                    <td style={{ fontWeight: 700 }}>{doc.Nombre_Ensayo}</td>
                    <td>
                      {doc.Norma ? (
                        <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.06)', padding: '4px 8px', borderRadius: '6px', color: 'var(--accent)', fontWeight: 600 }}>
                          {doc.Norma}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>—</span>
                      )}
                    </td>
                    <td>{new Date(doc.Creado_En).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleViewPDF(doc.PDF_Url)}
                          className="btn btn-ghost btn-xs"
                          style={{
                            color: '#3b82f6',
                            border: '1px solid rgba(59, 130, 246, 0.2)',
                            background: 'rgba(59, 130, 246, 0.05)',
                            padding: '4px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            borderRadius: '6px'
                          }}
                        >
                          Ver PDF <ExternalLink size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.ID_Ensayo, doc.Nombre_Ensayo)}
                          className="btn btn-ghost btn-xs"
                          style={{
                            color: 'var(--danger)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            background: 'rgba(239, 68, 68, 0.05)',
                            padding: '4px 8px',
                            borderRadius: '6px'
                          }}
                          title="Eliminar asociación de ensayo"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
