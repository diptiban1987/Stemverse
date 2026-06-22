/**
 * Phase 41A — AI Mentor Runtime
 *
 * Provides AI-powered explanations, hints, code review, and learning path generation.
 * Covers: Circuit review, Blockly review, Arduino review, Project review, Error explanations.
 */

// ─── Types ─────────────────────────────────────────────────────

export type MentorTopicCategory =
  | 'circuit' | 'blockly' | 'arduino' | 'sensor' | 'component'
  | 'error' | 'robotics' | 'competition' | 'general';

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type SafetyRating = 'safe' | 'caution' | 'danger';
export type ReviewSeverity = 'info' | 'suggestion' | 'warning' | 'critical';

export interface MentorExplanation {
  readonly id: string;
  readonly topic: string;
  readonly category: MentorTopicCategory;
  readonly difficulty: DifficultyLevel;
  readonly explanation: string;
  readonly keyPoints: string[];
  readonly examples: string[];
  readonly nextSteps: string[];
  readonly relatedTopics: string[];
  readonly createdAt: number;
}

export interface MentorHint {
  readonly id: string;
  readonly contextId: string;
  readonly hint: string;
  readonly severity: ReviewSeverity;
  readonly actionable: boolean;
  readonly relatedConcept: string;
}

export interface LearningPathStep {
  readonly stepId: string;
  readonly title: string;
  readonly description: string;
  readonly difficulty: DifficultyLevel;
  readonly estimatedMinutes: number;
  readonly prerequisites: string[];
  readonly skills: string[];
  readonly completed: boolean;
}

export interface LearningPath {
  readonly pathId: string;
  readonly userId: string;
  readonly title: string;
  readonly description: string;
  readonly steps: LearningPathStep[];
  readonly currentStepIndex: number;
  readonly totalEstimatedMinutes: number;
  readonly completedSteps: number;
  readonly createdAt: number;
}

export interface CircuitReview {
  readonly reviewId: string;
  readonly circuitId: string;
  readonly qualityScore: number;
  readonly safetyRating: SafetyRating;
  readonly issues: CircuitIssue[];
  readonly optimizations: string[];
  readonly missingComponents: string[];
  readonly powerAnalysis: PowerAnalysis;
  readonly wiringAnalysis: WiringAnalysis;
  readonly createdAt: number;
}

export interface CircuitIssue {
  readonly issueId: string;
  readonly severity: ReviewSeverity;
  readonly component: string;
  readonly description: string;
  readonly suggestion: string;
}

export interface PowerAnalysis {
  readonly totalCurrentDraw: number;
  readonly maxVoltage: number;
  readonly powerBudgetOk: boolean;
  readonly warnings: string[];
}

export interface WiringAnalysis {
  readonly totalWires: number;
  readonly redundantWires: number;
  readonly missingConnections: number;
  readonly crossingWires: number;
  readonly neatnessScore: number;
}

export interface BlocklyReview {
  readonly reviewId: string;
  readonly projectId: string;
  readonly logicScore: number;
  readonly performanceScore: number;
  readonly bugs: BlocklyBug[];
  readonly optimizations: string[];
  readonly educationalNotes: string[];
  readonly createdAt: number;
}

export interface BlocklyBug {
  readonly bugId: string;
  readonly severity: ReviewSeverity;
  readonly blockType: string;
  readonly description: string;
  readonly suggestion: string;
}

export interface ProjectReview {
  readonly reviewId: string;
  readonly projectId: string;
  readonly overallScore: number;
  readonly innovationScore: number;
  readonly robothronScore: number;
  readonly completenessScore: number;
  readonly documentationScore: number;
  readonly presentationSuggestions: string[];
  readonly documentationSuggestions: string[];
  readonly createdAt: number;
}

export interface TeacherAIAssistant {
  readonly assistantId: string;
  readonly teacherId: string;
  readonly generatedAssignments: GeneratedAssignment[];
  readonly generatedRubrics: GeneratedRubric[];
  readonly generatedQuestions: GeneratedQuestion[];
  readonly studentRiskAlerts: StudentRiskAlert[];
  readonly classroomInsights: ClassroomInsight[];
}

export interface GeneratedAssignment {
  readonly assignmentId: string;
  readonly title: string;
  readonly description: string;
  readonly difficulty: DifficultyLevel;
  readonly objectives: string[];
  readonly estimatedMinutes: number;
  readonly rubricId: string;
}

export interface GeneratedRubric {
  readonly rubricId: string;
  readonly title: string;
  readonly criteria: RubricCriteria[];
  readonly maxScore: number;
}

export interface RubricCriteria {
  readonly name: string;
  readonly description: string;
  readonly maxPoints: number;
  readonly levels: string[];
}

export interface GeneratedQuestion {
  readonly questionId: string;
  readonly question: string;
  readonly type: 'multiple_choice' | 'short_answer' | 'practical';
  readonly difficulty: DifficultyLevel;
  readonly topic: string;
  readonly correctAnswer: string;
  readonly distractors: string[];
}

export interface StudentRiskAlert {
  readonly alertId: string;
  readonly studentId: string;
  readonly riskLevel: 'low' | 'medium' | 'high';
  readonly reason: string;
  readonly recommendation: string;
  readonly detectedAt: number;
}

export interface ClassroomInsight {
  readonly insightId: string;
  readonly type: 'performance' | 'engagement' | 'progress' | 'recommendation';
  readonly title: string;
  readonly description: string;
  readonly actionable: boolean;
  readonly priority: number;
}

// ─── Helpers ──────────────────────────────────────────────────

let _seq = 0;
function uid(): string { return `mentor_${Date.now()}_${++_seq}`; }
const now = () => Date.now();

// ─── Knowledge Base ───────────────────────────────────────────

const COMPONENT_EXPLANATIONS: Record<string, { explanation: string; keyPoints: string[]; examples: string[] }> = {
  led: {
    explanation: 'An LED (Light Emitting Diode) emits light when current flows through it in the forward direction. LEDs require a current-limiting resistor to prevent burnout.',
    keyPoints: ['Always use a current-limiting resistor', 'LEDs are polarity-sensitive (anode +, cathode −)', 'Typical forward voltage: 1.8V–3.3V', 'Typical current: 20mA'],
    examples: ['Simple LED circuit with 220Ω resistor', 'Traffic light with 3 LEDs', 'LED blink with Arduino'],
  },
  resistor: {
    explanation: 'A resistor limits current flow in a circuit. Resistance is measured in Ohms (Ω). Use Ohm\'s Law: V = I × R to calculate required resistance.',
    keyPoints: ['Color bands indicate resistance value', 'Power rating matters for safety', 'Ohm\'s Law: V = IR', 'Series: R_total = R1 + R2'],
    examples: ['Current-limiting for LED', 'Voltage divider', 'Pull-up/pull-down resistor'],
  },
  capacitor: {
    explanation: 'A capacitor stores electrical energy in an electric field. Used for filtering, timing, and energy storage.',
    keyPoints: ['Capacitance measured in Farads (F)', 'Electrolytic caps are polarized', 'Blocks DC, passes AC', 'Stores energy: E = ½CV²'],
    examples: ['Decoupling capacitor near IC', 'RC timing circuit', 'Power supply smoothing'],
  },
  sensor_ultrasonic: {
    explanation: 'An ultrasonic sensor (like HC-SR04) measures distance by emitting ultrasonic pulses and measuring echo time. Distance = (time × speed_of_sound) / 2.',
    keyPoints: ['Range: 2cm–400cm', 'Trigger: 10µs HIGH pulse', 'Echo: pulse width = round-trip time', 'Speed of sound: 343 m/s'],
    examples: ['Obstacle detection robot', 'Parking sensor', 'Distance meter display'],
  },
  servo: {
    explanation: 'A servo motor rotates to a specific angle based on a PWM signal. Standard servos rotate 0°–180°, continuous rotation servos spin freely.',
    keyPoints: ['PWM signal: 1ms–2ms pulse width', 'Standard: 0°–180° range', 'Typical voltage: 4.8V–6V', 'Needs separate power for high-torque'],
    examples: ['Robot arm joint', 'Pan-tilt camera', 'Door lock mechanism'],
  },
  motor_dc: {
    explanation: 'A DC motor converts electrical energy to rotational motion. Speed is proportional to voltage, and direction reverses with polarity.',
    keyPoints: ['Use motor driver (L298N/L293D)', 'Never connect directly to microcontroller', 'PWM controls speed', 'H-bridge controls direction'],
    examples: ['Robot wheels (differential drive)', 'Fan', 'Conveyor belt'],
  },
  esp32: {
    explanation: 'The ESP32 is a powerful microcontroller with WiFi and Bluetooth. It has 30+ GPIO pins, ADC, DAC, PWM, I2C, SPI, and UART interfaces.',
    keyPoints: ['3.3V logic (NOT 5V tolerant)', 'Dual-core processor @ 240MHz', 'Built-in WiFi + Bluetooth', '520KB SRAM, 4MB Flash'],
    examples: ['IoT sensor node', 'Robot controller', 'Smart home device'],
  },
};

const SENSOR_EXPLANATIONS: Record<string, { explanation: string; keyPoints: string[] }> = {
  hcsr04: { explanation: 'HC-SR04 ultrasonic distance sensor. Measures 2–400cm using sound waves.', keyPoints: ['Trigger pin: send 10µs pulse', 'Echo pin: read pulse duration', 'Distance = duration × 0.034 / 2 cm'] },
  ir: { explanation: 'Infrared sensor detects objects or lines by reflecting IR light.', keyPoints: ['Digital output: 0 or 1', 'Analog output: distance proportional', 'Range: 2–30cm typical'] },
  ldr: { explanation: 'Light Dependent Resistor changes resistance based on light intensity.', keyPoints: ['Dark: high resistance (MΩ)', 'Light: low resistance (kΩ)', 'Use voltage divider circuit'] },
  dht11: { explanation: 'DHT11 measures temperature (0–50°C) and humidity (20–90%).', keyPoints: ['Digital single-wire protocol', '1 reading per second max', 'Accuracy: ±2°C, ±5% RH'] },
  mpu6050: { explanation: 'MPU-6050 is a 6-axis accelerometer + gyroscope for motion sensing.', keyPoints: ['I2C interface (address 0x68)', '3-axis acceleration + 3-axis rotation', 'Used for balance, tilt, gesture detection'] },
};

const ERROR_EXPLANATIONS: Record<string, { explanation: string; fix: string }> = {
  short_circuit: { explanation: 'A short circuit occurs when current flows through a path of near-zero resistance, bypassing the intended load.', fix: 'Add appropriate resistance in the circuit path. Check for unintended wire connections.' },
  no_power: { explanation: 'The circuit has no power source connected, so no current can flow.', fix: 'Connect a battery or power supply to the circuit. Verify polarity.' },
  floating_pin: { explanation: 'A floating pin is an input pin not connected to either HIGH or LOW, causing unpredictable readings.', fix: 'Add a pull-up or pull-down resistor to the input pin.' },
  overcurrent: { explanation: 'Too much current is flowing through a component, which may damage it.', fix: 'Add or increase the value of current-limiting resistors.' },
  reverse_polarity: { explanation: 'A polarized component (LED, electrolytic capacitor) is connected backwards.', fix: 'Check component orientation. Anode (+) to higher potential, cathode (−) to lower.' },
  missing_ground: { explanation: 'The circuit is missing a ground (GND) connection, preventing current from completing the loop.', fix: 'Connect the ground rail to the power supply ground.' },
  compilation_error: { explanation: 'The code has syntax or type errors that prevent it from compiling.', fix: 'Check for missing semicolons, brackets, or type mismatches. Read the error message carefully.' },
  runtime_error: { explanation: 'The code compiled but crashed during execution due to a logic error.', fix: 'Add serial prints to debug. Check array bounds, null pointers, and infinite loops.' },
};

// ─── Core Functions ────────────────────────────────────────────

export function explainCircuit(components: string[], connections: number): MentorExplanation {
  const points: string[] = [];
  const examples: string[] = [];
  for (const comp of components) {
    const info = COMPONENT_EXPLANATIONS[comp.toLowerCase()];
    if (info) { points.push(...info.keyPoints.slice(0, 2)); examples.push(...info.examples.slice(0, 1)); }
  }
  return {
    id: uid(), topic: `Circuit with ${components.length} components`, category: 'circuit',
    difficulty: components.length > 5 ? 'advanced' : components.length > 2 ? 'intermediate' : 'beginner',
    explanation: `This circuit uses ${components.join(', ')} connected via ${connections} wires. ${points.length > 0 ? points[0] : 'Each component serves a specific purpose.'}`,
    keyPoints: points.length > 0 ? points : ['Understand each component\'s function', 'Verify connections are correct'],
    examples: examples.length > 0 ? examples : ['Try building this circuit step by step'],
    nextSteps: ['Test the circuit', 'Add more components', 'Connect to Arduino'],
    relatedTopics: components.map(c => `How ${c} works`),
    createdAt: now(),
  };
}

export function explainBlockly(blockTypes: string[], blockCount: number): MentorExplanation {
  const difficulty: DifficultyLevel = blockCount > 20 ? 'advanced' : blockCount > 10 ? 'intermediate' : 'beginner';
  return {
    id: uid(), topic: `Blockly program with ${blockCount} blocks`, category: 'blockly', difficulty,
    explanation: `This Blockly program uses ${blockCount} blocks including ${blockTypes.slice(0, 5).join(', ')}. ` +
      `Each block represents a programming concept like loops, conditions, or I/O operations.`,
    keyPoints: ['Each block maps to code instructions', 'Colors indicate block categories', 'Connect blocks to build logic', 'Test frequently to verify behavior'],
    examples: ['LED blink program', 'Sensor-based decision making', 'Motor control with conditions'],
    nextSteps: ['Add error handling', 'Optimize loop structure', 'Add sensor inputs'],
    relatedTopics: blockTypes.map(b => `Understanding ${b} blocks`),
    createdAt: now(),
  };
}

export function explainArduinoCode(codeLines: number, functions: string[]): MentorExplanation {
  const difficulty: DifficultyLevel = codeLines > 100 ? 'expert' : codeLines > 50 ? 'advanced' : codeLines > 20 ? 'intermediate' : 'beginner';
  return {
    id: uid(), topic: `Arduino code (${codeLines} lines)`, category: 'arduino', difficulty,
    explanation: `This Arduino program has ${codeLines} lines with functions: ${functions.join(', ')}. ` +
      `setup() runs once at boot, loop() runs continuously.`,
    keyPoints: ['setup() initializes pins and peripherals', 'loop() is the main program loop', 'Use Serial.println() for debugging', 'Avoid delay() in complex programs — use millis()'],
    examples: ['Blink LED', 'Read sensor in loop()', 'PWM motor control'],
    nextSteps: ['Add interrupt handlers', 'Use millis() for non-blocking delays', 'Add error recovery'],
    relatedTopics: functions.map(f => `How ${f}() works`),
    createdAt: now(),
  };
}

export function explainSensor(sensorType: string): MentorExplanation {
  const info = SENSOR_EXPLANATIONS[sensorType.toLowerCase()] ?? {
    explanation: `The ${sensorType} sensor detects physical phenomena and converts them to electrical signals.`,
    keyPoints: ['Connect to appropriate GPIO pin', 'Check voltage requirements', 'Read datasheet for pinout'],
  };
  return {
    id: uid(), topic: `Sensor: ${sensorType}`, category: 'sensor', difficulty: 'intermediate',
    explanation: info.explanation,
    keyPoints: info.keyPoints,
    examples: [`${sensorType} with Arduino`, `${sensorType} obstacle detection`],
    nextSteps: ['Wire the sensor', 'Write reading code', 'Calibrate for accuracy'],
    relatedTopics: ['Signal conditioning', 'ADC conversion', 'Sensor fusion'],
    createdAt: now(),
  };
}

export function explainComponent(componentType: string): MentorExplanation {
  const info = COMPONENT_EXPLANATIONS[componentType.toLowerCase()];
  const explanation = info?.explanation ?? `A ${componentType} is an electronic component used in circuits.`;
  const keyPoints = info?.keyPoints ?? ['Check the datasheet', 'Verify voltage and current ratings', 'Connect according to pinout'];
  const examples = info?.examples ?? [`${componentType} basic circuit`];
  return {
    id: uid(), topic: `Component: ${componentType}`, category: 'component',
    difficulty: 'beginner', explanation, keyPoints, examples,
    nextSteps: ['Build a test circuit', 'Combine with other components', 'Program with Arduino'],
    relatedTopics: [`${componentType} applications`, `${componentType} specifications`],
    createdAt: now(),
  };
}

export function explainError(errorType: string): MentorExplanation {
  const info = ERROR_EXPLANATIONS[errorType.toLowerCase()] ?? {
    explanation: `Error: ${errorType}. This indicates a problem in your circuit or code.`,
    fix: 'Review the error message and check your connections and code.',
  };
  return {
    id: uid(), topic: `Error: ${errorType}`, category: 'error', difficulty: 'intermediate',
    explanation: info.explanation,
    keyPoints: [info.fix, 'Check connections carefully', 'Use serial monitor for debugging'],
    examples: ['Common troubleshooting steps'],
    nextSteps: ['Fix the error', 'Test again', 'Ask for help if stuck'],
    relatedTopics: ['Debugging techniques', 'Common circuit errors'],
    createdAt: now(),
  };
}

export function generateHints(context: string, componentTypes: string[]): MentorHint[] {
  const hints: MentorHint[] = [];
  for (const comp of componentTypes) {
    const lower = comp.toLowerCase();
    if (lower === 'led') {
      hints.push({ id: uid(), contextId: context, hint: 'Make sure you have a current-limiting resistor for the LED (220Ω–1kΩ)', severity: 'warning', actionable: true, relatedConcept: 'Current limiting' });
    }
    if (lower === 'servo') {
      hints.push({ id: uid(), contextId: context, hint: 'Servos need separate power — don\'t power from Arduino 5V for multiple servos', severity: 'suggestion', actionable: true, relatedConcept: 'Power management' });
    }
    if (lower === 'motor_dc') {
      hints.push({ id: uid(), contextId: context, hint: 'Never connect a DC motor directly to a microcontroller pin — use a motor driver', severity: 'critical', actionable: true, relatedConcept: 'Motor driving' });
    }
  }
  if (hints.length === 0) {
    hints.push({ id: uid(), contextId: context, hint: 'Double-check all connections before powering on', severity: 'info', actionable: false, relatedConcept: 'Safety' });
  }
  return hints;
}

export function generateLearningPath(userId: string, currentSkills: string[], targetSkill: string): LearningPath {
  const steps: LearningPathStep[] = [
    { stepId: uid(), title: 'Fundamentals Review', description: `Review basics before learning ${targetSkill}`, difficulty: 'beginner', estimatedMinutes: 15, prerequisites: [], skills: ['basics'], completed: false },
    { stepId: uid(), title: `Introduction to ${targetSkill}`, description: `Learn the core concepts of ${targetSkill}`, difficulty: 'beginner', estimatedMinutes: 30, prerequisites: ['basics'], skills: [targetSkill], completed: false },
    { stepId: uid(), title: `${targetSkill} — Hands-on Practice`, description: `Build projects using ${targetSkill}`, difficulty: 'intermediate', estimatedMinutes: 45, prerequisites: [targetSkill], skills: [`${targetSkill}_practical`], completed: false },
    { stepId: uid(), title: `${targetSkill} — Advanced Concepts`, description: `Deep dive into advanced ${targetSkill}`, difficulty: 'advanced', estimatedMinutes: 60, prerequisites: [`${targetSkill}_practical`], skills: [`${targetSkill}_advanced`], completed: false },
    { stepId: uid(), title: `${targetSkill} — Mastery Project`, description: `Build a complete project demonstrating ${targetSkill} mastery`, difficulty: 'expert', estimatedMinutes: 90, prerequisites: [`${targetSkill}_advanced`], skills: [`${targetSkill}_mastery`], completed: false },
  ];
  const totalMinutes = steps.reduce((s, st) => s + st.estimatedMinutes, 0);
  return {
    pathId: uid(), userId, title: `Learning Path: ${targetSkill}`,
    description: `Personalized path from ${currentSkills.join(', ')} to ${targetSkill}`,
    steps, currentStepIndex: 0, totalEstimatedMinutes: totalMinutes, completedSteps: 0, createdAt: now(),
  };
}

export function advanceLearningPath(path: LearningPath): LearningPath {
  if (path.currentStepIndex >= path.steps.length) return path;
  const newSteps = path.steps.map((s, i) => i === path.currentStepIndex ? { ...s, completed: true } : s);
  return { ...path, steps: newSteps, currentStepIndex: path.currentStepIndex + 1, completedSteps: path.completedSteps + 1 };
}

export function getLearningPathProgress(path: LearningPath): number {
  return path.steps.length > 0 ? Math.round((path.completedSteps / path.steps.length) * 100) : 0;
}

// ─── Circuit Review ────────────────────────────────────────────

export function reviewCircuit(circuitId: string, components: string[], wireCount: number, hasGround: boolean, hasPower: boolean): CircuitReview {
  const issues: CircuitIssue[] = [];
  if (!hasGround) issues.push({ issueId: uid(), severity: 'critical', component: 'Ground', description: 'Missing ground connection', suggestion: 'Connect GND rail to power supply ground' });
  if (!hasPower) issues.push({ issueId: uid(), severity: 'critical', component: 'Power', description: 'No power source detected', suggestion: 'Add a battery or USB power source' });
  const hasLed = components.some(c => c.toLowerCase() === 'led');
  const hasResistor = components.some(c => c.toLowerCase() === 'resistor');
  if (hasLed && !hasResistor) issues.push({ issueId: uid(), severity: 'warning', component: 'LED', description: 'LED without current-limiting resistor', suggestion: 'Add a 220Ω–1kΩ resistor in series with the LED' });
  const safetyRating: SafetyRating = issues.some(i => i.severity === 'critical') ? 'danger' : issues.some(i => i.severity === 'warning') ? 'caution' : 'safe';
  const qualityScore = Math.max(0, 100 - issues.length * 15);
  return {
    reviewId: uid(), circuitId, qualityScore, safetyRating, issues,
    optimizations: wireCount > components.length * 2 ? ['Consider simplifying wire routing'] : [],
    missingComponents: !hasGround ? ['Ground connection'] : [],
    powerAnalysis: { totalCurrentDraw: components.length * 20, maxVoltage: 5.0, powerBudgetOk: components.length < 20, warnings: !hasPower ? ['No power source'] : [] },
    wiringAnalysis: { totalWires: wireCount, redundantWires: Math.max(0, wireCount - components.length * 2), missingConnections: hasGround ? 0 : 1, crossingWires: Math.floor(wireCount * 0.1), neatnessScore: Math.max(0, 100 - Math.floor(wireCount * 0.5)) },
    createdAt: now(),
  };
}

// ─── Blockly Review ────────────────────────────────────────────

export function reviewBlockly(projectId: string, blocks: string[], hasInfiniteLoop: boolean, hasDeadCode: boolean): BlocklyReview {
  const bugs: BlocklyBug[] = [];
  if (hasInfiniteLoop) bugs.push({ bugId: uid(), severity: 'critical', blockType: 'loop', description: 'Potential infinite loop detected', suggestion: 'Add a loop exit condition or use a counter' });
  if (hasDeadCode) bugs.push({ bugId: uid(), severity: 'suggestion', blockType: 'general', description: 'Unreachable code blocks detected', suggestion: 'Remove unused blocks to improve readability' });
  const logicScore = Math.max(0, 100 - bugs.filter(b => b.severity === 'critical').length * 25 - bugs.filter(b => b.severity === 'warning').length * 10);
  const performanceScore = hasInfiniteLoop ? 30 : hasDeadCode ? 70 : 95;
  return {
    reviewId: uid(), projectId, logicScore, performanceScore, bugs,
    optimizations: blocks.length > 30 ? ['Consider breaking into sub-functions'] : [],
    educationalNotes: ['Each block corresponds to a line of code', 'Color-coded categories help organize logic'],
    createdAt: now(),
  };
}

// ─── Project Review ────────────────────────────────────────────

export function reviewProject(projectId: string, componentCount: number, blockCount: number, hasDocumentation: boolean, isCompetition: boolean): ProjectReview {
  const completenessScore = Math.min(100, componentCount * 10 + blockCount * 5);
  const innovationScore = componentCount > 5 && blockCount > 10 ? 85 : componentCount > 3 ? 65 : 40;
  const documentationScore = hasDocumentation ? 90 : 30;
  const robothronScore = isCompetition ? Math.min(100, (completenessScore + innovationScore + documentationScore) / 3) : 0;
  const overallScore = Math.round((completenessScore + innovationScore + documentationScore) / 3);
  return {
    reviewId: uid(), projectId, overallScore, innovationScore, robothronScore, completenessScore, documentationScore,
    presentationSuggestions: overallScore < 70 ? ['Add a project title and description', 'Include a demo video'] : ['Consider adding diagrams'],
    documentationSuggestions: !hasDocumentation ? ['Add a README with project description', 'Document component list and wiring'] : ['Add troubleshooting section'],
    createdAt: now(),
  };
}

// ─── Teacher AI ────────────────────────────────────────────────

export function generateAssignment(teacherId: string, topic: string, difficulty: DifficultyLevel): GeneratedAssignment {
  const minutes = difficulty === 'beginner' ? 30 : difficulty === 'intermediate' ? 45 : difficulty === 'advanced' ? 60 : 90;
  return {
    assignmentId: uid(), title: `${topic} — ${difficulty} Assignment`,
    description: `Build a ${difficulty}-level project demonstrating ${topic}`,
    difficulty, objectives: [`Understand ${topic} fundamentals`, `Apply ${topic} in a practical circuit`, `Debug and test the circuit`],
    estimatedMinutes: minutes, rubricId: uid(),
  };
}

export function generateRubric(title: string, maxScore: number): GeneratedRubric {
  const perCriteria = Math.floor(maxScore / 4);
  return {
    rubricId: uid(), title, maxScore,
    criteria: [
      { name: 'Circuit Design', description: 'Quality and correctness of circuit', maxPoints: perCriteria, levels: ['Incomplete', 'Basic', 'Good', 'Excellent'] },
      { name: 'Code Quality', description: 'Code organization and logic', maxPoints: perCriteria, levels: ['Non-functional', 'Works with bugs', 'Works correctly', 'Optimized'] },
      { name: 'Innovation', description: 'Creative problem solving', maxPoints: perCriteria, levels: ['Standard', 'Some creativity', 'Creative', 'Innovative'] },
      { name: 'Documentation', description: 'Project documentation quality', maxPoints: maxScore - perCriteria * 3, levels: ['Missing', 'Minimal', 'Good', 'Comprehensive'] },
    ],
  };
}

export function generateQuestion(topic: string, difficulty: DifficultyLevel): GeneratedQuestion {
  return {
    questionId: uid(), topic, difficulty, type: 'multiple_choice',
    question: `What is the primary function of a ${topic} in an electronic circuit?`,
    correctAnswer: `It performs the core function of ${topic} as designed`,
    distractors: [`It stores data`, `It amplifies power`, `It converts AC to DC`],
  };
}

export function detectStudentRisk(studentId: string, completionRate: number, avgScore: number, daysInactive: number): StudentRiskAlert | null {
  if (completionRate > 70 && avgScore > 60 && daysInactive < 7) return null;
  const riskLevel = daysInactive > 14 || avgScore < 30 ? 'high' : daysInactive > 7 || avgScore < 50 ? 'medium' : 'low';
  let reason = '';
  let recommendation = '';
  if (daysInactive > 14) { reason = `Student inactive for ${daysInactive} days`; recommendation = 'Send re-engagement email or personal check-in'; }
  else if (avgScore < 30) { reason = `Average score is critically low (${avgScore}%)`; recommendation = 'Schedule one-on-one tutoring session'; }
  else if (completionRate < 50) { reason = `Assignment completion rate is low (${completionRate}%)`; recommendation = 'Adjust workload or provide additional support'; }
  else { reason = `Multiple risk factors detected`; recommendation = 'Monitor closely and provide encouragement'; }
  return { alertId: uid(), studentId, riskLevel, reason, recommendation, detectedAt: now() };
}

export function generateClassroomInsight(avgScore: number, completionRate: number, activeStudents: number, totalStudents: number): ClassroomInsight {
  const engagementRate = totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0;
  let type: ClassroomInsight['type'] = 'performance';
  let title = '';
  let description = '';
  if (engagementRate < 50) { type = 'engagement'; title = 'Low Engagement Alert'; description = `Only ${engagementRate}% of students are active. Consider interactive activities.`; }
  else if (avgScore < 60) { type = 'performance'; title = 'Performance Below Target'; description = `Class average is ${avgScore}%. Review difficult topics and provide remediation.`; }
  else if (completionRate > 90) { type = 'progress'; title = 'Excellent Progress'; description = `${completionRate}% completion rate. Class is ahead of schedule.`; }
  else { type = 'recommendation'; title = 'Balanced Performance'; description = `Class is performing well. Consider introducing advanced challenges.`; }
  return { insightId: uid(), type, title, description, actionable: engagementRate < 50 || avgScore < 60, priority: engagementRate < 50 ? 1 : avgScore < 60 ? 2 : 3 };
}

export function createTeacherAssistant(teacherId: string): TeacherAIAssistant {
  return {
    assistantId: uid(), teacherId,
    generatedAssignments: [], generatedRubrics: [],
    generatedQuestions: [], studentRiskAlerts: [], classroomInsights: [],
  };
}
