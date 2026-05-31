'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { Button } from '@stemverse/ui';

const STAGE_WIDTH = 480;
const STAGE_HEIGHT = 360;

type ScratchRuntime = {
  loadProject: (json: string) => Promise<void>;
  toJSON: () => string;
  greenFlag: () => void;
  stopAll: () => void;
  addSprite: (json: string) => Promise<unknown>;
  onTargetsUpdate: (cb: () => void) => void;
  getTargets: () => Array<{ name: string; isStage: boolean }>;
  dispose: () => void;
};

interface ScratchWorkspaceProps {
  projectId?: string;
  initialData?: unknown;
  onSave?: (workspaceJson: unknown) => Promise<void>;
}

export function ScratchWorkspace({
  projectId,
  initialData,
  onSave,
}: ScratchWorkspaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<ScratchRuntime | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  const [sprites, setSprites] = useState<Array<{ name: string; isStage?: boolean }>>([]);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [greenFlag, setGreenFlag] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('Loading Scratch engine…');
  const [hardwarePins, setHardwarePins] = useState<Array<{ pin: number; value: number }>>([
    { pin: 2, value: 0 },
    { pin: 13, value: 1 },
  ]);

  const refreshTargets = useCallback(() => {
    const rt = runtimeRef.current;
    if (!rt) return;
    const targets = rt.getTargets();
    setSprites(targets);
    if (!selectedTarget && targets.length > 0) {
      const firstSprite = targets.find((t) => !t.isStage);
      setSelectedTarget(firstSprite?.name ?? targets[0]?.name ?? null);
    }
  }, [selectedTarget]);

  const initRuntime = useCallback(async () => {
    if (!canvasRef.current || !window.STEMVerseScratch) return;
    const rt = await window.STEMVerseScratch.createScratchRuntime(
      canvasRef.current,
      STAGE_WIDTH,
      STAGE_HEIGHT,
    );
    runtimeRef.current = rt;
    rt.onTargetsUpdate(refreshTargets);

    if (initialData && typeof initialData === 'object') {
      try {
        await rt.loadProject(JSON.stringify(initialData));
      } catch {
        await rt.loadProject(rt.toJSON());
      }
    } else {
      await rt.loadProject(rt.toJSON());
    }

    setStatus(projectId ? `Project ${projectId.slice(0, 8)}…` : 'Untitled project');
    refreshTargets();
  }, [initialData, projectId, refreshTargets]);

  useEffect(() => {
    if (!engineReady) return;
    initRuntime();
    return () => {
      runtimeRef.current?.dispose();
      runtimeRef.current = null;
    };
  }, [engineReady, initRuntime]);

  const handleGreenFlag = () => {
    const rt = runtimeRef.current;
    if (!rt) return;
    if (greenFlag) {
      rt.stopAll();
      setGreenFlag(false);
    } else {
      rt.greenFlag();
      setGreenFlag(true);
    }
  };

  const handleStop = () => {
    runtimeRef.current?.stopAll();
    setGreenFlag(false);
  };

  const handleAddSprite = () => {
    const rt = runtimeRef.current;
    if (!rt) return;
    const name = `Sprite${sprites.filter((s) => !s.isStage).length + 1}`;
    rt.addSprite(
      JSON.stringify({
        name,
        costumes: [
          {
            name: 'costume1',
            bitmapResolution: 1,
            dataFormat: 'svg',
            assetId: 'cd21514d0531fdffb6adae589bfa37f0',
            md5ext: 'cd21514d0531fdffb6adae589bfa37f0.svg',
            rotationCenterX: 48,
            rotationCenterY: 50,
          },
        ],
        sounds: [],
        variables: {},
        blocks: {},
        comments: {},
        currentCostume: 0,
        layerOrder: sprites.length,
        visible: true,
        x: 0,
        y: 0,
        size: 100,
        direction: 90,
        rotationStyle: 'all around',
      }),
    ).then(() => refreshTargets());
  };

  const handleSave = async () => {
    const rt = runtimeRef.current;
    if (!rt || !onSave) return;
    setSaving(true);
    try {
      const json = JSON.parse(rt.toJSON()) as unknown;
      await onSave(json);
      setStatus('Saved');
    } catch {
      setStatus('Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Script
        src="/scratch/scratch-engine.iife.js"
        strategy="afterInteractive"
        onLoad={() => setEngineReady(true)}
        onError={() => setStatus('Failed to load Scratch engine bundle')}
      />
      <div className="flex h-full flex-col bg-[#e8edf4]">
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGreenFlag}
              disabled={!engineReady}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-success text-white hover:opacity-90 disabled:opacity-50"
              title="Green flag"
            >
              ▶
            </button>
            <button
              type="button"
              onClick={handleStop}
              disabled={!engineReady}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-danger text-white hover:opacity-90 disabled:opacity-50"
              title="Stop"
            >
              ■
            </button>
            <span className="ml-2 text-sm text-muted">{status}</span>
          </div>
          {onSave && (
            <Button size="sm" onClick={handleSave} loading={saving} disabled={!engineReady}>
              Save project
            </Button>
          )}
        </header>

        <div className="flex min-h-0 flex-1">
          <aside className="w-56 shrink-0 border-r border-border bg-[#4c97ff] p-3 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Blocks</p>
            <div className="mt-3 space-y-2 text-sm">
              {['Motion', 'Looks', 'Sound', 'Events', 'Control'].map((cat) => (
                <p key={cat} className="rounded bg-white/20 px-2 py-1">
                  {cat}
                </p>
              ))}
              <p className="mt-4 text-xs opacity-70">
                Full scratch-blocks editor ships in a later phase. Run scripts via the stage controls.
              </p>
            </div>
          </aside>

          <section className="flex flex-1 flex-col items-center justify-center bg-[#d6e0f0] p-4">
            <div className="overflow-hidden rounded-lg border-2 border-white shadow-lg">
              <canvas
                ref={canvasRef}
                width={STAGE_WIDTH}
                height={STAGE_HEIGHT}
                className="block bg-white"
              />
            </div>
          </section>

          <aside className="w-44 shrink-0 border-l border-border bg-[#1e293b] p-3 text-white">
            <p className="text-xs font-semibold uppercase opacity-80">Hardware</p>
            <p className="mt-1 text-[10px] opacity-60">ESP32 / Arduino hooks</p>
            <ul className="mt-3 space-y-2">
              {hardwarePins.map((hp) => (
                <li key={hp.pin} className="rounded bg-white/10 px-2 py-1.5 text-xs">
                  <span className="font-mono">GPIO {hp.pin}</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={1}
                    value={hp.value}
                    className="mt-1 w-full"
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setHardwarePins((prev) =>
                        prev.map((p) => (p.pin === hp.pin ? { ...p, value: v } : p)),
                      );
                    }}
                    aria-label={`GPIO ${hp.pin} value`}
                  />
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[10px] opacity-50">
              Runtime hooks via scratch-engine hardware extension (Phase 5 foundation).
            </p>
          </aside>

          <aside className="w-52 shrink-0 border-l border-border bg-card p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase text-muted">Sprites</p>
              <button
                type="button"
                onClick={handleAddSprite}
                disabled={!engineReady}
                className="rounded bg-primary px-2 py-0.5 text-xs text-white disabled:opacity-50"
              >
                +
              </button>
            </div>
            <ul className="space-y-1">
              {sprites.map((sprite) => (
                <li key={sprite.name}>
                  <button
                    type="button"
                    onClick={() => setSelectedTarget(sprite.name)}
                    className={`w-full rounded px-2 py-1.5 text-left text-sm ${
                      selectedTarget === sprite.name
                        ? 'bg-primary/10 font-medium text-primary'
                        : 'hover:bg-background'
                    }`}
                  >
                    {sprite.isStage ? 'Stage' : sprite.name}
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        </div>

        <footer className="flex h-24 items-center gap-4 border-t border-border bg-card px-4">
          <p className="text-xs font-semibold uppercase text-muted">Assets</p>
          <div className="flex gap-2">
            <div
              className="h-14 w-14 rounded border border-dashed border-border bg-background"
              title="Costumes"
            />
            <div
              className="h-14 w-14 rounded border border-dashed border-border bg-background"
              title="Sounds"
            />
          </div>
          <p className="text-xs text-muted">Costumes & sounds — Scratch storage layer (Phase 2)</p>
        </footer>
      </div>
    </>
  );
}

declare global {
  interface Window {
    STEMVerseScratch: {
      createScratchRuntime: (
        canvas: HTMLCanvasElement,
        width?: number,
        height?: number,
      ) => Promise<ScratchRuntime>;
    };
  }
}
