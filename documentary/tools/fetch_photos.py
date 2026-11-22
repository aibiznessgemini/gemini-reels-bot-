"""fetch_photos.py — download public-domain archive images from Wikimedia Commons for one film.

  python3 tools/fetch_photos.py --out ../photos/2026-11-23_eiffel-tower-con \
      --q "Victor Lustig" --q "Eiffel Tower 1925" --per 6 [--allow-by]

Only files whose licence is Public Domain or CC0 are kept (with --allow-by also CC BY, never BY-SA/NC/ND:
share-alike would bind the whole video). Every file is listed with source page, author and licence in
CREDITS.md + credits.json inside the folder, so the film's description can credit it.
Images are saved as 1280 px wide (a standard Commons thumbnail step) JPG/PNG thumbnails (enough for a photo lying on the board)."""
import argparse, json, os, re, sys, time, urllib.parse, urllib.request

API = 'https://commons.wikimedia.org/w/api.php'
UA = 'DocumentaryBoardBot/1.0 (https://meta.wikimedia.org/wiki/User-Agent_policy; educational use) python-urllib'


def get(url, binary=False):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    for k in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read()
                return data if binary else json.loads(data)
        except Exception as e:  # noqa
            if k == 3: raise
            time.sleep(2 + 3 * k)


def strip(html):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', html or '')).strip()


def licence_ok(m, allow_by):
    lic = (m.get('LicenseShortName', {}).get('value') or '').lower()
    usage = (m.get('UsageTerms', {}).get('value') or '').lower()
    s = lic + ' ' + usage
    if any(x in s for x in ('-sa', 'by-sa', 'share', '-nc', '-nd', 'non-commercial', 'fair use', 'copyrighted')): return None
    if 'public domain' in s or s.startswith('pd') or ' pd' in s or 'cc0' in s or 'no restrictions' in s: return 'PD/CC0'
    if allow_by and re.search(r'cc[ -]by(?![ -]?sa)', s): return lic.upper()
    return None


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--out', required=True); ap.add_argument('--q', action='append', required=True)
    ap.add_argument('--per', type=int, default=6); ap.add_argument('--allow-by', action='store_true'); ap.add_argument('--width', type=int, default=1280)
    a = ap.parse_args(); os.makedirs(a.out, exist_ok=True)
    cpath = os.path.join(a.out, 'credits.json')
    credits = json.load(open(cpath)) if os.path.exists(cpath) else []
    have = {c['title'] for c in credits}
    for q in a.q:
        params = {'action': 'query', 'format': 'json', 'generator': 'search', 'gsrsearch': q + ' filetype:bitmap', 'gsrnamespace': 6,
                  'gsrlimit': 40, 'prop': 'imageinfo', 'iiprop': 'url|extmetadata|size|mime', 'iiurlwidth': a.width}
        d = get(API + '?' + urllib.parse.urlencode(params))
        pages = sorted(d.get('query', {}).get('pages', {}).values(), key=lambda p: p.get('index', 99))
        got = 0
        for p in pages:
            if got >= a.per: break
            ii = (p.get('imageinfo') or [{}])[0]; m = ii.get('extmetadata', {})
            if p['title'] in have or ii.get('mime') not in ('image/jpeg', 'image/png', 'image/tiff'): continue
            if min(ii.get('width', 0), ii.get('height', 0)) < 500: continue
            lic = licence_ok(m, a.allow_by)
            if not lic: continue
            url = ii.get('thumburl') or ii['url']
            ext = '.png' if url.lower().endswith('.png') else '.jpg'
            slug = re.sub(r'[^a-z0-9]+', '-', p['title'].split(':', 1)[1].rsplit('.', 1)[0].lower()).strip('-')[:60]
            fn = f'{len(credits) + 1:02d}_{slug}{ext}'
            with open(os.path.join(a.out, fn), 'wb') as f: f.write(get(url, binary=True))
            credits.append({'file': fn, 'title': p['title'], 'query': q, 'page': ii.get('descriptionurl'), 'licence': lic,
                            'licence_name': strip(m.get('LicenseShortName', {}).get('value')), 'author': strip(m.get('Artist', {}).get('value'))[:160],
                            'date': strip(m.get('DateTimeOriginal', {}).get('value'))[:40], 'description': strip(m.get('ImageDescription', {}).get('value'))[:240]})
            have.add(p['title']); got += 1; time.sleep(1.5)
            print(f'  + {fn}  [{lic}]')
        print(f'"{q}": {got} file(s)')
        time.sleep(1)
    json.dump(credits, open(cpath, 'w'), indent=1, ensure_ascii=False)
    with open(os.path.join(a.out, 'CREDITS.md'), 'w') as f:
        f.write('# Image credits (Wikimedia Commons)\n\n| file | source | author | licence | date |\n|---|---|---|---|---|\n')
        for c in credits: f.write(f"| {c['file']} | {c['page']} | {c['author'] or '—'} | {c['licence_name'] or c['licence']} | {c['date'] or '—'} |\n")
    print(f'{len(credits)} images in {a.out}')


if __name__ == '__main__':
    main()
