/**
 * Phase 38A — Analytics Runtime Tests
 */
import { describe, it, expect } from 'vitest';
import {
  trackEvent, trackPageView, trackWorkspaceAction, trackSimulatorAction,
  trackMarketplaceAction, trackCompetitionAction, trackLearningAction,
  trackDeviceAction, trackAIAction, trackCollaborationAction,
  createEventBatch, flushBatch, mergeBatches,
  aggregateEvents, getEventsByCategory, getEventsByUser, getEventCountByAction,
  getDefaultRetention, evictExpiredEvents,
  calculateDAU, calculateWAU, calculateMAU,
  AnalyticsSynchronizer,
} from '../src/stage/analytics-runtime';

describe('Phase 38A: Analytics Runtime', () => {
  it('tracks all event types over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const pv = trackPageView('/simulator', `u${i}`, `s${i}`);
      expect(pv.category).toBe('page_view');
      expect(pv.label).toBe('/simulator');

      const ws = trackWorkspaceAction('create_project', `p${i}`, `u${i}`);
      expect(ws.category).toBe('workspace');

      const sim = trackSimulatorAction('place_component', 'resistor', `u${i}`);
      expect(sim.category).toBe('simulator');

      const mp = trackMarketplaceAction('download', `a${i}`);
      expect(mp.category).toBe('marketplace');

      const comp = trackCompetitionAction('submit', `c${i}`);
      expect(comp.category).toBe('competition');

      const learn = trackLearningAction('complete_lesson', `l${i}`);
      expect(learn.category).toBe('learning');

      const dev = trackDeviceAction('upload', 'arduino_uno');
      expect(dev.category).toBe('device');

      const ai = trackAIAction('generate', 'gpt-4', 150);
      expect(ai.category).toBe('ai');
      expect(ai.value).toBe(150);

      const collab = trackCollaborationAction('join_room', `r${i}`);
      expect(collab.category).toBe('collaboration');

      const generic = trackEvent('system', 'startup', 'app', 1);
      expect(generic.category).toBe('system');
    }
  });

  it('batches and aggregates events over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const events = [
        trackPageView('/sim', 'u1'), trackPageView('/sim', 'u2'),
        trackSimulatorAction('place', 'led', 'u1'),
      ];
      const batch = createEventBatch(events);
      expect(batch.size).toBe(3);
      const flushed = flushBatch(batch);
      expect(flushed.flushedAt).not.toBeNull();

      const agg = aggregateEvents(events, 'page_view', 'view', 'hour', 0, Date.now() + 100000);
      expect(agg.count).toBe(2);
      expect(agg.uniqueUsers).toBe(2);
    }
  });

  it('filters events over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const events = [
        trackPageView('/a', 'u1'), trackSimulatorAction('place', 'led', 'u1'),
        trackPageView('/b', 'u2'), trackSimulatorAction('wire', 'wire', 'u2'),
      ];
      expect(getEventsByCategory(events, 'page_view')).toHaveLength(2);
      expect(getEventsByUser(events, 'u1')).toHaveLength(2);
      const counts = getEventCountByAction(events);
      expect(counts['view']).toBe(2);
    }
  });

  it('manages retention', () => {
    const policies = getDefaultRetention();
    expect(policies).toHaveLength(11);
    const events = [trackPageView('/a'), { ...trackPageView('/b'), timestamp: 0 }];
    const valid = evictExpiredEvents(events, 30);
    expect(valid).toHaveLength(1);
  });

  it('calculates DAU/WAU/MAU over 500 iterations', () => {
    const t = Date.now();
    for (let i = 0; i < 500; i++) {
      const events = [
        { ...trackPageView('/a', 'u1'), timestamp: t },
        { ...trackPageView('/b', 'u2'), timestamp: t },
        { ...trackPageView('/c', 'u1'), timestamp: t },
      ];
      expect(calculateDAU(events, t)).toBe(2);
      expect(calculateWAU(events, t + 86400000)).toBe(2);
      expect(calculateMAU(events, t + 86400000)).toBe(2);
    }
  });

  it('AnalyticsSynchronizer lifecycle', () => {
    const sync = new AnalyticsSynchronizer();
    for (let i = 0; i < 200; i++) {
      sync.addEvent(trackPageView(`/page${i}`, `u${i % 10}`));
      sync.addEvent(trackSimulatorAction('place', 'led', `u${i % 10}`));
    }
    expect(sync.getEventCount()).toBe(400);
    expect(sync.getEventsByCategory('page_view')).toHaveLength(200);
    const clone = sync.clone();
    expect(clone.getEventCount()).toBe(400);
    sync.clear();
    expect(sync.getEventCount()).toBe(0);
  });
});
