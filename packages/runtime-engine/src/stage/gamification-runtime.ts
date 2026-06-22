/**
 * Phase 39B — Streak, Challenge, Community, Leaderboard, Reward,
 *              Engagement Analytics Runtimes (combined)
 */

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => Date.now();
const DAY_MS = 86400000;

// ═══════════════════════════════════════════════════
// STREAK ENGINE
// ═══════════════════════════════════════════════════

export interface UserStreak {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string;
  recoveryTokens: number;
  weeklyStreak: number;
  monthlyStreak: number;
  milestones: number[];
}

export function createUserStreak(userId: string): UserStreak {
  return { userId, currentStreak: 0, longestStreak: 0, lastActivityDate: '', recoveryTokens: 3, weeklyStreak: 0, monthlyStreak: 0, milestones: [] };
}

export function recordDailyActivity(streak: UserStreak, dateStr: string): UserStreak {
  if (streak.lastActivityDate === dateStr) return streak;
  const yesterday = new Date(new Date(dateStr).getTime() - DAY_MS).toISOString().split('T')[0];
  let current = streak.lastActivityDate === yesterday ? streak.currentStreak + 1 : 1;
  if (streak.lastActivityDate !== yesterday && streak.lastActivityDate !== '' && streak.recoveryTokens > 0) {
    const daysBetween = Math.floor((new Date(dateStr).getTime() - new Date(streak.lastActivityDate).getTime()) / DAY_MS);
    if (daysBetween === 2) { current = streak.currentStreak + 1; return { ...streak, currentStreak: current, longestStreak: Math.max(streak.longestStreak, current), lastActivityDate: dateStr, recoveryTokens: streak.recoveryTokens - 1, milestones: checkStreakMilestones(streak.milestones, current) }; }
  }
  return { ...streak, currentStreak: current, longestStreak: Math.max(streak.longestStreak, current), lastActivityDate: dateStr, milestones: checkStreakMilestones(streak.milestones, current) };
}

function checkStreakMilestones(existing: number[], current: number): number[] {
  const targets = [3, 7, 14, 30, 60, 90, 180, 365];
  const newMilestones = [...existing];
  targets.forEach(t => { if (current >= t && !newMilestones.includes(t)) newMilestones.push(t); });
  return newMilestones;
}

export function useRecoveryToken(streak: UserStreak): UserStreak {
  if (streak.recoveryTokens <= 0) return streak;
  return { ...streak, recoveryTokens: streak.recoveryTokens - 1 };
}

export function getStreakMultiplier(streak: number): number {
  if (streak >= 30) return 0.3;
  if (streak >= 14) return 0.2;
  if (streak >= 7) return 0.1;
  return 0;
}

// ═══════════════════════════════════════════════════
// CHALLENGE ENGINE
// ═══════════════════════════════════════════════════

export type ChallengeType = 'daily' | 'weekly' | 'monthly' | 'classroom' | 'competition' | 'robothrone';

export interface Challenge {
  challengeId: string;
  type: ChallengeType;
  title: string;
  description: string;
  requirement: { action: string; target: number };
  xpReward: number;
  coinReward: number;
  expiresAt: number;
  active: boolean;
}

export interface UserChallenge {
  id: string;
  userId: string;
  challengeId: string;
  progress: number;
  completed: boolean;
  completedAt: number | null;
}

export function createChallenge(type: ChallengeType, title: string, description: string, action: string, target: number, xpReward: number, coinReward: number, durationDays: number): Challenge {
  return { challengeId: uid(), type, title, description, requirement: { action, target }, xpReward, coinReward, expiresAt: now() + durationDays * DAY_MS, active: true };
}

export function getDefaultDailyChallenges(): Challenge[] {
  return [
    createChallenge('daily', 'Build a Circuit', 'Create any circuit', 'create_circuit', 1, 15, 5, 1),
    createChallenge('daily', 'Complete a Lesson', 'Finish one lesson', 'complete_lesson', 1, 20, 5, 1),
    createChallenge('daily', 'Place 10 Components', 'Place 10 electronic components', 'place_component', 10, 10, 3, 1),
  ];
}

export function getDefaultWeeklyChallenges(): Challenge[] {
  return [
    createChallenge('weekly', 'Circuit Week', 'Build 5 circuits', 'create_circuit', 5, 50, 20, 7),
    createChallenge('weekly', 'Study Week', 'Complete 5 lessons', 'complete_lesson', 5, 75, 25, 7),
    createChallenge('weekly', 'Social Week', 'Collaborate 3 times', 'join_collab', 3, 40, 15, 7),
  ];
}

export function startChallenge(userId: string, challengeId: string): UserChallenge {
  return { id: uid(), userId, challengeId, progress: 0, completed: false, completedAt: null };
}

export function updateChallengeProgress(uc: UserChallenge, amount: number, target: number): UserChallenge {
  const progress = Math.min(uc.progress + amount, target);
  return { ...uc, progress, completed: progress >= target, completedAt: progress >= target && !uc.completed ? now() : uc.completedAt };
}

// ═══════════════════════════════════════════════════
// COMMUNITY PLATFORM
// ═══════════════════════════════════════════════════

export type CreatorRank = 'newcomer' | 'contributor' | 'creator' | 'expert' | 'guru' | 'legend';

export interface CommunityProfile {
  userId: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  reputation: number;
  followers: number;
  following: number;
  projectsShared: number;
  assetsPublished: number;
  competitionsWon: number;
  rank: CreatorRank;
  joinedAt: number;
  lastActiveAt: number;
}

export interface ActivityFeedItem {
  feedId: string;
  userId: string;
  type: 'project_shared' | 'achievement_earned' | 'competition_won' | 'asset_published' | 'level_up' | 'streak_milestone' | 'follow';
  content: string;
  timestamp: number;
  likes: number;
}

export function createProfile(userId: string, displayName: string): CommunityProfile {
  return { userId, displayName, bio: '', avatarUrl: '/default-avatar.svg', reputation: 0, followers: 0, following: 0, projectsShared: 0, assetsPublished: 0, competitionsWon: 0, rank: 'newcomer', joinedAt: now(), lastActiveAt: now() };
}

export function calculateCreatorRank(rep: number): CreatorRank {
  if (rep >= 10000) return 'legend';
  if (rep >= 5000) return 'guru';
  if (rep >= 2000) return 'expert';
  if (rep >= 500) return 'creator';
  if (rep >= 100) return 'contributor';
  return 'newcomer';
}

export function addReputation(profile: CommunityProfile, amount: number): CommunityProfile {
  const reputation = profile.reputation + amount;
  return { ...profile, reputation, rank: calculateCreatorRank(reputation), lastActiveAt: now() };
}

export function followUser(follower: CommunityProfile, target: CommunityProfile): { follower: CommunityProfile; target: CommunityProfile } {
  return { follower: { ...follower, following: follower.following + 1 }, target: { ...target, followers: target.followers + 1 } };
}

export function createFeedItem(userId: string, type: ActivityFeedItem['type'], content: string): ActivityFeedItem {
  return { feedId: uid(), userId, type, content, timestamp: now(), likes: 0 };
}

export function likeFeedItem(item: ActivityFeedItem): ActivityFeedItem {
  return { ...item, likes: item.likes + 1 };
}

// ═══════════════════════════════════════════════════
// LEADERBOARD ENGINE
// ═══════════════════════════════════════════════════

export type LeaderboardScope = 'student' | 'teacher' | 'school' | 'district' | 'competition' | 'marketplace' | 'global' | 'regional';
export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'all_time' | 'season';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  score: number;
  level: number;
  change: number;
}

export interface Leaderboard {
  leaderboardId: string;
  scope: LeaderboardScope;
  period: LeaderboardPeriod;
  region: string;
  entries: LeaderboardEntry[];
  updatedAt: number;
}

export function createLeaderboard(scope: LeaderboardScope, period: LeaderboardPeriod, region = 'global'): Leaderboard {
  return { leaderboardId: uid(), scope, period, region, entries: [], updatedAt: now() };
}

export function addLeaderboardEntry(lb: Leaderboard, userId: string, displayName: string, score: number, level: number): Leaderboard {
  const entries = [...lb.entries, { rank: 0, userId, displayName, score, level, change: 0 }]
    .sort((a, b) => b.score - a.score)
    .map((e, i) => ({ ...e, rank: i + 1 }));
  return { ...lb, entries, updatedAt: now() };
}

export function getTopN(lb: Leaderboard, n: number): LeaderboardEntry[] {
  return lb.entries.slice(0, n);
}

export function getUserRank(lb: Leaderboard, userId: string): LeaderboardEntry | undefined {
  return lb.entries.find(e => e.userId === userId);
}

// ═══════════════════════════════════════════════════
// REWARD SYSTEM
// ═══════════════════════════════════════════════════

export type RewardType = 'points' | 'coins' | 'unlockable' | 'certificate' | 'marketplace_credit' | 'competition_entry';

export interface Reward {
  rewardId: string;
  type: RewardType;
  name: string;
  description: string;
  value: number;
  iconUrl: string;
}

export interface UserWallet {
  userId: string;
  points: number;
  coins: number;
  marketplaceCredits: number;
  competitionEntries: number;
  unlockables: string[];
  certificates: string[];
}

export function createReward(type: RewardType, name: string, description: string, value: number): Reward {
  return { rewardId: uid(), type, name, description, value, iconUrl: `/rewards/${type}.svg` };
}

export function createWallet(userId: string): UserWallet {
  return { userId, points: 0, coins: 0, marketplaceCredits: 0, competitionEntries: 0, unlockables: [], certificates: [] };
}

export function addPoints(wallet: UserWallet, amount: number): UserWallet {
  return { ...wallet, points: wallet.points + amount };
}

export function addCoins(wallet: UserWallet, amount: number): UserWallet {
  return { ...wallet, coins: wallet.coins + amount };
}

export function spendCoins(wallet: UserWallet, amount: number): UserWallet {
  if (wallet.coins < amount) return wallet;
  return { ...wallet, coins: wallet.coins - amount };
}

export function addUnlockable(wallet: UserWallet, itemId: string): UserWallet {
  if (wallet.unlockables.includes(itemId)) return wallet;
  return { ...wallet, unlockables: [...wallet.unlockables, itemId] };
}

export function grantReward(wallet: UserWallet, reward: Reward): UserWallet {
  switch (reward.type) {
    case 'points': return addPoints(wallet, reward.value);
    case 'coins': return addCoins(wallet, reward.value);
    case 'marketplace_credit': return { ...wallet, marketplaceCredits: wallet.marketplaceCredits + reward.value };
    case 'competition_entry': return { ...wallet, competitionEntries: wallet.competitionEntries + reward.value };
    case 'unlockable': return addUnlockable(wallet, reward.rewardId);
    case 'certificate': return { ...wallet, certificates: [...wallet.certificates, reward.rewardId] };
    default: return wallet;
  }
}

// ═══════════════════════════════════════════════════
// ENGAGEMENT ANALYTICS
// ═══════════════════════════════════════════════════

export interface EngagementMetrics {
  dau: number;
  wau: number;
  mau: number;
  d1Retention: number;
  d7Retention: number;
  d30Retention: number;
  avgSessionMinutes: number;
  avgStreakLength: number;
  avgXpPerUser: number;
  challengeCompletionRate: number;
  achievementCompletionRate: number;
  communityActivityScore: number;
}

export function calculateEngagementMetrics(dau: number, wau: number, mau: number, d1: number, d7: number, d30: number, avgSession: number, avgStreak: number, avgXp: number, challengeRate: number, achievementRate: number, communityScore: number): EngagementMetrics {
  return { dau, wau, mau, d1Retention: d1, d7Retention: d7, d30Retention: d30, avgSessionMinutes: avgSession, avgStreakLength: avgStreak, avgXpPerUser: avgXp, challengeCompletionRate: challengeRate, achievementCompletionRate: achievementRate, communityActivityScore: communityScore };
}

export function calculateRetentionRate(returnedUsers: number, totalUsers: number): number {
  return totalUsers > 0 ? Math.round((returnedUsers / totalUsers) * 100) : 0;
}

export function calculateEngagementScore(metrics: EngagementMetrics): number {
  const dauRatio = metrics.mau > 0 ? (metrics.dau / metrics.mau) * 100 : 0;
  return Math.round((dauRatio * 0.3 + metrics.d7Retention * 0.25 + metrics.challengeCompletionRate * 0.2 + metrics.achievementCompletionRate * 0.15 + metrics.communityActivityScore * 0.1));
}

// ═══════════════════════════════════════════════════
// SYNCHRONIZERS
// ═══════════════════════════════════════════════════

export class StreakSynchronizer {
  private streaks = new Map<string, UserStreak>();
  setStreak(s: UserStreak) { this.streaks.set(s.userId, { ...s }); }
  getStreak(id: string) { const s = this.streaks.get(id); return s ? { ...s } : undefined; }
  getAllStreaks() { return Array.from(this.streaks.values()).map(s => ({ ...s })); }
  clear() { this.streaks.clear(); }
  toJSON() { return { streaks: this.getAllStreaks() }; }
  fromJSON(d: { streaks?: UserStreak[] }) { this.clear(); (d.streaks || []).forEach(s => this.setStreak(s)); }
  clone(): StreakSynchronizer { const c = new StreakSynchronizer(); c.fromJSON(this.toJSON()); return c; }
}

export class ChallengeSynchronizer {
  private challenges = new Map<string, Challenge>();
  private userChallenges: UserChallenge[] = [];
  addChallenge(c: Challenge) { this.challenges.set(c.challengeId, { ...c }); }
  getAllChallenges() { return Array.from(this.challenges.values()).map(c => ({ ...c })); }
  addUserChallenge(uc: UserChallenge) { this.userChallenges.push({ ...uc }); }
  getUserChallenges(userId: string) { return this.userChallenges.filter(uc => uc.userId === userId).map(uc => ({ ...uc })); }
  clear() { this.challenges.clear(); this.userChallenges = []; }
  toJSON() { return { challenges: this.getAllChallenges(), userChallenges: this.userChallenges }; }
  fromJSON(d: { challenges?: Challenge[]; userChallenges?: UserChallenge[] }) { this.clear(); (d.challenges || []).forEach(c => this.addChallenge(c)); (d.userChallenges || []).forEach(uc => this.addUserChallenge(uc)); }
  clone(): ChallengeSynchronizer { const c = new ChallengeSynchronizer(); c.fromJSON(this.toJSON()); return c; }
}

export class CommunitySynchronizer {
  private profiles = new Map<string, CommunityProfile>();
  private feed: ActivityFeedItem[] = [];
  setProfile(p: CommunityProfile) { this.profiles.set(p.userId, { ...p }); }
  getProfile(id: string) { const p = this.profiles.get(id); return p ? { ...p } : undefined; }
  getAllProfiles() { return Array.from(this.profiles.values()).map(p => ({ ...p })); }
  addFeedItem(f: ActivityFeedItem) { this.feed.push({ ...f }); if (this.feed.length > 10000) this.feed.shift(); }
  getRecentFeed(n = 50) { return this.feed.slice(-n).map(f => ({ ...f })); }
  clear() { this.profiles.clear(); this.feed = []; }
  toJSON() { return { profiles: this.getAllProfiles(), feed: this.feed.slice(-500) }; }
  fromJSON(d: { profiles?: CommunityProfile[]; feed?: ActivityFeedItem[] }) { this.clear(); (d.profiles || []).forEach(p => this.setProfile(p)); (d.feed || []).forEach(f => this.addFeedItem(f)); }
  clone(): CommunitySynchronizer { const c = new CommunitySynchronizer(); c.fromJSON(this.toJSON()); return c; }
}

export class LeaderboardSynchronizer {
  private boards = new Map<string, Leaderboard>();
  addBoard(b: Leaderboard) { this.boards.set(b.leaderboardId, { ...b }); }
  getBoard(id: string) { const b = this.boards.get(id); return b ? { ...b } : undefined; }
  getAllBoards() { return Array.from(this.boards.values()).map(b => ({ ...b })); }
  clear() { this.boards.clear(); }
  toJSON() { return { boards: this.getAllBoards() }; }
  fromJSON(d: { boards?: Leaderboard[] }) { this.clear(); (d.boards || []).forEach(b => this.addBoard(b)); }
  clone(): LeaderboardSynchronizer { const c = new LeaderboardSynchronizer(); c.fromJSON(this.toJSON()); return c; }
}

export class RewardSynchronizer {
  private wallets = new Map<string, UserWallet>();
  private rewards = new Map<string, Reward>();
  setWallet(w: UserWallet) { this.wallets.set(w.userId, { ...w }); }
  getWallet(id: string) { const w = this.wallets.get(id); return w ? { ...w } : undefined; }
  addReward(r: Reward) { this.rewards.set(r.rewardId, { ...r }); }
  getAllRewards() { return Array.from(this.rewards.values()).map(r => ({ ...r })); }
  clear() { this.wallets.clear(); this.rewards.clear(); }
  toJSON() { return { wallets: Array.from(this.wallets.values()), rewards: this.getAllRewards() }; }
  fromJSON(d: { wallets?: UserWallet[]; rewards?: Reward[] }) { this.clear(); (d.wallets || []).forEach(w => this.setWallet(w)); (d.rewards || []).forEach(r => this.addReward(r)); }
  clone(): RewardSynchronizer { const c = new RewardSynchronizer(); c.fromJSON(this.toJSON()); return c; }
}
