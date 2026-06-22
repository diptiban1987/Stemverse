/**
 * Phase 32B — Circuit Template Runtime
 *
 * Provides 10+ starter circuit templates for common STEM projects.
 * Templates include component lists, pin mappings, and Blockly stubs.
 */

import type { AICircuitTemplateModel, AICircuitCategory } from '../types';

// ─── Helpers ────────────────────────────────────────────────

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

// ─── Template Definitions ───────────────────────────────────

function tmpl(
  name: string, description: string, category: AICircuitCategory,
  difficulty: 'beginner' | 'intermediate' | 'advanced',
  components: string[], sensors: string[], actuators: string[],
  boardType: string, pinMappings: Record<string, string>,
  blocklyStub: string, tags: string[], popularity: number,
): AICircuitTemplateModel {
  return {
    templateId: generateId(), name, description, category, difficulty,
    components, sensors, actuators, boardType, pinMappings, blocklyStub,
    tags, popularity,
  };
}

/** All built-in starter templates */
export const CIRCUIT_TEMPLATES: AICircuitTemplateModel[] = [
  tmpl('ESP32 Blink', 'Basic LED blink using ESP32 built-in LED', 'electronics', 'beginner',
    ['ESP32 DevKit V1', 'LED', 'Resistor 220Ω', 'Breadboard'], [], ['LED'],
    'ESP32 DevKit V1', { 'LED': 'GPIO2' },
    'void setup(){pinMode(2,OUTPUT);}void loop(){digitalWrite(2,HIGH);delay(500);digitalWrite(2,LOW);delay(500);}',
    ['blink', 'led', 'beginner', 'esp32'], 100),

  tmpl('HC-SR04 Distance Meter', 'Ultrasonic distance measurement with serial output', 'electronics', 'beginner',
    ['ESP32 DevKit V1', 'HC-SR04', 'Breadboard'], ['HC-SR04'], [],
    'ESP32 DevKit V1', { 'TRIG': 'GPIO5', 'ECHO': 'GPIO18' },
    'void setup(){Serial.begin(115200);pinMode(5,OUTPUT);pinMode(18,INPUT);}void loop(){digitalWrite(5,LOW);delayMicroseconds(2);digitalWrite(5,HIGH);delayMicroseconds(10);digitalWrite(5,LOW);long d=pulseIn(18,HIGH);Serial.println(d*0.034/2);delay(200);}',
    ['ultrasonic', 'distance', 'sensor', 'hcsr04'], 92),

  tmpl('Smart Dustbin', 'Automatic lid opens when hand detected using ultrasonic sensor and servo', 'automation', 'intermediate',
    ['ESP32 DevKit V1', 'HC-SR04', 'SG90 Servo', 'Breadboard'], ['HC-SR04'], ['SG90 Servo'],
    'ESP32 DevKit V1', { 'TRIG': 'GPIO5', 'ECHO': 'GPIO18', 'SERVO': 'GPIO13' },
    'void setup(){pinMode(5,OUTPUT);pinMode(18,INPUT);/* servo attach */}void loop(){/* measure distance, if <20cm open lid */delay(100);}',
    ['smart', 'dustbin', 'trash', 'servo', 'ultrasonic', 'automation'], 95),

  tmpl('Line Follower Robot', 'Two IR sensors follow a black line on white surface', 'robotics', 'intermediate',
    ['ESP32 DevKit V1', 'IR Line Sensor', 'IR Line Sensor', 'L298N Motor Driver', 'DC Motor', 'DC Motor', 'Breadboard'],
    ['IR Line Sensor', 'IR Line Sensor'], ['DC Motor', 'DC Motor'],
    'ESP32 DevKit V1', { 'LEFT_IR': 'GPIO34', 'RIGHT_IR': 'GPIO35', 'MOTOR_A1': 'GPIO25', 'MOTOR_A2': 'GPIO26', 'MOTOR_B1': 'GPIO27', 'MOTOR_B2': 'GPIO14' },
    'void setup(){/* setup motor pins */}void loop(){/* read IR sensors, steer motors */delay(10);}',
    ['robot', 'line', 'follower', 'ir', 'motor', 'competition'], 90),

  tmpl('Obstacle Avoider Robot', 'Ultrasonic sensor avoids obstacles autonomously', 'robotics', 'intermediate',
    ['ESP32 DevKit V1', 'HC-SR04', 'SG90 Servo', 'L298N Motor Driver', 'DC Motor', 'DC Motor', 'Breadboard'],
    ['HC-SR04'], ['SG90 Servo', 'DC Motor', 'DC Motor'],
    'ESP32 DevKit V1', { 'TRIG': 'GPIO5', 'ECHO': 'GPIO18', 'SERVO': 'GPIO13', 'MOTOR_A1': 'GPIO25', 'MOTOR_A2': 'GPIO26' },
    'void setup(){/* setup pins */}void loop(){/* scan, avoid obstacles */delay(50);}',
    ['robot', 'obstacle', 'avoidance', 'ultrasonic', 'autonomous'], 88),

  tmpl('Smart Irrigation System', 'Soil moisture sensor controls water pump via relay', 'automation', 'intermediate',
    ['ESP32 DevKit V1', 'Soil Moisture Sensor', 'Relay Module', 'Water Pump', 'Breadboard'],
    ['Soil Moisture Sensor'], ['Relay Module', 'Water Pump'],
    'ESP32 DevKit V1', { 'SOIL': 'GPIO34', 'RELAY': 'GPIO26' },
    'void setup(){pinMode(34,INPUT);pinMode(26,OUTPUT);}void loop(){int m=analogRead(34);if(m<500)digitalWrite(26,HIGH);else digitalWrite(26,LOW);delay(1000);}',
    ['irrigation', 'smart', 'garden', 'soil', 'water', 'pump', 'relay'], 85),

  tmpl('Smart Street Light', 'LDR detects darkness and turns on LED street light', 'automation', 'beginner',
    ['ESP32 DevKit V1', 'LDR', 'LED', 'Resistor 220Ω', 'Resistor 10kΩ', 'Breadboard'],
    ['LDR'], ['LED'],
    'ESP32 DevKit V1', { 'LDR': 'GPIO34', 'LED': 'GPIO2' },
    'void setup(){pinMode(34,INPUT);pinMode(2,OUTPUT);}void loop(){int l=analogRead(34);if(l<500)digitalWrite(2,HIGH);else digitalWrite(2,LOW);delay(500);}',
    ['street', 'light', 'ldr', 'automatic', 'smart'], 80),

  tmpl('Fire Alarm System', 'Flame sensor detects fire and triggers buzzer alarm', 'automation', 'beginner',
    ['ESP32 DevKit V1', 'Flame Sensor', 'Buzzer', 'LED', 'Breadboard'],
    ['Flame Sensor'], ['Buzzer', 'LED'],
    'ESP32 DevKit V1', { 'FLAME': 'GPIO34', 'BUZZER': 'GPIO25', 'LED': 'GPIO2' },
    'void setup(){pinMode(34,INPUT);pinMode(25,OUTPUT);pinMode(2,OUTPUT);}void loop(){if(digitalRead(34)==LOW){digitalWrite(25,HIGH);digitalWrite(2,HIGH);}else{digitalWrite(25,LOW);digitalWrite(2,LOW);}delay(100);}',
    ['fire', 'alarm', 'flame', 'buzzer', 'safety'], 82),

  tmpl('Weather Station', 'DHT11 temperature/humidity with OLED display', 'iot', 'intermediate',
    ['ESP32 DevKit V1', 'DHT11', 'OLED Display', 'Breadboard'],
    ['DHT11'], ['OLED Display'],
    'ESP32 DevKit V1', { 'DHT': 'GPIO4', 'SDA': 'GPIO21', 'SCL': 'GPIO22' },
    'void setup(){Serial.begin(115200);/* init DHT, init OLED */}void loop(){/* read temp/humidity, display on OLED */delay(2000);}',
    ['weather', 'temperature', 'humidity', 'dht11', 'oled', 'display'], 78),

  tmpl('Home Automation', 'Control 4 relays via WiFi for smart home', 'iot', 'advanced',
    ['ESP32 DevKit V1', 'Relay Module', 'Relay Module', 'Relay Module', 'Relay Module', 'Breadboard'],
    [], ['Relay Module', 'Relay Module', 'Relay Module', 'Relay Module'],
    'ESP32 DevKit V1', { 'RELAY1': 'GPIO25', 'RELAY2': 'GPIO26', 'RELAY3': 'GPIO27', 'RELAY4': 'GPIO14' },
    'void setup(){WiFi.begin("ssid","pass");/* setup relays */}void loop(){/* handle web requests */delay(10);}',
    ['home', 'automation', 'wifi', 'relay', 'smart', 'iot'], 75),

  tmpl('Traffic Light Controller', 'Simulates a traffic light with 3 LEDs and timed sequence', 'stem_project', 'beginner',
    ['ESP32 DevKit V1', 'LED', 'LED', 'LED', 'Resistor 220Ω', 'Resistor 220Ω', 'Resistor 220Ω', 'Breadboard'],
    [], ['LED', 'LED', 'LED'],
    'ESP32 DevKit V1', { 'RED': 'GPIO25', 'YELLOW': 'GPIO26', 'GREEN': 'GPIO27' },
    'void setup(){pinMode(25,OUTPUT);pinMode(26,OUTPUT);pinMode(27,OUTPUT);}void loop(){digitalWrite(27,HIGH);delay(5000);digitalWrite(27,LOW);digitalWrite(26,HIGH);delay(2000);digitalWrite(26,LOW);digitalWrite(25,HIGH);delay(5000);digitalWrite(25,LOW);}',
    ['traffic', 'light', 'led', 'sequence', 'stem'], 70),

  tmpl('Motion Alarm', 'PIR sensor detects motion and triggers buzzer + LED', 'automation', 'beginner',
    ['ESP32 DevKit V1', 'PIR Sensor', 'Buzzer', 'LED', 'Breadboard'],
    ['PIR Sensor'], ['Buzzer', 'LED'],
    'ESP32 DevKit V1', { 'PIR': 'GPIO13', 'BUZZER': 'GPIO25', 'LED': 'GPIO2' },
    'void setup(){pinMode(13,INPUT);pinMode(25,OUTPUT);pinMode(2,OUTPUT);}void loop(){if(digitalRead(13)==HIGH){digitalWrite(25,HIGH);digitalWrite(2,HIGH);}else{digitalWrite(25,LOW);digitalWrite(2,LOW);}delay(200);}',
    ['pir', 'motion', 'alarm', 'security', 'buzzer'], 72),
];

// ─── Template Functions ─────────────────────────────────────

/** Get all built-in templates */
export function getAllTemplates(): AICircuitTemplateModel[] {
  return deepCopy(CIRCUIT_TEMPLATES);
}

/** Get templates by category */
export function getTemplatesByCategory(category: AICircuitCategory): AICircuitTemplateModel[] {
  return deepCopy(CIRCUIT_TEMPLATES.filter(t => t.category === category));
}

/** Get templates by difficulty */
export function getTemplatesByDifficulty(difficulty: 'beginner' | 'intermediate' | 'advanced'): AICircuitTemplateModel[] {
  return deepCopy(CIRCUIT_TEMPLATES.filter(t => t.difficulty === difficulty));
}

/** Search templates by keyword */
export function searchTemplates(query: string): AICircuitTemplateModel[] {
  const lower = query.toLowerCase();
  return deepCopy(CIRCUIT_TEMPLATES.filter(t =>
    t.name.toLowerCase().includes(lower) ||
    t.description.toLowerCase().includes(lower) ||
    t.tags.some(tag => tag.includes(lower)),
  ));
}

/** Get a template by ID */
export function getTemplateById(templateId: string): AICircuitTemplateModel | null {
  const found = CIRCUIT_TEMPLATES.find(t => t.templateId === templateId);
  return found ? deepCopy(found) : null;
}

/** Find the best matching template for a prompt */
export function matchTemplate(prompt: string): AICircuitTemplateModel | null {
  const lower = prompt.toLowerCase();
  let bestMatch: AICircuitTemplateModel | null = null;
  let bestScore = 0;

  for (const template of CIRCUIT_TEMPLATES) {
    let score = 0;
    for (const tag of template.tags) {
      if (lower.includes(tag)) score += 2;
    }
    if (lower.includes(template.name.toLowerCase())) score += 5;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = template;
    }
  }

  return bestMatch && bestScore >= 2 ? deepCopy(bestMatch) : null;
}

/** Get sorted templates by popularity */
export function getPopularTemplates(limit: number = 5): AICircuitTemplateModel[] {
  return deepCopy(
    [...CIRCUIT_TEMPLATES].sort((a, b) => b.popularity - a.popularity).slice(0, limit),
  );
}

/** Validate a template */
export function validateTemplate(
  template: unknown,
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!template || typeof template !== 'object') {
    warnings.push('[Phase 32B Template] Template is null or not an object.');
    console.warn(warnings[warnings.length - 1]);
    return { valid: false, warnings };
  }
  const t = template as Record<string, unknown>;
  if (typeof t.templateId !== 'string' || !t.templateId) {
    warnings.push('[Phase 32B Template] Template has empty templateId.');
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof t.name !== 'string' || !t.name) {
    warnings.push('[Phase 32B Template] Template has empty name.');
    console.warn(warnings[warnings.length - 1]);
  }
  return { valid: warnings.length === 0, warnings };
}

/** Total template count */
export const TEMPLATE_COUNT = CIRCUIT_TEMPLATES.length;
