-- CreateEnum
CREATE TYPE "Availability" AS ENUM ('LIVE', 'NEXT_UP', 'PLANNED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "QuestionDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD', 'EXPERT');

-- CreateEnum
CREATE TYPE "InterestKind" AS ENUM ('ROLE', 'BRACKET', 'TOPIC', 'CASE_STUDY');

-- AlterTable
ALTER TABLE "enrollment_allowlist" ADD COLUMN     "cohort_id" UUID;

-- AlterTable
ALTER TABLE "student_profile" ADD COLUMN     "onboarding_draft" JSONB;

-- CreateTable
CREATE TABLE "career_role" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "short_code" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "competencies" JSONB NOT NULL,
    "interview_focus" JSONB NOT NULL,
    "color_key" TEXT NOT NULL DEFAULT 'g0',
    "availability" "Availability" NOT NULL DEFAULT 'PLANNED',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_by_id" UUID,

    CONSTRAINT "career_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_bracket" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "min_lpa" INTEGER NOT NULL,
    "max_lpa" INTEGER,
    "headline" TEXT NOT NULL,
    "expectations" TEXT NOT NULL,
    "availability" "Availability" NOT NULL DEFAULT 'PLANNED',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_by_id" UUID,

    CONSTRAINT "package_bracket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "depth_level" (
    "rank" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "generation_guidance" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_by_id" UUID,

    CONSTRAINT "depth_level_pkey" PRIMARY KEY ("rank")
);

-- CreateTable
CREATE TABLE "skill_area" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "skill_area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_skill_area" (
    "role_id" UUID NOT NULL,
    "skill_area_id" UUID NOT NULL,
    "importance" INTEGER NOT NULL DEFAULT 2,

    CONSTRAINT "role_skill_area_pkey" PRIMARY KEY ("role_id","skill_area_id")
);

-- CreateTable
CREATE TABLE "company" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bracket_difficulty_policy" (
    "bracket_id" UUID NOT NULL,
    "difficulty" "QuestionDifficulty" NOT NULL,
    "weight" INTEGER NOT NULL,

    CONSTRAINT "bracket_difficulty_policy_pkey" PRIMARY KEY ("bracket_id","difficulty")
);

-- CreateTable
CREATE TABLE "cohort" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "starts_on" DATE,
    "ends_on" DATE,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "cohort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cohort_member" (
    "cohort_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "added_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cohort_member_pkey" PRIMARY KEY ("cohort_id","student_id")
);

-- CreateTable
CREATE TABLE "student_goal" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "bracket_id" UUID NOT NULL,
    "daily_minutes" INTEGER NOT NULL,
    "study_weekdays" INTEGER[],
    "start_date" DATE NOT NULL,
    "deadline" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "ended_at" TIMESTAMPTZ(3),

    CONSTRAINT "student_goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_skill_rating" (
    "student_id" UUID NOT NULL,
    "skill_area_id" UUID NOT NULL,
    "level" INTEGER NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "student_skill_rating_pkey" PRIMARY KEY ("student_id","skill_area_id")
);

-- CreateTable
CREATE TABLE "interest_signal" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "kind" "InterestKind" NOT NULL,
    "target_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notified_at" TIMESTAMPTZ(3),

    CONSTRAINT "interest_signal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "career_role_slug_key" ON "career_role"("slug");

-- CreateIndex
CREATE INDEX "career_role_availability_sort_order_idx" ON "career_role"("availability", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "package_bracket_code_key" ON "package_bracket"("code");

-- CreateIndex
CREATE INDEX "package_bracket_availability_sort_order_idx" ON "package_bracket"("availability", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "depth_level_code_key" ON "depth_level"("code");

-- CreateIndex
CREATE UNIQUE INDEX "skill_area_slug_key" ON "skill_area"("slug");

-- CreateIndex
CREATE INDEX "role_skill_area_skill_area_id_idx" ON "role_skill_area"("skill_area_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_slug_key" ON "company"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "cohort_name_key" ON "cohort"("name");

-- CreateIndex
CREATE INDEX "cohort_member_student_id_idx" ON "cohort_member"("student_id");

-- CreateIndex
CREATE INDEX "student_goal_student_id_is_active_idx" ON "student_goal"("student_id", "is_active");

-- CreateIndex
CREATE INDEX "student_goal_role_id_bracket_id_idx" ON "student_goal"("role_id", "bracket_id");

-- CreateIndex
CREATE INDEX "student_skill_rating_skill_area_id_idx" ON "student_skill_rating"("skill_area_id");

-- CreateIndex
CREATE INDEX "interest_signal_kind_target_id_idx" ON "interest_signal"("kind", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "interest_signal_student_id_kind_target_id_key" ON "interest_signal"("student_id", "kind", "target_id");

-- AddForeignKey
ALTER TABLE "enrollment_allowlist" ADD CONSTRAINT "enrollment_allowlist_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "cohort"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_skill_area" ADD CONSTRAINT "role_skill_area_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "career_role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_skill_area" ADD CONSTRAINT "role_skill_area_skill_area_id_fkey" FOREIGN KEY ("skill_area_id") REFERENCES "skill_area"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bracket_difficulty_policy" ADD CONSTRAINT "bracket_difficulty_policy_bracket_id_fkey" FOREIGN KEY ("bracket_id") REFERENCES "package_bracket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cohort_member" ADD CONSTRAINT "cohort_member_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "cohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cohort_member" ADD CONSTRAINT "cohort_member_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_goal" ADD CONSTRAINT "student_goal_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_goal" ADD CONSTRAINT "student_goal_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "career_role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_goal" ADD CONSTRAINT "student_goal_bracket_id_fkey" FOREIGN KEY ("bracket_id") REFERENCES "package_bracket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_skill_rating" ADD CONSTRAINT "student_skill_rating_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_skill_rating" ADD CONSTRAINT "student_skill_rating_skill_area_id_fkey" FOREIGN KEY ("skill_area_id") REFERENCES "skill_area"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interest_signal" ADD CONSTRAINT "interest_signal_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One active goal per student (Prisma cannot express partial unique indexes).
CREATE UNIQUE INDEX "student_goal_one_active_per_student" ON "student_goal" ("student_id") WHERE "is_active";

-- Sanity constraints the application also validates.
ALTER TABLE "student_goal" ADD CONSTRAINT "student_goal_daily_minutes_range" CHECK ("daily_minutes" BETWEEN 15 AND 600);
ALTER TABLE "student_skill_rating" ADD CONSTRAINT "student_skill_rating_level_range" CHECK ("level" BETWEEN 0 AND 3);
ALTER TABLE "role_skill_area" ADD CONSTRAINT "role_skill_area_importance_range" CHECK ("importance" BETWEEN 1 AND 3);
ALTER TABLE "bracket_difficulty_policy" ADD CONSTRAINT "bracket_difficulty_policy_weight_range" CHECK ("weight" BETWEEN 0 AND 100);
ALTER TABLE "package_bracket" ADD CONSTRAINT "package_bracket_lpa_order" CHECK ("max_lpa" IS NULL OR "max_lpa" > "min_lpa");
ALTER TABLE "enrollment_allowlist" ADD CONSTRAINT "enrollment_allowlist_email_or_domain" CHECK (("email" IS NULL) <> ("domain" IS NULL));
