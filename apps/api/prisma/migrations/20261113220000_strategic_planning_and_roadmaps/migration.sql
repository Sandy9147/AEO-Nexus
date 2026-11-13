-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('DRAFT', 'GENERATING', 'READY_FOR_REVIEW', 'APPROVED', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "GoalCategory" AS ENUM ('REVENUE', 'CUSTOMER_ACQUISITION', 'CUSTOMER_RETENTION', 'WEBSITE_TRAFFIC', 'BRAND_AWARENESS', 'AEO_VISIBILITY', 'PRODUCT_LAUNCH', 'OPERATIONAL_EFFICIENCY');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'ON_TRACK', 'AT_RISK', 'BEHIND', 'ACHIEVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GoalPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "InitiativePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "InitiativeStatus" AS ENUM ('PROPOSED', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReviewPeriod" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable strategic_plans
CREATE TABLE "strategic_plans" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "plan_type" TEXT NOT NULL DEFAULT 'BUSINESS_LAUNCH',
    "business_stage" TEXT,
    "target_market" TEXT,
    "target_audience" TEXT,
    "horizon_months" INTEGER NOT NULL DEFAULT 12,
    "budget_range" TEXT,
    "team_size" TEXT,
    "status" "PlanStatus" NOT NULL DEFAULT 'DRAFT',
    "executive_summary" TEXT,
    "current_situation" TEXT,
    "market_positioning" TEXT,
    "strategic_objectives" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "required_resources" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "budget_assumptions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "risks_and_mitigations" JSONB,
    "dependencies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "timeline_assumptions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "success_metrics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "validation_requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "next_recommended_actions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "confidence_score" DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    "research_id" TEXT,
    "opportunity_id" TEXT,
    "current_version_number" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "strategic_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable strategic_plan_versions
CREATE TABLE "strategic_plan_versions" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "change_summary" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "strategic_plan_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable business_goals
CREATE TABLE "business_goals" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "plan_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "GoalCategory" NOT NULL DEFAULT 'REVENUE',
    "target_value" DOUBLE PRECISION NOT NULL,
    "current_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'USD',
    "start_date" TIMESTAMP(3),
    "target_date" TIMESTAMP(3),
    "status" "GoalStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "priority" "GoalPriority" NOT NULL DEFAULT 'MEDIUM',
    "measurement_frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "is_qualitative" BOOLEAN NOT NULL DEFAULT false,
    "assigned_owner_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable goal_progress_records
CREATE TABLE "goal_progress_records" (
    "id" TEXT NOT NULL,
    "goal_id" TEXT NOT NULL,
    "recorded_by_id" TEXT NOT NULL,
    "previous_value" DOUBLE PRECISION NOT NULL,
    "new_value" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "is_external_measurement" BOOLEAN NOT NULL DEFAULT false,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_progress_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable strategic_initiatives
CREATE TABLE "strategic_initiatives" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "plan_id" TEXT,
    "goal_id" TEXT,
    "opportunity_id" TEXT,
    "roadmap_phase_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "strategic_rationale" TEXT,
    "priority" "InitiativePriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "InitiativeStatus" NOT NULL DEFAULT 'PLANNED',
    "expected_impact" TEXT NOT NULL DEFAULT 'HIGH',
    "estimated_effort" TEXT NOT NULL DEFAULT 'MEDIUM',
    "estimated_cost" TEXT,
    "risks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recommended_actions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "evidence_references" JSONB,
    "evidence_type" "EvidenceType" NOT NULL DEFAULT 'AI_ANALYSIS',
    "owner_id" TEXT,
    "project_id" TEXT,
    "converted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "strategic_initiatives_pkey" PRIMARY KEY ("id")
);

-- CreateTable initiative_dependencies
CREATE TABLE "initiative_dependencies" (
    "id" TEXT NOT NULL,
    "initiative_id" TEXT NOT NULL,
    "depends_on_id" TEXT NOT NULL,
    "dependency_type" TEXT NOT NULL DEFAULT 'BLOCKS',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "initiative_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable strategic_roadmaps
CREATE TABLE "strategic_roadmaps" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "plan_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "strategic_roadmaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable roadmap_phases
CREATE TABLE "roadmap_phases" (
    "id" TEXT NOT NULL,
    "roadmap_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "phase_order" INTEGER NOT NULL DEFAULT 1,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roadmap_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable roadmap_milestones
CREATE TABLE "roadmap_milestones" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "roadmap_id" TEXT NOT NULL,
    "phase_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "target_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "success_criteria" TEXT,
    "is_overdue" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roadmap_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable strategy_reviews
CREATE TABLE "strategy_reviews" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "conducted_by_id" TEXT NOT NULL,
    "period" "ReviewPeriod" NOT NULL DEFAULT 'MONTHLY',
    "status" "ReviewStatus" NOT NULL DEFAULT 'COMPLETED',
    "summary" TEXT NOT NULL,
    "goals_reviewed" JSONB,
    "initiatives_reviewed" JSONB,
    "blockers_identified" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "changed_assumptions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ai_recommendations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "strategic_adjustments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "review_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "strategy_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable planning_recommendations
CREATE TABLE "planning_recommendations" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "plan_id" TEXT,
    "title" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'STRATEGY',
    "impact" TEXT NOT NULL DEFAULT 'HIGH',
    "urgency" TEXT NOT NULL DEFAULT 'IMMEDIATE',
    "evidence_type" "EvidenceType" NOT NULL DEFAULT 'AI_ANALYSIS',
    "is_actioned" BOOLEAN NOT NULL DEFAULT false,
    "actioned_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "planning_recommendations_pkey" PRIMARY KEY ("id")
);

-- Unique & Indexes
CREATE UNIQUE INDEX "strategic_plan_versions_plan_id_version_number_key" ON "strategic_plan_versions"("plan_id", "version_number");
CREATE UNIQUE INDEX "strategic_initiatives_project_id_key" ON "strategic_initiatives"("project_id");
CREATE UNIQUE INDEX "initiative_dependencies_initiative_id_depends_on_id_key" ON "initiative_dependencies"("initiative_id", "depends_on_id");

CREATE INDEX "strategic_plans_workspace_id_idx" ON "strategic_plans"("workspace_id");
CREATE INDEX "strategic_plans_created_by_id_idx" ON "strategic_plans"("created_by_id");
CREATE INDEX "strategic_plans_status_idx" ON "strategic_plans"("status");
CREATE INDEX "strategic_plans_research_id_idx" ON "strategic_plans"("research_id");
CREATE INDEX "strategic_plans_opportunity_id_idx" ON "strategic_plans"("opportunity_id");

CREATE INDEX "strategic_plan_versions_plan_id_idx" ON "strategic_plan_versions"("plan_id");
CREATE INDEX "strategic_plan_versions_created_by_id_idx" ON "strategic_plan_versions"("created_by_id");

CREATE INDEX "business_goals_workspace_id_idx" ON "business_goals"("workspace_id");
CREATE INDEX "business_goals_plan_id_idx" ON "business_goals"("plan_id");
CREATE INDEX "business_goals_category_idx" ON "business_goals"("category");
CREATE INDEX "business_goals_status_idx" ON "business_goals"("status");

CREATE INDEX "goal_progress_records_goal_id_idx" ON "goal_progress_records"("goal_id");
CREATE INDEX "goal_progress_records_recorded_by_id_idx" ON "goal_progress_records"("recorded_by_id");

CREATE INDEX "strategic_initiatives_workspace_id_idx" ON "strategic_initiatives"("workspace_id");
CREATE INDEX "strategic_initiatives_plan_id_idx" ON "strategic_initiatives"("plan_id");
CREATE INDEX "strategic_initiatives_goal_id_idx" ON "strategic_initiatives"("goal_id");
CREATE INDEX "strategic_initiatives_opportunity_id_idx" ON "strategic_initiatives"("opportunity_id");
CREATE INDEX "strategic_initiatives_status_idx" ON "strategic_initiatives"("status");

CREATE INDEX "initiative_dependencies_initiative_id_idx" ON "initiative_dependencies"("initiative_id");
CREATE INDEX "initiative_dependencies_depends_on_id_idx" ON "initiative_dependencies"("depends_on_id");

CREATE INDEX "strategic_roadmaps_workspace_id_idx" ON "strategic_roadmaps"("workspace_id");
CREATE INDEX "strategic_roadmaps_plan_id_idx" ON "strategic_roadmaps"("plan_id");

CREATE INDEX "roadmap_phases_roadmap_id_idx" ON "roadmap_phases"("roadmap_id");

CREATE INDEX "roadmap_milestones_workspace_id_idx" ON "roadmap_milestones"("workspace_id");
CREATE INDEX "roadmap_milestones_roadmap_id_idx" ON "roadmap_milestones"("roadmap_id");
CREATE INDEX "roadmap_milestones_phase_id_idx" ON "roadmap_milestones"("phase_id");
CREATE INDEX "roadmap_milestones_status_idx" ON "roadmap_milestones"("status");

CREATE INDEX "strategy_reviews_workspace_id_idx" ON "strategy_reviews"("workspace_id");
CREATE INDEX "strategy_reviews_plan_id_idx" ON "strategy_reviews"("plan_id");
CREATE INDEX "strategy_reviews_conducted_by_id_idx" ON "strategy_reviews"("conducted_by_id");

CREATE INDEX "planning_recommendations_workspace_id_idx" ON "planning_recommendations"("workspace_id");
CREATE INDEX "planning_recommendations_plan_id_idx" ON "planning_recommendations"("plan_id");
CREATE INDEX "planning_recommendations_is_actioned_idx" ON "planning_recommendations"("is_actioned");

-- AddForeignKey
ALTER TABLE "strategic_plans" ADD CONSTRAINT "strategic_plans_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "strategic_plans" ADD CONSTRAINT "strategic_plans_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "strategic_plans" ADD CONSTRAINT "strategic_plans_research_id_fkey" FOREIGN KEY ("research_id") REFERENCES "research_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "strategic_plans" ADD CONSTRAINT "strategic_plans_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "market_opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategic_plan_versions" ADD CONSTRAINT "strategic_plan_versions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "strategic_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "strategic_plan_versions" ADD CONSTRAINT "strategic_plan_versions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_goals" ADD CONSTRAINT "business_goals_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "business_goals" ADD CONSTRAINT "business_goals_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "strategic_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "business_goals" ADD CONSTRAINT "business_goals_assigned_owner_id_fkey" FOREIGN KEY ("assigned_owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_progress_records" ADD CONSTRAINT "goal_progress_records_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "business_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "goal_progress_records" ADD CONSTRAINT "goal_progress_records_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategic_initiatives" ADD CONSTRAINT "strategic_initiatives_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "strategic_initiatives" ADD CONSTRAINT "strategic_initiatives_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "strategic_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "strategic_initiatives" ADD CONSTRAINT "strategic_initiatives_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "business_goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "strategic_initiatives" ADD CONSTRAINT "strategic_initiatives_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "market_opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "strategic_initiatives" ADD CONSTRAINT "strategic_initiatives_roadmap_phase_id_fkey" FOREIGN KEY ("roadmap_phase_id") REFERENCES "roadmap_phases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "strategic_initiatives" ADD CONSTRAINT "strategic_initiatives_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "strategic_initiatives" ADD CONSTRAINT "strategic_initiatives_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "initiative_dependencies" ADD CONSTRAINT "initiative_dependencies_initiative_id_fkey" FOREIGN KEY ("initiative_id") REFERENCES "strategic_initiatives"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "initiative_dependencies" ADD CONSTRAINT "initiative_dependencies_depends_on_id_fkey" FOREIGN KEY ("depends_on_id") REFERENCES "strategic_initiatives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategic_roadmaps" ADD CONSTRAINT "strategic_roadmaps_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "strategic_roadmaps" ADD CONSTRAINT "strategic_roadmaps_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "strategic_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_phases" ADD CONSTRAINT "roadmap_phases_roadmap_id_fkey" FOREIGN KEY ("roadmap_id") REFERENCES "strategic_roadmaps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_milestones" ADD CONSTRAINT "roadmap_milestones_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "roadmap_milestones" ADD CONSTRAINT "roadmap_milestones_roadmap_id_fkey" FOREIGN KEY ("roadmap_id") REFERENCES "strategic_roadmaps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "roadmap_milestones" ADD CONSTRAINT "roadmap_milestones_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "roadmap_phases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_reviews" ADD CONSTRAINT "strategy_reviews_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "strategy_reviews" ADD CONSTRAINT "strategy_reviews_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "strategic_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "strategy_reviews" ADD CONSTRAINT "strategy_reviews_conducted_by_id_fkey" FOREIGN KEY ("conducted_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planning_recommendations" ADD CONSTRAINT "planning_recommendations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "planning_recommendations" ADD CONSTRAINT "planning_recommendations_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "strategic_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

