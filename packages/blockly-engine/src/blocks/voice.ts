import * as Blockly from 'blockly/core';

const VOICE_COLOR = '#E040FB'; // Purple-pink for voice/audio blocks

/**
 * Voice Assistance Blocks for STEMVerse
 * ─────────────────────────────────────
 * Covers: Microphone input, Speaker output, DFPlayer MP3,
 * Voice Recognition (offline), Text-to-Speech, Wake Word,
 * I2S audio, and voice command handling.
 */
export function registerVoiceAssistanceBlocks(): void {
  /* ── DFPlayer Mini (MP3 Module) ──────────────────────────── */
  Blockly.Blocks['stemverse_dfplayer_init'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('🔊 DFPlayer Init')
        .appendField('RX')
        .appendField(new Blockly.FieldNumber(16, 0, 53), 'RX_PIN')
        .appendField('TX')
        .appendField(new Blockly.FieldNumber(17, 0, 53), 'TX_PIN');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(VOICE_COLOR);
      this.setTooltip('Initialize DFPlayer Mini MP3 module');
    },
  };

  Blockly.Blocks['stemverse_dfplayer_play'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('🔊 Play Track #')
        .appendField(new Blockly.FieldNumber(1, 1, 255), 'TRACK');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(VOICE_COLOR);
      this.setTooltip('Play a specific MP3 track from SD card');
    },
  };

  Blockly.Blocks['stemverse_dfplayer_volume'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('🔊 Set Volume')
        .appendField(new Blockly.FieldNumber(15, 0, 30), 'VOLUME');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(VOICE_COLOR);
      this.setTooltip('Set DFPlayer volume (0-30)');
    },
  };

  Blockly.Blocks['stemverse_dfplayer_stop'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput().appendField('🔊 Stop Playback');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(VOICE_COLOR);
      this.setTooltip('Stop current MP3 playback');
    },
  };

  Blockly.Blocks['stemverse_dfplayer_pause'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput().appendField('🔊 Pause/Resume');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(VOICE_COLOR);
      this.setTooltip('Pause or resume MP3 playback');
    },
  };

  /* ── Speaker / DAC Audio Output ──────────────────────────── */
  Blockly.Blocks['stemverse_speaker_tone'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('🔈 Speaker Tone')
        .appendField('Pin')
        .appendField(new Blockly.FieldNumber(25, 0, 53), 'PIN')
        .appendField('Hz')
        .appendField(new Blockly.FieldNumber(440, 20, 20000), 'FREQ')
        .appendField('ms')
        .appendField(new Blockly.FieldNumber(500, 0, 30000), 'DURATION');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(VOICE_COLOR);
      this.setTooltip('Play a tone through a speaker/piezo');
    },
  };

  Blockly.Blocks['stemverse_speaker_stop'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('🔈 Speaker Stop')
        .appendField('Pin')
        .appendField(new Blockly.FieldNumber(25, 0, 53), 'PIN');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(VOICE_COLOR);
      this.setTooltip('Stop speaker output');
    },
  };

  /* ── I2S Audio (ESP32) ───────────────────────────────────── */
  Blockly.Blocks['stemverse_i2s_init'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('🎙️ I2S Init')
        .appendField('BCLK')
        .appendField(new Blockly.FieldNumber(26, 0, 39), 'BCLK')
        .appendField('WS')
        .appendField(new Blockly.FieldNumber(25, 0, 39), 'WS')
        .appendField('DATA')
        .appendField(new Blockly.FieldNumber(22, 0, 39), 'DATA');
      this.appendDummyInput()
        .appendField('Mode')
        .appendField(
          new Blockly.FieldDropdown([
            ['Microphone (Input)', 'RX'],
            ['Speaker (Output)', 'TX'],
          ]),
          'MODE',
        )
        .appendField('Rate')
        .appendField(
          new Blockly.FieldDropdown([
            ['16000 Hz', '16000'],
            ['22050 Hz', '22050'],
            ['44100 Hz', '44100'],
          ]),
          'SAMPLE_RATE',
        );
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(VOICE_COLOR);
      this.setTooltip('Initialize I2S bus for digital audio (INMP441 mic, MAX98357A amp)');
    },
  };

  Blockly.Blocks['stemverse_i2s_read'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput().appendField('🎙️ I2S Read Sample');
      this.setOutput(true, 'Number');
      this.setColour(VOICE_COLOR);
      this.setTooltip('Read one audio sample from I2S microphone');
    },
  };

  Blockly.Blocks['stemverse_i2s_write'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('🔊 I2S Write Sample')
        .appendField('Value')
        .appendField(new Blockly.FieldNumber(0, -32768, 32767), 'SAMPLE');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(VOICE_COLOR);
      this.setTooltip('Write an audio sample to I2S speaker/amplifier');
    },
  };

  /* ── Microphone (Analog) ─────────────────────────────────── */
  Blockly.Blocks['stemverse_mic_read'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('🎙️ Mic Level')
        .appendField('Pin')
        .appendField(new Blockly.FieldNumber(34, 0, 39), 'PIN');
      this.setOutput(true, 'Number');
      this.setColour(VOICE_COLOR);
      this.setTooltip('Read analog microphone level (0-4095)');
    },
  };

  Blockly.Blocks['stemverse_mic_is_loud'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('🎙️ Sound Detected?')
        .appendField('Pin')
        .appendField(new Blockly.FieldNumber(34, 0, 39), 'PIN')
        .appendField('Threshold')
        .appendField(new Blockly.FieldNumber(2000, 0, 4095), 'THRESHOLD');
      this.setOutput(true, 'Boolean');
      this.setColour(VOICE_COLOR);
      this.setTooltip('Returns true if sound level exceeds threshold');
    },
  };

  /* ── Voice Recognition (Offline — DF2301Q / Elechouse V3) ── */
  Blockly.Blocks['stemverse_voice_recog_init'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('🗣️ Voice Recognition Init')
        .appendField('Module')
        .appendField(
          new Blockly.FieldDropdown([
            ['DF2301Q (I2C)', 'DF2301Q'],
            ['Elechouse V3', 'ELECHOUSE_V3'],
            ['LD3320', 'LD3320'],
          ]),
          'MODULE',
        );
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(VOICE_COLOR);
      this.setTooltip('Initialize offline voice recognition module');
    },
  };

  Blockly.Blocks['stemverse_voice_recog_get_command'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput().appendField('🗣️ Get Voice Command ID');
      this.setOutput(true, 'Number');
      this.setColour(VOICE_COLOR);
      this.setTooltip('Returns the ID of the recognized voice command (0 = none)');
    },
  };

  Blockly.Blocks['stemverse_voice_recog_add_command'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('🗣️ Add Command')
        .appendField('ID')
        .appendField(new Blockly.FieldNumber(1, 1, 255), 'CMD_ID')
        .appendField('Word')
        .appendField(new Blockly.FieldTextInput('hello'), 'KEYWORD');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(VOICE_COLOR);
      this.setTooltip('Train a voice command keyword');
    },
  };

  Blockly.Blocks['stemverse_voice_on_command'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('🗣️ When Command')
        .appendField(
          new Blockly.FieldDropdown([
            ['Turn On', 'turn_on'],
            ['Turn Off', 'turn_off'],
            ['Hello', 'hello'],
            ['Forward', 'forward'],
            ['Backward', 'backward'],
            ['Stop', 'stop'],
            ['Left', 'left'],
            ['Right', 'right'],
            ['Speed Up', 'speed_up'],
            ['Slow Down', 'slow_down'],
            ['Red', 'red'],
            ['Green', 'green'],
            ['Blue', 'blue'],
            ['Custom 1', 'custom_1'],
            ['Custom 2', 'custom_2'],
            ['Custom 3', 'custom_3'],
          ]),
          'COMMAND',
        );
      this.appendStatementInput('DO').setCheck(null).appendField('Do');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(VOICE_COLOR);
      this.setTooltip('Execute blocks when a specific voice command is recognized');
    },
  };

  /* ── Wake Word Detection (ESP32-SR) ──────────────────────── */
  Blockly.Blocks['stemverse_wake_word_init'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('🎤 Wake Word Init')
        .appendField('Keyword')
        .appendField(
          new Blockly.FieldDropdown([
            ['Hi Stemverse', 'hi_stemverse'],
            ['Hey Arduino', 'hey_arduino'],
            ['OK Robot', 'ok_robot'],
            ['Alexa', 'alexa'],
            ['Custom', 'custom'],
          ]),
          'KEYWORD',
        );
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(VOICE_COLOR);
      this.setTooltip('Initialize ESP32 wake word detection');
    },
  };

  Blockly.Blocks['stemverse_wake_word_detected'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput().appendField('🎤 Wake Word Detected?');
      this.setOutput(true, 'Boolean');
      this.setColour(VOICE_COLOR);
      this.setTooltip('Returns true if the wake word was detected');
    },
  };

  /* ── Text-to-Speech (TTS) ────────────────────────────────── */
  Blockly.Blocks['stemverse_tts_speak'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('💬 Speak')
        .appendField(new Blockly.FieldTextInput('Hello World'), 'TEXT');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(VOICE_COLOR);
      this.setTooltip('Convert text to speech and play through speaker');
    },
  };

  Blockly.Blocks['stemverse_tts_set_voice'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('💬 Set Voice')
        .appendField(
          new Blockly.FieldDropdown([
            ['Male', 'MALE'],
            ['Female', 'FEMALE'],
            ['Robot', 'ROBOT'],
          ]),
          'VOICE',
        )
        .appendField('Speed')
        .appendField(
          new Blockly.FieldDropdown([
            ['Normal', '100'],
            ['Slow', '70'],
            ['Fast', '130'],
          ]),
          'SPEED',
        );
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(VOICE_COLOR);
      this.setTooltip('Set TTS voice type and speaking speed');
    },
  };

  /* ── Audio Amplifier (MAX98357A / PAM8403) ───────────────── */
  Blockly.Blocks['stemverse_amp_init'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('🔊 Amplifier Init')
        .appendField('Type')
        .appendField(
          new Blockly.FieldDropdown([
            ['MAX98357A (I2S)', 'MAX98357A'],
            ['PAM8403 (Analog)', 'PAM8403'],
          ]),
          'TYPE',
        )
        .appendField('Pin')
        .appendField(new Blockly.FieldNumber(25, 0, 39), 'PIN');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(VOICE_COLOR);
      this.setTooltip('Initialize audio amplifier module');
    },
  };
}

export const VOICE_ASSISTANCE_BLOCK_TYPES = [
  'stemverse_dfplayer_init',
  'stemverse_dfplayer_play',
  'stemverse_dfplayer_volume',
  'stemverse_dfplayer_stop',
  'stemverse_dfplayer_pause',
  'stemverse_speaker_tone',
  'stemverse_speaker_stop',
  'stemverse_i2s_init',
  'stemverse_i2s_read',
  'stemverse_i2s_write',
  'stemverse_mic_read',
  'stemverse_mic_is_loud',
  'stemverse_voice_recog_init',
  'stemverse_voice_recog_get_command',
  'stemverse_voice_recog_add_command',
  'stemverse_voice_on_command',
  'stemverse_wake_word_init',
  'stemverse_wake_word_detected',
  'stemverse_tts_speak',
  'stemverse_tts_set_voice',
  'stemverse_amp_init',
] as const;
