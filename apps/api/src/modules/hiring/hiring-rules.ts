/**
 * The rules behind docs/11-mle-interview-evidence.md, ported from tools/hiring-intelligence
 * (mle.py: which job titles are the ML Engineer family; cluster.py: which interview-prep theme a
 * question belongs to). They are deliberately plain keyword rules, so every number can be traced
 * back to the questions that produced it. Keep both copies in step.
 */
import type { HiringCtcBand, HiringFamily } from '../../generated/prisma/enums.ts';

const EXCLUDE =
  /full ?-?stack|web|mern|prompt|automation|business|product|strategist|frontend|backend|edi|analyst/i;
const ML_TITLE =
  /\bml\b|ai\/ ?ml|ai \/ ml|machine learning|data scien|ds\/ml|data & ml|computer vision|data science/i;
const AI_TITLE = /\bai\b|gen ?ai/i;

/** ML_TITLE (tier A), AI_TITLE (tier B) or null (not the ML Engineer family). */
export function familyOf(title: string): HiringFamily | null {
  if (EXCLUDE.test(title)) return null;
  if (ML_TITLE.test(title)) return 'ML_TITLE';
  if (AI_TITLE.test(title)) return 'AI_TITLE';
  return null;
}

/** An opening's family: the strongest of its job titles. */
export function familyOfAll(titles: string[]): HiringFamily | null {
  const families = titles.map(familyOf);
  if (families.includes('ML_TITLE')) return 'ML_TITLE';
  if (families.includes('AI_TITLE')) return 'AI_TITLE';
  return null;
}

/** The CTC band, from the maximum CTC (or the minimum when only that is known). */
export function bandOf(min: number | null, max: number | null): HiringCtcBand | null {
  const top = max ?? min;
  if (top === null) return null;
  return top >= 8 ? 'FROM_8_LPA' : 'UNDER_8_LPA';
}

export interface ThemeInput {
  domain: string;
  questionType: string;
  codingType: string;
  topic: string;
  subtopic: string;
  text: string;
  skills: string[];
}

type Field = 'topic' | 'subtopic' | 'text' | 'skills';
const ALL_FIELDS: Field[] = ['topic', 'subtopic', 'text', 'skills'];

const GENAI_SKILLS = new Set([
  'RAG',
  'LLM',
  'Vector Databases',
  'AI Agents',
  'LangChain',
  'Prompt Engineering',
  'Generative AI',
  'Agentic Frameworks',
]);
const NOT_MLE = new Set([
  'Frontend',
  'Full Stack',
  'Full Stack With GenAI',
  'Full Stack With AI/ML',
  'Business Analytics',
  'Product Management',
]);

/**
 * Every interview-prep theme the rules can return. `themeOf` only accepts these names, so the
 * content-coverage map (modules/coverage/coverage-map.ts) is checked against them by the compiler.
 */
export const PREP_THEMES = [
  'Self-introduction and background',
  'Internship and experience story',
  'Motivation, strengths and behavioural',
  'Logistics: relocation, joining, CTC',
  'Aptitude',
  'Problem statement and overview',
  'Architecture, deployment and scale',
  'Model and tool choices, and why',
  'Evaluation and results',
  'Data and preprocessing',
  'Challenges and what you would change',
  'Core Python concepts',
  'OOP in Python',
  'Coding round: strings, lists, numbers',
  'DSA problems',
  'AI, ML and learning types',
  'Training: loss and gradient descent',
  'Overfitting, bias-variance and regularization',
  'Other ML concepts',
  'Data cleaning and feature engineering',
  'Statistics for ML',
  'Linear and logistic regression',
  'Decision trees and ensembles',
  'KNN, SVM and Naive Bayes',
  'Clustering and PCA',
  'Recommendation systems',
  'Classification and regression metrics',
  'Choosing and improving a model',
  'Neural network fundamentals',
  'Computer vision and CNNs',
  'NLP and sequence models',
  'LLM fundamentals',
  'Prompting, parameters and hallucinations',
  'Agents and LLM frameworks',
  'Embeddings and vector search',
  'RAG pipeline and retrieval',
  'Chunking',
  'Fine-tuning vs RAG',
  'SQL and databases',
  'APIs and FastAPI',
  'System design, Docker and cloud',
  'CS fundamentals and Git',
] as const;
export type PrepTheme = (typeof PREP_THEMES)[number];

/** Theme group → the curriculum topic it is taught in. */
const GROUP_TOPIC: Record<string, string> = {
  HR: 'self-introduction-hr',
  APT: 'self-introduction-hr',
  PROJECT: 'project-deep-dive',
  PYTHON: 'python-for-interviews',
  MLCORE: 'ml-fundamentals',
  DATA: 'data-preparation',
  ALGO: 'supervised-learning',
  EVAL: 'model-evaluation',
  DL: 'deep-learning',
  SQL: 'sql-for-interviews',
  DEPLOY: 'model-deployment',
  CS: 'model-deployment',
};
/** GenAI themes split across three topics. */
const GENAI_TOPIC: Partial<Record<PrepTheme, string>> = {
  Chunking: 'rag',
  'RAG pipeline and retrieval': 'rag',
  'Fine-tuning vs RAG': 'rag',
  'Embeddings and vector search': 'embeddings-vector-search',
  'Agents and LLM frameworks': 'llms-agents',
  'Prompting, parameters and hallucinations': 'llms-agents',
  'LLM fundamentals': 'llms-agents',
};

/** Every curriculum topic slug the rules can point at (a test checks they all exist). */
export const PREP_TOPIC_SLUGS = [
  ...new Set([...Object.values(GROUP_TOPIC), ...Object.values(GENAI_TOPIC)]),
];

export interface Theme {
  /** e.g. "Self-introduction and background", or null outside the ML Engineer prep themes. */
  theme: string | null;
  prepTopicSlug: string | null;
}

/** The interview-prep theme of one question (cluster.py `theme`). */
export function themeOf(q: ThemeInput): Theme {
  const blobs = new Map<string, string>();
  const has = (pattern: RegExp, fields: Field[] = ALL_FIELDS) => {
    const key = fields.join(',');
    let blob = blobs.get(key);
    if (blob === undefined) {
      blob = fields
        .map((f) => (f === 'skills' ? q.skills.join(' ') : q[f]))
        .join(' ')
        .toLowerCase();
      blobs.set(key, blob);
    }
    return pattern.test(blob);
  };
  const out = (group: string, theme: PrepTheme): Theme => ({
    theme,
    prepTopicSlug: group === 'GENAI' ? (GENAI_TOPIC[theme] ?? null) : (GROUP_TOPIC[group] ?? null),
  });

  const { domain: dom, questionType: qt } = q;
  if (NOT_MLE.has(dom)) return { theme: null, prepTopicSlug: null };
  const project =
    qt === 'Projects Discussion' ||
    qt === 'Project Assignment' ||
    has(/\byour project|project (overview|explanation|experience|architecture)|walk ?through/, [
      'topic',
      'subtopic',
    ]);
  if (dom === 'HR/General' && !project) {
    if (has(/relocat|joining|salary|ctc|location|availab|notice|offer/))
      return out('HR', 'Logistics: relocation, joining, CTC');
    if (has(/intern|work experience|experience/))
      return out('HR', 'Internship and experience story');
    if (has(/strength|weakness|motivat|goal|why|career|company|challeng|fail|conflict|team/))
      return out('HR', 'Motivation, strengths and behavioural');
    return out('HR', 'Self-introduction and background');
  }
  if (project) {
    if (has(/architect|deploy|scal|latenc|docker|cloud|infra|pipeline|workflow|system/))
      return out('PROJECT', 'Architecture, deployment and scale');
    if (has(/metric|accura|evaluat|precision|recall|result|perform|improv/))
      return out('PROJECT', 'Evaluation and results');
    if (
      has(
        /model|algorithm|llm|embedding|choice|select|why .* (use|choose)|alternativ|tech stack|justif/,
      )
    )
      return out('PROJECT', 'Model and tool choices, and why');
    if (has(/data|dataset|preprocess|clean|feature|label/))
      return out('PROJECT', 'Data and preprocessing');
    if (has(/challeng|problem fac|blocker|difficult|issue|debug|limitation/))
      return out('PROJECT', 'Challenges and what you would change');
    return out('PROJECT', 'Problem statement and overview');
  }
  if (dom === 'GenAI' || q.skills.some((s) => GENAI_SKILLS.has(s))) {
    if (has(/chunk|segment/)) return out('GENAI', 'Chunking');
    if (has(/re-?rank|hybrid|bm25|retriev|rag|grounded|top-?k/))
      return out('GENAI', 'RAG pipeline and retrieval');
    if (has(/embed|vector|similar|cosine|faiss|chroma|pinecone|milvus|semantic search/))
      return out('GENAI', 'Embeddings and vector search');
    if (has(/agent|langchain|langgraph|crew|orchestrat|tool call|function call|mcp/))
      return out('GENAI', 'Agents and LLM frameworks');
    if (has(/fine-?tun|lora|peft|train/)) return out('GENAI', 'Fine-tuning vs RAG');
    if (
      has(/prompt|temperature|sampling|hallucinat|guardrail|token limit|context window|few-?shot/)
    )
      return out('GENAI', 'Prompting, parameters and hallucinations');
    return out('GENAI', 'LLM fundamentals');
  }
  if (dom === 'AI/ML' || dom === 'Data Science' || dom === 'Computer Vision') {
    if (
      has(
        /nlp|text|token|sentiment|tf-?idf|bag of words|word2vec|bert|language model|stemm|lemmat|speech/,
      )
    )
      return out('DL', 'NLP and sequence models');
    if (has(/cnn|convolution|image|vision|detect|yolo|iou|opencv|segmentation|pixel|ocr|blur/))
      return out('DL', 'Computer vision and CNNs');
    if (
      has(
        /neural|deep learning|backprop|activation|perceptron|rnn|lstm|transformer|attention|epoch|batch|dropout/,
      )
    )
      return out('DL', 'Neural network fundamentals');
    if (
      has(
        /metric|precision|recall|f1|roc|auc|confusion|accuracy|imbalanc|mse|rmse|mae|r2|r-squared/,
      )
    )
      return out('EVAL', 'Classification and regression metrics');
    if (has(/overfit|underfit|bias|variance|regulari|generaliz|cross-?valid|lasso|ridge/))
      return out('MLCORE', 'Overfitting, bias-variance and regularization');
    if (has(/gradient|loss|learning rate|optimi|cost function/))
      return out('MLCORE', 'Training: loss and gradient descent');
    if (has(/random forest|decision tree|bagging|boosting|xgboost|ensemble|gini|entropy/))
      return out('ALGO', 'Decision trees and ensembles');
    if (has(/linear regression|logistic|regression/))
      return out('ALGO', 'Linear and logistic regression');
    if (has(/knn|k-nearest|svm|support vector|naive bayes/))
      return out('ALGO', 'KNN, SVM and Naive Bayes');
    if (has(/cluster|k-?means|pca|dimension|unsupervised|anomal/))
      return out('ALGO', 'Clustering and PCA');
    if (
      has(
        /missing|imput|outlier|duplicat|scal|normaliz|encod|feature|eda|pandas|loc|merge|concat|group ?by|clean/,
      )
    )
      return out('DATA', 'Data cleaning and feature engineering');
    if (has(/statist|hypothes|probab|distribution|deviation|mean|median|p-?value|correlat/))
      return out('DATA', 'Statistics for ML');
    if (has(/model selection|algorithm choice|choose|select|which model|matching model/))
      return out('EVAL', 'Choosing and improving a model');
    if (
      has(
        /supervised|unsupervised|reinforcement|ai vs|machine learning|definition|core concept|types of/,
      )
    )
      return out('MLCORE', 'AI, ML and learning types');
    if (has(/recommend/)) return out('ALGO', 'Recommendation systems');
    return out('MLCORE', 'Other ML concepts');
  }
  if (
    dom === 'Programming Language' ||
    dom === 'Programming' ||
    dom === 'Python' ||
    dom === 'Programming Languages'
  ) {
    if (qt === 'Coding' || (q.codingType !== 'Not Applicable' && q.codingType !== 'Unspecified'))
      return out('PYTHON', 'Coding round: strings, lists, numbers');
    if (has(/class|object|oop|inherit|polymorph|encapsul/)) return out('PYTHON', 'OOP in Python');
    return out('PYTHON', 'Core Python concepts');
  }
  if (dom === 'DSA') return out('PYTHON', 'DSA problems');
  if (dom === 'Database') return out('SQL', 'SQL and databases');
  if (dom === 'Backend') return out('DEPLOY', 'APIs and FastAPI');
  if (dom === 'System Design' || dom === 'DevOps' || dom === 'Cloud' || dom === 'Software Design')
    return out('DEPLOY', 'System design, Docker and cloud');
  if (
    dom === 'CS Fundamentals' ||
    dom === 'Networking' ||
    dom === 'Operating Systems' ||
    dom === 'Computer Science' ||
    dom === 'Version Control' ||
    dom === 'Software Testing'
  )
    return out('CS', 'CS fundamentals and Git');
  if (dom === 'Aptitude/Logical Reasoning' || dom === 'Aptitude') return out('APT', 'Aptitude');
  return { theme: null, prepTopicSlug: null };
}
