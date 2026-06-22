/**
 * Phase 38A — Learning Analytics Runtime
 *
 * Course completion, lesson engagement, student progression,
 * skill heatmaps, drop-off detection, achievement tracking,
 * certification success rates, classroom/competition/marketplace/AI/device analytics.
 */

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => Date.now();

// ─── Types ───────────────────────────────────────────────────

export interface CourseCompletionRate {
  courseId: string; courseName: string;
  enrolled: number; completed: number;
  rate: number; avgCompletionDays: number;
}

export interface LessonEngagement {
  lessonId: string; lessonName: string;
  views: number; completions: number;
  avgTimeMinutes: number; dropOffRate: number;
  interactionCount: number;
}

export interface StudentProgression {
  studentId: string; studentName: string;
  currentLevel: number; totalXp: number;
  lessonsCompleted: number; assignmentsSubmitted: number;
  avgGrade: number; streak: number;
  lastActiveAt: number; riskLevel: 'low' | 'medium' | 'high';
}

export interface SkillHeatmapEntry {
  skill: string; category: string;
  mastery: number; practiceCount: number;
  lastPracticed: number;
}

export interface DropOffPoint {
  stepIndex: number; stepName: string;
  enteredCount: number; exitedCount: number;
  dropOffRate: number;
}

export interface AchievementRecord {
  achievementId: string; name: string;
  description: string; category: string;
  earnedBy: number; totalEligible: number;
  earnRate: number;
}

export interface CertSuccessRate {
  certId: string; certName: string;
  attempts: number; passes: number;
  passRate: number; avgScore: number;
}

// ─── Classroom Analytics ─────────────────────────────────────

export interface TeacherProductivity {
  teacherId: string; lessonsDelivered: number;
  assignmentsCreated: number; feedbackGiven: number;
  avgResponseTimeHours: number; studentSatisfaction: number;
}

export interface ClassPerformance {
  classroomId: string; className: string;
  avgGrade: number; completionRate: number;
  topStudents: string[]; atRiskStudents: string[];
  assignmentCount: number; participationRate: number;
}

export interface AssignmentCompletion {
  assignmentId: string; title: string;
  totalStudents: number; submitted: number;
  graded: number; avgGrade: number;
  completionRate: number; lateSubmissions: number;
}

// ─── Competition Analytics ───────────────────────────────────

export interface CompetitionParticipation {
  competitionId: string; name: string;
  registered: number; submitted: number;
  participationRate: number; avgScore: number;
  medianScore: number; topScorer: string;
}

export interface JudgeScoringAnalysis {
  judgeId: string; judgeName: string;
  entriesScored: number; avgScore: number;
  scoreStdDev: number; consistency: number;
}

export interface LeaderboardTrend {
  userId: string; userName: string;
  scores: number[]; ranks: number[];
  trend: 'improving' | 'declining' | 'stable';
}

// ─── Marketplace Analytics ───────────────────────────────────

export interface AssetPerformance {
  assetId: string; name: string;
  downloads: number; rating: number;
  revenue: number; conversionRate: number;
  trending: boolean;
}

export interface CreatorPerformance {
  creatorId: string; name: string;
  totalAssets: number; totalDownloads: number;
  avgRating: number; totalRevenue: number;
}

// ─── AI Analytics ────────────────────────────────────────────

export interface AIUsageMetrics {
  model: string; promptCount: number;
  generationCount: number; totalTokens: number;
  successRate: number; failureRate: number;
  avgResponseTimeMs: number; adoptionRate: number;
}

// ─── Device Analytics ────────────────────────────────────────

export interface BoardPopularity {
  boardType: string; uploadCount: number;
  successRate: number; avgDebugTimeMinutes: number;
  userCount: number;
}

export interface ComponentUsageMetric {
  componentType: string; placementCount: number;
  uniqueProjects: number; avgPerProject: number;
}

// ─── Calculation Functions ───────────────────────────────────

export function calculateCompletionRate(enrolled: number, completed: number): number {
  return enrolled > 0 ? (completed / enrolled) * 100 : 0;
}

export function calculateDropOff(entered: number, exited: number): number {
  return entered > 0 ? (exited / entered) * 100 : 0;
}

export function calculateSkillMastery(practiceCount: number, successCount: number, maxMastery = 100): number {
  if (practiceCount === 0) return 0;
  const raw = (successCount / practiceCount) * 100;
  return Math.min(raw, maxMastery);
}

export function detectAtRiskStudents(students: StudentProgression[], inactiveDays = 7): StudentProgression[] {
  const cutoff = now() - inactiveDays * 86400000;
  return students.filter(s => s.lastActiveAt < cutoff || s.avgGrade < 50 || s.riskLevel === 'high');
}

export function calculateTrendDirection(scores: number[]): 'improving' | 'declining' | 'stable' {
  if (scores.length < 2) return 'stable';
  const recent = scores.slice(-3);
  const earlier = scores.slice(0, 3);
  const recentAvg = recent.reduce((s, v) => s + v, 0) / recent.length;
  const earlierAvg = earlier.reduce((s, v) => s + v, 0) / earlier.length;
  if (recentAvg > earlierAvg + 5) return 'improving';
  if (recentAvg < earlierAvg - 5) return 'declining';
  return 'stable';
}

export function calculateJudgeConsistency(scores: number[]): number {
  if (scores.length < 2) return 100;
  const mean = scores.reduce((s, v) => s + v, 0) / scores.length;
  const variance = scores.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  return Math.max(0, 100 - stdDev * 2);
}

export function rankStudents(students: StudentProgression[]): StudentProgression[] {
  return [...students].sort((a, b) => b.avgGrade - a.avgGrade || b.totalXp - a.totalXp);
}

export function getTopAssets(assets: AssetPerformance[], n = 10): AssetPerformance[] {
  return [...assets].sort((a, b) => b.downloads - a.downloads).slice(0, n);
}

export function calculateAdoptionRate(activeUsers: number, totalUsers: number): number {
  return totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;
}

// ─── Synchronizer ────────────────────────────────────────────

export class LearningAnalyticsSynchronizer {
  private completionRates: CourseCompletionRate[] = [];
  private engagements: LessonEngagement[] = [];
  private progressions = new Map<string, StudentProgression>();
  private skillMaps: SkillHeatmapEntry[] = [];
  private achievements: AchievementRecord[] = [];

  addCompletionRate(c: CourseCompletionRate) { this.completionRates.push({ ...c }); }
  getCompletionRates() { return this.completionRates.map(c => ({ ...c })); }

  addEngagement(e: LessonEngagement) { this.engagements.push({ ...e }); }
  getEngagements() { return this.engagements.map(e => ({ ...e })); }

  setProgression(p: StudentProgression) { this.progressions.set(p.studentId, { ...p }); }
  getProgression(id: string) { const p = this.progressions.get(id); return p ? { ...p } : undefined; }
  getAllProgressions() { return Array.from(this.progressions.values()).map(p => ({ ...p })); }

  addSkill(s: SkillHeatmapEntry) { this.skillMaps.push({ ...s }); }
  getSkillMap() { return this.skillMaps.map(s => ({ ...s })); }

  addAchievement(a: AchievementRecord) { this.achievements.push({ ...a }); }
  getAchievements() { return this.achievements.map(a => ({ ...a })); }

  clear() { this.completionRates = []; this.engagements = []; this.progressions.clear(); this.skillMaps = []; this.achievements = []; }

  toJSON() { return { completionRates: this.getCompletionRates(), engagements: this.getEngagements(), progressions: this.getAllProgressions(), skills: this.getSkillMap(), achievements: this.getAchievements() }; }
  fromJSON(d: { completionRates?: CourseCompletionRate[]; engagements?: LessonEngagement[]; progressions?: StudentProgression[]; skills?: SkillHeatmapEntry[]; achievements?: AchievementRecord[] }) {
    this.clear();
    (d.completionRates || []).forEach(c => this.addCompletionRate(c));
    (d.engagements || []).forEach(e => this.addEngagement(e));
    (d.progressions || []).forEach(p => this.setProgression(p));
    (d.skills || []).forEach(s => this.addSkill(s));
    (d.achievements || []).forEach(a => this.addAchievement(a));
  }
  clone(): LearningAnalyticsSynchronizer { const c = new LearningAnalyticsSynchronizer(); c.fromJSON(this.toJSON()); return c; }
}
