-- LMS Foundation: tracks, modules, assessments, progress

CREATE TYPE "CertificateLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PROFESSIONAL');
CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'MULTIPLE_SELECT', 'TRUE_FALSE', 'BLOCKLY_CHALLENGE', 'CODE_REVIEW');

CREATE TABLE "learning_tracks" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "learning_tracks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "learning_tracks_slug_key" ON "learning_tracks"("slug");

ALTER TABLE "courses" ADD COLUMN "track_id" UUID;
ALTER TABLE "courses" ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "modules" (
    "id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "modules_course_id_idx" ON "modules"("course_id");

ALTER TABLE "lessons" ADD COLUMN "module_id" UUID;

INSERT INTO "modules" ("id", "course_id", "title", "sort_order", "updated_at")
SELECT gen_random_uuid(), "course_id", 'Module 1', 1, CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "course_id" FROM "lessons") AS distinct_courses;

UPDATE "lessons" l
SET "module_id" = m."id"
FROM "modules" m
WHERE l."course_id" = m."course_id";

ALTER TABLE "lessons" DROP CONSTRAINT IF EXISTS "lessons_course_id_fkey";
ALTER TABLE "lessons" DROP COLUMN "course_id";
ALTER TABLE "lessons" ALTER COLUMN "module_id" SET NOT NULL;

ALTER TABLE "lessons" ADD CONSTRAINT "lessons_module_id_fkey"
  FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "lessons_module_id_idx" ON "lessons"("module_id");

CREATE TABLE "lesson_projects" (
    "id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "project_id" UUID,
    "board_type" TEXT,
    "template_key" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lesson_projects_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "lesson_projects_lesson_id_idx" ON "lesson_projects"("lesson_id");

ALTER TABLE "lesson_projects" ADD CONSTRAINT "lesson_projects_lesson_id_fkey"
  FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "assessments" (
    "id" UUID NOT NULL,
    "lesson_id" UUID,
    "module_id" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "passing_score" INTEGER NOT NULL DEFAULT 70,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "assessments_lesson_id_idx" ON "assessments"("lesson_id");
CREATE INDEX "assessments_module_id_idx" ON "assessments"("module_id");

CREATE TABLE "assessment_questions" (
    "id" UUID NOT NULL,
    "assessment_id" UUID NOT NULL,
    "type" "QuestionType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" JSONB,
    "correct_answer" JSONB NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 1,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "assessment_questions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "assessment_questions_assessment_id_idx" ON "assessment_questions"("assessment_id");

CREATE TABLE "assessment_attempts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "assessment_id" UUID NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "max_score" DOUBLE PRECISION NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "assessment_attempts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "assessment_attempts_user_id_idx" ON "assessment_attempts"("user_id");
CREATE INDEX "assessment_attempts_assessment_id_idx" ON "assessment_attempts"("assessment_id");

CREATE TABLE "course_enrollments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "progress_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    CONSTRAINT "course_enrollments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "course_enrollments_user_id_course_id_key" ON "course_enrollments"("user_id", "course_id");
CREATE INDEX "course_enrollments_user_id_idx" ON "course_enrollments"("user_id");

CREATE TABLE "lesson_progress" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    CONSTRAINT "lesson_progress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "lesson_progress_user_id_lesson_id_key" ON "lesson_progress"("user_id", "lesson_id");
CREATE INDEX "lesson_progress_user_id_idx" ON "lesson_progress"("user_id");

CREATE TABLE "project_completions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "lesson_project_id" UUID NOT NULL,
    "project_id" UUID,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "project_completions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "project_completions_user_id_lesson_project_id_key" ON "project_completions"("user_id", "lesson_project_id");

ALTER TABLE "courses" ADD CONSTRAINT "courses_track_id_fkey"
  FOREIGN KEY ("track_id") REFERENCES "learning_tracks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "courses_track_id_idx" ON "courses"("track_id");

ALTER TABLE "modules" ADD CONSTRAINT "modules_course_id_fkey"
  FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "assessments" ADD CONSTRAINT "assessments_lesson_id_fkey"
  FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "assessments" ADD CONSTRAINT "assessments_module_id_fkey"
  FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_assessment_id_fkey"
  FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_assessment_id_fkey"
  FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_course_id_fkey"
  FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_fkey"
  FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_completions" ADD CONSTRAINT "project_completions_lesson_project_id_fkey"
  FOREIGN KEY ("lesson_project_id") REFERENCES "lesson_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "certificates" ADD COLUMN "level" "CertificateLevel" NOT NULL DEFAULT 'BEGINNER';
ALTER TABLE "certificates" ADD COLUMN "metadata" JSONB NOT NULL DEFAULT '{}';
