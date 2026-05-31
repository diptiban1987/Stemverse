export type ScratchVariable = { name: string; value: string | number | boolean };
export type BlocklyVariable = { id: string; name: string; type: string };

/** Sync variable lists between Scratch targets and Blockly workspace metadata. */
export function syncVariablesToBlockly(
  scratchVars: ScratchVariable[],
  existing: BlocklyVariable[] = [],
): BlocklyVariable[] {
  const byName = new Map(existing.map((v) => [v.name, v]));
  return scratchVars.map((sv, i) => {
    const found = byName.get(sv.name);
    if (found) return found;
    return {
      id: `var_${sv.name}_${i}`,
      name: sv.name,
      type: typeof sv.value === 'number' ? 'number' : 'string',
    };
  });
}

export function syncVariablesToScratch(
  blocklyVars: BlocklyVariable[],
  values: Record<string, string | number | boolean> = {},
): ScratchVariable[] {
  return blocklyVars.map((v) => ({
    name: v.name,
    value: values[v.name] ?? (v.type === 'number' ? 0 : ''),
  }));
}
