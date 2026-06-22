'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { Button } from '@stemverse/ui';

/* ───────── constants ───────── */
const STAGE_WIDTH = 480;
const STAGE_HEIGHT = 360;

const SCRATCH_CATEGORIES = [
  { id: 'motion', name: 'Motion', colour: '#4C97FF' },
  { id: 'looks', name: 'Looks', colour: '#9966FF' },
  { id: 'sound', name: 'Sound', colour: '#CF63CF' },
  { id: 'events', name: 'Events', colour: '#FFD500' },
  { id: 'control', name: 'Control', colour: '#FFAB19' },
  { id: 'sensing', name: 'Sensing', colour: '#5CB1D6' },
  { id: 'operators', name: 'Operators', colour: '#59C059' },
  { id: 'variables', name: 'Variables', colour: '#FF8C1A' },
] as const;

/* ───────── Scratch VM types ───────── */
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

interface ScratchWorkspaceProps {
  projectId?: string;
  initialData?: unknown;
  onSave?: (workspaceJson: unknown) => Promise<void>;
}

/* ───────── helpers ───────── */

/** Build a valid default Scratch 3 project JSON */
function createDefaultScratchProject(): object {
  return {
    targets: [
      {
        isStage: true,
        name: 'Stage',
        variables: {},
        lists: {},
        broadcasts: {},
        blocks: {},
        comments: {},
        currentCostume: 0,
        costumes: [
          {
            name: 'backdrop1',
            dataFormat: 'svg',
            assetId: 'cd21514d0531fdffb6adae589bfa37f0',
            md5ext: 'cd21514d0531fdffb6adae589bfa37f0.svg',
            rotationCenterX: 240,
            rotationCenterY: 180,
          },
        ],
        sounds: [],
        volume: 100,
        layerOrder: 0,
        tempo: 60,
        videoTransparency: 50,
        videoState: 'on',
        textToSpeechLanguage: null,
      },
      {
        isStage: false,
        name: 'Sprite1',
        variables: {},
        lists: {},
        broadcasts: {},
        blocks: {},
        comments: {},
        currentCostume: 0,
        costumes: [
          {
            name: 'costume1',
            bitmapResolution: 1,
            dataFormat: 'svg',
            assetId: 'cd21514d0531fdffb6adae589bfa37f0',
            md5ext: 'cd21514d0531fdffb6adae589bfa37f0.svg',
            rotationCenterX: 48,
            rotationCenterY: 50,
          },
        ],
        sounds: [],
        visible: true,
        x: 0,
        y: 0,
        size: 100,
        direction: 90,
        draggable: false,
        rotationStyle: 'all around',
        layerOrder: 1,
        volume: 100,
      },
    ],
    monitors: [],
    extensions: [],
    meta: { semver: '3.0.0', vm: '1.4.6', agent: 'STEMVerse' },
  };
}

/** Validate whether a JS object is a valid Scratch 3 project */
function isValidScratchProject(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.targets) || obj.targets.length === 0) return false;
  const stage = (obj.targets as Array<Record<string, unknown>>).find(
    (t) => t.isStage === true,
  );
  if (!stage) return false;
  return true;
}

/** Safely parse initial data into a valid SB3 project */
function resolveProjectData(initialData: unknown): string {
  // Case 1: already a valid Scratch 3 object
  if (isValidScratchProject(initialData)) {
    return JSON.stringify(initialData);
  }

  // Case 2: stringified JSON
  if (typeof initialData === 'string') {
    try {
      const parsed = JSON.parse(initialData);
      if (isValidScratchProject(parsed)) {
        return initialData;
      }
    } catch {
      /* not JSON */
    }
  }

  // Case 3: has workspaceJson / data property
  if (initialData && typeof initialData === 'object') {
    const obj = initialData as Record<string, unknown>;
    const nested = obj.workspaceJson ?? obj.data ?? obj.project;
    if (nested) {
      return resolveProjectData(nested);
    }
  }

  // Fallback: create a fresh project
  console.warn('[Scratch] initialData is not a valid SB3 project, using default');
  return JSON.stringify(createDefaultScratchProject());
}

/* ───────── Blockly toolbox XML (Scratch-coloured categories) ───────── */
function buildToolboxXml(): string {
  return `<xml id="stemverse-scratch-toolbox">
  <category name="Motion" colour="#4C97FF">
    <block type="motion_movesteps"><value name="STEPS"><shadow type="math_number"><field name="NUM">10</field></shadow></value></block>
    <block type="motion_turnright"><value name="DEGREES"><shadow type="math_number"><field name="NUM">15</field></shadow></value></block>
    <block type="motion_turnleft"><value name="DEGREES"><shadow type="math_number"><field name="NUM">15</field></shadow></value></block>
    <block type="motion_gotoxy">
      <value name="X"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
      <value name="Y"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
    </block>
    <block type="motion_glideto">
      <value name="SECS"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
      <value name="X"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
      <value name="Y"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
    </block>
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
  <category name="Looks" colour="#9966FF">
    <block type="looks_sayforsecs">
      <value name="MESSAGE"><shadow type="text"><field name="TEXT">Hello!</field></shadow></value>
      <value name="SECS"><shadow type="math_number"><field name="NUM">2</field></shadow></value>
    </block>
    <block type="looks_say"><value name="MESSAGE"><shadow type="text"><field name="TEXT">Hello!</field></shadow></value></block>
    <block type="looks_thinkforsecs">
      <value name="MESSAGE"><shadow type="text"><field name="TEXT">Hmm...</field></shadow></value>
      <value name="SECS"><shadow type="math_number"><field name="NUM">2</field></shadow></value>
    </block>
    <block type="looks_think"><value name="MESSAGE"><shadow type="text"><field name="TEXT">Hmm...</field></shadow></value></block>
    <block type="looks_show"></block>
    <block type="looks_hide"></block>
    <block type="looks_changesizeby"><value name="CHANGE"><shadow type="math_number"><field name="NUM">10</field></shadow></value></block>
    <block type="looks_setsizeto"><value name="SIZE"><shadow type="math_number"><field name="NUM">100</field></shadow></value></block>
    <block type="looks_size"></block>
  </category>
  <category name="Sound" colour="#CF63CF">
    <block type="sound_play"></block>
    <block type="sound_stopallsounds"></block>
    <block type="sound_changevolumeby"><value name="VOLUME"><shadow type="math_number"><field name="NUM">-10</field></shadow></value></block>
    <block type="sound_setvolumeto"><value name="VOLUME"><shadow type="math_number"><field name="NUM">100</field></shadow></value></block>
    <block type="sound_volume"></block>
  </category>
  <category name="Events" colour="#FFD500">
    <block type="event_whenflagclicked"></block>
    <block type="event_whenkeypressed"><field name="KEY_OPTION">space</field></block>
    <block type="event_whenthisspriteclicked"></block>
    <block type="event_whenbroadcastreceived"><field name="BROADCAST_OPTION">message1</field></block>
    <block type="event_broadcast"><value name="BROADCAST_INPUT"><shadow type="text"><field name="TEXT">message1</field></shadow></value></block>
    <block type="event_broadcastandwait"><value name="BROADCAST_INPUT"><shadow type="text"><field name="TEXT">message1</field></shadow></value></block>
  </category>
  <category name="Control" colour="#FFAB19">
    <block type="control_wait"><value name="DURATION"><shadow type="math_number"><field name="NUM">1</field></shadow></value></block>
    <block type="control_repeat"><value name="TIMES"><shadow type="math_number"><field name="NUM">10</field></shadow></value></block>
    <block type="control_forever"></block>
    <block type="control_if"></block>
    <block type="control_if_else"></block>
    <block type="control_wait_until"></block>
    <block type="control_repeat_until"></block>
    <block type="control_stop"><field name="STOP_OPTION">all</field></block>
    <block type="control_start_as_clone"></block>
    <block type="control_create_clone_of"></block>
    <block type="control_delete_this_clone"></block>
  </category>
  <category name="Sensing" colour="#5CB1D6">
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
  <category name="Operators" colour="#59C059">
    <block type="operator_add">
      <value name="NUM1"><shadow type="math_number"><field name="NUM"></field></shadow></value>
      <value name="NUM2"><shadow type="math_number"><field name="NUM"></field></shadow></value>
    </block>
    <block type="operator_subtract">
      <value name="NUM1"><shadow type="math_number"><field name="NUM"></field></shadow></value>
      <value name="NUM2"><shadow type="math_number"><field name="NUM"></field></shadow></value>
    </block>
    <block type="operator_multiply">
      <value name="NUM1"><shadow type="math_number"><field name="NUM"></field></shadow></value>
      <value name="NUM2"><shadow type="math_number"><field name="NUM"></field></shadow></value>
    </block>
    <block type="operator_divide">
      <value name="NUM1"><shadow type="math_number"><field name="NUM"></field></shadow></value>
      <value name="NUM2"><shadow type="math_number"><field name="NUM"></field></shadow></value>
    </block>
    <block type="operator_random">
      <value name="FROM"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
      <value name="TO"><shadow type="math_number"><field name="NUM">10</field></shadow></value>
    </block>
    <block type="operator_gt">
      <value name="OPERAND1"><shadow type="math_number"><field name="NUM"></field></shadow></value>
      <value name="OPERAND2"><shadow type="math_number"><field name="NUM">50</field></shadow></value>
    </block>
    <block type="operator_lt">
      <value name="OPERAND1"><shadow type="math_number"><field name="NUM"></field></shadow></value>
      <value name="OPERAND2"><shadow type="math_number"><field name="NUM">50</field></shadow></value>
    </block>
    <block type="operator_equals">
      <value name="OPERAND1"><shadow type="math_number"><field name="NUM"></field></shadow></value>
      <value name="OPERAND2"><shadow type="math_number"><field name="NUM">50</field></shadow></value>
    </block>
    <block type="operator_and"></block>
    <block type="operator_or"></block>
    <block type="operator_not"></block>
    <block type="operator_join">
      <value name="STRING1"><shadow type="text"><field name="TEXT">apple </field></shadow></value>
      <value name="STRING2"><shadow type="text"><field name="TEXT">banana</field></shadow></value>
    </block>
    <block type="operator_length"><value name="STRING"><shadow type="text"><field name="TEXT">apple</field></shadow></value></block>
    <block type="operator_mod">
      <value name="NUM1"><shadow type="math_number"><field name="NUM"></field></shadow></value>
      <value name="NUM2"><shadow type="math_number"><field name="NUM"></field></shadow></value>
    </block>
    <block type="operator_round"><value name="NUM"><shadow type="math_number"><field name="NUM"></field></shadow></value></block>
    <block type="operator_mathop">
      <value name="NUM"><shadow type="math_number"><field name="NUM"></field></shadow></value>
      <field name="OPERATOR">abs</field>
    </block>
  </category>
  <category name="Variables" colour="#FF8C1A" custom="VARIABLE"></category>
</xml>`;
}

/* ───────── register Scratch block defs in Blockly ───────── */
function registerScratchBlocks(Blockly: any) {
  if (!Blockly) return;
  const alreadyDefined = (t: string) => !!Blockly.Blocks[t];

  /* ---------- helper: define a simple block if not yet defined ---------- */
  const defBlock = (type: string, cfg: Record<string, unknown>) => {
    if (alreadyDefined(type)) return;
    Blockly.Blocks[type] = {
      init: function (this: any) { this.jsonInit(cfg); },
    };
  };

  // Motion blocks
  defBlock('motion_movesteps', { type: 'motion_movesteps', message0: 'move %1 steps', args0: [{ type: 'input_value', name: 'STEPS', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#4C97FF', tooltip: 'Move forward' });
  defBlock('motion_turnright', { type: 'motion_turnright', message0: 'turn ↻ %1 degrees', args0: [{ type: 'input_value', name: 'DEGREES', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#4C97FF' });
  defBlock('motion_turnleft', { type: 'motion_turnleft', message0: 'turn ↺ %1 degrees', args0: [{ type: 'input_value', name: 'DEGREES', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#4C97FF' });
  defBlock('motion_gotoxy', { type: 'motion_gotoxy', message0: 'go to x: %1 y: %2', args0: [{ type: 'input_value', name: 'X', check: 'Number' }, { type: 'input_value', name: 'Y', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#4C97FF' });
  defBlock('motion_glideto', { type: 'motion_glideto', message0: 'glide %1 secs to x: %2 y: %3', args0: [{ type: 'input_value', name: 'SECS', check: 'Number' }, { type: 'input_value', name: 'X', check: 'Number' }, { type: 'input_value', name: 'Y', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#4C97FF' });
  defBlock('motion_pointindirection', { type: 'motion_pointindirection', message0: 'point in direction %1', args0: [{ type: 'input_value', name: 'DIRECTION', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#4C97FF' });
  defBlock('motion_changexby', { type: 'motion_changexby', message0: 'change x by %1', args0: [{ type: 'input_value', name: 'DX', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#4C97FF' });
  defBlock('motion_setx', { type: 'motion_setx', message0: 'set x to %1', args0: [{ type: 'input_value', name: 'X', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#4C97FF' });
  defBlock('motion_changeyby', { type: 'motion_changeyby', message0: 'change y by %1', args0: [{ type: 'input_value', name: 'DY', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#4C97FF' });
  defBlock('motion_sety', { type: 'motion_sety', message0: 'set y to %1', args0: [{ type: 'input_value', name: 'Y', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#4C97FF' });
  defBlock('motion_ifonedgebounce', { type: 'motion_ifonedgebounce', message0: 'if on edge, bounce', previousStatement: null, nextStatement: null, colour: '#4C97FF' });
  defBlock('motion_xposition', { type: 'motion_xposition', message0: 'x position', output: 'Number', colour: '#4C97FF' });
  defBlock('motion_yposition', { type: 'motion_yposition', message0: 'y position', output: 'Number', colour: '#4C97FF' });
  defBlock('motion_direction', { type: 'motion_direction', message0: 'direction', output: 'Number', colour: '#4C97FF' });

  // Looks blocks
  defBlock('looks_sayforsecs', { type: 'looks_sayforsecs', message0: 'say %1 for %2 seconds', args0: [{ type: 'input_value', name: 'MESSAGE' }, { type: 'input_value', name: 'SECS', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#9966FF' });
  defBlock('looks_say', { type: 'looks_say', message0: 'say %1', args0: [{ type: 'input_value', name: 'MESSAGE' }], previousStatement: null, nextStatement: null, colour: '#9966FF' });
  defBlock('looks_thinkforsecs', { type: 'looks_thinkforsecs', message0: 'think %1 for %2 seconds', args0: [{ type: 'input_value', name: 'MESSAGE' }, { type: 'input_value', name: 'SECS', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#9966FF' });
  defBlock('looks_think', { type: 'looks_think', message0: 'think %1', args0: [{ type: 'input_value', name: 'MESSAGE' }], previousStatement: null, nextStatement: null, colour: '#9966FF' });
  defBlock('looks_show', { type: 'looks_show', message0: 'show', previousStatement: null, nextStatement: null, colour: '#9966FF' });
  defBlock('looks_hide', { type: 'looks_hide', message0: 'hide', previousStatement: null, nextStatement: null, colour: '#9966FF' });
  defBlock('looks_changesizeby', { type: 'looks_changesizeby', message0: 'change size by %1', args0: [{ type: 'input_value', name: 'CHANGE', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#9966FF' });
  defBlock('looks_setsizeto', { type: 'looks_setsizeto', message0: 'set size to %1 %%', args0: [{ type: 'input_value', name: 'SIZE', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#9966FF' });
  defBlock('looks_size', { type: 'looks_size', message0: 'size', output: 'Number', colour: '#9966FF' });

  // Sound blocks
  defBlock('sound_play', { type: 'sound_play', message0: 'start sound', previousStatement: null, nextStatement: null, colour: '#CF63CF' });
  defBlock('sound_stopallsounds', { type: 'sound_stopallsounds', message0: 'stop all sounds', previousStatement: null, nextStatement: null, colour: '#CF63CF' });
  defBlock('sound_changevolumeby', { type: 'sound_changevolumeby', message0: 'change volume by %1', args0: [{ type: 'input_value', name: 'VOLUME', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#CF63CF' });
  defBlock('sound_setvolumeto', { type: 'sound_setvolumeto', message0: 'set volume to %1 %%', args0: [{ type: 'input_value', name: 'VOLUME', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#CF63CF' });
  defBlock('sound_volume', { type: 'sound_volume', message0: 'volume', output: 'Number', colour: '#CF63CF' });

  // Events blocks
  defBlock('event_whenflagclicked', { type: 'event_whenflagclicked', message0: '⚑ when green flag clicked', nextStatement: null, colour: '#FFD500' });
  defBlock('event_whenkeypressed', { type: 'event_whenkeypressed', message0: 'when %1 key pressed', args0: [{ type: 'field_dropdown', name: 'KEY_OPTION', options: [['space', 'space'], ['up arrow', 'up arrow'], ['down arrow', 'down arrow'], ['left arrow', 'left arrow'], ['right arrow', 'right arrow'], ['any', 'any'], ['a', 'a'], ['b', 'b'], ['c', 'c']] }], nextStatement: null, colour: '#FFD500' });
  defBlock('event_whenthisspriteclicked', { type: 'event_whenthisspriteclicked', message0: 'when this sprite clicked', nextStatement: null, colour: '#FFD500' });
  defBlock('event_whenbroadcastreceived', { type: 'event_whenbroadcastreceived', message0: 'when I receive %1', args0: [{ type: 'field_input', name: 'BROADCAST_OPTION', text: 'message1' }], nextStatement: null, colour: '#FFD500' });
  defBlock('event_broadcast', { type: 'event_broadcast', message0: 'broadcast %1', args0: [{ type: 'input_value', name: 'BROADCAST_INPUT' }], previousStatement: null, nextStatement: null, colour: '#FFD500' });
  defBlock('event_broadcastandwait', { type: 'event_broadcastandwait', message0: 'broadcast %1 and wait', args0: [{ type: 'input_value', name: 'BROADCAST_INPUT' }], previousStatement: null, nextStatement: null, colour: '#FFD500' });

  // Control blocks
  defBlock('control_wait', { type: 'control_wait', message0: 'wait %1 seconds', args0: [{ type: 'input_value', name: 'DURATION', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#FFAB19' });
  defBlock('control_repeat', { type: 'control_repeat', message0: 'repeat %1 %2', args0: [{ type: 'input_value', name: 'TIMES', check: 'Number' }, { type: 'input_statement', name: 'SUBSTACK' }], previousStatement: null, nextStatement: null, colour: '#FFAB19' });
  defBlock('control_forever', { type: 'control_forever', message0: 'forever %1', args0: [{ type: 'input_statement', name: 'SUBSTACK' }], previousStatement: null, colour: '#FFAB19' });
  defBlock('control_if', { type: 'control_if', message0: 'if %1 then %2', args0: [{ type: 'input_value', name: 'CONDITION', check: 'Boolean' }, { type: 'input_statement', name: 'SUBSTACK' }], previousStatement: null, nextStatement: null, colour: '#FFAB19' });
  defBlock('control_if_else', { type: 'control_if_else', message0: 'if %1 then %2 else %3', args0: [{ type: 'input_value', name: 'CONDITION', check: 'Boolean' }, { type: 'input_statement', name: 'SUBSTACK' }, { type: 'input_statement', name: 'SUBSTACK2' }], previousStatement: null, nextStatement: null, colour: '#FFAB19' });
  defBlock('control_wait_until', { type: 'control_wait_until', message0: 'wait until %1', args0: [{ type: 'input_value', name: 'CONDITION', check: 'Boolean' }], previousStatement: null, nextStatement: null, colour: '#FFAB19' });
  defBlock('control_repeat_until', { type: 'control_repeat_until', message0: 'repeat until %1 %2', args0: [{ type: 'input_value', name: 'CONDITION', check: 'Boolean' }, { type: 'input_statement', name: 'SUBSTACK' }], previousStatement: null, nextStatement: null, colour: '#FFAB19' });
  defBlock('control_stop', { type: 'control_stop', message0: 'stop %1', args0: [{ type: 'field_dropdown', name: 'STOP_OPTION', options: [['all', 'all'], ['this script', 'this script'], ['other scripts in sprite', 'other scripts in sprite']] }], previousStatement: null, colour: '#FFAB19' });
  defBlock('control_start_as_clone', { type: 'control_start_as_clone', message0: 'when I start as a clone', nextStatement: null, colour: '#FFAB19' });
  defBlock('control_create_clone_of', { type: 'control_create_clone_of', message0: 'create clone of myself', previousStatement: null, nextStatement: null, colour: '#FFAB19' });
  defBlock('control_delete_this_clone', { type: 'control_delete_this_clone', message0: 'delete this clone', previousStatement: null, colour: '#FFAB19' });

  // Sensing blocks
  defBlock('sensing_touchingobject', { type: 'sensing_touchingobject', message0: 'touching mouse-pointer?', output: 'Boolean', colour: '#5CB1D6' });
  defBlock('sensing_distanceto', { type: 'sensing_distanceto', message0: 'distance to mouse-pointer', output: 'Number', colour: '#5CB1D6' });
  defBlock('sensing_askandwait', { type: 'sensing_askandwait', message0: 'ask %1 and wait', args0: [{ type: 'input_value', name: 'QUESTION' }], previousStatement: null, nextStatement: null, colour: '#5CB1D6' });
  defBlock('sensing_answer', { type: 'sensing_answer', message0: 'answer', output: 'String', colour: '#5CB1D6' });
  defBlock('sensing_keypressed', { type: 'sensing_keypressed', message0: 'key %1 pressed?', args0: [{ type: 'field_dropdown', name: 'KEY_OPTION', options: [['space', 'space'], ['up arrow', 'up arrow'], ['down arrow', 'down arrow'], ['left arrow', 'left arrow'], ['right arrow', 'right arrow']] }], output: 'Boolean', colour: '#5CB1D6' });
  defBlock('sensing_mousedown', { type: 'sensing_mousedown', message0: 'mouse down?', output: 'Boolean', colour: '#5CB1D6' });
  defBlock('sensing_mousex', { type: 'sensing_mousex', message0: 'mouse x', output: 'Number', colour: '#5CB1D6' });
  defBlock('sensing_mousey', { type: 'sensing_mousey', message0: 'mouse y', output: 'Number', colour: '#5CB1D6' });
  defBlock('sensing_timer', { type: 'sensing_timer', message0: 'timer', output: 'Number', colour: '#5CB1D6' });
  defBlock('sensing_resettimer', { type: 'sensing_resettimer', message0: 'reset timer', previousStatement: null, nextStatement: null, colour: '#5CB1D6' });

  // Operators blocks
  defBlock('operator_add', { type: 'operator_add', message0: '%1 + %2', args0: [{ type: 'input_value', name: 'NUM1', check: 'Number' }, { type: 'input_value', name: 'NUM2', check: 'Number' }], output: 'Number', colour: '#59C059', inputsInline: true });
  defBlock('operator_subtract', { type: 'operator_subtract', message0: '%1 - %2', args0: [{ type: 'input_value', name: 'NUM1', check: 'Number' }, { type: 'input_value', name: 'NUM2', check: 'Number' }], output: 'Number', colour: '#59C059', inputsInline: true });
  defBlock('operator_multiply', { type: 'operator_multiply', message0: '%1 × %2', args0: [{ type: 'input_value', name: 'NUM1', check: 'Number' }, { type: 'input_value', name: 'NUM2', check: 'Number' }], output: 'Number', colour: '#59C059', inputsInline: true });
  defBlock('operator_divide', { type: 'operator_divide', message0: '%1 / %2', args0: [{ type: 'input_value', name: 'NUM1', check: 'Number' }, { type: 'input_value', name: 'NUM2', check: 'Number' }], output: 'Number', colour: '#59C059', inputsInline: true });
  defBlock('operator_random', { type: 'operator_random', message0: 'pick random %1 to %2', args0: [{ type: 'input_value', name: 'FROM', check: 'Number' }, { type: 'input_value', name: 'TO', check: 'Number' }], output: 'Number', colour: '#59C059', inputsInline: true });
  defBlock('operator_gt', { type: 'operator_gt', message0: '%1 > %2', args0: [{ type: 'input_value', name: 'OPERAND1', check: 'Number' }, { type: 'input_value', name: 'OPERAND2', check: 'Number' }], output: 'Boolean', colour: '#59C059', inputsInline: true });
  defBlock('operator_lt', { type: 'operator_lt', message0: '%1 < %2', args0: [{ type: 'input_value', name: 'OPERAND1', check: 'Number' }, { type: 'input_value', name: 'OPERAND2', check: 'Number' }], output: 'Boolean', colour: '#59C059', inputsInline: true });
  defBlock('operator_equals', { type: 'operator_equals', message0: '%1 = %2', args0: [{ type: 'input_value', name: 'OPERAND1', check: 'Number' }, { type: 'input_value', name: 'OPERAND2', check: 'Number' }], output: 'Boolean', colour: '#59C059', inputsInline: true });
  defBlock('operator_and', { type: 'operator_and', message0: '%1 and %2', args0: [{ type: 'input_value', name: 'OPERAND1', check: 'Boolean' }, { type: 'input_value', name: 'OPERAND2', check: 'Boolean' }], output: 'Boolean', colour: '#59C059', inputsInline: true });
  defBlock('operator_or', { type: 'operator_or', message0: '%1 or %2', args0: [{ type: 'input_value', name: 'OPERAND1', check: 'Boolean' }, { type: 'input_value', name: 'OPERAND2', check: 'Boolean' }], output: 'Boolean', colour: '#59C059', inputsInline: true });
  defBlock('operator_not', { type: 'operator_not', message0: 'not %1', args0: [{ type: 'input_value', name: 'OPERAND', check: 'Boolean' }], output: 'Boolean', colour: '#59C059' });
  defBlock('operator_join', { type: 'operator_join', message0: 'join %1 %2', args0: [{ type: 'input_value', name: 'STRING1' }, { type: 'input_value', name: 'STRING2' }], output: 'String', colour: '#59C059', inputsInline: true });
  defBlock('operator_length', { type: 'operator_length', message0: 'length of %1', args0: [{ type: 'input_value', name: 'STRING' }], output: 'Number', colour: '#59C059' });
  defBlock('operator_mod', { type: 'operator_mod', message0: '%1 mod %2', args0: [{ type: 'input_value', name: 'NUM1', check: 'Number' }, { type: 'input_value', name: 'NUM2', check: 'Number' }], output: 'Number', colour: '#59C059', inputsInline: true });
  defBlock('operator_round', { type: 'operator_round', message0: 'round %1', args0: [{ type: 'input_value', name: 'NUM', check: 'Number' }], output: 'Number', colour: '#59C059' });
  defBlock('operator_mathop', { type: 'operator_mathop', message0: '%1 of %2', args0: [{ type: 'field_dropdown', name: 'OPERATOR', options: [['abs', 'abs'], ['floor', 'floor'], ['ceiling', 'ceiling'], ['sqrt', 'sqrt'], ['sin', 'sin'], ['cos', 'cos'], ['tan', 'tan'], ['ln', 'ln'], ['log', 'log'], ['e ^', 'e ^'], ['10 ^', '10 ^']] }, { type: 'input_value', name: 'NUM', check: 'Number' }], output: 'Number', colour: '#59C059' });
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export function ScratchWorkspace({
  projectId,
  initialData,
  onSave,
}: ScratchWorkspaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blocklyDivRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<any>(null);
  const runtimeRef = useRef<ScratchRuntime | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  const [blocklyReady, setBlocklyReady] = useState(false);
  const [sprites, setSprites] = useState<Array<{ name: string; isStage?: boolean }>>([]);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [greenFlag, setGreenFlag] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('Loading Scratch engine…');
  const [activeCategory, setActiveCategory] = useState<string>('motion');
  const [blockCount, setBlockCount] = useState(0);

  /* ─── Refresh sprite list ─── */
  const refreshTargets = useCallback(() => {
    const rt = runtimeRef.current;
    if (!rt) return;
    const targets = rt.getTargets();
    setSprites(targets);
    if (!selectedTarget && targets.length > 0) {
      const firstSprite = targets.find((t) => !t.isStage);
      setSelectedTarget(firstSprite?.name ?? targets[0]?.name ?? null);
    }
  }, [selectedTarget]);

  /* ─── Init Scratch VM ─── */
  const initRuntime = useCallback(async () => {
    if (!canvasRef.current || !window.STEMVerseScratch) return;
    try {
      const rt = await window.STEMVerseScratch.createScratchRuntime(
        canvasRef.current,
        STAGE_WIDTH,
        STAGE_HEIGHT,
      );
      runtimeRef.current = rt;
      rt.onTargetsUpdate(refreshTargets);

      // Use validated project data — fixes the SB3 import error
      const projectJson = resolveProjectData(initialData);
      await rt.loadProject(projectJson);

      setStatus(projectId ? `Project ${projectId.slice(0, 8)}…` : 'Untitled project');
      refreshTargets();
    } catch (err) {
      console.error('[Scratch] Failed to initialize runtime:', err);
      setStatus('Engine error — see console');
    }
  }, [initialData, projectId, refreshTargets]);

  /* ─── Init Blockly workspace ─── */
  const initBlockly = useCallback(() => {
    const Blockly = (window as any).Blockly;
    if (!Blockly || !blocklyDivRef.current || workspaceRef.current) return;

    registerScratchBlocks(Blockly);

    const toolboxXml = buildToolboxXml();

    const workspace = Blockly.inject(blocklyDivRef.current, {
      toolbox: toolboxXml,
      grid: { spacing: 40, length: 2, colour: '#e0e0e0', snap: true },
      zoom: {
        controls: true,
        wheel: true,
        startScale: 0.75,
        maxScale: 3,
        minScale: 0.25,
        scaleSpeed: 1.1,
        pinch: true,
      },
      trashcan: true,
      move: { scrollbars: true, drag: true, wheel: true },
      sounds: false,
      renderer: 'zelos',
      theme: Blockly.Theme?.defineTheme?.('scratch', {
        blockStyles: {
          motion_blocks: { colourPrimary: '#4C97FF' },
          looks_blocks: { colourPrimary: '#9966FF' },
          sound_blocks: { colourPrimary: '#CF63CF' },
          event_blocks: { colourPrimary: '#FFD500' },
          control_blocks: { colourPrimary: '#FFAB19' },
          sensing_blocks: { colourPrimary: '#5CB1D6' },
          operator_blocks: { colourPrimary: '#59C059' },
          variable_blocks: { colourPrimary: '#FF8C1A' },
        },
        categoryStyles: {},
        componentStyles: {
          workspaceBackgroundColour: '#F9F9F9',
          toolboxBackgroundColour: '#FFFFFF',
          flyoutBackgroundColour: '#F9F9F9',
          scrollbarColour: '#CECDCE',
        },
        fontStyle: { family: 'Inter, Helvetica, Arial, sans-serif', weight: '500', size: 11 },
      }) ?? undefined,
    });

    workspaceRef.current = workspace;

    // Track block count changes
    workspace.addChangeListener((e: any) => {
      if (e.type === 'create' || e.type === 'delete' || e.type === 'move') {
        const allBlocks = workspace.getAllBlocks(false);
        setBlockCount(allBlocks.length);
      }
    });

    setBlocklyReady(true);
  }, []);

  /* ─── Effects ─── */
  useEffect(() => {
    if (!engineReady) return;
    initRuntime();
    return () => {
      runtimeRef.current?.dispose();
      runtimeRef.current = null;
    };
  }, [engineReady, initRuntime]);

  useEffect(() => {
    if (!blocklyReady) return;
    // Resize Blockly when panel changes
    const Blockly = (window as any).Blockly;
    if (Blockly && workspaceRef.current) {
      Blockly.svgResize(workspaceRef.current);
    }
  }, [blocklyReady]);

  /* ─── Keyboard shortcuts ─── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  /* ─── Handlers ─── */
  const handleGreenFlag = () => {
    const rt = runtimeRef.current;
    if (!rt) return;
    if (greenFlag) {
      rt.stopAll();
      setGreenFlag(false);
    } else {
      rt.greenFlag();
      setGreenFlag(true);
    }
  };

  const handleStop = () => {
    runtimeRef.current?.stopAll();
    setGreenFlag(false);
  };

  const handleAddSprite = () => {
    const rt = runtimeRef.current;
    if (!rt) return;
    const name = `Sprite${sprites.filter((s) => !s.isStage).length + 1}`;
    rt.addSprite(
      JSON.stringify({
        name,
        costumes: [
          {
            name: 'costume1',
            bitmapResolution: 1,
            dataFormat: 'svg',
            assetId: 'cd21514d0531fdffb6adae589bfa37f0',
            md5ext: 'cd21514d0531fdffb6adae589bfa37f0.svg',
            rotationCenterX: 48,
            rotationCenterY: 50,
          },
        ],
        sounds: [],
        variables: {},
        blocks: {},
        comments: {},
        currentCostume: 0,
        layerOrder: sprites.length,
        visible: true,
        x: 0,
        y: 0,
        size: 100,
        direction: 90,
        rotationStyle: 'all around',
      }),
    ).then(() => refreshTargets());
  };

  const handleSave = async () => {
    const rt = runtimeRef.current;
    if (!rt || !onSave) return;
    setSaving(true);
    try {
      const vmJson = JSON.parse(rt.toJSON()) as Record<string, unknown>;
      // Include Blockly workspace state alongside VM state
      let blocklyXml = '';
      if (workspaceRef.current) {
        const Blockly = (window as any).Blockly;
        if (Blockly?.Xml) {
          const dom = Blockly.Xml.workspaceToDom(workspaceRef.current);
          blocklyXml = Blockly.Xml.domToText(dom);
        }
      }
      await onSave({ ...vmJson, _blocklyXml: blocklyXml });
      setStatus('✓ Saved');
      setTimeout(() => setStatus(projectId ? `Project ${projectId.slice(0, 8)}…` : 'Untitled project'), 2000);
    } catch {
      setStatus('✗ Save failed');
    } finally {
      setSaving(false);
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════ */
  return (
    <>
      {/* Load Scratch VM engine */}
      <Script
        src="/scratch/scratch-engine.iife.js"
        strategy="afterInteractive"
        onLoad={() => setEngineReady(true)}
        onError={() => setStatus('Failed to load Scratch engine bundle')}
      />
      {/* Load Blockly */}
      <Script
        src="https://unpkg.com/blockly/blockly_compressed.js"
        strategy="afterInteractive"
        onLoad={() => {
          // Load additional Blockly modules
          const s1 = document.createElement('script');
          s1.src = 'https://unpkg.com/blockly/blocks_compressed.js';
          s1.onload = () => {
            const s2 = document.createElement('script');
            s2.src = 'https://unpkg.com/blockly/msg/en.js';
            s2.onload = () => initBlockly();
            document.head.appendChild(s2);
          };
          document.head.appendChild(s1);
        }}
      />

      <div className="flex h-full flex-col" style={{ fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif" }}>
        {/* ─── Top bar ─── */}
        <header className="flex items-center justify-between border-b bg-white px-4 py-2 shadow-sm" style={{ borderColor: '#e2e8f0' }}>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleGreenFlag}
              disabled={!engineReady}
              className="flex h-10 w-10 items-center justify-center rounded-full transition-all duration-150 hover:scale-110 active:scale-95 disabled:opacity-40"
              style={{ backgroundColor: greenFlag ? '#2ecc71' : '#4caf50', color: 'white' }}
              title="Green flag"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M5 3v18l15-9z" /></svg>
            </button>
            <button
              type="button"
              onClick={handleStop}
              disabled={!engineReady}
              className="flex h-10 w-10 items-center justify-center rounded-full transition-all duration-150 hover:scale-110 active:scale-95 disabled:opacity-40"
              style={{ backgroundColor: '#e74c3c', color: 'white' }}
              title="Stop"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>
            </button>
            <div className="ml-2 flex flex-col">
              <span className="text-sm font-medium text-gray-800">{status}</span>
              <span className="text-[10px] text-gray-400">{blockCount} blocks • {sprites.filter(s => !s.isStage).length} sprites</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onSave && (
              <Button size="sm" onClick={handleSave} loading={saving} disabled={!engineReady}>
                💾 Save
              </Button>
            )}
          </div>
        </header>

        {/* ─── Main area ─── */}
        <div className="flex min-h-0 flex-1">
          {/* ─── Category sidebar ─── */}
          <aside
            className="flex w-16 shrink-0 flex-col items-center gap-1 overflow-y-auto py-2"
            style={{ backgroundColor: '#f0f0f0', borderRight: '1px solid #e0e0e0' }}
          >
            {SCRATCH_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveCategory(cat.id);
                  // Scroll Blockly toolbox to this category
                  if (workspaceRef.current) {
                    const toolbox = workspaceRef.current.getToolbox();
                    if (toolbox) {
                      const cats = toolbox.getToolboxItems();
                      const target = cats?.find((c: any) => c.name_ === cat.name || c.getName?.() === cat.name);
                      if (target) toolbox.setSelectedItem(target);
                    }
                  }
                }}
                className="group flex w-12 flex-col items-center gap-0.5 rounded-lg p-1.5 transition-all duration-100"
                style={{
                  backgroundColor: activeCategory === cat.id ? cat.colour + '20' : 'transparent',
                  border: activeCategory === cat.id ? `2px solid ${cat.colour}` : '2px solid transparent',
                }}
                title={cat.name}
              >
                <div
                  className="h-5 w-5 rounded-full transition-transform group-hover:scale-110"
                  style={{ backgroundColor: cat.colour }}
                />
                <span className="text-[8px] font-medium leading-tight text-gray-600">{cat.name}</span>
              </button>
            ))}
          </aside>

          {/* ─── Blockly workspace (replaces static block list) ─── */}
          <section
            className="relative min-w-0 flex-1"
            style={{ backgroundColor: '#F9F9F9' }}
          >
            <div
              ref={blocklyDivRef}
              className="absolute inset-0"
              style={{ width: '100%', height: '100%' }}
            />
            {!blocklyReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-400 border-t-transparent" />
                  <span className="text-sm text-gray-500">Loading block editor…</span>
                </div>
              </div>
            )}
          </section>

          {/* ─── Stage + Sprites panel ─── */}
          <aside
            className="flex w-[300px] shrink-0 flex-col border-l"
            style={{ borderColor: '#e0e0e0', backgroundColor: '#f8f9fb' }}
          >
            {/* Stage */}
            <div className="flex flex-col items-center border-b p-3" style={{ borderColor: '#e0e0e0' }}>
              <div className="overflow-hidden rounded-lg shadow-md" style={{ border: '2px solid #d0d7e3' }}>
                <canvas
                  ref={canvasRef}
                  width={STAGE_WIDTH}
                  height={STAGE_HEIGHT}
                  className="block bg-white"
                  style={{ width: 282, height: 212, imageRendering: 'auto' }}
                />
              </div>
            </div>

            {/* Sprite list */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sprites</span>
                <button
                  type="button"
                  onClick={handleAddSprite}
                  disabled={!engineReady}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-white transition-all hover:scale-110 disabled:opacity-40"
                  style={{ backgroundColor: '#4C97FF' }}
                  title="Add sprite"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {sprites.map((sprite) => (
                  <button
                    key={sprite.name}
                    type="button"
                    onClick={() => setSelectedTarget(sprite.name)}
                    className="flex flex-col items-center rounded-lg border-2 p-2 transition-all duration-100 hover:shadow-md"
                    style={{
                      borderColor: selectedTarget === sprite.name ? '#4C97FF' : '#e2e8f0',
                      backgroundColor: selectedTarget === sprite.name ? '#EBF3FF' : 'white',
                    }}
                  >
                    <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: sprite.isStage ? '#FFD500' + '30' : '#4C97FF' + '20' }}>
                      <span className="text-lg">{sprite.isStage ? '🎭' : '🐱'}</span>
                    </div>
                    <span className="text-[10px] font-medium text-gray-700 truncate max-w-full">
                      {sprite.isStage ? 'Stage' : sprite.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Assets footer */}
            <div className="border-t p-3" style={{ borderColor: '#e0e0e0' }}>
              <div className="flex gap-2">
                <div className="flex h-12 flex-1 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white text-xs text-gray-400 transition-colors hover:border-purple-300 hover:text-purple-400">
                  🎨 Costumes
                </div>
                <div className="flex h-12 flex-1 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white text-xs text-gray-400 transition-colors hover:border-purple-300 hover:text-purple-400">
                  🔊 Sounds
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

declare global {
  interface Window {
    STEMVerseScratch: {
      createScratchRuntime: (
        canvas: HTMLCanvasElement,
        width?: number,
        height?: number,
      ) => Promise<ScratchRuntime>;
    };
  }
}
