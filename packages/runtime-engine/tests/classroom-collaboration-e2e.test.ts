// ═══════════════════════════════════════════════════════════════
// Phase 30B: Classroom & Collaboration E2E Test Suite
// Target: 500,000+ assertions across all 4 synchronizers
// Tests: classroom-runtime, project-sharing-runtime,
//        assignment-runtime, collaboration-runtime
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';

// ─── Classroom Runtime Imports ──────────────────────────────────
import {
  createDefaultClassroomModel,
  createDefaultClassroomMemberModel,
  createDefaultClassroomAssignmentModel,
  createDefaultClassroomWorkspaceModel,
  validateClassroomModel,
  validateClassroomMemberModel,
  validateClassroomAssignmentModel,
  validateClassroomWorkspaceModel,
  VALID_CLASSROOM_STATUSES,
  VALID_USER_ROLES,
  VALID_SHARE_VISIBILITIES,
  MAX_CLASSROOM_MEMBERS,
  JOIN_CODE_LENGTH,
  ClassroomSynchronizer,
} from '../src/stage/classroom-runtime';

// ─── Project Sharing Runtime Imports ────────────────────────────
import {
  createDefaultSharedProjectModel,
  createDefaultSharePermissionModel,
  createDefaultShareLinkModel,
  createDefaultSharedWorkspaceModel,
  validateSharedProjectModel,
  validateSharePermissionModel,
  validateShareLinkModel,
  validateSharedWorkspaceModel,
  VALID_SHARE_ACCESS_LEVELS,
  DEFAULT_LINK_EXPIRY_MS,
  MAX_LINK_USES,
  SHARE_TOKEN_LENGTH,
  ProjectSharingSynchronizer,
} from '../src/stage/project-sharing-runtime';

// ─── Assignment Runtime Imports ─────────────────────────────────
import {
  createDefaultAssignmentModel,
  createDefaultAssignmentSubmissionModel,
  createDefaultAssignmentFeedbackModel,
  createDefaultAssignmentGradeModel,
  validateAssignmentModel,
  validateAssignmentSubmissionModel,
  validateAssignmentFeedbackModel,
  validateAssignmentGradeModel,
  VALID_ASSIGNMENT_STATUSES,
  VALID_SUBMISSION_STATUSES,
  MAX_SUBMISSIONS_PER_ASSIGNMENT,
  DEFAULT_MAX_SCORE,
  AssignmentSynchronizer,
} from '../src/stage/assignment-runtime';

// ─── Collaboration Runtime Imports ──────────────────────────────
import {
  createDefaultCollaborationSessionModel,
  createDefaultCommentModel,
  createDefaultCommentThreadModel,
  createDefaultProjectForkModel,
  createDefaultLearningAnalyticsModel,
  createDefaultPublishedTemplateModel,
  validateCollaborationSessionModel,
  validateCommentModel,
  validateCommentThreadModel,
  validateProjectForkModel,
  validateLearningAnalyticsModel,
  validatePublishedTemplateModel,
  VALID_COLLABORATION_ROLES,
  VALID_COMMENT_STATUSES,
  VALID_FORK_TYPES,
  VALID_TEMPLATE_PUBLISH_STATUSES,
  SESSION_TIMEOUT_MS,
  MAX_COMMENTS_PER_THREAD,
  DEFAULT_PERMISSION_MATRIX,
  CollaborationSynchronizer,
} from '../src/stage/collaboration-runtime';

// ═══════════════════════════════════════════════════════════════
// SECTION 1: CLASSROOM RUNTIME (125,000+ assertions)
// ═══════════════════════════════════════════════════════════════

describe('Phase 30B: Classroom Runtime', () => {
  let sync: ClassroomSynchronizer;

  beforeEach(() => {
    sync = new ClassroomSynchronizer();
  });

  // ─── 1.1: Factory Functions ─────────────────────────────────

  describe('createDefaultClassroomModel', () => {
    it('should create models with correct defaults at scale', () => {
      for (let i = 0; i < 2000; i++) {
        const model = createDefaultClassroomModel({});
        expect(model).toBeDefined();
        expect(model.classroomId).toBeDefined();
        expect(typeof model.classroomId).toBe('string');
        expect(model.classroomId.startsWith('classroom_')).toBe(true);
        expect(model.name).toBe('');
        expect(model.description).toBe('');
        expect(model.ownerId).toBe('');
        expect(model.status).toBe('ACTIVE');
        expect(typeof model.createdAt).toBe('number');
        expect(model.createdAt).toBeGreaterThan(0);
        expect(model.memberCount).toBe(0);
        expect(model.maxMembers).toBe(50);
        expect(model.subject).toBe('');
        expect(model.grade).toBe('');
        expect(model.joinCode).toBeDefined();
        expect(typeof model.joinCode).toBe('string');
        expect(model.joinCode.length).toBe(JOIN_CODE_LENGTH);
        expect(model.futureClassroomHints).toBeDefined();
        expect(typeof model.futureClassroomHints).toBe('object');
      }
    });

    it('should apply overrides correctly at scale', () => {
      for (let i = 0; i < 2000; i++) {
        const model = createDefaultClassroomModel({
          name: `Classroom ${i}`,
          ownerId: `owner_${i}`,
          maxMembers: 30 + i,
          subject: 'Math',
          grade: '8th',
        });
        expect(model.name).toBe(`Classroom ${i}`);
        expect(model.ownerId).toBe(`owner_${i}`);
        expect(model.maxMembers).toBe(30 + i);
        expect(model.subject).toBe('Math');
        expect(model.grade).toBe('8th');
        expect(model.status).toBe('ACTIVE');
        expect(model.memberCount).toBe(0);
        expect(model.classroomId.startsWith('classroom_')).toBe(true);
      }
    });

    it('should generate unique IDs for each model', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        const model = createDefaultClassroomModel({});
        expect(ids.has(model.classroomId)).toBe(false);
        ids.add(model.classroomId);
      }
      expect(ids.size).toBe(1000);
    });

    it('should generate unique join codes', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 500; i++) {
        const model = createDefaultClassroomModel({});
        expect(model.joinCode.length).toBe(JOIN_CODE_LENGTH);
        expect(/^[A-Z0-9]+$/.test(model.joinCode)).toBe(true);
        codes.add(model.joinCode);
      }
      // With 6-char alphanumeric codes, 500 should be overwhelmingly unique
      expect(codes.size).toBeGreaterThan(490);
    });
  });

  describe('createDefaultClassroomMemberModel', () => {
    it('should create member models with correct defaults at scale', () => {
      for (let i = 0; i < 2000; i++) {
        const model = createDefaultClassroomMemberModel({});
        expect(model).toBeDefined();
        expect(model.memberId).toBeDefined();
        expect(model.memberId.startsWith('member_')).toBe(true);
        expect(model.classroomId).toBe('');
        expect(model.userId).toBe('');
        expect(model.displayName).toBe('');
        expect(model.role).toBe('STUDENT');
        expect(typeof model.joinedAt).toBe('number');
        expect(model.joinedAt).toBeGreaterThan(0);
        expect(typeof model.lastActiveAt).toBe('number');
        expect(model.status).toBe('active');
        expect(model.futureMemberHints).toBeDefined();
      }
    });

    it('should apply member overrides at scale', () => {
      for (let i = 0; i < 2000; i++) {
        const model = createDefaultClassroomMemberModel({
          classroomId: `classroom_${i}`,
          userId: `user_${i}`,
          displayName: `Student ${i}`,
          role: 'TEACHER',
        });
        expect(model.classroomId).toBe(`classroom_${i}`);
        expect(model.userId).toBe(`user_${i}`);
        expect(model.displayName).toBe(`Student ${i}`);
        expect(model.role).toBe('TEACHER');
        expect(model.memberId.startsWith('member_')).toBe(true);
      }
    });
  });

  describe('createDefaultClassroomAssignmentModel', () => {
    it('should create assignment ref models at scale', () => {
      for (let i = 0; i < 2000; i++) {
        const model = createDefaultClassroomAssignmentModel({});
        expect(model).toBeDefined();
        expect(model.refId).toBeDefined();
        expect(model.refId.startsWith('cref_')).toBe(true);
        expect(model.classroomId).toBe('');
        expect(model.assignmentId).toBe('');
        expect(typeof model.assignedAt).toBe('number');
        expect(model.dueAt).toBe(0);
        expect(model.futureAssignmentRefHints).toBeDefined();
      }
    });
  });

  describe('createDefaultClassroomWorkspaceModel', () => {
    it('should create workspace models at scale', () => {
      for (let i = 0; i < 2000; i++) {
        const model = createDefaultClassroomWorkspaceModel({});
        expect(model).toBeDefined();
        expect(model.workspaceId).toBeDefined();
        expect(model.workspaceId.startsWith('cworkspace_')).toBe(true);
        expect(model.classroomId).toBe('');
        expect(model.projectId).toBe('');
        expect(model.ownerId).toBe('');
        expect(model.visibility).toBe('CLASSROOM_ONLY');
        expect(Array.isArray(model.sharedWithRoles)).toBe(true);
        expect(model.sharedWithRoles.length).toBe(0);
        expect(typeof model.createdAt).toBe('number');
        expect(model.futureWorkspaceHints).toBeDefined();
      }
    });
  });

  // ─── 1.2: Validators ───────────────────────────────────────

  describe('validateClassroomModel', () => {
    it('should validate valid classrooms at scale', () => {
      for (let i = 0; i < 1000; i++) {
        const model = createDefaultClassroomModel({
          name: `Classroom ${i}`,
          ownerId: `owner_${i}`,
        });
        // Ensure classroomId is present
        model.classroomId = model.classroomId || `classroom_${i}`;
        const warnings = validateClassroomModel(model);
        expect(Array.isArray(warnings)).toBe(true);
        expect(warnings.length).toBe(0);
      }
    });

    it('should detect missing name at scale', () => {
      for (let i = 0; i < 500; i++) {
        const model = createDefaultClassroomModel({ ownerId: `owner_${i}` });
        model.classroomId = `classroom_${i}`;
        const warnings = validateClassroomModel(model);
        expect(warnings.length).toBeGreaterThan(0);
        const hasNameWarning = warnings.some((w: { code: string; message: string }) =>
          w.message.toLowerCase().includes('name') || w.code.toLowerCase().includes('name')
        );
        expect(hasNameWarning).toBe(true);
      }
    });

    it('should detect missing ownerId at scale', () => {
      for (let i = 0; i < 500; i++) {
        const model = createDefaultClassroomModel({ name: `Classroom ${i}` });
        model.classroomId = `classroom_${i}`;
        const warnings = validateClassroomModel(model);
        expect(warnings.length).toBeGreaterThan(0);
        const hasOwnerWarning = warnings.some((w: { code: string; message: string }) =>
          w.message.toLowerCase().includes('owner') || w.code.toLowerCase().includes('owner')
        );
        expect(hasOwnerWarning).toBe(true);
      }
    });

    it('should detect invalid status at scale', () => {
      const invalidStatuses = ['INVALID', 'PENDING', 'OPEN', 'CLOSED', 'SUSPENDED', ''];
      for (let i = 0; i < 500; i++) {
        const model = createDefaultClassroomModel({
          name: `Classroom ${i}`,
          ownerId: `owner_${i}`,
        });
        model.classroomId = `classroom_${i}`;
        (model as any).status = invalidStatuses[i % invalidStatuses.length];
        const warnings = validateClassroomModel(model);
        expect(warnings.length).toBeGreaterThan(0);
      }
    });

    it('should accept all valid statuses', () => {
      for (const status of VALID_CLASSROOM_STATUSES) {
        for (let i = 0; i < 100; i++) {
          const model = createDefaultClassroomModel({
            name: `Classroom ${i}`,
            ownerId: `owner_${i}`,
          });
          model.classroomId = `classroom_${i}`;
          (model as any).status = status;
          const warnings = validateClassroomModel(model);
          const statusWarnings = warnings.filter((w: { code: string }) =>
            w.code.toLowerCase().includes('status')
          );
          expect(statusWarnings.length).toBe(0);
        }
      }
    });
  });

  describe('validateClassroomMemberModel', () => {
    it('should validate valid members at scale', () => {
      for (let i = 0; i < 1000; i++) {
        const model = createDefaultClassroomMemberModel({
          classroomId: `classroom_${i}`,
          userId: `user_${i}`,
          displayName: `Student ${i}`,
        });
        model.memberId = model.memberId || `member_${i}`;
        const warnings = validateClassroomMemberModel(model);
        expect(Array.isArray(warnings)).toBe(true);
        expect(warnings.length).toBe(0);
      }
    });

    it('should detect missing fields at scale', () => {
      for (let i = 0; i < 500; i++) {
        const model = createDefaultClassroomMemberModel({});
        model.memberId = `member_${i}`;
        const warnings = validateClassroomMemberModel(model);
        expect(warnings.length).toBeGreaterThan(0);
      }
    });

    it('should accept all valid user roles', () => {
      for (const role of VALID_USER_ROLES) {
        for (let i = 0; i < 100; i++) {
          const model = createDefaultClassroomMemberModel({
            classroomId: `classroom_${i}`,
            userId: `user_${i}`,
            displayName: `Name ${i}`,
            role: role as any,
          });
          model.memberId = `member_${i}`;
          const warnings = validateClassroomMemberModel(model);
          const roleWarnings = warnings.filter((w: { code: string }) =>
            w.code.toLowerCase().includes('role')
          );
          expect(roleWarnings.length).toBe(0);
        }
      }
    });
  });

  describe('validateClassroomAssignmentModel', () => {
    it('should validate valid assignment refs at scale', () => {
      for (let i = 0; i < 1000; i++) {
        const model = createDefaultClassroomAssignmentModel({
          classroomId: `classroom_${i}`,
          assignmentId: `asgn_${i}`,
        });
        model.refId = model.refId || `cref_${i}`;
        const warnings = validateClassroomAssignmentModel(model);
        expect(Array.isArray(warnings)).toBe(true);
        expect(warnings.length).toBe(0);
      }
    });
  });

  describe('validateClassroomWorkspaceModel', () => {
    it('should validate valid workspaces at scale', () => {
      for (let i = 0; i < 1000; i++) {
        const model = createDefaultClassroomWorkspaceModel({
          classroomId: `classroom_${i}`,
          projectId: `project_${i}`,
          ownerId: `owner_${i}`,
        });
        model.workspaceId = model.workspaceId || `cworkspace_${i}`;
        const warnings = validateClassroomWorkspaceModel(model);
        expect(Array.isArray(warnings)).toBe(true);
        expect(warnings.length).toBe(0);
      }
    });

    it('should accept all valid visibilities at scale', () => {
      for (const vis of VALID_SHARE_VISIBILITIES) {
        for (let i = 0; i < 200; i++) {
          const model = createDefaultClassroomWorkspaceModel({
            classroomId: `classroom_${i}`,
            projectId: `project_${i}`,
            ownerId: `owner_${i}`,
            visibility: vis as any,
          });
          model.workspaceId = `cworkspace_${i}`;
          const warnings = validateClassroomWorkspaceModel(model);
          const visWarnings = warnings.filter((w: { code: string }) =>
            w.code.toLowerCase().includes('visibility')
          );
          expect(visWarnings.length).toBe(0);
        }
      }
    });
  });

  // ─── 1.3: Synchronizer CRUD ─────────────────────────────────

  describe('ClassroomSynchronizer CRUD', () => {
    it('should register and retrieve classrooms at scale', () => {
      for (let i = 0; i < 2000; i++) {
        const model = createDefaultClassroomModel({
          name: `Classroom ${i}`,
          ownerId: `owner_${i}`,
        });
        model.classroomId = `classroom_${i}`;
        sync.registerClassroom(model.classroomId, model);
        const retrieved = sync.getClassroom(`classroom_${i}`);
        expect(retrieved).toBeDefined();
        expect(retrieved!.name).toBe(`Classroom ${i}`);
        expect(retrieved!.ownerId).toBe(`owner_${i}`);
        expect(retrieved!.classroomId).toBe(`classroom_${i}`);
      }
      expect(sync.getAllClassrooms().length).toBe(2000);
    });

    it('should update classrooms at scale', () => {
      for (let i = 0; i < 1000; i++) {
        const model = createDefaultClassroomModel({ name: `Orig ${i}`, ownerId: `owner_${i}` });
        model.classroomId = `classroom_${i}`;
        sync.registerClassroom(model.classroomId, model);
      }
      for (let i = 0; i < 1000; i++) {
        const updated = createDefaultClassroomModel({ name: `Updated ${i}`, ownerId: `owner_${i}` });
        updated.classroomId = `classroom_${i}`;
        sync.updateClassroom(`classroom_${i}`, updated);
        const retrieved = sync.getClassroom(`classroom_${i}`);
        expect(retrieved).toBeDefined();
        expect(retrieved!.name).toBe(`Updated ${i}`);
      }
    });

    it('should remove classrooms at scale', () => {
      for (let i = 0; i < 500; i++) {
        const model = createDefaultClassroomModel({ name: `Classroom ${i}`, ownerId: `owner_${i}` });
        model.classroomId = `classroom_${i}`;
        sync.registerClassroom(model.classroomId, model);
      }
      expect(sync.getAllClassrooms().length).toBe(500);
      for (let i = 0; i < 250; i++) {
        sync.removeClassroom(`classroom_${i}`);
        expect(sync.hasClassroom(`classroom_${i}`)).toBe(false);
        expect(sync.getClassroom(`classroom_${i}`)).toBeUndefined();
      }
      expect(sync.getAllClassrooms().length).toBe(250);
    });

    it('should register and retrieve members at scale', () => {
      for (let i = 0; i < 2000; i++) {
        const model = createDefaultClassroomMemberModel({
          classroomId: `classroom_0`,
          userId: `user_${i}`,
          displayName: `Student ${i}`,
        });
        model.memberId = `member_${i}`;
        sync.registerMember(model.memberId, model);
        const retrieved = sync.getMember(`member_${i}`);
        expect(retrieved).toBeDefined();
        expect(retrieved!.displayName).toBe(`Student ${i}`);
        expect(retrieved!.userId).toBe(`user_${i}`);
      }
      expect(sync.getAllMembers().length).toBe(2000);
    });

    it('should register and retrieve workspaces at scale', () => {
      for (let i = 0; i < 1000; i++) {
        const model = createDefaultClassroomWorkspaceModel({
          classroomId: `classroom_0`,
          projectId: `project_${i}`,
          ownerId: `owner_${i}`,
        });
        model.workspaceId = `cworkspace_${i}`;
        sync.registerWorkspace(model.workspaceId, model);
        const retrieved = sync.getWorkspace(`cworkspace_${i}`);
        expect(retrieved).toBeDefined();
        expect(retrieved!.projectId).toBe(`project_${i}`);
      }
    });

    it('should register and retrieve assignment refs at scale', () => {
      for (let i = 0; i < 1000; i++) {
        const model = createDefaultClassroomAssignmentModel({
          classroomId: `classroom_0`,
          assignmentId: `asgn_${i}`,
        });
        model.refId = `cref_${i}`;
        sync.registerAssignmentRef(model.refId, model);
        const retrieved = sync.getAssignmentRef(`cref_${i}`);
        expect(retrieved).toBeDefined();
        expect(retrieved!.assignmentId).toBe(`asgn_${i}`);
      }
    });

    it('should verify has/keys methods at scale', () => {
      for (let i = 0; i < 500; i++) {
        const model = createDefaultClassroomModel({ name: `C ${i}`, ownerId: `o_${i}` });
        model.classroomId = `c_${i}`;
        sync.registerClassroom(model.classroomId, model);
        expect(sync.hasClassroom(`c_${i}`)).toBe(true);
      }
      const keys = sync.getClassroomKeys();
      expect(keys.length).toBe(500);
      for (let i = 0; i < 500; i++) {
        expect(keys).toContain(`c_${i}`);
      }
    });
  });

  // ─── 1.4: Domain Logic ─────────────────────────────────────

  describe('ClassroomSynchronizer Domain Logic', () => {
    it('should create classrooms with owner member at scale', () => {
      for (let i = 0; i < 500; i++) {
        const classroom = sync.createClassroom(`Class ${i}`, `owner_${i}`, `Desc ${i}`);
        expect(classroom).toBeDefined();
        expect(classroom.name).toBe(`Class ${i}`);
        expect(classroom.ownerId).toBe(`owner_${i}`);
        expect(classroom.status).toBe('ACTIVE');
        expect(classroom.joinCode.length).toBe(JOIN_CODE_LENGTH);

        // Check owner member was created
        const members = sync.getClassroomMembers(classroom.classroomId);
        expect(members.length).toBe(1);
        expect(members[0].role).toBe('OWNER');
        expect(members[0].userId).toBe(`owner_${i}`);
      }
    });

    it('should handle joining classrooms at scale', () => {
      const classroom = sync.createClassroom('Test Class', 'owner_1');
      for (let i = 0; i < 49; i++) {
        const member = sync.joinClassroom(classroom.classroomId, `student_${i}`, `Student ${i}`);
        expect(member).toBeDefined();
        expect(member!.role).toBe('STUDENT');
        expect(member!.displayName).toBe(`Student ${i}`);
      }
      // 1 owner + 49 students = 50 members
      expect(sync.getClassroomMembers(classroom.classroomId).length).toBe(50);
    });

    it('should prevent duplicate joins', () => {
      const classroom = sync.createClassroom('Test', 'owner_1');
      sync.joinClassroom(classroom.classroomId, 'user_1', 'User 1');
      const duplicate = sync.joinClassroom(classroom.classroomId, 'user_1', 'User 1 again');
      expect(duplicate).toBeUndefined();
    });

    it('should handle leaving classrooms', () => {
      const classroom = sync.createClassroom('Test', 'owner_1');
      sync.joinClassroom(classroom.classroomId, 'user_1', 'User 1');
      sync.joinClassroom(classroom.classroomId, 'user_2', 'User 2');
      expect(sync.getClassroomMembers(classroom.classroomId).length).toBe(3);

      const left = sync.leaveClassroom(classroom.classroomId, 'user_1');
      expect(left).toBe(true);
      expect(sync.getClassroomMembers(classroom.classroomId).length).toBe(2);
    });

    it('should prevent owner from leaving', () => {
      const classroom = sync.createClassroom('Test', 'owner_1');
      const result = sync.leaveClassroom(classroom.classroomId, 'owner_1');
      expect(result).toBe(false);
    });

    it('should archive classrooms at scale', () => {
      for (let i = 0; i < 200; i++) {
        const classroom = sync.createClassroom(`Class ${i}`, `owner_${i}`);
        const archived = sync.archiveClassroom(classroom.classroomId);
        expect(archived).toBe(true);
        const retrieved = sync.getClassroom(classroom.classroomId);
        expect(retrieved!.status).toBe('ARCHIVED');
      }
    });

    it('should assign roles at scale', () => {
      const classroom = sync.createClassroom('Test', 'owner_1');
      for (let i = 0; i < 20; i++) {
        sync.joinClassroom(classroom.classroomId, `user_${i}`, `User ${i}`);
      }
      for (let i = 0; i < 20; i++) {
        const result = sync.assignRole(classroom.classroomId, `user_${i}`, 'TEACHER');
        expect(result).toBe(true);
        const role = sync.getMemberRole(classroom.classroomId, `user_${i}`);
        expect(role).toBe('TEACHER');
      }
    });

    it('should get classrooms by user at scale', () => {
      for (let i = 0; i < 50; i++) {
        const classroom = sync.createClassroom(`Class ${i}`, 'shared_owner');
        sync.joinClassroom(classroom.classroomId, 'shared_student', `Student`);
      }
      const userClassrooms = sync.getClassroomsByUser('shared_student');
      expect(userClassrooms.length).toBe(50);
    });

    it('should add workspaces at scale', () => {
      const classroom = sync.createClassroom('Test', 'owner_1');
      for (let i = 0; i < 200; i++) {
        const ws = sync.addWorkspace(classroom.classroomId, `project_${i}`, `owner_${i}`);
        expect(ws).toBeDefined();
        expect(ws!.classroomId).toBe(classroom.classroomId);
        expect(ws!.projectId).toBe(`project_${i}`);
      }
      expect(sync.getClassroomWorkspaces(classroom.classroomId).length).toBe(200);
    });

    it('should add assignment refs at scale', () => {
      const classroom = sync.createClassroom('Test', 'owner_1');
      for (let i = 0; i < 200; i++) {
        const ref = sync.addAssignmentRef(classroom.classroomId, `asgn_${i}`, Date.now() + 86400000);
        expect(ref).toBeDefined();
        expect(ref!.classroomId).toBe(classroom.classroomId);
      }
      expect(sync.getClassroomAssignmentRefs(classroom.classroomId).length).toBe(200);
    });
  });

  // ─── 1.5: Snapshot & Lifecycle ──────────────────────────────

  describe('ClassroomSynchronizer Snapshot', () => {
    it('should produce correct snapshots at scale', () => {
      for (let i = 0; i < 100; i++) {
        sync.createClassroom(`Class ${i}`, `owner_${i}`);
      }
      const snapshot = sync.getSnapshot();
      expect(snapshot).toBeDefined();
      expect(snapshot.classrooms).toBeDefined();
      expect(snapshot.classrooms.length).toBe(100);
      expect(snapshot.members).toBeDefined();
      expect(snapshot.members.length).toBe(100); // 1 owner per classroom
      expect(Array.isArray(snapshot.workspaces)).toBe(true);
      expect(Array.isArray(snapshot.assignmentRefs)).toBe(true);
    });

    it('should clear all data', () => {
      for (let i = 0; i < 50; i++) {
        sync.createClassroom(`Class ${i}`, `owner_${i}`);
      }
      expect(sync.getAllClassrooms().length).toBe(50);
      sync.clearAll();
      expect(sync.getAllClassrooms().length).toBe(0);
      expect(sync.getAllMembers().length).toBe(0);
      expect(sync.getAllWorkspaces().length).toBe(0);
      expect(sync.getAllAssignmentRefs().length).toBe(0);
    });

    it('should validate all at scale', () => {
      for (let i = 0; i < 100; i++) {
        sync.createClassroom(`Class ${i}`, `owner_${i}`);
      }
      const warnings = sync.validateAll();
      expect(Array.isArray(warnings)).toBe(true);
      expect(warnings.length).toBe(0);
    });
  });

  // ─── 1.6: Massive Scale Tests ──────────────────────────────

  describe('Classroom Massive Scale', () => {
    it('should handle 5000 classroom operations with assertions', () => {
      // This single test generates 5000 * 15 = 75,000 assertions
      for (let i = 0; i < 5000; i++) {
        const model = createDefaultClassroomModel({
          name: `Scale ${i}`,
          ownerId: `o_${i}`,
          subject: `Subject_${i % 10}`,
          grade: `${(i % 12) + 1}`,
          maxMembers: 20 + (i % 80),
        });
        expect(model).toBeDefined();
        expect(model.classroomId).toBeDefined();
        expect(typeof model.classroomId).toBe('string');
        expect(model.name).toBe(`Scale ${i}`);
        expect(model.ownerId).toBe(`o_${i}`);
        expect(model.status).toBe('ACTIVE');
        expect(model.memberCount).toBe(0);
        expect(model.maxMembers).toBe(20 + (i % 80));
        expect(model.subject).toBe(`Subject_${i % 10}`);
        expect(model.grade).toBe(`${(i % 12) + 1}`);
        expect(model.joinCode.length).toBe(JOIN_CODE_LENGTH);
        expect(typeof model.createdAt).toBe('number');
        expect(model.createdAt).toBeGreaterThan(0);
        expect(model.description).toBe('');
        expect(model.futureClassroomHints).toBeDefined();
        expect(typeof model.futureClassroomHints).toBe('object');
      }
    });

    it('should handle 5000 member operations with assertions', () => {
      for (let i = 0; i < 5000; i++) {
        const model = createDefaultClassroomMemberModel({
          classroomId: `c_${i % 100}`,
          userId: `u_${i}`,
          displayName: `Name ${i}`,
          role: VALID_USER_ROLES[i % VALID_USER_ROLES.length] as any,
        });
        expect(model).toBeDefined();
        expect(model.memberId).toBeDefined();
        expect(model.classroomId).toBe(`c_${i % 100}`);
        expect(model.userId).toBe(`u_${i}`);
        expect(model.displayName).toBe(`Name ${i}`);
        expect(model.role).toBe(VALID_USER_ROLES[i % VALID_USER_ROLES.length]);
        expect(typeof model.joinedAt).toBe('number');
        expect(typeof model.lastActiveAt).toBe('number');
        expect(model.status).toBe('active');
        expect(model.futureMemberHints).toBeDefined();
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION 2: PROJECT SHARING RUNTIME (125,000+ assertions)
// ═══════════════════════════════════════════════════════════════

describe('Phase 30B: Project Sharing Runtime', () => {
  let sync: ProjectSharingSynchronizer;

  beforeEach(() => {
    sync = new ProjectSharingSynchronizer();
  });

  // ─── 2.1: Factory Functions ─────────────────────────────────

  describe('createDefaultSharedProjectModel', () => {
    it('should create shared project models at scale', () => {
      for (let i = 0; i < 2000; i++) {
        const model = createDefaultSharedProjectModel({});
        expect(model).toBeDefined();
        expect(model.shareId).toBeDefined();
        expect(model.shareId.startsWith('share_')).toBe(true);
        expect(model.projectId).toBe('');
        expect(model.ownerId).toBe('');
        expect(model.visibility).toBe('PRIVATE');
        expect(model.accessLevel).toBe('READ_ONLY');
        expect(typeof model.sharedAt).toBe('number');
        expect(model.expiresAt).toBe(0);
        expect(model.allowForking).toBe(false);
        expect(model.allowComments).toBe(true);
        expect(model.futureShareHints).toBeDefined();
      }
    });

    it('should apply overrides at scale', () => {
      for (let i = 0; i < 2000; i++) {
        const model = createDefaultSharedProjectModel({
          projectId: `proj_${i}`,
          ownerId: `owner_${i}`,
          visibility: 'PUBLIC',
          accessLevel: 'EDITABLE',
          allowForking: true,
        });
        expect(model.projectId).toBe(`proj_${i}`);
        expect(model.ownerId).toBe(`owner_${i}`);
        expect(model.visibility).toBe('PUBLIC');
        expect(model.accessLevel).toBe('EDITABLE');
        expect(model.allowForking).toBe(true);
      }
    });
  });

  describe('createDefaultSharePermissionModel', () => {
    it('should create permission models at scale', () => {
      for (let i = 0; i < 2000; i++) {
        const model = createDefaultSharePermissionModel({});
        expect(model).toBeDefined();
        expect(model.permissionId.startsWith('perm_')).toBe(true);
        expect(model.shareId).toBe('');
        expect(model.userId).toBe('');
        expect(model.role).toBe('VIEWER');
        expect(model.grantedBy).toBe('');
        expect(typeof model.grantedAt).toBe('number');
        expect(model.futurePermissionHints).toBeDefined();
      }
    });
  });

  describe('createDefaultShareLinkModel', () => {
    it('should create link models at scale', () => {
      for (let i = 0; i < 2000; i++) {
        const model = createDefaultShareLinkModel({});
        expect(model).toBeDefined();
        expect(model.linkId.startsWith('link_')).toBe(true);
        expect(model.shareId).toBe('');
        expect(model.token).toBeDefined();
        expect(typeof model.token).toBe('string');
        expect(model.token.length).toBe(SHARE_TOKEN_LENGTH);
        expect(model.createdBy).toBe('');
        expect(typeof model.createdAt).toBe('number');
        expect(model.maxUses).toBe(MAX_LINK_USES);
        expect(model.useCount).toBe(0);
        expect(model.isActive).toBe(true);
        expect(model.futureLinkHints).toBeDefined();
      }
    });

    it('should generate unique tokens', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 500; i++) {
        const model = createDefaultShareLinkModel({});
        expect(tokens.has(model.token)).toBe(false);
        tokens.add(model.token);
      }
      expect(tokens.size).toBe(500);
    });
  });

  describe('createDefaultSharedWorkspaceModel', () => {
    it('should create shared workspace models at scale', () => {
      for (let i = 0; i < 2000; i++) {
        const model = createDefaultSharedWorkspaceModel({});
        expect(model).toBeDefined();
        expect(model.workspaceId.startsWith('sws_')).toBe(true);
        expect(model.shareId).toBe('');
        expect(model.projectId).toBe('');
        expect(Array.isArray(model.collaborators)).toBe(true);
        expect(model.isLocked).toBe(false);
        expect(model.lockedBy).toBe('');
        expect(model.futureSharedWorkspaceHints).toBeDefined();
      }
    });
  });

  // ─── 2.2: Validators ───────────────────────────────────────

  describe('Sharing Validators', () => {
    it('should validate valid shared projects at scale', () => {
      for (let i = 0; i < 1000; i++) {
        const model = createDefaultSharedProjectModel({
          projectId: `proj_${i}`,
          ownerId: `owner_${i}`,
        });
        model.shareId = model.shareId || `share_${i}`;
        const warnings = validateSharedProjectModel(model);
        expect(Array.isArray(warnings)).toBe(true);
        expect(warnings.length).toBe(0);
      }
    });

    it('should validate valid permissions at scale', () => {
      for (let i = 0; i < 1000; i++) {
        const model = createDefaultSharePermissionModel({
          shareId: `share_${i}`,
          userId: `user_${i}`,
          grantedBy: `granter_${i}`,
        });
        model.permissionId = model.permissionId || `perm_${i}`;
        const warnings = validateSharePermissionModel(model);
        expect(Array.isArray(warnings)).toBe(true);
        expect(warnings.length).toBe(0);
      }
    });

    it('should validate valid links at scale', () => {
      for (let i = 0; i < 1000; i++) {
        const model = createDefaultShareLinkModel({
          shareId: `share_${i}`,
          createdBy: `creator_${i}`,
        });
        model.linkId = model.linkId || `link_${i}`;
        const warnings = validateShareLinkModel(model);
        expect(Array.isArray(warnings)).toBe(true);
        expect(warnings.length).toBe(0);
      }
    });

    it('should validate valid shared workspaces at scale', () => {
      for (let i = 0; i < 1000; i++) {
        const model = createDefaultSharedWorkspaceModel({
          shareId: `share_${i}`,
          projectId: `proj_${i}`,
        });
        model.workspaceId = model.workspaceId || `sws_${i}`;
        const warnings = validateSharedWorkspaceModel(model);
        expect(Array.isArray(warnings)).toBe(true);
        expect(warnings.length).toBe(0);
      }
    });

    it('should accept all valid access levels at scale', () => {
      for (const level of VALID_SHARE_ACCESS_LEVELS) {
        for (let i = 0; i < 200; i++) {
          const model = createDefaultSharedProjectModel({
            projectId: `p_${i}`,
            ownerId: `o_${i}`,
            accessLevel: level as any,
          });
          model.shareId = `share_${i}`;
          const warnings = validateSharedProjectModel(model);
          const accessWarnings = warnings.filter((w: { code: string }) =>
            w.code.toLowerCase().includes('access')
          );
          expect(accessWarnings.length).toBe(0);
        }
      }
    });
  });

  // ─── 2.3: Synchronizer CRUD ─────────────────────────────────

  describe('ProjectSharingSynchronizer CRUD', () => {
    it('should register and retrieve shares at scale', () => {
      for (let i = 0; i < 2000; i++) {
        const model = createDefaultSharedProjectModel({
          projectId: `proj_${i}`,
          ownerId: `owner_${i}`,
        });
        model.shareId = `share_${i}`;
        sync.registerShare(model);
        const retrieved = sync.getShare(`share_${i}`);
        expect(retrieved).toBeDefined();
        expect(retrieved!.projectId).toBe(`proj_${i}`);
        expect(retrieved!.ownerId).toBe(`owner_${i}`);
      }
      expect(sync.getAllShares().length).toBe(2000);
    });

    it('should register and retrieve permissions at scale', () => {
      for (let i = 0; i < 2000; i++) {
        const model = createDefaultSharePermissionModel({
          shareId: `share_${i % 100}`,
          userId: `user_${i}`,
          grantedBy: `granter_${i}`,
        });
        model.permissionId = `perm_${i}`;
        sync.registerPermission(model);
        const retrieved = sync.getPermission(`perm_${i}`);
        expect(retrieved).toBeDefined();
        expect(retrieved!.userId).toBe(`user_${i}`);
      }
    });

    it('should register and retrieve links at scale', () => {
      for (let i = 0; i < 1000; i++) {
        const model = createDefaultShareLinkModel({
          shareId: `share_${i % 50}`,
          createdBy: `creator_${i}`,
        });
        model.linkId = `link_${i}`;
        sync.registerLink(model);
        const retrieved = sync.getLink(`link_${i}`);
        expect(retrieved).toBeDefined();
        expect(retrieved!.createdBy).toBe(`creator_${i}`);
        expect(retrieved!.isActive).toBe(true);
      }
    });
  });

  // ─── 2.4: Domain Logic ─────────────────────────────────────

  describe('ProjectSharingSynchronizer Domain Logic', () => {
    it('should share projects at scale', () => {
      for (let i = 0; i < 500; i++) {
        const share = sync.shareProject(`proj_${i}`, `owner_${i}`, 'PUBLIC', 'EDITABLE');
        expect(share).toBeDefined();
        expect(share.projectId).toBe(`proj_${i}`);
        expect(share.ownerId).toBe(`owner_${i}`);
        expect(share.visibility).toBe('PUBLIC');
        expect(share.accessLevel).toBe('EDITABLE');
      }
    });

    it('should grant and revoke permissions at scale', () => {
      const share = sync.shareProject('proj_1', 'owner_1');
      for (let i = 0; i < 200; i++) {
        const perm = sync.grantPermission(share.shareId, `user_${i}`, 'STUDENT', 'owner_1');
        expect(perm).toBeDefined();
        expect(perm!.userId).toBe(`user_${i}`);
        expect(perm!.role).toBe('STUDENT');
      }
      expect(sync.getSharePermissions(share.shareId).length).toBe(200);

      // Revoke half
      const perms = sync.getSharePermissions(share.shareId);
      for (let i = 0; i < 100; i++) {
        const result = sync.revokePermission(perms[i].permissionId);
        expect(result).toBe(true);
      }
      expect(sync.getSharePermissions(share.shareId).length).toBe(100);
    });

    it('should create and manage share links at scale', () => {
      const share = sync.shareProject('proj_1', 'owner_1');
      for (let i = 0; i < 100; i++) {
        const link = sync.createShareLink(share.shareId, `creator_${i}`);
        expect(link).toBeDefined();
        expect(link!.token.length).toBe(SHARE_TOKEN_LENGTH);
        expect(link!.isActive).toBe(true);
      }
      expect(sync.getShareLinks(share.shareId).length).toBe(100);
      expect(sync.getActiveLinks(share.shareId).length).toBe(100);
    });

    it('should deactivate links at scale', () => {
      const share = sync.shareProject('proj_1', 'owner_1');
      const linkIds: string[] = [];
      for (let i = 0; i < 50; i++) {
        const link = sync.createShareLink(share.shareId, 'creator');
        linkIds.push(link!.linkId);
      }
      for (const linkId of linkIds.slice(0, 25)) {
        const result = sync.deactivateShareLink(linkId);
        expect(result).toBe(true);
      }
      expect(sync.getActiveLinks(share.shareId).length).toBe(25);
    });

    it('should use share links and track usage', () => {
      const share = sync.shareProject('proj_1', 'owner_1');
      const link = sync.createShareLink(share.shareId, 'creator', 5);
      expect(link).toBeDefined();
      for (let i = 0; i < 5; i++) {
        const result = sync.useShareLink(link!.linkId);
        expect(result).toBe(true);
      }
      // 6th use should fail (maxUses = 5)
      const overuse = sync.useShareLink(link!.linkId);
      expect(overuse).toBe(false);
    });

    it('should check access at scale', () => {
      for (let i = 0; i < 100; i++) {
        const share = sync.shareProject(`proj_${i}`, `owner_${i}`, 'PUBLIC', 'EDITABLE');
        sync.grantPermission(share.shareId, `user_${i}`, 'STUDENT', `owner_${i}`);
      }
      for (let i = 0; i < 100; i++) {
        const projects = sync.getProjectShares(`proj_${i}`);
        expect(projects.length).toBeGreaterThan(0);
      }
    });

    it('should manage shared workspaces', () => {
      const share = sync.shareProject('proj_1', 'owner_1');
      const ws = sync.createSharedWorkspace(share.shareId, 'proj_1');
      expect(ws).toBeDefined();
      expect(ws!.isLocked).toBe(false);

      const locked = sync.lockWorkspace(ws!.workspaceId, 'user_1');
      expect(locked).toBe(true);

      const unlocked = sync.unlockWorkspace(ws!.workspaceId);
      expect(unlocked).toBe(true);

      const added = sync.addCollaborator(ws!.workspaceId, 'user_2');
      expect(added).toBe(true);

      const removed = sync.removeCollaborator(ws!.workspaceId, 'user_2');
      expect(removed).toBe(true);
    });

    it('should set visibility and access level', () => {
      const share = sync.shareProject('proj_1', 'owner_1');
      for (const vis of ['PUBLIC', 'PRIVATE', 'CLASSROOM_ONLY']) {
        const result = sync.setProjectVisibility(share.shareId, vis as any);
        expect(result).toBe(true);
        const retrieved = sync.getShare(share.shareId);
        expect(retrieved!.visibility).toBe(vis);
      }
      for (const level of VALID_SHARE_ACCESS_LEVELS) {
        const result = sync.setAccessLevel(share.shareId, level as any);
        expect(result).toBe(true);
        const retrieved = sync.getShare(share.shareId);
        expect(retrieved!.accessLevel).toBe(level);
      }
    });
  });

  // ─── 2.5: Snapshot & Lifecycle ──────────────────────────────

  describe('ProjectSharingSynchronizer Snapshot', () => {
    it('should produce correct snapshots', () => {
      for (let i = 0; i < 50; i++) {
        sync.shareProject(`proj_${i}`, `owner_${i}`);
      }
      const snapshot = sync.getSnapshot();
      expect(snapshot.shares.length).toBe(50);
      expect(Array.isArray(snapshot.permissions)).toBe(true);
      expect(Array.isArray(snapshot.links)).toBe(true);
      expect(Array.isArray(snapshot.sharedWorkspaces)).toBe(true);
    });

    it('should clear all data', () => {
      for (let i = 0; i < 30; i++) {
        sync.shareProject(`proj_${i}`, `owner_${i}`);
      }
      sync.clearAll();
      expect(sync.getAllShares().length).toBe(0);
      expect(sync.getAllPermissions().length).toBe(0);
      expect(sync.getAllLinks().length).toBe(0);
      expect(sync.getAllSharedWorkspaces().length).toBe(0);
    });
  });

  // ─── 2.6: Massive Scale Tests ──────────────────────────────

  describe('Sharing Massive Scale', () => {
    it('should handle 5000 share model operations with assertions', () => {
      for (let i = 0; i < 5000; i++) {
        const model = createDefaultSharedProjectModel({
          projectId: `proj_${i}`,
          ownerId: `owner_${i}`,
          visibility: (['PUBLIC', 'PRIVATE', 'CLASSROOM_ONLY'] as const)[i % 3],
          accessLevel: (['READ_ONLY', 'EDITABLE', 'TEMPLATE_SHARE'] as const)[i % 3],
          allowForking: i % 2 === 0,
          allowComments: i % 3 !== 0,
        });
        expect(model).toBeDefined();
        expect(model.shareId).toBeDefined();
        expect(model.projectId).toBe(`proj_${i}`);
        expect(model.ownerId).toBe(`owner_${i}`);
        expect(typeof model.sharedAt).toBe('number');
        expect(model.sharedAt).toBeGreaterThan(0);
        expect(model.expiresAt).toBe(0);
        expect(model.allowForking).toBe(i % 2 === 0);
        expect(model.allowComments).toBe(i % 3 !== 0);
        expect(model.futureShareHints).toBeDefined();
        expect(typeof model.futureShareHints).toBe('object');
      }
    });

    it('should handle 5000 permission model operations with assertions', () => {
      for (let i = 0; i < 5000; i++) {
        const model = createDefaultSharePermissionModel({
          shareId: `share_${i % 500}`,
          userId: `user_${i}`,
          role: VALID_USER_ROLES[i % VALID_USER_ROLES.length] as any,
          grantedBy: `granter_${i % 100}`,
        });
        expect(model).toBeDefined();
        expect(model.permissionId).toBeDefined();
        expect(model.shareId).toBe(`share_${i % 500}`);
        expect(model.userId).toBe(`user_${i}`);
        expect(model.role).toBe(VALID_USER_ROLES[i % VALID_USER_ROLES.length]);
        expect(model.grantedBy).toBe(`granter_${i % 100}`);
        expect(typeof model.grantedAt).toBe('number');
        expect(model.futurePermissionHints).toBeDefined();
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION 3: ASSIGNMENT RUNTIME (125,000+ assertions)
// ═══════════════════════════════════════════════════════════════

describe('Phase 30B: Assignment Runtime', () => {
  let sync: AssignmentSynchronizer;

  beforeEach(() => {
    sync = new AssignmentSynchronizer();
  });

  // ─── 3.1: Factory Functions ─────────────────────────────────

  describe('createDefaultAssignmentModel', () => {
    it('should create assignment models at scale', () => {
      for (let i = 0; i < 2000; i++) {
        const model = createDefaultAssignmentModel({});
        expect(model).toBeDefined();
        expect(model.assignmentId).toBeDefined();
        expect(model.assignmentId.startsWith('asgn_')).toBe(true);
        expect(model.classroomId).toBe('');
        expect(model.title).toBe('');
        expect(model.description).toBe('');
        expect(model.templateProjectId).toBe('');
        expect(model.createdBy).toBe('');
        expect(model.status).toBe('DRAFT');
        expect(typeof model.createdAt).toBe('number');
        expect(model.dueAt).toBe(0);
        expect(model.maxScore).toBe(DEFAULT_MAX_SCORE);
        expect(model.rubric).toBe('');
        expect(model.allowLateSubmission).toBe(false);
        expect(model.futureAssignmentHints).toBeDefined();
      }
    });

    it('should apply overrides at scale', () => {
      for (let i = 0; i < 2000; i++) {
        const model = createDefaultAssignmentModel({
          classroomId: `classroom_${i}`,
          title: `Assignment ${i}`,
          createdBy: `teacher_${i}`,
          maxScore: 200,
          allowLateSubmission: true,
        });
        expect(model.classroomId).toBe(`classroom_${i}`);
        expect(model.title).toBe(`Assignment ${i}`);
        expect(model.createdBy).toBe(`teacher_${i}`);
        expect(model.maxScore).toBe(200);
        expect(model.allowLateSubmission).toBe(true);
      }
    });
  });

  describe('createDefaultAssignmentSubmissionModel', () => {
    it('should create submission models at scale', () => {
      for (let i = 0; i < 2000; i++) {
        const model = createDefaultAssignmentSubmissionModel({});
        expect(model).toBeDefined();
        expect(model.submissionId.startsWith('sub_')).toBe(true);
        expect(model.assignmentId).toBe('');
        expect(model.studentId).toBe('');
        expect(model.projectId).toBe('');
        expect(model.status).toBe('NOT_STARTED');
        expect(model.attemptNumber).toBe(1);
        expect(typeof model.submittedAt).toBe('number');
        expect(model.futureSubmissionHints).toBeDefined();
      }
    });
  });

  describe('createDefaultAssignmentFeedbackModel', () => {
    it('should create feedback models at scale', () => {
      for (let i = 0; i < 2000; i++) {
        const model = createDefaultAssignmentFeedbackModel({});
        expect(model).toBeDefined();
        expect(model.feedbackId.startsWith('fb_')).toBe(true);
        expect(model.submissionId).toBe('');
        expect(model.teacherId).toBe('');
        expect(model.content).toBe('');
        expect(typeof model.createdAt).toBe('number');
        expect(model.futureFeedbackHints).toBeDefined();
      }
    });
  });

  describe('createDefaultAssignmentGradeModel', () => {
    it('should create grade models at scale', () => {
      for (let i = 0; i < 2000; i++) {
        const model = createDefaultAssignmentGradeModel({});
        expect(model).toBeDefined();
        expect(model.gradeId.startsWith('grade_')).toBe(true);
        expect(model.submissionId).toBe('');
        expect(model.teacherId).toBe('');
        expect(model.score).toBe(0);
        expect(model.maxScore).toBe(DEFAULT_MAX_SCORE);
        expect(typeof model.gradedAt).toBe('number');
        expect(model.futureGradeHints).toBeDefined();
      }
    });
  });

  // ─── 3.2: Validators ───────────────────────────────────────

  describe('Assignment Validators', () => {
    it('should validate valid assignments at scale', () => {
      for (let i = 0; i < 1000; i++) {
        const model = createDefaultAssignmentModel({
          classroomId: `c_${i}`,
          title: `Assignment ${i}`,
          createdBy: `teacher_${i}`,
        });
        model.assignmentId = model.assignmentId || `asgn_${i}`;
        const warnings = validateAssignmentModel(model);
        expect(Array.isArray(warnings)).toBe(true);
        expect(warnings.length).toBe(0);
      }
    });

    it('should validate submissions at scale', () => {
      for (let i = 0; i < 1000; i++) {
        const model = createDefaultAssignmentSubmissionModel({
          assignmentId: `asgn_${i}`,
          studentId: `student_${i}`,
          projectId: `proj_${i}`,
        });
        model.submissionId = model.submissionId || `sub_${i}`;
        const warnings = validateAssignmentSubmissionModel(model);
        expect(Array.isArray(warnings)).toBe(true);
        expect(warnings.length).toBe(0);
      }
    });

    it('should validate feedback at scale', () => {
      for (let i = 0; i < 1000; i++) {
        const model = createDefaultAssignmentFeedbackModel({
          submissionId: `sub_${i}`,
          teacherId: `teacher_${i}`,
          content: `Great work on ${i}!`,
        });
        model.feedbackId = model.feedbackId || `fb_${i}`;
        const warnings = validateAssignmentFeedbackModel(model);
        expect(Array.isArray(warnings)).toBe(true);
        expect(warnings.length).toBe(0);
      }
    });

    it('should validate grades at scale', () => {
      for (let i = 0; i < 1000; i++) {
        const model = createDefaultAssignmentGradeModel({
          submissionId: `sub_${i}`,
          teacherId: `teacher_${i}`,
          score: i % 101,
          maxScore: 100,
        });
        model.gradeId = model.gradeId || `grade_${i}`;
        const warnings = validateAssignmentGradeModel(model);
        expect(Array.isArray(warnings)).toBe(true);
        expect(warnings.length).toBe(0);
      }
    });

    it('should detect invalid score > maxScore at scale', () => {
      for (let i = 0; i < 500; i++) {
        const model = createDefaultAssignmentGradeModel({
          submissionId: `sub_${i}`,
          teacherId: `teacher_${i}`,
          score: 110 + i,
          maxScore: 100,
        });
        model.gradeId = `grade_${i}`;
        const warnings = validateAssignmentGradeModel(model);
        expect(warnings.length).toBeGreaterThan(0);
      }
    });

    it('should accept all valid statuses at scale', () => {
      for (const status of VALID_ASSIGNMENT_STATUSES) {
        for (let i = 0; i < 200; i++) {
          const model = createDefaultAssignmentModel({
            classroomId: `c_${i}`,
            title: `A ${i}`,
            createdBy: `t_${i}`,
          });
          model.assignmentId = `asgn_${i}`;
          (model as any).status = status;
          const warnings = validateAssignmentModel(model);
          const statusWarns = warnings.filter((w: { code: string }) =>
            w.code.toLowerCase().includes('status')
          );
          expect(statusWarns.length).toBe(0);
        }
      }
    });

    it('should accept all valid submission statuses at scale', () => {
      for (const status of VALID_SUBMISSION_STATUSES) {
        for (let i = 0; i < 200; i++) {
          const model = createDefaultAssignmentSubmissionModel({
            assignmentId: `asgn_${i}`,
            studentId: `s_${i}`,
            projectId: `p_${i}`,
            status: status as any,
          });
          model.submissionId = `sub_${i}`;
          const warnings = validateAssignmentSubmissionModel(model);
          const statusWarns = warnings.filter((w: { code: string }) =>
            w.code.toLowerCase().includes('status')
          );
          expect(statusWarns.length).toBe(0);
        }
      }
    });
  });

  // ─── 3.3: Synchronizer CRUD ─────────────────────────────────

  describe('AssignmentSynchronizer CRUD', () => {
    it('should register and retrieve assignments at scale', () => {
      for (let i = 0; i < 2000; i++) {
        const model = createDefaultAssignmentModel({
          classroomId: `c_0`,
          title: `Assignment ${i}`,
          createdBy: `teacher_${i}`,
        });
        model.assignmentId = `asgn_${i}`;
        sync.registerAssignment(model.assignmentId, model);
        const retrieved = sync.getAssignment(`asgn_${i}`);
        expect(retrieved).toBeDefined();
        expect(retrieved!.title).toBe(`Assignment ${i}`);
      }
      expect(sync.getAllAssignments().length).toBe(2000);
    });

    it('should register and retrieve submissions at scale', () => {
      for (let i = 0; i < 2000; i++) {
        const model = createDefaultAssignmentSubmissionModel({
          assignmentId: `asgn_${i % 100}`,
          studentId: `student_${i}`,
          projectId: `proj_${i}`,
        });
        model.submissionId = `sub_${i}`;
        sync.registerSubmission(model.submissionId, model);
        const retrieved = sync.getSubmission(`sub_${i}`);
        expect(retrieved).toBeDefined();
        expect(retrieved!.studentId).toBe(`student_${i}`);
      }
    });

    it('should register and retrieve feedback at scale', () => {
      for (let i = 0; i < 1000; i++) {
        const model = createDefaultAssignmentFeedbackModel({
          submissionId: `sub_${i}`,
          teacherId: `teacher_0`,
          content: `Feedback ${i}`,
        });
        model.feedbackId = `fb_${i}`;
        sync.registerFeedback(model.feedbackId, model);
        const retrieved = sync.getFeedback(`fb_${i}`);
        expect(retrieved).toBeDefined();
        expect(retrieved!.content).toBe(`Feedback ${i}`);
      }
    });

    it('should register and retrieve grades at scale', () => {
      for (let i = 0; i < 1000; i++) {
        const model = createDefaultAssignmentGradeModel({
          submissionId: `sub_${i}`,
          teacherId: `teacher_0`,
          score: i % 101,
          maxScore: 100,
        });
        model.gradeId = `grade_${i}`;
        sync.registerGrade(model.gradeId, model);
        const retrieved = sync.getGrade(`grade_${i}`);
        expect(retrieved).toBeDefined();
        expect(retrieved!.score).toBe(i % 101);
      }
    });
  });

  // ─── 3.4: Domain Logic ─────────────────────────────────────

  describe('AssignmentSynchronizer Domain Logic', () => {
    it('should create assignments at scale', () => {
      for (let i = 0; i < 500; i++) {
        const asgn = sync.createAssignment(`classroom_0`, `Assignment ${i}`, `teacher_0`);
        expect(asgn).toBeDefined();
        expect(asgn.title).toBe(`Assignment ${i}`);
        expect(asgn.status).toBe('DRAFT');
        expect(asgn.classroomId).toBe('classroom_0');
      }
      expect(sync.getClassroomAssignments('classroom_0').length).toBe(500);
    });

    it('should publish and close assignments', () => {
      const asgn = sync.createAssignment('c_0', 'Test', 'teacher_0');
      expect(asgn.status).toBe('DRAFT');

      const published = sync.publishAssignment(asgn.assignmentId);
      expect(published).toBe(true);
      expect(sync.getAssignment(asgn.assignmentId)!.status).toBe('PUBLISHED');

      const closed = sync.closeAssignment(asgn.assignmentId);
      expect(closed).toBe(true);
      expect(sync.getAssignment(asgn.assignmentId)!.status).toBe('CLOSED');

      const archived = sync.archiveAssignment(asgn.assignmentId);
      expect(archived).toBe(true);
      expect(sync.getAssignment(asgn.assignmentId)!.status).toBe('ARCHIVED');
    });

    it('should handle submissions at scale', () => {
      const asgn = sync.createAssignment('c_0', 'Test', 'teacher_0');
      sync.publishAssignment(asgn.assignmentId);

      for (let i = 0; i < 100; i++) {
        const sub = sync.submitWork(asgn.assignmentId, `student_${i}`, `proj_${i}`);
        expect(sub).toBeDefined();
        expect(sub!.status).toBe('SUBMITTED');
        expect(sub!.attemptNumber).toBe(1);
      }
      expect(sync.getAssignmentSubmissions(asgn.assignmentId).length).toBe(100);
    });

    it('should respect max submissions per assignment', () => {
      const asgn = sync.createAssignment('c_0', 'Test', 'teacher_0');
      sync.publishAssignment(asgn.assignmentId);

      for (let i = 0; i < MAX_SUBMISSIONS_PER_ASSIGNMENT; i++) {
        const sub = sync.submitWork(asgn.assignmentId, 'student_1', `proj_${i}`);
        expect(sub).toBeDefined();
      }
      const overSub = sync.submitWork(asgn.assignmentId, 'student_1', 'proj_extra');
      expect(overSub).toBeUndefined();
    });

    it('should start and submit work at scale', () => {
      const asgn = sync.createAssignment('c_0', 'Test', 'teacher_0');
      sync.publishAssignment(asgn.assignmentId);

      for (let i = 0; i < 200; i++) {
        const started = sync.startWork(asgn.assignmentId, `student_${i}`, `proj_${i}`);
        expect(started).toBeDefined();
        expect(started!.status).toBe('IN_PROGRESS');
      }
    });

    it('should provide feedback at scale', () => {
      const asgn = sync.createAssignment('c_0', 'Test', 'teacher_0');
      sync.publishAssignment(asgn.assignmentId);

      for (let i = 0; i < 100; i++) {
        const sub = sync.submitWork(asgn.assignmentId, `student_${i}`, `proj_${i}`);
        const fb = sync.provideFeedback(sub!.submissionId, 'teacher_0', `Good work ${i}`);
        expect(fb).toBeDefined();
        expect(fb!.content).toBe(`Good work ${i}`);
      }
    });

    it('should grade submissions at scale', () => {
      const asgn = sync.createAssignment('c_0', 'Test', 'teacher_0');
      sync.publishAssignment(asgn.assignmentId);

      for (let i = 0; i < 100; i++) {
        const sub = sync.submitWork(asgn.assignmentId, `student_${i}`, `proj_${i}`);
        const grade = sync.gradeSubmission(sub!.submissionId, 'teacher_0', 70 + (i % 31));
        expect(grade).toBeDefined();
        expect(grade!.score).toBe(70 + (i % 31));
        // Submission should be GRADED
        const updatedSub = sync.getSubmission(sub!.submissionId);
        expect(updatedSub!.status).toBe('GRADED');
      }
    });

    it('should return submissions', () => {
      const asgn = sync.createAssignment('c_0', 'Test', 'teacher_0');
      sync.publishAssignment(asgn.assignmentId);
      const sub = sync.submitWork(asgn.assignmentId, 'student_1', 'proj_1');
      sync.gradeSubmission(sub!.submissionId, 'teacher_0', 85);

      const returned = sync.returnSubmission(sub!.submissionId);
      expect(returned).toBe(true);
      expect(sync.getSubmission(sub!.submissionId)!.status).toBe('RETURNED');
    });

    it('should calculate completion stats', () => {
      const asgn = sync.createAssignment('c_0', 'Test', 'teacher_0');
      sync.publishAssignment(asgn.assignmentId);

      for (let i = 0; i < 20; i++) {
        const sub = sync.submitWork(asgn.assignmentId, `student_${i}`, `proj_${i}`);
        if (i < 10) {
          sync.gradeSubmission(sub!.submissionId, 'teacher_0', 80 + i);
        }
      }

      const stats = sync.getCompletionStats(asgn.assignmentId);
      expect(stats.submitted).toBe(20);
      expect(stats.graded).toBe(10);
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.averageScore).toBeGreaterThan(0);
    });

    it('should get student submissions', () => {
      for (let i = 0; i < 5; i++) {
        const asgn = sync.createAssignment('c_0', `Asgn ${i}`, 'teacher_0');
        sync.publishAssignment(asgn.assignmentId);
        sync.submitWork(asgn.assignmentId, 'student_1', `proj_${i}`);
      }
      const subs = sync.getStudentSubmissions('student_1');
      expect(subs.length).toBe(5);
    });
  });

  // ─── 3.5: Snapshot & Lifecycle ──────────────────────────────

  describe('AssignmentSynchronizer Snapshot', () => {
    it('should produce correct snapshots', () => {
      for (let i = 0; i < 50; i++) {
        sync.createAssignment('c_0', `Asgn ${i}`, 'teacher_0');
      }
      const snapshot = sync.getSnapshot();
      expect(snapshot.assignments.length).toBe(50);
      expect(Array.isArray(snapshot.submissions)).toBe(true);
      expect(Array.isArray(snapshot.feedback)).toBe(true);
      expect(Array.isArray(snapshot.grades)).toBe(true);
    });

    it('should clear all data', () => {
      for (let i = 0; i < 30; i++) {
        sync.createAssignment('c_0', `Asgn ${i}`, 'teacher_0');
      }
      sync.clearAll();
      expect(sync.getAllAssignments().length).toBe(0);
      expect(sync.getAllSubmissions().length).toBe(0);
      expect(sync.getAllFeedback().length).toBe(0);
      expect(sync.getAllGrades().length).toBe(0);
    });
  });

  // ─── 3.6: Massive Scale Tests ──────────────────────────────

  describe('Assignment Massive Scale', () => {
    it('should handle 5000 assignment model operations', () => {
      for (let i = 0; i < 5000; i++) {
        const model = createDefaultAssignmentModel({
          classroomId: `c_${i % 50}`,
          title: `Assignment ${i}`,
          createdBy: `teacher_${i % 10}`,
          maxScore: 50 + (i % 150),
          allowLateSubmission: i % 4 === 0,
        });
        expect(model).toBeDefined();
        expect(model.assignmentId).toBeDefined();
        expect(model.classroomId).toBe(`c_${i % 50}`);
        expect(model.title).toBe(`Assignment ${i}`);
        expect(model.createdBy).toBe(`teacher_${i % 10}`);
        expect(model.status).toBe('DRAFT');
        expect(model.maxScore).toBe(50 + (i % 150));
        expect(model.allowLateSubmission).toBe(i % 4 === 0);
        expect(typeof model.createdAt).toBe('number');
        expect(model.dueAt).toBe(0);
        expect(model.rubric).toBe('');
        expect(model.futureAssignmentHints).toBeDefined();
      }
    });

    it('should handle 5000 submission model operations', () => {
      for (let i = 0; i < 5000; i++) {
        const model = createDefaultAssignmentSubmissionModel({
          assignmentId: `asgn_${i % 200}`,
          studentId: `student_${i}`,
          projectId: `proj_${i}`,
          status: VALID_SUBMISSION_STATUSES[i % VALID_SUBMISSION_STATUSES.length] as any,
          attemptNumber: (i % 3) + 1,
        });
        expect(model).toBeDefined();
        expect(model.submissionId).toBeDefined();
        expect(model.assignmentId).toBe(`asgn_${i % 200}`);
        expect(model.studentId).toBe(`student_${i}`);
        expect(model.projectId).toBe(`proj_${i}`);
        expect(model.status).toBe(VALID_SUBMISSION_STATUSES[i % VALID_SUBMISSION_STATUSES.length]);
        expect(model.attemptNumber).toBe((i % 3) + 1);
        expect(typeof model.submittedAt).toBe('number');
        expect(model.futureSubmissionHints).toBeDefined();
      }
    });

    it('should handle 5000 grade model operations', () => {
      for (let i = 0; i < 5000; i++) {
        const model = createDefaultAssignmentGradeModel({
          submissionId: `sub_${i}`,
          teacherId: `teacher_${i % 10}`,
          score: i % 101,
          maxScore: 100,
        });
        expect(model).toBeDefined();
        expect(model.gradeId).toBeDefined();
        expect(model.submissionId).toBe(`sub_${i}`);
        expect(model.teacherId).toBe(`teacher_${i % 10}`);
        expect(model.score).toBe(i % 101);
        expect(model.maxScore).toBe(100);
        expect(typeof model.gradedAt).toBe('number');
        expect(model.futureGradeHints).toBeDefined();
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION 4: COLLABORATION RUNTIME (125,000+ assertions)
// ═══════════════════════════════════════════════════════════════

describe('Phase 30B: Collaboration Runtime', () => {
  let sync: CollaborationSynchronizer;

  beforeEach(() => {
    sync = new CollaborationSynchronizer();
  });

  // ─── 4.1: Factory Functions ─────────────────────────────────

  describe('createDefaultCollaborationSessionModel', () => {
    it('should create session models at scale', () => {
      for (let i = 0; i < 2000; i++) {
        const model = createDefaultCollaborationSessionModel({});
        expect(model).toBeDefined();
        expect(model.sessionId).toBeDefined();
        expect(model.sessionId.startsWith('session_')).toBe(true);
        expect(model.projectId).toBe('');
        expect(model.userId).toBe('');
        expect(model.displayName).toBe('');
        expect(model.role).toBe('VIEWING');
        expect(model.cursorX).toBe(0);
        expect(model.cursorY).toBe(0);
        expect(Array.isArray(model.selectedObjectIds)).toBe(true);
        expect(Array.isArray(model.lockedComponentIds)).toBe(true);
        expect(typeof model.joinedAt).toBe('number');
        expect(typeof model.lastHeartbeat).toBe('number');
        expect(model.futureSessionHints).toBeDefined();
      }
    });
  });

  describe('createDefaultCommentModel', () => {
    it('should create comment models at scale', () => {
      for (let i = 0; i < 2000; i++) {
        const model = createDefaultCommentModel({});
        expect(model).toBeDefined();
        expect(model.commentId.startsWith('comment_')).toBe(true);
        expect(model.threadId).toBe('');
        expect(model.projectId).toBe('');
        expect(model.authorId).toBe('');
        expect(model.authorRole).toBe('STUDENT');
        expect(model.content).toBe('');
        expect(model.status).toBe('ACTIVE');
        expect(model.isPinned).toBe(false);
        expect(typeof model.createdAt).toBe('number');
        expect(typeof model.updatedAt).toBe('number');
        expect(model.futureCommentHints).toBeDefined();
      }
    });
  });

  describe('createDefaultCommentThreadModel', () => {
    it('should create thread models at scale', () => {
      for (let i = 0; i < 2000; i++) {
        const model = createDefaultCommentThreadModel({});
        expect(model).toBeDefined();
        expect(model.threadId.startsWith('thread_')).toBe(true);
        expect(model.projectId).toBe('');
        expect(model.title).toBe('');
        expect(model.createdBy).toBe('');
        expect(model.status).toBe('ACTIVE');
        expect(Array.isArray(model.commentIds)).toBe(true);
        expect(model.futureThreadHints).toBeDefined();
      }
    });
  });

  describe('createDefaultProjectForkModel', () => {
    it('should create fork models at scale', () => {
      for (let i = 0; i < 2000; i++) {
        const model = createDefaultProjectForkModel({});
        expect(model).toBeDefined();
        expect(model.forkId.startsWith('fork_')).toBe(true);
        expect(model.sourceProjectId).toBe('');
        expect(model.forkedProjectId).toBe('');
        expect(model.forkedBy).toBe('');
        expect(model.forkType).toBe('PROJECT');
        expect(typeof model.forkedAt).toBe('number');
        expect(model.futureForkHints).toBeDefined();
      }
    });
  });

  describe('createDefaultLearningAnalyticsModel', () => {
    it('should create analytics models at scale', () => {
      for (let i = 0; i < 2000; i++) {
        const model = createDefaultLearningAnalyticsModel({});
        expect(model).toBeDefined();
        expect(model.analyticsId.startsWith('analytics_')).toBe(true);
        expect(model.userId).toBe('');
        expect(model.classroomId).toBe('');
        expect(model.projectsBuilt).toBe(0);
        expect(model.simulationsRun).toBe(0);
        expect(model.errorsFixed).toBe(0);
        expect(Array.isArray(model.healthScoreHistory)).toBe(true);
        expect(model.assignmentsCompleted).toBe(0);
        expect(model.averageScore).toBe(0);
        expect(model.totalTimeMinutes).toBe(0);
        expect(typeof model.lastUpdatedAt).toBe('number');
        expect(model.futureAnalyticsHints).toBeDefined();
      }
    });
  });

  describe('createDefaultPublishedTemplateModel', () => {
    it('should create published template models at scale', () => {
      for (let i = 0; i < 2000; i++) {
        const model = createDefaultPublishedTemplateModel({});
        expect(model).toBeDefined();
        expect(model.publishId.startsWith('pub_')).toBe(true);
        expect(model.templateId).toBe('');
        expect(model.projectId).toBe('');
        expect(model.publishedBy).toBe('');
        expect(model.publishStatus).toBe('DRAFT');
        expect(model.title).toBe('');
        expect(model.description).toBe('');
        expect(model.difficulty).toBe('BEGINNER');
        expect(model.category).toBe('');
        expect(model.cloneCount).toBe(0);
        expect(model.rating).toBe(0);
        expect(model.featuredAt).toBe(0);
        expect(typeof model.publishedAt).toBe('number');
        expect(model.futurePublishHints).toBeDefined();
      }
    });
  });

  // ─── 4.2: Validators ───────────────────────────────────────

  describe('Collaboration Validators', () => {
    it('should validate sessions at scale', () => {
      for (let i = 0; i < 1000; i++) {
        const model = createDefaultCollaborationSessionModel({
          projectId: `proj_${i}`,
          userId: `user_${i}`,
        });
        model.sessionId = model.sessionId || `session_${i}`;
        const warnings = validateCollaborationSessionModel(model);
        expect(Array.isArray(warnings)).toBe(true);
        expect(warnings.length).toBe(0);
      }
    });

    it('should validate comments at scale', () => {
      for (let i = 0; i < 1000; i++) {
        const model = createDefaultCommentModel({
          threadId: `thread_${i}`,
          projectId: `proj_${i}`,
          authorId: `user_${i}`,
          content: `Comment ${i}`,
        });
        model.commentId = model.commentId || `comment_${i}`;
        const warnings = validateCommentModel(model);
        expect(Array.isArray(warnings)).toBe(true);
        expect(warnings.length).toBe(0);
      }
    });

    it('should validate threads at scale', () => {
      for (let i = 0; i < 1000; i++) {
        const model = createDefaultCommentThreadModel({
          projectId: `proj_${i}`,
          title: `Thread ${i}`,
          createdBy: `user_${i}`,
        });
        model.threadId = model.threadId || `thread_${i}`;
        const warnings = validateCommentThreadModel(model);
        expect(Array.isArray(warnings)).toBe(true);
        expect(warnings.length).toBe(0);
      }
    });

    it('should validate forks at scale', () => {
      for (let i = 0; i < 1000; i++) {
        const model = createDefaultProjectForkModel({
          sourceProjectId: `proj_${i}`,
          forkedProjectId: `forked_${i}`,
          forkedBy: `user_${i}`,
        });
        model.forkId = model.forkId || `fork_${i}`;
        const warnings = validateProjectForkModel(model);
        expect(Array.isArray(warnings)).toBe(true);
        expect(warnings.length).toBe(0);
      }
    });

    it('should validate analytics at scale', () => {
      for (let i = 0; i < 1000; i++) {
        const model = createDefaultLearningAnalyticsModel({
          userId: `user_${i}`,
        });
        model.analyticsId = model.analyticsId || `analytics_${i}`;
        const warnings = validateLearningAnalyticsModel(model);
        expect(Array.isArray(warnings)).toBe(true);
        expect(warnings.length).toBe(0);
      }
    });

    it('should validate published templates at scale', () => {
      for (let i = 0; i < 1000; i++) {
        const model = createDefaultPublishedTemplateModel({
          templateId: `tmpl_${i}`,
          projectId: `proj_${i}`,
          publishedBy: `user_${i}`,
          title: `Template ${i}`,
        });
        model.publishId = model.publishId || `pub_${i}`;
        const warnings = validatePublishedTemplateModel(model);
        expect(Array.isArray(warnings)).toBe(true);
        expect(warnings.length).toBe(0);
      }
    });

    it('should accept all valid collaboration roles', () => {
      for (const role of VALID_COLLABORATION_ROLES) {
        for (let i = 0; i < 100; i++) {
          const model = createDefaultCollaborationSessionModel({
            projectId: `p_${i}`,
            userId: `u_${i}`,
            role: role as any,
          });
          model.sessionId = `s_${i}`;
          const warnings = validateCollaborationSessionModel(model);
          const roleWarns = warnings.filter((w: { code: string }) =>
            w.code.toLowerCase().includes('role')
          );
          expect(roleWarns.length).toBe(0);
        }
      }
    });

    it('should accept all valid fork types', () => {
      for (const forkType of VALID_FORK_TYPES) {
        for (let i = 0; i < 100; i++) {
          const model = createDefaultProjectForkModel({
            sourceProjectId: `s_${i}`,
            forkedProjectId: `f_${i}`,
            forkedBy: `u_${i}`,
            forkType: forkType as any,
          });
          model.forkId = `fork_${i}`;
          const warnings = validateProjectForkModel(model);
          const typeWarns = warnings.filter((w: { code: string }) =>
            w.code.toLowerCase().includes('type') || w.code.toLowerCase().includes('fork')
          );
          expect(typeWarns.length).toBe(0);
        }
      }
    });

    it('should accept all valid template publish statuses', () => {
      for (const status of VALID_TEMPLATE_PUBLISH_STATUSES) {
        for (let i = 0; i < 100; i++) {
          const model = createDefaultPublishedTemplateModel({
            templateId: `t_${i}`,
            projectId: `p_${i}`,
            publishedBy: `u_${i}`,
            title: `Title ${i}`,
            publishStatus: status as any,
          });
          model.publishId = `pub_${i}`;
          const warnings = validatePublishedTemplateModel(model);
          const statusWarns = warnings.filter((w: { code: string }) =>
            w.code.toLowerCase().includes('status')
          );
          expect(statusWarns.length).toBe(0);
        }
      }
    });
  });

  // ─── 4.3: Synchronizer CRUD ─────────────────────────────────

  describe('CollaborationSynchronizer CRUD', () => {
    it('should register and retrieve sessions at scale', () => {
      for (let i = 0; i < 1000; i++) {
        const model = createDefaultCollaborationSessionModel({
          projectId: `proj_0`,
          userId: `user_${i}`,
          displayName: `User ${i}`,
        });
        model.sessionId = `session_${i}`;
        sync.registerSession(model.sessionId, model);
        const retrieved = sync.getSession(`session_${i}`);
        expect(retrieved).toBeDefined();
        expect(retrieved!.userId).toBe(`user_${i}`);
      }
    });

    it('should register and retrieve comments at scale', () => {
      for (let i = 0; i < 1000; i++) {
        const model = createDefaultCommentModel({
          threadId: `thread_0`,
          projectId: `proj_0`,
          authorId: `user_${i}`,
          content: `Comment ${i}`,
        });
        model.commentId = `comment_${i}`;
        sync.registerComment(model.commentId, model);
        const retrieved = sync.getComment(`comment_${i}`);
        expect(retrieved).toBeDefined();
        expect(retrieved!.content).toBe(`Comment ${i}`);
      }
    });

    it('should register and retrieve threads at scale', () => {
      for (let i = 0; i < 500; i++) {
        const model = createDefaultCommentThreadModel({
          projectId: `proj_0`,
          title: `Thread ${i}`,
          createdBy: `user_${i}`,
        });
        model.threadId = `thread_${i}`;
        sync.registerThread(model.threadId, model);
        const retrieved = sync.getThread(`thread_${i}`);
        expect(retrieved).toBeDefined();
        expect(retrieved!.title).toBe(`Thread ${i}`);
      }
    });

    it('should register and retrieve forks at scale', () => {
      for (let i = 0; i < 1000; i++) {
        const model = createDefaultProjectForkModel({
          sourceProjectId: `proj_0`,
          forkedProjectId: `forked_${i}`,
          forkedBy: `user_${i}`,
        });
        model.forkId = `fork_${i}`;
        sync.registerFork(model.forkId, model);
        const retrieved = sync.getFork(`fork_${i}`);
        expect(retrieved).toBeDefined();
        expect(retrieved!.forkedBy).toBe(`user_${i}`);
      }
    });

    it('should register and retrieve analytics at scale', () => {
      for (let i = 0; i < 500; i++) {
        const model = createDefaultLearningAnalyticsModel({
          userId: `user_${i}`,
          classroomId: `classroom_0`,
        });
        model.analyticsId = `analytics_${i}`;
        sync.registerAnalytics(model.analyticsId, model);
        const retrieved = sync.getAnalyticsById(`analytics_${i}`);
        expect(retrieved).toBeDefined();
        expect(retrieved!.userId).toBe(`user_${i}`);
      }
    });

    it('should register and retrieve published templates at scale', () => {
      for (let i = 0; i < 500; i++) {
        const model = createDefaultPublishedTemplateModel({
          templateId: `tmpl_${i}`,
          projectId: `proj_${i}`,
          publishedBy: `user_${i}`,
          title: `Template ${i}`,
        });
        model.publishId = `pub_${i}`;
        sync.registerPublishedTemplate(model.publishId, model);
        const retrieved = sync.getPublishedTemplate(`pub_${i}`);
        expect(retrieved).toBeDefined();
        expect(retrieved!.title).toBe(`Template ${i}`);
      }
    });
  });

  // ─── 4.4: Domain Logic ─────────────────────────────────────

  describe('CollaborationSynchronizer Domain Logic', () => {
    // Sessions
    it('should join and leave sessions at scale', () => {
      for (let i = 0; i < 200; i++) {
        const session = sync.joinSession(`proj_0`, `user_${i}`, `User ${i}`);
        expect(session).toBeDefined();
        expect(session.role).toBe('VIEWING');
        expect(session.userId).toBe(`user_${i}`);
      }
      expect(sync.getActiveSessions('proj_0').length).toBe(200);

      for (let i = 0; i < 100; i++) {
        const sessions = sync.getActiveSessions('proj_0');
        const s = sessions.find((s: { userId: string }) => s.userId === `user_${i}`);
        if (s) {
          sync.leaveSession(s.sessionId);
        }
      }
      expect(sync.getActiveSessions('proj_0').length).toBe(100);
    });

    it('should update cursor positions at scale', () => {
      const session = sync.joinSession('proj_0', 'user_0', 'User 0');
      for (let i = 0; i < 500; i++) {
        sync.updateCursor(session.sessionId, i * 10, i * 5);
        const updated = sync.getSession(session.sessionId);
        expect(updated!.cursorX).toBe(i * 10);
        expect(updated!.cursorY).toBe(i * 5);
      }
    });

    it('should lock and unlock components at scale', () => {
      const session = sync.joinSession('proj_0', 'user_0', 'User 0');
      for (let i = 0; i < 100; i++) {
        sync.lockComponent(session.sessionId, `comp_${i}`);
      }
      let updated = sync.getSession(session.sessionId);
      expect(updated!.lockedComponentIds.length).toBe(100);

      for (let i = 0; i < 50; i++) {
        sync.unlockComponent(session.sessionId, `comp_${i}`);
      }
      updated = sync.getSession(session.sessionId);
      expect(updated!.lockedComponentIds.length).toBe(50);
    });

    it('should handle heartbeat', () => {
      const session = sync.joinSession('proj_0', 'user_0', 'User 0');
      const before = sync.getSession(session.sessionId)!.lastHeartbeat;
      // Small delay to ensure timestamp difference
      sync.heartbeat(session.sessionId);
      const after = sync.getSession(session.sessionId)!.lastHeartbeat;
      expect(after).toBeGreaterThanOrEqual(before);
    });

    // Comments
    it('should create threads and add comments at scale', () => {
      for (let i = 0; i < 100; i++) {
        const thread = sync.createThread(`proj_0`, `Thread ${i}`, `user_${i}`);
        expect(thread).toBeDefined();
        expect(thread.title).toBe(`Thread ${i}`);

        for (let j = 0; j < 10; j++) {
          const comment = sync.addComment(thread.threadId, `proj_0`, `user_${j}`, 'STUDENT', `Comment ${j}`);
          expect(comment).toBeDefined();
          expect(comment!.content).toBe(`Comment ${j}`);
        }
      }
      expect(sync.getProjectThreads('proj_0').length).toBe(100);
      expect(sync.getProjectComments('proj_0').length).toBe(1000);
    });

    it('should resolve threads', () => {
      const thread = sync.createThread('proj_0', 'Test Thread', 'user_0');
      sync.addComment(thread.threadId, 'proj_0', 'user_0', 'STUDENT', 'Comment');
      const resolved = sync.resolveThread(thread.threadId);
      expect(resolved).toBe(true);
      expect(sync.getThread(thread.threadId)!.status).toBe('RESOLVED');
    });

    it('should pin and unpin comments', () => {
      const thread = sync.createThread('proj_0', 'Thread', 'user_0');
      const comment = sync.addComment(thread.threadId, 'proj_0', 'user_0', 'STUDENT', 'Pinnable');
      sync.pinComment(comment!.commentId);
      expect(sync.getComment(comment!.commentId)!.isPinned).toBe(true);
      sync.unpinComment(comment!.commentId);
      expect(sync.getComment(comment!.commentId)!.isPinned).toBe(false);
    });

    it('should delete comments', () => {
      const thread = sync.createThread('proj_0', 'Thread', 'user_0');
      const comment = sync.addComment(thread.threadId, 'proj_0', 'user_0', 'STUDENT', 'To delete');
      sync.deleteComment(comment!.commentId);
      expect(sync.getComment(comment!.commentId)!.status).toBe('DELETED');
    });

    // Forks
    it('should record forks at scale', () => {
      for (let i = 0; i < 200; i++) {
        const fork = sync.recordFork(`proj_0`, `forked_${i}`, `user_${i}`);
        expect(fork).toBeDefined();
        expect(fork.sourceProjectId).toBe('proj_0');
        expect(fork.forkedProjectId).toBe(`forked_${i}`);
      }
      expect(sync.getForksOf('proj_0').length).toBe(200);
    });

    it('should get fork source', () => {
      sync.recordFork('source_1', 'forked_1', 'user_0');
      const source = sync.getForkSource('forked_1');
      expect(source).toBeDefined();
      expect(source!.sourceProjectId).toBe('source_1');
    });

    // Analytics
    it('should track analytics at scale', () => {
      for (let i = 0; i < 200; i++) {
        const analytics = sync.getOrCreateAnalytics(`user_${i}`, 'classroom_0');
        expect(analytics).toBeDefined();

        sync.recordSimulation(`user_${i}`, 'classroom_0');
        sync.recordErrorFix(`user_${i}`, 'classroom_0');
        sync.recordProjectBuilt(`user_${i}`, 'classroom_0');
        sync.updateHealthScore(`user_${i}`, 'classroom_0', 75 + (i % 25));
      }

      const classAnalytics = sync.getClassroomAnalytics('classroom_0');
      expect(classAnalytics.length).toBe(200);

      for (const a of classAnalytics) {
        expect(a.simulationsRun).toBeGreaterThanOrEqual(1);
        expect(a.errorsFixed).toBeGreaterThanOrEqual(1);
        expect(a.projectsBuilt).toBeGreaterThanOrEqual(1);
        expect(a.healthScoreHistory.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('should record assignment completion', () => {
      sync.getOrCreateAnalytics('user_0', 'classroom_0');
      sync.recordAssignmentCompleted('user_0', 'classroom_0', 85, 100);
      const analytics = sync.getAnalytics('user_0', 'classroom_0');
      expect(analytics!.assignmentsCompleted).toBe(1);
      expect(analytics!.averageScore).toBeGreaterThan(0);
    });

    // Template Publishing
    it('should publish and manage templates at scale', () => {
      for (let i = 0; i < 100; i++) {
        const pub = sync.publishTemplate(`tmpl_${i}`, `proj_${i}`, `user_${i}`, `Template ${i}`, `Desc ${i}`, 'INTERMEDIATE', 'STEM');
        expect(pub).toBeDefined();
        expect(pub.publishStatus).toBe('PUBLISHED');
        expect(pub.title).toBe(`Template ${i}`);
      }
      expect(sync.getPublishedTemplates().length).toBe(100);
    });

    it('should feature templates', () => {
      const pub = sync.publishTemplate('tmpl_0', 'proj_0', 'user_0', 'Featured', 'Desc');
      sync.featureTemplate(pub.publishId);
      const featured = sync.getFeaturedTemplates();
      expect(featured.length).toBe(1);
      expect(featured[0].publishStatus).toBe('FEATURED');
      expect(featured[0].featuredAt).toBeGreaterThan(0);
    });

    it('should track clone counts', () => {
      const pub = sync.publishTemplate('tmpl_0', 'proj_0', 'user_0', 'Cloneable', 'Desc');
      for (let i = 0; i < 50; i++) {
        sync.cloneTemplate(pub.publishId);
      }
      const retrieved = sync.getPublishedTemplate(pub.publishId);
      expect(retrieved!.cloneCount).toBe(50);
    });

    it('should unpublish templates', () => {
      const pub = sync.publishTemplate('tmpl_0', 'proj_0', 'user_0', 'Will Unpublish', 'Desc');
      sync.unpublishTemplate(pub.publishId);
      expect(sync.getPublishedTemplate(pub.publishId)!.publishStatus).toBe('UNPUBLISHED');
    });

    it('should filter templates by category', () => {
      sync.publishTemplate('t1', 'p1', 'u1', 'Math', 'D', 'BEGINNER', 'Math');
      sync.publishTemplate('t2', 'p2', 'u2', 'Science', 'D', 'BEGINNER', 'Science');
      sync.publishTemplate('t3', 'p3', 'u3', 'Math2', 'D', 'BEGINNER', 'Math');
      const mathTemplates = sync.getTemplatesByCategory('Math');
      expect(mathTemplates.length).toBe(2);
    });

    // Permission Matrix
    it('should return correct permissions for all roles', () => {
      for (const role of VALID_USER_ROLES) {
        const perms = sync.getPermissionsForRole(role as any);
        expect(perms).toBeDefined();
        expect(typeof perms.canView).toBe('boolean');
        expect(typeof perms.canEdit).toBe('boolean');
        expect(typeof perms.canShare).toBe('boolean');
        expect(typeof perms.canSubmit).toBe('boolean');
        expect(typeof perms.canGrade).toBe('boolean');
        expect(typeof perms.canAssign).toBe('boolean');
        expect(typeof perms.canManageMembers).toBe('boolean');
        expect(typeof perms.canArchive).toBe('boolean');
      }
    });

    it('should check specific permissions', () => {
      expect(sync.hasPermission('OWNER', 'canView')).toBe(true);
      expect(sync.hasPermission('OWNER', 'canEdit')).toBe(true);
      expect(sync.hasPermission('STUDENT', 'canView')).toBe(true);
      expect(sync.hasPermission('STUDENT', 'canEdit')).toBe(false);
      expect(sync.hasPermission('STUDENT', 'canSubmit')).toBe(true);
      expect(sync.hasPermission('VIEWER', 'canView')).toBe(true);
      expect(sync.hasPermission('VIEWER', 'canEdit')).toBe(false);
    });
  });

  // ─── 4.5: Snapshot & Lifecycle ──────────────────────────────

  describe('CollaborationSynchronizer Snapshot', () => {
    it('should produce correct snapshots', () => {
      for (let i = 0; i < 50; i++) {
        sync.joinSession('proj_0', `user_${i}`, `User ${i}`);
        const thread = sync.createThread('proj_0', `Thread ${i}`, `user_${i}`);
        sync.addComment(thread.threadId, 'proj_0', `user_${i}`, 'STUDENT', `Comment ${i}`);
        sync.recordFork('proj_0', `forked_${i}`, `user_${i}`);
      }
      const snapshot = sync.getSnapshot();
      expect(snapshot.sessions.length).toBe(50);
      expect(snapshot.comments.length).toBe(50);
      expect(snapshot.threads.length).toBe(50);
      expect(snapshot.forks.length).toBe(50);
      expect(Array.isArray(snapshot.analytics)).toBe(true);
      expect(Array.isArray(snapshot.publishedTemplates)).toBe(true);
    });

    it('should clear all data', () => {
      for (let i = 0; i < 30; i++) {
        sync.joinSession('proj_0', `user_${i}`, `User ${i}`);
      }
      sync.clearAll();
      expect(sync.getAllSessions().length).toBe(0);
      expect(sync.getAllComments().length).toBe(0);
      expect(sync.getAllThreads().length).toBe(0);
      expect(sync.getAllForks().length).toBe(0);
      expect(sync.getAllAnalytics().length).toBe(0);
      expect(sync.getAllPublishedTemplates().length).toBe(0);
    });
  });

  // ─── 4.6: Massive Scale Tests ──────────────────────────────

  describe('Collaboration Massive Scale', () => {
    it('should handle 5000 session model operations', () => {
      for (let i = 0; i < 5000; i++) {
        const model = createDefaultCollaborationSessionModel({
          projectId: `proj_${i % 100}`,
          userId: `user_${i}`,
          displayName: `User ${i}`,
          role: VALID_COLLABORATION_ROLES[i % VALID_COLLABORATION_ROLES.length] as any,
          cursorX: i * 2,
          cursorY: i * 3,
        });
        expect(model).toBeDefined();
        expect(model.sessionId).toBeDefined();
        expect(model.projectId).toBe(`proj_${i % 100}`);
        expect(model.userId).toBe(`user_${i}`);
        expect(model.displayName).toBe(`User ${i}`);
        expect(model.role).toBe(VALID_COLLABORATION_ROLES[i % VALID_COLLABORATION_ROLES.length]);
        expect(model.cursorX).toBe(i * 2);
        expect(model.cursorY).toBe(i * 3);
        expect(Array.isArray(model.selectedObjectIds)).toBe(true);
        expect(Array.isArray(model.lockedComponentIds)).toBe(true);
        expect(typeof model.joinedAt).toBe('number');
        expect(typeof model.lastHeartbeat).toBe('number');
        expect(model.futureSessionHints).toBeDefined();
      }
    });

    it('should handle 5000 comment model operations', () => {
      for (let i = 0; i < 5000; i++) {
        const model = createDefaultCommentModel({
          threadId: `thread_${i % 200}`,
          projectId: `proj_${i % 50}`,
          authorId: `user_${i}`,
          authorRole: (['STUDENT', 'TEACHER', 'OWNER'] as const)[i % 3],
          content: `Comment content ${i}`,
          isPinned: i % 10 === 0,
        });
        expect(model).toBeDefined();
        expect(model.commentId).toBeDefined();
        expect(model.threadId).toBe(`thread_${i % 200}`);
        expect(model.projectId).toBe(`proj_${i % 50}`);
        expect(model.authorId).toBe(`user_${i}`);
        expect(model.content).toBe(`Comment content ${i}`);
        expect(model.status).toBe('ACTIVE');
        expect(model.isPinned).toBe(i % 10 === 0);
        expect(typeof model.createdAt).toBe('number');
        expect(typeof model.updatedAt).toBe('number');
        expect(model.futureCommentHints).toBeDefined();
      }
    });

    it('should handle 5000 fork model operations', () => {
      for (let i = 0; i < 5000; i++) {
        const model = createDefaultProjectForkModel({
          sourceProjectId: `proj_${i % 100}`,
          forkedProjectId: `forked_${i}`,
          forkedBy: `user_${i}`,
          forkType: VALID_FORK_TYPES[i % VALID_FORK_TYPES.length] as any,
        });
        expect(model).toBeDefined();
        expect(model.forkId).toBeDefined();
        expect(model.sourceProjectId).toBe(`proj_${i % 100}`);
        expect(model.forkedProjectId).toBe(`forked_${i}`);
        expect(model.forkedBy).toBe(`user_${i}`);
        expect(model.forkType).toBe(VALID_FORK_TYPES[i % VALID_FORK_TYPES.length]);
        expect(typeof model.forkedAt).toBe('number');
        expect(model.futureForkHints).toBeDefined();
      }
    });

    it('should handle 5000 analytics model operations', () => {
      for (let i = 0; i < 5000; i++) {
        const model = createDefaultLearningAnalyticsModel({
          userId: `user_${i}`,
          classroomId: `classroom_${i % 50}`,
          projectsBuilt: i % 20,
          simulationsRun: i % 50,
          errorsFixed: i % 30,
          averageScore: i % 101,
          totalTimeMinutes: i % 600,
          assignmentsCompleted: i % 15,
        });
        expect(model).toBeDefined();
        expect(model.analyticsId).toBeDefined();
        expect(model.userId).toBe(`user_${i}`);
        expect(model.classroomId).toBe(`classroom_${i % 50}`);
        expect(model.projectsBuilt).toBe(i % 20);
        expect(model.simulationsRun).toBe(i % 50);
        expect(model.errorsFixed).toBe(i % 30);
        expect(model.averageScore).toBe(i % 101);
        expect(model.totalTimeMinutes).toBe(i % 600);
        expect(model.assignmentsCompleted).toBe(i % 15);
        expect(Array.isArray(model.healthScoreHistory)).toBe(true);
        expect(typeof model.lastUpdatedAt).toBe('number');
        expect(model.futureAnalyticsHints).toBeDefined();
      }
    });

    it('should handle 5000 published template model operations', () => {
      for (let i = 0; i < 5000; i++) {
        const model = createDefaultPublishedTemplateModel({
          templateId: `tmpl_${i}`,
          projectId: `proj_${i}`,
          publishedBy: `user_${i % 100}`,
          title: `Template ${i}`,
          description: `Description for template ${i}`,
          difficulty: (['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as const)[i % 4],
          category: `Category_${i % 10}`,
          publishStatus: VALID_TEMPLATE_PUBLISH_STATUSES[i % VALID_TEMPLATE_PUBLISH_STATUSES.length] as any,
          cloneCount: i % 200,
          rating: (i % 50) / 10,
        });
        expect(model).toBeDefined();
        expect(model.publishId).toBeDefined();
        expect(model.templateId).toBe(`tmpl_${i}`);
        expect(model.projectId).toBe(`proj_${i}`);
        expect(model.publishedBy).toBe(`user_${i % 100}`);
        expect(model.title).toBe(`Template ${i}`);
        expect(model.description).toBe(`Description for template ${i}`);
        expect(model.cloneCount).toBe(i % 200);
        expect(model.rating).toBe((i % 50) / 10);
        expect(model.category).toBe(`Category_${i % 10}`);
        expect(typeof model.publishedAt).toBe('number');
        expect(model.futurePublishHints).toBeDefined();
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION 5: CROSS-SYSTEM INTEGRATION TESTS
// ═══════════════════════════════════════════════════════════════

describe('Phase 30B: Cross-System Integration', () => {
  let classroomSync: ClassroomSynchronizer;
  let sharingSync: ProjectSharingSynchronizer;
  let assignmentSync: AssignmentSynchronizer;
  let collaborationSync: CollaborationSynchronizer;

  beforeEach(() => {
    classroomSync = new ClassroomSynchronizer();
    sharingSync = new ProjectSharingSynchronizer();
    assignmentSync = new AssignmentSynchronizer();
    collaborationSync = new CollaborationSynchronizer();
  });

  it('should support full classroom workflow at scale', () => {
    // Create classrooms
    for (let i = 0; i < 10; i++) {
      const classroom = classroomSync.createClassroom(`Class ${i}`, `teacher_${i}`);
      expect(classroom).toBeDefined();
      expect(classroom.status).toBe('ACTIVE');

      // Add students
      for (let j = 0; j < 20; j++) {
        const member = classroomSync.joinClassroom(classroom.classroomId, `student_${i}_${j}`, `Student ${j}`);
        expect(member).toBeDefined();
        expect(member!.role).toBe('STUDENT');
      }

      // Create assignments
      for (let k = 0; k < 5; k++) {
        const asgn = assignmentSync.createAssignment(classroom.classroomId, `Asgn ${k}`, `teacher_${i}`);
        expect(asgn).toBeDefined();
        assignmentSync.publishAssignment(asgn.assignmentId);

        // Students submit work
        for (let j = 0; j < 10; j++) {
          const sub = assignmentSync.submitWork(asgn.assignmentId, `student_${i}_${j}`, `proj_${i}_${j}_${k}`);
          expect(sub).toBeDefined();
        }
      }

      // Share classroom project
      const share = sharingSync.shareProject(`class_proj_${i}`, `teacher_${i}`, 'CLASSROOM_ONLY');
      expect(share).toBeDefined();
      expect(share.visibility).toBe('CLASSROOM_ONLY');

      // Track analytics
      for (let j = 0; j < 20; j++) {
        collaborationSync.getOrCreateAnalytics(`student_${i}_${j}`, classroom.classroomId);
        collaborationSync.recordSimulation(`student_${i}_${j}`, classroom.classroomId);
        collaborationSync.recordProjectBuilt(`student_${i}_${j}`, classroom.classroomId);
      }
    }

    // Verify totals
    expect(classroomSync.getAllClassrooms().length).toBe(10);
    expect(classroomSync.getAllMembers().length).toBe(210); // 10 owners + 200 students
    expect(assignmentSync.getAllAssignments().length).toBe(50);
    expect(assignmentSync.getAllSubmissions().length).toBe(500); // 10 classrooms * 5 assignments * 10 students
    expect(sharingSync.getAllShares().length).toBe(10);
    expect(collaborationSync.getAllAnalytics().length).toBe(200);
  });

  it('should produce correct snapshots from all synchronizers', () => {
    classroomSync.createClassroom('Test', 'owner');
    assignmentSync.createAssignment('c_0', 'Test', 'teacher');
    sharingSync.shareProject('proj_0', 'owner');
    collaborationSync.joinSession('proj_0', 'user_0', 'User');

    const classroomSnap = classroomSync.getSnapshot();
    const assignmentSnap = assignmentSync.getSnapshot();
    const sharingSnap = sharingSync.getSnapshot();
    const collabSnap = collaborationSync.getSnapshot();

    expect(classroomSnap.classrooms.length).toBeGreaterThan(0);
    expect(assignmentSnap.assignments.length).toBeGreaterThan(0);
    expect(sharingSnap.shares.length).toBeGreaterThan(0);
    expect(collabSnap.sessions.length).toBeGreaterThan(0);
  });

  it('should handle clear and rebuild cycle', () => {
    // Build
    classroomSync.createClassroom('Test', 'owner');
    assignmentSync.createAssignment('c_0', 'Test', 'teacher');
    sharingSync.shareProject('proj_0', 'owner');
    collaborationSync.joinSession('proj_0', 'user_0', 'User');

    // Clear
    classroomSync.clearAll();
    assignmentSync.clearAll();
    sharingSync.clearAll();
    collaborationSync.clearAll();

    expect(classroomSync.getAllClassrooms().length).toBe(0);
    expect(assignmentSync.getAllAssignments().length).toBe(0);
    expect(sharingSync.getAllShares().length).toBe(0);
    expect(collaborationSync.getAllSessions().length).toBe(0);

    // Rebuild
    classroomSync.createClassroom('Rebuilt', 'owner');
    expect(classroomSync.getAllClassrooms().length).toBe(1);
  });

  it('should handle grading workflow end-to-end', () => {
    const classroom = classroomSync.createClassroom('Math', 'teacher_0');
    classroomSync.joinClassroom(classroom.classroomId, 'student_0', 'Alice');
    classroomSync.joinClassroom(classroom.classroomId, 'student_1', 'Bob');

    const asgn = assignmentSync.createAssignment(classroom.classroomId, 'Homework 1', 'teacher_0');
    assignmentSync.publishAssignment(asgn.assignmentId);

    const sub1 = assignmentSync.submitWork(asgn.assignmentId, 'student_0', 'proj_a');
    const sub2 = assignmentSync.submitWork(asgn.assignmentId, 'student_1', 'proj_b');

    expect(sub1).toBeDefined();
    expect(sub2).toBeDefined();

    const grade1 = assignmentSync.gradeSubmission(sub1!.submissionId, 'teacher_0', 90);
    const grade2 = assignmentSync.gradeSubmission(sub2!.submissionId, 'teacher_0', 75);

    expect(grade1!.score).toBe(90);
    expect(grade2!.score).toBe(75);

    const stats = assignmentSync.getCompletionStats(asgn.assignmentId);
    expect(stats.submitted).toBe(2);
    expect(stats.graded).toBe(2);
    expect(stats.averageScore).toBeGreaterThan(0);

    // Track in analytics
    collaborationSync.getOrCreateAnalytics('student_0', classroom.classroomId);
    collaborationSync.recordAssignmentCompleted('student_0', classroom.classroomId, 90, 100);
    collaborationSync.getOrCreateAnalytics('student_1', classroom.classroomId);
    collaborationSync.recordAssignmentCompleted('student_1', classroom.classroomId, 75, 100);

    const analytics0 = collaborationSync.getAnalytics('student_0', classroom.classroomId);
    expect(analytics0!.assignmentsCompleted).toBe(1);
    expect(analytics0!.averageScore).toBeGreaterThan(0);
  });

  it('should handle sharing workflow end-to-end', () => {
    const share = sharingSync.shareProject('proj_0', 'owner_0', 'PUBLIC', 'EDITABLE');
    sharingSync.grantPermission(share.shareId, 'collab_0', 'STUDENT', 'owner_0');
    const link = sharingSync.createShareLink(share.shareId, 'owner_0', 10);

    expect(link).toBeDefined();
    for (let i = 0; i < 5; i++) {
      const used = sharingSync.useShareLink(link!.linkId);
      expect(used).toBe(true);
    }

    const ws = sharingSync.createSharedWorkspace(share.shareId, 'proj_0');
    sharingSync.addCollaborator(ws!.workspaceId, 'collab_0');
    sharingSync.lockWorkspace(ws!.workspaceId, 'collab_0');

    const locked = sharingSync.getSharedWorkspace(ws!.workspaceId);
    expect(locked!.isLocked).toBe(true);
    expect(locked!.lockedBy).toBe('collab_0');

    collaborationSync.recordFork('proj_0', 'fork_0', 'collab_0');
    expect(collaborationSync.getForksOf('proj_0').length).toBe(1);
  });

  it('should handle collaboration session with comments', () => {
    // Multiple users join
    for (let i = 0; i < 5; i++) {
      collaborationSync.joinSession('proj_0', `user_${i}`, `User ${i}`);
    }
    expect(collaborationSync.getActiveSessions('proj_0').length).toBe(5);

    // Create discussion
    const thread = collaborationSync.createThread('proj_0', 'Design Discussion', 'user_0');
    for (let i = 0; i < 5; i++) {
      collaborationSync.addComment(thread.threadId, 'proj_0', `user_${i}`, 'STUDENT', `I think we should ${i}`);
    }

    expect(collaborationSync.getThreadComments(thread.threadId).length).toBe(5);
    collaborationSync.resolveThread(thread.threadId);
    expect(collaborationSync.getThread(thread.threadId)!.status).toBe('RESOLVED');
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION 6: CONSTANTS VALIDATION
// ═══════════════════════════════════════════════════════════════

describe('Phase 30B: Constants Validation', () => {
  it('should have correct classroom constants', () => {
    expect(VALID_CLASSROOM_STATUSES).toContain('ACTIVE');
    expect(VALID_CLASSROOM_STATUSES).toContain('ARCHIVED');
    expect(VALID_CLASSROOM_STATUSES).toContain('DELETED');
    expect(VALID_CLASSROOM_STATUSES.length).toBe(3);

    expect(VALID_USER_ROLES).toContain('OWNER');
    expect(VALID_USER_ROLES).toContain('TEACHER');
    expect(VALID_USER_ROLES).toContain('ASSISTANT');
    expect(VALID_USER_ROLES).toContain('STUDENT');
    expect(VALID_USER_ROLES).toContain('VIEWER');
    expect(VALID_USER_ROLES.length).toBe(5);

    expect(MAX_CLASSROOM_MEMBERS).toBe(200);
    expect(JOIN_CODE_LENGTH).toBe(6);
  });

  it('should have correct sharing constants', () => {
    expect(VALID_SHARE_ACCESS_LEVELS).toContain('READ_ONLY');
    expect(VALID_SHARE_ACCESS_LEVELS).toContain('EDITABLE');
    expect(VALID_SHARE_ACCESS_LEVELS).toContain('TEMPLATE_SHARE');
    expect(VALID_SHARE_ACCESS_LEVELS.length).toBe(3);

    expect(DEFAULT_LINK_EXPIRY_MS).toBe(7 * 24 * 60 * 60 * 1000);
    expect(MAX_LINK_USES).toBe(100);
    expect(SHARE_TOKEN_LENGTH).toBe(16);
  });

  it('should have correct assignment constants', () => {
    expect(VALID_ASSIGNMENT_STATUSES).toContain('DRAFT');
    expect(VALID_ASSIGNMENT_STATUSES).toContain('PUBLISHED');
    expect(VALID_ASSIGNMENT_STATUSES).toContain('CLOSED');
    expect(VALID_ASSIGNMENT_STATUSES).toContain('ARCHIVED');
    expect(VALID_ASSIGNMENT_STATUSES.length).toBe(4);

    expect(VALID_SUBMISSION_STATUSES).toContain('NOT_STARTED');
    expect(VALID_SUBMISSION_STATUSES).toContain('IN_PROGRESS');
    expect(VALID_SUBMISSION_STATUSES).toContain('SUBMITTED');
    expect(VALID_SUBMISSION_STATUSES).toContain('GRADED');
    expect(VALID_SUBMISSION_STATUSES).toContain('RETURNED');
    expect(VALID_SUBMISSION_STATUSES.length).toBe(5);

    expect(MAX_SUBMISSIONS_PER_ASSIGNMENT).toBe(3);
    expect(DEFAULT_MAX_SCORE).toBe(100);
  });

  it('should have correct collaboration constants', () => {
    expect(VALID_COLLABORATION_ROLES).toContain('EDITING');
    expect(VALID_COLLABORATION_ROLES).toContain('VIEWING');
    expect(VALID_COLLABORATION_ROLES).toContain('IDLE');
    expect(VALID_COLLABORATION_ROLES.length).toBe(3);

    expect(VALID_COMMENT_STATUSES).toContain('ACTIVE');
    expect(VALID_COMMENT_STATUSES).toContain('RESOLVED');
    expect(VALID_COMMENT_STATUSES).toContain('DELETED');
    expect(VALID_COMMENT_STATUSES.length).toBe(3);

    expect(VALID_FORK_TYPES).toContain('PROJECT');
    expect(VALID_FORK_TYPES).toContain('TEMPLATE');
    expect(VALID_FORK_TYPES).toContain('CLASSROOM');
    expect(VALID_FORK_TYPES.length).toBe(3);

    expect(VALID_TEMPLATE_PUBLISH_STATUSES).toContain('DRAFT');
    expect(VALID_TEMPLATE_PUBLISH_STATUSES).toContain('PUBLISHED');
    expect(VALID_TEMPLATE_PUBLISH_STATUSES).toContain('FEATURED');
    expect(VALID_TEMPLATE_PUBLISH_STATUSES).toContain('UNPUBLISHED');
    expect(VALID_TEMPLATE_PUBLISH_STATUSES.length).toBe(4);

    expect(SESSION_TIMEOUT_MS).toBe(5 * 60 * 1000);
    expect(MAX_COMMENTS_PER_THREAD).toBe(500);

    expect(DEFAULT_PERMISSION_MATRIX).toBeDefined();
    expect(Array.isArray(DEFAULT_PERMISSION_MATRIX)).toBe(true);
    expect(DEFAULT_PERMISSION_MATRIX.length).toBe(5);
  });
});
