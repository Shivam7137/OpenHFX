import { z } from 'zod';
import type { User, WorkStatus } from '@/contracts';
import { authenticated, checkVersion, coordinator, fail, jsonBody, mutate, shortText, version } from './security';
import { addEvent, assignmentCompleteAllowed, bump, detail, findIssue, matches, ownAssignment, requireParticipant } from './domain';
import { id, now, type Store } from './store';

export async function acceptAssignment(request: Request, store: Store, actor: User | null, issueId: string) {
  const user = coordinator(actor);
  const input = await jsonBody(request, z.object({ purpose: shortText, required: z.boolean(), expectedVersion: version }).strict());
  return mutate(store, request, user, input, state => {
    const issue = findIssue(state, issueId); checkVersion(issue, input.expectedVersion);
    if (!matches(state, issue, user)) fail(403, 'FORBIDDEN', 'This issue does not match your organization category and service area.');
    if (issue.status === 'resolved') fail(409, 'VERSION_CONFLICT', 'The lead must reopen this issue before assigning new work.');
    if (state.assignments.some(row => row.issueId === issueId && row.organizationId === user.organizationId && row.status !== 'withdrawn')) fail(409, 'VERSION_CONFLICT', 'Your organization already has an active assignment.');
    const organization = state.organizations.find(row => row.id === user.organizationId)!;
    const first = !issue.leadOrganizationId;
    // New contributors carry required work; only the existing lead may designate optional work.
    const required = first || issue.leadOrganizationId !== user.organizationId ? true : input.required;
    state.assignments.push({ id: id(), issueId, organizationId: organization.id, organizationName: organization.name, ownerUserId: user.id, purpose: input.purpose, required, status: 'accepted', nextStep: 'Assign a field team', needsInformation: false, version: 1 });
    if (first) { issue.leadOrganizationId = organization.id; issue.leadOrganizationName = organization.name; issue.nextStep = 'Assign a field team'; }
    if (issue.status === 'reported') addEvent(state, issue, user, 'issue.acknowledged', `${organization.name} reviewed this demo report.`);
    if (['reported', 'acknowledged'].includes(issue.status)) issue.status = 'assigned';
    bump(issue); addEvent(state, issue, user, 'assignment.accepted', `${organization.name} accepted ${first ? 'lead responsibility' : 'a contributing assignment'}.`);
    return detail(state, issue, user, true);
  }, true);
}
export async function createTask(request: Request, store: Store, actor: User | null, assignmentId: string) {
  const user = coordinator(actor); const input = await jsonBody(request, z.object({ teamId: z.string(), purpose: shortText, expectedVersion: version }).strict());
  return mutate(store, request, user, input, state => {
    const assignment = ownAssignment(state, assignmentId, user); checkVersion(assignment, input.expectedVersion);
    if (['complete', 'withdrawn'].includes(assignment.status)) fail(409, 'VERSION_CONFLICT', 'Reactivate this assignment before adding work.');
    const team = state.teams.find(row => row.id === input.teamId && row.organizationId === user.organizationId) || fail(403, 'FORBIDDEN', 'Choose a team from your organization.');
    const worker = state.users.find(row => team.memberUserIds.includes(row.id) && row.role === 'worker' && row.organizationId === user.organizationId) || fail(400, 'VALIDATION_ERROR', 'This team has no available worker.');
    const issue = findIssue(state, assignment.issueId);
    if (issue.status === 'resolved') fail(409, 'VERSION_CONFLICT', 'Reopen this issue before adding work.');
    state.tasks.push({ id: id(), assignmentId, issueId: issue.id, teamId: team.id, teamName: team.name, assigneeUserId: worker.id, assigneeName: worker.displayName, purpose: input.purpose, status: 'assigned', previousActiveStatus: null, lastReportedAt: now(), resultNote: '', version: 1 });
    assignment.version++; bump(issue); addEvent(state, issue, user, 'task.progressed', `Assigned ${team.name}: ${input.purpose}`, 'staff');
    return detail(state, issue, user, true);
  });
}
const taskStatuses = ['assigned', 'en_route', 'on_site', 'working', 'blocked', 'complete'] as const;
export async function taskProgress(request: Request, store: Store, actor: User | null, taskId: string) {
  const user = authenticated(actor); const input = await jsonBody(request, z.object({ status: z.enum(taskStatuses), note: z.string().trim().max(2000), expectedVersion: version }).strict());
  return mutate(store, request, user, input, state => {
    const task = state.tasks.find(row => row.id === taskId) || fail(404, 'NOT_FOUND', 'Task not found.');
    const assignment = ownAssignment(state, task.assignmentId, user);
    if (user.role !== 'coordinator' && (user.role !== 'worker' || task.assigneeUserId !== user.id)) fail(403, 'FORBIDDEN', 'You may only update your assigned tasks.');
    checkVersion(task, input.expectedVersion);
    const issue = findIssue(state, assignment.issueId);
    if (issue.status === 'resolved' || ['complete', 'withdrawn'].includes(assignment.status) || task.status === 'complete') fail(409, 'VERSION_CONFLICT', 'Completed work cannot be changed. Ask your coordinator for a new task.');
    if (['blocked', 'complete'].includes(input.status) && !input.note) fail(400, 'VALIDATION_ERROR', 'Add a blocker or completion note.');
    if (input.status === 'assigned' && task.status !== 'assigned') fail(400, 'VALIDATION_ERROR', 'Active work cannot return to the assigned milestone.');
    if (input.status === 'blocked' && task.status !== 'blocked') task.previousActiveStatus = task.status;
    else if (input.status !== 'blocked') task.previousActiveStatus = null;
    task.status = input.status as WorkStatus; task.resultNote = input.note; task.lastReportedAt = now(); task.version++;
    bump(issue);
    if (input.status !== 'assigned' && assignment.status === 'accepted') {
      assignment.status = 'in_progress'; assignment.version++;
      if (issue.status !== 'in_progress') { issue.status = 'in_progress'; addEvent(state, issue, user, 'issue.progressed', `${assignment.organizationName} started its response.`); }
    }
    addEvent(state, issue, user, 'task.progressed', `${task.teamName}: ${input.status.replaceAll('_', ' ')}.${input.note ? ` ${input.note}` : ''}`, 'staff');
    return detail(state, issue, user, true);
  });
}
export async function assignmentProgress(request: Request, store: Store, actor: User | null, assignmentId: string) {
  const user = coordinator(actor); const input = await jsonBody(request, z.object({ status: z.enum(['accepted', 'in_progress', 'complete', 'withdrawn']), nextStep: shortText, expectedVersion: version }).strict());
  return mutate(store, request, user, input, state => {
    const assignment = ownAssignment(state, assignmentId, user); checkVersion(assignment, input.expectedVersion);
    const issue = findIssue(state, assignment.issueId);
    if (issue.status === 'resolved') fail(409, 'VERSION_CONFLICT', 'Reopen this issue before changing work.');
    if (assignment.status === 'withdrawn') fail(409, 'VERSION_CONFLICT', 'Accept a new assignment before restarting withdrawn work.');
    if (input.status === 'complete') assignmentCompleteAllowed(state, assignment);
    if (input.status === 'withdrawn' && (assignment.required || issue.leadOrganizationId === user.organizationId)) fail(409, 'VERSION_CONFLICT', 'The lead must release required work and complete any lead transfer before withdrawal.');
    if (input.status === 'accepted' && assignment.status !== 'accepted') fail(400, 'VALIDATION_ERROR', 'An active assignment cannot return to accepted.');
    assignment.status = input.status; assignment.nextStep = input.nextStep; assignment.version++; bump(issue);
    if (issue.leadOrganizationId === user.organizationId) issue.nextStep = input.nextStep;
    if (input.status === 'in_progress' && issue.status !== 'in_progress') { issue.status = 'in_progress'; addEvent(state, issue, user, 'issue.progressed', `${assignment.organizationName} started its response.`); }
    addEvent(state, issue, user, 'assignment.progressed', `${assignment.organizationName}: ${input.status.replaceAll('_', ' ')}. ${input.nextStep}`);
    return detail(state, issue, user, true);
  });
}
export async function publishUpdate(request: Request, store: Store, actor: User | null, issueId: string) {
  const user = authenticated(actor); const input = await jsonBody(request, z.object({ visibility: z.enum(['public', 'staff']), text: shortText, expectedVersion: version }).strict());
  return mutate(store, request, user, input, state => {
    const issue = findIssue(state, issueId); requireParticipant(state, issue, user); checkVersion(issue, input.expectedVersion);
    if (user.role !== 'coordinator' && !(user.role === 'worker' && input.visibility === 'staff' && state.tasks.some(row => row.issueId === issueId && row.assigneeUserId === user.id))) fail(403, 'FORBIDDEN', 'Only participating coordinators publish public progress.');
    bump(issue); if (input.visibility === 'public') issue.nextStep = input.text;
    addEvent(state, issue, user, 'update.published', input.text, input.visibility);
    return detail(state, issue, user, true);
  });
}
