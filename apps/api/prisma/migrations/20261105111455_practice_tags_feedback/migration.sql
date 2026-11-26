-- AlterEnum
ALTER TYPE "FeedbackTarget" ADD VALUE 'PRACTICE_QUESTION';

-- AlterTable
ALTER TABLE "feedback" ADD COLUMN     "practice_question_id" UUID;

-- AlterTable
ALTER TABLE "practice_question" ADD COLUMN     "asked_at" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "description" TEXT;

-- CreateTable
CREATE TABLE "practice_question_topic" (
    "question_id" UUID NOT NULL,
    "topic_id" UUID NOT NULL,

    CONSTRAINT "practice_question_topic_pkey" PRIMARY KEY ("question_id","topic_id")
);

-- CreateTable
CREATE TABLE "practice_question_subtopic" (
    "question_id" UUID NOT NULL,
    "subtopic_id" UUID NOT NULL,

    CONSTRAINT "practice_question_subtopic_pkey" PRIMARY KEY ("question_id","subtopic_id")
);

-- CreateIndex
CREATE INDEX "practice_question_topic_topic_id_idx" ON "practice_question_topic"("topic_id");

-- CreateIndex
CREATE INDEX "practice_question_subtopic_subtopic_id_idx" ON "practice_question_subtopic"("subtopic_id");

-- CreateIndex
CREATE INDEX "feedback_practice_question_id_idx" ON "feedback"("practice_question_id");

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_practice_question_id_fkey" FOREIGN KEY ("practice_question_id") REFERENCES "practice_question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_question_topic" ADD CONSTRAINT "practice_question_topic_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "practice_question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_question_topic" ADD CONSTRAINT "practice_question_topic_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_question_subtopic" ADD CONSTRAINT "practice_question_subtopic_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "practice_question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_question_subtopic" ADD CONSTRAINT "practice_question_subtopic_subtopic_id_fkey" FOREIGN KEY ("subtopic_id") REFERENCES "subtopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
