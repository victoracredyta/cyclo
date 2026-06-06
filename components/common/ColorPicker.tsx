'use client'

import { useState, useRef, useEffect } from 'react'
import { HexColorPicker } from 'react-colorful'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const PALETTE = [
  '#5B8CFF', '#12B981', '#F59E0B', '#e1493c', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#14B8A6', '#6B7280',
  '#0EA5E9', '#84CC16', '#A855F7', '#EF4444', '#10B981',
]

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  label?: string
  className?: string
}

function isValidHex(v: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(v)
}

export function ColorPicker({ value, onChange, label, className }: ColorPickerProps) {
  const [open, setOpen] = useState(false)
  const [hex, setHex] = useState(value)
  const ref = useRef<HTMLDivElement>(null)

  // Sync external value → local hex
  useEffect(() => { setHex(value) }, [value])

  // Close on outside click
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
        <div className="absolute z-50 top-full mt-2 left-0 bg-card border border-border rounded-xl shadow-xl p-3 space-y-3 w-[228px]">
          {/* Wheel */}
          <HexColorPicker color={isValidHex(hex) ? hex : '#5B8CFF'} onChange={v => commit(v)} style={{ width: '100%', height: 160 }} />

          {/* Hex input */}
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-md border border-border/50 shrink-0" style={{ background: isValidHex(hex) ? hex : value }} />
            <Input
              value={hex}
              onChange={e => {
                const v = e.target.value.startsWith('#') ? e.target.value : '#' + e.target.value
                setHex(v)
                if (isValidHex(v)) onChange(v)
              }}
              className="h-8 text-sm font-mono flex-1"
              maxLength={7}
              placeholder="#000000"
              spellCheck={false}
            />
          </div>

          {/* Palette */}
          <div className="flex flex-wrap gap-1.5">
            {PALETTE.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => { commit(c); setOpen(false) }}
                title={c}
                className={cn(
                  'w-6 h-6 rounded-md border-2 transition-all hover:scale-110',
                  value === c ? 'border-foreground' : 'border-transparent'
                )}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
