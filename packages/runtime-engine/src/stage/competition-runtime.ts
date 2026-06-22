/**
 * Phase 34B — Competition Runtime
 *
 * Competition management, Robothrone integration,
 * categories, submissions, judging, scoring, leaderboards.
 */

import type {
  CompetitionModel, CompetitionCategoryModel, CompetitionSubmissionModel,
  CompetitionScoreModel, CompetitionLeaderboardModel, CompetitionJudgeModel,
  CompetitionStatus, CompetitionLevel,
} from '../types';

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
function deepCopy<T>(v: T): T { return JSON.parse(JSON.stringify(v)); }
const W = '[Phase 34B Competition]';

export const VALID_COMPETITION_STATUSES: CompetitionStatus[] = ['registration', 'active', 'judging', 'completed', 'cancelled'];
export const VALID_COMPETITION_LEVELS: CompetitionLevel[] = ['beginner', 'intermediate', 'advanced', 'iot', 'ai_robotics', 'innovation'];
export const ROBOTHRONE_CATEGORIES: Array<{ name: string; level: CompetitionLevel; description: string }> = [
  { name: 'Beginner Bot', level: 'beginner', description: 'Entry-level robotics challenge' },
  { name: 'Intermediate Bot', level: 'intermediate', description: 'Mid-level robotics challenge' },
  { name: 'Advanced Bot', level: 'advanced', description: 'Expert robotics challenge' },
  { name: 'IoT Innovation', level: 'iot', description: 'Internet of Things challenge' },
  { name: 'AI Robotics', level: 'ai_robotics', description: 'AI-powered robotics challenge' },
  { name: 'Innovation Challenge', level: 'innovation', description: 'Open innovation challenge' },
];

// ─── Competition CRUD ───────────────────────────────────────

export function createCompetition(
  title: string, description: string, organizer: string,
  registrationDeadline: number, startDate: number, endDate: number,
  maxParticipants?: number,
): CompetitionModel {
  return {
    competitionId: generateId(), title, description, organizer,
    status: 'registration', registrationDeadline, startDate, endDate,
    maxParticipants: maxParticipants ?? 100, categoryIds: [],
    createdAt: Date.now(), deleted: false,
  };
}

export function startCompetition(comp: CompetitionModel): CompetitionModel {
  const c = deepCopy(comp); c.status = 'active'; return c;
}

export function beginJudging(comp: CompetitionModel): CompetitionModel {
  const c = deepCopy(comp); c.status = 'judging'; return c;
}

export function completeCompetition(comp: CompetitionModel): CompetitionModel {
  const c = deepCopy(comp); c.status = 'completed'; return c;
}

export function cancelCompetition(comp: CompetitionModel): CompetitionModel {
  const c = deepCopy(comp); c.status = 'cancelled'; return c;
}

export function validateCompetition(c: unknown): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!c || typeof c !== 'object') { warnings.push(`${W} null`); console.warn(warnings[0]); return { valid: false, warnings }; }
  const o = c as Record<string, unknown>;
  if (typeof o.competitionId !== 'string' || !o.competitionId) { warnings.push(`${W} empty competitionId`); console.warn(warnings[warnings.length - 1]); }
  return { valid: warnings.length === 0, warnings };
}

// ─── Categories ─────────────────────────────────────────────

export function createCategory(
  competitionId: string, name: string, description: string,
  level: CompetitionLevel, maxTeamSize?: number,
): CompetitionCategoryModel {
  return { categoryId: generateId(), competitionId, name, description, level, maxTeamSize: maxTeamSize ?? 4, judgeIds: [] };
}

export function createRobothroneCategories(competitionId: string): CompetitionCategoryModel[] {
  return ROBOTHRONE_CATEGORIES.map(rc => createCategory(competitionId, rc.name, rc.description, rc.level));
}

export function assignJudgeToCategory(category: CompetitionCategoryModel, judgeId: string): CompetitionCategoryModel {
  const c = deepCopy(category);
  if (!c.judgeIds.includes(judgeId)) c.judgeIds.push(judgeId);
  return c;
}

// ─── Submissions ────────────────────────────────────────────

export function createCompetitionSubmission(
  competitionId: string, categoryId: string, teamName: string,
  school: string, mentorName: string, participantIds: string[],
  projectId: string, projectTitle: string,
): CompetitionSubmissionModel {
  return {
    submissionId: generateId(), competitionId, categoryId,
    teamName, school, mentorName, participantIds: [...participantIds],
    projectId, projectTitle, submittedAt: Date.now(),
  };
}

// ─── Judging ────────────────────────────────────────────────

export function createJudge(competitionId: string, name: string, email: string): CompetitionJudgeModel {
  return { judgeId: generateId(), competitionId, name, email, assignedCategoryIds: [], totalScored: 0 };
}

export function scoreSubmission(
  submissionId: string, judgeId: string, judgeName: string,
  creativity: number, technical: number, presentation: number, innovation: number,
  comments: string,
): CompetitionScoreModel {
  const clamp = (v: number) => Math.max(0, Math.min(25, v));
  const c = clamp(creativity), t = clamp(technical), p = clamp(presentation), n = clamp(innovation);
  return {
    scoreId: generateId(), submissionId, judgeId, judgeName,
    creativity: c, technical: t, presentation: p, innovation: n,
    totalScore: c + t + p + n, comments, scoredAt: Date.now(),
  };
}

export function calculateAverageScore(scores: CompetitionScoreModel[]): number {
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((s, sc) => s + sc.totalScore, 0) / scores.length);
}

/** Tie break: highest technical score wins */
export function tieBreak(a: CompetitionScoreModel[], b: CompetitionScoreModel[]): number {
  const avgA = a.reduce((s, sc) => s + sc.technical, 0) / (a.length || 1);
  const avgB = b.reduce((s, sc) => s + sc.technical, 0) / (b.length || 1);
  return avgB - avgA;
}

// ─── Leaderboard ────────────────────────────────────────────

export function generateCompetitionLeaderboard(
  competitionId: string, categoryId: string,
  submissions: CompetitionSubmissionModel[],
  allScores: CompetitionScoreModel[],
): CompetitionLeaderboardModel[] {
  const catSubs = submissions.filter(s => s.categoryId === categoryId);
  const entries: CompetitionLeaderboardModel[] = catSubs.map(sub => {
    const subScores = allScores.filter(sc => sc.submissionId === sub.submissionId);
    return {
      entryId: generateId(), competitionId, categoryId,
      teamName: sub.teamName, school: sub.school,
      rank: 0, averageScore: calculateAverageScore(subScores),
      judgeCount: subScores.length, submissionId: sub.submissionId,
    };
  });
  entries.sort((a, b) => b.averageScore - a.averageScore);
  entries.forEach((e, i) => { e.rank = i + 1; });
  return entries;
}

// ─── Export ─────────────────────────────────────────────────

export function exportCompetitionResultsToCSV(leaderboard: CompetitionLeaderboardModel[]): string {
  const lines = ['rank,teamName,school,averageScore,judgeCount'];
  for (const e of leaderboard) lines.push(`${e.rank},${e.teamName},${e.school},${e.averageScore},${e.judgeCount}`);
  return lines.join('\n');
}

export function exportCompetitionResultsToJSON(
  competition: CompetitionModel, leaderboard: CompetitionLeaderboardModel[],
): string {
  return JSON.stringify({ competition: deepCopy(competition), leaderboard: deepCopy(leaderboard), exportedAt: new Date().toISOString() }, null, 2);
}

// ─── CompetitionSynchronizer ────────────────────────────────

export class CompetitionSynchronizer {
  private readonly competitions = new Map<string, CompetitionModel>();
  private readonly competitionOrder: string[] = [];
  private readonly categories = new Map<string, CompetitionCategoryModel>();
  private readonly categoryOrder: string[] = [];
  private readonly submissions = new Map<string, CompetitionSubmissionModel>();
  private readonly submissionOrder: string[] = [];
  private readonly scores = new Map<string, CompetitionScoreModel>();
  private readonly scoreOrder: string[] = [];
  private readonly leaderboards = new Map<string, CompetitionLeaderboardModel>();
  private readonly leaderboardOrder: string[] = [];
  private readonly judges = new Map<string, CompetitionJudgeModel>();
  private readonly judgeOrder: string[] = [];

  public registerCompetition(c: CompetitionModel): void {
    if (!c.competitionId) { console.warn(`${W} empty id`); return; }
    const cp = deepCopy(c);
    if (this.competitions.has(c.competitionId)) { this.competitions.set(c.competitionId, cp); return; }
    this.competitions.set(c.competitionId, cp); this.competitionOrder.push(c.competitionId);
  }
  public getCompetition(id: string): CompetitionModel | undefined { const v = this.competitions.get(id); return v ? deepCopy(v) : undefined; }
  public getAllCompetitions(): CompetitionModel[] { return this.competitionOrder.filter(id => this.competitions.has(id)).map(id => deepCopy(this.competitions.get(id)!)); }
  public hasCompetition(id: string): boolean { return this.competitions.has(id); }
  public clearCompetitions(): void { this.competitions.clear(); this.competitionOrder.length = 0; }

  public registerCategory(c: CompetitionCategoryModel): void {
    if (!c.categoryId) { console.warn(`${W} empty categoryId`); return; }
    const cp = deepCopy(c);
    if (this.categories.has(c.categoryId)) { this.categories.set(c.categoryId, cp); return; }
    this.categories.set(c.categoryId, cp); this.categoryOrder.push(c.categoryId);
  }
  public getAllCategories(): CompetitionCategoryModel[] { return this.categoryOrder.filter(id => this.categories.has(id)).map(id => deepCopy(this.categories.get(id)!)); }
  public clearCategories(): void { this.categories.clear(); this.categoryOrder.length = 0; }

  public registerSubmission(s: CompetitionSubmissionModel): void {
    if (!s.submissionId) { console.warn(`${W} empty submissionId`); return; }
    const cp = deepCopy(s);
    if (this.submissions.has(s.submissionId)) { this.submissions.set(s.submissionId, cp); return; }
    this.submissions.set(s.submissionId, cp); this.submissionOrder.push(s.submissionId);
  }
  public getAllSubmissions(): CompetitionSubmissionModel[] { return this.submissionOrder.filter(id => this.submissions.has(id)).map(id => deepCopy(this.submissions.get(id)!)); }
  public clearSubmissions(): void { this.submissions.clear(); this.submissionOrder.length = 0; }

  public registerScore(s: CompetitionScoreModel): void {
    if (!s.scoreId) { console.warn(`${W} empty scoreId`); return; }
    const cp = deepCopy(s);
    if (this.scores.has(s.scoreId)) { this.scores.set(s.scoreId, cp); return; }
    this.scores.set(s.scoreId, cp); this.scoreOrder.push(s.scoreId);
  }
  public getAllScores(): CompetitionScoreModel[] { return this.scoreOrder.filter(id => this.scores.has(id)).map(id => deepCopy(this.scores.get(id)!)); }
  public clearScores(): void { this.scores.clear(); this.scoreOrder.length = 0; }

  public registerLeaderboard(l: CompetitionLeaderboardModel): void {
    if (!l.entryId) { console.warn(`${W} empty entryId`); return; }
    const cp = deepCopy(l);
    if (this.leaderboards.has(l.entryId)) { this.leaderboards.set(l.entryId, cp); return; }
    this.leaderboards.set(l.entryId, cp); this.leaderboardOrder.push(l.entryId);
  }
  public getAllLeaderboards(): CompetitionLeaderboardModel[] { return this.leaderboardOrder.filter(id => this.leaderboards.has(id)).map(id => deepCopy(this.leaderboards.get(id)!)); }
  public clearLeaderboards(): void { this.leaderboards.clear(); this.leaderboardOrder.length = 0; }

  public registerJudge(j: CompetitionJudgeModel): void {
    if (!j.judgeId) { console.warn(`${W} empty judgeId`); return; }
    const cp = deepCopy(j);
    if (this.judges.has(j.judgeId)) { this.judges.set(j.judgeId, cp); return; }
    this.judges.set(j.judgeId, cp); this.judgeOrder.push(j.judgeId);
  }
  public getAllJudges(): CompetitionJudgeModel[] { return this.judgeOrder.filter(id => this.judges.has(id)).map(id => deepCopy(this.judges.get(id)!)); }
  public clearJudges(): void { this.judges.clear(); this.judgeOrder.length = 0; }

  public clear(): void {
    this.clearCompetitions(); this.clearCategories(); this.clearSubmissions();
    this.clearScores(); this.clearLeaderboards(); this.clearJudges();
  }
  public toJSON() {
    return {
      competitions: this.getAllCompetitions(), categories: this.getAllCategories(),
      submissions: this.getAllSubmissions(), scores: this.getAllScores(),
      leaderboards: this.getAllLeaderboards(), judges: this.getAllJudges(),
    };
  }
  public fromJSON(j: Partial<ReturnType<CompetitionSynchronizer['toJSON']>>): void {
    this.clear(); if (!j) return;
    for (const c of j.competitions || []) this.registerCompetition(c);
    for (const c of j.categories || []) this.registerCategory(c);
    for (const s of j.submissions || []) this.registerSubmission(s);
    for (const s of j.scores || []) this.registerScore(s);
    for (const l of j.leaderboards || []) this.registerLeaderboard(l);
    for (const j2 of j.judges || []) this.registerJudge(j2);
  }
  public clone(): CompetitionSynchronizer { const c = new CompetitionSynchronizer(); c.fromJSON(this.toJSON()); return c; }

  public get competitionSize(): number { return this.competitions.size; }
  public get categorySize(): number { return this.categories.size; }
  public get submissionSize(): number { return this.submissions.size; }
  public get scoreSize(): number { return this.scores.size; }
  public get leaderboardSize(): number { return this.leaderboards.size; }
  public get judgeSize(): number { return this.judges.size; }
}
