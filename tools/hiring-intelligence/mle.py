"""MLE-family interview analysis from the Hiring Intelligence export."""
import json
import re
import sys
from collections import Counter, defaultdict

sys.path.insert(0, sys.argv[2])
from decode import load  # noqa: E402

d, qs = load(sys.argv[1])
OUT = sys.argv[2]

EXCLUDE = re.compile(r'full ?-?stack|web|mern|prompt|automation|business|product|strategist|frontend|backend|edi|analyst', re.I)
TIER_A = re.compile(r'\bml\b|ai/ ?ml|ai / ml|machine learning|data scien|ds/ml|data & ml|computer vision|data science', re.I)
TIER_B = re.compile(r'\bai\b|gen ?ai', re.I)


def tier(role):
    if EXCLUDE.search(role):
        return None
    if TIER_A.search(role):
        return 'A'
    if TIER_B.search(role):
        return 'B'
    return None


for q in qs:
    q['tier'] = tier(q['role'])

roles = defaultdict(Counter)
for q in qs:
    if q['tier']:
        roles[q['tier']][q['role']] += 1


def band(q):
    mx = q['ctc_max'] if q['ctc_max'] is not None else q['ctc_min']
    if mx is None:
        return 'unknown'
    return '8+' if mx >= 8 else '<8'


def report(sel, name, out):
    p = lambda *a: print(*a, file=out)  # noqa: E731
    opps = {q['opp'] for q in sel}
    cos = {q['company'] for q in sel}
    p(f'\n######## {name}: {len(sel)} questions · {len(opps)} opportunities · {len(cos)} companies')
    ob = Counter()
    for o in opps:
        oo = d['opportunities'][o]
        mx = oo.get('mx') if oo.get('mx') is not None else oo.get('mn')
        ob['unknown' if mx is None else ('8+' if mx >= 8 else '<8')] += 1
    p('opportunities by CTC band:', dict(ob))
    p('companies:', ', '.join(sorted(cos)))

    def table(key, title, n=40, by_company=True):
        c = Counter(q[key] for q in sel)
        cc = defaultdict(set)
        for q in sel:
            cc[q[key]].add(q['company'])
        p(f'\n== {title} (questions · companies)')
        for k, v in c.most_common(n):
            p(f'  {v:5d} · {len(cc[k]):3d}co  {k}')

    table('round', 'Rounds')
    table('qtype', 'Question type')
    table('coding', 'Coding / assignment type')
    table('domain', 'Domain')
    table('diff', 'Difficulty')
    sk = Counter(s for q in sel for s in q['skills'])
    skc = defaultdict(set)
    for q in sel:
        for s in q['skills']:
            skc[s].add(q['company'])
    p('\n== Skills (questions · companies)')
    for k, v in sk.most_common(60):
        p(f'  {v:5d} · {len(skc[k]):3d}co  {k}')

    # Topics within each domain, with company coverage, plus subtopics.
    p('\n== Topics by domain (questions · companies) with top subtopics')
    by_dom = defaultdict(list)
    for q in sel:
        by_dom[q['domain']].append(q)
    for dom, items in sorted(by_dom.items(), key=lambda kv: -len(kv[1])):
        p(f'\n-- {dom} ({len(items)}q)')
        tc = Counter(q['topic'] for q in items)
        tco = defaultdict(set)
        sub = defaultdict(Counter)
        for q in items:
            tco[q['topic']].add(q['company'])
            if q['subtopic']:
                sub[q['topic']][q['subtopic']] += 1
        for t, v in tc.most_common(30):
            subs = ', '.join(f'{s} ({n})' for s, n in sub[t].most_common(6))
            p(f'  {v:4d} · {len(tco[t]):3d}co  {t}  ::  {subs}')


with open(f'{OUT}/mle-report.txt', 'w', encoding='utf-8') as out:
    for t in ('A', 'B'):
        print(f'\nTier {t} role titles:', file=out)
        for r, n in roles[t].most_common():
            print(f'  {n:4d}  {r}', file=out)
    A = [q for q in qs if q['tier'] == 'A']
    B = [q for q in qs if q['tier'] == 'B']
    report(A, 'TIER A (ML titles)', out)
    report(B, 'TIER B (AI titles)', out)
    report(A + B, 'MLE FAMILY (A+B)', out)
    report([q for q in A + B if band(q) == '<8'], 'MLE FAMILY · under 8 LPA', out)
    report([q for q in A + B if band(q) == '8+'], 'MLE FAMILY · 8+ LPA', out)

# Questions for later reading (MLE family only).
json.dump([q for q in qs if q['tier']], open(f'{OUT}/mle-questions.json', 'w', encoding='utf-8'), ensure_ascii=False)
print('done', sum(1 for q in qs if q['tier'] == 'A'), sum(1 for q in qs if q['tier'] == 'B'))
