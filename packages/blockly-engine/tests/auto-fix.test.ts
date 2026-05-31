import { describe, expect, it } from 'vitest';
import * as Blockly from 'blockly/core';
import { registerRoboticsBlocks } from '../src/blocks/definitions';
import { analyzeAutoFix } from '../src/validation/auto-fix';

describe('analyzeAutoFix', () => {
  it('suggests fixes for validation issues', () => {
    registerRoboticsBlocks();
    const workspace = new Blockly.Workspace();
    const block = workspace.newBlock('stemverse_digital_write');
    block.setFieldValue(999, 'PIN');
    block.setFieldValue('HIGH', 'VALUE');

    const result = analyzeAutoFix([block], 'arduino_uno');
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.issueCount).toBeGreaterThan(0);

    workspace.dispose();
  });
});
