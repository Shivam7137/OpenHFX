import re, html, json, sys

def clean(x):
    x = re.sub(r'(?s)<[^>]+>', ' ', x or '')
    return re.sub(r'\s+', ' ', html.unescape(x)).strip()

def attrs(tag):
    return dict((m.group(1).lower(), html.unescape(m.group(2)))
                for m in re.finditer(r'([\w:-]+)\s*=\s*"([^"]*)"', tag))

def parse(path):
    s = open(path, encoding='utf-8', errors='ignore').read()
    i = s.find('id="main-content"')
    seg = s[i:] if i > 0 else s
    f = seg.find('<footer')
    if f > 0: seg = seg[:f]
    seg = re.sub(r'(?is)<(script|style|svg)[^>]*>.*?</\1>', ' ', seg)

    # labels: for -> text
    labels = {}
    for m in re.finditer(r'(?is)<label[^>]*\bfor="([^"]+)"[^>]*>(.*?)</label>', seg):
        labels[m.group(1)] = clean(m.group(2))

    # descriptions near element ids
    descs = {}
    for m in re.finditer(r'(?is)id="([^"]*?)--description"[^>]*>(.*?)</div>', seg):
        descs[m.group(1)] = clean(m.group(2))

    fields = []
    # inputs
    for m in re.finditer(r'(?is)<input\b([^>]*)>', seg):
        a = attrs(m.group(0))
        t = a.get('type', 'text').lower()
        if t in ('hidden', 'submit', 'button', 'image'): continue
        nm = a.get('name')
        if not nm: continue
        fid = a.get('id', '')
        lab = labels.get(fid) or clean(a.get('title') or a.get('placeholder') or '')
        fields.append({
            'name': nm, 'id': fid, 'type': t,
            'label': lab,
            'required': ('required' in m.group(1).lower()) or bool(a.get('data-msg-required')),
            'placeholder': a.get('placeholder'),
            'maxlength': a.get('maxlength'),
            'value': a.get('value') if t in ('radio', 'checkbox') else None,
            'autocomplete': a.get('autocomplete'),
            'description': descs.get(fid),
        })
    # textareas
    for m in re.finditer(r'(?is)<textarea\b([^>]*)>', seg):
        a = attrs(m.group(0)); nm = a.get('name')
        if not nm: continue
        fid = a.get('id', '')
        fields.append({'name': nm, 'id': fid, 'type': 'textarea',
                       'label': labels.get(fid, ''),
                       'required': 'required' in m.group(1).lower() or bool(a.get('data-msg-required')),
                       'placeholder': a.get('placeholder'), 'maxlength': a.get('maxlength'),
                       'description': descs.get(fid)})
    # selects with options
    for m in re.finditer(r'(?is)<select\b([^>]*)>(.*?)</select>', seg):
        a = attrs('<select' + m.group(1) + '>'); nm = a.get('name')
        if not nm: continue
        fid = a.get('id', '')
        opts = [{'value': om.group(1), 'label': clean(om.group(2))}
                for om in re.finditer(r'(?is)<option[^>]*value="([^"]*)"[^>]*>(.*?)</option>', m.group(2))]
        fields.append({'name': nm, 'id': fid, 'type': 'select',
                       'label': labels.get(fid, ''),
                       'required': 'required' in m.group(1).lower() or bool(a.get('data-msg-required')),
                       'options': opts, 'multiple': 'multiple' in m.group(1).lower(),
                       'description': descs.get(fid)})

    # fieldset / section headings
    sections = [clean(x) for x in re.findall(r'(?is)<legend[^>]*>(.*?)</legend>', seg)]
    title = clean((re.search(r'(?is)<h1[^>]*>(.*?)</h1>', seg) or [None, ''])[1])
    form_tag = re.search(r'(?is)<form\b([^>]*)>', seg)
    fa = attrs('<form' + form_tag.group(1) + '>') if form_tag else {}
    return {'title': title, 'form_action': fa.get('action'), 'form_id': fa.get('id'),
            'sections': sections, 'fields': fields}

if __name__ == '__main__':
    for p in sys.argv[1:]:
        print('='*70); print(p)
        print(json.dumps(parse(p), ensure_ascii=False, indent=1))
