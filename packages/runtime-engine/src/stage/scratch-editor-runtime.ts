/**
 * Phase 42 — Scratch Editor Runtime
 *
 * Full Scratch-style editor state management: block palette, category toolbox,
 * workspace operations, undo/redo, backpack, multi-select, duplication, comments, procedures.
 */

// ─── Types ─────────────────────────────────────────────────────

export type BlockCategory = 'motion' | 'looks' | 'sound' | 'events' | 'control' | 'sensing' | 'operators' | 'variables' | 'my_blocks' | 'extensions';
export type EditorMode = 'scratch' | 'board' | 'hybrid';
export type ZoomLevel = 0.25 | 0.5 | 0.75 | 1.0 | 1.25 | 1.5 | 2.0;

export interface EditorState {
  readonly editorId: string;
  readonly projectId: string;
  readonly mode: EditorMode;
  readonly zoom: number;
  readonly panX: number;
  readonly panY: number;
  readonly selectedBlockIds: string[];
  readonly undoStack: EditorAction[];
  readonly redoStack: EditorAction[];
  readonly backpack: BackpackItem[];
  readonly comments: BlockComment[];
  readonly procedures: CustomProcedure[];
  readonly toolboxCategories: ToolboxCategory[];
  readonly isPlaying: boolean;
  readonly createdAt: number;
}

export interface EditorAction {
  readonly actionId: string;
  readonly type: 'add_block' | 'delete_block' | 'move_block' | 'connect_block' | 'disconnect_block' | 'change_field' | 'add_comment' | 'delete_comment';
  readonly timestamp: number;
  readonly data: Record<string, unknown>;
}

export interface BackpackItem {
  readonly itemId: string;
  readonly blockXml: string;
  readonly category: BlockCategory;
  readonly label: string;
  readonly addedAt: number;
}

export interface BlockComment {
  readonly commentId: string;
  readonly blockId: string;
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly minimized: boolean;
  readonly createdAt: number;
}

export interface CustomProcedure {
  readonly procedureId: string;
  readonly name: string;
  readonly args: ProcedureArg[];
  readonly warp: boolean;
  readonly blockXml: string;
  readonly createdAt: number;
}

export interface ProcedureArg {
  readonly name: string;
  readonly type: 'string' | 'number' | 'boolean';
  readonly defaultValue: string;
}

export interface ToolboxCategory {
  readonly categoryId: string;
  readonly name: string;
  readonly colour: string;
  readonly blockTypes: string[];
  readonly isCustom: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────

let _seq = 0;
function uid(): string { return `editor_${Date.now()}_${++_seq}`; }
const now = () => Date.now();

// ─── Default Toolbox ──────────────────────────────────────────

const DEFAULT_CATEGORIES: ToolboxCategory[] = [
  { categoryId: 'cat_motion', name: 'Motion', colour: '#4C97FF', blockTypes: ['move_steps', 'turn_right', 'turn_left', 'go_to_xy', 'glide_to_xy', 'point_in_direction', 'change_x', 'set_x', 'change_y', 'set_y', 'if_on_edge_bounce', 'set_rotation_style', 'x_position', 'y_position', 'direction_reporter'], isCustom: false },
  { categoryId: 'cat_looks', name: 'Looks', colour: '#9966FF', blockTypes: ['say_for_secs', 'say_block', 'think_for_secs', 'think_block', 'switch_costume', 'next_costume', 'switch_backdrop', 'change_size', 'set_size', 'change_effect', 'set_effect', 'clear_effects', 'show', 'hide', 'go_to_front', 'go_forward_layers'], isCustom: false },
  { categoryId: 'cat_sound', name: 'Sound', colour: '#CF63CF', blockTypes: ['play_sound', 'play_sound_until_done', 'stop_all_sounds', 'change_volume', 'set_volume', 'volume_reporter'], isCustom: false },
  { categoryId: 'cat_events', name: 'Events', colour: '#FFD500', blockTypes: ['when_flag_clicked', 'when_key_pressed', 'when_this_sprite_clicked', 'when_backdrop_switches', 'broadcast', 'broadcast_and_wait', 'when_i_receive'], isCustom: false },
  { categoryId: 'cat_control', name: 'Control', colour: '#FFAB19', blockTypes: ['wait_seconds', 'repeat', 'forever', 'if_block', 'if_else', 'wait_until', 'repeat_until', 'stop_all', 'clone_block', 'delete_clone', 'when_clone_starts'], isCustom: false },
  { categoryId: 'cat_sensing', name: 'Sensing', colour: '#5CB1D6', blockTypes: ['touching', 'touching_color', 'color_is_touching', 'distance_to', 'ask_and_wait', 'answer_block', 'key_pressed', 'mouse_down', 'mouse_x', 'mouse_y', 'timer', 'reset_timer'], isCustom: false },
  { categoryId: 'cat_operators', name: 'Operators', colour: '#59C059', blockTypes: ['math_number', 'operator_add', 'operator_subtract', 'operator_multiply', 'operator_divide', 'operator_random', 'operator_gt', 'operator_lt', 'operator_equals', 'operator_and', 'operator_or', 'operator_not', 'operator_mod', 'operator_round', 'operator_join', 'operator_letter_of', 'operator_length'], isCustom: false },
  { categoryId: 'cat_variables', name: 'Variables', colour: '#FF8C1A', blockTypes: ['data_setvariableto', 'data_changevariableby', 'data_showvariable', 'data_hidevariable', 'data_addtolist', 'data_deleteoflist', 'data_insertatlist', 'data_replaceitemoflist', 'data_itemoflist', 'data_lengthoflist', 'data_listcontainsitem'], isCustom: false },
  { categoryId: 'cat_myblocks', name: 'My Blocks', colour: '#FF6680', blockTypes: [], isCustom: true },
];

// ─── Editor State ──────────────────────────────────────────────

export function createEditor(projectId: string, mode: EditorMode = 'scratch'): EditorState {
  return {
    editorId: uid(), projectId, mode, zoom: 1.0, panX: 0, panY: 0,
    selectedBlockIds: [], undoStack: [], redoStack: [],
    backpack: [], comments: [], procedures: [],
    toolboxCategories: [...DEFAULT_CATEGORIES],
    isPlaying: false, createdAt: now(),
  };
}

// ─── Zoom & Pan ────────────────────────────────────────────────

export function setZoom(editor: EditorState, zoom: number): EditorState {
  return { ...editor, zoom: Math.max(0.25, Math.min(2.0, zoom)) };
}

export function zoomIn(editor: EditorState): EditorState {
  return setZoom(editor, editor.zoom + 0.25);
}

export function zoomOut(editor: EditorState): EditorState {
  return setZoom(editor, editor.zoom - 0.25);
}

export function resetZoom(editor: EditorState): EditorState {
  return { ...editor, zoom: 1.0, panX: 0, panY: 0 };
}

export function pan(editor: EditorState, dx: number, dy: number): EditorState {
  return { ...editor, panX: editor.panX + dx, panY: editor.panY + dy };
}

// ─── Selection ─────────────────────────────────────────────────

export function selectBlock(editor: EditorState, blockId: string): EditorState {
  return { ...editor, selectedBlockIds: [blockId] };
}

export function multiSelectBlock(editor: EditorState, blockId: string): EditorState {
  if (editor.selectedBlockIds.includes(blockId)) return editor;
  return { ...editor, selectedBlockIds: [...editor.selectedBlockIds, blockId] };
}

export function deselectAll(editor: EditorState): EditorState {
  return { ...editor, selectedBlockIds: [] };
}

export function duplicateSelected(editor: EditorState): { editor: EditorState; duplicatedIds: string[] } {
  const newIds = editor.selectedBlockIds.map(() => uid());
  return { editor, duplicatedIds: newIds };
}

// ─── Undo / Redo ───────────────────────────────────────────────

export function pushAction(editor: EditorState, type: EditorAction['type'], data: Record<string, unknown> = {}): EditorState {
  const action: EditorAction = { actionId: uid(), type, timestamp: now(), data };
  return { ...editor, undoStack: [...editor.undoStack, action], redoStack: [] };
}

export function undo(editor: EditorState): EditorState {
  if (editor.undoStack.length === 0) return editor;
  const action = editor.undoStack[editor.undoStack.length - 1];
  return {
    ...editor,
    undoStack: editor.undoStack.slice(0, -1),
    redoStack: [...editor.redoStack, action],
  };
}

export function redo(editor: EditorState): EditorState {
  if (editor.redoStack.length === 0) return editor;
  const action = editor.redoStack[editor.redoStack.length - 1];
  return {
    ...editor,
    redoStack: editor.redoStack.slice(0, -1),
    undoStack: [...editor.undoStack, action],
  };
}

export function canUndo(editor: EditorState): boolean { return editor.undoStack.length > 0; }
export function canRedo(editor: EditorState): boolean { return editor.redoStack.length > 0; }

// ─── Backpack ──────────────────────────────────────────────────

export function addToBackpack(editor: EditorState, blockXml: string, category: BlockCategory, label: string): EditorState {
  const item: BackpackItem = { itemId: uid(), blockXml, category, label, addedAt: now() };
  return { ...editor, backpack: [...editor.backpack, item] };
}

export function removeFromBackpack(editor: EditorState, itemId: string): EditorState {
  return { ...editor, backpack: editor.backpack.filter(i => i.itemId !== itemId) };
}

export function clearBackpack(editor: EditorState): EditorState {
  return { ...editor, backpack: [] };
}

// ─── Comments ──────────────────────────────────────────────────

export function addComment(editor: EditorState, blockId: string, text: string, x: number, y: number): EditorState {
  const comment: BlockComment = { commentId: uid(), blockId, text, x, y, width: 200, height: 100, minimized: false, createdAt: now() };
  const newEditor = pushAction(editor, 'add_comment', { commentId: comment.commentId });
  return { ...newEditor, comments: [...newEditor.comments, comment] };
}

export function updateComment(editor: EditorState, commentId: string, text: string): EditorState {
  return { ...editor, comments: editor.comments.map(c => c.commentId === commentId ? { ...c, text } : c) };
}

export function deleteComment(editor: EditorState, commentId: string): EditorState {
  const newEditor = pushAction(editor, 'delete_comment', { commentId });
  return { ...newEditor, comments: newEditor.comments.filter(c => c.commentId !== commentId) };
}

export function toggleCommentMinimize(editor: EditorState, commentId: string): EditorState {
  return { ...editor, comments: editor.comments.map(c => c.commentId === commentId ? { ...c, minimized: !c.minimized } : c) };
}

// ─── Custom Procedures ─────────────────────────────────────────

export function createProcedure(editor: EditorState, name: string, args: ProcedureArg[], warp: boolean = false): EditorState {
  const proc: CustomProcedure = { procedureId: uid(), name, args, warp, blockXml: '', createdAt: now() };
  return { ...editor, procedures: [...editor.procedures, proc] };
}

export function deleteProcedure(editor: EditorState, procedureId: string): EditorState {
  return { ...editor, procedures: editor.procedures.filter(p => p.procedureId !== procedureId) };
}

export function getProcedure(editor: EditorState, name: string): CustomProcedure | null {
  return editor.procedures.find(p => p.name === name) ?? null;
}

// ─── Playback ──────────────────────────────────────────────────

export function startPlaying(editor: EditorState): EditorState {
  return { ...editor, isPlaying: true };
}

export function stopPlaying(editor: EditorState): EditorState {
  return { ...editor, isPlaying: false };
}

// ─── Mode ──────────────────────────────────────────────────────

export function setEditorMode(editor: EditorState, mode: EditorMode): EditorState {
  return { ...editor, mode };
}

export function getToolboxCategories(editor: EditorState): ToolboxCategory[] {
  return editor.toolboxCategories;
}

export function addExtensionCategory(editor: EditorState, name: string, colour: string, blockTypes: string[]): EditorState {
  const cat: ToolboxCategory = { categoryId: uid(), name, colour, blockTypes, isCustom: true };
  return { ...editor, toolboxCategories: [...editor.toolboxCategories, cat] };
}
