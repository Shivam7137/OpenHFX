import type { State, StoredIssue } from './store';
import type { Category, User } from '@/contracts';

export const DEMO_IDS = {
  parks: '10000000-0000-4000-8000-000000000001', streets: '10000000-0000-4000-8000-000000000002', access: '10000000-0000-4000-8000-000000000003',
  issue: '30000000-0000-4000-8000-000000000142',
};
export function seedState(): State {
  const createdAt = new Date().toISOString();
  const organizations = [
    { id: DEMO_IDS.parks, name: 'Harbour Parks', categoryIds: ['trees', 'waste', 'other'] as Category[] },
    { id: DEMO_IDS.streets, name: 'Street Response', categoryIds: ['trees', 'roads', 'lighting', 'access', 'other'] as Category[] },
    { id: DEMO_IDS.access, name: 'Access Services', categoryIds: ['access', 'trees', 'other'] as Category[] },
  ].map(org => ({ ...org, serviceArea: { south: 44.5, north: 44.85, west: -63.85, east: -63.4 }, isDemo: true }));
  const teams = organizations.map((org, i) => ({ id: `20000000-0000-4000-8000-00000000000${i + 1}`, organizationId: org.id, name: ['Canopy 2', 'Access 1', 'Access review'][i], memberUserIds: [`40000000-0000-4000-8000-00000000000${i + 6}`] }));
  const users: User[] = [
    { id: '40000000-0000-4000-8000-000000000001', displayName: 'Alex · demo resident', role: 'resident', organizationId: null, teamId: null },
    { id: '40000000-0000-4000-8000-000000000002', displayName: 'Sam · demo resident', role: 'resident', organizationId: null, teamId: null },
    ...organizations.map((org, i): User => ({ id: `40000000-0000-4000-8000-00000000000${i + 3}`, displayName: `${org.name} coordinator`, role: 'coordinator', organizationId: org.id, teamId: null })),
    ...organizations.map((org, i): User => ({ id: `40000000-0000-4000-8000-00000000000${i + 6}`, displayName: `${teams[i].name} worker`, role: 'worker', organizationId: org.id, teamId: teams[i].id })),
  ];
  const issue = (issueId: string, reference: string, title: string, summary: string, category: Category, latitude: number, longitude: number): StoredIssue => ({
    id: issueId, reference, title, summary, category, publicLocation: { latitude, longitude }, exactLocation: { latitude, longitude }, publicLocationLabel: 'Harbour path · fictional demo', locationPrecision: 'exact',
    status: 'reported', priority: 'standard', priorityReviewed: false, leadOrganizationId: null, leadOrganizationName: null, needsInformation: false, nextStep: 'Awaiting authority review', evidenceCount: 0, followersCount: 1, version: 1, createdAt, updatedAt: createdAt, isDemo: true,
    reporterId: users[0].id, originalDescription: summary, nominatedLeadId: null, relatedIssueId: null,
  });
  const issues = [
    issue(DEMO_IDS.issue, 'HFX-0142', 'Branch blocking the walkway', 'A fallen branch blocks the harbour walkway. The remaining route is too narrow for a wheelchair. This is a fictional demonstration.', 'trees', 44.6486, -63.5729),
    issue('30000000-0000-4000-8000-000000000143', 'HFX-0143', 'Damaged curb beside crossing', 'A damaged curb makes the crossing difficult to use. This is a fictional demonstration case.', 'access', 44.65, -63.576),
    issue('30000000-0000-4000-8000-000000000144', 'HFX-0144', 'Streetlight needs inspection', 'The streetlight beside this public path is not illuminating the walkway. This is a fictional demonstration.', 'lighting', 44.6465, -63.58),
  ];
  issues[0].status = 'assigned'; issues[0].leadOrganizationId = organizations[0].id; issues[0].leadOrganizationName = organizations[0].name; issues[0].nextStep = 'Coordinate branch removal and restore access';
  const assignments = organizations.slice(0, 2).map((org, i) => ({ id: `50000000-0000-4000-8000-00000000000${i + 1}`, issueId: issues[0].id, organizationId: org.id, organizationName: org.name, ownerUserId: users[i + 2].id, purpose: i === 0 ? 'Clear the fallen branch' : 'Maintain and restore safe access', required: true, status: 'accepted' as const, nextStep: 'Assign a field team', needsInformation: false, version: 1 }));
  const tasks = assignments.map((assignment, i) => ({ id: `60000000-0000-4000-8000-00000000000${i + 1}`, assignmentId: assignment.id, issueId: assignment.issueId, teamId: teams[i].id, teamName: teams[i].name, assigneeUserId: teams[i].memberUserIds[0], assigneeName: users[i + 5].displayName, purpose: assignment.purpose, status: 'assigned' as const, previousActiveStatus: null, lastReportedAt: createdAt, resultNote: '', version: 1 }));
  return { users, organizations, teams, issues, assignments, tasks,
    events: issues.map((value, i) => ({ id: `70000000-0000-4000-8000-00000000000${i + 1}`, sequence: String(i + 1), issueId: value.id, type: 'issue.created', actorName: 'Demo resident', organizationId: null, visibility: 'public', text: 'Fictional demo report saved. No real authority has been contacted.', createdAt })),
    contributions: [], attachments: [], preparations: [], reopenRequests: [], follows: issues.map(value => ({ userId: users[0].id, issueId: value.id })), notifications: [], sessions: [], idempotency: {}, sequence: 3 };
}
