import { describe, expect, it } from 'vitest';
import { validatePluginManifest, PLUGIN_SDK_LAYOUT } from '../src/plugin/plugin-manifest';

describe('plugin manifest', () => {
  it('accepts valid plugin.json', () => {
    const result = validatePluginManifest({
      name: 'DHT Pack',
      slug: 'dht-sensor-pack',
      version: '1.0.0',
      author: 'STEMVerse',
      description: 'DHT blocks',
      category: 'sensors',
      blocks: ['stemverse_sensor_read'],
    });
    expect(result.valid).toBe(true);
    expect(result.manifest?.slug).toBe('dht-sensor-pack');
  });

  it('rejects invalid slug', () => {
    const result = validatePluginManifest({
      name: 'Bad',
      slug: 'Bad_Slug',
      version: '1.0.0',
      author: 'x',
      description: 'x',
      category: 'x',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('slug'))).toBe(true);
  });

  it('documents SDK layout', () => {
    expect(PLUGIN_SDK_LAYOUT).toContain('plugin.json');
    expect(PLUGIN_SDK_LAYOUT).toContain('blocks/');
  });
});
