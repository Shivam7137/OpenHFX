#!/usr/bin/env python3
"""Step 1: scrape the Halifax online-services catalogue and every service page.

    python3 fetch.py            # -> ./_cache/*.html + services_with_forms.json
    python3 build.py            # -> ../data/*.json

Re-run fetch.py to refresh; pages already in _cache are skipped.
"""
import json, os, re, html, time, shutil, subprocess, urllib.request

BASE = 'https://www.halifax.ca'
INDEX = BASE + '/home/online-services'
UA = ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')
CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '_cache')

CATS = {'1001': 'Apply & Register', '1238': 'Contact & Request', '1051': 'File a Report',
        '1237': 'Find, Maps, and Open Data', '1234': 'Mayor & Council',
        '1239': 'Parks & Recreation', '1031': 'Payments', '1242': 'Permits & Licenses',
        '1246': 'Street Maintenance, Parking, and Traffic'}


def get(url, path):
    if os.path.exists(path) and os.path.getsize(path) > 1000:
        return open(path, encoding='utf-8', errors='ignore').read()
    # curl first: some corporate/proxy TLS chains break urllib's verification
    if shutil.which('curl'):
        r = subprocess.run(['curl', '-sL', '--max-time', '30', '-A', UA, '-o', path, url],
                           capture_output=True)
        if r.returncode != 0 or not os.path.exists(path) or os.path.getsize(path) < 1000:
            raise RuntimeError('curl failed (%s) for %s' % (r.returncode, url))
    else:
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        body = urllib.request.urlopen(req, timeout=30).read().decode('utf-8', 'ignore')
        open(path, 'w', encoding='utf-8').write(body)
    time.sleep(0.3)
    return open(path, encoding='utf-8', errors='ignore').read()


def clean(x):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'(?s)<[^>]+>', ' ', x or ''))).strip()


def main():
    os.makedirs(CACHE, exist_ok=True)
    idx = get(INDEX, os.path.join(CACHE, '_index.html'))

    services = []
    for part in idx.split('class="o-shadow-elevation-16dp-hfa ')[1:]:
        hdr = part.split('">')[0]
        m = re.search(r'(?s)views-field-field-ols-title.*?<a href="([^"]+)"[^>]*>(.*?)</a>', part)
        if not m:
            continue
        t = re.search(r'(?s)views-field-field-ols-type.*?<span class="label">([^<]*)</span>', part)
        d = re.search(r'(?s)views-field-field-ols-summary.*?<div class="field-content">(.*?)</div>', part)
        sid = re.search(r'service-(\d+)', hdr)
        cids = re.findall(r'category-(\d+)', hdr)
        services.append({'service_id': sid.group(1) if sid else None,
                         'name': clean(m.group(2)), 'url': m.group(1),
                         'type': clean(t.group(1)) if t else None,
                         'summary': clean(d.group(1)) if d else '',
                         'category_ids': cids,
                         'categories': [CATS.get(c, c) for c in cids]})
    print('catalogue:', len(services), 'services')

    import parse_form
    out = []
    for s in services:
        s['slug'] = re.sub(r'[^a-z0-9]+', '_', s['url'].strip('/').lower())[:80]
        url = BASE + s['url'] if s['url'].startswith('/') else s['url']
        path = os.path.join(CACHE, s['slug'] + '.html')
        try:
            get(url, path)
            s['page'] = parse_form.parse(path)
        except Exception as e:
            print('  FAIL', s['name'], e)
            s['page'] = {'title': None, 'form_action': None, 'form_id': None,
                         'sections': [], 'fields': []}
        out.append(s)

    dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'services_with_forms.json')
    json.dump(out, open(dst, 'w'), ensure_ascii=False, indent=1)
    print('with webform:', sum(1 for x in out if x['page']['fields']), '->', dst)


if __name__ == '__main__':
    main()
