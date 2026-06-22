/**
 * Phase 39B — XP & Level Runtime
 *
 * XP earning, level progression, rewards, daily limits,
 * bonus multipliers, teacher/student XP.
 */

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => Date.now();

// ─── Types ───────────────────────────────────────────────────

export type XpSource = 'lesson' | 'assignment' | 'project' | 'competition' | 'achievement' | 'streak' | 'challenge' | 'collaboration' | 'marketplace' | 'daily_login' | 'teaching';

export interface XpEvent {
  eventId: string;
  userId: string;
  source: XpSource;
  amount: number;
  multiplier: number;
  totalAwarded: number;
  timestamp: number;
  description: string;
}

export interface UserLevel {
  userId: string;
  totalXp: number;
  level: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  xpInCurrentLevel: number;
  progressPercent: number;
  title: string;
  dailyXpEarned: number;
  dailyXpLimit: number;
  lastXpDate: string;
}

export interface LevelDefinition {
  level: number;
  xpRequired: number;
  title: string;
  reward: string;
}

// ─── Level Table ─────────────────────────────────────────────

export function getLevelTable(): LevelDefinition[] {
  return [
    { level: 1, xpRequired: 0, title: 'Beginner', reward: 'Welcome badge' },
    { level: 2, xpRequired: 100, title: 'Learner', reward: 'Custom avatar color' },
    { level: 3, xpRequired: 300, title: 'Explorer', reward: 'Breadboard skin' },
    { level: 4, xpRequired: 600, title: 'Builder', reward: 'Component pack' },
    { level: 5, xpRequired: 1000, title: 'Innovator', reward: 'Premium template' },
    { level: 6, xpRequired: 1500, title: 'Engineer', reward: 'Custom wire colors' },
    { level: 7, xpRequired: 2200, title: 'Architect', reward: 'Advanced components' },
    { level: 8, xpRequired: 3000, title: 'Expert', reward: 'Competition badge' },
    { level: 9, xpRequired: 4000, title: 'Master', reward: 'Golden breadboard' },
    { level: 10, xpRequired: 5200, title: 'Grandmaster', reward: 'Diamond profile frame' },
    { level: 11, xpRequired: 6500, title: 'Sage', reward: 'Custom emojis' },
    { level: 12, xpRequired: 8000, title: 'Legend', reward: 'Animated avatar' },
    { level: 13, xpRequired: 10000, title: 'Mythic', reward: 'Exclusive skin pack' },
    { level: 14, xpRequired: 12500, title: 'Transcendent', reward: 'Mentor badge' },
    { level: 15, xpRequired: 15500, title: 'Immortal', reward: 'Hall of Fame' },
  ];
}

export function calculateLevel(totalXp: number): { level: number; title: string } {
  const table = getLevelTable();
  for (let i = table.length - 1; i >= 0; i--) {
    if (totalXp >= table[i].xpRequired) return { level: table[i].level, title: table[i].title };
  }
  return { level: 1, title: 'Beginner' };
}

// ─── XP Operations ───────────────────────────────────────────

const XP_AMOUNTS: Record<XpSource, number> = {
  lesson: 20, assignment: 30, project: 15, competition: 50,
  achievement: 0, streak: 10, challenge: 25, collaboration: 10,
  marketplace: 15, daily_login: 5, teaching: 25,
};

export function getBaseXp(source: XpSource): number { return XP_AMOUNTS[source]; }

export function awardXp(userId: string, source: XpSource, multiplier = 1.0, customAmount?: number, description = ''): XpEvent {
  const base = customAmount ?? getBaseXp(source);
  const total = Math.round(base * multiplier);
  return { eventId: uid(), userId, source, amount: base, multiplier, totalAwarded: total, timestamp: now(), description };
}

export function createUserLevel(userId: string): UserLevel {
  return { userId, totalXp: 0, level: 1, xpForCurrentLevel: 0, xpForNextLevel: 100, xpInCurrentLevel: 0, progressPercent: 0, title: 'Beginner', dailyXpEarned: 0, dailyXpLimit: 500, lastXpDate: '' };
}

export function addXpToUser(user: UserLevel, xpEvent: XpEvent): UserLevel {
  const today = new Date().toISOString().split('T')[0];
  const dailyEarned = user.lastXpDate === today ? user.dailyXpEarned : 0;
  const remaining = user.dailyXpLimit - dailyEarned;
  const actual = Math.min(xpEvent.totalAwarded, remaining);
  if (actual <= 0) return user;
  const totalXp = user.totalXp + actual;
  const { level, title } = calculateLevel(totalXp);
  const table = getLevelTable();
  const currentDef = table.find(l => l.level === level)!;
  const nextDef = table.find(l => l.level === level + 1);
  const xpForCurrent = currentDef.xpRequired;
  const xpForNext = nextDef ? nextDef.xpRequired : currentDef.xpRequired + 3000;
  const xpInCurrent = totalXp - xpForCurrent;
  const progressPercent = Math.round((xpInCurrent / (xpForNext - xpForCurrent)) * 100);
  return { ...user, totalXp, level, title, xpForCurrentLevel: xpForCurrent, xpForNextLevel: xpForNext, xpInCurrentLevel: xpInCurrent, progressPercent: Math.min(progressPercent, 100), dailyXpEarned: dailyEarned + actual, lastXpDate: today };
}

export function applyBonusMultiplier(base: number, weekendBonus: boolean, streakBonus: number): number {
  let mult = 1.0;
  if (weekendBonus) mult += 0.5;
  mult += streakBonus * 0.1;
  return Math.min(mult, 3.0);
}

// ─── Synchronizer ────────────────────────────────────────────

export class XpSynchronizer {
  private users = new Map<string, UserLevel>();
  private events: XpEvent[] = [];

  setUser(u: UserLevel) { this.users.set(u.userId, { ...u }); }
  getUser(id: string) { const u = this.users.get(id); return u ? { ...u } : undefined; }
  getAllUsers() { return Array.from(this.users.values()).map(u => ({ ...u })); }

  addEvent(e: XpEvent) { this.events.push({ ...e }); if (this.events.length > 50000) this.events.shift(); }
  getRecentEvents(n = 50) { return this.events.slice(-n).map(e => ({ ...e })); }

  clear() { this.users.clear(); this.events = []; }

  toJSON() { return { users: this.getAllUsers(), events: this.events.slice(-1000) }; }
  fromJSON(d: { users?: UserLevel[]; events?: XpEvent[] }) { this.clear(); (d.users || []).forEach(u => this.setUser(u)); (d.events || []).forEach(e => this.addEvent(e)); }
  clone(): XpSynchronizer { const c = new XpSynchronizer(); c.fromJSON(this.toJSON()); return c; }
}
