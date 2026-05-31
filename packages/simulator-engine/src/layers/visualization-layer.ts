import type { SimulatorState } from '../types';
import { SceneRenderer } from '../visualization/scene-renderer';

/**
 * Visualization layer — Three.js scene bound to simulator state.
 */
export class VisualizationLayer {
  private renderer: SceneRenderer | null = null;

  mount(container: HTMLElement): void {
    if (this.renderer) {
      this.renderer.dispose();
    }
    this.renderer = new SceneRenderer(container);
  }

  render(state: SimulatorState): void {
    this.renderer?.update(state);
  }

  resize(): void {
    this.renderer?.resize();
  }

  zoomIn(): void {
    this.renderer?.zoomIn();
  }

  zoomOut(): void {
    this.renderer?.zoomOut();
  }

  resetView(): void {
    this.renderer?.resetView();
  }

  dispose(): void {
    this.renderer?.dispose();
    this.renderer = null;
  }
}
