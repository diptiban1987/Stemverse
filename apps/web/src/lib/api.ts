export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  const data = text ? (JSON.parse(text) as T) : ({} as T);
  if (!res.ok) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'message' in data
        ? String((data as { message: string | string[] }).message)
        : res.statusText;
    throw new ApiError(
      Array.isArray(message) ? message.join(', ') : message,
      res.status,
      data,
    );
  }
  return data;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers, ...rest } = options;
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  // ── 401 Interceptor: redirect to login on unauthorized ──────
  if (res.status === 401 && token) {
    // Lazy import to avoid circular dependency
    const { useAuthStore } = await import('./auth-store');
    useAuthStore.getState().handleUnauthorized();
  }

  return parseResponse<T>(res);
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  displayName: string | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  visibility: string;
  boardType?: string | null;
  thumbnailUrl?: string | null;
  updatedAt: string;
  createdAt?: string;
}

export interface ProjectDetail extends ProjectSummary {
  workspaceJson: unknown;
  boardType?: string | null;
  workspaces?: Array<{ id: string; workspaceJson: unknown }>;
}

export interface ComponentRegistryResponse {
  boards: Array<Record<string, unknown>>;
  sensors: Array<Record<string, unknown>>;
  actuators: Array<Record<string, unknown>>;
  source: string;
}

export interface DashboardData {
  user: AuthUser & {
    organization?: { id: string; name: string; plan: string } | null;
    _count: { projects: number; certificates: number };
  };
  recentProjects: ProjectSummary[];
  continueLearning: Array<{
    id: string;
    title: string;
    slug: string;
    category: string;
    level: string;
  }>;
  certifications: Array<{
    id: string;
    issuedAt: string;
    course: { title: string; slug: string };
  }>;
  stats: { projectCount: number; certificateCount: number };
}

export const authApi = {
  register: (body: { email: string; password: string; displayName?: string }) =>
    apiFetch<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  login: async (body: { email: string; password: string }): Promise<AuthResponse> => {
    try {
      return await apiFetch<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    } catch {
      // Fallback mock login for dev when backend is unavailable
      console.warn('[Auth] Backend unavailable — using mock login for development');
      return {
        accessToken: `dev-mock-token-${Date.now()}`,
        refreshToken: `dev-mock-refresh-${Date.now()}`,
        user: {
          id: `dev-${body.email.replace(/[^a-z0-9]/gi, '_')}`,
          email: body.email,
          role: 'STUDENT',
          displayName: body.email.split('@')[0] || 'Dev User',
        },
      };
    }
  },
  refresh: (refreshToken: string) =>
    apiFetch<AuthResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),
  logout: (refreshToken: string) =>
    apiFetch<{ success: boolean }>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),
};

export const userApi = {
  dashboard: (token: string) =>
    apiFetch<DashboardData>('/users/me/dashboard', { token }),
  profile: (token: string) =>
    apiFetch<AuthUser>('/users/me', { token }),
};

export const projectApi = {
  list: (token: string, type?: string) =>
    apiFetch<ProjectSummary[]>(
      `/projects${type ? `?type=${type}` : ''}`,
      { token },
    ),
  get: (token: string, id: string) =>
    apiFetch<ProjectDetail>(`/projects/${id}`, { token }),
  create: (
    token: string,
    body: {
      name: string;
      description?: string;
      type?: string;
      workspaceJson?: unknown;
      boardType?: string;
    },
  ) =>
    apiFetch<ProjectDetail>('/projects', {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    }),
  update: (
    token: string,
    id: string,
    body: { name?: string; workspaceJson?: unknown; boardType?: string },
  ) =>
    apiFetch<ProjectDetail>(`/projects/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(body),
    }),
  remove: (token: string, id: string) =>
    apiFetch<{ success: boolean }>(`/projects/${id}`, {
      method: 'DELETE',
      token,
    }),
};

export const componentsApi = {
  getRegistry: () => apiFetch<ComponentRegistryResponse>('/components'),
};

export interface CompileJobResponse {
  jobId: string;
  status: string;
  board: string;
}

export type ExplainLevel = 'beginner' | 'intermediate' | 'advanced';

export interface AiExplainResponse {
  explanation: string;
  provider: string;
}

export interface AiTextToBlocksResponse {
  workspace: WorkspaceDocument;
  summary: string;
  matchedPattern: string;
  provider: string;
}

import type { WorkspaceDocument } from '@stemverse/blockly-engine';

export type { WorkspaceDocument };

export interface TextToProjectResult {
  name: string;
  board: string;
  workspace: WorkspaceDocument;
  generatedCode: string;
  libraries: string[];
  wiring: {
    components: Array<{ slug: string; name: string; role: string }>;
    pinMappings: Array<{
      component: string;
      pin: number | string;
      function: string;
      notes?: string;
    }>;
    connections: string[];
    warnings: string[];
  };
  summary: string;
  provider: string;
}

export interface AiWiringResponse {
  components: Array<{ slug: string; name: string; role: string }>;
  pinMappings: Array<{
    component: string;
    pin: number | string;
    function: string;
    notes?: string;
  }>;
  connections: string[];
  warnings: string[];
  provider: string;
}

export const aiApi = {
  explainBlock: (
    token: string,
    body: {
      blockType: string;
      fields?: Record<string, string | number>;
      level: ExplainLevel;
      boardSlug?: string;
    },
  ) =>
    apiFetch<AiExplainResponse>('/ai/explain/block', {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    }),

  explainCode: (
    token: string,
    body: { code: string; level: ExplainLevel; boardSlug?: string },
  ) =>
    apiFetch<AiExplainResponse>('/ai/explain/code', {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    }),

  textToBlocks: (token: string, body: { prompt: string; boardSlug?: string }) =>
    apiFetch<AiTextToBlocksResponse>('/ai/text-to-blocks', {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    }),

  textToProject: (token: string, body: { description: string; boardSlug?: string }) =>
    apiFetch<TextToProjectResult>('/ai/text-to-project', {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    }),

  wiring: (token: string, body: { workspace: WorkspaceDocument; boardSlug?: string }) =>
    apiFetch<AiWiringResponse>('/ai/wiring', {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    }),

  copilot: (
    token: string,
    body: {
      workspace: WorkspaceDocument;
      generatedCode?: string;
      validationIssues?: Array<{ code: string; message: string; severity: string }>;
      boardSlug?: string;
      model?: string;
    },
  ) =>
    apiFetch<CopilotResponse>('/ai/copilot', {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    }),

  autoFix: (token: string, body: { workspace: WorkspaceDocument; boardSlug?: string }) =>
    apiFetch<AutoFixResponse>('/ai/auto-fix', {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    }),

  simulatorAssist: (
    token: string,
    body: {
      workspace: WorkspaceDocument;
      generatedCode?: string;
      simulatorMetadata?: Record<string, unknown>;
      boardSlug?: string;
    },
  ) =>
    apiFetch<SimulatorAssistResponse>('/ai/simulator', {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    }),

  listModels: (token: string) =>
    apiFetch<{ models: AiModelOption[] }>('/ai/models', { token }),
};

export interface AiModelOption {
  id: string;
  tier: 'free' | 'paid';
  label: string;
}

export interface CopilotSuggestion {
  category: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export interface CopilotResponse {
  suggestions: CopilotSuggestion[];
  summary: string;
  provider: string;
  usage?: Record<string, unknown>;
}

export interface AutoFixSuggestion {
  id: string;
  issueCode: string;
  title: string;
  description: string;
  action: string;
  blockId?: string;
  autoApplicable: boolean;
}

export interface AutoFixResponse {
  suggestions: AutoFixSuggestion[];
  issueCount: number;
  fixableCount: number;
  provider: string;
}

export interface SimulatorAssistResponse {
  explanations: string[];
  sensorSuggestions: Array<{ component: string; property: string; suggestedValue: number | string }>;
  tuningTips: string[];
  provider: string;
}

export interface ProjectVersionSummary {
  id: string;
  versionNumber: number;
  label: string | null;
  createdAt: string;
}

export interface AiUserSettings {
  userId: string;
  preferredModel: string | null;
  fallbackModel: string | null;
  temperature: number;
  maxTokens: number;
  streamingEnabled: boolean;
}

export interface AiSession {
  id: string;
  title: string;
  model: string | null;
  messages: unknown[];
  metadata: Record<string, unknown>;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
}

export const versionApi = {
  list: (token: string, projectId: string) =>
    apiFetch<ProjectVersionSummary[]>(`/projects/${projectId}/versions`, { token }),

  create: (
    token: string,
    projectId: string,
    body: {
      label?: string;
      workspaceJson?: unknown;
      generatedCode?: string;
      simulatorMetadata?: Record<string, unknown>;
    },
  ) =>
    apiFetch<ProjectVersionSummary>(`/projects/${projectId}/versions`, {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    }),

  restore: (token: string, projectId: string, versionId: string) =>
    apiFetch<{ project: ProjectDetail }>(`/projects/${projectId}/versions/${versionId}/restore`, {
      method: 'POST',
      token,
    }),

  compare: (token: string, projectId: string, versionA: string, versionB: string) =>
    apiFetch<Record<string, unknown>>(
      `/projects/${projectId}/versions/compare?a=${versionA}&b=${versionB}`,
      { token },
    ),

  remove: (token: string, projectId: string, versionId: string) =>
    apiFetch<{ success: boolean }>(`/projects/${projectId}/versions/${versionId}`, {
      method: 'DELETE',
      token,
    }),
};

export const communityApi = {
  browse: (params?: { q?: string; type?: string; board?: string; tag?: string; sort?: string }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set('q', params.q);
    if (params?.type) qs.set('type', params.type);
    if (params?.board) qs.set('board', params.board);
    if (params?.tag) qs.set('tag', params.tag);
    if (params?.sort) qs.set('sort', params.sort);
    const query = qs.toString();
    return apiFetch<CommunityBrowseResult>(`/community/browse${query ? `?${query}` : ''}`);
  },

  listPublic: (type?: string) =>
    apiFetch<PublicProjectSummary[]>(`/community/projects${type ? `?type=${type}` : ''}`),

  getBySlug: (slug: string) =>
    apiFetch<PublicProjectDetail>(`/community/projects/${slug}`),

  getRelated: (slug: string) =>
    apiFetch<PublicProjectSummary[]>(`/community/projects/${slug}/related`),

  fork: (token: string, slug: string) =>
    apiFetch<ProjectDetail>(`/community/projects/${slug}/fork`, {
      method: 'POST',
      token,
    }),

  publish: (token: string, projectId: string, visibility: 'PRIVATE' | 'PUBLIC' | 'UNLISTED') =>
    apiFetch<ProjectDetail>(`/community/publish/${projectId}`, {
      method: 'POST',
      token,
      body: JSON.stringify({ visibility }),
    }),
};

export interface CommunityBrowseResult {
  projects: Array<PublicProjectSummary & { forkCount?: number; tags?: string[] }>;
  featured: Array<PublicProjectSummary & { forkCount?: number; tags?: string[] }>;
  trending: Array<PublicProjectSummary & { forkCount?: number; tags?: string[] }>;
  tags: string[];
}

export interface PublicProjectSummary {
  id: string;
  slug: string | null;
  name: string;
  description?: string | null;
  type: string;
  boardType?: string | null;
  updatedAt: string;
  owner?: { displayName: string | null };
}

export interface PublicProjectDetail extends PublicProjectSummary {
  workspaceJson: unknown;
  visibility: string;
  forkCount?: number;
  tags?: string[];
}

export const aiStudioApi = {
  getSettings: (token: string) =>
    apiFetch<AiUserSettings>('/ai-studio/settings', { token }),

  updateSettings: (token: string, body: Partial<AiUserSettings>) =>
    apiFetch<AiUserSettings>('/ai-studio/settings', {
      method: 'PUT',
      token,
      body: JSON.stringify(body),
    }),

  listSessions: (token: string, projectId?: string) =>
    apiFetch<AiSession[]>(
      `/ai-studio/sessions${projectId ? `?projectId=${projectId}` : ''}`,
      { token },
    ),

  createSession: (
    token: string,
    body: { title: string; projectId?: string; model?: string; messages?: unknown[] },
  ) =>
    apiFetch<AiSession>('/ai-studio/sessions', {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    }),

  updateSession: (
    token: string,
    sessionId: string,
    body: { title?: string; messages?: unknown[] },
  ) =>
    apiFetch<AiSession>(`/ai-studio/sessions/${sessionId}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(body),
    }),
};

export interface LmsTrack {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  courses: Array<{ id: string; title: string; slug: string; level: string }>;
}

export interface LmsCourseSummary {
  id: string;
  title: string;
  slug: string;
  level: string;
  category: string;
  track?: { slug: string; title: string } | null;
  _count?: { modules: number };
}

export interface LmsProgressDashboard {
  enrollments: Array<{ course: LmsCourseSummary; progressPercent: number }>;
  lessonsCompleted: number;
  certificatesEarned: number;
  certificates: Array<{
    id: string;
    level: string;
    metadata: Record<string, unknown>;
    course: { title: string; slug: string };
    issuedAt: string;
  }>;
  quizAttempts: Array<{
    id: string;
    score: number;
    maxScore: number;
    passed: boolean;
    assessment: { title: string };
  }>;
}

export const lmsApi = {
  tracks: () => apiFetch<LmsTrack[]>('/lms/tracks'),
  courses: (track?: string) =>
    apiFetch<LmsCourseSummary[]>(`/lms/courses${track ? `?track=${track}` : ''}`),
  course: (slug: string) => apiFetch<Record<string, unknown>>(`/lms/courses/${slug}`),
  lesson: (id: string) => apiFetch<Record<string, unknown>>(`/lms/lessons/${id}`),
  assessment: (id: string) => apiFetch<Record<string, unknown>>(`/lms/assessments/${id}`),
  submitAssessment: (
    token: string,
    id: string,
    answers: Record<string, unknown>,
  ) =>
    apiFetch<{ percent: number; passed: boolean; score: number; maxScore: number }>(
      `/lms/assessments/${id}/submit`,
      { method: 'POST', token, body: JSON.stringify({ answers }) },
    ),
  progressDashboard: (token: string) =>
    apiFetch<LmsProgressDashboard>('/lms/progress/dashboard', { token }),
  enroll: (token: string, courseId: string) =>
    apiFetch<unknown>(`/lms/progress/enroll/${courseId}`, { method: 'POST', token }),
  completeLesson: (token: string, lessonId: string) =>
    apiFetch<unknown>(`/lms/progress/lessons/${lessonId}/complete`, { method: 'POST', token }),
  certificates: (token: string) =>
    apiFetch<LmsProgressDashboard['certificates']>('/lms/certificates', { token }),
};

export type MarketplaceItemType =
  | 'PLUGIN'
  | 'COMPONENT_SENSOR'
  | 'COMPONENT_ACTUATOR'
  | 'COMPONENT_DISPLAY'
  | 'COMPONENT_BOARD'
  | 'COURSE'
  | 'PROJECT';

export interface MarketplaceListing {
  id: string;
  slug: string;
  type: MarketplaceItemType;
  title: string;
  description?: string | null;
  category: string;
  version: string;
  installCount: number;
  author?: { displayName?: string | null };
}

export const marketplaceApi = {
  search: (params?: { type?: MarketplaceItemType; category?: string; q?: string }) => {
    const qs = new URLSearchParams();
    if (params?.type) qs.set('type', params.type);
    if (params?.category) qs.set('category', params.category);
    if (params?.q) qs.set('q', params.q);
    const query = qs.toString();
    return apiFetch<MarketplaceListing[]>(
      `/marketplace/listings${query ? `?${query}` : ''}`,
    );
  },
  categories: (type?: MarketplaceItemType) =>
    apiFetch<Array<{ category: string; _count: { category: number } }>>(
      `/marketplace/listings/categories${type ? `?type=${type}` : ''}`,
    ),
  listing: (slug: string) => apiFetch<MarketplaceListing>(`/marketplace/listings/${slug}`),
  publishPlugin: (token: string, manifest: Record<string, unknown>) =>
    apiFetch<MarketplaceListing>('/marketplace/listings/publish/plugin', {
      method: 'POST',
      token,
      body: JSON.stringify(manifest),
    }),
  installPlugin: (token: string, listingId: string) =>
    apiFetch<unknown>(`/marketplace/plugins/${listingId}/install`, { method: 'POST', token }),
  installedPlugins: (token: string) =>
    apiFetch<unknown[]>('/marketplace/plugins/installed', { token }),
  integrations: () => apiFetch<Record<string, unknown>>('/marketplace/integrations'),
};

export const compilerApi = {
  createJob: (
    token: string,
    body: {
      board: 'esp32' | 'esp32_s3' | 'arduino_uno';
      sourceCode?: string;
      projectName?: string;
      projectId?: string;
    },
  ) =>
    apiFetch<CompileJobResponse>('/compiler', {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    }),
  getJob: (token: string, jobId: string) =>
    apiFetch<Record<string, unknown>>(`/compiler/${jobId}`, { token }),
};
