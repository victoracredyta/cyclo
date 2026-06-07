'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import {
  Moon, Sun, ChevronDown,
  LayoutDashboard, Users, Kanban, Bot, Settings,
  Palette, LogOut, Zap, DollarSign, User,
} from 'lucide-react'
import { NotificationBell } from './NotificationBell'
import { GlobalSearch } from './GlobalSearch'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { useUIStore } from '@/store/useUIStore'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/crm': 'Clientes Ativos',
  '/pipeline': 'Pipeline de Vendas',
  '/agenda': 'Agenda',
  '/email': 'Enviar Email',
  '/relatorios': 'Relatórios',
  '/metas': 'Metas',
  '/ia': 'CYCLO IA',
  '/automacoes': 'Automações',
  '/financeiro': 'Financeiro',
  '/whitelabel': 'White Label',
  '/integracoes': 'Integrações',
  '/configuracoes': 'Configurações',
}

function getPageTitle(pathname: string): string {
  for (const [path, title] of Object.entries(pageTitles)) {
    if (pathname === path || pathname.startsWith(path + '/')) return title
  }
  return 'CYCLO'
}

interface TopbarProps {
  userName?: string
  userEmail?: string
  userAvatar?: string
  notificationCount?: number
}

export function Topbar({ userName, userEmail, userAvatar, notificationCount = 0 }: TopbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { darkMode, toggleDarkMode } = useUIStore()
  const title = getPageTitle(pathname)

  // Apply dark class to <html> based on store
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    document.documentElement.style.colorScheme = darkMode ? 'dark' : 'light'
  }, [darkMode])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = userName
    ? userName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U'

  return (
    <header className="h-14 flex items-center gap-3 px-4 border-b border-border bg-card shrink-0">
      {/* Page title — compact, leaves room for search */}
      <h1 className="text-[15px] font-semibold text-foreground truncate shrink-0">{title}</h1>

      {/* Global search — centered/expandable */}
      <div className="flex-1 flex justify-center">
        <GlobalSearch />
      </div>

      {/* Dark mode toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors"
        onClick={toggleDarkMode}
        title={darkMode ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      >
        {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </Button>

      {/* Notifications */}
      <NotificationBell />

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg hover:bg-muted px-2 py-1.5 transition-colors outline-none cursor-pointer">
          <Avatar className="h-7 w-7">
            <AvatarImage src={userAvatar} />
            <AvatarFallback className="bg-[#5B8CFF] text-white text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium text-foreground leading-none">{userName ?? 'Usuário'}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-none">{userEmail}</p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden md:block" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" sideOffset={8} className="w-56">
          {/* User info header — div simples, fora de Group */}
          <div className="flex items-center gap-2.5 px-2 py-2 border-b border-border mb-1">
            <Avatar className="h-8 w-8">
              <AvatarImage src={userAvatar} />
              <AvatarFallback className="bg-[#5B8CFF] text-white text-xs font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate text-foreground">{userName}</p>
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
            </div>
          </div>

          {/* Perfil */}
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => router.push('/configuracoes')}>
              <User /> Meu perfil
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          {/* Navegação rápida */}
          <DropdownMenuGroup>
            <DropdownMenuLabel>Navegação rápida</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => router.push('/dashboard')}>
              <LayoutDashboard /> Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/crm')}>
              <Users /> CRM — Clientes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/pipeline')}>
              <Kanban /> Pipeline de Vendas
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/ia')}>
              <Bot /> CYCLO AI
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          {/* Conta */}
          <DropdownMenuGroup>
            <DropdownMenuLabel>Conta</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => router.push('/configuracoes')}>
              <Settings /> Configurações
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/whitelabel')}>
              <Palette /> White Label
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/financeiro')}>
              <DollarSign /> Financeiro
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/automacoes')}>
              <Zap /> Automações
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleSignOut} variant="destructive">
            <LogOut /> Sair da plataforma
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
