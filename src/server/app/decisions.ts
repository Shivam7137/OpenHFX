import { z } from 'zod';
import type { User } from '@/contracts';
import { checkVersion, coordinator, fail, jsonBody, mutate, shortText, version } from './security';
import { addEvent, bump, detail, findIssue, matches, participates, requireLead, requireParticipant } from './domain';
import type { Store } from './store';

export async function decide(request: Request, store: Store, actor: User | null, issueId: string) {
  const user = coordinator(actor);
  const input = await jsonBody(request, z.object({ action: z.enum(['acknowledge', 'set_priority', 'release_requirement', 'nominate_lead', 'accept_lead', 'resolve', 'accept_reopen']), reason: shortText, expectedVersion: version, assignmentId: z.string().optional(), requestId: z.string().optional(), targetOrganizationId: z.string().optional(), priority: z.enum(['standard', 'priority', 'urgent']).optional() }).strict());
  return mutate(store, request, user, input, state => {
    const issue = findIssue(state, issueId); checkVersion(issue, input.expectedVersion);
    let type = 'update.published'; let visibility: 'public' | 'staff' = 'public'; let text = input.reason;
    switch (input.action) {
      case 'acknowledge':
        if (!matches(state, issue, user) && !participates(state, issueId, user)) fail(403, 'FORBIDDEN', 'This issue is outside your organization scope.');
        if (issue.status !== 'reported') fail(409, 'VERSION_CONFLICT', 'This issue has already been reviewed.');
        issue.status = 'acknowledged'; type = 'issue.acknowledged'; text = `Report reviewed. ${input.reason}`; break;
      case 'set_priority':
        requireParticipant(state, issue, user);
        if (!input.priority) fail(400, 'VALIDATION_ERROR', 'Choose an inspection priority.');
        issue.priority = input.priority; issue.priorityReviewed = true; text = `Inspection priority reviewed: ${input.priority}. ${input.reason}`; break;
      case 'release_requirement': {
        requireLead(issue, user);
        const assignment = state.assignments.find(row => row.id === input.assignmentId && row.issueId === issueId) || fail(400, 'VALIDATION_ERROR', 'Choose an assignment on this issue.');
        assignment.required = false; assignment.version++; type = 'requirement.released'; text = `${assignment.organizationName} work is no longer required for resolution. ${input.reason}`; break;
      }
      case 'nominate_lead': {
        requireLead(issue, user);
        if (input.targetOrganizationId === issue.leadOrganizationId || !state.assignments.some(row => row.issueId === issueId && row.organizationId === input.targetOrganizationId && row.status !== 'withdrawn')) fail(400, 'VALIDATION_ERROR', 'Nominate another participating organization.');
        issue.nominatedLeadId = input.targetOrganizationId!; visibility = 'staff'; text = `Lead transfer nominated to ${state.organizations.find(row => row.id === input.targetOrganizationId)?.name}. ${input.reason}`; break;
      }
      case 'accept_lead':
        requireParticipant(state, issue, user);
        if (issue.nominatedLeadId !== user.organizationId) fail(403, 'FORBIDDEN', 'Your organization has not been nominated as lead.');
        issue.leadOrganizationId = user.organizationId; issue.leadOrganizationName = state.organizations.find(row => row.id === user.organizationId)!.name; issue.nominatedLeadId = null;
        type = 'lead.transferred'; text = `${issue.leadOrganizationName} accepted lead responsibility. ${input.reason}`; break;
      case 'resolve':
        requireLead(issue, user);
        if (issue.status !== 'in_progress') fail(409, 'VERSION_CONFLICT', 'Start and complete the response before resolving this issue.');
        if (state.assignments.some(row => row.issueId === issueId && row.required && row.status !== 'complete')) fail(409, 'VERSION_CONFLICT', 'Every required organization must complete its assignment or have the requirement explicitly released.');
        issue.status = 'resolved'; issue.nextStep = input.reason; type = 'issue.resolved'; text = `Issue resolved. ${input.reason}`; break;
      case 'accept_reopen': {
        requireLead(issue, user);
        if (issue.status !== 'resolved') fail(409, 'VERSION_CONFLICT', 'This issue is already open.');
        const reopening = state.reopenRequests.find(row => row.id === input.requestId && row.issueId === issueId && !row.accepted) || fail(400, 'VALIDATION_ERROR', 'Choose a pending reopening request.');
        reopening.accepted = true; issue.status = 'in_progress'; issue.nextStep = input.reason;
        const assignment = state.assignments.find(row => row.issueId === issueId && row.organizationId === user.organizationId && row.status !== 'withdrawn')!;
        assignment.status = 'in_progress'; assignment.required = true; assignment.nextStep = input.reason; assignment.version++;
        type = 'issue.reopened'; text = `Issue reopened for further work. ${input.reason}`; break;
      }
    }
    bump(issue); addEvent(state, issue, user, type, text, visibility); return detail(state, issue, user, true);
  });
}
