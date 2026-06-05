'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Palette, Globe, CheckCircle, ExternalLink, LayoutDashboard, Users, Kanban, BarChart2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Organization } from '@/types/database'

const PRESET_COLORS = [
  { name: 'Azul CYCLO', primary: '#5B8CFF', secondary: '#4a7aee', button: '#5B8CFF' },
  { name: 'Roxo', primary: '#8B5CF6', secondary: '#7c3aed', button: '#8B5CF6' },
  { name: 'Verde', primary: '#12B981', secondary: '#059669', button: '#12B981' },
  { name: 'Vermelho', primary: '#e1493c', secondary: '#dc2626', button: '#e1493c' },
  { name: 'Âmbar', primary: '#F59E0B', secondary: '#d97706', button: '#F59E0B' },
  { name: 'Rosa', primary: '#EC4899', secondary: '#db2777', button: '#EC4899' },
]

interface Props {
  org: Organization | null
}

export function WhiteLabelClient({ org }: Props) {
  const [name, setName] = useState(org?.name ?? '')
  const [tagline, setTagline] = useState(org?.tagline ?? '')
  const [logoUrl, setLogoUrl] = useState(org?.logo_url ?? '')
  const [primary, setPrimary] = useState(org?.primary_color ?? '#5B8CFF')
  const [secondary, setSecondary] = useState(org?.secondary_color ?? '#4a7aee')
  const [button, setButton] = useState(org?.button_color ?? '#5B8CFF')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Apply CSS vars live as user changes colors
  useEffect(() => {
    document.documentElement.style.setProperty('--brand-primary', primary)
    document.documentElement.style.setProperty('--brand-secondary', secondary)
    document.documentElement.style.setProperty('--brand-button', button)
  }, [primary, secondary, button])

  const applyPreset = (preset: typeof PRESET_COLORS[0]) => {
    setPrimary(preset.primary)
    setSecondary(preset.secondary)
    setButton(preset.button)
  }

  const save = async () => {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('organizations').update({
      name,
      tagline: tagline || null,
      logo_url: logoUrl || null,
      primary_color: primary,
      secondary_color: secondary,
      button_color: button,
    }).eq('id', org?.id ?? '')

    if (error) { toast.error('Erro ao salvar'); setSaving(false); return }
    toast.success('Configurações salvas! Cores aplicadas na plataforma.')
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const MOCK_NAV = [
    { icon: LayoutDashboard, label: 'Dashboard' },
    { icon: Users, label: 'Clientes Ativos' },
    { icon: Kanban, label: 'Pipeline' },
    { icon: BarChart2, label: 'Relatórios' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">White Label</h2>
          <p className="text-sm text-muted-foreground">Personalize a identidade visual da sua plataforma CYCLO</p>
        </div>
        <Button
          size="sm"
          className={cn('gap-1.5 text-xs text-white', saved ? 'bg-[#12B981] hover:bg-[#12B981]' : 'hover:opacity-90')}
          style={{ backgroundColor: saved ? '#12B981' : 'var(--brand-primary,#5B8CFF)' }}
          onClick={save}
          disabled={saving}
        >
          {saved ? <><CheckCircle className="w-3.5 h-3.5" /> Salvo</> : saving ? 'Salvando…' : 'Salvar alterações'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings form */}
        <div className="space-y-4">
          <Card className="border-border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Globe className="w-4 h-4" style={{ color: 'var(--brand-primary,#5B8CFF)' }} /> Identidade da Agência
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nome da agência</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Minha Agência" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tagline / Slogan</Label>
                <Input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="Marketing que transforma resultados" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Logo (URL pública)</Label>
                <Input
                  value={logoUrl}
                  onChange={e => setLogoUrl(e.target.value)}
                  placeholder="https://suaagencia.com/logo.png"
                  className="h-9 text-sm"
                  type="url"
                />
                <p className="text-xs text-muted-foreground">Cole a URL de uma imagem PNG/SVG pública. Aparece no cabeçalho da plataforma.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Palette className="w-4 h-4" style={{ color: 'var(--brand-primary,#5B8CFF)' }} /> Cores da Marca
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Paletas pré-definidas</Label>
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_COLORS.map(preset => (
                    <button
                      key={preset.name}
                      onClick={() => applyPreset(preset)}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-lg border text-xs font-medium transition-all',
                        primary === preset.primary
                          ? 'border-foreground/40 bg-muted/50'
                          : 'border-border hover:border-border/80'
                      )}
                    >
                      <div className="w-5 h-5 rounded-full shrink-0" style={{ background: preset.primary }} />
                      <span className="truncate">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Primária', val: primary, set: setPrimary },
                  { label: 'Secundária', val: secondary, set: setSecondary },
                  { label: 'Botões', val: button, set: setButton },
                ].map(({ label, val, set }) => (
                  <div key={label} className="space-y-1.5">
                    <Label className="text-xs font-semibold">{label}</Label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={val} onChange={e => set(e.target.value)} className="w-9 h-9 rounded-lg cursor-pointer border border-border" />
                      <Input value={val} onChange={e => set(e.target.value)} className="h-9 text-xs font-mono" maxLength={7} />
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-2.5">
                As cores se aplicam ao menu lateral, botões e destaques da plataforma em tempo real.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Live preview — CYCLO platform mock */}
        <Card className="border-border shadow-none overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Prévia da Plataforma</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border-t border-border flex overflow-hidden rounded-b-lg" style={{ height: 340 }}>
              {/* Mock sidebar */}
              <div className="w-32 flex flex-col shrink-0" style={{ background: '#07111F' }}>
                {/* Logo area */}
                <div className="px-3 py-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-1.5">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-5 h-5 object-contain rounded" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: primary }}>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: primary }} />
                      </div>
                    )}
                    <div>
                      <p className="text-white text-[9px] font-bold leading-none">{name || 'CYCLO'}</p>
                      {tagline && <p className="text-[7px] mt-0.5 leading-none" style={{ color: primary }}>{tagline.slice(0, 18)}</p>}
                    </div>
                  </div>
                </div>
                {/* Nav items */}
                <div className="flex-1 py-2 px-1.5 space-y-0.5">
                  {MOCK_NAV.map((item, i) => {
                    const Icon = item.icon
                    const isActive = i === 0
                    return (
                      <div
                        key={item.label}
                        className="flex items-center gap-1.5 px-1.5 py-1.5 rounded-md"
                        style={isActive
                          ? { backgroundColor: `${primary}25`, color: primary }
                          : { color: 'rgba(255,255,255,0.4)' }
                        }
                      >
                        <Icon style={{ width: 10, height: 10 }} />
                        <span style={{ fontSize: 8, fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Mock content area */}
              <div className="flex-1 bg-[#F6F8FB] dark:bg-background p-3 space-y-2.5 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-bold text-gray-800">Bom dia! 👋</p>
                    <p className="text-[7px] text-gray-400">Resumo da sua agência</p>
                  </div>
                  <button className="px-2.5 py-1 rounded-md text-white text-[7px] font-semibold" style={{ background: primary }}>
                    + Novo lead
                  </button>
                </div>

                {/* KPI cards */}
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: 'MRR Total', val: 'R$ 28.500' },
                    { label: 'Clientes', val: '14 ativos' },
                    { label: 'Pipeline', val: 'R$ 52.000' },
                  ].map(kpi => (
                    <div key={kpi.label} className="bg-white rounded-lg p-1.5 border border-gray-100">
                      <p className="text-[6px] text-gray-400">{kpi.label}</p>
                      <p className="text-[8px] font-bold text-gray-800 mt-0.5">{kpi.val}</p>
                      <div className="w-full h-0.5 rounded-full mt-1" style={{ background: `${primary}30` }}>
                        <div className="h-full rounded-full" style={{ background: primary, width: '65%' }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Color swatches */}
                <div className="bg-white rounded-lg p-2 border border-gray-100">
                  <p className="text-[7px] text-gray-500 mb-1.5">Cores aplicadas</p>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-5 h-5 rounded-md" style={{ background: primary }} />
                      <span className="text-[6px] text-gray-400 font-mono">{primary}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-5 h-5 rounded-md" style={{ background: secondary }} />
                      <span className="text-[6px] text-gray-400 font-mono">{secondary}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-5 h-5 rounded-md" style={{ background: button }} />
                      <span className="text-[6px] text-gray-400 font-mono">{button}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Portal link */}
      <Card className="border-border shadow-none" style={{ borderColor: `${primary}30`, background: `${primary}08` }}>
        <CardContent className="p-4 flex items-center gap-3">
          <ExternalLink className="w-4 h-4 shrink-0" style={{ color: primary }} />
          <div className="flex-1">
            <p className="text-sm font-semibold">Link do Portal do Cliente</p>
            <p className="text-xs text-muted-foreground">
              Compartilhe com seus clientes:{' '}
              <code style={{ color: primary }}>/portal/[client-id]</code>
            </p>
          </div>
          <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => { navigator.clipboard.writeText('/portal/'); toast.success('Copiado!') }}>
            <ExternalLink className="w-3 h-3" /> Copiar link
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
