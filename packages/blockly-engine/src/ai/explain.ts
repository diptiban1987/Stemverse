export type ExplainLevel = 'beginner' | 'intermediate' | 'advanced';

const BLOCK_LABELS: Record<string, string> = {
  stemverse_program: 'Start Program',
  stemverse_configure_pin: 'Configure Pin',
  stemverse_digital_write: 'Digital Write',
  stemverse_digital_read: 'Digital Read',
  stemverse_delay: 'Delay',
  stemverse_sensor_read: 'Read Sensor',
  stemverse_servo_write: 'Servo Write',
  stemverse_oled_init: 'OLED Init',
  stemverse_oled_text: 'OLED Text',
  stemverse_diff_forward: 'Drive Forward',
  stemverse_wifi_begin: 'WiFi Begin',
  stemverse_mqtt_publish: 'MQTT Publish',
};

export function explainBlock(
  blockType: string,
  fields: Record<string, string | number>,
  level: ExplainLevel,
): string {
  const label = BLOCK_LABELS[blockType] ?? blockType.replace('stemverse_', '').replace(/_/g, ' ');
  const fieldSummary = Object.entries(fields)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');

  if (level === 'beginner') {
    return `This is a "${label}" block. It tells your board to ${beginnerAction(blockType, fields)}.`;
  }
  if (level === 'intermediate') {
    return `${label} (${blockType}): configures ${fieldSummary || 'default parameters'} for the robotics program flow.`;
  }
  return `${label} [${blockType}] — fields: { ${fieldSummary} }. Executes in setup/loop order; verify pins against ${fields.PIN ?? 'board'} capabilities.`;
}

export function explainCode(code: string, level: ExplainLevel): string {
  const lines = code.split('\n').filter((l) => l.trim() && !l.trim().startsWith('//'));
  const hasSetup = code.includes('void setup') || code.includes('def setup');
  const hasLoop = code.includes('void loop') || code.includes('while True') || code.includes('def loop');

  if (level === 'beginner') {
    return [
      'This program runs on your microcontroller.',
      hasSetup ? 'The setup section runs once at startup to prepare pins and devices.' : '',
      hasLoop ? 'The loop section repeats forever — that is where your robot keeps working.' : '',
      `It has about ${lines.length} lines of real instructions.`,
    ]
      .filter(Boolean)
      .join(' ');
  }

  if (level === 'intermediate') {
    const includes = (code.match(/#include|import /g) ?? []).length;
    return `Generated firmware: ${lines.length} executable lines, ${includes} library import(s). ${
      hasSetup ? 'Setup initializes hardware; ' : ''
    }${hasLoop ? 'loop handles recurring behavior.' : ''}`;
  }

  return `Code analysis (${lines.length} LOC): structure — setup=${hasSetup}, loop=${hasLoop}. Review pin modes, blocking delays, and library includes before flash.`;
}

function beginnerAction(blockType: string, fields: Record<string, string | number>): string {
  switch (blockType) {
    case 'stemverse_digital_write':
      return `turn pin ${fields.PIN ?? '?'} ${fields.VALUE === 'HIGH' ? 'on' : 'off'}`;
    case 'stemverse_delay':
      return `wait ${fields.MS ?? 0} milliseconds`;
    case 'stemverse_sensor_read':
      return `read the ${fields.SENSOR ?? 'sensor'} value`;
    case 'stemverse_servo_write':
      return `move the servo to ${fields.ANGLE ?? 90} degrees`;
    default:
      return 'perform a robotics step';
  }
}
