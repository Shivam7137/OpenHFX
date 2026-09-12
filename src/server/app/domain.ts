import type { Assignment, IssueDetail, IssueSummary, User, Visibility } from '@/contracts';
import { fail } from './security';
import { id, now, type State, type StoredIssue } from './store';

export function findIssue(state: State, issueId: string) { return state.issues.find(row => row.id === issueId) || fail(404, 'NOT_FOUND', 'Issue not found.'); }
export function ownAssignment(state: State, assignmentId: string, user: User) {
  const assignment = state.assignments.find(row => row.id === assignmentId) || fail(404, 'NOT_FOUND', 'Assignment not found.');
  if (assignment.organizationId !== user.organizationId) fail(403, 'FORBIDDEN', 'This assignment belongs to another organization.');
  return assignment;
}
export function participates(state: State, issueId: string, user: User) {
  return state.assignments.some(row => row.issueId === issueId && row.organizationId === user.organizationId && row.status !== 'withdrawn');
}
export function matches(state: State, issue: StoredIssue, user: User) {
  const org = state.organizations.find(row => row.id === user.organizationId);
  const { latitude, longitude } = issue.exactLocation;
  return !!org && org.categoryIds.includes(issue.category) && latitude >= org.serviceArea.south && latitude <= org.serviceArea.north && longitude >= org.serviceArea.west && longitude <= org.serviceArea.east;
}
export function requireParticipant(state: State, issue: StoredIssue, user: User) {
  if (!participates(state, issue.id, user)) fail(403, 'FORBIDDEN', 'Your organization must accept this issue first.');
}
export function requireAuthorityRead(state: State, issue: StoredIssue, user: User) {
  if (user.role === 'coordinator' && (matches(state, issue, user) || participates(state, issue.id, user))) return;
  if (user.role === 'worker' && state.tasks.some(row => row.issueId === issue.id && row.assigneeUserId === user.id)) return;
  fail(403, 'FORBIDDEN', 'This issue is outside your authorized work.');
}
export function requireLead(issue: StoredIssue, user: User) { if (user.role !== 'coordinator' || issue.leadOrganizationId !== user.organizationId) fail(403, 'FORBIDDEN', 'Only the lead coordinator may make this decision.'); }
export function bump(issue: StoredIssue) { issue.version++; issue.updatedAt = now(); }
export function addEvent(state: State, issue: StoredIssue, user: User, type: string, text: string, visibility: Visibility = 'public') {
  const organization = state.organizations.find(row => row.id === user.organizationId);
  const event = { id: id(), sequence: String(++state.sequence), issueId: issue.id, type, actorName: visibility === 'staff' ? user.displayName : organization?.name || 'Resident', organizationId: user.organizationId, visibility, text, createdAt: now() };
  state.events.push(event);
  // Staff recipients are determined from participation/task assignment, never public follows.
  const recipients = visibility === 'public'
    ? state.follows.filter(row => row.issueId === issue.id).map(row => row.userId)
    : state.users.filter(row => (row.role === 'coordinator' && participates(state, issue.id, row)) || (row.role === 'worker' && state.tasks.some(task => task.issueId === issue.id && task.assigneeUserId === row.id))).map(row => row.id);
  for (const recipientId of new Set(recipients.filter(recipient => recipient !== user.id))) {
    state.notifications.push({ id: id(), userId: recipientId, issueId: issue.id, eventId: event.id, title: issue.title, text, readAt: null, createdAt: event.createdAt });
  }
  return event;
}
export function publicSummary(state: State, issue: StoredIssue): IssueSummary {
  const { id: issueId, reference, title, summary, category, publicLocation, publicLocationLabel, locationPrecision, status, priority, priorityReviewed, leadOrganizationId, needsInformation, nextStep, version, createdAt, updatedAt, isDemo } = issue;
  return { id: issueId, reference, title, summary, category, publicLocation, publicLocationLabel, locationPrecision, status, priority: priorityReviewed ? priority : 'standard', priorityReviewed, leadOrganizationId, leadOrganizationName: state.organizations.find(row => row.id === leadOrganizationId)?.name || null, needsInformation, nextStep,
    evidenceCount: state.contributions.filter(row => row.issueId === issueId).length, followersCount: state.follows.filter(row => row.issueId === issueId).length, version, createdAt, updatedAt, isDemo };
}
export function detail(state: State, issue: StoredIssue, user: User | null, authority = false): IssueDetail {
  if (authority && user) requireAuthorityRead(state, issue, user);
  const staff = authority && !!user && (participates(state, issue.id, user) || user.role === 'worker');
  const assignments = state.assignments.filter(row => row.issueId === issue.id);
  const result: IssueDetail = { ...publicSummary(state, issue),
    response: assignments.filter(row => row.status !== 'withdrawn').map(row => ({ organizationId: row.organizationId, organizationName: row.organizationName, isLead: row.organizationId === issue.leadOrganizationId, assignmentStatus: row.status, nextStep: row.nextStep })),
    events: state.events.filter(row => row.issueId === issue.id && (staff || row.visibility === 'public')),
    contributions: state.contributions.filter(row => row.issueId === issue.id).map(({ authorId: _authorId, ...row }) => row),
    following: !!user && state.follows.some(row => row.issueId === issue.id && row.userId === user.id),
  };
  if (staff) {
    result.originalDescription = issue.originalDescription; result.exactLocation = issue.exactLocation;
    result.assignments = assignments;
    result.tasks = state.tasks.filter(row => row.issueId === issue.id && (user?.role === 'coordinator' || row.assigneeUserId === user?.id));
    result.reopenRequests = state.reopenRequests.filter(row => row.issueId === issue.id).map(({ id, reason, createdAt, accepted }) => ({ id, reason, createdAt, accepted }));
  }
  return result;
}
export function assignmentCompleteAllowed(state: State, assignment: Assignment) {
  if (state.tasks.some(row => row.assignmentId === assignment.id && row.status !== 'complete')) fail(409, 'VERSION_CONFLICT', 'Complete every task before completing this organization assignment.');
}
export function attachOwned(state: State, ids: string[], issueId: string, user: User) {
  return ids.map(attachmentId => {
    const photo = state.attachments.find(row => row.id === attachmentId) || fail(409, 'ATTACHMENT_NOT_READY', 'A photo is not ready. Remove it or upload it again.');
    if (photo.ownerId !== user.id || (photo.issueId && photo.issueId !== issueId)) fail(403, 'FORBIDDEN', 'You may only attach your own unused photos.');
    photo.issueId = issueId;
    return { id: photo.id, url: photo.url, description: photo.description, mimeType: photo.mimeType, bytes: photo.bytes };
  });
}
