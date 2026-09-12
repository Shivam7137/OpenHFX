import { z } from 'zod';
import type { User } from '@/contracts';
import { DEMO_CALL_NUMBER, type DemoCall, type DemoCallInfo } from '@/contracts/demo-calls';
import { coordinator, fail, jsonBody, version, checkVersion, localDemo } from './security';
import { addEvent, findIssue, requireParticipant } from './domain';
import { now, type Store, type State } from './store';

function configuration() {
  const token = process.env.OPENHFX_DISPATCHER_TOKEN || '';
  try {
    const url = new URL(process.env.OPENHFX_DISPATCHER_URL || '');
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (token.length < 32 || url.username || url.password || url.search || url.hash || url.pathname !== '/' || (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback))) return null;
    return { url: `${url.origin}/api/integrations/openhfx/calls`, token };
  } catch { return null; }
}
function permitted(state: State, user: User, issueId: string) {
  coordinator(user);
  const issue = findIssue(state, issueId);
  requireParticipant(state, issue, user);
  return issue;
}
export function demoCallInfo(store: Store, user: User, issueId: string): DemoCallInfo {
  const state = store.read(); permitted(state, user, issueId);
  return { configured: !!configuration(), destination: DEMO_CALL_NUMBER, call: state.demoCalls?.[issueId] || null };
}
export async function initiateDemoCall(request: Request, store: Store, user: User, issueId: string): Promise<DemoCall> {
  permitted(store.read(), user, issueId);
  if (!localDemo(request)) fail(403, 'FORBIDDEN', 'Demo calls are available only in the local demonstration.');
  const input = await jsonBody(request, z.object({ expectedVersion: version, confirmed: z.literal(true) }).strict());
  const config = configuration();
  if (!config) fail(503, 'CALLS_UNCONFIGURED', 'Connect Dispatcher in the server configuration to enable demo calls.');
  const reservation = store.transaction(state => {
    const issue = permitted(state, user, issueId);
    if (!issue.isDemo || !issue.priorityReviewed || issue.priority !== 'urgent' || issue.status === 'resolved') fail(409, 'CALL_NOT_ALLOWED', 'Choose an unresolved demo issue with authority-reviewed urgent priority.');
    // An already reserved attempt is returned even after other issue updates.
    const existing = state.demoCalls?.[issueId];
    if (existing) return { existing };
    checkVersion(issue, input.expectedVersion);
    const call: DemoCall = { issueId, status: 'submitting', createdAt: now(), providerCallId: null };
    (state.demoCalls ??= {})[issueId] = call;
    addEvent(state, issue, user, 'demo_call.submitting', 'Demonstration phone call requested by a coordinator. Delivery is not confirmed.', 'staff');
    return { payload: { issueId, reference: issue.reference, title: issue.title, summary: issue.summary, publicLocationLabel: issue.publicLocationLabel, priority: 'urgent', priorityReviewed: true, isDemo: true } };
  });
  if (reservation.existing) return reservation.existing;
  let status: DemoCall['status'] = 'uncertain';
  let providerCallId: string | null = null;
  let notSubmitted = false;
  try {
    const response = await fetch(config.url, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20_000),
      headers: { authorization: `Bearer ${config.token}`, 'content-type': 'application/json' },
      body: JSON.stringify(reservation.payload),
    });
    if (response.ok) {
      const parsed = z.object({ data: z.object({ status: z.enum(['submitting', 'accepted', 'rejected', 'uncertain']), providerCallId: z.string().regex(/^CA[0-9a-f]{32}$/i).nullable().optional() }) }).parse(await response.json());
      status = parsed.data.status;
      providerCallId = parsed.data.providerCallId || null;
      if (status === 'accepted' && !providerCallId) status = 'uncertain';
    } else {
      // Only our bridge's explicit preflight failures are safe to retry after correction.
      const parsed = await response.json() as { error?: { code?: string } };
      notSubmitted = [401, 400, 413, 429, 503].includes(response.status) && ['CALLS_DISABLED', 'UNAUTHORIZED', 'CALLS_UNCONFIGURED', 'INVALID_REQUEST', 'CALL_RATE_LIMIT'].includes(parsed.error?.code || '');
    }
  } catch { /* A network failure may occur after the destination started ringing. */ }
  const result = store.transaction(state => {
    const call = state.demoCalls![issueId];
    call.status = status; call.providerCallId = providerCallId;
    const issue = findIssue(state, issueId);
    if (notSubmitted) {
      delete state.demoCalls![issueId];
      addEvent(state, issue, user, 'demo_call.not_submitted', 'Dispatcher did not submit a demo call. Check configuration or the one-minute call limit.', 'staff');
    } else addEvent(state, issue, user, `demo_call.${status}`, status === 'accepted' ? 'Demonstration call accepted by the phone provider. Answering and message delivery are not confirmed.' : 'Demonstration call outcome requires review in Dispatcher. No dispatch or delivery is confirmed.', 'staff');
    return call;
  });
  if (notSubmitted) fail(503, 'CALL_NOT_SUBMITTED', 'Dispatcher did not submit a call. Check its Twilio configuration and allow one minute between calls, then try again.');
  return result;
}
