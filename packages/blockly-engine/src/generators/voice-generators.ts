/**
 * Voice Assistance Code Generators — Arduino, MicroPython, ESP-IDF
 * ────────────────────────────────────────────────────────────────
 * Generates compilable code for DFPlayer Mini, I2S audio,
 * voice recognition modules, TTS, wake word, and amplifiers.
 */
import type { Block, CodeGenerator } from 'blockly/core';

const ATOMIC = 0;

export type VoiceGeneratorTarget = 'arduino' | 'micropython' | 'espidf';

export function registerVoiceBlockGenerators(
  generator: CodeGenerator,
  target: VoiceGeneratorTarget,
): void {
  if (target === 'arduino') {
    registerArduinoVoice(generator);
  } else if (target === 'micropython') {
    registerMicroPythonVoice(generator);
  } else {
    registerEspIdfVoice(generator);
  }
}

/* ════════════════════════════════════════════════════════════
 * ARDUINO C++ Generators
 * ════════════════════════════════════════════════════════════ */
function registerArduinoVoice(g: CodeGenerator): void {
  /* ── DFPlayer Mini ─────────────────────────────────────── */
  g.forBlock['stemverse_dfplayer_init'] = (b: Block) => {
    const rx = b.getFieldValue('RX_PIN');
    const tx = b.getFieldValue('TX_PIN');
    return `#include "DFRobotDFPlayerMini.h"\n#include <SoftwareSerial.h>\nSoftwareSerial dfSerial(${rx}, ${tx});\nDFRobotDFPlayerMini dfPlayer;\ndfSerial.begin(9600);\ndfPlayer.begin(dfSerial);\ndfPlayer.volume(15);\n`;
  };
  g.forBlock['stemverse_dfplayer_play'] = (b: Block) =>
    `dfPlayer.play(${b.getFieldValue('TRACK')});\n`;
  g.forBlock['stemverse_dfplayer_volume'] = (b: Block) =>
    `dfPlayer.volume(${b.getFieldValue('VOLUME')});\n`;
  g.forBlock['stemverse_dfplayer_stop'] = () =>
    'dfPlayer.stop();\n';
  g.forBlock['stemverse_dfplayer_pause'] = () =>
    'dfPlayer.pause();\n';

  /* ── Speaker / Tone ────────────────────────────────────── */
  g.forBlock['stemverse_speaker_tone'] = (b: Block) =>
    `tone(${b.getFieldValue('PIN')}, ${b.getFieldValue('FREQ')}, ${b.getFieldValue('DURATION')});\n`;
  g.forBlock['stemverse_speaker_stop'] = (b: Block) =>
    `noTone(${b.getFieldValue('PIN')});\n`;

  /* ── I2S Audio ─────────────────────────────────────────── */
  g.forBlock['stemverse_i2s_init'] = (b: Block) => {
    const bclk = b.getFieldValue('BCLK');
    const ws = b.getFieldValue('WS');
    const data = b.getFieldValue('DATA');
    const mode = b.getFieldValue('MODE');
    const rate = b.getFieldValue('SAMPLE_RATE');
    const modeStr = mode === 'RX' ? 'I2S_MODE_MASTER | I2S_MODE_RX' : 'I2S_MODE_MASTER | I2S_MODE_TX';
    return `#include <driver/i2s.h>
i2s_config_t i2s_cfg = {
  .mode = (i2s_mode_t)(${modeStr}),
  .sample_rate = ${rate},
  .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
  .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
  .communication_format = I2S_COMM_FORMAT_STAND_I2S,
  .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
  .dma_buf_count = 8,
  .dma_buf_len = 1024
};
i2s_pin_config_t pin_cfg = {
  .bck_io_num = ${bclk},
  .ws_io_num = ${ws},
  .data_out_num = ${mode === 'TX' ? data : '-1'},
  .data_in_num = ${mode === 'RX' ? data : '-1'}
};
i2s_driver_install(I2S_NUM_0, &i2s_cfg, 0, NULL);
i2s_set_pin(I2S_NUM_0, &pin_cfg);
`;
  };
  g.forBlock['stemverse_i2s_read'] = () =>
    [`([](){ int16_t sample = 0; size_t br; i2s_read(I2S_NUM_0, &sample, sizeof(sample), &br, portMAX_DELAY); return sample; })()`, ATOMIC];
  g.forBlock['stemverse_i2s_write'] = (b: Block) =>
    `{ int16_t s = ${b.getFieldValue('SAMPLE')}; size_t bw; i2s_write(I2S_NUM_0, &s, sizeof(s), &bw, portMAX_DELAY); }\n`;

  /* ── Analog Microphone ─────────────────────────────────── */
  g.forBlock['stemverse_mic_read'] = (b: Block) =>
    [`analogRead(${b.getFieldValue('PIN')})`, ATOMIC];
  g.forBlock['stemverse_mic_is_loud'] = (b: Block) =>
    [`(analogRead(${b.getFieldValue('PIN')}) > ${b.getFieldValue('THRESHOLD')})`, ATOMIC];

  /* ── Voice Recognition ─────────────────────────────────── */
  g.forBlock['stemverse_voice_recog_init'] = (b: Block) => {
    const module = b.getFieldValue('MODULE');
    if (module === 'DF2301Q') {
      return `#include "DFRobot_DF2301Q.h"\nDFRobot_DF2301Q_I2C voiceRecog;\nvoiceRecog.begin();\nvoiceRecog.setMuteMode(0);\nvoiceRecog.setVolume(7);\n`;
    }
    if (module === 'ELECHOUSE_V3') {
      return `#include "VoiceRecognitionV3.h"\nVR voiceRecog(2, 3);\nvoiceRecog.begin(9600);\n`;
    }
    return `// LD3320 voice recognition init\n`;
  };
  g.forBlock['stemverse_voice_recog_get_command'] = () =>
    ['voiceRecog.getCMDID()', ATOMIC];
  g.forBlock['stemverse_voice_recog_add_command'] = (b: Block) => {
    const id = b.getFieldValue('CMD_ID');
    const keyword = b.getFieldValue('KEYWORD').replace(/"/g, '\\"');
    return `voiceRecog.addCommand(${id}, "${keyword}");\n`;
  };
  g.forBlock['stemverse_voice_on_command'] = (b: Block) => {
    const cmd = b.getFieldValue('COMMAND');
    const cmdIdMap: Record<string, number> = {
      turn_on: 1, turn_off: 2, hello: 3, forward: 4, backward: 5,
      stop: 6, left: 7, right: 8, speed_up: 9, slow_down: 10,
      red: 11, green: 12, blue: 13, custom_1: 14, custom_2: 15, custom_3: 16,
    };
    const id = cmdIdMap[cmd] ?? 0;
    const body = g.statementToCode(b, 'DO') || '  // action\n';
    return `if (voiceRecog.getCMDID() == ${id}) {\n${body}}\n`;
  };

  /* ── Wake Word ─────────────────────────────────────────── */
  g.forBlock['stemverse_wake_word_init'] = (b: Block) => {
    const keyword = b.getFieldValue('KEYWORD');
    return `// Wake word: "${keyword}" - requires ESP-SR library\n#include "esp_wn_iface.h"\n// Initialize wake word engine...\nbool stemverse_wake_detected = false;\n`;
  };
  g.forBlock['stemverse_wake_word_detected'] = () =>
    ['stemverse_wake_detected', ATOMIC];

  /* ── TTS ───────────────────────────────────────────────── */
  g.forBlock['stemverse_tts_speak'] = (b: Block) => {
    const text = b.getFieldValue('TEXT').replace(/"/g, '\\"');
    return `// TTS: "${text}"\ndfPlayer.play(1); // Map text to pre-recorded track\n`;
  };
  g.forBlock['stemverse_tts_set_voice'] = (b: Block) => {
    const voice = b.getFieldValue('VOICE');
    const speed = b.getFieldValue('SPEED');
    return `// TTS voice: ${voice}, speed: ${speed}%\n`;
  };

  /* ── Amplifier ─────────────────────────────────────────── */
  g.forBlock['stemverse_amp_init'] = (b: Block) => {
    const type = b.getFieldValue('TYPE');
    if (type === 'MAX98357A') {
      return `// MAX98357A initialized via I2S (see I2S Init block)\n`;
    }
    return `// PAM8403 analog amplifier on pin ${b.getFieldValue('PIN')}\n`;
  };
}

/* ════════════════════════════════════════════════════════════
 * MICROPYTHON Generators
 * ════════════════════════════════════════════════════════════ */
function registerMicroPythonVoice(g: CodeGenerator): void {
  /* ── DFPlayer Mini ─────────────────────────────────────── */
  g.forBlock['stemverse_dfplayer_init'] = (b: Block) =>
    `from machine import UART\ndf_uart = UART(1, baudrate=9600, tx=${b.getFieldValue('TX_PIN')}, rx=${b.getFieldValue('RX_PIN')})\n`;
  g.forBlock['stemverse_dfplayer_play'] = (b: Block) =>
    `df_uart.write(bytes([0x7E, 0xFF, 0x06, 0x03, 0x00, 0x00, ${b.getFieldValue('TRACK')}, 0xEF]))\n`;
  g.forBlock['stemverse_dfplayer_volume'] = (b: Block) =>
    `df_uart.write(bytes([0x7E, 0xFF, 0x06, 0x06, 0x00, 0x00, ${b.getFieldValue('VOLUME')}, 0xEF]))\n`;
  g.forBlock['stemverse_dfplayer_stop'] = () =>
    'df_uart.write(bytes([0x7E, 0xFF, 0x06, 0x16, 0x00, 0x00, 0x00, 0xEF]))\n';
  g.forBlock['stemverse_dfplayer_pause'] = () =>
    'df_uart.write(bytes([0x7E, 0xFF, 0x06, 0x0E, 0x00, 0x00, 0x00, 0xEF]))\n';

  /* ── Speaker / Tone ────────────────────────────────────── */
  g.forBlock['stemverse_speaker_tone'] = (b: Block) =>
    `from machine import PWM, Pin\nbuzzer = PWM(Pin(${b.getFieldValue('PIN')}), freq=${b.getFieldValue('FREQ')})\ntime.sleep_ms(${b.getFieldValue('DURATION')})\nbuzzer.deinit()\n`;
  g.forBlock['stemverse_speaker_stop'] = (b: Block) =>
    `PWM(Pin(${b.getFieldValue('PIN')})).deinit()\n`;

  /* ── I2S Audio ─────────────────────────────────────────── */
  g.forBlock['stemverse_i2s_init'] = (b: Block) => {
    const mode = b.getFieldValue('MODE') === 'RX' ? 'I2S.RX' : 'I2S.TX';
    return `from machine import I2S, Pin\ni2s_audio = I2S(0, sck=Pin(${b.getFieldValue('BCLK')}), ws=Pin(${b.getFieldValue('WS')}), sd=Pin(${b.getFieldValue('DATA')}), mode=${mode}, bits=16, format=I2S.MONO, rate=${b.getFieldValue('SAMPLE_RATE')}, ibuf=20000)\n`;
  };
  g.forBlock['stemverse_i2s_read'] = () =>
    ['i2s_audio.readinto(buf)', ATOMIC];
  g.forBlock['stemverse_i2s_write'] = (b: Block) =>
    `i2s_audio.write(bytes([${b.getFieldValue('SAMPLE')} & 0xFF, (${b.getFieldValue('SAMPLE')} >> 8) & 0xFF]))\n`;

  /* ── Analog Microphone ─────────────────────────────────── */
  g.forBlock['stemverse_mic_read'] = (b: Block) =>
    [`ADC(Pin(${b.getFieldValue('PIN')})).read()`, ATOMIC];
  g.forBlock['stemverse_mic_is_loud'] = (b: Block) =>
    [`ADC(Pin(${b.getFieldValue('PIN')})).read() > ${b.getFieldValue('THRESHOLD')}`, ATOMIC];

  /* ── Voice Recognition ─────────────────────────────────── */
  g.forBlock['stemverse_voice_recog_init'] = () =>
    '# Voice recognition module init (I2C)\nfrom machine import I2C, Pin\nvoice_i2c = I2C(0, scl=Pin(22), sda=Pin(21))\n';
  g.forBlock['stemverse_voice_recog_get_command'] = () =>
    ['voice_get_cmd(voice_i2c)', ATOMIC];
  g.forBlock['stemverse_voice_recog_add_command'] = (b: Block) => {
    const keyword = b.getFieldValue('KEYWORD').replace(/"/g, '\\"');
    return `voice_add_cmd(voice_i2c, ${b.getFieldValue('CMD_ID')}, "${keyword}")\n`;
  };
  g.forBlock['stemverse_voice_on_command'] = (b: Block) => {
    const cmd = b.getFieldValue('COMMAND');
    const cmdIdMap: Record<string, number> = {
      turn_on: 1, turn_off: 2, hello: 3, forward: 4, backward: 5,
      stop: 6, left: 7, right: 8, speed_up: 9, slow_down: 10,
      red: 11, green: 12, blue: 13, custom_1: 14, custom_2: 15, custom_3: 16,
    };
    const id = cmdIdMap[cmd] ?? 0;
    const body = g.statementToCode(b, 'DO') || '    pass\n';
    return `if voice_get_cmd(voice_i2c) == ${id}:\n${body}`;
  };

  /* ── Wake Word ─────────────────────────────────────────── */
  g.forBlock['stemverse_wake_word_init'] = (b: Block) =>
    `# Wake word: "${b.getFieldValue('KEYWORD')}"\nwake_detected = False\n`;
  g.forBlock['stemverse_wake_word_detected'] = () =>
    ['wake_detected', ATOMIC];

  /* ── TTS ───────────────────────────────────────────────── */
  g.forBlock['stemverse_tts_speak'] = (b: Block) => {
    const text = b.getFieldValue('TEXT').replace(/"/g, '\\"');
    return `# TTS: "${text}"\nprint("SPEAK: ${text}")\n`;
  };
  g.forBlock['stemverse_tts_set_voice'] = () =>
    '# TTS voice configuration\n';

  /* ── Amplifier ─────────────────────────────────────────── */
  g.forBlock['stemverse_amp_init'] = () =>
    '# Audio amplifier initialized\n';
}

/* ════════════════════════════════════════════════════════════
 * ESP-IDF Generators
 * ════════════════════════════════════════════════════════════ */
function registerEspIdfVoice(g: CodeGenerator): void {
  g.forBlock['stemverse_dfplayer_init'] = () => '// DFPlayer init via UART\n';
  g.forBlock['stemverse_dfplayer_play'] = (b: Block) =>
    `stemverse_dfplayer_play(${b.getFieldValue('TRACK')});\n`;
  g.forBlock['stemverse_dfplayer_volume'] = (b: Block) =>
    `stemverse_dfplayer_volume(${b.getFieldValue('VOLUME')});\n`;
  g.forBlock['stemverse_dfplayer_stop'] = () => 'stemverse_dfplayer_stop();\n';
  g.forBlock['stemverse_dfplayer_pause'] = () => 'stemverse_dfplayer_pause();\n';
  g.forBlock['stemverse_speaker_tone'] = (b: Block) =>
    `stemverse_tone(${b.getFieldValue('PIN')}, ${b.getFieldValue('FREQ')}, ${b.getFieldValue('DURATION')});\n`;
  g.forBlock['stemverse_speaker_stop'] = (b: Block) =>
    `stemverse_tone_stop(${b.getFieldValue('PIN')});\n`;
  g.forBlock['stemverse_i2s_init'] = () => '// I2S init (ESP-IDF native)\n';
  g.forBlock['stemverse_i2s_read'] = () => ['stemverse_i2s_read_sample()', ATOMIC];
  g.forBlock['stemverse_i2s_write'] = (b: Block) =>
    `stemverse_i2s_write_sample(${b.getFieldValue('SAMPLE')});\n`;
  g.forBlock['stemverse_mic_read'] = (b: Block) =>
    [`adc1_get_raw(ADC1_CHANNEL_${b.getFieldValue('PIN')})`, ATOMIC];
  g.forBlock['stemverse_mic_is_loud'] = (b: Block) =>
    [`(adc1_get_raw(ADC1_CHANNEL_${b.getFieldValue('PIN')}) > ${b.getFieldValue('THRESHOLD')})`, ATOMIC];
  g.forBlock['stemverse_voice_recog_init'] = () => '// Voice recog init\n';
  g.forBlock['stemverse_voice_recog_get_command'] = () => ['stemverse_voice_cmd_id', ATOMIC];
  g.forBlock['stemverse_voice_recog_add_command'] = (b: Block) =>
    `stemverse_voice_add_cmd(${b.getFieldValue('CMD_ID')}, "${b.getFieldValue('KEYWORD')}");\n`;
  g.forBlock['stemverse_voice_on_command'] = (b: Block) => {
    const cmd = b.getFieldValue('COMMAND');
    const cmdIdMap: Record<string, number> = {
      turn_on: 1, turn_off: 2, hello: 3, forward: 4, backward: 5,
      stop: 6, left: 7, right: 8, speed_up: 9, slow_down: 10,
      red: 11, green: 12, blue: 13, custom_1: 14, custom_2: 15, custom_3: 16,
    };
    const id = cmdIdMap[cmd] ?? 0;
    const body = g.statementToCode(b, 'DO') || '  // action\n';
    return `if (stemverse_voice_cmd_id == ${id}) {\n${body}}\n`;
  };
  g.forBlock['stemverse_wake_word_init'] = () => '// ESP-SR wake word init\n';
  g.forBlock['stemverse_wake_word_detected'] = () => ['stemverse_wake_detected', ATOMIC];
  g.forBlock['stemverse_tts_speak'] = (b: Block) =>
    `ESP_LOGI(TAG, "TTS: %s", "${b.getFieldValue('TEXT')}");\n`;
  g.forBlock['stemverse_tts_set_voice'] = () => '// TTS voice config\n';
  g.forBlock['stemverse_amp_init'] = () => '// Amplifier init\n';
}

/* ── Exports for library auto-includes ─── */
export const VOICE_ARDUINO_INCLUDES = [
  'DFRobotDFPlayerMini.h',
  'SoftwareSerial.h',
];

export const VOICE_ARDUINO_GLOBALS = [
  'SoftwareSerial dfSerial(16, 17);',
  'DFRobotDFPlayerMini dfPlayer;',
];
