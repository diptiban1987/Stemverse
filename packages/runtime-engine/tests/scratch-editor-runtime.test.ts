/**
 * Phase 42 — Scratch Editor Runtime Tests
 */
import { describe, it, expect } from 'vitest';
import {
  createEditor, setZoom, zoomIn, zoomOut, resetZoom, pan,
  selectBlock, multiSelectBlock, deselectAll, duplicateSelected,
  pushAction, undo, redo, canUndo, canRedo,
  addToBackpack, removeFromBackpack, clearBackpack,
  addComment, updateComment, deleteComment, toggleCommentMinimize,
  createProcedure, deleteProcedure, getProcedure,
  startPlaying, stopPlaying, setEditorMode, getToolboxCategories, addExtensionCategory,
} from '../src/stage/scratch-editor-runtime';

describe('Scratch Editor: State', () => {
  it('create editor — 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const editor = createEditor(`proj_${i}`);
      expect(editor.mode).toBe('scratch');
      expect(editor.zoom).toBe(1.0);
      expect(editor.isPlaying).toBe(false);
      expect(editor.toolboxCategories.length).toBeGreaterThan(0);
    }
  });
  it('create editor in board mode', () => {
    for (let i = 0; i < 500; i++) {
      const editor = createEditor(`proj_${i}`, 'board');
      expect(editor.mode).toBe('board');
    }
  });
});

describe('Scratch Editor: Zoom & Pan', () => {
  it('zoom in/out — 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let editor = createEditor(`proj_${i}`);
      editor = zoomIn(editor);
      expect(editor.zoom).toBe(1.25);
      editor = zoomOut(editor);
      expect(editor.zoom).toBe(1.0);
      editor = setZoom(editor, 2.0);
      expect(editor.zoom).toBe(2.0);
      editor = setZoom(editor, 5.0); // clamped
      expect(editor.zoom).toBe(2.0);
    }
  });
  it('pan workspace — 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let editor = createEditor(`proj_${i}`);
      editor = pan(editor, 100, -50);
      expect(editor.panX).toBe(100);
      expect(editor.panY).toBe(-50);
      editor = resetZoom(editor);
      expect(editor.panX).toBe(0);
      expect(editor.panY).toBe(0);
    }
  });
});

describe('Scratch Editor: Selection', () => {
  it('select and multi-select — 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let editor = createEditor(`proj_${i}`);
      editor = selectBlock(editor, 'block1');
      expect(editor.selectedBlockIds).toEqual(['block1']);
      editor = multiSelectBlock(editor, 'block2');
      expect(editor.selectedBlockIds).toEqual(['block1', 'block2']);
      editor = deselectAll(editor);
      expect(editor.selectedBlockIds).toEqual([]);
    }
  });
  it('duplicate selected — 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let editor = createEditor(`proj_${i}`);
      editor = selectBlock(editor, 'block1');
      editor = multiSelectBlock(editor, 'block2');
      const { duplicatedIds } = duplicateSelected(editor);
      expect(duplicatedIds).toHaveLength(2);
    }
  });
});

describe('Scratch Editor: Undo/Redo', () => {
  it('undo and redo — 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let editor = createEditor(`proj_${i}`);
      expect(canUndo(editor)).toBe(false);
      expect(canRedo(editor)).toBe(false);
      editor = pushAction(editor, 'add_block', { blockId: 'b1' });
      expect(canUndo(editor)).toBe(true);
      editor = undo(editor);
      expect(canRedo(editor)).toBe(true);
      expect(canUndo(editor)).toBe(false);
      editor = redo(editor);
      expect(canUndo(editor)).toBe(true);
      expect(canRedo(editor)).toBe(false);
    }
  });
});

describe('Scratch Editor: Backpack', () => {
  it('add/remove/clear backpack — 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let editor = createEditor(`proj_${i}`);
      editor = addToBackpack(editor, '<xml></xml>', 'motion', 'move');
      expect(editor.backpack).toHaveLength(1);
      editor = addToBackpack(editor, '<xml></xml>', 'looks', 'say');
      expect(editor.backpack).toHaveLength(2);
      editor = removeFromBackpack(editor, editor.backpack[0].itemId);
      expect(editor.backpack).toHaveLength(1);
      editor = clearBackpack(editor);
      expect(editor.backpack).toHaveLength(0);
    }
  });
});

describe('Scratch Editor: Comments', () => {
  it('add/update/delete comments — 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let editor = createEditor(`proj_${i}`);
      editor = addComment(editor, 'b1', 'Test comment', 100, 200);
      expect(editor.comments).toHaveLength(1);
      expect(editor.comments[0].text).toBe('Test comment');
      editor = updateComment(editor, editor.comments[0].commentId, 'Updated');
      expect(editor.comments[0].text).toBe('Updated');
      editor = toggleCommentMinimize(editor, editor.comments[0].commentId);
      expect(editor.comments[0].minimized).toBe(true);
      editor = deleteComment(editor, editor.comments[0].commentId);
      expect(editor.comments).toHaveLength(0);
    }
  });
});

describe('Scratch Editor: Procedures', () => {
  it('create/delete procedures — 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let editor = createEditor(`proj_${i}`);
      editor = createProcedure(editor, 'myFunc', [{ name: 'x', type: 'number', defaultValue: '0' }]);
      expect(editor.procedures).toHaveLength(1);
      expect(getProcedure(editor, 'myFunc')?.name).toBe('myFunc');
      expect(getProcedure(editor, 'unknown')).toBeNull();
      editor = deleteProcedure(editor, editor.procedures[0].procedureId);
      expect(editor.procedures).toHaveLength(0);
    }
  });
});

describe('Scratch Editor: Playback & Mode', () => {
  it('play/stop and mode switch — 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let editor = createEditor(`proj_${i}`);
      editor = startPlaying(editor);
      expect(editor.isPlaying).toBe(true);
      editor = stopPlaying(editor);
      expect(editor.isPlaying).toBe(false);
      editor = setEditorMode(editor, 'board');
      expect(editor.mode).toBe('board');
    }
  });
  it('toolbox categories', () => {
    for (let i = 0; i < 500; i++) {
      let editor = createEditor(`proj_${i}`);
      const cats = getToolboxCategories(editor);
      expect(cats.length).toBeGreaterThan(5);
      editor = addExtensionCategory(editor, 'Robotics', '#00AA00', ['digital_write']);
      expect(editor.toolboxCategories.length).toBe(cats.length + 1);
    }
  });
});
