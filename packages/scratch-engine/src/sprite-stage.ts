/**
 * Basic sprite & stage helpers for Scratch workspace UI.
 */

export type ScratchSpriteSummary = {
  name: string;
  isStage: boolean;
  visible?: boolean;
  x?: number;
  y?: number;
};

export type ScratchStageState = {
  width: number;
  height: number;
  backdrop?: string;
};

export function createDefaultStage(): ScratchStageState {
  return { width: 480, height: 360, backdrop: 'white' };
}

export function parseTargets(
  targets: Array<{ name: string; isStage: boolean }>,
): { stage: ScratchSpriteSummary | null; sprites: ScratchSpriteSummary[] } {
  const stage = targets.find((t) => t.isStage) ?? null;
  const sprites = targets.filter((t) => !t.isStage);
  return { stage, sprites };
}
