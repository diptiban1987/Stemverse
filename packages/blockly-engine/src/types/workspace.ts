export type WorkspaceVariable = {
  id: string;
  name: string;
  type: string;
};

export type WorkspaceFunction = {
  id: string;
  name: string;
  parameters: string[];
};

export type WorkspaceDocument = {
  project_id: string;
  name: string;
  board: string;
  language: 'arduino_cpp' | 'esp_idf';
  blocks: unknown;
  variables: WorkspaceVariable[];
  functions: WorkspaceFunction[];
  libraries: string[];
  board_settings?: {
    cpuFrequency: number;
    flashSize: string;
    psram: boolean;
    uploadSpeed: number;
  };
  updated_at?: string;
};

export function createEmptyWorkspace(
  overrides: Partial<WorkspaceDocument> = {},
): WorkspaceDocument {
  return {
    project_id: `project_${Date.now()}`,
    name: 'Untitled Robotics Project',
    board: 'arduino_uno',
    language: 'arduino_cpp',
    blocks: null,
    variables: [],
    functions: [],
    libraries: [],
    ...overrides,
  };
}
