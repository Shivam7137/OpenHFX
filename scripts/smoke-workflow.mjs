import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const base = new URL(process.env.OPENHFX_SMOKE_URL || 'http://127.0.0.1:3000');
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname), 'This demo smoke script only runs against loopback.');
const api = new URL('/api/v1/', base);
function client() {
  let cookie = '';
  return async (path, body, method = body === undefined ? 'GET' : 'POST', expected = 200) => {
    const headers = { 'Origin': base.origin, ...(cookie ? { Cookie: cookie } : {}) };
    if (body !== undefined) { headers['Content-Type'] = 'application/json'; headers['Idempotency-Key'] = randomUUID(); }
    const response = await fetch(new URL(path, api), { method, headers, signal: AbortSignal.timeout(60_000), ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    const sessionCookie = response.headers.get('set-cookie');
    if (sessionCookie) cookie = sessionCookie.split(';')[0];
    const result = await response.json();
    assert.ok(Array.isArray(expected) ? expected.includes(response.status) : response.status === expected,
      `${method} ${path}: expected ${expected}, received ${response.status}: ${JSON.stringify(result)}`);
    return result;
  };
}
const publicClient = client();
const session = (await publicClient('session')).data;
assert.equal(session.demoMode, true, 'Smoke test requires the explicitly labeled demo environment.');
const account = (role, organizationId) => {
  const found = session.accounts.find(value => value.role === role && (organizationId === undefined || value.organizationId === organizationId));
  assert.ok(found, `Missing ${role} demo account`); return found;
};
const organizations = (await publicClient('organizations')).items;
const parks = organizations.find(value => value.name === 'Harbour Parks');
const streets = organizations.find(value => value.name === 'Street Response');
assert.ok(parks && streets);
const resident = client(), neighbour = client(), parksCoordinator = client(), streetsCoordinator = client();
const parkWorker = client(), streetWorker = client();
await resident('session', { accountId: account('resident').id });
await neighbour('session', { accountId: session.accounts.filter(value => value.role === 'resident')[1].id });
await parksCoordinator('session', { accountId: account('coordinator', parks.id).id });
await streetsCoordinator('session', { accountId: account('coordinator', streets.id).id });
await parkWorker('session', { accountId: account('worker', parks.id).id });
await streetWorker('session', { accountId: account('worker', streets.id).id });
const draftId = randomUUID();
const description = 'Demo integration check: a fallen branch is blocking a public walkway and wheelchair access. No real incident is being reported.';
const preparation = (await resident('report-preparations', {
  draftId, originalDescription: description, publicLocation: { latitude: 44.6488, longitude: -63.5752 }, category: 'trees',
}, 'POST', [200, 201, 202])).data;
let completedPreparation = preparation;
for (let attempt = 0; attempt < 40 && ['queued', 'running'].includes(completedPreparation.status); attempt++) {
  await new Promise(resolve => setTimeout(resolve, 50));
  completedPreparation = (await resident(`report-preparations/${preparation.id}`)).data;
}
assert.ok(['succeeded', 'failed'].includes(completedPreparation.status), 'Preparation reached a terminal state.');
await neighbour(`report-preparations/${preparation.id}`, undefined, 'GET', [403, 404]);
let issue = (await resident('issues', {
  draftId, originalDescription: description, title: 'Demo integration: branch on walkway', summary: description, category: 'trees',
  exactLocation: { latitude: 44.6488, longitude: -63.5752 }, publicLocationLabel: 'Fictional harbour-path test', sensitiveLocation: false,
  attachmentIds: [], preparationId: preparation.id,
}, 'POST', [200, 201])).data;
const issueId = issue.id;
assert.ok(issueId);
await resident('authority/inbox', undefined, 'GET', 403);
issue = (await parksCoordinator(`authority/issues/${issueId}/assignments`, { purpose: 'Inspect and clear the demo branch', required: true, expectedVersion: issue.version }, 'POST', [200, 201])).data;
issue = (await streetsCoordinator(`authority/issues/${issueId}/assignments`, { purpose: 'Restore access in the demo case', required: true, expectedVersion: issue.version }, 'POST', [200, 201])).data;
assert.equal(issue.assignments.length, 2);
assert.equal(issue.assignments.filter(value => value.required).length, 2);
const privateNote = `Staff-only smoke note ${randomUUID()}`;
issue = (await parksCoordinator(`authority/issues/${issueId}/updates`, { visibility: 'staff', text: privateNote, expectedVersion: issue.version })).data;
assert.equal(JSON.stringify(await publicClient(`issues/${issueId}`)).includes(privateNote), false);
const parksAssignment = issue.assignments.find(value => value.organizationId === parks.id);
const streetsAssignment = issue.assignments.find(value => value.organizationId === streets.id);
const parksTeam = (await parksCoordinator('teams')).items[0];
const streetsTeam = (await streetsCoordinator('teams')).items[0];
issue = (await parksCoordinator(`authority/assignments/${parksAssignment.id}/tasks`, { teamId: parksTeam.id, purpose: 'Clear branch in demo', expectedVersion: parksAssignment.version }, 'POST', [200, 201])).data;
issue = (await streetsCoordinator(`authority/assignments/${streetsAssignment.id}/tasks`, { teamId: streetsTeam.id, purpose: 'Restore access in demo', expectedVersion: streetsAssignment.version }, 'POST', [200, 201])).data;
let parkTask = issue.tasks.find(value => value.assignmentId === parksAssignment.id);
await streetWorker(`authority/tasks/${parkTask.id}/progress`, { status: 'on_site', note: 'Unauthorized test', expectedVersion: parkTask.version }, 'POST', [403, 404]);
issue = (await parkWorker(`authority/tasks/${parkTask.id}/progress`, { status: 'on_site', note: 'Demo team reports on site.', expectedVersion: parkTask.version })).data;
await neighbour(`issues/${issueId}/contributions`, { body: 'Demo observation: the remaining path is too narrow for a wheelchair.', attachmentIds: [] }, 'POST', [200, 201]);
issue = (await parksCoordinator(`authority/issues/${issueId}`)).data;
issue = (await parksCoordinator(`authority/issues/${issueId}/updates`, { visibility: 'public', text: 'Demo team is on site and assessing access.', expectedVersion: issue.version })).data;
assert.ok((await resident('notifications')).items.some(value => value.issueId === issueId));
parkTask = issue.tasks.find(value => value.assignmentId === parksAssignment.id);
issue = (await parkWorker(`authority/tasks/${parkTask.id}/progress`, { status: 'complete', note: 'Demo task result: branch cleared.', expectedVersion: parkTask.version })).data;
let currentAssignment = issue.assignments.find(value => value.id === parksAssignment.id);
issue = (await parksCoordinator(`authority/assignments/${currentAssignment.id}/progress`, { status: 'complete', nextStep: 'Demo parks work complete.', expectedVersion: currentAssignment.version })).data;
assert.notEqual(issue.status, 'resolved');
await parksCoordinator(`authority/issues/${issueId}/decisions`, { action: 'resolve', reason: 'Attempted early resolution test.', expectedVersion: issue.version }, 'POST', [400, 409]);
const streetTask = issue.tasks.find(value => value.assignmentId === streetsAssignment.id);
issue = (await streetWorker(`authority/tasks/${streetTask.id}/progress`, { status: 'complete', note: 'Demo task result: accessible passage restored.', expectedVersion: streetTask.version })).data;
currentAssignment = issue.assignments.find(value => value.id === streetsAssignment.id);
issue = (await streetsCoordinator(`authority/assignments/${currentAssignment.id}/progress`, { status: 'complete', nextStep: 'Demo streets work complete.', expectedVersion: currentAssignment.version })).data;
issue = (await parksCoordinator(`authority/issues/${issueId}/decisions`, { action: 'resolve', reason: 'Demo verification: both organizations completed their required work.', expectedVersion: issue.version })).data;
assert.equal(issue.status, 'resolved');
const publicIssue = (await publicClient(`issues/${issueId}`)).data;
assert.equal(publicIssue.status, 'resolved');
assert.equal('tasks' in publicIssue, false);
assert.equal(JSON.stringify(publicIssue).includes(privateNote), false);
assert.ok(publicIssue.contributions.length >= 1);
const summary = (await parksCoordinator(`authority/issues/${issueId}/summary`)).data;
assert.equal(summary.text.includes(privateNote), false);
console.log(JSON.stringify({ passed: true, issueId, reference: issue.reference, preparation: completedPreparation.status, engineMode: completedPreparation.mode, organizations: 2, status: publicIssue.status, evidence: publicIssue.contributions.length, summaryMode: summary.mode }, null, 2));
