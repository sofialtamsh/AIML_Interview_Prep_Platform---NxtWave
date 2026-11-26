/**
 * Which curriculum units teach each interview theme and each interview format. Admin → Content
 * coverage uses it to join the Hiring Intelligence data with the lessons.
 *
 * Units are "topic-slug/subtopic-slug" keys. A theme can span several units (e.g. SQL and
 * databases), and a theme no unit teaches maps to an empty list, which the page shows as a gap.
 * The compiler checks that every theme in hiring-rules.ts is listed; a test checks that every
 * unit exists in the ML Engineer curriculum.
 */
import type { PrepTheme } from '../hiring/hiring-rules.ts';

export type UnitKey = `${string}/${string}`;

export const THEME_UNITS: Record<PrepTheme, readonly UnitKey[]> = {
  'Self-introduction and background': ['self-introduction-hr/self-introduction'],
  'Internship and experience story': ['self-introduction-hr/internship-experience'],
  'Motivation, strengths and behavioural': ['self-introduction-hr/hr-behavioural'],
  'Logistics: relocation, joining, CTC': ['self-introduction-hr/hr-behavioural'],
  Aptitude: ['self-introduction-hr/aptitude-reasoning'],

  'Problem statement and overview': ['project-deep-dive/project-pitch'],
  'Model and tool choices, and why': ['project-deep-dive/project-choices'],
  'Data and preprocessing': ['project-deep-dive/project-choices'],
  'Evaluation and results': ['project-deep-dive/project-results'],
  'Architecture, deployment and scale': ['project-deep-dive/project-architecture'],
  'Challenges and what you would change': ['project-deep-dive/project-architecture'],

  'Core Python concepts': ['python-for-interviews/python-core-concepts'],
  'OOP in Python': ['python-for-interviews/python-oop'],
  'Coding round: strings, lists, numbers': ['python-for-interviews/python-coding-round'],
  'DSA problems': ['python-for-interviews/dsa-essentials'],

  'AI, ML and learning types': ['ml-fundamentals/ai-ml-learning-types'],
  'Training: loss and gradient descent': ['ml-fundamentals/loss-gradient-descent'],
  'Overfitting, bias-variance and regularization': [
    'ml-fundamentals/generalization-regularization',
  ],
  // A catch-all of AI/ML questions no other rule matched (voice bots, NumPy, data collection…).
  'Other ML concepts': [],

  'Data cleaning and feature engineering': [
    'data-preparation/missing-outliers-duplicates',
    'data-preparation/encoding-scaling-leakage',
    'data-preparation/pandas-wrangling',
  ],
  'Statistics for ML': ['data-preparation/statistics-for-ml'],

  'Linear and logistic regression': [
    'supervised-learning/linear-regression',
    'supervised-learning/logistic-regression',
  ],
  'Decision trees and ensembles': [
    'supervised-learning/decision-trees',
    'supervised-learning/random-forest-bagging',
    'supervised-learning/boosting',
  ],
  'KNN, SVM and Naive Bayes': [
    'supervised-learning/k-nearest-neighbors',
    'supervised-learning/support-vector-machines',
    'supervised-learning/naive-bayes',
  ],
  'Clustering and PCA': [
    'unsupervised-learning/k-means-clustering',
    'unsupervised-learning/hierarchical-dbscan',
    'unsupervised-learning/pca',
  ],
  'Recommendation systems': [],

  'Classification and regression metrics': [
    'model-evaluation/classification-metrics',
    'model-evaluation/regression-metrics',
  ],
  'Choosing and improving a model': ['model-evaluation/model-selection-tuning'],

  'Neural network fundamentals': [
    'deep-learning/neural-network-fundamentals',
    'deep-learning/training-deep-networks',
  ],
  'Computer vision and CNNs': ['deep-learning/cnn-computer-vision'],
  'NLP and sequence models': [
    'deep-learning/nlp-text-representation',
    'deep-learning/attention-transformers',
  ],

  'LLM fundamentals': ['llms-agents/how-llms-work'],
  'Prompting, parameters and hallucinations': ['llms-agents/prompting-hallucinations'],
  'Agents and LLM frameworks': ['llms-agents/agents-frameworks'],
  'Embeddings and vector search': [
    'embeddings-vector-search/what-are-embeddings',
    'embeddings-vector-search/similarity-measures',
    'embeddings-vector-search/vector-databases-ann',
  ],
  'RAG pipeline and retrieval': ['rag/rag-fundamentals', 'rag/retrieval-quality'],
  Chunking: ['rag/chunking-strategies'],
  'Fine-tuning vs RAG': ['rag/fine-tuning-vs-rag'],

  'SQL and databases': [
    'sql-for-interviews/sql-filter-aggregate',
    'sql-for-interviews/sql-joins-windows',
    'sql-for-interviews/database-fundamentals',
  ],
  'APIs and FastAPI': ['model-deployment/fastapi-model-serving'],
  'System design, Docker and cloud': [
    'model-deployment/docker-cloud-deployment',
    'model-deployment/ml-system-design-basics',
  ],
  'CS fundamentals and Git': ['model-deployment/git-engineering-basics'],
};

/**
 * Buckets for questions no specific rule matched. They have no unit by design: the evidence tab
 * lists them, but they are not raised as a gap, because they are a mix rather than one theme.
 */
export const CATCH_ALL_THEMES: ReadonlySet<PrepTheme> = new Set<PrepTheme>(['Other ML concepts']);

export interface FormatInput {
  questionType: string;
  codingType: string;
}

/**
 * The kinds of interview task, from the dashboard's question type and coding type. The first
 * matching format wins, so assignments are told apart from the coding inside them. Conceptual and
 * general questions are not a format: the themes cover them.
 */
export const INTERVIEW_FORMATS: ReadonlyArray<{
  key: string;
  label: string;
  matches: (q: FormatInput) => boolean;
  units: readonly UnitKey[];
}> = [
  {
    key: 'assignment',
    label: 'Take-home or live-build assignment',
    matches: (q) => q.questionType === 'Project Assignment' || /assignment/i.test(q.codingType),
    units: [],
  },
  {
    key: 'basic-coding',
    label: 'Live coding: basic problems',
    matches: (q) => q.codingType === 'Basic Coding' || q.codingType === 'Problem Solving',
    units: ['python-for-interviews/python-coding-round'],
  },
  {
    key: 'dsa',
    label: 'Live coding: DSA',
    matches: (q) => q.codingType === 'DSA Coding',
    units: ['python-for-interviews/dsa-essentials'],
  },
  {
    key: 'sql',
    label: 'Writing SQL queries',
    matches: (q) => q.codingType === 'SQL Query',
    units: ['sql-for-interviews/sql-filter-aggregate', 'sql-for-interviews/sql-joins-windows'],
  },
  {
    key: 'api',
    label: 'Building an API',
    matches: (q) => q.codingType === 'API Development',
    units: ['model-deployment/fastapi-model-serving'],
  },
  {
    key: 'debugging',
    label: 'Debugging a program',
    matches: (q) => /debug/i.test(q.codingType),
    units: [],
  },
  {
    key: 'project-discussion',
    label: 'Project discussion',
    matches: (q) => q.questionType === 'Projects Discussion',
    units: [
      'project-deep-dive/project-pitch',
      'project-deep-dive/project-choices',
      'project-deep-dive/project-results',
      'project-deep-dive/project-architecture',
    ],
  },
  {
    key: 'behavioural',
    label: 'Behavioural questions',
    matches: (q) => q.questionType === 'Behavioral',
    units: ['self-introduction-hr/hr-behavioural'],
  },
];

export const formatOf = (q: FormatInput) => INTERVIEW_FORMATS.find((f) => f.matches(q)) ?? null;

/** Every unit the map points at (a test checks they all exist in the curriculum). */
export const MAPPED_UNITS: UnitKey[] = [
  ...new Set([...Object.values(THEME_UNITS).flat(), ...INTERVIEW_FORMATS.flatMap((f) => f.units)]),
];
