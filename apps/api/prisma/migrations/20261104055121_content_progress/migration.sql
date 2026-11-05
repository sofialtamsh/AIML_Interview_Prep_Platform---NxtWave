-- CreateEnum
CREATE TYPE "ModuleVersionStatus" AS ENUM ('DRAFT', 'AI_GENERATED', 'UNDER_REVIEW', 'APPROVED', 'PUBLISHED', 'SUPERSEDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContentOrigin" AS ENUM ('IMPORT', 'MANUAL', 'AI');

-- CreateEnum
CREATE TYPE "SectionKind" AS ENUM ('HOOK', 'EXPLANATION', 'CARD_DECK', 'DIAGRAM', 'CODE_EXAMPLE', 'CODE_EXPLORER', 'WIDGET', 'KNOWLEDGE_CHECK', 'PLAYGROUND', 'CALLOUT', 'INTERVIEW_PLAYBOOK', 'SUMMARY');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('APPROVED', 'CHANGES_REQUESTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LessonStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "FeedbackTarget" AS ENUM ('SECTION', 'LESSON', 'PAGE');

-- CreateEnum
CREATE TYPE "Thumbs" AS ENUM ('UP', 'DOWN');

-- CreateTable
CREATE TABLE "learning_module" (
    "id" UUID NOT NULL,
    "subtopic_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "learning_module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_version" (
    "id" UUID NOT NULL,
    "module_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "status" "ModuleVersionStatus" NOT NULL,
    "origin" "ContentOrigin" NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "objectives" JSONB NOT NULL,
    "based_on_version_id" UUID,
    "change_note" TEXT,
    "edit_seq" INTEGER NOT NULL DEFAULT 0,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "submitted_at" TIMESTAMPTZ(3),
    "submitted_by_id" UUID,
    "published_at" TIMESTAMPTZ(3),
    "published_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "module_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "section_revision" (
    "id" UUID NOT NULL,
    "module_id" UUID NOT NULL,
    "section_key" TEXT NOT NULL,
    "kind" "SectionKind" NOT NULL,
    "title" TEXT,
    "depth_rank" INTEGER NOT NULL,
    "slot_key" TEXT,
    "role_scope" TEXT[],
    "estimated_minutes" INTEGER,
    "body" JSONB NOT NULL,
    "content_hash" TEXT NOT NULL,
    "origin" "ContentOrigin" NOT NULL,
    "generation_meta" JSONB,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "section_revision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "section_concept" (
    "section_revision_id" UUID NOT NULL,
    "concept_id" UUID NOT NULL,

    CONSTRAINT "section_concept_pkey" PRIMARY KEY ("section_revision_id","concept_id")
);

-- CreateTable
CREATE TABLE "module_version_section" (
    "module_version_id" UUID NOT NULL,
    "section_key" TEXT NOT NULL,
    "section_revision_id" UUID NOT NULL,
    "order_index" INTEGER NOT NULL,

    CONSTRAINT "module_version_section_pkey" PRIMARY KEY ("module_version_id","section_key")
);

-- CreateTable
CREATE TABLE "content_review" (
    "id" UUID NOT NULL,
    "module_version_id" UUID NOT NULL,
    "decision" "ReviewDecision" NOT NULL,
    "notes" TEXT,
    "section_notes" JSONB NOT NULL DEFAULT '{}',
    "reviewer_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_progress" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "subtopic_id" UUID NOT NULL,
    "module_version_id" UUID NOT NULL,
    "status" "LessonStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "completed_section_keys" TEXT[],
    "last_section_key" TEXT,
    "time_spent_sec" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(3),
    "completed_version_id" UUID,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "module_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_check_attempt" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "section_revision_id" UUID NOT NULL,
    "item_key" TEXT NOT NULL,
    "is_correct" BOOLEAN,
    "response" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_check_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "target_type" "FeedbackTarget" NOT NULL,
    "module_version_id" UUID,
    "section_key" TEXT,
    "section_revision_id" UUID,
    "page" TEXT,
    "thumbs" "Thumbs",
    "rating" INTEGER,
    "tags" TEXT[],
    "text" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "learning_module_subtopic_id_key" ON "learning_module"("subtopic_id");

-- CreateIndex
CREATE INDEX "module_version_status_idx" ON "module_version"("status");

-- CreateIndex
CREATE UNIQUE INDEX "module_version_module_id_version_number_key" ON "module_version"("module_id", "version_number");

-- CreateIndex
CREATE INDEX "section_revision_module_id_section_key_created_at_idx" ON "section_revision"("module_id", "section_key", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "section_revision_module_id_section_key_content_hash_key" ON "section_revision"("module_id", "section_key", "content_hash");

-- CreateIndex
CREATE INDEX "section_concept_concept_id_idx" ON "section_concept"("concept_id");

-- CreateIndex
CREATE INDEX "module_version_section_section_revision_id_idx" ON "module_version_section"("section_revision_id");

-- CreateIndex
CREATE INDEX "content_review_module_version_id_created_at_idx" ON "content_review"("module_version_id", "created_at");

-- CreateIndex
CREATE INDEX "module_progress_subtopic_id_status_idx" ON "module_progress"("subtopic_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "module_progress_student_id_subtopic_id_key" ON "module_progress"("student_id", "subtopic_id");

-- CreateIndex
CREATE INDEX "knowledge_check_attempt_student_id_section_revision_id_crea_idx" ON "knowledge_check_attempt"("student_id", "section_revision_id", "created_at");

-- CreateIndex
CREATE INDEX "knowledge_check_attempt_section_revision_id_item_key_idx" ON "knowledge_check_attempt"("section_revision_id", "item_key");

-- CreateIndex
CREATE INDEX "feedback_target_type_created_at_idx" ON "feedback"("target_type", "created_at");

-- CreateIndex
CREATE INDEX "feedback_section_revision_id_idx" ON "feedback"("section_revision_id");

-- CreateIndex
CREATE INDEX "feedback_module_version_id_idx" ON "feedback"("module_version_id");

-- AddForeignKey
ALTER TABLE "learning_module" ADD CONSTRAINT "learning_module_subtopic_id_fkey" FOREIGN KEY ("subtopic_id") REFERENCES "subtopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_version" ADD CONSTRAINT "module_version_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "learning_module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_version" ADD CONSTRAINT "module_version_based_on_version_id_fkey" FOREIGN KEY ("based_on_version_id") REFERENCES "module_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "section_revision" ADD CONSTRAINT "section_revision_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "learning_module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "section_concept" ADD CONSTRAINT "section_concept_section_revision_id_fkey" FOREIGN KEY ("section_revision_id") REFERENCES "section_revision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "section_concept" ADD CONSTRAINT "section_concept_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "concept"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_version_section" ADD CONSTRAINT "module_version_section_module_version_id_fkey" FOREIGN KEY ("module_version_id") REFERENCES "module_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_version_section" ADD CONSTRAINT "module_version_section_section_revision_id_fkey" FOREIGN KEY ("section_revision_id") REFERENCES "section_revision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_review" ADD CONSTRAINT "content_review_module_version_id_fkey" FOREIGN KEY ("module_version_id") REFERENCES "module_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_progress" ADD CONSTRAINT "module_progress_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_progress" ADD CONSTRAINT "module_progress_subtopic_id_fkey" FOREIGN KEY ("subtopic_id") REFERENCES "subtopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_progress" ADD CONSTRAINT "module_progress_module_version_id_fkey" FOREIGN KEY ("module_version_id") REFERENCES "module_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_check_attempt" ADD CONSTRAINT "knowledge_check_attempt_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_check_attempt" ADD CONSTRAINT "knowledge_check_attempt_section_revision_id_fkey" FOREIGN KEY ("section_revision_id") REFERENCES "section_revision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_module_version_id_fkey" FOREIGN KEY ("module_version_id") REFERENCES "module_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_section_revision_id_fkey" FOREIGN KEY ("section_revision_id") REFERENCES "section_revision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One published and at most one working version (draft → review → approved) per lesson.
CREATE UNIQUE INDEX "module_version_one_published" ON "module_version" ("module_id") WHERE "status" = 'PUBLISHED';
CREATE UNIQUE INDEX "module_version_one_working" ON "module_version" ("module_id") WHERE "status" IN ('DRAFT', 'AI_GENERATED', 'UNDER_REVIEW', 'APPROVED');

-- A student's thumbs on a step and their rating of a lesson are each one row they can change.
CREATE UNIQUE INDEX "feedback_one_per_section" ON "feedback" ("student_id", "section_revision_id") WHERE "target_type" = 'SECTION';
CREATE UNIQUE INDEX "feedback_one_per_lesson" ON "feedback" ("student_id", "module_version_id") WHERE "target_type" = 'LESSON';

ALTER TABLE "module_version" ADD CONSTRAINT "module_version_number_positive" CHECK ("version_number" >= 1);
ALTER TABLE "section_revision" ADD CONSTRAINT "section_revision_depth_range" CHECK ("depth_rank" BETWEEN 1 AND 5);
ALTER TABLE "section_revision" ADD CONSTRAINT "section_revision_minutes_range" CHECK ("estimated_minutes" IS NULL OR "estimated_minutes" BETWEEN 1 AND 60);
ALTER TABLE "module_version_section" ADD CONSTRAINT "module_version_section_order_nonnegative" CHECK ("order_index" >= 0);
ALTER TABLE "module_progress" ADD CONSTRAINT "module_progress_time_nonnegative" CHECK ("time_spent_sec" >= 0);
ALTER TABLE "module_progress" ADD CONSTRAINT "module_progress_completed_consistent" CHECK (("status" = 'COMPLETED') = ("completed_at" IS NOT NULL));
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_rating_range" CHECK ("rating" IS NULL OR "rating" BETWEEN 1 AND 5);
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_target_fields" CHECK (
  ("target_type" = 'SECTION' AND "section_revision_id" IS NOT NULL AND "module_version_id" IS NOT NULL AND "section_key" IS NOT NULL)
  OR ("target_type" = 'LESSON' AND "module_version_id" IS NOT NULL)
  OR ("target_type" = 'PAGE' AND "page" IS NOT NULL)
);
