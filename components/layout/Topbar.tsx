'use client'

import { usePathname } from 'next/navigation'
import {
  Bell, Search, Moon, Sun, ChevronDown,
  LayoutDashboard, Users, Kanban, Bot, Settings,
  Palette, LogOut, User, Zap, DollarSign, HelpCircle,
} from 'lucide-react'
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
  '/crm': 'CRM — Clientes',
  '/pipeline': 'Pipeline de Vendas',
  '/agenda': 'Agenda',
  '/planner': 'Planner de Conteúdo',
  '/aprovacoes': 'Aprovações',
  '/campanhas': 'Campanhas de Email',
  '/landingpages': 'Landing Pages',
  '/pesquisa': 'Pesquisa de Mercado',
  '/relatorios': 'Relatórios',
  '/metas': 'Metas',
  '/ia': 'CYCLO AI',
  '/atendimento': 'Atendimento',
  '/automacoes': 'Automações',
  '/financeiro': 'Financeiro',
  '/whitelabel': 'White Label',
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
      {/* Page title */}
      <h1 className="text-[15px] font-semibold text-foreground flex-1 truncate">{title}</h1>

      {/* Search shortcut */}
      <button className="hidden md:flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-lg hover:bg-muted/80 transition-colors">
        <Search className="w-3.5 h-3.5" />
        <span>Buscar</span>
        <kbd className="ml-1 text-[10px] bg-background border border-border rounded px-1 py-0.5">⌘K</kbd>
      </button>

      {/* Dark mode toggle */}
      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={toggleDarkMode}>
        {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </Button>

      {/* Notifications */}
      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground relative" onClick={() => router.push('/configuracoes')}>
        <Bell className="w-4 h-4" />
        {notificationCount > 0 && (
          <Badge className="absolute -top-0.5 -right-0.5 h-4 w-4 p-0 flex items-center justify-center text-[9px] bg-[#e1493c] border-0">
            {notificationCount > 9 ? '9+' : notificationCount}
          </Badge>
        )}
      </Button>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-lg hover:bg-muted px-2 py-1.5 transition-colors outline-none">
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
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="w-56">
          {/* User info */}
          <DropdownMenuLabel className="font-normal pb-2">
            <div className="flex items-center gap-2.5">
              <Avatar className="h-8 w-8">
                <AvatarImage src={userAvatar} />
                <AvatarFallback className="bg-[#5B8CFF] text-white text-xs font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{userName}</p>
                <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
              </div>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          {/* Navegação rápida */}
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wider px-2 py-1">
              Navegação rápida
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => router.push('/dashboard')} className="gap-2 cursor-pointer">
              <LayoutDashboard className="w-4 h-4 text-muted-foreground" /> Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/crm')} className="gap-2 cursor-pointer">
              <Users className="w-4 h-4 text-muted-foreground" /> CRM — Clientes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/pipeline')} className="gap-2 cursor-pointer">
              <Kanban className="w-4 h-4 text-muted-foreground" /> Pipeline de Vendas
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/ia')} className="gap-2 cursor-pointer">
              <Bot className="w-4 h-4 text-muted-foreground" /> CYCLO AI
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          {/* Configurações */}
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wider px-2 py-1">
              Conta
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => router.push('/configuracoes')} className="gap-2 cursor-pointer">
              <Settings className="w-4 h-4 text-muted-foreground" /> Configurações
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/whitelabel')} className="gap-2 cursor-pointer">
              <Palette className="w-4 h-4 text-muted-foreground" /> White Label
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/financeiro')} className="gap-2 cursor-pointer">
              <DollarSign className="w-4 h-4 text-muted-foreground" /> Financeiro
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/automacoes')} className="gap-2 cursor-pointer">
              <Zap className="w-4 h-4 text-muted-foreground" /> Automações
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={handleSignOut}
            className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
          >
            <LogOut className="w-4 h-4" /> Sair da plataforma
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
