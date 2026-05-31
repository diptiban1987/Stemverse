
# STEMVerse Enterprise Handoff Bible v2
## Extended Engineering Specification

This document extends v1 with implementation-level guidance.

# SECTION 1: DATABASE SCHEMA

## users
- id UUID PK
- email UNIQUE
- password_hash
- role
- organization_id
- created_at

## organizations
- id UUID PK
- name
- plan
- created_at

## projects
- id UUID PK
- owner_id
- workspace_json
- board_type
- visibility

## courses
- id UUID PK
- title
- slug
- category
- level

## lessons
- id UUID PK
- course_id
- title
- content_md

## certificates
- id UUID PK
- user_id
- course_id

# SECTION 2: TYPESCRIPT INTERFACES

```ts
interface User {
  id:string;
  email:string;
  role:string;
}

interface Project {
  id:string;
  name:string;
  workspace:any;
}
```

# SECTION 3: NEXT.JS APP STRUCTURE

apps/web
- app/
- components/
- features/
- lib/
- hooks/

features/
- scratch
- robotics
- simulator
- ai
- marketplace
- academy

# SECTION 4: BLOCKLY ENGINE

Categories:
- Logic
- Loops
- Math
- Variables
- Pins
- Sensors
- Actuators
- Robotics
- AI

Pipeline:

Blockly -> IR -> Generator -> Code

# SECTION 5: BLOCK SPECIFICATION

Configure Pin
Digital Write
Digital Read
PWM
Servo
Motor
Sensor Read
WiFi Connect
MQTT Publish
HTTP Request

All blocks support:
- inline editing
- validation
- board capability checks

# SECTION 6: UI COMPONENT LIBRARY

Core:
- Button
- Card
- Modal
- Drawer
- Tabs
- Table
- DataGrid
- Command Palette

Theme:
- Light default
- Dark optional

# SECTION 7: PAGE INVENTORY

Public:
- Home
- Pricing
- Courses
- Marketplace
- Docs

Authenticated:
- Dashboard
- Projects
- Scratch Studio
- Robotics Studio
- Simulator

# SECTION 8: SIMULATOR

Components:
- ESP32
- Arduino
- LED
- Buzzer
- Servo
- DHT22
- HC-SR04

Engine:
- WebAssembly
- Three.js

# SECTION 9: AI FEATURES

- Text to Blocks
- Text to Project
- Explain Project
- Generate Wiring
- Debug Assistant

# SECTION 10: LMS

Tracks:
- Scratch
- Robotics
- IoT
- AI
- ROS2
- Industrial

# SECTION 11: MARKETPLACE SDK

plugin.json

Contains:
- metadata
- blocks
- generators
- simulator adapters

# SECTION 12: SECURITY

- JWT
- OAuth
- RBAC
- Audit Logs
- Rate Limiting

# SECTION 13: DEVOPS

- Docker
- Kubernetes
- GitHub Actions
- PostgreSQL
- Redis

# FINAL IMPLEMENTATION ORDER

Phase 1:
Scratch + Blockly + ESP32

Phase 2:
Academy + Marketplace

Phase 3:
Simulator

Phase 4:
AI

Phase 5:
ROS2

Phase 6:
Industrial Automation

This file should be used together with STEMVerse_Implementation_Bible_v1 as the engineering handoff package.
