import { describe, expect, it } from 'vitest';
import {
  buildWorkspaceDocument,
  explainBlock,
  explainCode,
  parseNaturalLanguageToWorkspace,
  suggestWiring,
} from '../src';

describe('AI workspace builder', () => {
  it('builds LED blink workspace JSON', () => {
    const parsed = parseNaturalLanguageToWorkspace('blink led every second');
    const doc = buildWorkspaceDocument(parsed);
    expect(doc.blocks).toBeTruthy();
    expect(doc.name).toBe('LED Blink');
  });

  it('explains blocks at three levels', () => {
    const fields = { PIN: 13, VALUE: 'HIGH' };
    expect(explainBlock('stemverse_digital_write', fields, 'beginner')).toContain('13');
    expect(explainBlock('stemverse_digital_write', fields, 'intermediate')).toContain(
      'stemverse_digital_write',
    );
    expect(explainBlock('stemverse_digital_write', fields, 'advanced')).toContain('fields');
  });

  it('parses DHT22 OLED prompt', () => {
    const parsed = parseNaturalLanguageToWorkspace(
      'Read DHT22 and show temperature on OLED',
      'esp32',
    );
    expect(parsed.matchedPattern).toBe('dht22_oled');
    expect(parsed.board).toBe('esp32');
  });
});

describe('wiring suggestions', () => {
  it('returns pin mappings for blink project', () => {
    const doc = buildWorkspaceDocument(
      parseNaturalLanguageToWorkspace('blink led'),
    );
    const wiring = suggestWiring(doc, ['stemverse_digital_write'], [{ PIN: 13, VALUE: 'HIGH' }]);
    expect(wiring.connections.length).toBeGreaterThan(0);
    expect(wiring.pinMappings.some((p) => p.pin === 13)).toBe(true);
  });
});
