/**
 * Phase 37A — Offline Learning Runtime
 *
 * Download lessons, assignments, templates, competition packs.
 * Offline completion tracking, sync on reconnect.
 */

import type {
  OfflineAssetModel, SyncStatus,
} from '../types';

// ─── Helpers ─────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => Date.now();

// ─── Offline Content Types ───────────────────────────────────

export interface OfflineLesson {
  lessonId: string;
  title: string;
  content: string;
  classroomId: string;
  cachedAt: number;
  completedSteps: number;
  totalSteps: number;
  syncStatus: SyncStatus;
}

export interface OfflineAssignment {
  assignmentId: string;
  title: string;
  requirements: string;
  classroomId: string;
  dueDate: number;
  submission: string;
  grade: number | null;
  cachedAt: number;
  syncStatus: SyncStatus;
}

export interface OfflineTemplate {
  templateId: string;
  name: string;
  category: string;
  data: string;
  sizeBytes: number;
  cachedAt: number;
}

export interface OfflineCompetitionPack {
  packId: string;
  competitionId: string;
  name: string;
  rules: string;
  templateData: string;
  deadline: number;
  cachedAt: number;
  submitted: boolean;
}

export interface OfflineCompletionTracker {
  userId: string;
  completedLessons: string[];
  submittedAssignments: string[];
  downloadedTemplates: string[];
  competitionSubmissions: string[];
  lastSyncAt: number;
  pendingSync: number;
}

// ─── Lesson Management ───────────────────────────────────────

export function downloadLesson(lessonId: string, title: string, content: string, classroomId: string, totalSteps: number): OfflineLesson {
  return { lessonId, title, content, classroomId, cachedAt: now(), completedSteps: 0, totalSteps, syncStatus: 'synced' };
}

export function advanceLessonStep(lesson: OfflineLesson): OfflineLesson {
  const newSteps = Math.min(lesson.completedSteps + 1, lesson.totalSteps);
  return { ...lesson, completedSteps: newSteps, syncStatus: 'pending' };
}

export function isLessonComplete(lesson: OfflineLesson): boolean {
  return lesson.completedSteps >= lesson.totalSteps;
}

export function getLessonProgress(lesson: OfflineLesson): number {
  return lesson.totalSteps > 0 ? lesson.completedSteps / lesson.totalSteps : 0;
}

// ─── Assignment Management ───────────────────────────────────

export function downloadAssignment(assignmentId: string, title: string, requirements: string, classroomId: string, dueDate: number): OfflineAssignment {
  return { assignmentId, title, requirements, classroomId, dueDate, submission: '', grade: null, cachedAt: now(), syncStatus: 'synced' };
}

export function submitOfflineAssignment(assignment: OfflineAssignment, submission: string): OfflineAssignment {
  return { ...assignment, submission, syncStatus: 'pending' };
}

export function isAssignmentOverdue(assignment: OfflineAssignment): boolean {
  return now() > assignment.dueDate;
}

export function gradeOfflineAssignment(assignment: OfflineAssignment, grade: number): OfflineAssignment {
  return { ...assignment, grade, syncStatus: 'pending' };
}

// ─── Template Management ─────────────────────────────────────

export function downloadTemplate(templateId: string, name: string, category: string, data: string, sizeBytes: number): OfflineTemplate {
  return { templateId, name, category, data, sizeBytes, cachedAt: now() };
}

export function getTemplatesByCategory(templates: OfflineTemplate[], category: string): OfflineTemplate[] {
  return templates.filter(t => t.category === category);
}

export function getTotalTemplateSize(templates: OfflineTemplate[]): number {
  return templates.reduce((s, t) => s + t.sizeBytes, 0);
}

// ─── Competition Pack ────────────────────────────────────────

export function downloadCompetitionPack(competitionId: string, name: string, rules: string, templateData: string, deadline: number): OfflineCompetitionPack {
  return { packId: uid(), competitionId, name, rules, templateData, deadline, cachedAt: now(), submitted: false };
}

export function submitCompetitionEntry(pack: OfflineCompetitionPack): OfflineCompetitionPack {
  return { ...pack, submitted: true };
}

export function isCompetitionDeadlinePassed(pack: OfflineCompetitionPack): boolean {
  return now() > pack.deadline;
}

// ─── Completion Tracker ──────────────────────────────────────

export function createCompletionTracker(userId: string): OfflineCompletionTracker {
  return {
    userId, completedLessons: [], submittedAssignments: [],
    downloadedTemplates: [], competitionSubmissions: [],
    lastSyncAt: now(), pendingSync: 0,
  };
}

export function markLessonCompleted(tracker: OfflineCompletionTracker, lessonId: string): OfflineCompletionTracker {
  if (tracker.completedLessons.includes(lessonId)) return tracker;
  return { ...tracker, completedLessons: [...tracker.completedLessons, lessonId], pendingSync: tracker.pendingSync + 1 };
}

export function markAssignmentSubmitted(tracker: OfflineCompletionTracker, assignmentId: string): OfflineCompletionTracker {
  if (tracker.submittedAssignments.includes(assignmentId)) return tracker;
  return { ...tracker, submittedAssignments: [...tracker.submittedAssignments, assignmentId], pendingSync: tracker.pendingSync + 1 };
}

export function markTemplateCached(tracker: OfflineCompletionTracker, templateId: string): OfflineCompletionTracker {
  if (tracker.downloadedTemplates.includes(templateId)) return tracker;
  return { ...tracker, downloadedTemplates: [...tracker.downloadedTemplates, templateId] };
}

export function syncTracker(tracker: OfflineCompletionTracker): OfflineCompletionTracker {
  return { ...tracker, lastSyncAt: now(), pendingSync: 0 };
}

export function getTrackerSummary(tracker: OfflineCompletionTracker): {
  completedLessons: number; submittedAssignments: number;
  downloadedTemplates: number; pendingSync: number;
} {
  return {
    completedLessons: tracker.completedLessons.length,
    submittedAssignments: tracker.submittedAssignments.length,
    downloadedTemplates: tracker.downloadedTemplates.length,
    pendingSync: tracker.pendingSync,
  };
}

// ─── Synchronizer ────────────────────────────────────────────

export class OfflineLearningSynchronizer {
  private lessons = new Map<string, OfflineLesson>();
  private assignments = new Map<string, OfflineAssignment>();
  private templates = new Map<string, OfflineTemplate>();
  private packs = new Map<string, OfflineCompetitionPack>();
  private tracker: OfflineCompletionTracker | null = null;

  addLesson(l: OfflineLesson) { this.lessons.set(l.lessonId, { ...l }); }
  getLesson(id: string) { const l = this.lessons.get(id); return l ? { ...l } : undefined; }
  getAllLessons() { return Array.from(this.lessons.values()).map(l => ({ ...l })); }

  addAssignment(a: OfflineAssignment) { this.assignments.set(a.assignmentId, { ...a }); }
  getAssignment(id: string) { const a = this.assignments.get(id); return a ? { ...a } : undefined; }
  getAllAssignments() { return Array.from(this.assignments.values()).map(a => ({ ...a })); }

  addTemplate(t: OfflineTemplate) { this.templates.set(t.templateId, { ...t }); }
  getTemplate(id: string) { const t = this.templates.get(id); return t ? { ...t } : undefined; }
  getAllTemplates() { return Array.from(this.templates.values()).map(t => ({ ...t })); }

  addPack(p: OfflineCompetitionPack) { this.packs.set(p.packId, { ...p }); }
  getPack(id: string) { const p = this.packs.get(id); return p ? { ...p } : undefined; }
  getAllPacks() { return Array.from(this.packs.values()).map(p => ({ ...p })); }

  setTracker(t: OfflineCompletionTracker) { this.tracker = { ...t }; }
  getTracker() { return this.tracker ? { ...this.tracker } : null; }

  clear() { this.lessons.clear(); this.assignments.clear(); this.templates.clear(); this.packs.clear(); this.tracker = null; }

  toJSON() {
    return {
      lessons: this.getAllLessons(), assignments: this.getAllAssignments(),
      templates: this.getAllTemplates(), packs: this.getAllPacks(),
      tracker: this.getTracker(),
    };
  }

  fromJSON(data: { lessons?: OfflineLesson[]; assignments?: OfflineAssignment[]; templates?: OfflineTemplate[]; packs?: OfflineCompetitionPack[]; tracker?: OfflineCompletionTracker | null }) {
    this.clear();
    (data.lessons || []).forEach(l => this.addLesson(l));
    (data.assignments || []).forEach(a => this.addAssignment(a));
    (data.templates || []).forEach(t => this.addTemplate(t));
    (data.packs || []).forEach(p => this.addPack(p));
    if (data.tracker) this.setTracker(data.tracker);
  }

  clone(): OfflineLearningSynchronizer {
    const c = new OfflineLearningSynchronizer();
    c.fromJSON(this.toJSON());
    return c;
  }
}
