import type { Prisma } from '@stemverse/database';

export type LessonDetail = Prisma.LessonGetPayload<{
  include: {
    lessonProjects: true;
    assessments: { include: { questions: true } };
    module: { include: { course: { select: { id: true; title: true; slug: true } } } };
  };
}>;

export type CourseWithModules = Prisma.CourseGetPayload<{
  include: {
    track: true;
    modules: {
      include: {
        lessons: {
          include: {
            lessonProjects: true;
            assessments: { select: { id: true; title: true; passingScore: true } };
          };
        };
        assessments: { select: { id: true; title: true; passingScore: true } };
      };
    };
  };
}>;

export type AssessmentForStudent = Prisma.AssessmentGetPayload<{
  include: {
    questions: {
      select: {
        id: true;
        type: true;
        prompt: true;
        options: true;
        points: true;
        sortOrder: true;
      };
    };
  };
}>;

export type AssessmentWithQuestions = Prisma.AssessmentGetPayload<{
  include: { questions: true };
}>;

export type ProgressDashboard = {
  enrollments: Prisma.CourseEnrollmentGetPayload<{
    include: { course: { select: { id: true; title: true; slug: true; level: true } } };
  }>[];
  lessonsCompleted: number;
  lessonProgress: Prisma.LessonProgressGetPayload<{
    include: { lesson: { select: { id: true; title: true } } };
  }>[];
  quizAttempts: Prisma.AssessmentAttemptGetPayload<{
    include: { assessment: { select: { id: true; title: true } } };
  }>[];
  projectsCompleted: number;
  projectCompletions: Prisma.ProjectCompletionGetPayload<{
    include: { lessonProject: { select: { id: true; title: true } } };
  }>[];
  certificatesEarned: number;
  certificates: Prisma.CertificateGetPayload<{
    include: { course: { select: { title: true; slug: true } } };
  }>[];
};

export type CertificateListItem = Prisma.CertificateGetPayload<{
  include: { course: { select: { title: true; slug: true; level: true } } };
}>;
