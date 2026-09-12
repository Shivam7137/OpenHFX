# Urgent request demo calls

Presenter guide: [complete demo walkthrough](DEMO.md). The initial offline-verification notes below are followed by configuration and live-call evidence; they describe successive checkpoints.

A participating coordinator can initiate an automated call to **+1 902-473-9228**, confirmed by the user as their demo number. The issue must be a demonstration, unresolved, and explicitly reviewed as `urgent`. AI suggestions never initiate calls. This is a recorded spoken notification, not a two-way voice conversation or emergency dispatch.

OpenHFX verifies the coordinator and issue, reserves a durable attempt in its existing SQLite state, then calls Dispatcher. Dispatcher authenticates the server credential, validates the public issue payload, reserves its own durable attempt, and uses Twilio Programmable Voice to call the fixed number. It speaks a demonstration introduction, issue reference, title, public location label and summary, then hangs up. No staff notes, original private description, precise private coordinates, attachments or identity fields are forwarded.

## Local setup

Use Node 24 for both applications. The Dispatcher adapter uses built-in SQLite independently of its hospital PostgreSQL database. Existing incoming SIP, hospital intake and assignments are unchanged.

1. In `C:\Users\shiva\Dispatcher\.env.local`, configure `OPENHFX_CALLS_ENABLED=true`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER`. The outgoing number must be authorized for your Twilio account and different from +19024739228. A restricted trial account may require recipient verification. Use the Twilio console for account restrictions; never paste credentials into chat or browser code.
2. Set the same privately generated random credential (at least 32 characters) as `OPENHFX_DISPATCHER_TOKEN` in both repositories' ignored `.env.local` files. Generate it locally with a password manager. Set `OPENHFX_DISPATCHER_URL=http://127.0.0.1:3002` in OpenHFX. The URL must be an origin; HTTPS is required except for loopback.
3. Start Dispatcher from its directory with `npm run dev -- --hostname 127.0.0.1 --port 3002`. Start OpenHFX with `npm run dev` on port 3000 (or `npm run start` for an existing production build). Port 3001 is reserved for the separate OpenHFX verification preview. Restart after configuration changes. No public tunnel, incoming webhook change, or OpenAI key is needed for this outbound notification.
4. In OpenHFX, sign in as the Harbour Parks coordinator. Open the branch-obstruction demo issue, choose **Review priority**, select **Urgent**, enter a reason, and save. In **Urgent request · demo call**, review the displayed disclosure, check the confirmation box and press **Call demo number**. This action places a real chargeable call when configured.
5. Answer the demo phone and listen for the clearly identified demonstration. Verify actual connection/delivery separately in Twilio; API acceptance alone is not delivery evidence.

## Attempt and privacy rules

- The integration sends only to the fixed server-owned destination. Request bodies cannot override it or supply speech instructions/TwiML. Report text is XML-escaped before speech.
- One attempt per issue, even after refresh, another click, or restart. Dispatcher also limits attempts across issues to one per minute. Use a new fictional issue for another deliberate demo call after checking the preceding outcome.
- OpenHFX stores call state in its existing database; Dispatcher stores a minimal ledger in ignored `.data/openhfx-calls.sqlite`. Retain both across restarts. Deleting a ledger or changing its directory defeats duplicate protection; do not use cleanup as retry.
- Network timeouts, interrupted processes and malformed upstream replies remain `uncertain` or `submitting`; they never redial automatically. Inspect Dispatcher/Twilio records. An explicit preflight configuration/authentication/rate-limit rejection releases only OpenHFX's reservation because Dispatcher has not attempted the call.
- Call metadata and audit events are staff-only. Existing issue status, assignments and reviewed priority remain unchanged. Local prototype sessions are not production authentication.
- Call states are `submitting`, `accepted`, `rejected`, `uncertain`; these describe an attempt, not an issue or a worker. `accepted` means the provider returned a call identifier. There is no answered/delivered claim or status callback integration.

## Verification

OpenHFX: `npm run typecheck`, `npm test`, `npm run build`, and with a running server `npm run smoke`. If that server uses a paid provider, run `npm run smoke -- --manual` to exercise the same six-session journey using manual reporting without invoking the provider. The default script now requires deterministic engine mode. Focused coverage is `tests/backend/demo-calls.test.ts`.

Dispatcher: `npm run typecheck`, `npx vitest run tests/openhfx-outbound.test.ts tests/phone-voice.test.ts tests/control-calls-routes.test.ts`, `npm run build`. Outbound tests inject fake networking, exercise concurrent/restarted requests and XML escaping, and do not use live keys or call a phone.

Provider references: [Twilio Call resource](https://www.twilio.com/docs/voice/api/call-resource), [TwiML Say](https://www.twilio.com/docs/voice/twiml/say).

### Observed checks, 2026-09-12

- OpenHFX: strict types, production build, and all 126 tests passed (including six demo-call backend tests).
- Dispatcher: strict types and production build passed. The six outbound bridge tests passed; the existing incoming-phone and control-call route regressions also passed. Targeted ESLint passed. The full hospital application suite was not rerun for this independent adapter.
- Running-server six-session smoke passed on the existing provider-configured OpenHFX server with `--manual`, issue HFX-0150, through two organizations and final resolution. Preparation was intentionally skipped. The initial default smoke timed out awaiting provider preparation; it now fails before provider invocation unless deterministic demo mode is selected.
- A separate headless Chrome context on the rebuilt production preview at port 3001 passed the 360-pixel UI check: disabled configuration, explicit confirmation, preflight error/retry, accepted-attempt rendering after reload, and no horizontal overflow. Only the demo-call responses and displayed urgency were mocked in that browser; no phone request reached Dispatcher. Ignored local captures are `.data/demo-call-mobile-ready.png` and `.data/demo-call-mobile-accepted.png`.
- At the initial offline checkpoint, live calling was unverified and disabled pending credentials. No Twilio call had been placed. Local configuration inspection reported only the presence/absence of settings, never their contents.

### Configuration follow-up, 2026-09-12

The user authorized configuring the existing accounts. Twilio credentials were transferred directly from the account console to ignored Dispatcher `.env.local` without appearing in chat or tool output. The existing voice-enabled number +17822087569 is configured as the sender; +19024739228 remains the fixed demo destination. A generated private token connects OpenHFX on port 3000 to Dispatcher on port 3002. Existing OpenAI credentials were preserved. Read-only provider checks returned successful authentication for Twilio and OpenAI, confirmed ownership/voice capability of the sender, and confirmed the configured realtime model is available. No phone call or model inference was performed. The primary OpenHFX production server was restarted to load the current build and configuration; the separate preview was preserved.

### User-authorized live call, 2026-09-12

After configuration, the user explicitly requested one call. A new fictional issue, HFX-0151, passed through report creation, demo coordinator assignment, an explicitly documented demonstration-only urgent review, and the normal call endpoint. The provider accepted the request and a subsequent read-only Twilio lookup reported `ringing` at +19024739228. No automatic retry was made. Recipient answer or audible message delivery was not independently verified. The issue and call ledgers remain in ignored local storage.
