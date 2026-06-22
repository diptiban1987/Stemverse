/**
 * Phase 35A — Project Gallery Runtime
 *
 * Publishing, discovery, ratings, comments, forks, clones,
 * collections, creator profiles, project analytics.
 */

import type {
  PublicProjectModel, ProjectGalleryModel, GalleryCommentModel,
  GalleryRatingModel, GalleryForkModel, GalleryFollowerModel,
  GalleryCollectionModel, CreatorProfileModel, GalleryAnalyticsModel,
  PublicGallerySnapshot, GalleryCategory, GallerySortOrder,
  ProjectVisibility, GalleryCommentStatus,
} from '../types';

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
function deepCopy<T>(v: T): T { return JSON.parse(JSON.stringify(v)); }
const W = '[Phase 35A Gallery]';

export const VALID_GALLERY_CATEGORIES: GalleryCategory[] = ['esp32', 'arduino', 'iot', 'robotics', 'ai_robotics', 'automation', 'education', 'innovation', 'competition', 'other'];
export const VALID_SORT_ORDERS: GallerySortOrder[] = ['newest', 'oldest', 'most_rated', 'most_forked', 'most_viewed', 'trending'];
export const VALID_VISIBILITIES: ProjectVisibility[] = ['public', 'private', 'unlisted'];
export const VALID_GALLERY_COMMENT_STATUSES: GalleryCommentStatus[] = ['visible', 'hidden', 'deleted'];

// ─── Publishing Engine ──────────────────────────────────────

export function publishProject(
  originalProjectId: string, creatorId: string, creatorName: string,
  title: string, description: string, tags: string[], category: GalleryCategory,
  componentCount?: number, wireCount?: number, blockCount?: number,
): PublicProjectModel {
  return {
    publicProjectId: generateId(), originalProjectId, creatorId, creatorName,
    title, description, tags: [...tags], category, visibility: 'public',
    thumbnailUrl: '', componentCount: componentCount ?? 0,
    wireCount: wireCount ?? 0, blockCount: blockCount ?? 0,
    viewCount: 0, downloadCount: 0, forkCount: 0, cloneCount: 0,
    ratingCount: 0, averageRating: 0, commentCount: 0, shareCount: 0,
    deviceUploadCount: 0, publishedAt: Date.now(), updatedAt: Date.now(),
    featured: false, deleted: false,
  };
}

export function unpublishProject(project: PublicProjectModel): PublicProjectModel {
  const p = deepCopy(project); p.visibility = 'private'; p.updatedAt = Date.now(); return p;
}

export function updatePublishedProject(
  project: PublicProjectModel,
  updates: Partial<Pick<PublicProjectModel, 'title' | 'description' | 'tags' | 'category' | 'visibility' | 'thumbnailUrl'>>,
): PublicProjectModel {
  const p = deepCopy(project);
  if (updates.title !== undefined) p.title = updates.title;
  if (updates.description !== undefined) p.description = updates.description;
  if (updates.tags !== undefined) p.tags = [...updates.tags];
  if (updates.category !== undefined) p.category = updates.category;
  if (updates.visibility !== undefined) p.visibility = updates.visibility;
  if (updates.thumbnailUrl !== undefined) p.thumbnailUrl = updates.thumbnailUrl;
  p.updatedAt = Date.now();
  return p;
}

export function archivePublicProject(project: PublicProjectModel): PublicProjectModel {
  const p = deepCopy(project); p.deleted = true; p.updatedAt = Date.now(); return p;
}

export function featureProject(project: PublicProjectModel): PublicProjectModel {
  const p = deepCopy(project); p.featured = true; p.updatedAt = Date.now(); return p;
}

export function cloneProject(project: PublicProjectModel, userId: string, userName: string): { project: PublicProjectModel; clonedId: string } {
  const p = deepCopy(project); p.cloneCount++; p.updatedAt = Date.now();
  return { project: p, clonedId: generateId() };
}

export function forkProject(
  sourceProject: PublicProjectModel, userId: string, userName: string,
): { updatedSource: PublicProjectModel; fork: GalleryForkModel; newProjectId: string } {
  const src = deepCopy(sourceProject); src.forkCount++; src.updatedAt = Date.now();
  const newProjectId = generateId();
  const fork: GalleryForkModel = {
    forkId: generateId(), sourceProjectId: sourceProject.publicProjectId,
    forkedProjectId: newProjectId, userId, userName, forkedAt: Date.now(),
  };
  return { updatedSource: src, fork, newProjectId };
}

export function incrementView(project: PublicProjectModel): PublicProjectModel {
  const p = deepCopy(project); p.viewCount++; return p;
}

export function incrementDownload(project: PublicProjectModel): PublicProjectModel {
  const p = deepCopy(project); p.downloadCount++; return p;
}

export function incrementShare(project: PublicProjectModel): PublicProjectModel {
  const p = deepCopy(project); p.shareCount++; return p;
}

export function validatePublicProject(proj: unknown): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!proj || typeof proj !== 'object') { warnings.push(`${W} null`); console.warn(warnings[0]); return { valid: false, warnings }; }
  const p = proj as Record<string, unknown>;
  if (typeof p.publicProjectId !== 'string' || !p.publicProjectId) { warnings.push(`${W} empty publicProjectId`); console.warn(warnings[warnings.length - 1]); }
  return { valid: warnings.length === 0, warnings };
}

// ─── Discovery Engine ───────────────────────────────────────

export function searchProjects(projects: PublicProjectModel[], query: string): PublicProjectModel[] {
  const q = query.toLowerCase();
  return projects.filter(p =>
    !p.deleted && p.visibility === 'public' &&
    (p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) ||
     p.tags.some(t => t.toLowerCase().includes(q)) || p.creatorName.toLowerCase().includes(q))
  );
}

export function filterProjects(projects: PublicProjectModel[], category?: GalleryCategory, tags?: string[]): PublicProjectModel[] {
  return projects.filter(p => {
    if (p.deleted || p.visibility !== 'public') return false;
    if (category && p.category !== category) return false;
    if (tags && tags.length > 0 && !tags.some(t => p.tags.includes(t))) return false;
    return true;
  });
}

export function sortProjects(projects: PublicProjectModel[], order: GallerySortOrder): PublicProjectModel[] {
  const sorted = [...projects];
  switch (order) {
    case 'newest': sorted.sort((a, b) => b.publishedAt - a.publishedAt); break;
    case 'oldest': sorted.sort((a, b) => a.publishedAt - b.publishedAt); break;
    case 'most_rated': sorted.sort((a, b) => b.averageRating - a.averageRating); break;
    case 'most_forked': sorted.sort((a, b) => b.forkCount - a.forkCount); break;
    case 'most_viewed': sorted.sort((a, b) => b.viewCount - a.viewCount); break;
    case 'trending': sorted.sort((a, b) => (b.viewCount + b.forkCount * 5 + b.ratingCount * 3) - (a.viewCount + a.forkCount * 5 + a.ratingCount * 3)); break;
  }
  return sorted;
}

export function getTrendingProjects(projects: PublicProjectModel[], limit?: number): PublicProjectModel[] {
  return sortProjects(projects.filter(p => !p.deleted && p.visibility === 'public'), 'trending').slice(0, limit ?? 20);
}

export function getFeaturedProjects(projects: PublicProjectModel[], limit?: number): PublicProjectModel[] {
  return projects.filter(p => p.featured && !p.deleted && p.visibility === 'public').slice(0, limit ?? 20);
}

export function getNewestProjects(projects: PublicProjectModel[], limit?: number): PublicProjectModel[] {
  return sortProjects(projects.filter(p => !p.deleted && p.visibility === 'public'), 'newest').slice(0, limit ?? 20);
}

export function getMostForkedProjects(projects: PublicProjectModel[], limit?: number): PublicProjectModel[] {
  return sortProjects(projects.filter(p => !p.deleted && p.visibility === 'public'), 'most_forked').slice(0, limit ?? 20);
}

// ─── Rating System ──────────────────────────────────────────

export function rateProject(publicProjectId: string, userId: string, userName: string, stars: number): GalleryRatingModel {
  return {
    ratingId: generateId(), publicProjectId, userId, userName,
    stars: Math.max(1, Math.min(5, Math.round(stars))),
    createdAt: Date.now(), updatedAt: null,
  };
}

export function updateRating(rating: GalleryRatingModel, stars: number): GalleryRatingModel {
  const r = deepCopy(rating); r.stars = Math.max(1, Math.min(5, Math.round(stars))); r.updatedAt = Date.now(); return r;
}

export function removeRating(ratings: GalleryRatingModel[], ratingId: string): GalleryRatingModel[] {
  return ratings.filter(r => r.ratingId !== ratingId);
}

export function calculateAverageRating(ratings: GalleryRatingModel[]): number {
  if (ratings.length === 0) return 0;
  return Math.round((ratings.reduce((s, r) => s + r.stars, 0) / ratings.length) * 10) / 10;
}

// ─── Comments System ────────────────────────────────────────

export function addComment(publicProjectId: string, authorId: string, authorName: string, content: string, parentCommentId?: string): GalleryCommentModel {
  return {
    commentId: generateId(), publicProjectId, authorId, authorName,
    content, parentCommentId: parentCommentId || null,
    likeCount: 0, status: 'visible',
    createdAt: Date.now(), editedAt: null,
  };
}

export function editComment(comment: GalleryCommentModel, newContent: string): GalleryCommentModel {
  const c = deepCopy(comment); c.content = newContent; c.editedAt = Date.now(); return c;
}

export function deleteComment(comment: GalleryCommentModel): GalleryCommentModel {
  const c = deepCopy(comment); c.status = 'deleted'; return c;
}

export function hideComment(comment: GalleryCommentModel): GalleryCommentModel {
  const c = deepCopy(comment); c.status = 'hidden'; return c;
}

export function likeComment(comment: GalleryCommentModel): GalleryCommentModel {
  const c = deepCopy(comment); c.likeCount++; return c;
}

export function replyToComment(publicProjectId: string, authorId: string, authorName: string, content: string, parentCommentId: string): GalleryCommentModel {
  return addComment(publicProjectId, authorId, authorName, content, parentCommentId);
}

// ─── Creator System ─────────────────────────────────────────

export function createCreatorProfile(userId: string, displayName: string, bio?: string): CreatorProfileModel {
  return {
    profileId: generateId(), userId, displayName,
    bio: bio ?? '', avatarUrl: '',
    projectCount: 0, followerCount: 0, followingCount: 0,
    totalViews: 0, totalForks: 0, totalRatings: 0, averageRating: 0,
    joinedAt: Date.now(), lastActiveAt: Date.now(),
  };
}

export function followCreator(creatorId: string, followerId: string, followerName: string): GalleryFollowerModel {
  return { followId: generateId(), creatorId, followerId, followerName, followedAt: Date.now() };
}

export function unfollowCreator(followers: GalleryFollowerModel[], creatorId: string, followerId: string): GalleryFollowerModel[] {
  return followers.filter(f => !(f.creatorId === creatorId && f.followerId === followerId));
}

export function getCreatorProjects(projects: PublicProjectModel[], creatorId: string): PublicProjectModel[] {
  return projects.filter(p => p.creatorId === creatorId && !p.deleted);
}

export function getCreatorStatistics(creator: CreatorProfileModel, projects: PublicProjectModel[]): {
  totalViews: number; totalForks: number; totalRatings: number; averageRating: number; projectCount: number;
} {
  const creatorProjects = projects.filter(p => p.creatorId === creator.userId && !p.deleted);
  const totalViews = creatorProjects.reduce((s, p) => s + p.viewCount, 0);
  const totalForks = creatorProjects.reduce((s, p) => s + p.forkCount, 0);
  const totalRatings = creatorProjects.reduce((s, p) => s + p.ratingCount, 0);
  const rated = creatorProjects.filter(p => p.ratingCount > 0);
  const avgRating = rated.length > 0 ? Math.round((rated.reduce((s, p) => s + p.averageRating, 0) / rated.length) * 10) / 10 : 0;
  return { totalViews, totalForks, totalRatings, averageRating: avgRating, projectCount: creatorProjects.length };
}

// ─── Collections ────────────────────────────────────────────

export function createCollection(ownerId: string, ownerName: string, title: string, description: string, isPublic?: boolean): GalleryCollectionModel {
  return {
    collectionId: generateId(), ownerId, ownerName, title, description,
    projectIds: [], isPublic: isPublic ?? true,
    createdAt: Date.now(), updatedAt: Date.now(),
  };
}

export function addProjectToCollection(collection: GalleryCollectionModel, projectId: string): GalleryCollectionModel {
  const c = deepCopy(collection);
  if (!c.projectIds.includes(projectId)) { c.projectIds.push(projectId); c.updatedAt = Date.now(); }
  return c;
}

export function removeProjectFromCollection(collection: GalleryCollectionModel, projectId: string): GalleryCollectionModel {
  const c = deepCopy(collection);
  c.projectIds = c.projectIds.filter(id => id !== projectId);
  c.updatedAt = Date.now();
  return c;
}

export function shareCollection(collection: GalleryCollectionModel): GalleryCollectionModel {
  const c = deepCopy(collection); c.isPublic = true; c.updatedAt = Date.now(); return c;
}

// ─── Project Analytics ──────────────────────────────────────

export function generateProjectAnalytics(project: PublicProjectModel): GalleryAnalyticsModel {
  const trendingScore = project.viewCount + project.forkCount * 5 + project.ratingCount * 3 + project.commentCount * 2;
  return {
    analyticsId: generateId(), publicProjectId: project.publicProjectId,
    views: project.viewCount, downloads: project.downloadCount,
    forks: project.forkCount, clones: project.cloneCount,
    ratings: project.ratingCount, comments: project.commentCount,
    shares: project.shareCount, deviceUploads: project.deviceUploadCount,
    viewsLast7Days: 0, forksLast7Days: 0,
    trendingScore, generatedAt: Date.now(),
  };
}

// ─── Gallery ────────────────────────────────────────────────

export function createGallery(title: string, description: string, category: GalleryCategory, sortOrder?: GallerySortOrder): ProjectGalleryModel {
  return {
    galleryId: generateId(), title, description,
    curatedProjectIds: [], category, sortOrder: sortOrder ?? 'newest',
    createdAt: Date.now(),
  };
}

// ─── Export ─────────────────────────────────────────────────

export function exportGalleryToCSV(projects: PublicProjectModel[]): string {
  const lines = ['publicProjectId,title,category,viewCount,forkCount,averageRating,publishedAt'];
  for (const p of projects) lines.push(`${p.publicProjectId},${p.title},${p.category},${p.viewCount},${p.forkCount},${p.averageRating},${p.publishedAt}`);
  return lines.join('\n');
}

export function exportGalleryToJSON(projects: PublicProjectModel[]): string {
  return JSON.stringify({ projects: deepCopy(projects), exportedAt: new Date().toISOString() }, null, 2);
}

// ─── Default Snapshot ───────────────────────────────────────

export function createDefaultPublicGallerySnapshot(): PublicGallerySnapshot {
  return {
    projects: [], galleries: [], comments: [], ratings: [],
    forks: [], followers: [], collections: [], creators: [], analytics: [],
    totalPublicProjects: 0, totalCreators: 0, totalCollections: 0,
  };
}

// ─── ProjectGallerySynchronizer ─────────────────────────────

export class ProjectGallerySynchronizer {
  private readonly projects = new Map<string, PublicProjectModel>();
  private readonly projectOrder: string[] = [];
  private readonly comments = new Map<string, GalleryCommentModel>();
  private readonly commentOrder: string[] = [];
  private readonly ratings = new Map<string, GalleryRatingModel>();
  private readonly ratingOrder: string[] = [];
  private readonly forks = new Map<string, GalleryForkModel>();
  private readonly forkOrder: string[] = [];
  private readonly followers = new Map<string, GalleryFollowerModel>();
  private readonly followerOrder: string[] = [];
  private readonly collections = new Map<string, GalleryCollectionModel>();
  private readonly collectionOrder: string[] = [];
  private readonly creators = new Map<string, CreatorProfileModel>();
  private readonly creatorOrder: string[] = [];
  private readonly analytics = new Map<string, GalleryAnalyticsModel>();
  private readonly analyticsOrder: string[] = [];

  // Project CRUD
  public registerProject(p: PublicProjectModel): void {
    if (!p.publicProjectId) { console.warn(`${W} empty id`); return; }
    const c = deepCopy(p);
    if (this.projects.has(p.publicProjectId)) { this.projects.set(p.publicProjectId, c); return; }
    this.projects.set(p.publicProjectId, c); this.projectOrder.push(p.publicProjectId);
  }
  public getProject(id: string): PublicProjectModel | undefined { const v = this.projects.get(id); return v ? deepCopy(v) : undefined; }
  public getAllProjects(): PublicProjectModel[] { return this.projectOrder.filter(id => this.projects.has(id)).map(id => deepCopy(this.projects.get(id)!)); }
  public getPublicProjects(): PublicProjectModel[] { return this.getAllProjects().filter(p => p.visibility === 'public' && !p.deleted); }
  public hasProject(id: string): boolean { return this.projects.has(id); }
  public removeProject(id: string): void { this.projects.delete(id); const i = this.projectOrder.indexOf(id); if (i !== -1) this.projectOrder.splice(i, 1); }
  public clearProjects(): void { this.projects.clear(); this.projectOrder.length = 0; }

  // Comment CRUD
  public registerComment(c: GalleryCommentModel): void {
    if (!c.commentId) { console.warn(`${W} empty commentId`); return; }
    const cp = deepCopy(c);
    if (this.comments.has(c.commentId)) { this.comments.set(c.commentId, cp); return; }
    this.comments.set(c.commentId, cp); this.commentOrder.push(c.commentId);
  }
  public getAllComments(): GalleryCommentModel[] { return this.commentOrder.filter(id => this.comments.has(id)).map(id => deepCopy(this.comments.get(id)!)); }
  public getProjectComments(projectId: string): GalleryCommentModel[] { return this.getAllComments().filter(c => c.publicProjectId === projectId && c.status === 'visible'); }
  public clearComments(): void { this.comments.clear(); this.commentOrder.length = 0; }

  // Rating CRUD
  public registerRating(r: GalleryRatingModel): void {
    if (!r.ratingId) { console.warn(`${W} empty ratingId`); return; }
    const cp = deepCopy(r);
    if (this.ratings.has(r.ratingId)) { this.ratings.set(r.ratingId, cp); return; }
    this.ratings.set(r.ratingId, cp); this.ratingOrder.push(r.ratingId);
  }
  public getAllRatings(): GalleryRatingModel[] { return this.ratingOrder.filter(id => this.ratings.has(id)).map(id => deepCopy(this.ratings.get(id)!)); }
  public getProjectRatings(projectId: string): GalleryRatingModel[] { return this.getAllRatings().filter(r => r.publicProjectId === projectId); }
  public clearRatings(): void { this.ratings.clear(); this.ratingOrder.length = 0; }

  // Fork CRUD
  public registerFork(f: GalleryForkModel): void {
    if (!f.forkId) { console.warn(`${W} empty forkId`); return; }
    const cp = deepCopy(f);
    if (this.forks.has(f.forkId)) { this.forks.set(f.forkId, cp); return; }
    this.forks.set(f.forkId, cp); this.forkOrder.push(f.forkId);
  }
  public getAllForks(): GalleryForkModel[] { return this.forkOrder.filter(id => this.forks.has(id)).map(id => deepCopy(this.forks.get(id)!)); }
  public clearForks(): void { this.forks.clear(); this.forkOrder.length = 0; }

  // Follower CRUD
  public registerFollower(f: GalleryFollowerModel): void {
    if (!f.followId) { console.warn(`${W} empty followId`); return; }
    const cp = deepCopy(f);
    if (this.followers.has(f.followId)) { this.followers.set(f.followId, cp); return; }
    this.followers.set(f.followId, cp); this.followerOrder.push(f.followId);
  }
  public getAllFollowers(): GalleryFollowerModel[] { return this.followerOrder.filter(id => this.followers.has(id)).map(id => deepCopy(this.followers.get(id)!)); }
  public clearFollowers(): void { this.followers.clear(); this.followerOrder.length = 0; }

  // Collection CRUD
  public registerCollection(c: GalleryCollectionModel): void {
    if (!c.collectionId) { console.warn(`${W} empty collectionId`); return; }
    const cp = deepCopy(c);
    if (this.collections.has(c.collectionId)) { this.collections.set(c.collectionId, cp); return; }
    this.collections.set(c.collectionId, cp); this.collectionOrder.push(c.collectionId);
  }
  public getAllCollections(): GalleryCollectionModel[] { return this.collectionOrder.filter(id => this.collections.has(id)).map(id => deepCopy(this.collections.get(id)!)); }
  public clearCollections(): void { this.collections.clear(); this.collectionOrder.length = 0; }

  // Creator CRUD
  public registerCreator(c: CreatorProfileModel): void {
    if (!c.profileId) { console.warn(`${W} empty profileId`); return; }
    const cp = deepCopy(c);
    if (this.creators.has(c.profileId)) { this.creators.set(c.profileId, cp); return; }
    this.creators.set(c.profileId, cp); this.creatorOrder.push(c.profileId);
  }
  public getAllCreators(): CreatorProfileModel[] { return this.creatorOrder.filter(id => this.creators.has(id)).map(id => deepCopy(this.creators.get(id)!)); }
  public clearCreators(): void { this.creators.clear(); this.creatorOrder.length = 0; }

  // Analytics CRUD
  public registerAnalytics(a: GalleryAnalyticsModel): void {
    if (!a.analyticsId) { console.warn(`${W} empty analyticsId`); return; }
    const cp = deepCopy(a);
    if (this.analytics.has(a.analyticsId)) { this.analytics.set(a.analyticsId, cp); return; }
    this.analytics.set(a.analyticsId, cp); this.analyticsOrder.push(a.analyticsId);
  }
  public getAllAnalytics(): GalleryAnalyticsModel[] { return this.analyticsOrder.filter(id => this.analytics.has(id)).map(id => deepCopy(this.analytics.get(id)!)); }
  public clearAnalytics(): void { this.analytics.clear(); this.analyticsOrder.length = 0; }

  // Lifecycle
  public clear(): void {
    this.clearProjects(); this.clearComments(); this.clearRatings();
    this.clearForks(); this.clearFollowers(); this.clearCollections();
    this.clearCreators(); this.clearAnalytics();
  }

  public buildSnapshot(): PublicGallerySnapshot {
    return {
      projects: this.getAllProjects(), galleries: [], comments: this.getAllComments(),
      ratings: this.getAllRatings(), forks: this.getAllForks(),
      followers: this.getAllFollowers(), collections: this.getAllCollections(),
      creators: this.getAllCreators(), analytics: this.getAllAnalytics(),
      totalPublicProjects: this.getPublicProjects().length,
      totalCreators: this.creators.size, totalCollections: this.collections.size,
    };
  }

  public toJSON(): PublicGallerySnapshot { return this.buildSnapshot(); }

  public fromJSON(json: Partial<PublicGallerySnapshot>): void {
    this.clear(); if (!json) return;
    for (const p of json.projects || []) this.registerProject(p);
    for (const c of json.comments || []) this.registerComment(c);
    for (const r of json.ratings || []) this.registerRating(r);
    for (const f of json.forks || []) this.registerFork(f);
    for (const f of json.followers || []) this.registerFollower(f);
    for (const c of json.collections || []) this.registerCollection(c);
    for (const c of json.creators || []) this.registerCreator(c);
    for (const a of json.analytics || []) this.registerAnalytics(a);
  }

  public clone(): ProjectGallerySynchronizer {
    const c = new ProjectGallerySynchronizer(); c.fromJSON(this.toJSON()); return c;
  }

  public get projectSize(): number { return this.projects.size; }
  public get commentSize(): number { return this.comments.size; }
  public get ratingSize(): number { return this.ratings.size; }
  public get forkSize(): number { return this.forks.size; }
  public get followerSize(): number { return this.followers.size; }
  public get collectionSize(): number { return this.collections.size; }
  public get creatorSize(): number { return this.creators.size; }
  public get analyticsSize(): number { return this.analytics.size; }
}
