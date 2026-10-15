"""Parse a DLE MySQL dump (.sql.gz) and export selected tables to JSON."""
import gzip, json, re, sys
from pathlib import Path

ESC = {'0': '\0', 'n': '\n', 'r': '\r', 't': '\t', 'Z': '\x1a', 'b': '\b'}
INSERT_RE = re.compile(r'^INSERT INTO `(\w+)` \(([^)]*)\) VALUES ')


def parse_values(s, i):
    rows, n = [], len(s)
    while i < n:
        c = s[i]
        if c == '(':
            row, i = [], i + 1
            while True:
                c = s[i]
                if c == "'":
                    i += 1
                    buf = []
                    while True:
                        c = s[i]
                        if c == '\\':
                            nx = s[i + 1]
                            buf.append(ESC.get(nx, nx))
                            i += 2
                        elif c == "'":
                            if s[i + 1] == "'":
                                buf.append("'")
                                i += 2
                            else:
                                i += 1
                                break
                        else:
                            j = i
                            while s[j] not in "\\'":
                                j += 1
                            buf.append(s[i:j])
                            i = j
                    row.append(''.join(buf))
                elif c in ',':
                    i += 1
                elif c == ')':
                    i += 1
                    break
                else:
                    j = i
                    while s[j] not in ',)':
                        j += 1
                    tok = s[i:j].strip()
                    row.append(None if tok == 'NULL' else (int(tok) if re.fullmatch(r'-?\d+', tok) else tok))
                    i = j
            rows.append(row)
        elif c == ';':
            break
        else:
            i += 1
    return rows


def main(dump, out_dir, tables):
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    data = {t: [] for t in tables}
    with gzip.open(dump, 'rt', encoding='utf-8') as f:
        for line in f:
            m = INSERT_RE.match(line)
            if not m or m.group(1) not in data:
                continue
            cols = [c.strip(' `') for c in m.group(2).split(',')]
            for r in parse_values(line, m.end()):
                data[m.group(1)].append(dict(zip(cols, r)))
    for t, rows in data.items():
        (out / f'{t}.json').write_text(json.dumps(rows, ensure_ascii=False, default=str))
        print(t, len(rows))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3].split(','))
