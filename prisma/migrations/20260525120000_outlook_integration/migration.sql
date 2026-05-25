-- Outlook OAuth connections and mail provider on threads
ALTER TABLE "mail_threads" ADD COLUMN IF NOT EXISTS "provider" TEXT;

CREATE TABLE IF NOT EXISTS "outlook_connections" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tenant_id" UUID,
    "outlook_address" TEXT NOT NULL,
    "refresh_token_encrypted" TEXT NOT NULL,
    "last_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outlook_connections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "outlook_connections_user_id_key" ON "outlook_connections"("user_id");
CREATE INDEX IF NOT EXISTS "outlook_connections_tenant_idx" ON "outlook_connections"("tenant_id");

ALTER TABLE "outlook_connections" ADD CONSTRAINT "outlook_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
