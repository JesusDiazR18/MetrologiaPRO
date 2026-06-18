'use client'
import React, { useEffect, useState, useMemo } from 'react'
import { FolderOpen, FileText, Trash2, Plus, Upload, Loader2, ExternalLink, Search, RotateCcw } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface DocumentoEnsayo {
  ID_Ensayo: string
  Nombre_Ensayo: string
  Norma: string | null
  PDF_Url: string
  FK_ID_Equipo: string
  Creado_En: string
  equipo: {
    Codigo_Interno: string
    Nombre_Equipo: string
  }
}

interface Equipo {
  ID_Equipo: string
  Tipo: string
  Codigo_Interno: string
  Nombre_Equipo: string
}

export default function BibliotecaPage() {
  const [documentos, setDocumentos] = useState<DocumentoEnsayo[]>([])
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Search/Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [filterEquipo, setFilterEquipo] = useState('ALL')

  // Form states
  const [nombreEnsayo, setNombreEnsayo] = useState('')
  const [norma, setNorma] = useState('')
  const [selectedEquipoId, setSelectedEquipoId] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileBase64, setFileBase64] = useState<string>('')

  // Fetch all data
  const fetchData = async () => {
    try {
      setLoading(true)
      // 1. Fetch essays
      const resDocs = await fetch('/api/ensayos')
      if (resDocs.ok) {
        const dataDocs = await resDocs.json()
        setDocumentos(dataDocs)
      }

      // 2. Fetch equipments
      const resEqs = await fetch('/api/equipos')
      if (resEqs.ok) {
        const dataEqs = await resEqs.json()
        if (Array.isArray(dataEqs)) {
          // Filter only EQUIPO type
          setEquipos(dataEqs.filter(e => e.Tipo === 'EQUIPO'))
        }
      }
    } catch (e) {
      console.error('Error fetching data:', e)
      toast.error('Error al cargar datos de la biblioteca')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // File loading
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      toast.error('El archivo debe ser un PDF válido')
      e.target.value = ''
      return
    }

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

  // View PDF
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
      toast.error('No se pudo abrir el visor de PDF.')
    }
  }

  // Create new document association
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombreEnsayo.trim()) {
      toast.error('El nombre del ensayo es obligatorio')
      return
    }
    if (!selectedEquipoId) {
      toast.error('Debe seleccionar un equipo asociado')
      return
    }
    if (!fileBase64) {
      toast.error('Debe seleccionar un archivo PDF')
      return
    }

    try {
      setSubmitting(true)
      const res = await fetch('/api/ensayos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Nombre_Ensayo: nombreEnsayo.trim(),
          Norma: norma.trim() || null,
          PDF: fileBase64,
          FK_ID_Equipo: selectedEquipoId
        })
      })

      if (res.ok) {
        toast.success('Documento de ensayo guardado en la biblioteca')
        // Reset form
        setNombreEnsayo('')
        setNorma('')
        setSelectedEquipoId('')
        setSelectedFile(null)
        setFileBase64('')
        // Clear file input
        const fileInput = document.getElementById('lib-pdf-input') as HTMLInputElement
        if (fileInput) fileInput.value = ''
        
        fetchData()
      } else {
        const err = await res.json()
        toast.error(`Error: ${err.error || 'No se pudo registrar'}`)
      }
    } catch (err) {
      console.error(err)
      toast.error('Error al subir documento')
    } finally {
      setSubmitting(false)
    }
  }

  // Delete document
  const handleDelete = async (docId: string, name: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar la asociación de "${name}" de la biblioteca?\nEsta acción no se puede deshacer.`)) return

    try {
      const res = await fetch(`/api/ensayos?ensayoId=${docId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        toast.success('Ensayo eliminado correctamente')
        fetchData()
      } else {
        toast.error('No se pudo eliminar el ensayo')
      }
    } catch (err) {
      console.error(err)
      toast.error('Error de red al intentar eliminar')
    }
  }

  // Filtering Logic
  const filteredDocumentos = useMemo(() => {
    let list = [...documentos]

    // 1. Search Query
    if (searchQuery.trim()) {
      const term = searchQuery.toLowerCase().trim()
      list = list.filter(doc => 
        doc.Nombre_Ensayo.toLowerCase().includes(term) ||
        (doc.Norma && doc.Norma.toLowerCase().includes(term)) ||
        doc.equipo.Codigo_Interno.toLowerCase().includes(term) ||
        doc.equipo.Nombre_Equipo.toLowerCase().includes(term)
      )
    }

    // 2. Equipment Filter
    if (filterEquipo !== 'ALL') {
      list = list.filter(doc => doc.FK_ID_Equipo === filterEquipo)
    }

    return list
  }, [documentos, searchQuery, filterEquipo])

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-icon">
          <FolderOpen size={22} />
        </div>
        <div>
          <h1>Biblioteca de Ensayos</h1>
          <p>Repositorio centralizado de procedimientos de ensayo y control de calidad</p>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', alignItems: 'start', marginTop: '20px' }}>
        
        {/* Left Side: Upload Form */}
        <div className="card">
          <div className="card-body">
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Subir y Asociar Documento
            </h3>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div className="form-group-modern">
                <label>Nombre del Ensayo *</label>
                <input
                  type="text"
                  placeholder="Ej. Resistencia al Impacto Charpy"
                  value={nombreEnsayo}
                  onChange={e => setNombreEnsayo(e.target.value)}
                  required
                />
              </div>

              <div className="form-group-modern">
                <label>Norma de Referencia</label>
                <input
                  type="text"
                  placeholder="Ej. ISO 179 / ISO 3127"
                  value={norma}
                  onChange={e => setNorma(e.target.value)}
                />
              </div>

              <div className="form-group-modern">
                <label>Equipo Asociado *</label>
                <select
                  value={selectedEquipoId}
                  onChange={e => setSelectedEquipoId(e.target.value)}
                  required
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '2px solid #f1f5f9',
                    background: '#f8fafc',
                    fontSize: '15px',
                    fontWeight: 500,
                    color: '#1e293b',
                    outline: 'none',
                    width: '100%'
                  }}
                >
                  <option value="">-- Seleccionar Equipo --</option>
                  {equipos.map(eq => (
                    <option key={eq.ID_Equipo} value={eq.ID_Equipo}>
                      [{eq.Codigo_Interno}] - {eq.Nombre_Equipo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group-modern">
                <label>Archivo de Procedimiento (PDF) *</label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input
                    id="lib-pdf-input"
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
                    background: '#f8fafc',
                    border: '2px dashed #cbd5e1',
                    padding: '24px 16px',
                    borderRadius: '12px',
                    textAlign: 'center',
                    color: selectedFile ? 'var(--accent)' : '#64748b',
                    fontSize: '13px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 600,
                    pointerEvents: 'none'
                  }}>
                    <Upload size={24} />
                    <span style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                      {selectedFile ? selectedFile.name : 'Arrastra o selecciona archivo PDF'}
                    </span>
                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>Máximo 12MB</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-cyan"
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  fontWeight: 800,
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  width: '100%'
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" size={16} /> Procesando...
                  </>
                ) : (
                  <>
                    <Plus size={16} /> Subir a la Biblioteca
                  </>
                )}
              </button>

            </form>
          </div>
        </div>

        {/* Right Side: List and Filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Filters card */}
          <div className="card" style={{ marginBottom: 0 }}>
            <div className="card-body" style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                
                <div className="search-box" style={{ flex: '1 1 200px' }}>
                  <Search size={16} color="var(--text-soft)" />
                  <input 
                    type="text" 
                    placeholder="Buscar por nombre, norma o equipo..." 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase' }}>Equipo:</span>
                  <select 
                    className="select-filter"
                    value={filterEquipo} 
                    onChange={e => setFilterEquipo(e.target.value)}
                    style={{ maxWidth: 180 }}
                  >
                    <option value="ALL">Todos los equipos</option>
                    {equipos.map(eq => (
                      <option key={eq.ID_Equipo} value={eq.ID_Equipo}>[{eq.Codigo_Interno}] {eq.Nombre_Equipo}</option>
                    ))}
                  </select>
                </div>

                {(searchQuery !== '' || filterEquipo !== 'ALL') && (
                  <button 
                    className="btn btn-ghost btn-xs" 
                    style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 4 }}
                    onClick={() => { setSearchQuery(''); setFilterEquipo('ALL') }}
                  >
                    <RotateCcw size={11} /> Limpiar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* List Card */}
          <div className="card">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div className="spinner" style={{ margin: '0 auto 16px' }} />
                <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>Cargando documentos de biblioteca...</p>
              </div>
            ) : filteredDocumentos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <FileText size={40} opacity={0.2} style={{ margin: '0 auto 16px' }} />
                <p style={{ fontWeight: 600, fontSize: '15px' }}>Biblioteca vacía</p>
                <p style={{ color: 'var(--text-dim)', fontSize: '12px', margin: 0 }}>No se encontraron documentos coincidentes en el repositorio.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ensayo</th>
                      <th>Norma</th>
                      <th>Equipo Asociado</th>
                      <th style={{ textAlign: 'center', width: '160px' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocumentos.map(doc => (
                      <tr key={doc.ID_Ensayo}>
                        <td style={{ fontWeight: 700 }}>{doc.Nombre_Ensayo}</td>
                        <td>
                          {doc.Norma ? (
                            <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.06)', padding: '3px 6px', borderRadius: '6px', color: 'var(--accent)', fontWeight: 600 }}>
                              {doc.Norma}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-dim)' }}>—</span>
                          )}
                        </td>
                        <td style={{ fontSize: '12px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)', marginRight: 4 }}>
                            {doc.equipo.Codigo_Interno}
                          </span>
                          · {doc.equipo.Nombre_Equipo}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
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
                              Ver PDF <ExternalLink size={11} />
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
                              title="Eliminar procedimiento"
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

      </div>

      <style jsx global>{`
        .form-group-modern {
          margin-bottom: 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-group-modern label {
          font-size: 11px;
          font-weight: 800;
          color: var(--text-soft);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .form-group-modern input {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 10px 14px;
          border-radius: 10px;
          color: #fff;
          font-size: 13px;
          outline: none;
          transition: border-color 0.2s;
        }
        .form-group-modern input:focus {
          border-color: var(--accent);
        }
      `}</style>
    </div>
  )
}
