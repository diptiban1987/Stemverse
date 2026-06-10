/**
 * Minimal interfaces mapping GPIO and simulator operations.
 * Allows the Scratch block interpreter execution to exchange states 
 * with the 3D Virtual Board hardware simulation when integrated.
 */

export interface PinState {
  pinNumber: number;
  mode: 'INPUT' | 'OUTPUT' | 'ANALOG' | 'PWM' | 'TOUCH';
  value: number;
}

export interface IGPIOHandler {
  /**
   * Reads the current state of a simulated pin.
   */
  digitalRead(pin: number): Promise<number>;

  /**
   * Writes a digital value (HIGH/LOW) to a simulated pin.
   */
  digitalWrite(pin: number, value: number): Promise<void>;

  /**
   * Reads an analog signal (voltage representation) from a simulated pin.
   */
  analogRead(pin: number): Promise<number>;

  /**
   * Writes an analog/PWM duty cycle to a simulated pin.
   */
  analogWrite(pin: number, value: number): Promise<void>;
}

export interface ISimulatorConnection {
  /**
   * Establishes a link with the simulator-engine layer.
   */
  connect(): Promise<boolean>;

  /**
   * Disconnects the active simulation session.
   */
  disconnect(): Promise<void>;

  /**
   * Retrieves the handler for virtual GPIO interactions.
   */
  getGPIOHandler(): IGPIOHandler;

  /**
   * Emits a simulated event to trigger virtual hardware actions.
   */
  sendSimulatorMessage(topic: string, payload: Record<string, any>): void;
}
