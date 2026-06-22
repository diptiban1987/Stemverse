/**
 * Phase 39B — XP Runtime Tests
 */
import { describe, it, expect } from 'vitest';
import {
  getLevelTable, calculateLevel, getBaseXp, awardXp,
  createUserLevel, addXpToUser, applyBonusMultiplier,
  XpSynchronizer,
} from '../src/stage/xp-runtime';

describe('Phase 39B: XP Runtime', () => {
  it('level table has 15 levels', () => {
    expect(getLevelTable()).toHaveLength(15);
    expect(getLevelTable()[14].title).toBe('Immortal');
  });

  it('level calculation over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      expect(calculateLevel(0).level).toBe(1);
      expect(calculateLevel(100).level).toBe(2);
      expect(calculateLevel(1000).level).toBe(5);
      expect(calculateLevel(5200).level).toBe(10);
      expect(calculateLevel(15500).level).toBe(15);
    }
  });

  it('XP awarding over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const ev = awardXp('u1', 'lesson', 1.0);
      expect(ev.amount).toBe(20);
      expect(ev.totalAwarded).toBe(20);
      const bonus = awardXp('u1', 'competition', 2.0);
      expect(bonus.totalAwarded).toBe(100);
    }
  });

  it('user level progression over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let user = createUserLevel('u1');
      expect(user.level).toBe(1);
      for (let j = 0; j < 10; j++) {
        user = addXpToUser(user, awardXp('u1', 'lesson'));
      }
      expect(user.totalXp).toBeGreaterThan(0);
      expect(user.level).toBeGreaterThanOrEqual(2);
    }
  });

  it('daily XP limit', () => {
    let user = createUserLevel('u1');
    for (let i = 0; i < 200; i++) {
      user = addXpToUser(user, awardXp('u1', 'competition', 1.0));
    }
    expect(user.totalXp).toBeLessThanOrEqual(500);
    expect(user.dailyXpEarned).toBe(500);
  });

  it('bonus multiplier over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      expect(applyBonusMultiplier(20, false, 0)).toBe(1.0);
      expect(applyBonusMultiplier(20, true, 0)).toBe(1.5);
      expect(applyBonusMultiplier(20, true, 7)).toBe(2.2);
      expect(applyBonusMultiplier(20, true, 30)).toBe(3.0); // capped
    }
  });

  it('XpSynchronizer lifecycle', () => {
    const sync = new XpSynchronizer();
    for (let i = 0; i < 50; i++) sync.setUser(createUserLevel(`u${i}`));
    expect(sync.getAllUsers()).toHaveLength(50);
    const clone = sync.clone();
    expect(clone.getAllUsers()).toHaveLength(50);
    sync.clear();
    expect(sync.getAllUsers()).toHaveLength(0);
  });
});
