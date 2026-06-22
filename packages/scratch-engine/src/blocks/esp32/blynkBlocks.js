import * as Blockly from "blockly/core";

// ── Blynk IoT Blocks (colour: 180) ─────────────────────────────────────────

const blynkSetup = {
  type: "esp32_blynk_setup",
  message0: "Blynk setup auth %1 WiFi SSID %2 password %3",
  args0: [
    { type: "field_input", name: "AUTH", text: "YourAuthToken" },
    { type: "field_input", name: "SSID", text: "YourSSID" },
    { type: "field_input", name: "PASSWORD", text: "YourPassword" }
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 180,
  tooltip: "Initialize Blynk IoT with WiFi credentials. Put in setup."
};

const blynkRun = {
  type: "esp32_blynk_run",
  message0: "Blynk run",
  previousStatement: null,
  nextStatement: null,
  colour: 180,
  tooltip: "Process Blynk connection. Must be called inside loop."
};

const blynkVirtualWrite = {
  type: "esp32_blynk_virtual_write",
  message0: "Blynk write to V%1 value %2",
  args0: [
    { type: "field_number", name: "PIN", value: 0, min: 0, max: 255, precision: 0 },
    { type: "input_value", name: "VALUE" }
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 180,
  tooltip: "Send a value to a Blynk virtual pin (V0-V255)"
};

const blynkVirtualRead = {
  type: "esp32_blynk_virtual_read",
  message0: "Blynk read V%1",
  args0: [
    { type: "field_number", name: "PIN", value: 0, min: 0, max: 255, precision: 0 }
  ],
  output: "Number",
  colour: 180,
  tooltip: "Read the last value received on a Blynk virtual pin"
};

const blynkConnected = {
  type: "esp32_blynk_connected",
  message0: "Blynk is connected?",
  output: "Boolean",
  colour: 180,
  tooltip: "Returns true if connected to Blynk server"
};

const blynkNotify = {
  type: "esp32_blynk_notify",
  message0: "Blynk notify %1",
  args0: [
    { type: "input_value", name: "MESSAGE" }
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 180,
  tooltip: "Send a push notification via Blynk app"
};

const blynkEmail = {
  type: "esp32_blynk_email",
  message0: "Blynk email to %1 subject %2 body %3",
  args0: [
    { type: "field_input", name: "EMAIL", text: "" },
    { type: "field_input", name: "SUBJECT", text: "" },
    { type: "input_value", name: "BODY" }
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 180,
  tooltip: "Send an email via Blynk"
};

const blynkLcdPrint = {
  type: "esp32_blynk_lcd_print",
  message0: "Blynk LCD V%1 row %2 col %3 text %4",
  args0: [
    { type: "field_number", name: "PIN", value: 0, min: 0, max: 255, precision: 0 },
    { type: "field_number", name: "ROW", value: 0, min: 0, max: 1, precision: 0 },
    { type: "field_number", name: "COL", value: 0, min: 0, max: 15, precision: 0 },
    { type: "input_value", name: "TEXT" }
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 180,
  tooltip: "Print text on Blynk LCD widget"
};

const blynkLcdClear = {
  type: "esp32_blynk_lcd_clear",
  message0: "Blynk LCD V%1 clear",
  args0: [
    { type: "field_number", name: "PIN", value: 0, min: 0, max: 255, precision: 0 }
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 180,
  tooltip: "Clear the Blynk LCD widget"
};

const blynkSetProperty = {
  type: "esp32_blynk_set_property",
  message0: "Blynk set V%1 property %2 to %3",
  args0: [
    { type: "field_number", name: "PIN", value: 0, min: 0, max: 255, precision: 0 },
    {
      type: "field_dropdown",
      name: "PROPERTY",
      options: [
        ["Color", "color"],
        ["Label", "label"],
        ["On Label", "onLabel"],
        ["Off Label", "offLabel"]
      ]
    },
    { type: "input_value", name: "VALUE" }
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 180,
  tooltip: "Set a widget property on the Blynk app"
};

const blynkSyncVirtual = {
  type: "esp32_blynk_sync_virtual",
  message0: "Blynk sync V%1",
  args0: [
    { type: "field_number", name: "PIN", value: 0, min: 0, max: 255, precision: 0 }
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 180,
  tooltip: "Request the latest value from the Blynk server for a virtual pin"
};

const blynkTimerSetup = {
  type: "esp32_blynk_timer_setup",
  message0: "Blynk timer every %1 ms call %2",
  args0: [
    { type: "field_number", name: "INTERVAL", value: 1000, min: 100, precision: 0 },
    { type: "field_input", name: "FUNCTION", text: "sendSensor" }
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 180,
  tooltip: "Setup a timed function call using BlynkTimer. Put in setup."
};

const blynkTimerRun = {
  type: "esp32_blynk_timer_run",
  message0: "Blynk timer run",
  previousStatement: null,
  nextStatement: null,
  colour: 180,
  tooltip: "Process BlynkTimer events. Must be called inside loop."
};

// ── ThingSpeak Blocks (colour: 160) ─────────────────────────────────────────

const thingspeakSetup = {
  type: "esp32_thingspeak_setup",
  message0: "ThingSpeak setup API key %1 channel %2",
  args0: [
    { type: "field_input", name: "API_KEY", text: "YourAPIKey" },
    { type: "field_number", name: "CHANNEL", value: 0, precision: 0 }
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 160,
  tooltip: "Initialize ThingSpeak with your Write API key and channel ID"
};

const thingspeakSetField = {
  type: "esp32_thingspeak_set_field",
  message0: "ThingSpeak set field %1 to %2",
  args0: [
    { type: "field_number", name: "FIELD", value: 1, min: 1, max: 8, precision: 0 },
    { type: "input_value", name: "VALUE" }
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 160,
  tooltip: "Set a field value (1-8) to be sent to ThingSpeak"
};

const thingspeakWrite = {
  type: "esp32_thingspeak_write",
  message0: "ThingSpeak write fields to channel",
  previousStatement: null,
  nextStatement: null,
  colour: 160,
  tooltip: "Send all set fields to ThingSpeak channel. Must wait 15s between writes."
};

const thingspeakRead = {
  type: "esp32_thingspeak_read",
  message0: "ThingSpeak read field %1 from channel %2",
  args0: [
    { type: "field_number", name: "FIELD", value: 1, min: 1, max: 8, precision: 0 },
    { type: "field_number", name: "CHANNEL", value: 0, precision: 0 }
  ],
  output: "Number",
  colour: 160,
  tooltip: "Read the last value from a ThingSpeak channel field"
};

// ── Export all block definitions ────────────────────────────────────────────

export const blynkBlocks = Blockly.common.createBlockDefinitionsFromJsonArray([
  blynkSetup,
  blynkRun,
  blynkVirtualWrite,
  blynkVirtualRead,
  blynkConnected,
  blynkNotify,
  blynkEmail,
  blynkLcdPrint,
  blynkLcdClear,
  blynkSetProperty,
  blynkSyncVirtual,
  blynkTimerSetup,
  blynkTimerRun,
  thingspeakSetup,
  thingspeakSetField,
  thingspeakWrite,
  thingspeakRead
]);
