/**
 * Phase 38A — Learning Analytics Runtime Tests
 */
import { describe, it, expect } from 'vitest';
import {
  calculateCompletionRate, calculateDropOff, calculateSkillMastery,
  detectAtRiskStudents, calculateTrendDirection, calculateJudgeConsistency,
  rankStudents, getTopAssets, calculateAdoptionRate,
  LearningAnalyticsSynchronizer,
} from '../src/stage/learning-analytics-runtime';
import type {
  StudentProgression, AssetPerformance,
} from '../src/stage/learning-analytics-runtime';

describe('Phase 38A: Learning Analytics', () => {
  it('calculates completion rates over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      expect(calculateCompletionRate(100, 85)).toBe(85);
      expect(calculateCompletionRate(0, 0)).toBe(0);
      expect(calculateCompletionRate(50, 50)).toBe(100);
    }
  });

  it('calculates drop-off over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      expect(calculateDropOff(100, 20)).toBe(20);
      expect(calculateDropOff(0, 0)).toBe(0);
    }
  });

  it('calculates skill mastery over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      expect(calculateSkillMastery(100, 80)).toBe(80);
      expect(calculateSkillMastery(0, 0)).toBe(0);
      expect(calculateSkillMastery(10, 20)).toBe(100); // capped
    }
  });

  it('detects at-risk students over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const students: StudentProgression[] = [
        { studentId: 's1', studentName: 'Good', currentLevel: 5, totalXp: 1000, lessonsCompleted: 20, assignmentsSubmitted: 10, avgGrade: 90, streak: 7, lastActiveAt: Date.now(), riskLevel: 'low' },
        { studentId: 's2', studentName: 'AtRisk', currentLevel: 2, totalXp: 200, lessonsCompleted: 3, assignmentsSubmitted: 1, avgGrade: 40, streak: 0, lastActiveAt: Date.now() - 10 * 86400000, riskLevel: 'high' },
        { studentId: 's3', studentName: 'Inactive', currentLevel: 3, totalXp: 500, lessonsCompleted: 10, assignmentsSubmitted: 5, avgGrade: 70, streak: 0, lastActiveAt: Date.now() - 14 * 86400000, riskLevel: 'medium' },
      ];
      const atRisk = detectAtRiskStudents(students, 7);
      expect(atRisk).toHaveLength(2);
    }
  });

  it('calculates trend direction over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      expect(calculateTrendDirection([50, 55, 60, 70, 80])).toBe('improving');
      expect(calculateTrendDirection([80, 70, 60, 50, 40])).toBe('declining');
      expect(calculateTrendDirection([70, 71, 70, 69, 70])).toBe('stable');
    }
  });

  it('calculates judge consistency over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const consistent = calculateJudgeConsistency([75, 76, 74, 75, 76]);
      expect(consistent).toBeGreaterThan(95);
      const inconsistent = calculateJudgeConsistency([30, 90, 40, 85, 50]);
      expect(inconsistent).toBeLessThan(60);
    }
  });

  it('ranks students and finds top assets over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const students: StudentProgression[] = [
        { studentId: 's1', studentName: 'A', currentLevel: 3, totalXp: 500, lessonsCompleted: 10, assignmentsSubmitted: 5, avgGrade: 70, streak: 3, lastActiveAt: Date.now(), riskLevel: 'low' },
        { studentId: 's2', studentName: 'B', currentLevel: 5, totalXp: 1000, lessonsCompleted: 20, assignmentsSubmitted: 10, avgGrade: 90, streak: 7, lastActiveAt: Date.now(), riskLevel: 'low' },
      ];
      const ranked = rankStudents(students);
      expect(ranked[0].studentId).toBe('s2');

      const assets: AssetPerformance[] = [
        { assetId: 'a1', name: 'LED Kit', downloads: 500, rating: 4.5, revenue: 100, conversionRate: 0.05, trending: true },
        { assetId: 'a2', name: 'Resistor Pack', downloads: 1000, rating: 4.8, revenue: 200, conversionRate: 0.08, trending: true },
      ];
      const top = getTopAssets(assets, 1);
      expect(top[0].assetId).toBe('a2');
    }
  });

  it('calculates adoption rate over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      expect(calculateAdoptionRate(500, 1000)).toBe(50);
      expect(calculateAdoptionRate(0, 0)).toBe(0);
    }
  });

  it('LearningAnalyticsSynchronizer lifecycle', () => {
    const sync = new LearningAnalyticsSynchronizer();
    for (let i = 0; i < 100; i++) {
      sync.addCompletionRate({ courseId: `c${i}`, courseName: `Course ${i}`, enrolled: 100, completed: 80, rate: 80, avgCompletionDays: 14 });
      sync.setProgression({ studentId: `s${i}`, studentName: `S${i}`, currentLevel: 3, totalXp: 500, lessonsCompleted: 10, assignmentsSubmitted: 5, avgGrade: 75, streak: 5, lastActiveAt: Date.now(), riskLevel: 'low' });
    }
    expect(sync.getCompletionRates()).toHaveLength(100);
    expect(sync.getAllProgressions()).toHaveLength(100);
    const clone = sync.clone();
    expect(clone.getCompletionRates()).toHaveLength(100);
    sync.clear();
    expect(sync.getCompletionRates()).toHaveLength(0);
  });
});
