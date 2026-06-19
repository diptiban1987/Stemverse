import * as Blockly from 'blockly/core';
import type { WorkspaceDocument } from '../types/workspace';

export type ProjectTemplateId =
  | 'led_blink'
  | 'traffic_light'
  | 'smart_home'
  | 'fire_alarm'
  | 'distance_alarm'
  | 'servo_control';

export type ProjectTemplate = {
  id: ProjectTemplateId;
  name: string;
  description: string;
  board: string;
  category: string;
};

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  { id: 'led_blink', name: 'LED Blink', description: 'Classic blink on pin 13', board: 'arduino_uno', category: 'starter' },
  { id: 'traffic_light', name: 'Traffic Light', description: 'Red, yellow, green sequence', board: 'arduino_uno', category: 'starter' },
  { id: 'smart_home', name: 'Smart Home', description: 'PIR motion triggers relay', board: 'esp32', category: 'iot' },
  { id: 'fire_alarm', name: 'Fire Alarm', description: 'MQ2 gas sensor triggers buzzer', board: 'arduino_uno', category: 'safety' },
  { id: 'distance_alarm', name: 'Distance Alarm', description: 'HC-SR04 proximity buzzer', board: 'arduino_uno', category: 'safety' },
  { id: 'servo_control', name: 'Servo Control', description: 'Sweep servo 0–180°', board: 'arduino_uno', category: 'robotics' },
];

function chainBlocks(workspace: Blockly.Workspace, types: Array<{ type: string; fields?: Record<string, string | number> }>) {
  let first: Blockly.Block | null = null;
  let prev: Blockly.Block | null = null;
  for (const spec of types) {
    const block = workspace.newBlock(spec.type);
    if (spec.fields) {
      for (const [key, val] of Object.entries(spec.fields)) {
        block.setFieldValue(val, key);
      }
    }
    // Blockly SVG blocks must be initialized and rendered to appear visually
    if ('initSvg' in block && typeof (block as any).initSvg === 'function') {
      (block as any).initSvg();
    }
    if (!first) first = block;
    if (prev) prev.nextConnection?.connect(block.previousConnection!);
    prev = block;
  }
  return first;
}

export function applyProjectTemplate(
  workspace: Blockly.Workspace,
  templateId: ProjectTemplateId,
): WorkspaceDocument {
  workspace.clear();

  const program = workspace.newBlock('stemverse_program');

  const setupChain = program.getInput('SETUP')!;
  const loopChain = program.getInput('LOOP')!;

  const connectSetup = (specs: Parameters<typeof chainBlocks>[1]) => {
    const first = chainBlocks(workspace, specs);
    if (first) setupChain.connection!.connect(first.previousConnection!);
  };

  const connectLoop = (specs: Parameters<typeof chainBlocks>[1]) => {
    const first = chainBlocks(workspace, specs);
    if (first) loopChain.connection!.connect(first.previousConnection!);
  };

  let board = 'arduino_uno';
  let name = 'Template Project';

  switch (templateId) {
    case 'led_blink':
      name = 'LED Blink';
      connectSetup([
        { type: 'stemverse_configure_pin', fields: { PIN: 13, MODE: 'OUTPUT' } },
        { type: 'stemverse_serial_begin', fields: { BAUD: 9600 } },
      ]);
      connectLoop([
        { type: 'stemverse_digital_write', fields: { PIN: 13, VALUE: 'HIGH' } },
        { type: 'stemverse_delay', fields: { MS: 1000 } },
        { type: 'stemverse_digital_write', fields: { PIN: 13, VALUE: 'LOW' } },
        { type: 'stemverse_delay', fields: { MS: 1000 } },
      ]);
      break;
    case 'traffic_light':
      name = 'Traffic Light';
      connectSetup([
        { type: 'stemverse_configure_pin', fields: { PIN: 10, MODE: 'OUTPUT' } },
        { type: 'stemverse_configure_pin', fields: { PIN: 9, MODE: 'OUTPUT' } },
        { type: 'stemverse_configure_pin', fields: { PIN: 8, MODE: 'OUTPUT' } },
      ]);
      connectLoop([
        { type: 'stemverse_digital_write', fields: { PIN: 10, VALUE: 'HIGH' } },
        { type: 'stemverse_delay', fields: { MS: 3000 } },
        { type: 'stemverse_digital_write', fields: { PIN: 10, VALUE: 'LOW' } },
        { type: 'stemverse_digital_write', fields: { PIN: 9, VALUE: 'HIGH' } },
        { type: 'stemverse_delay', fields: { MS: 1000 } },
        { type: 'stemverse_digital_write', fields: { PIN: 9, VALUE: 'LOW' } },
        { type: 'stemverse_digital_write', fields: { PIN: 8, VALUE: 'HIGH' } },
        { type: 'stemverse_delay', fields: { MS: 3000 } },
        { type: 'stemverse_digital_write', fields: { PIN: 8, VALUE: 'LOW' } },
      ]);
      break;
    case 'smart_home':
      name = 'Smart Home';
      board = 'esp32';
      connectSetup([
        { type: 'stemverse_configure_pin', fields: { PIN: 2, MODE: 'INPUT' } },
        { type: 'stemverse_configure_pin', fields: { PIN: 12, MODE: 'OUTPUT' } },
        { type: 'stemverse_serial_begin', fields: { BAUD: 9600 } },
      ]);
      connectLoop([
        { type: 'stemverse_digital_write', fields: { PIN: 12, VALUE: 'HIGH' } },
        { type: 'stemverse_delay', fields: { MS: 5000 } },
        { type: 'stemverse_digital_write', fields: { PIN: 12, VALUE: 'LOW' } },
        { type: 'stemverse_delay', fields: { MS: 1000 } },
      ]);
      break;
    case 'fire_alarm':
      name = 'Fire Alarm';
      connectSetup([
        { type: 'stemverse_configure_pin', fields: { PIN: 8, MODE: 'OUTPUT' } },
        { type: 'stemverse_configure_pin', fields: { PIN: 0, MODE: 'INPUT' } },
      ]);
      connectLoop([
        { type: 'stemverse_buzzer_play', fields: { PIN: 8, FREQ: 2000, DURATION: 500 } },
        { type: 'stemverse_delay', fields: { MS: 200 } },
      ]);
      break;
    case 'distance_alarm':
      name = 'Distance Alarm';
      connectSetup([
        { type: 'stemverse_configure_pin', fields: { PIN: 5, MODE: 'OUTPUT' } },
        { type: 'stemverse_configure_pin', fields: { PIN: 6, MODE: 'INPUT' } },
        { type: 'stemverse_configure_pin', fields: { PIN: 8, MODE: 'OUTPUT' } },
      ]);
      connectLoop([
        { type: 'stemverse_digital_write', fields: { PIN: 5, VALUE: 'LOW' } },
        { type: 'stemverse_delay', fields: { MS: 2 } },
        { type: 'stemverse_digital_write', fields: { PIN: 5, VALUE: 'HIGH' } },
        { type: 'stemverse_delay', fields: { MS: 10 } },
        { type: 'stemverse_digital_write', fields: { PIN: 5, VALUE: 'LOW' } },
        { type: 'stemverse_buzzer_play', fields: { PIN: 8, FREQ: 1500, DURATION: 300 } },
        { type: 'stemverse_delay', fields: { MS: 100 } },
      ]);
      break;
    case 'servo_control':
      name = 'Servo Control';
      connectSetup([
        { type: 'stemverse_servo_write', fields: { PIN: 9, ANGLE: 0 } },
      ]);
      connectLoop([
        { type: 'stemverse_servo_write', fields: { PIN: 9, ANGLE: 180 } },
        { type: 'stemverse_delay', fields: { MS: 1000 } },
        { type: 'stemverse_servo_write', fields: { PIN: 9, ANGLE: 0 } },
        { type: 'stemverse_delay', fields: { MS: 1000 } },
      ]);
      break;
  }

  // Initialize and render the program block for SVG display
  if ('initSvg' in program && typeof (program as any).initSvg === 'function') {
    (program as any).initSvg();
  }
  program.moveBy(50, 50);

  // Render all blocks on the workspace
  if ('render' in workspace && typeof (workspace as any).render === 'function') {
    (workspace as any).render();
  }

  return {
    project_id: `template_${templateId}`,
    name,
    board,
    language: 'arduino_cpp',
    blocks: null,
    variables: [],
    functions: [],
    libraries: [],
  };
}

export function listProjectTemplates(): ProjectTemplate[] {
  return [...PROJECT_TEMPLATES];
}
