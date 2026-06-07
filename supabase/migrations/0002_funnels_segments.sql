-- ============================================================
-- CYCLO — Migration 0002: Funnels, Segments, Lead Distribution
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. TABLE: funnels
-- ============================================================
CREATE TABLE funnels (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES organizations ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  is_default      boolean DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

-- ============================================================
-- 2. TABLE: funnel_users (visibility: who sees each funnel)
-- ============================================================
CREATE TABLE funnel_users (
  funnel_id uuid NOT NULL REFERENCES funnels ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES users   ON DELETE CASCADE,
  PRIMARY KEY (funnel_id, user_id)
);

-- ============================================================
-- 3. ALTER pipeline_stages — funnel_id + description
-- ============================================================
ALTER TABLE pipeline_stages ADD COLUMN funnel_id   uuid REFERENCES funnels ON DELETE CASCADE;
ALTER TABLE pipeline_stages ADD COLUMN description text;

-- ============================================================
-- 4. ALTER leads — funnel_id
-- ============================================================
ALTER TABLE leads ADD COLUMN funnel_id uuid REFERENCES funnels ON DELETE SET NULL;

-- ============================================================
-- 5. TABLE: segments
-- ============================================================
CREATE TABLE segments (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES organizations ON DELETE CASCADE,
  name            text NOT NULL,
  color           text DEFAULT '#5B8CFF',
  created_at      timestamptz DEFAULT now()
);

-- ============================================================
-- 6. ALTER clients + leads — segment_id
-- ============================================================
ALTER TABLE clients ADD COLUMN segment_id uuid REFERENCES segments ON DELETE SET NULL;
ALTER TABLE leads   ADD COLUMN segment_id uuid REFERENCES segments ON DELETE SET NULL;

-- ============================================================
-- 7. TABLE: lead_rotation_config (1 row per org)
-- ============================================================
CREATE TABLE lead_rotation_config (
  organization_id     uuid PRIMARY KEY REFERENCES organizations ON DELETE CASCADE,
  enabled             boolean DEFAULT false,
  user_ids            uuid[]  DEFAULT '{}',
  last_assigned_index int     DEFAULT 0
);

-- ============================================================
-- 8. RLS — Enable and policies for all new tables
-- ============================================================
ALTER TABLE funnels              ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE segments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_rotation_config ENABLE ROW LEVEL SECURITY;

-- funnels: org-scoped full access
CREATE POLICY "funnels_all" ON funnels
  USING (organization_id = get_my_org_id())
  WITH CHECK (organization_id = get_my_org_id());

-- funnel_users: access via parent funnel's org
CREATE POLICY "funnel_users_all" ON funnel_users
  USING (
    funnel_id IN (SELECT id FROM funnels WHERE organization_id = get_my_org_id())
  )
  WITH CHECK (
    funnel_id IN (SELECT id FROM funnels WHERE organization_id = get_my_org_id())
  );

-- segments: org-scoped full access
CREATE POLICY "segments_all" ON segments
  USING (organization_id = get_my_org_id())
  WITH CHECK (organization_id = get_my_org_id());

-- lead_rotation_config: org-scoped full access
CREATE POLICY "lead_rotation_config_all" ON lead_rotation_config
  USING (organization_id = get_my_org_id())
  WITH CHECK (organization_id = get_my_org_id());

-- ============================================================
-- 9. DATA MIGRATION — backfill "Padrão" funnel for every org
-- ============================================================
DO $$
DECLARE
  org         RECORD;
  v_funnel_id uuid;
BEGIN
  FOR org IN SELECT id FROM organizations LOOP

    -- Create the default funnel for this org
    INSERT INTO funnels (organization_id, name, is_default)
    VALUES (org.id, 'Padrão', true)
    RETURNING id INTO v_funnel_id;

    -- Link all existing pipeline stages to this funnel
    UPDATE pipeline_stages
    SET funnel_id = v_funnel_id
    WHERE organization_id = org.id
      AND funnel_id IS NULL;

    -- Link all existing leads to this funnel
    UPDATE leads
    SET funnel_id = v_funnel_id
    WHERE organization_id = org.id
      AND funnel_id IS NULL;

    -- Grant visibility to every user already in this org
    INSERT INTO funnel_users (funnel_id, user_id)
    SELECT v_funnel_id, u.id
    FROM users u
    WHERE u.organization_id = org.id
    ON CONFLICT DO NOTHING;

  END LOOP;
END $$;

-- ============================================================
-- 10. Recreate org-creation trigger: funnel + 5 stages
-- ============================================================
DROP TRIGGER IF EXISTS on_organization_created ON organizations;
DROP FUNCTION IF EXISTS create_default_pipeline_stages();

CREATE OR REPLACE FUNCTION create_default_pipeline_stages()
RETURNS TRIGGER AS $$
DECLARE
  v_funnel_id uuid;
BEGIN
  -- Create default funnel
  INSERT INTO funnels (organization_id, name, is_default)
  VALUES (NEW.id, 'Padrão', true)
  RETURNING id INTO v_funnel_id;

  -- Create 5 default stages linked to the funnel
  INSERT INTO pipeline_stages (organization_id, funnel_id, name, color, order_index) VALUES
    (NEW.id, v_funnel_id, 'Prospecção',   '#64748B', 0),
    (NEW.id, v_funnel_id, 'Qualificação', '#F59E0B', 1),
    (NEW.id, v_funnel_id, 'Proposta',     '#5B8CFF', 2),
    (NEW.id, v_funnel_id, 'Negociação',   '#8B5CF6', 3),
    (NEW.id, v_funnel_id, 'Fechamento',   '#12B981', 4);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_organization_created
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION create_default_pipeline_stages();

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_funnels_org          ON funnels(organization_id);
CREATE INDEX idx_funnel_users_funnel  ON funnel_users(funnel_id);
CREATE INDEX idx_funnel_users_user    ON funnel_users(user_id);
CREATE INDEX idx_segments_org         ON segments(organization_id);
CREATE INDEX idx_pipeline_stages_funnel ON pipeline_stages(funnel_id);
CREATE INDEX idx_leads_funnel         ON leads(funnel_id);
CREATE INDEX idx_leads_segment        ON leads(segment_id);
CREATE INDEX idx_clients_segment      ON clients(segment_id);
