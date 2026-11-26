/**
 * ML Engineer interview-prep curriculum v2, derived from interview evidence, not from a syllabus.
 *
 * Source: NxtWave Hiring Intelligence export (interview-loop-explorer, data 2026-01-01 → 2026-10-30).
 * The ML-engineer family is every opening whose title is ML / AI-ML / data-science / CV ("tier A",
 * 27 companies) or a generic AI-engineer title ("tier B"), excluding full-stack, web, prompt-only,
 * automation, product and business titles: 3,293 questions, 80 openings, 72 companies
 * (57 openings under 8 LPA, 23 at 8 LPA or more). Questions were grouped into interview themes
 * with explicit keyword rules (docs/11-mle-interview-evidence.md).
 *
 * Share of the 72 companies that asked each theme (tier A in brackets):
 *   project deep-dive 92% (93%) · self-introduction and HR 72% (67%) · Python 57% (56%) ·
 *   GenAI 56% (41%; 83% at 8+ LPA) · ML fundamentals 49% (67%) · deployment and APIs 40% (30%) ·
 *   deep learning 38% (52%) · SQL 31% (19%) · model evaluation 25% (37%) ·
 *   classical algorithms 21% (26%) · data preparation 19% (22%) · aptitude 11% (only under 8 LPA).
 *
 * Packages: under-8-LPA evidence sets the 3–6 LPA track (depth 2, Beginner, for core items);
 * 8-LPA-and-above evidence sets 8–12 LPA (depth 3, plus depth 4 where GenAI and architecture
 * questions get harder). Less-asked subtopics are short (depth 1) or optional, so the 3–6 LPA core
 * fits a 30-day plan at about an hour a day.
 *
 * The DSML master sheet was used only to check that these areas are taught in NxtWave courses;
 * no topic was copied from it. Everything here is a first draft for the content team.
 */
import type { CurriculumSeed, TopicSeed } from './pilot-curriculum.ts';

const of72 = (n: number) => `${n} of 72 ML/AI companies (${Math.round((n / 72) * 100)}%)`;

/** New topics, plus one new subtopic in the existing RAG topic. Sort orders place them around the
 *  existing Embeddings (20) and RAG (30) topics in interview-prep order. */
export const MLE_TOPICS: TopicSeed[] = [
  {
    slug: 'self-introduction-hr',
    title: 'Self-Introduction & HR Round',
    summary:
      'The first five minutes of almost every interview: who you are, what you built, and why this role.',
    iconKey: 'mic',
    skillArea: null,
    needs: [],
    sortOrder: 11,
    subtopics: [
      {
        slug: 'self-introduction',
        title: 'Self-introduction pitch',
        summary: 'A 60-second introduction that leads with your skills and your strongest project.',
        complexity: 1,
        needs: [],
        concepts: [
          ['hr.self-intro.structure', 'Structure of a self-introduction'],
          ['hr.self-intro.role-fit', 'Linking your skills to the role'],
        ],
      },
      {
        slug: 'internship-experience',
        title: 'Internship and experience story',
        summary:
          'Describe an internship or team project: your role, your contribution, the result.',
        complexity: 1,
        needs: ['self-introduction-hr/self-introduction'],
        concepts: [
          ['hr.experience.star', 'The STAR answer format'],
          ['hr.experience.contribution', 'Your role versus the team'],
        ],
      },
      {
        slug: 'hr-behavioural',
        title: 'HR and behavioural questions',
        summary:
          'Motivation, strengths and weaknesses, relocation and CTC questions, answered honestly.',
        complexity: 1,
        needs: [],
        concepts: [
          ['hr.behavioural.motivation', 'Why this role and this company'],
          ['hr.behavioural.strengths', 'Strengths, weaknesses and challenges'],
          ['hr.behavioural.logistics', 'Relocation, joining date and CTC'],
        ],
      },
      {
        slug: 'aptitude-reasoning',
        title: 'Aptitude and logical reasoning',
        summary: 'Numerical and logical puzzles from online assessments and written tests.',
        complexity: 2,
        needs: [],
        concepts: [
          ['apt.numerical', 'Numerical reasoning'],
          ['apt.logical', 'Patterns, sequences and arrangements'],
        ],
      },
    ],
  },
  {
    slug: 'python-for-interviews',
    title: 'Python for Interviews',
    summary:
      'The Python concepts interviewers probe and the coding problems they ask you to solve live.',
    iconKey: 'code',
    skillArea: 'python',
    needs: [],
    sortOrder: 12,
    subtopics: [
      {
        slug: 'python-core-concepts',
        title: 'Core Python concepts',
        summary:
          'Data types and mutability, functions, lambdas, decorators, generators and exceptions.',
        complexity: 2,
        needs: [],
        concepts: [
          ['py.core.types-mutability', 'Data types and mutability (list vs tuple vs set)'],
          ['py.core.functions-decorators', 'Functions, lambdas and decorators'],
          ['py.core.generators-exceptions', 'Generators and exception handling'],
        ],
      },
      {
        slug: 'python-oop',
        title: 'OOP in Python',
        summary: 'Classes and objects, the four pillars, and when OOP makes ML code cleaner.',
        complexity: 2,
        needs: ['python-for-interviews/python-core-concepts'],
        concepts: [
          ['py.oop.classes', 'Classes, objects and __init__'],
          ['py.oop.pillars', 'Encapsulation, inheritance, polymorphism, abstraction'],
        ],
      },
      {
        slug: 'python-coding-round',
        title: 'Coding round: strings, lists and numbers',
        summary:
          'The live problems freshers get most: string manipulation, list logic and number checks.',
        complexity: 2,
        needs: ['python-for-interviews/python-core-concepts'],
        concepts: [
          ['py.coding.strings', 'String problems (palindrome, anagram, frequency)'],
          ['py.coding.lists', 'List and dictionary problems'],
          ['py.coding.numbers', 'Number problems (prime, Armstrong, Fibonacci)'],
        ],
      },
      {
        slug: 'dsa-essentials',
        title: 'DSA essentials',
        summary: 'Time and space complexity, hashing, two pointers, sorting and binary search.',
        complexity: 3,
        needs: ['python-for-interviews/python-coding-round'],
        concepts: [
          ['dsa.arrays-hashing', 'Arrays, strings and hashing'],
          ['dsa.sort-search', 'Sorting and binary search'],
          ['dsa.complexity', 'Time and space complexity'],
        ],
      },
      {
        // Curriculum v3 (2026-11-18): the DSA questions outgrew one unit. Sliding windows (the
        // most repeated DSA question), stacks and recursion with memoisation move here.
        slug: 'dsa-patterns',
        title: 'DSA patterns',
        summary: 'Sliding windows, running totals, stacks, recursion and memoisation.',
        complexity: 3,
        needs: ['python-for-interviews/dsa-essentials'],
        sortOrder: 50,
        concepts: [
          ['dsa.sliding-window', 'Sliding windows and running totals'],
          ['dsa.stack', 'Stacks and queues'],
          ['dsa.recursion', 'Recursion, memoisation and dynamic programming'],
        ],
      },
    ],
  },
  {
    slug: 'ml-fundamentals',
    title: 'Machine Learning Fundamentals',
    summary: 'The definitions and core ideas every ML interview starts with, explained clearly.',
    iconKey: 'brain',
    skillArea: 'ml',
    needs: [],
    sortOrder: 13,
    subtopics: [
      {
        slug: 'ai-ml-learning-types',
        title: 'AI, ML, DL and learning types',
        summary:
          'How AI, ML and deep learning relate, and supervised vs unsupervised vs reinforcement.',
        complexity: 1,
        needs: [],
        concepts: [
          ['mlf.ai-ml-dl', 'AI vs ML vs deep learning'],
          ['mlf.learning-types', 'Supervised, unsupervised and reinforcement learning'],
          ['mlf.ml-lifecycle', 'The ML project lifecycle'],
        ],
      },
      {
        slug: 'loss-gradient-descent',
        title: 'Loss functions and gradient descent',
        summary:
          'What a model optimizes, and how gradient descent and the learning rate get it there.',
        complexity: 3,
        needs: ['ml-fundamentals/ai-ml-learning-types'],
        concepts: [
          ['mlf.loss-functions', 'Loss functions (MSE, cross-entropy)'],
          ['mlf.gradient-descent', 'Gradient descent and the learning rate'],
        ],
      },
      {
        slug: 'generalization-regularization',
        title: 'Overfitting, bias–variance and regularization',
        summary:
          'Why models fail on new data, how to detect it, and how splits, CV and L1/L2 fix it.',
        complexity: 3,
        needs: ['ml-fundamentals/ai-ml-learning-types'],
        concepts: [
          ['mlf.overfitting', 'Overfitting and underfitting'],
          ['mlf.bias-variance', 'The bias–variance trade-off'],
          ['mlf.validation', 'Train/validation/test splits and cross-validation'],
          ['mlf.regularization', 'L1 and L2 regularization'],
        ],
      },
    ],
  },
  {
    slug: 'data-preparation',
    title: 'Data Preparation & Feature Engineering',
    summary: 'Turning messy data into model-ready features, and explaining every choice you made.',
    iconKey: 'table',
    skillArea: 'sql-data',
    needs: [],
    sortOrder: 14,
    subtopics: [
      {
        slug: 'missing-outliers-duplicates',
        title: 'Missing values, outliers and duplicates',
        summary: 'Detecting and treating gaps, extreme values and repeated records, with pandas.',
        complexity: 2,
        needs: [],
        concepts: [
          ['data.missing-values', 'Missing values and imputation'],
          ['data.outliers', 'Outlier detection and treatment'],
          ['data.duplicates', 'Duplicate records'],
        ],
      },
      {
        slug: 'encoding-scaling-leakage',
        title: 'Encoding, scaling and data leakage',
        summary: 'Categorical encoding, feature scaling, feature selection, and leaks to avoid.',
        complexity: 3,
        needs: ['data-preparation/missing-outliers-duplicates'],
        concepts: [
          ['data.encoding', 'One-hot and label encoding'],
          ['data.scaling', 'Normalization and standardization'],
          ['data.leakage', 'Data leakage'],
          ['data.feature-selection', 'Feature engineering and selection'],
        ],
      },
      {
        slug: 'pandas-wrangling',
        title: 'Pandas for data wrangling',
        summary: 'Selecting with loc/iloc, grouping, merging and reshaping tables in pandas.',
        complexity: 2,
        needs: [],
        concepts: [
          ['data.pandas-selection', 'Selection with loc and iloc'],
          ['data.pandas-groupby-merge', 'groupby, merge and concat'],
        ],
      },
      {
        slug: 'statistics-for-ml',
        title: 'Statistics for ML',
        summary:
          'Distributions, spread, correlation and hypothesis testing, as ML interviews use them.',
        complexity: 3,
        needs: [],
        concepts: [
          ['stats.descriptive', 'Mean, median, variance and standard deviation'],
          ['stats.hypothesis-testing', 'Hypothesis testing and p-values'],
          ['stats.distributions', 'Distributions and the normal curve'],
          ['stats.correlation', 'Correlation and covariance'],
        ],
      },
    ],
  },
  {
    slug: 'classical-ml-algorithms',
    title: 'Classical ML Algorithms',
    summary:
      'Superseded by the supervised and unsupervised topics; kept for the archived combined units.',
    iconKey: 'network',
    skillArea: 'ml',
    needs: [],
    sortOrder: 15,
    subtopics: [
      {
        slug: 'linear-logistic-regression',
        title: 'Linear and logistic regression',
        summary: 'Predicting a number vs a class: the models, their assumptions and their outputs.',
        complexity: 2,
        needs: ['ml-fundamentals/loss-gradient-descent'],
        concepts: [
          ['algo.linear-regression', 'Linear regression'],
          ['algo.logistic-regression', 'Logistic regression and the sigmoid'],
        ],
      },
      {
        slug: 'trees-ensembles',
        title: 'Decision trees and ensembles',
        summary:
          'Splitting rules, Random Forest, bagging vs boosting, and gradient boosting / XGBoost.',
        complexity: 3,
        needs: ['ml-fundamentals/generalization-regularization'],
        concepts: [
          ['algo.decision-trees', 'Decision trees, Gini and entropy'],
          ['algo.random-forest', 'Random Forest and bagging'],
          ['algo.boosting', 'Boosting, gradient boosting and XGBoost'],
        ],
      },
      {
        slug: 'knn-svm-naive-bayes',
        title: 'KNN, SVM and Naive Bayes',
        summary: 'Three classic classifiers: how each decides, and where each one fits.',
        complexity: 3,
        needs: [],
        concepts: [
          ['algo.knn', 'K-nearest neighbours'],
          ['algo.svm', 'Support vector machines'],
          ['algo.naive-bayes', 'Naive Bayes'],
        ],
      },
      {
        slug: 'clustering-pca',
        title: 'Clustering and PCA',
        summary: 'Unsupervised learning: K-Means, choosing k, and reducing dimensions with PCA.',
        complexity: 3,
        needs: ['ml-fundamentals/ai-ml-learning-types'],
        concepts: [
          ['algo.kmeans', 'K-Means and the elbow method'],
          ['algo.pca', 'PCA and dimensionality reduction'],
        ],
      },
      // V1 (2026-11-19): one unit per algorithm, each taught in depth with live calculations.
      // The four combined units above stay in the taxonomy but are left out of the V1 curriculum.
    ],
  },
  {
    slug: 'supervised-learning',
    title: 'Supervised learning',
    summary:
      'Learning from labelled examples: predict a number, then a class, with one algorithm per unit.',
    iconKey: 'network',
    skillArea: 'ml',
    needs: [],
    sortOrder: 15,
    subtopics: [
      {
        slug: 'linear-regression',
        title: 'Linear regression',
        summary:
          'Draw the best straight line through your data, then predict with it. What its two numbers mean, how a line is scored, and how the best one is found.',
        complexity: 2,
        needs: [],
        sortOrder: 110,
        concepts: [
          ['linreg.line-residuals', 'The line, residuals and least squares'],
          ['linreg.metrics', 'Loss and metrics: MSE, RMSE, MAE and R²'],
          ['linreg.gradient-descent', 'Fitting by gradient descent'],
          ['linreg.multiple-polynomial', 'Multiple and polynomial regression'],
          ['linreg.regularisation', 'Ridge and lasso regularisation'],
          ['linreg.assumptions', 'Assumptions and diagnostics'],
        ],
      },
      {
        slug: 'logistic-regression',
        title: 'Logistic regression',
        summary:
          'Turn a linear score into a probability: the sigmoid, log loss, the decision threshold and the boundary.',
        complexity: 2,
        needs: [],
        sortOrder: 120,
        concepts: [
          ['logreg.sigmoid-odds', 'The sigmoid, odds and log-odds'],
          ['logreg.log-loss', 'Log loss and how the weights are learned'],
          ['logreg.metrics', 'Confusion matrix, precision, recall and AUC'],
          ['logreg.threshold-boundary', 'Decision threshold and decision boundary'],
        ],
      },
      {
        slug: 'k-nearest-neighbors',
        title: 'K-Nearest Neighbors (KNN)',
        summary:
          'Classify a new point by the vote of its K closest examples: distances, choosing K, weighted votes and where KNN breaks.',
        complexity: 2,
        needs: [],
        sortOrder: 130,
        concepts: [
          ['knn.distance-vote', 'Distances, nearest neighbours and the majority vote'],
          ['knn.choosing-k', 'Choosing K: overfitting, underfitting and ties'],
          ['knn.weighted-probabilistic', 'Weighted and probabilistic KNN'],
          ['knn.practical-limits', 'Scaling, cost and the curse of dimensionality'],
        ],
      },
      {
        slug: 'naive-bayes',
        title: 'Naive Bayes',
        summary:
          'Bayes rule with an independence assumption: priors, likelihoods, smoothing and the common variants.',
        complexity: 2,
        needs: [],
        sortOrder: 140,
        concepts: [
          ['nb.bayes-rule', 'Bayes rule, priors and likelihoods'],
          ['nb.independence-smoothing', 'The independence assumption and Laplace smoothing'],
          ['nb.variants', 'Gaussian, multinomial and Bernoulli Naive Bayes'],
        ],
      },
      {
        slug: 'decision-trees',
        title: 'Decision trees',
        summary:
          'Split the data question by question: Gini, entropy and information gain, depth and pruning, and trees for regression.',
        complexity: 3,
        needs: [],
        sortOrder: 150,
        concepts: [
          ['tree.splits-impurity', 'Splits, Gini, entropy and information gain'],
          ['tree.depth-pruning', 'Depth, overfitting and pruning'],
          ['tree.regression', 'Regression trees'],
        ],
      },
      {
        slug: 'random-forest-bagging',
        title: 'Random forest and bagging',
        summary:
          'Many trees on bootstrap samples that vote: why it cuts variance, random features, out-of-bag error and feature importance.',
        complexity: 3,
        needs: [],
        sortOrder: 160,
        concepts: [
          ['rf.bagging', 'Bootstrap samples and bagging'],
          ['rf.random-features-oob', 'Random feature subsets and out-of-bag error'],
          ['rf.feature-importance', 'Feature importance'],
        ],
      },
      {
        slug: 'boosting',
        title: 'Boosting: AdaBoost, gradient boosting, XGBoost',
        summary:
          'Models built one after another, each fixing the errors of the last: AdaBoost weights, gradient boosting on residuals, XGBoost.',
        complexity: 4,
        needs: [],
        sortOrder: 170,
        concepts: [
          ['boost.adaboost', 'AdaBoost and sample weights'],
          ['boost.gradient-boosting', 'Gradient boosting on residuals'],
          ['boost.xgboost', 'XGBoost and its regularisation'],
        ],
      },
      {
        slug: 'support-vector-machines',
        title: 'Support vector machines (SVM)',
        summary:
          'The widest margin between classes: support vectors, the soft margin and C, and kernels for curved boundaries.',
        complexity: 3,
        needs: [],
        sortOrder: 180,
        concepts: [
          ['svm.margin', 'Margin and support vectors'],
          ['svm.soft-margin', 'Soft margin and the C parameter'],
          ['svm.kernels', 'Kernels and the kernel trick'],
        ],
      },
    ],
  },
  {
    slug: 'unsupervised-learning',
    title: 'Unsupervised learning',
    summary:
      'No labels at all: find the groups hiding in the data, or describe it with fewer columns.',
    iconKey: 'layers',
    skillArea: 'ml',
    needs: [],
    sortOrder: 16,
    subtopics: [
      {
        slug: 'k-means-clustering',
        title: 'K-Means clustering',
        summary:
          'Group unlabelled points around K centres: the assign and update steps, choosing K, initialisation and limits.',
        complexity: 2,
        needs: [],
        sortOrder: 190,
        concepts: [
          ['kmeans.assign-update', 'The assign and update steps'],
          ['kmeans.choosing-k', 'Choosing K: elbow and silhouette'],
          ['kmeans.init-limits', 'Initialisation and limits'],
        ],
      },
      {
        slug: 'hierarchical-dbscan',
        title: 'Hierarchical clustering and DBSCAN',
        summary:
          'Clusters without choosing K first: dendrograms and linkage, and density-based clusters that mark noise.',
        complexity: 3,
        needs: [],
        sortOrder: 200,
        concepts: [
          ['cluster.hierarchical', 'Hierarchical clustering, linkage and dendrograms'],
          ['cluster.dbscan', 'DBSCAN: density, eps and min samples'],
        ],
      },
      {
        slug: 'pca',
        title: 'PCA and dimensionality reduction',
        summary:
          'Keep the directions that hold the most variance: covariance, eigenvectors, explained variance and how many components to keep.',
        complexity: 3,
        needs: [],
        sortOrder: 210,
        concepts: [
          ['pca.variance-directions', 'Directions of maximum variance'],
          ['pca.eigen-steps', 'Covariance, eigenvectors and projection'],
          ['pca.choosing-components', 'Explained variance and choosing components'],
        ],
      },
    ],
  },
  {
    slug: 'model-evaluation',
    title: 'Model Evaluation & Selection',
    summary: 'Measuring a model honestly and choosing the right one for the problem.',
    iconKey: 'gauge',
    skillArea: 'ml',
    needs: [],
    sortOrder: 16,
    subtopics: [
      {
        slug: 'classification-metrics',
        title: 'Classification metrics and imbalanced data',
        summary:
          'Confusion matrix, precision, recall, F1, ROC-AUC, and what to do when classes are rare.',
        complexity: 3,
        needs: [],
        concepts: [
          ['eval.confusion-matrix', 'Confusion matrix'],
          ['eval.precision-recall-f1', 'Precision, recall and F1'],
          ['eval.roc-auc', 'ROC curve and AUC'],
          ['eval.imbalance', 'Imbalanced classes'],
        ],
      },
      {
        slug: 'regression-metrics',
        title: 'Regression metrics',
        summary: 'MAE, MSE, RMSE and R²: what each says about errors, and which to report.',
        complexity: 2,
        needs: [],
        concepts: [
          ['eval.mae-rmse', 'MAE, MSE and RMSE'],
          ['eval.r2', 'R² and adjusted R²'],
        ],
      },
      {
        slug: 'model-selection-tuning',
        title: 'Model selection and tuning',
        summary: 'Picking a model for the data and the goal, then tuning it with validation.',
        complexity: 3,
        needs: ['model-evaluation/classification-metrics'],
        concepts: [
          ['eval.model-choice', 'Choosing a model for the problem'],
          ['eval.hyperparameter-tuning', 'Hyperparameter tuning (grid and random search)'],
        ],
      },
    ],
  },
  {
    slug: 'project-deep-dive',
    title: 'Project Deep-Dive',
    summary:
      'The most-asked part of ML interviews: explaining what you built, the choices you made and why.',
    iconKey: 'presentation',
    skillArea: null,
    needs: [],
    sortOrder: 17,
    subtopics: [
      {
        slug: 'project-pitch',
        title: 'Project overview and problem statement',
        summary:
          'Open with the problem, the users and the outcome, then walk through the solution.',
        complexity: 2,
        needs: [],
        concepts: [
          ['project.problem-statement', 'Framing the problem statement'],
          ['project.walkthrough', 'A two-minute project walkthrough'],
        ],
      },
      {
        slug: 'project-choices',
        title: 'Data, model and tool choices',
        summary:
          'Why this dataset, these features, this model and this stack, and what you compared.',
        complexity: 3,
        needs: ['project-deep-dive/project-pitch'],
        concepts: [
          ['project.data-choices', 'Data and preprocessing decisions'],
          ['project.model-choices', 'Model choice and alternatives'],
          ['project.tool-choices', 'Libraries, frameworks and tools'],
        ],
      },
      {
        slug: 'project-results',
        title: 'Results, metrics and impact',
        summary: 'How you measured success, what the numbers mean, and how you would improve them.',
        complexity: 3,
        needs: ['project-deep-dive/project-pitch'],
        concepts: [
          ['project.metrics', 'Choosing and reporting metrics'],
          ['project.improvement', 'Error analysis and next improvements'],
        ],
      },
      {
        slug: 'project-architecture',
        title: 'Architecture, deployment and challenges',
        summary: 'The end-to-end flow, where it runs, what broke, and how you fixed it.',
        complexity: 3,
        needs: ['project-deep-dive/project-pitch'],
        concepts: [
          ['project.architecture', 'End-to-end architecture'],
          ['project.deployment', 'Deployment and serving'],
          ['project.challenges', 'Challenges, trade-offs and lessons learned'],
        ],
      },
    ],
  },
  {
    slug: 'deep-learning',
    title: 'Deep Learning',
    summary:
      'Neural networks, CNNs for vision, and the sequence models and transformers behind NLP.',
    iconKey: 'layers',
    skillArea: 'dl-nlp',
    needs: [],
    sortOrder: 18,
    subtopics: [
      {
        slug: 'neural-network-fundamentals',
        title: 'Neural network fundamentals',
        summary: 'Neurons, layers, activation functions, forward pass and backpropagation.',
        complexity: 3,
        needs: ['ml-fundamentals/loss-gradient-descent'],
        concepts: [
          ['dl.neurons-layers', 'Neurons, layers and activation functions'],
          ['dl.backprop', 'Forward pass and backpropagation'],
        ],
      },
      {
        slug: 'training-deep-networks',
        title: 'Training deep networks',
        summary:
          'Optimizers, dropout, batch normalization and vanishing gradients, in PyTorch terms.',
        complexity: 4,
        needs: ['deep-learning/neural-network-fundamentals'],
        concepts: [
          ['dl.optimizers', 'SGD, momentum and Adam'],
          ['dl.regularization', 'Dropout, early stopping and batch normalization'],
          ['dl.gradients', 'Vanishing and exploding gradients'],
        ],
      },
      {
        slug: 'cnn-computer-vision',
        title: 'CNNs and computer vision',
        summary:
          'Convolutions, pooling, transfer learning, and object detection with IoU and YOLO.',
        complexity: 4,
        needs: ['deep-learning/neural-network-fundamentals'],
        concepts: [
          ['cv.convolution', 'Convolution, filters, stride and pooling'],
          ['cv.transfer-learning', 'Transfer learning and fine-tuning'],
          ['cv.object-detection', 'Object detection, IoU and YOLO'],
        ],
      },
      {
        slug: 'nlp-text-representation',
        title: 'Text preprocessing and representation',
        summary:
          'Tokenization, stop words, lemmatization, bag of words, TF-IDF and word embeddings.',
        complexity: 3,
        needs: [],
        concepts: [
          ['nlp.preprocessing', 'Tokenization, stop words and lemmatization'],
          ['nlp.tfidf', 'Bag of words and TF-IDF'],
          ['nlp.word-embeddings', 'Word embeddings'],
        ],
      },
      {
        slug: 'attention-transformers',
        title: 'Attention and transformers',
        summary: 'From RNNs and LSTMs to self-attention, multi-head attention, BERT and GPT.',
        complexity: 4,
        needs: ['deep-learning/nlp-text-representation'],
        concepts: [
          ['nlp.rnn-lstm', 'RNNs and LSTMs'],
          ['nlp.self-attention', 'Self-attention and multi-head attention'],
          ['nlp.bert-gpt', 'Encoder vs decoder models: BERT and GPT'],
        ],
      },
    ],
  },
  {
    slug: 'llms-agents',
    title: 'LLMs, Prompting & Agents',
    summary:
      'How large language models work, how to steer them, and how agents use them with tools.',
    iconKey: 'sparkles',
    skillArea: 'genai',
    needs: [],
    sortOrder: 19,
    subtopics: [
      {
        slug: 'how-llms-work',
        title: 'How LLMs work',
        summary: 'Tokens, context windows, pre-training, and what "generative" really means.',
        complexity: 3,
        needs: ['deep-learning/attention-transformers'],
        concepts: [
          ['llm.tokens-context', 'Tokens and the context window'],
          ['llm.pretraining', 'Pre-training and next-token prediction'],
          ['llm.genai-types', 'Types of generative AI'],
        ],
      },
      {
        slug: 'prompting-hallucinations',
        title: 'Prompting, parameters and hallucinations',
        summary: 'Prompt patterns, temperature and top-p, and how to reduce made-up answers.',
        complexity: 3,
        needs: ['llms-agents/how-llms-work'],
        concepts: [
          ['llm.prompting', 'Zero-shot, few-shot and system prompts'],
          ['llm.sampling', 'Temperature and top-p'],
          ['llm.hallucinations', 'Hallucinations and guardrails'],
        ],
      },
      {
        slug: 'agents-frameworks',
        title: 'Agents, tools and LLM frameworks',
        summary: 'Tool calling, agent loops, LangChain vs LangGraph, and MCP.',
        complexity: 4,
        needs: ['llms-agents/how-llms-work'],
        concepts: [
          ['llm.tool-calling', 'Tool calling and agent loops'],
          ['llm.frameworks', 'LangChain and LangGraph'],
          ['llm.mcp', 'Model Context Protocol (MCP)'],
        ],
      },
    ],
  },
  {
    // Existing topic: one new subtopic for the "RAG or fine-tuning?" question.
    slug: 'rag',
    title: 'Retrieval-Augmented Generation (RAG)',
    summary:
      'Giving an LLM the right facts at question time, so it answers from your documents instead of guessing.',
    iconKey: 'library',
    skillArea: 'genai',
    needs: [],
    subtopics: [
      {
        slug: 'fine-tuning-vs-rag',
        title: 'Fine-tuning vs RAG',
        summary: 'What fine-tuning changes, what RAG changes, and how to choose between them.',
        complexity: 4,
        needs: ['rag/rag-fundamentals'],
        sortOrder: 40,
        concepts: [
          ['rag.finetune.what', 'What fine-tuning is (full, LoRA)'],
          ['rag.finetune.choose', 'Choosing between RAG and fine-tuning'],
        ],
      },
    ],
  },
  {
    slug: 'sql-for-interviews',
    title: 'SQL for Interviews',
    summary: 'Writing the queries interviewers ask for, and the database basics behind them.',
    iconKey: 'database',
    skillArea: 'sql-data',
    needs: [],
    sortOrder: 40,
    subtopics: [
      {
        slug: 'sql-filter-aggregate',
        title: 'Filtering, grouping and aggregation',
        summary: 'SELECT, WHERE, GROUP BY, HAVING and ORDER BY, and WHERE vs HAVING.',
        complexity: 2,
        needs: [],
        concepts: [
          ['sql.filtering', 'SELECT, WHERE and ORDER BY'],
          ['sql.aggregation', 'GROUP BY and HAVING'],
        ],
      },
      {
        slug: 'sql-joins-windows',
        title: 'Joins and window functions',
        summary: 'INNER, LEFT and self joins, subqueries and CTEs, RANK and DENSE_RANK.',
        complexity: 3,
        needs: ['sql-for-interviews/sql-filter-aggregate'],
        concepts: [
          ['sql.joins', 'Joins and NULL handling'],
          ['sql.subqueries-ctes', 'Subqueries and CTEs'],
          ['sql.window-functions', 'Window functions'],
        ],
      },
      {
        slug: 'database-fundamentals',
        title: 'Keys, normalization and SQL vs NoSQL',
        summary: 'Primary and foreign keys, normal forms, indexes, and when to pick a NoSQL store.',
        complexity: 2,
        needs: [],
        concepts: [
          ['sql.keys-normalization', 'Keys and normalization'],
          ['sql.sql-vs-nosql', 'SQL vs NoSQL'],
        ],
      },
    ],
  },
  {
    slug: 'model-deployment',
    title: 'Model Deployment & System Design',
    summary: 'Serving a model behind an API, shipping it, and designing an ML system end to end.',
    iconKey: 'rocket',
    skillArea: 'mlops',
    needs: [],
    sortOrder: 50,
    subtopics: [
      {
        slug: 'fastapi-model-serving',
        title: 'Serving models with FastAPI and REST',
        summary:
          'REST basics, HTTP methods, request validation and a prediction endpoint in FastAPI.',
        complexity: 3,
        needs: [],
        concepts: [
          ['deploy.rest-http', 'REST and HTTP methods'],
          ['deploy.fastapi', 'A prediction endpoint with FastAPI'],
          ['deploy.auth', 'API keys and token authentication'],
        ],
      },
      {
        slug: 'docker-cloud-deployment',
        title: 'Docker, cloud and deployment',
        summary: 'Containerizing a model service and the cloud basics interviewers check.',
        complexity: 3,
        needs: ['model-deployment/fastapi-model-serving'],
        concepts: [
          ['deploy.docker', 'Docker images and containers'],
          ['deploy.cloud', 'Cloud deployment basics'],
        ],
      },
      {
        slug: 'ml-system-design-basics',
        title: 'ML system design basics',
        summary:
          'Designing an ML feature end to end: data, model, serving, latency, scaling and monitoring.',
        complexity: 4,
        needs: ['model-deployment/fastapi-model-serving'],
        concepts: [
          ['deploy.system-design', 'End-to-end ML system design'],
          ['deploy.scaling-latency', 'Scaling and latency'],
          ['deploy.monitoring', 'Monitoring and drift'],
        ],
      },
      {
        slug: 'git-engineering-basics',
        title: 'Git and engineering basics',
        summary:
          'Git workflow, branches and pull requests, and the CS basics that come up alongside.',
        complexity: 2,
        needs: [],
        concepts: [
          ['eng.git', 'Git workflow and branching'],
          ['eng.cs-basics', 'OS and networking basics'],
        ],
      },
    ],
  },
];

type Item = CurriculumSeed[string];
const item = (
  depth: Item['depth'],
  priority: Item['priority'],
  objectives: string[],
  rationale: string,
  extra: Partial<Item> = {},
): Item => ({ depth, priority, objectives, rationale, ...extra });

/** 3–6 LPA: under-8-LPA evidence. Core items at depth 2; less-asked ones short or optional. */
export const MLE_V2_3_6: CurriculumSeed = {
  'self-introduction-hr/self-introduction': item(
    2,
    'HIGH',
    [
      'Introduce yourself in about a minute: education, skills, strongest project',
      'Connect your skills to the ML Engineer role',
    ],
    `Asked at ${of72(49)}, usually as the first question. A clear start sets the tone for the whole interview.`,
  ),
  'self-introduction-hr/internship-experience': item(
    1,
    'HIGH',
    [
      'Tell one internship or team-project story in the STAR format',
      'Say exactly what you did yourself',
    ],
    `Asked at ${of72(34)}. Interviewers check what you personally did, not what the team did.`,
  ),
  'self-introduction-hr/hr-behavioural': item(
    1,
    'MEDIUM',
    [
      'Answer "why this role and this company?" with something specific',
      'Answer relocation, joining-date and CTC questions honestly',
    ],
    `Motivation and behavioural questions came up at ${of72(23)}, logistics (relocation, CTC) at ${of72(21)}.`,
  ),
  'self-introduction-hr/aptitude-reasoning': item(
    1,
    'LOW',
    ['Solve common numerical and logical-reasoning puzzles within the time limit'],
    'Only in online assessments for under-8-LPA roles (15% of those companies). Do it if your target companies test aptitude.',
    { optional: true },
  ),
  'python-for-interviews/python-core-concepts': item(
    2,
    'HIGH',
    [
      'Explain list vs tuple vs set and mutability with an example',
      'Write and explain a decorator, a lambda and a generator',
      'Handle errors with try/except/finally',
    ],
    `Python concept questions at ${of72(24)}: list vs tuple, mutability and decorators are the favourites.`,
  ),
  'python-for-interviews/python-oop': item(
    1,
    'MEDIUM',
    [
      'Define a class with __init__ and methods',
      'Explain the four OOP pillars with one example each',
    ],
    `Asked at ${of72(8)}, and often again in CS-fundamentals questions.`,
  ),
  'python-for-interviews/python-coding-round': item(
    2,
    'HIGH',
    [
      'Solve string problems: reverse, palindrome, anagram, character frequency',
      'Solve list and number problems: max, filter, prime, Armstrong, Fibonacci',
      'Explain your code line by line while you write it',
    ],
    `The most common coding task: asked at ${of72(28)}, and at 44% of under-8-LPA companies.`,
  ),
  'python-for-interviews/dsa-essentials': item(
    1,
    'MEDIUM',
    [
      'Use a dictionary or set to solve a lookup problem in O(n)',
      'State the time complexity of your solution',
    ],
    `DSA problems at ${of72(13)}. At this package, basic arrays and hashing are enough.`,
  ),
  'python-for-interviews/dsa-patterns': item(
    1,
    'MEDIUM',
    [
      'Find the longest substring without repeats with a sliding window',
      'Check balanced brackets with a stack',
      'Write a recursive function with a base case',
    ],
    'The longest substring without repeating characters is the most repeated DSA question at both packages; brackets and recursion trade-offs follow.',
  ),
  'ml-fundamentals/ai-ml-learning-types': item(
    2,
    'HIGH',
    [
      'Explain AI vs ML vs DL in your own words',
      'Give two examples each of supervised and unsupervised learning',
      'Walk through the ML lifecycle from data to deployment',
    ],
    `"What is ML / AI?" and "supervised vs unsupervised" were asked at ${of72(26)}, 52% of ML-titled roles.`,
  ),
  'ml-fundamentals/loss-gradient-descent': item(
    1,
    'MEDIUM',
    [
      'Explain what a loss function measures',
      'Describe gradient descent and the role of the learning rate',
    ],
    `Asked directly at ${of72(7)}; it also sits under every model and deep-learning answer.`,
  ),
  'ml-fundamentals/generalization-regularization': item(
    2,
    'HIGH',
    [
      'Explain overfitting and underfitting with a real example',
      'Explain the bias–variance trade-off',
      'Use a validation split or cross-validation, and name two ways to reduce overfitting',
    ],
    'A classic follow-up in ML and project rounds ("how did you avoid overfitting?"), asked by name at 6 companies and inside many project discussions.',
  ),
  'data-preparation/missing-outliers-duplicates': item(
    2,
    'HIGH',
    [
      'Find and handle missing values in pandas, and justify the method',
      'Detect outliers and decide whether to remove or cap them',
      'Remove duplicate records',
    ],
    `Data-cleaning questions at ${of72(10)}, plus "how did you prepare the data?" in project rounds (${of72(20)}).`,
  ),
  'data-preparation/encoding-scaling-leakage': item(
    1,
    'MEDIUM',
    [
      'Choose between one-hot and label encoding',
      'Explain why and when to scale features',
      'Spot data leakage',
    ],
    'Asked as preprocessing follow-ups in ML and project rounds.',
  ),
  'data-preparation/pandas-wrangling': item(
    1,
    'MEDIUM',
    ['Select rows with loc and iloc', 'Summarise data with groupby, and combine tables with merge'],
    'Pandas tasks (loc vs iloc, groupby, merge vs concat) appear in data-handling questions.',
  ),
  'data-preparation/statistics-for-ml': item(
    1,
    'LOW',
    ['Explain mean, median and standard deviation', 'Explain what a hypothesis test checks'],
    `Asked at ${of72(5)}. Good to know; rarely a full round at this package.`,
    { optional: true },
  ),
  'classical-ml-algorithms/linear-logistic-regression': item(
    2,
    'MEDIUM',
    ['Explain linear vs logistic regression', 'Interpret coefficients and the sigmoid output'],
    'The two baseline models interviewers expect you to explain from memory, often while discussing your project.',
  ),
  'classical-ml-algorithms/trees-ensembles': item(
    2,
    'MEDIUM',
    [
      'Explain how a decision tree splits',
      'Explain how Random Forest works and bagging vs boosting',
    ],
    'Random Forest and "bagging vs boosting" are the most-asked algorithm questions in the data.',
  ),
  'classical-ml-algorithms/knn-svm-naive-bayes': item(
    1,
    'MEDIUM',
    ['Explain how KNN, SVM and Naive Bayes classify', 'Name a use case for each'],
    `Asked at ${of72(6)}, mainly in under-8-LPA roles.`,
  ),
  'classical-ml-algorithms/clustering-pca': item(
    1,
    'MEDIUM',
    ['Explain K-Means and how to choose k', 'Explain what PCA does'],
    `Unsupervised-learning questions at ${of72(10)}.`,
  ),
  'model-evaluation/classification-metrics': item(
    2,
    'HIGH',
    [
      'Read a confusion matrix',
      'Explain precision, recall and F1, and when each matters',
      'Pick a metric for imbalanced data',
    ],
    `Metric questions at ${of72(16)}, plus "how did you evaluate it?" in project rounds. Precision vs recall is the favourite.`,
  ),
  'model-evaluation/regression-metrics': item(
    1,
    'MEDIUM',
    ['Explain MAE, RMSE and R², and which one to report'],
    'Asked when your project predicts a number.',
  ),
  'model-evaluation/model-selection-tuning': item(
    1,
    'MEDIUM',
    [
      'Justify a model choice for a small or imbalanced dataset',
      'Explain hyperparameter tuning with validation',
    ],
    `"Which model would you choose, and why?" at ${of72(5)} directly, and in most project discussions.`,
  ),
  'project-deep-dive/project-pitch': item(
    2,
    'HIGH',
    [
      'State your project’s problem, users and outcome in two sentences',
      'Walk through the solution in two minutes, end to end',
    ],
    `The most-asked part of ML interviews: project overview questions at ${of72(56)}.`,
    {
      implementation:
        'Write and rehearse the two-minute walkthrough of your best project, using the platform template.',
    },
  ),
  'project-deep-dive/project-choices': item(
    2,
    'HIGH',
    [
      'Justify your dataset, features and model, and name an alternative you considered',
      'Explain why you chose each library or tool',
    ],
    `"Why this model / this tool?" was asked at ${of72(39)}.`,
  ),
  'project-deep-dive/project-results': item(
    1,
    'MEDIUM',
    ['Report your metric and explain what it means', 'Say one thing you would improve next'],
    `Results and evaluation of the project at ${of72(22)}.`,
  ),
  'project-deep-dive/project-architecture': item(
    2,
    'HIGH',
    [
      'Draw the end-to-end flow of your project',
      'Explain where it runs and one challenge you solved',
    ],
    `Architecture, deployment and challenges of your project at ${of72(45)}.`,
  ),
  'deep-learning/neural-network-fundamentals': item(
    2,
    'HIGH',
    [
      'Explain a neuron, a layer and an activation function',
      'Explain backpropagation in plain words',
    ],
    `Neural-network questions at ${of72(15)}; deep learning overall at 52% of ML-titled roles.`,
  ),
  'deep-learning/training-deep-networks': item(
    1,
    'LOW',
    ['Name the common optimizers and what dropout does'],
    'Mostly asked at higher packages. A head start if you have time.',
    { optional: true },
  ),
  'deep-learning/cnn-computer-vision': item(
    1,
    'MEDIUM',
    ['Explain convolution and pooling', 'Explain transfer learning and IoU for detection'],
    `Computer-vision questions at ${of72(11)}, often about the candidate’s own CV project.`,
  ),
  'deep-learning/nlp-text-representation': item(
    2,
    'MEDIUM',
    [
      'Preprocess text: tokenization, stop words, lemmatization',
      'Explain TF-IDF and word embeddings',
    ],
    `NLP questions at ${of72(18)}.`,
  ),
  'deep-learning/attention-transformers': item(
    1,
    'MEDIUM',
    [
      'Explain why attention replaced RNNs',
      'Explain self-attention and BERT vs GPT at a high level',
    ],
    '"What is self-attention?" bridges NLP and LLM questions.',
  ),
  'llms-agents/how-llms-work': item(
    2,
    'HIGH',
    ['Explain what an LLM is and how it generates text', 'Explain tokens and the context window'],
    `LLM basics at ${of72(25)}. GenAI questions overall reached 45% of under-8-LPA companies.`,
  ),
  'llms-agents/prompting-hallucinations': item(
    1,
    'MEDIUM',
    [
      'Explain zero-shot vs few-shot prompting and temperature',
      'Name two ways to reduce hallucinations',
    ],
    `Prompting and hallucination questions at ${of72(11)}.`,
  ),
  'llms-agents/agents-frameworks': item(
    1,
    'MEDIUM',
    ['Explain what an AI agent is and what LangChain does'],
    `Agents and LLM frameworks at ${of72(22)}.`,
  ),
  'embeddings-vector-search/what-are-embeddings': item(
    2,
    'MEDIUM',
    [
      'Explain what an embedding is and why similar meanings are close',
      'Call an embedding model and inspect the vector',
    ],
    'Needed for every RAG and semantic-search answer.',
  ),
  'embeddings-vector-search/similarity-measures': item(
    1,
    'LOW',
    ['Compute cosine similarity between two vectors'],
    'Usually asked inside RAG questions ("what does the vector search return?").',
    { optional: true },
  ),
  'embeddings-vector-search/vector-databases-ann': item(
    1,
    'MEDIUM',
    ['Explain why a vector database is used instead of MySQL', 'Name two vector databases'],
    '"Why a vector database?" comes up whenever a project uses RAG.',
  ),
  'rag/rag-fundamentals': item(
    2,
    'HIGH',
    ['Draw the RAG pipeline and name each step', 'Explain why RAG reduces made-up answers'],
    `RAG is the most-asked GenAI topic: ${of72(29)}.`,
  ),
  'rag/chunking-strategies': item(
    2,
    'LOW',
    ['Explain why documents are chunked', 'Pick a chunk size and overlap and justify it'],
    'Comes up when your project uses RAG ("how did you split the documents?").',
    { optional: true },
  ),
  'rag/retrieval-quality': item(
    1,
    'LOW',
    ['Name two ways to improve weak retrieval, including re-ranking'],
    'Mostly asked at higher packages.',
    { optional: true },
  ),
  'rag/fine-tuning-vs-rag': item(
    1,
    'LOW',
    ['Explain fine-tuning vs RAG in one sentence each'],
    `Asked at ${of72(8)}, mostly at higher packages.`,
    { optional: true },
  ),
  'sql-for-interviews/sql-filter-aggregate': item(
    2,
    'MEDIUM',
    ['Write queries with WHERE, GROUP BY and HAVING', 'Explain WHERE vs HAVING'],
    `SQL questions at ${of72(22)}.`,
  ),
  'sql-for-interviews/sql-joins-windows': item(
    2,
    'MEDIUM',
    ['Write INNER and LEFT joins and handle NULLs', 'Rank rows with a window function'],
    'Joins are the most-asked SQL task; window functions follow.',
  ),
  'sql-for-interviews/database-fundamentals': item(
    1,
    'LOW',
    ['Explain primary vs foreign keys and normalization', 'Explain SQL vs NoSQL'],
    'DBMS basics come up alongside SQL questions.',
  ),
  'model-deployment/fastapi-model-serving': item(
    2,
    'MEDIUM',
    ['Explain REST and the main HTTP methods', 'Serve a model prediction with a FastAPI endpoint'],
    `API and FastAPI questions at ${of72(22)}.`,
  ),
  'model-deployment/docker-cloud-deployment': item(
    1,
    'LOW',
    ['Explain what Docker does and how you would deploy a model service'],
    `Deployment and cloud questions at ${of72(20)}, more at higher packages.`,
  ),
  'model-deployment/ml-system-design-basics': item(
    1,
    'LOW',
    ['Sketch the components of an ML system from data to monitoring'],
    'A full system-design round is rare at this package; this is a head start.',
    { optional: true },
  ),
  'model-deployment/git-engineering-basics': item(
    1,
    'LOW',
    ['Explain your Git workflow: branch, commit, pull request'],
    `CS and Git basics came up at ${of72(22)}, usually as quick checks.`,
    { optional: true },
  ),
};

/** 8–12 LPA: 8-LPA-and-above evidence. Core items at depth 3; GenAI and architecture deeper. */
export const MLE_V2_8_12: CurriculumSeed = {
  'self-introduction-hr/self-introduction': item(
    2,
    'HIGH',
    [
      'Introduce yourself in about a minute and lead with measurable impact',
      'Connect your projects to the company’s product',
    ],
    'Self-introduction at 78% of companies hiring at 8 LPA or more.',
  ),
  'self-introduction-hr/internship-experience': item(
    2,
    'HIGH',
    ['Tell two STAR stories: one success, one problem you solved', 'Quantify your contribution'],
    'Experience questions at 61% of 8+ LPA companies.',
  ),
  'self-introduction-hr/hr-behavioural': item(
    2,
    'HIGH',
    [
      'Answer motivation and behavioural questions with specific examples',
      'Handle CTC and relocation questions',
    ],
    'Behavioural and logistics questions at 56% of 8+ LPA companies.',
  ),
  'python-for-interviews/python-core-concepts': item(
    3,
    'HIGH',
    [
      'Explain mutability, references and copying with examples',
      'Write decorators, generators and context managers',
      'Explain how Python runs code (interpreter, GIL at a high level)',
    ],
    'Python concepts at 33% of 8+ LPA companies, asked in more depth.',
  ),
  'python-for-interviews/python-oop': item(
    2,
    'MEDIUM',
    ['Design a small class hierarchy', 'Explain the four OOP pillars with examples'],
    'OOP and class-design questions appear across rounds.',
  ),
  'python-for-interviews/python-coding-round': item(
    2,
    'MEDIUM',
    [
      'Solve string, list and number problems cleanly and quickly',
      'Test your solution on edge cases',
    ],
    'Basic coding at 22% of 8+ LPA companies: often a warm-up before DSA.',
  ),
  'python-for-interviews/dsa-essentials': item(
    3,
    'HIGH',
    [
      'Solve array, hashing and two-pointer problems',
      'Use sorting and binary search',
      'Analyse time and space complexity',
    ],
    'DSA problems at 33% of 8+ LPA companies, against 13% below 8 LPA.',
  ),
  'python-for-interviews/dsa-patterns': item(
    3,
    'HIGH',
    [
      'Solve substring and subarray questions with fixed and growing windows',
      'Use running totals with a dict when numbers can be negative',
      'Use stacks, recursion and memoisation, and state their memory cost',
    ],
    'Sliding windows, subarray sums with negatives, min cost climbing stairs and recursion trade-offs are asked at 8+ LPA.',
  ),
  'ml-fundamentals/ai-ml-learning-types': item(
    2,
    'HIGH',
    ['Explain the learning types with real use cases', 'Walk through the ML lifecycle'],
    'Asked by most ML-titled roles, at every package.',
  ),
  'ml-fundamentals/loss-gradient-descent': item(
    3,
    'MEDIUM',
    [
      'Derive the gradient-descent update for linear regression',
      'Choose a loss function for regression and classification',
      'Explain batch vs mini-batch vs stochastic gradient descent',
    ],
    'Loss and optimization questions at 17% of 8+ LPA companies.',
  ),
  'ml-fundamentals/generalization-regularization': item(
    3,
    'HIGH',
    [
      'Diagnose overfitting from training and validation curves',
      'Explain the bias–variance trade-off with model examples',
      'Compare L1 and L2 regularization',
    ],
    'A standard depth question at this package.',
  ),
  'data-preparation/missing-outliers-duplicates': item(
    2,
    'MEDIUM',
    ['Choose an imputation strategy and justify it', 'Treat outliers without losing signal'],
    'Data-cleaning questions, plus data decisions in project rounds.',
  ),
  'data-preparation/encoding-scaling-leakage': item(
    3,
    'MEDIUM',
    [
      'Choose encodings for high-cardinality features',
      'Build preprocessing that avoids leakage (fit on train only)',
      'Select features with a clear reason',
    ],
    'Leakage and feature questions separate strong candidates here.',
  ),
  'data-preparation/pandas-wrangling': item(
    2,
    'MEDIUM',
    ['Wrangle data with loc/iloc, groupby, merge and pivot'],
    'Pandas tasks appear in data-handling rounds.',
  ),
  'data-preparation/statistics-for-ml': item(
    2,
    'LOW',
    ['Explain distributions, correlation and hypothesis tests', 'Interpret a p-value correctly'],
    'Statistics questions at 11% of 8+ LPA companies.',
    { optional: true },
  ),
  'classical-ml-algorithms/linear-logistic-regression': item(
    3,
    'HIGH',
    [
      'Explain the assumptions of linear regression',
      'Explain logistic regression, log-odds and the decision threshold',
    ],
    'Expected as fluent fundamentals at this package.',
  ),
  'classical-ml-algorithms/trees-ensembles': item(
    3,
    'HIGH',
    [
      'Explain Gini vs entropy and pruning',
      'Compare bagging and boosting, and Random Forest vs XGBoost',
      'Read feature importance',
    ],
    'Ensemble questions are a staple of ML rounds at this package.',
  ),
  'classical-ml-algorithms/knn-svm-naive-bayes': item(
    2,
    'MEDIUM',
    ['Explain KNN, SVM (margins, kernels) and Naive Bayes', 'Pick one for a given dataset'],
    'Classic-classifier questions as follow-ups.',
  ),
  'classical-ml-algorithms/clustering-pca': item(
    3,
    'MEDIUM',
    ['Choose k with elbow and silhouette scores', 'Explain PCA and explained variance'],
    'Unsupervised questions at 11% of 8+ LPA companies.',
  ),
  'model-evaluation/classification-metrics': item(
    3,
    'HIGH',
    [
      'Choose precision, recall or F1 from the business cost of errors',
      'Explain ROC-AUC vs PR-AUC',
      'Handle imbalance with class weights, resampling and thresholds',
    ],
    'Metric questions at 28% of 8+ LPA companies, often as a trade-off.',
  ),
  'model-evaluation/regression-metrics': item(
    2,
    'MEDIUM',
    ['Explain MAE, RMSE and R², and how outliers affect each'],
    'Asked when your project predicts a number.',
  ),
  'model-evaluation/model-selection-tuning': item(
    3,
    'HIGH',
    [
      'Compare models with cross-validation',
      'Tune hyperparameters without overfitting the validation set',
    ],
    'Model choice is asked in most project discussions at this package (78% of 8+ LPA companies).',
  ),
  'project-deep-dive/project-pitch': item(
    3,
    'HIGH',
    [
      'Pitch your project with its business impact and your role',
      'Adapt the walkthrough to a 2-minute and a 10-minute version',
    ],
    'Project overview at 83% of 8+ LPA companies.',
    {
      implementation:
        'Prepare two versions of your project walkthrough (2 and 10 minutes) using the platform template.',
    },
  ),
  'project-deep-dive/project-choices': item(
    3,
    'HIGH',
    [
      'Defend every choice: data, features, model, stack',
      'Compare the alternatives you considered with evidence',
    ],
    '"Why this model / this tool?" at 78% of 8+ LPA companies.',
  ),
  'project-deep-dive/project-results': item(
    3,
    'MEDIUM',
    [
      'Explain your metrics, baseline and error analysis',
      'Propose the next improvement and how you would measure it',
    ],
    'Results and evaluation at 39% of 8+ LPA companies.',
  ),
  'project-deep-dive/project-architecture': item(
    4,
    'HIGH',
    [
      'Explain the architecture with trade-offs, latency and failure handling',
      'Explain how you would scale it and monitor it',
    ],
    'Architecture, deployment and scale at 83% of 8+ LPA companies, the hardest project questions.',
  ),
  'deep-learning/neural-network-fundamentals': item(
    3,
    'HIGH',
    ['Explain backpropagation with the chain rule', 'Choose activation functions and explain why'],
    'Neural-network questions at 22% of 8+ LPA companies.',
  ),
  'deep-learning/training-deep-networks': item(
    3,
    'MEDIUM',
    [
      'Compare SGD, momentum and Adam',
      'Use dropout, batch norm and early stopping',
      'Debug vanishing gradients and a loss that will not go down',
    ],
    'Training and PyTorch questions appear with deep-learning projects.',
  ),
  'deep-learning/cnn-computer-vision': item(
    3,
    'MEDIUM',
    [
      'Explain CNN architecture and transfer learning',
      'Explain detection metrics (IoU, NMS) and YOLO',
    ],
    'Computer-vision questions at 17% of 8+ LPA companies.',
  ),
  'deep-learning/nlp-text-representation': item(
    3,
    'MEDIUM',
    ['Compare bag of words, TF-IDF and embeddings', 'Build a text-classification pipeline'],
    'NLP questions at 33% of 8+ LPA companies.',
  ),
  'deep-learning/attention-transformers': item(
    3,
    'HIGH',
    [
      'Explain self-attention and multi-head attention',
      'Compare encoder-only, decoder-only and encoder-decoder models',
    ],
    'Transformers connect NLP and LLM questions, which dominate at this package.',
  ),
  'llms-agents/how-llms-work': item(
    3,
    'HIGH',
    [
      'Explain pre-training, instruction tuning and next-token prediction',
      'Explain tokens, context windows and their limits',
    ],
    'LLM basics at 50% of 8+ LPA companies.',
  ),
  'llms-agents/prompting-hallucinations': item(
    3,
    'HIGH',
    [
      'Design prompts with system instructions and few-shot examples',
      'Explain temperature and top-p',
      'Reduce hallucinations with grounding and guardrails',
    ],
    'Prompting and hallucination questions at 28% of 8+ LPA companies.',
  ),
  'llms-agents/agents-frameworks': item(
    3,
    'HIGH',
    [
      'Explain tool calling and the agent loop',
      'Compare LangChain and LangGraph',
      'Explain what MCP standardises',
    ],
    'Agents and frameworks at 50% of 8+ LPA companies.',
  ),
  'embeddings-vector-search/what-are-embeddings': item(
    3,
    'MEDIUM',
    ['Choose an embedding model by dimension, cost and quality', 'Explain when embeddings fail'],
    'Embedding-model choice is asked whenever a project uses RAG.',
  ),
  'embeddings-vector-search/similarity-measures': item(
    3,
    'MEDIUM',
    ['Explain when cosine and dot product agree', 'Choose a similarity threshold'],
    'Similarity questions come up inside RAG discussions.',
  ),
  'embeddings-vector-search/vector-databases-ann': item(
    3,
    'MEDIUM',
    ['Explain approximate search (HNSW) and metadata filters', 'Justify your vector store choice'],
    'Vector-store choice ("why Milvus / why not MongoDB?") at this package.',
  ),
  'rag/rag-fundamentals': item(
    3,
    'HIGH',
    [
      'Design a RAG pipeline for a given use case',
      'Explain its failure modes and how to detect them',
    ],
    'RAG at 56% of 8+ LPA companies, the most-asked GenAI topic.',
  ),
  'rag/chunking-strategies': item(
    3,
    'MEDIUM',
    ['Compare chunking strategies', 'Choose chunk size and overlap and keep metadata'],
    'Chunking questions at 28% of 8+ LPA companies.',
  ),
  'rag/retrieval-quality': item(
    3,
    'MEDIUM',
    ['Improve retrieval with hybrid search and re-ranking', 'Measure retrieval with recall@k'],
    'Re-ranking and retrieval quality are asked at this package.',
  ),
  'rag/fine-tuning-vs-rag': item(
    3,
    'MEDIUM',
    ['Explain full fine-tuning vs LoRA', 'Choose between RAG and fine-tuning for a scenario'],
    '"Why didn’t you fine-tune?" at 22% of 8+ LPA companies.',
  ),
  'sql-for-interviews/sql-filter-aggregate': item(
    2,
    'MEDIUM',
    ['Write grouped, filtered queries quickly', 'Explain WHERE vs HAVING'],
    'SQL questions at 39% of 8+ LPA companies.',
  ),
  'sql-for-interviews/sql-joins-windows': item(
    3,
    'MEDIUM',
    ['Write multi-table joins with aggregation', 'Use RANK, DENSE_RANK and running totals'],
    'Joins and window functions are the deeper SQL tasks.',
  ),
  'sql-for-interviews/database-fundamentals': item(
    2,
    'LOW',
    ['Explain keys, normalization and indexes', 'Choose SQL or NoSQL for a scenario'],
    'DBMS basics come up alongside SQL questions.',
  ),
  'model-deployment/fastapi-model-serving': item(
    3,
    'HIGH',
    [
      'Build a FastAPI prediction endpoint with request validation',
      'Explain authentication with API keys and JWT',
    ],
    'API and FastAPI questions at 33% of 8+ LPA companies.',
  ),
  'model-deployment/docker-cloud-deployment': item(
    2,
    'MEDIUM',
    ['Containerize a model service with Docker', 'Explain a cloud deployment and scaling options'],
    'Deployment and cloud questions at 39% of 8+ LPA companies.',
  ),
  'model-deployment/ml-system-design-basics': item(
    3,
    'MEDIUM',
    [
      'Design an ML system end to end, with latency and cost',
      'Plan monitoring for data and model drift',
    ],
    'System-design questions grow at this package; a full design round is for the separate ML System Design track.',
  ),
  'model-deployment/git-engineering-basics': item(
    1,
    'LOW',
    ['Explain your Git workflow: branch, commit, pull request'],
    'CS and Git basics come up as quick checks.',
    { optional: true },
  ),
};

/**
 * V1 (2026-11-19, after the product review): ML only, one algorithm per unit, each taught in depth.
 * Both packages get the same units for now. A unit with no published lesson shows as "Coming soon".
 * Order: the DSML Classical ML track, with the most-asked algorithms first.
 */
const v1 = (objectives: string[], extra: Partial<Item> = {}): Item =>
  item(
    1,
    'HIGH',
    objectives,
    'Part of the V1 Classical ML release: one algorithm per unit, taught in depth.',
    {
      // Measured from the written lessons; the units still to come are planned to the same shape.
      estimateMinutes: 50,
      ...extra,
    },
  );

export const MLE_V1_CLASSICAL: CurriculumSeed = {
  'supervised-learning/k-nearest-neighbors': v1(
    [
      'Explain KNN step by step: distances, the K nearest neighbours and the vote',
      'Choose K, and explain overfitting, underfitting and ties',
      'Compute weighted and probabilistic KNN by hand',
      'Say when KNN fits a problem and when it fails: scale, cost and many dimensions',
    ],
    { implementation: 'Write KNN prediction from scratch in NumPy, then use scikit-learn.' },
  ),
  'supervised-learning/linear-regression': v1([
    'Fit a line by least squares and read its slope, intercept and residuals',
    'Fit the same line by gradient descent, one update at a time',
    'Extend to multiple and polynomial features',
    'Check the assumptions and explain what breaks when they fail',
  ]),
  'supervised-learning/logistic-regression': v1([
    'Turn a linear score into a probability with the sigmoid',
    'Compute log loss by hand and explain why it is used',
    'Choose a decision threshold and describe the decision boundary',
  ]),
  'supervised-learning/decision-trees': v1([
    'Compute Gini, entropy and information gain for a split by hand',
    'Explain how depth causes overfitting and how pruning fixes it',
    'Explain how a tree predicts a number',
  ]),
  'supervised-learning/random-forest-bagging': v1([
    'Explain bagging and why averaging trees cuts variance',
    'Explain random feature subsets and out-of-bag error',
    'Read feature importance and know its limits',
  ]),
  'supervised-learning/boosting': v1([
    'Explain how boosting differs from bagging',
    'Walk through AdaBoost weights and gradient boosting on residuals',
    'Name what XGBoost adds, and tune its main settings',
  ]),
  'supervised-learning/naive-bayes': v1([
    'Apply Bayes rule to classify a small example by hand',
    'Explain the independence assumption and Laplace smoothing',
    'Pick the Gaussian, multinomial or Bernoulli variant for a problem',
  ]),
  'supervised-learning/support-vector-machines': v1([
    'Explain the margin and which points are support vectors',
    'Explain what C trades off in a soft margin',
    'Explain kernels and when a curved boundary is needed',
  ]),
  'unsupervised-learning/k-means-clustering': v1([
    'Run the assign and update steps by hand',
    'Choose K with the elbow method and the silhouette score',
    'Explain k-means++ initialisation and where K-Means fails',
  ]),
  'unsupervised-learning/hierarchical-dbscan': v1([
    'Read a dendrogram and compare linkage methods',
    'Explain eps, min samples and noise points in DBSCAN',
    'Choose between K-Means, hierarchical clustering and DBSCAN',
  ]),
  'unsupervised-learning/pca': v1([
    'Explain PCA as finding the directions of most variance',
    'Walk through the steps: centre, covariance, eigenvectors, project',
    'Choose the number of components from the explained variance',
  ]),
};

export const MLE_V1_CHANGE_NOTE =
  'V1 scope: ML only, starting with Classical ML. One algorithm per unit, in depth with live calculations; units without a published lesson show as Coming soon. Other topics are hidden, not deleted.';

export const MLE_V2_CHANGE_NOTE =
  'ML Engineer interview-prep curriculum v2: topics, priorities and depths from the Hiring Intelligence data (72 ML/AI companies, 3,293 questions). Draft for content-team review.';
