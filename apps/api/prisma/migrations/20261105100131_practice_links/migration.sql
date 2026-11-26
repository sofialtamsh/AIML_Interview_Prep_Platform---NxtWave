-- CreateTable
CREATE TABLE "practice_question" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "skill" TEXT,
    "difficulty" "QuestionDifficulty" NOT NULL,
    "solve_url" TEXT NOT NULL,
    "estimated_minutes" INTEGER,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "practice_question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_question_role" (
    "question_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,

    CONSTRAINT "practice_question_role_pkey" PRIMARY KEY ("question_id","role_id")
);

-- CreateTable
CREATE TABLE "practice_open" (
    "student_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "open_count" INTEGER NOT NULL DEFAULT 1,
    "first_opened_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_opened_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_open_pkey" PRIMARY KEY ("student_id","question_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "practice_question_solve_url_key" ON "practice_question"("solve_url");

-- CreateIndex
CREATE INDEX "practice_question_published_sort_order_idx" ON "practice_question"("published", "sort_order");

-- CreateIndex
CREATE INDEX "practice_question_category_sort_order_idx" ON "practice_question"("category", "sort_order");

-- CreateIndex
CREATE INDEX "practice_question_role_role_id_idx" ON "practice_question_role"("role_id");

-- CreateIndex
CREATE INDEX "practice_open_question_id_idx" ON "practice_open"("question_id");

-- CreateIndex
CREATE INDEX "practice_open_last_opened_at_idx" ON "practice_open"("last_opened_at");

-- AddForeignKey
ALTER TABLE "practice_question_role" ADD CONSTRAINT "practice_question_role_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "practice_question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_question_role" ADD CONSTRAINT "practice_question_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "career_role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_open" ADD CONSTRAINT "practice_open_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_open" ADD CONSTRAINT "practice_open_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "practice_question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
