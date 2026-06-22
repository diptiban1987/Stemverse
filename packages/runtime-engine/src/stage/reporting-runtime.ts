/**
 * Phase 38A — Reporting Runtime
 *
 * Student, teacher, school, competition, marketplace,
 * device, certification, platform reports.
 * CSV/JSON/PDF-ready export models.
 */

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => Date.now();

// ─── Types ───────────────────────────────────────────────────

export type ReportType = 'student' | 'teacher' | 'school' | 'competition' | 'marketplace' | 'device' | 'certification' | 'platform';
export type ReportFormat = 'json' | 'csv' | 'pdf_model';
export type ReportStatus = 'generating' | 'completed' | 'failed';

export interface ReportModel {
  reportId: string;
  type: ReportType;
  title: string;
  generatedAt: number;
  generatedBy: string;
  status: ReportStatus;
  periodStart: number;
  periodEnd: number;
  data: Record<string, unknown>;
  format: ReportFormat;
}

export interface StudentReportData {
  studentId: string; studentName: string;
  projectsCreated: number; projectsCompleted: number;
  lessonsCompleted: number; totalLessons: number;
  assignmentsSubmitted: number; assignmentsGraded: number;
  averageGrade: number; competitionsEntered: number;
  certificatesEarned: number; totalTimeMinutes: number;
  skillLevels: Record<string, number>;
}

export interface TeacherReportData {
  teacherId: string; teacherName: string;
  classrooms: number; totalStudents: number;
  assignmentsCreated: number; assignmentsGraded: number;
  averageClassGrade: number; completionRate: number;
  lessonsDelivered: number; competitionsHosted: number;
  feedbackGiven: number; activeHoursPerWeek: number;
}

export interface SchoolReportData {
  schoolId: string; schoolName: string;
  totalStudents: number; totalTeachers: number;
  totalClassrooms: number; avgCompletionRate: number;
  avgGrade: number; topPerformingClasses: string[];
  competitionWins: number; certificatesIssued: number;
  deviceUploads: number; aiUsageMinutes: number;
}

export interface CompetitionReportData {
  competitionId: string; competitionName: string;
  totalParticipants: number; totalSubmissions: number;
  avgScore: number; highestScore: number;
  completionRate: number; topEntries: string[];
  regionBreakdown: Record<string, number>;
  judgeCount: number;
}

export interface MarketplaceReportData {
  totalAssets: number; totalDownloads: number;
  totalCreators: number; avgRating: number;
  topAssets: string[]; topCreators: string[];
  revenueEstimate: number; conversionRate: number;
  categoryBreakdown: Record<string, number>;
}

export interface DeviceReportData {
  totalUploads: number; successRate: number;
  failureRate: number; topBoards: string[];
  avgDebugTime: number; sensorUsage: Record<string, number>;
  componentUsage: Record<string, number>;
}

export interface CertificationReportData {
  totalCertificates: number; totalCertified: number;
  passRate: number; avgScore: number;
  topCertifications: string[]; issuedThisPeriod: number;
}

export interface PlatformReportData {
  dau: number; wau: number; mau: number;
  totalProjects: number; totalUsers: number;
  totalClassrooms: number; totalCompetitions: number;
  uptimePercent: number; avgResponseTimeMs: number;
  storageUsedGB: number; apiRequestsPerDay: number;
}

// ─── Report Generation ───────────────────────────────────────

function buildReport(type: ReportType, title: string, data: Record<string, unknown>, generatedBy: string, periodStart: number, periodEnd: number, format: ReportFormat = 'json'): ReportModel {
  return { reportId: uid(), type, title, generatedAt: now(), generatedBy, status: 'completed', periodStart, periodEnd, data, format };
}

export function generateStudentReport(data: StudentReportData, generatedBy: string, periodStart: number, periodEnd: number): ReportModel {
  return buildReport('student', `Student Report: ${data.studentName}`, data as unknown as Record<string, unknown>, generatedBy, periodStart, periodEnd);
}

export function generateTeacherReport(data: TeacherReportData, generatedBy: string, periodStart: number, periodEnd: number): ReportModel {
  return buildReport('teacher', `Teacher Report: ${data.teacherName}`, data as unknown as Record<string, unknown>, generatedBy, periodStart, periodEnd);
}

export function generateSchoolReport(data: SchoolReportData, generatedBy: string, periodStart: number, periodEnd: number): ReportModel {
  return buildReport('school', `School Report: ${data.schoolName}`, data as unknown as Record<string, unknown>, generatedBy, periodStart, periodEnd);
}

export function generateCompetitionReport(data: CompetitionReportData, generatedBy: string, periodStart: number, periodEnd: number): ReportModel {
  return buildReport('competition', `Competition Report: ${data.competitionName}`, data as unknown as Record<string, unknown>, generatedBy, periodStart, periodEnd);
}

export function generateMarketplaceReport(data: MarketplaceReportData, generatedBy: string, periodStart: number, periodEnd: number): ReportModel {
  return buildReport('marketplace', 'Marketplace Report', data as unknown as Record<string, unknown>, generatedBy, periodStart, periodEnd);
}

export function generateDeviceUsageReport(data: DeviceReportData, generatedBy: string, periodStart: number, periodEnd: number): ReportModel {
  return buildReport('device', 'Device Usage Report', data as unknown as Record<string, unknown>, generatedBy, periodStart, periodEnd);
}

export function generateCertificationReport(data: CertificationReportData, generatedBy: string, periodStart: number, periodEnd: number): ReportModel {
  return buildReport('certification', 'Certification Report', data as unknown as Record<string, unknown>, generatedBy, periodStart, periodEnd);
}

export function generatePlatformReport(data: PlatformReportData, generatedBy: string, periodStart: number, periodEnd: number): ReportModel {
  return buildReport('platform', 'Platform Report', data as unknown as Record<string, unknown>, generatedBy, periodStart, periodEnd);
}

// ─── Export Formatters ───────────────────────────────────────

export function reportToCSV(report: ReportModel): string {
  const entries = Object.entries(report.data);
  const header = entries.map(([k]) => k).join(',');
  const values = entries.map(([, v]) => typeof v === 'object' ? JSON.stringify(v) : String(v)).join(',');
  return `${header}\n${values}`;
}

export function reportToJSON(report: ReportModel): string {
  return JSON.stringify({ reportId: report.reportId, type: report.type, title: report.title, generatedAt: report.generatedAt, data: report.data }, null, 2);
}

export function reportToPdfModel(report: ReportModel): { title: string; sections: Array<{ heading: string; content: string }> } {
  const sections = Object.entries(report.data).map(([key, val]) => ({
    heading: key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
    content: typeof val === 'object' ? JSON.stringify(val) : String(val),
  }));
  return { title: report.title, sections };
}

// ─── Synchronizer ────────────────────────────────────────────

export class ReportingSynchronizer {
  private reports = new Map<string, ReportModel>();
  private reportOrder: string[] = [];

  addReport(r: ReportModel) { this.reports.set(r.reportId, { ...r }); if (!this.reportOrder.includes(r.reportId)) this.reportOrder.push(r.reportId); }
  getReport(id: string) { const r = this.reports.get(id); return r ? { ...r } : undefined; }
  getRecentReports(n = 20) { return this.reportOrder.slice(-n).map(id => ({ ...this.reports.get(id)! })); }
  getReportsByType(type: ReportType) { return Array.from(this.reports.values()).filter(r => r.type === type).map(r => ({ ...r })); }

  clear() { this.reports.clear(); this.reportOrder = []; }

  toJSON() { return { reports: this.getRecentReports(500) }; }
  fromJSON(d: { reports?: ReportModel[] }) { this.clear(); (d.reports || []).forEach(r => this.addReport(r)); }
  clone(): ReportingSynchronizer { const c = new ReportingSynchronizer(); c.fromJSON(this.toJSON()); return c; }
}
