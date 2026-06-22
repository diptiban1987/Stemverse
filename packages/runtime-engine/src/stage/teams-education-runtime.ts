/**
 * Phase 41B — Microsoft Teams Education Runtime
 *
 * Integration with Microsoft Teams for Education: class sync,
 * assignment sync, meeting links, and student roster sync.
 */

// ─── Types ─────────────────────────────────────────────────────

export type TeamsClassStatus = 'active' | 'archived' | 'expired';
export type TeamsSyncStatus = 'pending' | 'syncing' | 'synced' | 'error';

export interface TeamsConnection {
  readonly connectionId: string;
  readonly tenantId: string;
  readonly azureTenantId: string;
  readonly clientId: string;
  readonly status: 'connected' | 'disconnected' | 'error';
  readonly lastSyncAt: number | null;
  readonly createdAt: number;
}

export interface TeamsClass {
  readonly classId: string;
  readonly externalId: string;
  readonly displayName: string;
  readonly description: string;
  readonly mailNickname: string;
  readonly status: TeamsClassStatus;
  readonly stemverseClassroomId: string | null;
  readonly syncStatus: TeamsSyncStatus;
  readonly memberCount: number;
}

export interface TeamsAssignment {
  readonly assignmentId: string;
  readonly classId: string;
  readonly externalId: string;
  readonly displayName: string;
  readonly instructions: string;
  readonly maxPoints: number;
  readonly dueDateTime: number | null;
  readonly stemverseAssignmentId: string | null;
  readonly syncStatus: TeamsSyncStatus;
}

export interface TeamsMeeting {
  readonly meetingId: string;
  readonly classId: string;
  readonly subject: string;
  readonly joinUrl: string;
  readonly startDateTime: number;
  readonly endDateTime: number;
  readonly createdAt: number;
}

export interface TeamsRosterSync {
  readonly syncId: string;
  readonly classId: string;
  readonly studentsAdded: number;
  readonly studentsRemoved: number;
  readonly teachersAdded: number;
  readonly syncedAt: number;
  readonly status: 'completed' | 'error';
}

// ─── Helpers ──────────────────────────────────────────────────

let _seq = 0;
function uid(): string { return `teams_${Date.now()}_${++_seq}`; }
const now = () => Date.now();

// ─── Connection ────────────────────────────────────────────────

export function connectTeams(tenantId: string, azureTenantId: string, clientId: string): TeamsConnection {
  return { connectionId: uid(), tenantId, azureTenantId, clientId, status: 'connected', lastSyncAt: now(), createdAt: now() };
}

export function disconnectTeams(conn: TeamsConnection): TeamsConnection {
  return { ...conn, status: 'disconnected' };
}

// ─── Class Sync ────────────────────────────────────────────────

export function importTeamsClass(externalId: string, displayName: string, description: string, mailNickname: string): TeamsClass {
  return {
    classId: uid(), externalId, displayName, description, mailNickname,
    status: 'active', stemverseClassroomId: null, syncStatus: 'synced', memberCount: 0,
  };
}

export function linkTeamsClass(cls: TeamsClass, classroomId: string): TeamsClass {
  return { ...cls, stemverseClassroomId: classroomId, syncStatus: 'synced' };
}

export function archiveTeamsClass(cls: TeamsClass): TeamsClass {
  return { ...cls, status: 'archived' };
}

// ─── Assignment Sync ───────────────────────────────────────────

export function importTeamsAssignment(classId: string, externalId: string, displayName: string, instructions: string, maxPoints: number, dueDateTime: number | null): TeamsAssignment {
  return {
    assignmentId: uid(), classId, externalId, displayName, instructions, maxPoints,
    dueDateTime, stemverseAssignmentId: null, syncStatus: 'synced',
  };
}

export function linkTeamsAssignment(assignment: TeamsAssignment, stemverseId: string): TeamsAssignment {
  return { ...assignment, stemverseAssignmentId: stemverseId, syncStatus: 'synced' };
}

// ─── Meeting Links ─────────────────────────────────────────────

export function createMeetingLink(classId: string, subject: string, startDateTime: number, durationMinutes: number): TeamsMeeting {
  return {
    meetingId: uid(), classId, subject,
    joinUrl: `https://teams.microsoft.com/l/meetup-join/${uid()}`,
    startDateTime, endDateTime: startDateTime + durationMinutes * 60000, createdAt: now(),
  };
}

// ─── Roster Sync ───────────────────────────────────────────────

export function syncRoster(classId: string, studentsAdded: number, studentsRemoved: number, teachersAdded: number): TeamsRosterSync {
  return { syncId: uid(), classId, studentsAdded, studentsRemoved, teachersAdded, syncedAt: now(), status: 'completed' };
}
