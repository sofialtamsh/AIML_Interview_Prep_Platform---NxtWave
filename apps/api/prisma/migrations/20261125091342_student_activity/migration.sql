-- CreateEnum
CREATE TYPE "ActivityKind" AS ENUM ('VISIT', 'LESSON_STEP', 'LESSON_COMPLETED', 'QUIZ_ANSWER', 'PRACTICE_SOLVE', 'PRACTICE_CONCEPT');

-- CreateTable
CREATE TABLE "student_activity" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "kind" "ActivityKind" NOT NULL,
    "day" DATE NOT NULL,
    "target" TEXT,
    "value" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_activity_day_student_id_idx" ON "student_activity"("day", "student_id");

-- CreateIndex
CREATE INDEX "student_activity_student_id_created_at_idx" ON "student_activity"("student_id", "created_at");

-- AddForeignKey
ALTER TABLE "student_activity" ADD CONSTRAINT "student_activity_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
