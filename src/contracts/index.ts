export const CATEGORIES = ['access', 'trees', 'roads', 'lighting', 'waste', 'other'] as const;
export type Category = typeof CATEGORIES[number];
export const CATEGORY_LABELS: Record<Category, string> = { access: 'Access', trees: 'Trees', roads: 'Roads', lighting: 'Lighting', waste: 'Waste', other: 'Other' };
export type IssueStatus = 'reported' | 'acknowledged' | 'assigned' | 'in_progress' | 'resolved';
export type AssignmentStatus = 'accepted' | 'in_progress' | 'complete' | 'withdrawn';
export type WorkStatus = 'assigned' | 'en_route' | 'on_site' | 'working' | 'blocked' | 'complete';
export type Priority = 'standard' | 'priority' | 'urgent';
export type Visibility = 'public' | 'staff';
export type Location = { latitude: number; longitude: number };
export type Role = 'resident' | 'coordinator' | 'worker';

export interface User {
  id: string;
  displayName: string;
  role: Role;
  organizationId: string | null;
  teamId: string | null;
}
export interface Organization {
  id: string;
  name: string;
  categoryIds: Category[];
  serviceArea: { south: number; north: number; west: number; east: number };
  isDemo: boolean;
}
export interface Team { id: string; organizationId: string; name: string; memberUserIds: string[] }
export interface Attachment { id: string; url: string; description: string; mimeType: string; bytes: number }
export interface Contribution { id: string; issueId: string; authorName: string; body: string; attachments: Attachment[]; createdAt: string }
export interface TimelineEvent { id: string; sequence: string; issueId: string; type: string; actorName: string; organizationId: string | null; visibility: Visibility; text: string; createdAt: string }
export interface PublicResponse { organizationId: string; organizationName: string; isLead: boolean; assignmentStatus: AssignmentStatus; nextStep: string }
export interface IssueSummary {
  id: string; reference: string; title: string; summary: string; category: Category;
  publicLocation: Location; publicLocationLabel: string; locationPrecision: 'exact' | 'approximate';
  status: IssueStatus; priority: Priority; priorityReviewed: boolean;
  leadOrganizationId: string | null; leadOrganizationName: string | null;
  needsInformation: boolean; nextStep: string; evidenceCount: number; followersCount: number;
  version: number; createdAt: string; updatedAt: string; isDemo: boolean;
}
export interface Assignment {
  id: string; issueId: string; organizationId: string; organizationName: string;
  ownerUserId: string; purpose: string; required: boolean; status: AssignmentStatus;
  nextStep: string; needsInformation: boolean; version: number;
}
export interface WorkTask {
  id: string; assignmentId: string; issueId: string; teamId: string; teamName: string;
  assigneeUserId: string; assigneeName: string; purpose: string; status: WorkStatus;
  previousActiveStatus: WorkStatus | null; lastReportedAt: string; resultNote: string; version: number;
}
export interface ReopenRequest { id: string; reason: string; createdAt: string; accepted: boolean }
export interface IssueDetail extends IssueSummary {
  response: PublicResponse[]; events: TimelineEvent[]; contributions: Contribution[]; following: boolean;
  originalDescription?: string; exactLocation?: Location; assignments?: Assignment[]; tasks?: WorkTask[];
  reopenRequests?: ReopenRequest[];
}
export interface Notification { id: string; issueId: string; eventId: string; title: string; text: string; readAt: string | null; createdAt: string }
export interface ReportSuggestion {
  title: string; summary: string; category: Category;
  suggestedOrganizationIds: string[]; possibleRelatedIssueIds: string[];
  clarificationQuestions: string[]; suggestedNextSteps: string[];
  prioritySuggestion: Priority; priorityReason: string;
}
export interface PreparationInput { draftId: string; originalDescription: string; publicLocation: Location; category?: Category; attachmentIds?: string[] }
export interface CandidateIssue { id: string; title: string; summary: string; category: Category; publicLocation: Location; status: IssueStatus; updatedAt: string }
export interface EngineContext { organizations: Organization[]; candidateIssues: CandidateIssue[] }
export interface Preparation {
  id: string; draftId: string; status: 'queued' | 'running' | 'succeeded' | 'failed';
  suggestion: ReportSuggestion | null; error: { code: string; message: string } | null;
  mode: 'demo' | 'provider' | 'unconfigured'; provider: string | null; model: string | null;
  promptVersion: string; attempts: number; latencyMs: number | null;
  createdAt: string; updatedAt: string;
}
export interface PublishedEvent { id: string; issueId: string; visibility: Visibility; text: string; createdAt: string; organizationName: string }
export interface ProgressSummary { text: string; sourceEventIds: string[]; mode: 'extractive' | 'provider' | 'demo' }
export interface CreateIssueInput {
  draftId: string; originalDescription: string; title: string; summary: string; category: Category;
  exactLocation: Location; publicLocationLabel: string; sensitiveLocation: boolean;
  attachmentIds: string[]; preparationId?: string; relatedIssueId?: string;
}
export interface ApiEnvelope<T> { data: T }
export interface ListEnvelope<T> { items: T[]; nextCursor: string | null; syncedAt: string }
export interface ApiFailure { error: { code: string; message: string; fieldErrors?: Record<string, string[]> }; requestId: string }
export interface SessionInfo { user: User | null; demoMode: boolean; engineMode: 'demo' | 'provider' | 'unconfigured'; accounts: User[] }

export const STATUS_LABELS: Record<IssueStatus | WorkStatus | AssignmentStatus, string> = {
  reported: 'Reported', acknowledged: 'Acknowledged', assigned: 'Assigned', in_progress: 'In progress',
  resolved: 'Resolved', accepted: 'Accepted', complete: 'Complete', withdrawn: 'Withdrawn',
  en_route: 'En route', on_site: 'On site', working: 'Working', blocked: 'Blocked',
};
