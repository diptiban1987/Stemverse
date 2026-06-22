/**
 * Phase 32B — Prompt Library
 *
 * 50+ example prompts grouped by category for the AI Circuit Assistant.
 */

import type { AICircuitCategory } from '../types';

export interface PromptExample {
  prompt: string;
  category: AICircuitCategory;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export const PROMPT_LIBRARY: PromptExample[] = [
  // ── Robotics (10) ──
  { prompt: 'Create a line follower robot using ESP32 and IR sensors', category: 'robotics', difficulty: 'intermediate' },
  { prompt: 'Build an obstacle avoiding robot with ultrasonic sensor', category: 'robotics', difficulty: 'intermediate' },
  { prompt: 'Design a robot arm with 3 servo motors', category: 'robotics', difficulty: 'advanced' },
  { prompt: 'Make a sumo wrestling robot with motor driver', category: 'robotics', difficulty: 'advanced' },
  { prompt: 'Create a remote controlled car using ESP32 and Bluetooth', category: 'robotics', difficulty: 'intermediate' },
  { prompt: 'Build a wall following robot', category: 'robotics', difficulty: 'advanced' },
  { prompt: 'Design a self-balancing robot with MPU6050', category: 'robotics', difficulty: 'advanced' },
  { prompt: 'Create a maze solving robot', category: 'robotics', difficulty: 'advanced' },
  { prompt: 'Make a robot that follows a moving object', category: 'robotics', difficulty: 'advanced' },
  { prompt: 'Build a pick and place robot', category: 'robotics', difficulty: 'advanced' },

  // ── IoT (10) ──
  { prompt: 'Create a weather station that shows temperature and humidity on OLED', category: 'iot', difficulty: 'intermediate' },
  { prompt: 'Build a smart home system with WiFi controlled relays', category: 'iot', difficulty: 'advanced' },
  { prompt: 'Design a health monitoring system with heart rate sensor', category: 'iot', difficulty: 'advanced' },
  { prompt: 'Create an air quality monitor with MQ-2 gas sensor', category: 'iot', difficulty: 'intermediate' },
  { prompt: 'Build a GPS tracker using ESP32', category: 'iot', difficulty: 'advanced' },
  { prompt: 'Make a smart doorbell with camera and WiFi notification', category: 'iot', difficulty: 'advanced' },
  { prompt: 'Create a remote temperature monitor with web dashboard', category: 'iot', difficulty: 'intermediate' },
  { prompt: 'Build a smart energy meter', category: 'iot', difficulty: 'advanced' },
  { prompt: 'Design a Bluetooth controlled LED strip', category: 'iot', difficulty: 'intermediate' },
  { prompt: 'Create a WiFi based attendance system using RFID', category: 'iot', difficulty: 'advanced' },

  // ── Electronics (10) ──
  { prompt: 'Create an LED blink project with ESP32', category: 'electronics', difficulty: 'beginner' },
  { prompt: 'Build a traffic light with 3 LEDs', category: 'electronics', difficulty: 'beginner' },
  { prompt: 'Make an LED chaser circuit', category: 'electronics', difficulty: 'beginner' },
  { prompt: 'Create a PWM LED brightness control', category: 'electronics', difficulty: 'beginner' },
  { prompt: 'Build an RGB LED color mixer', category: 'electronics', difficulty: 'beginner' },
  { prompt: 'Design a capacitive touch switch with LED', category: 'electronics', difficulty: 'beginner' },
  { prompt: 'Create a push button counter with display', category: 'electronics', difficulty: 'intermediate' },
  { prompt: 'Build a frequency generator', category: 'electronics', difficulty: 'intermediate' },
  { prompt: 'Make a voltage divider circuit with ADC reading', category: 'electronics', difficulty: 'beginner' },
  { prompt: 'Create an LED matrix display', category: 'electronics', difficulty: 'intermediate' },

  // ── Automation (10) ──
  { prompt: 'Create a smart dustbin using ultrasonic sensor and servo motor', category: 'automation', difficulty: 'intermediate' },
  { prompt: 'Build a smart irrigation system with soil moisture sensor', category: 'automation', difficulty: 'intermediate' },
  { prompt: 'Design an automatic street light using LDR', category: 'automation', difficulty: 'beginner' },
  { prompt: 'Create a fire alarm system with flame sensor and buzzer', category: 'automation', difficulty: 'beginner' },
  { prompt: 'Build a motion activated security alarm with PIR sensor', category: 'automation', difficulty: 'beginner' },
  { prompt: 'Make an automatic pet feeder with servo and timer', category: 'automation', difficulty: 'intermediate' },
  { prompt: 'Create an automated greenhouse controller', category: 'automation', difficulty: 'advanced' },
  { prompt: 'Build a smart parking system with IR sensors', category: 'automation', difficulty: 'intermediate' },
  { prompt: 'Design an automatic hand sanitizer dispenser', category: 'automation', difficulty: 'intermediate' },
  { prompt: 'Create an automatic door opener with ultrasonic sensor', category: 'automation', difficulty: 'intermediate' },

  // ── STEM Projects (5) ──
  { prompt: 'Build a seismograph using accelerometer', category: 'stem_project', difficulty: 'advanced' },
  { prompt: 'Create a plant growth monitor', category: 'stem_project', difficulty: 'intermediate' },
  { prompt: 'Build a water level indicator', category: 'stem_project', difficulty: 'beginner' },
  { prompt: 'Create a sound level meter', category: 'stem_project', difficulty: 'intermediate' },
  { prompt: 'Design a solar tracking system', category: 'stem_project', difficulty: 'advanced' },

  // ── Competition Projects (5) ──
  { prompt: 'Build a smart agriculture system for science fair', category: 'competition', difficulty: 'advanced' },
  { prompt: 'Create a drowsiness detection system for hackathon', category: 'competition', difficulty: 'advanced' },
  { prompt: 'Design a flood warning system for competition', category: 'competition', difficulty: 'intermediate' },
  { prompt: 'Build a blind assistance device for science fair', category: 'competition', difficulty: 'advanced' },
  { prompt: 'Create a smart helmet for road safety competition', category: 'competition', difficulty: 'advanced' },
];

/** Get all prompts */
export function getAllPrompts(): PromptExample[] {
  return [...PROMPT_LIBRARY];
}

/** Get prompts by category */
export function getPromptsByCategory(category: AICircuitCategory): PromptExample[] {
  return PROMPT_LIBRARY.filter(p => p.category === category);
}

/** Get prompts by difficulty */
export function getPromptsByDifficulty(difficulty: 'beginner' | 'intermediate' | 'advanced'): PromptExample[] {
  return PROMPT_LIBRARY.filter(p => p.difficulty === difficulty);
}

/** Search prompts by keyword */
export function searchPrompts(query: string): PromptExample[] {
  const lower = query.toLowerCase();
  return PROMPT_LIBRARY.filter(p => p.prompt.toLowerCase().includes(lower));
}

/** Get random prompts */
export function getRandomPrompts(count: number = 5): PromptExample[] {
  const shuffled = [...PROMPT_LIBRARY].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/** Total prompt count */
export const PROMPT_COUNT = PROMPT_LIBRARY.length;

/** Category labels for UI */
export const CATEGORY_LABELS: Record<AICircuitCategory, string> = {
  robotics: '🤖 Robotics',
  iot: '🌐 IoT',
  electronics: '⚡ Electronics',
  automation: '🏭 Automation',
  stem_project: '🔬 STEM Projects',
  competition: '🏆 Competition',
  custom: '✨ Custom',
};
