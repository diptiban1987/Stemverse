-- Marketplace Foundation

CREATE TYPE "MarketplaceItemType" AS ENUM (
  'PLUGIN',
  'COMPONENT_SENSOR',
  'COMPONENT_ACTUATOR',
  'COMPONENT_DISPLAY',
  'COMPONENT_BOARD',
  'COURSE',
  'PROJECT'
);

CREATE TYPE "MarketplaceListingStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "PluginInstallState" AS ENUM ('INSTALLED', 'ENABLED', 'DISABLED');

CREATE TABLE "marketplace_listings" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "MarketplaceItemType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "author_id" UUID NOT NULL,
    "status" "MarketplaceListingStatus" NOT NULL DEFAULT 'DRAFT',
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "tags" JSONB NOT NULL DEFAULT '[]',
    "install_count" INTEGER NOT NULL DEFAULT 0,
    "plugin_manifest" JSONB,
    "project_id" UUID,
    "course_id" UUID,
    "component_slug" TEXT,
    "component_kind" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "marketplace_listings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "marketplace_listings_slug_key" ON "marketplace_listings"("slug");
CREATE UNIQUE INDEX "marketplace_listings_project_id_key" ON "marketplace_listings"("project_id");
CREATE UNIQUE INDEX "marketplace_listings_course_id_key" ON "marketplace_listings"("course_id");
CREATE INDEX "marketplace_listings_type_status_idx" ON "marketplace_listings"("type", "status");
CREATE INDEX "marketplace_listings_category_idx" ON "marketplace_listings"("category");
CREATE INDEX "marketplace_listings_author_id_idx" ON "marketplace_listings"("author_id");

CREATE TABLE "plugin_installations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "state" "PluginInstallState" NOT NULL DEFAULT 'ENABLED',
    "installed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "plugin_installations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "plugin_installations_user_id_listing_id_key" ON "plugin_installations"("user_id", "listing_id");
CREATE INDEX "plugin_installations_user_id_idx" ON "plugin_installations"("user_id");

ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_author_id_fkey"
  FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_course_id_fkey"
  FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "plugin_installations" ADD CONSTRAINT "plugin_installations_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "plugin_installations" ADD CONSTRAINT "plugin_installations_listing_id_fkey"
  FOREIGN KEY ("listing_id") REFERENCES "marketplace_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
