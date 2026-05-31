-- Phase 4: AI Studio + Collaboration Foundation

-- AlterTable: projects — slug, forked_from_id, visibility index
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "forked_from_id" UUID;

CREATE UNIQUE INDEX IF NOT EXISTS "projects_slug_key" ON "projects"("slug");
CREATE INDEX IF NOT EXISTS "projects_visibility_idx" ON "projects"("visibility");

ALTER TABLE "projects"
  ADD CONSTRAINT "projects_forked_from_id_fkey"
  FOREIGN KEY ("forked_from_id") REFERENCES "projects"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: project_versions
CREATE TABLE IF NOT EXISTS "project_versions" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "label" TEXT,
    "workspace_json" JSONB NOT NULL,
    "generated_code" TEXT,
    "simulator_metadata" JSONB,
    "ai_session_metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "project_versions_project_id_version_number_key"
  ON "project_versions"("project_id", "version_number");
CREATE INDEX IF NOT EXISTS "project_versions_project_id_idx" ON "project_versions"("project_id");

ALTER TABLE "project_versions"
  ADD CONSTRAINT "project_versions_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_versions"
  ADD CONSTRAINT "project_versions_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: ai_sessions
CREATE TABLE IF NOT EXISTS "ai_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "project_id" UUID,
    "title" TEXT NOT NULL,
    "model" TEXT,
    "messages" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ai_sessions_user_id_idx" ON "ai_sessions"("user_id");
CREATE INDEX IF NOT EXISTS "ai_sessions_project_id_idx" ON "ai_sessions"("project_id");

ALTER TABLE "ai_sessions"
  ADD CONSTRAINT "ai_sessions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_sessions"
  ADD CONSTRAINT "ai_sessions_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: ai_user_settings
CREATE TABLE IF NOT EXISTS "ai_user_settings" (
    "user_id" UUID NOT NULL,
    "preferred_model" TEXT,
    "fallback_model" TEXT,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "max_tokens" INTEGER NOT NULL DEFAULT 1024,
    "streaming_enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ai_user_settings_pkey" PRIMARY KEY ("user_id")
);

ALTER TABLE "ai_user_settings"
  ADD CONSTRAINT "ai_user_settings_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
