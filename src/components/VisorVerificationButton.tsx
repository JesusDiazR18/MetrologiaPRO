'use client'
import { useState } from 'react'
import { ShieldCheck, BookOpen } from 'lucide-react'
import VerificationModal from '@/components/VerificationModal'
import { toast } from 'react-hot-toast'

interface Equipo {
  ID_Equipo: string
  Codigo_Interno: string
  Nombre_Equipo: string
  Tolerancia_Aceptable: number
  Unidad_Tolerancia: string | null
  Magnitud?: string | null
  Tipo?: string | null
  Tolerancias_Multimagnitud?: string | null
}

interface Props {
  equipo: Equipo
}

export default function VisorVerificationButton({ equipo }: Props) {
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [equiposList, setEquiposList] = useState<Equipo[]>([])

  const handleOpen = async () => {
    if (equiposList.length > 0) {
      setShowModal(true)
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/equipos')
      if (res.ok) {
        const data = await res.json()
        setEquiposList(data)
      } else {
        // Fallback to only current equipo if fetch fails
        setEquiposList([equipo])
      }
      setShowModal(true)
    } catch (e) {
      console.error('Error fetching equipments:', e)
      setEquiposList([equipo])
      setShowModal(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div style={{ display: 'flex', gap: '10px', width: '100%', flexDirection: 'row' }}>
        {equipo.Tipo === 'EQUIPO' && (
          <button 
            onClick={() => {
              const element = document.getElementById('documentos-ensayo-section')
              if (element) {
                element.scrollIntoView({ behavior: 'smooth' })
              } else {
                toast.error('Este equipo no tiene documentos de ensayo asociados.')
              }
            }}
            style={{
              flex: 1,
              padding: '12px',
              background: '#ffffff',
              color: '#334155',
              border: '2px solid #cbd5e1',
              borderRadius: '14px',
              fontWeight: 800,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f8fafc'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff'
              e.currentTarget.style.transform = 'none'
            }}
          >
            <BookOpen size={16} color="var(--accent)" />
            Procedimiento
          </button>
        )}
        <button 
          onClick={handleOpen}
          disabled={loading}
          style={{
            flex: equipo.Tipo === 'EQUIPO' ? 1.4 : 1,
            padding: '12px',
            background: '#0284c7', // Sky blue
            color: '#fff',
            border: 'none',
            borderRadius: '14px',
            fontWeight: 800,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 8px 12px -3px rgba(2, 132, 199, 0.25)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#0369a1'
            e.currentTarget.style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#0284c7'
            e.currentTarget.style.transform = 'none'
          }}
        >
          <ShieldCheck size={16} />
          {loading ? 'Cargando...' : 'Verificar Activo'}
        </button>
      </div>

      {showModal && (
        <VerificationModal
          equipo={equipo}
          equipos={equiposList}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false)
            // Reload page to show new verification in the visor
            window.location.reload()
          }}
        />
      )}
    </>
  )
}
