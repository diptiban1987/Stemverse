// esp32 board-mode toolbox definition for blockly
import { colour } from "blockly/blocks";

export const toolbox = {
  kind: "categoryToolbox",
  contents: [
    {
      kind: "category",
      name: "ESP32 Core",
      colour: "#5cb1d6",
      contents: [
        {
          kind: "category",
          name: "Program",
          colour: "#5cb1d6",
          contents: [
            { kind: "block", type: "esp32_when_starts" },
            { kind: "block", type: "print_block" },
            { kind: "block", type: "add_text" },
            { kind: "block", type: "wait_block" },
            { kind: "block", type: "esp32_map_value" },
          ]
        },
        {
          kind: "category",
          name: "Pins",
          colour: "#5cb1d6",
          contents: [
            { kind: "block", type: "esp32_set_pin_mode" },
            { kind: "block", type: "esp32_read_digital_pin" },
            { kind: "block", type: "esp32_read_analog_pin" },
            { kind: "block", type: "esp32_set_digital_pin" },
            { kind: "block", type: "esp32_set_pwm_pin" },
            { kind: "block", type: "digital_write" },
          ]
        },
      ]
    },
    {
      kind: "category",
      name: "Inputs",
      colour: "#59c059",
      contents: [
        {
          kind: "category",
          name: "Tactile Switch",
          colour: "#59c059",
          contents: [
            { kind: "block", type: "esp32_tactile_switch" },
            { kind: "block", type: "esp32_wait_until_pressed" },
            { kind: "block", type: "esp32_when_switch_pressed" },
          ]
        },
        {
          kind: "category",
          name: "Slide Switch",
          colour: "#59c059",
          contents: [
            { kind: "block", type: "esp32_slide_switch" },
            { kind: "block", type: "esp32_slide_switch_is_on" },
            { kind: "block", type: "esp32_slide_switch_is_off" },
          ]
        },
        {
          kind: "category",
          name: "Touch & Hall",
          colour: "#59c059",
          contents: [
            { kind: "block", type: "esp32_get_touch_pin" },
            { kind: "block", type: "esp32_get_hall_sensor" },
            { kind: "block", type: "esp32_hall_magnet_detected" },
          ]
        },
      ]
    },
    {
      kind: "category",
      name: "Sensors",
      colour: "#ff8c1a",
      contents: [
        {
          kind: "category",
          name: "🌡️ Temperature",
          colour: "#ff8c1a",
          contents: [
            { kind: "label", text: "DHT11 / DHT22 — Library: DHT sensor library" },
            { kind: "block", type: "esp32_dht_setup" },
            { kind: "block", type: "esp32_dht_get_reading" },
            { kind: "block", type: "esp32_dht" },
            { kind: "label", text: "DS18B20 — Libraries: OneWire + DallasTemperature" },
            { kind: "block", type: "esp32_ds18b20_setup" },
            { kind: "block", type: "esp32_ds18b20_get_temp" },
            { kind: "block", type: "esp32_ds18b20_get_temp_f" },
          ]
        },
        {
          kind: "category",
          name: "📏 Ultrasonic",
          colour: "#ff8c1a",
          contents: [
            { kind: "label", text: "HC-SR04 — No library needed" },
            { kind: "block", type: "esp32_ultrasonic_setup" },
            { kind: "block", type: "esp32_ultrasonic_get_distance" },
            { kind: "block", type: "esp32_ultrasonic" },
          ]
        },
        {
          kind: "category",
          name: "🌦️ Environmental",
          colour: "#ff8c1a",
          contents: [
            { kind: "label", text: "BMP280 — Library: Adafruit BMP280 Library" },
            { kind: "block", type: "esp32_bmp280_setup" },
            { kind: "block", type: "esp32_bmp280_temperature" },
            { kind: "block", type: "esp32_bmp280_pressure" },
            { kind: "block", type: "esp32_bmp280_altitude" },
          ]
        },
        {
          kind: "category",
          name: "📐 Motion (MPU6050)",
          colour: "#ff8c1a",
          contents: [
            { kind: "label", text: "MPU6050 — Library: Adafruit MPU6050" },
            { kind: "block", type: "esp32_mpu_init" },
            { kind: "block", type: "esp32_mpu_accel" },
            { kind: "block", type: "esp32_mpu_gyro" },
            { kind: "block", type: "esp32_mpu_temp" },
            { kind: "block", type: "esp32_mpu_tilt" },
          ]
        },
        {
          kind: "category",
          name: "👁️ Motion / Obstacle",
          colour: "#ff8c1a",
          contents: [
            { kind: "label", text: "PIR Motion — No library needed" },
            { kind: "block", type: "esp32_pir_sensor" },
            { kind: "label", text: "IR Obstacle — No library needed" },
            { kind: "block", type: "esp32_ir_sensor" },
          ]
        },
        {
          kind: "category",
          name: "📡 RFID (MFRC522)",
          colour: "#ff8c1a",
          contents: [
            { kind: "label", text: "MFRC522 — Library: MFRC522" },
            { kind: "block", type: "esp32_rfid_setup" },
            { kind: "block", type: "esp32_rfid_card_present" },
            { kind: "block", type: "esp32_rfid_read_uid" },
            { kind: "block", type: "esp32_rfid_uid_match" },
          ]
        },
        {
          kind: "category",
          name: "📺 IR Remote",
          colour: "#ff8c1a",
          contents: [
            { kind: "label", text: "IR Receiver — Library: IRremote" },
            { kind: "block", type: "esp32_ir_receiver_setup" },
            { kind: "block", type: "esp32_ir_receiver_available" },
            { kind: "block", type: "esp32_ir_receiver_read" },
            { kind: "block", type: "esp32_ir_receiver_resume" },
          ]
        },
        {
          kind: "category",
          name: "🔥 Fire & Gas",
          colour: "#ff8c1a",
          contents: [
            { kind: "label", text: "Flame Sensor — No library needed" },
            { kind: "block", type: "esp32_flame_digital" },
            { kind: "block", type: "esp32_flame_analog" },
            { kind: "label", text: "MQ-2 Gas Sensor — No library needed" },
            { kind: "block", type: "esp32_gas_sensor_analog" },
            { kind: "block", type: "esp32_gas_sensor_digital" },
          ]
        },
        {
          kind: "category",
          name: "💧 Water & Rain",
          colour: "#ff8c1a",
          contents: [
            { kind: "label", text: "Rain Sensor — No library needed" },
            { kind: "block", type: "esp32_rain_sensor" },
            { kind: "label", text: "Soil Moisture — No library needed" },
            { kind: "block", type: "esp32_soil_moisture_analog" },
            { kind: "block", type: "esp32_soil_moisture_digital" },
          ]
        },
        {
          kind: "category",
          name: "🔊 Sound",
          colour: "#ff8c1a",
          contents: [
            { kind: "label", text: "Sound / Microphone Module — No library needed" },
            { kind: "block", type: "esp32_sound_sensor_analog" },
            { kind: "block", type: "esp32_sound_sensor_digital" },
          ]
        },
        {
          kind: "category",
          name: "👆 Touch & Vibration",
          colour: "#ff8c1a",
          contents: [
            { kind: "label", text: "TTP223 Touch Sensor — No library needed" },
            { kind: "block", type: "esp32_touch_sensor" },
            { kind: "label", text: "SW-420 Vibration Sensor — No library needed" },
            { kind: "block", type: "esp32_vibration_sensor" },
          ]
        },
        {
          kind: "category",
          name: "💡 Light",
          colour: "#ff8c1a",
          contents: [
            { kind: "label", text: "LDR / Photoresistor — No library needed" },
            { kind: "block", type: "esp32_ldr_sensor" },
          ]
        },
        {
          kind: "category",
          name: "🧲 Hall Effect",
          colour: "#ff8c1a",
          contents: [
            { kind: "label", text: "Hall Sensor Module — No library needed" },
            { kind: "block", type: "esp32_hall_module_value" },
            { kind: "block", type: "esp32_hall_module_detected" },
            { kind: "block", type: "esp32_hall_module_wait" },
          ]
        },
        {
          kind: "category",
          name: "🎛️ Analog / Generic",
          colour: "#ff8c1a",
          contents: [
            { kind: "block", type: "esp32_potentiometer" },
            { kind: "block", type: "esp32_analog_sensor" },
            { kind: "block", type: "esp32_digital_sensor" },
          ]
        },
      ]
    },
    {
      kind: "category",
      name: "Actuators",
      colour: "#00a69c",
      contents: [
        {
          kind: "category",
          name: "Servo",
          colour: "#00a69c",
          contents: [
            { kind: "block", type: "esp32_enable_servo" },
            { kind: "block", type: "esp32_set_servo_angle" },
            { kind: "block", type: "esp32_rotate_servo" },
            { kind: "block", type: "esp32_detach_servo" },
          ]
        },
        {
          kind: "category",
          name: "Relay",
          colour: "#00a69c",
          contents: [
            { kind: "block", type: "esp32_set_relay" },
            { kind: "block", type: "esp32_relay_toggle" },
            { kind: "block", type: "esp32_relay_state" },
          ]
        },
        {
          kind: "category",
          name: "LED",
          colour: "#00a69c",
          contents: [
            { kind: "block", type: "esp32_enable_led_control" },
            { kind: "block", type: "esp32_set_led_brightness" },
            { kind: "block", type: "esp32_pin_state_monitor" },
          ]
        },
        {
          kind: "category",
          name: "Notification",
          colour: "#00a69c",
          contents: [
            { kind: "block", type: "esp32_send_notification" },
            { kind: "block", type: "esp32_clear_notification" },
          ]
        },
        {
          kind: "category",
          name: "Music",
          colour: "#00a69c",
          contents: [
            { kind: "block", type: "esp32_play_music" },
            { kind: "block", type: "esp32_stop_music" },
          ]
        },
        {
          kind: "category",
          name: "Buzzer",
          colour: "#00a69c",
          contents: [
            { kind: "block", type: "esp32_buzzer_tone" },
            { kind: "block", type: "esp32_buzzer_stop" },
          ]
        },
        {
          kind: "category",
          name: "Water Pump",
          colour: "#00a69c",
          contents: [
            { kind: "block", type: "esp32_water_pump_on" },
            { kind: "block", type: "esp32_water_pump_off" },
          ]
        },
      ]
    },
    {
      kind: "category",
      name: "Displays",
      colour: "#3d8bf5",
      contents: [
        {
          kind: "category",
          name: "LCD",
          colour: "#3d8bf5",
          contents: [
            { kind: "block", type: "esp32_lcd_init" },
            { kind: "block", type: "esp32_lcd_print" },
            { kind: "block", type: "esp32_lcd_clear" },
            { kind: "block", type: "esp32_lcd_set_cursor" },
            { kind: "block", type: "esp32_lcd_backlight" },
          ]
        },
        {
          kind: "category",
          name: "NeoPixel",
          colour: "#3d8bf5",
          contents: [
            { kind: "block", type: "esp32_neopixel_init" },
            { kind: "block", type: "esp32_neopixel_set" },
          ]
        },
      ]
    },
    {
      kind: "category",
      name: "Motors",
      colour: "#ff4d4d",
      contents: [
        {
          kind: "category",
          name: "L298N",
          colour: "#ff4d4d",
          contents: [
            { kind: "block", type: "esp32_l298n_init" },
            { kind: "block", type: "esp32_l298n_motor_forward" },
            { kind: "block", type: "esp32_l298n_motor_backward" },
            { kind: "block", type: "esp32_l298n_motor_speed" },
            { kind: "block", type: "esp32_l298n_stop_motor" },
            { kind: "block", type: "esp32_l298n_stop_all" },
          ]
        },
        {
          kind: "category",
          name: "Generic Motor",
          colour: "#ff4d4d",
          contents: [
            { kind: "block", type: "esp32_free_motor" },
            { kind: "block", type: "esp32_enable_motor" },
          ]
        },
      ]
    },
    {
      kind: "category",
      name: "Comms & IoT",
      colour: "#10b981",
      contents: [
        {
          kind: "category",
          name: "Serial / Bluetooth",
          colour: "#10b981",
          contents: [
            { kind: "block", type: "esp32_bt_serial_baud" },
            { kind: "block", type: "esp32_set_serial_pins" },
            { kind: "block", type: "esp32_bt_configure" },
            { kind: "block", type: "esp32_set_serial_baud" },
            { kind: "block", type: "esp32_serial_available" },
            { kind: "block", type: "esp32_serial_read" },
            { kind: "block", type: "esp32_serial_read_number" },
            { kind: "block", type: "esp32_serial_read_string" },
            { kind: "block", type: "esp32_serial_write" },
            { kind: "block", type: "esp32_bt_data_available" },
            { kind: "block", type: "esp32_bt_read" },
            { kind: "block", type: "esp32_bt_send" },
            { kind: "block", type: "esp32_terminal_data" },
            { kind: "block", type: "esp32_terminal_number" },
            { kind: "block", type: "esp32_terminal_send" },
            { kind: "block", type: "esp32_get_bt_mac" },
          ]
        },
        {
          kind: "category",
          name: "Camera",
          colour: "#10b981",
          contents: [
            { kind: "block", type: "esp32_camera_init" },
            { kind: "block", type: "esp32_camera_flash" },
            { kind: "block", type: "esp32_rotate_camera" },
            { kind: "block", type: "esp32_capture_image" },
            { kind: "block", type: "esp32_camera_save_image" },
            { kind: "block", type: "esp32_camera_stream" },
            { kind: "block", type: "esp32_camera_ready" },
          ]
        },
        {
          kind: "category",
          name: "Storage / Logger",
          colour: "#10b981",
          contents: [
            { kind: "block", type: "esp32_create_file" },
            { kind: "block", type: "esp32_log_data" },
            { kind: "block", type: "esp32_stop_logger" },
          ]
        },
        {
          kind: "category",
          name: "WiFi / Network",
          colour: "#10b981",
          contents: [
            { kind: "block", type: "esp32_wifi_connect" },
            { kind: "block", type: "esp32_wifi_disconnect" },
            { kind: "block", type: "esp32_wifi_is_connected" },
            { kind: "block", type: "esp32_wifi_local_ip" },
            { kind: "block", type: "esp32_wifi_scan" },
            { kind: "block", type: "esp32_wifi_rssi" },
          ]
        },
        {
          kind: "category",
          name: "HTTP Client",
          colour: "#10b981",
          contents: [
            { kind: "block", type: "esp32_http_get" },
            { kind: "block", type: "esp32_http_post" },
            { kind: "block", type: "esp32_http_put" },
            { kind: "block", type: "esp32_http_delete" },
            { kind: "block", type: "esp32_http_status" },
          ]
        },
        {
          kind: "category",
          name: "MQTT",
          colour: "#10b981",
          contents: [
            { kind: "block", type: "esp32_mqtt_connect" },
            { kind: "block", type: "esp32_mqtt_publish" },
            { kind: "block", type: "esp32_mqtt_subscribe" },
            { kind: "block", type: "esp32_mqtt_check_message" },
            { kind: "block", type: "esp32_mqtt_is_connected" },
            { kind: "block", type: "esp32_mqtt_last_message" },
          ]
        },
        {
          kind: "category",
          name: "Blynk IoT",
          colour: "#00bcd4",
          contents: [
            {
              kind: "category",
              name: "Setup",
              colour: "#00bcd4",
              contents: [
                { kind: "block", type: "esp32_blynk_setup" },
                { kind: "block", type: "esp32_blynk_run" },
                { kind: "block", type: "esp32_blynk_connected" },
              ]
            },
            {
              kind: "category",
              name: "Virtual Pins",
              colour: "#00bcd4",
              contents: [
                { kind: "block", type: "esp32_blynk_virtual_write" },
                { kind: "block", type: "esp32_blynk_virtual_read" },
                { kind: "block", type: "esp32_blynk_sync_virtual" },
              ]
            },
            {
              kind: "category",
              name: "Notifications",
              colour: "#00bcd4",
              contents: [
                { kind: "block", type: "esp32_blynk_notify" },
                { kind: "block", type: "esp32_blynk_email" },
              ]
            },
            {
              kind: "category",
              name: "Widgets",
              colour: "#00bcd4",
              contents: [
                { kind: "block", type: "esp32_blynk_lcd_print" },
                { kind: "block", type: "esp32_blynk_lcd_clear" },
                { kind: "block", type: "esp32_blynk_set_property" },
              ]
            },
            {
              kind: "category",
              name: "Timer",
              colour: "#00bcd4",
              contents: [
                { kind: "block", type: "esp32_blynk_timer_setup" },
                { kind: "block", type: "esp32_blynk_timer_run" },
              ]
            },
          ]
        },
        {
          kind: "category",
          name: "ThingSpeak",
          colour: "#8bc34a",
          contents: [
            { kind: "block", type: "esp32_thingspeak_setup" },
            { kind: "block", type: "esp32_thingspeak_set_field" },
            { kind: "block", type: "esp32_thingspeak_write" },
            { kind: "block", type: "esp32_thingspeak_read" },
          ]
        },
      ]
    },

    {
      kind: "category",
      name: "Dabble",
      colour: "#6366f1",
      contents: [
        {
          kind: "category",
          name: "Setup",
          colour: "#6366f1",
          contents: [
            { kind: "block", type: "esp32_dabble_set_bt" },
            { kind: "block", type: "esp32_dabble_refresh" },
          ]
        },
        {
          kind: "category",
          name: "Gamepad",
          colour: "#6366f1",
          contents: [
            { kind: "block", type: "esp32_gamepad_pressed" },
            { kind: "block", type: "esp32_gamepad_angle" },
          ]
        },
        {
          kind: "category",
          name: "Phone Sensors",
          colour: "#6366f1",
          contents: [
            { kind: "block", type: "esp32_phone_sensor" },
          ]
        },
        {
          kind: "category",
          name: "Color Detector",
          colour: "#6366f1",
          contents: [
            { kind: "block", type: "esp32_color_detector_grid" },
            { kind: "block", type: "esp32_color_detector_value" },
          ]
        },
      ]
    },
    {
      kind: "sep",
    },
    {
      kind: "category",
      name: "Logic",
      categorystyle: "logic_category",
      contents: [
        {
          kind: "block",
          type: "controls_if",
        },
        {
          kind: "block",
          type: "logic_compare",
        },
        {
          kind: "block",
          type: "logic_operation",
        },
        {
          kind: "block",
          type: "logic_negate",
        },
        {
          kind: "block",
          type: "logic_boolean",
        },
        {
          kind: "block",
          type: "logic_null",
        },
        {
          kind: "block",
          type: "logic_ternary",
        },
      ],
    },
    {
      kind: "category",
      name: "Loops",
      categorystyle: "loop_category",
      contents: [
        {
          kind: "block",
          color: "#9966FF",
          type: "controls_repeat_ext",
          inputs: {
            TIMES: {
              shadow: {
                type: "math_number",
                fields: {
                  NUM: 10,
                },
              },
            },
          },
        },
        {
          kind: "block",
          type: "controls_whileUntil",
        },
        {
          kind: "block",
          type: "controls_for",
          inputs: {
            FROM: {
              shadow: {
                type: "math_number",
                fields: {
                  NUM: 1,
                },
              },
            },
            TO: {
              shadow: {
                type: "math_number",
                fields: {
                  NUM: 10,
                },
              },
            },
            BY: {
              shadow: {
                type: "math_number",
                fields: {
                  NUM: 1,
                },
              },
            },
          },
        },
        {
          kind: "block",
          type: "controls_forEach",
        },
        {
          kind: "block",
          type: "controls_flow_statements",
        },
      ],
    },
    {
      kind: "category",
      name: "Math",
      categorystyle: "math_category",
      contents: [
        {
          kind: "block",
          type: "math_number",
          fields: {
            NUM: 123,
          },
        },
        {
          kind: "block",
          type: "math_arithmetic",
          inputs: {
            A: {
              shadow: {
                type: "math_number",
                fields: {
                  NUM: 1,
                },
              },
            },
            B: {
              shadow: {
                type: "math_number",
                fields: {
                  NUM: 1,
                },
              },
            },
          },
        },
        {
          kind: "block",
          type: "math_single",
          inputs: {
            NUM: {
              shadow: {
                type: "math_number",
                fields: {
                  NUM: 9,
                },
              },
            },
          },
        },
        {
          kind: "block",
          type: "math_trig",
          inputs: {
            NUM: {
              shadow: {
                type: "math_number",
                fields: {
                  NUM: 45,
                },
              },
            },
          },
        },
        {
          kind: "block",
          type: "math_constant",
        },
        {
          kind: "block",
          type: "math_number_property",
          inputs: {
            NUMBER_TO_CHECK: {
              shadow: {
                type: "math_number",
                fields: {
                  NUM: 0,
                },
              },
            },
          },
        },
        {
          kind: "block",
          type: "math_round",
          fields: {
            OP: "ROUND",
          },
          inputs: {
            NUM: {
              shadow: {
                type: "math_number",
                fields: {
                  NUM: 3.1,
                },
              },
            },
          },
        },
        {
          kind: "block",
          type: "math_on_list",
          fields: {
            OP: "SUM",
          },
        },
        {
          kind: "block",
          type: "math_modulo",
          inputs: {
            DIVIDEND: {
              shadow: {
                type: "math_number",
                fields: {
                  NUM: 64,
                },
              },
            },
            DIVISOR: {
              shadow: {
                type: "math_number",
                fields: {
                  NUM: 10,
                },
              },
            },
          },
        },
        {
          kind: "block",
          type: "math_constrain",
          inputs: {
            VALUE: {
              shadow: {
                type: "math_number",
                fields: {
                  NUM: 50,
                },
              },
            },
            LOW: {
              shadow: {
                type: "math_number",
                fields: {
                  NUM: 1,
                },
              },
            },
            HIGH: {
              shadow: {
                type: "math_number",
                fields: {
                  NUM: 100,
                },
              },
            },
          },
        },
        {
          kind: "block",
          type: "math_random_int",
          inputs: {
            FROM: {
              shadow: {
                type: "math_number",
                fields: {
                  NUM: 1,
                },
              },
            },
            TO: {
              shadow: {
                type: "math_number",
                fields: {
                  NUM: 100,
                },
              },
            },
          },
        },
        {
          kind: "block",
          type: "math_random_float",
        },
        {
          kind: "block",
          type: "math_atan2",
          inputs: {
            X: {
              shadow: {
                type: "math_number",
                fields: {
                  NUM: 1,
                },
              },
            },
            Y: {
              shadow: {
                type: "math_number",
                fields: {
                  NUM: 1,
                },
              },
            },
          },
        },
      ],
    },
    {
      kind: "category",
      name: "Text",
      categorystyle: "text_category",
      contents: [
        {
          kind: "block",
          type: "text",
        },
        {
          kind: "block",
          type: "text_join",
        },
        {
          kind: "block",
          type: "text_append",
          inputs: {
            TEXT: {
              shadow: {
                type: "text",
                fields: {
                  TEXT: "",
                },
              },
            },
          },
        },
        {
          kind: "block",
          type: "text_length",
          inputs: {
            VALUE: {
              shadow: {
                type: "text",
                fields: {
                  TEXT: "abc",
                },
              },
            },
          },
        },
        {
          kind: "block",
          type: "text_isEmpty",
          inputs: {
            VALUE: {
              shadow: {
                type: "text",
                fields: {
                  TEXT: "",
                },
              },
            },
          },
        },
        {
          kind: "block",
          type: "text_indexOf",
          inputs: {
            VALUE: {
              block: {
                type: "variables_get",
              },
            },
            FIND: {
              shadow: {
                type: "text",
                fields: {
                  TEXT: "abc",
                },
              },
            },
          },
        },
        {
          kind: "block",
          type: "text_charAt",
          inputs: {
            VALUE: {
              block: {
                type: "variables_get",
              },
            },
          },
        },
        {
          kind: "block",
          type: "text_getSubstring",
          inputs: {
            STRING: {
              block: {
                type: "variables_get",
              },
            },
          },
        },
        {
          kind: "block",
          type: "text_changeCase",
          inputs: {
            TEXT: {
              shadow: {
                type: "text",
                fields: {
                  TEXT: "abc",
                },
              },
            },
          },
        },
        {
          kind: "block",
          type: "text_trim",
          inputs: {
            TEXT: {
              shadow: {
                type: "text",
                fields: {
                  TEXT: "abc",
                },
              },
            },
          },
        },
        {
          kind: "block",
          type: "text_count",
          inputs: {
            SUB: {
              shadow: {
                type: "text",
              },
            },
            TEXT: {
              shadow: {
                type: "text",
              },
            },
          },
        },
        {
          kind: "block",
          type: "text_replace",
          inputs: {
            FROM: {
              shadow: {
                type: "text",
              },
            },
            TO: {
              shadow: {
                type: "text",
              },
            },
            TEXT: {
              shadow: {
                type: "text",
              },
            },
          },
        },
        {
          kind: "block",
          type: "text_reverse",
          inputs: {
            TEXT: {
              shadow: {
                type: "text",
              },
            },
          },
        },
        {
          kind: "block",
          type: "add_text",
          inputs: {
            TEXT: {
              shadow: {
                type: "text",
                fields: {
                  TEXT: "abc",
                },
              },
            },
          },
        },
      ],
    },
    {
      kind: "category",
      name: "Lists",
      categorystyle: "list_category",
      contents: [
        {
          kind: "block",
          type: "lists_create_with",
        },
        {
          kind: "block",
          type: "lists_repeat",
          inputs: {
            NUM: {
              shadow: {
                type: "math_number",
                fields: {
                  NUM: 5,
                },
              },
            },
          },
        },
        {
          kind: "block",
          type: "lists_length",
        },
        {
          kind: "block",
          type: "lists_isEmpty",
        },
        {
          kind: "block",
          type: "lists_indexOf",
          inputs: {
            VALUE: {
              block: {
                type: "variables_get",
              },
            },
          },
        },
        {
          kind: "block",
          type: "lists_getIndex",
          inputs: {
            VALUE: {
              block: {
                type: "variables_get",
              },
            },
          },
        },
        {
          kind: "block",
          type: "lists_setIndex",
          inputs: {
            LIST: {
              block: {
                type: "variables_get",
              },
            },
          },
        },
        {
          kind: "block",
          type: "lists_getSublist",
          inputs: {
            LIST: {
              block: {
                type: "variables_get",
              },
            },
          },
        },
        {
          kind: "block",
          type: "lists_split",
          inputs: {
            DELIM: {
              shadow: {
                type: "text",
                fields: {
                  TEXT: ",",
                },
              },
            },
          },
        },
        {
          kind: "block",
          type: "lists_sort",
        },
        {
          kind: "block",
          type: "lists_reverse",
        },
      ],
    },
    {
      kind: "category",
      name: "Variables",
      categorystyle: "variable_category",
      custom: "VARIABLE",
      contents: [
        { kind: "block", type: "variables_get" },
        { kind: "block", type: "variables_set" },
      ],
    },
    {
      kind: "category",
      name: "Functions",
      categorystyle: "procedure_category",
      custom: "PROCEDURE",
      contents: [
        { kind: "block", type: "procedures_defnoreturn" },
      ],
    }
  ],
};
