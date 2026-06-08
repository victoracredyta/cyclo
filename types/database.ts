export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type TableDef<R extends Record<string, unknown>> = {
  Row: R
  Insert: Partial<R> & Record<string, unknown>
  Update: Partial<R>
  Relationships: []
}

export interface Database {
  public: {
    Tables: {
      organizations: TableDef<{
        id: string
        name: string
        slug: string | null
        logo_url: string | null
        primary_color: string
        secondary_color: string
        button_color: string
        tagline: string | null
        plan: string
        stripe_customer_id: string | null
        stripe_subscription_id: string | null
        onboarding_completed: boolean
        created_at: string
      }>
      users: TableDef<{
        id: string
        organization_id: string | null
        full_name: string | null
        email: string | null
        avatar_url: string | null
        role: string | null
        permission: string
        is_active: boolean
        onboarding_completed: boolean
        created_at: string
      }>
      clients: TableDef<{
        id: string
        organization_id: string
        segment_id: string | null
        name: string
        sector: string | null
        logo_url: string | null
        website: string | null
        email: string | null
        phone: string | null
        address: string | null
        city: string | null
        state: string | null
        cnpj: string | null
        status: string
        mrr: number
        health_score: number
        contract_since: string | null
        contract_end: string | null
        responsible_id: string | null
        objectives: string | null
        voice_tone: string | null
        observations: string | null
        important_dates: Json
        services: string[]
        portal_password: string | null
        portal_enabled: boolean
        originated_from_lead_id: string | null
        created_at: string
      }>
      client_contacts: TableDef<{
        id: string
        client_id: string
        name: string | null
        role: string | null
        email: string | null
        phone: string | null
        whatsapp: string | null
        is_primary: boolean
        created_at: string
      }>
      activities: TableDef<{
        id: string
        organization_id: string
        client_id: string | null
        lead_id: string | null
        user_id: string | null
        type: string | null
        title: string | null
        description: string | null
        scheduled_at: string | null
        completed_at: string | null
        created_at: string
      }>
      funnels: TableDef<{
        id: string
        organization_id: string
        name: string
        description: string | null
        is_default: boolean
        is_hidden: boolean
        created_at: string
      }>
      funnel_users: TableDef<{
        funnel_id: string
        user_id: string
      }>
      segments: TableDef<{
        id: string
        organization_id: string
        name: string
        color: string
        created_at: string
      }>
      lead_rotation_config: TableDef<{
        organization_id: string
        enabled: boolean
        user_ids: string[]
        last_assigned_index: number
      }>
      pipeline_stages: TableDef<{
        id: string
        organization_id: string
        funnel_id: string | null
        name: string
        color: string
        order_index: number
        description: string | null
        created_at: string
      }>
      leads: TableDef<{
        id: string
        organization_id: string
        stage_id: string | null
        funnel_id: string | null
        segment_id: string | null
        name: string
        company: string | null
        value: number | null
        email: string | null
        phone: string | null
        whatsapp: string | null
        city: string | null
        origin: string | null
        responsible_id: string | null
        priority: string
        tag: string | null
        next_action: string | null
        notes: string | null
        lost_reason: string | null
        won_at: string | null
        lost_at: string | null
        additional_contacts: Array<{ name: string; email: string; phone: string; role: string }> | null
        created_at: string
      }>
      lead_files: TableDef<{
        id: string
        lead_id: string
        organization_id: string
        uploaded_by: string | null
        name: string
        path: string
        size: number
        mime_type: string | null
        created_at: string
      }>
      lead_emails: TableDef<{
        id: string
        lead_id: string
        organization_id: string
        sent_by: string | null
        recipient: string
        subject: string
        body: string
        cc: string | null
        bcc: string | null
        status: string
        sent_at: string
      }>
      email_settings: TableDef<{
        organization_id: string
        smtp_host: string
        smtp_port: number
        smtp_user: string
        smtp_pass: string
        from_name: string | null
        updated_at: string
      }>
      ai_settings: TableDef<{
        organization_id: string
        anthropic_api_key: string | null
        openai_api_key: string | null
        google_api_key: string | null
        updated_at: string
      }>
      notification_prefs: TableDef<{
        user_id: string
        organization_id: string
        event_type: string
        in_app_enabled: boolean
        email_enabled: boolean
        email_to: string | null
        email_subject: string | null
        email_body: string | null
        updated_at: string
      }>
      lead_tasks: TableDef<{
        id: string
        lead_id: string
        user_id: string | null
        title: string
        due_date: string | null
        is_done: boolean
        created_at: string
      }>
      content_items: TableDef<{
        id: string
        organization_id: string
        client_id: string
        user_id: string | null
        title: string | null
        copy: string | null
        hashtags: string | null
        cta: string | null
        channel: string | null
        format: string | null
        objective: string | null
        status: string
        scheduled_date: string | null
        published_at: string | null
        media_urls: string[]
        created_at: string
      }>
      approvals: TableDef<{
        id: string
        organization_id: string
        content_id: string | null
        client_id: string
        title: string
        type: string | null
        channel: string | null
        status: string
        current_version: number
        due_date: string | null
        created_at: string
      }>
      approval_versions: TableDef<{
        id: string
        approval_id: string
        version_number: number
        media_urls: string[]
        status: string | null
        created_by: string | null
        created_at: string
      }>
      approval_comments: TableDef<{
        id: string
        approval_id: string
        user_id: string | null
        author_name: string | null
        author_role: string | null
        content: string
        is_resolved: boolean
        created_at: string
      }>
      calendar_events: TableDef<{
        id: string
        organization_id: string
        user_id: string
        client_id: string | null
        lead_id: string | null
        title: string
        description: string | null
        event_type: string | null
        color: string
        start_at: string
        end_at: string
        is_all_day: boolean
        google_event_id: string | null
        created_at: string
      }>
      email_campaigns: TableDef<{
        id: string
        organization_id: string
        name: string
        subject: string | null
        body_html: string | null
        status: string
        list_name: string | null
        batch_size: number
        batch_interval_minutes: number
        daily_limit: number
        send_delay_seconds: number
        n8n_webhook_url: string | null
        sent_count: number
        opened_count: number
        clicked_count: number
        created_at: string
      }>
      landing_pages: TableDef<{
        id: string
        organization_id: string
        client_id: string | null
        name: string
        slug: string | null
        status: string
        leads_count: number
        views_count: number
        created_at: string
      }>
      automations: TableDef<{
        id: string
        organization_id: string
        name: string
        trigger_type: string | null
        action_type: string | null
        status: string
        config: Json
        runs_count: number
        errors_count: number
        last_run_at: string | null
        created_at: string
      }>
      goals: TableDef<{
        id: string
        organization_id: string
        user_id: string | null
        label: string
        target_value: number
        current_value: number
        unit: string | null
        color: string
        period: string
        month: number | null
        year: number | null
        created_at: string
      }>
      notifications: TableDef<{
        id: string
        organization_id: string
        user_id: string
        title: string
        message: string | null
        type: string
        link: string | null
        is_read: boolean
        created_at: string
      }>
      conversations: TableDef<{
        id: string
        organization_id: string
        client_id: string | null
        channel: string
        status: string
        last_message: string | null
        unread_count: number
        created_at: string
      }>
      messages: TableDef<{
        id: string
        conversation_id: string
        user_id: string | null
        content: string
        is_from_client: boolean
        read_at: string | null
        created_at: string
      }>
      competitors: TableDef<{
        id: string
        organization_id: string
        name: string
        instagram_followers: string | null
        linkedin_followers: string | null
        score: number
        branding: number
        visual: number
        frequency: number
        quality: number
        seo: number
        ads: number
        strengths: string[]
        weaknesses: string[]
        created_at: string
      }>
      invoices: TableDef<{
        id: string
        organization_id: string
        stripe_invoice_id: string | null
        amount: number
        status: string
        due_date: string | null
        paid_at: string | null
        created_at: string
      }>
      ai_conversations: TableDef<{
        id: string
        organization_id: string
        user_id: string
        messages: Json
        created_at: string
      }>
    }
    Views: Record<string, never>
    Functions: {
      get_my_org_id: {
        Args: Record<string, never>
        Returns: string
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Convenience row types
export type Organization = Database['public']['Tables']['organizations']['Row']
export type AppUser = Database['public']['Tables']['users']['Row']
export type Client = Database['public']['Tables']['clients']['Row']
export type ClientContact = Database['public']['Tables']['client_contacts']['Row']
export type Activity = Database['public']['Tables']['activities']['Row']
export type PipelineStage = Database['public']['Tables']['pipeline_stages']['Row']
export type Lead = Database['public']['Tables']['leads']['Row']
export type LeadTask = Database['public']['Tables']['lead_tasks']['Row']
export type LeadFile = Database['public']['Tables']['lead_files']['Row']
export type LeadEmail = Database['public']['Tables']['lead_emails']['Row']
export type ContentItem = Database['public']['Tables']['content_items']['Row']
export type Approval = Database['public']['Tables']['approvals']['Row']
export type ApprovalVersion = Database['public']['Tables']['approval_versions']['Row']
export type ApprovalComment = Database['public']['Tables']['approval_comments']['Row']
export type CalendarEvent = Database['public']['Tables']['calendar_events']['Row']
export type EmailCampaign = Database['public']['Tables']['email_campaigns']['Row']
export type LandingPage = Database['public']['Tables']['landing_pages']['Row']
export type Automation = Database['public']['Tables']['automations']['Row']
export type Goal = Database['public']['Tables']['goals']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type Conversation = Database['public']['Tables']['conversations']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type Competitor = Database['public']['Tables']['competitors']['Row']
export type Invoice = Database['public']['Tables']['invoices']['Row']
export type AIConversation = Database['public']['Tables']['ai_conversations']['Row']
export type Funnel = Database['public']['Tables']['funnels']['Row']
export type FunnelUser = Database['public']['Tables']['funnel_users']['Row']
export type Segment = Database['public']['Tables']['segments']['Row']
export type LeadRotationConfig = Database['public']['Tables']['lead_rotation_config']['Row']
