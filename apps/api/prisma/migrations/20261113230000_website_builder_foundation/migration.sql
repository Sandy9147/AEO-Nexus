-- CreateEnum
CREATE TYPE "WebsiteStatus" AS ENUM ('DRAFT', 'GENERATING', 'READY', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SectionType" AS ENUM ('HERO', 'ANNOUNCEMENT_BAR', 'NAVIGATION', 'LOGO_STRIP', 'FEATURES', 'SERVICES', 'ABOUT', 'IMAGE_TEXT', 'GALLERY', 'PROCESS_STEPS', 'PRICING', 'FAQ', 'TESTIMONIALS', 'CONTACT', 'CTA', 'FOOTER');

-- CreateTable
CREATE TABLE "website_projects" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "website_type" TEXT NOT NULL DEFAULT 'BUSINESS_WEBSITE',
    "status" "WebsiteStatus" NOT NULL DEFAULT 'DRAFT',
    "description" TEXT,
    "target_audience" TEXT,
    "target_market" TEXT,
    "plan_id" TEXT,
    "initiative_id" TEXT,
    "current_version_number" INTEGER NOT NULL DEFAULT 1,
    "published_subdomain" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "website_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "website_themes" (
    "id" TEXT NOT NULL,
    "website_id" TEXT NOT NULL,
    "primary_color" TEXT NOT NULL DEFAULT '#3563F6',
    "secondary_color" TEXT NOT NULL DEFAULT '#6554E8',
    "background_color" TEXT NOT NULL DEFAULT '#FFFFFF',
    "surface_color" TEXT NOT NULL DEFAULT '#F7F9FC',
    "text_color" TEXT NOT NULL DEFAULT '#1E293B',
    "heading_font" TEXT NOT NULL DEFAULT 'Inter',
    "body_font" TEXT NOT NULL DEFAULT 'Inter',
    "button_style" TEXT NOT NULL DEFAULT 'ROUNDED',
    "border_radius" TEXT NOT NULL DEFAULT '8px',
    "section_spacing" TEXT NOT NULL DEFAULT 'MEDIUM',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "website_themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "website_pages" (
    "id" TEXT NOT NULL,
    "website_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "page_order" INTEGER NOT NULL DEFAULT 0,
    "is_home" BOOLEAN NOT NULL DEFAULT false,
    "seo_title" TEXT,
    "seo_description" TEXT,
    "sections" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "website_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "website_versions" (
    "id" TEXT NOT NULL,
    "website_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "change_summary" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "website_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "website_publications" (
    "id" TEXT NOT NULL,
    "website_id" TEXT NOT NULL,
    "version_id" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "published_url" TEXT NOT NULL,
    "published_by_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unpublished_at" TIMESTAMP(3),

    CONSTRAINT "website_publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "website_generation_runs" (
    "id" TEXT NOT NULL,
    "website_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "prompt" TEXT,
    "raw_response" TEXT,
    "error" TEXT,
    "prompt_tokens" INTEGER NOT NULL DEFAULT 0,
    "completion_tokens" INTEGER NOT NULL DEFAULT 0,
    "total_tokens" INTEGER NOT NULL DEFAULT 0,
    "latency_ms" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "website_generation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "website_projects_slug_key" ON "website_projects"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "website_projects_published_subdomain_key" ON "website_projects"("published_subdomain");

-- CreateIndex
CREATE INDEX "website_projects_workspace_id_idx" ON "website_projects"("workspace_id");

-- CreateIndex
CREATE INDEX "website_projects_created_by_id_idx" ON "website_projects"("created_by_id");

-- CreateIndex
CREATE INDEX "website_projects_status_idx" ON "website_projects"("status");

-- CreateIndex
CREATE INDEX "website_projects_plan_id_idx" ON "website_projects"("plan_id");

-- CreateIndex
CREATE INDEX "website_projects_initiative_id_idx" ON "website_projects"("initiative_id");

-- CreateIndex
CREATE UNIQUE INDEX "website_themes_website_id_key" ON "website_themes"("website_id");

-- CreateIndex
CREATE UNIQUE INDEX "website_pages_website_id_slug_key" ON "website_pages"("website_id", "slug");

-- CreateIndex
CREATE INDEX "website_pages_website_id_idx" ON "website_pages"("website_id");

-- CreateIndex
CREATE UNIQUE INDEX "website_versions_website_id_version_number_key" ON "website_versions"("website_id", "version_number");

-- CreateIndex
CREATE INDEX "website_versions_website_id_idx" ON "website_versions"("website_id");

-- CreateIndex
CREATE INDEX "website_publications_website_id_idx" ON "website_publications"("website_id");

-- CreateIndex
CREATE INDEX "website_publications_subdomain_idx" ON "website_publications"("subdomain");

-- CreateIndex
CREATE INDEX "website_generation_runs_website_id_idx" ON "website_generation_runs"("website_id");

-- AddForeignKey
ALTER TABLE "website_projects" ADD CONSTRAINT "website_projects_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_projects" ADD CONSTRAINT "website_projects_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_projects" ADD CONSTRAINT "website_projects_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "strategic_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_projects" ADD CONSTRAINT "website_projects_initiative_id_fkey" FOREIGN KEY ("initiative_id") REFERENCES "strategic_initiatives"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_themes" ADD CONSTRAINT "website_themes_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "website_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_pages" ADD CONSTRAINT "website_pages_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "website_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_versions" ADD CONSTRAINT "website_versions_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "website_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_publications" ADD CONSTRAINT "website_publications_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "website_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_publications" ADD CONSTRAINT "website_publications_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "website_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_publications" ADD CONSTRAINT "website_publications_published_by_id_fkey" FOREIGN KEY ("published_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_generation_runs" ADD CONSTRAINT "website_generation_runs_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "website_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
