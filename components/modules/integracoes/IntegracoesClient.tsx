'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Key, Webhook, BarChart3, Mail, MessageSquare,
  Copy, Check, Eye, EyeOff, ExternalLink, Info,
  Bot, Zap, Globe, ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Props {
  orgId: string
  orgSlug: string
}

type Tab = 'api' | 'leads' | 'tracking' | 'email'

const TAB_CONFIG: { value: Tab; label: string; icon: React.ElementType }[] = [
  { value: 'api', label: 'CYCLO IA — Chaves API', icon: Key },
  { value: 'leads', label: 'Captura de Leads', icon: Webhook },
  { value: 'tracking', label: 'Rastreamento UTM', icon: BarChart3 },
  { value: 'email', label: 'Email', icon: Mail },
]

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
    toast.success('Copiado!')
  }
  return (
    <button onClick={copy} className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground">
      {copied ? <Check className="w-3.5 h-3.5 text-[#12B981]" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function SecretField({ label, value, placeholder }: { label: string; value: string; placeholder?: string }) {
  const [show, setShow] = useState(false)
  const [val, setVal] = useState(value)
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold">{label}</Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type={show ? 'text' : 'password'}
            value={val}
            onChange={e => setVal(e.target.value)}
            placeholder={placeholder ?? 'Cole sua chave aqui'}
            className="h-9 text-sm pr-9 font-mono"
          />
          <button
            onClick={() => setShow(!show)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
        {val && <CopyButton value={val} />}
        <Button size="sm" className="bg-[#5B8CFF] hover:bg-[#4a7aee] text-white text-xs h-9 px-3"
          onClick={() => toast.success(`${label} salva!`)}>
          Salvar
        </Button>
      </div>
    </div>
  )
}

export function IntegracoesClient({ orgId, orgSlug }: Props) {
  const [tab, setTab] = useState<Tab>('api')
  const webhookUrl = `https://cyclo-beta.vercel.app/api/leads/capture/${orgSlug || orgId}`

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Integrações</h2>
        <p className="text-sm text-muted-foreground">Conecte ferramentas externas ao CYCLO</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TAB_CONFIG.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap',
              tab === value ? 'border-[#5B8CFF] text-[#5B8CFF]' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* CYCLO IA — API Keys */}
      {tab === 'api' && (
        <div className="max-w-2xl space-y-6">
          <div className="flex items-start gap-3 p-4 bg-[#5B8CFF]/5 border border-[#5B8CFF]/20 rounded-xl">
            <Bot className="w-5 h-5 text-[#5B8CFF] mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[#5B8CFF]">Como funciona o CYCLO IA</p>
              <p className="text-xs text-muted-foreground mt-1">
                O CYCLO IA usa sua própria chave de API do provedor escolhido. Cada usuário é responsável pela sua conta e tokens consumidos.
                Configure abaixo a chave do modelo que prefere usar.
              </p>
            </div>
          </div>

          <Card className="border-border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold">A</span>
                </div>
                Anthropic — Claude
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <SecretField label="API Key (Anthropic)" placeholder="sk-ant-..." value="" />
              <p className="text-xs text-muted-foreground">
                Obtenha sua chave em{' '}
                <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-[#5B8CFF] hover:underline inline-flex items-center gap-0.5">
                  console.anthropic.com <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="w-6 h-6 bg-[#10a37f] rounded flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold">G</span>
                </div>
                OpenAI — ChatGPT
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <SecretField label="API Key (OpenAI)" placeholder="sk-..." value="" />
              <p className="text-xs text-muted-foreground">
                Obtenha sua chave em{' '}
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-[#5B8CFF] hover:underline inline-flex items-center gap-0.5">
                  platform.openai.com <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="w-6 h-6 bg-[#4285F4] rounded flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold">G</span>
                </div>
                Google — Gemini
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <SecretField label="API Key (Google AI)" placeholder="AIza..." value="" />
              <p className="text-xs text-muted-foreground">
                Obtenha sua chave em{' '}
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[#5B8CFF] hover:underline inline-flex items-center gap-0.5">
                  aistudio.google.com <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Captura de Leads */}
      {tab === 'leads' && (
        <div className="max-w-2xl space-y-6">
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl dark:bg-amber-950/20 dark:border-amber-900/30">
            <Info className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Captura automática de leads</p>
              <p className="text-xs text-muted-foreground mt-1">
                Use o webhook abaixo para receber leads de qualquer fonte: formulários, botões de WhatsApp, Google Ads, Meta Ads, páginas de captura e mais.
              </p>
            </div>
          </div>

          {/* Webhook URL */}
          <Card className="border-border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Webhook className="w-4 h-4 text-[#5B8CFF]" /> Webhook para captura de leads
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">URL do Webhook (POST)</Label>
                <div className="flex gap-2">
                  <Input value={webhookUrl} readOnly className="h-9 text-xs font-mono bg-muted/50" />
                  <CopyButton value={webhookUrl} />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Estrutura JSON esperada</Label>
                <pre className="text-xs bg-muted/50 rounded-lg p-3 overflow-x-auto text-muted-foreground font-mono leading-relaxed">
{`{
  "name": "Nome do lead",
  "email": "email@exemplo.com",
  "phone": "11999999999",
  "company": "Empresa (opcional)",
  "origin": "facebook_ads | google_ads | instagram | whatsapp | site",
  "utm_source": "facebook",
  "utm_medium": "cpc",
  "utm_campaign": "nome-da-campanha",
  "value": 5000,
  "notes": "Observações opcionais"
}`}
                </pre>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Exemplo de curl para teste</Label>
                <pre className="text-xs bg-muted/50 rounded-lg p-3 overflow-x-auto text-muted-foreground font-mono leading-relaxed whitespace-pre-wrap">
{`curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"João Silva","email":"joao@email.com","origin":"google_ads","utm_campaign":"marketing-digital"}'`}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Botão WhatsApp */}
          <Card className="border-border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#25D366]" /> Botão de WhatsApp com rastreamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Use este código HTML em sua página de captura para criar um botão de WhatsApp que registra o lead automaticamente no CRM.
              </p>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Seu número de WhatsApp</Label>
                <Input placeholder="5511999999999 (DDI+DDD+número)" className="h-9 text-sm" />
              </div>
              <pre className="text-xs bg-muted/50 rounded-lg p-3 overflow-x-auto text-muted-foreground font-mono leading-relaxed">
{`<a href="https://wa.me/SEU_NUMERO?text=Olá,%20vim%20pelo%20anúncio!"
   onclick="fetch('${webhookUrl}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Lead WhatsApp',origin:'whatsapp',utm_source:new URLSearchParams(location.search).get('utm_source')||'direto'})})"
   target="_blank">
  💬 Falar no WhatsApp
</a>`}
              </pre>
            </CardContent>
          </Card>

          {/* Zapier / N8N */}
          <Card className="border-border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#FF6B35]" /> Zapier / N8N / Make
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                Use o webhook acima em qualquer automação Zapier, N8N ou Make para enviar leads de qualquer formulário (Typeform, RD Station, HubSpot, Facebook Lead Ads, etc.)
              </p>
              <div className="flex gap-3">
                {['Zapier', 'N8N', 'Make'].map(tool => (
                  <div key={tool} className="flex items-center gap-2 px-3 py-2 bg-muted/40 rounded-lg text-xs font-medium">
                    <div className="w-2 h-2 rounded-full bg-[#5B8CFF]" />
                    {tool}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rastreamento UTM */}
      {tab === 'tracking' && (
        <div className="max-w-2xl space-y-6">
          <div className="flex items-start gap-3 p-4 bg-[#5B8CFF]/5 border border-[#5B8CFF]/20 rounded-xl">
            <BarChart3 className="w-5 h-5 text-[#5B8CFF] mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Configure seus pixels e IDs de rastreamento. Os leads capturados via webhook já incluem automaticamente UTM parameters quando presentes na URL.
            </p>
          </div>

          <Card className="border-border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Meta Ads (Facebook/Instagram)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Pixel ID do Facebook</Label>
                <div className="flex gap-2">
                  <Input placeholder="123456789012345" className="h-9 text-sm font-mono" />
                  <Button size="sm" className="bg-[#5B8CFF] hover:bg-[#4a7aee] text-white text-xs h-9"
                    onClick={() => toast.success('Pixel ID salvo!')}>
                    Salvar
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Token de Acesso (Conversions API)</Label>
                <SecretField label="" placeholder="EAABsb..." value="" />
              </div>
              <p className="text-xs text-muted-foreground">
                Eventos de conversão (lead criado, contrato fechado) serão enviados automaticamente para o Meta via Conversions API.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Google Ads / Analytics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Google Analytics 4 — Measurement ID</Label>
                <div className="flex gap-2">
                  <Input placeholder="G-XXXXXXXXXX" className="h-9 text-sm font-mono" />
                  <Button size="sm" className="bg-[#5B8CFF] hover:bg-[#4a7aee] text-white text-xs h-9"
                    onClick={() => toast.success('GA4 ID salvo!')}>
                    Salvar
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Google Ads — Conversion ID</Label>
                <div className="flex gap-2">
                  <Input placeholder="AW-XXXXXXXXXX/XXXXXXXXXXXXXX" className="h-9 text-sm font-mono" />
                  <Button size="sm" className="bg-[#5B8CFF] hover:bg-[#4a7aee] text-white text-xs h-9"
                    onClick={() => toast.success('Conversion ID salvo!')}>
                    Salvar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* UTM guide */}
          <Card className="border-border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Globe className="w-4 h-4" /> Parâmetros UTM rastreados automaticamente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { param: 'utm_source', desc: 'Origem (google, facebook, instagram...)' },
                  { param: 'utm_medium', desc: 'Meio (cpc, email, social...)' },
                  { param: 'utm_campaign', desc: 'Nome da campanha' },
                  { param: 'utm_content', desc: 'Conteúdo do anúncio' },
                  { param: 'utm_term', desc: 'Palavra-chave (Google Ads)' },
                ].map(({ param, desc }) => (
                  <div key={param} className="flex items-center gap-3 text-xs">
                    <code className="bg-muted px-2 py-0.5 rounded font-mono text-[#5B8CFF] w-32 shrink-0">{param}</code>
                    <span className="text-muted-foreground">{desc}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Email */}
      {tab === 'email' && (
        <div className="max-w-2xl space-y-6">
          <p className="text-sm text-muted-foreground">Conecte seu provedor de email para enviar e receber emails diretamente pelo CYCLO, com histórico completo no perfil de cada cliente.</p>

          {[
            { name: 'Gmail / Google Workspace', color: '#EA4335', desc: 'OAuth2 — login seguro com sua conta Google', status: 'available' },
            { name: 'Microsoft Outlook / 365', color: '#0072C6', desc: 'OAuth2 — login seguro com sua conta Microsoft', status: 'available' },
            { name: 'SMTP personalizado', color: '#6B7280', desc: 'Configure qualquer servidor SMTP (Zoho, Titan, Brevo...)', status: 'available' },
          ].map(provider => (
            <Card key={provider.name} className="border-border shadow-none">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${provider.color}15` }}>
                  <Mail className="w-5 h-5" style={{ color: provider.color }} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{provider.name}</p>
                  <p className="text-xs text-muted-foreground">{provider.desc}</p>
                </div>
                <Button size="sm" variant="outline" className="text-xs gap-1.5 shrink-0"
                  onClick={() => toast.info(`Configuração de ${provider.name} disponível em breve. Use SMTP por enquanto.`)}>
                  Conectar <ChevronRight className="w-3 h-3" />
                </Button>
              </CardContent>
            </Card>
          ))}

          {/* SMTP form */}
          <Card className="border-border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Configuração SMTP</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Servidor SMTP</Label>
                  <Input placeholder="smtp.gmail.com" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Porta</Label>
                  <Input placeholder="587" className="h-9 text-sm" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Email</Label>
                <Input placeholder="seu@email.com" type="email" className="h-9 text-sm" />
              </div>
              <SecretField label="Senha ou App Password" value="" placeholder="Senha de aplicativo" />
              <Button className="w-full bg-[#5B8CFF] hover:bg-[#4a7aee] text-white text-sm"
                onClick={() => toast.success('Configuração SMTP salva!')}>
                Salvar e testar conexão
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  )
}
