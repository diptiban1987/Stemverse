/**
 * Phase 39B — Gamification Runtime Tests
 * Covers: Streaks, Challenges, Community, Leaderboards, Rewards, Engagement
 */
import { describe, it, expect } from 'vitest';
import {
  createUserStreak, recordDailyActivity, useRecoveryToken, getStreakMultiplier,
  createChallenge, getDefaultDailyChallenges, getDefaultWeeklyChallenges,
  startChallenge, updateChallengeProgress,
  createProfile, calculateCreatorRank, addReputation, followUser,
  createFeedItem, likeFeedItem,
  createLeaderboard, addLeaderboardEntry, getTopN, getUserRank,
  createReward, createWallet, addPoints, addCoins, spendCoins,
  addUnlockable, grantReward,
  calculateEngagementMetrics, calculateRetentionRate, calculateEngagementScore,
  StreakSynchronizer, ChallengeSynchronizer, CommunitySynchronizer,
  LeaderboardSynchronizer, RewardSynchronizer,
} from '../src/stage/gamification-runtime';

describe('Phase 39B: Streak Engine', () => {
  it('daily streaks over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let s = createUserStreak('u1');
      s = recordDailyActivity(s, '2025-01-01');
      expect(s.currentStreak).toBe(1);
      s = recordDailyActivity(s, '2025-01-02');
      expect(s.currentStreak).toBe(2);
      s = recordDailyActivity(s, '2025-01-03');
      expect(s.currentStreak).toBe(3);
      expect(s.milestones).toContain(3);
    }
  });

  it('broken streaks and recovery over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let s = createUserStreak('u1');
      s = recordDailyActivity(s, '2025-01-01');
      s = recordDailyActivity(s, '2025-01-02');
      s = recordDailyActivity(s, '2025-01-04'); // skipped day 3, uses recovery
      expect(s.currentStreak).toBe(3);
      expect(s.recoveryTokens).toBe(2);
    }
  });

  it('streak multipliers', () => {
    expect(getStreakMultiplier(0)).toBe(0);
    expect(getStreakMultiplier(7)).toBe(0.1);
    expect(getStreakMultiplier(14)).toBe(0.2);
    expect(getStreakMultiplier(30)).toBe(0.3);
  });
});

describe('Phase 39B: Challenge Engine', () => {
  it('defaults', () => {
    expect(getDefaultDailyChallenges()).toHaveLength(3);
    expect(getDefaultWeeklyChallenges()).toHaveLength(3);
  });

  it('challenge lifecycle over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const ch = createChallenge('daily', 'Test', 'desc', 'create_circuit', 5, 20, 10, 1);
      let uc = startChallenge('u1', ch.challengeId);
      uc = updateChallengeProgress(uc, 3, 5);
      expect(uc.progress).toBe(3);
      expect(uc.completed).toBe(false);
      uc = updateChallengeProgress(uc, 3, 5);
      expect(uc.completed).toBe(true);
    }
  });
});

describe('Phase 39B: Community Platform', () => {
  it('profiles and ranks over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let p = createProfile('u1', 'User');
      expect(p.rank).toBe('newcomer');
      p = addReputation(p, 500);
      expect(p.rank).toBe('creator');
      p = addReputation(p, 9500);
      expect(p.rank).toBe('legend');
    }
  });

  it('follow and feed over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const p1 = createProfile('u1', 'Alice');
      const p2 = createProfile('u2', 'Bob');
      const { follower, target } = followUser(p1, p2);
      expect(follower.following).toBe(1);
      expect(target.followers).toBe(1);
      let item = createFeedItem('u1', 'project_shared', 'Shared a circuit');
      item = likeFeedItem(item);
      expect(item.likes).toBe(1);
    }
  });

  it('creator rank calculation', () => {
    expect(calculateCreatorRank(0)).toBe('newcomer');
    expect(calculateCreatorRank(100)).toBe('contributor');
    expect(calculateCreatorRank(2000)).toBe('expert');
    expect(calculateCreatorRank(10000)).toBe('legend');
  });
});

describe('Phase 39B: Leaderboard Engine', () => {
  it('leaderboards over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let lb = createLeaderboard('student', 'weekly');
      lb = addLeaderboardEntry(lb, 'u1', 'Alice', 500, 5);
      lb = addLeaderboardEntry(lb, 'u2', 'Bob', 800, 7);
      lb = addLeaderboardEntry(lb, 'u3', 'Carol', 600, 6);
      expect(getTopN(lb, 2)).toHaveLength(2);
      expect(lb.entries[0].displayName).toBe('Bob');
      expect(getUserRank(lb, 'u1')?.rank).toBe(3);
    }
  });
});

describe('Phase 39B: Reward System', () => {
  it('wallet operations over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let w = createWallet('u1');
      w = addPoints(w, 100);
      w = addCoins(w, 50);
      expect(w.points).toBe(100);
      expect(w.coins).toBe(50);
      w = spendCoins(w, 20);
      expect(w.coins).toBe(30);
      w = spendCoins(w, 100);
      expect(w.coins).toBe(30); // not enough
      w = addUnlockable(w, 'skin1');
      expect(w.unlockables).toContain('skin1');
      w = addUnlockable(w, 'skin1');
      expect(w.unlockables).toHaveLength(1); // no dupes
    }
  });

  it('grant rewards over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let w = createWallet('u1');
      w = grantReward(w, createReward('points', 'Daily Bonus', 'desc', 10));
      expect(w.points).toBe(10);
      w = grantReward(w, createReward('coins', 'Challenge Reward', 'desc', 5));
      expect(w.coins).toBe(5);
      w = grantReward(w, createReward('marketplace_credit', 'Credit', 'desc', 25));
      expect(w.marketplaceCredits).toBe(25);
    }
  });
});

describe('Phase 39B: Engagement Analytics', () => {
  it('metrics and scoring over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const metrics = calculateEngagementMetrics(5000, 15000, 40000, 70, 55, 40, 25, 7, 150, 65, 45, 70);
      expect(metrics.dau).toBe(5000);
      const score = calculateEngagementScore(metrics);
      expect(score).toBeGreaterThan(0);
      expect(calculateRetentionRate(700, 1000)).toBe(70);
    }
  });
});

describe('Phase 39B: Synchronizers', () => {
  it('all synchronizers', () => {
    const streak = new StreakSynchronizer();
    streak.setStreak(createUserStreak('u1'));
    expect(streak.getAllStreaks()).toHaveLength(1);
    streak.clear();

    const challenge = new ChallengeSynchronizer();
    getDefaultDailyChallenges().forEach(c => challenge.addChallenge(c));
    expect(challenge.getAllChallenges()).toHaveLength(3);
    challenge.clear();

    const community = new CommunitySynchronizer();
    community.setProfile(createProfile('u1', 'Alice'));
    expect(community.getAllProfiles()).toHaveLength(1);
    community.clear();

    const lb = new LeaderboardSynchronizer();
    lb.addBoard(createLeaderboard('global', 'weekly'));
    expect(lb.getAllBoards()).toHaveLength(1);
    lb.clear();

    const reward = new RewardSynchronizer();
    reward.setWallet(createWallet('u1'));
    expect(reward.getWallet('u1')?.points).toBe(0);
    reward.clear();
  });
});
