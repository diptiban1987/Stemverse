'use client';

import { useCallback, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Cpu,
  Zap,
  Circle,
  Check,
  AlertTriangle,
  Cable,
  Trash2,
  PlugZap,
} from 'lucide-react';
import { useSimulatorStore } from './simulator-store';
import { usePinAssignmentStore } from './pin-assignment-store';
import type { PinAssignment } from './pin-assignment-store';

/* ------------------------------------------------------------------ */
/*  Signal type styling                                                */
/* ------------------------------------------------------------------ */

const SIGNAL_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  POWER: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'VCC' },
  GND: { bg: 'bg-slate-600/30', text: 'text-slate-400', label: 'GND' },
  DIGITAL: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Digital' },
  ANALOG: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Analog' },
  PWM: { bg: 'bg-violet-500/20', text: 'text-violet-400', label: 'PWM' },
  PASSIVE: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Passive' },
  RESET: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Reset' },
};

function getSignalStyle(signalType: string) {
  return SIGNAL_COLORS[signalType.toUpperCase()] ?? { bg: 'bg-gray-500/20', text: 'text-gray-400', label: signalType };
}

/* ------------------------------------------------------------------ */
/*  Pin Row component                                                  */
/* ------------------------------------------------------------------ */

function PinRow({
  componentObjectId,
  pin,
  assignment,
  freePins,
  onAssign,
  onUnassign,
}: {
  componentObjectId: string;
  pin: { name: string; signalType: string };
  assignment: PinAssignment | undefined;
  freePins: Array<{ name: string; signalType: string }>;
  onAssign: (componentId: string, pinName: string, boardPin: string) => void;
  onUnassign: (componentId: string, pinName: string) => void;
}) {
  const style = getSignalStyle(pin.signalType);
  const isAutoPin = pin.signalType === 'POWER' || pin.signalType === 'GND';
  const isAssigned = !!assignment;

  return (
    <div className="flex items-center gap-2 py-1.5 group">
      {/* Pin name + signal badge */}
      <div className="flex items-center gap-1.5 min-w-[90px]">
        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold ${style.bg} ${style.text}`}>
          {pin.signalType === 'POWER' ? '⚡' : pin.signalType === 'GND' ? '⏚' : '●'}&nbsp;{pin.name}
        </span>
      </div>

      {/* Arrow */}
      <span className="text-[10px] text-muted">→</span>

      {/* Assignment dropdown or auto label */}
      <div className="flex-1 min-w-0">
        {isAutoPin && isAssigned ? (
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: assignment.wireColor }}
            />
            <span className="text-[10px] font-medium text-foreground truncate">
              {assignment.boardPinName}
            </span>
            <span className="text-[9px] text-muted italic">auto</span>
          </div>
        ) : isAutoPin && !isAssigned ? (
          <span className="text-[10px] text-amber-400/70 italic">No board detected</span>
        ) : isAssigned ? (
          <div className="flex items-center gap-1">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: assignment.wireColor }}
            />
            <select
              value={assignment.boardPinName}
              onChange={(e) => {
                if (e.target.value === '__unassign__') {
                  onUnassign(componentObjectId, pin.name);
                } else {
                  onAssign(componentObjectId, pin.name, e.target.value);
                }
              }}
              className="flex-1 min-w-0 rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500/40 cursor-pointer"
              aria-label={`GPIO pin for ${pin.name}`}
            >
              <option value={assignment.boardPinName}>{assignment.boardPinName}</option>
              {freePins
                .filter((fp) => fp.name !== assignment.boardPinName)
                .map((fp) => (
                  <option key={fp.name} value={fp.name}>
                    {fp.name}
                  </option>
                ))}
              <option value="__unassign__">— Disconnect —</option>
            </select>
          </div>
        ) : (
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) {
                onAssign(componentObjectId, pin.name, e.target.value);
              }
            }}
            className="w-full rounded border border-border/50 bg-background/60 px-1.5 py-0.5 text-[10px] text-muted focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer hover:border-primary/40 transition-colors"
            aria-label={`Select GPIO pin for ${pin.name}`}
          >
            <option value="">Select GPIO pin...</option>
            {freePins.map((fp) => (
              <option key={fp.name} value={fp.name}>
                {fp.name} ({fp.signalType})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Status indicator */}
      <div className="w-4 shrink-0 flex justify-center">
        {isAssigned ? (
          <Check className="h-3 w-3 text-emerald-400" />
        ) : isAutoPin ? (
          <AlertTriangle className="h-3 w-3 text-amber-400/50" />
        ) : (
          <Circle className="h-3 w-3 text-muted/30" />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component Card                                                     */
/* ------------------------------------------------------------------ */

function ComponentCard({
  component,
  onAssign,
  onUnassign,
  onRemove,
}: {
  component: { objectId: string; objectType: string; displayName: string; pins: Array<{ name: string; signalType: string }> };
  onAssign: (componentId: string, pinName: string, boardPin: string) => void;
  onUnassign: (componentId: string, pinName: string) => void;
  onRemove: (objectId: string) => void;
}) {
  const assignments = usePinAssignmentStore((s) => s.assignments);
  const getFreeBoardPins = usePinAssignmentStore((s) => s.getFreeBoardPins);

  const componentAssignments = useMemo(
    () => assignments.filter((a) => a.componentObjectId === component.objectId),
    [assignments, component.objectId],
  );

  const assignedCount = componentAssignments.length;
  const totalPins = component.pins.length;

  // Separate power/gnd pins from signal pins
  const powerPins = component.pins.filter(
    (p) => p.signalType === 'POWER' || p.signalType === 'GND',
  );
  const signalPins = component.pins.filter(
    (p) => p.signalType !== 'POWER' && p.signalType !== 'GND',
  );

  return (
    <div className="border border-border/30 rounded-lg overflow-hidden bg-background/30">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border-b border-border/20">
        <PlugZap className="h-3.5 w-3.5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-foreground truncate">
            {component.displayName}
          </p>
          <p className="text-[9px] text-muted truncate">{component.objectId}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
            assignedCount === totalPins
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-amber-500/20 text-amber-400'
          }`}>
            {assignedCount}/{totalPins}
          </span>
          <button
            type="button"
            onClick={() => onRemove(component.objectId)}
            className="p-0.5 rounded text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
            aria-label={`Remove ${component.displayName}`}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Pin rows */}
      <div className="px-3 py-1.5 divide-y divide-border/10">
        {/* Power pins first */}
        {powerPins.map((pin) => (
          <PinRow
            key={pin.name}
            componentObjectId={component.objectId}
            pin={pin}
            assignment={componentAssignments.find((a) => a.componentPinName === pin.name)}
            freePins={getFreeBoardPins(pin.signalType)}
            onAssign={onAssign}
            onUnassign={onUnassign}
          />
        ))}

        {/* Signal pins */}
        {signalPins.length > 0 && powerPins.length > 0 && (
          <div className="pt-1 -mx-3 px-3 border-t border-border/20">
            <p className="text-[8px] uppercase tracking-wider text-muted/60 font-bold py-1">Signal Pins</p>
          </div>
        )}
        {signalPins.map((pin) => (
          <PinRow
            key={pin.name}
            componentObjectId={component.objectId}
            pin={pin}
            assignment={componentAssignments.find((a) => a.componentPinName === pin.name)}
            freePins={getFreeBoardPins(pin.signalType)}
            onAssign={onAssign}
            onUnassign={onUnassign}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Panel                                                         */
/* ------------------------------------------------------------------ */

export interface PinAssignmentPanelProps {
  runtime: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  onDeleteComponent: (id: string) => void;
  onWireGenerated: (assignment: PinAssignment, wireId: string) => void;
}

export function PinAssignmentPanel({
  runtime: _runtime, // eslint-disable-line @typescript-eslint/no-unused-vars
  onDeleteComponent,
  onWireGenerated,
}: PinAssignmentPanelProps) {
  const isPropertyPanelOpen = useSimulatorStore((s) => s.isPropertyPanelOpen);
  const setPropertyPanelOpen = useSimulatorStore((s) => s.setPropertyPanelOpen);

  const boardObjectId = usePinAssignmentStore((s) => s.boardObjectId);
  const droppedComponents = usePinAssignmentStore((s) => s.droppedComponents);
  const assignments = usePinAssignmentStore((s) => s.assignments);
  const getBoardInfo = usePinAssignmentStore((s) => s.getBoardInfo);
  const assignPin = usePinAssignmentStore((s) => s.assignPin);
  const unassignPin = usePinAssignmentStore((s) => s.unassignPin);
  const removeComponent = usePinAssignmentStore((s) => s.removeComponent);

  const boardInfo = getBoardInfo();

  // Count used GPIO pins
  const usedGpioPins = useMemo(
    () => new Set(assignments.filter((a) => !a.isAutoAssigned).map((a) => a.boardPinName)),
    [assignments],
  );

  const totalGpio = boardInfo?.gpio.length ?? 0;
  const usedGpioCount = usedGpioPins.size;

  const handleAssign = useCallback(
    (componentId: string, pinName: string, boardPin: string) => {
      assignPin(componentId, pinName, boardPin);
      // Wire generation will be triggered by the workspace via useEffect
      const assignment = usePinAssignmentStore.getState().getAssignment(componentId, pinName);
      if (assignment) {
        onWireGenerated(assignment, '');
      }
    },
    [assignPin, onWireGenerated],
  );

  const handleUnassign = useCallback(
    (componentId: string, pinName: string) => {
      unassignPin(componentId, pinName);
    },
    [unassignPin],
  );

  const handleRemove = useCallback(
    (objectId: string) => {
      removeComponent(objectId);
      onDeleteComponent(objectId);
    },
    [removeComponent, onDeleteComponent],
  );

  /* ── Collapsed state ────────────────────────────────────────────── */
  if (!isPropertyPanelOpen) {
    return (
      <div className="flex flex-col items-center border-l border-border bg-card/50 backdrop-blur-md py-3 px-1.5">
        <button
          type="button"
          onClick={() => setPropertyPanelOpen(true)}
          className="p-1.5 rounded-lg text-muted hover:bg-primary/10 hover:text-foreground transition-all duration-200"
          aria-label="Open pin assignment panel"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {/* Vertical badge showing assignment count */}
        {droppedComponents.length > 0 && (
          <div className="mt-3 flex flex-col items-center gap-1">
            <Cable className="h-4 w-4 text-primary/70" />
            <span className="text-[9px] font-bold text-primary">{assignments.length}</span>
          </div>
        )}
      </div>
    );
  }

  /* ── Open state ─────────────────────────────────────────────────── */
  return (
    <aside className="w-80 flex flex-col bg-card/50 backdrop-blur-md border-l border-border overflow-y-auto transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Cable className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground tracking-tight">Pin Assignment</h2>
        </div>
        <button
          type="button"
          onClick={() => setPropertyPanelOpen(false)}
          className="p-1 rounded-md text-muted hover:bg-primary/10 hover:text-foreground transition-all duration-200"
          aria-label="Collapse panel"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Board info */}
      <div className="px-4 py-3 border-b border-border/30">
        {boardInfo ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Cpu className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">{boardInfo.displayName}</p>
                <p className="text-[9px] text-muted">{boardObjectId}</p>
              </div>
            </div>

            {/* GPIO usage bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] text-muted">
                <span>GPIO Usage</span>
                <span className="font-medium text-foreground">{usedGpioCount}/{totalGpio} used</span>
              </div>
              <div className="h-1.5 rounded-full bg-background/60 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-300"
                  style={{ width: `${totalGpio > 0 ? (usedGpioCount / totalGpio) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-amber-400/80">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <p className="text-[10px]">
              Drop a board (ESP32, Arduino) on the canvas to enable pin assignment
            </p>
          </div>
        )}
      </div>

      {/* Component list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {droppedComponents.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted">
            <Zap className="h-10 w-10 opacity-20" />
            <p className="text-[10px] text-center leading-relaxed px-4">
              Drag components from the palette to the canvas.
              Their pins will appear here for GPIO assignment.
            </p>
          </div>
        ) : (
          droppedComponents.map((comp) => (
            <ComponentCard
              key={comp.objectId}
              component={comp}
              onAssign={handleAssign}
              onUnassign={handleUnassign}
              onRemove={handleRemove}
            />
          ))
        )}
      </div>

      {/* Footer summary */}
      {assignments.length > 0 && (
        <div className="px-4 py-2.5 border-t border-border/30 bg-background/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[9px] text-muted">
              <Cable className="h-3 w-3" />
              <span>{assignments.length} wire{assignments.length !== 1 ? 's' : ''} connected</span>
            </div>
            <div className="flex gap-1">
              {/* Color legend */}
              <span className="inline-flex items-center gap-0.5 text-[8px] text-red-400">
                <span className="w-2 h-2 rounded-full bg-red-500" /> VCC
              </span>
              <span className="inline-flex items-center gap-0.5 text-[8px] text-slate-400">
                <span className="w-2 h-2 rounded-full bg-slate-700" /> GND
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
