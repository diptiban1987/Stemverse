/**
 * Phase 42 — Scratch IoT Extension Runtime
 *
 * IoT blocks: WiFi, MQTT, HTTP, Firebase, Blynk integration.
 */

export type IoTProtocol = 'wifi' | 'mqtt' | 'http' | 'firebase' | 'blynk' | 'websocket';
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface WiFiConfig {
  readonly configId: string;
  readonly ssid: string;
  readonly password: string;
  readonly status: ConnectionStatus;
  readonly ipAddress: string | null;
  readonly signalStrength: number;
  readonly connectedAt: number | null;
}

export interface MQTTConfig {
  readonly configId: string;
  readonly broker: string;
  readonly port: number;
  readonly clientId: string;
  readonly username: string;
  readonly status: ConnectionStatus;
  readonly subscribedTopics: string[];
  readonly publishedCount: number;
  readonly receivedCount: number;
}

export interface HTTPRequest {
  readonly requestId: string;
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  readonly url: string;
  readonly headers: Record<string, string>;
  readonly body: string | null;
  readonly statusCode: number | null;
  readonly response: string | null;
  readonly sentAt: number;
}

export interface FirebaseConfig {
  readonly configId: string;
  readonly projectId: string;
  readonly databaseUrl: string;
  readonly status: ConnectionStatus;
  readonly readsCount: number;
  readonly writesCount: number;
}

export interface BlynkConfig {
  readonly configId: string;
  readonly authToken: string;
  readonly server: string;
  readonly status: ConnectionStatus;
  readonly virtualPins: Record<number, unknown>;
}

export interface IoTSession {
  readonly sessionId: string;
  readonly wifi: WiFiConfig | null;
  readonly mqtt: MQTTConfig | null;
  readonly firebase: FirebaseConfig | null;
  readonly blynk: BlynkConfig | null;
  readonly totalMessages: number;
  readonly startedAt: number;
}

let _seq = 0;
function uid(): string { return `iot_${Date.now()}_${++_seq}`; }
const now = () => Date.now();

// ─── WiFi ──────────────────────────────────────────────────────

export function connectWiFi(ssid: string, password: string): WiFiConfig {
  return { configId: uid(), ssid, password, status: 'connected', ipAddress: '192.168.1.' + Math.floor(Math.random() * 254 + 1), signalStrength: -45, connectedAt: now() };
}

export function disconnectWiFi(config: WiFiConfig): WiFiConfig {
  return { ...config, status: 'disconnected', ipAddress: null, connectedAt: null };
}

export function getWiFiStatus(config: WiFiConfig): ConnectionStatus { return config.status; }

// ─── MQTT ──────────────────────────────────────────────────────

export function connectMQTT(broker: string, port: number = 1883, clientId: string = ''): MQTTConfig {
  return { configId: uid(), broker, port, clientId: clientId || `stemverse_${uid()}`, username: '', status: 'connected', subscribedTopics: [], publishedCount: 0, receivedCount: 0 };
}

export function mqttSubscribe(config: MQTTConfig, topic: string): MQTTConfig {
  if (config.subscribedTopics.includes(topic)) return config;
  return { ...config, subscribedTopics: [...config.subscribedTopics, topic] };
}

export function mqttPublish(config: MQTTConfig, _topic: string, _message: string): MQTTConfig {
  return { ...config, publishedCount: config.publishedCount + 1 };
}

export function mqttReceive(config: MQTTConfig): MQTTConfig {
  return { ...config, receivedCount: config.receivedCount + 1 };
}

export function disconnectMQTT(config: MQTTConfig): MQTTConfig {
  return { ...config, status: 'disconnected' };
}

// ─── HTTP ──────────────────────────────────────────────────────

export function httpGet(url: string): HTTPRequest {
  return { requestId: uid(), method: 'GET', url, headers: {}, body: null, statusCode: 200, response: '{}', sentAt: now() };
}

export function httpPost(url: string, body: string): HTTPRequest {
  return { requestId: uid(), method: 'POST', url, headers: { 'Content-Type': 'application/json' }, body, statusCode: 201, response: '{"status":"ok"}', sentAt: now() };
}

// ─── Firebase ──────────────────────────────────────────────────

export function connectFirebase(projectId: string, databaseUrl: string): FirebaseConfig {
  return { configId: uid(), projectId, databaseUrl, status: 'connected', readsCount: 0, writesCount: 0 };
}

export function firebaseRead(config: FirebaseConfig, _path: string): { config: FirebaseConfig; value: unknown } {
  return { config: { ...config, readsCount: config.readsCount + 1 }, value: null };
}

export function firebaseWrite(config: FirebaseConfig, _path: string, _value: unknown): FirebaseConfig {
  return { ...config, writesCount: config.writesCount + 1 };
}

export function disconnectFirebase(config: FirebaseConfig): FirebaseConfig {
  return { ...config, status: 'disconnected' };
}

// ─── Blynk ─────────────────────────────────────────────────────

export function connectBlynk(authToken: string, server: string = 'blynk.cloud'): BlynkConfig {
  return { configId: uid(), authToken, server, status: 'connected', virtualPins: {} };
}

export function blynkWritePin(config: BlynkConfig, pin: number, value: unknown): BlynkConfig {
  return { ...config, virtualPins: { ...config.virtualPins, [pin]: value } };
}

export function blynkReadPin(config: BlynkConfig, pin: number): unknown {
  return config.virtualPins[pin] ?? 0;
}

export function disconnectBlynk(config: BlynkConfig): BlynkConfig {
  return { ...config, status: 'disconnected' };
}

// ─── Session ───────────────────────────────────────────────────

export function createIoTSession(): IoTSession {
  return { sessionId: uid(), wifi: null, mqtt: null, firebase: null, blynk: null, totalMessages: 0, startedAt: now() };
}

export function addWiFiToSession(session: IoTSession, wifi: WiFiConfig): IoTSession {
  return { ...session, wifi };
}

export function addMQTTToSession(session: IoTSession, mqtt: MQTTConfig): IoTSession {
  return { ...session, mqtt };
}

export function incrementMessages(session: IoTSession): IoTSession {
  return { ...session, totalMessages: session.totalMessages + 1 };
}

export function getSupportedProtocols(): IoTProtocol[] {
  return ['wifi', 'mqtt', 'http', 'firebase', 'blynk', 'websocket'];
}
