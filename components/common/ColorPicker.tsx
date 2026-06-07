'use client'

import { useState, useRef, useEffect } from 'react'
import { HexColorPicker } from 'react-colorful'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

// 35 cores em 5 linhas — paleta ampla cobrindo todo espectro
const PALETTE = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E', '#10B981',
  '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#5B8CFF', '#6366F1', '#8B5CF6',
  '#A855F7', '#D946EF', '#EC4899', '#F43F5E', '#E1493C', '#DC2626', '#B91C1C',
  '#9A3412', '#92400E', '#854D0E', '#3F6212', '#166534', '#065F46', '#155E75',
  '#1E40AF', '#3730A3', '#5B21B6', '#86198F', '#9F1239', '#1F2937', '#64748B',
]

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  label?: string
  className?: string
  /** Open popover above the trigger instead of below */
  openUpward?: boolean
}

function isValidHex(v: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(v)
}

export function ColorPicker({ value, onChange, label, className, openUpward = false }: ColorPickerProps) {
  const [open, setOpen] = useState(false)
  const [hex, setHex] = useState(value)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setHex(value) }, [value])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const commit = (v: string) => {
    setHex(v)
    if (isValidHex(v)) onChange(v)
  }

  return (
    <div ref={ref} className={cn('relative', className)}>
      {label && <p className="text-xs font-semibold mb-1.5">{label}</p>}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 h-9 px-2.5 rounded-lg border border-border bg-background hover:border-muted-foreground/40 transition-colors w-full"
      >
        <span className="w-5 h-5 rounded-md border border-border/50 shrink-0" style={{ background: value }} />
        <span className="text-sm font-mono text-foreground flex-1 text-left">{value.toUpperCase()}</span>
      </button>

      {/* Popover */}
      {open && (
        <div
          className={cn(
            'absolute z-50 left-0 bg-card border border-border rounded-xl shadow-2xl p-3 space-y-3 w-[280px]',
            openUpward ? 'bottom-full mb-2' : 'top-full mt-2'
          )}
        >
          {/* Saturation + hue picker */}
          <div className="rounded-lg overflow-hidden">
            <HexColorPicker
              color={isValidHex(hex) ? hex : '#5B8CFF'}
              onChange={v => commit(v)}
              style={{ width: '100%', height: 200 }}
            />
          </div>

          {/* Hex input */}
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-md border border-border/50 shrink-0" style={{ background: isValidHex(hex) ? hex : value }} />
            <Input
              value={hex}
              onChange={e => {
                const v = e.target.value.startsWith('#') ? e.target.value : '#' + e.target.value
                setHex(v)
                if (isValidHex(v)) onChange(v)
              }}
              className="h-8 text-sm font-mono flex-1 uppercase"
              maxLength={7}
              placeholder="#000000"
              spellCheck={false}
            />
          </div>

          {/* Palette */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Paleta</p>
            <div className="grid grid-cols-7 gap-1.5">
              {PALETTE.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { commit(c); setOpen(false) }}
                  title={c}
                  className={cn(
                    'w-7 h-7 rounded-md border-2 transition-all hover:scale-110 hover:shadow-md',
                    value.toUpperCase() === c.toUpperCase() ? 'border-foreground ring-2 ring-foreground/20' : 'border-transparent'
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
