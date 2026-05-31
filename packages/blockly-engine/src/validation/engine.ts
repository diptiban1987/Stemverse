import type { Block } from 'blockly/core';
import { getRegistryBoard } from '../registry/component-registry';
import { getBlockLibraryDependencies } from '../libraries/dependencies';

export type ValidationSeverity = 'error' | 'warning';

export type ValidationIssue = {
  severity: ValidationSeverity;
  code: string;
  message: string;
  blockId?: string;
  blockType?: string;
};

export type ValidationResult = {
  valid: boolean;
  issues: ValidationIssue[];
};

const PIN_BLOCK_TYPES = new Set([
  'stemverse_configure_pin',
  'stemverse_digital_write',
  'stemverse_digital_read',
  'stemverse_toggle_pin',
  'stemverse_analog_read',
  'stemverse_analog_write',
  'stemverse_dac_output',
  'stemverse_pwm_setup',
  'stemverse_pwm_write',
  'stemverse_attach_interrupt',
  'stemverse_detach_interrupt',
  'stemverse_sensor_read',
  'stemverse_servo_write',
  'stemverse_relay_write',
  'stemverse_buzzer_play',
  'stemverse_rgb_led',
  'stemverse_stepper_move',
  'stemverse_dc_motor',
  'stemverse_line_read_left',
  'stemverse_line_read_right',
  'stemverse_diff_forward',
  'stemverse_diff_backward',
  'stemverse_diff_turn_left',
  'stemverse_diff_turn_right',
  'stemverse_diff_stop',
]);

function extractPinsFromBlock(block: Block): number[] {
  const pins: number[] = [];
  const fields = ['PIN', 'TRIG', 'ECHO', 'PIN_R', 'PIN_G', 'PIN_B', 'PIN_A', 'PIN_B', 'PIN1', 'PIN2', 'PIN3', 'PIN4', 'LEFT', 'RIGHT'];
  for (const field of fields) {
    if (block.getField(field)) {
      const val = Number(block.getFieldValue(field));
      if (!Number.isNaN(val)) pins.push(val);
    }
  }
  return pins;
}

function validatePinOnBoard(
  boardSlug: string,
  pin: number,
  block: Block,
  issues: ValidationIssue[],
  mode: 'digital' | 'analog' | 'any' = 'digital',
): void {
  const board = getRegistryBoard(boardSlug);
  if (!board) {
    issues.push({
      severity: 'error',
      code: 'BOARD_NOT_FOUND',
      message: `Board "${boardSlug}" is not registered`,
      blockId: block.id,
      blockType: block.type,
    });
    return;
  }

  const digitalOk = board.digitalPins.includes(pin);
  const analogOk = board.analogPins.includes(pin);

  if (mode === 'digital' && !digitalOk) {
    issues.push({
      severity: 'error',
      code: 'INVALID_DIGITAL_PIN',
      message: `Pin ${pin} is not a valid digital pin on ${board.name}`,
      blockId: block.id,
      blockType: block.type,
    });
  }
  if (mode === 'analog' && !analogOk) {
    issues.push({
      severity: 'error',
      code: 'INVALID_ANALOG_PIN',
      message: `Pin ${pin} is not a valid analog pin on ${board.name}`,
      blockId: block.id,
      blockType: block.type,
    });
  }
  if (mode === 'any' && !digitalOk && !analogOk) {
    issues.push({
      severity: 'error',
      code: 'INVALID_PIN',
      message: `Pin ${pin} is not available on ${board.name}`,
      blockId: block.id,
      blockType: block.type,
    });
  }
}

function validateBoardCapabilities(
  boardSlug: string,
  block: Block,
  issues: ValidationIssue[],
): void {
  const board = getRegistryBoard(boardSlug);
  if (!board) return;

  if (block.type === 'stemverse_dac_output' && !board.capabilities.dac) {
    issues.push({
      severity: 'error',
      code: 'NO_DAC',
      message: `${board.name} does not support DAC output`,
      blockId: block.id,
      blockType: block.type,
    });
  }
  if (
    (block.type === 'stemverse_pwm_setup' || block.type === 'stemverse_pwm_write') &&
    !board.capabilities.pwm
  ) {
    issues.push({
      severity: 'warning',
      code: 'NO_PWM',
      message: `${board.name} has limited PWM support`,
      blockId: block.id,
      blockType: block.type,
    });
  }
}

function detectDuplicatePins(blocks: Block[], issues: ValidationIssue[]): void {
  const pinUsage = new Map<number, string[]>();
  for (const block of blocks) {
    if (!PIN_BLOCK_TYPES.has(block.type)) continue;
    for (const pin of extractPinsFromBlock(block)) {
      const ids = pinUsage.get(pin) ?? [];
      ids.push(block.id);
      pinUsage.set(pin, ids);
    }
  }
  for (const [pin, blockIds] of pinUsage) {
    if (blockIds.length > 1) {
      const outputBlocks = blocks.filter(
        (b) => blockIds.includes(b.id) && b.type.includes('write'),
      );
      const inputBlocks = blocks.filter(
        (b) => blockIds.includes(b.id) && (b.type.includes('read') || b.type.includes('sensor')),
      );
      if (outputBlocks.length > 1 || (outputBlocks.length > 0 && inputBlocks.length > 0)) {
        issues.push({
          severity: 'warning',
          code: 'DUPLICATE_PIN',
          message: `Pin ${pin} is used by multiple blocks — verify wiring`,
        });
      }
    }
  }
}

function validateGeneratorReadiness(
  blocks: Block[],
  boardSlug: string,
  issues: ValidationIssue[],
): void {
  const hasProgram = blocks.some((b) => b.type === 'stemverse_program');
  const hasSetupOrLoop = blocks.some(
    (b) => b.type === 'stemverse_configure_pin' || b.type === 'stemverse_digital_write',
  );

  if (!hasProgram && !hasSetupOrLoop && blocks.length > 0) {
    issues.push({
      severity: 'warning',
      code: 'NO_PROGRAM_BLOCK',
      message: 'Add a Start Program block for structured setup/loop code',
    });
  }

  const board = getRegistryBoard(boardSlug);
  if (!board) return;

  for (const block of blocks) {
    if (block.type === 'stemverse_sensor_read') {
      const sensor = block.getFieldValue('SENSOR');
      const sensorDef = board.capabilities;
      void sensorDef;
      const libraries = getBlockLibraryDependencies(block.type, {
        sensor,
        board: boardSlug,
      });
      if (libraries.length === 0 && ['dht11', 'dht22', 'ds18b20'].includes(sensor)) {
        issues.push({
          severity: 'warning',
          code: 'MISSING_LIBRARY',
          message: `Sensor ${sensor} may require additional libraries`,
          blockId: block.id,
          blockType: block.type,
        });
      }
    }
  }
}

export function validateWorkspace(
  blocks: Block[],
  boardSlug: string,
): ValidationResult {
  const issues: ValidationIssue[] = [];

  for (const block of blocks) {
    validateBoardCapabilities(boardSlug, block, issues);

    if (block.type === 'stemverse_analog_read' || block.type === 'stemverse_analog_write') {
      const pin = Number(block.getFieldValue('PIN'));
      validatePinOnBoard(boardSlug, pin, block, issues, 'analog');
    } else if (PIN_BLOCK_TYPES.has(block.type)) {
      for (const pin of extractPinsFromBlock(block)) {
        validatePinOnBoard(boardSlug, pin, block, issues, 'digital');
      }
    }

    if (block.type.startsWith('stemverse_rtos_') && boardSlug.startsWith('arduino')) {
      issues.push({
        severity: 'warning',
        code: 'RTOS_ON_ARDUINO',
        message: 'FreeRTOS blocks are intended for ESP32 — use ESP-IDF target for full support',
        blockId: block.id,
        blockType: block.type,
      });
    }

    if (block.type.startsWith('stemverse_fs_')) {
      const fs = block.getFieldValue('FS');
      if (fs === 'SD' && !getRegistryBoard(boardSlug)?.capabilities.sd) {
        issues.push({
          severity: 'warning',
          code: 'NO_SD_CARD',
          message: `${getRegistryBoard(boardSlug)?.name ?? boardSlug} may not have SD card support`,
          blockId: block.id,
          blockType: block.type,
        });
      }
    }

    if (block.type === 'stemverse_servo_write') {
      const angle = Number(block.getFieldValue('ANGLE'));
      if (angle < 0 || angle > 180) {
        issues.push({
          severity: 'error',
          code: 'SERVO_ANGLE_RANGE',
          message: 'Servo angle must be 0–180',
          blockId: block.id,
          blockType: block.type,
        });
      }
    }
  }

  detectDuplicatePins(blocks, issues);
  validateGeneratorReadiness(blocks, boardSlug, issues);

  return {
    valid: !issues.some((i) => i.severity === 'error'),
    issues,
  };
}
