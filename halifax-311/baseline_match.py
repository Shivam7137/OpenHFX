#!/usr/bin/env python3
"""Keyword baseline for Halifax 311 intent routing.

Not the production matcher - it is the FLOOR. Run it to get a recognition-rate
number the LLM/embedding router must beat, and to catch dataset regressions.

    python3 baseline_match.py                 # score the bundled eval set
    python3 baseline_match.py "my street is flooded"
"""
import json, re, sys, os
from collections import defaultdict

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
INTENTS = json.load(open(os.path.join(D, 'intents.json')))['intents']

STOP = set('the a an is are was were be been on in at to of for my our your this that it '
           'there and or i we you they he she has have had can could would please someone '
           'get got very really just all over near by with from into out up down not no'.split())

def toks(s):
    return [w for w in re.findall(r"[a-z']+", s.lower()) if w not in STOP and len(w) > 2]

def score(text):
    tk = toks(text)
    tset = set(tk)
    blob = ' ' + ' '.join(tk) + ' '
    out = defaultdict(float)
    for it in INTENTS:
        s = 0.0
        for kw in it['keywords']:
            kwt = toks(kw)
            if not kwt:
                continue
            if len(kwt) > 1:
                # phrase match is high signal
                if ' ' + ' '.join(kwt) + ' ' in blob:
                    s += 3.0 + 0.5 * len(kwt)
                elif set(kwt) <= tset:
                    s += 1.5
            elif kwt[0] in tset:
                s += 2.0
        for w in toks(it['display_name']):
            if w in tset:
                s += 1.0
        for w in toks(it['official_summary']):
            if w in tset:
                s += 0.25
        if s:
            out[it['intent_id']] = s
    return sorted(out.items(), key=lambda x: -x[1])

def evaluate(fname='eval_utterances.jsonl'):
    rows = [json.loads(l) for l in open(os.path.join(D, fname))]
    top1 = top3 = 0
    misses = []
    for r in rows:
        rank = [i for i, _ in score(r['utterance'])]
        if rank[:1] == [r['expected_intent']]:
            top1 += 1
        if r['expected_intent'] in rank[:3]:
            top3 += 1
        else:
            misses.append((r['utterance'], r['expected_intent'], rank[:3]))
    n = len(rows)
    print(f'[{fname}] {n} utterances across {len({r["expected_intent"] for r in rows})} intents')
    print(f'top-1 accuracy: {top1}/{n} = {100*top1/n:.1f}%')
    print(f'top-3 accuracy: {top3}/{n} = {100*top3/n:.1f}%')
    if misses:
        print(f'\nnot in top-3 ({len(misses)}):')
        for u, exp, got in misses:
            print(f'  {u[:62]!r}\n     want={exp}  got={got}')

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--holdout':
        evaluate('eval_holdout.jsonl')
    elif len(sys.argv) > 1 and sys.argv[1] == '--all':
        evaluate('eval_utterances.jsonl'); print(); evaluate('eval_holdout.jsonl')
    elif len(sys.argv) > 1:
        for iid, s in score(' '.join(sys.argv[1:]))[:5]:
            print(f'{s:6.2f}  {iid}')
    else:
        evaluate()
