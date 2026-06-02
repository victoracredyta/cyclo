-- ============================================================
-- CYCLO — Full Database Schema + RLS Policies
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ORGANIZATIONS (agências)
-- ============================================================
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
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
);

-- ============================================================
-- USERS (equipe da agência)
-- ============================================================
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations ON DELETE CASCADE,
  full_name text,
  email text,
  avatar_url text,
  role text, -- Fundador, Gestor, Social Media, Designer, Analista
  permission text DEFAULT 'Social Media', -- Admin, Gestor, Social Media, Designer, Cliente
  is_active boolean DEFAULT true,
  onboarding_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- CLIENTS
-- ============================================================
CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations ON DELETE CASCADE,
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
  portal_password text,
  portal_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- CLIENT CONTACTS
-- ============================================================
CREATE TABLE client_contacts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id uuid REFERENCES clients ON DELETE CASCADE,
  name text,
  role text,
  email text,
  phone text,
  whatsapp text,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- ACTIVITIES / HISTORY
-- ============================================================
CREATE TABLE activities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations ON DELETE CASCADE,
  client_id uuid REFERENCES clients ON DELETE SET NULL,
  lead_id uuid, -- FK to leads added after leads table
  user_id uuid REFERENCES users ON DELETE SET NULL,
  type text, -- meeting, call, email, note, approval, deal, task
  title text,
  description text,
  scheduled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- PIPELINE STAGES
-- ============================================================
CREATE TABLE pipeline_stages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#5B8CFF',
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- LEADS
-- ============================================================
CREATE TABLE leads (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations ON DELETE CASCADE,
  stage_id uuid REFERENCES pipeline_stages ON DELETE SET NULL,
  name text NOT NULL,
  company text,
  value numeric,
  email text,
  phone text,
  whatsapp text,
  city text,
  origin text, -- Indicação, LinkedIn, Google Ads, Instagram, Evento, Referral, Orgânico
  responsible_id uuid REFERENCES users ON DELETE SET NULL,
  priority text DEFAULT 'media', -- alta, media, baixa
  tag text,
  next_action text,
  notes text,
  lost_reason text,
  won_at timestamptz,
  lost_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Add FK from activities to leads
ALTER TABLE activities ADD CONSTRAINT activities_lead_id_fkey
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;

-- ============================================================
-- LEAD TASKS
-- ============================================================
CREATE TABLE lead_tasks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id uuid REFERENCES leads ON DELETE CASCADE,
  user_id uuid REFERENCES users ON DELETE SET NULL,
  title text NOT NULL,
  due_date date,
  is_done boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- CONTENT ITEMS (Planner)
-- ============================================================
CREATE TABLE content_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations ON DELETE CASCADE,
  client_id uuid REFERENCES clients ON DELETE CASCADE,
  user_id uuid REFERENCES users ON DELETE SET NULL,
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
);

-- ============================================================
-- APPROVALS
-- ============================================================
CREATE TABLE approvals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations ON DELETE CASCADE,
  content_id uuid REFERENCES content_items ON DELETE SET NULL,
  client_id uuid REFERENCES clients ON DELETE CASCADE,
  title text NOT NULL,
  type text,
  channel text,
  status text DEFAULT 'aguardando', -- aguardando, aprovado, ajuste, reprovado
  current_version integer DEFAULT 1,
  due_date date,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE approval_versions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  approval_id uuid REFERENCES approvals ON DELETE CASCADE,
  version_number integer NOT NULL DEFAULT 1,
  media_urls text[] DEFAULT '{}',
  status text,
  created_by uuid REFERENCES users ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE approval_comments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  approval_id uuid REFERENCES approvals ON DELETE CASCADE,
  user_id uuid REFERENCES users ON DELETE SET NULL,
  author_name text,
  author_role text, -- agencia, cliente
  content text NOT NULL,
  is_resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- CALENDAR EVENTS
-- ============================================================
CREATE TABLE calendar_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations ON DELETE CASCADE,
  user_id uuid REFERENCES users ON DELETE CASCADE,
  client_id uuid REFERENCES clients ON DELETE SET NULL,
  lead_id uuid REFERENCES leads ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  event_type text, -- meeting, call, task, deadline, reminder
  color text DEFAULT '#5B8CFF',
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  is_all_day boolean DEFAULT false,
  google_event_id text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- EMAIL CAMPAIGNS
-- ============================================================
CREATE TABLE email_campaigns (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations ON DELETE CASCADE,
  name text NOT NULL,
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
);

-- ============================================================
-- LANDING PAGES
-- ============================================================
CREATE TABLE landing_pages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations ON DELETE CASCADE,
  client_id uuid REFERENCES clients ON DELETE SET NULL,
  name text NOT NULL,
  slug text UNIQUE,
  status text DEFAULT 'rascunho',
  leads_count integer DEFAULT 0,
  views_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- AUTOMATIONS
-- ============================================================
CREATE TABLE automations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations ON DELETE CASCADE,
  name text NOT NULL,
  trigger_type text,
  action_type text,
  status text DEFAULT 'ativo', -- ativo, pausado
  config jsonb DEFAULT '{}',
  runs_count integer DEFAULT 0,
  errors_count integer DEFAULT 0,
  last_run_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- GOALS
-- ============================================================
CREATE TABLE goals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations ON DELETE CASCADE,
  user_id uuid REFERENCES users ON DELETE SET NULL,
  label text NOT NULL,
  target_value numeric NOT NULL,
  current_value numeric DEFAULT 0,
  unit text,
  color text DEFAULT '#5B8CFF',
  period text DEFAULT 'mensal', -- mensal, trimestral, anual
  month integer,
  year integer,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations ON DELETE CASCADE,
  user_id uuid REFERENCES users ON DELETE CASCADE,
  title text NOT NULL,
  message text,
  type text DEFAULT 'info', -- info, success, warning, error
  link text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- CONVERSATIONS (Atendimento)
-- ============================================================
CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations ON DELETE CASCADE,
  client_id uuid REFERENCES clients ON DELETE SET NULL,
  channel text DEFAULT 'chat', -- whatsapp, email, chat
  status text DEFAULT 'aberto', -- aberto, resolvido
  last_message text,
  unread_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id uuid REFERENCES conversations ON DELETE CASCADE,
  user_id uuid REFERENCES users ON DELETE SET NULL,
  content text NOT NULL,
  is_from_client boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- COMPETITORS (Pesquisa de Mercado)
-- ============================================================
CREATE TABLE competitors (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations ON DELETE CASCADE,
  name text NOT NULL,
  instagram_followers text,
  linkedin_followers text,
  score integer DEFAULT 0,
  branding integer DEFAULT 0,
  visual integer DEFAULT 0,
  frequency integer DEFAULT 0,
  quality integer DEFAULT 0,
  seo integer DEFAULT 0,
  ads integer DEFAULT 0,
  strengths text[] DEFAULT '{}',
  weaknesses text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- INVOICES
-- ============================================================
CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations ON DELETE CASCADE,
  stripe_invoice_id text,
  amount numeric NOT NULL,
  status text DEFAULT 'pendente', -- pago, pendente, vencido
  due_date date,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- AI CONVERSATIONS
-- ============================================================
CREATE TABLE ai_conversations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations ON DELETE CASCADE,
  user_id uuid REFERENCES users ON DELETE CASCADE,
  messages jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- DEFAULT PIPELINE STAGES (inserted via trigger on org creation)
-- ============================================================
CREATE OR REPLACE FUNCTION create_default_pipeline_stages()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO pipeline_stages (organization_id, name, color, order_index) VALUES
    (NEW.id, 'Prospecção',   '#64748B', 0),
    (NEW.id, 'Qualificação', '#F59E0B', 1),
    (NEW.id, 'Proposta',     '#5B8CFF', 2),
    (NEW.id, 'Negociação',   '#8B5CF6', 3),
    (NEW.id, 'Fechamento',   '#12B981', 4);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_organization_created
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION create_default_pipeline_stages();

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — isolamento por organização
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE organizations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients            ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_contacts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities         ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads              ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_tasks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_versions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_comments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns    ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_pages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals              ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitors        ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations   ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's organization_id
CREATE OR REPLACE FUNCTION get_my_org_id()
RETURNS uuid AS $$
  SELECT organization_id FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ORGANIZATIONS: user can only see their own org
CREATE POLICY "org_select" ON organizations FOR SELECT
  USING (id = get_my_org_id());
CREATE POLICY "org_update" ON organizations FOR UPDATE
  USING (id = get_my_org_id());

-- USERS: only same organization
CREATE POLICY "users_select" ON users FOR SELECT
  USING (organization_id = get_my_org_id());
CREATE POLICY "users_insert" ON users FOR INSERT
  WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "users_update" ON users FOR UPDATE
  USING (organization_id = get_my_org_id());

-- Generic org-scoped policies for all other tables
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'clients','client_contacts','activities','pipeline_stages',
    'leads','lead_tasks','content_items','approvals',
    'approval_versions','approval_comments','calendar_events',
    'email_campaigns','landing_pages','automations','goals',
    'notifications','conversations','messages','competitors',
    'invoices','ai_conversations'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- For tables with organization_id directly
    IF tbl IN (
      'clients','activities','pipeline_stages','leads','content_items',
      'approvals','calendar_events','email_campaigns','landing_pages',
      'automations','goals','notifications','conversations','competitors',
      'invoices','ai_conversations'
    ) THEN
      EXECUTE format('
        CREATE POLICY "%s_all" ON %s
          USING (organization_id = get_my_org_id())
          WITH CHECK (organization_id = get_my_org_id());
      ', tbl, tbl);
    END IF;
  END LOOP;
END $$;

-- client_contacts: join through clients
CREATE POLICY "client_contacts_all" ON client_contacts
  USING (client_id IN (SELECT id FROM clients WHERE organization_id = get_my_org_id()))
  WITH CHECK (client_id IN (SELECT id FROM clients WHERE organization_id = get_my_org_id()));

-- lead_tasks: join through leads
CREATE POLICY "lead_tasks_all" ON lead_tasks
  USING (lead_id IN (SELECT id FROM leads WHERE organization_id = get_my_org_id()))
  WITH CHECK (lead_id IN (SELECT id FROM leads WHERE organization_id = get_my_org_id()));

-- approval_versions: join through approvals
CREATE POLICY "approval_versions_all" ON approval_versions
  USING (approval_id IN (SELECT id FROM approvals WHERE organization_id = get_my_org_id()))
  WITH CHECK (approval_id IN (SELECT id FROM approvals WHERE organization_id = get_my_org_id()));

-- approval_comments: join through approvals
CREATE POLICY "approval_comments_all" ON approval_comments
  USING (approval_id IN (SELECT id FROM approvals WHERE organization_id = get_my_org_id()))
  WITH CHECK (approval_id IN (SELECT id FROM approvals WHERE organization_id = get_my_org_id()));

-- messages: join through conversations
CREATE POLICY "messages_all" ON messages
  USING (conversation_id IN (SELECT id FROM conversations WHERE organization_id = get_my_org_id()))
  WITH CHECK (conversation_id IN (SELECT id FROM conversations WHERE organization_id = get_my_org_id()));

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX idx_users_org          ON users(organization_id);
CREATE INDEX idx_clients_org        ON clients(organization_id);
CREATE INDEX idx_clients_status     ON clients(status);
CREATE INDEX idx_leads_org          ON leads(organization_id);
CREATE INDEX idx_leads_stage        ON leads(stage_id);
CREATE INDEX idx_content_org        ON content_items(organization_id);
CREATE INDEX idx_content_client     ON content_items(client_id);
CREATE INDEX idx_content_status     ON content_items(status);
CREATE INDEX idx_approvals_org      ON approvals(organization_id);
CREATE INDEX idx_approvals_status   ON approvals(status);
CREATE INDEX idx_activities_org     ON activities(organization_id);
CREATE INDEX idx_activities_client  ON activities(client_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_messages_conv      ON messages(conversation_id);
