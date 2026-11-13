-- Migration: 20261113200000_discover_research_and_opportunity_intelligence
-- Description: Phase 6A Discover models for business research, competitors, audience personas, market opportunities, and AEO intelligence.

-- CreateEnums
CREATE TYPE "ResearchStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "EvidenceType" AS ENUM ('VERIFIED_SOURCE', 'AI_ANALYSIS', 'USER_INPUT', 'UNVERIFIED_ASSUMPTION');
CREATE TYPE "ConfidenceLevel" AS ENUM ('HIGH', 'MEDIUM', 'LOW', 'SPECULATIVE');
CREATE TYPE "SourceType" AS ENUM ('WEB_SEARCH', 'KNOWLEDGE_VAULT', 'INDUSTRY_REPORT', 'USER_DOCUMENT', 'OFFLINE_KNOWLEDGE');

-- CreateTable: research_projects
CREATE TABLE "research_projects" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "industry" TEXT,
    "target_country" TEXT,
    "target_audience" TEXT,
    "business_description" TEXT,
    "objective" TEXT NOT NULL DEFAULT 'COMPREHENSIVE',
    "status" "ResearchStatus" NOT NULL DEFAULT 'PENDING',
    "executive_summary" TEXT,
    "methodology" TEXT,
    "confidence_score" DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    "tokens_used" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable: research_runs
CREATE TABLE "research_runs" (
    "id" TEXT NOT NULL,
    "research_id" TEXT NOT NULL,
    "status" "ResearchStatus" NOT NULL DEFAULT 'PENDING',
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
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: research_findings
CREATE TABLE "research_findings" (
    "id" TEXT NOT NULL,
    "research_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidence_type" "EvidenceType" NOT NULL DEFAULT 'AI_ANALYSIS',
    "confidence_level" "ConfidenceLevel" NOT NULL DEFAULT 'MEDIUM',
    "evidence_details" TEXT,
    "risks" TEXT,
    "recommendations" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable: research_sources
CREATE TABLE "research_sources" (
    "id" TEXT NOT NULL,
    "research_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "source_type" "SourceType" NOT NULL DEFAULT 'KNOWLEDGE_VAULT',
    "publication_date" TEXT,
    "access_timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snippet" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable: competitors
CREATE TABLE "competitors" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "research_id" TEXT,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "industry" TEXT,
    "description" TEXT,
    "products_services" TEXT,
    "positioning" TEXT,
    "pricing_observations" TEXT,
    "content_observations" TEXT,
    "strengths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "weaknesses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "differentiation_opportunities" TEXT,
    "evidence_type" "EvidenceType" NOT NULL DEFAULT 'AI_ANALYSIS',
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable: audience_profiles
CREATE TABLE "audience_profiles" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "research_id" TEXT,
    "segment_name" TEXT NOT NULL,
    "is_ai_generated" BOOLEAN NOT NULL DEFAULT true,
    "ideal_customer_profile" TEXT,
    "demographics" TEXT,
    "pain_points" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "needs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "buying_motivations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "objections" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "customer_journey" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audience_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable: market_opportunities
CREATE TABLE "market_opportunities" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "research_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "customer_problem" TEXT NOT NULL,
    "market_demand_evidence" TEXT NOT NULL,
    "competition_analysis" TEXT,
    "differentiation" TEXT NOT NULL,
    "business_feasibility" TEXT,
    "potential_business_model" TEXT,
    "assumptions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "risks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "confidence_level" "ConfidenceLevel" NOT NULL DEFAULT 'MEDIUM',
    "suggested_experiment" TEXT NOT NULL,
    "evidence_type" "EvidenceType" NOT NULL DEFAULT 'AI_ANALYSIS',
    "status" TEXT NOT NULL DEFAULT 'DISCOVERED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable: aeo_research_questions
CREATE TABLE "aeo_research_questions" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "research_id" TEXT,
    "topic" TEXT NOT NULL,
    "query_question" TEXT NOT NULL,
    "target_industry" TEXT,
    "expected_persona" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aeo_research_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: aeo_research_results
CREATE TABLE "aeo_research_results" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "brand_mentioned" BOOLEAN NOT NULL DEFAULT false,
    "brand_rank" INTEGER,
    "brand_sentiment" TEXT,
    "competitors_mentioned" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "citations" JSONB,
    "raw_answer_excerpt" TEXT,
    "is_actual_measurement" BOOLEAN NOT NULL DEFAULT false,
    "research_timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aeo_research_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE INDEX "research_projects_workspace_id_idx" ON "research_projects"("workspace_id");
CREATE INDEX "research_projects_created_by_id_idx" ON "research_projects"("created_by_id");
CREATE INDEX "research_projects_status_idx" ON "research_projects"("status");

CREATE INDEX "research_runs_research_id_idx" ON "research_runs"("research_id");
CREATE INDEX "research_runs_status_idx" ON "research_runs"("status");

CREATE INDEX "research_findings_research_id_idx" ON "research_findings"("research_id");
CREATE INDEX "research_findings_category_idx" ON "research_findings"("category");

CREATE INDEX "research_sources_research_id_idx" ON "research_sources"("research_id");

CREATE INDEX "competitors_workspace_id_idx" ON "competitors"("workspace_id");
CREATE INDEX "competitors_research_id_idx" ON "competitors"("research_id");

CREATE INDEX "audience_profiles_workspace_id_idx" ON "audience_profiles"("workspace_id");
CREATE INDEX "audience_profiles_research_id_idx" ON "audience_profiles"("research_id");

CREATE INDEX "market_opportunities_workspace_id_idx" ON "market_opportunities"("workspace_id");
CREATE INDEX "market_opportunities_research_id_idx" ON "market_opportunities"("research_id");
CREATE INDEX "market_opportunities_status_idx" ON "market_opportunities"("status");

CREATE INDEX "aeo_research_questions_workspace_id_idx" ON "aeo_research_questions"("workspace_id");
CREATE INDEX "aeo_research_questions_research_id_idx" ON "aeo_research_questions"("research_id");

CREATE INDEX "aeo_research_results_question_id_idx" ON "aeo_research_results"("question_id");

-- AddForeignKey
ALTER TABLE "research_projects" ADD CONSTRAINT "research_projects_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "research_projects" ADD CONSTRAINT "research_projects_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "research_runs" ADD CONSTRAINT "research_runs_research_id_fkey" FOREIGN KEY ("research_id") REFERENCES "research_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "research_findings" ADD CONSTRAINT "research_findings_research_id_fkey" FOREIGN KEY ("research_id") REFERENCES "research_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "research_sources" ADD CONSTRAINT "research_sources_research_id_fkey" FOREIGN KEY ("research_id") REFERENCES "research_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "competitors" ADD CONSTRAINT "competitors_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "competitors" ADD CONSTRAINT "competitors_research_id_fkey" FOREIGN KEY ("research_id") REFERENCES "research_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "audience_profiles" ADD CONSTRAINT "audience_profiles_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audience_profiles" ADD CONSTRAINT "audience_profiles_research_id_fkey" FOREIGN KEY ("research_id") REFERENCES "research_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "market_opportunities" ADD CONSTRAINT "market_opportunities_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "market_opportunities" ADD CONSTRAINT "market_opportunities_research_id_fkey" FOREIGN KEY ("research_id") REFERENCES "research_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "aeo_research_questions" ADD CONSTRAINT "aeo_research_questions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "aeo_research_questions" ADD CONSTRAINT "aeo_research_questions_research_id_fkey" FOREIGN KEY ("research_id") REFERENCES "research_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "aeo_research_results" ADD CONSTRAINT "aeo_research_results_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "aeo_research_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
