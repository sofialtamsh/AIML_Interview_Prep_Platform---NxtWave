"""Decodes the Hiring Intelligence export into plain records (data only, never executed)."""
import json
import sys
from collections import Counter

F = dict(OPP=0, COMPANY=1, ROLE=2, DOMAIN=3, SKILLS=4, TOPIC=5, SUBTOPIC=6, QTYPE=7,
         CODING=8, ROUND=9, DIFF=10, DATE=11, TEXT=12)
DIFF = ['Easy', 'Medium', 'Hard']


def load(path):
    d = json.load(open(path, encoding='utf-8'))
    D = d['dicts']
    opps = d['opportunities']
    qs = []
    for q in d['questions']:
        opp = opps[q[F['OPP']]]
        qs.append({
            'opp': q[F['OPP']],
            'company': D['company'][q[F['COMPANY']]],
            'role': D['role'][q[F['ROLE']]],
            'domain': D['domain'][q[F['DOMAIN']]],
            'skills': [D['skill'][s] for s in q[F['SKILLS']]],
            'topic': D['topic'][q[F['TOPIC']]],
            'subtopic': q[F['SUBTOPIC']] or '',
            'qtype': D['qtype'][q[F['QTYPE']]],
            'coding': D['coding'][q[F['CODING']]],
            'round': D['round'][q[F['ROUND']]],
            'diff': DIFF[q[F['DIFF']]] if q[F['DIFF']] is not None and q[F['DIFF']] >= 0 else '',
            'date': D['date'][q[F['DATE']]],
            'text': q[F['TEXT']],
            'ctc_min': opp.get('mn'), 'ctc_max': opp.get('mx'),
        })
    return d, qs


if __name__ == '__main__':
    d, qs = load(sys.argv[1])
    D = d['dicts']
    # Role titles: opportunities, companies and questions per title.
    opp_by_role = Counter()
    for o in d['opportunities']:
        for r in o['roles']:
            opp_by_role[D['role'][r]] += 1
    q_by_role = Counter(q['role'] for q in qs)
    co_by_role = {}
    for q in qs:
        co_by_role.setdefault(q['role'], set()).add(q['company'])
    rows = sorted(opp_by_role, key=lambda r: -q_by_role.get(r, 0))
    for r in rows:
        print(f"{q_by_role.get(r, 0):5d}q {opp_by_role[r]:3d}opp {len(co_by_role.get(r, ())):3d}co  {r}")
