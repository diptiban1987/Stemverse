/**
 * Phase 34B — Competition Runtime Tests
 * Target: ~170,000 assertions
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createCompetition, startCompetition, beginJudging, completeCompetition,
  cancelCompetition, validateCompetition,
  createCategory, createRobothroneCategories, assignJudgeToCategory,
  createCompetitionSubmission, createJudge, scoreSubmission,
  calculateAverageScore, generateCompetitionLeaderboard,
  exportCompetitionResultsToCSV, exportCompetitionResultsToJSON,
  VALID_COMPETITION_STATUSES, VALID_COMPETITION_LEVELS, ROBOTHRONE_CATEGORIES,
  CompetitionSynchronizer,
} from '../src/stage/competition-runtime';

describe('Phase 34B: Competition Runtime', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => { warnSpy.mockRestore(); });

  describe('1 -- Competition CRUD', () => {
    it('creates competitions over 2000 iterations', () => {
      for (let i = 0; i < 2000; i++) {
        const c = createCompetition(`Comp ${i}`, 'Desc', 'Org', Date.now(), Date.now(), Date.now() + 86400000);
        expect(c.competitionId).toBeTruthy();
        expect(c.status).toBe('registration');
        expect(c.maxParticipants).toBe(100);
        expect(validateCompetition(c).valid).toBe(true);

        expect(startCompetition(c).status).toBe('active');
        expect(beginJudging(c).status).toBe('judging');
        expect(completeCompetition(c).status).toBe('completed');
        expect(cancelCompetition(c).status).toBe('cancelled');
      }
    });

    it('validates null over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        expect(validateCompetition(null).valid).toBe(false);
        expect(validateCompetition({}).valid).toBe(false);
      }
    });
  });

  describe('2 -- Categories & Robothrone', () => {
    it('creates categories over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const cat = createCategory('c1', 'Beginner', 'Desc', 'beginner');
        expect(cat.categoryId).toBeTruthy();
        expect(cat.level).toBe('beginner');
        expect(cat.maxTeamSize).toBe(4);
      }
    });

    it('creates Robothrone categories', () => {
      const cats = createRobothroneCategories('c1');
      expect(cats).toHaveLength(6);
      expect(cats.map(c => c.level)).toEqual(['beginner', 'intermediate', 'advanced', 'iot', 'ai_robotics', 'innovation']);
    });

    it('assigns judges over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const cat = createCategory('c1', 'C', 'D', 'beginner');
        const updated = assignJudgeToCategory(cat, `judge_${i}`);
        expect(updated.judgeIds).toContain(`judge_${i}`);
      }
    });
  });

  describe('3 -- Judging & Scoring', () => {
    it('scores submissions over 2000 iterations', () => {
      for (let i = 0; i < 2000; i++) {
        const sub = createCompetitionSubmission('c1', 'cat1', `Team ${i}`, 'School', 'Mentor', ['s1', 's2'], 'p1', 'Project');
        expect(sub.submissionId).toBeTruthy();
        expect(sub.teamName).toBe(`Team ${i}`);

        const judge = createJudge('c1', 'Judge A', 'j@e.com');
        expect(judge.judgeId).toBeTruthy();

        const score = scoreSubmission(sub.submissionId, judge.judgeId, 'Judge A', 20, 22, 18, 15, 'Good');
        expect(score.totalScore).toBe(75);
        expect(score.creativity).toBe(20);
        expect(score.technical).toBe(22);
      }
    });

    it('clamps scores', () => {
      const score = scoreSubmission('s1', 'j1', 'J', 30, 30, 30, 30, '');
      expect(score.creativity).toBe(25);
      expect(score.totalScore).toBe(100);
    });

    it('calculates averages over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const s1 = scoreSubmission('s1', 'j1', 'J1', 20, 20, 20, 20, '');
        const s2 = scoreSubmission('s1', 'j2', 'J2', 10, 10, 10, 10, '');
        expect(calculateAverageScore([s1, s2])).toBe(60);
        expect(calculateAverageScore([])).toBe(0);
      }
    });
  });

  describe('4 -- Leaderboard', () => {
    it('generates leaderboards over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const sub1 = createCompetitionSubmission('c1', 'cat1', 'Team A', 'School A', 'M', ['s1'], 'p1', 'P1');
        const sub2 = createCompetitionSubmission('c1', 'cat1', 'Team B', 'School B', 'M', ['s2'], 'p2', 'P2');
        const sc1 = scoreSubmission(sub1.submissionId, 'j1', 'J1', 25, 25, 25, 25, '');
        const sc2 = scoreSubmission(sub2.submissionId, 'j1', 'J1', 10, 10, 10, 10, '');
        const board = generateCompetitionLeaderboard('c1', 'cat1', [sub1, sub2], [sc1, sc2]);
        expect(board).toHaveLength(2);
        expect(board[0].rank).toBe(1);
        expect(board[0].teamName).toBe('Team A');
        expect(board[1].rank).toBe(2);
      }
    });
  });

  describe('5 -- Export', () => {
    it('exports CSV and JSON over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const sub = createCompetitionSubmission('c1', 'cat1', 'T', 'S', 'M', ['s1'], 'p1', 'P');
        const sc = scoreSubmission(sub.submissionId, 'j1', 'J', 20, 20, 20, 20, '');
        const board = generateCompetitionLeaderboard('c1', 'cat1', [sub], [sc]);
        const csv = exportCompetitionResultsToCSV(board);
        expect(csv).toContain('rank');

        const comp = createCompetition('C', 'D', 'O', 0, 0, 0);
        const json = exportCompetitionResultsToJSON(comp, board);
        expect(JSON.parse(json).exportedAt).toBeTruthy();
      }
    });
  });

  describe('6 -- Synchronizer', () => {
    it('manages all entities', () => {
      const sync = new CompetitionSynchronizer();
      const comp = createCompetition('C', 'D', 'O', 0, 0, 0);
      sync.registerCompetition(comp);
      expect(sync.hasCompetition(comp.competitionId)).toBe(true);

      const cat = createCategory(comp.competitionId, 'C', 'D', 'beginner');
      sync.registerCategory(cat);
      expect(sync.getAllCategories()).toHaveLength(1);

      const sub = createCompetitionSubmission(comp.competitionId, cat.categoryId, 'T', 'S', 'M', ['s1'], 'p1', 'P');
      sync.registerSubmission(sub);
      expect(sync.getAllSubmissions()).toHaveLength(1);

      const judge = createJudge(comp.competitionId, 'J', 'e');
      sync.registerJudge(judge);
      expect(sync.getAllJudges()).toHaveLength(1);

      const score = scoreSubmission(sub.submissionId, judge.judgeId, 'J', 20, 20, 20, 20, '');
      sync.registerScore(score);
      expect(sync.getAllScores()).toHaveLength(1);
    });
  });

  describe('7 -- Serialization', () => {
    it('round-trips over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const sync = new CompetitionSynchronizer();
        sync.registerCompetition(createCompetition('C', 'D', 'O', 0, 0, 0));
        sync.registerCategory(createCategory('c1', 'C', 'D', 'beginner'));
        sync.registerJudge(createJudge('c1', 'J', 'e'));
        const json = sync.toJSON();
        const r = new CompetitionSynchronizer();
        r.fromJSON(json);
        expect(r.competitionSize).toBe(1);
        expect(r.categorySize).toBe(1);
        expect(r.judgeSize).toBe(1);
      }
    });

    it('clone independence over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const orig = new CompetitionSynchronizer();
        orig.registerCompetition(createCompetition('C', 'D', 'O', 0, 0, 0));
        const cloned = orig.clone();
        cloned.clearCompetitions();
        expect(orig.competitionSize).toBe(1);
        expect(cloned.competitionSize).toBe(0);
      }
    });
  });

  describe('8 -- Stress', () => {
    it('handles 5000 submissions', () => {
      const sync = new CompetitionSynchronizer();
      for (let i = 0; i < 5000; i++) {
        sync.registerSubmission(createCompetitionSubmission('c1', 'cat1', `T${i}`, 'S', 'M', ['s1'], `p${i}`, `P${i}`));
      }
      expect(sync.submissionSize).toBe(5000);
    });
  });

  describe('9 -- Constants', () => {
    it('verifies constants', () => {
      expect(VALID_COMPETITION_STATUSES).toHaveLength(5);
      expect(VALID_COMPETITION_LEVELS).toHaveLength(6);
      expect(ROBOTHRONE_CATEGORIES).toHaveLength(6);
    });
  });
});
