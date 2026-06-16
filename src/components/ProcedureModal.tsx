'use client'
import React, { useState } from 'react'
import { X, BookOpen, CheckCircle, Info, Clipboard } from 'lucide-react'
import { getProcedimiento } from '@/lib/procedimientos'

interface Equipo {
  ID_Equipo: string
  Codigo_Interno: string
  Nombre_Equipo: string
  Tolerancia_Aceptable: number
  Unidad_Tolerancia: string | null
  Magnitud?: string | null
  Tipo?: string | null
}

interface Props {
  equipo: Equipo
  onClose: () => void
}

export default function ProcedureModal({ equipo, onClose }: Props) {
  const procedimiento = getProcedimiento(equipo.Magnitud)
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({})

  const toggleStep = (index: number) => {
    setCheckedSteps(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.75)', // Slate-900 background with high transparency
      backdropFilter: 'blur(8px)',
      display: 'grid',
      placeItems: 'center',
      padding: '16px',
      zIndex: 5000,
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div 
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
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
          padding: '24px 24px 20px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: '#e0f2fe',
              color: '#0284c7',
              borderRadius: '12px',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0
            }}>
              <BookOpen size={20} />
            </div>
            <div>
              <span style={{
                fontFamily: 'monospace',
                fontSize: '11px',
                fontWeight: 800,
                color: '#0284c7',
                background: '#e0f2fe',
                padding: '2px 8px',
                borderRadius: '999px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                {procedimiento.codigo}
              </span>
              <h2 style={{
                fontSize: '18px',
                fontWeight: 900,
                color: '#0f172a',
                marginTop: '6px',
                lineHeight: 1.3
              }}>
                {procedimiento.titulo}
              </h2>
            </div>
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
        <div style={{ padding: '24px', overflowY: 'auto' }}>
          
          {/* Info del Activo */}
          <div style={{
            background: '#f8fafc',
            borderRadius: '16px',
            padding: '14px 18px',
            marginBottom: '20px',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>
              <span>Activo Bajo Prueba:</span>
              <span>{equipo.Codigo_Interno}</span>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>
              {equipo.Nombre_Equipo}
            </div>
            {equipo.Tolerancia_Aceptable > 0 && (
              <div style={{ 
                fontSize: '12px', 
                color: '#0369a1', 
                marginTop: '8px', 
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Info size={14} />
                <span>Tolerancia de Aceptación: ±{equipo.Tolerancia_Aceptable} {equipo.Unidad_Tolerancia ?? ''}</span>
              </div>
            )}
          </div>

          {/* Objetivo */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '6px' }}>
              Objetivo
            </h4>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
              {procedimiento.objetivo}
            </p>
          </div>

          {/* Equipamiento Requerido */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '8px' }}>
              Equipamiento Requerido
            </h4>
            <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {procedimiento.equipos.map((item, idx) => (
                <li key={idx} style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.4 }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Pasos a seguir (Interactivo) */}
          <div>
            <h4 style={{ 
              fontSize: '13px', 
              fontWeight: 800, 
              color: '#475569', 
              textTransform: 'uppercase', 
              letterSpacing: '0.03em', 
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Clipboard size={14} /> Pasos del Procedimiento (Checklist)
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {procedimiento.pasos.map((paso, idx) => {
                const isChecked = !!checkedSteps[idx]
                const dotIndex = paso.indexOf(':')
                const stepTitle = dotIndex > -1 ? paso.substring(0, dotIndex) : `Paso ${idx + 1}`
                const stepText = dotIndex > -1 ? paso.substring(dotIndex + 1).trim() : paso

                return (
                  <div 
                    key={idx}
                    onClick={() => toggleStep(idx)}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      padding: '12px 16px',
                      borderRadius: '14px',
                      background: isChecked ? '#f0fdf4' : '#ffffff',
                      border: `1px solid ${isChecked ? '#bbf7d0' : '#e2e8f0'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      userSelect: 'none'
                    }}
                    onMouseEnter={e => {
                      if (!isChecked) {
                        e.currentTarget.style.borderColor = '#cbd5e1'
                        e.currentTarget.style.background = '#f8fafc'
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isChecked) {
                        e.currentTarget.style.borderColor = '#e2e8f0'
                        e.currentTarget.style.background = '#ffffff'
                      }
                    }}
                  >
                    <div style={{ marginTop: '2px', flexShrink: 0 }}>
                      <CheckCircle 
                        size={18} 
                        color={isChecked ? '#22c55e' : '#cbd5e1'} 
                        fill={isChecked ? '#22c55e' : 'transparent'} 
                      />
                    </div>
                    <div>
                      <div style={{ 
                        fontSize: '13px', 
                        fontWeight: 800, 
                        color: isChecked ? '#166534' : '#1e293b',
                        textDecoration: isChecked ? 'line-through' : 'none'
                      }}>
                        {stepTitle}
                      </div>
                      <div style={{ 
                        fontSize: '12px', 
                        color: isChecked ? '#166534bb' : '#64748b', 
                        marginTop: '4px',
                        lineHeight: 1.4,
                        textDecoration: isChecked ? 'line-through' : 'none'
                      }}>
                        {stepText}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

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
              padding: '10px 24px',
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
            Entendido
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
