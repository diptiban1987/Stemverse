import { describe, expect, it } from 'vitest';
import { RuleBasedProvider } from '../src/providers/rule-based.provider';
import { ProviderRegistry } from '../src/providers/provider.registry';
import { ConfigService } from '@nestjs/config';

describe('RuleBasedProvider', () => {
  const provider = new RuleBasedProvider();

  it('explains block at beginner level', async () => {
    const result = await provider.explainBlock({
      blockType: 'stemverse_digital_write',
      fields: { PIN: 13, VALUE: 'HIGH' },
      level: 'beginner',
    });
    expect(result.explanation).toContain('pin 13');
    expect(result.provider).toBe('rule-based');
  });

  it('explains generated code', async () => {
    const result = await provider.explainCode({
      code: 'void setup() {}\nvoid loop() { digitalWrite(13, HIGH); }',
      level: 'intermediate',
    });
    expect(result.explanation.length).toBeGreaterThan(10);
  });

  it('generates workspace from blink prompt', async () => {
    const result = await provider.textToBlocks({
      prompt: 'Blink LED every second',
      boardSlug: 'arduino_uno',
    });
    expect(result.workspace.blocks).toBeTruthy();
    expect(result.matchedPattern).toBe('led_blink');
    expect(result.workspace.board).toBe('arduino_uno');
  });

  it('generates full project scaffold', async () => {
    const result = await provider.textToProject({
      description: 'Read DHT22 and show temperature on OLED',
      boardSlug: 'esp32',
    });
    expect(result.generatedCode.length).toBeGreaterThan(20);
    expect(result.libraries.length).toBeGreaterThan(0);
    expect(result.wiring.connections.length).toBeGreaterThan(0);
    expect(result.name).toContain('DHT');
  });

  it('suggests wiring for workspace', async () => {
    const project = await provider.textToBlocks({
      prompt: 'Blink LED every second',
    });
    const wiring = await provider.suggestWiring({
      workspace: project.workspace,
    });
    expect(wiring.pinMappings.length).toBeGreaterThan(0);
    expect(wiring.components.some((c) => c.role === 'Main controller')).toBe(true);
  });
});

describe('ProviderRegistry', () => {
  it('resolves rule-based by default', () => {
    const registry = new ProviderRegistry(
      new ConfigService({ AI_PROVIDER: undefined, OPENAI_API_KEY: undefined }),
    );
    expect(registry.resolve().name).toBe('rule-based');
    expect(registry.listProviders()).toContain('local');
  });
});
