-- CreateEnum
CREATE TYPE "AgentJobType" AS ENUM ('LESSON_GENERATION', 'LESSON_EVALUATION', 'SECTION_REWRITE');

-- CreateEnum
CREATE TYPE "AgentJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AiCallStatus" AS ENUM ('OK', 'ERROR', 'REFUSED');

-- CreateEnum
CREATE TYPE "EvaluationVerdict" AS ENUM ('READY_FOR_REVIEW', 'NEEDS_CHANGES', 'BLOCKING_ISSUES');

-- CreateTable
CREATE TABLE "agent_job" (
    "id" UUID NOT NULL,
    "type" "AgentJobType" NOT NULL,
    "status" "AgentJobStatus" NOT NULL DEFAULT 'QUEUED',
    "stage" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "subtopic_id" UUID,
    "module_version_id" UUID,
    "section_key" TEXT,
    "input" JSONB NOT NULL,
    "output" JSONB,
    "error" TEXT,
    "parent_job_id" UUID,
    "cancel_requested" BOOLEAN NOT NULL DEFAULT false,
    "budget_usd" DOUBLE PRECISION NOT NULL,
    "cost_usd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMPTZ(3),
    "finished_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "agent_job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_job_log" (
    "id" BIGSERIAL NOT NULL,
    "job_id" UUID NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_job_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_record" (
    "id" UUID NOT NULL,
    "job_id" UUID,
    "task" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "prompt_key" TEXT NOT NULL,
    "prompt_version" INTEGER NOT NULL,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "cache_read_tokens" INTEGER NOT NULL DEFAULT 0,
    "cache_write_tokens" INTEGER NOT NULL DEFAULT 0,
    "cost_usd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "latency_ms" INTEGER NOT NULL,
    "status" "AiCallStatus" NOT NULL,
    "error" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_model_route" (
    "task" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "effort" TEXT NOT NULL,
    "max_tokens" INTEGER NOT NULL,
    "updated_by_id" UUID,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ai_model_route_pkey" PRIMARY KEY ("task")
);

-- CreateTable
CREATE TABLE "ai_model_pricing" (
    "model" TEXT NOT NULL,
    "input_per_mtok" DOUBLE PRECISION NOT NULL,
    "output_per_mtok" DOUBLE PRECISION NOT NULL,
    "cache_read_per_mtok" DOUBLE PRECISION NOT NULL,
    "cache_write_per_mtok" DOUBLE PRECISION NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ai_model_pricing_pkey" PRIMARY KEY ("model")
);

-- CreateTable
CREATE TABLE "content_evaluation" (
    "id" UUID NOT NULL,
    "module_version_id" UUID NOT NULL,
    "job_id" UUID,
    "model" TEXT NOT NULL,
    "verdict" "EvaluationVerdict" NOT NULL,
    "overall" DOUBLE PRECISION NOT NULL,
    "scores" JSONB NOT NULL,
    "issues" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "metrics" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_job_subtopic_id_created_at_idx" ON "agent_job"("subtopic_id", "created_at");

-- CreateIndex
CREATE INDEX "agent_job_module_version_id_created_at_idx" ON "agent_job"("module_version_id", "created_at");

-- CreateIndex
CREATE INDEX "agent_job_status_created_at_idx" ON "agent_job"("status", "created_at");

-- CreateIndex
CREATE INDEX "agent_job_log_job_id_id_idx" ON "agent_job_log"("job_id", "id");

-- CreateIndex
CREATE INDEX "ai_usage_record_created_at_idx" ON "ai_usage_record"("created_at");

-- CreateIndex
CREATE INDEX "ai_usage_record_job_id_idx" ON "ai_usage_record"("job_id");

-- CreateIndex
CREATE INDEX "content_evaluation_module_version_id_created_at_idx" ON "content_evaluation"("module_version_id", "created_at");

-- AddForeignKey
ALTER TABLE "agent_job" ADD CONSTRAINT "agent_job_parent_job_id_fkey" FOREIGN KEY ("parent_job_id") REFERENCES "agent_job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_job_log" ADD CONSTRAINT "agent_job_log_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "agent_job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_record" ADD CONSTRAINT "ai_usage_record_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "agent_job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_evaluation" ADD CONSTRAINT "content_evaluation_module_version_id_fkey" FOREIGN KEY ("module_version_id") REFERENCES "module_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One running generation per lesson, and one rewrite per step at a time.
CREATE UNIQUE INDEX "agent_job_one_active_generation" ON "agent_job" ("subtopic_id") WHERE "type" = 'LESSON_GENERATION' AND "status" IN ('QUEUED', 'RUNNING');
CREATE UNIQUE INDEX "agent_job_one_active_rewrite" ON "agent_job" ("module_version_id", "section_key") WHERE "type" = 'SECTION_REWRITE' AND "status" IN ('QUEUED', 'RUNNING');

ALTER TABLE "agent_job" ADD CONSTRAINT "agent_job_progress_range" CHECK ("progress" BETWEEN 0 AND 100);
ALTER TABLE "agent_job" ADD CONSTRAINT "agent_job_budget_positive" CHECK ("budget_usd" > 0);
ALTER TABLE "agent_job_log" ADD CONSTRAINT "agent_job_log_level" CHECK ("level" IN ('info', 'warn', 'error'));
ALTER TABLE "ai_model_route" ADD CONSTRAINT "ai_model_route_effort" CHECK ("effort" IN ('low', 'medium', 'high', 'xhigh', 'max'));
ALTER TABLE "content_evaluation" ADD CONSTRAINT "content_evaluation_overall_range" CHECK ("overall" BETWEEN 0 AND 5);
