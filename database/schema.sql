CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE tenants (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    plan TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    title TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE company_roles (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name TEXT NOT NULL,
    permissions TEXT[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE roles (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL
);

CREATE TABLE domains (
    id UUID PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    profile JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE TABLE technologies (
    id UUID PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    valid_from INT NOT NULL,
    valid_to INT NOT NULL,
    aliases TEXT[] NOT NULL DEFAULT '{}',
    category TEXT NOT NULL,
    maturity_note TEXT
);

CREATE TABLE components (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    role_id UUID REFERENCES roles(id),
    technology_id UUID REFERENCES technologies(id),
    domain_id UUID REFERENCES domains(id),
    timeline_start INT NOT NULL,
    timeline_end INT NOT NULL,
    component_type TEXT NOT NULL,
    intent TEXT NOT NULL,
    base_logic TEXT NOT NULL,
    variations JSONB NOT NULL DEFAULT '[]'::JSONB,
    tags TEXT[] NOT NULL DEFAULT '{}',
    embedding VECTOR(1536),
    quality_score FLOAT NOT NULL DEFAULT 0,
    usage_count INT NOT NULL DEFAULT 0,
    freshness_score FLOAT NOT NULL DEFAULT 100,
    deprecation_score FLOAT NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE resumes (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID NOT NULL REFERENCES users(id),
    parent_resume_id UUID REFERENCES resumes(id),
    jd_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    domain TEXT NOT NULL,
    strategy TEXT NOT NULL,
    storage_path TEXT,
    markdown TEXT,
    ats_score FLOAT NOT NULL DEFAULT 0,
    realism_score FLOAT NOT NULL DEFAULT 0,
    domain_score FLOAT NOT NULL DEFAULT 0,
    timeline_score FLOAT NOT NULL DEFAULT 0,
    uniqueness_score FLOAT NOT NULL DEFAULT 0,
    prompt_version TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE resume_component_uses (
    id UUID PRIMARY KEY,
    resume_id UUID NOT NULL REFERENCES resumes(id),
    component_id UUID NOT NULL REFERENCES components(id),
    reason TEXT NOT NULL,
    score FLOAT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE jobs (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    source TEXT NOT NULL,
    external_id TEXT,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT,
    domain TEXT,
    skills TEXT[] NOT NULL DEFAULT '{}',
    description TEXT,
    jd_hash TEXT,
    embedding VECTOR(1536),
    normalized_score FLOAT NOT NULL DEFAULT 0,
    apply_mode TEXT NOT NULL DEFAULT 'human_assisted',
    posted_at DATE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE job_connectors (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    portal_name TEXT NOT NULL,
    auth_mode TEXT NOT NULL,
    apply_mode TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'not_connected',
    refresh_every_seconds INT NOT NULL DEFAULT 60,
    safety_controls TEXT[] NOT NULL DEFAULT '{}',
    credential_ref TEXT,
    last_synced_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE candidate_application_profiles (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    user_id UUID NOT NULL REFERENCES users(id),
    legal_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    linkedin TEXT,
    current_location TEXT,
    target_locations TEXT[] NOT NULL DEFAULT '{}',
    job_titles TEXT[] NOT NULL DEFAULT '{}',
    keywords TEXT[] NOT NULL DEFAULT '{}',
    blocklisted_words TEXT[] NOT NULL DEFAULT '{}',
    work_authorization TEXT,
    visa_sponsorship TEXT,
    employment_types TEXT[] NOT NULL DEFAULT '{}',
    expected_rate TEXT,
    availability TEXT,
    relocation TEXT,
    primary_resume_id UUID REFERENCES resumes(id),
    reusable_answers JSONB NOT NULL DEFAULT '{}'::JSONB,
    connector_statuses JSONB NOT NULL DEFAULT '{}'::JSONB,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE synced_roles (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    user_id UUID NOT NULL REFERENCES users(id),
    portal_name TEXT NOT NULL,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT,
    contract_type TEXT,
    recruiter_name TEXT,
    recruiter_email TEXT,
    link TEXT,
    jd TEXT NOT NULL,
    keywords TEXT[] NOT NULL DEFAULT '{}',
    match_score FLOAT NOT NULL DEFAULT 0,
    exclusion_hits TEXT[] NOT NULL DEFAULT '{}',
    matched_signals TEXT[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'new',
    safe_apply_mode TEXT NOT NULL,
    discovered_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE applied_role_records (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    user_id UUID NOT NULL REFERENCES users(id),
    synced_role_id UUID REFERENCES synced_roles(id),
    portal_name TEXT NOT NULL,
    company_name TEXT NOT NULL,
    title TEXT NOT NULL,
    jd TEXT NOT NULL,
    link TEXT,
    recruiter_email TEXT,
    resume_id UUID REFERENCES resumes(id),
    resume_snapshot TEXT,
    application_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
    response TEXT,
    status TEXT NOT NULL DEFAULT 'prepared',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE applications (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID NOT NULL REFERENCES users(id),
    job_id UUID NOT NULL REFERENCES jobs(id),
    resume_id UUID NOT NULL REFERENCES resumes(id),
    status TEXT NOT NULL,
    ats_score FLOAT NOT NULL DEFAULT 0,
    realism_score FLOAT NOT NULL DEFAULT 0,
    applied_at TIMESTAMP,
    resume_docx_path TEXT,
    resume_pdf_path TEXT,
    jd_snapshot_path TEXT,
    cover_letter_path TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE mail_threads (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    user_id UUID NOT NULL REFERENCES users(id),
    job_id UUID REFERENCES jobs(id),
    contact_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    company TEXT,
    subject TEXT NOT NULL,
    direction TEXT NOT NULL,
    status TEXT NOT NULL,
    last_message TEXT,
    draft TEXT,
    approved_by UUID REFERENCES users(id),
    provider_message_id TEXT,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE billing_ledger (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    user_id UUID NOT NULL REFERENCES users(id),
    label TEXT NOT NULL,
    units INT NOT NULL DEFAULT 0,
    amount_cents INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'open',
    provider_invoice_id TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE usage_events (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    user_id UUID NOT NULL REFERENCES users(id),
    event_type TEXT NOT NULL,
    units INT NOT NULL DEFAULT 1,
    tokens_used INT NOT NULL DEFAULT 0,
    cost_cents INT NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE verified_intelligence_loads (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    uploaded_by UUID REFERENCES users(id),
    keyword TEXT NOT NULL,
    job_titles TEXT[] NOT NULL DEFAULT '{}',
    timeline_start INT NOT NULL,
    timeline_end INT NOT NULL,
    domains TEXT[] NOT NULL DEFAULT '{}',
    bullet_count INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE prompt_versions (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name TEXT NOT NULL,
    system_prompt TEXT NOT NULL,
    model_route TEXT NOT NULL,
    status TEXT NOT NULL,
    average_ats_score FLOAT NOT NULL DEFAULT 0,
    average_realism_score FLOAT NOT NULL DEFAULT 0,
    callback_rate FLOAT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_events (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    actor_id UUID REFERENCES users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::JSONB,
    severity TEXT NOT NULL DEFAULT 'info',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE skill_taxonomy (
    id UUID PRIMARY KEY,
    canonical_name TEXT NOT NULL,
    aliases TEXT[] NOT NULL,
    category TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE feedback_events (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    application_id UUID REFERENCES applications(id),
    resume_id UUID REFERENCES resumes(id),
    event_type TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX components_embedding_idx ON components USING ivfflat (embedding vector_l2_ops);
CREATE INDEX jobs_embedding_idx ON jobs USING ivfflat (embedding vector_l2_ops);
CREATE INDEX components_lookup_idx ON components (tenant_id, status, component_type, timeline_start, timeline_end);
CREATE INDEX job_connectors_scope_idx ON job_connectors (tenant_id, portal_name, status);
CREATE INDEX candidate_application_profiles_user_idx ON candidate_application_profiles (tenant_id, user_id);
CREATE INDEX synced_roles_user_status_idx ON synced_roles (tenant_id, user_id, status, match_score);
CREATE INDEX applied_role_records_user_idx ON applied_role_records (tenant_id, user_id, status);
CREATE INDEX applications_status_idx ON applications (tenant_id, user_id, status);
CREATE INDEX audit_events_entity_idx ON audit_events (tenant_id, entity_type, entity_id);
CREATE INDEX users_tenant_role_idx ON users (tenant_id, role, status);
CREATE INDEX company_roles_tenant_idx ON company_roles (tenant_id, status);
CREATE INDEX mail_threads_user_status_idx ON mail_threads (tenant_id, user_id, status);
CREATE INDEX billing_ledger_scope_idx ON billing_ledger (tenant_id, user_id, status);
CREATE INDEX usage_events_scope_idx ON usage_events (tenant_id, user_id, event_type);
