#!/usr/bin/env python3
"""Demo server: the OpenHFX report screen with a live model behind it.

Serves the repository so the reference mockup still opens at its usual path, and
adds one endpoint the demo page calls:

    POST /api/route  {"transcript": "..."}  ->  a ReportSuggestion-shaped object
                                                plus the Halifax form it maps to

    export ANTHROPIC_API_KEY=...
    python3 halifax-311/demo/server.py            # http://127.0.0.1:8768/

Without a key it still runs: the endpoint answers from a fixture and says so in
the payload, so the page never claims a live model run that did not happen.
"""
from __future__ import annotations

import json
import os
import sys
import traceback
from functools import lru_cache
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
PKG = os.path.dirname(HERE)               # halifax-311/
REPO = os.path.dirname(PKG)               # repository root
sys.path.insert(0, PKG)

PORT = int(os.environ.get('PORT', '8768'))
LIVE = bool(os.environ.get('ANTHROPIC_API_KEY'))

# Stand-in profile. A real app takes these from the signed-in resident.
PROFILE = {'first_name': 'Demo', 'last_name': 'Resident',
           'email': 'demo.resident@example.com', 'phone': '902-555-0100'}

FIXTURE = {
    'live': False,
    'title': 'Branch blocking the walkway',
    'summary': 'A large branch is blocking the walkway and people using wheelchairs cannot get past.',
    'category': 'trees',
    'prioritySuggestion': 'priority',
    'clarificationQuestions': [],
    'halifax': {'intentId': 'trees', 'confidence': 0.91, 'alternatives': ['obstructions'],
                'formSlug': 'trees', 'formName': 'Trees',
                'formUrl': 'https://www.halifax.ca/home/online-services/trees',
                'prefill': {}, 'missingRequired': []},
}


@lru_cache(maxsize=1)
def categories() -> dict[str, str]:
    path = os.path.join(PKG, 'data', 'category_map.json')
    return {m['intent_id']: m['category'] for m in json.load(open(path))['mappings']}


@lru_cache(maxsize=1)
def urgency_intents() -> set[str]:
    path = os.path.join(PKG, 'data', 'intents.json')
    return {i['intent_id'] for i in json.load(open(path))['intents'] if i.get('urgency')}


def field_label(slug: str, name: str) -> str:
    import router
    form = router.load()[1][slug]
    for f in form['fields']:
        if f['name'] == name:
            return f['label'] or name
    return name


def suggest(transcript: str) -> dict:
    """One transcript in, one ReportSuggestion-shaped object out."""
    if not LIVE:
        return dict(FIXTURE, note='No API key set - this is a fixture, not a model run.')

    import router
    r = router.route(transcript)
    slots = router.extract_slots(r.intent_id, transcript)
    sub = router.build_submission(r, PROFILE, slots)

    if r.is_emergency or any('(DISPATCH)' in str(v) for v in slots.values()):
        priority = 'urgent'
    elif r.intent_id in urgency_intents():
        priority = 'priority'
    else:
        priority = 'standard'

    # Their contract allows at most two questions, 160 characters each. Each one is a
    # required field the resident did not cover, phrased from the form's own label.
    questions = [f'What is the {field_label(r.intent_id, n).lower()}?'[:160]
                 for n in sub['missing_required'][:2]]

    return {
        'live': True,
        'title': r.title,
        'summary': r.details,
        'category': categories().get(r.intent_id, 'other'),
        'prioritySuggestion': priority,
        'clarificationQuestions': questions,
        'halifax': {
            'intentId': r.intent_id,
            'confidence': round(r.confidence, 2),
            'alternatives': r.alternatives,
            'formSlug': sub['form']['slug'],
            'formName': sub['form']['name'],
            'formUrl': sub['form']['url'],
            'locationText': r.location_text,
            'prefill': sub['values'],
            'missingRequired': sub['missing_required'],
            'readyToSubmit': sub['ready_to_submit'],
        },
    }


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=REPO, **kw)

    def _send(self, code: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path in ('/', '/index.html'):
            self.path = '/halifax-311/demo/index.html'
        return super().do_GET()

    def do_POST(self):
        if self.path != '/api/route':
            return self._send(404, {'error': 'not found'})
        try:
            n = int(self.headers.get('Content-Length') or 0)
            text = (json.loads(self.rfile.read(n) or b'{}').get('transcript') or '').strip()
        except Exception:
            return self._send(400, {'error': 'bad JSON body'})
        if len(text) < 20:
            return self._send(400, {'error': 'Describe the problem in at least 20 characters.'})
        try:
            self._send(200, suggest(text))
        except Exception as e:
            traceback.print_exc()
            self._send(502, {'error': f'{type(e).__name__}: {e}'})

    def log_message(self, fmt, *args):
        if 'api/route' in (args[0] if args else ''):
            super().log_message(fmt, *args)


if __name__ == '__main__':
    mode = 'LIVE (claude-opus-5)' if LIVE else 'FIXTURE (no ANTHROPIC_API_KEY)'
    print(f'mode      : {mode}')
    print(f'demo      : http://127.0.0.1:{PORT}/')
    print(f'reference : http://127.0.0.1:{PORT}/docs/design/reference.html')
    ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
