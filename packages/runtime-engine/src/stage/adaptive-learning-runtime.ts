/**
 * Phase 41A — Adaptive Learning Runtime
 *
 * Skill tracking, knowledge graph, difficulty progression,
 * weakness/strength detection, personalized lesson sequencing.
 */

// ─── Types ─────────────────────────────────────────────────────

export type SkillCategory =
  | 'circuits' | 'blockly' | 'arduino' | 'robotics' | 'sensors'
  | 'electronics_theory' | 'programming' | 'debugging' | 'design' | 'competition';

export type MasteryLevel = 'novice' | 'beginner' | 'intermediate' | 'proficient' | 'expert' | 'master';
export type LessonStatus = 'locked' | 'available' | 'in_progress' | 'completed' | 'mastered';

export interface SkillNode {
  readonly skillId: string;
  readonly name: string;
  readonly category: SkillCategory;
  readonly currentXp: number;
  readonly maxXp: number;
  readonly mastery: MasteryLevel;
  readonly practiceCount: number;
  readonly lastPracticed: number;
  readonly prerequisites: string[];
}

export interface KnowledgeGraph {
  readonly graphId: string;
  readonly userId: string;
  readonly skills: SkillNode[];
  readonly totalSkills: number;
  readonly masteredSkills: number;
  readonly weakSkills: string[];
  readonly strongSkills: string[];
  readonly recommendedSkills: string[];
  readonly lastUpdated: number;
}

export interface DifficultyProfile {
  readonly userId: string;
  readonly currentDifficulty: number;
  readonly successRate: number;
  readonly averageTime: number;
  readonly streakCorrect: number;
  readonly streakIncorrect: number;
  readonly totalAttempts: number;
  readonly correctAttempts: number;
  readonly adjustmentHistory: DifficultyAdjustment[];
}

export interface DifficultyAdjustment {
  readonly timestamp: number;
  readonly previousDifficulty: number;
  readonly newDifficulty: number;
  readonly reason: string;
}

export interface AdaptiveLesson {
  readonly lessonId: string;
  readonly title: string;
  readonly description: string;
  readonly skillId: string;
  readonly difficulty: number;
  readonly estimatedMinutes: number;
  readonly status: LessonStatus;
  readonly order: number;
  readonly prerequisites: string[];
  readonly xpReward: number;
}

export interface LessonSequence {
  readonly sequenceId: string;
  readonly userId: string;
  readonly lessons: AdaptiveLesson[];
  readonly currentIndex: number;
  readonly completedCount: number;
  readonly totalXpEarned: number;
  readonly startedAt: number;
  readonly lastActivityAt: number;
}

export interface StudentProfile {
  readonly profileId: string;
  readonly userId: string;
  readonly skillLevels: Record<string, number>;
  readonly learningSpeed: number;
  readonly completedTopics: string[];
  readonly weakTopics: string[];
  readonly recommendedTopics: string[];
  readonly achievementReadiness: number;
  readonly competitionReadiness: number;
  readonly totalPracticeHours: number;
  readonly preferredDifficulty: number;
  readonly lastActive: number;
}

// ─── Helpers ──────────────────────────────────────────────────

let _seq = 0;
function uid(): string { return `adapt_${Date.now()}_${++_seq}`; }
const now = () => Date.now();

// ─── Mastery Thresholds ────────────────────────────────────────

const MASTERY_THRESHOLDS: Record<MasteryLevel, number> = {
  novice: 0, beginner: 100, intermediate: 300,
  proficient: 600, expert: 1000, master: 1500,
};

export function getMasteryLevel(xp: number): MasteryLevel {
  if (xp >= MASTERY_THRESHOLDS.master) return 'master';
  if (xp >= MASTERY_THRESHOLDS.expert) return 'expert';
  if (xp >= MASTERY_THRESHOLDS.proficient) return 'proficient';
  if (xp >= MASTERY_THRESHOLDS.intermediate) return 'intermediate';
  if (xp >= MASTERY_THRESHOLDS.beginner) return 'beginner';
  return 'novice';
}

export function getMasteryThresholds(): Record<MasteryLevel, number> {
  return { ...MASTERY_THRESHOLDS };
}

// ─── Skill Management ──────────────────────────────────────────

export function createSkillNode(name: string, category: SkillCategory, prerequisites: string[] = []): SkillNode {
  return {
    skillId: uid(), name, category,
    currentXp: 0, maxXp: MASTERY_THRESHOLDS.master,
    mastery: 'novice', practiceCount: 0, lastPracticed: 0,
    prerequisites,
  };
}

export function addSkillXp(skill: SkillNode, xp: number): SkillNode {
  const newXp = Math.min(skill.maxXp, skill.currentXp + Math.max(0, xp));
  return {
    ...skill,
    currentXp: newXp,
    mastery: getMasteryLevel(newXp),
    practiceCount: skill.practiceCount + 1,
    lastPracticed: now(),
  };
}

export function isSkillMastered(skill: SkillNode): boolean {
  return skill.mastery === 'master';
}

export function getSkillProgress(skill: SkillNode): number {
  return skill.maxXp > 0 ? Math.round((skill.currentXp / skill.maxXp) * 100) : 0;
}

// ─── Knowledge Graph ───────────────────────────────────────────

export function createKnowledgeGraph(userId: string): KnowledgeGraph {
  const defaultSkills: SkillNode[] = [
    createSkillNode('Basic Circuits', 'circuits'),
    createSkillNode('LED Circuits', 'circuits', ['Basic Circuits']),
    createSkillNode('Resistor Networks', 'circuits', ['Basic Circuits']),
    createSkillNode('Capacitor Circuits', 'circuits', ['Resistor Networks']),
    createSkillNode('Blockly Basics', 'blockly'),
    createSkillNode('Blockly Loops', 'blockly', ['Blockly Basics']),
    createSkillNode('Blockly Conditions', 'blockly', ['Blockly Basics']),
    createSkillNode('Blockly Functions', 'blockly', ['Blockly Loops', 'Blockly Conditions']),
    createSkillNode('Arduino Basics', 'arduino', ['Basic Circuits']),
    createSkillNode('Digital I/O', 'arduino', ['Arduino Basics']),
    createSkillNode('Analog I/O', 'arduino', ['Digital I/O']),
    createSkillNode('PWM Control', 'arduino', ['Digital I/O']),
    createSkillNode('Sensor Integration', 'sensors', ['Analog I/O']),
    createSkillNode('Ultrasonic Sensor', 'sensors', ['Sensor Integration']),
    createSkillNode('IR Sensor', 'sensors', ['Sensor Integration']),
    createSkillNode('Motor Control', 'robotics', ['PWM Control']),
    createSkillNode('Differential Drive', 'robotics', ['Motor Control']),
    createSkillNode('Line Following', 'robotics', ['Differential Drive', 'IR Sensor']),
    createSkillNode('Obstacle Avoidance', 'robotics', ['Differential Drive', 'Ultrasonic Sensor']),
    createSkillNode('Competition Design', 'competition', ['Line Following', 'Obstacle Avoidance']),
  ];
  return {
    graphId: uid(), userId, skills: defaultSkills,
    totalSkills: defaultSkills.length, masteredSkills: 0,
    weakSkills: defaultSkills.map(s => s.name),
    strongSkills: [],
    recommendedSkills: ['Basic Circuits', 'Blockly Basics'],
    lastUpdated: now(),
  };
}

export function updateKnowledgeGraph(graph: KnowledgeGraph, skillName: string, xp: number): KnowledgeGraph {
  const skills = graph.skills.map(s => s.name === skillName ? addSkillXp(s, xp) : s);
  const mastered = skills.filter(s => s.mastery === 'master' || s.mastery === 'expert');
  const weak = skills.filter(s => s.mastery === 'novice' || s.mastery === 'beginner');
  const recommended = skills.filter(s => {
    if (s.mastery !== 'novice' && s.mastery !== 'beginner') return false;
    return s.prerequisites.every(p => {
      const prereq = skills.find(sk => sk.name === p);
      return prereq && (prereq.mastery === 'intermediate' || prereq.mastery === 'proficient' || prereq.mastery === 'expert' || prereq.mastery === 'master');
    });
  });
  return {
    ...graph, skills,
    masteredSkills: mastered.length,
    strongSkills: mastered.map(s => s.name),
    weakSkills: weak.map(s => s.name),
    recommendedSkills: recommended.map(s => s.name),
    lastUpdated: now(),
  };
}

export function getSkillByName(graph: KnowledgeGraph, name: string): SkillNode | null {
  return graph.skills.find(s => s.name === name) ?? null;
}

// ─── Difficulty Progression ─────────────────────────────────────

export function createDifficultyProfile(userId: string): DifficultyProfile {
  return {
    userId, currentDifficulty: 1.0, successRate: 0,
    averageTime: 0, streakCorrect: 0, streakIncorrect: 0,
    totalAttempts: 0, correctAttempts: 0, adjustmentHistory: [],
  };
}

export function recordAttempt(profile: DifficultyProfile, correct: boolean, timeSeconds: number): DifficultyProfile {
  const totalAttempts = profile.totalAttempts + 1;
  const correctAttempts = profile.correctAttempts + (correct ? 1 : 0);
  const successRate = Math.round((correctAttempts / totalAttempts) * 100);
  const avgTime = Math.round((profile.averageTime * profile.totalAttempts + timeSeconds) / totalAttempts);
  const streakCorrect = correct ? profile.streakCorrect + 1 : 0;
  const streakIncorrect = correct ? 0 : profile.streakIncorrect + 1;

  let newDifficulty = profile.currentDifficulty;
  let reason = '';
  if (streakCorrect >= 3 && successRate > 80) { newDifficulty = Math.min(10, profile.currentDifficulty + 0.5); reason = 'Consistent success — increasing difficulty'; }
  else if (streakIncorrect >= 3 && successRate < 40) { newDifficulty = Math.max(1, profile.currentDifficulty - 0.5); reason = 'Struggling — decreasing difficulty'; }

  const adjustmentHistory = newDifficulty !== profile.currentDifficulty
    ? [...profile.adjustmentHistory, { timestamp: now(), previousDifficulty: profile.currentDifficulty, newDifficulty, reason }]
    : profile.adjustmentHistory;

  return { ...profile, currentDifficulty: newDifficulty, successRate, averageTime: avgTime, streakCorrect, streakIncorrect, totalAttempts, correctAttempts, adjustmentHistory };
}

export function getRecommendedDifficulty(profile: DifficultyProfile): number {
  return profile.currentDifficulty;
}

// ─── Weakness / Strength Detection ──────────────────────────────

export function detectWeaknesses(graph: KnowledgeGraph): string[] {
  return graph.skills
    .filter(s => s.practiceCount > 3 && s.mastery === 'novice')
    .map(s => s.name);
}

export function detectStrengths(graph: KnowledgeGraph): string[] {
  return graph.skills
    .filter(s => s.mastery === 'expert' || s.mastery === 'master')
    .map(s => s.name);
}

// ─── Personalized Lesson Sequencing ─────────────────────────────

export function generateLessonSequence(userId: string, graph: KnowledgeGraph, maxLessons: number = 10): LessonSequence {
  const available = graph.recommendedSkills.length > 0 ? graph.recommendedSkills : graph.weakSkills.slice(0, 5);
  const lessons: AdaptiveLesson[] = available.slice(0, maxLessons).map((skillName, i) => {
    const skill = graph.skills.find(s => s.name === skillName);
    const difficulty = skill ? (skill.mastery === 'novice' ? 1 : skill.mastery === 'beginner' ? 2 : 3) : 1;
    return {
      lessonId: uid(), title: `Lesson: ${skillName}`, description: `Learn ${skillName} fundamentals`,
      skillId: skill?.skillId ?? '', difficulty, estimatedMinutes: 15 + difficulty * 10,
      status: i === 0 ? 'available' as const : 'locked' as const, order: i + 1,
      prerequisites: skill?.prerequisites ?? [], xpReward: difficulty * 50,
    };
  });
  return { sequenceId: uid(), userId, lessons, currentIndex: 0, completedCount: 0, totalXpEarned: 0, startedAt: now(), lastActivityAt: now() };
}

export function completeLesson(sequence: LessonSequence, lessonId: string): LessonSequence {
  const idx = sequence.lessons.findIndex(l => l.lessonId === lessonId);
  if (idx < 0) return sequence;
  const lesson = sequence.lessons[idx];
  const newLessons = sequence.lessons.map((l, i) => {
    if (i === idx) return { ...l, status: 'completed' as const };
    if (i === idx + 1 && l.status === 'locked') return { ...l, status: 'available' as const };
    return l;
  });
  return {
    ...sequence, lessons: newLessons,
    currentIndex: Math.min(idx + 1, sequence.lessons.length - 1),
    completedCount: sequence.completedCount + 1,
    totalXpEarned: sequence.totalXpEarned + lesson.xpReward,
    lastActivityAt: now(),
  };
}

export function getSequenceProgress(sequence: LessonSequence): number {
  return sequence.lessons.length > 0 ? Math.round((sequence.completedCount / sequence.lessons.length) * 100) : 0;
}

// ─── Student AI Profile ──────────────────────────────────────────

export function createStudentAIProfile(userId: string): StudentProfile {
  return {
    profileId: uid(), userId, skillLevels: {},
    learningSpeed: 1.0, completedTopics: [], weakTopics: [],
    recommendedTopics: ['Basic Circuits', 'Blockly Basics'],
    achievementReadiness: 0, competitionReadiness: 0,
    totalPracticeHours: 0, preferredDifficulty: 1,
    lastActive: now(),
  };
}

export function updateStudentProfile(profile: StudentProfile, topic: string, score: number, timeMinutes: number): StudentProfile {
  const newLevels = { ...profile.skillLevels, [topic]: Math.max(profile.skillLevels[topic] ?? 0, score) };
  const completedTopics = score >= 80 && !profile.completedTopics.includes(topic)
    ? [...profile.completedTopics, topic] : profile.completedTopics;
  const weakTopics = Object.entries(newLevels).filter(([_, v]) => v < 50).map(([k]) => k);
  const strongTopics = Object.entries(newLevels).filter(([_, v]) => v >= 80);
  const achievementReadiness = Math.min(100, strongTopics.length * 15);
  const competitionReadiness = Math.min(100, strongTopics.length * 10);
  const totalHours = profile.totalPracticeHours + timeMinutes / 60;
  const speed = totalHours > 0 ? Math.min(3, completedTopics.length / totalHours) : 1;
  return {
    ...profile, skillLevels: newLevels, completedTopics, weakTopics,
    recommendedTopics: weakTopics.length > 0 ? weakTopics.slice(0, 5) : ['Advanced Circuits'],
    achievementReadiness, competitionReadiness,
    totalPracticeHours: Math.round(totalHours * 100) / 100,
    learningSpeed: Math.round(speed * 100) / 100,
    preferredDifficulty: score > 80 ? Math.min(10, profile.preferredDifficulty + 0.5) : profile.preferredDifficulty,
    lastActive: now(),
  };
}

export function getCompetitionReadiness(profile: StudentProfile): number {
  return profile.competitionReadiness;
}

export function getAchievementReadiness(profile: StudentProfile): number {
  return profile.achievementReadiness;
}
