-- Enable pgvector (required for embedding columns)
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "title" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_roles" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domains" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "profile" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technologies" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "valid_from" INTEGER NOT NULL,
    "valid_to" INTEGER NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" TEXT NOT NULL,
    "maturity_note" TEXT,

    CONSTRAINT "technologies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "components" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "role_id" UUID,
    "technology_id" UUID,
    "domain_id" UUID,
    "timeline_start" INTEGER NOT NULL,
    "timeline_end" INTEGER NOT NULL,
    "component_type" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "base_logic" TEXT NOT NULL,
    "variations" JSONB NOT NULL DEFAULT '[]',
    "embedding" vector(1536),
    "quality_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "freshness_score" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "deprecation_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_by" UUID,
    "approved_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resumes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "parent_resume_id" UUID,
    "jd_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "storage_path" TEXT,
    "markdown" TEXT,
    "ats_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "realism_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "domain_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "timeline_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "uniqueness_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "prompt_version" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_component_uses" (
    "id" UUID NOT NULL,
    "resume_id" UUID NOT NULL,
    "component_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resume_component_uses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "external_id" TEXT,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "domain" TEXT,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT,
    "jd_hash" TEXT,
    "embedding" vector(1536),
    "normalized_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "apply_mode" TEXT NOT NULL DEFAULT 'human_assisted',
    "posted_at" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_connectors" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "portal_name" TEXT NOT NULL,
    "auth_mode" TEXT NOT NULL,
    "apply_mode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_connected',
    "refresh_every_seconds" INTEGER NOT NULL DEFAULT 60,
    "safety_controls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "credential_ref" TEXT,
    "last_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_connectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_application_profiles" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "user_id" UUID NOT NULL,
    "legal_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "linkedin" TEXT,
    "current_location" TEXT,
    "target_locations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "job_titles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "blocklisted_words" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "work_authorization" TEXT,
    "visa_sponsorship" TEXT,
    "employment_types" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "expected_rate" TEXT,
    "availability" TEXT,
    "relocation" TEXT,
    "primary_resume_id" UUID,
    "reusable_answers" JSONB NOT NULL DEFAULT '{}',
    "connector_statuses" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_application_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "synced_roles" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "user_id" UUID NOT NULL,
    "portal_name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "contract_type" TEXT,
    "recruiter_name" TEXT,
    "recruiter_email" TEXT,
    "link" TEXT,
    "jd" TEXT NOT NULL,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "match_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "exclusion_hits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "matched_signals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'new',
    "safe_apply_mode" TEXT NOT NULL,
    "discovered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "synced_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applied_role_records" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "user_id" UUID NOT NULL,
    "synced_role_id" UUID,
    "portal_name" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "jd" TEXT NOT NULL,
    "link" TEXT,
    "recruiter_email" TEXT,
    "resume_id" UUID,
    "resume_snapshot" TEXT,
    "application_payload" JSONB NOT NULL DEFAULT '{}',
    "response" TEXT,
    "status" TEXT NOT NULL DEFAULT 'prepared',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "applied_role_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "resume_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "applied_at" TIMESTAMP(3),
    "ats_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "realism_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "resume_docx_path" TEXT,
    "resume_pdf_path" TEXT,
    "jd_snapshot_path" TEXT,
    "cover_letter_path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mail_threads" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "user_id" UUID NOT NULL,
    "job_id" UUID,
    "contact_name" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "company" TEXT,
    "subject" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "last_message" TEXT,
    "draft" TEXT,
    "approved_by" UUID,
    "provider_message_id" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mail_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_ledger" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "user_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "units" INTEGER NOT NULL DEFAULT 0,
    "amount_cents" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'open',
    "provider_invoice_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "user_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "units" INTEGER NOT NULL DEFAULT 1,
    "tokens_used" INTEGER NOT NULL DEFAULT 0,
    "cost_cents" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verified_intelligence_loads" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "uploaded_by" UUID,
    "keyword" TEXT NOT NULL,
    "job_titles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "timeline_start" INTEGER NOT NULL,
    "timeline_end" INTEGER NOT NULL,
    "domains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bullet_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verified_intelligence_loads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_versions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "system_prompt" TEXT NOT NULL,
    "model_route" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "average_ats_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "average_realism_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "callback_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "severity" TEXT NOT NULL DEFAULT 'info',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_taxonomy" (
    "id" UUID NOT NULL,
    "canonical_name" TEXT NOT NULL,
    "aliases" TEXT[],
    "category" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_taxonomy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "application_id" UUID,
    "resume_id" UUID,
    "event_type" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_tenant_role_idx" ON "users"("tenant_id", "role", "status");

-- CreateIndex
CREATE INDEX "company_roles_tenant_idx" ON "company_roles"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "domains_name_key" ON "domains"("name");

-- CreateIndex
CREATE UNIQUE INDEX "technologies_name_key" ON "technologies"("name");

-- CreateIndex
CREATE INDEX "components_lookup_idx" ON "components"("tenant_id", "status", "component_type", "timeline_start", "timeline_end");

-- CreateIndex
CREATE INDEX "job_connectors_scope_idx" ON "job_connectors"("tenant_id", "portal_name", "status");

-- CreateIndex
CREATE INDEX "candidate_application_profiles_user_idx" ON "candidate_application_profiles"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "synced_roles_user_status_idx" ON "synced_roles"("tenant_id", "user_id", "status", "match_score");

-- CreateIndex
CREATE INDEX "applied_role_records_user_idx" ON "applied_role_records"("tenant_id", "user_id", "status");

-- CreateIndex
CREATE INDEX "applications_status_idx" ON "applications"("tenant_id", "user_id", "status");

-- CreateIndex
CREATE INDEX "mail_threads_user_status_idx" ON "mail_threads"("tenant_id", "user_id", "status");

-- CreateIndex
CREATE INDEX "billing_ledger_scope_idx" ON "billing_ledger"("tenant_id", "user_id", "status");

-- CreateIndex
CREATE INDEX "usage_events_scope_idx" ON "usage_events"("tenant_id", "user_id", "event_type");

-- CreateIndex
CREATE INDEX "audit_events_entity_idx" ON "audit_events"("tenant_id", "entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "components" ADD CONSTRAINT "components_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "components" ADD CONSTRAINT "components_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "components" ADD CONSTRAINT "components_technology_id_fkey" FOREIGN KEY ("technology_id") REFERENCES "technologies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "components" ADD CONSTRAINT "components_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_parent_resume_id_fkey" FOREIGN KEY ("parent_resume_id") REFERENCES "resumes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_component_uses" ADD CONSTRAINT "resume_component_uses_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_component_uses" ADD CONSTRAINT "resume_component_uses_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Optional: IVFFlat indexes for similarity search (tune lists in production after data load)
-- CREATE INDEX components_embedding_idx ON components USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);
-- CREATE INDEX jobs_embedding_idx ON jobs USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);
