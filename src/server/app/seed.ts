import type { State, StoredIssue } from './store';
import type { Category, User } from '@/contracts';
import type { DemoTransitScenario } from '@/contracts/transit';
import tokens from '../../../docs/design/tokens.json';

/** One canonical, fictional presentation scenario. Never a Halifax timetable or GPS feed. */
export const TRANSIT_DEMO: DemoTransitScenario = {
  isDemo: true,
  routes: [
    { id: 'D1', name: 'Downtown connector', color: tokens.color.harbour, durationSeconds: 180, path: [
      { latitude: 44.6438, longitude: -63.5725 }, { latitude: 44.645, longitude: -63.573 },
      { latitude: 44.647, longitude: -63.5739 }, { latitude: 44.649, longitude: -63.5748 },
      { latitude: 44.651, longitude: -63.5757 }, { latitude: 44.6524, longitude: -63.5764 },
    ] },
    { id: 'D2', name: 'Gardens connector', color: tokens.color.success, durationSeconds: 150, path: [
      { latitude: 44.6429, longitude: -63.583 }, { latitude: 44.6435, longitude: -63.5814 },
      { latitude: 44.6442, longitude: -63.5794 }, { latitude: 44.6449, longitude: -63.5773 },
      { latitude: 44.6455, longitude: -63.5754 }, { latitude: 44.646, longitude: -63.5735 },
    ] },
  ],
  stops: [
    { id: 'demo-stop-1', code: 'D01', name: 'South downtown · Demo stop', location: { latitude: 44.6438, longitude: -63.5725 } },
    { id: 'demo-stop-2', code: 'D02', name: 'Downtown centre · Demo stop', location: { latitude: 44.647, longitude: -63.5739 } },
    { id: 'demo-stop-3', code: 'D03', name: 'North downtown · Demo stop', location: { latitude: 44.6524, longitude: -63.5764 } },
    { id: 'demo-stop-4', code: 'D04', name: 'Gardens west · Demo stop', location: { latitude: 44.6429, longitude: -63.583 } },
    { id: 'demo-stop-5', code: 'D05', name: 'Gardens centre · Demo stop', location: { latitude: 44.6442, longitude: -63.5794 } },
    { id: 'demo-stop-6', code: 'D06', name: 'Gardens east · Demo stop', location: { latitude: 44.646, longitude: -63.5735 } },
  ],
  vehicles: [
    { id: 'D1-01', routeId: 'D1', offsetSeconds: 12 }, { id: 'D1-02', routeId: 'D1', offsetSeconds: 110 },
    { id: 'D2-01', routeId: 'D2', offsetSeconds: 30 }, { id: 'D2-02', routeId: 'D2', offsetSeconds: 105 },
  ],
};

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
  // Fictional reported estimates, not surveyed or authority-confirmed boundaries.
  issues.forEach((value, index) => { value.impactRadiusMeters = [30, 15, 25][index]; });
  issues[0].status = 'assigned'; issues[0].leadOrganizationId = organizations[0].id; issues[0].leadOrganizationName = organizations[0].name; issues[0].nextStep = 'Coordinate branch removal and restore access';
  const assignments = organizations.slice(0, 2).map((org, i) => ({ id: `50000000-0000-4000-8000-00000000000${i + 1}`, issueId: issues[0].id, organizationId: org.id, organizationName: org.name, ownerUserId: users[i + 2].id, purpose: i === 0 ? 'Clear the fallen branch' : 'Maintain and restore safe access', required: true, status: 'accepted' as const, nextStep: 'Assign a field team', needsInformation: false, version: 1 }));
  const tasks = assignments.map((assignment, i) => ({ id: `60000000-0000-4000-8000-00000000000${i + 1}`, assignmentId: assignment.id, issueId: assignment.issueId, teamId: teams[i].id, teamName: teams[i].name, assigneeUserId: teams[i].memberUserIds[0], assigneeName: users[i + 5].displayName, purpose: assignment.purpose, status: 'assigned' as const, previousActiveStatus: null, lastReportedAt: createdAt, resultNote: '', version: 1 }));
  return { users, organizations, teams, issues, assignments, tasks,
    events: issues.map((value, i) => ({ id: `70000000-0000-4000-8000-00000000000${i + 1}`, sequence: String(i + 1), issueId: value.id, type: 'issue.created', actorName: 'Demo resident', organizationId: null, visibility: 'public', text: 'Fictional demo report saved. No real authority has been contacted.', createdAt })),
    contributions: [], attachments: [], preparations: [], reopenRequests: [], follows: issues.map(value => ({ userId: users[0].id, issueId: value.id })), notifications: [], sessions: [], idempotency: {}, sequence: 3 };
}
