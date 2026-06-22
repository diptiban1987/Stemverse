/**
 * Phase 42 — Scratch Classroom Runtime
 *
 * Teacher features: assignments, sharing, dashboard, grading.
 * Student features: submissions, portfolio, progress.
 */

export type AssignmentStatus = 'draft' | 'published' | 'closed' | 'graded';
export type SubmissionStatus = 'not_started' | 'in_progress' | 'submitted' | 'graded' | 'returned';

export interface ScratchClassroom {
  readonly classroomId: string;
  readonly teacherId: string;
  readonly name: string;
  readonly description: string;
  readonly enrollmentCode: string;
  readonly studentIds: string[];
  readonly assignments: ScratchAssignment[];
  readonly sharedProjects: SharedProject[];
  readonly createdAt: number;
}

export interface ScratchAssignment {
  readonly assignmentId: string;
  readonly classroomId: string;
  readonly title: string;
  readonly description: string;
  readonly templateProjectId: string | null;
  readonly maxScore: number;
  readonly dueDate: number | null;
  readonly status: AssignmentStatus;
  readonly autoGradeEnabled: boolean;
  readonly rubric: GradingCriteria[];
  readonly submissionCount: number;
  readonly createdAt: number;
}

export interface GradingCriteria {
  readonly criteriaId: string;
  readonly name: string;
  readonly description: string;
  readonly maxPoints: number;
  readonly autoCheckType: 'block_count' | 'sprite_count' | 'has_loop' | 'has_variable' | 'has_broadcast' | 'runs_without_error' | 'custom' | 'none';
}

export interface StudentSubmission {
  readonly submissionId: string;
  readonly assignmentId: string;
  readonly studentId: string;
  readonly projectId: string;
  readonly status: SubmissionStatus;
  readonly score: number | null;
  readonly maxScore: number;
  readonly feedback: string;
  readonly autoGradeResults: AutoGradeResult[];
  readonly submittedAt: number | null;
  readonly gradedAt: number | null;
}

export interface AutoGradeResult {
  readonly criteriaId: string;
  readonly passed: boolean;
  readonly score: number;
  readonly maxScore: number;
  readonly message: string;
}

export interface SharedProject {
  readonly shareId: string;
  readonly projectId: string;
  readonly ownerId: string;
  readonly ownerName: string;
  readonly title: string;
  readonly description: string;
  readonly likes: number;
  readonly views: number;
  readonly remixCount: number;
  readonly sharedAt: number;
}

export interface StudentPortfolio {
  readonly portfolioId: string;
  readonly studentId: string;
  readonly projects: PortfolioProject[];
  readonly totalProjects: number;
  readonly totalBlocksUsed: number;
  readonly topSkills: string[];
  readonly badges: string[];
}

export interface PortfolioProject {
  readonly projectId: string;
  readonly title: string;
  readonly blockCount: number;
  readonly spriteCount: number;
  readonly createdAt: number;
  readonly isShared: boolean;
}

export interface ClassDashboard {
  readonly classroomId: string;
  readonly totalStudents: number;
  readonly activeStudents: number;
  readonly averageScore: number;
  readonly completionRate: number;
  readonly topPerformers: string[];
  readonly atRiskStudents: string[];
  readonly recentActivity: DashboardActivity[];
}

export interface DashboardActivity {
  readonly activityId: string;
  readonly studentId: string;
  readonly type: 'submission' | 'project_shared' | 'project_created' | 'assignment_started';
  readonly description: string;
  readonly timestamp: number;
}

let _seq = 0;
function uid(): string { return `scls_${Date.now()}_${++_seq}`; }
const now = () => Date.now();

// ─── Classroom ─────────────────────────────────────────────────

export function createScratchClassroom(teacherId: string, name: string, description: string): ScratchClassroom {
  return {
    classroomId: uid(), teacherId, name, description,
    enrollmentCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
    studentIds: [], assignments: [], sharedProjects: [], createdAt: now(),
  };
}

export function enrollStudent(classroom: ScratchClassroom, studentId: string): ScratchClassroom {
  if (classroom.studentIds.includes(studentId)) return classroom;
  return { ...classroom, studentIds: [...classroom.studentIds, studentId] };
}

export function removeStudent(classroom: ScratchClassroom, studentId: string): ScratchClassroom {
  return { ...classroom, studentIds: classroom.studentIds.filter(id => id !== studentId) };
}

// ─── Assignments ───────────────────────────────────────────────

export function createScratchAssignment(classroomId: string, title: string, description: string, maxScore: number, dueDate: number | null = null): ScratchAssignment {
  return {
    assignmentId: uid(), classroomId, title, description, templateProjectId: null,
    maxScore, dueDate, status: 'draft', autoGradeEnabled: false, rubric: [],
    submissionCount: 0, createdAt: now(),
  };
}

export function publishAssignment(assignment: ScratchAssignment): ScratchAssignment {
  return { ...assignment, status: 'published' };
}

export function closeAssignment(assignment: ScratchAssignment): ScratchAssignment {
  return { ...assignment, status: 'closed' };
}

export function addGradingCriteria(assignment: ScratchAssignment, name: string, description: string, maxPoints: number, autoCheck: GradingCriteria['autoCheckType'] = 'none'): ScratchAssignment {
  const criteria: GradingCriteria = { criteriaId: uid(), name, description, maxPoints, autoCheckType: autoCheck };
  return { ...assignment, rubric: [...assignment.rubric, criteria] };
}

export function enableAutoGrade(assignment: ScratchAssignment): ScratchAssignment {
  return { ...assignment, autoGradeEnabled: true };
}

// ─── Submissions ───────────────────────────────────────────────

export function createSubmission(assignmentId: string, studentId: string, projectId: string, maxScore: number): StudentSubmission {
  return { submissionId: uid(), assignmentId, studentId, projectId, status: 'in_progress', score: null, maxScore, feedback: '', autoGradeResults: [], submittedAt: null, gradedAt: null };
}

export function submitAssignment(submission: StudentSubmission): StudentSubmission {
  return { ...submission, status: 'submitted', submittedAt: now() };
}

export function gradeSubmission(submission: StudentSubmission, score: number, feedback: string): StudentSubmission {
  return { ...submission, status: 'graded', score, feedback, gradedAt: now() };
}

export function autoGradeSubmission(submission: StudentSubmission, blockCount: number, spriteCount: number, hasLoop: boolean, hasVariable: boolean): StudentSubmission {
  const results: AutoGradeResult[] = [
    { criteriaId: 'blocks', passed: blockCount >= 5, score: blockCount >= 5 ? 20 : 10, maxScore: 20, message: `${blockCount} blocks used` },
    { criteriaId: 'sprites', passed: spriteCount >= 1, score: spriteCount >= 1 ? 20 : 0, maxScore: 20, message: `${spriteCount} sprites` },
    { criteriaId: 'loop', passed: hasLoop, score: hasLoop ? 20 : 0, maxScore: 20, message: hasLoop ? 'Uses loops' : 'No loops found' },
    { criteriaId: 'variable', passed: hasVariable, score: hasVariable ? 20 : 0, maxScore: 20, message: hasVariable ? 'Uses variables' : 'No variables' },
    { criteriaId: 'complete', passed: true, score: 20, maxScore: 20, message: 'Project submitted' },
  ];
  const totalScore = results.reduce((s, r) => s + r.score, 0);
  return { ...submission, autoGradeResults: results, score: totalScore, status: 'graded', gradedAt: now() };
}

export function returnSubmission(submission: StudentSubmission): StudentSubmission {
  return { ...submission, status: 'returned' };
}

// ─── Sharing ───────────────────────────────────────────────────

export function shareProject(projectId: string, ownerId: string, ownerName: string, title: string, description: string): SharedProject {
  return { shareId: uid(), projectId, ownerId, ownerName, title, description, likes: 0, views: 0, remixCount: 0, sharedAt: now() };
}

export function likeProject(project: SharedProject): SharedProject {
  return { ...project, likes: project.likes + 1 };
}

export function viewProject(project: SharedProject): SharedProject {
  return { ...project, views: project.views + 1 };
}

export function remixProject(project: SharedProject): SharedProject {
  return { ...project, remixCount: project.remixCount + 1 };
}

// ─── Portfolio ─────────────────────────────────────────────────

export function createStudentPortfolio(studentId: string): StudentPortfolio {
  return { portfolioId: uid(), studentId, projects: [], totalProjects: 0, totalBlocksUsed: 0, topSkills: [], badges: [] };
}

export function addProjectToPortfolio(portfolio: StudentPortfolio, projectId: string, title: string, blockCount: number, spriteCount: number, isShared: boolean): StudentPortfolio {
  const proj: PortfolioProject = { projectId, title, blockCount, spriteCount, createdAt: now(), isShared };
  return {
    ...portfolio, projects: [...portfolio.projects, proj],
    totalProjects: portfolio.totalProjects + 1,
    totalBlocksUsed: portfolio.totalBlocksUsed + blockCount,
  };
}

// ─── Dashboard ─────────────────────────────────────────────────

export function generateClassDashboard(classroomId: string, studentCount: number, activeCount: number, avgScore: number, completionRate: number): ClassDashboard {
  return {
    classroomId, totalStudents: studentCount, activeStudents: activeCount,
    averageScore: avgScore, completionRate,
    topPerformers: [], atRiskStudents: [],
    recentActivity: [],
  };
}

export function addDashboardActivity(dashboard: ClassDashboard, studentId: string, type: DashboardActivity['type'], description: string): ClassDashboard {
  const activity: DashboardActivity = { activityId: uid(), studentId, type, description, timestamp: now() };
  return { ...dashboard, recentActivity: [...dashboard.recentActivity, activity] };
}
