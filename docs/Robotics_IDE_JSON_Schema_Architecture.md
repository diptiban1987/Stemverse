# Robotics IDE Block JSON Schema & Architecture

## Core Block Structure

```json
{
  "id": "block_001",
  "type": "digital_write",
  "category": "Digital IO",
  "label": "Digital Write",
  "inputs": {
    "pin": 13,
    "value": "HIGH"
  },
  "outputs": [],
  "next": "block_002",
  "metadata": {
    "version": "1.0",
    "board_support": ["ESP32", "Arduino", "STM32"]
  }
}
```

---

# Workspace Schema

```json
{
  "project_id": "project_001",
  "name": "Fire Alarm",
  "board": "ESP32",
  "language": "arduino_cpp",
  "blocks": [],
  "variables": [],
  "functions": [],
  "libraries": []
}
```

---

# Category Schema

```json
{
  "id": "sensor",
  "name": "Sensors",
  "icon": "sensor",
  "color": "#4CAF50",
  "blocks": []
}
```

---

# Generic Pin Block

```json
{
  "type": "configure_pin",
  "fields": {
    "pin": 13,
    "mode": "OUTPUT"
  }
}
```

Supported Modes:

- INPUT
- OUTPUT
- INPUT_PULLUP
- INPUT_PULLDOWN
- PWM
- ANALOG
- TOUCH

---

# Generic Sensor Block

```json
{
  "type": "read_sensor",
  "fields": {
    "sensor": "DHT22",
    "property": "temperature",
    "pin": 4
  }
}
```

---

# Generic Motor Block

```json
{
  "type": "motor_control",
  "fields": {
    "motor_type": "DC",
    "direction": "FORWARD",
    "speed": 255
  }
}
```

---

# Block Definition Schema

```json
{
  "type": "digital_write",
  "label": "Digital Write",
  "category": "Digital IO",
  "icon": "zap",
  "inputs": [
    {
      "name": "pin",
      "type": "number"
    },
    {
      "name": "value",
      "type": "dropdown",
      "options": ["HIGH", "LOW"]
    }
  ]
}
```

---

# Generator Architecture

## Layer 1

Visual Blocks

↓

## Layer 2

Intermediate Representation (IR)

```json
{
  "operation": "digital_write",
  "pin": 13,
  "value": "HIGH"
}
```

↓

## Layer 3

Code Generators

- Arduino C++
- ESP-IDF
- MicroPython
- CircuitPython
- STM32 HAL
- ROS2 Python

↓

Generated Source Code

---

# Hardware Abstraction Layer

```json
{
  "board": "ESP32",
  "capabilities": {
    "wifi": true,
    "bluetooth": true,
    "adc": true,
    "dac": true
  }
}
```

---

# Plugin System

Each plugin contains:

```json
{
  "plugin_name": "HC-SR04",
  "version": "1.0",
  "blocks": [],
  "generator": [],
  "libraries": []
}
```

---

# Database Tables

## Boards

- id
- name
- architecture
- capabilities

## Sensors

- id
- name
- category
- protocol

## Blocks

- id
- type
- category
- schema

## Projects

- id
- user_id
- name
- workspace_json

## Templates

- id
- title
- category
- workspace_json

---

# Recommended Folder Structure

```text
src/

├── blocks/
├── generators/
├── boards/
├── sensors/
├── actuators/
├── plugins/
├── simulator/
├── templates/
├── workspace/
├── database/
└── api/
```

---

# Long-Term Roadmap

Phase 1
- Blockly Workspace
- Arduino Generator
- ESP32 Support

Phase 2
- Sensor Marketplace
- Plugin Manager
- Project Templates

Phase 3
- Visual Simulator
- AI Code Assistant
- Cloud Compilation

Phase 4
- ROS2
- Digital Twin
- Industrial Automation

Phase 5
- Commercial Robotics Ecosystem
- Community Marketplace
- Enterprise Deployment
