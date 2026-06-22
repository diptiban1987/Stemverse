/**
 * Phase 42 — Scratch AI Extension Runtime
 *
 * AI blocks: Image Classification, Object Detection, Face Detection,
 * Gesture Recognition, Voice Commands, Speech Recognition, Text Generation.
 */

export type AIModelType = 'image_classification' | 'object_detection' | 'face_detection' | 'gesture_recognition' | 'voice_commands' | 'speech_recognition' | 'text_generation';
export type AIModelStatus = 'loading' | 'ready' | 'processing' | 'error' | 'unloaded';

export interface AIModel {
  readonly modelId: string;
  readonly type: AIModelType;
  readonly name: string;
  readonly description: string;
  readonly status: AIModelStatus;
  readonly accuracy: number;
  readonly inputType: 'image' | 'audio' | 'text';
  readonly outputType: 'labels' | 'boxes' | 'points' | 'text';
  readonly maxClasses: number;
  readonly loadedAt: number | null;
}

export interface AIDetection {
  readonly detectionId: string;
  readonly modelType: AIModelType;
  readonly label: string;
  readonly confidence: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly timestamp: number;
}

export interface AIBlockDefinition {
  readonly blockId: string;
  readonly modelType: AIModelType;
  readonly name: string;
  readonly scratchCategory: string;
  readonly description: string;
  readonly inputs: string[];
  readonly outputs: string[];
}

export interface AISession {
  readonly sessionId: string;
  readonly activeModels: AIModel[];
  readonly detections: AIDetection[];
  readonly totalInferences: number;
  readonly averageLatencyMs: number;
  readonly startedAt: number;
}

let _seq = 0;
function uid(): string { return `ai_${Date.now()}_${++_seq}`; }
const now = () => Date.now();

const AI_MODELS: Record<AIModelType, Omit<AIModel, 'modelId' | 'status' | 'loadedAt'>> = {
  image_classification: { type: 'image_classification', name: 'Image Classifier', description: 'Classify images into categories', accuracy: 92, inputType: 'image', outputType: 'labels', maxClasses: 1000 },
  object_detection: { type: 'object_detection', name: 'Object Detector', description: 'Detect and locate objects', accuracy: 85, inputType: 'image', outputType: 'boxes', maxClasses: 80 },
  face_detection: { type: 'face_detection', name: 'Face Detector', description: 'Detect faces and expressions', accuracy: 95, inputType: 'image', outputType: 'boxes', maxClasses: 7 },
  gesture_recognition: { type: 'gesture_recognition', name: 'Gesture Recognizer', description: 'Recognize hand gestures', accuracy: 88, inputType: 'image', outputType: 'points', maxClasses: 21 },
  voice_commands: { type: 'voice_commands', name: 'Voice Commands', description: 'Recognize spoken commands', accuracy: 90, inputType: 'audio', outputType: 'labels', maxClasses: 50 },
  speech_recognition: { type: 'speech_recognition', name: 'Speech-to-Text', description: 'Convert speech to text', accuracy: 93, inputType: 'audio', outputType: 'text', maxClasses: 0 },
  text_generation: { type: 'text_generation', name: 'Text Generator', description: 'Generate text from prompts', accuracy: 85, inputType: 'text', outputType: 'text', maxClasses: 0 },
};

export function loadAIModel(type: AIModelType): AIModel {
  const base = AI_MODELS[type];
  return { ...base, modelId: uid(), status: 'ready', loadedAt: now() };
}

export function unloadAIModel(model: AIModel): AIModel {
  return { ...model, status: 'unloaded', loadedAt: null };
}

export function getModelStatus(model: AIModel): AIModelStatus { return model.status; }

export function createDetection(modelType: AIModelType, label: string, confidence: number, x: number = 0, y: number = 0, width: number = 0, height: number = 0): AIDetection {
  return { detectionId: uid(), modelType, label, confidence, x, y, width, height, timestamp: now() };
}

export function classifyImage(labels: string[]): AIDetection[] {
  return labels.map((label, i) => createDetection('image_classification', label, Math.max(0.1, 1 - i * 0.15)));
}

export function detectObjects(objects: Array<{ label: string; x: number; y: number; w: number; h: number }>): AIDetection[] {
  return objects.map(o => createDetection('object_detection', o.label, 0.85, o.x, o.y, o.w, o.h));
}

export function detectFaces(count: number): AIDetection[] {
  return Array.from({ length: count }, (_, i) => createDetection('face_detection', 'face', 0.95, 50 * i, 50, 80, 80));
}

export function recognizeGesture(gesture: string): AIDetection {
  return createDetection('gesture_recognition', gesture, 0.88);
}

export function recognizeSpeech(text: string): AIDetection {
  return createDetection('speech_recognition', text, 0.93);
}

export function recognizeVoiceCommand(command: string): AIDetection {
  return createDetection('voice_commands', command, 0.90);
}

export function generateText(prompt: string): AIDetection {
  return createDetection('text_generation', `Response to: ${prompt}`, 0.85);
}

export function createAISession(): AISession {
  return { sessionId: uid(), activeModels: [], detections: [], totalInferences: 0, averageLatencyMs: 0, startedAt: now() };
}

export function addModelToSession(session: AISession, model: AIModel): AISession {
  return { ...session, activeModels: [...session.activeModels, model] };
}

export function addDetectionToSession(session: AISession, detection: AIDetection, latencyMs: number): AISession {
  const total = session.totalInferences + 1;
  const avgLatency = Math.round((session.averageLatencyMs * session.totalInferences + latencyMs) / total);
  return { ...session, detections: [...session.detections, detection], totalInferences: total, averageLatencyMs: avgLatency };
}

export function getAIBlockDefinitions(): AIBlockDefinition[] {
  return [
    { blockId: uid(), modelType: 'image_classification', name: 'Classify Image', scratchCategory: 'AI', description: 'Classify camera image', inputs: ['IMAGE'], outputs: ['LABEL', 'CONFIDENCE'] },
    { blockId: uid(), modelType: 'object_detection', name: 'Detect Objects', scratchCategory: 'AI', description: 'Find objects in image', inputs: ['IMAGE'], outputs: ['OBJECTS'] },
    { blockId: uid(), modelType: 'face_detection', name: 'Detect Faces', scratchCategory: 'AI', description: 'Find faces in image', inputs: ['IMAGE'], outputs: ['FACES'] },
    { blockId: uid(), modelType: 'gesture_recognition', name: 'Recognize Gesture', scratchCategory: 'AI', description: 'Recognize hand gesture', inputs: ['IMAGE'], outputs: ['GESTURE'] },
    { blockId: uid(), modelType: 'voice_commands', name: 'Listen Command', scratchCategory: 'AI', description: 'Listen for voice command', inputs: [], outputs: ['COMMAND'] },
    { blockId: uid(), modelType: 'speech_recognition', name: 'Speech to Text', scratchCategory: 'AI', description: 'Convert speech to text', inputs: [], outputs: ['TEXT'] },
    { blockId: uid(), modelType: 'text_generation', name: 'Generate Text', scratchCategory: 'AI', description: 'Generate text from prompt', inputs: ['PROMPT'], outputs: ['TEXT'] },
  ];
}

export function getSupportedAIModels(): AIModelType[] {
  return ['image_classification', 'object_detection', 'face_detection', 'gesture_recognition', 'voice_commands', 'speech_recognition', 'text_generation'];
}
