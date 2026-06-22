/**
 * Phase 39A — Billing Runtime
 *
 * Payment provider abstractions for Razorpay, Stripe, PayPal,
 * manual invoices, purchase orders. NO real API calls.
 */

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => Date.now();

// ─── Types ───────────────────────────────────────────────────

export type PaymentProvider = 'razorpay' | 'stripe' | 'paypal' | 'manual' | 'purchase_order';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';

export interface PaymentMethod {
  methodId: string;
  customerId: string;
  provider: PaymentProvider;
  type: 'card' | 'upi' | 'bank_transfer' | 'wallet' | 'invoice' | 'po';
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

export interface PaymentTransaction {
  transactionId: string;
  customerId: string;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  status: PaymentStatus;
  methodId: string;
  description: string;
  providerRef: string;
  createdAt: number;
  completedAt: number | null;
  metadata: Record<string, unknown>;
}

export interface PurchaseOrder {
  poId: string;
  customerId: string;
  poNumber: string;
  amount: number;
  currency: string;
  status: 'draft' | 'submitted' | 'approved' | 'fulfilled' | 'rejected';
  issuedAt: number;
  approvedAt: number | null;
  contactName: string;
  contactEmail: string;
}

// ─── Payment Method ──────────────────────────────────────────

export function createPaymentMethod(customerId: string, provider: PaymentProvider, type: PaymentMethod['type'], last4 = '0000'): PaymentMethod {
  return { methodId: uid(), customerId, provider, type, last4, expiryMonth: 12, expiryYear: 2030, isDefault: false };
}

export function setDefaultPaymentMethod(method: PaymentMethod): PaymentMethod {
  return { ...method, isDefault: true };
}

// ─── Transactions ────────────────────────────────────────────

export function createTransaction(customerId: string, provider: PaymentProvider, amount: number, currency: string, methodId: string, description = ''): PaymentTransaction {
  return { transactionId: uid(), customerId, provider, amount, currency, status: 'pending', methodId, description, providerRef: `${provider}_${uid().slice(0, 10)}`, createdAt: now(), completedAt: null, metadata: {} };
}

export function completeTransaction(tx: PaymentTransaction): PaymentTransaction {
  return { ...tx, status: 'completed', completedAt: now() };
}

export function failTransaction(tx: PaymentTransaction, reason: string): PaymentTransaction {
  return { ...tx, status: 'failed', metadata: { ...tx.metadata, failureReason: reason } };
}

export function refundTransaction(tx: PaymentTransaction): PaymentTransaction {
  if (tx.status !== 'completed') return tx;
  return { ...tx, status: 'refunded', metadata: { ...tx.metadata, refundedAt: now() } };
}

// ─── Purchase Orders ─────────────────────────────────────────

export function createPurchaseOrder(customerId: string, poNumber: string, amount: number, currency: string, contactName: string, contactEmail: string): PurchaseOrder {
  return { poId: uid(), customerId, poNumber, amount, currency, status: 'draft', issuedAt: now(), approvedAt: null, contactName, contactEmail };
}

export function approvePurchaseOrder(po: PurchaseOrder): PurchaseOrder {
  return { ...po, status: 'approved', approvedAt: now() };
}

export function fulfillPurchaseOrder(po: PurchaseOrder): PurchaseOrder {
  if (po.status !== 'approved') return po;
  return { ...po, status: 'fulfilled' };
}

export function rejectPurchaseOrder(po: PurchaseOrder): PurchaseOrder {
  return { ...po, status: 'rejected' };
}

// ─── Revenue Analytics ───────────────────────────────────────

export function calculateTotalRevenue(transactions: PaymentTransaction[]): number {
  return transactions.filter(t => t.status === 'completed').reduce((s, t) => s + t.amount, 0);
}

export function calculateMRR(subscriptionAmounts: number[]): number {
  return subscriptionAmounts.reduce((s, a) => s + a, 0);
}

export function calculateARR(mrr: number): number {
  return mrr * 12;
}

export function calculateChurnRate(cancelledCount: number, totalCount: number): number {
  return totalCount > 0 ? (cancelledCount / totalCount) * 100 : 0;
}

// ─── Synchronizer ────────────────────────────────────────────

export class BillingSynchronizer {
  private methods = new Map<string, PaymentMethod>();
  private transactions: PaymentTransaction[] = [];
  private purchaseOrders = new Map<string, PurchaseOrder>();

  addMethod(m: PaymentMethod) { this.methods.set(m.methodId, { ...m }); }
  getMethod(id: string) { const m = this.methods.get(id); return m ? { ...m } : undefined; }
  getCustomerMethods(customerId: string) { return Array.from(this.methods.values()).filter(m => m.customerId === customerId).map(m => ({ ...m })); }

  addTransaction(t: PaymentTransaction) { this.transactions.push({ ...t }); if (this.transactions.length > 50000) this.transactions.shift(); }
  getRecentTransactions(n = 50) { return this.transactions.slice(-n).map(t => ({ ...t })); }

  addPurchaseOrder(po: PurchaseOrder) { this.purchaseOrders.set(po.poId, { ...po }); }
  getPurchaseOrder(id: string) { const po = this.purchaseOrders.get(id); return po ? { ...po } : undefined; }

  clear() { this.methods.clear(); this.transactions = []; this.purchaseOrders.clear(); }

  toJSON() { return { methods: Array.from(this.methods.values()), transactions: this.transactions.slice(-1000), purchaseOrders: Array.from(this.purchaseOrders.values()) }; }
  fromJSON(d: { methods?: PaymentMethod[]; transactions?: PaymentTransaction[]; purchaseOrders?: PurchaseOrder[] }) {
    this.clear();
    (d.methods || []).forEach(m => this.addMethod(m));
    (d.transactions || []).forEach(t => this.addTransaction(t));
    (d.purchaseOrders || []).forEach(po => this.addPurchaseOrder(po));
  }
  clone(): BillingSynchronizer { const c = new BillingSynchronizer(); c.fromJSON(this.toJSON()); return c; }
}
