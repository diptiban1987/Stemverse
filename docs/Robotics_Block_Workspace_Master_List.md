# Robotics Block-Based Workspace Master Block Catalog

## Overview

Design principle: use configurable, generalized blocks instead of creating separate blocks for every device or mode.

Example:

```text
Configure Pin
Pin [13]
Mode [INPUT | OUTPUT | INPUT_PULLUP | INPUT_PULLDOWN | ANALOG | PWM]
```

This reduces workspace complexity while supporting many boards.

---

# 1. Project

- Start Program
- Setup
- Loop
- Function
- Custom Function
- Call Function
- Variable
- Constant
- Array
- Structure
- Enum
- Comment
- Include Library

# 2. Board Configuration

## Board Selection

Supported Boards:

- ESP32
- ESP32-S3
- ESP8266
- Arduino Uno
- Arduino Nano
- Arduino Mega
- STM32
- Raspberry Pi Pico
- RP2040
- Custom Board

## Board Settings

- CPU Frequency
- Flash Size
- PSRAM
- Upload Speed

# 3. Pin Configuration

Single generalized block:

- Configure Pin
  - Pin
  - Mode

Modes:

- INPUT
- OUTPUT
- INPUT_PULLUP
- INPUT_PULLDOWN
- ANALOG
- PWM
- TOUCH

# 4. Digital I/O

- Digital Write
- Digital Read
- Toggle Pin

# 5. Analog I/O

- Analog Read
- Analog Write
- DAC Output

# 6. PWM

- PWM Setup
- PWM Write

# 7. Interrupts

- Attach Interrupt
- Detach Interrupt

Modes:

- RISING
- FALLING
- CHANGE

# 8. Timers

- Timer Create
- Timer Start
- Timer Stop
- Timer Reset
- Delay
- Delay Microseconds
- Millis
- Micros

# 9. Communication

## UART

- Serial Begin
- Serial Print
- Serial Println
- Serial Read
- Serial Available

## I2C

- I2C Begin
- I2C Read
- I2C Write
- I2C Scan

## SPI

- SPI Begin
- SPI Transfer
- SPI Read
- SPI Write

# 10. Wireless

## WiFi

- Connect WiFi
- Disconnect WiFi
- WiFi Status
- Get IP
- Create Access Point

## Bluetooth Classic

- Start Bluetooth
- Send Data
- Receive Data

## BLE

- Create Service
- Create Characteristic
- Notify
- Read
- Write

# 11. Cloud IoT

## MQTT

- Connect MQTT
- Subscribe
- Publish
- Disconnect

## HTTP

- HTTP GET
- HTTP POST
- HTTP PUT
- HTTP DELETE

## WebSocket

- Connect
- Send
- Receive

## Firebase

- Read Data
- Write Data
- Update Data

## Blynk

- Connect
- Virtual Write
- Virtual Read

# 12. Displays

## LCD 16x2

- Initialize LCD
- Print Text
- Clear LCD
- Set Cursor

## OLED

- Initialize
- Draw Text
- Draw Line
- Draw Circle
- Draw Rectangle
- Clear Display

## TFT

- Draw Pixel
- Draw Text
- Draw Image
- Draw Shape

# 13. Sensors

## Generic Sensor Blocks

- Sensor Initialize
- Read Sensor

### Environment

- DHT11
- DHT22
- BME280
- BMP280
- SHT31
- DS18B20

### Distance

- HC-SR04
- VL53L0X
- IR Distance

### Motion

- PIR
- Microwave Sensor

### Light

- LDR
- BH1750
- TSL2561

### Gas

- MQ2
- MQ3
- MQ5
- MQ135

### Fire

- Flame Sensor

### Sound

- Microphone
- Sound Sensor

### Water

- Water Level Sensor
- Rain Sensor

### Soil

- Soil Moisture

### Touch

- Capacitive Touch

### IMU

- MPU6050
- MPU9250
- BNO055

### GPS

- NEO6M

### Compass

- HMC5883L

# 14. Actuators

## LED

- On
- Off
- Blink
- Fade

## Relay

- On
- Off
- Toggle

## Buzzer

- Beep
- Tone
- Stop

## Servo

- Attach
- Write Angle
- Detach

## Stepper

- Configure
- Move
- Set Speed
- Stop

## DC Motor

- Forward
- Backward
- Stop
- Speed
- Brake

# 15. Robotics

## Differential Drive

- Move Forward
- Move Backward
- Turn Left
- Turn Right
- Stop

## Line Follower

- Read Left Sensor
- Read Right Sensor

## Obstacle Avoidance

- Distance Sensor
- Decision Block

## Robotic Arm

- Move Joint
- Set Angle
- Pick
- Place

# 16. AI and Computer Vision

- Load Model
- Predict
- Classification
- Detection
- Recognition
- Capture Image
- Record Video
- Detect Face
- Detect Object
- QR Scan
- Barcode Scan

# 17. Logic

- If
- Else
- Else If
- Switch
- Compare
- AND
- OR
- XOR
- NOT

# 18. Loops

- Repeat
- Forever
- While
- For
- Break
- Continue

# 19. Math

- Add
- Subtract
- Multiply
- Divide
- Modulo
- Random
- Map Value
- Constrain
- Round
- Min
- Max

# 20. Variables

- Number
- String
- Boolean
- Float
- Array
- Object

# 21. String Operations

- Join
- Split
- Replace
- Length
- Contains
- Substring
- Uppercase
- Lowercase

# 22. File System

- Create File
- Write File
- Read File
- Delete File
- List Files

Supported:

- SPIFFS
- LittleFS
- SD Card

# 23. RTOS

- Create Task
- Delete Task
- Suspend Task
- Resume Task
- Queue Send
- Queue Receive
- Semaphore

# 24. Debugging

- Serial Monitor
- Print Variable
- Log
- Error
- Warning
- Benchmark

# 25. Project Templates

- LED Blink
- Traffic Light
- Smart Home
- Fire Alarm
- Line Follower Robot
- Obstacle Avoidance Robot
- Bluetooth Car
- WiFi Car
- Smart Irrigation
- Weather Station
- Smart Dustbin
- Robotic Arm
- AI Camera
- Voice Assistant
- Home Automation
- Industrial Monitoring

## Architecture Recommendation

Target approximately 250–350 configurable blocks rather than thousands of individual blocks.

Use dropdowns, inline value editing, and hardware abstraction to support multiple boards and sensors through a unified block system.
