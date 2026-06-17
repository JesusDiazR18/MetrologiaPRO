'use client'
import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import VerificationModal from '@/components/VerificationModal'

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
