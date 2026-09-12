# -*- coding: utf-8 -*-
import json, re, collections, os
from kb import KB

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
BASE = 'https://www.halifax.ca'
HERE = os.path.dirname(os.path.abspath(__file__))
svcs = json.load(open(os.path.join(HERE, 'services_with_forms.json')))

def slug(u): return u.rstrip('/').split('/')[-1]

CONTACT = {'first_name','last_name','email','phone'}
LOCATION = {'civic_address[address_line1]','civic_address[country_code]','unit_apartment','approximate_location'}
DETAILS = {'details_of_request'}
ATTACH = {'files[attachments]','files[attachments][]'}
STD = CONTACT | LOCATION | DETAILS | ATTACH

def norm_label(l):
    return re.sub(r'\s*\*\s*$', '', (l or '')).strip()

def field_out(f):
    o = {'name': f['name'], 'label': norm_label(f.get('label')), 'type': f['type'],
         'required': bool(f['required'])}
    for k in ('placeholder', 'description', 'maxlength', 'autocomplete'):
        if f.get(k): o[k] = f[k]
    if f.get('options'):
        opts = [x['label'] for x in f['options']
                if x['label'] and not re.match(r'^\s*-?\s*(None|Select|Please Select)', x['label'], re.I)]
        if opts: o['options'] = opts
    if f['type'] in ('radio', 'checkbox') and f.get('value'):
        o['value'] = f['value']
    return o

def merge_radios(fields):
    """Collapse repeated radio groups into one field with options."""
    out, groups = [], collections.OrderedDict()
    for f in fields:
        if f['type'] == 'radio':
            groups.setdefault(f['name'], []).append(f)
        else:
            out.append(f)
    for name, g in groups.items():
        base = dict(g[0]); base['type'] = 'radio'
        base['options'] = [{'value': x.get('value'), 'label': norm_label(x.get('label'))} for x in g]
        base['label'] = name.replace('_', ' ').strip().capitalize()
        base['required'] = any(x['required'] for x in g)
        base.pop('value', None)
        out.append(base)
    return out

catalog, forms, intents, evals = [], [], [], []

for s in svcs:
    sl = slug(s['url'])
    url = BASE + s['url'] if s['url'].startswith('/') else s['url']
    entry = {'service_id': s['service_id'], 'slug': sl, 'name': s['name'],
             'type': s['type'], 'url': url, 'summary': s['summary'],
             'categories': s['categories'],
             'submittable_form': bool(s['page']['fields'])}
    catalog.append(entry)

    if not s['page']['fields']:
        continue

    fields = merge_radios(s['page']['fields'])
    names = {f['name'] for f in fields}
    is_std = STD.issuperset(names) and CONTACT.issubset(names)
    extra = [f for f in fields if f['name'] not in STD]

    forms.append({
        'slug': sl, 'service_id': s['service_id'], 'name': s['name'], 'url': url,
        'webform_id': s['page'].get('form_id'),
        'submit_action': s['page'].get('form_action'),
        'template': 'standard_311_request' if is_std else 'custom',
        'has_attachments': bool(names & ATTACH),
        'sections': s['page']['sections'],
        'fields': [field_out(f) for f in fields],
        'specific_fields': [field_out(f) for f in extra],
    })

    k = KB[sl]
    it = {'intent_id': sl, 'form_slug': sl, 'service_id': s['service_id'],
          'display_name': s['name'], 'url': url,
          'official_summary': s['summary'], 'categories': s['categories'],
          'keywords': k['kw'], 'example_utterances': k['ex'],
          'disambiguation': k.get('vs', {})}
    if k.get('slots'): it['slot_extraction'] = k['slots']
    if k.get('urgency'): it['urgency'] = k['urgency']
    if k.get('note'): it['note'] = k['note']
    intents.append(it)

    for e in k['ex']:
        evals.append({'utterance': e, 'expected_intent': sl, 'lang': 'en'})

# ---- shared field templates -------------------------------------------------
std_forms = [f for f in forms if f['template'] == 'standard_311_request']
proto = None
for f in std_forms:
    if f['has_attachments']:
        proto = f; break
templates = {
    'standard_311_request': {
        'description': ('Shared template used by %d of %d Halifax 311 webforms. '
                        'Contact block + civic address + free-text details (+ optional photo). '
                        'Fill this once from the user profile; only the free-text details and the '
                        'location change per request.') % (len(std_forms), len(forms)),
        'used_by': sorted(f['slug'] for f in std_forms),
        'fields': proto['fields'] if proto else [],
        'blocks': {
            'contact': sorted(CONTACT),
            'location': sorted(LOCATION),
            'details': sorted(DETAILS),
            'attachments': sorted(ATTACH),
        },
    }
}

os.makedirs(OUT, exist_ok=True)
def dump(n, o):
    p = os.path.join(OUT, n)
    json.dump(o, open(p, 'w'), ensure_ascii=False, indent=2)
    print(n, os.path.getsize(p), 'bytes')

dump('services_catalog.json', {'source': BASE + '/home/online-services',
                               'scraped': '2026-09-12', 'count': len(catalog),
                               'services': catalog})
dump('forms.json', {'count': len(forms), 'forms': forms})
dump('intents.json', {'count': len(intents), 'intents': intents})
dump('field_templates.json', templates)
with open(os.path.join(OUT, 'eval_utterances.jsonl'), 'w') as fh:
    for e in evals:
        fh.write(json.dumps(e, ensure_ascii=False) + '\n')
print('eval_utterances.jsonl', len(evals), 'examples')
print('\nforms:', len(forms), '| standard:', len(std_forms), '| custom:', len(forms) - len(std_forms))
print('catalog:', len(catalog), '| intents:', len(intents))
