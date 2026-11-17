'use client'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
}

interface Props {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  icon?: React.ReactNode
  /** Nombre accesible del campo (lectores de pantalla). */
  ariaLabel?: string
  emptyText?: string
}

interface ListPosition {
  left: number
  width: number
  maxHeight: number
  top?: number
  bottom?: number
}

/**
 * Selector con búsqueda (combobox accesible).
 * - La lista se dibuja en un portal con posición fija: no se recorta ni genera
 *   scroll doble dentro de modales con overflow.
 * - Teclado: Enter/Espacio/↓ abre; ↑/↓ navegan; Enter elige; Esc cierra; Tab cierra.
 */
export default function SearchableSelect({
  options, value, onChange, placeholder = 'Buscar y seleccionar…', icon, ariaLabel,
  emptyText = 'No se encontraron coincidencias',
}: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [active, setActive] = useState(0)
  const [pos, setPos] = useState<ListPosition | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  const selected = options.find(o => o.value === value)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? options.filter(o => o.label.toLowerCase().includes(q)) : options
  }, [options, search])

  const place = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const below = window.innerHeight - r.bottom - 12
    const above = r.top - 12
    const flip = below < 200 && above > below
    const maxHeight = Math.max(140, Math.min(300, flip ? above : below))
    setPos(flip
      ? { left: r.left, width: r.width, maxHeight, bottom: window.innerHeight - r.top + 6 }
      : { left: r.left, width: r.width, maxHeight, top: r.bottom + 6 })
  }, [])

  const openList = useCallback(() => {
    setSearch('')
    const idx = options.findIndex(o => o.value === value)
    setActive(idx >= 0 ? idx : 0)
    place()
    setOpen(true)
  }, [options, value, place])

  const close = useCallback((refocus = true) => {
    setOpen(false)
    if (refocus) requestAnimationFrame(() => triggerRef.current?.focus())
  }, [])

  const choose = useCallback((opt: SelectOption) => {
    onChange(opt.value)
    close()
  }, [onChange, close])

  // Reposiciona al hacer scroll (en cualquier contenedor) o redimensionar
  useEffect(() => {
    if (!open) return
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open, place])

  // Cierra al hacer clic fuera (del campo y de la lista)
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      const t = e.target as Node
      if (triggerRef.current?.contains(t) || listRef.current?.contains(t)) return
      close(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, close])

  // Mantiene visible la opción activa al navegar con teclado
  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault(); setActive(i => Math.min(i + 1, Math.max(filtered.length - 1, 0))); break
      case 'ArrowUp':
        e.preventDefault(); setActive(i => Math.max(i - 1, 0)); break
      case 'Enter':
        e.preventDefault() // no enviar el formulario
        if (filtered[active]) choose(filtered[active])
        break
      case 'Escape':
        e.preventDefault() // evita que el modal padre también se cierre
        close()
        break
      case 'Tab':
        close(false)
        break
    }
  }

  return (
    <>
      <div
        ref={triggerRef}
        className={`ui-combo-trigger${open ? ' is-open' : ''}`}
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
        tabIndex={open ? -1 : 0}
        onClick={() => (open ? close() : openList())}
        onKeyDown={e => {
          if (!open && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
            e.preventDefault()
            openList()
          }
        }}
      >
        {icon && <span className="ui-combo-icon" aria-hidden="true">{icon}</span>}
        {open ? (
          <input
            autoFocus
            className="ui-combo-input"
            value={search}
            onChange={e => { setSearch(e.target.value); setActive(0) }}
            onKeyDown={onInputKeyDown}
            onClick={e => e.stopPropagation()}
            placeholder="Escribir código o nombre…"
            aria-label={ariaLabel}
            aria-autocomplete="list"
            aria-controls={listId}
            aria-activedescendant={filtered[active] ? `${listId}-${active}` : undefined}
          />
        ) : (
          <span className={`ui-combo-value${selected ? '' : ' is-placeholder'}`}>
            {selected ? selected.label : placeholder}
          </span>
        )}
        <ChevronDown size={16} className="ui-combo-chevron" aria-hidden="true" />
      </div>

      {open && pos && createPortal(
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          className="ui-combo-list"
          style={{ left: pos.left, width: pos.width, maxHeight: pos.maxHeight, top: pos.top, bottom: pos.bottom }}
          onMouseDown={e => e.preventDefault()} // conserva el foco en el buscador
        >
          {filtered.length === 0 ? (
            <div className="ui-combo-empty">{emptyText}</div>
          ) : (
            filtered.map((opt, i) => (
              <div
                key={opt.value}
                id={`${listId}-${i}`}
                data-idx={i}
                role="option"
                aria-selected={opt.value === value}
                className={`ui-combo-opt${i === active ? ' is-active' : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(opt)}
              >
                <span>{opt.label}</span>
                {opt.value === value && <Check size={16} aria-hidden="true" />}
              </div>
            ))
          )}
        </div>,
        document.body
      )}
    </>
  )
}
