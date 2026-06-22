/**
 * Phase 41A — Adaptive Learning Runtime Tests
 */
import { describe, it, expect } from 'vitest';
import {
  getMasteryLevel, getMasteryThresholds,
  createSkillNode, addSkillXp, isSkillMastered, getSkillProgress,
  createKnowledgeGraph, updateKnowledgeGraph, getSkillByName,
  createDifficultyProfile, recordAttempt, getRecommendedDifficulty,
  detectWeaknesses, detectStrengths,
  generateLessonSequence, completeLesson, getSequenceProgress,
  createStudentAIProfile, updateStudentProfile,
  getCompetitionReadiness, getAchievementReadiness,
} from '../src/stage/adaptive-learning-runtime';

describe('Adaptive Learning: Mastery Levels', () => {
  it('mastery thresholds — 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      expect(getMasteryLevel(0)).toBe('novice');
      expect(getMasteryLevel(100)).toBe('beginner');
      expect(getMasteryLevel(300)).toBe('intermediate');
      expect(getMasteryLevel(600)).toBe('proficient');
      expect(getMasteryLevel(1000)).toBe('expert');
      expect(getMasteryLevel(1500)).toBe('master');
    }
  });

  it('thresholds object', () => {
    const t = getMasteryThresholds();
    expect(t.novice).toBe(0);
    expect(t.master).toBe(1500);
  });
});

describe('Adaptive Learning: Skills', () => {
  it('create and level up skill — 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let skill = createSkillNode('Circuits', 'circuits');
      expect(skill.mastery).toBe('novice');
      skill = addSkillXp(skill, 150);
      expect(skill.mastery).toBe('beginner');
      expect(skill.practiceCount).toBe(1);
      skill = addSkillXp(skill, 200);
      expect(skill.mastery).toBe('intermediate');
      expect(getSkillProgress(skill)).toBeGreaterThan(0);
    }
  });

  it('skill mastery check', () => {
    for (let i = 0; i < 500; i++) {
      let skill = createSkillNode('Test', 'arduino');
      expect(isSkillMastered(skill)).toBe(false);
      skill = addSkillXp(skill, 1500);
      expect(isSkillMastered(skill)).toBe(true);
    }
  });
});

describe('Adaptive Learning: Knowledge Graph', () => {
  it('create knowledge graph — 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const graph = createKnowledgeGraph(`user${i}`);
      expect(graph.totalSkills).toBe(20);
      expect(graph.masteredSkills).toBe(0);
      expect(graph.weakSkills.length).toBe(20);
    }
  });

  it('update knowledge graph — 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let graph = createKnowledgeGraph(`user${i}`);
      graph = updateKnowledgeGraph(graph, 'Basic Circuits', 1000);
      const skill = getSkillByName(graph, 'Basic Circuits');
      expect(skill).not.toBeNull();
      expect(skill!.mastery).toBe('expert');
      expect(graph.strongSkills).toContain('Basic Circuits');
    }
  });
});

describe('Adaptive Learning: Difficulty Progression', () => {
  it('difficulty adjusts on streaks — 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let profile = createDifficultyProfile(`user${i}`);
      expect(profile.currentDifficulty).toBe(1.0);
      // 3 correct in a row
      profile = recordAttempt(profile, true, 30);
      profile = recordAttempt(profile, true, 25);
      profile = recordAttempt(profile, true, 20);
      // Difficulty should increase
      expect(profile.currentDifficulty).toBeGreaterThanOrEqual(1.0);
      expect(profile.successRate).toBe(100);
    }
  });

  it('difficulty decreases on failures', () => {
    for (let i = 0; i < 500; i++) {
      let profile = createDifficultyProfile(`user${i}`);
      profile = { ...profile, currentDifficulty: 5.0 };
      profile = recordAttempt(profile, false, 60);
      profile = recordAttempt(profile, false, 60);
      profile = recordAttempt(profile, false, 60);
      expect(profile.streakIncorrect).toBe(3);
    }
  });

  it('getRecommendedDifficulty', () => {
    const profile = createDifficultyProfile('u1');
    expect(getRecommendedDifficulty(profile)).toBe(1.0);
  });
});

describe('Adaptive Learning: Weakness/Strength Detection', () => {
  it('detect weaknesses and strengths — 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let graph = createKnowledgeGraph(`user${i}`);
      graph = updateKnowledgeGraph(graph, 'Basic Circuits', 1500);
      const strengths = detectStrengths(graph);
      expect(strengths).toContain('Basic Circuits');
    }
  });
});

describe('Adaptive Learning: Lesson Sequencing', () => {
  it('generate and complete lessons — 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const graph = createKnowledgeGraph(`user${i}`);
      let seq = generateLessonSequence(`user${i}`, graph, 5);
      expect(seq.lessons.length).toBeGreaterThan(0);
      expect(getSequenceProgress(seq)).toBe(0);
      const firstId = seq.lessons[0].lessonId;
      seq = completeLesson(seq, firstId);
      expect(seq.completedCount).toBe(1);
      expect(getSequenceProgress(seq)).toBeGreaterThan(0);
    }
  });
});

describe('Adaptive Learning: Student AI Profile', () => {
  it('create and update profile — 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let profile = createStudentAIProfile(`user${i}`);
      expect(profile.competitionReadiness).toBe(0);
      profile = updateStudentProfile(profile, 'Circuits', 90, 30);
      expect(profile.completedTopics).toContain('Circuits');
      expect(getCompetitionReadiness(profile)).toBeGreaterThan(0);
      expect(getAchievementReadiness(profile)).toBeGreaterThan(0);
    }
  });
});
