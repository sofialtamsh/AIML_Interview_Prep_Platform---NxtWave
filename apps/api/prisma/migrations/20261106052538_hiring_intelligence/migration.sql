-- CreateEnum
CREATE TYPE "HiringFamily" AS ENUM ('ML_TITLE', 'AI_TITLE');

-- CreateEnum
CREATE TYPE "HiringCtcBand" AS ENUM ('UNDER_8_LPA', 'FROM_8_LPA');

-- CreateTable
CREATE TABLE "hiring_snapshot" (
    "id" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "data_from" DATE NOT NULL,
    "data_to" DATE NOT NULL,
    "company_count" INTEGER NOT NULL,
    "opportunity_count" INTEGER NOT NULL,
    "opening_count" INTEGER NOT NULL,
    "question_count" INTEGER NOT NULL,
    "imported_by_id" UUID,
    "imported_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hiring_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hiring_opportunity" (
    "id" UUID NOT NULL,
    "snapshot_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "external_key" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "roles" TEXT[],
    "domains" TEXT[],
    "skills" TEXT[],
    "ctc_min_lpa" DOUBLE PRECISION,
    "ctc_max_lpa" DOUBLE PRECISION,
    "ctc_band" "HiringCtcBand",
    "openings" INTEGER,
    "first_interview" DATE NOT NULL,
    "last_interview" DATE NOT NULL,
    "question_count" INTEGER NOT NULL,
    "family" "HiringFamily",

    CONSTRAINT "hiring_opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hiring_question" (
    "id" UUID NOT NULL,
    "snapshot_id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "company" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "skills" TEXT[],
    "topic" TEXT NOT NULL,
    "subtopic" TEXT,
    "question_type" TEXT NOT NULL,
    "coding_type" TEXT NOT NULL,
    "round" TEXT NOT NULL,
    "difficulty" TEXT,
    "asked_on" DATE NOT NULL,
    "text" TEXT NOT NULL,
    "family" "HiringFamily",
    "ctc_band" "HiringCtcBand",
    "theme" TEXT,
    "prep_topic_slug" TEXT,

    CONSTRAINT "hiring_question_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hiring_snapshot_checksum_key" ON "hiring_snapshot"("checksum");

-- CreateIndex
CREATE INDEX "hiring_opportunity_snapshot_id_company_idx" ON "hiring_opportunity"("snapshot_id", "company");

-- CreateIndex
CREATE INDEX "hiring_opportunity_snapshot_id_family_idx" ON "hiring_opportunity"("snapshot_id", "family");

-- CreateIndex
CREATE UNIQUE INDEX "hiring_opportunity_snapshot_id_position_key" ON "hiring_opportunity"("snapshot_id", "position");

-- CreateIndex
CREATE INDEX "hiring_question_snapshot_id_family_prep_topic_slug_idx" ON "hiring_question"("snapshot_id", "family", "prep_topic_slug");

-- CreateIndex
CREATE INDEX "hiring_question_snapshot_id_company_idx" ON "hiring_question"("snapshot_id", "company");

-- CreateIndex
CREATE INDEX "hiring_question_snapshot_id_asked_on_idx" ON "hiring_question"("snapshot_id", "asked_on");

-- CreateIndex
CREATE INDEX "hiring_question_opportunity_id_idx" ON "hiring_question"("opportunity_id");

-- AddForeignKey
ALTER TABLE "hiring_opportunity" ADD CONSTRAINT "hiring_opportunity_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "hiring_snapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hiring_question" ADD CONSTRAINT "hiring_question_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "hiring_snapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hiring_question" ADD CONSTRAINT "hiring_question_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "hiring_opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
