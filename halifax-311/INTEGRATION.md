# Wiring the Halifax 311 dataset into the app

How to get from *a resident tapping the mic button* to *a filled-in municipal form
they can review and send*.

You need three things from this repo: the data in `data/`, a router that turns text
into a form choice, and a renderer that turns a form schema into UI. `router.py` is a
working reference for the middle piece — read it alongside this document.

---

## The flow

```
  mic  ──►  speech-to-text  ──►  route(transcript)  ──►  form + confidence
 (app)        (on device)          (LLM, server)              │
                                                              ▼
                                         ┌──── confidence high ────► prefilled form
                                         │                            (user reviews)
                                         ├──── confidence medium ───► "did you mean?"
                                         │                            2-3 options
                                         └──── confidence low ──────► free-text to 311
```

Two calls do the work:

| Call | Input | Output | Needed for |
|---|---|---|---|
| `route()` | transcript | `intent_id`, `confidence`, `alternatives`, `location_text`, `details`, `is_emergency` | every request |
| `extract_slots()` | `intent_id` + transcript | values for that form's specific fields | **14 of 55 forms** — the other 41 skip it entirely |

That 41/55 number is the reason this is tractable. Most Halifax forms are the same
form (`standard_311_request`): contact details, an address, a free-text box, an
optional photo. The transcript goes in the box, the profile fills the rest, and the
submission is complete without extracting a single structured field.

---

## Step 1 — decide what ships where

| Data | Where | Why |
|---|---|---|
| `services_catalog.json` | app bundle | Powers browse/search UI offline. 43 KB. |
| `forms.json` | app bundle | The renderer needs field schemas with no network. 200 KB. |
| `intents.json` | **server only** | It is the router's prompt. Shipping it to the client buys nothing and makes the routing logic public. |
| `field_templates.json` | either | Convenience view of the shared template. |

Ship the JSON as an asset, not as generated code — you will re-scrape when Halifax
changes a form, and regenerating types on every scrape is friction you do not need.

---

## Step 2 — route the transcript

```python
from router import route, extract_slots, build_submission

r = route("yeah so there's like a dead raccoon on the side of robie street")
# r.intent_id     'deceased-animals'
# r.confidence    0.94
# r.location_text 'Robie Street'
# r.details       'Dead raccoon on the side of the road.'

slots = extract_slots(r.intent_id, transcript)   # {'animal_type': 'Raccoon'}
payload = build_submission(r, user_profile, slots)
```

### Cache the catalogue — this is the single biggest cost lever

The intent catalogue renders to ~8,600 tokens and is **identical on every request**.
`router.py` puts it in a `system` block with `cache_control: {"type": "ephemeral"}`,
so after the first call it is a cache read at ~10% of the input price.

The catch: caching is a **prefix match**. One byte of drift and every request pays
full price, silently. `catalog()` sorts intents by id and interpolates nothing
variable — no timestamp, no request id, no user name. Keep it that way, and put
anything per-request in `messages`, never in the system block.

Verify it is actually working:

```python
print(resp.usage.cache_read_input_tokens)   # should be ~8600 from the second call on
```

If that stays `0` across repeated calls, something is mutating the prefix. Find it
before you tune anything else.

### Why two calls and not one

The slot schema is different for every form, so folding extraction into the routing
call would mean a per-form schema in the prompt — which breaks the shared cached
prefix and costs more than the extra call saves. Keeping them separate means 41 of
55 forms never make the second call at all.

---

## Step 3 — render the form

Every form in `forms.json` carries its own field list. Render generically; do not
hand-build 55 screens.

```ts
type Field = {
  name: string;          // exact submission key, e.g. "civic_address[address_line1]"
  label: string;         // display label, asterisk already stripped
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'radio' | 'checkbox'
      | 'date' | 'number' | 'file';
  required: boolean;
  options?: string[];    // select and radio only
  placeholder?: string;
  description?: string;  // helper text under the input
  maxlength?: string;    // note: string, it comes from an HTML attribute
};
```

Four things to get right:

- **`name` is opaque.** `civic_address[address_line1]` is one key, not a nested
  object. Never parse the brackets — you will need the literal string to submit.
- **`maxlength` is a string.** Coerce before comparing. `details_of_request` caps at
  500 characters, and a rambling transcript will exceed it — truncate at a word
  boundary and show the user, don't silently cut.
- **`sections`** gives the visual grouping Halifax uses (Contact Information /
  Location / Request Details). Follow it; residents who have used the website
  recognise it.
- **`options` are display labels and submission values at once.** Send the string
  back exactly as given.

---

## Step 4 — the states you actually have to handle

This is where a demo differs from something usable.

### Confidence thresholds

`route()` returns a real confidence, not a formality. Suggested cut-offs, to be
re-tuned once you have real transcripts:

| Confidence | Behaviour |
|---|---|
| ≥ 0.8 | Open the prefilled form directly. Still show which form it chose — never submit silently. |
| 0.5 – 0.8 | Show the chosen form plus `alternatives` as a "Did you mean…?" picker. |
| < 0.5 | Do not guess. Offer free-text to 311 (`ask-a-question-to-311`), or a category browser built from `services_catalog.json`. |

A wrong form routes the complaint to the wrong municipal department, where it dies
quietly. Two taps of disambiguation is a far better outcome than a confident miss.

### Emergencies bypass the queue

`r.is_emergency` and the `urgency` field on some intents mark requests that should
not sit in a batch. Separately, `illegally-parked-vehicle` has options in
`alleged_violation` suffixed **`(DISPATCH)`** — blocked driveway, fire lane, on a
sidewalk, within 5 m of a hydrant. Halifax dispatches an officer for those.

```python
if r.is_emergency or '(DISPATCH)' in (slots.get('alleged_violation') or ''):
    flag_urgent(payload)
```

Say plainly in the UI that a 311 report is not an emergency service, and point at
911 where it belongs.

### Forms voice cannot finish in one shot

Check `payload['missing_required']` before offering a Send button. Most standard
forms come back empty. A few will not:

| Form | Required fields voice won't supply |
|---|---|
| `alarm-registration` | 13 — civic number, postal code, effective date, alarm type, … |
| `address-change-form` | 14 — assessment account number, effective date, old mailing address, … |
| mayor's office forms | 17-19 — honouree names, dates, salutations, mailing address, … |

For these, use the transcript as the opening move and ask for the rest — one
question per missing required field, using the field's own `label` and
`description` as the question text. Don't try to voice-fill a 19-required-field form.

### Services with no form at all

37 of the 92 catalogue entries have `submittable_form: false` — paying a ticket,
the crime map, permit portals, job search. The correct response is a link, not a
form. Today `route()` only knows the 55 form intents, so a resident asking "how do I
pay my parking ticket" will be pushed onto the nearest form. Either add a
`not_a_form` escape hatch to the `Route` schema, or search
`services_catalog.json` first and short-circuit on a strong title match.

---

## Step 5 — the client/server contract

Keep the LLM and the API key server-side. A thin contract keeps the app testable
without burning tokens:

```
POST /api/route
  { "transcript": "...", "locale": "en" }

  200 {
    "intent_id": "deceased-animals",
    "confidence": 0.94,
    "alternatives": ["problem-plants-insects-invasive-species"],
    "is_emergency": false,
    "form": { "slug": "...", "name": "...", "url": "...", "template": "custom" },
    "values": { "details_of_request": "...", "animal_type": "Raccoon", ... },
    "missing_required": [],
    "ready_to_submit": true
  }
```

`build_submission()` already returns everything below `form` — the endpoint is
mostly glue. Keep `values` keyed by the **exact** field `name`, so the client can
map straight onto the schema it already has in `forms.json`.

Have the endpoint log `transcript`, `intent_id`, `confidence`, and — once the user
has reviewed the form — whether they **changed** the form. That correction signal is
the only honest accuracy measure you will get, and it costs nothing to collect.

---

## Step 6 — keep measuring

```bash
python3 baseline_match.py --all
```

The keyword baseline scores **87.2%** top-1 on the phrases its keywords came from and
**42.6%** on `eval_holdout.jsonl`, which says the same things in different words. That
gap is the whole point: the first number is overfitting, the second is the floor the
LLM router has to clear.

It clears it. Measured 2026-09-12 with `eval_router.py` on `claude-opus-5`:

| Set | top-1 | with `alternatives` |
|---|---|---|
| `eval_holdout.jsonl` (68) | **100%** | 100% |
| `eval_adversarial.jsonl` (28) | **96.4%** | 100% |

100% on the holdout means that set has stopped discriminating, not that the router is
perfect — paraphrase is easy once the whole catalogue is in the prompt.
`eval_adversarial.jsonl` is the one that still bites: 28 deliberately underdetermined
requests along the axes that actually confuse the classifier (park vs. street, new vs.
repair, active flooding vs. asset repair).

**The calibration matters more than the accuracy.** Mean confidence was 0.80 when
right and 0.45 when wrong, and the single adversarial miss — "there's a broken bench",
which no amount of prompting can resolve without asking — came back at 0.45. Under the
thresholds above the UI asks instead of guessing. Check that property survives any
prompt change you make; it is what keeps a wrong form off the screen. When you add keywords
to `scraper/kb.py`, re-run **`--holdout`** — tuning against `eval_utterances.jsonl`
moves that number and teaches you nothing.

As real transcripts arrive, append them to `eval_holdout.jsonl` with the form the
user actually submitted. Mis-routes from production are worth more than anything
written at a desk.

---

## Cost and latency

Per `route()` call, at Opus 5 pricing ($5 / $25 per 1M in/out, cache reads ~$0.50 per 1M):

| | Tokens | Cost |
|---|---|---|
| Catalogue, cached | ~8,600 | ~$0.004 |
| Catalogue, **not** cached | ~8,600 | ~$0.043 |
| Output (routing decision) | ~200-1,000 | ~$0.005-0.025 |

So caching cuts roughly $0.04 per request, and output — thinking included — is what
dominates the rest. Budget on the order of **$0.01-0.03 per routed request**, and
measure `response.usage` on your own traffic rather than trusting that range.
`extract_slots()` adds a small second call, skipped for 41 of 55 forms.

`EFFORT = 'low'` in `router.py` keeps the voice loop responsive; classification does
not repay deep reasoning. If you measure misroutes concentrated in the ambiguous
pairs (park vs. street, new vs. repair), raise it to `'medium'` and re-measure
rather than rewriting prompts.

---

## What this does not do

**Submission is not implemented.** Halifax forms are server-rendered Drupal webforms
with a CSRF token (`form_build_id` / `form_token`) and no public API. `submit_action`
in `forms.json` is the page URL, not an endpoint. A real POST needs either a token
fetched from a live page render or an arrangement with the municipality. Mock the
send for now and make the mock obvious in the UI.

**Data goes stale.** Halifax edits these forms. Re-run `scraper/fetch.py` and
`scraper/build.py`, then diff `data/forms.json` — a field that disappears will
otherwise fail at submit time, long after routing looked fine.
