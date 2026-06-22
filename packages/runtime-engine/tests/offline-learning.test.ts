/**
 * Phase 37A — Offline Learning Tests
 */
import { describe, it, expect } from 'vitest';
import {
  downloadLesson, advanceLessonStep, isLessonComplete, getLessonProgress,
  downloadAssignment, submitOfflineAssignment, isAssignmentOverdue, gradeOfflineAssignment,
  downloadTemplate, getTemplatesByCategory, getTotalTemplateSize,
  downloadCompetitionPack, submitCompetitionEntry, isCompetitionDeadlinePassed,
  createCompletionTracker, markLessonCompleted, markAssignmentSubmitted,
  markTemplateCached, syncTracker, getTrackerSummary,
  OfflineLearningSynchronizer,
} from '../src/stage/offline-learning-runtime';

describe('Phase 37A: Offline Learning', () => {
  describe('1 -- Lesson Management', () => {
    it('downloads and progresses lessons over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        let lesson = downloadLesson(`lesson${i}`, `Lesson ${i}`, 'content', 'class1', 5);
        expect(lesson.completedSteps).toBe(0);
        expect(getLessonProgress(lesson)).toBe(0);
        expect(isLessonComplete(lesson)).toBe(false);

        for (let s = 0; s < 5; s++) {
          lesson = advanceLessonStep(lesson);
        }
        expect(lesson.completedSteps).toBe(5);
        expect(getLessonProgress(lesson)).toBe(1);
        expect(isLessonComplete(lesson)).toBe(true);
        expect(lesson.syncStatus).toBe('pending');
      }
    });
  });

  describe('2 -- Assignment Management', () => {
    it('downloads, submits and grades assignments over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        let assign = downloadAssignment(`a${i}`, `Assignment ${i}`, 'Build a circuit', 'class1', Date.now() + 86400000);
        expect(assign.submission).toBe('');
        expect(assign.grade).toBeNull();

        assign = submitOfflineAssignment(assign, 'My circuit project');
        expect(assign.submission).toBe('My circuit project');
        expect(assign.syncStatus).toBe('pending');

        assign = gradeOfflineAssignment(assign, 95);
        expect(assign.grade).toBe(95);

        expect(isAssignmentOverdue(assign)).toBe(false);
      }
    });

    it('detects overdue assignments', () => {
      const overdue = downloadAssignment('a1', 'Old', 'Do it', 'c1', Date.now() - 1000);
      expect(isAssignmentOverdue(overdue)).toBe(true);
    });
  });

  describe('3 -- Template Management', () => {
    it('manages templates over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const templates = [
          downloadTemplate(`t${i}a`, 'LED Blink', 'beginner', '{}', 1024),
          downloadTemplate(`t${i}b`, 'Motor Control', 'advanced', '{}', 2048),
          downloadTemplate(`t${i}c`, 'Sensor Read', 'beginner', '{}', 512),
        ];
        expect(getTemplatesByCategory(templates, 'beginner')).toHaveLength(2);
        expect(getTotalTemplateSize(templates)).toBe(3584);
      }
    });
  });

  describe('4 -- Competition Packs', () => {
    it('manages competition packs over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        let pack = downloadCompetitionPack(`comp${i}`, `Competition ${i}`, 'Build fastest robot', '{}', Date.now() + 86400000);
        expect(pack.submitted).toBe(false);
        expect(isCompetitionDeadlinePassed(pack)).toBe(false);

        pack = submitCompetitionEntry(pack);
        expect(pack.submitted).toBe(true);
      }
    });
  });

  describe('5 -- Completion Tracker', () => {
    it('tracks offline progress over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        let tracker = createCompletionTracker(`student${i}`);
        expect(tracker.pendingSync).toBe(0);

        tracker = markLessonCompleted(tracker, 'lesson1');
        tracker = markLessonCompleted(tracker, 'lesson2');
        tracker = markAssignmentSubmitted(tracker, 'assign1');
        tracker = markTemplateCached(tracker, 'template1');

        const summary = getTrackerSummary(tracker);
        expect(summary.completedLessons).toBe(2);
        expect(summary.submittedAssignments).toBe(1);
        expect(summary.downloadedTemplates).toBe(1);
        expect(summary.pendingSync).toBe(3);

        tracker = syncTracker(tracker);
        expect(tracker.pendingSync).toBe(0);
      }
    });

    it('prevents duplicate tracking', () => {
      let tracker = createCompletionTracker('s1');
      tracker = markLessonCompleted(tracker, 'lesson1');
      tracker = markLessonCompleted(tracker, 'lesson1'); // duplicate
      expect(tracker.completedLessons.length).toBe(1);
      expect(tracker.pendingSync).toBe(1);
    });
  });

  describe('6 -- OfflineLearningSynchronizer', () => {
    it('full lifecycle over 500 iterations', () => {
      const sync = new OfflineLearningSynchronizer();
      for (let i = 0; i < 500; i++) {
        sync.addLesson(downloadLesson(`l${i}`, `L ${i}`, 'c', 'c1', 3));
        sync.addAssignment(downloadAssignment(`a${i}`, `A ${i}`, 'r', 'c1', Date.now() + 86400000));
        sync.addTemplate(downloadTemplate(`t${i}`, `T ${i}`, 'cat', '{}', 100));
      }

      expect(sync.getAllLessons()).toHaveLength(500);
      expect(sync.getAllAssignments()).toHaveLength(500);
      expect(sync.getAllTemplates()).toHaveLength(500);

      const json = sync.toJSON();
      const clone = sync.clone();
      expect(clone.getAllLessons()).toHaveLength(500);

      sync.clear();
      expect(sync.getAllLessons()).toHaveLength(0);
    });
  });
});
