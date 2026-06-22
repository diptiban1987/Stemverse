/**
 * Phase 38A — Data Warehouse Runtime
 *
 * Fact tables, dimension tables, aggregation pipelines,
 * daily/weekly/monthly rollups, trend analysis.
 */

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => Date.now();

// ─── Types ───────────────────────────────────────────────────

export type RollupPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type DimensionType = 'user' | 'organization' | 'classroom' | 'project' | 'competition' | 'asset' | 'device' | 'time' | 'geography';

export interface FactRecord {
  factId: string;
  factTable: string;
  dimensions: Record<string, string>;
  measures: Record<string, number>;
  timestamp: number;
}

export interface DimensionRecord {
  dimensionId: string;
  type: DimensionType;
  key: string;
  attributes: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

export interface RollupEntry {
  rollupId: string;
  factTable: string;
  period: RollupPeriod;
  periodStart: number;
  periodEnd: number;
  dimensions: Record<string, string>;
  aggregates: Record<string, number>;
  recordCount: number;
}

export interface TrendPoint {
  periodStart: number;
  periodEnd: number;
  value: number;
  change: number;
  changePercent: number;
}

export interface AggregationPipeline {
  pipelineId: string;
  name: string;
  sourceTable: string;
  targetPeriod: RollupPeriod;
  measureAggregations: Record<string, 'sum' | 'avg' | 'min' | 'max' | 'count'>;
  lastRun: number | null;
  status: 'idle' | 'running' | 'completed' | 'failed';
}

// ─── Fact Tables ─────────────────────────────────────────────

export function createFact(factTable: string, dimensions: Record<string, string>, measures: Record<string, number>): FactRecord {
  return { factId: uid(), factTable, dimensions, measures, timestamp: now() };
}

export function getFactsByTable(facts: FactRecord[], table: string): FactRecord[] {
  return facts.filter(f => f.factTable === table);
}

export function getFactsByDimension(facts: FactRecord[], dimKey: string, dimValue: string): FactRecord[] {
  return facts.filter(f => f.dimensions[dimKey] === dimValue);
}

// ─── Dimension Tables ────────────────────────────────────────

export function createDimension(type: DimensionType, key: string, attributes: Record<string, string> = {}): DimensionRecord {
  return { dimensionId: uid(), type, key, attributes, createdAt: now(), updatedAt: now() };
}

export function updateDimension(dim: DimensionRecord, attributes: Record<string, string>): DimensionRecord {
  return { ...dim, attributes: { ...dim.attributes, ...attributes }, updatedAt: now() };
}

// ─── Rollups ─────────────────────────────────────────────────

export function createRollup(factTable: string, period: RollupPeriod, periodStart: number, periodEnd: number, dimensions: Record<string, string>, facts: FactRecord[]): RollupEntry {
  const filtered = facts.filter(f => f.factTable === factTable && f.timestamp >= periodStart && f.timestamp <= periodEnd);
  const aggregates: Record<string, number> = {};
  filtered.forEach(f => {
    Object.entries(f.measures).forEach(([k, v]) => { aggregates[k] = (aggregates[k] || 0) + v; });
  });
  return { rollupId: uid(), factTable, period, periodStart, periodEnd, dimensions, aggregates, recordCount: filtered.length };
}

export function createDailyRollup(factTable: string, date: number, facts: FactRecord[]): RollupEntry {
  const dayStart = date - (date % 86400000);
  return createRollup(factTable, 'daily', dayStart, dayStart + 86400000, {}, facts);
}

export function createWeeklyRollup(factTable: string, weekEnd: number, facts: FactRecord[]): RollupEntry {
  return createRollup(factTable, 'weekly', weekEnd - 7 * 86400000, weekEnd, {}, facts);
}

export function createMonthlyRollup(factTable: string, monthEnd: number, facts: FactRecord[]): RollupEntry {
  return createRollup(factTable, 'monthly', monthEnd - 30 * 86400000, monthEnd, {}, facts);
}

// ─── Trend Analysis ──────────────────────────────────────────

export function calculateTrend(rollups: RollupEntry[], measure: string): TrendPoint[] {
  const sorted = [...rollups].sort((a, b) => a.periodStart - b.periodStart);
  return sorted.map((r, i) => {
    const value = r.aggregates[measure] || 0;
    const prev = i > 0 ? (sorted[i - 1].aggregates[measure] || 0) : value;
    const change = value - prev;
    return { periodStart: r.periodStart, periodEnd: r.periodEnd, value, change, changePercent: prev !== 0 ? (change / prev) * 100 : 0 };
  });
}

export function detectGrowthRate(trend: TrendPoint[]): number {
  if (trend.length < 2) return 0;
  const first = trend[0].value;
  const last = trend[trend.length - 1].value;
  return first !== 0 ? ((last - first) / first) * 100 : 0;
}

// ─── Aggregation Pipeline ────────────────────────────────────

export function createPipeline(name: string, sourceTable: string, targetPeriod: RollupPeriod, measureAggs: Record<string, 'sum' | 'avg' | 'min' | 'max' | 'count'>): AggregationPipeline {
  return { pipelineId: uid(), name, sourceTable, targetPeriod, measureAggregations: measureAggs, lastRun: null, status: 'idle' };
}

export function runPipeline(pipeline: AggregationPipeline): AggregationPipeline {
  return { ...pipeline, status: 'completed', lastRun: now() };
}

export function getDefaultPipelines(): AggregationPipeline[] {
  return [
    createPipeline('User Activity Daily', 'fact_user_activity', 'daily', { sessions: 'count', duration: 'sum', actions: 'sum' }),
    createPipeline('Project Metrics Weekly', 'fact_projects', 'weekly', { created: 'count', completed: 'count', shared: 'count' }),
    createPipeline('Learning Progress Monthly', 'fact_learning', 'monthly', { lessons_completed: 'sum', avg_grade: 'avg', certifications: 'count' }),
    createPipeline('Competition Stats Monthly', 'fact_competitions', 'monthly', { participants: 'sum', submissions: 'count', avg_score: 'avg' }),
    createPipeline('Marketplace Monthly', 'fact_marketplace', 'monthly', { downloads: 'sum', revenue: 'sum', ratings: 'avg' }),
    createPipeline('Device Usage Weekly', 'fact_devices', 'weekly', { uploads: 'count', success_rate: 'avg', debug_sessions: 'count' }),
  ];
}

// ─── Synchronizer ────────────────────────────────────────────

export class DataWarehouseSynchronizer {
  private facts: FactRecord[] = [];
  private dimensions = new Map<string, DimensionRecord>();
  private rollups = new Map<string, RollupEntry>();
  private pipelines = new Map<string, AggregationPipeline>();

  addFact(f: FactRecord) { this.facts.push({ ...f }); if (this.facts.length > 100000) this.facts.shift(); }
  getFacts(n = 100) { return this.facts.slice(-n).map(f => ({ ...f })); }
  getFactCount() { return this.facts.length; }

  addDimension(d: DimensionRecord) { this.dimensions.set(d.dimensionId, { ...d }); }
  getDimension(id: string) { const d = this.dimensions.get(id); return d ? { ...d } : undefined; }
  getAllDimensions() { return Array.from(this.dimensions.values()).map(d => ({ ...d })); }

  addRollup(r: RollupEntry) { this.rollups.set(r.rollupId, { ...r }); }
  getAllRollups() { return Array.from(this.rollups.values()).map(r => ({ ...r })); }
  getRollupsByTable(table: string) { return this.getAllRollups().filter(r => r.factTable === table); }

  addPipeline(p: AggregationPipeline) { this.pipelines.set(p.pipelineId, { ...p }); }
  getAllPipelines() { return Array.from(this.pipelines.values()).map(p => ({ ...p })); }

  clear() { this.facts = []; this.dimensions.clear(); this.rollups.clear(); this.pipelines.clear(); }

  toJSON() { return { facts: this.getFacts(10000), dimensions: this.getAllDimensions(), rollups: this.getAllRollups(), pipelines: this.getAllPipelines() }; }
  fromJSON(d: { facts?: FactRecord[]; dimensions?: DimensionRecord[]; rollups?: RollupEntry[]; pipelines?: AggregationPipeline[] }) {
    this.clear();
    (d.facts || []).forEach(f => this.addFact(f));
    (d.dimensions || []).forEach(dim => this.addDimension(dim));
    (d.rollups || []).forEach(r => this.addRollup(r));
    (d.pipelines || []).forEach(p => this.addPipeline(p));
  }
  clone(): DataWarehouseSynchronizer { const c = new DataWarehouseSynchronizer(); c.fromJSON(this.toJSON()); return c; }
}
