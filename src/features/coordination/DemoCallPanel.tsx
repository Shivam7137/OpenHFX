"use client";
import { useRef, useState } from 'react';
import { Phone } from 'lucide-react';
import type { ApiEnvelope, IssueDetail } from '@/contracts';
import { DEMO_CALL_MESSAGES, type DemoCall, type DemoCallInfo } from '@/contracts/demo-calls';
import { errorMessage, mutate, usePoll } from '@/components/api';
import { ErrorNotice } from '@/components/ui';

export function DemoCallPanel({ issue, refresh }: { issue: IssueDetail; refresh: () => Promise<void> }) {
  const path = `/authority/issues/${issue.id}/demo-call`;
  const poll = usePoll<ApiEnvelope<DemoCallInfo>>(path);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sending = useRef(false);
  const info = poll.data?.data;
  const eligible = issue.isDemo && issue.priorityReviewed && issue.priority === 'urgent' && issue.status !== 'resolved';
  const attempt = info?.call;
  return <section className="assignment-panel" aria-labelledby="demo-call-title">
    <h3 id="demo-call-title">Urgent request · demo call</h3>
    <p>Place an automated call to <strong>+1 902-473-9228</strong>. The message identifies itself as a demonstration and reads this issue’s reference, title, public location and summary.</p>
    <p className="meta">A call does not dispatch a team or change the issue status. One call attempt per issue.</p>
    <ErrorNotice message={error || poll.error} />
    {attempt ? <p role="status">{DEMO_CALL_MESSAGES[attempt.status]}</p> : <>
      {!eligible && <p className="meta">Review the priority as Urgent before calling. The demo issue must remain open.</p>}
      {!info ? <p role="status">Checking call availability…</p> : !info.configured && <p role="status">Demo calling is not configured. Connect Dispatcher to enable this action.</p>}
      <label><input type="checkbox" checked={confirmed} disabled={pending || !eligible || !info?.configured} onChange={e => setConfirmed(e.target.checked)} /> I have reviewed the public details and want to call the demo number.</label>
      <button type="button" className="button" disabled={pending || !confirmed || !eligible || !info?.configured} onClick={async () => {
        if (sending.current) return;
        sending.current = true; setPending(true); setError(null);
        try { await mutate<DemoCall>(path, { expectedVersion: issue.version, confirmed: true }); setConfirmed(false); }
        catch (e) { setError(errorMessage(e)); }
        finally { await poll.refresh(); await refresh(); sending.current = false; setPending(false); }
      }}><Phone size={18} />{pending ? 'Requesting call…' : 'Call demo number'}</button>
    </>}
  </section>;
}
