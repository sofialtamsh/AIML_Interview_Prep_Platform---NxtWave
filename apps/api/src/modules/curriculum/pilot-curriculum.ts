/**
 * Pilot curriculum v1 (docs/01-product-requirements.md §4.1): AI Engineer at 3–6 LPA and
 * 8–12 LPA, over three topics: Python & NumPy → Embeddings & Vector Search → RAG.
 *
 * Like the catalog bootstrap, this only INSERTS what is missing. Topics and subtopics are
 * matched by slug and a role × package curriculum is only created if that target has none,
 * so admin edits made in the console are never overwritten.
 *
 * The depths, objectives and rationale are a first draft for the content team to review,
 * and for the Research Agent to validate against interview evidence in Phase 6.
 */
import type { Db } from '../../db/prisma.ts';
import type { Priority } from '../../generated/prisma/enums.ts';

type ConceptSeed = [key: string, name: string];
type SubtopicSeed = {
  slug: string;
  title: string;
  summary: string;
  complexity: number;
  /** "topic-slug/subtopic-slug" */
  needs: string[];
  concepts: ConceptSeed[];
};
type TopicSeed = {
  slug: string;
  title: string;
  summary: string;
  iconKey: string;
  skillArea: string;
  needs: string[];
  subtopics: SubtopicSeed[];
};

export const PILOT_TOPICS: TopicSeed[] = [
  {
    slug: 'python-numpy',
    title: 'Python & NumPy for AI',
    summary:
      'The array toolkit every AI codebase is built on: fast maths on whole arrays instead of slow loops.',
    iconKey: 'grid-3x3',
    skillArea: 'python',
    needs: [],
    subtopics: [
      {
        slug: 'numpy-arrays-vectorization',
        title: 'NumPy arrays & vectorization',
        summary:
          'Why ML code uses arrays instead of Python loops, and how to create, inspect and slice them.',
        complexity: 2,
        needs: [],
        concepts: [
          ['numpy.ndarray-basics', 'ndarray, shape and dtype'],
          ['numpy.vectorization', 'Vectorized operations vs loops'],
          ['numpy.indexing-slicing', 'Indexing, slicing and boolean masks'],
        ],
      },
      {
        slug: 'broadcasting-array-ops',
        title: 'Broadcasting & array operations',
        summary:
          'How NumPy lines up arrays of different shapes, and how to sum, average and reshape along an axis.',
        complexity: 3,
        needs: ['python-numpy/numpy-arrays-vectorization'],
        concepts: [
          ['numpy.broadcasting-rules', 'Broadcasting rules'],
          ['numpy.axis-aggregations', 'Aggregations along an axis'],
          ['numpy.reshape-stack', 'Reshape, stack and concatenate'],
        ],
      },
      {
        slug: 'linear-algebra-essentials',
        title: 'Linear algebra essentials for AI',
        summary:
          'Dot products, vector lengths and matrix multiplication: the maths behind embeddings and similarity.',
        complexity: 3,
        needs: ['python-numpy/broadcasting-array-ops'],
        concepts: [
          ['linalg.dot-product', 'Dot product'],
          ['linalg.vector-norms', 'Vector norms (L1 and L2)'],
          ['linalg.matmul', 'Matrix multiplication'],
        ],
      },
    ],
  },
  {
    slug: 'embeddings-vector-search',
    title: 'Embeddings & Vector Search',
    summary:
      'Turning text into vectors that capture meaning, then finding the closest ones fast, even across millions.',
    iconKey: 'scan-search',
    skillArea: 'genai',
    needs: ['python-numpy'],
    subtopics: [
      {
        slug: 'what-are-embeddings',
        title: 'What embeddings are',
        summary:
          'How a model turns a sentence into a list of numbers, and why similar meanings end up close together.',
        complexity: 3,
        needs: [],
        concepts: [
          ['embeddings.vector-representation', 'Text as vectors'],
          ['embeddings.semantic-space', 'Meaning as distance'],
          ['embeddings.embedding-models', 'Embedding models and dimensions'],
        ],
      },
      {
        slug: 'similarity-measures',
        title: 'Similarity measures',
        summary:
          'Cosine similarity, dot product and Euclidean distance: what each one measures and when they agree.',
        complexity: 3,
        needs: [
          'embeddings-vector-search/what-are-embeddings',
          'python-numpy/linear-algebra-essentials',
        ],
        concepts: [
          ['similarity.cosine', 'Cosine similarity'],
          ['similarity.dot-vs-euclidean', 'Dot product vs Euclidean distance'],
          ['similarity.normalization', 'Normalizing vectors'],
        ],
      },
      {
        slug: 'vector-databases-ann',
        title: 'Vector databases & ANN search',
        summary:
          'Why exact search stops scaling, and how approximate indexes like HNSW and IVF stay fast.',
        complexity: 4,
        needs: ['embeddings-vector-search/similarity-measures'],
        concepts: [
          ['vectordb.knn-vs-ann', 'Exact kNN vs approximate search'],
          ['vectordb.hnsw-ivf', 'HNSW and IVF indexes'],
          ['vectordb.metadata-filtering', 'Metadata filtering'],
        ],
      },
    ],
  },
  {
    slug: 'rag',
    title: 'Retrieval-Augmented Generation (RAG)',
    summary:
      'Giving an LLM the right facts at question time, so it answers from your documents instead of guessing.',
    iconKey: 'library',
    skillArea: 'genai',
    needs: ['embeddings-vector-search'],
    subtopics: [
      {
        slug: 'rag-fundamentals',
        title: 'RAG fundamentals',
        summary: 'The retrieve → augment → generate loop, and why it cuts down made-up answers.',
        complexity: 3,
        needs: ['embeddings-vector-search/what-are-embeddings'],
        concepts: [
          ['rag.why-rag', 'Why LLMs need retrieval'],
          ['rag.pipeline', 'The retrieve → augment → generate pipeline'],
          ['rag.prompt-grounding', 'Grounding the prompt with context'],
        ],
      },
      {
        slug: 'chunking-strategies',
        title: 'Chunking strategies',
        summary:
          'How to split documents into pieces that are small enough to search but big enough to make sense.',
        complexity: 3,
        needs: ['rag/rag-fundamentals'],
        concepts: [
          ['rag.chunking.size-overlap', 'Chunk size and overlap'],
          ['rag.chunking.structure-aware', 'Structure-aware chunking'],
          ['rag.chunking.metadata', 'Keeping metadata with chunks'],
        ],
      },
      {
        slug: 'retrieval-quality',
        title: 'Improving retrieval quality',
        summary:
          'Hybrid search, rank fusion and re-ranking, plus the metrics that prove retrieval got better.',
        complexity: 5,
        needs: ['rag/chunking-strategies', 'embeddings-vector-search/similarity-measures'],
        concepts: [
          ['rag.retrieval.hybrid', 'Hybrid search (BM25 + dense)'],
          ['rag.retrieval.rrf', 'Reciprocal rank fusion'],
          ['rag.retrieval.reranking', 'Re-ranking'],
          ['rag.retrieval.evaluation', 'Measuring retrieval: recall@k and MRR'],
        ],
      },
    ],
  },
];

type ItemSeed = {
  depth: 1 | 2 | 3 | 4 | 5;
  priority: Priority;
  optional?: boolean;
  objectives: string[];
  implementation?: string;
  rationale: string;
};

/** "topic-slug/subtopic-slug" → what this package needs. */
type CurriculumSeed = Record<string, ItemSeed>;

const LPA_3_6: CurriculumSeed = {
  'python-numpy/numpy-arrays-vectorization': {
    depth: 3,
    priority: 'HIGH',
    objectives: [
      'Create and inspect arrays (shape, dtype) without looking it up',
      'Replace a Python loop with a vectorized expression',
      'Select rows and values with slicing and boolean masks',
    ],
    implementation: 'Clean and summarise a small dataset in NumPy without writing a single loop.',
    rationale:
      'Coding rounds at this package expect fluent everyday NumPy. Most fresher interviews start here.',
  },
  'python-numpy/broadcasting-array-ops': {
    depth: 2,
    priority: 'HIGH',
    objectives: [
      'Explain broadcasting with a simple example',
      'Compute a sum or mean along a chosen axis',
      'Reshape an array into the shape a function expects',
    ],
    implementation: 'Normalise every column of a matrix in one line.',
    rationale: 'Usually a quick follow-up question. Knowing the basic rules is enough here.',
  },
  'python-numpy/linear-algebra-essentials': {
    depth: 2,
    priority: 'HIGH',
    objectives: [
      'Compute a dot product and say what it measures',
      'Find the length (L2 norm) of a vector',
      'Multiply two matrices and predict the shape of the result',
    ],
    implementation: 'Write a dot product and an L2 norm by hand, then the NumPy one-liners.',
    rationale:
      'You need this to understand embeddings and similarity next. Interviews test the basics, not proofs.',
  },
  'embeddings-vector-search/what-are-embeddings': {
    depth: 2,
    priority: 'HIGH',
    objectives: [
      'Explain in plain words what an embedding is',
      'Describe why similar sentences get nearby vectors',
      'Call an embedding model and inspect the vector it returns',
    ],
    implementation: 'Embed a few sentences and compare their vectors.',
    rationale:
      'Almost every GenAI interview opens with embeddings. At this package, clear intuition matters most.',
  },
  'embeddings-vector-search/similarity-measures': {
    depth: 2,
    priority: 'HIGH',
    objectives: [
      'Compute cosine similarity between two vectors',
      'Find the most similar sentence to a query in a small list',
      'Say when cosine similarity and dot product give the same ranking',
    ],
    implementation: 'Write a top-k search over a small list of embeddings with NumPy.',
    rationale: 'Asked directly and inside RAG questions. The core formulas are what matter here.',
  },
  'embeddings-vector-search/vector-databases-ann': {
    depth: 2,
    priority: 'MEDIUM',
    objectives: [
      'Explain why a vector database is needed beyond a NumPy array',
      'Store and query vectors in one vector database',
      'Describe exact vs approximate search in one sentence each',
    ],
    implementation: 'Load a few hundred embeddings into a vector store and query it.',
    rationale:
      'Expected: know what they are and use one. Index internals are rarely asked at this level.',
  },
  'rag/rag-fundamentals': {
    depth: 2,
    priority: 'HIGH',
    objectives: [
      'Draw the RAG pipeline and name each step',
      'Explain why RAG reduces made-up answers',
      'Build a minimal RAG answer over a few documents',
    ],
    implementation: 'Build a small question-answering script over your own notes.',
    rationale: 'The most common GenAI project and interview topic for AI Engineer roles.',
  },
  'rag/chunking-strategies': {
    depth: 2,
    priority: 'MEDIUM',
    objectives: [
      'Explain why documents are split into chunks',
      'Pick a chunk size and overlap and justify the choice',
      'Split a document while keeping its title with each chunk',
    ],
    implementation: 'Chunk a long document and inspect what each chunk contains.',
    rationale: 'Comes up as "how did you prepare your documents?" in project discussions.',
  },
  'rag/retrieval-quality': {
    depth: 1,
    priority: 'LOW',
    optional: true,
    objectives: [
      'Name two ways to improve weak retrieval',
      'Explain what re-ranking does in one sentence',
    ],
    rationale:
      'Rarely asked at this package. An optional head start if you aim for stronger interviews.',
  },
};

const LPA_8_12: CurriculumSeed = {
  'python-numpy/numpy-arrays-vectorization': {
    depth: 3,
    priority: 'MEDIUM',
    objectives: [
      'Write vectorized NumPy fluently, without loops',
      'Use boolean masks and fancy indexing to filter data',
      'Explain why vectorized code is faster',
    ],
    implementation: 'Rewrite a slow loop-based feature computation as vectorized NumPy.',
    rationale: 'Assumed knowledge at this package: refresh it quickly and move on.',
  },
  'python-numpy/broadcasting-array-ops': {
    depth: 3,
    priority: 'MEDIUM',
    objectives: [
      'Predict the result shape when broadcasting two arrays',
      'Debug a shape-mismatch error',
      'Vectorize a batch computation with axis-wise operations',
    ],
    implementation: 'Compute pairwise distances between two sets of points without loops.',
    rationale: 'Shape bugs are a favourite live-coding trap at this level.',
  },
  'python-numpy/linear-algebra-essentials': {
    depth: 3,
    priority: 'HIGH',
    objectives: [
      'Explain the dot product geometrically (angle and length)',
      'Choose between L1 and L2 norms for a task',
      'Express a batch of similarity scores as one matrix multiplication',
    ],
    implementation: 'Score 1,000 queries against 10,000 vectors with one matrix multiply.',
    rationale: 'Batch similarity as a matrix multiply is the core of fast retrieval code.',
  },
  'embeddings-vector-search/what-are-embeddings': {
    depth: 4,
    priority: 'HIGH',
    objectives: [
      'Compare embedding models by dimension, cost and quality',
      'Explain at a high level how embedding models are trained (contrastive learning)',
      'Spot when embeddings fail: domain shift, very short queries, rare terms',
    ],
    implementation: 'Evaluate two embedding models on a small labelled set.',
    rationale: '8–12 LPA interviews ask you to choose and justify an embedding model.',
  },
  'embeddings-vector-search/similarity-measures': {
    depth: 4,
    priority: 'HIGH',
    objectives: [
      'Show when cosine similarity and dot product rankings match',
      'Choose a metric to suit the model and the index',
      'Explain what normalizing vectors changes in search',
    ],
    implementation: 'Benchmark cosine vs dot product on raw and normalized vectors.',
    rationale: 'Metric choice questions separate "used it" from "understands it".',
  },
  'embeddings-vector-search/vector-databases-ann': {
    depth: 4,
    priority: 'HIGH',
    objectives: [
      'Explain how HNSW and IVF trade recall for speed',
      'Tune index settings (ef, nprobe) and measure the effect',
      'Combine vector search with metadata filters correctly',
    ],
    implementation: 'Measure recall@10 and latency for two index settings.',
    rationale: 'Index trade-offs are a standard deep-dive question for this package.',
  },
  'rag/rag-fundamentals': {
    depth: 4,
    priority: 'HIGH',
    objectives: [
      'Design a RAG pipeline for a given product need',
      'Explain the failure modes: missing, wrong or ignored context',
      'Write prompts that make the model cite sources or say it does not know',
    ],
    implementation: 'Build a RAG app that cites its sources and refuses when it has no answer.',
    rationale: 'Expect end-to-end design questions, not just "what is RAG".',
  },
  'rag/chunking-strategies': {
    depth: 4,
    priority: 'HIGH',
    objectives: [
      'Compare fixed, recursive and structure-aware chunking',
      'Explain how chunk size affects recall and answer quality',
      'Attach metadata to chunks and use it at query time',
    ],
    implementation: 'Run the same questions with two chunking strategies and compare the answers.',
    rationale: 'Chunking choices are where most real RAG systems win or lose quality.',
  },
  'rag/retrieval-quality': {
    depth: 4,
    priority: 'HIGH',
    objectives: [
      'Combine BM25 and dense retrieval with reciprocal rank fusion',
      'Add a re-ranker and explain its latency cost',
      'Measure retrieval with recall@k and MRR on a test set',
    ],
    implementation: 'Improve a weak retriever and show the metric gain.',
    rationale:
      '"How would you make retrieval better, and how would you prove it?" is a core 8–12 LPA question.',
  },
};

export const PILOT_CURRICULA: Array<{ role: string; bracket: string; items: CurriculumSeed }> = [
  { role: 'ai-engineer', bracket: 'LPA_3_6', items: LPA_3_6 },
  { role: 'ai-engineer', bracket: 'LPA_8_12', items: LPA_8_12 },
];

export const PILOT_CHANGE_NOTE =
  'Pilot curriculum v1. Draft for content-team review; the Research Agent validates it in Phase 6.';

/** Inserts the pilot topics and the two pilot curricula if they are missing. */
export async function bootstrapPilotCurriculum(db: Db) {
  const created = { topics: 0, subtopics: 0, concepts: 0, curricula: 0 };
  const areas = new Map((await db.skillArea.findMany()).map((a) => [a.slug, a.id]));

  const topicIds = new Map<string, string>();
  const subtopicIds = new Map<string, string>();
  const newTopics: TopicSeed[] = [];
  const newSubtopics: Array<{ key: string; seed: SubtopicSeed }> = [];

  for (const [ti, t] of PILOT_TOPICS.entries()) {
    let topic = await db.topic.findUnique({ where: { slug: t.slug } });
    if (!topic) {
      topic = await db.topic.create({
        data: {
          slug: t.slug,
          title: t.title,
          summary: t.summary,
          iconKey: t.iconKey,
          skillAreaId: areas.get(t.skillArea) ?? null,
          sortOrder: (ti + 1) * 10,
        },
      });
      created.topics++;
      newTopics.push(t);
    }
    topicIds.set(t.slug, topic.id);

    for (const [si, s] of t.subtopics.entries()) {
      const key = `${t.slug}/${s.slug}`;
      let sub = await db.subtopic.findUnique({
        where: { topicId_slug: { topicId: topic.id, slug: s.slug } },
      });
      if (!sub) {
        sub = await db.subtopic.create({
          data: {
            topicId: topic.id,
            slug: s.slug,
            title: s.title,
            summary: s.summary,
            complexity: s.complexity,
            sortOrder: (si + 1) * 10,
          },
        });
        created.subtopics++;
        newSubtopics.push({ key, seed: s });
      }
      subtopicIds.set(key, sub.id);

      for (const [ci, [conceptKey, name]] of s.concepts.entries()) {
        if (await db.concept.findUnique({ where: { key: conceptKey } })) continue;
        await db.concept.create({
          data: { subtopicId: sub.id, key: conceptKey, name, sortOrder: (ci + 1) * 10 },
        });
        created.concepts++;
      }
    }
  }

  // Prerequisites only for rows created just now (an admin may have changed the others).
  for (const t of newTopics) {
    const id = topicIds.get(t.slug) as string;
    const data = t.needs
      .map((slug) => topicIds.get(slug))
      .filter((p): p is string => !!p)
      .map((prerequisiteId) => ({ topicId: id, prerequisiteId }));
    if (data.length) await db.topicPrerequisite.createMany({ data, skipDuplicates: true });
  }
  for (const { key, seed } of newSubtopics) {
    const id = subtopicIds.get(key) as string;
    const data = seed.needs
      .map((k) => subtopicIds.get(k))
      .filter((p): p is string => !!p)
      .map((prerequisiteId) => ({ subtopicId: id, prerequisiteId }));
    if (data.length) await db.subtopicPrerequisite.createMany({ data, skipDuplicates: true });
  }

  for (const c of PILOT_CURRICULA) {
    const [role, bracket] = await Promise.all([
      db.careerRole.findUnique({ where: { slug: c.role } }),
      db.packageBracket.findUnique({ where: { code: c.bracket } }),
    ]);
    if (!role || !bracket) continue;
    if (await db.roleCurriculum.findFirst({ where: { roleId: role.id, bracketId: bracket.id } })) {
      continue;
    }
    await db.roleCurriculum.create({
      data: {
        roleId: role.id,
        bracketId: bracket.id,
        version: 1,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        changeNote: PILOT_CHANGE_NOTE,
        items: {
          create: Object.entries(c.items).flatMap(([key, i]) => {
            const subtopicId = subtopicIds.get(key);
            if (!subtopicId) return [];
            return [
              {
                subtopicId,
                priority: i.priority,
                targetDepthRank: i.depth,
                isOptional: i.optional ?? false,
                learningObjectives: i.objectives,
                implementationExpectation: i.implementation ?? null,
                rationale: i.rationale,
              },
            ];
          }),
        },
      },
    });
    created.curricula++;
  }
  return created;
}
