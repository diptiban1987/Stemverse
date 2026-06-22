/**
 * Phase 39A — Customer Success Runtime
 *
 * Accounts, contacts, contracts, renewals,
 * health score, engagement score, customer analytics.
 */

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => Date.now();

// ─── Types ───────────────────────────────────────────────────

export type AccountTier = 'free' | 'starter' | 'school' | 'district' | 'enterprise';
export type ContractStatus = 'draft' | 'active' | 'expiring' | 'expired' | 'renewed';
export type HealthLevel = 'healthy' | 'at_risk' | 'critical' | 'churned';

export interface CustomerAccount {
  accountId: string;
  name: string;
  tier: AccountTier;
  industry: string;
  region: string;
  contactCount: number;
  totalSeats: number;
  activeSeats: number;
  healthScore: number;
  engagementScore: number;
  healthLevel: HealthLevel;
  createdAt: number;
  lastActivityAt: number;
  assignedCSM: string;
}

export interface CustomerContact {
  contactId: string;
  accountId: string;
  name: string;
  email: string;
  role: string;
  isPrimary: boolean;
  lastContactedAt: number | null;
}

export interface CustomerContract {
  contractId: string;
  accountId: string;
  status: ContractStatus;
  startDate: number;
  endDate: number;
  value: number;
  currency: string;
  autoRenew: boolean;
  terms: string;
  signedBy: string;
}

// ─── Account Operations ──────────────────────────────────────

export function createAccount(name: string, tier: AccountTier, region = 'unknown', industry = 'education', assignedCSM = ''): CustomerAccount {
  return { accountId: uid(), name, tier, industry, region, contactCount: 0, totalSeats: 0, activeSeats: 0, healthScore: 100, engagementScore: 100, healthLevel: 'healthy', createdAt: now(), lastActivityAt: now(), assignedCSM };
}

export function updateHealthScore(account: CustomerAccount, score: number): CustomerAccount {
  const clamped = Math.max(0, Math.min(100, score));
  let healthLevel: HealthLevel = 'healthy';
  if (clamped < 30) healthLevel = 'critical';
  else if (clamped < 60) healthLevel = 'at_risk';
  return { ...account, healthScore: clamped, healthLevel };
}

export function updateEngagementScore(account: CustomerAccount, score: number): CustomerAccount {
  return { ...account, engagementScore: Math.max(0, Math.min(100, score)) };
}

export function calculateHealthScore(loginDays: number, projectsCreated: number, featuresUsed: number, supportTickets: number): number {
  const loginScore = Math.min(loginDays * 3, 30);
  const projectScore = Math.min(projectsCreated * 2, 30);
  const featureScore = Math.min(featuresUsed * 5, 25);
  const supportPenalty = Math.min(supportTickets * 3, 15);
  return Math.max(0, Math.min(100, loginScore + projectScore + featureScore - supportPenalty + 15));
}

// ─── Contact Operations ──────────────────────────────────────

export function createContact(accountId: string, name: string, email: string, role: string, isPrimary = false): CustomerContact {
  return { contactId: uid(), accountId, name, email, role, isPrimary, lastContactedAt: null };
}

export function markContacted(contact: CustomerContact): CustomerContact {
  return { ...contact, lastContactedAt: now() };
}

// ─── Contract Operations ─────────────────────────────────────

export function createContract(accountId: string, value: number, durationDays = 365, currency = 'USD', autoRenew = true): CustomerContract {
  return { contractId: uid(), accountId, status: 'draft', startDate: now(), endDate: now() + durationDays * 86400000, value, currency, autoRenew, terms: 'Standard', signedBy: '' };
}

export function activateContract(contract: CustomerContract, signedBy: string): CustomerContract {
  return { ...contract, status: 'active', signedBy };
}

export function renewContract(contract: CustomerContract, additionalDays = 365): CustomerContract {
  return { ...contract, status: 'renewed', endDate: contract.endDate + additionalDays * 86400000 };
}

export function isContractExpiring(contract: CustomerContract, warningDays = 30): boolean {
  return contract.status === 'active' && contract.endDate - now() < warningDays * 86400000;
}

export function getRenewalForecast(contracts: CustomerContract[]): { expiringThisMonth: number; expiringThisQuarter: number; totalRenewalValue: number } {
  const monthEnd = now() + 30 * 86400000;
  const quarterEnd = now() + 90 * 86400000;
  const expMonth = contracts.filter(c => c.status === 'active' && c.endDate <= monthEnd);
  const expQuarter = contracts.filter(c => c.status === 'active' && c.endDate <= quarterEnd);
  return { expiringThisMonth: expMonth.length, expiringThisQuarter: expQuarter.length, totalRenewalValue: expQuarter.reduce((s, c) => s + c.value, 0) };
}

// ─── Synchronizer ────────────────────────────────────────────

export class CustomerSuccessSynchronizer {
  private accounts = new Map<string, CustomerAccount>();
  private contacts = new Map<string, CustomerContact>();
  private contracts = new Map<string, CustomerContract>();

  addAccount(a: CustomerAccount) { this.accounts.set(a.accountId, { ...a }); }
  getAccount(id: string) { const a = this.accounts.get(id); return a ? { ...a } : undefined; }
  getAllAccounts() { return Array.from(this.accounts.values()).map(a => ({ ...a })); }
  getAccountsByHealth(level: HealthLevel) { return this.getAllAccounts().filter(a => a.healthLevel === level); }

  addContact(c: CustomerContact) { this.contacts.set(c.contactId, { ...c }); }
  getAccountContacts(accountId: string) { return Array.from(this.contacts.values()).filter(c => c.accountId === accountId).map(c => ({ ...c })); }

  addContract(c: CustomerContract) { this.contracts.set(c.contractId, { ...c }); }
  getAllContracts() { return Array.from(this.contracts.values()).map(c => ({ ...c })); }

  clear() { this.accounts.clear(); this.contacts.clear(); this.contracts.clear(); }

  toJSON() { return { accounts: this.getAllAccounts(), contacts: Array.from(this.contacts.values()), contracts: this.getAllContracts() }; }
  fromJSON(d: { accounts?: CustomerAccount[]; contacts?: CustomerContact[]; contracts?: CustomerContract[] }) {
    this.clear();
    (d.accounts || []).forEach(a => this.addAccount(a));
    (d.contacts || []).forEach(c => this.addContact(c));
    (d.contracts || []).forEach(c => this.addContract(c));
  }
  clone(): CustomerSuccessSynchronizer { const c = new CustomerSuccessSynchronizer(); c.fromJSON(this.toJSON()); return c; }
}
