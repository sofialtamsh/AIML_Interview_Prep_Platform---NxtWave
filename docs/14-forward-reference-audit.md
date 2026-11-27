# Forward-reference audit of the archived lessons (2026-11-27)

**Rule (product owner):** a lesson never compares with, or relies on, an algorithm or technique taught
in a later lesson. The comparison waits for the later lesson ("when we learn K-Means, that time we can
do this comparison").

**Scope.** The 27 lessons in `apps/api/src/modules/content/library/mle` that are archived (hidden from
students). They were checked against the library's old order, below. The course order is being
revised, so fix these when the new order is set: a finding can disappear, or a new one appear, if a
lesson moves. The three live units (linear regression, logistic regression, KNN) were fixed on the
same day.

Old order: 1 self-introduction, 2 internship-experience, 3 hr-behavioural, 4 aptitude-reasoning,
5 python-core-concepts, 6 python-oop, 7 python-coding-round, 8 dsa-essentials, 9 dsa-patterns,
10 numpy-arrays-vectorization, 11 broadcasting-array-ops, 12 linear-algebra-essentials,
13 ai-ml-learning-types, 14 loss-gradient-descent, 15 generalization-regularization,
16 missing-outliers-duplicates, 17 encoding-scaling-leakage, 18 pandas-wrangling, 19 statistics-for-ml,
then the Classical ML units (linear regression, logistic regression, KNN, naive Bayes, decision trees,
random forest, boosting, SVM, K-Means, hierarchical/DBSCAN, PCA), then 23 neural-network-fundamentals,
24 training-deep-networks, 25 cnn-computer-vision, 26 nlp-text-representation,
27 attention-transformers, 28 how-llms-work, 29 prompting-hallucinations, 30 agents-frameworks.

**Totals.** 20 comparisons (A, must move), about 85 reliances (B, reword or move), 7 lessons clean
(aptitude-reasoning, python-core-concepts, dsa-essentials, dsa-patterns, pandas-wrangling,
neural-network-fundamentals, cnn-computer-vision). Most findings sit in lessons 13–17, which were
written for students who already knew the models: most fixes are "move to the matching Classical ML
unit", and that unit often already covers the point.

## Order problems (whole lessons)
- **16 missing-outliers-duplicates and 17 encoding-scaling-leakage** use pandas throughout
  (`pd.DataFrame`, `fillna`, `drop_duplicates`, `get_dummies`), first taught in **18**, and statistics
  (standard deviation, z-score, skew, correlation) taught in **19**. Fix: put 18 and 19 before 16.
- **7 python-coding-round** uses "two pointers" and O(n), taught in **8 dsa-essentials**. Low priority:
  reorder, or keep the in-place explanation and drop the label.

## A: comparisons (move to the later lesson)
| Lesson | Where | Quote | Taught in | Fix |
|---|---|---|---|---|
| 2 internship | slides.impact "Defend each decision"; card "Why did you use TF-IDF…"; playbook follow-up | "Why logistic regression? Why not BERT?" | logistic regression, 27, 28 | "Why this model, not a bigger one?" |
| 10 numpy | card "NumPy and pandas" | "how is it different from pandas?" | 18 | Delete; 18 has the same card |
| 13 ai-ml | slides.definitions "Classic ML or deep learning" | "gradient-boosted trees before a neural network" | boosting, 23 | Keep only AI ⊃ ML ⊃ DL |
| 13 | slides.deeper "Generative and discriminative models" | "Logistic regression, SVM" vs "Naive Bayes, GANs, LLMs" | several | Move to naive Bayes |
| 13 | slides.deeper "Parametric and non-parametric models" | "linear regression keeps one weight… k-NN keeps every row" | linear regression, KNN | Move to KNN |
| 14 loss-gd | slides.gradient "Bowls, valleys and saddles" | "why deep networks use Adam" | 24 | Keep the bowl; move saddles and Adam |
| 14 | card "Linear and logistic losses" | "Why not MSE for both?" | linear, logistic | Move to logistic regression |
| 14 | card "Local minima" | "Neural network losses have many valleys" | 23/24 | Drop the network half |
| 15 generalization | slides.bias-variance "Models along the trade-off" | "k-NN with k = 1… Random forest… Boosting" | KNN, RF, boosting | Use polynomial degree; move the rest |
| 16 missing | slides.outliers "Five ways to handle an outlier" (note) | "tree models are hardly moved… linear models and KNN are" | trees, KNN, linear | Keep mean vs median; move the model part |
| 17 encoding | slides.encoding "Match the encoding to the model" | "Linear models, KNN, SVM, neural networks" vs "Tree models" | several | Keep ordered vs unordered; move the split |
| 17 | slides.scaling "Who needs scaling" | "KNN, K-means, SVM… vs trees, random forests, XGBoost" | KNN → boosting | Move to tree and boosting units |
| 17 | try "Scaling for a random forest" | "switch from logistic regression to a random forest" | RF | Move to RF |
| 17 | quiz item `trees` | "Which model does not need feature scaling?" | same | Move |
| 17 | card "Why scale" | "Distance-based models like KNN, K-means and SVM… Tree models do not need it" | same | Reword: big ranges dominate distances, slow gradient descent |
| 24 training | slides.deeper "Batch norm vs layer norm" | "used in transformers" | 27 | Move the layer-norm contrast to 27 |
| 26 nlp | slides.preprocess-pro "BERT-style models need less cleaning"; try "Cleaning before BERT" | "Counts and TF-IDF" vs "BERT-style models" | 27 | Move to 27 |
| 26 | slides.deeper "Static vs contextual"; card of the same name | "Contextual models such as BERT…" | 27 | Move to 27 |
| 26 | tokenization card | "How is it different in a transformer model such as BERT?" | 27/28 | Drop the second question |
| 28 llms | slides.training "Pre-train, fine-tune or prompt" | "Prompting and RAG — No training…" | 29, RAG | Keep pre-train vs fine-tune |

## B: reliance (reword or move), by lesson
- **1 self-intro:** "resume screener using sentence embeddings" and its follow-up; an option "GenAI chatbot… LLM skills". Use a neutral project.
- **2 internship:** the TF-IDF + logistic regression story; F1, precision, recall.
- **3 hr:** "classified leaf images with a CNN"; "random forest and I wanted logistic regression" → "two models".
- **6 python-oop:** "You already use OOP in ML code" with PyTorch `nn.Module` → move to 24.
- **10 numpy:** "`np.maximum(x, 0)` is ReLU".
- **11 broadcasting:** "nearest-neighbour search and clustering"; "a stable softmax" card; playground.scale uses min-max and standardisation (17).
- **12 linear-algebra:** "A neuron is a dot product", "A neural network layer"; "Why cosine for embeddings"; "Choosing a similarity threshold" (precision, recall); the similarity playbook (embedding model, HNSW, recall@k); lasso and ridge in "L1 or L2". Say "vectors", not "embeddings".
- **13 ai-ml:** "Pick the first model" options (logistic regression, tree, deep network, LLM); distractor "Overfitting"; "LLMs are pre-trained with self-supervision"; `LogisticRegression` code; summary "boosted trees often beats a neural network".
- **14 loss-gd:** "Which loss for which model"; kicker "Linear regression"; hint "exactly how linear regression is trained"; check item `logistic-loss`; playbook "Limits" (Adam); "Linear regression: MSE. Logistic regression: log loss."
- **15 generalization:** ensembles and random forest (several places); dropout (three places); "A deep tree on little data"; try "Name the problem"; weight-decay note; Lasso code comment; card "Try an ensemble like a random forest".
- **16 missing:** "KNN imputation" slide and card → "nearest-rows imputation", or move to KNN.
- **17 encoding:** "KNN predicts from the nearest rows; K-means and SVM also use distances"; "SVM and PCA" note; **widget.scaling "Explore scaling with KNN"** (built on KNN: move to the KNN unit); pipelines with logistic regression; "Test recall jumps to 99%"; "tree importance"; "In deep learning, learn an embedding."
- **19 statistics:** "can make a linear model's weights unstable."
- **24 training:** ResNet and CNN examples (25); "Warm-up… common for transformers" (27); "skip connections, as in ResNet".
- **26 nlp:** WordPiece/BPE tokenizers (28); semantic search and RAG; hybrid-search note; "Where do embeddings fit in a RAG pipeline?"; "fine-tune a transformer"; "BERT-base models give 768"; "skip both for BERT".
- **27 attention:** "tuned on instructions and human feedback" (28).
- **28 llms:** RAG mentions (several); `foundation` rubric line; chat flow with retrieved documents; "hallucination" bullet (29).
- **29 prompting:** "the heart of RAG, which a later unit builds"; playbook "(RAG)"; card "Invented clauses in RAG" → move to RAG.
- **30 agents:** "What LangChain is" card mentions RAG (only a problem if RAG comes after 30).

| Lesson | A | B |
|---|---|---|
| self-intro | 0 | 2 |
| internship | 1 | 2 |
| hr | 0 | 2 |
| python-oop | 0 | 1 |
| coding-round | 0 | 2 |
| numpy | 1 | 1 |
| broadcasting | 0 | 3 |
| linear-algebra | 0 | 6 |
| ai-ml | 3 | 5 |
| loss-gd | 3 | 6 |
| generalization | 1 | 7 |
| missing | 1 | 2 + order |
| encoding | 5 | 7 + order |
| statistics | 0 | 1 |
| training | 1 | 3 |
| nlp | 3 | 5 |
| attention | 0 | 1 |
| llms | 1 | 5 |
| prompting | 0 | 3 |
| agents | 0 | 1 |
