# OpenHFX demo walkthrough

Use this guide for the connected local demo: public map and reporting, coordinated response, transit, and an optional real phone notification. The organizations and incidents are fictional. A demonstration phone call is real and may incur Twilio charges.

## Start here

The demo uses two repositories:

| App | Repository | Local address |
| --- | --- | --- |
| OpenHFX | [Shivam7137/OpenHFX](https://github.com/Shivam7137/OpenHFX) | http://127.0.0.1:3000 |
| Dispatcher phone bridge | [Shivam7137/Dispatacherv2](https://github.com/Shivam7137/Dispatacherv2) | http://127.0.0.1:3002 |

Use Node 24. On a new machine, clone both repositories and run `npm ci` in each directory. Credentials, demo records and call ledgers are local and are deliberately not included in Git. The OpenHFX outbound demo bridge does not need Dispatcher's hospital PostgreSQL database or migrations; those are required only for its separate hospital application.

Prepare ignored `.env.local` files using each `.env.example` as the list of settings. Do not overwrite an existing private file. For calling, configure the shared token and Twilio values following [DEMO_CALLS](DEMO_CALLS.md). On the currently configured demo machine, the sender is **+1 782-208-7569** and the fixed recipient is **+1 902-473-9228**.

For a predictable presentation without model charges, select `OPENHFX_ENGINE_MODE=demo`. Real Anthropic preparation is optional and requires the explicit provider configuration in [ENGINE](ENGINE.md). Outbound notifications use Twilio text-to-speech; the existing OpenAI SIP agent is a separate incoming hospital-intake feature.

Open two terminals in their respective directories:

```powershell
# Terminal 1: OpenHFX
npm run dev
```

```powershell
# Terminal 2: Dispatcher
npm run dev -- --hostname 127.0.0.1 --port 3002
```

For a prepared production build, run `npm run build` then `npm run start` in OpenHFX. Dispatcher can likewise use `npm run build` then `npm run start -- --hostname 127.0.0.1 --port 3002`. Build before rehearsal and restart the corresponding server after changing configuration or rebuilding. Port 3001 is reserved for a separate OpenHFX verification preview; use port 3000 for the configured demo.

## Prepare the screens

Use separate browser profiles or private contexts for simultaneous identities. Two ordinary tabs in one profile share a session cookie and will switch accounts together.

1. Open [the public app](http://127.0.0.1:3000/public) in the resident context. Sign in as **Alex · demo resident**.
2. Open [the authority app](http://127.0.0.1:3000/authority) in another context. Sign in as **Harbour Parks coordinator**.
3. Prepare **Street Response coordinator** in another context if demonstrating collaboration. Workers use the same authority app with their fictional worker accounts.
4. Keep the receiving phone nearby, with incoming calls audible. Have a fresh fictional issue ready for the phone segment; each issue permits only one call attempt.

## Main presentation: about five minutes

| Segment | Action | What to explain |
| --- | --- | --- |
| Map and daily context | Open the public map, select an issue, and inspect its shaded area. Open transit stops/departures if the live feed is available. | One place connects reported problems and useful local information. Shading is a resident estimate, not a measured hazard boundary. Transit freshness is labeled. |
| Report | Choose **Report**, describe a fictional branch obstructing a walkway, confirm a Halifax map location, and optionally add a photo and affected-area estimate. Review preparation suggestions or submit manually. | Residents retain control of the description. Demo suggestions are deterministic; only explicitly selected provider mode uses a live model. |
| Shared record | Submit and note the new `HFX-…` reference. Find the same issue in the authority inbox. | Both apps use the same saved record. Updates poll about every three seconds. |
| Responsibility | Harbour Parks enters its purpose and selects **Accept assignment**. Street Response accepts another assignment on that same issue. | Two organizations coordinate one issue; the first accepting organization leads. |
| Urgent demo call | Follow the phone segment below while the issue is still open. | A coordinator explicitly initiates a clearly labeled phone notification. AI never makes this decision. |
| Work and evidence | Assign Canopy 2 and the Street Response team. In worker contexts, record on-site progress. Add resident evidence and publish a coordinator update. | These are recorded demonstration milestones, not a claim that a real crew moved or performed work. |
| Completion | Complete each work task, then each organization's required assignment. The lead selects **Resolve issue** and supplies a public resolution note. | One team's completion cannot silently close another organization's work. The public issue and notifications reflect the recorded resolution. |

Suggested report text:

> Fictional demonstration: a fallen branch blocks the harbour walkway and the remaining gap is too narrow for a wheelchair. Please coordinate branch removal and restore accessible passage. No real incident is being reported.

For a reliable transit presentation, the map also provides an explicitly labeled demo transit mode with fictional buses/routes and pause/restart controls. Say that the motion is simulated; it is not live vehicle or worker tracking. See [TRANSIT](TRANSIT.md) for the live-feed and demo boundaries.

## Phone segment: an actual outgoing call

1. In the participating coordinator's issue detail, choose **Review priority** under **Authority decisions**.
2. Select **Urgent** and enter a reason such as: “Fictional presentation case; testing the user-authorized demo notification.” Save the decision.
3. Find **Urgent request · demo call**. Review the public issue reference, title, location label and summary; these are the details spoken to the recipient.
4. Check **I have reviewed the public details and want to call the demo number**, then select **Call demo number** once.
5. Answer **+1 902-473-9228**. The call comes from **+1 782-208-7569** on the configured machine and introduces itself as an automated OpenHFX demonstration before reading the report.
6. Explain that **accepted** means the phone provider accepted the request. It does not prove the recipient answered or heard the message, and it does not dispatch a team or change the issue status.

For another intentional call, create a new fictional issue and repeat the steps after at least one minute. Do not delete either app's database or the Dispatcher call ledger to reset the phone demo. If the outcome is uncertain, check Twilio first; do not repeatedly press the button or create new issues to retry blindly.

## Rehearsal and fallback

Run these before the presentation; they do not call a phone:

```powershell
# OpenHFX, with the app running
npm run verify
npm run smoke -- --manual
```

```powershell
# Dispatcher
npm run typecheck
npx vitest run tests/openhfx-outbound.test.ts tests/phone-voice.test.ts tests/control-calls-routes.test.ts
```

The manual smoke test exercises six independent sessions through creation, collaboration, worker updates, evidence and resolution. It leaves a labeled demo report in the local database and skips paid model preparation. When the server explicitly uses deterministic demo engine mode, `npm run smoke` also exercises preparation. Restart a production server after a verification build before using its browser UI.

| Situation | What to do |
| --- | --- |
| Calling says unconfigured | Start Dispatcher on port 3002, check matching private connection tokens and Twilio settings, and restart after configuration changes. |
| Call button unavailable | Use a participating coordinator, accept the organization's assignment, review the priority as Urgent, keep the issue open, and check the confirmation box. |
| Existing call attempt shown | Use that record as evidence; only a fresh fictional issue can request another deliberate call. |
| Dispatcher rejects before submission | Check configuration and the one-minute limit. A definite preflight rejection permits retry after correction. |
| Accepted but no audible call, rejected, or uncertain | Inspect Twilio call logs for the attempt. An app acceptance message is not delivery confirmation. |
| Live model slow/unavailable | Submit the original report manually or restart in deterministic demo mode. Identify which mode you are showing. |
| Transit feed stale/unavailable | Keep its freshness/failure label visible, use the official schedule link, or choose labeled simulated transit. |
| Map tiles unavailable | Continue with the issue list and manual coordinates. The standalone visual reference is a design fallback, not evidence of a connected workflow. |
| Resolution blocked | Complete required work tasks and assignments first; only the lead resolves the issue. |

## What has been demonstrated

The user-requested live test on 2026-09-12 created **HFX-0151**, received provider acceptance, and a subsequent Twilio status lookup reported **ringing** at the demo recipient. This confirms outbound initiation; it is not independent evidence that the spoken message was heard. Local call records and credentials are not shipped in the repository.

For detailed implementation and verification boundaries, see [DEMO_CALLS](DEMO_CALLS.md), [VERIFICATION](VERIFICATION.md), and [DELIVERY](DELIVERY.md).
