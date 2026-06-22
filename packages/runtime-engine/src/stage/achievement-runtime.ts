/**
 * Phase 39B — Achievement Runtime
 *
 * Badges, achievements, milestones, progress tracking,
 * categories, hidden/rare achievements.
 */

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => Date.now();

// ─── Types ───────────────────────────────────────────────────

export type AchievementCategory = 'learning' | 'simulator' | 'competition' | 'marketplace' | 'collaboration' | 'community' | 'streak' | 'special';
export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface AchievementDefinition {
  achievementId: string;
  name: string;
  description: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  xpReward: number;
  iconUrl: string;
  requirement: { type: string; target: number };
  hidden: boolean;
  maxProgress: number;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  progress: number;
  completed: boolean;
  earnedAt: number | null;
  notified: boolean;
}

export interface Badge {
  badgeId: string;
  name: string;
  description: string;
  iconUrl: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  category: AchievementCategory;
}

export interface Milestone {
  milestoneId: string;
  name: string;
  description: string;
  target: number;
  current: number;
  completed: boolean;
  completedAt: number | null;
  xpReward: number;
}

// ─── Achievement Definitions ─────────────────────────────────

export function defineAchievement(name: string, description: string, category: AchievementCategory, rarity: AchievementRarity, xpReward: number, target: number, hidden = false): AchievementDefinition {
  return { achievementId: uid(), name, description, category, rarity, xpReward, iconUrl: `/badges/${category}_${rarity}.svg`, requirement: { type: category, target }, hidden, maxProgress: target };
}

export function getDefaultAchievements(): AchievementDefinition[] {
  return [
    defineAchievement('First Circuit', 'Build your first circuit', 'simulator', 'common', 10, 1),
    defineAchievement('Circuit Master', 'Build 100 circuits', 'simulator', 'rare', 100, 100),
    defineAchievement('LED Expert', 'Place 500 LEDs', 'simulator', 'epic', 250, 500),
    defineAchievement('Wire Wizard', 'Create 1000 wires', 'simulator', 'legendary', 500, 1000),
    defineAchievement('First Lesson', 'Complete your first lesson', 'learning', 'common', 10, 1),
    defineAchievement('Scholar', 'Complete 50 lessons', 'learning', 'rare', 150, 50),
    defineAchievement('Certified', 'Earn first certificate', 'learning', 'uncommon', 50, 1),
    defineAchievement('First Win', 'Win first competition', 'competition', 'uncommon', 75, 1),
    defineAchievement('Champion', 'Win 10 competitions', 'competition', 'epic', 300, 10),
    defineAchievement('Creator', 'Publish first marketplace asset', 'marketplace', 'uncommon', 50, 1),
    defineAchievement('Popular Creator', '1000 downloads on an asset', 'marketplace', 'legendary', 500, 1000),
    defineAchievement('Team Player', 'Join 10 collaboration sessions', 'collaboration', 'uncommon', 50, 10),
    defineAchievement('Social Star', 'Get 100 followers', 'community', 'rare', 100, 100),
    defineAchievement('Streak Legend', '30-day streak', 'streak', 'epic', 200, 30),
    defineAchievement('Hidden Gem', 'Find the easter egg', 'special', 'legendary', 500, 1, true),
  ];
}

// ─── User Achievement Operations ─────────────────────────────

export function startAchievement(userId: string, achievementId: string): UserAchievement {
  return { id: uid(), userId, achievementId, progress: 0, completed: false, earnedAt: null, notified: false };
}

export function updateProgress(ua: UserAchievement, amount: number, maxProgress: number): UserAchievement {
  const newProgress = Math.min(ua.progress + amount, maxProgress);
  const completed = newProgress >= maxProgress;
  return { ...ua, progress: newProgress, completed, earnedAt: completed && !ua.completed ? now() : ua.earnedAt };
}

export function markNotified(ua: UserAchievement): UserAchievement {
  return { ...ua, notified: true };
}

// ─── Badge Operations ────────────────────────────────────────

export function createBadge(name: string, description: string, tier: Badge['tier'], category: AchievementCategory): Badge {
  return { badgeId: uid(), name, description, iconUrl: `/badges/${tier}_${category}.svg`, tier, category };
}

// ─── Milestone Operations ────────────────────────────────────

export function createMilestone(name: string, description: string, target: number, xpReward: number): Milestone {
  return { milestoneId: uid(), name, description, target, current: 0, completed: false, completedAt: null, xpReward };
}

export function updateMilestone(ms: Milestone, amount: number): Milestone {
  const current = Math.min(ms.current + amount, ms.target);
  const completed = current >= ms.target;
  return { ...ms, current, completed, completedAt: completed && !ms.completed ? now() : ms.completedAt };
}

// ─── Synchronizer ────────────────────────────────────────────

export class AchievementSynchronizer {
  private definitions = new Map<string, AchievementDefinition>();
  private userAchievements = new Map<string, UserAchievement>();
  private badges = new Map<string, Badge>();
  private milestones = new Map<string, Milestone>();

  addDefinition(d: AchievementDefinition) { this.definitions.set(d.achievementId, { ...d }); }
  getDefinition(id: string) { const d = this.definitions.get(id); return d ? { ...d } : undefined; }
  getAllDefinitions() { return Array.from(this.definitions.values()).map(d => ({ ...d })); }

  addUserAchievement(ua: UserAchievement) { this.userAchievements.set(ua.id, { ...ua }); }
  getUserAchievements(userId: string) { return Array.from(this.userAchievements.values()).filter(u => u.userId === userId).map(u => ({ ...u })); }
  getCompletedCount(userId: string) { return this.getUserAchievements(userId).filter(u => u.completed).length; }

  addBadge(b: Badge) { this.badges.set(b.badgeId, { ...b }); }
  addMilestone(m: Milestone) { this.milestones.set(m.milestoneId, { ...m }); }
  getAllMilestones() { return Array.from(this.milestones.values()).map(m => ({ ...m })); }

  clear() { this.definitions.clear(); this.userAchievements.clear(); this.badges.clear(); this.milestones.clear(); }

  toJSON() { return { definitions: this.getAllDefinitions(), userAchievements: Array.from(this.userAchievements.values()), badges: Array.from(this.badges.values()), milestones: this.getAllMilestones() }; }
  fromJSON(d: { definitions?: AchievementDefinition[]; userAchievements?: UserAchievement[]; badges?: Badge[]; milestones?: Milestone[] }) {
    this.clear();
    (d.definitions || []).forEach(def => this.addDefinition(def));
    (d.userAchievements || []).forEach(ua => this.addUserAchievement(ua));
    (d.badges || []).forEach(b => this.addBadge(b));
    (d.milestones || []).forEach(m => this.addMilestone(m));
  }
  clone(): AchievementSynchronizer { const c = new AchievementSynchronizer(); c.fromJSON(this.toJSON()); return c; }
}
