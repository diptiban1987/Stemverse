/**
 * Phase 39A — Subscription Runtime
 *
 * Plans, billing cycles, renewals, trials, usage/seat limits.
 */

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => Date.now();

// ─── Types ───────────────────────────────────────────────────

export type SubscriptionPlan = 'free' | 'starter' | 'school' | 'district' | 'enterprise' | 'lifetime' | 'trial';
export type BillingCycle = 'monthly' | 'quarterly' | 'annual' | 'biennial' | 'one_time';
export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'trialing' | 'paused' | 'expired';

export interface PlanDefinition {
  plan: SubscriptionPlan;
  name: string;
  priceMonthly: number;
  priceAnnual: number;
  maxSeats: number;
  maxProjects: number;
  maxStorageGB: number;
  maxAICredits: number;
  features: string[];
  trialDays: number;
}

export interface Subscription {
  subscriptionId: string;
  customerId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  trialStart: number | null;
  trialEnd: number | null;
  cancelledAt: number | null;
  amount: number;
  currency: string;
  seatsUsed: number;
  seatsLimit: number;
}

export interface Invoice {
  invoiceId: string;
  subscriptionId: string;
  customerId: string;
  amount: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'void';
  issuedAt: number;
  dueAt: number;
  paidAt: number | null;
  lineItems: InvoiceLineItem[];
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

// ─── Plan Definitions ────────────────────────────────────────

export const PLAN_CATALOG: PlanDefinition[] = [
  { plan: 'free', name: 'Free', priceMonthly: 0, priceAnnual: 0, maxSeats: 5, maxProjects: 10, maxStorageGB: 1, maxAICredits: 10, features: ['simulator', 'basic_projects'], trialDays: 0 },
  { plan: 'starter', name: 'Starter', priceMonthly: 9.99, priceAnnual: 99, maxSeats: 25, maxProjects: 100, maxStorageGB: 10, maxAICredits: 100, features: ['simulator', 'projects', 'marketplace_browse'], trialDays: 14 },
  { plan: 'school', name: 'School', priceMonthly: 49, priceAnnual: 499, maxSeats: 200, maxProjects: 1000, maxStorageGB: 50, maxAICredits: 500, features: ['simulator', 'projects', 'classrooms', 'marketplace', 'competitions', 'certificates'], trialDays: 30 },
  { plan: 'district', name: 'District', priceMonthly: 299, priceAnnual: 2999, maxSeats: 5000, maxProjects: 50000, maxStorageGB: 500, maxAICredits: 5000, features: ['simulator', 'projects', 'classrooms', 'marketplace', 'competitions', 'certificates', 'analytics', 'multi_school', 'branding'], trialDays: 30 },
  { plan: 'enterprise', name: 'Enterprise', priceMonthly: 999, priceAnnual: 9999, maxSeats: 50000, maxProjects: 500000, maxStorageGB: 5000, maxAICredits: 50000, features: ['simulator', 'projects', 'classrooms', 'marketplace', 'competitions', 'certificates', 'analytics', 'multi_school', 'branding', 'api', 'sso', 'white_label', 'priority_support'], trialDays: 30 },
  { plan: 'lifetime', name: 'Lifetime', priceMonthly: 0, priceAnnual: 299, maxSeats: 1, maxProjects: 500, maxStorageGB: 50, maxAICredits: 1000, features: ['simulator', 'projects', 'marketplace', 'competitions', 'certificates'], trialDays: 0 },
  { plan: 'trial', name: 'Trial', priceMonthly: 0, priceAnnual: 0, maxSeats: 50, maxProjects: 100, maxStorageGB: 5, maxAICredits: 50, features: ['simulator', 'projects', 'classrooms', 'marketplace', 'competitions'], trialDays: 30 },
];

export function getPlanDefinition(plan: SubscriptionPlan): PlanDefinition { return { ...PLAN_CATALOG.find(p => p.plan === plan)! }; }
export function getAllPlans(): PlanDefinition[] { return PLAN_CATALOG.map(p => ({ ...p, features: [...p.features] })); }

// ─── Subscription Operations ─────────────────────────────────

export function createSubscription(customerId: string, plan: SubscriptionPlan, billingCycle: BillingCycle = 'annual', currency = 'USD'): Subscription {
  const def = getPlanDefinition(plan);
  const periodMs = billingCycle === 'monthly' ? 30 * 86400000 : billingCycle === 'quarterly' ? 90 * 86400000 : 365 * 86400000;
  const amount = billingCycle === 'monthly' ? def.priceMonthly : billingCycle === 'annual' ? def.priceAnnual : def.priceAnnual;
  const hasTrial = def.trialDays > 0;
  return {
    subscriptionId: uid(), customerId, plan, status: hasTrial ? 'trialing' : 'active',
    billingCycle, currentPeriodStart: now(), currentPeriodEnd: now() + periodMs,
    trialStart: hasTrial ? now() : null, trialEnd: hasTrial ? now() + def.trialDays * 86400000 : null,
    cancelledAt: null, amount, currency, seatsUsed: 0, seatsLimit: def.maxSeats,
  };
}

export function renewSubscription(sub: Subscription): Subscription {
  const periodMs = sub.billingCycle === 'monthly' ? 30 * 86400000 : sub.billingCycle === 'quarterly' ? 90 * 86400000 : 365 * 86400000;
  return { ...sub, status: 'active', currentPeriodStart: now(), currentPeriodEnd: now() + periodMs, trialStart: null, trialEnd: null };
}

export function cancelSubscription(sub: Subscription): Subscription {
  return { ...sub, status: 'cancelled', cancelledAt: now() };
}

export function pauseSubscription(sub: Subscription): Subscription {
  return { ...sub, status: 'paused' };
}

export function upgradeSubscription(sub: Subscription, newPlan: SubscriptionPlan): Subscription {
  const def = getPlanDefinition(newPlan);
  const amount = sub.billingCycle === 'monthly' ? def.priceMonthly : def.priceAnnual;
  return { ...sub, plan: newPlan, amount, seatsLimit: def.maxSeats };
}

export function convertTrial(sub: Subscription): Subscription {
  if (sub.status !== 'trialing') return sub;
  return { ...sub, status: 'active', trialStart: null, trialEnd: null };
}

export function isTrialExpired(sub: Subscription): boolean {
  return sub.status === 'trialing' && sub.trialEnd !== null && now() > sub.trialEnd;
}

// ─── Invoicing ───────────────────────────────────────────────

export function createInvoice(sub: Subscription, lineItems: InvoiceLineItem[]): Invoice {
  const total = lineItems.reduce((s, i) => s + i.total, 0);
  return { invoiceId: uid(), subscriptionId: sub.subscriptionId, customerId: sub.customerId, amount: total, currency: sub.currency, status: 'draft', issuedAt: now(), dueAt: now() + 30 * 86400000, paidAt: null, lineItems };
}

export function markInvoicePaid(invoice: Invoice): Invoice {
  return { ...invoice, status: 'paid', paidAt: now() };
}

export function markInvoiceOverdue(invoice: Invoice): Invoice {
  return { ...invoice, status: 'overdue' };
}

export function createLineItem(description: string, quantity: number, unitPrice: number): InvoiceLineItem {
  return { description, quantity, unitPrice, total: quantity * unitPrice };
}

// ─── Synchronizer ────────────────────────────────────────────

export class SubscriptionSynchronizer {
  private subscriptions = new Map<string, Subscription>();
  private invoices = new Map<string, Invoice>();

  addSubscription(s: Subscription) { this.subscriptions.set(s.subscriptionId, { ...s }); }
  getSubscription(id: string) { const s = this.subscriptions.get(id); return s ? { ...s } : undefined; }
  getAllSubscriptions() { return Array.from(this.subscriptions.values()).map(s => ({ ...s })); }

  addInvoice(i: Invoice) { this.invoices.set(i.invoiceId, { ...i }); }
  getInvoice(id: string) { const i = this.invoices.get(id); return i ? { ...i } : undefined; }
  getAllInvoices() { return Array.from(this.invoices.values()).map(i => ({ ...i })); }

  clear() { this.subscriptions.clear(); this.invoices.clear(); }

  toJSON() { return { subscriptions: this.getAllSubscriptions(), invoices: this.getAllInvoices() }; }
  fromJSON(d: { subscriptions?: Subscription[]; invoices?: Invoice[] }) {
    this.clear();
    (d.subscriptions || []).forEach(s => this.addSubscription(s));
    (d.invoices || []).forEach(i => this.addInvoice(i));
  }
  clone(): SubscriptionSynchronizer { const c = new SubscriptionSynchronizer(); c.fromJSON(this.toJSON()); return c; }
}
