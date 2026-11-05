/**
 * Initial platform configuration. This is real configuration data (not mock data): the
 * starting roles, package brackets, depth scale, skill areas and difficulty mix.
 *
 * `bootstrapCatalog` only INSERTS rows that are missing. It never overwrites values that
 * admins have since edited, so it is safe to run on every deploy.
 *
 * Pilot scope (docs/01-product-requirements.md §4.1): AI Engineer + 3–6 LPA and 8–12 LPA are LIVE.
 */
import type { Db } from '../../db/prisma.ts';
import type { Availability, QuestionDifficulty } from '../../generated/prisma/enums.ts';

export const SKILL_AREAS = [
  [
    'python',
    'Python programming',
    'Writing clean Python: data structures, functions, NumPy and pandas basics.',
  ],
  [
    'math-stats',
    'Math & statistics',
    'Linear algebra, probability and statistics that ML relies on.',
  ],
  ['sql-data', 'SQL & data handling', 'Querying, joining and cleaning data with SQL and pandas.'],
  ['ml', 'Machine learning', 'Classical ML: models, training, evaluation and trade-offs.'],
  ['dl-nlp', 'Deep learning & NLP', 'Neural networks, transformers and working with text.'],
  ['genai', 'LLMs & GenAI', 'Prompting, embeddings, RAG, agents and evaluating LLM apps.'],
  ['mlops', 'Deployment & MLOps', 'Shipping and running models and data pipelines reliably.'],
  [
    'analytics',
    'Business analytics',
    'Metrics, dashboards, experiments and storytelling with data.',
  ],
] as const;

type RoleSeed = {
  slug: string;
  title: string;
  shortCode: string;
  colorKey: string;
  availability: Availability;
  tagline: string;
  description: string;
  competencies: string[];
  interviewFocus: string[];
  skills: Array<[slug: (typeof SKILL_AREAS)[number][0], importance: 1 | 2 | 3]>;
};

export const ROLES: RoleSeed[] = [
  {
    slug: 'ai-engineer',
    title: 'AI Engineer',
    shortCode: 'AI',
    colorKey: 'g4',
    availability: 'LIVE',
    tagline: 'Build real products with LLMs, RAG and agents.',
    description:
      'AI Engineers turn foundation models into features people use: assistants that answer from company documents, copilots, agents that call tools, and the evaluation that keeps them honest. Interviews test Python, ML and LLM fundamentals, retrieval design and how you ship AI safely.',
    competencies: [
      'Python and data handling with NumPy and pandas',
      'ML and deep learning fundamentals',
      'How LLMs work: tokens, embeddings, context windows',
      'Retrieval-augmented generation (RAG) and vector search',
      'Agents, tool calling and structured outputs',
      'Evaluating quality, latency and cost',
      'Deploying and monitoring AI features',
    ],
    interviewFocus: [
      'Python coding round',
      'ML and LLM concepts',
      'RAG and AI system design',
      'Project deep-dive',
    ],
    skills: [
      ['python', 3],
      ['genai', 3],
      ['ml', 2],
      ['dl-nlp', 2],
      ['math-stats', 2],
      ['mlops', 1],
    ],
  },
  {
    slug: 'ml-engineer',
    title: 'ML Engineer',
    shortCode: 'ML',
    colorKey: 'g1',
    availability: 'NEXT_UP',
    tagline: 'Build, ship and scale models in production.',
    description:
      'ML Engineers take models from notebook to production: data pipelines, training at scale, serving under latency budgets and monitoring for drift. Interviews mix coding, ML theory and ML system design.',
    competencies: [
      'Strong Python and software engineering',
      'ML algorithms and how to evaluate them',
      'Deep learning training and debugging',
      'Feature pipelines and data quality',
      'Model serving, monitoring and retraining',
    ],
    interviewFocus: ['Coding round', 'ML from scratch', 'ML system design', 'Debugging scenarios'],
    skills: [
      ['python', 3],
      ['ml', 3],
      ['math-stats', 3],
      ['mlops', 3],
      ['dl-nlp', 2],
      ['sql-data', 1],
    ],
  },
  {
    slug: 'data-scientist',
    title: 'Data Scientist',
    shortCode: 'DS',
    colorKey: 'g2',
    availability: 'PLANNED',
    tagline: 'Statistics, ML and experiments the business understands.',
    description:
      'Data Scientists answer business questions with data: they explore, model, run experiments and explain results to people who make decisions. Interviews test statistics, ML, SQL and product sense.',
    competencies: [
      'Statistics and probability',
      'SQL and pandas for analysis',
      'Machine learning models and metrics',
      'A/B testing and experiment design',
      'Communicating insights clearly',
    ],
    interviewFocus: [
      'SQL and pandas',
      'Statistics and A/B tests',
      'ML concepts',
      'Case and product sense',
    ],
    skills: [
      ['math-stats', 3],
      ['ml', 3],
      ['python', 3],
      ['sql-data', 2],
      ['analytics', 2],
    ],
  },
  {
    slug: 'data-analyst',
    title: 'Data Analyst',
    shortCode: 'DA',
    colorKey: 'g0',
    availability: 'PLANNED',
    tagline: 'Turn raw data into decisions.',
    description:
      'Data Analysts find the story in the data: they write SQL, clean messy tables, build dashboards and recommend what to do next. Interviews focus on SQL, pandas, statistics and business reasoning.',
    competencies: [
      'SQL: joins, aggregations and window functions',
      'pandas for cleaning and reshaping data',
      'Descriptive statistics',
      'Dashboards and visualization',
      'Defining and tracking business metrics',
    ],
    interviewFocus: [
      'SQL round',
      'pandas and Excel tasks',
      'Business case',
      'Metrics and statistics',
    ],
    skills: [
      ['sql-data', 3],
      ['analytics', 3],
      ['python', 2],
      ['math-stats', 2],
    ],
  },
  {
    slug: 'data-engineer',
    title: 'Data Engineer',
    shortCode: 'DE',
    colorKey: 'g3',
    availability: 'PLANNED',
    tagline: 'Reliable pipelines for clean, trusted data.',
    description:
      'Data Engineers build the pipelines everyone else depends on: ingesting, cleaning, de-duplicating and transforming large datasets so analysts and models can trust them.',
    competencies: [
      'Advanced SQL and data modelling',
      'Python for data pipelines',
      'Batch and streaming processing',
      'Data quality and de-duplication',
      'Orchestration and monitoring',
    ],
    interviewFocus: ['Advanced SQL', 'Python coding', 'Pipeline design', 'Data modelling'],
    skills: [
      ['sql-data', 3],
      ['python', 3],
      ['mlops', 2],
    ],
  },
];

type BracketSeed = {
  code: string;
  label: string;
  minLpa: number;
  maxLpa: number | null;
  headline: string;
  expectations: string;
  availability: Availability;
  policy: Record<QuestionDifficulty, number>;
};

export const BRACKETS: BracketSeed[] = [
  {
    code: 'LPA_3_6',
    label: '3–6 LPA',
    minLpa: 3,
    maxLpa: 6,
    headline: 'Strong fundamentals',
    expectations:
      'Interviews check that your basics are solid: clean Python, core ideas explained in your own words, and simple working implementations.',
    availability: 'LIVE',
    policy: { EASY: 50, MEDIUM: 45, HARD: 5, EXPERT: 0 },
  },
  {
    code: 'LPA_6_8',
    label: '6–8 LPA',
    minLpa: 6,
    maxLpa: 8,
    headline: 'Fundamentals + hands-on',
    expectations:
      'You explain how things work under the hood, compare common options and debug a realistic implementation.',
    availability: 'NEXT_UP',
    policy: { EASY: 30, MEDIUM: 50, HARD: 20, EXPERT: 0 },
  },
  {
    code: 'LPA_8_12',
    label: '8–12 LPA',
    minLpa: 8,
    maxLpa: 12,
    headline: 'Depth and trade-offs',
    expectations:
      'Expect deeper "why" questions: choosing between approaches, measuring quality and improving a working system.',
    availability: 'LIVE',
    policy: { EASY: 10, MEDIUM: 45, HARD: 40, EXPERT: 5 },
  },
  {
    code: 'LPA_12_PLUS',
    label: '12+ LPA',
    minLpa: 12,
    maxLpa: null,
    headline: 'Production-grade thinking',
    expectations:
      'You design systems end to end and reason about scale, latency, cost and reliability, not just correctness.',
    availability: 'NEXT_UP',
    policy: { EASY: 0, MEDIUM: 20, HARD: 50, EXPERT: 30 },
  },
];

export const DEPTH_LEVELS = [
  {
    rank: 1,
    code: 'FOUNDATIONAL',
    name: 'Foundational',
    description: 'Intuition first: what it is, why it exists, the words you need.',
    generationGuidance:
      'Intuition, everyday analogy, why the concept exists and the vocabulary. No math. Code only as one-liners.',
  },
  {
    rank: 2,
    code: 'BEGINNER',
    name: 'Beginner',
    description: 'How it works, step by step, with simple working code.',
    generationGuidance:
      'The core mechanism step by step, a simple working example, the standard happy path, and every term defined.',
  },
  {
    rank: 3,
    code: 'INTERMEDIATE',
    name: 'Intermediate',
    description: 'Options, parameters that matter, debugging and common pitfalls.',
    generationGuidance:
      'Alternatives and when to use each, the parameters that matter, debugging, typical pitfalls and a realistic implementation.',
  },
  {
    rank: 4,
    code: 'ADVANCED',
    name: 'Advanced',
    description: 'Internals, measurement and trade-offs between approaches.',
    generationGuidance:
      'Internals and math where they change decisions, evaluation and metrics, optimization, architectural trade-offs and failure modes.',
  },
  {
    rank: 5,
    code: 'EXPERT',
    name: 'Expert',
    description: 'Production scale: latency, cost, reliability and system design.',
    generationGuidance:
      'Production scale: latency, cost and reliability budgets, multi-stage systems, advanced variants and designing under constraints (system-design interview depth).',
  },
] as const;

export const COMPANIES = [
  'Amazon',
  'Google',
  'Microsoft',
  'Flipkart',
  'Swiggy',
  'Zomato',
  'PhonePe',
  'Razorpay',
  'Paytm',
  'Meesho',
  'CRED',
  'Myntra',
  'Ola',
  'Uber',
  'Walmart Global Tech',
  'Salesforce',
  'Adobe',
  'Fractal Analytics',
  'Tiger Analytics',
  'Mu Sigma',
  'LatentView Analytics',
  'Deloitte',
  'Accenture',
  'TCS',
  'Infosys',
];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Inserts any missing catalog rows. Existing rows (and admin edits) are left untouched. */
export async function bootstrapCatalog(db: Db) {
  const created = { skillAreas: 0, roles: 0, brackets: 0, depthLevels: 0, companies: 0 };

  for (const [i, [slug, name, description]] of SKILL_AREAS.entries()) {
    const exists = await db.skillArea.findUnique({ where: { slug } });
    if (!exists) {
      await db.skillArea.create({ data: { slug, name, description, sortOrder: i } });
      created.skillAreas++;
    }
  }
  const areaIds = new Map(
    (await db.skillArea.findMany({ select: { id: true, slug: true } })).map((a) => [a.slug, a.id]),
  );

  for (const [i, r] of ROLES.entries()) {
    if (await db.careerRole.findUnique({ where: { slug: r.slug } })) continue;
    await db.careerRole.create({
      data: {
        slug: r.slug,
        title: r.title,
        shortCode: r.shortCode,
        colorKey: r.colorKey,
        availability: r.availability,
        tagline: r.tagline,
        description: r.description,
        competencies: r.competencies,
        interviewFocus: r.interviewFocus,
        sortOrder: i,
        skillAreas: {
          create: r.skills
            .filter(([s]) => areaIds.has(s))
            .map(([s, importance]) => ({ skillAreaId: areaIds.get(s) as string, importance })),
        },
      },
    });
    created.roles++;
  }

  for (const [i, b] of BRACKETS.entries()) {
    if (await db.packageBracket.findUnique({ where: { code: b.code } })) continue;
    await db.packageBracket.create({
      data: {
        code: b.code,
        label: b.label,
        minLpa: b.minLpa,
        maxLpa: b.maxLpa,
        headline: b.headline,
        expectations: b.expectations,
        availability: b.availability,
        sortOrder: i,
        difficultyPolicy: {
          create: (Object.entries(b.policy) as [QuestionDifficulty, number][]).map(
            ([difficulty, weight]) => ({ difficulty, weight }),
          ),
        },
      },
    });
    created.brackets++;
  }

  for (const d of DEPTH_LEVELS) {
    if (await db.depthLevel.findUnique({ where: { rank: d.rank } })) continue;
    await db.depthLevel.create({ data: { ...d } });
    created.depthLevels++;
  }

  for (const name of COMPANIES) {
    const slug = slugify(name);
    if (await db.company.findUnique({ where: { slug } })) continue;
    await db.company.create({ data: { slug, name } });
    created.companies++;
  }

  return created;
}

export { slugify };
