import * as THREE from 'three';
import type { SimulatorState, SimComponentPlacement } from '../types';
import { getVirtualBoard } from '../boards/virtual-boards';

const COMPONENT_COLORS: Record<string, number> = {
  led: 0xfbbf24,
  buzzer: 0x94a3b8,
  servo: 0x3b82f6,
  dht22: 0x22c55e,
  hc_sr04: 0xa855f7,
};

export class SceneRenderer {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private boardMesh: THREE.Mesh | null = null;
  private componentMeshes = new Map<string, THREE.Group>();
  private wireGroup = new THREE.Group();
  private grid: THREE.GridHelper;
  private animationId: number | null = null;

  private isPanning = false;
  private lastPointer = { x: 0, y: 0 };
  private cameraTarget = new THREE.Vector3(0, 0, 0);

  constructor(container: HTMLElement) {
    this.container = container;
    const width = container.clientWidth || 640;
    const height = container.clientHeight || 480;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf1f5f9);

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(0, 4, 6);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(4, 8, 4);
    this.scene.add(dir);

    this.grid = new THREE.GridHelper(12, 24, 0xcbd5e1, 0xe2e8f0);
    this.scene.add(this.grid);
    this.scene.add(this.wireGroup);

    this.bindControls();
    this.animate();
  }

  private bindControls(): void {
    const el = this.renderer.domElement;

    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 1.08 : 0.92;
      this.camera.position.multiplyScalar(delta);
      const dist = this.camera.position.length();
      if (dist < 3) this.camera.position.setLength(3);
      if (dist > 20) this.camera.position.setLength(20);
    });

    el.addEventListener('pointerdown', (e) => {
      if (e.button === 1 || e.button === 2 || e.shiftKey) {
        this.isPanning = true;
        this.lastPointer = { x: e.clientX, y: e.clientY };
      }
    });

    el.addEventListener('pointermove', (e) => {
      if (!this.isPanning) return;
      const dx = (e.clientX - this.lastPointer.x) * 0.01;
      const dy = (e.clientY - this.lastPointer.y) * 0.01;
      this.lastPointer = { x: e.clientX, y: e.clientY };

      const right = new THREE.Vector3();
      const up = new THREE.Vector3(0, 1, 0);
      right.crossVectors(this.camera.getWorldDirection(new THREE.Vector3()), up).normalize();

      this.camera.position.addScaledVector(right, -dx);
      this.camera.position.y += dy;
      this.cameraTarget.y += dy;
      this.camera.lookAt(this.cameraTarget);
    });

    el.addEventListener('pointerup', () => {
      this.isPanning = false;
    });

    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  update(state: SimulatorState): void {
    const board = getVirtualBoard(state.boardId);

    if (!this.boardMesh) {
      const geo = new THREE.BoxGeometry(board.width, 0.15, board.height);
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(board.color),
        metalness: 0.2,
        roughness: 0.6,
      });
      this.boardMesh = new THREE.Mesh(geo, mat);
      this.boardMesh.position.y = 0.08;
      this.scene.add(this.boardMesh);
    } else {
      (this.boardMesh.material as THREE.MeshStandardMaterial).color.set(board.color);
    }

    const activeIds = new Set(state.components.map((c) => c.id));

    for (const [id, mesh] of this.componentMeshes) {
      if (!activeIds.has(id)) {
        this.scene.remove(mesh);
        this.componentMeshes.delete(id);
      }
    }

    state.components.forEach((placement, index) => {
      let group = this.componentMeshes.get(placement.id);
      if (!group) {
        group = this.createComponentMesh(placement);
        this.componentMeshes.set(placement.id, group);
        this.scene.add(group);
      }

      const offsetX = (index % 4) * 0.9 - 1.35;
      const offsetZ = Math.floor(index / 4) * 0.9 + board.height / 2 + 0.5;
      group.position.set(
        placement.position.x || offsetX,
        placement.position.y || 0.35,
        placement.position.z || offsetZ,
      );

      this.applyComponentVisual(group, placement, state);
    });

    this.updateWires(state);
  }

  private updateWires(state: SimulatorState): void {
    while (this.wireGroup.children.length) {
      this.wireGroup.remove(this.wireGroup.children[0]!);
    }
    const boardY = 0.2;
    state.components.forEach((placement) => {
      const group = this.componentMeshes.get(placement.id);
      if (!group) return;
      const points = [
        new THREE.Vector3(0, boardY, 0),
        new THREE.Vector3(group.position.x, group.position.y, group.position.z),
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color: state.runState === 'running' ? 0x22c55e : 0x64748b,
        transparent: true,
        opacity: 0.7,
      });
      this.wireGroup.add(new THREE.Line(geo, mat));
    });
  }

  zoomIn(): void {
    this.camera.position.multiplyScalar(0.9);
  }

  zoomOut(): void {
    this.camera.position.multiplyScalar(1.1);
    if (this.camera.position.length() > 20) this.camera.position.setLength(20);
  }

  resetView(): void {
    this.camera.position.set(0, 4, 6);
    this.cameraTarget.set(0, 0, 0);
    this.camera.lookAt(this.cameraTarget);
  }

  private createComponentMesh(placement: SimComponentPlacement): THREE.Group {
    const group = new THREE.Group();
    const color = COMPONENT_COLORS[placement.type] ?? 0x64748b;
    const geo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
    const mat = new THREE.MeshStandardMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = 'body';
    group.add(mesh);
    return group;
  }

  private applyComponentVisual(
    group: THREE.Group,
    placement: SimComponentPlacement,
    state: SimulatorState,
  ): void {
    const body = group.getObjectByName('body') as THREE.Mesh | undefined;
    if (!body) return;

    const runtime = state.componentStates[placement.id];

    if (placement.type === 'led' && runtime?.led) {
      const mat = body.material as THREE.MeshStandardMaterial;
      mat.emissive.set(runtime.led.on ? 0xfff176 : 0x000000);
      mat.emissiveIntensity = runtime.led.on ? 1.2 : 0;
    }

    if (placement.type === 'servo' && runtime?.servo) {
      group.rotation.y = (runtime.servo.angle * Math.PI) / 180;
    }

    if (placement.type === 'buzzer' && runtime?.buzzer) {
      const mat = body.material as THREE.MeshStandardMaterial;
      mat.color.set(runtime.buzzer.active ? 0xef4444 : 0x94a3b8);
    }
  }

  resize(): void {
    const width = this.container.clientWidth || 640;
    const height = this.container.clientHeight || 480;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    if (this.animationId !== null) cancelAnimationFrame(this.animationId);
    this.componentMeshes.forEach((g) => this.scene.remove(g));
    this.componentMeshes.clear();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
