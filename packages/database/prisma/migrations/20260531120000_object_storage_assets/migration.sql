-- CreateEnum
CREATE TYPE "AssetBucket" AS ENUM ('SCRATCH_ASSETS', 'PROJECT_ASSETS', 'MARKETPLACE_ASSETS', 'AI_ASSETS');

-- CreateEnum
CREATE TYPE "AssetPurpose" AS ENUM ('SCRATCH_COSTUME', 'SCRATCH_SOUND', 'PROJECT_THUMBNAIL', 'PROJECT_ATTACHMENT', 'MARKETPLACE_ICON', 'MARKETPLACE_PREVIEW', 'MARKETPLACE_DOWNLOAD', 'AI_DIAGRAM', 'AI_WIRING', 'AI_IMAGE', 'AI_PROJECT_ASSET', 'GENERAL');

-- CreateTable
CREATE TABLE "assets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "project_id" UUID,
    "listing_id" UUID,
    "ai_session_id" UUID,
    "bucket" "AssetBucket" NOT NULL,
    "object_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "purpose" "AssetPurpose" NOT NULL DEFAULT 'GENERAL',
    "original_filename" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assets_bucket_object_key_key" ON "assets"("bucket", "object_key");

-- CreateIndex
CREATE INDEX "assets_user_id_idx" ON "assets"("user_id");

-- CreateIndex
CREATE INDEX "assets_project_id_idx" ON "assets"("project_id");

-- CreateIndex
CREATE INDEX "assets_listing_id_idx" ON "assets"("listing_id");

-- CreateIndex
CREATE INDEX "assets_purpose_idx" ON "assets"("purpose");

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "marketplace_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_ai_session_id_fkey" FOREIGN KEY ("ai_session_id") REFERENCES "ai_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
