'use client';

import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Trash2,
  Copy,
  Box,
  RotateCw,
  Scaling,
  MapPin,
  Activity,
  Settings,
  Layers,
  Gauge,
} from 'lucide-react';
import { useSimulatorStore } from './simulator-store';
import { useSensorValueStore, SENSOR_PARAMETERS } from './sensor-value-store';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface PropertyPanelProps {
  runtime: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  selectedObjectId: string | null;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRotate: (id: string, angle: number) => void;
}

/* ------------------------------------------------------------------ */
/*  Collapsible section                                                */
/* ------------------------------------------------------------------ */

function Section({
  title,
  icon: Icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: typeof Box;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border/30">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted hover:bg-primary/5 transition-colors"
        aria-expanded={open}
      >
        <Icon className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">{title}</span>
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="w-8 shrink-0 text-muted">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step ?? 1}
        className="flex-1 rounded-md border border-border/50 bg-background/60 px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
        aria-label={label}
      />
    </label>
  );
}

/* ------------------------------------------------------------------ */
/*  Sensor sliders (Tinkercad-style interactive controls)               */
/* ------------------------------------------------------------------ */

function SensorSliders({ objectId, objectType }: { objectId: string; objectType: string }) {
  const params = SENSOR_PARAMETERS[objectType];
  const { getValue, setValue, initDefaults } = useSensorValueStore();

  // Initialize defaults on mount
  useState(() => { initDefaults(objectId, objectType); });

  if (!params || params.length === 0) return null;

  return (
    <div className="space-y-3">
      {params.map((param) => {
        const value = getValue(objectId, param.key, param.defaultValue);
        const pct = ((value - param.min) / (param.max - param.min)) * 100;

        return (
          <div key={param.key} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted">{param.label}</span>
              <span
                className="text-sm font-bold tabular-nums"
                style={{ color: param.color }}
              >
                {param.step >= 1 ? Math.round(value) : value.toFixed(1)}
                {param.unit && (
                  <span className="text-[10px] font-normal text-muted ml-0.5">{param.unit}</span>
                )}
              </span>
            </div>

            {/* Slider track */}
            <div className="relative">
              <input
                type="range"
                min={param.min}
                max={param.max}
                step={param.step}
                value={value}
                onChange={(e) => setValue(objectId, param.key, Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${param.color} 0%, ${param.color} ${pct}%, var(--color-border, #334155) ${pct}%, var(--color-border, #334155) 100%)`,
                  accentColor: param.color,
                }}
                aria-label={`${param.label} control`}
              />
            </div>

            {/* Min/Max labels */}
            <div className="flex justify-between text-[9px] text-muted/60">
              <span>{param.min}{param.unit}</span>
              <span>{param.max}{param.unit}</span>
            </div>
          </div>
        );
      })}

      <p className="text-[9px] text-muted/50 italic mt-2">
        💡 Drag sliders to control sensor values during simulation
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PropertyPanel({
  runtime,
  selectedObjectId,
  onDelete,
  onDuplicate,
  onRotate,
}: PropertyPanelProps) {
  const isPropertyPanelOpen = useSimulatorStore((s) => s.isPropertyPanelOpen);
  const setPropertyPanelOpen = useSimulatorStore((s) => s.setPropertyPanelOpen);

  // Try to read object data from runtime
  let objectData: {
    objectId: string;
    objectType: string;
    positionX: number;
    positionY: number;
    rotation: number;
    scale: number;
    metadata: Record<string, unknown>;
  } | null = null;

  if (selectedObjectId && runtime) {
    try {
      const snapshot = runtime.getStageSnapshot?.();
      const targets = snapshot?.targets ?? snapshot?.children ?? [];
      for (const t of targets) {
        if (t.objectId === selectedObjectId || t.id === selectedObjectId || t.name === selectedObjectId) {
          objectData = {
            objectId: t.objectId ?? t.id ?? selectedObjectId,
            objectType: t.objectType ?? t.assetId ?? 'unknown',
            positionX: t.positionX ?? t.x ?? 0,
            positionY: t.positionY ?? t.y ?? 0,
            rotation: t.rotation ?? t.direction ?? 0,
            scale: t.scale ?? t.size ? (t.size / 100) : 1,
            metadata: t.metadata ?? {},
          };
          break;
        }
      }
    } catch {
      // runtime not ready
    }
  }

  /* ── Collapsed state ────────────────────────────────────────────── */
  if (!isPropertyPanelOpen) {
    return (
      <div className="flex flex-col items-center border-l border-border bg-card/50 backdrop-blur-md py-3 px-1.5">
        <button
          type="button"
          onClick={() => setPropertyPanelOpen(true)}
          className="p-1.5 rounded-lg text-muted hover:bg-primary/10 hover:text-foreground transition-all duration-200"
          aria-label="Open property panel"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
    );
  }

  /* ── Open state ─────────────────────────────────────────────────── */
  return (
    <aside className="w-80 flex flex-col bg-card/50 backdrop-blur-md border-l border-border overflow-y-auto transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <h2 className="text-sm font-semibold text-foreground tracking-tight">Properties</h2>
        <button
          type="button"
          onClick={() => setPropertyPanelOpen(false)}
          className="p-1 rounded-md text-muted hover:bg-primary/10 hover:text-foreground transition-all duration-200"
          aria-label="Collapse property panel"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Empty state */}
      {!selectedObjectId && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-12 text-muted">
          <Layers className="h-10 w-10 opacity-30" />
          <p className="text-xs text-center leading-relaxed">
            Select a component on the canvas to view and edit its properties
          </p>
        </div>
      )}

      {/* Selected component */}
      {selectedObjectId && (
        <>
          {/* Component info */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Box className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {objectData?.objectType ?? selectedObjectId}
              </p>
              <p className="text-[10px] text-muted truncate">{objectData?.objectId ?? selectedObjectId}</p>
            </div>
          </div>

          {/* Position */}
          <Section title="Position" icon={MapPin}>
            <div className="space-y-2">
              <NumberInput
                label="X"
                value={objectData?.positionX ?? 0}
                onChange={(v) => {
                  if (runtime?.updateWorkspaceObject) {
                    runtime.updateWorkspaceObject(selectedObjectId, { positionX: v });
                  }
                }}
              />
              <NumberInput
                label="Y"
                value={objectData?.positionY ?? 0}
                onChange={(v) => {
                  if (runtime?.updateWorkspaceObject) {
                    runtime.updateWorkspaceObject(selectedObjectId, { positionY: v });
                  }
                }}
              />
            </div>
          </Section>

          {/* Rotation */}
          <Section title="Rotation" icon={RotateCw}>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>Angle</span>
                <span className="text-foreground font-medium">
                  {Math.round(objectData?.rotation ?? 0)}°
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={360}
                value={objectData?.rotation ?? 0}
                onChange={(e) => onRotate(selectedObjectId, Number(e.target.value))}
                className="w-full accent-primary"
                aria-label="Rotation angle"
              />
            </div>
          </Section>

          {/* Scale */}
          <Section title="Scale" icon={Scaling}>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>Factor</span>
                <span className="text-foreground font-medium">
                  {(objectData?.scale ?? 1).toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2.0}
                step={0.05}
                value={objectData?.scale ?? 1}
                onChange={(e) => {
                  if (runtime?.updateWorkspaceObject) {
                    runtime.updateWorkspaceObject(selectedObjectId, { scale: Number(e.target.value) });
                  }
                }}
                className="w-full accent-primary"
                aria-label="Scale factor"
              />
            </div>
          </Section>

          {/* Pin Mapping */}
          <Section title="Pin Mapping" icon={MapPin} defaultOpen={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="text-muted border-b border-border/30">
                    <th className="text-left py-1 pr-2">Name</th>
                    <th className="text-left py-1 pr-2">Type</th>
                    <th className="text-left py-1">Status</th>
                  </tr>
                </thead>
                <tbody className="text-foreground">
                  {objectData?.metadata?.pins
                    ? (objectData.metadata.pins as Array<{ name: string; type: string; connected: boolean }>).map(
                        (pin) => (
                          <tr key={pin.name} className="border-b border-border/20">
                            <td className="py-1 pr-2 font-medium">{pin.name}</td>
                            <td className="py-1 pr-2">{pin.type}</td>
                            <td className="py-1">
                              <span
                                className={`inline-block h-1.5 w-1.5 rounded-full ${
                                  pin.connected ? 'bg-emerald-400' : 'bg-slate-500'
                                }`}
                              />
                            </td>
                          </tr>
                        ),
                      )
                    : (
                      <tr>
                        <td colSpan={3} className="py-2 text-muted text-center">
                          No pin data available
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>
          </Section>

          {/* Electrical State */}
          <Section title="Electrical State" icon={Activity} defaultOpen={false}>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-background/60 border border-border/30 p-2">
                <p className="text-[10px] text-muted">Voltage</p>
                <p className="text-sm font-semibold text-foreground">
                  {((objectData?.metadata?.voltage as number) ?? 0).toFixed(2)}&thinsp;V
                </p>
              </div>
              <div className="rounded-lg bg-background/60 border border-border/30 p-2">
                <p className="text-[10px] text-muted">Current</p>
                <p className="text-sm font-semibold text-foreground">
                  {((objectData?.metadata?.current as number) ?? 0).toFixed(1)}&thinsp;mA
                </p>
              </div>
            </div>
          </Section>

          {/* Custom Properties */}
          <Section title="Custom Properties" icon={Settings} defaultOpen={false}>
            {objectData?.objectType?.includes('led') && (
              <label className="flex items-center gap-2 text-xs">
                <span className="text-muted">Color</span>
                <input
                  type="color"
                  defaultValue="#ff0000"
                  className="h-6 w-8 cursor-pointer rounded border border-border/50 bg-transparent"
                  aria-label="LED color"
                  onChange={(e) => {
                    if (runtime?.updateWorkspaceObject) {
                      runtime.updateWorkspaceObject(selectedObjectId, {
                        metadata: { ...objectData?.metadata, color: e.target.value },
                      });
                    }
                  }}
                />
              </label>
            )}
            {objectData?.objectType?.includes('resistor') && (
              <NumberInput
                label="Ω"
                value={(objectData?.metadata?.resistance as number) ?? 220}
                onChange={(v) => {
                  if (runtime?.updateWorkspaceObject) {
                    runtime.updateWorkspaceObject(selectedObjectId, {
                      metadata: { ...objectData?.metadata, resistance: v },
                    });
                  }
                }}
                min={0}
                max={10000000}
              />
            )}
            {objectData?.objectType?.includes('servo') && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>Angle</span>
                  <span className="text-foreground font-medium">
                    {((objectData?.metadata?.angle as number) ?? 90)}°
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={180}
                  value={(objectData?.metadata?.angle as number) ?? 90}
                  className="w-full accent-primary"
                  aria-label="Servo angle"
                  readOnly
                />
              </div>
            )}
            {!objectData?.objectType?.includes('led') &&
              !objectData?.objectType?.includes('resistor') &&
              !objectData?.objectType?.includes('servo') && (
                <p className="text-[10px] text-muted">No custom properties for this component</p>
              )}
          </Section>

          {/* ── Sensor Controls (Tinkercad-style interactive sliders) ── */}
          {objectData?.objectType && SENSOR_PARAMETERS[objectData.objectType] && (
            <Section title="Sensor Controls" icon={Gauge} defaultOpen={true}>
              <SensorSliders
                objectId={selectedObjectId}
                objectType={objectData.objectType}
              />
            </Section>
          )}

          {/* Actions */}
          <div className="flex gap-2 px-4 py-3 mt-auto border-t border-border/30">
            <button
              type="button"
              onClick={() => onDelete(selectedObjectId)}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
              aria-label="Delete component"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
            <button
              type="button"
              onClick={() => onDuplicate(selectedObjectId)}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-blue-500/10 px-3 py-2 text-xs font-medium text-blue-400 hover:bg-blue-500/20 transition-colors"
              aria-label="Duplicate component"
            >
              <Copy className="h-3.5 w-3.5" />
              Duplicate
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
