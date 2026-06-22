// Generator - SENSOR BLOCKS
import { Order } from "blockly/python";

export const forBlock = Object.create(null);

forBlock["esp32_ultrasonic"] = function (block, generator) {
  const trig = block.getFieldValue("TRIG");
  const echo = block.getFieldValue("ECHO");

  generator.definitions_["import_machine"] =
    "from machine import Pin";

  generator.definitions_["import_time"] =
    "import time";

  // Initialize pins once
  generator.definitions_[`pin_trig_${trig}`] =
    `trig_${trig} = Pin(${trig}, Pin.OUT)`;

  generator.definitions_[`pin_echo_${echo}`] =
    `echo_${echo} = Pin(${echo}, Pin.IN)`;

  // Stable ultrasonic functions
  generator.definitions_["def_ultrasonic"] = `def ultrasonic_read_once(trig, echo):
    trig.value(0)
    time.sleep_us(5)

    trig.value(1)
    time.sleep_us(10)
    trig.value(0)

    # Wait for echo pin to go HIGH with timeout
    timeout = time.ticks_us() + 30000
    while echo.value() == 0:
        if time.ticks_diff(timeout, time.ticks_us()) <= 0:
            return None

    start = time.ticks_us()

    # Wait for echo pin to go LOW with timeout
    timeout = time.ticks_us() + 30000
    while echo.value() == 1:
        if time.ticks_diff(timeout, time.ticks_us()) <= 0:
            return None

    duration = time.ticks_diff(time.ticks_us(), start)
    distance = (duration * 0.0343) / 2

    if distance < 2 or distance > 400:
        return None

    return distance


def read_ultrasonic(trig, echo):
    readings = []

    for _ in range(5):
        d = ultrasonic_read_once(trig, echo)

        if d is not None:
            readings.append(d)

        time.sleep_ms(20)

    if not readings:
        return -1

    readings.sort()

    median = readings[len(readings) // 2]

    return round(median, 2)
`;

  return [
    `read_ultrasonic(trig_${trig}, echo_${echo})`,
    Order.FUNCTION_CALL
  ];
};

forBlock["esp32_ultrasonic_setup"] = function (block, generator) {
  const trig = block.getFieldValue("TRIG");
  const echo = block.getFieldValue("ECHO");
  generator.definitions_["import_machine"] = "from machine import Pin";
  generator.definitions_["import_time"] = "import time";
  generator.definitions_["def_ultrasonic_setup"] =
`ultrasonic_trig_pin = Pin(${trig}, Pin.OUT)
ultrasonic_echo_pin = Pin(${echo}, Pin.IN)`;
  return "";
};

forBlock["esp32_ultrasonic_get_distance"] = function (block, generator) {
  generator.definitions_["import_machine"] = "from machine import Pin";
  generator.definitions_["import_time"] = "import time";
  if (!generator.definitions_["def_ultrasonic_setup"]) {
    generator.definitions_["def_ultrasonic_setup"] =
`ultrasonic_trig_pin = Pin(12, Pin.OUT)
ultrasonic_echo_pin = Pin(13, Pin.IN)`;
  }
  generator.definitions_["def_ultrasonic_helper"] = `def ultrasonic_read_once(trig, echo):
    trig.value(0)
    time.sleep_us(5)
    trig.value(1)
    time.sleep_us(10)
    trig.value(0)

    # Wait for echo pin to go HIGH with timeout
    timeout = time.ticks_us() + 30000
    while echo.value() == 0:
        if time.ticks_diff(timeout, time.ticks_us()) <= 0:
            return None

    start = time.ticks_us()

    # Wait for echo pin to go LOW with timeout
    timeout = time.ticks_us() + 30000
    while echo.value() == 1:
        if time.ticks_diff(timeout, time.ticks_us()) <= 0:
            return None

    duration = time.ticks_diff(time.ticks_us(), start)
    distance = (duration * 0.0343) / 2

    if distance < 2 or distance > 400:
        return None

    return distance

def read_ultrasonic(trig, echo):
    readings = []
    for _ in range(5):
        d = ultrasonic_read_once(trig, echo)
        if d is not None:
            readings.append(d)
        time.sleep_ms(20)
    if not readings:
        return -1
    readings.sort()
    median = readings[len(readings) // 2]
    return round(median, 2)
`;
  return [`read_ultrasonic(ultrasonic_trig_pin, ultrasonic_echo_pin)`, Order.FUNCTION_CALL];
};

forBlock["esp32_dht_setup"] = function (block, generator) {
  const pin = block.getFieldValue("PIN");
  generator.definitions_["import_machine"] = "from machine import Pin";
  generator.definitions_["import_dht"] = "import dht";
  generator.definitions_["def_dht_setup"] = `dht_sensor = dht.DHT11(Pin(${pin}))`;
  return "";
};

forBlock["esp32_dht_get_reading"] = function (block, generator) {
  const reading = block.getFieldValue("READING");
  generator.definitions_["import_machine"] = "from machine import Pin";
  generator.definitions_["import_dht"] = "import dht";
  if (!generator.definitions_["def_dht_setup"]) {
    generator.definitions_["def_dht_setup"] = `dht_sensor = dht.DHT11(Pin(15))`;
  }
  generator.definitions_["dht_reader"] = `def read_dht(sensor, reading):
    try:
        sensor.measure()
        if reading == "temperature":
            return sensor.temperature()
        return sensor.humidity()
    except Exception:
        return -1
`;
  const method = reading === "temperature" ? "temperature" : "humidity";
  return [`read_dht(dht_sensor, "${method}")`, Order.FUNCTION_CALL];
};

forBlock["esp32_digital_sensor"] = function (block, generator) {
  const sensor = block.getFieldValue("SENSOR");
  const pin = block.getFieldValue("PIN");
  generator.definitions_["import_machine"] = "from machine import Pin";

  // Hoist pin object to module scope
  generator.definitions_[`pin_in_${pin}`] = `pin_${pin} = Pin(${pin}, Pin.IN)`;

  if (sensor === "PIR") {
    // PIR sensor: HIGH = motion detected, LOW = no motion
    return [`pin_${pin}.value()`, Order.FUNCTION_CALL];
  } else if (sensor === "IR") {
    // IR obstacle sensor: LOW = obstacle detected, HIGH = clear (active low)
    return [`pin_${pin}.value()`, Order.FUNCTION_CALL];
  } else {
    // Generic digital sensor
    return [`pin_${pin}.value()`, Order.FUNCTION_CALL];
  }
};

forBlock["esp32_dht"] = function (block, generator) {
  const reading = block.getFieldValue("READING");
  const pin = block.getFieldValue("PIN");

  generator.definitions_["import_machine"] =
    "from machine import Pin";

  generator.definitions_["import_dht"] =
    "import dht";

  generator.definitions_[`dht_${pin}`] =
    `dht_${pin} = dht.DHT11(Pin(${pin}))`;

  generator.definitions_["dht_reader"] = `def read_dht(sensor, reading):
    try:
        sensor.measure()

        if reading == "temperature":
            return sensor.temperature()

        return sensor.humidity()

    except Exception:
        return -1
`;

  const method =
    reading === "temperature"
      ? "temperature"
      : "humidity";

  return [
    `read_dht(dht_${pin}, "${method}")`,
    Order.FUNCTION_CALL
  ];
};

forBlock["esp32_analog_sensor"] = function (block, generator) {
  const pin = block.getFieldValue("PIN");

  generator.definitions_["import_adc"] =
    "from machine import Pin, ADC";

  generator.definitions_[`adc_${pin}`] = `adc_${pin} = ADC(Pin(${pin}))
adc_${pin}.atten(ADC.ATTN_11DB)
`;

  return [`adc_${pin}.read()`, Order.FUNCTION_CALL];
};

forBlock["esp32_potentiometer"] = function (block, generator) {
  const pin = block.getFieldValue("PIN");
  generator.definitions_["import_adc"] =
    "from machine import Pin, ADC";

  generator.definitions_[`pot_adc_${pin}`] = `pot_${pin} = ADC(Pin(${pin}))
pot_${pin}.atten(ADC.ATTN_11DB)
`;

  return [`pot_${pin}.read()`, Order.FUNCTION_CALL];
};

forBlock["esp32_rain_sensor"] = function (block, generator) {
  const pin = block.getFieldValue("PIN");
  const mode = block.getFieldValue("MODE");

  if (mode === "DIGITAL") {
    generator.definitions_["import_pin"] =
      "from machine import Pin";

    generator.definitions_[`rain_digital_${pin}`] =
      `rain_${pin} = Pin(${pin}, Pin.IN)`;

    return [
      `rain_${pin}.value()`,
      Order.FUNCTION_CALL
    ];
  }

  generator.definitions_["import_adc"] =
    "from machine import Pin, ADC";

  generator.definitions_[`rain_adc_${pin}`] = `rain_adc_${pin} = ADC(Pin(${pin}))
rain_adc_${pin}.atten(ADC.ATTN_11DB)
`;

  return [
    `rain_adc_${pin}.read()`,
    Order.FUNCTION_CALL
  ];
};

forBlock["esp32_ldr_sensor"] = forBlock["esp32_analog_sensor"];

forBlock["esp32_ir_sensor"] = function (block, generator) {
  const pin = block.getFieldValue("PIN");

  generator.definitions_["import_pin"] =
    "from machine import Pin";

  generator.definitions_[`ir_${pin}`] =
    `ir_${pin} = Pin(${pin}, Pin.IN)`;

  return [
    `ir_${pin}.value()`,
    Order.FUNCTION_CALL
  ];
};

forBlock["esp32_pir_sensor"] = function (block, generator) {
  const pin = block.getFieldValue("PIN");

  generator.definitions_["import_pin"] =
    "from machine import Pin";

  generator.definitions_["import_time"] =
    "import time";

  generator.definitions_[`pir_${pin}`] =
    `pir_${pin} = Pin(${pin}, Pin.IN, Pin.PULL_DOWN)`;

  generator.definitions_["pir_reader"] = `def read_pir(sensor):
    detections = 0
    for _ in range(5):
        if sensor.value():
            detections += 1
        time.sleep_ms(20)
    return 1 if detections >= 3 else 0
`;

  return [
    `read_pir(pir_${pin})`,
    Order.FUNCTION_CALL
  ];
};

// ── External Hall Sensor Module ──

forBlock["esp32_hall_module_value"] = function (block, generator) {
  const pin = block.getFieldValue("PIN");
  generator.definitions_["import_pin"] = "from machine import Pin";
  generator.definitions_[`hall_${pin}`] = `hall_${pin} = Pin(${pin}, Pin.IN)`;
  return [`hall_${pin}.value()`, Order.FUNCTION_CALL];
};

forBlock["esp32_hall_module_detected"] = function (block, generator) {
  const pin = block.getFieldValue("PIN");
  generator.definitions_["import_pin"] = "from machine import Pin";
  generator.definitions_[`hall_${pin}`] = `hall_${pin} = Pin(${pin}, Pin.IN)`;
  return [`hall_${pin}.value() == 0`, Order.COMPARISON];
};

forBlock["esp32_hall_module_wait"] = function (block, generator) {
  const pin = block.getFieldValue("PIN");
  generator.definitions_["import_pin"] = "from machine import Pin";
  generator.definitions_["import_time"] = "import time";
  generator.definitions_[`hall_${pin}`] = `hall_${pin} = Pin(${pin}, Pin.IN)`;
  return `while hall_${pin}.value() == 1:\n  time.sleep_ms(10)\n`;
};
