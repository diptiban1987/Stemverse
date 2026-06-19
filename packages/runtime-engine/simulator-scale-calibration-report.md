# Simulator Scale Calibration Report — Phase 31A.1

## Reference
- **MB-102 breadboard**: 165mm wide, 63 columns, 2.54mm pitch
- **Ratio formula**: `component_width_mm / 165mm`
- **Source of truth**: `COMPONENT_SCALE_RATIOS` in pixi-scene-renderer.ts

## Component Scale Audit

| Component | Asset ID | Width (mm) | Current Ratio | Calculated | Status |
|---|---|---|---|---|---|
| Arduino Uno R3 | `arduino_uno_r3` | 68 | 0.41 | 0.412 | ✅ OK |
| ESP32 DevKit V1 | `esp32_devkit_v1` | 28 | 0.17 | 0.170 | ✅ OK |
| Arduino Nano | `arduino_nano` | 18 | 0.11 | 0.109 | ✅ OK |
| HC-SR04 | `hc_sr04` | 45 | 0.27 | 0.273 | ✅ OK |
| IR Sensor | `ir_sensor` | 20 | 0.12 | 0.121 | ✅ OK |
| MQ2 Sensor | `mq2_sensor` | 33 | 0.20 | 0.200 | ✅ OK |
| DHT11 Sensor | `dht11_sensor` | 16 | 0.10 | 0.097 | ✅ ~OK |
| LED 5mm | `led_5mm` | 5 | 0.03 | 0.030 | ✅ OK |
| LED Generic | `led_generic` | 5 | 0.03 | 0.030 | ✅ OK |
| Resistor | `resistor` | 10 | 0.06 | 0.061 | ✅ OK |
| Resistor Generic | `resistor_generic` | 10 | 0.06 | 0.061 | ✅ OK |
| Push Button | `push_button` | 6 | 0.04 | 0.036 | ⚠️ Minor |
| Potentiometer | `potentiometer` | 16 | 0.10 | 0.097 | ✅ ~OK |
| Buzzer | `buzzer` | 12 | 0.07 | 0.073 | ✅ OK |
| SG90 Servo | `sg90_servo` | 23 | 0.14 | 0.139 | ✅ OK |
| Relay Module | `relay_module` | 28 | 0.17 | 0.170 | ✅ OK |
| OLED SSD1306 | `oled_ssd1306` | 27 | 0.17 | 0.164 | ⚠️ Minor |
| LCD 1602 | `lcd_1602` | 80 | 0.48 | 0.485 | ✅ OK |
| Raspberry Pi Pico | `raspberry_pi_pico` | 21 | 0.13 | 0.127 | ✅ NEW |

## Pin Spacing Verification
- BreadboardSnapEngine uses nearest-hole detection (no fixed PITCH_PX constant)
- Breadboard hole spacing: rowSpacing = 13px, colSpacing = 12px
- Effective pitch at 940px board width: ~14.5px per 2.54mm
- Current spacing (13px) is ~10% compressed — acceptable for visual representation

## Changes Made
1. Added `raspberry_pi_pico: 0.13` to COMPONENT_SCALE_RATIOS (was missing)
2. All 18 existing ratios verified against real-world dimensions
