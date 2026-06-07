'use client'

import { useEffect, useLayoutEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface DropdownPortalProps {
  /** Whether the dropdown is open */
  open: boolean
  /** Close handler — fired on outside click, Escape, scroll, resize */
  onClose: () => void
  /** Ref of the trigger element used to anchor the popover */
  triggerRef: React.RefObject<HTMLElement | null>
  /** Dropdown width in px (default: 260) */
  width?: number
  /** Alignment relative to trigger (default: 'left') */
  align?: 'left' | 'right'
  /** Optional max height — content scrolls if exceeded (default: 480) */
  maxHeight?: number
  /** Extra classes on the inner panel */
  className?: string
  children: React.ReactNode
}

/**
 * Renders a dropdown panel via Portal to document.body with fixed positioning.
 * Bypasses ANY parent overflow:hidden / clipping container.
 * Auto-closes on outside click, Escape, scroll, or resize.
 */
export function DropdownPortal({
  open,
  onClose,
  triggerRef,
  width = 260,
  align = 'left',
  maxHeight = 480,
  className,
  children,
}: DropdownPortalProps) {
  const [mounted, setMounted] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => setMounted(true), [])

  // Position calculation
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const openUpward = spaceBelow < maxHeight + 16 && rect.top > spaceBelow

    const top = openUpward
      ? Math.max(8, rect.top - maxHeight - 8)
      : Math.min(window.innerHeight - 8, rect.bottom + 6)

    let left: number
    if (align === 'right') {
      left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.right - width))
    } else {
      left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.left))
    }
    setPos({ top, left })
  }, [open, triggerRef, width, align, maxHeight])

  // Outside click / Escape / scroll / resize → close
  useEffect(() => {
    if (!open) return
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (panelRef.current?.contains(target)) return
      if (triggerRef.current?.contains(target)) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const onScroll = () => onClose()
    const onResize = () => onClose()
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open, onClose, triggerRef])

  if (!open || !mounted) return null

  return createPortal(
    <div
      ref={panelRef}
      style={{ top: pos.top, left: pos.left, width, maxHeight }}
      className={cn(
        'fixed z-[9999] bg-card border border-border rounded-xl shadow-2xl overflow-y-auto',
        className,
      )}
    >
      {children}
    </div>,
    document.body,
  )
}
