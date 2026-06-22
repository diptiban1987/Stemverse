/**
 * Phase 38A — Data Warehouse Runtime Tests
 */
import { describe, it, expect } from 'vitest';
import {
  createFact, getFactsByTable, getFactsByDimension,
  createDimension, updateDimension,
  createRollup, createDailyRollup, createWeeklyRollup, createMonthlyRollup,
  calculateTrend, detectGrowthRate,
  createPipeline, runPipeline, getDefaultPipelines,
  DataWarehouseSynchronizer,
} from '../src/stage/data-warehouse-runtime';

describe('Phase 38A: Data Warehouse', () => {
  it('manages fact records over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const fact = createFact('fact_users', { userId: `u${i}`, org: 'school1' }, { sessions: 5, duration: 120 });
      expect(fact.factTable).toBe('fact_users');
      expect(fact.measures.sessions).toBe(5);
    }
  });

  it('queries facts by table and dimension over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const facts = [
        createFact('fact_users', { userId: 'u1' }, { sessions: 5 }),
        createFact('fact_projects', { projectId: 'p1' }, { created: 1 }),
        createFact('fact_users', { userId: 'u2' }, { sessions: 3 }),
      ];
      expect(getFactsByTable(facts, 'fact_users')).toHaveLength(2);
      expect(getFactsByDimension(facts, 'userId', 'u1')).toHaveLength(1);
    }
  });

  it('manages dimensions over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let dim = createDimension('user', `user_${i}`, { name: `User ${i}` });
      expect(dim.type).toBe('user');
      dim = updateDimension(dim, { role: 'student' });
      expect(dim.attributes.role).toBe('student');
    }
  });

  it('creates rollups over 500 iterations', () => {
    const t = Date.now();
    for (let i = 0; i < 500; i++) {
      const facts = [
        { ...createFact('fact_users', {}, { sessions: 5 }), timestamp: t },
        { ...createFact('fact_users', {}, { sessions: 3 }), timestamp: t },
      ];
      const daily = createDailyRollup('fact_users', t, facts);
      expect(daily.period).toBe('daily');
      expect(daily.recordCount).toBe(2);
      expect(daily.aggregates.sessions).toBe(8);

      const weekly = createWeeklyRollup('fact_users', t + 86400000, facts);
      expect(weekly.period).toBe('weekly');

      const monthly = createMonthlyRollup('fact_users', t + 86400000, facts);
      expect(monthly.period).toBe('monthly');
    }
  });

  it('calculates trends over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const t = Date.now();
      const rollups = [
        { ...createRollup('fact_users', 'daily', t, t + 86400000, {}, []), aggregates: { sessions: 100 }, rollupId: `r${i}a` },
        { ...createRollup('fact_users', 'daily', t + 86400000, t + 2 * 86400000, {}, []), aggregates: { sessions: 120 }, rollupId: `r${i}b` },
        { ...createRollup('fact_users', 'daily', t + 2 * 86400000, t + 3 * 86400000, {}, []), aggregates: { sessions: 150 }, rollupId: `r${i}c` },
      ];
      const trend = calculateTrend(rollups, 'sessions');
      expect(trend).toHaveLength(3);
      expect(trend[1].change).toBe(20);
      const growth = detectGrowthRate(trend);
      expect(growth).toBe(50);
    }
  });

  it('manages pipelines', () => {
    const defaults = getDefaultPipelines();
    expect(defaults).toHaveLength(6);
    const p = createPipeline('Test', 'fact_test', 'daily', { count: 'count' });
    const ran = runPipeline(p);
    expect(ran.status).toBe('completed');
  });

  it('DataWarehouseSynchronizer lifecycle', () => {
    const sync = new DataWarehouseSynchronizer();
    for (let i = 0; i < 100; i++) {
      sync.addFact(createFact('fact_users', { userId: `u${i}` }, { sessions: i }));
      sync.addDimension(createDimension('user', `u${i}`));
    }
    expect(sync.getFactCount()).toBe(100);
    expect(sync.getAllDimensions()).toHaveLength(100);
    const clone = sync.clone();
    expect(clone.getFactCount()).toBe(100);
    sync.clear();
    expect(sync.getFactCount()).toBe(0);
  });
});
