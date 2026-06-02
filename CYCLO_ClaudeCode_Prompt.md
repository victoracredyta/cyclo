# CYCLO — Prompt Mestre para Claude Code
## Growth Operating System para Agências de Marketing Digital

---

## CONTEXTO DO PROJETO

Você vai construir do zero o **CYCLO**, um SaaS completo para agências de marketing digital gerenciarem clientes, campanhas, pipeline de vendas, conteúdo, aprovações e crescimento — tudo em uma plataforma.

**Empresa:** ACREDYTA Marketing Digital  
**Fundador:** Victor Hugo  
**Produto:** CYCLO — Growth Operating System  
**Tagline:** Posicionamento em demanda qualificada. Demanda qualificada em crescimento sustentável.  
**Público primário:** Agências de marketing digital brasileiras  
**Público secundário:** Clientes das agências (portal white label)

A plataforma já existe como protótipo HTML funcional. Você vai transformá-la em uma aplicação web real, com banco de dados, autenticação, integrações e todas as funcionalidades descritas abaixo. Trate cada detalhe com nível de execução de produto premium — como se fosse competir com PipeRun, RD Station e Monday.com ao mesmo tempo.

---

## STACK TECNOLÓGICA OBRIGATÓRIA

```
Frontend:     Next.js 14 (App Router)
Linguagem:    TypeScript (strict mode)
Estilização:  Tailwind CSS + shadcn/ui
Banco:        Supabase (PostgreSQL + Auth + Storage + Realtime)
ORM:          Prisma ou Supabase JS SDK
IA:           Anthropic Claude API (claude-sonnet-4-5)
Email:        Resend
Deploy:       Vercel
Animações:    Framer Motion
Drag & Drop:  @dnd-kit/core
Charts:       Recharts
Forms:        React Hook Form + Zod
State:        Zustand
Icons:        Lucide React
Upload:       Supabase Storage + react-dropzone
PDF Export:   @react-pdf/renderer
Pagamentos:   Stripe
WhatsApp:     Evolution API ou Z-API
```

---

## DESIGN SYSTEM

### Cores
```css
--primary:    #5B8CFF   /* azul CYCLO */
--accent:     #e1493c   /* vermelho ACREDYTA */
--sidebar:    #07111F   /* dark navy */
--bg:         #F6F8FB   /* fundo geral */
--card:       #FFFFFF
--text:       #0F172A
--muted:      #64748B
--border:     #E2E8F0
--green:      #12B981
--yellow:     #F59E0B
--purple:     #8B5CF6
--danger:     #EF4444
--blue:       #2563EB
```

### Tipografia
```
Fonte principal: DM Sans (Google Fonts)
Pesos: 400, 500, 600, 700, 800
```

### Logo CYCLO
SVG com ícone circular flywheel (C com seta circular + ponto central) + wordmark "CYCLO" em #5B8CFF sobre retângulo arredondado #07111F. Subtítulo "by ACREDYTA" em versão reduzida.

### Princípios de UI
- Cards com border-radius 12px, border 1px #E2E8F0, shadow leve
- Sidebar escura (#07111F) com navegação em 6 grupos
- Sidebar colapsável (224px ↔ 52px) com toggle
- Topbar fixa com título da página, notificações e avatar do usuário
- Badges coloridos para status (aprovado=verde, aguardando=amarelo, ajuste=vermelho, etc.)
- Tabelas com hover state, bordas sutis, sem zebra striping
- Botões primários em #5B8CFF, ghost com border
- Loading states com skeleton em todas as listas e cards
- Toast notifications (sucesso, erro, aviso) no canto inferior direito
- Modais com backdrop blur, max-width variável por contexto
- Empty states ilustrados em todos os módulos

---

## ARQUITETURA MULTI-TENANT

O CYCLO é multi-tenant: cada agência é uma organização separada. Cada organização tem seus próprios clientes, usuários, dados e configurações de white label.

```
Organização (Agência)
  ├── Usuários da equipe (com permissões: Admin, Gestor, Social Media, Designer)
  ├── Clientes
  │   ├── Contatos do cliente
  │   ├── Serviços contratados
  │   ├── Conteúdos
  │   ├── Aprovações
  │   └── Portal do cliente (white label)
  ├── Pipeline de vendas
  ├── Campanhas e automações
  └── Configurações da organização
```

---

## SCHEMA DO BANCO DE DADOS (Supabase / PostgreSQL)

```sql
-- ORGANIZAÇÕES (agências)
organizations (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE,
  logo_url text,
  primary_color text DEFAULT '#5B8CFF',
  secondary_color text DEFAULT '#12B981',
  button_color text DEFAULT '#e1493c',
  tagline text,
  plan text DEFAULT 'starter', -- starter, pro, enterprise
  stripe_customer_id text,
  stripe_subscription_id text,
  onboarding_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
)

-- USUÁRIOS DA EQUIPE
users (
  id uuid PRIMARY KEY REFERENCES auth.users,
  organization_id uuid REFERENCES organizations,
  full_name text,
  email text,
  avatar_url text,
  role text, -- Fundador, Gestor, Social Media, Designer, Analista
  permission text, -- Admin, Gestor, Social Media, Designer, Cliente
  is_active boolean DEFAULT true,
  onboarding_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
)

-- CLIENTES
clients (
  id uuid PRIMARY KEY,
  organization_id uuid REFERENCES organizations,
  name text NOT NULL,
  sector text,
  logo_url text,
  website text,
  email text,
  phone text,
  address text,
  city text,
  state text,
  cnpj text,
  status text DEFAULT 'Ativo', -- Ativo, Em negociação, Em risco, Inativo
  mrr numeric DEFAULT 0,
  health_score integer DEFAULT 50,
  contract_since date,
  contract_end date,
  responsible_id uuid REFERENCES users,
  objectives text,
  voice_tone text,
  observations text,
  important_dates jsonb DEFAULT '[]',
  services text[] DEFAULT '{}',
  portal_password text, -- senha de acesso ao portal do cliente
  portal_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
)

-- CONTATOS DOS CLIENTES
client_contacts (
  id uuid PRIMARY KEY,
  client_id uuid REFERENCES clients,
  name text,
  role text,
  email text,
  phone text,
  whatsapp text,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
)

-- ATIVIDADES / HISTÓRICO
activities (
  id uuid PRIMARY KEY,
  organization_id uuid REFERENCES organizations,
  client_id uuid REFERENCES clients,
  lead_id uuid REFERENCES leads,
  user_id uuid REFERENCES users,
  type text, -- meeting, call, email, note, approval, deal, task
  title text,
  description text,
  scheduled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
)

-- PIPELINE DE VENDAS
pipeline_stages (
  id uuid PRIMARY KEY,
  organization_id uuid REFERENCES organizations,
  name text,
  color text,
  order_index integer,
  created_at timestamptz DEFAULT now()
)

leads (
  id uuid PRIMARY KEY,
  organization_id uuid REFERENCES organizations,
  stage_id uuid REFERENCES pipeline_stages,
  name text NOT NULL,
  company text,
  value numeric,
  email text,
  phone text,
  whatsapp text,
  city text,
  origin text, -- Indicação, LinkedIn, Google Ads, Instagram, Evento, Referral, Orgânico
  responsible_id uuid REFERENCES users,
  priority text DEFAULT 'media', -- alta, media, baixa
  tag text,
  next_action text,
  notes text,
  lost_reason text,
  won_at timestamptz,
  lost_at timestamptz,
  created_at timestamptz DEFAULT now()
)

lead_tasks (
  id uuid PRIMARY KEY,
  lead_id uuid REFERENCES leads,
  user_id uuid REFERENCES users,
  title text,
  due_date date,
  is_done boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
)

-- CONTEÚDO / PLANNER
content_items (
  id uuid PRIMARY KEY,
  organization_id uuid REFERENCES organizations,
  client_id uuid REFERENCES clients,
  user_id uuid REFERENCES users,
  title text,
  copy text,
  hashtags text,
  cta text,
  channel text, -- instagram, facebook, linkedin, tiktok, youtube, twitter
  format text, -- Imagem, Carrossel, Vídeo, Reels, Stories, Artigo
  objective text, -- Awareness, Engajamento, Conversão, Educação, Autoridade
  status text DEFAULT 'producao', -- producao, aguardando, ajuste, aprovado, publicado
  scheduled_date date,
  published_at timestamptz,
  media_urls text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
)

-- APROVAÇÕES
approvals (
  id uuid PRIMARY KEY,
  organization_id uuid REFERENCES organizations,
  content_id uuid REFERENCES content_items,
  client_id uuid REFERENCES clients,
  title text,
  type text,
  channel text,
  status text DEFAULT 'aguardando',
  current_version integer DEFAULT 1,
  due_date date,
  created_at timestamptz DEFAULT now()
)

approval_versions (
  id uuid PRIMARY KEY,
  approval_id uuid REFERENCES approvals,
  version_number integer,
  media_urls text[] DEFAULT '{}',
  status text,
  created_by uuid REFERENCES users,
  created_at timestamptz DEFAULT now()
)

approval_comments (
  id uuid PRIMARY KEY,
  approval_id uuid REFERENCES approvals,
  user_id uuid REFERENCES users,
  author_name text,
  author_role text, -- agencia, cliente
  content text,
  is_resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
)

-- AGENDA / EVENTOS
calendar_events (
  id uuid PRIMARY KEY,
  organization_id uuid REFERENCES organizations,
  user_id uuid REFERENCES users,
  client_id uuid REFERENCES clients,
  lead_id uuid REFERENCES leads,
  title text,
  description text,
  event_type text, -- meeting, call, task, deadline, reminder
  color text,
  start_at timestamptz,
  end_at timestamptz,
  is_all_day boolean DEFAULT false,
  google_event_id text,
  created_at timestamptz DEFAULT now()
)

-- CAMPANHAS DE EMAIL
email_campaigns (
  id uuid PRIMARY KEY,
  organization_id uuid REFERENCES organizations,
  name text,
  subject text,
  body_html text,
  status text DEFAULT 'rascunho', -- rascunho, ativo, pausado, concluido
  list_name text,
  batch_size integer DEFAULT 10,
  batch_interval_minutes integer DEFAULT 30,
  daily_limit integer DEFAULT 200,
  send_delay_seconds integer DEFAULT 6,
  n8n_webhook_url text,
  sent_count integer DEFAULT 0,
  opened_count integer DEFAULT 0,
  clicked_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
)

-- LANDING PAGES
landing_pages (
  id uuid PRIMARY KEY,
  organization_id uuid REFERENCES organizations,
  client_id uuid REFERENCES clients,
  name text,
  slug text UNIQUE,
  status text DEFAULT 'rascunho',
  leads_count integer DEFAULT 0,
  views_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
)

-- AUTOMAÇÕES
automations (
  id uuid PRIMARY KEY,
  organization_id uuid REFERENCES organizations,
  name text,
  trigger_type text,
  action_type text,
  status text DEFAULT 'ativo',
  config jsonb DEFAULT '{}',
  runs_count integer DEFAULT 0,
  errors_count integer DEFAULT 0,
  last_run_at timestamptz,
  created_at timestamptz DEFAULT now()
)

-- METAS
goals (
  id uuid PRIMARY KEY,
  organization_id uuid REFERENCES organizations,
  user_id uuid REFERENCES users,
  label text,
  target_value numeric,
  current_value numeric DEFAULT 0,
  unit text,
  color text,
  period text, -- mensal, trimestral, anual
  month integer,
  year integer,
  created_at timestamptz DEFAULT now()
)

-- NOTIFICAÇÕES
notifications (
  id uuid PRIMARY KEY,
  organization_id uuid REFERENCES organizations,
  user_id uuid REFERENCES users,
  title text,
  message text,
  type text, -- info, success, warning, error
  link text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
)

-- CONVERSAS DE ATENDIMENTO
conversations (
  id uuid PRIMARY KEY,
  organization_id uuid REFERENCES organizations,
  client_id uuid REFERENCES clients,
  channel text, -- whatsapp, email, chat
  status text DEFAULT 'aberto',
  last_message text,
  unread_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
)

messages (
  id uuid PRIMARY KEY,
  conversation_id uuid REFERENCES conversations,
  user_id uuid REFERENCES users,
  content text,
  is_from_client boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
)

-- PESQUISA DE MERCADO / CONCORRENTES
competitors (
  id uuid PRIMARY KEY,
  organization_id uuid REFERENCES organizations,
  name text,
  instagram_followers text,
  linkedin_followers text,
  score integer,
  branding integer,
  visual integer,
  frequency integer,
  quality integer,
  seo integer,
  ads integer,
  strengths text[] DEFAULT '{}',
  weaknesses text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
)

-- FINANCEIRO
invoices (
  id uuid PRIMARY KEY,
  organization_id uuid REFERENCES organizations,
  stripe_invoice_id text,
  amount numeric,
  status text, -- pago, pendente, vencido
  due_date date,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
)

-- AI CONVERSATIONS
ai_conversations (
  id uuid PRIMARY KEY,
  organization_id uuid REFERENCES organizations,
  user_id uuid REFERENCES users,
  messages jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
)
```

---

## MÓDULOS DA PLATAFORMA (17 no total)

### 1. DASHBOARD
Visão geral executiva da agência com dados em tempo real.

**KPIs principais (4 cards no topo):**
- MRR Total com variação percentual vs mês anterior
- Total de clientes ativos com novos no mês
- Aprovações pendentes com urgentes destacadas
- Pipeline total em R$ com quantidade de oportunidades

**Alerta de risco:** Banner vermelho automático quando algum cliente tem health_score < 50, com botão de ação direta.

**Gráfico Receita vs Meta:** AreaChart com dados dos últimos 6 meses. Duas linhas: receita realizada (sólida) e meta (tracejada).

**CYCLO AI Insights:** Card lateral com 4 insights gerados automaticamente pela IA com base nos dados reais da organização. Badges "LIVE". Insights incluem: clientes em risco, oportunidades de upgrade, leads parados, performance de campanha.

**Grid de widgets:** Pipeline por etapa com barras de progresso, posts da semana por status, automações ativas com contador de execuções.

**Atalhos rápidos:** Botões flutuantes para ações mais usadas (+ Lead, + Conteúdo, + Tarefa).

---

### 2. CRM (Gestão de Clientes)
Carteira completa de clientes com visão 360°.

**Lista de clientes:**
- Tabela com avatar inicial colorido, nome, setor, MRR, health score visual (barra colorida), status (badge), responsável
- Filtros por status, setor, responsável
- Busca em tempo real por nome/email/CNPJ
- Ordenação por MRR, health score, nome, data
- Botão exportar para CSV

**Perfil 360° do cliente (ao clicar):**
- Header: logo/avatar, nome, setor, website, data de contrato, badge de status
- 5 KPIs: MRR, Health Score, Posts/mês, Responsável, Desde quando
- Informações de contato (telefone, email, website, CNPJ, endereço)
- Serviços contratados como badges
- Objetivo, Tom de Voz, Observações (destaque vermelho se contiver alerta)
- Timeline de atividades com ícones por tipo
- Lista de contatos com foto, cargo, email, WhatsApp
- Datas importantes (aniversários, lançamentos, eventos)
- Métricas de campanha se integração conectada
- Histórico financeiro (faturas pagas)
- Aba de conteúdo pendente deste cliente
- Botão "Acessar Portal do Cliente"

**Formulário de novo cliente:** Wizard em 3 etapas (dados básicos → serviços e objetivos → contatos e onboarding).

**Health Score automático:** Calculado com base em: recência de atividades, NPS simulado, posts entregues vs contratados, aprovações em dia, tempo sem contato.

---

### 3. PIPELINE DE VENDAS
Kanban completo de oportunidades comerciais inspirado em PipeRun.

**Kanban:**
- Colunas personalizáveis (nome + cor) por organização
- Drag and drop entre colunas com @dnd-kit
- Cards com: nome, valor em destaque, tag colorida, próxima ação, dias na etapa (vermelho se >10 dias), responsável (avatar)
- Contador de leads e valor total por coluna
- Filtros por responsável, prioridade, tag, período
- Busca global no pipeline

**Detalhe do lead (full-page ao clicar):**
- Barra de etapas horizontal com progresso visual
- Painel esquerdo: todos os dados do lead (empresa, valor, telefone, email, origem, cidade, responsável, próxima ação, observações)
- 5 abas no painel direito:
  - Histórico: timeline de atividades
  - Notas: editor de texto livre com salvamento automático
  - Atividades: lista de tarefas com checkbox, responsável, prazo
  - Arquivos: upload de documentos (proposta, contrato)
  - E-mails: histórico de emails enviados
- Botões "Ganho" e "Perdido" com modal de confirmação
- Mover de etapa diretamente no header
- Criar atividade inline

**Edição de etapas:** Modal para adicionar, renomear, reordenar e colorir etapas.

**Métricas do pipeline:** Taxa de conversão por etapa, tempo médio em cada etapa, valor total e projetado, ranking de responsáveis.

---

### 4. AGENDA
Calendário semanal estilo Google Calendar.

**Visualizações:** Semana (padrão), Mês, Dia, Lista.

**Funcionalidades:**
- Navegação por semana/mês com setas
- Hoje destacado com linha vermelha de hora atual
- Eventos coloridos por tipo (reunião, call, tarefa, prazo, lembrete)
- Criar evento clicando em qualquer slot
- Drag & drop para mover eventos
- Eventos vinculados a cliente ou lead
- Integração Google Calendar (sincronização bidirecional)
- Mini calendário lateral para navegação rápida
- Filtro por usuário (ver agenda de toda a equipe)
- Lembretes por email/notificação

**Modal de criação/edição:**
- Título, tipo, data/hora início e fim, duração
- Vincular a cliente ou lead
- Descrição, localização, link de reunião (Meet/Zoom)
- Convidar membros da equipe
- Cor do evento
- Recorrência (não se repete, diário, semanal, mensal)

---

### 5. PLANNER DE CONTEÚDO
Gestão completa do calendário editorial de todos os clientes.

**Três visualizações:**
- **Calendário:** Grid mensal com posts por dia, coloridos por canal
- **Lista:** Tabela com data, título, cliente, canal, formato, status, responsável
- **Kanban:** Colunas por status (Produção, Aguardando, Ajuste, Aprovado, Publicado)

**Card/linha de conteúdo:** canal (badge colorido), título, cliente, data, formato, status, responsável.

**Modal criação de conteúdo (completo):**
- Cliente, canal, formato, data de publicação
- Objetivo do post (Awareness, Engajamento, Conversão, Educação, Autoridade)
- Título interno
- Copy/legenda completa
- Hashtags
- CTA (Call to Action)
- Upload de arte/vídeo (Supabase Storage)
- Preview visual do post antes de salvar
- Responsável pela criação
- Status inicial
- Observações internas

**Filtros:** Por cliente, canal, responsável, status, período.

**Ações em lote:** Selecionar múltiplos e alterar status, responsável ou data.

---

### 6. APROVAÇÕES
Sistema de aprovação de conteúdo com portal do cliente integrado.

**Split panel:**
- Esquerda: lista de aprovações com status, cliente, tipo, data
- Direita: detalhe completo da aprovação selecionada

**Detalhe da aprovação:**
- Header com cliente, canal, título, status
- Botões de ação: Aprovar (verde), Solicitar Ajuste (amarelo), Reprovar (vermelho)
- Seletor de versões (V1, V2, V3...) com status de cada uma
- Preview do conteúdo (imagem, vídeo, carrossel, documento)
- Thread de comentários com:
  - Avatar, nome, papel (agência/cliente), horário
  - Badge resolvido/pendente
  - Resolver/reabrir comentário individual
- Campo de novo comentário com menção (@nome)
- Histórico completo de mudanças de status

**Notificações automáticas:**
- Cliente recebe email quando há nova versão para aprovar
- Equipe recebe notificação quando cliente aprova ou solicita ajuste

**Versionamento:** Cada upload de nova arte gera uma versão numerada. Cliente sempre vê a versão mais recente.

---

### 7. CAMPANHAS DE EMAIL + CONFIGURAÇÃO N8N

**Aba Campanhas:**
- Lista de campanhas com nome, status, enviados, taxa de abertura, taxa de clique
- Criar campanha: nome, assunto, lista de destinatários, corpo HTML, agendamento
- Visualização prévia do email
- Pausar, retomar, duplicar, excluir

**Aba Configurações de Disparo (N8N):**
- Formulário com validações e tooltips explicativos:
  - E-mails por lote (padrão: 10, máximo: 50)
  - Intervalo entre lotes em minutos (padrão: 30)
  - Limite diário de envios (padrão: 200)
  - Delay entre envios individuais em segundos (padrão: 6)
  - Horário de início e fim dos disparos
- Webhook URL para N8N (gerado automaticamente, copiável)
- Status da integração N8N (conectado/desconectado)
- Preview do plano de disparo: "Sua lista tem X contatos. Serão enviados em X horas."
- Alerta visual se configuração for arriscada para reputação do domínio
- Logs dos últimos disparos

---

### 8. LANDING PAGES
Gestão de landing pages criadas para clientes.

**Grid de LPs:** Cards com preview (thumbnail), nome, URL, status (publicado/rascunho), leads captados, visualizações, taxa de conversão.

**Detalhe de LP:**
- Métricas detalhadas: leads por dia (gráfico), origem do tráfego, dispositivos
- Configuração: URL, meta title, meta description, pixel do Facebook, Google Tag
- Lista de leads captados com nome, email, telefone, data, UTM source

**Integração:** LPs publicadas geram leads automaticamente no CRM e podem acionar automações.

---

### 9. PESQUISA DE MERCADO / CONCORRENTES

**Visão geral:**
- RadarChart comparando cliente vs concorrentes em 6 dimensões: Branding, Visual, Frequência, Qualidade, SEO, Ads
- Tabela comparativa com scores numéricos e barras visuais

**Cards individuais de concorrentes:**
- Nome, seguidores Instagram/LinkedIn, score total
- Pontos fortes e fraquezas
- Última atualização

**SWOT automático:** Com base nos dados comparativos, a CYCLO AI gera uma análise SWOT do cliente vs concorrência.

**Adicionar/editar concorrente:** Formulário com todos os campos e sliders para os scores.

---

### 10. RELATÓRIOS

**Gerador de relatórios:**
- Seletor: tipo (Geral, Pipeline, Conteúdo, Campanhas, Financeiro), período, cliente(s), responsável(is)
- Botão "Gerar" e "Exportar PDF"

**Métricas exibidas:**
- Oportunidades novas, ganhas, perdidas, em aberto
- Tempo médio de fechamento
- Taxa de conversão por etapa
- MRR adquirido no período
- Lead time médio
- Posts criados vs entregues vs aprovados
- Desempenho de campanhas

**Gráficos:**
- LineChart: oportunidades por semana
- BarChart: ganhos vs perdidos por responsável
- AreaChart: MRR ao longo do tempo
- PieChart: leads por origem

**Metas do mês:** Barras de progresso para cada meta configurada, com cores por % atingido.

**Ranking de responsáveis:** Tabela com novas oportunidades, ganhas, perdidas, MRR gerado, taxa de conversão por pessoa.

**Export:** PDF estilizado com logo da agência, gerado com @react-pdf/renderer.

---

### 11. METAS
Sistema gamificado de OKRs da agência.

**Cards de metas:** Valor atual / meta, barra de progresso colorida, % atingido.

**Tipos de meta:** Reuniões agendadas, propostas enviadas, novos clientes, MRR gerado, posts criados, aprovações em dia.

**Leaderboard:** Ranking da equipe com pontuação, posição, badges de conquista.

**Conquistas:** Sistema de badges por marcos (Primeiro Fechamento, Meta Batida, MRR Recorde, Top Performer, etc.).

**Configuração:** Criar metas por período (mensal, trimestral), vincular a usuário ou equipe inteira.

---

### 12. ATENDIMENTO (Chat Interno)
Central de comunicação com clientes.

**Lista de conversas:** Avatar do cliente, nome, empresa, canal (WhatsApp/Email/Chat), última mensagem, horário, badge de não lidas.

**Thread de mensagens:** Bolhas estilo WhatsApp. Mensagens da equipe à direita (azul), do cliente à esquerda (cinza). Timestamp em cada mensagem.

**Funcionalidades:**
- Campo de digitação com Enter para enviar
- Upload de arquivos e imagens
- Emoji picker
- Mensagens predefinidas (templates rápidos)
- Marcar como resolvido/aberto
- Transferir conversa para outro membro
- Histórico completo da conversa

**Integração WhatsApp:** Via Evolution API ou Z-API. Configuração por organização com QR Code de vinculação.

**Integração Email:** SMTP/IMAP configurável por organização.

---

### 13. CYCLO AI
Assistente estratégico com Claude API integrada.

**Chat principal:**
- Interface de chat profissional com histórico persistido
- Bolhas de mensagem com avatar e timestamp
- Suporte a markdown nas respostas (negrito, listas, headers)
- Indicador de "digitando..." durante streaming
- Botão limpar conversa

**System prompt da IA:**
```
Você é a CYCLO AI, assistente estratégico integrado à plataforma CYCLO by ACREDYTA. 
Você tem acesso aos dados reais da agência: clientes, pipeline, conteúdos, metas e campanhas.
Ajude com: estratégias de crescimento, análise de leads, geração de copy, sugestões de campanhas,
análise de concorrentes, insights de retenção de clientes, planejamento de conteúdo.
Responda sempre em português do Brasil. Use dados concretos quando disponíveis.
Seja direto, estratégico e orientado a resultados.
```

**Contexto dinâmico:** A IA recebe automaticamente um resumo dos dados da organização (MRR, clientes em risco, leads no pipeline, metas do mês) em cada conversa.

**Sugestões rápidas:** 8 chips clicáveis com perguntas frequentes que mudam conforme o contexto (ex: se há cliente em risco, sugere "Estratégia de retenção urgente").

**Ações rápidas da IA:**
- "Gerar copy para Instagram" → abre modal com campos e gera o copy
- "Analisar pipeline" → gera análise detalhada dos leads
- "Sugerir pauta de reunião" → gera agenda para reunião com cliente
- "Escrever follow-up" → gera email de follow-up personalizado

**Configuração:** Campo para API Key do Anthropic. Salva em Supabase por organização (encriptado).

---

### 14. AUTOMAÇÕES
Motor de automações da plataforma.

**Lista de workflows:** Ícone, nome, trigger, ação, status (ativo/pausado), execuções totais, erros, última execução.

**Automações nativas disponíveis:**
1. Boas-vindas ao novo lead → envia email + cria task para responsável
2. Follow-up automático → lead parado X dias → notifica responsável
3. Prospecção N8N → webhook de 30 em 30 min → disparo de emails em lote
4. Alerta de cliente em risco → health score < 50 → cria task urgente + notifica gestor
5. Relatório semanal → toda sexta às 18h → envia PDF por email
6. Aprovação pendente → 48h sem resposta → lembra cliente por email
7. Aniversário do cliente → envia mensagem personalizada
8. Lead ganho → cria cliente no CRM automaticamente + dispara onboarding

**Editor de automação:** Interface visual de configuração (trigger → condição → ação).

**Logs:** Histórico de execuções com timestamp, resultado (sucesso/erro) e detalhes.

---

### 15. FINANCEIRO
Visão financeira da agência.

**KPIs:** MRR atual, CAC médio, LTV médio, Churn Rate mensal.

**Gráfico MRR:** AreaChart com evolução dos últimos 12 meses.

**Receita por cliente:** Ranking com barra proporcional ao MRR.

**Histórico de faturas:** Tabela com número, data, valor, status (pago, pendente, vencido). Geradas via Stripe.

**Projeção:** Com base no crescimento atual, projeta MRR para os próximos 3 meses.

**Upgrade de plano:** Card sempre visível com plano atual, limites de uso e botão de upgrade.

---

### 16. WHITE LABEL (Portal do Cliente)
Personalização da plataforma para cada agência.

**Configurações:**
- Upload de logo da agência
- Nome da empresa
- Tagline
- Cor primária, secundária e do botão (color pickers)
- Domínio personalizado (subdomínio) — ex: cliente.acredyta.com.br
- Email de suporte
- Telefone de contato

**Preview em tempo real:** Enquanto edita, o preview do portal do cliente atualiza instantaneamente.

**Portal do cliente (rota separada `/portal/[slug]`):**
- Login com email + senha definida pela agência
- Tela inicial: KPIs do mês (posts, aprovações, campanhas)
- Aba Aprovações: ver e aprovar conteúdos pendentes com comentários
- Aba Conteúdos: calendário dos posts do mês
- Aba Relatórios: métricas de desempenho das campanhas
- Aba Documentos: baixar relatórios e propostas
- Identidade visual 100% da agência (sem menção ao CYCLO)
- Responsivo para mobile

---

### 17. CONFIGURAÇÕES

**Aba Perfil da Empresa:**
- Nome, logo, email, telefone, CNPJ, website, endereço
- Fuso horário, idioma, moeda

**Aba Equipe:**
- Lista de usuários com avatar, nome, cargo, permissão, status
- Convidar novo usuário por email (envia email com link de ativação)
- Editar permissões inline
- Desativar/ativar usuário
- Transferir responsabilidade de clientes/leads ao remover usuário

**Aba Cobrança:**
- Plano atual (Starter R$29 + R$15/usuário, Pro R$99, Enterprise custom)
- Detalhamento da cobrança mensal
- Histórico de faturas com download de nota fiscal
- Botão cancelar plano

**Aba Integrações:**
- Meta Ads: autenticação OAuth, selecionar contas de anúncio
- Google Ads: autenticação OAuth, selecionar clientes
- Google Analytics 4: conectar propriedades
- Google Calendar: sincronização bidirecional
- N8N: configurar URL do servidor + webhook
- WhatsApp Business (Evolution API): QR Code de vinculação
- Resend: configurar email de envio
- Stripe: conectar conta para billing

**Aba Segurança:**
- Autenticação 2 fatores (toggle)
- Log de acessos com IP, dispositivo, horário
- Sessões ativas com opção de revogar
- Alterar senha

---

## ONBOARDING — FLUXO COMPLETO

### Onboarding da Agência (primeira vez que o Admin acessa)

Aparece como overlay full-screen com fundo semi-transparente. Não pode ser fechado sem completar ou pular explicitamente. Barra de progresso no topo mostrando "Etapa X de 6".

**Etapa 1 — Boas-vindas:**
- Animação do logo CYCLO girando
- "Bem-vindo ao CYCLO, [nome]! Vamos configurar sua agência em 5 minutos."
- Benefícios da plataforma em 3 ícones
- Botão "Começar configuração"

**Etapa 2 — Identidade da Agência:**
- Upload de logo (drag & drop com preview)
- Nome da agência (preenchido, editável)
- Tagline/slogan
- Cor primária (color picker com sugestões)
- Cor secundária
- Preview ao vivo do sidebar com as cores escolhidas
- Validação: logo obrigatória para avançar

**Etapa 3 — Convidar Equipe:**
- "Quem vai usar o CYCLO com você?"
- Adicionar emails + selecionar permissão (pode adicionar até 5)
- Opção "Pular por agora" em destaque menor
- Lista de convites adicionados com badge de permissão
- Botão "Enviar convites e continuar"

**Etapa 4 — Primeiro Cliente:**
- "Cadastre seu primeiro cliente para começar a trabalhar"
- Formulário simplificado: nome, setor, MRR, email de contato
- Serviços contratados (checkboxes)
- Opção "Pular — vou cadastrar depois"
- Preview do card do cliente sendo criado

**Etapa 5 — Conectar Integrações:**
- Cards de integrações prioritárias: Meta Ads, Google Ads, WhatsApp
- Cada card com botão "Conectar" → abre OAuth ou QR Code
- Badge verde "Conectado" após autenticação
- "Pular integrações" no rodapé
- Texto: "Você pode conectar mais tarde em Configurações"

**Etapa 6 — Tour Rápido pelos Módulos:**
- Cards clicáveis de cada módulo principal com ícone, nome e uma frase do que faz
- "Clique para explorar" ou "Ver todos os módulos"
- Ao clicar num módulo, fecha o onboarding e navega para ele
- Botão "Ir para o Dashboard"

**Conclusão:**
- Animação de confete
- "🎉 CYCLO configurado com sucesso!"
- Resumo: X integrações conectadas, X usuários convidados, X clientes cadastrados
- Botão grande "Acessar meu Dashboard"
- onboarding_completed = true salvo no banco

---

### Onboarding do Cliente (portal white label — primeiro acesso)

**Etapa 1 — Boas-vindas:**
- Logo e cores da AGÊNCIA (não do CYCLO)
- "Olá [nome do cliente]! Bem-vindo ao portal da [nome da agência]."
- "Aqui você vai acompanhar seus conteúdos, aprovar posts e ver os resultados das suas campanhas."
- Botão "Começar"

**Etapa 2 — Verificar seus dados:**
- Exibe os dados cadastrados pela agência (nome, empresa, email, telefone)
- "Confirme se seus dados estão corretos"
- Campo para atualizar caso necessário
- Botão "Confirmar e continuar"

**Etapa 3 — Conheça seu Portal:**
- Tour interativo com highlight visual de cada seção:
  - "Aprovações — aqui você vai ver e aprovar seus conteúdos"
  - "Posts — veja o calendário de publicações do mês"
  - "Relatórios — acompanhe os resultados das campanhas"
  - "Documentos — acesse suas propostas e contratos"
- Navegação com "Anterior" / "Próximo"

**Etapa 4 — Primeira Aprovação:**
- Se houver conteúdo pendente: "Você já tem um conteúdo aguardando sua aprovação!"
- Mostra preview do conteúdo com botões Aprovar/Solicitar Ajuste
- Se não houver: "Em breve você receberá conteúdos para aprovar por aqui."
- Botão "Acessar meu portal"

**Conclusão:** onboarding_completed = true para o contato do cliente.

---

## MELHORIAS INDISPENSÁVEIS IDENTIFICADAS

### UX/UI
- **Modo escuro** completo com toggle no header e persistência por usuário
- **Responsividade mobile** total — todos os módulos funcionam no celular
- **Skeleton loading** em todas as listas, tabelas e gráficos durante carregamento
- **Estados vazios ilustrados** em cada módulo (ex: "Nenhum cliente ainda. Adicione o primeiro!")
- **Atalhos de teclado:** Cmd+K para busca global, Cmd+N para novo lead/conteúdo
- **Busca global** com resultados em tempo real de clientes, leads, conteúdos, aprovações
- **Breadcrumbs** em páginas de detalhe para navegação clara
- **Scroll infinito** em listas longas em vez de paginação

### Notificações
- **Centro de notificações** com histórico, marcação de lidas, filtros por tipo
- **Notificações push** no navegador (com permissão do usuário)
- **Emails transacionais** com Resend: convite de equipe, nova aprovação, lead ganho, relatório semanal
- **Alerta em tempo real** via Supabase Realtime quando cliente aprova conteúdo

### Pipeline
- **Drag & drop real** entre colunas com animação suave
- **Previsão de fechamento:** campo de data estimada de fechamento por lead
- **Campos customizados** por organização (adicionar campos extras ao lead)
- **Importação de leads via CSV**
- **Duplicar lead** com um clique

### CRM
- **Linha do tempo** unificada de todas as interações com o cliente
- **Score automático de saúde** recalculado a cada ação
- **Alertas proativos:** "Este cliente está há 14 dias sem atividade"
- **Integração com calendar:** atividades aparecem na agenda automaticamente
- **Exportação individual do cliente** em PDF

### IA
- **Streaming de resposta** (tokens aparecendo em tempo real como no ChatGPT)
- **Contexto automático:** a IA recebe dados reais da organização a cada mensagem
- **Memória de conversa:** histórico persistido por sessão
- **Ações executáveis:** a IA pode criar um lead, agendar uma atividade ou rascunhar um post diretamente do chat
- **Análise periódica automática:** toda segunda-feira gera 3 insights estratégicos

### Segurança e Performance
- **Row Level Security (RLS)** em todas as tabelas do Supabase (organização nunca vê dados de outra)
- **Rate limiting** nas APIs
- **Logs de auditoria** para ações críticas (excluir cliente, alterar permissão)
- **Backup automático** via Supabase
- **Optimistic updates** — UI atualiza antes da confirmação do servidor para fluidez

---

## ESTRUTURA DE ARQUIVOS (Next.js 14)

```
/app
  /(auth)
    /login
    /register
    /forgot-password
    /reset-password
  /(onboarding)
    /onboarding
      /agency        ← fluxo da agência (6 etapas)
      /client        ← fluxo do cliente (4 etapas)
  /(dashboard)
    /layout.tsx      ← sidebar + topbar
    /dashboard
    /crm
      /[clientId]
    /pipeline
      /[leadId]
    /agenda
    /planner
    /aprovacoes
      /[approvalId]
    /campanhas
    /landingpages
    /pesquisa
    /relatorios
    /metas
    /atendimento
      /[conversationId]
    /ia
    /automacoes
    /financeiro
    /whitelabel
    /configuracoes
      /perfil
      /equipe
      /cobranca
      /integracoes
      /seguranca
  /portal
    /[orgSlug]       ← portal do cliente (white label)
      /layout.tsx    ← header com branding da agência
      /aprovacoes
      /conteudos
      /relatorios
      /documentos
  /api
    /webhooks
      /stripe
      /n8n
    /ai
      /chat
    /integrations
      /meta
      /google

/components
  /ui               ← shadcn/ui components
  /layout
    Sidebar.tsx
    Topbar.tsx
    NotificationCenter.tsx
  /modules
    /dashboard
    /crm
    /pipeline
    /planner
    /aprovacoes
    /ia
    ... (um diretório por módulo)
  /onboarding
    AgencyOnboarding.tsx
    ClientOnboarding.tsx
  /common
    LoadingSkeleton.tsx
    EmptyState.tsx
    ConfirmModal.tsx
    FileUpload.tsx
    RichTextEditor.tsx

/lib
  /supabase
    client.ts
    server.ts
    middleware.ts
  /anthropic
    client.ts
  /stripe
    client.ts
  /resend
    templates.ts
  utils.ts
  constants.ts

/hooks
  useOrganization.ts
  useUser.ts
  useClients.ts
  usePipeline.ts
  useNotifications.ts
  useAI.ts

/types
  database.ts      ← gerado pelo Supabase
  app.ts

/store
  useUIStore.ts    ← dark mode, sidebar collapsed
  useOnboardingStore.ts
```

---

## AUTENTICAÇÃO E AUTORIZAÇÃO

```typescript
// Fluxo completo de auth
1. Usuário acessa /login
2. Supabase Auth com email/password
3. Após login: verificar se organization existe para o user
   - Não existe → redirecionar para /register (criar organização)
   - Existe mas onboarding_completed = false → redirecionar para /onboarding/agency
   - Existe e completo → redirecionar para /dashboard
4. Middleware Next.js protege todas as rotas /(dashboard)/*
5. Portal do cliente usa autenticação separada por slug da organização

// Permissões por role
Admin:       tudo
Gestor:      tudo exceto cobrança e deletar organização
Social Media: planner, aprovações, atendimento (sem pipeline e financeiro)
Designer:    planner, aprovações (upload de artes)
Cliente:     apenas portal white label
```

---

## INTEGRAÇÕES TÉCNICAS

### Meta Ads
```typescript
// OAuth via Facebook Login
// Endpoints necessários:
GET /me/adaccounts → listar contas
GET /{account_id}/campaigns → listar campanhas
GET /{campaign_id}/insights → métricas (impressões, cliques, gasto, ROAS)
// Dados exibidos no módulo de Relatórios e cards de cliente
```

### Google Ads
```typescript
// OAuth via Google
// Usar Google Ads API v16
// Métricas: impressões, cliques, conversões, CPC, ROAS
```

### N8N (Automações)
```typescript
// Webhook recebe POST do N8N
// Payload esperado:
{
  action: 'email_batch' | 'lead_create' | 'follow_up',
  organization_id: string,
  data: {...}
}
// CYCLO retorna confirmação e registra log
```

### WhatsApp (Evolution API)
```typescript
// Configuração por organização
// QR Code de vinculação na tela de integrações
// Webhook para receber mensagens → criar/atualizar conversa no módulo Atendimento
// Envio de mensagens via API
```

### Stripe (Billing)
```typescript
// Planos:
// Starter: R$29/mês base + R$15/usuário ativo
// Pro: R$99/mês base + R$10/usuário
// Enterprise: custom
// Webhooks: customer.subscription.updated, invoice.paid, invoice.payment_failed
```

---

## CYCLO AI — IMPLEMENTAÇÃO

```typescript
// app/api/ai/chat/route.ts
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: Request) {
  const { messages, organizationId } = await req.json()
  
  // Buscar contexto da organização
  const context = await getOrganizationContext(organizationId)
  // context inclui: MRR, clientes em risco, leads no pipeline, metas do mês
  
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  
  const stream = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1500,
    stream: true,
    system: `Você é a CYCLO AI, assistente estratégico da plataforma CYCLO by ACREDYTA.
    
Contexto atual da organização:
${JSON.stringify(context, null, 2)}

Você tem acesso aos dados reais. Use-os nas suas análises.
Seja direto, estratégico e orientado a resultados.
Responda em português do Brasil.`,
    messages: messages
  })
  
  // Retornar stream para o cliente
  return new Response(stream.toReadableStream())
}
```

---

## VARIÁVEIS DE AMBIENTE

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Resend
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=https://app.cyclo.com.br
```

---

## ORDEM DE DESENVOLVIMENTO RECOMENDADA

Execute nessa ordem para ter sempre uma versão funcional para testar:

```
Fase 1 — Fundação (Semana 1)
  ✓ Setup Next.js 14 + TypeScript + Tailwind + shadcn/ui
  ✓ Supabase: schema completo + RLS + Auth
  ✓ Middleware de autenticação
  ✓ Layout base: sidebar + topbar
  ✓ Login e registro de organização

Fase 2 — Core (Semana 2)
  ✓ Onboarding da agência (6 etapas)
  ✓ Dashboard com dados reais
  ✓ CRM completo (lista + perfil 360°)
  ✓ Pipeline com drag & drop

Fase 3 — Marketing (Semana 3)
  ✓ Planner de conteúdo
  ✓ Sistema de aprovações
  ✓ Portal do cliente (white label)
  ✓ Onboarding do cliente

Fase 4 — Operações (Semana 4)
  ✓ Agenda + Google Calendar
  ✓ CYCLO AI com streaming
  ✓ Atendimento + WhatsApp
  ✓ Automações

Fase 5 — Inteligência (Semana 5)
  ✓ Relatórios + Export PDF
  ✓ Metas + Leaderboard
  ✓ Pesquisa de mercado
  ✓ Financeiro + Stripe

Fase 6 — Escala (Semana 6)
  ✓ Meta Ads + Google Ads
  ✓ Campanhas + N8N
  ✓ Notificações em tempo real
  ✓ Mobile responsivo completo
  ✓ Dark mode
  ✓ Deploy final na Vercel
```

---

## PADRÕES DE CÓDIGO OBRIGATÓRIOS

```typescript
// 1. Sempre TypeScript estrito
// 2. Componentes com React.FC e props tipadas
// 3. Server Components por padrão, Client Components apenas quando necessário
// 4. Mutations com Server Actions do Next.js 14
// 5. Carregamento de dados com Suspense + loading.tsx
// 6. Erros tratados com error.tsx por rota
// 7. Imagens otimizadas com next/image
// 8. Skeleton em todo loading state
// 9. Toasts para feedback de todas as ações
// 10. Formulários com React Hook Form + Zod para validação
```

---

## OBSERVAÇÕES FINAIS PARA O CLAUDE CODE

1. **Priorize UX:** Cada interação deve ter feedback visual imediato. Nenhum botão sem loading state.

2. **Multi-tenant é crítico:** Nunca vaze dados entre organizações. Use RLS em todas as queries.

3. **Mobile first:** O dono de agência usa o celular. Todo módulo deve ser 100% usável no iPhone.

4. **Performance:** Use React Query ou SWR para cache inteligente. Sem waterfalls de dados.

5. **Onboarding é o produto:** A primeira experiência define a retenção. Faça o onboarding ser memorável, rápido e motivador.

6. **CYCLO AI é o diferencial:** A IA deve usar dados reais da organização. Uma análise genérica não tem valor. Uma análise específica que menciona "seu cliente FitLife pode gerar mais R$ 5k/mês" é o que converte.

7. **O portal do cliente é o que justifica o preço:** As agências pagam o CYCLO para impressionar seus clientes. O portal precisa ser mais bonito do que o dashboard da agência.

8. **Nome e identidade:** A plataforma se chama **CYCLO** (não CYRCLO). Marca registrada da ACREDYTA. Tagline: "Growth Operating System". Nunca mencionar o nome CYCLO no portal do cliente (white label completo).

---

*Prompt gerado por ACREDYTA · Victor Hugo · Versão 1.0 · Maio 2025*
