-- Practice-question feedback (the 11★ loop for questions) must name its question.
-- The PRACTICE_QUESTION enum value was added in the previous migration, so it is committed here.
ALTER TABLE "feedback" DROP CONSTRAINT "feedback_target_fields";
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_target_fields" CHECK (
  ("target_type" = 'SECTION' AND "section_revision_id" IS NOT NULL AND "module_version_id" IS NOT NULL AND "section_key" IS NOT NULL)
  OR ("target_type" = 'LESSON' AND "module_version_id" IS NOT NULL)
  OR ("target_type" = 'PAGE' AND "page" IS NOT NULL)
  OR ("target_type" = 'PRACTICE_QUESTION' AND "practice_question_id" IS NOT NULL)
);

-- One rating per student and question, which they can change.
CREATE UNIQUE INDEX "feedback_one_per_practice_question" ON "feedback" ("student_id", "practice_question_id") WHERE "target_type" = 'PRACTICE_QUESTION';
