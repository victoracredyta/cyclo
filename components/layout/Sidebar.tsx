'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/useUIStore'
import {
  LayoutDashboard, Users, Kanban, Calendar, Mail,
  BarChart2, Target,
  Bot, Zap, DollarSign, Palette, Settings, ChevronLeft,
  ChevronRight, Link2,
} from 'lucide-react'

const navGroups = [
  {
    label: 'Visão Geral',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Clientes',
    items: [
      { href: '/crm', label: 'Clientes Ativos', icon: Users },
      { href: '/pipeline', label: 'Pipeline', icon: Kanban },
      { href: '/agenda', label: 'Agenda', icon: Calendar },
      { href: '/email', label: 'Enviar Email', icon: Mail },
    ],
  },
  {
    label: 'Inteligência',
    items: [
      { href: '/relatorios', label: 'Relatórios', icon: BarChart2 },
      { href: '/metas', label: 'Metas', icon: Target },
      { href: '/ia', label: 'CYCLO IA', icon: Bot },
    ],
  },
  {
    label: 'Operações',
    items: [
      { href: '/automacoes', label: 'Automações', icon: Zap },
      { href: '/financeiro', label: 'Financeiro', icon: DollarSign },
    ],
  },
  {
    label: 'Configurar',
    items: [
      { href: '/whitelabel', label: 'White Label', icon: Palette },
      { href: '/integracoes', label: 'Integrações', icon: Link2 },
      { href: '/configuracoes', label: 'Configurações', icon: Settings },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarCollapsed, toggleSidebar } = useUIStore()

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 52 : 224 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="relative flex flex-col h-screen bg-[#07111F] border-r border-white/[0.06] shrink-0 overflow-hidden"
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center h-14 px-3 border-b border-white/[0.06] shrink-0',
        sidebarCollapsed ? 'justify-center' : 'gap-2.5'
      )}>
        <div className="relative shrink-0">
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7">
            <circle cx="16" cy="16" r="12" stroke="#5B8CFF" strokeWidth="2.5" fill="none"/>
            <path d="M16 4 A12 12 0 0 1 28 16" stroke="#5B8CFF" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            <path d="M26.5 12.5 L28 16 L24.5 15" stroke="#5B8CFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <circle cx="16" cy="16" r="2.5" fill="#5B8CFF"/>
          </svg>
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <span className="text-white font-bold text-base tracking-tight whitespace-nowrap">CYCLO</span>
              <p className="text-[#5B8CFF] text-[9px] font-medium -mt-0.5 whitespace-nowrap">by ACREDYTA</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-1">
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[10px] font-semibold text-white/25 uppercase tracking-wider px-3.5 py-1.5 whitespace-nowrap"
                >
                  {group.label}
                </motion.p>
              )}
            </AnimatePresence>
            {group.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={cn(
                    'flex items-center gap-2.5 mx-1.5 mb-0.5 px-2 py-2 rounded-lg text-sm font-medium transition-colors group',
                    isActive
                      ? 'bg-[#5B8CFF]/15 text-[#5B8CFF]'
                      : 'text-white/50 hover:text-white/90 hover:bg-white/[0.06]',
                    sidebarCollapsed && 'justify-center px-0'
                  )}
                >
                  <Icon className={cn(
                    'shrink-0',
                    sidebarCollapsed ? 'w-5 h-5' : 'w-4 h-4',
                    isActive ? 'text-[#5B8CFF]' : 'text-current'
                  )} />
                  <AnimatePresence>
                    {!sidebarCollapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="whitespace-nowrap overflow-hidden"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className={cn(
          'flex items-center h-10 border-t border-white/[0.06] text-white/40 hover:text-white/80 transition-colors shrink-0',
          sidebarCollapsed ? 'justify-center' : 'gap-2 px-4'
        )}
      >
        {sidebarCollapsed
          ? <ChevronRight className="w-4 h-4" />
          : <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-xs whitespace-nowrap">Recolher</span>
            </>
        }
      </button>
    </motion.aside>
  )
}
