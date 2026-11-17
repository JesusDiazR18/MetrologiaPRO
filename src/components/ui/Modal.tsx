'use client'
import { useCallback, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, X } from 'lucide-react'

export interface ModalProps {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  onClose: () => void
  /** Si es true, cerrar con Esc / clic fuera / X pide confirmación antes de descartar. */
  dirty?: boolean
  /** Bloquea el cierre mientras hay una operación en curso (p. ej. guardando). */
  busy?: boolean
  maxWidth?: number
  /** Mensaje de error persistente: se fija entre el cuerpo y el pie, siempre visible. */
  error?: string
  /** Contenido fijo bajo la cabecera (p. ej. pestañas). No hace scroll. */
  toolbar?: React.ReactNode
  /** Pie fijo con las acciones. */
  footer?: React.ReactNode
  /** Si se indica, cuerpo + pie se envuelven en un <form>. */
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void
  /** Capa superpuesta dentro del modal (p. ej. solicitud de autenticación). */
  overlay?: React.ReactNode
  children: React.ReactNode
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

function visibleFocusables(root: HTMLElement | null): HTMLElement[] {
  if (!root) return []
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    el => el.offsetParent !== null || el === document.activeElement
  )
}

export default function Modal({
  title, subtitle, icon, onClose, dirty = false, busy = false, maxWidth, error,
  toolbar, footer, onSubmit, overlay, children,
}: ModalProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const downOnBackdrop = useRef(false)

  const requestClose = useCallback(() => {
    if (busy) return
    if (dirty && !window.confirm('Tienes datos sin guardar. ¿Quieres descartarlos y cerrar?')) return
    onClose()
  }, [busy, dirty, onClose])

  // Foco inicial + bloqueo de scroll de fondo; al cerrar, se restaura el foco previo.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const panel = panelRef.current
    if (panel && !panel.contains(document.activeElement)) panel.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus?.()
    }
  }, [])

  // Esc cierra; Tab queda atrapado dentro del modal (o de su capa superpuesta).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (e.defaultPrevented) return // un hijo (combobox, capa de auth) ya lo gestionó
        e.preventDefault()
        requestClose()
        return
      }
      if (e.key !== 'Tab') return
      const root = overlayRef.current ?? panelRef.current
      const items = visibleFocusables(root)
      if (items.length === 0) { e.preventDefault(); return }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (!root?.contains(active)) { e.preventDefault(); first.focus(); return }
      if (e.shiftKey && active === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [requestClose])

  const content = (
    <>
      <div className="modal-body">{children}</div>
      {error && (
        <div role="alert" className="ui-modal-alert">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      {footer && <div className="modal-footer">{footer}</div>}
    </>
  )

  // Los modales solo se montan tras una interacción del usuario (nunca en el SSR).
  if (typeof document === 'undefined') return null

  // Portal a <body>: el overlay no depende de ancestros con transform/animación
  // (que rompen position:fixed) ni de sus contextos de apilamiento.
  return createPortal(
    <div
      className="modal-overlay"
      // El cierre por clic fuera solo cuenta si el clic EMPEZÓ en el fondo
      // (evita cerrar al soltar el mouse tras seleccionar texto dentro del modal).
      onMouseDown={e => { downOnBackdrop.current = e.target === e.currentTarget }}
      onClick={e => { if (downOnBackdrop.current && e.target === e.currentTarget) requestClose() }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="modal ui-modal"
        style={{ maxWidth: maxWidth ?? 560, outline: 'none' }}
      >
        <div className="modal-header">
          {icon && <div className="ui-modal-icon" aria-hidden="true">{icon}</div>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id={titleId} className="modal-title">{title}</h2>
            {subtitle && <p className="ui-modal-subtitle">{subtitle}</p>}
          </div>
          <button
            type="button"
            className="ui-icon-btn"
            onClick={requestClose}
            disabled={busy}
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {toolbar && <div className="ui-modal-toolbar">{toolbar}</div>}

        {onSubmit ? (
          <form
            onSubmit={onSubmit}
            className="ui-modal-form"
            // Mientras hay una capa superpuesta, lo de atrás no recibe foco ni clics.
            inert={overlay ? true : undefined}
          >
            {content}
          </form>
        ) : (
          <div className="ui-modal-form" inert={overlay ? true : undefined}>{content}</div>
        )}

        {overlay && <div ref={overlayRef} className="ui-scrim">{overlay}</div>}
      </div>
    </div>,
    document.body
  )
}
