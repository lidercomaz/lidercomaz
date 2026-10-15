"""Normalize DLE JSON exports (from dump_to_json.py) into compact rows for Supabase.

Usage: python3 -I clean_posts.py <data_dir> <lang> <out_dir>
Writes <out_dir>/<lang>/categories.json and posts.json.
"""
import html
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ALLOWED = {
    'p', 'br', 'b', 'strong', 'i', 'em', 'u', 'a', 'img', 'div', 'span', 'iframe',
    'ul', 'ol', 'li', 'blockquote', 'h2', 'h3', 'h4', 'table', 'thead', 'tbody',
    'tr', 'td', 'th', 'pre', 'code',
}
VOID = {'br', 'img'}
IFRAME_HOSTS = re.compile(r'^https://(www\.)?(youtube\.com|youtube-nocookie\.com|player\.vimeo\.com|www\.facebook\.com|ok\.ru|vk\.com|rutube\.ru)/')
# Category names broken in the source DB, fixed to match the site menu.
CATEGORY_NAME_FIX = {('ru', 1): 'Повестка дня'}
COLOR = re.compile(r'color:\s*(#[0-9a-fA-F]{3,6}|[a-z]+)')


class Sanitizer(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.out = []
        self.stack = []  # (tag, emitted) for every open non-void tag

    def _attrs(self, tag, attrs):
        a = dict(attrs)
        keep = []
        if tag == 'a':
            href = a.get('href') or ''
            if href.startswith(('http://', 'https://', '/', 'mailto:')):
                keep.append(('href', href))
                if not href.startswith('/') and 'lider.com.az' not in href:
                    keep += [('target', '_blank'), ('rel', 'noopener nofollow')]
        elif tag == 'img':
            keep += [('src', a.get('src', '')), ('alt', a.get('alt') or ''), ('loading', 'lazy')]
        elif tag == 'iframe':
            keep += [(k, a[k]) for k in ('src', 'width', 'height', 'allow', 'title') if a.get(k)]
            keep.append(('allowfullscreen', None))
        elif tag == 'span':
            m = COLOR.search(a.get('style') or '')
            if m:
                keep.append(('style', f'color:{m.group(1)}'))
        elif tag in ('td', 'th'):
            keep += [(k, a[k]) for k in ('colspan', 'rowspan') if a.get(k)]
        return keep

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        emit = tag in ALLOWED
        if tag == 'a' and 'highslide' in (a.get('class') or ''):
            emit = False  # unwrap lightbox links, keep the inner <img>
        elif tag == 'iframe' and not IFRAME_HOSTS.match(a.get('src') or ''):
            emit = False
        elif tag == 'span' and not COLOR.search(a.get('style') or ''):
            emit = False
        if emit:
            parts = ''.join(f' {k}' if v is None else f' {k}="{html.escape(v, quote=True)}"' for k, v in self._attrs(tag, attrs))
            self.out.append(f'<{tag}{parts}>')
        if tag not in VOID:
            self.stack.append((tag, emit))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                for t, emit in reversed(self.stack[i:]):
                    if emit:
                        self.out.append(f'</{t}>')
                del self.stack[i:]
                return

    def handle_data(self, data):
        self.out.append(data)

    def handle_entityref(self, name):
        self.out.append(f'&{name};')

    def handle_charref(self, name):
        self.out.append(f'&#{name};')

    def result(self):
        for t, emit in reversed(self.stack):
            if emit:
                self.out.append(f'</{t}>')
        return ''.join(self.out)


def sanitize(src: str) -> str:
    s = src.replace('\\"', '"').replace("\\'", "'")
    # leftover BBCode bold typed by editors (sometimes unclosed: "[/b<br>")
    s = re.sub(r'\[b\]', '<b>', s, flags=re.I)
    s = re.sub(r'\[/b\]?', '</b>', s, flags=re.I)
    s = re.sub(r'<!--.*?-->', '', s, flags=re.S)
    p = Sanitizer()
    p.feed(s)
    p.close()
    s = p.result()
    s = s.replace('\xa0', ' ').replace('&nbsp;', ' ')
    s = re.sub(r'<(b|strong|i|em|u|span|div|p)(\s[^>]*)?>\s*</\1>', '', s)
    s = re.sub(r'(?:\s*<br>\s*){3,}', '<br><br>', s)
    s = re.sub(r'^(?:\s*<br>\s*)+|(?:\s*<br>\s*)+$', '', s)
    s = re.sub(r'[ \t]{2,}', ' ', s)
    return s.strip()


def text_len(h: str) -> int:
    return len(re.sub(r'\s+', '', re.sub(r'<[^>]+>', '', h)))


def first_image(h: str):
    m = re.search(r'<img[^>]+src="([^"]+)"', h)
    return html.unescape(m.group(1)) if m else None


def clean_text(s: str) -> str:
    s = html.unescape(s.replace('\\"', '"').replace("\\'", "'"))
    return re.sub(r'\s+', ' ', s).strip()


def main(data_dir, lang, out_dir):
    src = Path(data_dir) / lang
    out = Path(out_dir) / lang
    out.mkdir(parents=True, exist_ok=True)

    cats = json.loads((src / 'dle_category.json').read_text())
    categories = [
        {'lang': lang, 'id': c['id'], 'parent_id': c['parentid'] or None, 'name': CATEGORY_NAME_FIX.get((lang, c['id'])) or clean_text(c['name']),
         'slug': c['alt_name'], 'position': c['posi'], 'description': clean_text(c['descr']) or None}
        for c in sorted(cats, key=lambda c: c['id'])
    ]
    cat_ids = {c['id'] for c in categories}

    views = {e['news_id']: e['news_read'] for e in json.loads((src / 'dle_post_extras.json').read_text())}
    posts = []
    for r in json.loads((src / 'dle_post.json').read_text()):
        short, full = sanitize(r['short_story']), sanitize(r['full_story'])
        if text_len(full) >= 50:
            body = full
        elif full and (img := first_image(full)) and img not in short:
            body = f'<img src="{html.escape(img, quote=True)}" alt="" loading="lazy"><br>{short}'
        else:
            body = short
        xf = dict(x.split('|', 1) for x in r['xfields'].split('||') if '|' in x)
        ids = [int(x) for x in r['category'].split(',') if x.strip().isdigit() and int(x) in cat_ids]
        posts.append({
            'lang': lang,
            'id': r['id'],
            'slug': r['alt_name'] or str(r['id']),
            'title': clean_text(r['title']),
            'title_extra': clean_text(xf.get('red', '')) or None,
            'is_red': xf.get('qirmizi') == '1',
            'excerpt': clean_text(r['descr']) or None,
            'body': body,
            'image': first_image(short) or first_image(full),
            'category_ids': ids,
            'author': r['autor'] or None,
            'published_at': r['date'].replace(' ', 'T') + '+04:00',
            'is_published': r['approve'] == 1,
            'is_pinned': r['fixed'] == 1,
            'show_on_main': r['allow_main'] == 1,
            'views': views.get(r['id'], 0),
            'keywords': clean_text(r['keywords']) or None,
        })
    posts.sort(key=lambda p: p['published_at'], reverse=True)

    (out / 'categories.json').write_text(json.dumps(categories, ensure_ascii=False, indent=0))
    (out / 'posts.json').write_text(json.dumps(posts, ensure_ascii=False, separators=(',', ':')))
    before = sum(len(r['short_story']) + len(r['full_story']) for r in json.loads((src / 'dle_post.json').read_text()))
    after = sum(len(p['body']) for p in posts)
    print(f'{lang}: {len(categories)} categories, {len(posts)} posts, body {before/1e6:.1f}MB -> {after/1e6:.1f}MB, no image: {sum(1 for p in posts if not p["image"])}')


if __name__ == '__main__':
    main(*sys.argv[1:4])
