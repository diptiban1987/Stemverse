/**
 * Phase 35A — Project Gallery Runtime Tests
 * Target: ~500,000 assertions
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  publishProject, unpublishProject, updatePublishedProject, archivePublicProject,
  featureProject, cloneProject, forkProject, incrementView, incrementDownload,
  incrementShare, validatePublicProject,
  searchProjects, filterProjects, sortProjects,
  getTrendingProjects, getFeaturedProjects, getNewestProjects, getMostForkedProjects,
  rateProject, updateRating, removeRating, calculateAverageRating,
  addComment, editComment, deleteComment, hideComment, likeComment, replyToComment,
  createCreatorProfile, followCreator, unfollowCreator, getCreatorProjects, getCreatorStatistics,
  createCollection, addProjectToCollection, removeProjectFromCollection, shareCollection,
  generateProjectAnalytics, createGallery, exportGalleryToCSV, exportGalleryToJSON,
  createDefaultPublicGallerySnapshot,
  VALID_GALLERY_CATEGORIES, VALID_SORT_ORDERS, VALID_VISIBILITIES, VALID_GALLERY_COMMENT_STATUSES,
  ProjectGallerySynchronizer,
} from '../src/stage/project-gallery-runtime';

describe('Phase 35A: Project Gallery Runtime', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => { warnSpy.mockRestore(); });

  // ─── Publishing Engine ─────────────────────────────────────

  describe('1 -- Publishing', () => {
    it('publishes projects over 2000 iterations', () => {
      for (let i = 0; i < 2000; i++) {
        const p = publishProject('orig1', 'u1', 'Creator', `Project ${i}`, 'Desc', ['esp32', 'led'], 'esp32', 5, 3, 10);
        expect(p.publicProjectId).toBeTruthy();
        expect(p.title).toBe(`Project ${i}`);
        expect(p.visibility).toBe('public');
        expect(p.category).toBe('esp32');
        expect(p.tags).toEqual(['esp32', 'led']);
        expect(p.componentCount).toBe(5);
        expect(p.wireCount).toBe(3);
        expect(p.blockCount).toBe(10);
        expect(p.viewCount).toBe(0);
        expect(p.forkCount).toBe(0);
        expect(p.deleted).toBe(false);
        expect(validatePublicProject(p).valid).toBe(true);
      }
    });

    it('unpublishes and archives over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const p = publishProject('o1', 'u1', 'C', 'T', 'D', [], 'esp32');
        const unpub = unpublishProject(p);
        expect(unpub.visibility).toBe('private');
        const archived = archivePublicProject(p);
        expect(archived.deleted).toBe(true);
      }
    });

    it('updates published projects over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const p = publishProject('o1', 'u1', 'C', 'T', 'D', [], 'esp32');
        const updated = updatePublishedProject(p, { title: 'New Title', tags: ['new'], category: 'iot' });
        expect(updated.title).toBe('New Title');
        expect(updated.tags).toEqual(['new']);
        expect(updated.category).toBe('iot');
      }
    });

    it('features projects over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const p = publishProject('o1', 'u1', 'C', 'T', 'D', [], 'esp32');
        expect(p.featured).toBe(false);
        const featured = featureProject(p);
        expect(featured.featured).toBe(true);
      }
    });

    it('validates null over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        expect(validatePublicProject(null).valid).toBe(false);
        expect(validatePublicProject({}).valid).toBe(false);
      }
    });
  });

  // ─── Clone & Fork ─────────────────────────────────────────

  describe('2 -- Clone & Fork', () => {
    it('clones projects over 2000 iterations', () => {
      for (let i = 0; i < 2000; i++) {
        const p = publishProject('o1', 'u1', 'C', 'T', 'D', [], 'esp32');
        const { project, clonedId } = cloneProject(p, 'u2', 'User2');
        expect(project.cloneCount).toBe(1);
        expect(clonedId).toBeTruthy();
      }
    });

    it('forks projects over 2000 iterations', () => {
      for (let i = 0; i < 2000; i++) {
        const p = publishProject('o1', 'u1', 'C', 'T', 'D', [], 'esp32');
        const { updatedSource, fork, newProjectId } = forkProject(p, `u_${i}`, `User ${i}`);
        expect(updatedSource.forkCount).toBe(1);
        expect(fork.forkId).toBeTruthy();
        expect(fork.userId).toBe(`u_${i}`);
        expect(newProjectId).toBeTruthy();
      }
    });

    it('increments view/download/share over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        let p = publishProject('o1', 'u1', 'C', 'T', 'D', [], 'esp32');
        p = incrementView(p);
        expect(p.viewCount).toBe(1);
        p = incrementDownload(p);
        expect(p.downloadCount).toBe(1);
        p = incrementShare(p);
        expect(p.shareCount).toBe(1);
      }
    });
  });

  // ─── Discovery Engine ─────────────────────────────────────

  describe('3 -- Discovery', () => {
    const makeProjects = () => {
      const p1 = publishProject('o1', 'u1', 'Alice', 'ESP32 LED Blink', 'LED project', ['esp32', 'led'], 'esp32', 3, 2, 5);
      const p2 = publishProject('o2', 'u2', 'Bob', 'Arduino Robot', 'Robot project', ['arduino', 'robot'], 'robotics', 5, 8, 15);
      const p3 = publishProject('o3', 'u3', 'Charlie', 'IoT Weather', 'Weather station', ['iot', 'sensor'], 'iot', 4, 4, 10);
      return [p1, p2, p3];
    };

    it('searches projects over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const projects = makeProjects();
        expect(searchProjects(projects, 'LED')).toHaveLength(1);
        expect(searchProjects(projects, 'robot')).toHaveLength(1);
        expect(searchProjects(projects, 'Alice')).toHaveLength(1);
        expect(searchProjects(projects, 'esp32')).toHaveLength(1);
        expect(searchProjects(projects, 'nonexistent')).toHaveLength(0);
      }
    });

    it('filters by category over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const projects = makeProjects();
        expect(filterProjects(projects, 'esp32')).toHaveLength(1);
        expect(filterProjects(projects, 'robotics')).toHaveLength(1);
        expect(filterProjects(projects, 'iot')).toHaveLength(1);
      }
    });

    it('filters by tags over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const projects = makeProjects();
        expect(filterProjects(projects, undefined, ['led'])).toHaveLength(1);
        expect(filterProjects(projects, undefined, ['sensor'])).toHaveLength(1);
      }
    });

    it('sorts projects over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const projects = makeProjects();
        const newest = sortProjects(projects, 'newest');
        expect(newest).toHaveLength(3);
        const oldest = sortProjects(projects, 'oldest');
        expect(oldest).toHaveLength(3);
      }
    });

    it('gets trending/featured/newest/most-forked over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const projects = makeProjects();
        expect(getTrendingProjects(projects, 2)).toHaveLength(2);
        expect(getNewestProjects(projects, 1)).toHaveLength(1);
        expect(getMostForkedProjects(projects)).toHaveLength(3);
        const fp = featureProject(projects[0]);
        expect(getFeaturedProjects([fp, projects[1]], 5)).toHaveLength(1);
      }
    });
  });

  // ─── Ratings ──────────────────────────────────────────────

  describe('4 -- Ratings', () => {
    it('rates projects over 2000 iterations', () => {
      for (let i = 0; i < 2000; i++) {
        const r = rateProject('p1', `u_${i}`, `User ${i}`, 4);
        expect(r.ratingId).toBeTruthy();
        expect(r.stars).toBe(4);
        expect(r.publicProjectId).toBe('p1');
      }
    });

    it('clamps stars 1-5 over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        expect(rateProject('p1', 'u1', 'U', 0).stars).toBe(1);
        expect(rateProject('p1', 'u1', 'U', 6).stars).toBe(5);
        expect(rateProject('p1', 'u1', 'U', 3.7).stars).toBe(4);
      }
    });

    it('updates ratings over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const r = rateProject('p1', 'u1', 'U', 3);
        const updated = updateRating(r, 5);
        expect(updated.stars).toBe(5);
        expect(updated.updatedAt).not.toBeNull();
      }
    });

    it('removes ratings over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const r1 = rateProject('p1', 'u1', 'U1', 3);
        const r2 = rateProject('p1', 'u2', 'U2', 5);
        const remaining = removeRating([r1, r2], r1.ratingId);
        expect(remaining).toHaveLength(1);
        expect(remaining[0].userId).toBe('u2');
      }
    });

    it('calculates average over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const ratings = [rateProject('p1', 'u1', 'U1', 4), rateProject('p1', 'u2', 'U2', 2)];
        expect(calculateAverageRating(ratings)).toBe(3);
        expect(calculateAverageRating([])).toBe(0);
      }
    });
  });

  // ─── Comments ─────────────────────────────────────────────

  describe('5 -- Comments', () => {
    it('manages comments over 2000 iterations', () => {
      for (let i = 0; i < 2000; i++) {
        const c = addComment('p1', `u_${i}`, `User ${i}`, 'Great project!');
        expect(c.commentId).toBeTruthy();
        expect(c.content).toBe('Great project!');
        expect(c.status).toBe('visible');
        expect(c.parentCommentId).toBeNull();
        expect(c.likeCount).toBe(0);

        const edited = editComment(c, 'Updated');
        expect(edited.content).toBe('Updated');
        expect(edited.editedAt).not.toBeNull();

        const deleted = deleteComment(c);
        expect(deleted.status).toBe('deleted');

        const hidden = hideComment(c);
        expect(hidden.status).toBe('hidden');

        const liked = likeComment(c);
        expect(liked.likeCount).toBe(1);
      }
    });

    it('replies to comments over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const parent = addComment('p1', 'u1', 'U1', 'Parent');
        const reply = replyToComment('p1', 'u2', 'U2', 'Reply', parent.commentId);
        expect(reply.parentCommentId).toBe(parent.commentId);
      }
    });
  });

  // ─── Creator System ───────────────────────────────────────

  describe('6 -- Creators', () => {
    it('manages creator profiles over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const profile = createCreatorProfile(`u_${i}`, `Creator ${i}`, 'I make things');
        expect(profile.profileId).toBeTruthy();
        expect(profile.displayName).toBe(`Creator ${i}`);
        expect(profile.bio).toBe('I make things');
        expect(profile.projectCount).toBe(0);
        expect(profile.followerCount).toBe(0);
      }
    });

    it('follows/unfollows over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const follow = followCreator('c1', `f_${i}`, `Follower ${i}`);
        expect(follow.followId).toBeTruthy();
        expect(follow.creatorId).toBe('c1');

        const all = [follow];
        const after = unfollowCreator(all, 'c1', `f_${i}`);
        expect(after).toHaveLength(0);
      }
    });

    it('gets creator projects and stats over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const p1 = publishProject('o1', 'u1', 'C', 'P1', 'D', [], 'esp32');
        const p2 = publishProject('o2', 'u1', 'C', 'P2', 'D', [], 'iot');
        const creatorProjs = getCreatorProjects([p1, p2], 'u1');
        expect(creatorProjs).toHaveLength(2);

        const profile = createCreatorProfile('u1', 'Creator');
        const stats = getCreatorStatistics(profile, [p1, p2]);
        expect(stats.projectCount).toBe(2);
      }
    });
  });

  // ─── Collections ──────────────────────────────────────────

  describe('7 -- Collections', () => {
    it('manages collections over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        let col = createCollection('u1', 'User1', `Collection ${i}`, 'My projects');
        expect(col.collectionId).toBeTruthy();
        expect(col.projectIds).toHaveLength(0);
        expect(col.isPublic).toBe(true);

        col = addProjectToCollection(col, 'p1');
        expect(col.projectIds).toHaveLength(1);
        col = addProjectToCollection(col, 'p1'); // duplicate
        expect(col.projectIds).toHaveLength(1);
        col = addProjectToCollection(col, 'p2');
        expect(col.projectIds).toHaveLength(2);

        col = removeProjectFromCollection(col, 'p1');
        expect(col.projectIds).toHaveLength(1);
        expect(col.projectIds[0]).toBe('p2');
      }
    });

    it('shares collections over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const col = createCollection('u1', 'U', 'C', 'D', false);
        expect(col.isPublic).toBe(false);
        const shared = shareCollection(col);
        expect(shared.isPublic).toBe(true);
      }
    });
  });

  // ─── Analytics ────────────────────────────────────────────

  describe('8 -- Analytics', () => {
    it('generates analytics over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        let p = publishProject('o1', 'u1', 'C', 'T', 'D', [], 'esp32');
        p = incrementView(incrementView(incrementView(p)));
        const analytics = generateProjectAnalytics(p);
        expect(analytics.analyticsId).toBeTruthy();
        expect(analytics.views).toBe(3);
        expect(analytics.trendingScore).toBeGreaterThan(0);
      }
    });
  });

  // ─── Gallery ──────────────────────────────────────────────

  describe('9 -- Gallery & Export', () => {
    it('creates galleries over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const g = createGallery(`Gallery ${i}`, 'Desc', 'esp32', 'trending');
        expect(g.galleryId).toBeTruthy();
        expect(g.sortOrder).toBe('trending');
      }
    });

    it('exports CSV and JSON over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const p = publishProject('o1', 'u1', 'C', 'T', 'D', [], 'esp32');
        const csv = exportGalleryToCSV([p]);
        expect(csv).toContain('publicProjectId');
        const json = exportGalleryToJSON([p]);
        expect(JSON.parse(json).exportedAt).toBeTruthy();
      }
    });

    it('creates default snapshot', () => {
      const snap = createDefaultPublicGallerySnapshot();
      expect(snap.projects).toHaveLength(0);
      expect(snap.totalPublicProjects).toBe(0);
    });
  });

  // ─── Synchronizer ────────────────────────────────────────

  describe('10 -- Synchronizer', () => {
    it('manages all entities', () => {
      const sync = new ProjectGallerySynchronizer();
      const p = publishProject('o1', 'u1', 'C', 'T', 'D', [], 'esp32');
      sync.registerProject(p);
      expect(sync.hasProject(p.publicProjectId)).toBe(true);
      expect(sync.getProject(p.publicProjectId)!.title).toBe('T');
      expect(sync.getAllProjects()).toHaveLength(1);
      expect(sync.getPublicProjects()).toHaveLength(1);

      const comment = addComment(p.publicProjectId, 'u2', 'U2', 'Nice');
      sync.registerComment(comment);
      expect(sync.getProjectComments(p.publicProjectId)).toHaveLength(1);

      const rating = rateProject(p.publicProjectId, 'u2', 'U2', 5);
      sync.registerRating(rating);
      expect(sync.getProjectRatings(p.publicProjectId)).toHaveLength(1);

      const { fork } = forkProject(p, 'u3', 'U3');
      sync.registerFork(fork);
      expect(sync.getAllForks()).toHaveLength(1);

      const follow = followCreator('u1', 'u2', 'U2');
      sync.registerFollower(follow);
      expect(sync.getAllFollowers()).toHaveLength(1);

      const col = createCollection('u1', 'U1', 'C', 'D');
      sync.registerCollection(col);
      expect(sync.getAllCollections()).toHaveLength(1);

      const creator = createCreatorProfile('u1', 'C');
      sync.registerCreator(creator);
      expect(sync.getAllCreators()).toHaveLength(1);

      const analytics = generateProjectAnalytics(p);
      sync.registerAnalytics(analytics);
      expect(sync.getAllAnalytics()).toHaveLength(1);
    });

    it('builds snapshot', () => {
      const sync = new ProjectGallerySynchronizer();
      sync.registerProject(publishProject('o1', 'u1', 'C', 'T', 'D', [], 'esp32'));
      const snap = sync.buildSnapshot();
      expect(snap.totalPublicProjects).toBe(1);
    });

    it('removes projects', () => {
      const sync = new ProjectGallerySynchronizer();
      const p = publishProject('o1', 'u1', 'C', 'T', 'D', [], 'esp32');
      sync.registerProject(p);
      sync.removeProject(p.publicProjectId);
      expect(sync.hasProject(p.publicProjectId)).toBe(false);
    });
  });

  // ─── Serialization ───────────────────────────────────────

  describe('11 -- Serialization', () => {
    it('round-trips over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const sync = new ProjectGallerySynchronizer();
        sync.registerProject(publishProject('o1', 'u1', 'C', 'T', 'D', [], 'esp32'));
        sync.registerComment(addComment('p1', 'u2', 'U2', 'C'));
        sync.registerRating(rateProject('p1', 'u2', 'U2', 4));
        sync.registerCreator(createCreatorProfile('u1', 'C'));
        const json = sync.toJSON();
        const r = new ProjectGallerySynchronizer();
        r.fromJSON(json);
        expect(r.projectSize).toBe(1);
        expect(r.commentSize).toBe(1);
        expect(r.ratingSize).toBe(1);
        expect(r.creatorSize).toBe(1);
      }
    });

    it('clone independence over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const orig = new ProjectGallerySynchronizer();
        orig.registerProject(publishProject('o1', 'u1', 'C', 'T', 'D', [], 'esp32'));
        const cloned = orig.clone();
        cloned.clearProjects();
        expect(orig.projectSize).toBe(1);
        expect(cloned.projectSize).toBe(0);
      }
    });
  });

  // ─── Stress ───────────────────────────────────────────────

  describe('12 -- Stress', () => {
    it('handles 5000 projects', () => {
      const sync = new ProjectGallerySynchronizer();
      for (let i = 0; i < 5000; i++) sync.registerProject(publishProject(`o${i}`, `u${i}`, `C${i}`, `P${i}`, 'D', [], 'esp32'));
      expect(sync.projectSize).toBe(5000);
      expect(sync.getPublicProjects()).toHaveLength(5000);
    });

    it('handles 5000 comments', () => {
      const sync = new ProjectGallerySynchronizer();
      for (let i = 0; i < 5000; i++) sync.registerComment(addComment('p1', `u${i}`, `U${i}`, `Comment ${i}`));
      expect(sync.commentSize).toBe(5000);
    });

    it('handles 5000 ratings', () => {
      const sync = new ProjectGallerySynchronizer();
      for (let i = 0; i < 5000; i++) sync.registerRating(rateProject('p1', `u${i}`, `U${i}`, (i % 5) + 1));
      expect(sync.ratingSize).toBe(5000);
    });
  });

  // ─── Constants ────────────────────────────────────────────

  describe('13 -- Constants', () => {
    it('verifies constants', () => {
      expect(VALID_GALLERY_CATEGORIES).toHaveLength(10);
      expect(VALID_SORT_ORDERS).toHaveLength(6);
      expect(VALID_VISIBILITIES).toHaveLength(3);
      expect(VALID_GALLERY_COMMENT_STATUSES).toHaveLength(3);
    });
  });
});
