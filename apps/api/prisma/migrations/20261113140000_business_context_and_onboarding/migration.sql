-- CreateTable
CREATE TABLE "business_profiles" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "business_name" TEXT NOT NULL,
    "website" TEXT,
    "industry" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "business_size" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_profiles" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "logo_url" TEXT,
    "primary_color" TEXT DEFAULT '#3563F6',
    "secondary_color" TEXT DEFAULT '#6554E8',
    "brand_voice" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_progress" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "step" TEXT NOT NULL DEFAULT 'business',
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_steps" JSONB,
    "goals" JSONB,
    "data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_preferences" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "email_notifications" BOOLEAN NOT NULL DEFAULT true,
    "weekly_digest" BOOLEAN NOT NULL DEFAULT true,
    "marketing_updates" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_profiles_workspace_id_key" ON "business_profiles"("workspace_id");
CREATE INDEX "business_profiles_workspace_id_idx" ON "business_profiles"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "brand_profiles_workspace_id_key" ON "brand_profiles"("workspace_id");
CREATE INDEX "brand_profiles_workspace_id_idx" ON "brand_profiles"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_progress_workspace_id_key" ON "onboarding_progress"("workspace_id");
CREATE INDEX "onboarding_progress_workspace_id_idx" ON "onboarding_progress"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_preferences_workspace_id_key" ON "workspace_preferences"("workspace_id");
CREATE INDEX "workspace_preferences_workspace_id_idx" ON "workspace_preferences"("workspace_id");

-- AddForeignKey
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_profiles" ADD CONSTRAINT "brand_profiles_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_progress" ADD CONSTRAINT "onboarding_progress_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_preferences" ADD CONSTRAINT "workspace_preferences_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

