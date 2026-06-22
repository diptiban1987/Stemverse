/**
 * Phase 36D — Runtime Integration Wiring
 *
 * Connects all DISCONNECTED and PARTIAL runtime modules into
 * cohesive workflows. No new features — only wiring.
 *
 * Provides unified access points for:
 * - Project lifecycle (create → save → version → publish → marketplace)
 * - Teacher workflow (assignment → submission → grade → certificate)
 * - Competition workflow (create → register → judge → leaderboard)
 * - Student dashboard aggregation
 * - Admin/Organization dashboard aggregation
 */

import type {
  AuthUserModel, OrganizationRoleType,
} from '../types';

// ─── Helpers ─────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => Date.now();

// ─── Workflow Types ──────────────────────────────────────────

export interface WorkflowStep {
  stepId: string;
  workflowId: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startedAt: number | null;
  completedAt: number | null;
  data: Record<string, unknown>;
}

export interface WorkflowInstance {
  workflowId: string;
  type: WorkflowType;
  userId: string;
  status: 'active' | 'completed' | 'failed' | 'cancelled';
  steps: WorkflowStep[];
  createdAt: number;
  completedAt: number | null;
  metadata: Record<string, unknown>;
}

export type WorkflowType =
  | 'project_publish'
  | 'teacher_assignment'
  | 'competition_run'
  | 'certification_issue'
  | 'marketplace_publish'
  | 'collaboration_session'
  | 'device_upload'
  | 'ai_circuit_generate';

// ─── Dashboard Types ─────────────────────────────────────────

export interface StudentDashboardData {
  userId: string;
  enrolledClassrooms: number;
  activeAssignments: number;
  completedAssignments: number;
  certificates: number;
  competitionsEntered: number;
  projectsCreated: number;
  projectsPublished: number;
  totalPoints: number;
  recentActivity: DashboardActivity[];
}

export interface TeacherDashboardData {
  userId: string;
  classroomsOwned: number;
  totalStudents: number;
  assignmentsCreated: number;
  assignmentsGraded: number;
  certificatesIssued: number;
  competitionsCreated: number;
  averageClassScore: number;
  recentActivity: DashboardActivity[];
}

export interface AdminDashboardData {
  organizationId: string;
  totalMembers: number;
  totalClassrooms: number;
  totalAssignments: number;
  totalCompetitions: number;
  totalCertificates: number;
  marketplaceAssets: number;
  galleryProjects: number;
  activeUsers: number;
  storageUsedMB: number;
  recentActivity: DashboardActivity[];
}

export interface DashboardActivity {
  activityId: string;
  type: string;
  description: string;
  userId: string;
  timestamp: number;
}

// ─── Navigation Types ────────────────────────────────────────

export interface NavigationNode {
  id: string;
  label: string;
  path: string;
  icon: string;
  requiredRole: OrganizationRoleType | null;
  children: NavigationNode[];
  badge?: number;
  visible: boolean;
}

// ─── Workflow Engine ─────────────────────────────────────────

export function createWorkflow(type: WorkflowType, userId: string, stepNames: string[]): WorkflowInstance {
  return {
    workflowId: uid(), type, userId, status: 'active',
    steps: stepNames.map(name => ({
      stepId: uid(), workflowId: '', name,
      status: 'pending', startedAt: null, completedAt: null, data: {},
    })),
    createdAt: now(), completedAt: null, metadata: {},
  };
}

export function advanceWorkflow(workflow: WorkflowInstance, stepIndex: number, data: Record<string, unknown> = {}): WorkflowInstance {
  if (stepIndex < 0 || stepIndex >= workflow.steps.length) {
    console.warn('[Workflow] Invalid step index:', stepIndex);
    return workflow;
  }
  const steps = workflow.steps.map((s, i) => {
    if (i === stepIndex) return { ...s, status: 'completed' as const, completedAt: now(), data: { ...s.data, ...data } };
    if (i === stepIndex + 1) return { ...s, status: 'in_progress' as const, startedAt: now() };
    return s;
  });
  const allComplete = steps.every(s => s.status === 'completed');
  return { ...workflow, steps, status: allComplete ? 'completed' : 'active', completedAt: allComplete ? now() : null };
}

export function failWorkflow(workflow: WorkflowInstance, reason: string): WorkflowInstance {
  return { ...workflow, status: 'failed', metadata: { ...workflow.metadata, failReason: reason } };
}

export function cancelWorkflow(workflow: WorkflowInstance): WorkflowInstance {
  return { ...workflow, status: 'cancelled' };
}

export function getWorkflowProgress(workflow: WorkflowInstance): number {
  const completed = workflow.steps.filter(s => s.status === 'completed').length;
  return workflow.steps.length > 0 ? completed / workflow.steps.length : 0;
}

// ─── Pre-built Workflows ────────────────────────────────────

export function createProjectPublishWorkflow(userId: string): WorkflowInstance {
  return createWorkflow('project_publish', userId, [
    'Create Project', 'Build Circuit', 'Save Project', 'Create Version',
    'Add Metadata', 'Publish to Gallery', 'Submit to Marketplace',
  ]);
}

export function createTeacherAssignmentWorkflow(userId: string): WorkflowInstance {
  return createWorkflow('teacher_assignment', userId, [
    'Create Assignment', 'Set Requirements', 'Assign to Classroom',
    'Collect Submissions', 'Auto Grade', 'Review Grades', 'Issue Certificates',
  ]);
}

export function createCompetitionWorkflow(userId: string): WorkflowInstance {
  return createWorkflow('competition_run', userId, [
    'Create Competition', 'Set Rules', 'Open Registration',
    'Start Competition', 'Collect Submissions', 'Judge Entries',
    'Announce Results', 'Update Leaderboard',
  ]);
}

export function createDeviceUploadWorkflow(userId: string): WorkflowInstance {
  return createWorkflow('device_upload', userId, [
    'Connect Device', 'Detect Board', 'Compile Code',
    'Upload Firmware', 'Verify Upload', 'Monitor Output',
  ]);
}

export function createAICircuitWorkflow(userId: string): WorkflowInstance {
  return createWorkflow('ai_circuit_generate', userId, [
    'Describe Circuit', 'AI Analysis', 'Generate Components',
    'Generate Wiring', 'Validate Circuit', 'Place on Breadboard',
  ]);
}

// ─── Dashboard Aggregation ───────────────────────────────────

export function aggregateStudentDashboard(userId: string, data: Partial<StudentDashboardData> = {}): StudentDashboardData {
  return {
    userId,
    enrolledClassrooms: data.enrolledClassrooms ?? 0,
    activeAssignments: data.activeAssignments ?? 0,
    completedAssignments: data.completedAssignments ?? 0,
    certificates: data.certificates ?? 0,
    competitionsEntered: data.competitionsEntered ?? 0,
    projectsCreated: data.projectsCreated ?? 0,
    projectsPublished: data.projectsPublished ?? 0,
    totalPoints: data.totalPoints ?? 0,
    recentActivity: data.recentActivity ?? [],
  };
}

export function aggregateTeacherDashboard(userId: string, data: Partial<TeacherDashboardData> = {}): TeacherDashboardData {
  return {
    userId,
    classroomsOwned: data.classroomsOwned ?? 0,
    totalStudents: data.totalStudents ?? 0,
    assignmentsCreated: data.assignmentsCreated ?? 0,
    assignmentsGraded: data.assignmentsGraded ?? 0,
    certificatesIssued: data.certificatesIssued ?? 0,
    competitionsCreated: data.competitionsCreated ?? 0,
    averageClassScore: data.averageClassScore ?? 0,
    recentActivity: data.recentActivity ?? [],
  };
}

export function aggregateAdminDashboard(orgId: string, data: Partial<AdminDashboardData> = {}): AdminDashboardData {
  return {
    organizationId: orgId,
    totalMembers: data.totalMembers ?? 0,
    totalClassrooms: data.totalClassrooms ?? 0,
    totalAssignments: data.totalAssignments ?? 0,
    totalCompetitions: data.totalCompetitions ?? 0,
    totalCertificates: data.totalCertificates ?? 0,
    marketplaceAssets: data.marketplaceAssets ?? 0,
    galleryProjects: data.galleryProjects ?? 0,
    activeUsers: data.activeUsers ?? 0,
    storageUsedMB: data.storageUsedMB ?? 0,
    recentActivity: data.recentActivity ?? [],
  };
}

// ─── Navigation Tree ─────────────────────────────────────────

export function buildNavigationTree(role: OrganizationRoleType): NavigationNode[] {
  const allNodes: NavigationNode[] = [
    { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard', requiredRole: null, children: [], visible: true },
    { id: 'simulator', label: 'Simulator', path: '/simulator', icon: 'Cpu', requiredRole: null, children: [], visible: true },
    { id: 'projects', label: 'My Projects', path: '/projects', icon: 'FolderOpen', requiredRole: null, children: [], visible: true },
    { id: 'gallery', label: 'Gallery', path: '/gallery', icon: 'Image', requiredRole: null, children: [], visible: true },
    { id: 'marketplace', label: 'Marketplace', path: '/marketplace', icon: 'ShoppingBag', requiredRole: null, children: [], visible: true },
    { id: 'classrooms', label: 'Classrooms', path: '/classrooms', icon: 'BookOpen', requiredRole: 'student', children: [
      { id: 'my-classrooms', label: 'My Classrooms', path: '/classrooms/mine', icon: 'BookOpen', requiredRole: 'student', children: [], visible: true },
      { id: 'assignments', label: 'Assignments', path: '/classrooms/assignments', icon: 'FileText', requiredRole: 'student', children: [], visible: true },
      { id: 'certificates', label: 'Certificates', path: '/classrooms/certificates', icon: 'Award', requiredRole: 'student', children: [], visible: true },
    ], visible: true },
    { id: 'competitions', label: 'Competitions', path: '/competitions', icon: 'Trophy', requiredRole: 'student', children: [
      { id: 'active-competitions', label: 'Active', path: '/competitions/active', icon: 'Trophy', requiredRole: 'student', children: [], visible: true },
      { id: 'leaderboard', label: 'Leaderboard', path: '/competitions/leaderboard', icon: 'Medal', requiredRole: null, children: [], visible: true },
    ], visible: true },
    { id: 'collaboration', label: 'Collaborate', path: '/collaborate', icon: 'Users', requiredRole: 'student', children: [], visible: true },
    { id: 'devices', label: 'Devices', path: '/devices', icon: 'Usb', requiredRole: 'student', children: [
      { id: 'device-upload', label: 'Upload Studio', path: '/devices/upload', icon: 'Upload', requiredRole: 'student', children: [], visible: true },
      { id: 'debug-console', label: 'Debug Console', path: '/devices/debug', icon: 'Terminal', requiredRole: 'student', children: [], visible: true },
    ], visible: true },
    { id: 'ai-assistant', label: 'AI Assistant', path: '/ai', icon: 'Sparkles', requiredRole: 'student', children: [], visible: true },
    // Teacher-only
    { id: 'teacher', label: 'Teaching', path: '/teacher', icon: 'GraduationCap', requiredRole: 'teacher', children: [
      { id: 'manage-classrooms', label: 'Manage Classrooms', path: '/teacher/classrooms', icon: 'BookOpen', requiredRole: 'teacher', children: [], visible: true },
      { id: 'manage-assignments', label: 'Manage Assignments', path: '/teacher/assignments', icon: 'FileText', requiredRole: 'teacher', children: [], visible: true },
      { id: 'grading', label: 'Grading', path: '/teacher/grading', icon: 'CheckSquare', requiredRole: 'teacher', children: [], visible: true },
      { id: 'analytics', label: 'Analytics', path: '/teacher/analytics', icon: 'BarChart', requiredRole: 'teacher', children: [], visible: true },
    ], visible: true },
    // Admin-only
    { id: 'admin', label: 'Administration', path: '/admin', icon: 'Settings', requiredRole: 'org_admin', children: [
      { id: 'org-dashboard', label: 'Organization', path: '/admin/organization', icon: 'Building', requiredRole: 'org_admin', children: [], visible: true },
      { id: 'user-management', label: 'Users', path: '/admin/users', icon: 'Users', requiredRole: 'org_admin', children: [], visible: true },
      { id: 'district-dashboard', label: 'District', path: '/admin/district', icon: 'Map', requiredRole: 'district_admin', children: [], visible: true },
      { id: 'tenant-management', label: 'Tenants', path: '/admin/tenants', icon: 'Server', requiredRole: 'super_admin', children: [], visible: true },
    ], visible: true },
  ];

  const hierarchy: OrganizationRoleType[] = ['super_admin', 'district_admin', 'org_admin', 'principal', 'teacher', 'lab_instructor', 'judge', 'student', 'guest'];
  const userLevel = hierarchy.indexOf(role);

  function filterNodes(nodes: NavigationNode[]): NavigationNode[] {
    return nodes.filter(n => {
      if (!n.requiredRole) return true;
      const requiredLevel = hierarchy.indexOf(n.requiredRole);
      return userLevel <= requiredLevel;
    }).map(n => ({ ...n, children: filterNodes(n.children) }));
  }

  return filterNodes(allNodes);
}

// ─── Feature Registry ────────────────────────────────────────

export interface FeatureRegistryEntry {
  featureId: string;
  name: string;
  runtimeModule: string;
  uiPanel: string | null;
  navigationPath: string | null;
  toolbarAction: string | null;
  status: 'connected' | 'partial' | 'placeholder' | 'disconnected';
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export function createFeatureRegistry(): FeatureRegistryEntry[] {
  return [
    { featureId: 'sim-core', name: 'Circuit Simulator', runtimeModule: 'workspace-runtime', uiPanel: 'simulator-workspace', navigationPath: '/simulator', toolbarAction: 'New Simulation', status: 'connected', priority: 'critical' },
    { featureId: 'breadboard', name: 'Breadboard', runtimeModule: 'breadboard-workspace', uiPanel: 'simulator-workspace', navigationPath: '/simulator', toolbarAction: null, status: 'connected', priority: 'critical' },
    { featureId: 'components', name: 'Component Library', runtimeModule: 'component-asset-definitions', uiPanel: 'component-catalog', navigationPath: '/simulator', toolbarAction: 'Components', status: 'connected', priority: 'critical' },
    { featureId: 'wiring', name: 'Wire Routing', runtimeModule: 'wire-routing-engine', uiPanel: 'simulator-workspace', navigationPath: '/simulator', toolbarAction: 'Wire Tool', status: 'connected', priority: 'critical' },
    { featureId: 'pixi-render', name: 'PixiJS Renderer', runtimeModule: 'pixi-scene-renderer', uiPanel: 'simulator-workspace', navigationPath: '/simulator', toolbarAction: null, status: 'connected', priority: 'critical' },
    { featureId: 'projects', name: 'Project Management', runtimeModule: 'project-library-runtime', uiPanel: 'project-panel', navigationPath: '/projects', toolbarAction: 'Save', status: 'connected', priority: 'critical' },
    { featureId: 'persistence', name: 'Auto-Save & Recovery', runtimeModule: 'workspace-persistence-runtime', uiPanel: 'auto-save', navigationPath: null, toolbarAction: null, status: 'connected', priority: 'critical' },
    { featureId: 'timeline', name: 'Project Timeline', runtimeModule: 'project-timeline-runtime', uiPanel: 'timeline-panel', navigationPath: '/simulator', toolbarAction: 'Timeline', status: 'connected', priority: 'high' },
    { featureId: 'versions', name: 'Version History', runtimeModule: 'project-version-runtime', uiPanel: 'version-history-panel', navigationPath: '/simulator', toolbarAction: 'Versions', status: 'connected', priority: 'high' },
    { featureId: 'ai-circuit', name: 'AI Circuit Generator', runtimeModule: 'ai-circuit-runtime', uiPanel: 'ai-circuit-assistant-panel', navigationPath: '/ai', toolbarAction: 'AI Assistant', status: 'connected', priority: 'high' },
    { featureId: 'marketplace', name: 'Marketplace', runtimeModule: 'marketplace-runtime', uiPanel: 'marketplace-page', navigationPath: '/marketplace', toolbarAction: null, status: 'connected', priority: 'high' },
    { featureId: 'gallery', name: 'Public Gallery', runtimeModule: 'project-gallery-runtime', uiPanel: 'public-gallery-page', navigationPath: '/gallery', toolbarAction: null, status: 'connected', priority: 'high' },
    { featureId: 'classrooms', name: 'Classrooms', runtimeModule: 'classroom-runtime', uiPanel: 'classroom-analytics-panel', navigationPath: '/classrooms', toolbarAction: null, status: 'connected', priority: 'high' },
    { featureId: 'assignments', name: 'Assignments', runtimeModule: 'assignment-runtime', uiPanel: 'assessment-panel', navigationPath: '/classrooms/assignments', toolbarAction: null, status: 'connected', priority: 'high' },
    { featureId: 'grading', name: 'Auto Grading', runtimeModule: 'auto-grading-runtime', uiPanel: 'assessment-panel', navigationPath: '/teacher/grading', toolbarAction: null, status: 'connected', priority: 'high' },
    { featureId: 'certs', name: 'Certificates', runtimeModule: 'certification-runtime', uiPanel: 'certification-panel', navigationPath: '/classrooms/certificates', toolbarAction: null, status: 'connected', priority: 'high' },
    { featureId: 'competitions', name: 'Competitions', runtimeModule: 'competition-runtime', uiPanel: 'competition-dashboard', navigationPath: '/competitions', toolbarAction: null, status: 'connected', priority: 'high' },
    { featureId: 'collab', name: 'Collaboration', runtimeModule: 'collaboration-runtime', uiPanel: 'collaboration-panel', navigationPath: '/collaborate', toolbarAction: null, status: 'connected', priority: 'high' },
    { featureId: 'realtime', name: 'Realtime Collaboration', runtimeModule: 'realtime-collaboration-runtime', uiPanel: 'collaboration-panel', navigationPath: '/collaborate', toolbarAction: null, status: 'connected', priority: 'high' },
    { featureId: 'device-upload', name: 'Device Upload', runtimeModule: 'device-upload-runtime', uiPanel: 'upload-progress-panel', navigationPath: '/devices/upload', toolbarAction: 'Upload', status: 'connected', priority: 'high' },
    { featureId: 'device-debug', name: 'Debug Console', runtimeModule: 'device-debug-runtime', uiPanel: 'debug-console-panel', navigationPath: '/devices/debug', toolbarAction: null, status: 'connected', priority: 'high' },
    { featureId: 'serial', name: 'Web Serial', runtimeModule: 'web-serial-runtime', uiPanel: 'device-manager-panel', navigationPath: '/devices', toolbarAction: null, status: 'connected', priority: 'high' },
    { featureId: 'sharing', name: 'Project Sharing', runtimeModule: 'project-sharing-runtime', uiPanel: 'project-panel', navigationPath: '/projects', toolbarAction: 'Share', status: 'connected', priority: 'medium' },
    { featureId: 'org', name: 'Organization', runtimeModule: 'organization-runtime', uiPanel: 'organization-dashboard-panel', navigationPath: '/admin/organization', toolbarAction: null, status: 'connected', priority: 'medium' },
    { featureId: 'tenant', name: 'Tenant Management', runtimeModule: 'tenant-runtime', uiPanel: 'district-dashboard-panel', navigationPath: '/admin/tenants', toolbarAction: null, status: 'connected', priority: 'medium' },
    { featureId: 'deploy', name: 'Deployment', runtimeModule: 'deployment-management-runtime', uiPanel: 'organization-dashboard-panel', navigationPath: '/admin/organization', toolbarAction: null, status: 'connected', priority: 'medium' },
    { featureId: 'classroom-mgmt', name: 'Classroom Management', runtimeModule: 'classroom-management-runtime', uiPanel: 'teacher-dashboard-panel', navigationPath: '/teacher/classrooms', toolbarAction: null, status: 'connected', priority: 'medium' },
    { featureId: 'assign-mgmt', name: 'Assignment Management', runtimeModule: 'assignment-management-runtime', uiPanel: 'assessment-panel', navigationPath: '/teacher/assignments', toolbarAction: null, status: 'connected', priority: 'medium' },
    { featureId: 'auth', name: 'Authentication', runtimeModule: 'auth-runtime', uiPanel: null, navigationPath: '/auth', toolbarAction: null, status: 'connected', priority: 'critical' },
    { featureId: 'api', name: 'API Layer', runtimeModule: 'api-layer-runtime', uiPanel: null, navigationPath: null, toolbarAction: null, status: 'connected', priority: 'critical' },
    // Robotics (still advanced — feature-flagged)
    { featureId: 'robotics-physics', name: 'Robotics Physics', runtimeModule: 'robotics-physics-runtime', uiPanel: null, navigationPath: null, toolbarAction: null, status: 'partial', priority: 'low' },
    { featureId: 'diff-drive', name: 'Differential Drive', runtimeModule: 'differential-drive-runtime', uiPanel: null, navigationPath: null, toolbarAction: null, status: 'partial', priority: 'low' },
    { featureId: 'line-follow', name: 'Line Following', runtimeModule: 'line-following-runtime', uiPanel: null, navigationPath: null, toolbarAction: null, status: 'partial', priority: 'low' },
    { featureId: 'obstacle', name: 'Obstacle Avoidance', runtimeModule: 'obstacle-avoidance-runtime', uiPanel: null, navigationPath: null, toolbarAction: null, status: 'partial', priority: 'low' },
  ];
}

export function getConnectedFeatures(registry: FeatureRegistryEntry[]): FeatureRegistryEntry[] {
  return registry.filter(f => f.status === 'connected');
}

export function getDisconnectedFeatures(registry: FeatureRegistryEntry[]): FeatureRegistryEntry[] {
  return registry.filter(f => f.status === 'disconnected' || f.status === 'partial');
}

export function getIntegrationScore(registry: FeatureRegistryEntry[]): number {
  const weights = { connected: 1, partial: 0.5, placeholder: 0.3, disconnected: 0 };
  const total = registry.reduce((s, f) => s + (weights[f.status] ?? 0), 0);
  return Math.round((total / registry.length) * 100);
}

// ─── Synchronizer ────────────────────────────────────────────

export class IntegrationSynchronizer {
  private workflows = new Map<string, WorkflowInstance>();
  private workflowOrder: string[] = [];
  private registry: FeatureRegistryEntry[] = [];

  registerWorkflow(w: WorkflowInstance) { this.workflows.set(w.workflowId, { ...w }); if (!this.workflowOrder.includes(w.workflowId)) this.workflowOrder.push(w.workflowId); }
  getWorkflow(id: string) { const w = this.workflows.get(id); return w ? { ...w } : undefined; }
  getAllWorkflows() { return this.workflowOrder.map(id => ({ ...this.workflows.get(id)! })); }
  hasWorkflow(id: string) { return this.workflows.has(id); }

  setRegistry(r: FeatureRegistryEntry[]) { this.registry = r.map(e => ({ ...e })); }
  getRegistry() { return this.registry.map(e => ({ ...e })); }

  clear() { this.workflows.clear(); this.workflowOrder = []; this.registry = []; }

  toJSON() {
    return {
      workflows: this.getAllWorkflows(),
      registry: this.getRegistry(),
      integrationScore: getIntegrationScore(this.registry),
    };
  }

  fromJSON(data: { workflows?: WorkflowInstance[]; registry?: FeatureRegistryEntry[] }) {
    this.clear();
    (data.workflows || []).forEach(w => this.registerWorkflow(w));
    if (data.registry) this.setRegistry(data.registry);
  }

  clone(): IntegrationSynchronizer {
    const c = new IntegrationSynchronizer();
    c.fromJSON(this.toJSON());
    return c;
  }
}
