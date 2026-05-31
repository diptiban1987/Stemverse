'use client';

import { listBoards, getBoard, type BoardSettings, DEFAULT_BOARD_SETTINGS } from '@stemverse/blockly-engine';
import { Button } from '@stemverse/ui';

export type BoardManagerProps = {
  boardId: string;
  settings: BoardSettings;
  onBoardChange: (boardId: string) => void;
  onSettingsChange: (settings: BoardSettings) => void;
};

export function BoardManager({
  boardId,
  settings,
  onBoardChange,
  onSettingsChange,
}: BoardManagerProps) {
  const board = getBoard(boardId);
  const boards = listBoards();

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Board Manager</h3>
        <p className="text-xs text-muted">Select target hardware and upload settings</p>
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-muted">Board</span>
        <select
          value={boardId}
          onChange={(e) => onBoardChange(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          {boards.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-muted">Architecture</span>
          <p className="font-medium">{board.architecture}</p>
        </div>
        <div>
          <span className="text-muted">Digital pins</span>
          <p className="font-medium">{board.digitalPins.length}</p>
        </div>
        <div>
          <span className="text-muted">WiFi</span>
          <p className="font-medium">{board.capabilities.wifi ? 'Yes' : 'No'}</p>
        </div>
        <div>
          <span className="text-muted">ADC / DAC</span>
          <p className="font-medium">
            {board.capabilities.adc ? 'ADC' : '—'}
            {board.capabilities.dac ? ' + DAC' : ''}
          </p>
        </div>
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-muted">CPU Frequency (MHz)</span>
        <input
          type="number"
          value={settings.cpuFrequency}
          onChange={(e) =>
            onSettingsChange({ ...settings, cpuFrequency: Number(e.target.value) })
          }
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-muted">Flash Size</span>
        <select
          value={settings.flashSize}
          onChange={(e) => onSettingsChange({ ...settings, flashSize: e.target.value })}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          {['32KB', '256KB', '512KB', '2MB', '4MB', '8MB', '16MB'].map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={settings.psram}
          onChange={(e) => onSettingsChange({ ...settings, psram: e.target.checked })}
        />
        PSRAM enabled
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-muted">Upload Speed</span>
        <select
          value={settings.uploadSpeed}
          onChange={(e) =>
            onSettingsChange({ ...settings, uploadSpeed: Number(e.target.value) })
          }
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          {[115200, 230400, 460800, 921600].map((speed) => (
            <option key={speed} value={speed}>
              {speed}
            </option>
          ))}
        </select>
      </label>

      <Button
        type="button"
        variant="ghost"
        className="w-full text-xs"
        onClick={() => onSettingsChange(DEFAULT_BOARD_SETTINGS)}
      >
        Reset to defaults
      </Button>
    </div>
  );
}
