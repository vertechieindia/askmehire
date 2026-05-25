-- Gmail OAuth connections and provider thread linkage on mail threads
ALTER TABLE "mail_threads" ADD COLUMN IF NOT EXISTS "provider_thread_id" TEXT;

CREATE INDEX IF NOT EXISTS "mail_threads_provider_thread_idx" ON "mail_threads"("user_id", "provider_thread_id");

CREATE TABLE IF NOT EXISTS "gmail_connections" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tenant_id" UUID,
    "gmail_address" TEXT NOT NULL,
    "refresh_token_encrypted" TEXT NOT NULL,
    "history_id" TEXT,
    "last_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gmail_connections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "gmail_connections_user_id_key" ON "gmail_connections"("user_id");
CREATE INDEX IF NOT EXISTS "gmail_connections_tenant_idx" ON "gmail_connections"("tenant_id");

ALTER TABLE "gmail_connections" ADD CONSTRAINT "gmail_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
