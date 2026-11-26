/**
 * The lesson library: lessons written for the ML Engineer pilot, kept in the repo so they are
 * reviewed like code and can be re-synced. `pnpm lessons:sync` loads them for review; they are
 * published only by a person in the admin console. Order follows the student roadmap.
 */
import { AGENTS_FRAMEWORKS_LESSON } from './mle/agents-frameworks.lesson.ts';
import { AI_ML_LEARNING_TYPES_LESSON } from './mle/ai-ml-learning-types.lesson.ts';
import { APTITUDE_REASONING_LESSON } from './mle/aptitude-reasoning.lesson.ts';
import { ATTENTION_TRANSFORMERS_LESSON } from './mle/attention-transformers.lesson.ts';
import { BROADCASTING_ARRAY_OPS_LESSON } from './mle/broadcasting-array-ops.lesson.ts';
import { CNN_COMPUTER_VISION_LESSON } from './mle/cnn-computer-vision.lesson.ts';
import { DSA_ESSENTIALS_LESSON } from './mle/dsa-essentials.lesson.ts';
import { DSA_PATTERNS_LESSON } from './mle/dsa-patterns.lesson.ts';
import { ENCODING_SCALING_LEAKAGE_LESSON } from './mle/encoding-scaling-leakage.lesson.ts';
import { GENERALIZATION_REGULARIZATION_LESSON } from './mle/generalization-regularization.lesson.ts';
import { HOW_LLMS_WORK_LESSON } from './mle/how-llms-work.lesson.ts';
import { HR_BEHAVIOURAL_LESSON } from './mle/hr-behavioural.lesson.ts';
import { INTERNSHIP_EXPERIENCE_LESSON } from './mle/internship-experience.lesson.ts';
import { K_NEAREST_NEIGHBORS_LESSON } from './mle/k-nearest-neighbors.lesson.ts';
import { LINEAR_ALGEBRA_ESSENTIALS_LESSON } from './mle/linear-algebra-essentials.lesson.ts';
import { LINEAR_REGRESSION_LESSON } from './mle/linear-regression.lesson.ts';
import { LOGISTIC_REGRESSION_LESSON } from './mle/logistic-regression.lesson.ts';
import { LOSS_GRADIENT_DESCENT_LESSON } from './mle/loss-gradient-descent.lesson.ts';
import { MISSING_OUTLIERS_DUPLICATES_LESSON } from './mle/missing-outliers-duplicates.lesson.ts';
import { NEURAL_NETWORK_FUNDAMENTALS_LESSON } from './mle/neural-network-fundamentals.lesson.ts';
import { NLP_TEXT_REPRESENTATION_LESSON } from './mle/nlp-text-representation.lesson.ts';
import { NUMPY_ARRAYS_VECTORIZATION_LESSON } from './mle/numpy-arrays-vectorization.lesson.ts';
import { PANDAS_WRANGLING_LESSON } from './mle/pandas-wrangling.lesson.ts';
import { PROMPTING_HALLUCINATIONS_LESSON } from './mle/prompting-hallucinations.lesson.ts';
import { PYTHON_CODING_ROUND_LESSON } from './mle/python-coding-round.lesson.ts';
import { PYTHON_CORE_CONCEPTS_LESSON } from './mle/python-core-concepts.lesson.ts';
import { PYTHON_OOP_LESSON } from './mle/python-oop.lesson.ts';
import { SELF_INTRODUCTION_LESSON } from './mle/self-introduction.lesson.ts';
import { STATISTICS_FOR_ML_LESSON } from './mle/statistics-for-ml.lesson.ts';
import { TRAINING_DEEP_NETWORKS_LESSON } from './mle/training-deep-networks.lesson.ts';
import type { LibraryLesson } from './sync.ts';

export const LESSON_LIBRARY: LibraryLesson[] = [
  {
    topicSlug: 'self-introduction-hr',
    subtopicSlug: 'self-introduction',
    document: SELF_INTRODUCTION_LESSON,
  },
  {
    topicSlug: 'self-introduction-hr',
    subtopicSlug: 'internship-experience',
    document: INTERNSHIP_EXPERIENCE_LESSON,
  },
  {
    topicSlug: 'self-introduction-hr',
    subtopicSlug: 'hr-behavioural',
    document: HR_BEHAVIOURAL_LESSON,
  },
  {
    topicSlug: 'self-introduction-hr',
    subtopicSlug: 'aptitude-reasoning',
    document: APTITUDE_REASONING_LESSON,
  },
  {
    topicSlug: 'python-for-interviews',
    subtopicSlug: 'python-core-concepts',
    document: PYTHON_CORE_CONCEPTS_LESSON,
  },
  {
    topicSlug: 'python-for-interviews',
    subtopicSlug: 'python-oop',
    document: PYTHON_OOP_LESSON,
  },
  {
    topicSlug: 'python-for-interviews',
    subtopicSlug: 'python-coding-round',
    document: PYTHON_CODING_ROUND_LESSON,
  },
  {
    topicSlug: 'python-for-interviews',
    subtopicSlug: 'dsa-essentials',
    document: DSA_ESSENTIALS_LESSON,
  },
  {
    topicSlug: 'python-for-interviews',
    subtopicSlug: 'dsa-patterns',
    document: DSA_PATTERNS_LESSON,
  },
  {
    topicSlug: 'python-numpy',
    subtopicSlug: 'numpy-arrays-vectorization',
    document: NUMPY_ARRAYS_VECTORIZATION_LESSON,
  },
  {
    topicSlug: 'python-numpy',
    subtopicSlug: 'broadcasting-array-ops',
    document: BROADCASTING_ARRAY_OPS_LESSON,
  },
  {
    topicSlug: 'python-numpy',
    subtopicSlug: 'linear-algebra-essentials',
    document: LINEAR_ALGEBRA_ESSENTIALS_LESSON,
  },
  {
    topicSlug: 'ml-fundamentals',
    subtopicSlug: 'ai-ml-learning-types',
    document: AI_ML_LEARNING_TYPES_LESSON,
  },
  {
    topicSlug: 'ml-fundamentals',
    subtopicSlug: 'loss-gradient-descent',
    document: LOSS_GRADIENT_DESCENT_LESSON,
  },
  {
    topicSlug: 'ml-fundamentals',
    subtopicSlug: 'generalization-regularization',
    document: GENERALIZATION_REGULARIZATION_LESSON,
  },
  {
    topicSlug: 'data-preparation',
    subtopicSlug: 'missing-outliers-duplicates',
    document: MISSING_OUTLIERS_DUPLICATES_LESSON,
  },
  {
    topicSlug: 'data-preparation',
    subtopicSlug: 'encoding-scaling-leakage',
    document: ENCODING_SCALING_LEAKAGE_LESSON,
  },
  {
    topicSlug: 'data-preparation',
    subtopicSlug: 'pandas-wrangling',
    document: PANDAS_WRANGLING_LESSON,
  },
  {
    topicSlug: 'data-preparation',
    subtopicSlug: 'statistics-for-ml',
    document: STATISTICS_FOR_ML_LESSON,
  },
  {
    topicSlug: 'supervised-learning',
    subtopicSlug: 'k-nearest-neighbors',
    document: K_NEAREST_NEIGHBORS_LESSON,
  },
  {
    topicSlug: 'supervised-learning',
    subtopicSlug: 'linear-regression',
    document: LINEAR_REGRESSION_LESSON,
  },
  {
    topicSlug: 'supervised-learning',
    subtopicSlug: 'logistic-regression',
    document: LOGISTIC_REGRESSION_LESSON,
  },
  {
    topicSlug: 'deep-learning',
    subtopicSlug: 'neural-network-fundamentals',
    document: NEURAL_NETWORK_FUNDAMENTALS_LESSON,
  },
  {
    topicSlug: 'deep-learning',
    subtopicSlug: 'training-deep-networks',
    document: TRAINING_DEEP_NETWORKS_LESSON,
  },
  {
    topicSlug: 'deep-learning',
    subtopicSlug: 'cnn-computer-vision',
    document: CNN_COMPUTER_VISION_LESSON,
  },
  {
    topicSlug: 'deep-learning',
    subtopicSlug: 'nlp-text-representation',
    document: NLP_TEXT_REPRESENTATION_LESSON,
  },
  {
    topicSlug: 'deep-learning',
    subtopicSlug: 'attention-transformers',
    document: ATTENTION_TRANSFORMERS_LESSON,
  },
  {
    topicSlug: 'llms-agents',
    subtopicSlug: 'how-llms-work',
    document: HOW_LLMS_WORK_LESSON,
  },
  {
    topicSlug: 'llms-agents',
    subtopicSlug: 'prompting-hallucinations',
    document: PROMPTING_HALLUCINATIONS_LESSON,
  },
  {
    topicSlug: 'llms-agents',
    subtopicSlug: 'agents-frameworks',
    document: AGENTS_FRAMEWORKS_LESSON,
  },
];
