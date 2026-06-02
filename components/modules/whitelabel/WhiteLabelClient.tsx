'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Palette, Globe, CheckCircle, ExternalLink, Upload } from 'lucide-react'
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
  const [primary, setPrimary] = useState(org?.primary_color ?? '#5B8CFF')
  const [secondary, setSecondary] = useState(org?.secondary_color ?? '#4a7aee')
  const [button, setButton] = useState(org?.button_color ?? '#5B8CFF')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

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
      primary_color: primary,
      secondary_color: secondary,
      button_color: button,
    }).eq('id', org?.id ?? '')

    if (error) { toast.error('Erro ao salvar'); setSaving(false); return }
    toast.success('Configurações salvas!')
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">White Label</h2>
          <p className="text-sm text-muted-foreground">Personalize a aparência do portal do cliente</p>
        </div>
        <Button
          size="sm"
          className={cn('gap-1.5 text-xs', saved ? 'bg-[#12B981] hover:bg-[#12B981]' : 'bg-[#5B8CFF] hover:bg-[#4a7aee]', 'text-white')}
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
                <Globe className="w-4 h-4 text-[#5B8CFF]" /> Identidade da Agência
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
                <Label className="text-xs font-semibold">Logo (URL)</Label>
                <div className="flex gap-2">
                  <Input placeholder="https://suaagencia.com/logo.png" className="h-9 text-sm flex-1" disabled />
                  <Button size="sm" variant="outline" className="h-9 gap-1.5 text-xs" disabled>
                    <Upload className="w-3.5 h-3.5" /> Upload
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Upload de logo em breve. Por enquanto, use uma URL pública.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Palette className="w-4 h-4 text-[#8B5CF6]" /> Cores da Marca
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
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Primária</Label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={primary} onChange={e => setPrimary(e.target.value)} className="w-9 h-9 rounded-lg cursor-pointer border border-border" />
                    <Input value={primary} onChange={e => setPrimary(e.target.value)} className="h-9 text-xs font-mono" maxLength={7} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Secundária</Label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={secondary} onChange={e => setSecondary(e.target.value)} className="w-9 h-9 rounded-lg cursor-pointer border border-border" />
                    <Input value={secondary} onChange={e => setSecondary(e.target.value)} className="h-9 text-xs font-mono" maxLength={7} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Botões</Label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={button} onChange={e => setButton(e.target.value)} className="w-9 h-9 rounded-lg cursor-pointer border border-border" />
                    <Input value={button} onChange={e => setButton(e.target.value)} className="h-9 text-xs font-mono" maxLength={7} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <Card className="border-border shadow-none overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Prévia do Portal do Cliente</CardTitle>
              <Badge className="text-[10px] bg-muted border-0 text-muted-foreground">Live preview</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border-t border-border bg-[#F6F8FB] p-4">
              {/* Mock portal header */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-3">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <div>
                    <span className="font-bold text-sm" style={{ color: primary }}>{name || 'Minha Agência'}</span>
                    {tagline && <p className="text-[10px] text-gray-400 mt-0.5">{tagline}</p>}
                  </div>
                  <span className="text-xs text-gray-400">Cliente XYZ</span>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-sm text-gray-800 mb-3">Portal de Aprovações</h3>
                  <div className="flex gap-2 mb-3">
                    {[['5', 'Total'], ['3', 'Aguardando'], ['2', 'Aprovados']].map(([v, l]) => (
                      <div key={l} className="flex-1 text-center border border-gray-100 rounded-lg py-2">
                        <p className="font-bold text-sm text-gray-800">{v}</p>
                        <p className="text-[10px] text-gray-400">{l}</p>
                      </div>
                    ))}
                  </div>
                  <div className="border border-gray-100 rounded-lg p-3 mb-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-700">Post Instagram — Carrossel</span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${primary}15`, color: primary }}>Aguardando</span>
                    </div>
                    <div className="h-20 rounded-lg mb-2" style={{ background: `${primary}10` }} />
                    <div className="flex gap-2">
                      <button className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold text-white" style={{ background: '#12B981' }}>
                        ✓ Aprovar
                      </button>
                      <button className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold border border-red-200 text-red-500">
                        ↺ Ajuste
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-center text-[10px] text-gray-400">
                Powered by <span style={{ color: primary }}>CYCLO</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Portal link */}
      <Card className="border-[#5B8CFF]/20 bg-[#5B8CFF]/5 shadow-none">
        <CardContent className="p-4 flex items-center gap-3">
          <ExternalLink className="w-4 h-4 text-[#5B8CFF] shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Link do Portal</p>
            <p className="text-xs text-muted-foreground">
              Compartilhe com seus clientes:{' '}
              <code className="text-[#5B8CFF]">/portal/[client-id]</code>
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
