# STEMVerse_Implementation_Bible_v1
## Single Source of Truth for Building the Entire Platform

### Purpose
This document is the master specification to hand to an AI coding agent or engineering team to build STEMVerse.

---

# 1. PRODUCT VISION

A unified ecosystem where users progress through:

Scratch → Robotics → IoT → AI → ROS2 → Industrial Automation

Core Modules:
- Scratch Studio
- Robotics Studio
- IoT Studio
- AI Studio
- ROS2 Studio
- Industrial Studio
- Simulator
- Marketplace
- Academy (LMS)
- Community

---

# 2. TECH STACK

Frontend:
- Next.js 16+
- React
- TypeScript
- Tailwind CSS
- Zustand
- React Query
- Blockly
- Scratch VM
- Three.js

Backend:
- NestJS
- PostgreSQL
- Redis
- WebSocket

Infra:
- Docker
- Kubernetes
- GitHub Actions

---

# 3. MONOREPO STRUCTURE

apps/
- web
- docs
- academy

packages/
- ui
- blockly-engine
- scratch-engine
- simulator
- ai
- sdk
- database

services/
- auth
- projects
- compiler
- simulator
- marketplace
- analytics
- billing

---

# 4. DESIGN SYSTEM

Default Theme: Light

Primary: #2563EB
Secondary: #7C3AED
Accent: #06B6D4

Fonts:
- Inter
- Poppins
- JetBrains Mono

Support:
- Light Theme
- Dark Theme
- Accessibility AA

---

# 5. LANDING PAGE

Sections:
1 Hero
2 Features
3 Learning Path
4 Simulator Demo
5 Courses
6 Marketplace
7 Pricing
8 Testimonials
9 Footer

Hero Typing Animation:
- Build Robots
- Create AI
- Learn Future Skills
- Engineer the Future

---

# 6. USER ROLES

Guest
Student
Teacher
School Admin
Marketplace Creator
Enterprise Admin
Platform Admin

---

# 7. DATABASE TABLES

users
organizations
schools
teachers
students
projects
workspaces
courses
lessons
assessments
certificates
boards
sensors
plugins
marketplace_items
subscriptions
analytics

---

# 8. BLOCKLY SYSTEM

Categories:
- Logic
- Loops
- Math
- Variables
- Functions
- Pins
- Sensors
- Actuators
- Robotics
- AI
- Communication
- Cloud
- Filesystem
- RTOS
- Debug

Output Targets:
- Arduino
- ESP-IDF
- MicroPython
- CircuitPython
- ROS2

---

# 9. SCRATCH INTEGRATION

Scratch VM
→ Custom Hardware Extensions
→ Blockly Bridge
→ Hardware Layer

Users can migrate from Scratch projects into Blockly projects.

---

# 10. ROBOTICS SUPPORT

Boards:
- ESP32
- ESP32-S3
- ESP8266
- Arduino
- STM32
- RP2040

Sensors:
- DHT
- MQ
- PIR
- HC-SR04
- MPU6050
- GPS
- OLED
- LCD

Plugin Architecture for unlimited expansion.

---

# 11. SIMULATOR

Virtual:
- ESP32
- Arduino
- Sensors
- Motors
- Displays

Engine:
- Three.js
- WebAssembly

Future:
- Full 3D Robotics
- Digital Twin

---

# 12. AI FEATURES

Explain Block
Generate Code
Text To Blocks
Text To Project
Project Optimizer
Robotics Copilot

---

# 13. LMS

Courses
Lessons
Assignments
Quizzes
Certificates

Tracks:
- Scratch
- Robotics
- IoT
- AI
- ROS2
- Industrial

---

# 14. MARKETPLACE

Project Marketplace
Course Marketplace
Plugin Marketplace
Hardware Marketplace

Revenue Share Supported.

---

# 15. API STANDARDS

REST:
/api/auth
/api/projects
/api/courses
/api/marketplace

Realtime:
/ws/collaboration
/ws/simulator

---

# 16. SECURITY

JWT
OAuth
SSO
RBAC
Audit Logs
Encryption

---

# 17. DEVOPS

Docker
Kubernetes
CI/CD
Prometheus
Grafana

---

# 18. COMMERCIAL PLANS

Free
Pro
Education
Enterprise

---

# 19. MVP

Scratch Studio
Blockly Robotics
ESP32 Support
Arduino Support
AI Assistant

---

# 20. SUCCESS CRITERIA

- 100+ Boards
- 500+ Sensors
- 300+ Configurable Blocks
- School LMS
- Marketplace
- Simulator
- AI Assistant

---

# FINAL BUILD INSTRUCTION FOR AI

Build a production-grade multi-tenant SaaS platform using Next.js, NestJS, PostgreSQL, Blockly, Scratch VM, and Three.js. The architecture must support Scratch education, robotics programming, IoT, AI, ROS2, industrial automation, LMS, marketplace, simulator, and enterprise deployments from a single codebase.
