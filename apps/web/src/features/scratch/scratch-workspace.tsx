'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { Button } from '@stemverse/ui';

/* ═══════════════════════════════════════════════════════════════
   STEMVerse Studio — Premium Visual Programming IDE
   Inspired by: Figma · MakeCode · Tinkercad · Wokwi · Framer
   ═══════════════════════════════════════════════════════════════ */

const STAGE_WIDTH = 480;
const STAGE_HEIGHT = 360;

/* ─── Studio Category Palette ─── */
const STUDIO_CATEGORIES = [
  { id: 'logic', name: 'Logic', colour: '#5B80A5', icon: '🧠' },
  { id: 'events', name: 'Events', colour: '#E6A817', icon: '⚡' },
  { id: 'control', name: 'Control', colour: '#E8863A', icon: '🔄' },
  { id: 'variables', name: 'Variables', colour: '#EE7D16', icon: '📦' },
  { id: 'functions', name: 'Functions', colour: '#FF6680', icon: '⚙️' },
  { id: 'motion', name: 'Motion', colour: '#4A90D9', icon: '🏃' },
  { id: 'display', name: 'Display', colour: '#9B59B6', icon: '🎨' },
  { id: 'sound', name: 'Sound', colour: '#BB4FCF', icon: '🔊' },
  { id: 'sensing', name: 'Sensing', colour: '#3AAFA9', icon: '📡' },
  { id: 'operators', name: 'Math', colour: '#2ECC71', icon: '🔢' },
  { id: 'robotics', name: 'Robotics', colour: '#00B894', icon: '🤖' },
  { id: 'iot', name: 'IoT', colour: '#0984E3', icon: '🌐' },
] as const;

/* ─── Tab types ─── */
type RightTab = 'properties' | 'variables' | 'assets' | 'inspector';
type BottomTab = 'console' | 'serial' | 'errors' | 'output';

/* ─── Scratch VM types ─── */
type ScratchRuntime = {
  loadProject: (json: string) => Promise<void>;
  toJSON: () => string;
  greenFlag: () => void;
  stopAll: () => void;
  addSprite: (json: string) => Promise<unknown>;
  onTargetsUpdate: (cb: () => void) => void;
  getTargets: () => Array<{ name: string; isStage: boolean }>;
  dispose: () => void;
};

interface StudioWorkspaceProps {
  projectId?: string;
  initialData?: unknown;
  onSave?: (workspaceJson: unknown) => Promise<void>;
}

/* ─── SB3 Compatibility Layer (isolated) ─── */
function createDefaultProject(): object {
  return {
    targets: [
      {
        isStage: true, name: 'Stage', variables: {}, lists: {}, broadcasts: {}, blocks: {}, comments: {},
        currentCostume: 0, costumes: [{ name: 'backdrop1', dataFormat: 'svg', assetId: 'cd21514d0531fdffb6adae589bfa37f0', md5ext: 'cd21514d0531fdffb6adae589bfa37f0.svg', rotationCenterX: 240, rotationCenterY: 180 }],
        sounds: [], volume: 100, layerOrder: 0, tempo: 60, videoTransparency: 50, videoState: 'on', textToSpeechLanguage: null,
      },
      {
        isStage: false, name: 'Agent1', variables: {}, lists: {}, broadcasts: {}, blocks: {}, comments: {},
        currentCostume: 0, costumes: [{ name: 'costume1', bitmapResolution: 1, dataFormat: 'svg', assetId: 'cd21514d0531fdffb6adae589bfa37f0', md5ext: 'cd21514d0531fdffb6adae589bfa37f0.svg', rotationCenterX: 48, rotationCenterY: 50 }],
        sounds: [], visible: true, x: 0, y: 0, size: 100, direction: 90, draggable: false, rotationStyle: 'all around', layerOrder: 1, volume: 100,
      },
    ],
    monitors: [], extensions: [], meta: { semver: '3.0.0', vm: '1.4.6', agent: 'STEMVerse Studio' },
  };
}

function isValidProject(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.targets) || obj.targets.length === 0) return false;
  return (obj.targets as Array<Record<string, unknown>>).some((t) => t.isStage === true);
}

function resolveProjectData(initialData: unknown): string {
  if (isValidProject(initialData)) return JSON.stringify(initialData);
  if (typeof initialData === 'string') { try { const p = JSON.parse(initialData); if (isValidProject(p)) return initialData; } catch { /* */ } }
  if (initialData && typeof initialData === 'object') {
    const obj = initialData as Record<string, unknown>;
    const nested = obj.workspaceJson ?? obj.data ?? obj.project;
    if (nested) return resolveProjectData(nested);
  }
  return JSON.stringify(createDefaultProject());
}

/* ─── Blockly toolbox (rebrand categories) ─── */
function buildToolboxXml(): string {
  return `<xml id="stemverse-studio-toolbox">
  <category name="Logic" colour="#5B80A5">
    <block type="event_whenflagclicked"></block>
    <block type="event_whenkeypressed"><field name="KEY_OPTION">space</field></block>
    <block type="event_whenthisspriteclicked"></block>
    <block type="control_if"></block>
    <block type="control_if_else"></block>
    <block type="control_wait_until"></block>
    <block type="operator_and"></block>
    <block type="operator_or"></block>
    <block type="operator_not"></block>
  </category>
  <category name="Events" colour="#E6A817">
    <block type="event_whenflagclicked"></block>
    <block type="event_whenkeypressed"><field name="KEY_OPTION">space</field></block>
    <block type="event_whenthisspriteclicked"></block>
    <block type="event_whenbroadcastreceived"><field name="BROADCAST_OPTION">message1</field></block>
    <block type="event_broadcast"><value name="BROADCAST_INPUT"><shadow type="text"><field name="TEXT">message1</field></shadow></value></block>
    <block type="event_broadcastandwait"><value name="BROADCAST_INPUT"><shadow type="text"><field name="TEXT">message1</field></shadow></value></block>
  </category>
  <category name="Control" colour="#E8863A">
    <block type="control_wait"><value name="DURATION"><shadow type="math_number"><field name="NUM">1</field></shadow></value></block>
    <block type="control_repeat"><value name="TIMES"><shadow type="math_number"><field name="NUM">10</field></shadow></value></block>
    <block type="control_forever"></block>
    <block type="control_if"></block>
    <block type="control_if_else"></block>
    <block type="control_repeat_until"></block>
    <block type="control_stop"><field name="STOP_OPTION">all</field></block>
    <block type="control_start_as_clone"></block>
    <block type="control_create_clone_of"></block>
    <block type="control_delete_this_clone"></block>
  </category>
  <category name="Variables" colour="#EE7D16" custom="VARIABLE"></category>
  <category name="Functions" colour="#FF6680">
    <block type="control_repeat"><value name="TIMES"><shadow type="math_number"><field name="NUM">10</field></shadow></value></block>
    <block type="control_forever"></block>
  </category>
  <category name="Motion" colour="#4A90D9">
    <block type="motion_movesteps"><value name="STEPS"><shadow type="math_number"><field name="NUM">10</field></shadow></value></block>
    <block type="motion_turnright"><value name="DEGREES"><shadow type="math_number"><field name="NUM">15</field></shadow></value></block>
    <block type="motion_turnleft"><value name="DEGREES"><shadow type="math_number"><field name="NUM">15</field></shadow></value></block>
    <block type="motion_gotoxy"><value name="X"><shadow type="math_number"><field name="NUM">0</field></shadow></value><value name="Y"><shadow type="math_number"><field name="NUM">0</field></shadow></value></block>
    <block type="motion_glideto"><value name="SECS"><shadow type="math_number"><field name="NUM">1</field></shadow></value><value name="X"><shadow type="math_number"><field name="NUM">0</field></shadow></value><value name="Y"><shadow type="math_number"><field name="NUM">0</field></shadow></value></block>
    <block type="motion_pointindirection"><value name="DIRECTION"><shadow type="math_number"><field name="NUM">90</field></shadow></value></block>
    <block type="motion_changexby"><value name="DX"><shadow type="math_number"><field name="NUM">10</field></shadow></value></block>
    <block type="motion_setx"><value name="X"><shadow type="math_number"><field name="NUM">0</field></shadow></value></block>
    <block type="motion_changeyby"><value name="DY"><shadow type="math_number"><field name="NUM">10</field></shadow></value></block>
    <block type="motion_sety"><value name="Y"><shadow type="math_number"><field name="NUM">0</field></shadow></value></block>
    <block type="motion_ifonedgebounce"></block>
    <block type="motion_xposition"></block>
    <block type="motion_yposition"></block>
    <block type="motion_direction"></block>
  </category>
  <category name="Display" colour="#9B59B6">
    <block type="looks_sayforsecs"><value name="MESSAGE"><shadow type="text"><field name="TEXT">Hello!</field></shadow></value><value name="SECS"><shadow type="math_number"><field name="NUM">2</field></shadow></value></block>
    <block type="looks_say"><value name="MESSAGE"><shadow type="text"><field name="TEXT">Hello!</field></shadow></value></block>
    <block type="looks_thinkforsecs"><value name="MESSAGE"><shadow type="text"><field name="TEXT">Hmm...</field></shadow></value><value name="SECS"><shadow type="math_number"><field name="NUM">2</field></shadow></value></block>
    <block type="looks_think"><value name="MESSAGE"><shadow type="text"><field name="TEXT">Hmm...</field></shadow></value></block>
    <block type="looks_show"></block>
    <block type="looks_hide"></block>
    <block type="looks_changesizeby"><value name="CHANGE"><shadow type="math_number"><field name="NUM">10</field></shadow></value></block>
    <block type="looks_setsizeto"><value name="SIZE"><shadow type="math_number"><field name="NUM">100</field></shadow></value></block>
    <block type="looks_size"></block>
  </category>
  <category name="Sound" colour="#BB4FCF">
    <block type="sound_play"></block>
    <block type="sound_stopallsounds"></block>
    <block type="sound_changevolumeby"><value name="VOLUME"><shadow type="math_number"><field name="NUM">-10</field></shadow></value></block>
    <block type="sound_setvolumeto"><value name="VOLUME"><shadow type="math_number"><field name="NUM">100</field></shadow></value></block>
    <block type="sound_volume"></block>
  </category>
  <category name="Sensing" colour="#3AAFA9">
    <block type="sensing_touchingobject"></block>
    <block type="sensing_distanceto"></block>
    <block type="sensing_askandwait"><value name="QUESTION"><shadow type="text"><field name="TEXT">What is your name?</field></shadow></value></block>
    <block type="sensing_answer"></block>
    <block type="sensing_keypressed"><field name="KEY_OPTION">space</field></block>
    <block type="sensing_mousedown"></block>
    <block type="sensing_mousex"></block>
    <block type="sensing_mousey"></block>
    <block type="sensing_timer"></block>
    <block type="sensing_resettimer"></block>
  </category>
  <category name="Math" colour="#2ECC71">
    <block type="operator_add"><value name="NUM1"><shadow type="math_number"><field name="NUM"></field></shadow></value><value name="NUM2"><shadow type="math_number"><field name="NUM"></field></shadow></value></block>
    <block type="operator_subtract"><value name="NUM1"><shadow type="math_number"><field name="NUM"></field></shadow></value><value name="NUM2"><shadow type="math_number"><field name="NUM"></field></shadow></value></block>
    <block type="operator_multiply"><value name="NUM1"><shadow type="math_number"><field name="NUM"></field></shadow></value><value name="NUM2"><shadow type="math_number"><field name="NUM"></field></shadow></value></block>
    <block type="operator_divide"><value name="NUM1"><shadow type="math_number"><field name="NUM"></field></shadow></value><value name="NUM2"><shadow type="math_number"><field name="NUM"></field></shadow></value></block>
    <block type="operator_random"><value name="FROM"><shadow type="math_number"><field name="NUM">1</field></shadow></value><value name="TO"><shadow type="math_number"><field name="NUM">10</field></shadow></value></block>
    <block type="operator_gt"><value name="OPERAND1"><shadow type="math_number"><field name="NUM"></field></shadow></value><value name="OPERAND2"><shadow type="math_number"><field name="NUM">50</field></shadow></value></block>
    <block type="operator_lt"><value name="OPERAND1"><shadow type="math_number"><field name="NUM"></field></shadow></value><value name="OPERAND2"><shadow type="math_number"><field name="NUM">50</field></shadow></value></block>
    <block type="operator_equals"><value name="OPERAND1"><shadow type="math_number"><field name="NUM"></field></shadow></value><value name="OPERAND2"><shadow type="math_number"><field name="NUM">50</field></shadow></value></block>
    <block type="operator_join"><value name="STRING1"><shadow type="text"><field name="TEXT">apple </field></shadow></value><value name="STRING2"><shadow type="text"><field name="TEXT">banana</field></shadow></value></block>
    <block type="operator_length"><value name="STRING"><shadow type="text"><field name="TEXT">apple</field></shadow></value></block>
    <block type="operator_mod"><value name="NUM1"><shadow type="math_number"><field name="NUM"></field></shadow></value><value name="NUM2"><shadow type="math_number"><field name="NUM"></field></shadow></value></block>
    <block type="operator_round"><value name="NUM"><shadow type="math_number"><field name="NUM"></field></shadow></value></block>
    <block type="operator_mathop"><value name="NUM"><shadow type="math_number"><field name="NUM"></field></shadow></value><field name="OPERATOR">abs</field></block>
  </category>
  <category name="Robotics" colour="#00B894">
    <block type="motion_movesteps"><value name="STEPS"><shadow type="math_number"><field name="NUM">100</field></shadow></value></block>
    <block type="control_wait"><value name="DURATION"><shadow type="math_number"><field name="NUM">0.5</field></shadow></value></block>
  </category>
  <category name="IoT" colour="#0984E3">
    <block type="event_broadcast"><value name="BROADCAST_INPUT"><shadow type="text"><field name="TEXT">sensor_data</field></shadow></value></block>
    <block type="event_whenbroadcastreceived"><field name="BROADCAST_OPTION">sensor_data</field></block>
  </category>
</xml>`;
}

/* ─── Register block definitions ─── */
function registerStudioBlocks(Blockly: any) {
  if (!Blockly) return;
  const def = (type: string, cfg: Record<string, unknown>) => {
    if (Blockly.Blocks[type]) return;
    Blockly.Blocks[type] = { init: function (this: any) { this.jsonInit(cfg); } };
  };

  // Motion
  def('motion_movesteps', { type: 'motion_movesteps', message0: 'move %1 steps', args0: [{ type: 'input_value', name: 'STEPS', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#4A90D9' });
  def('motion_turnright', { type: 'motion_turnright', message0: 'turn ↻ %1°', args0: [{ type: 'input_value', name: 'DEGREES', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#4A90D9' });
  def('motion_turnleft', { type: 'motion_turnleft', message0: 'turn ↺ %1°', args0: [{ type: 'input_value', name: 'DEGREES', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#4A90D9' });
  def('motion_gotoxy', { type: 'motion_gotoxy', message0: 'go to x: %1 y: %2', args0: [{ type: 'input_value', name: 'X', check: 'Number' }, { type: 'input_value', name: 'Y', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#4A90D9' });
  def('motion_glideto', { type: 'motion_glideto', message0: 'glide %1s to x: %2 y: %3', args0: [{ type: 'input_value', name: 'SECS', check: 'Number' }, { type: 'input_value', name: 'X', check: 'Number' }, { type: 'input_value', name: 'Y', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#4A90D9' });
  def('motion_pointindirection', { type: 'motion_pointindirection', message0: 'point direction %1', args0: [{ type: 'input_value', name: 'DIRECTION', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#4A90D9' });
  def('motion_changexby', { type: 'motion_changexby', message0: 'change x by %1', args0: [{ type: 'input_value', name: 'DX', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#4A90D9' });
  def('motion_setx', { type: 'motion_setx', message0: 'set x to %1', args0: [{ type: 'input_value', name: 'X', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#4A90D9' });
  def('motion_changeyby', { type: 'motion_changeyby', message0: 'change y by %1', args0: [{ type: 'input_value', name: 'DY', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#4A90D9' });
  def('motion_sety', { type: 'motion_sety', message0: 'set y to %1', args0: [{ type: 'input_value', name: 'Y', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#4A90D9' });
  def('motion_ifonedgebounce', { type: 'motion_ifonedgebounce', message0: 'if on edge, bounce', previousStatement: null, nextStatement: null, colour: '#4A90D9' });
  def('motion_xposition', { type: 'motion_xposition', message0: 'x position', output: 'Number', colour: '#4A90D9' });
  def('motion_yposition', { type: 'motion_yposition', message0: 'y position', output: 'Number', colour: '#4A90D9' });
  def('motion_direction', { type: 'motion_direction', message0: 'direction', output: 'Number', colour: '#4A90D9' });
  // Looks → Display
  def('looks_sayforsecs', { type: 'looks_sayforsecs', message0: 'display %1 for %2s', args0: [{ type: 'input_value', name: 'MESSAGE' }, { type: 'input_value', name: 'SECS', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#9B59B6' });
  def('looks_say', { type: 'looks_say', message0: 'display %1', args0: [{ type: 'input_value', name: 'MESSAGE' }], previousStatement: null, nextStatement: null, colour: '#9B59B6' });
  def('looks_thinkforsecs', { type: 'looks_thinkforsecs', message0: 'think %1 for %2s', args0: [{ type: 'input_value', name: 'MESSAGE' }, { type: 'input_value', name: 'SECS', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#9B59B6' });
  def('looks_think', { type: 'looks_think', message0: 'think %1', args0: [{ type: 'input_value', name: 'MESSAGE' }], previousStatement: null, nextStatement: null, colour: '#9B59B6' });
  def('looks_show', { type: 'looks_show', message0: 'show', previousStatement: null, nextStatement: null, colour: '#9B59B6' });
  def('looks_hide', { type: 'looks_hide', message0: 'hide', previousStatement: null, nextStatement: null, colour: '#9B59B6' });
  def('looks_changesizeby', { type: 'looks_changesizeby', message0: 'change size by %1', args0: [{ type: 'input_value', name: 'CHANGE', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#9B59B6' });
  def('looks_setsizeto', { type: 'looks_setsizeto', message0: 'set size to %1%%', args0: [{ type: 'input_value', name: 'SIZE', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#9B59B6' });
  def('looks_size', { type: 'looks_size', message0: 'size', output: 'Number', colour: '#9B59B6' });
  // Sound
  def('sound_play', { type: 'sound_play', message0: 'play sound', previousStatement: null, nextStatement: null, colour: '#BB4FCF' });
  def('sound_stopallsounds', { type: 'sound_stopallsounds', message0: 'stop all sounds', previousStatement: null, nextStatement: null, colour: '#BB4FCF' });
  def('sound_changevolumeby', { type: 'sound_changevolumeby', message0: 'change volume by %1', args0: [{ type: 'input_value', name: 'VOLUME', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#BB4FCF' });
  def('sound_setvolumeto', { type: 'sound_setvolumeto', message0: 'set volume to %1%%', args0: [{ type: 'input_value', name: 'VOLUME', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#BB4FCF' });
  def('sound_volume', { type: 'sound_volume', message0: 'volume', output: 'Number', colour: '#BB4FCF' });
  // Events
  def('event_whenflagclicked', { type: 'event_whenflagclicked', message0: '▶ when program starts', nextStatement: null, colour: '#E6A817' });
  def('event_whenkeypressed', { type: 'event_whenkeypressed', message0: 'when %1 key pressed', args0: [{ type: 'field_dropdown', name: 'KEY_OPTION', options: [['space', 'space'], ['↑', 'up arrow'], ['↓', 'down arrow'], ['←', 'left arrow'], ['→', 'right arrow'], ['any', 'any'], ['a', 'a'], ['b', 'b']] }], nextStatement: null, colour: '#E6A817' });
  def('event_whenthisspriteclicked', { type: 'event_whenthisspriteclicked', message0: 'when this agent clicked', nextStatement: null, colour: '#E6A817' });
  def('event_whenbroadcastreceived', { type: 'event_whenbroadcastreceived', message0: 'when I receive %1', args0: [{ type: 'field_input', name: 'BROADCAST_OPTION', text: 'message1' }], nextStatement: null, colour: '#E6A817' });
  def('event_broadcast', { type: 'event_broadcast', message0: 'broadcast %1', args0: [{ type: 'input_value', name: 'BROADCAST_INPUT' }], previousStatement: null, nextStatement: null, colour: '#E6A817' });
  def('event_broadcastandwait', { type: 'event_broadcastandwait', message0: 'broadcast %1 and wait', args0: [{ type: 'input_value', name: 'BROADCAST_INPUT' }], previousStatement: null, nextStatement: null, colour: '#E6A817' });
  // Control
  def('control_wait', { type: 'control_wait', message0: 'wait %1 seconds', args0: [{ type: 'input_value', name: 'DURATION', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#E8863A' });
  def('control_repeat', { type: 'control_repeat', message0: 'repeat %1 times %2', args0: [{ type: 'input_value', name: 'TIMES', check: 'Number' }, { type: 'input_statement', name: 'SUBSTACK' }], previousStatement: null, nextStatement: null, colour: '#E8863A' });
  def('control_forever', { type: 'control_forever', message0: 'forever %1', args0: [{ type: 'input_statement', name: 'SUBSTACK' }], previousStatement: null, colour: '#E8863A' });
  def('control_if', { type: 'control_if', message0: 'if %1 then %2', args0: [{ type: 'input_value', name: 'CONDITION', check: 'Boolean' }, { type: 'input_statement', name: 'SUBSTACK' }], previousStatement: null, nextStatement: null, colour: '#5B80A5' });
  def('control_if_else', { type: 'control_if_else', message0: 'if %1 then %2 else %3', args0: [{ type: 'input_value', name: 'CONDITION', check: 'Boolean' }, { type: 'input_statement', name: 'SUBSTACK' }, { type: 'input_statement', name: 'SUBSTACK2' }], previousStatement: null, nextStatement: null, colour: '#5B80A5' });
  def('control_wait_until', { type: 'control_wait_until', message0: 'wait until %1', args0: [{ type: 'input_value', name: 'CONDITION', check: 'Boolean' }], previousStatement: null, nextStatement: null, colour: '#E8863A' });
  def('control_repeat_until', { type: 'control_repeat_until', message0: 'repeat until %1 %2', args0: [{ type: 'input_value', name: 'CONDITION', check: 'Boolean' }, { type: 'input_statement', name: 'SUBSTACK' }], previousStatement: null, nextStatement: null, colour: '#E8863A' });
  def('control_stop', { type: 'control_stop', message0: 'stop %1', args0: [{ type: 'field_dropdown', name: 'STOP_OPTION', options: [['all', 'all'], ['this script', 'this script'], ['other scripts', 'other scripts in sprite']] }], previousStatement: null, colour: '#E8863A' });
  def('control_start_as_clone', { type: 'control_start_as_clone', message0: 'when I start as a clone', nextStatement: null, colour: '#E8863A' });
  def('control_create_clone_of', { type: 'control_create_clone_of', message0: 'create clone of myself', previousStatement: null, nextStatement: null, colour: '#E8863A' });
  def('control_delete_this_clone', { type: 'control_delete_this_clone', message0: 'delete this clone', previousStatement: null, colour: '#E8863A' });
  // Sensing
  def('sensing_touchingobject', { type: 'sensing_touchingobject', message0: 'touching?', output: 'Boolean', colour: '#3AAFA9' });
  def('sensing_distanceto', { type: 'sensing_distanceto', message0: 'distance to pointer', output: 'Number', colour: '#3AAFA9' });
  def('sensing_askandwait', { type: 'sensing_askandwait', message0: 'ask %1 and wait', args0: [{ type: 'input_value', name: 'QUESTION' }], previousStatement: null, nextStatement: null, colour: '#3AAFA9' });
  def('sensing_answer', { type: 'sensing_answer', message0: 'answer', output: 'String', colour: '#3AAFA9' });
  def('sensing_keypressed', { type: 'sensing_keypressed', message0: 'key %1 pressed?', args0: [{ type: 'field_dropdown', name: 'KEY_OPTION', options: [['space', 'space'], ['↑', 'up arrow'], ['↓', 'down arrow'], ['←', 'left arrow'], ['→', 'right arrow']] }], output: 'Boolean', colour: '#3AAFA9' });
  def('sensing_mousedown', { type: 'sensing_mousedown', message0: 'mouse down?', output: 'Boolean', colour: '#3AAFA9' });
  def('sensing_mousex', { type: 'sensing_mousex', message0: 'mouse x', output: 'Number', colour: '#3AAFA9' });
  def('sensing_mousey', { type: 'sensing_mousey', message0: 'mouse y', output: 'Number', colour: '#3AAFA9' });
  def('sensing_timer', { type: 'sensing_timer', message0: 'timer', output: 'Number', colour: '#3AAFA9' });
  def('sensing_resettimer', { type: 'sensing_resettimer', message0: 'reset timer', previousStatement: null, nextStatement: null, colour: '#3AAFA9' });
  // Operators
  def('operator_add', { type: 'operator_add', message0: '%1 + %2', args0: [{ type: 'input_value', name: 'NUM1', check: 'Number' }, { type: 'input_value', name: 'NUM2', check: 'Number' }], output: 'Number', colour: '#2ECC71', inputsInline: true });
  def('operator_subtract', { type: 'operator_subtract', message0: '%1 − %2', args0: [{ type: 'input_value', name: 'NUM1', check: 'Number' }, { type: 'input_value', name: 'NUM2', check: 'Number' }], output: 'Number', colour: '#2ECC71', inputsInline: true });
  def('operator_multiply', { type: 'operator_multiply', message0: '%1 × %2', args0: [{ type: 'input_value', name: 'NUM1', check: 'Number' }, { type: 'input_value', name: 'NUM2', check: 'Number' }], output: 'Number', colour: '#2ECC71', inputsInline: true });
  def('operator_divide', { type: 'operator_divide', message0: '%1 ÷ %2', args0: [{ type: 'input_value', name: 'NUM1', check: 'Number' }, { type: 'input_value', name: 'NUM2', check: 'Number' }], output: 'Number', colour: '#2ECC71', inputsInline: true });
  def('operator_random', { type: 'operator_random', message0: 'random %1 to %2', args0: [{ type: 'input_value', name: 'FROM', check: 'Number' }, { type: 'input_value', name: 'TO', check: 'Number' }], output: 'Number', colour: '#2ECC71', inputsInline: true });
  def('operator_gt', { type: 'operator_gt', message0: '%1 > %2', args0: [{ type: 'input_value', name: 'OPERAND1', check: 'Number' }, { type: 'input_value', name: 'OPERAND2', check: 'Number' }], output: 'Boolean', colour: '#2ECC71', inputsInline: true });
  def('operator_lt', { type: 'operator_lt', message0: '%1 < %2', args0: [{ type: 'input_value', name: 'OPERAND1', check: 'Number' }, { type: 'input_value', name: 'OPERAND2', check: 'Number' }], output: 'Boolean', colour: '#2ECC71', inputsInline: true });
  def('operator_equals', { type: 'operator_equals', message0: '%1 = %2', args0: [{ type: 'input_value', name: 'OPERAND1', check: 'Number' }, { type: 'input_value', name: 'OPERAND2', check: 'Number' }], output: 'Boolean', colour: '#2ECC71', inputsInline: true });
  def('operator_and', { type: 'operator_and', message0: '%1 and %2', args0: [{ type: 'input_value', name: 'OPERAND1', check: 'Boolean' }, { type: 'input_value', name: 'OPERAND2', check: 'Boolean' }], output: 'Boolean', colour: '#5B80A5', inputsInline: true });
  def('operator_or', { type: 'operator_or', message0: '%1 or %2', args0: [{ type: 'input_value', name: 'OPERAND1', check: 'Boolean' }, { type: 'input_value', name: 'OPERAND2', check: 'Boolean' }], output: 'Boolean', colour: '#5B80A5', inputsInline: true });
  def('operator_not', { type: 'operator_not', message0: 'not %1', args0: [{ type: 'input_value', name: 'OPERAND', check: 'Boolean' }], output: 'Boolean', colour: '#5B80A5' });
  def('operator_join', { type: 'operator_join', message0: 'join %1 %2', args0: [{ type: 'input_value', name: 'STRING1' }, { type: 'input_value', name: 'STRING2' }], output: 'String', colour: '#2ECC71', inputsInline: true });
  def('operator_length', { type: 'operator_length', message0: 'length of %1', args0: [{ type: 'input_value', name: 'STRING' }], output: 'Number', colour: '#2ECC71' });
  def('operator_mod', { type: 'operator_mod', message0: '%1 mod %2', args0: [{ type: 'input_value', name: 'NUM1', check: 'Number' }, { type: 'input_value', name: 'NUM2', check: 'Number' }], output: 'Number', colour: '#2ECC71', inputsInline: true });
  def('operator_round', { type: 'operator_round', message0: 'round %1', args0: [{ type: 'input_value', name: 'NUM', check: 'Number' }], output: 'Number', colour: '#2ECC71' });
  def('operator_mathop', { type: 'operator_mathop', message0: '%1 of %2', args0: [{ type: 'field_dropdown', name: 'OPERATOR', options: [['abs', 'abs'], ['floor', 'floor'], ['ceil', 'ceiling'], ['√', 'sqrt'], ['sin', 'sin'], ['cos', 'cos'], ['tan', 'tan'], ['ln', 'ln'], ['log', 'log'], ['e^', 'e ^'], ['10^', '10 ^']] }, { type: 'input_value', name: 'NUM', check: 'Number' }], output: 'Number', colour: '#2ECC71' });
}

/* ═══════════════════════════════════════════════════════════════
   STEMVERSE STUDIO COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export function ScratchWorkspace({ projectId, initialData, onSave }: StudioWorkspaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blocklyDivRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<any>(null);
  const runtimeRef = useRef<ScratchRuntime | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  const [blocklyReady, setBlocklyReady] = useState(false);
  const [sprites, setSprites] = useState<Array<{ name: string; isStage?: boolean }>>([]);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('Initializing…');
  const [activeCategory, setActiveCategory] = useState('logic');
  const [blockCount, setBlockCount] = useState(0);
  const [rightTab, setRightTab] = useState<RightTab>('properties');
  const [bottomOpen, setBottomOpen] = useState(false);
  const [bottomTab, setBottomTab] = useState<BottomTab>('console');
  const [consoleLines, setConsoleLines] = useState<string[]>(['[Studio] Ready.']);
  const [darkMode, setDarkMode] = useState(false);

  // Theme colors
  const th = darkMode ? {
    bg: '#0F0F14', surface: '#1A1A24', surfaceAlt: '#22223A', border: '#2D2D44',
    text: '#E8E8F0', textMuted: '#8888A8', accent: '#6C63FF', accentHover: '#7B73FF',
    headerBg: 'rgba(15,15,20,0.85)', panelBg: 'rgba(26,26,36,0.92)',
    canvasBg: '#16162A', workspaceBg: '#14141E',
  } : {
    bg: '#F5F6FA', surface: '#FFFFFF', surfaceAlt: '#F0F1F8', border: '#E2E4EF',
    text: '#1A1A2E', textMuted: '#7C7C9A', accent: '#6C63FF', accentHover: '#5B52E8',
    headerBg: 'rgba(255,255,255,0.88)', panelBg: 'rgba(255,255,255,0.95)',
    canvasBg: '#ECEDF5', workspaceBg: '#F9F9FD',
  };

  const refreshTargets = useCallback(() => {
    const rt = runtimeRef.current;
    if (!rt) return;
    const targets = rt.getTargets();
    setSprites(targets);
    if (!selectedTarget && targets.length > 0) {
      const first = targets.find((t) => !t.isStage);
      setSelectedTarget(first?.name ?? targets[0]?.name ?? null);
    }
  }, [selectedTarget]);

  const initRuntime = useCallback(async () => {
    if (!canvasRef.current || !window.STEMVerseScratch) return;
    try {
      const rt = await window.STEMVerseScratch.createScratchRuntime(canvasRef.current, STAGE_WIDTH, STAGE_HEIGHT);
      runtimeRef.current = rt;
      rt.onTargetsUpdate(refreshTargets);
      await rt.loadProject(resolveProjectData(initialData));
      setStatus(projectId ? `Project ${projectId.slice(0, 8)}…` : 'Untitled');
      refreshTargets();
      setConsoleLines(prev => [...prev, '[Studio] Engine loaded successfully.']);
    } catch (err) {
      setStatus('Engine error');
      setConsoleLines(prev => [...prev, `[Error] ${err}`]);
    }
  }, [initialData, projectId, refreshTargets]);

  const initBlockly = useCallback(() => {
    const Blockly = (window as any).Blockly;
    if (!Blockly || !blocklyDivRef.current || workspaceRef.current) return;
    registerStudioBlocks(Blockly);
    const workspace = Blockly.inject(blocklyDivRef.current, {
      toolbox: buildToolboxXml(),
      grid: { spacing: 32, length: 2, colour: darkMode ? '#2A2A40' : '#E8E8F0', snap: true },
      zoom: { controls: true, wheel: true, startScale: 0.8, maxScale: 3, minScale: 0.2, scaleSpeed: 1.1, pinch: true },
      trashcan: true, move: { scrollbars: true, drag: true, wheel: true }, sounds: false, renderer: 'zelos',
      theme: Blockly.Theme?.defineTheme?.('stemverse', {
        blockStyles: {}, categoryStyles: {},
        componentStyles: {
          workspaceBackgroundColour: darkMode ? '#14141E' : '#F9F9FD',
          toolboxBackgroundColour: darkMode ? '#1A1A24' : '#FFFFFF',
          flyoutBackgroundColour: darkMode ? '#1E1E30' : '#F5F5FC',
          scrollbarColour: darkMode ? '#3A3A55' : '#CECDCE',
        },
        fontStyle: { family: "'Inter', 'SF Pro Display', system-ui, sans-serif", weight: '500', size: 11 },
      }) ?? undefined,
    });
    workspaceRef.current = workspace;
    workspace.addChangeListener((e: any) => {
      if (['create', 'delete', 'move'].includes(e.type)) setBlockCount(workspace.getAllBlocks(false).length);
    });
    setBlocklyReady(true);
    setConsoleLines(prev => [...prev, '[Studio] Visual builder ready.']);
  }, [darkMode]);

  useEffect(() => { if (engineReady) initRuntime(); return () => { runtimeRef.current?.dispose(); runtimeRef.current = null; }; }, [engineReady, initRuntime]);
  useEffect(() => { if (blocklyReady) { const B = (window as any).Blockly; if (B && workspaceRef.current) B.svgResize(workspaceRef.current); } }, [blocklyReady]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); /* command palette placeholder */ }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  const handlePlay = () => { const rt = runtimeRef.current; if (!rt) return; if (isPlaying) { rt.stopAll(); setIsPlaying(false); } else { rt.greenFlag(); setIsPlaying(true); } };
  const handleStop = () => { runtimeRef.current?.stopAll(); setIsPlaying(false); };
  const handleAddAgent = () => {
    const rt = runtimeRef.current; if (!rt) return;
    const name = `Agent${sprites.filter(s => !s.isStage).length + 1}`;
    rt.addSprite(JSON.stringify({ name, costumes: [{ name: 'costume1', bitmapResolution: 1, dataFormat: 'svg', assetId: 'cd21514d0531fdffb6adae589bfa37f0', md5ext: 'cd21514d0531fdffb6adae589bfa37f0.svg', rotationCenterX: 48, rotationCenterY: 50 }], sounds: [], variables: {}, blocks: {}, comments: {}, currentCostume: 0, layerOrder: sprites.length, visible: true, x: 0, y: 0, size: 100, direction: 90, rotationStyle: 'all around' })).then(() => refreshTargets());
  };
  const handleSave = async () => {
    const rt = runtimeRef.current; if (!rt || !onSave) return;
    setSaving(true);
    try {
      const vmJson = JSON.parse(rt.toJSON()) as Record<string, unknown>;
      let blocklyXml = '';
      if (workspaceRef.current) { const B = (window as any).Blockly; if (B?.Xml) { blocklyXml = B.Xml.domToText(B.Xml.workspaceToDom(workspaceRef.current)); } }
      await onSave({ ...vmJson, _blocklyXml: blocklyXml });
      setStatus('✓ Saved'); setConsoleLines(prev => [...prev, '[Studio] Project saved.']);
      setTimeout(() => setStatus(projectId ? `Project ${projectId.slice(0, 8)}…` : 'Untitled'), 2000);
    } catch { setStatus('✗ Save failed'); } finally { setSaving(false); }
  };

  /* ═══ CSS helper for glassmorphism ═══ */
  const glass = `backdrop-blur-xl backdrop-saturate-150`;

  const rightTabs: { id: RightTab; label: string; icon: string }[] = [
    { id: 'properties', label: 'Props', icon: '⚙' }, { id: 'variables', label: 'Vars', icon: '📦' },
    { id: 'assets', label: 'Assets', icon: '🎨' }, { id: 'inspector', label: 'Info', icon: '🔍' },
  ];
  const bottomTabs: { id: BottomTab; label: string; icon: string }[] = [
    { id: 'console', label: 'Console', icon: '>' }, { id: 'serial', label: 'Serial', icon: '⌘' },
    { id: 'errors', label: 'Errors', icon: '⚠' }, { id: 'output', label: 'Output', icon: '📤' },
  ];

  return (
    <>
      <Script src="/scratch/scratch-engine.iife.js" strategy="afterInteractive" onLoad={() => setEngineReady(true)} onError={() => setStatus('Engine load failed')} />
      <Script src="https://unpkg.com/blockly/blockly_compressed.js" strategy="afterInteractive" onLoad={() => {
        const s1 = document.createElement('script'); s1.src = 'https://unpkg.com/blockly/blocks_compressed.js';
        s1.onload = () => { const s2 = document.createElement('script'); s2.src = 'https://unpkg.com/blockly/msg/en.js'; s2.onload = () => initBlockly(); document.head.appendChild(s2); };
        document.head.appendChild(s1);
      }} />
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');`}</style>

      <div className="flex h-full flex-col select-none" style={{ fontFamily: "'Inter', system-ui, sans-serif", backgroundColor: th.bg, color: th.text, transition: 'background-color 0.3s, color 0.3s' }}>
        {/* ═══ HEADER ═══ */}
        <header className={`flex items-center justify-between border-b px-4 py-1.5 ${glass}`} style={{ borderColor: th.border, backgroundColor: th.headerBg }}>
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: 'linear-gradient(135deg, #6C63FF, #3F51B5)' }}>
                <span className="text-xs font-bold text-white">S</span>
              </div>
              <span className="text-sm font-semibold" style={{ color: th.text }}>STEMVerse Studio</span>
            </div>
            <div className="mx-2 h-5 w-px" style={{ backgroundColor: th.border }} />
            {/* Play/Stop */}
            <div className="flex items-center gap-1.5 rounded-full px-1 py-0.5" style={{ backgroundColor: darkMode ? '#1E1E30' : '#F0F1F8' }}>
              <button type="button" onClick={handlePlay} disabled={!engineReady} className="flex h-7 w-7 items-center justify-center rounded-full transition-all duration-150 hover:scale-105 active:scale-95 disabled:opacity-30" style={{ backgroundColor: isPlaying ? '#2ecc71' : '#6C63FF', color: 'white' }} title="Run">
                {isPlaying ? <span className="text-xs">⏸</span> : <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M5 3v18l15-9z" /></svg>}
              </button>
              <button type="button" onClick={handleStop} disabled={!engineReady} className="flex h-7 w-7 items-center justify-center rounded-full transition-all duration-150 hover:scale-105 active:scale-95 disabled:opacity-30" style={{ backgroundColor: '#e74c3c', color: 'white' }} title="Stop">
                <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>
              </button>
            </div>
            <span className="text-xs" style={{ color: th.textMuted }}>{status}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full px-2.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: darkMode ? '#2A2A44' : '#EEEEF8', color: th.textMuted }}>{blockCount} blocks · {sprites.filter(s => !s.isStage).length} agents</span>
            <button type="button" onClick={() => setDarkMode(!darkMode)} className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors" style={{ backgroundColor: darkMode ? '#2A2A44' : '#EEEEF8' }} title="Toggle theme">
              <span className="text-xs">{darkMode ? '☀️' : '🌙'}</span>
            </button>
            {onSave && <Button size="sm" onClick={handleSave} loading={saving} disabled={!engineReady}>Save</Button>}
          </div>
        </header>

        {/* ═══ MAIN AREA ═══ */}
        <div className="flex min-h-0 flex-1">
          {/* ─── Left: Categories ─── */}
          <aside className="flex w-14 shrink-0 flex-col items-center gap-0.5 overflow-y-auto py-2" style={{ backgroundColor: th.surface, borderRight: `1px solid ${th.border}` }}>
            {STUDIO_CATEGORIES.map(cat => (
              <button key={cat.id} type="button" onClick={() => {
                setActiveCategory(cat.id);
                if (workspaceRef.current) {
                  const toolbox = workspaceRef.current.getToolbox();
                  if (toolbox) { const cats = toolbox.getToolboxItems(); const t = cats?.find((c: any) => (c.name_ || c.getName?.()) === cat.name); if (t) toolbox.setSelectedItem(t); }
                }
              }}
              className="group flex w-11 flex-col items-center gap-0.5 rounded-lg py-1.5 transition-all duration-100"
              style={{ backgroundColor: activeCategory === cat.id ? (darkMode ? cat.colour + '30' : cat.colour + '18') : 'transparent', border: activeCategory === cat.id ? `1.5px solid ${cat.colour}60` : '1.5px solid transparent' }}>
                <span className="text-sm transition-transform group-hover:scale-110">{cat.icon}</span>
                <span className="text-[7px] font-medium leading-tight" style={{ color: activeCategory === cat.id ? cat.colour : th.textMuted }}>{cat.name}</span>
              </button>
            ))}
          </aside>

          {/* ─── Center: Blockly + Stage ─── */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1">
              {/* Blockly workspace */}
              <section className="relative min-w-0 flex-1" style={{ backgroundColor: th.workspaceBg }}>
                <div ref={blocklyDivRef} className="absolute inset-0" />
                {!blocklyReady && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: th.workspaceBg }}>
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: th.accent }} />
                      <span className="text-xs" style={{ color: th.textMuted }}>Loading visual builder…</span>
                    </div>
                  </div>
                )}
              </section>

              {/* Stage + Agents panel */}
              <aside className="flex w-[290px] shrink-0 flex-col border-l" style={{ borderColor: th.border, backgroundColor: th.surface }}>
                {/* Stage preview */}
                <div className="flex flex-col items-center border-b p-2" style={{ borderColor: th.border, backgroundColor: th.canvasBg }}>
                  <div className="overflow-hidden rounded-lg" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.15)', border: `1px solid ${th.border}` }}>
                    <canvas ref={canvasRef} width={STAGE_WIDTH} height={STAGE_HEIGHT} className="block" style={{ width: 270, height: 202, backgroundColor: 'white' }} />
                  </div>
                </div>
                {/* Agent list */}
                <div className="flex-1 overflow-y-auto p-2">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: th.textMuted }}>Agents</span>
                    <button type="button" onClick={handleAddAgent} disabled={!engineReady} className="flex h-6 w-6 items-center justify-center rounded-md transition-all hover:scale-110 disabled:opacity-30" style={{ backgroundColor: th.accent, color: 'white' }} title="Add agent">
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {sprites.map(sprite => (
                      <button key={sprite.name} type="button" onClick={() => setSelectedTarget(sprite.name)} className="flex flex-col items-center rounded-lg border p-1.5 transition-all duration-100 hover:shadow-md" style={{ borderColor: selectedTarget === sprite.name ? th.accent : th.border, backgroundColor: selectedTarget === sprite.name ? (darkMode ? th.accent + '20' : th.accent + '10') : th.surface }}>
                        <span className="text-base">{sprite.isStage ? '🎭' : '🤖'}</span>
                        <span className="max-w-full truncate text-[8px] font-medium" style={{ color: th.text }}>{sprite.isStage ? 'Stage' : sprite.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {/* Right tabs */}
                <div className="border-t" style={{ borderColor: th.border }}>
                  <div className="flex">
                    {rightTabs.map(tab => (
                      <button key={tab.id} type="button" onClick={() => setRightTab(tab.id)} className="flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[8px] font-medium transition-colors" style={{ color: rightTab === tab.id ? th.accent : th.textMuted, borderBottom: rightTab === tab.id ? `2px solid ${th.accent}` : '2px solid transparent' }}>
                        <span className="text-xs">{tab.icon}</span>{tab.label}
                      </button>
                    ))}
                  </div>
                  <div className="p-2" style={{ minHeight: 60 }}>
                    {rightTab === 'properties' && <p className="text-[10px]" style={{ color: th.textMuted }}>Select an agent to view properties.</p>}
                    {rightTab === 'variables' && <p className="text-[10px]" style={{ color: th.textMuted }}>Variables appear here.</p>}
                    {rightTab === 'assets' && (
                      <div className="flex gap-1.5">
                        <div className="flex h-10 flex-1 items-center justify-center rounded-md border border-dashed text-[9px] transition-colors" style={{ borderColor: th.border, color: th.textMuted }}>🎨 Costumes</div>
                        <div className="flex h-10 flex-1 items-center justify-center rounded-md border border-dashed text-[9px] transition-colors" style={{ borderColor: th.border, color: th.textMuted }}>🔊 Sounds</div>
                      </div>
                    )}
                    {rightTab === 'inspector' && <p className="text-[10px]" style={{ color: th.textMuted }}>{blockCount} blocks · {sprites.length} targets</p>}
                  </div>
                </div>
              </aside>
            </div>

            {/* ─── Bottom panel ─── */}
            <div className="border-t" style={{ borderColor: th.border, backgroundColor: th.surface }}>
              <div className="flex items-center justify-between px-2 py-0.5">
                <div className="flex gap-0.5">
                  {bottomTabs.map(tab => (
                    <button key={tab.id} type="button" onClick={() => { setBottomTab(tab.id); setBottomOpen(true); }} className="rounded px-2 py-0.5 text-[9px] font-medium transition-colors" style={{ color: bottomTab === tab.id && bottomOpen ? th.accent : th.textMuted, backgroundColor: bottomTab === tab.id && bottomOpen ? (darkMode ? th.accent + '20' : th.accent + '10') : 'transparent' }}>
                      <span className="mr-1">{tab.icon}</span>{tab.label}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => setBottomOpen(!bottomOpen)} className="rounded px-1.5 py-0.5 text-[9px]" style={{ color: th.textMuted }}>{bottomOpen ? '▼' : '▲'}</button>
              </div>
              {bottomOpen && (
                <div className="h-28 overflow-y-auto border-t px-3 py-1.5 font-mono text-[10px]" style={{ borderColor: th.border, backgroundColor: darkMode ? '#0D0D14' : '#FAFAFD', color: darkMode ? '#8888AA' : '#6B6B8A' }}>
                  {bottomTab === 'console' && consoleLines.map((line, i) => <div key={i}>{line}</div>)}
                  {bottomTab === 'serial' && <div>Serial monitor — connect hardware to start.</div>}
                  {bottomTab === 'errors' && <div style={{ color: '#2ecc71' }}>✓ No errors.</div>}
                  {bottomTab === 'output' && <div>Simulation output will appear here.</div>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* Keep the exported name for backward compat but it's now STEMVerse Studio */
export { ScratchWorkspace as StudioWorkspace };

declare global {
  interface Window {
    STEMVerseScratch: {
      createScratchRuntime: (canvas: HTMLCanvasElement, width?: number, height?: number) => Promise<ScratchRuntime>;
    };
  }
}
