'use client'
import { useState } from 'react'
import { ShieldCheck, BookOpen } from 'lucide-react'
import VerificationModal from '@/components/VerificationModal'
import ProcedureModal from '@/components/ProcedureModal'

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
  isPatron?: boolean
}

export default function VisorVerificationButton({ equipo, isPatron = false }: Props) {
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showProcedure, setShowProcedure] = useState(false)
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
        {/* Button to show procedure */}
        <button
          onClick={() => setShowProcedure(true)}
          style={{
            width: '100%',
            padding: '14px',
            background: 'transparent',
            color: '#334155',
            border: '2px solid #cbd5e1',
            borderRadius: '16px',
            fontWeight: 800,
            fontSize: '15px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#94a3b8'
            e.currentTarget.style.background = '#f8fafc'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#cbd5e1'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <BookOpen size={18} />
          Ver Procedimiento
        </button>

        {/* Button to run verification (only for non-patrons) */}
        {!isPatron && (
          <button 
            onClick={handleOpen}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: '#0284c7', // Sky blue
              color: '#fff',
              border: 'none',
              borderRadius: '16px',
              fontWeight: 800,
              fontSize: '15px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 10px 15px -3px rgba(2, 132, 199, 0.3)',
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
            <ShieldCheck size={18} />
            {loading ? 'Cargando formulario...' : 'Registrar Verificación'}
          </button>
        )}
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

      {showProcedure && (
        <ProcedureModal 
          equipo={equipo}
          onClose={() => setShowProcedure(false)}
        />
      )}
    </>
  )
}
