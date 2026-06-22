/**
 * Phase 39B — Achievement Runtime Tests
 */
import { describe, it, expect } from 'vitest';
import {
  defineAchievement, getDefaultAchievements,
  startAchievement, updateProgress, markNotified,
  createBadge, createMilestone, updateMilestone,
  AchievementSynchronizer,
} from '../src/stage/achievement-runtime';

describe('Phase 39B: Achievement Runtime', () => {
  it('default achievements', () => {
    const defs = getDefaultAchievements();
    expect(defs).toHaveLength(15);
    expect(defs.filter(d => d.hidden)).toHaveLength(1);
    expect(defs.filter(d => d.rarity === 'legendary')).toHaveLength(3);
  });

  it('defines achievements over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const a = defineAchievement(`Ach ${i}`, 'desc', 'simulator', 'rare', 100, 50);
      expect(a.maxProgress).toBe(50);
      expect(a.xpReward).toBe(100);
    }
  });

  it('progress tracking over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let ua = startAchievement('u1', 'a1');
      expect(ua.completed).toBe(false);
      ua = updateProgress(ua, 30, 100);
      expect(ua.progress).toBe(30);
      ua = updateProgress(ua, 80, 100);
      expect(ua.progress).toBe(100);
      expect(ua.completed).toBe(true);
      expect(ua.earnedAt).not.toBeNull();
      ua = markNotified(ua);
      expect(ua.notified).toBe(true);
    }
  });

  it('badges and milestones over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const badge = createBadge(`Badge ${i}`, 'desc', 'gold', 'simulator');
      expect(badge.tier).toBe('gold');
      let ms = createMilestone('Build 100', 'desc', 100, 50);
      ms = updateMilestone(ms, 60);
      expect(ms.current).toBe(60);
      ms = updateMilestone(ms, 50);
      expect(ms.completed).toBe(true);
    }
  });

  it('AchievementSynchronizer lifecycle', () => {
    const sync = new AchievementSynchronizer();
    getDefaultAchievements().forEach(d => sync.addDefinition(d));
    for (let i = 0; i < 20; i++) sync.addUserAchievement(startAchievement(`u${i}`, sync.getAllDefinitions()[0].achievementId));
    expect(sync.getAllDefinitions()).toHaveLength(15);
    const clone = sync.clone();
    expect(clone.getAllDefinitions()).toHaveLength(15);
    sync.clear();
    expect(sync.getAllDefinitions()).toHaveLength(0);
  });
});
