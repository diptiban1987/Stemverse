import * as Blockly from 'blockly/core';
import { registerRoboticsBlocks, createToolboxDefinition } from '../blocks/definitions';
import { arduinoGenerator } from '../generators/arduino';

let initialized = false;

export function initBlocklyEngine(): void {
  if (initialized) return;
  registerRoboticsBlocks();
  initialized = true;
}

export function updateToolboxSearch(
  workspace: Blockly.WorkspaceSvg,
  searchQuery?: string,
): void {
  workspace.updateToolbox(createToolboxDefinition(searchQuery));
}

export function createRoboticsWorkspace(
  container: HTMLElement,
  options: Partial<Blockly.BlocklyOptions> & { searchQuery?: string } = {},
): Blockly.WorkspaceSvg {
  initBlocklyEngine();
  const { searchQuery, ...blocklyOptions } = options;

  return Blockly.inject(container, {
    toolbox: createToolboxDefinition(searchQuery),
    grid: {
      spacing: 20,
      length: 3,
      colour: '#E2E8F0',
      snap: true,
    },
    zoom: {
      controls: true,
      wheel: true,
      startScale: 1,
    },
    trashcan: true,
    sounds: false,
    renderer: 'geras',
    theme: Blockly.Theme.defineTheme('stemverse_robotics', {
      name: 'stemverse_robotics',
      base: Blockly.Themes.Classic,
      componentStyles: {
        workspaceBackgroundColour: '#F8FAFC',
        toolboxBackgroundColour: '#FFFFFF',
        toolboxForegroundColour: '#0F172A',
        flyoutBackgroundColour: '#FFFFFF',
        flyoutForegroundColour: '#0F172A',
        flyoutOpacity: 0.95,
        scrollbarColour: '#CBD5E1',
        insertionMarkerColour: '#2563EB',
        insertionMarkerOpacity: 0.3,
        scrollbarOpacity: 0.5,
        cursorColour: '#2563EB',
      },
      fontStyle: {
        family: 'Inter, system-ui, sans-serif',
        weight: '500',
        size: 12,
      },
    }),
    ...blocklyOptions,
  }) as Blockly.WorkspaceSvg;
}

export { createToolboxDefinition, registerRoboticsBlocks };
export { arduinoGenerator };
