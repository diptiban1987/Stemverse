// workspace validation — scans all blocks before code generation
// detects unsupported block types, pin conflicts, orphans, and empty programs

/**
 * Scan workspace for blocks that have no generator mapping.
 * @param {Blockly.Workspace} workspace
 * @param {Blockly.Generator} generator — pythonGenerator or arduinoGenerator
 * @returns {{ valid: boolean, total: number, covered: number, unsupported: string[] }}
 */
export function validateWorkspace(workspace, generator) {
  const allBlocks = workspace.getAllBlocks(false);
  const seen = new Set();
  const unsupported = [];

  for (const block of allBlocks) {
    if (seen.has(block.type)) continue;
    seen.add(block.type);

    if (!generator.forBlock[block.type]) {
      unsupported.push(block.type);
    }
  }

  return {
    valid: unsupported.length === 0,
    total: seen.size,
    covered: seen.size - unsupported.length,
    unsupported,
  };
}

/**
 * Detect disconnected/orphan blocks not attached to any top-level hat/entry block.
 * These blocks generate dead code that never executes.
 * @param {Blockly.Workspace} workspace
 * @returns {{ orphanCount: number, orphanTypes: string[] }}
 */
export function detectOrphanBlocks(workspace) {
  const topBlocks = workspace.getTopBlocks(false);
  const orphanTypes = [];

  // Blocks that are valid top-level entry points
  const ENTRY_BLOCKS = new Set([
    "esp32_when_starts",
    "when_flag_clicked", "when_key_pressed", "when_sprite_clicked",
    "when_receive", "when_backdrop_switches", "when_gt",
    "when_clone_starts",
    "procedures_defnoreturn", "procedures_defreturn",
  ]);

  for (const block of topBlocks) {
    // A top block is an orphan if:
    // 1. It's NOT a known entry/hat block
    // 2. It has no previousConnection (so it's floating, not just detached from below)
    if (!ENTRY_BLOCKS.has(block.type) && !block.previousConnection) {
      // Reporter blocks sitting alone aren't really orphans — they do nothing
      // Statement blocks without a hat parent ARE orphans
      if (!block.outputConnection) {
        orphanTypes.push(block.type);
      }
    }
  }

  return {
    orphanCount: orphanTypes.length,
    orphanTypes,
  };
}

/**
 * Detect pin conflicts — same GPIO pin used as both input and output.
 * Scans blocks for PIN field values and checks for usage collisions.
 * @param {Blockly.Workspace} workspace
 * @returns {{ conflicts: string[], pinMap: Object }}
 */
export function detectPinConflicts(workspace) {
  const allBlocks = workspace.getAllBlocks(false);
  // pin → Set of modes ('IN', 'OUT', 'ADC', 'PWM', etc.)
  const pinMap = {};

  // Blocks that use a pin as OUTPUT
  const OUTPUT_BLOCKS = new Set([
    "esp32_set_digital_pin", "esp32_set_pwm_pin", "esp32_set_pin_mode", "esp32_set_relay",
    "esp32_set_led_brightness", "esp32_enable_servo", "esp32_set_servo_angle",
    "esp32_enable_motor", "digital_write",
    "esp32_detach_servo", "esp32_relay_toggle",
    "esp32_l298n_init", "esp32_l298n_motor_forward", "esp32_l298n_motor_backward",
    "esp32_l298n_motor_speed", "esp32_l298n_stop_motor", "esp32_l298n_stop_all",
  ]);

  // Blocks that use a pin as INPUT
  const INPUT_BLOCKS = new Set([
    "esp32_read_digital_pin", "esp32_read_analog_pin", "esp32_get_touch_pin",
    "esp32_ultrasonic", "esp32_digital_sensor", "esp32_dht",
    "esp32_analog_sensor", "esp32_pir_sensor", "esp32_ir_sensor",
    "esp32_rain_sensor", "esp32_ldr_sensor", "esp32_tactile_switch",
    "esp32_slide_switch", "esp32_heart_init", "esp32_heart_value",
    "esp32_relay_state", "esp32_hall_magnet_detected",
  ]);

  for (const block of allBlocks) {
    const pinField = block.getFieldValue("PIN")
      || block.getFieldValue("TRIG")
      || block.getFieldValue("ECHO");

    if (!pinField) continue;

    if (!pinMap[pinField]) pinMap[pinField] = new Set();

    if (OUTPUT_BLOCKS.has(block.type)) {
      pinMap[pinField].add("OUT");
    } else if (INPUT_BLOCKS.has(block.type)) {
      pinMap[pinField].add("IN");
    }
  }

  // A conflict = same pin has both IN and OUT
  const conflicts = [];
  for (const [pin, modes] of Object.entries(pinMap)) {
    if (modes.has("IN") && modes.has("OUT")) {
      conflicts.push(`GPIO ${pin} (used as both INPUT and OUTPUT)`);
    }
  }

  return { conflicts, pinMap };
}

/**
 * Check if the workspace has at least one meaningful block.
 * Prevents uploading empty/trivial programs.
 * @param {Blockly.Workspace} workspace
 * @returns {{ isEmpty: boolean, blockCount: number }}
 */
export function validateNotEmpty(workspace) {
  const allBlocks = workspace.getAllBlocks(false);

  // Filter out hat/event blocks which don't produce code themselves
  const meaningful = allBlocks.filter((b) => {
    return b.previousConnection || b.outputConnection ||
      b.type === "esp32_when_starts";
  });

  return {
    isEmpty: meaningful.length === 0,
    blockCount: meaningful.length,
  };
}

/**
 * Run ALL validators and return a combined report.
 * @param {Blockly.Workspace} workspace
 * @param {Blockly.Generator} generator
 * @returns {{ errors: string[], warnings: string[], info: string[] }}
 */
export function fullValidation(workspace, generator) {
  const errors = [];
  const warnings = [];
  const info = [];

  // 1. Empty check
  const empty = validateNotEmpty(workspace);
  if (empty.isEmpty) {
    warnings.push("Workspace is empty — nothing to upload.");
    return { errors, warnings, info };
  }
  info.push(`${empty.blockCount} meaningful block(s) in workspace.`);

  // 2. Generator coverage
  const coverage = validateWorkspace(workspace, generator);
  if (!coverage.valid) {
    warnings.push(
      `${coverage.unsupported.length} unsupported block(s): ${coverage.unsupported.join(", ")}`
    );
  }
  info.push(`Generator coverage: ${coverage.covered}/${coverage.total} block types.`);

  // 3. Pin conflicts
  const pins = detectPinConflicts(workspace);
  if (pins.conflicts.length > 0) {
    for (const c of pins.conflicts) {
      errors.push(`Pin conflict: ${c}`);
    }
  }

  // 4. Orphan blocks
  const orphans = detectOrphanBlocks(workspace);
  if (orphans.orphanCount > 0) {
    warnings.push(
      `${orphans.orphanCount} disconnected block(s) will be ignored: ${orphans.orphanTypes.join(", ")}`
    );
  }

  return { errors, warnings, info };
}

/**
 * Log a generator coverage report to the console (dev diagnostics).
 * Call from browser console: reportGeneratorCoverage(pythonGenerator)
 * @param {Blockly.Generator} generator
 */
export function reportGeneratorCoverage(generator) {
  // Blockly.Blocks contains all registered block types
  const allTypes = Object.keys(globalThis.Blockly?.Blocks || {});
  const covered = allTypes.filter((t) => generator.forBlock[t]);
  const missing = allTypes.filter((t) => !generator.forBlock[t]);

  const pct = allTypes.length > 0
    ? Math.round((100 * covered.length) / allTypes.length)
    : 0;

  console.log(
    `[codegen] Generator coverage: ${covered.length}/${allTypes.length} (${pct}%)`
  );

  if (missing.length > 0) {
    console.warn(`[codegen] ${missing.length} block type(s) with NO generator:`);
    console.table(missing.map((t) => ({ block: t, status: "MISSING" })));
  } else {
    console.log("[codegen] All block types covered.");
  }

  return { covered: covered.length, total: allTypes.length, missing };
}

/**
 * Patch a generator's blockToCode to never crash on unmapped blocks.
 * Instead of throwing, it logs a warning and returns empty code.
 * @param {Blockly.Generator} generator
 * @param {string} name — human-readable name for log messages
 */
export function installSafetyNet(generator, name) {
  const original = generator.blockToCode.bind(generator);

  generator.blockToCode = function (block, opt_thisOnly) {
    if (!block) return "";

    if (!this.forBlock[block.type]) {
      console.warn(
        `[${name}] No generator for block "${block.type}" — skipping safely`
      );
      // Reporter blocks (have outputConnection) must return [value, order]
      if (block.outputConnection) return ["", 0];
      return "";
    }

    return original(block, opt_thisOnly);
  };
}
