'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Trophy, Sparkles, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import type { Lead } from '@/types/database'

const SERVICES = ['Social Media', 'Tráfego Pago', 'SEO', 'Email Marketing', 'Branding', 'Criação de Conteúdo', 'Website', 'Consultoria']
const SECTORS = ['E-commerce', 'Saúde', 'Educação', 'Imobiliário', 'Gastronomia', 'Tecnologia', 'Varejo', 'Serviços', 'Indústria', 'Outro']
const STATUS_OPTIONS = ['Ativo', 'Em negociação', 'Em risco', 'Inativo']

interface Props {
  lead: Lead
  onClose: () => void
  /** Called with the new client id after successful creation */
  onConverted: (clientId: string) => void
}

export function ConvertLeadModal({ lead, onClose, onConverted }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  // Pre-fill from lead
  const [name, setName] = useState(lead.company || lead.name)
  const [sector, setSector] = useState<string>('')
  const [email, setEmail] = useState(lead.email ?? '')
  const [phone, setPhone] = useState(lead.phone ?? '')
  const [mrr, setMrr] = useState(String(lead.value ?? ''))
  const [status, setStatus] = useState('Ativo')
  const [services, setServices] = useState<string[]>([])
  const [objectives, setObjectives] = useState('')
  const [customService, setCustomService] = useState('')

  const toggleService = (s: string) =>
    setServices(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const addCustomService = () => {
    const v = customService.trim()
    if (!v) return
    if (services.some(s => s.toLowerCase() === v.toLowerCase())) {
      toast.error('Esse serviço já está adicionado')
      return
    }
    setServices(prev => [...prev, v])
    setCustomService('')
  }

  const submit = async () => {
    if (!name.trim()) { toast.error('Nome obrigatório'); return }
    setSaving(true)
    const supabase = createClient()

    const { data: me } = await supabase.from('users').select('organization_id').single()
    if (!me?.organization_id) { toast.error('Org não encontrada'); setSaving(false); return }

    // Create client with lead origin link
    const { data: client, error } = await supabase.from('clients').insert({
      organization_id: me.organization_id,
      name: name.trim(),
      sector: sector || undefined,
      email: email || undefined,
      phone: phone || undefined,
      mrr: Number(mrr) || 0,
      status,
      services,
      objectives: objectives || undefined,
      responsible_id: lead.responsible_id ?? undefined,
      contract_since: new Date().toISOString().slice(0, 10),
      originated_from_lead_id: lead.id,
    }).select().single()

    if (error || !client) { toast.error(`Erro ao criar cliente: ${error?.message ?? ''}`); setSaving(false); return }

    // Mark lead as won (if not already) so it doesn't keep showing in active pipeline
    if (!lead.won_at) {
      await supabase.from('leads').update({ won_at: new Date().toISOString() }).eq('id', lead.id)
    }

    // Log conversion in activity history (on the lead — preserves the record on the original)
    await supabase.from('activities').insert({
      lead_id: lead.id,
      organization_id: lead.organization_id,
      user_id: null,
      type: 'ganho',
      title: `🎉 Lead convertido em cliente: ${client.name}`,
      description: `Cliente vinculado mantém todo o histórico desta oportunidade.`,
    })

    toast.success(`Cliente "${client.name}" criado!`)
    setSaving(false)
    onConverted(client.id)
    router.push(`/crm/${client.id}`)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#12B981]" />
            Converter em cliente
          </DialogTitle>
        </DialogHeader>

        <div className="bg-gradient-to-br from-[#12B981]/8 to-transparent border border-[#12B981]/20 rounded-xl p-3 mt-1 mb-3">
          <p className="text-xs font-semibold flex items-center gap-1.5 text-[#12B981]">
            <Sparkles className="w-3.5 h-3.5" />
            Histórico completo será herdado
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Todas as notas, ligações, atividades, e-mails e arquivos deste lead aparecerão automaticamente no perfil do cliente.
          </p>
        </div>

        <form onSubmit={e => { e.preventDefault(); submit() }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold">Nome do cliente *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Setor</Label>
              <Select value={sector} onValueChange={v => v && setSector(v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Status inicial</Label>
              <Select value={status} onValueChange={v => v && setStatus(v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">MRR (R$/mês)</Label>
              <Input type="number" value={mrr} onChange={e => setMrr(e.target.value)} placeholder="3500" className="h-9 text-sm" />
              {lead.value && (
                <p className="text-[10px] text-muted-foreground">Pré-preenchido com valor do lead (R$ {lead.value.toLocaleString('pt-BR')})</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">E-mail</Label>
              <Input value={email} onChange={e => setEmail(e.target.value)} type="email" className="h-9 text-sm" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold">Telefone</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold">Objetivo / Briefing</Label>
              <textarea
                value={objectives}
                onChange={e => setObjectives(e.target.value)}
                rows={2}
                placeholder="Qual o objetivo do contrato fechado?"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold">Serviços contratados</Label>

            {/* Sugestões */}
            <div className="flex flex-wrap gap-1.5">
              {SERVICES.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleService(s)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    services.includes(s)
                      ? 'bg-[#5B8CFF]/10 border-[#5B8CFF] text-[#5B8CFF]'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Custom service input */}
            <div className="flex gap-1.5">
              <Input
                value={customService}
                onChange={e => setCustomService(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomService() } }}
                placeholder="Adicionar serviço personalizado..."
                className="h-8 text-xs flex-1"
              />
              <Button type="button" size="sm" variant="outline" onClick={addCustomService} disabled={!customService.trim()} className="h-8 px-2.5 text-xs gap-1 shrink-0">
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </Button>
            </div>

            {/* Custom services (not in SERVICES list) shown as removable chips */}
            {services.filter(s => !SERVICES.includes(s)).length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {services.filter(s => !SERVICES.includes(s)).map(s => (
                  <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/30">
                    {s}
                    <button type="button" onClick={() => toggleService(s)} className="hover:bg-[#8B5CF6]/20 rounded-full p-0.5">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button type="submit" disabled={saving || !name.trim()} className="flex-1 text-white gap-1.5" style={{ background: '#12B981' }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
              Criar cliente
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
