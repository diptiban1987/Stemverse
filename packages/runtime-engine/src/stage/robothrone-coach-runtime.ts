/**
 * Phase 41A — Robothrone Coach Runtime
 *
 * Competition preparation, challenge recommendations, practice roadmaps,
 * skill scoring, performance analysis, project recommendations.
 */

// ─── Types ─────────────────────────────────────────────────────

export type CoachCategory = 'line_following' | 'obstacle_avoidance' | 'speed_trial' | 'maze_solving' | 'sumo' | 'freestyle';
export type ReadinessLevel = 'not_ready' | 'needs_practice' | 'almost_ready' | 'ready' | 'competition_ready';

export interface CoachProfile {
  readonly coachId: string;
  readonly userId: string;
  readonly targetCompetition: string;
  readonly categoryScores: Record<CoachCategory, number>;
  readonly overallReadiness: ReadinessLevel;
  readonly practiceHours: number;
  readonly challengesCompleted: number;
  readonly bestScore: number;
  readonly weakAreas: string[];
  readonly strongAreas: string[];
  readonly lastTrainingAt: number;
  readonly createdAt: number;
}

export interface PracticeRoadmap {
  readonly roadmapId: string;
  readonly userId: string;
  readonly competition: string;
  readonly phases: RoadmapPhase[];
  readonly currentPhase: number;
  readonly totalWeeks: number;
  readonly completedPhases: number;
  readonly startedAt: number;
}

export interface RoadmapPhase {
  readonly phaseId: string;
  readonly title: string;
  readonly description: string;
  readonly weekNumber: number;
  readonly focusArea: CoachCategory;
  readonly drills: PracticeDrill[];
  readonly completed: boolean;
}

export interface PracticeDrill {
  readonly drillId: string;
  readonly title: string;
  readonly description: string;
  readonly category: CoachCategory;
  readonly targetScore: number;
  readonly estimatedMinutes: number;
  readonly completed: boolean;
  readonly bestScore: number;
}

export interface ChallengeRecommendation {
  readonly recommendationId: string;
  readonly userId: string;
  readonly challengeType: CoachCategory;
  readonly title: string;
  readonly description: string;
  readonly difficulty: number;
  readonly reason: string;
  readonly expectedImprovement: string;
  readonly estimatedMinutes: number;
}

export interface PerformanceAnalysis {
  readonly analysisId: string;
  readonly userId: string;
  readonly competition: string;
  readonly overallScore: number;
  readonly categoryBreakdown: Record<CoachCategory, CategoryAnalysis>;
  readonly trends: PerformanceTrend[];
  readonly recommendations: string[];
  readonly createdAt: number;
}

export interface CategoryAnalysis {
  readonly score: number;
  readonly rank: string;
  readonly improvement: number;
  readonly practiceCount: number;
  readonly tips: string[];
}

export interface PerformanceTrend {
  readonly date: number;
  readonly score: number;
  readonly category: CoachCategory;
}

export interface ProjectRecommendation {
  readonly recommendationId: string;
  readonly userId: string;
  readonly title: string;
  readonly description: string;
  readonly category: CoachCategory;
  readonly difficulty: number;
  readonly components: string[];
  readonly skills: string[];
  readonly estimatedHours: number;
}

// ─── Helpers ──────────────────────────────────────────────────

let _seq = 0;
function uid(): string { return `coach_${Date.now()}_${++_seq}`; }
const now = () => Date.now();

// ─── Readiness Calculation ────────────────────────────────────

function calculateReadiness(scores: Record<CoachCategory, number>): ReadinessLevel {
  const values = Object.values(scores);
  if (values.length === 0) return 'not_ready';
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  if (avg >= 90) return 'competition_ready';
  if (avg >= 75) return 'ready';
  if (avg >= 55) return 'almost_ready';
  if (avg >= 30) return 'needs_practice';
  return 'not_ready';
}

// ─── Coach Profile ─────────────────────────────────────────────

export function createCoachProfile(userId: string, targetCompetition: string): CoachProfile {
  const defaultScores: Record<CoachCategory, number> = {
    line_following: 0, obstacle_avoidance: 0, speed_trial: 0,
    maze_solving: 0, sumo: 0, freestyle: 0,
  };
  return {
    coachId: uid(), userId, targetCompetition,
    categoryScores: defaultScores,
    overallReadiness: 'not_ready',
    practiceHours: 0, challengesCompleted: 0, bestScore: 0,
    weakAreas: Object.keys(defaultScores),
    strongAreas: [],
    lastTrainingAt: 0, createdAt: now(),
  };
}

export function updateCategoryScore(profile: CoachProfile, category: CoachCategory, score: number): CoachProfile {
  const newScores = { ...profile.categoryScores, [category]: Math.max(profile.categoryScores[category], score) };
  const entries = Object.entries(newScores) as [CoachCategory, number][];
  const strong = entries.filter(([_, v]) => v >= 70).map(([k]) => k);
  const weak = entries.filter(([_, v]) => v < 50).map(([k]) => k);
  return {
    ...profile,
    categoryScores: newScores,
    overallReadiness: calculateReadiness(newScores),
    bestScore: Math.max(profile.bestScore, score),
    strongAreas: strong,
    weakAreas: weak,
    lastTrainingAt: now(),
  };
}

export function recordTrainingSession(profile: CoachProfile, durationMinutes: number): CoachProfile {
  return {
    ...profile,
    practiceHours: Math.round((profile.practiceHours + durationMinutes / 60) * 100) / 100,
    challengesCompleted: profile.challengesCompleted + 1,
    lastTrainingAt: now(),
  };
}

export function getReadinessLevel(profile: CoachProfile): ReadinessLevel {
  return profile.overallReadiness;
}

// ─── Challenge Recommendations ─────────────────────────────────

export function recommendChallenges(profile: CoachProfile, count: number = 3): ChallengeRecommendation[] {
  const recs: ChallengeRecommendation[] = [];
  const weakSorted = [...profile.weakAreas].sort((a, b) => {
    return (profile.categoryScores[a as CoachCategory] ?? 0) - (profile.categoryScores[b as CoachCategory] ?? 0);
  });
  const targets = weakSorted.length > 0 ? weakSorted : Object.keys(profile.categoryScores);
  for (let i = 0; i < Math.min(count, targets.length); i++) {
    const cat = targets[i] as CoachCategory;
    const currentScore = profile.categoryScores[cat] ?? 0;
    const difficulty = Math.max(1, Math.min(10, Math.ceil(currentScore / 10)));
    recs.push({
      recommendationId: uid(), userId: profile.userId, challengeType: cat,
      title: `${cat.replace(/_/g, ' ')} Challenge Level ${difficulty}`,
      description: `Practice ${cat.replace(/_/g, ' ')} to improve your score from ${currentScore}%`,
      difficulty, reason: currentScore < 50 ? 'This is a weak area that needs practice' : 'Maintain and improve this skill',
      expectedImprovement: `+${Math.min(20, 10 + Math.floor(difficulty / 2))}% score improvement`,
      estimatedMinutes: 15 + difficulty * 5,
    });
  }
  return recs;
}

// ─── Practice Roadmap ──────────────────────────────────────────

export function generatePracticeRoadmap(userId: string, competition: string, weeksAvailable: number): PracticeRoadmap {
  const categories: CoachCategory[] = ['line_following', 'obstacle_avoidance', 'speed_trial', 'maze_solving', 'sumo', 'freestyle'];
  const phases: RoadmapPhase[] = [];
  const weeksPerCategory = Math.max(1, Math.floor(weeksAvailable / categories.length));
  for (let i = 0; i < Math.min(categories.length, weeksAvailable); i++) {
    const cat = categories[i % categories.length];
    const drills: PracticeDrill[] = [
      { drillId: uid(), title: `${cat} — Basic`, description: `Learn fundamentals of ${cat.replace(/_/g, ' ')}`, category: cat, targetScore: 50, estimatedMinutes: 30, completed: false, bestScore: 0 },
      { drillId: uid(), title: `${cat} — Intermediate`, description: `Practice ${cat.replace(/_/g, ' ')} techniques`, category: cat, targetScore: 70, estimatedMinutes: 45, completed: false, bestScore: 0 },
      { drillId: uid(), title: `${cat} — Advanced`, description: `Master ${cat.replace(/_/g, ' ')} for competition`, category: cat, targetScore: 90, estimatedMinutes: 60, completed: false, bestScore: 0 },
    ];
    phases.push({
      phaseId: uid(), title: `Week ${i + 1}: ${cat.replace(/_/g, ' ')}`,
      description: `Focus on ${cat.replace(/_/g, ' ')} skills`,
      weekNumber: i + 1, focusArea: cat, drills, completed: false,
    });
  }
  return { roadmapId: uid(), userId, competition, phases, currentPhase: 0, totalWeeks: phases.length, completedPhases: 0, startedAt: now() };
}

export function completeRoadmapPhase(roadmap: PracticeRoadmap, phaseId: string): PracticeRoadmap {
  const idx = roadmap.phases.findIndex(p => p.phaseId === phaseId);
  if (idx < 0) return roadmap;
  const newPhases = roadmap.phases.map((p, i) => i === idx ? { ...p, completed: true } : p);
  return { ...roadmap, phases: newPhases, currentPhase: Math.min(idx + 1, roadmap.phases.length - 1), completedPhases: roadmap.completedPhases + 1 };
}

export function completeDrill(roadmap: PracticeRoadmap, phaseId: string, drillId: string, score: number): PracticeRoadmap {
  const newPhases = roadmap.phases.map(p => {
    if (p.phaseId !== phaseId) return p;
    const newDrills = p.drills.map(d => d.drillId === drillId ? { ...d, completed: score >= d.targetScore, bestScore: Math.max(d.bestScore, score) } : d);
    return { ...p, drills: newDrills };
  });
  return { ...roadmap, phases: newPhases };
}

export function getRoadmapProgress(roadmap: PracticeRoadmap): number {
  return roadmap.totalWeeks > 0 ? Math.round((roadmap.completedPhases / roadmap.totalWeeks) * 100) : 0;
}

// ─── Performance Analysis ──────────────────────────────────────

export function analyzePerformance(userId: string, competition: string, scores: Record<CoachCategory, number>, history: PerformanceTrend[]): PerformanceAnalysis {
  const entries = Object.entries(scores) as [CoachCategory, number][];
  const overallScore = entries.length > 0 ? Math.round(entries.reduce((a, [_, v]) => a + v, 0) / entries.length) : 0;
  const breakdown: Record<string, CategoryAnalysis> = {};
  for (const [cat, score] of entries) {
    const pastScores = history.filter(h => h.category === cat);
    const improvement = pastScores.length > 0 ? score - pastScores[pastScores.length - 1].score : 0;
    const rank = score >= 90 ? 'Master' : score >= 75 ? 'Expert' : score >= 55 ? 'Proficient' : score >= 30 ? 'Beginner' : 'Novice';
    const tips = score < 50 ? ['Practice daily', 'Watch tutorial videos', 'Start with easier challenges'] : score < 75 ? ['Focus on precision', 'Optimize your code'] : ['Fine-tune for competition', 'Practice under time pressure'];
    breakdown[cat] = { score, rank, improvement, practiceCount: pastScores.length, tips };
  }
  const recommendations = entries.filter(([_, v]) => v < 50).map(([k]) => `Focus on improving ${k.replace(/_/g, ' ')}`);
  if (recommendations.length === 0) recommendations.push('You\'re well-prepared! Practice maintaining consistency.');
  return {
    analysisId: uid(), userId, competition, overallScore,
    categoryBreakdown: breakdown as Record<CoachCategory, CategoryAnalysis>,
    trends: history, recommendations, createdAt: now(),
  };
}

// ─── Project Recommendations ──────────────────────────────────

export function recommendProjects(profile: CoachProfile, count: number = 3): ProjectRecommendation[] {
  const projectTemplates: Record<CoachCategory, { title: string; components: string[]; skills: string[] }> = {
    line_following: { title: 'Line Following Robot', components: ['ESP32', 'IR Sensor x2', 'Motor Driver', 'DC Motor x2'], skills: ['PID Control', 'Sensor Calibration', 'Motor Speed'] },
    obstacle_avoidance: { title: 'Obstacle Avoidance Bot', components: ['ESP32', 'HC-SR04 x2', 'Servo', 'Motor Driver', 'DC Motor x2'], skills: ['Distance Sensing', 'Path Planning', 'Servo Control'] },
    speed_trial: { title: 'Speed Trial Racer', components: ['ESP32', 'Motor Driver', 'High-speed DC Motor x2', 'Encoder x2'], skills: ['Speed Optimization', 'Encoder Reading', 'Acceleration Control'] },
    maze_solving: { title: 'Maze Solver Robot', components: ['ESP32', 'HC-SR04 x3', 'Motor Driver', 'DC Motor x2'], skills: ['Wall Following', 'Mapping', 'Decision Trees'] },
    sumo: { title: 'Sumo Wrestling Bot', components: ['ESP32', 'IR Sensor x4', 'Motor Driver', 'Geared Motor x2', 'Scoop'], skills: ['Edge Detection', 'Opponent Detection', 'Power Management'] },
    freestyle: { title: 'Creative Innovation Project', components: ['ESP32', 'Various Sensors', 'Actuators', 'Display'], skills: ['System Integration', 'Creative Design', 'Problem Solving'] },
  };
  const recs: ProjectRecommendation[] = [];
  const targets = profile.weakAreas.length > 0 ? profile.weakAreas : Object.keys(profile.categoryScores);
  for (let i = 0; i < Math.min(count, targets.length); i++) {
    const cat = targets[i] as CoachCategory;
    const template = projectTemplates[cat] ?? projectTemplates.freestyle;
    const difficulty = Math.max(1, Math.min(10, Math.ceil((profile.categoryScores[cat] ?? 0) / 10)));
    recs.push({
      recommendationId: uid(), userId: profile.userId, title: template.title,
      description: `Build a ${cat.replace(/_/g, ' ')} project to improve your competition skills`,
      category: cat, difficulty, components: template.components,
      skills: template.skills, estimatedHours: 2 + difficulty,
    });
  }
  return recs;
}

// ─── Skill Scoring ─────────────────────────────────────────────

export function calculateSkillScore(profile: CoachProfile): number {
  const scores = Object.values(profile.categoryScores);
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export function getCompetitionReadiness(profile: CoachProfile): { readiness: ReadinessLevel; score: number; daysNeeded: number } {
  const score = calculateSkillScore(profile);
  const readiness = profile.overallReadiness;
  const daysNeeded = readiness === 'competition_ready' ? 0 : readiness === 'ready' ? 3 : readiness === 'almost_ready' ? 14 : readiness === 'needs_practice' ? 30 : 60;
  return { readiness, score, daysNeeded };
}
