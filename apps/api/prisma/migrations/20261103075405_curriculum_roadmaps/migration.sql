-- CreateEnum
CREATE TYPE "TaxonomyStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "CurriculumStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "RoadmapVersionStatus" AS ENUM ('PROPOSED', 'ACTIVE', 'SUPERSEDED', 'DECLINED');

-- CreateEnum
CREATE TYPE "RoadmapTrigger" AS ENUM ('INITIAL', 'SETTINGS_CHANGE', 'CURRICULUM_UPDATE', 'REPLAN');

-- CreateTable
CREATE TABLE "topic" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "icon_key" TEXT NOT NULL DEFAULT 'book-open',
    "skill_area_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "TaxonomyStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_prerequisite" (
    "topic_id" UUID NOT NULL,
    "prerequisite_id" UUID NOT NULL,

    CONSTRAINT "topic_prerequisite_pkey" PRIMARY KEY ("topic_id","prerequisite_id")
);

-- CreateTable
CREATE TABLE "subtopic" (
    "id" UUID NOT NULL,
    "topic_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "complexity" INTEGER NOT NULL DEFAULT 3,
    "status" "TaxonomyStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "subtopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subtopic_prerequisite" (
    "subtopic_id" UUID NOT NULL,
    "prerequisite_id" UUID NOT NULL,

    CONSTRAINT "subtopic_prerequisite_pkey" PRIMARY KEY ("subtopic_id","prerequisite_id")
);

-- CreateTable
CREATE TABLE "concept" (
    "id" UUID NOT NULL,
    "subtopic_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "concept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_curriculum" (
    "id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "bracket_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "CurriculumStatus" NOT NULL DEFAULT 'DRAFT',
    "change_note" TEXT,
    "published_at" TIMESTAMPTZ(3),
    "published_by_id" UUID,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "role_curriculum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_curriculum_item" (
    "id" UUID NOT NULL,
    "role_curriculum_id" UUID NOT NULL,
    "subtopic_id" UUID NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "target_depth_rank" INTEGER NOT NULL,
    "is_optional" BOOLEAN NOT NULL DEFAULT false,
    "learning_objectives" JSONB NOT NULL,
    "implementation_expectation" TEXT,
    "estimate_minutes_override" INTEGER,
    "rationale" TEXT,
    "origin" TEXT NOT NULL DEFAULT 'ADMIN',

    CONSTRAINT "role_curriculum_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmap" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "goal_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roadmap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmap_version" (
    "id" UUID NOT NULL,
    "roadmap_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "status" "RoadmapVersionStatus" NOT NULL,
    "trigger" "RoadmapTrigger" NOT NULL,
    "role_curriculum_id" UUID NOT NULL,
    "inputs" JSONB NOT NULL,
    "change_summary" JSONB,
    "total_minutes" INTEGER NOT NULL,
    "planned_end_date" DATE,
    "deadline_feasible" BOOLEAN,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMPTZ(3),

    CONSTRAINT "roadmap_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmap_item" (
    "id" UUID NOT NULL,
    "roadmap_version_id" UUID NOT NULL,
    "subtopic_id" UUID NOT NULL,
    "topic_id" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "target_depth_rank" INTEGER NOT NULL,
    "priority" "Priority" NOT NULL,
    "is_optional" BOOLEAN NOT NULL,
    "fast_track" BOOLEAN NOT NULL,
    "estimated_minutes" INTEGER NOT NULL,
    "planned_start" DATE,
    "planned_end" DATE,

    CONSTRAINT "roadmap_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "topic_slug_key" ON "topic"("slug");

-- CreateIndex
CREATE INDEX "topic_status_sort_order_idx" ON "topic"("status", "sort_order");

-- CreateIndex
CREATE INDEX "topic_prerequisite_prerequisite_id_idx" ON "topic_prerequisite"("prerequisite_id");

-- CreateIndex
CREATE INDEX "subtopic_topic_id_sort_order_idx" ON "subtopic"("topic_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "subtopic_topic_id_slug_key" ON "subtopic"("topic_id", "slug");

-- CreateIndex
CREATE INDEX "subtopic_prerequisite_prerequisite_id_idx" ON "subtopic_prerequisite"("prerequisite_id");

-- CreateIndex
CREATE UNIQUE INDEX "concept_key_key" ON "concept"("key");

-- CreateIndex
CREATE INDEX "concept_subtopic_id_sort_order_idx" ON "concept"("subtopic_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "role_curriculum_role_id_bracket_id_version_key" ON "role_curriculum"("role_id", "bracket_id", "version");

-- CreateIndex
CREATE INDEX "role_curriculum_item_subtopic_id_idx" ON "role_curriculum_item"("subtopic_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_curriculum_item_role_curriculum_id_subtopic_id_key" ON "role_curriculum_item"("role_curriculum_id", "subtopic_id");

-- CreateIndex
CREATE UNIQUE INDEX "roadmap_goal_id_key" ON "roadmap"("goal_id");

-- CreateIndex
CREATE INDEX "roadmap_student_id_idx" ON "roadmap"("student_id");

-- CreateIndex
CREATE INDEX "roadmap_version_roadmap_id_status_idx" ON "roadmap_version"("roadmap_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "roadmap_version_roadmap_id_version_number_key" ON "roadmap_version"("roadmap_id", "version_number");

-- CreateIndex
CREATE INDEX "roadmap_item_roadmap_version_id_sequence_idx" ON "roadmap_item"("roadmap_version_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "roadmap_item_roadmap_version_id_subtopic_id_key" ON "roadmap_item"("roadmap_version_id", "subtopic_id");

-- AddForeignKey
ALTER TABLE "topic" ADD CONSTRAINT "topic_skill_area_id_fkey" FOREIGN KEY ("skill_area_id") REFERENCES "skill_area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_prerequisite" ADD CONSTRAINT "topic_prerequisite_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_prerequisite" ADD CONSTRAINT "topic_prerequisite_prerequisite_id_fkey" FOREIGN KEY ("prerequisite_id") REFERENCES "topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subtopic" ADD CONSTRAINT "subtopic_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subtopic_prerequisite" ADD CONSTRAINT "subtopic_prerequisite_subtopic_id_fkey" FOREIGN KEY ("subtopic_id") REFERENCES "subtopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subtopic_prerequisite" ADD CONSTRAINT "subtopic_prerequisite_prerequisite_id_fkey" FOREIGN KEY ("prerequisite_id") REFERENCES "subtopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concept" ADD CONSTRAINT "concept_subtopic_id_fkey" FOREIGN KEY ("subtopic_id") REFERENCES "subtopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_curriculum" ADD CONSTRAINT "role_curriculum_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "career_role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_curriculum" ADD CONSTRAINT "role_curriculum_bracket_id_fkey" FOREIGN KEY ("bracket_id") REFERENCES "package_bracket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_curriculum_item" ADD CONSTRAINT "role_curriculum_item_role_curriculum_id_fkey" FOREIGN KEY ("role_curriculum_id") REFERENCES "role_curriculum"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_curriculum_item" ADD CONSTRAINT "role_curriculum_item_subtopic_id_fkey" FOREIGN KEY ("subtopic_id") REFERENCES "subtopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_curriculum_item" ADD CONSTRAINT "role_curriculum_item_target_depth_rank_fkey" FOREIGN KEY ("target_depth_rank") REFERENCES "depth_level"("rank") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap" ADD CONSTRAINT "roadmap_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap" ADD CONSTRAINT "roadmap_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "student_goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_version" ADD CONSTRAINT "roadmap_version_roadmap_id_fkey" FOREIGN KEY ("roadmap_id") REFERENCES "roadmap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_version" ADD CONSTRAINT "roadmap_version_role_curriculum_id_fkey" FOREIGN KEY ("role_curriculum_id") REFERENCES "role_curriculum"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_item" ADD CONSTRAINT "roadmap_item_roadmap_version_id_fkey" FOREIGN KEY ("roadmap_version_id") REFERENCES "roadmap_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_item" ADD CONSTRAINT "roadmap_item_subtopic_id_fkey" FOREIGN KEY ("subtopic_id") REFERENCES "subtopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_item" ADD CONSTRAINT "roadmap_item_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- One published and at most one draft curriculum per role × package.
CREATE UNIQUE INDEX "role_curriculum_one_published" ON "role_curriculum" ("role_id", "bracket_id") WHERE "status" = 'PUBLISHED';
CREATE UNIQUE INDEX "role_curriculum_one_draft" ON "role_curriculum" ("role_id", "bracket_id") WHERE "status" = 'DRAFT';

-- One active and at most one pending proposal per roadmap.
CREATE UNIQUE INDEX "roadmap_version_one_active" ON "roadmap_version" ("roadmap_id") WHERE "status" = 'ACTIVE';
CREATE UNIQUE INDEX "roadmap_version_one_proposed" ON "roadmap_version" ("roadmap_id") WHERE "status" = 'PROPOSED';

ALTER TABLE "subtopic" ADD CONSTRAINT "subtopic_complexity_range" CHECK ("complexity" BETWEEN 1 AND 5);
ALTER TABLE "topic_prerequisite" ADD CONSTRAINT "topic_prerequisite_not_self" CHECK ("topic_id" <> "prerequisite_id");
ALTER TABLE "subtopic_prerequisite" ADD CONSTRAINT "subtopic_prerequisite_not_self" CHECK ("subtopic_id" <> "prerequisite_id");
