'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Key, BarChart3, Mail, Globe,
  Copy, Check, Eye, EyeOff, ExternalLink,
  Bot, Zap, ChevronRight, Code2, Info, CheckCircle2, AlertCircle, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Props {
  orgId: string
  orgSlug: string
}

type Tab = 'api' | 'wordpress' | 'tracking' | 'email'

const TAB_CONFIG: { value: Tab; label: string; icon: React.ElementType }[] = [
  { value: 'api', label: 'CYCLO IA — Chaves API', icon: Key },
  { value: 'wordpress', label: 'WordPress / Elementor', icon: Code2 },
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
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get('tab')
    if (t === 'email' || t === 'api' || t === 'wordpress' || t === 'tracking') return t
    return 'api'
  })
  const [gmailEmail, setGmailEmail] = useState<string | null>(null)
  const [gmailError, setGmailError] = useState<string | null>(null)

  useEffect(() => {
    // Read from localStorage for persistent state
    const stored = localStorage.getItem('cyclo_gmail_email')
    if (stored) setGmailEmail(stored)

    // Pick up OAuth result from cookies (set by /api/auth/google/callback)
    const getCookie = (name: string) => {
      const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
      return match ? decodeURIComponent(match[1]) : null
    }
    const email = getCookie('cyclo_gmail_email')
    const accessToken = getCookie('cyclo_gmail_access_token')
    const refreshToken = getCookie('cyclo_gmail_refresh_token')

    if (email) {
      setGmailEmail(email)
      localStorage.setItem('cyclo_gmail_email', email)
      if (accessToken) localStorage.setItem('cyclo_gmail_access_token', accessToken)
      if (refreshToken) localStorage.setItem('cyclo_gmail_refresh_token', refreshToken)
      // Clear cookies
      ;['cyclo_gmail_email', 'cyclo_gmail_access_token', 'cyclo_gmail_refresh_token'].forEach(n => {
        document.cookie = `${n}=; Max-Age=0; path=/`
      })
      toast.success('Gmail conectado com sucesso!')
    }

    // Handle error from OAuth callback
    const gmailErrorParam = searchParams.get('gmail_error')
    if (gmailErrorParam === 'no_client_id') {
      setGmailError('Configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET nas variáveis de ambiente do servidor.')
    } else if (gmailErrorParam) {
      setGmailError('Não foi possível conectar o Gmail. Tente novamente.')
    }
  }, [])
  const webhookUrl = `https://cyclo-beta.vercel.app/api/leads/capture/${orgSlug || orgId}`

  // Elementor snippet that captures form submissions
  const elementorSnippet = `<script>
(function() {
  var CYCLO_WEBHOOK = "${webhookUrl}";

  // Elementor Forms
  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (!form || form.tagName !== 'FORM') return;
    var data = {};
    var fields = form.querySelectorAll('input, select, textarea');
    fields.forEach(function(f) {
      if (!f.name) return;
      var n = f.name.toLowerCase();
      if (n.includes('nome') || n.includes('name')) data.name = f.value;
      else if (n.includes('email')) data.email = f.value;
      else if (n.includes('fone') || n.includes('phone') || n.includes('tel')) data.phone = f.value;
      else if (n.includes('empresa') || n.includes('company')) data.company = f.value;
    });
    var params = new URLSearchParams(window.location.search);
    if (params.get('utm_source')) data.utm_source = params.get('utm_source');
    if (params.get('utm_medium')) data.utm_medium = params.get('utm_medium');
    if (params.get('utm_campaign')) data.utm_campaign = params.get('utm_campaign');
    if (params.get('utm_content')) data.utm_content = params.get('utm_content');
    data.origin = params.get('utm_source') || 'Formulário WordPress';
    if (data.name || data.email) {
      fetch(CYCLO_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    }
  }, true);
})();
</script>`

  // Contact Form 7 specific snippet
  const cf7Snippet = `<script>
document.addEventListener('wpcf7mailsent', function(event) {
  var d = event.detail.inputs || [];
  var lead = { origin: 'Formulário WordPress' };
  d.forEach(function(f) {
    var n = (f.name || '').toLowerCase();
    if (n.includes('nome') || n.includes('name')) lead.name = f.value;
    else if (n.includes('email')) lead.email = f.value;
    else if (n.includes('fone') || n.includes('phone') || n.includes('tel')) lead.phone = f.value;
    else if (n.includes('empresa') || n.includes('company')) lead.company = f.value;
  });
  var p = new URLSearchParams(window.location.search);
  ['utm_source','utm_medium','utm_campaign'].forEach(function(k) {
    if (p.get(k)) lead[k] = p.get(k);
  });
  if (p.get('utm_source')) lead.origin = p.get('utm_source');
  if (lead.name || lead.email) {
    fetch("${webhookUrl}", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead)
    });
  }
}, false);
</script>`

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
      {tab === 'api' && <AIKeysPanel />}

      {/* WordPress / Elementor */}
      {tab === 'wordpress' && (
        <div className="max-w-2xl space-y-6">
          <div className="flex items-start gap-3 p-4 bg-[#5B8CFF]/5 border border-[#5B8CFF]/20 rounded-xl">
            <Info className="w-5 h-5 text-[#5B8CFF] mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[#5B8CFF]">Captura automática via WordPress / Elementor</p>
              <p className="text-xs text-muted-foreground mt-1">
                Cole o código abaixo na seção <strong>Cabeçalho personalizado</strong> do Elementor (no seu site de captura).
                Ele detecta automaticamente submissões de formulários e envia o lead direto ao CYCLO — incluindo os parâmetros UTM da URL.
              </p>
            </div>
          </div>

          {/* Universal Elementor snippet */}
          <Card className="border-border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Code2 className="w-4 h-4 text-[#5B8CFF]" /> Código Universal (Elementor / qualquer formulário)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>No Elementor Pro: vá em <strong>Site Settings → Custom Code → Head</strong></li>
                <li>No WordPress (sem Elementor Pro): use o plugin <strong>"Insert Headers and Footers"</strong></li>
                <li>Cole o código abaixo e salve</li>
              </ol>
              <div className="relative">
                <pre className="text-[10px] bg-muted/50 rounded-lg p-3 overflow-x-auto text-muted-foreground font-mono leading-relaxed whitespace-pre-wrap">
                  {elementorSnippet}
                </pre>
                <div className="absolute top-2 right-2">
                  <CopyButton value={elementorSnippet} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg p-2.5 dark:bg-amber-950/20 dark:border-amber-900/30">
                O script detecta campos com palavras-chave nos nomes (name, email, phone, empresa) e os mapeia automaticamente. UTMs da URL são capturados e salvos no lead.
              </p>
            </CardContent>
          </Card>

          {/* Contact Form 7 */}
          <Card className="border-border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Code2 className="w-4 h-4 text-[#EC4899]" /> Contact Form 7 (específico)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Se você usa o plugin <strong>Contact Form 7</strong>, este snippet usa o evento nativo <code>wpcf7mailsent</code> para maior precisão.
              </p>
              <div className="relative">
                <pre className="text-[10px] bg-muted/50 rounded-lg p-3 overflow-x-auto text-muted-foreground font-mono leading-relaxed whitespace-pre-wrap">
                  {cf7Snippet}
                </pre>
                <div className="absolute top-2 right-2">
                  <CopyButton value={cf7Snippet} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* JSON direct */}
          <Card className="border-border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#F59E0B]" /> Webhook direto (Zapier / N8N / Make / API)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">URL do Webhook (POST)</Label>
                <div className="flex gap-2">
                  <Input value={webhookUrl} readOnly className="h-9 text-xs font-mono bg-muted/50" />
                  <CopyButton value={webhookUrl} />
                </div>
              </div>
              <pre className="text-xs bg-muted/50 rounded-lg p-3 overflow-x-auto text-muted-foreground font-mono leading-relaxed">
{`{
  "name": "Nome do lead",
  "email": "email@exemplo.com",
  "phone": "11999999999",
  "company": "Empresa",
  "origin": "Google Ads",
  "utm_source": "google",
  "utm_medium": "cpc",
  "utm_campaign": "campanha",
  "value": 5000
}`}
              </pre>
              <div className="flex gap-2">
                {['Zapier', 'N8N', 'Make', 'RD Station'].map(tool => (
                  <div key={tool} className="flex items-center gap-1.5 px-2 py-1.5 bg-muted/40 rounded-lg text-xs font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#5B8CFF]" />
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
              Configure seus pixels e IDs de rastreamento. Os leads capturados via formulário ou webhook incluem automaticamente os UTM parameters quando presentes na URL da landing page.
            </p>
          </div>

          <Card className="border-border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Meta Ads (Facebook / Instagram)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Pixel ID</Label>
                <div className="flex gap-2">
                  <Input placeholder="123456789012345" className="h-9 text-sm font-mono" />
                  <Button size="sm" className="bg-[#5B8CFF] hover:bg-[#4a7aee] text-white text-xs h-9" onClick={() => toast.success('Pixel ID salvo!')}>Salvar</Button>
                </div>
              </div>
              <SecretField label="Token de Acesso (Conversions API)" placeholder="EAABsb..." value="" />
              <p className="text-xs text-muted-foreground">Eventos de lead criado e fechamento serão enviados via CAPI automaticamente.</p>
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
                  <Button size="sm" className="bg-[#5B8CFF] hover:bg-[#4a7aee] text-white text-xs h-9" onClick={() => toast.success('GA4 ID salvo!')}>Salvar</Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Google Ads — Conversion ID</Label>
                <div className="flex gap-2">
                  <Input placeholder="AW-XXXXXXXXXX/XXXXX" className="h-9 text-sm font-mono" />
                  <Button size="sm" className="bg-[#5B8CFF] hover:bg-[#4a7aee] text-white text-xs h-9" onClick={() => toast.success('Conversion ID salvo!')}>Salvar</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Globe className="w-4 h-4" /> UTM Parameters capturados automaticamente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { param: 'utm_source', desc: 'Origem (google, facebook, instagram...)' },
                  { param: 'utm_medium', desc: 'Meio (cpc, email, social, organic...)' },
                  { param: 'utm_campaign', desc: 'Nome da campanha' },
                  { param: 'utm_content', desc: 'Conteúdo do anúncio (A/B)' },
                  { param: 'utm_term', desc: 'Palavra-chave (Google Ads)' },
                ].map(({ param, desc }) => (
                  <div key={param} className="flex items-center gap-3 text-xs">
                    <code className="bg-muted px-2 py-0.5 rounded font-mono text-[#5B8CFF] w-32 shrink-0">{param}</code>
                    <span className="text-muted-foreground">{desc}</span>
                    <Check className="w-3 h-3 text-[#12B981] shrink-0 ml-auto" />
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

          {/* Gmail error banner */}
          {gmailError && (
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl dark:bg-red-950/20 dark:border-red-900/30">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">Erro na conexão com Gmail</p>
                <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">{gmailError}</p>
                {gmailError.includes('GOOGLE_CLIENT_ID') && (
                  <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                    No painel da Vercel: Settings → Environment Variables → adicione GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET (obtidos em console.cloud.google.com).
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Gmail */}
          <Card className={cn('border-border shadow-none', gmailEmail && 'border-[#12B981]/40')}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#EA433515' }}>
                <Mail className="w-5 h-5" style={{ color: '#EA4335' }} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">Gmail / Google Workspace</p>
                {gmailEmail ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#12B981]" />
                    <p className="text-xs text-[#12B981] font-medium">Conectado como {gmailEmail}</p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">OAuth2 — login seguro com sua conta Google</p>
                )}
              </div>
              {gmailEmail ? (
                <Button size="sm" variant="outline" className="text-xs gap-1.5 shrink-0 text-red-500 hover:text-red-500 hover:bg-red-50 border-red-200"
                  onClick={() => {
                    localStorage.removeItem('cyclo_gmail_email')
                    localStorage.removeItem('cyclo_gmail_access_token')
                    localStorage.removeItem('cyclo_gmail_refresh_token')
                    setGmailEmail(null)
                    toast.success('Gmail desconectado')
                  }}>
                  Desconectar
                </Button>
              ) : (
                <Button size="sm" className="text-xs gap-1.5 shrink-0 text-white" style={{ background: '#EA4335' }}
                  onClick={() => { window.location.href = '/api/auth/google' }}>
                  <Mail className="w-3 h-3" /> Conectar Gmail
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Outlook */}
          <Card className="border-border shadow-none">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#0072C615' }}>
                <Mail className="w-5 h-5" style={{ color: '#0072C6' }} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">Microsoft Outlook / 365</p>
                <p className="text-xs text-muted-foreground">OAuth2 — login seguro com sua conta Microsoft</p>
              </div>
              <Button size="sm" variant="outline" className="text-xs gap-1.5 shrink-0"
                onClick={() => toast.info('Integração Outlook em breve.')}>
                Conectar <ChevronRight className="w-3 h-3" />
              </Button>
            </CardContent>
          </Card>

          {/* SMTP */}
          <Card className="border-border shadow-none">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-muted">
                <Mail className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">SMTP personalizado</p>
                <p className="text-xs text-muted-foreground">Configure qualquer servidor SMTP (Zoho, Titan, Brevo...)</p>
              </div>
            </CardContent>
          </Card>

          <SmtpConfigCard />
        </div>
      )}
    </div>
  )
}

function SmtpConfigCard() {
  const [host, setHost] = useState('')
  const [port, setPort] = useState('587')
  const [emailUser, setEmailUser] = useState('')
  const [emailPass, setEmailPass] = useState('')
  const [fromName, setFromName] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [hasConfig, setHasConfig] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('email_settings').select('*').maybeSingle().then(({ data }) => {
      if (data) {
        setHost(data.smtp_host ?? '')
        setPort(String(data.smtp_port ?? 587))
        setEmailUser(data.smtp_user ?? '')
        setEmailPass(data.smtp_pass ?? '')
        setFromName(data.from_name ?? '')
        setHasConfig(true)
      }
      setLoaded(true)
    })
  }, [])

  const save = async () => {
    if (!host || !port || !emailUser || !emailPass) { toast.error('Preencha todos os campos'); return }
    setSaving(true)
    const supabase = createClient()
    const { data: me } = await supabase.from('users').select('organization_id').single()
    if (!me?.organization_id) { toast.error('Org não encontrada'); setSaving(false); return }
    const { error } = await supabase.from('email_settings').upsert({
      organization_id: me.organization_id,
      smtp_host: host,
      smtp_port: Number(port),
      smtp_user: emailUser,
      smtp_pass: emailPass,
      from_name: fromName || null,
    }, { onConflict: 'organization_id' })
    if (error) { toast.error(`Erro: ${error.message}`); setSaving(false); return }
    toast.success('Configuração salva!')
    setHasConfig(true)
    setSaving(false)
  }

  const testConnection = async () => {
    setTesting(true)
    const res = await fetch('/api/email/test', { method: 'POST' })
    const body = await res.json().catch(() => ({}))
    if (res.ok) toast.success('Conexão OK! Servidor SMTP respondeu.')
    else toast.error(`Falhou: ${body.error ?? 'verifique credenciais'}`)
    setTesting(false)
  }

  if (!loaded) {
    return (
      <Card className="border-border shadow-none">
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" /> Carregando...
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          Configuração SMTP
          {hasConfig && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#12B981]/15 text-[#12B981]">
              <CheckCircle2 className="w-3 h-3 inline mr-1" /> Configurado
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Servidor SMTP</Label>
            <Input value={host} onChange={e => setHost(e.target.value)} placeholder="smtp.gmail.com" className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Porta</Label>
            <Input value={port} onChange={e => setPort(e.target.value)} placeholder="587" className="h-9 text-sm" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Nome do remetente (opcional)</Label>
          <Input value={fromName} onChange={e => setFromName(e.target.value)} placeholder="Acredyta" className="h-9 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Email (usuário SMTP)</Label>
          <Input value={emailUser} onChange={e => setEmailUser(e.target.value)} placeholder="seu@email.com" type="email" className="h-9 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Senha / App Password</Label>
          <div className="relative">
            <Input
              value={emailPass}
              onChange={e => setEmailPass(e.target.value)}
              type={showPass ? 'text' : 'password'}
              placeholder="App password (Gmail) ou senha SMTP"
              className="h-9 text-sm pr-9 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Gmail: gere um <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-[#5B8CFF] underline">App Password</a> em vez da senha real.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 text-sm"
            onClick={testConnection}
            disabled={testing || !hasConfig}
          >
            {testing && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
            Testar conexão
          </Button>
          <Button
            className="flex-1 bg-[#5B8CFF] hover:bg-[#4a7aee] text-white text-sm"
            onClick={save}
            disabled={saving}
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
            Salvar configuração
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── AI Keys Panel ───────────────────────────────────────────
function AIKeysPanel() {
  const [loaded, setLoaded] = useState(false)
  const [anthropicKey, setAnthropicKey] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [googleKey, setGoogleKey] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const [testingAI, setTestingAI] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('ai_settings').select('*').maybeSingle().then(({ data }) => {
      if (data) {
        setAnthropicKey(data.anthropic_api_key ?? '')
        setOpenaiKey(data.openai_api_key ?? '')
        setGoogleKey(data.google_api_key ?? '')
      }
      setLoaded(true)
    })
  }, [])

  const saveKey = async (field: 'anthropic_api_key' | 'openai_api_key' | 'google_api_key', value: string, label: string) => {
    setSaving(field)
    const supabase = createClient()
    const { data: me } = await supabase.from('users').select('organization_id').single()
    if (!me?.organization_id) { toast.error('Org não encontrada'); setSaving(null); return }
    const payload: Record<string, string | null> = {
      organization_id: me.organization_id,
      [field]: value || null,
    }
    const { error } = await supabase.from('ai_settings').upsert(payload as never, { onConflict: 'organization_id' })
    if (error) toast.error(`Erro: ${error.message}`)
    else toast.success(`Chave ${label} salva!`)
    setSaving(null)
  }

  const testProvider = async (provider: 'anthropic' | 'openai' | 'google', label: string) => {
    setTestingAI(provider)
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Responda apenas "ok"' }],
        preferProvider: provider,
      }),
    })
    if (res.ok) toast.success(`Chave ${label} OK! Conexão funcionando.`)
    else {
      const body = await res.json().catch(() => ({}))
      toast.error(`Falhou: ${body.error ?? 'verifique a chave'}`)
    }
    setTestingAI(null)
  }

  if (!loaded) {
    return (
      <div className="max-w-2xl text-center py-8 text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" /> Carregando configurações...
      </div>
    )
  }

  const providers = [
    {
      name: 'Anthropic — Claude',
      color: '#000',
      letter: 'A',
      placeholder: 'sk-ant-api03-...',
      label: 'Anthropic',
      link: 'https://console.anthropic.com/settings/keys',
      field: 'anthropic_api_key' as const,
      value: anthropicKey,
      setter: setAnthropicKey,
      testButton: true,
      help: 'Recomendado pela qualidade em português. Crie a chave e dê crédito de pelo menos $5. Modelo: Claude Sonnet 4.6.',
    },
    {
      name: 'OpenAI — ChatGPT',
      color: '#10a37f',
      letter: 'G',
      placeholder: 'sk-proj-...',
      label: 'OpenAI',
      link: 'https://platform.openai.com/api-keys',
      field: 'openai_api_key' as const,
      value: openaiKey,
      setter: setOpenaiKey,
      testButton: true,
      help: 'GPT-4o mini — rápido e barato. Crie a chave e adicione crédito na sua conta.',
    },
    {
      name: 'Google — Gemini',
      color: '#4285F4',
      letter: 'G',
      placeholder: 'AIza...',
      label: 'Google AI',
      link: 'https://aistudio.google.com/app/apikey',
      field: 'google_api_key' as const,
      value: googleKey,
      setter: setGoogleKey,
      testButton: true,
      help: 'Gemini 1.5 Flash — chave grátis no Google AI Studio com limite generoso por minuto.',
    },
  ]

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-start gap-3 p-4 bg-[#5B8CFF]/5 border border-[#5B8CFF]/20 rounded-xl">
        <Bot className="w-5 h-5 text-[#5B8CFF] mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-[#5B8CFF]">Como funciona o CYCLO IA</p>
          <p className="text-xs text-muted-foreground mt-1">
            O CYCLO usa <strong>sua própria chave</strong> de API. Você paga direto ao provedor — sem markup nosso.
            A chave fica salva criptografada no banco e nunca é compartilhada.
            <strong> Recomendamos Anthropic (Claude)</strong> pela qualidade em português.
          </p>
        </div>
      </div>

      {providers.map(p => (
        <Card key={p.name} className="border-border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded flex items-center justify-center shrink-0" style={{ background: p.color }}>
                  <span className="text-white text-[10px] font-bold">{p.letter}</span>
                </div>
                {p.name}
              </div>
              {p.value && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#12B981]/15 text-[#12B981]">
                  <CheckCircle2 className="w-3 h-3 inline mr-1" /> Configurado
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <AIKeyField
              label={`API Key (${p.label})`}
              placeholder={p.placeholder}
              value={p.value}
              onChange={p.setter}
              onSave={() => saveKey(p.field, p.value, p.label)}
              saving={saving === p.field}
            />
            <p className="text-[11px] text-muted-foreground">{p.help}</p>
            <div className="flex items-center justify-between">
              <a href={p.link} target="_blank" rel="noopener noreferrer" className="text-[11px] text-[#5B8CFF] hover:underline inline-flex items-center gap-0.5">
                Obter sua chave em {p.link.replace('https://', '').split('/')[0]} <ExternalLink className="w-2.5 h-2.5" />
              </a>
              {p.testButton && p.value && (
                <Button size="sm" variant="outline" onClick={() => testProvider(p.field.replace('_api_key', '') as 'anthropic' | 'openai' | 'google', p.label)} disabled={!!testingAI} className="h-7 text-[11px]">
                  {testingAI === p.field.replace('_api_key', '') ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                  Testar conexão
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function AIKeyField({
  label, value, onChange, onSave, saving, placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  onSave: () => void
  saving: boolean
  placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold">{label}</Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type={show ? 'text' : 'password'}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder ?? 'Cole sua chave aqui'}
            className="h-9 text-sm pr-9 font-mono"
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
        <Button size="sm" className="bg-[#5B8CFF] hover:bg-[#4a7aee] text-white text-xs h-9 px-4" onClick={onSave} disabled={saving}>
          {saving && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
          Salvar
        </Button>
      </div>
    </div>
  )
}

