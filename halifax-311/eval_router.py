#!/usr/bin/env python3
"""Score the LLM router on the held-out set and report what it cost.

    python3 eval_router.py            # all of data/eval_holdout.jsonl
    python3 eval_router.py 20         # first 20 only (cheaper smoke test)

Every run spends real money. 68 utterances is roughly $0.30-0.60.
"""
import json, os, sys, time
from concurrent.futures import ThreadPoolExecutor

import router

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
SET = 'eval_holdout.jsonl'
args = sys.argv[1:]
if args and args[0].endswith('.jsonl'):
    SET = args.pop(0)
rows = [json.loads(l) for l in open(os.path.join(D, SET))]
if args:
    rows = rows[:int(args[0])]

usage = []


def _patched_route(text):
    """route() but keeping the usage record so we can report real cost."""
    resp = router._client.messages.parse(
        model=router.MODEL, max_tokens=2000,
        output_config={'effort': router.EFFORT},
        system=router._system_blocks(),
        messages=[{'role': 'user', 'content': text}],
        output_format=router.Route,
    )
    usage.append(resp.usage)
    return resp.parsed_output


# Warm the cache once, serially, so the parallel batch reads it instead of
# each worker paying to write it.
print('warming cache...', flush=True)
_patched_route(rows[0]['utterance'])

t0 = time.time()
with ThreadPoolExecutor(max_workers=6) as ex:
    results = list(ex.map(lambda r: _patched_route(r['utterance']), rows))
elapsed = time.time() - t0

row_axis = {r['utterance']: r.get('axis', '') for r in rows}
top1 = inlist = 0
misses = []
for row, got in zip(rows, results):
    want = row['expected_intent']
    if got.intent_id == want:
        top1 += 1
        inlist += 1
    elif want in got.alternatives:
        inlist += 1
        misses.append((row['utterance'], want, got.intent_id, got.confidence, 'in alternatives'))
    else:
        misses.append((row['utterance'], want, got.intent_id, got.confidence, 'missed'))

n = len(rows)
print(f'\n{SET}: {n} utterances, {elapsed:.0f}s wall')
print(f'top-1                : {top1}/{n} = {100*top1/n:.1f}%')
print(f'top-1 or alternatives: {inlist}/{n} = {100*inlist/n:.1f}%')

conf_right = [g.confidence for r, g in zip(rows, results) if g.intent_id == r['expected_intent']]
conf_wrong = [g.confidence for r, g in zip(rows, results) if g.intent_id != r['expected_intent']]
if conf_right:
    print(f'mean confidence when right: {sum(conf_right)/len(conf_right):.2f}')
if conf_wrong:
    print(f'mean confidence when wrong: {sum(conf_wrong)/len(conf_wrong):.2f}')

cin = sum(u.input_tokens for u in usage)
cread = sum(getattr(u, 'cache_read_input_tokens', 0) or 0 for u in usage)
cwrite = sum(getattr(u, 'cache_creation_input_tokens', 0) or 0 for u in usage)
cout = sum(u.output_tokens for u in usage)
cost = cin/1e6*5 + cread/1e6*0.5 + cwrite/1e6*6.25 + cout/1e6*25
print(f'\ntokens: uncached-in {cin}  cache-read {cread}  cache-write {cwrite}  out {cout}')
print(f'cache hit rate: {100*cread/max(cread+cwrite+cin,1):.0f}% of input served from cache')
print(f'approx cost: ${cost:.2f}  (${cost/len(usage):.4f} per call)')

if misses:
    print(f'\n--- {len(misses)} not top-1 ---')
    for u, want, got, c, kind in misses:
        print(f'  [{kind}] conf {c:.2f}  {u[:64]!r}')
        print(f'     want={want}  got={got}' + (f"  [{row_axis.get(u,'')}]" if row_axis.get(u) else ''))
