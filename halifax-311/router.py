#!/usr/bin/env python3
"""Reference implementation: free text / voice transcript -> Halifax 311 form + prefilled fields.

Two calls, both against the same cached prompt prefix:

    route(transcript)                  -> which form, how confident, what else it could be
    extract_slots(intent_id, text)     -> values for that form's non-standard fields

Everything the model needs comes from data/*.json - no hardcoded service knowledge here.

    export ANTHROPIC_API_KEY=...       # or: ant auth login
    python3 router.py "there's a dead raccoon on the side of the road"
"""
from __future__ import annotations

import json
import os
import sys
from functools import lru_cache
from typing import Any, Literal

import anthropic
from pydantic import BaseModel, Field

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
MODEL = 'claude-opus-5'

# Classification is latency-sensitive and easy; 'low' keeps the voice loop snappy.
# Raise to 'medium'/'high' if you measure misroutes on ambiguous input.
EFFORT = 'low'

_client = anthropic.Anthropic()


# --------------------------------------------------------------------------- data

@lru_cache(maxsize=1)
def load() -> tuple[list[dict], dict[str, dict]]:
    intents = json.load(open(os.path.join(DATA, 'intents.json')))['intents']
    forms = {f['slug']: f for f in json.load(open(os.path.join(DATA, 'forms.json')))['forms']}
    return intents, forms


@lru_cache(maxsize=1)
def catalog() -> str:
    """Compact, byte-stable rendering of the intent catalogue.

    Stable is the point: this string is the cached prompt prefix, so it must not
    change between requests. No timestamps, no dict ordering surprises.
    """
    intents, _ = load()
    out = []
    for it in sorted(intents, key=lambda x: x['intent_id']):
        out.append(f"## {it['intent_id']}")
        out.append(f"name: {it['display_name']}")
        out.append(f"what it is for: {it['official_summary']}")
        out.append('triggers: ' + ', '.join(it['keywords']))
        out.append('people say: ' + ' | '.join(it['example_utterances']))
        for other, rule in sorted(it.get('disambiguation', {}).items()):
            out.append(f'NOT {other}: {rule}')
        if it.get('urgency'):
            out.append(f"urgency: {it['urgency']}")
        if it.get('note'):
            out.append(f"note: {it['note']}")
        out.append('')
    return '\n'.join(out)


SYSTEM = """You route Halifax 311 requests. A resident describes a problem in their own \
words - often a raw voice transcript with filler words, false starts and no punctuation. \
You pick the one municipal form that request belongs on.

Rules:
- Choose only from the intent ids in the catalogue below. Never invent one.
- The `NOT <other>` lines are the cases that actually get confused. Read them before \
deciding between two similar intents. Two axes cause most errors: park vs. street, and \
new installation vs. repair of something existing.
- `confidence` is your real belief that a 311 agent would file it on this form:
  >=0.8 the wording maps cleanly onto one intent;
  0.5-0.8 it fits but a sibling intent is defensible;
  <0.5 you are guessing, or the request is not a 311 service request at all.
- `alternatives` lists the runner-up intent ids, best first, whenever anything else is \
plausible. The app shows these to the user, so an honest second guess is more useful \
than false certainty.
- `location_text` is only the part naming where the problem is (street, intersection, \
landmark). Leave it empty if they never said. Do not invent an address.
- `title` is a short headline a coordinator can scan in a list: 8-100 characters, \
naming the thing and the problem. No leading article, no trailing period.
- `details` is a clean one or two sentence description of the problem for a municipal \
worker to read. Strip filler and self-corrections, keep every concrete fact.
- `is_emergency` is true only for immediate danger to life or property - active flooding, \
a blocked fire lane, a tree on a house, a live wire. Those need dispatch, not a queue.

Catalogue:

"""


class Route(BaseModel):
    intent_id: str = Field(description='Chosen intent id from the catalogue')
    confidence: float = Field(ge=0, le=1)
    alternatives: list[str] = Field(default_factory=list, description='Runner-up intent ids, best first')
    title: str = Field(description='Short headline for the report, 8-100 characters')
    location_text: str = Field(default='', description='Where the problem is, as stated')
    details: str = Field(description='Cleaned description for the municipal worker')
    is_emergency: bool = False
    reasoning: str = Field(default='', description='One short sentence on why this form')


def _system_blocks() -> list[dict[str, Any]]:
    # One cached block: identical on every request, so it is a cache hit after the first.
    return [{'type': 'text', 'text': SYSTEM + catalog(), 'cache_control': {'type': 'ephemeral'}}]


def route(transcript: str) -> Route:
    resp = _client.messages.parse(
        model=MODEL,
        max_tokens=2000,
        output_config={'effort': EFFORT},
        system=_system_blocks(),
        messages=[{'role': 'user', 'content': transcript}],
        output_format=Route,
    )
    r = resp.parsed_output
    valid = {i['intent_id'] for i in load()[0]}
    if r.intent_id not in valid:              # schema can't constrain to the live catalogue
        raise ValueError(f'model returned unknown intent {r.intent_id!r}')
    r.alternatives = [a for a in r.alternatives if a in valid and a != r.intent_id]
    return r


# ------------------------------------------------------------------- slot extraction

# Fields build_submission() fills from the profile or the routed text, so the slot
# extractor must not also ask the model for them.
STANDARD = {
    'first_name', 'last_name', 'email', 'phone', 'unit_apartment',
    'approximate_location', 'approx_location', 'details_of_request', 'details',
    'civic_address[address_line1]', 'civic_address[country_code]',
    'address[address_line1]', 'address[country_code]',
}


def slot_fields(intent_id: str) -> list[dict]:
    """Fields on this form that the profile and the details box cannot cover."""
    _, forms = load()
    return [f for f in forms[intent_id]['fields']
            if f['name'] not in STANDARD and f['type'] != 'file']


def extract_slots(intent_id: str, transcript: str) -> dict[str, Any]:
    """Pull this form's specific values out of the transcript.

    Returns only what the resident actually said. Missing required fields come back
    absent, not guessed - the app asks about those.
    """
    fields = slot_fields(intent_id)
    if not fields:
        return {}

    # Every field is a string with "" meaning "not stated". A nullable union plus an
    # enum is rejected by the API (the enum members must match the declared type), and
    # an empty-string sentinel keeps one shape for all field kinds.
    props, described = {}, []
    for f in fields:
        if f.get('options'):
            props[f['name']] = {'type': 'string', 'enum': [*f['options'], '']}
            described.append(f"{f['name']} ({f['label']}) - one of: {', '.join(f['options'])}")
        elif f['type'] == 'number':
            props[f['name']] = {'type': 'string', 'description': 'a number, as digits'}
            described.append(f"{f['name']} ({f['label']}) - a number")
        else:
            props[f['name']] = {'type': 'string'}
            described.append(f"{f['name']} ({f['label']})")

    intents, _ = load()
    it = next(i for i in intents if i['intent_id'] == intent_id)
    hints = '\n'.join(f'- {k}: {v}' for k, v in (it.get('slot_extraction') or {}).items())

    prompt = (
        f"Form: {it['display_name']}\n\nFields:\n" + '\n'.join(f'- {d}' for d in described)
        + (f'\n\nNotes:\n{hints}' if hints else '')
        + "\n\nResident said:\n" + transcript
        + "\n\nReturn a value for each field the resident actually gave. Use an empty "
          "string for anything they did not say - never guess, and never pick the "
          "closest enum option unless their words clearly match it."
    )

    resp = _client.messages.create(
        model=MODEL,
        max_tokens=2000,
        output_config={
            'effort': EFFORT,
            'format': {'type': 'json_schema', 'schema': {
                'type': 'object', 'properties': props,
                'required': list(props), 'additionalProperties': False}},
        },
        messages=[{'role': 'user', 'content': prompt}],
    )
    text = next(b.text for b in resp.content if b.type == 'text')
    return {k: v for k, v in json.loads(text).items() if v not in (None, '')}


# ----------------------------------------------------------------- submission shape

def build_submission(r: Route, profile: dict, slots: dict | None = None) -> dict:
    """Merge profile + routed text + extracted slots into one form payload.

    Also reports what is still missing, so the UI knows whether it can submit or
    has to ask a follow-up question.
    """
    _, forms = load()
    form = forms[r.intent_id]
    names = {f['name'] for f in form['fields']}
    values: dict[str, Any] = {}

    for src, dst in (('first_name', 'first_name'), ('last_name', 'last_name'),
                     ('email', 'email'), ('phone', 'phone')):
        if profile.get(src) and dst in names:
            values[dst] = profile[src]

    for key in ('civic_address[address_line1]', 'address[address_line1]'):
        if key in names and (r.location_text or profile.get('address')):
            values[key] = r.location_text or profile['address']
            break
    if 'unit_apartment' in names and profile.get('unit'):
        values['unit_apartment'] = profile['unit']
    for key in ('civic_address[country_code]', 'address[country_code]'):
        if key in names:
            values[key] = 'CA'

    for key in ('details_of_request', 'details'):
        if key in names:
            values[key] = r.details
            break
    for key in ('approximate_location', 'approx_location'):
        if key in names and r.location_text:
            values[key] = r.location_text
            break

    values.update(slots or {})

    missing = [f['name'] for f in form['fields']
               if f['required'] and f['type'] != 'file' and not values.get(f['name'])]
    return {
        'form': {'slug': form['slug'], 'name': form['name'], 'url': form['url'],
                 'template': form['template']},
        'values': values,
        'missing_required': missing,
        'ready_to_submit': not missing,
    }


# ------------------------------------------------------------------------------ cli

if __name__ == '__main__':
    text = ' '.join(sys.argv[1:]) or sys.stdin.read()
    r = route(text)
    print(f'-> {r.intent_id}  (confidence {r.confidence:.2f})')
    print('   title:', r.title)
    if r.alternatives:
        print('   or:', ', '.join(r.alternatives))
    if r.is_emergency:
        print('   EMERGENCY - route to dispatch')
    print('   where:', r.location_text or '(not stated)')
    print('   what :', r.details)
    if r.reasoning:
        print('   why  :', r.reasoning)

    slots = extract_slots(r.intent_id, text)
    if slots:
        print('   slots:', json.dumps(slots, ensure_ascii=False))

    sub = build_submission(r, {'first_name': 'Test', 'last_name': 'Resident',
                               'email': 't@example.com', 'phone': '902-555-0100'}, slots)
    print()
    print(json.dumps(sub, ensure_ascii=False, indent=2))
