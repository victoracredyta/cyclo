export type Permission = 'Admin' | 'Gestor' | 'Social Media' | 'Designer' | 'Cliente'
export type ClientStatus = 'Ativo' | 'Em negociação' | 'Em risco' | 'Inativo'
export type ContentChannel = 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'youtube' | 'twitter'
export type ContentFormat = 'Imagem' | 'Carrossel' | 'Vídeo' | 'Reels' | 'Stories' | 'Artigo'
export type ContentObjective = 'Awareness' | 'Engajamento' | 'Conversão' | 'Educação' | 'Autoridade'
export type ContentStatus = 'producao' | 'aguardando' | 'ajuste' | 'aprovado' | 'publicado'
export type ApprovalStatus = 'aguardando' | 'aprovado' | 'ajuste' | 'reprovado'
export type LeadPriority = 'alta' | 'media' | 'baixa'
export type LeadOrigin = 'Indicação' | 'LinkedIn' | 'Google Ads' | 'Instagram' | 'Evento' | 'Referral' | 'Orgânico'
export type Plan = 'starter' | 'pro' | 'enterprise'
export type NotificationType = 'info' | 'success' | 'warning' | 'error'
export type EventType = 'meeting' | 'call' | 'task' | 'deadline' | 'reminder'

export interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
  permission?: Permission[]
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export interface AIMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface OrganizationContext {
  mrr: number
  activeClients: number
  riskClients: number
  pendingApprovals: number
  pipelineValue: number
  openLeads: number
  monthGoals: Array<{ label: string; current: number; target: number }>
}
