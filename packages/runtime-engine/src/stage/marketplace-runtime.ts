/**
 * Phase 35B — Marketplace Runtime
 *
 * Asset publishing, template exchange, package system,
 * reviews & ratings, installation engine, discovery, creator system.
 */

import type {
  MarketplaceAssetModel, MarketplacePackageModel, MarketplaceTemplateModel,
  MarketplaceLessonPackModel, MarketplaceComponentPackModel,
  MarketplaceCompetitionPackModel, MarketplaceReviewModel,
  MarketplaceInstallModel, MarketplaceCreatorModel, MarketplaceSnapshot,
  MarketplaceAssetType, MarketplacePackageType, MarketplaceAssetStatus,
  MarketplaceInstallStatus,
} from '../types';

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
function deepCopy<T>(v: T): T { return JSON.parse(JSON.stringify(v)); }
function generateChecksum(): string {
  const chars = '0123456789abcdef';
  let s = ''; for (let i = 0; i < 64; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
}
const W = '[Phase 35B Marketplace]';

export const VALID_MARKETPLACE_ASSET_TYPES: MarketplaceAssetType[] = ['circuit_template', 'blockly_template', 'robot_template', 'iot_template', 'competition_template', 'lesson_template'];
export const VALID_MARKETPLACE_PACKAGE_TYPES: MarketplacePackageType[] = ['template', 'lesson', 'component', 'competition', 'classroom'];
export const VALID_MARKETPLACE_ASSET_STATUSES: MarketplaceAssetStatus[] = ['draft', 'published', 'featured', 'archived', 'removed'];
export const VALID_MARKETPLACE_INSTALL_STATUSES: MarketplaceInstallStatus[] = ['installed', 'uninstalled', 'pending', 'failed'];

// ─── Asset Engine ───────────────────────────────────────────

export function publishAsset(
  creatorId: string, creatorName: string, title: string, description: string,
  assetType: MarketplaceAssetType, version?: string, tags?: string[],
): MarketplaceAssetModel {
  return {
    assetId: generateId(), creatorId, creatorName, title, description,
    assetType, status: 'published', version: version ?? '1.0.0',
    tags: tags ? [...tags] : [], thumbnailUrl: '',
    downloadCount: 0, installCount: 0, favoriteCount: 0,
    ratingCount: 0, averageRating: 0,
    publishedAt: Date.now(), updatedAt: Date.now(), deleted: false,
  };
}

export function updateAsset(
  asset: MarketplaceAssetModel,
  updates: Partial<Pick<MarketplaceAssetModel, 'title' | 'description' | 'tags' | 'version' | 'thumbnailUrl'>>,
): MarketplaceAssetModel {
  const a = deepCopy(asset);
  if (updates.title !== undefined) a.title = updates.title;
  if (updates.description !== undefined) a.description = updates.description;
  if (updates.tags !== undefined) a.tags = [...updates.tags];
  if (updates.version !== undefined) a.version = updates.version;
  if (updates.thumbnailUrl !== undefined) a.thumbnailUrl = updates.thumbnailUrl;
  a.updatedAt = Date.now();
  return a;
}

export function archiveAsset(asset: MarketplaceAssetModel): MarketplaceAssetModel {
  const a = deepCopy(asset); a.status = 'archived'; a.updatedAt = Date.now(); return a;
}

export function featureAsset(asset: MarketplaceAssetModel): MarketplaceAssetModel {
  const a = deepCopy(asset); a.status = 'featured'; a.updatedAt = Date.now(); return a;
}

export function removeAsset(asset: MarketplaceAssetModel): MarketplaceAssetModel {
  const a = deepCopy(asset); a.status = 'removed'; a.deleted = true; a.updatedAt = Date.now(); return a;
}

export function incrementAssetDownload(asset: MarketplaceAssetModel): MarketplaceAssetModel {
  const a = deepCopy(asset); a.downloadCount++; return a;
}

export function incrementAssetFavorite(asset: MarketplaceAssetModel): MarketplaceAssetModel {
  const a = deepCopy(asset); a.favoriteCount++; return a;
}

export function cloneAsset(asset: MarketplaceAssetModel, userId: string): { asset: MarketplaceAssetModel; clonedId: string } {
  const a = deepCopy(asset); a.downloadCount++;
  return { asset: a, clonedId: generateId() };
}

export function validateAsset(a: unknown): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!a || typeof a !== 'object') { warnings.push(`${W} null`); console.warn(warnings[0]); return { valid: false, warnings }; }
  const o = a as Record<string, unknown>;
  if (typeof o.assetId !== 'string' || !o.assetId) { warnings.push(`${W} empty assetId`); console.warn(warnings[warnings.length - 1]); }
  return { valid: warnings.length === 0, warnings };
}

// ─── Package System ─────────────────────────────────────────

export function createPackage(
  assetId: string, packageType: MarketplacePackageType, version: string,
  dependencies?: string[], fileSize?: number,
): MarketplacePackageModel {
  return {
    packageId: generateId(), assetId, packageType, version,
    dependencies: dependencies ? [...dependencies] : [],
    fileSize: fileSize ?? 0, checksum: generateChecksum(), createdAt: Date.now(),
  };
}

export function updatePackage(pkg: MarketplacePackageModel, version: string, fileSize?: number): MarketplacePackageModel {
  const p = deepCopy(pkg); p.version = version; if (fileSize !== undefined) p.fileSize = fileSize;
  p.checksum = generateChecksum(); return p;
}

export function validatePackage(pkg: MarketplacePackageModel, availableIds: string[]): { valid: boolean; missingDeps: string[] } {
  const missing = pkg.dependencies.filter(d => !availableIds.includes(d));
  return { valid: missing.length === 0, missingDeps: missing };
}

// ─── Template Exchange ──────────────────────────────────────

export function createTemplate(
  assetId: string, templateType: MarketplaceAssetType,
  componentCount: number, wireCount: number, blockCount: number,
  difficulty?: 'beginner' | 'intermediate' | 'advanced', estimatedTime?: number,
): MarketplaceTemplateModel {
  return {
    templateId: generateId(), assetId, templateType,
    componentCount, wireCount, blockCount,
    difficulty: difficulty ?? 'beginner', estimatedTime: estimatedTime ?? 30,
    previewData: '',
  };
}

// ─── Lesson Pack ────────────────────────────────────────────

export function createLessonPack(
  assetId: string, lessonCount: number, gradeLevel: string,
  subject: string, objectives?: string[], prerequisites?: string[],
): MarketplaceLessonPackModel {
  return {
    lessonPackId: generateId(), assetId, lessonCount, gradeLevel, subject,
    objectives: objectives ? [...objectives] : [],
    prerequisites: prerequisites ? [...prerequisites] : [],
  };
}

// ─── Component Pack ─────────────────────────────────────────

export function createComponentPack(
  assetId: string, componentTypes: string[], componentCount: number, compatibility?: string[],
): MarketplaceComponentPackModel {
  return {
    componentPackId: generateId(), assetId,
    componentTypes: [...componentTypes], componentCount,
    compatibility: compatibility ? [...compatibility] : ['esp32', 'arduino'],
  };
}

// ─── Competition Pack ───────────────────────────────────────

export function createCompetitionPack(
  assetId: string, categoryCount: number, judgeCount: number,
  maxParticipants: number, duration: number, rules?: string[],
): MarketplaceCompetitionPackModel {
  return {
    competitionPackId: generateId(), assetId,
    categoryCount, judgeCount, maxParticipants, duration,
    rules: rules ? [...rules] : [],
  };
}

// ─── Reviews & Ratings ──────────────────────────────────────

export function addReview(
  assetId: string, userId: string, userName: string,
  stars: number, title: string, content: string,
): MarketplaceReviewModel {
  return {
    reviewId: generateId(), assetId, userId, userName,
    stars: Math.max(1, Math.min(5, Math.round(stars))),
    title, content, helpful: 0,
    createdAt: Date.now(), updatedAt: null,
  };
}

export function updateReview(review: MarketplaceReviewModel, stars: number, title: string, content: string): MarketplaceReviewModel {
  const r = deepCopy(review);
  r.stars = Math.max(1, Math.min(5, Math.round(stars)));
  r.title = title; r.content = content; r.updatedAt = Date.now();
  return r;
}

export function removeReview(reviews: MarketplaceReviewModel[], reviewId: string): MarketplaceReviewModel[] {
  return reviews.filter(r => r.reviewId !== reviewId);
}

export function markReviewHelpful(review: MarketplaceReviewModel): MarketplaceReviewModel {
  const r = deepCopy(review); r.helpful++; return r;
}

export function calculateMarketplaceRating(reviews: MarketplaceReviewModel[]): number {
  if (reviews.length === 0) return 0;
  return Math.round((reviews.reduce((s, r) => s + r.stars, 0) / reviews.length) * 10) / 10;
}

// ─── Installation Engine ────────────────────────────────────

export function installAsset(assetId: string, userId: string, version: string): MarketplaceInstallModel {
  return {
    installId: generateId(), assetId, userId, version,
    status: 'installed', installedAt: Date.now(),
    uninstalledAt: null, previousVersion: null,
  };
}

export function uninstallAsset(install: MarketplaceInstallModel): MarketplaceInstallModel {
  const i = deepCopy(install); i.status = 'uninstalled'; i.uninstalledAt = Date.now(); return i;
}

export function upgradeInstall(install: MarketplaceInstallModel, newVersion: string): MarketplaceInstallModel {
  const i = deepCopy(install); i.previousVersion = i.version; i.version = newVersion; i.installedAt = Date.now(); return i;
}

export function rollbackInstall(install: MarketplaceInstallModel): MarketplaceInstallModel | null {
  if (!install.previousVersion) return null;
  const i = deepCopy(install); i.version = i.previousVersion!; i.previousVersion = null; i.installedAt = Date.now(); return i;
}

export function failInstall(install: MarketplaceInstallModel): MarketplaceInstallModel {
  const i = deepCopy(install); i.status = 'failed'; return i;
}

// ─── Creator System ─────────────────────────────────────────

export function createMarketplaceCreator(userId: string, displayName: string, bio?: string): MarketplaceCreatorModel {
  return {
    marketplaceCreatorId: generateId(), userId, displayName,
    bio: bio ?? '', assetCount: 0, totalDownloads: 0,
    totalInstalls: 0, followerCount: 0, averageRating: 0, joinedAt: Date.now(),
  };
}

export function getCreatorAssets(assets: MarketplaceAssetModel[], creatorId: string): MarketplaceAssetModel[] {
  return assets.filter(a => a.creatorId === creatorId && !a.deleted);
}

export function getCreatorMarketplaceStats(assets: MarketplaceAssetModel[], creatorId: string): {
  assetCount: number; totalDownloads: number; totalInstalls: number; averageRating: number;
} {
  const ca = assets.filter(a => a.creatorId === creatorId && !a.deleted);
  const totalDownloads = ca.reduce((s, a) => s + a.downloadCount, 0);
  const totalInstalls = ca.reduce((s, a) => s + a.installCount, 0);
  const rated = ca.filter(a => a.ratingCount > 0);
  const avgRating = rated.length > 0 ? Math.round((rated.reduce((s, a) => s + a.averageRating, 0) / rated.length) * 10) / 10 : 0;
  return { assetCount: ca.length, totalDownloads, totalInstalls, averageRating: avgRating };
}

// ─── Discovery Engine ───────────────────────────────────────

export function searchAssets(assets: MarketplaceAssetModel[], query: string): MarketplaceAssetModel[] {
  const q = query.toLowerCase();
  return assets.filter(a =>
    !a.deleted && (a.status === 'published' || a.status === 'featured') &&
    (a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q) ||
     a.tags.some(t => t.toLowerCase().includes(q)) || a.creatorName.toLowerCase().includes(q))
  );
}

export function filterAssets(assets: MarketplaceAssetModel[], assetType?: MarketplaceAssetType, tags?: string[]): MarketplaceAssetModel[] {
  return assets.filter(a => {
    if (a.deleted || (a.status !== 'published' && a.status !== 'featured')) return false;
    if (assetType && a.assetType !== assetType) return false;
    if (tags && tags.length > 0 && !tags.some(t => a.tags.includes(t))) return false;
    return true;
  });
}

export function featuredAssets(assets: MarketplaceAssetModel[], limit?: number): MarketplaceAssetModel[] {
  return assets.filter(a => a.status === 'featured' && !a.deleted).slice(0, limit ?? 20);
}

export function trendingAssets(assets: MarketplaceAssetModel[], limit?: number): MarketplaceAssetModel[] {
  return [...assets].filter(a => !a.deleted && (a.status === 'published' || a.status === 'featured'))
    .sort((a, b) => (b.downloadCount + b.installCount * 3 + b.ratingCount * 2) - (a.downloadCount + a.installCount * 3 + a.ratingCount * 2))
    .slice(0, limit ?? 20);
}

export function newAssets(assets: MarketplaceAssetModel[], limit?: number): MarketplaceAssetModel[] {
  return [...assets].filter(a => !a.deleted && (a.status === 'published' || a.status === 'featured'))
    .sort((a, b) => b.publishedAt - a.publishedAt).slice(0, limit ?? 20);
}

export function highestRatedAssets(assets: MarketplaceAssetModel[], limit?: number): MarketplaceAssetModel[] {
  return [...assets].filter(a => !a.deleted && (a.status === 'published' || a.status === 'featured'))
    .sort((a, b) => b.averageRating - a.averageRating).slice(0, limit ?? 20);
}

// ─── Export / Import ────────────────────────────────────────

export function exportAssetToJSON(asset: MarketplaceAssetModel): string {
  return JSON.stringify({ format: 'stemverse-package', version: '1.0', asset: deepCopy(asset), exportedAt: new Date().toISOString() }, null, 2);
}

export function exportAssetsToCSV(assets: MarketplaceAssetModel[]): string {
  const lines = ['assetId,title,assetType,version,downloadCount,installCount,averageRating'];
  for (const a of assets) lines.push(`${a.assetId},${a.title},${a.assetType},${a.version},${a.downloadCount},${a.installCount},${a.averageRating}`);
  return lines.join('\n');
}

// ─── MarketplaceSynchronizer ────────────────────────────────

export class MarketplaceSynchronizer {
  private readonly assets = new Map<string, MarketplaceAssetModel>();
  private readonly assetOrder: string[] = [];
  private readonly packages = new Map<string, MarketplacePackageModel>();
  private readonly packageOrder: string[] = [];
  private readonly templates = new Map<string, MarketplaceTemplateModel>();
  private readonly templateOrder: string[] = [];
  private readonly lessonPacks = new Map<string, MarketplaceLessonPackModel>();
  private readonly lessonPackOrder: string[] = [];
  private readonly componentPacks = new Map<string, MarketplaceComponentPackModel>();
  private readonly componentPackOrder: string[] = [];
  private readonly competitionPacks = new Map<string, MarketplaceCompetitionPackModel>();
  private readonly competitionPackOrder: string[] = [];
  private readonly reviews = new Map<string, MarketplaceReviewModel>();
  private readonly reviewOrder: string[] = [];
  private readonly installs = new Map<string, MarketplaceInstallModel>();
  private readonly installOrder: string[] = [];
  private readonly creators = new Map<string, MarketplaceCreatorModel>();
  private readonly creatorOrder: string[] = [];

  // Asset
  public registerAsset(a: MarketplaceAssetModel): void {
    if (!a.assetId) { console.warn(`${W} empty assetId`); return; }
    const c = deepCopy(a);
    if (this.assets.has(a.assetId)) { this.assets.set(a.assetId, c); return; }
    this.assets.set(a.assetId, c); this.assetOrder.push(a.assetId);
  }
  public getAsset(id: string): MarketplaceAssetModel | undefined { const v = this.assets.get(id); return v ? deepCopy(v) : undefined; }
  public getAllAssets(): MarketplaceAssetModel[] { return this.assetOrder.filter(id => this.assets.has(id)).map(id => deepCopy(this.assets.get(id)!)); }
  public hasAsset(id: string): boolean { return this.assets.has(id); }
  public clearAssets(): void { this.assets.clear(); this.assetOrder.length = 0; }

  // Package
  public registerPackage(p: MarketplacePackageModel): void {
    if (!p.packageId) { console.warn(`${W} empty packageId`); return; }
    const c = deepCopy(p);
    if (this.packages.has(p.packageId)) { this.packages.set(p.packageId, c); return; }
    this.packages.set(p.packageId, c); this.packageOrder.push(p.packageId);
  }
  public getAllPackages(): MarketplacePackageModel[] { return this.packageOrder.filter(id => this.packages.has(id)).map(id => deepCopy(this.packages.get(id)!)); }
  public clearPackages(): void { this.packages.clear(); this.packageOrder.length = 0; }

  // Template
  public registerTemplate(t: MarketplaceTemplateModel): void {
    if (!t.templateId) { console.warn(`${W} empty templateId`); return; }
    const c = deepCopy(t);
    if (this.templates.has(t.templateId)) { this.templates.set(t.templateId, c); return; }
    this.templates.set(t.templateId, c); this.templateOrder.push(t.templateId);
  }
  public getAllTemplates(): MarketplaceTemplateModel[] { return this.templateOrder.filter(id => this.templates.has(id)).map(id => deepCopy(this.templates.get(id)!)); }
  public clearTemplates(): void { this.templates.clear(); this.templateOrder.length = 0; }

  // LessonPack
  public registerLessonPack(l: MarketplaceLessonPackModel): void {
    if (!l.lessonPackId) { console.warn(`${W} empty lessonPackId`); return; }
    const c = deepCopy(l);
    if (this.lessonPacks.has(l.lessonPackId)) { this.lessonPacks.set(l.lessonPackId, c); return; }
    this.lessonPacks.set(l.lessonPackId, c); this.lessonPackOrder.push(l.lessonPackId);
  }
  public getAllLessonPacks(): MarketplaceLessonPackModel[] { return this.lessonPackOrder.filter(id => this.lessonPacks.has(id)).map(id => deepCopy(this.lessonPacks.get(id)!)); }
  public clearLessonPacks(): void { this.lessonPacks.clear(); this.lessonPackOrder.length = 0; }

  // ComponentPack
  public registerComponentPack(c: MarketplaceComponentPackModel): void {
    if (!c.componentPackId) { console.warn(`${W} empty componentPackId`); return; }
    const cp = deepCopy(c);
    if (this.componentPacks.has(c.componentPackId)) { this.componentPacks.set(c.componentPackId, cp); return; }
    this.componentPacks.set(c.componentPackId, cp); this.componentPackOrder.push(c.componentPackId);
  }
  public getAllComponentPacks(): MarketplaceComponentPackModel[] { return this.componentPackOrder.filter(id => this.componentPacks.has(id)).map(id => deepCopy(this.componentPacks.get(id)!)); }
  public clearComponentPacks(): void { this.componentPacks.clear(); this.componentPackOrder.length = 0; }

  // CompetitionPack
  public registerCompetitionPack(c: MarketplaceCompetitionPackModel): void {
    if (!c.competitionPackId) { console.warn(`${W} empty competitionPackId`); return; }
    const cp = deepCopy(c);
    if (this.competitionPacks.has(c.competitionPackId)) { this.competitionPacks.set(c.competitionPackId, cp); return; }
    this.competitionPacks.set(c.competitionPackId, cp); this.competitionPackOrder.push(c.competitionPackId);
  }
  public getAllCompetitionPacks(): MarketplaceCompetitionPackModel[] { return this.competitionPackOrder.filter(id => this.competitionPacks.has(id)).map(id => deepCopy(this.competitionPacks.get(id)!)); }
  public clearCompetitionPacks(): void { this.competitionPacks.clear(); this.competitionPackOrder.length = 0; }

  // Review
  public registerReview(r: MarketplaceReviewModel): void {
    if (!r.reviewId) { console.warn(`${W} empty reviewId`); return; }
    const c = deepCopy(r);
    if (this.reviews.has(r.reviewId)) { this.reviews.set(r.reviewId, c); return; }
    this.reviews.set(r.reviewId, c); this.reviewOrder.push(r.reviewId);
  }
  public getAllReviews(): MarketplaceReviewModel[] { return this.reviewOrder.filter(id => this.reviews.has(id)).map(id => deepCopy(this.reviews.get(id)!)); }
  public getAssetReviews(assetId: string): MarketplaceReviewModel[] { return this.getAllReviews().filter(r => r.assetId === assetId); }
  public clearReviews(): void { this.reviews.clear(); this.reviewOrder.length = 0; }

  // Install
  public registerInstall(i: MarketplaceInstallModel): void {
    if (!i.installId) { console.warn(`${W} empty installId`); return; }
    const c = deepCopy(i);
    if (this.installs.has(i.installId)) { this.installs.set(i.installId, c); return; }
    this.installs.set(i.installId, c); this.installOrder.push(i.installId);
  }
  public getAllInstalls(): MarketplaceInstallModel[] { return this.installOrder.filter(id => this.installs.has(id)).map(id => deepCopy(this.installs.get(id)!)); }
  public getUserInstalls(userId: string): MarketplaceInstallModel[] { return this.getAllInstalls().filter(i => i.userId === userId && i.status === 'installed'); }
  public clearInstalls(): void { this.installs.clear(); this.installOrder.length = 0; }

  // Creator
  public registerCreator(c: MarketplaceCreatorModel): void {
    if (!c.marketplaceCreatorId) { console.warn(`${W} empty creatorId`); return; }
    const cp = deepCopy(c);
    if (this.creators.has(c.marketplaceCreatorId)) { this.creators.set(c.marketplaceCreatorId, cp); return; }
    this.creators.set(c.marketplaceCreatorId, cp); this.creatorOrder.push(c.marketplaceCreatorId);
  }
  public getAllCreators(): MarketplaceCreatorModel[] { return this.creatorOrder.filter(id => this.creators.has(id)).map(id => deepCopy(this.creators.get(id)!)); }
  public clearCreators(): void { this.creators.clear(); this.creatorOrder.length = 0; }

  // Lifecycle
  public clear(): void {
    this.clearAssets(); this.clearPackages(); this.clearTemplates();
    this.clearLessonPacks(); this.clearComponentPacks(); this.clearCompetitionPacks();
    this.clearReviews(); this.clearInstalls(); this.clearCreators();
  }

  public buildSnapshot(): MarketplaceSnapshot {
    return {
      assets: this.getAllAssets(), packages: this.getAllPackages(),
      templates: this.getAllTemplates(), lessonPacks: this.getAllLessonPacks(),
      componentPacks: this.getAllComponentPacks(), competitionPacks: this.getAllCompetitionPacks(),
      reviews: this.getAllReviews(), installs: this.getAllInstalls(),
      creators: this.getAllCreators(),
      totalAssets: this.assets.size, totalInstalls: this.installs.size,
      totalCreators: this.creators.size,
    };
  }

  public toJSON(): MarketplaceSnapshot { return this.buildSnapshot(); }

  public fromJSON(json: Partial<MarketplaceSnapshot>): void {
    this.clear(); if (!json) return;
    for (const a of json.assets || []) this.registerAsset(a);
    for (const p of json.packages || []) this.registerPackage(p);
    for (const t of json.templates || []) this.registerTemplate(t);
    for (const l of json.lessonPacks || []) this.registerLessonPack(l);
    for (const c of json.componentPacks || []) this.registerComponentPack(c);
    for (const c of json.competitionPacks || []) this.registerCompetitionPack(c);
    for (const r of json.reviews || []) this.registerReview(r);
    for (const i of json.installs || []) this.registerInstall(i);
    for (const c of json.creators || []) this.registerCreator(c);
  }

  public clone(): MarketplaceSynchronizer { const c = new MarketplaceSynchronizer(); c.fromJSON(this.toJSON()); return c; }

  public get assetSize(): number { return this.assets.size; }
  public get packageSize(): number { return this.packages.size; }
  public get templateSize(): number { return this.templates.size; }
  public get lessonPackSize(): number { return this.lessonPacks.size; }
  public get componentPackSize(): number { return this.componentPacks.size; }
  public get competitionPackSize(): number { return this.competitionPacks.size; }
  public get reviewSize(): number { return this.reviews.size; }
  public get installSize(): number { return this.installs.size; }
  public get creatorSize(): number { return this.creators.size; }
}
