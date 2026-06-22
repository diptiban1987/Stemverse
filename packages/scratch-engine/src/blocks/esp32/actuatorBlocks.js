// esp32 actuator blocks — servo, motor, buzzer, led
import * as Blockly from "blockly/core";

const PIN_OPTIONS = [
  ["2","2"],["4","4"],["5","5"],["12","12"],["13","13"],
  ["14","14"],["15","15"],["16","16"],["17","17"],["18","18"],
  ["19","19"],["21","21"],["22","22"],["23","23"],["25","25"],
  ["26","26"],["27","27"],["32","32"],["33","33"]
];

const SERVO_OPTIONS = [["1","1"],["2","2"],["3","3"],["4","4"]];
const MOTOR_OPTIONS = [["1","1"],["2","2"],["3","3"],["4","4"]];

const enableServo = {
  type: "esp32_enable_servo",
  message0: "enable Servo %1 for servo connected to %2",
  args0: [
    { type: "field_dropdown", name: "SERVO", options: SERVO_OPTIONS },
    { type: "field_dropdown", name: "PIN", options: PIN_OPTIONS }
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 30,
  tooltip: "Initialize a servo motor on the given GPIO pin"
};

const setServoAngle = {
  type: "esp32_set_servo_angle",
  message0: "set servo %1 angle to %2",
  args0: [
    { type: "field_dropdown", name: "SERVO", options: SERVO_OPTIONS },
    { type: "field_number", name: "ANGLE", value: 30, min: 0, max: 180 }
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 30,
  tooltip: "Set the servo to a specific angle (0-180)"
};

const freeMotor = {
  type: "esp32_free_motor",
  message0: "free motor %1",
  args0: [
    { type: "field_dropdown", name: "MOTOR", options: MOTOR_OPTIONS }
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 30,
  tooltip: "Release / stop a motor"
};

const enableMotor = {
  type: "esp32_enable_motor",
  message0: "enable motor %1 connected to DIR pin %2 , %3 & PWM pin %4",
  args0: [
    { type: "field_dropdown", name: "MOTOR", options: MOTOR_OPTIONS },
    { type: "field_dropdown", name: "DIR1", options: PIN_OPTIONS },
    { type: "field_dropdown", name: "DIR2", options: PIN_OPTIONS },
    { type: "field_dropdown", name: "PWM", options: PIN_OPTIONS }
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 30,
  tooltip: "Set up a DC motor with direction and PWM pins"
};

const setRelay = {
  type: "esp32_set_relay",
  message0: "set relay at pin %1 to %2",
  args0: [
    { type: "field_dropdown", name: "PIN", options: PIN_OPTIONS },
    { type: "field_dropdown", name: "STATE", options: [["ON","1"],["OFF","0"]] }
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 30,
  tooltip: "Turn relay ON or OFF"
};

const enableLedControl = {
  type: "esp32_enable_led_control",
  message0: "enable LED control",
  previousStatement: null,
  nextStatement: null,
  colour: 30,
  tooltip: "Initialize LED brightness control via PWM"
};

const setLedBrightness = {
  type: "esp32_set_led_brightness",
  message0: "set LED brightness at pin %1 to %2",
  args0: [
    { type: "field_dropdown", name: "PIN", options: PIN_OPTIONS },
    { type: "field_number", name: "VALUE", value: 255, min: 0, max: 1023 }
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 30,
  tooltip: "Set LED brightness (0-1023) using PWM"
};

const detachServo = {
  type: "esp32_detach_servo",
  message0: "detach servo %1",
  args0: [
    { type: "field_dropdown", name: "SERVO", options: SERVO_OPTIONS }
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 30,
  tooltip: "Stop and release the servo motor PWM signal"
};

const relayToggle = {
  type: "esp32_relay_toggle",
  message0: "toggle relay at pin %1",
  args0: [
    { type: "field_dropdown", name: "PIN", options: PIN_OPTIONS }
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 30,
  tooltip: "Toggle the relay between ON and OFF"
};

const relayState = {
  type: "esp32_relay_state",
  message0: "relay state at pin %1",
  args0: [
    { type: "field_dropdown", name: "PIN", options: PIN_OPTIONS }
  ],
  output: "Boolean",
  colour: 30,
  tooltip: "Get the current state of a relay (true = ON)"
};

const pinStateMonitor = {
  type: "esp32_pin_state_monitor",
  message0: "enable pin state monitor",
  previousStatement: null,
  nextStatement: null,
  colour: 30,
  tooltip: "Enable the pin state monitor module"
};

const rotateServo = {
  type: "esp32_rotate_servo",
  message0: "rotate servo %1 from %2 to %3 speed %4",
  args0: [
    { type: "field_dropdown", name: "SERVO", options: SERVO_OPTIONS },
    { type: "field_number", name: "FROM", value: 0, min: 0, max: 180 },
    { type: "field_number", name: "TO", value: 180, min: 0, max: 180 },
    { type: "field_dropdown", name: "SPEED", options: [["slow","30"],["medium","15"],["fast","5"]] }
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 30,
  tooltip: "Smoothly rotate the servo from one angle to another"
};

export const actuatorBlocks = Blockly.common.createBlockDefinitionsFromJsonArray([
  enableServo, setServoAngle, rotateServo, detachServo, freeMotor, enableMotor,
  setRelay, relayToggle, relayState,
  enableLedControl, setLedBrightness, pinStateMonitor
]);
