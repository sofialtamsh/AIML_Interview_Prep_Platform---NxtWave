"""Groups MLE-family interview questions into interview-prep themes (rule-based, auditable)."""
import json
import re
import sys
from collections import Counter, defaultdict

OUT = sys.argv[1]
qs = json.load(open(f'{OUT}/mle-questions.json', encoding='utf-8'))
ALL_COS = {q['company'] for q in qs}


def has(q, pattern, fields=('topic', 'subtopic', 'text', 'skills')):
    blob = ' '.join(' '.join(q[f]) if isinstance(q[f], list) else str(q[f]) for f in fields).lower()
    return re.search(pattern, blob) is not None


def theme(q):
    dom, qt = q['domain'], q['qtype']
    if dom in ('Frontend', 'Full Stack', 'Full Stack With GenAI', 'Full Stack With AI/ML', 'Business Analytics', 'Product Management'):
        return 'OUT', 'not MLE'
    project = qt in ('Projects Discussion', 'Project Assignment') or has(q, r'\byour project|project (overview|explanation|experience|architecture)|walk ?through', ('topic', 'subtopic'))
    if dom == 'HR/General' and not project:
        if has(q, r'relocat|joining|salary|ctc|location|availab|notice|offer'):
            return 'HR', 'Logistics: relocation, joining, CTC'
        if has(q, r'intern|work experience|experience'):
            return 'HR', 'Internship and experience story'
        if has(q, r'strength|weakness|motivat|goal|why|career|company|challeng|fail|conflict|team'):
            return 'HR', 'Motivation, strengths and behavioural'
        return 'HR', 'Self-introduction and background'
    if project:
        if has(q, r'architect|deploy|scal|latenc|docker|cloud|infra|pipeline|workflow|system'):
            return 'PROJECT', 'Architecture, deployment and scale'
        if has(q, r'metric|accura|evaluat|precision|recall|result|perform|improv'):
            return 'PROJECT', 'Evaluation and results'
        if has(q, r'model|algorithm|llm|embedding|choice|select|why .* (use|choose)|alternativ|tech stack|justif'):
            return 'PROJECT', 'Model and tool choices, and why'
        if has(q, r'data|dataset|preprocess|clean|feature|label'):
            return 'PROJECT', 'Data and preprocessing'
        if has(q, r'challeng|problem fac|blocker|difficult|issue|debug|limitation'):
            return 'PROJECT', 'Challenges and what you would change'
        return 'PROJECT', 'Problem statement and overview'
    genai = dom == 'GenAI' or any(s in ('RAG', 'LLM', 'Vector Databases', 'AI Agents', 'LangChain', 'Prompt Engineering', 'Generative AI', 'Agentic Frameworks') for s in q['skills'])
    if genai:
        if has(q, r'chunk|segment'):
            return 'GENAI', 'Chunking'
        if has(q, r're-?rank|hybrid|bm25|retriev|rag|grounded|top-?k'):
            return 'GENAI', 'RAG pipeline and retrieval'
        if has(q, r'embed|vector|similar|cosine|faiss|chroma|pinecone|milvus|semantic search'):
            return 'GENAI', 'Embeddings and vector search'
        if has(q, r'agent|langchain|langgraph|crew|orchestrat|tool call|function call|mcp'):
            return 'GENAI', 'Agents and LLM frameworks'
        if has(q, r'fine-?tun|lora|peft|train'):
            return 'GENAI', 'Fine-tuning vs RAG'
        if has(q, r'prompt|temperature|sampling|hallucinat|guardrail|token limit|context window|few-?shot'):
            return 'GENAI', 'Prompting, parameters and hallucinations'
        return 'GENAI', 'LLM fundamentals'
    if dom in ('AI/ML', 'Data Science', 'Computer Vision'):
        if has(q, r'nlp|text|token|sentiment|tf-?idf|bag of words|word2vec|bert|language model|stemm|lemmat|speech'):
            return 'DL', 'NLP and sequence models'
        if has(q, r'cnn|convolution|image|vision|detect|yolo|iou|opencv|segmentation|pixel|ocr|blur'):
            return 'DL', 'Computer vision and CNNs'
        if has(q, r'neural|deep learning|backprop|activation|perceptron|rnn|lstm|transformer|attention|epoch|batch|dropout'):
            return 'DL', 'Neural network fundamentals'
        if has(q, r'metric|precision|recall|f1|roc|auc|confusion|accuracy|imbalanc|mse|rmse|mae|r2|r-squared'):
            return 'EVAL', 'Classification and regression metrics'
        if has(q, r'overfit|underfit|bias|variance|regulari|generaliz|cross-?valid|lasso|ridge'):
            return 'MLCORE', 'Overfitting, bias-variance and regularization'
        if has(q, r'gradient|loss|learning rate|optimi|cost function'):
            return 'MLCORE', 'Training: loss and gradient descent'
        if has(q, r'random forest|decision tree|bagging|boosting|xgboost|ensemble|gini|entropy'):
            return 'ALGO', 'Decision trees and ensembles'
        if has(q, r'linear regression|logistic|regression'):
            return 'ALGO', 'Linear and logistic regression'
        if has(q, r'knn|k-nearest|svm|support vector|naive bayes'):
            return 'ALGO', 'KNN, SVM and Naive Bayes'
        if has(q, r'cluster|k-?means|pca|dimension|unsupervised|anomal'):
            return 'ALGO', 'Clustering and PCA'
        if has(q, r'missing|imput|outlier|duplicat|scal|normaliz|encod|feature|eda|pandas|loc|merge|concat|group ?by|clean'):
            return 'DATA', 'Data cleaning and feature engineering'
        if has(q, r'statist|hypothes|probab|distribution|deviation|mean|median|p-?value|correlat'):
            return 'DATA', 'Statistics for ML'
        if has(q, r'model selection|algorithm choice|choose|select|which model|matching model'):
            return 'EVAL', 'Choosing and improving a model'
        if has(q, r'supervised|unsupervised|reinforcement|ai vs|machine learning|definition|core concept|types of'):
            return 'MLCORE', 'AI, ML and learning types'
        if has(q, r'recommend'):
            return 'ALGO', 'Recommendation systems'
        return 'MLCORE', 'Other ML concepts'
    if dom in ('Programming Language', 'Programming', 'Python', 'Programming Languages'):
        if q['qtype'] == 'Coding' or q['coding'] not in ('Not Applicable', 'Unspecified'):
            return 'PYTHON', 'Coding round: strings, lists, numbers'
        if has(q, r'class|object|oop|inherit|polymorph|encapsul'):
            return 'PYTHON', 'OOP in Python'
        return 'PYTHON', 'Core Python concepts'
    if dom == 'DSA':
        return 'PYTHON', 'DSA problems'
    if dom == 'Database':
        return 'SQL', 'SQL and databases'
    if dom == 'Backend':
        return 'DEPLOY', 'APIs and FastAPI'
    if dom in ('System Design', 'DevOps', 'Cloud', 'Software Design'):
        return 'DEPLOY', 'System design, Docker and cloud'
    if dom in ('CS Fundamentals', 'Networking', 'Operating Systems', 'Computer Science', 'Version Control', 'Software Testing'):
        return 'CS', 'CS fundamentals and Git'
    if dom in ('Aptitude/Logical Reasoning', 'Aptitude'):
        return 'APT', 'Aptitude'
    return 'OTHER', dom


for q in qs:
    q['theme'], q['sub'] = theme(q)


def band(q):
    mx = q['ctc_max'] if q['ctc_max'] is not None else q['ctc_min']
    return 'unknown' if mx is None else ('8+' if mx >= 8 else '<8')


cos_by_band = defaultdict(set)
for q in qs:
    cos_by_band[band(q)].add(q['company'])

agg = defaultdict(lambda: {'n': 0, 'cos': set(), 'hard': 0, 'easy': 0, 'band': Counter(), 'bandcos': defaultdict(set), 'samples': []})
for q in qs:
    for key in (q['theme'], f"{q['theme']} / {q['sub']}"):
        a = agg[key]
        a['n'] += 1
        a['cos'].add(q['company'])
        a['hard'] += q['diff'] == 'Hard'
        a['easy'] += q['diff'] == 'Easy'
        a['band'][band(q)] += 1
        a['bandcos'][band(q)].add(q['company'])
        if '/' in key and len(a['samples']) < 4 and len(q['text']) < 220:
            a['samples'].append(f"[{q['diff'] or '-'}·{q['company'][:18]}] {q['text']}")

N = len(ALL_COS)
lines = [f'MLE family: {len(qs)} questions, {N} companies (<8: {len(cos_by_band["<8"])}, 8+: {len(cos_by_band["8+"])})']
for key in sorted(agg, key=lambda k: (k.split(' / ')[0], -agg[k]['n'] if '/' in k else -10**9)):
    a = agg[key]
    pc = 100 * len(a['cos']) / N
    lt8 = 100 * len(a['bandcos']['<8']) / max(1, len(cos_by_band['<8']))
    ge8 = 100 * len(a['bandcos']['8+']) / max(1, len(cos_by_band['8+']))
    indent = '    ' if '/' in key else ''
    lines.append(f"{indent}{key}: {a['n']}q · {len(a['cos'])}co ({pc:.0f}%) · <8 {lt8:.0f}% · 8+ {ge8:.0f}% · hard {100*a['hard']/a['n']:.0f}% · easy {100*a['easy']/a['n']:.0f}%")
    for s in a['samples']:
        lines.append(f'        - {s}')
open(f'{OUT}/themes.txt', 'w', encoding='utf-8').write('\n'.join(lines))
json.dump(qs, open(f'{OUT}/mle-themed.json', 'w', encoding='utf-8'), ensure_ascii=False)
print('\n'.join(l for l in lines if not l.strip().startswith('- ')))
