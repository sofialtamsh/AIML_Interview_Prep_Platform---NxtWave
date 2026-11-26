# Development Progress Tracker

| Phase | Status | Date |
|---|---|---|
| 0 · Blueprint (docs 01–10, gap analysis vs the manager's prototype and competitors) | ✅ Done | 2026-11-03 |
| 1 · Foundation (monorepo, API, DB, auth, RBAC, both app shells) | ✅ Done | 2026-11-03 |
| 2 · Catalog and onboarding | ✅ Done | 2026-11-03 |
| 3 · Curriculum and planner (dual-path topic page) | ✅ Done | 2026-11-03 |
| 3.1 · Smart planner (prep timeline, paces, week by week, calendar) | ✅ Done | 2026-11-03 |
| 4 · Content engine ⭐ (AI generation + evaluation, lesson player) | 🚧 4A + 4B done (lessons, player, AI agents); 4C pilot lessons next | 2026-11-05 (4B) |
| Pilot v2 · ML Engineer focus (team study plan, hidden pickers, Practice tab, technical titles) | ✅ Done | 2026-11-05 |
| Pilot v2.1 · MLE curriculum from interview data, topic-tagged practice, 11★ for questions | ✅ Done | 2026-11-05 |
| Pilot v2.2 · Hiring data for super admins, animated visuals, lesson library (Topic 1 written and reviewed) | ✅ Done | 2026-11-06 |
| Pilot v2.3 · Slide-deck lessons, coding-ground code UI, Topic 1 rebuilt as slides, Python core concepts | ✅ Done | 2026-11-09 |
| Pilot v2.4 · Moving pictures (26-animation library), real-world hooks, deck play mode, no-data-citation guard | ✅ Done | 2026-11-10 |
| Pilot v2.5 · Python for Interviews unit 2: OOP lesson (story + moving picture per concept), 7 OOP animations | ✅ Done | 2026-11-12 |
| Pilot v2.6 · Deep Learning units 1–3 (neural networks, training, CNNs and vision), 13 DL animations, shuffled answer options | ✅ Done | 2026-11-12 |
| Pilot v2.7 · Deep Learning unit 4: text preprocessing and representation (NLP), 7 NLP animations | ✅ Done | 2026-11-12 |
| Pilot v2.8 · Deep Learning unit 5: attention and transformers, 9 sequence-model and transformer animations | ✅ Done | 2026-11-12 |
| Pilot v2.9 · LLMs topic unit 1: how LLMs work, 6 LLM animations | ✅ Done | 2026-11-12 |
| Pilot v2.10 · Admin → Content coverage (content readiness, roadmap runway, interview-evidence gaps) | ✅ Done | 2026-11-13 |
| Pilot v2.11 · Interview-quality pass on all lessons, DSA + ML Fundamentals lessons, interactive explorers | ✅ Done | 2026-11-18 |
| Pilot v2.12 · Pre-publish review and publishing of all lessons; Data Preparation module (4 units, 4 new explorers) | ✅ Done | 2026-11-18 |
| Pilot v2.13 · Python & NumPy for AI module (3 units, 5 new explorers, 15 animations), reviewed and published | ✅ Done | 2026-11-18 |
| 5 · Question bank and practice | Planned | – |
| 6 · Research and curriculum agents | Planned | – |
| 7 · Video and system design case studies | Planned | – |
| 8 · Analytics and admin dashboards | Planned | – |
| 9 · Hardening and deployment | Planned | – |

---

## Pilot v2.13 report: the Python & NumPy for AI module (2026-11-18)

**The ask.** The product owner asked for the three units of the Python & NumPy for AI module, with playgrounds, reviewed and published like the Data Preparation units.

**1. Three units, all depth 1, all published as v1.**

| Unit | Length | Contents | Explorers |
|---|---|---|---|
| NumPy arrays and vectorization | 40 min | Lists vs arrays; shape, ndim, size and dtype; mixed types and uint8 overflow; vectorised GST on every order; why NumPy is faster; ufuncs, `np.min` vs `np.minimum`, `np.where`; 1-D and 2-D slicing (`a[1]` vs `a[1:2]`, `a[1:5, :]` vs `a[1:5]`); boolean masks; fancy indexing and top-k with argsort; views vs copies, including writes through a mask; a sensor-cleaning playground | array-index-explorer |
| Broadcasting and array operations | 44 min | Aggregating along an axis, argmax, keepdims and row shares; the broadcasting rule; a shape error and its fix; the silent (n,) vs (n, 1) loss bug; pairwise distances with a practice task; reshape, -1, transpose vs reshape, new axes, ravel vs flatten; concatenate vs stack; a column-scaling playground | axis-explorer, broadcast-explorer |
| Linear algebra essentials for AI | 47 min | The dot product by hand and in NumPy; its geometry; a neuron as a dot product; L1 and L2 norms and distances; unit vectors and cosine similarity; choosing a similarity threshold; matrix multiplication, `*` vs `@`, order, by-hand loops and plain-Python transpose; batch scoring with `Q @ D.T`; a dense layer; a batch-search playground where raw dot products pick the wrong document | vector-explorer, matmul-explorer |

- All code was checked on NumPy 2.5.4 and on NumPy 2.4.6, the version the browser runs; both print the same. Runnable code never prints integer dtypes, because the browser's default integer can differ from a 64-bit PC's.
- Three independent reviewers (one per unit) re-ran every snippet on both versions, recomputed every number and drove every explorer state. They proposed 40 fixes (4 must), all applied. The must-fixes:
  - "a mask makes a copy" now says that writing through a mask (`a[a < 0] = 0`) still changes the array;
  - the `np.linalg.norm` card no longer claims `ord=1` sums a matrix's absolute values (it is the largest column sum);
  - transposing a matrix without NumPy, an asked question, now has a practice task and a card.
- Explorer bugs the reviewers found and that are fixed: a broadcast verdict that said "both have 1" when one array had no axis; integer `marks @ marks.T` printed as floats; the exact NumPy warning for a zero vector.
- 15 new animations (arrays, broadcasting, linear algebra) were checked on contact sheets in light and dark.

**2. Five new explorer widgets.**
- `array-index-explorer`: slice rows and columns (all, a slice or one index), mask cells, or filter rows on one column. It shows the expression, the picked cells, NumPy's printout and shape, and whether the result is a view or a copy.
- `axis-explorer`: sum, mean, max, min or argmax with axis None, 0 or 1 and keepdims; cells that collapse together share a colour.
- `broadcast-explorer`: two preset shapes lined up from the right, the stretched copies drawn dashed, A + B, or NumPy's exact error.
- `vector-explorer`: two 2-D vectors with dot product, both norms, cosine, angle and distance, optionally as unit vectors.
- `matmul-explorer`: pick a result cell to see its row and column; switch to B @ A, A @ A, A @ A.T or A * B to see order, clashes and `*` vs `@`.

The maths, printouts and error messages are in `packages/learning-ui/src/numpy-explorers.ts`, with 12 tests against NumPy output. The explorers were driven in the admin preview on desktop and on a 390 px phone in dark mode, with no console errors. The AI writer prompts describe them (`lesson.plan@8`, `lesson.draft@8`). The lesson-library test now also accepts lessons for the AI Engineer pilot topics.

**Tests.** The API passes 492 tests in 23 files, content 33 and learning-ui 177. Biome is clean on 319 files, and every package typechecks.

**Who sees it.** The module belongs to the AI Engineer curricula only (published, but the role is not live yet). ML Engineer students do not reach it until it is added to their curriculum, which needs the product owner's decision.

---

## Pilot v2.12 report: review and publish, and the Data Preparation module (2026-11-18)

**The ask.** The product owner asked the team to review and publish each lesson after creating it, and to do the same for every lesson already written. They also asked for the Data Preparation module next, with playgrounds wherever students learn by changing a setting.

**1. Pre-publish review of the 21 existing lessons.**
- Seven independent reviewers each took one group: HR, Python, DSA, ML Fundamentals, Deep Learning A and B, and LLMs.
- They checked everything added since the audit: the new slides, the Q&A decks and the explorer tasks. They re-ran every snippet and recomputed every number.
- Errors found and fixed:
  - a quoted Python 3.14 error message;
  - the task-scheduler card;
  - "only ReLU allows this trick";
  - a one-hidden-layer quiz;
  - an explorer task that failed if students did the tasks in order;
  - a momentum task that contradicted its slide.
- About 20 clarity fixes were also applied, and the recursive factorial now rejects negative numbers, so it matches the coding-round lesson.
- The training-explorer epochs slider now reaches its exact maximum. It uses 1,000 log-scale positions, where it previously stopped at 2,951.
- **All 21 lessons are published on dev**, including training-deep-networks v1 then v2, and chunking v2, which only renames titles.
- The publish guard found no interview-data citations.

**2. Data Preparation, four units, all depth 1.**

| Unit | Length | Contents | Explorers |
|---|---|---|---|
| Missing values, outliers and duplicates | 47 min | Profiling; the cleaning order; mean, median or mode; forward and backward fill and interpolation; a missing flag; KNN imputation; IQR and z-score rules (including masking); treating outliers; removing the row or only the value; duplicate keys and text that differs only in case or spaces | imputation-explorer, outlier-explorer |
| Encoding, scaling and data leakage | 44 min | One-hot, label and ordinal encoding; categories never seen in training; many categories (frequency and target encoding); min-max, standard and robust scaling; which models need scaling; target vs train–test leakage; pipelines and a mixed-column ColumnTransformer; feature engineering and selection | scaling-explorer |
| Pandas for data wrangling | 36 min | Series and DataFrames; boolean filters; loc and iloc; copy-on-write in pandas 3; groupby, named aggregation and transform; merge, join and concat and their defaults; vectorisation; pivot tables; huge CSVs; a runnable revenue-report playground | — |
| Statistics for ML | 36 min | Centre and spread; n − 1; the constant that minimises MSE or MAE; distributions and the central limit theorem; correlation vs causation; hypothesis tests, two-sided p-values, Type I and II errors, which test fits | pvalue-explorer |

- Every unit was independently reviewed (93 fixes in all) and then published. The most important catches:
  - a leaky feature-engineering example (price per square foot next to a price model);
  - a one-sided null hypothesis with two-sided p-values;
  - "loc and iloc agree on a default index", which is wrong for slices.
- All code is verified with Python 3.14, pandas 3.1, NumPy 2.5, scipy 1.18 and scikit-learn 1.9. The browser runs pandas 3.0.2 in Pyodide, and the reviewer re-ran the pandas lesson there too.
- 14 new animations were QA'd on contact sheets in light and dark.
- New taxonomy concepts were added insert-only: `data.feature-selection`, `stats.distributions` and `stats.correlation`.

**3. Four new explorer widgets.**
- `outlier-explorer`: a number line with the box, the IQR or z-score fences, keep, remove or cap, and a draggable extreme value.
- `imputation-explorer`: three datasets and seven fill methods, showing the summary before and after.
- `scaling-explorer`: KNN with no scaling, min-max or standard scaling, the neighbourhood, each feature's share of the distance, and two sliders for the new point.
- `pvalue-explorer`: an exact two-sided binomial test, matching scipy to within 1e-11.

The explorer maths is in `packages/learning-ui/src/data-explorers.ts`, with 11 tests against pandas and scipy values. The explorers were driven in the admin preview on desktop and on a 390 px phone in dark mode, with no console errors and nothing clipped. The AI writer prompts now describe them (`lesson.plan@7`, `lesson.draft@7`).

**Tests.** The API passes 480 tests in 23 files, content 33 and learning-ui 150. Biome is clean on 313 files, and every package typechecks.

**Coverage now** (ML Engineer, 3–6 LPA):
- 24 of 48 roadmap units are written and live.
- Live lessons cover about 42% of the band's interview questions, up from 11% this morning.
- Students first reach a unit with no lesson on study day 10.
- DSA patterns is published too, but it only reaches students when curriculum v3 is published.
- The plan still needs 33 study days against 27; 75 minutes a day would fit.

---

## Pilot v2.11 report: interview-quality pass, new lessons and interactive explorers (2026-11-18)

**The ask.** Lessons must prepare students for ML Engineer interviews at 8–10 LPA (sometimes 12),
while staying simple. There is one bar for every package for now. Add units where needed. Students
also need interactive playgrounds where they change the epochs, the learning rate, SGD/momentum/Adam
and activation parameters, and see the effect themselves. These sit beside the existing visuals and
never replace them.

**1. Audit of the 15 existing lessons.**
- Five independent reviewers each checked one group: HR, Python, DL part A, DL part B and LLMs.
- They measured every lesson against the real interview questions for its themes, from the Hiring
  Intelligence data (internal only, never cited). They re-ran every snippet and recomputed every
  number.
- Five writers then applied the findings:
  - every accuracy error, about 20 in all, for example the padding claim, −ln(0.10), the GRU bias
    note, RoPE and vocabulary sizes, and three edge-case bugs in the coding-round model code;
  - every "must" and most "should" additions, among them resume follow-ups, the CTC and
    notice-period switching questions, the PyTorch training loop, reading loss curves, detection
    threshold scenarios without retraining, one-hot vs embeddings, the padding mask, chat request
    flow, cost and latency, structured output, LangGraph routing, the mutable-default trap, writing
    a context manager, the MRO and text normalisation.
- **Every lesson now ends with an interview Q&A flip deck.** It holds 7–10 cards of real questions,
  scenarios included, each with a 35–65 word model answer.
- Card decks read one card at a time, so their word budget now grows per card, as slide decks do
  (`style.ts`, with a test).

**2. New lessons.**
- **DSA essentials** covers complexity, brute force then optimise, hashing, two pointers, sorting
  and binary search, bubble and merge sort, and heaps.
- **DSA patterns** is a new unit: sliding windows, running totals, stacks, recursion,
  memoisation and min cost climbing stairs.
- **ML Fundamentals 1–3** covers AI/ML/DL and the learning types; loss functions and gradient
  descent, including the linear-regression update; and overfitting, bias–variance, validation,
  leakage and L1/L2.
- Each was independently reviewed and the fixes applied. All code is verified with Python 3.14,
  NumPy 2.5 and scikit-learn 1.9.
- 14 new animations, QA'd on contact sheets in light and dark.

**3. Interactive explorers (new WIDGET kinds).** These are vetted components; a lesson only fills
in presets and up to four "Try this" tasks.
- **`training-explorer`**: a polynomial trained live by gradient descent. Students choose the
  degree, learning rate, L2 and epochs (on a log axis). They see training and validation loss, the
  best epoch, the overfitting zone and the fit drawn over the data.
- **`optimizer-race`**: SGD, momentum and Adam on one narrow valley, with the learning rate, β,
  steps and optional mini-batch noise.
- **`activation-explorer`**: sigmoid, tanh, ReLU and leaky ReLU of w·x + b, with the slope and the
  vanishing-gradient zones shaded.
- The maths is in `packages/learning-ui/src/explorers.ts` and is tested. With seed 56: the
  degree-9 best epoch is 22 and validation then rises five-fold; 0.5 diverges at epoch 31; L2 0.3
  removes the overfitting; degree 1 underfits; at 0.3, Adam beats momentum, which beats SGD; SGD
  zig-zags at 0.9 and diverges at 1.05.
- They are placed in loss-gradient-descent, generalization-regularization, training-deep-networks
  (two, beside the early-stopping visual) and neural-network-fundamentals.
- Every interaction was driven in the admin preview on desktop, on a 390 px phone and in dark
  mode, with no console errors and nothing past the edge.
- The AI writer prompt now lists the new widgets (`lesson.plan@6`, `lesson.draft@6`).

**4. Curriculum and limits.**
- The `dsa-patterns` subtopic and three concepts were added to the taxonomy (bootstrap, insert-only).
- **ML Engineer curriculum v3 is saved as a DRAFT** for both packages (it adds DSA patterns), for
  a person to publish in Admin → Curriculum.
- Lesson time limit: 45 min at the deepest depth, or 50 with an explorer
  (`test/lesson-library.test.ts`).

**Tests.** 622 pass: the API (464), content (33) and learning-ui (125). Biome is clean on 306 files,
and every package typechecks.

**Synced to dev, all UNDER_REVIEW.**
- training-deep-networks was skipped, because its v1 is APPROVED by a person.
- Once that v1 is published, re-run `pnpm lessons:sync` to create v2 with the audit additions and
  both explorers.

**Coverage after this pass** (ML Engineer, 3–6 LPA):
- 20 of 48 units written, 6 live, 14 in review.
- Written lessons cover about 39% of the band's interview questions, up from 34%.

---

## Pilot v2.10 report: Content coverage page (2026-11-13)

The user asked how much of the content is done and whether interview prep needs more modules and
units. They then asked to turn that analysis into a feature. It is separate from the student
analytics in Overview and Students: it measures the **content**, not student activity.

**Admin → Coverage** (`/coverage`, every admin) picks a role × package with a published
curriculum. By default that is the study plan's package on the live role (ML Engineer, 3–6 LPA).
It shows:

- **What needs attention**: signals computed from the data, worst first.
  - The study day on which students reach the first lesson that is not live, and the day it would
    move to once the lessons in review are published.
  - High-priority units with no lesson.
  - Whether the roadmap fits the plan's deadline, and the daily minutes that would.
  - Practice questions per unit.
  - Measured lesson time against the roadmap's estimate.
  - Lessons in the older, pre-slides format.
- **Numbers**: lessons written, lessons live, units with practice, roadmap days against the
  deadline, and interview coverage (super admins).
- **Write next / Publish next**: unwritten and unpublished units, in the order students reach them.
- **Units**: every unit in roadmap order with its study day, priority, depth, lesson state and
  version, measured lesson minutes against planned minutes, and practice count. Super admins also
  see each unit's interview reach. Filters: not written, not live, high priority.
- **Interview evidence** (super admins only, ML Engineer only):
  - the band's interview themes, with the units that teach them and how far each lesson is;
  - interview formats (take-home assignment, basic coding, DSA, SQL, API, debugging, project
    discussion, behavioural);
  - the questions that fall outside the curriculum.
  - Each row carries a flag where it applies: no unit, not in this curriculum, only optional units,
    or asked by a third or more of companies but not high priority. A band with fewer than 30
    companies gets a "read the shares as rough" note.

**How it works.**
- `GET /api/v1/admin/coverage` (`modules/coverage/`).
  - Day numbers come from the same planner the students' roadmaps use: a new
    `RoadmapService.targetPlan`, the study plan, starting today.
  - Lesson minutes are measured from the version students see (live, else the working one) at the
    unit's depth, with the player's own resolution.
  - The evidence share counts a theme taught across several units in equal parts per unit with a
    lesson.
- `coverage-map.ts` maps every interview theme and format to the units that teach it.
  - `hiring-rules.ts` now lists its themes as `PREP_THEMES`, and `themeOf` accepts only those
    names, so a theme with no mapping fails to compile.
  - "Other ML concepts" is a catch-all: it has no unit and is not raised as a signal.
- The evidence is added on the server for super admins only. Other admins get `evidence: null` and
  a note. Students never reach any of it.

**What it shows on dev today** (ML Engineer, 3–6 LPA, 60 min Mon–Sat, 30-day deadline):
- **Lessons:** 16 of 48 written, 2 live. Students reach a lesson that isn't live on day 1;
  publishing the 14 in review moves that to day 5 (DSA essentials). 8 high-priority units have no
  lesson.
- **Plan fit:** the roadmap needs 33 study days against 26 allowed; about 75 min a day would fit.
  At 8–12 LPA it needs 54 days, or about 125 min a day.
- **Practice:** no unit has practice questions.
- **Format:** the live self-introduction (v1) and Chunking are in the older format.
- **Interview coverage:** written lessons cover about 34% of the band's interview questions, live
  lessons 7%.
- **Gaps:** take-home assignments are set by 36% of companies, and no unit covers them. CS
  fundamentals is asked by 29% but is only an optional unit.

**Tests.** `test/coverage.test.ts` (7 tests) checks:
- the joined view on the real ML Engineer v2 curriculum, with two library lessons, practice
  questions and a small export;
- the exact deadline days and the daily minutes that fit;
- the evidence shares, flags and outside groups;
- that evidence is withheld from other admins, the other-role note, and 404/400 for bad targets;
- that the map covers every theme and only real units;
- format precedence and the weekday phrase.

The authorization matrix covers the new route. The authz, hiring, roadmap, study-plan and
MLE-pilot suites pass (240 tests). Desktop, phone (390 px) and dark screenshots on the dev admin
show no console errors and nothing past the right edge.

**Open decisions** (the page surfaces them; nothing in the curriculum was changed):
- whether to add a take-home-assignment unit, a resume unit and a data-case unit;
- whether to make CS fundamentals and fine-tuning vs RAG core;
- the daily minutes or deadline that make the roadmap fit.

---

## Pilot v2.9 report: How LLMs work (2026-11-12)

The user asked for the next unit: the first of the LLMs, Prompting & Agents topic,
`llms-agents/how-llms-work`.

- **Lesson** (`library/mle/how-llms-work.lesson.ts`): 3–6 LPA at depth 2, 32 min; 8–12 LPA at
  depth 3, 34 min. What an LLM is (usually a decoder-only transformer; parameters; tokens),
  generation as predict-append-repeat with a toy loop, a 3-context next-token explorer (logits,
  softmax, greedy vs sampling), how a question flows through the model, what "understanding"
  means; tokens with a shopkeeper's-change story and a greedy subword tokenizer, rules of thumb
  and token cost, the context window as a desk, how chat "memory" works, and a playground that
  trims a chat to a 70-token budget (30 kept for the reply) so the model forgets the user's name;
  pre-training to base (foundation) model, instruction tuning and RLHF, pre-train vs fine-tune
  vs prompt/RAG; generative vs discriminative (with the formal P(label | input) note), types of
  generative AI, diffusion and GANs. Depth 3 swaps the explorer (slot `practice`) for BPE with
  code, cross-entropy and perplexity, weight memory and quantization, open-weight vs API models,
  SFT/reward model/RLHF (PPO)/DPO, and long-context limits; its check ends with "can developers
  train a foundation model?". Temperature, hallucinations in depth and RAG are left to their units.
- **Animations** (6 new, 68 in all): next-token-loop, tokenizer-split, context-window (the same
  chat as the playground: 83 tokens, 13 over, two messages dropped, 67 used), llm-training-stages,
  genai-types, bpe-merges.
- **Checks:** every snippet run and matched. Two independent reviews: a must-fix on vocabulary
  sizes (BERT has 30,522; some models exceed 200,000), RLHF spelled out wrongly, the playground
  leaving no room for the reply, token cost tested but not taught, "token" used before defined,
  the BPE story, and the overflow arithmetic in the context-window picture. All applied within
  the time caps. Synced to dev as v1 UNDER_REVIEW; admin-preview screenshots are clean.

---

## Pilot v2.8 report: Attention and transformers (2026-11-12)

The user asked for the next Deep Learning unit, `deep-learning/attention-transformers`.

- **Lesson** (`library/mle/attention-transformers.lesson.ts`): 3–6 LPA at depth 1, 31 min; 8–12
  LPA at depth 3, 34 min. Under-8-LPA interviews ask a lot here (RNN, LSTM vs GRU, Q/K/V,
  multi-head, cross-attention, BERT vs GPT), so depth 1 covers all of them. The story thread is
  "The dosa was cold, so I sent it back": an RNN loop in NumPy, vanishing (and exploding)
  gradients, the LSTM as a notebook with gates (cell state updated by adding), LSTM vs GRU weight
  sets, Bi-LSTM; attention with "it" → "dosa", Q/K/V as a video-app search, the scaled formula
  and why √d, multi-head as an interview panel, why transformers won; a 3-query explorer and a
  "write scaled dot-product attention" playground (it catches a missing √d); the block
  (positional encoding, residuals, layer norm, feed-forward), encoder vs decoder, self vs
  cross-attention, BERT vs GPT, the three families, and that chat models are decoder-only with no
  cross-attention; the output layer in the playbook. Depth 3 swaps the RNN deck for a refresher
  (slot `sequences`) and adds masked attention (code), positional encoding (code), head shapes
  (code), BERT and GPT pre-training ([CLS], next-sentence prediction), attention cost (n², KV
  cache, sliding-window, FlashAttention) and a PyTorch encoder (run locally: PyTorch 2.14 CPU).
- **Animations** (9 new, 62 in all): seq-vs-parallel, rnn-unroll, lstm-gates, attention-weights,
  qkv-lookup, multi-head, transformer-blocks, bert-vs-gpt, causal-mask. Their numbers match the
  code (0.84/0.11/0.04 softmax, the 4 × 4 causal-mask weights, "it" keeps 0.04 for itself).
- **Checks:** every snippet run and matched. Two independent reviews: one must-fix (the playbook
  implied GPT uses cross-attention) plus precision and coverage fixes (√d spread, LSTM addition,
  PyTorch's bias counts, BERT's [CLS] and NSP, components, a chat-model check item, playground
  moved next to the formula, recall-only check items reworked). All applied; paths kept within
  35 min by rewording. Synced to dev as v1 UNDER_REVIEW; admin-preview screenshots are clean.

---

## Pilot v2.7 report: Text preprocessing and representation (2026-11-12)

The user asked for the next Deep Learning unit, `deep-learning/nlp-text-representation`, in the
same story-and-moving-picture format.

- **Lesson** (`library/mle/nlp-text-representation.lesson.ts`): 3–6 LPA at depth 2, 31 min;
  8–12 LPA at depth 3, 34 min. A food-app review story runs through it: cleaning (tokens,
  lowercasing, stop words, keeping "not"), stemming vs lemmatization with real NLTK code and the
  part-of-speech catch, a 4-step cleaning explorer, a `clean()` try-it; bag of words, TF-IDF (the
  formula, code, scikit-learn's smoothed IDF), limits and n-grams; embeddings (a map story,
  Word2Vec's fill-the-gap idea, cosine in NumPy, a sentence-transformers example, semantic search
  and RAG spelled out, hybrid search) and a cosine-search playground. Depth 3 swaps the explorer
  (slot `practice`) for "preprocessing in real projects" (BERT-style models need little cleaning,
  subword tokens, FastText), and adds skip-gram vs CBOW, GloVe, static vs contextual vectors,
  choosing a model (language, domain, length, MTEB shortlist, recall@5), dimensions with storage
  maths, similarity thresholds, and a text-classification pipeline (split before fitting TF-IDF,
  precision/recall/F1, scikit-learn code).
- **Animations** (7 new, 53 in all): review-sorter, token-pipeline, stem-vs-lemma, bag-of-words,
  tfidf-weights (food 0.10, late 1.20, refund 3.91 from ln(1000/df)), embedding-space (angles drawn
  so cosines are 0.99 and 0.30, matching the code) and word-analogy.
- **Checks:** every snippet run and matched: Python 3.14 + NumPy + scikit-learn 1.9.1 (the
  classifier uses Naive Bayes; LogisticRegression's compiled module is blocked by the machine's
  application-control policy). NLTK was verified in a scratch virtualenv with NLTK 3.9.1, with a
  verification-only stand-in for the blocked `regex` DLL. The sentence-transformers example is
  static (no output claimed). Two independent reviews (technical accuracy, student experience)
  found three ambiguous check items (TF definition, IDF under scikit-learn's smoothing, a
  two-valid-orders pipeline question) and teaching gaps (leakage and metrics, RAG, model choice,
  preprocessing for BERT). All were fixed. Optional extras left out to stay within 35 minutes:
  a sentence-transformers similarity score (it can't be run here), unit-length vectors, and
  negative sampling. Synced to dev as v1 UNDER_REVIEW; admin-preview screenshots are clean.

---

## Pilot v2.6 report: Deep Learning units 1–3 (2026-11-12)

The user asked for the first three Deep Learning units: neural network fundamentals, training
deep networks, and CNNs and computer vision, in the same story-and-moving-picture format.

- **Lessons** (`library/mle/`), every concept opening on a real-world story with a moving picture:

  | Lesson | 3–6 LPA | 8–12 LPA |
  |---|---|---|
  | `neural-network-fundamentals` | depth 2, 33 min | depth 3, 35 min |
  | `training-deep-networks` | depth 1 (optional), 20 min | depth 3, 28 min |
  | `cnn-computer-vision` | depth 1, 27 min | depth 3, 35 min |

  Runnable code is from-scratch NumPy (the in-browser runner has no PyTorch); PyTorch and
  torchvision appear as static reference code with no claimed output. Highlights: a forward pass
  and a 6-state activation explorer, the chain rule worked by hand and through a hidden neuron, a
  train-a-neuron playground, autograd, softmax with cross-entropy (stable), He/Xavier; SGD vs
  mini-batch vs momentum vs Adam (with its update and AdamW), learning-rate schedules, inverted
  dropout, early stopping (playground), batch norm vs layer norm, vanishing/exploding gradients,
  a stuck-loss checklist, train() vs eval(); convolution in NumPy with a 3-filter explorer, many
  filters and parameter counts, stride/padding (rounding down), pooling, the architecture with
  dropout, transfer learning, IoU (playground), YOLO, NMS with code, the two IoU thresholds,
  one- vs two-stage detectors, tracking and mAP. 8–12 gets a shorter basics refresher deck in the
  neural network lesson (slot `basics`) so its path stays within 35 minutes.
- **Animations** (13 new, 46 in all): forward-backward, optimizer-paths, dropout-net,
  early-stopping, batch-norm, vanishing-gradient, conv-filter, max-pool, cnn-pipeline,
  feature-hierarchy, transfer-learning, iou-boxes, nms-boxes; activation-curves now draws sigmoid,
  tanh and ReLU. Every number in them is computed (conv rows 0 3 3, max-pool 6/2/3/9, IoU 0.35 and
  0.75, NMS keeps 0.92 and 0.88, batch-norm mean 8.4 / spread 2.1) and matches the code.
- **Answer order:** reviewers found every correct option was written first. The student view now
  shows mcq, multi and predict-output options, and slide try-it choices, in a stable shuffled
  order (`shuffleStable`, seeded by the item key or prompt); grading by id is unchanged.
- **Checks:** every snippet run on Python 3.14 + NumPy (the verifier now uses `-P`, since `-I`
  hides user-installed NumPy). Three independent reviews found no blocking issues except one
  wrong Adam check item (it claimed big gradients get smaller steps; fixed), plus coverage and
  story gaps. All major findings were applied; a few optional extras (softmax code at depth 2, a
  cross-correlation note, two more 8–12 check items) were left out to keep paths within 35 minutes.
  Admin-preview screenshots on desktop and phone are clean. Synced to dev as v1 UNDER_REVIEW.

---

## Pilot v2.5 report: OOP in Python (2026-11-12)

The user confirmed the unit 1 cards (Core Python concepts) in the admin preview and asked to go
on to unit 2 of Python for Interviews.

- **Lesson** `library/mle/python-oop.lesson.ts` (3–6 LPA at depth 1, 28 min; 8–12 LPA at depth
  2, 33 min). Every concept opens on a short real-world story slide with its own moving picture
  and a "Real use" caption, then the code: a food-delivery app's restaurants (class and objects),
  a guarded wallet balance (encapsulation), ride-app vehicles (inheritance), one Pay button for
  UPI, card and cash (polymorphism), a model's fit()/predict() hiding the maths (abstraction).
  Also: `self`, `__init__` vs `__new__`, a Counter try-it, method overloading vs overriding, duck
  typing, is-a vs has-a, a six-state "Which method runs" explorer, a four-pillars playbook and a
  base/child-class playground (`super().__init__`). The 8–12 deck adds class vs instance
  attributes, class/static methods, `_`/`__` names, dunder methods, abstraction vs encapsulation,
  abstract-class rules and OOP in ML (an `nn.Module` subclass), a payment-hierarchy playground
  (abstract class + polymorphism) and a deeper check including the shared-mutable-class-attribute
  bug.
- **Animations** (7 new, 33 in the library): class-blueprint, self-binding, inheritance-tree,
  polymorphism-pay, encapsulation-wallet, abstraction-panel, class-vs-instance.
- **Checks:** all 25 snippets run on Python 3.14 (outputs, explorer states, starters fail and
  solutions pass); the verifier now normalises Windows line endings. An independent review found
  no blocking issues; its 23 findings were applied except multiple inheritance/MRO, which the
  interview evidence doesn't show. Admin-preview screenshots on desktop and phone are clean, and
  play mode advances through the pillars deck. Synced to dev as v1 UNDER_REVIEW.

---

## Pilot v2.4 report: moving pictures and real-world hooks (2026-11-10)

The user pointed at the older `C:\Interview Prep Platform` project (its regression topic: card
deck, animated SVG figures, a simple real-life hook, playgrounds) and asked for lessons with
moving visuals and very simple hooks that show where a concept is used in real life, inside our
existing slide format and in the platform's professional style ("not childish").

### 1. What was implemented
- **Animation library (`AnimationRef`).** 26 looping SVG diagrams (SMIL), drawn from theme
  tokens and mono labels, with no emoji; the still frame is the most telling one, used when
  reduced motion is on; each has a screen-reader description (`ANIMATIONS` in
  `packages/content/src/animations.ts`, drawings in `packages/learning-ui/src/animations.tsx`).
  - Python: name-tags, list-vs-tuple, set-dedupe, dict-lookup, function-machine, decorator-wrap,
    comprehension-filter, generator-belt, try-except-net, async-waiter, gil-baton.
  - Interviews/HR: intro-trailer, star-timeline, ctc-split.
  - ML (re-themed from the older project; its "loss bowl" and learning-rate curves were drawn
    upside down and are fixed here): scatter-line, residuals, loss-bowl, learning-rate,
    train-test-split, overfit-underfit, labels-vs-no-labels, decision-boundary, clusters, neuron,
    network, activation-curves.
- **Slides** take `animation` (beside the headline; code or another visual goes below). The
  picture mounts when its slide shows, so it plays from the start.
- **Hooks** take `animation` and `realWorld` (2–4 "where you see it" cards with line icons).
  Icons moved to `learning-ui/src/icons.ts`, typed against `SLIDE_ICONS` (27 everyday icons
  added: cart, pin, contacts, tag, film, food, wallet, …).
- **Play mode** for every deck: ▶ advances by reading time (or while the device voice reads the
  slide, en-IN preferred), fills the current progress segment, never reads code, and stops at a
  try-it with "Your turn". Narration helpers in `learning-ui/src/deck-play.ts`.
- **Writer prompt @5:** hooks open on a simple real-world use; the animation menu is generated
  from `ANIMATIONS`; a professional visual tone, no emoji in slides or hooks.

### 2. Lessons updated (dev drafts refreshed, still UNDER_REVIEW)
- **Python core concepts:** new hook (a food-delivery app: cart = list, location = tuple, tags =
  set, menu = dict, with the cart-vs-pin animation and four real-world cards; the tuple twist
  moved to the bridge, the tiffin analogy to the try-it note). Animations with "Real use: …"
  captions on the comprehension, set, dict, `is`, function, decorator (both depths), generator,
  exceptions, references, GIL and async slides. Times unchanged: 26 / 35 / 35 min.
- **Self-introduction** hook: intro-trailer. **Internship:** STAR slide → star-timeline (its
  labels avoid seconds, so they never contradict a lesson's own timed example). **HR:** CTC slide
  → ctc-split.

### 3. Checks
- Contact sheets of all 26 animations (light and dark, paused at set loop fractions) and admin
  preview screenshots on desktop and a 390 px phone: no overflow, no console errors; play mode
  advanced slides 1 → 2 → 3 and stopped at the try-it.
- Tests: every animation renders as an accessible looping SVG with no hard-coded colours or
  emoji, and the drawing list matches the content catalogue; narration skips code; schema tests
  for animations and icon-only real-world cards.

---

## Pilot v2.3 report: slide-deck lessons and a coding-ground UI (2026-11-09)

The user asked for simpler content with better examples, taught like PPT slides (moving slide
cards with visuals and small playgrounds), code practice that looks like a real coding ground, the
HR module updated first, then Python for Interviews. They also asked that student content never
mention the internal interview data.

### 1. What was implemented
- **`SLIDES` step kind ("Slides").** A deck of 2–12 slides, one idea each:
  - kicker, headline, body, up to 4 bullets that build in one by one, a visual and a note;
  - visuals are vetted shapes, so they stay crisp and themeable: `icons` (60-icon set), `emoji`,
    `stat`, `flow`, `sequence` (terms with the step between neighbours, for number series and
    lists), `compare`, `code` (≤14 lines + verified output), `chat`, `checklist`, `quote`;
  - up to 4 ungraded try-its per deck: `choice` (feedback per option), `write` (then a sample) and
    `code` (edit and run in the browser; `expected` text marks it right);
  - slides glide in from the side, can be swiped or moved with the arrow keys, have progress
    segments and full screen; inactive slides leave the layout (state kept) so a tall try-it no
    longer pushes the controls off a phone screen; reduced motion is respected.
  - Schema, student schema, generation schema, prompts (`@4`), time estimates, reviewer checklist
    and docs/07 know the kind. Migration `slides_sections`.
- **Coding-ground look for all code.** A dark IDE frame (window dots, file tab), highlighted
  editor with a line gutter, a green Run button (Ctrl/Cmd+Enter), a terminal panel, and a tests
  panel with PASS/FAIL per check and the solution as `our_solution.py`. On phones, read-only code
  soft-wraps like an IDE's word wrap, so comments are never cut off.
- **Style gate.** Slide headlines may not be questions (checked per slide); a deck's word budget
  grows with its slide count; chat lines inside slides now count as prose.
- **No data citations.** Every "in our data" / "X of 72 companies" line was removed from student
  text, and the generation prompt now forbids quoting interview evidence.
  - *Follow-up, 2026-11-10:* the **published** self-introduction v1 still showed the hook line
    ("In NxtWave's interview data… 39 of 72…") and company-count card tags, because the cleanup
    had only reached the new drafts. Its `hook` and `follow-ups` steps were hot-fixed in place
    (same version and step keys, so student progress is kept; new revisions, audit
    `content.lesson.published_hotfix`), with v2's wording (and "a video call" / "An AI assistant"
    for two brand names). A scan of every lesson version in the database now finds no citations.
  - *Enforced:* `internalDataIssues` (packages/content `style.ts`) flags the data being named
    (interview/hiring data, "our data", NxtWave), company counts and shares of companies in any
    string of a step (tags and code comments too). It is part of `styleIssues` (library tests),
    a **blocking** issue in the AI evaluation, a retry problem for the AI writer and rewriter, and
    **publishing refuses** a lesson that has it.
- **Topic 1 rebuilt as slides** (v3), with simpler wording and new try-its: self-introduction
  (2 decks), internship story (2), HR (3: why us, money and commitments, behavioural), aptitude
  (2, with `sequence` visuals, a Python "find the gaps" playground and new train / time-and-work
  slides).
- **Python core concepts** (Python for Interviews): collections and mutability, functions and
  decorators, generators and exceptions, and at depth 3 references and copying, call by object
  reference, context managers, `__main__`, monkey patching, the GIL and async. Slot keys give
  8–12 students refresher decks, a batching-generator playground and merged checks instead of
  the basics. Every code output, playground (starter fails, solution passes) and try-it was run
  with Python 3.14, the version the in-browser runner uses.

  | Lesson | Depth 1 | Depth 2 | Depth 3 |
  |---|---|---|---|
  | Self-introduction pitch | 5 steps, 15 min | 9 steps, 25 min | – |
  | Internship and experience story | 7 steps, 18 min | 11 steps, 26 min | – |
  | HR and behavioural questions | 8 steps, 17 min | 11 steps, 24 min | – |
  | Aptitude and logical reasoning (optional) | 10 steps, 26 min | – | – |
  | Core Python concepts | 9 steps, 26 min | 12 steps, 35 min (3–6) | 13 steps, 35 min (8–12) |

- **Independent reviews** (three reviewers, none shown my assessment) recomputed every number and
  ran every snippet. They caught, among others: a "good" example that took sole credit for team
  work; an estimate shown as a measurement; one person with three different family details;
  train and work-rate checks with no teaching before them; income tax wrongly reducing a 4.5 LPA
  in-hand salary; choosing a model on the test set in a conflict story; slicing and
  comprehensions tested before being taught; a tuple try-it whose fix contradicted the lesson;
  and depth 3 losing all decorator practice. All accepted findings were applied and re-gated.

### 2. Data state (dev)
- Self-introduction: v1 stays **PUBLISHED** (students see it); the slide version is v2
  **UNDER_REVIEW**.
- Internship, HR and aptitude: v1 drafts refreshed with the slide versions, **UNDER_REVIEW**.
- Core Python concepts: v1 **UNDER_REVIEW**.
- Nothing was published on anyone's behalf.

### 3. Tests
- `pnpm check` is green: 389 API tests (including the lesson library with all five lessons), 25
  content tests (slide decks, the `sequence` visual, the slide-title rule), 10 renderer tests,
  3 contracts tests, and both app builds.
- Browser checks on the isolated stack: every lesson walked as a student on a phone (slides,
  try-its, the decorator playground to PASS, the exceptions explorer), with no overflow and no
  console errors.

### 4. Next
- Python for Interviews continues: `python-oop`, then `python-coding-round`.

## Pilot v2.2 report: hiring data, animated visuals and the first lessons (2026-11-06)

### 1. What was implemented
- **Hiring Intelligence in the platform (super admins only).** The user allowed the dashboard export
  in the repo, visible only to super admins.
  - The export is stored gzipped at `apps/api/data/hiring-intelligence/hiring-2026-10-30.json.gz`
    (909 KB). `db:bootstrap` and the seed load it into the new `hiring_snapshot`,
    `hiring_opportunity` and `hiring_question` tables when the database has none.
  - The ML Engineer family and theme rules are ported from the Python scripts to
    `modules/hiring/hiring-rules.ts`. A test proves parity with the published evidence (3,293
    questions, 72 companies, the same themes). Every question is mapped to a curriculum topic.
  - `GET/POST /api/v1/admin/hiring…` sits behind `requireSuperAdmin`. Admin → **Hiring data**
    (super-admin nav only) has three tabs:
    - the ML Engineer evidence table, recomputed live;
    - every question, filtered by curriculum topic, theme, round, company, domain, difficulty,
      CTC band or search;
    - the openings.
    A super admin can upload a newer export, which replaces the old one (audited).
- **Animated visuals.** A new step kind, `VISUAL` ("Watch it"), with three vetted scenes:
  - `chat`: a mock interview with typing dots, coach notes and weak/strong takes;
  - `anatomy`: an answer split into colour-coded parts on a timeline;
  - `array`: number rows with gap labels, pointers and windows.

  Scenes play when they scroll into view and have pause, step and replay. They respect reduced
  motion and carry alt text. The schema, student schema, AI generation schema, prompts (`@3`),
  time estimates and reviewer checklist all know the new kind. Migration `visual_sections`.
- **Lesson library.**
  - Hand-written lessons live in `apps/api/src/modules/content/library/`.
  - `pnpm lessons:sync` loads them **for review only**:
    - it creates missing lessons;
    - it refreshes library drafts nobody has touched;
    - it opens a new review version when a published lesson changes;
    - it never publishes and never overwrites a person's work.
  - A test holds every library lesson to the schema, the title rule, the standard style budgets,
    the subtopic's concepts and a complete path at each curriculum depth (35 minutes or less).
- **Topic 1 (Self-Introduction & HR Round) written, built and reviewed.** All four lessons are
  grounded in the real questions for each theme:

  | Lesson | Depth 1 (3–6) | Depth 2 (8–12) | Visuals |
  |---|---|---|---|
  | Self-introduction pitch | 5 steps (all students study it at depth 2) | 11 steps, 25 min | 60-second anatomy, weak vs strong chat |
  | Internship and experience story | 10 steps, 20 min | 14 steps, 27 min | STAR anatomy, "we" vs "I" chat, challenge-story anatomy |
  | HR and behavioural questions | 9 steps, 16 min | 12 steps, 23 min | generic vs specific chat, weakness anatomy |
  | Aptitude and logical reasoning (optional, 3–6 only) | 11 steps, 21 min | – | two number-series arrays, guesstimate anatomy |

  Every lesson went through create → build → independent review → update:
  - **Create:** quality gates on schema, style and each depth path.
  - **Build:** synced to an isolated stack, published there only, then walked as a student on a
    phone with every check answered. The depth-2 path was checked in the admin preview.
  - **Review:** a separate reviewer read each lesson without seeing my own assessment.
  - **Update:** every accepted finding was applied, and the lesson was gated and walked again.

  The reviews caught several real problems:
  - a wrong graduation year;
  - an "82% of what" metric;
  - inconsistent scores across stories;
  - a leaky feature;
  - salary anchoring for 8–12 students;
  - CTC vs in-hand pay;
  - bond red flags;
  - an outdated car-sales figure.
- **Fixes found while building:**
  - The admin console overflowed sideways on phones on every page, because of the shell and
    wide tables.
  - Lesson tables were clipped on phones; two-column tables now fit the screen.
  - A wide visual could stretch the lesson page.
  - The lesson-complete screen still said practice was "coming soon"; it now counts and links
    the tagged questions.
  - A title rule now catches a "?" anywhere in a title.

### 2. Data state (dev)
- **Hiring data:** imported (25,715 questions).
- **Topic 1 lessons:** all four are v1 **UNDER_REVIEW**, waiting for a person to publish.
- **Curriculum seed text:** now says "about a minute" (this changes new environments only).

### 3. Tests
- `pnpm check` is green:
  - 380+ API tests, now including hiring and the lesson library;
  - content, contracts and renderer tests;
  - builds.
- Browser checks ran on the isolated stack: every lesson walked as a student on a phone with no
  overflow and no console errors, plus the hiring page on desktop and phone.

### 4. Next
- Topic 2 (Python for Interviews) in the same loop. It needs code-running examples, and the
  `array` scene already covers two pointers, binary search and sliding windows.
- Each later topic adds the scene types it needs, such as charts for model evaluation and a
  network for deep learning.

## Pilot v2.1 report: ML Engineer curriculum from interview data (2026-11-05)

### 1. What was implemented
- **Interview evidence.** The Hiring Intelligence export (25,715 questions, 456 companies) was
  analysed for the ML Engineer family: 72 companies, 80 openings, 3,293 questions. The method,
  numbers and limits are in `docs/11-mle-interview-evidence.md`, and the scripts are in
  `tools/hiring-intelligence/` (no data in the repo).
  - Project deep-dive is asked at 92% of companies and self-introduction at 72%. Then come Python
    (57%), GenAI (56%; 83% at 8+ LPA), ML fundamentals (49%; 67% of ML-titled roles), deployment
    (40%), deep learning (38%; 52%) and SQL (31%).
  - The DSML master sheet was used only to check coverage. Its Course-IDs tab gives the portal
    `c_id`s for practice links.
- **ML Engineer curriculum v2** (`mle-curriculum.ts`): 13 interview-prep topics and 48 subtopics.
  Priorities follow company coverage; 3–6 LPA depths follow the under-8-LPA evidence and 8–12 LPA
  follows the 8+ evidence. Every item says why it is there.
  - 11 new topics (Self-Introduction & HR, Python for Interviews, ML Fundamentals, Data
    Preparation, Classical ML Algorithms, Model Evaluation, Project Deep-Dive, Deep Learning,
    LLMs & Agents, SQL, Model Deployment), plus the existing Embeddings and RAG topics. RAG gains
    a new subtopic, *Fine-tuning vs RAG*.
  - Order: introduction first, then Python, ML, data, algorithms, evaluation, project deep-dive,
    deep learning, LLMs, embeddings, RAG, SQL and deployment last.
  - Measured totals: 3–6 LPA is **32 h 20 min** (the core without optional items is about 27 h).
    It runs 7 days past a 30-day target at 60 min/day and fits at 75 min/day. 8–12 LPA is
    **53 h 35 min** and needs about 2 h/day.
- **One-time upgrade** (`upgradeMleCurriculum`, marker `bootstrap.mle-curriculum-v2`):
  - Where the interim v1 is still published (and no draft is open), v2 is published as a new
    version, and every student on it gets an update **proposal** to accept.
  - A curriculum an admin edited is left alone.
  - The ML Engineer role card (interview focus, competencies, self-check areas, now including
    GenAI) is refreshed if it is still the bootstrap default.
- **Practice questions tagged to topics:**
  - Admins tag questions with topics and subtopics (a tag picker over the curriculum), plus an
    optional description and "asked at" companies.
  - The sheet import reads topic, subtopic, description and asked-at columns, matched by name.
    Unknown names are flagged per row.
  - **Topic pages** list that topic's questions, and each subtopic card shows how many it has.
  - **The Practice tab** shows every question with its tags and details, and adds a topic filter
    (`/practice?topic=slug`).
  - Solve still opens the portal in a new tab.
- **The 11★ loop for questions.** After opening a question, students rate it (5 faces, tags, and
  *"What would make this an 11★ question?"*). There is one rating per student, which they can
  change.
- **Admin → Feedback** (new): every student rating in one place (lesson steps, lessons, practice
  questions, pages), filters for written 11★ ideas, and the **11-star map**, Airbnb's method
  adapted to this platform. It marks *Pilot today* at 6★ and *Next target* at 7★.

### 2. Verified
- `pnpm check` is green: lint, typecheck, **380 tests** (351 API) and builds.
- New API tests: the v2 curriculum (priorities, depths, the 30-day fit of the 3–6 core), the
  upgrade with proposals, skipping admin-edited curricula and idempotency, tags, PATCH that keeps
  tags, topic-page lists, and the 11★ feedback through to the admin list.
- Browser check on an isolated stack: 20 of 20 new checks, plus 31 of 32 earlier checks. The one
  miss is by design: topic pages now list only questions tagged to that topic. 0 console errors.
- Dev database: v2 published at both packages, with 7 update proposals.

### 3. Database
- `20261105111455_practice_tags_feedback`: `practice_question_topic`,
  `practice_question_subtopic`, `practice_question.description` / `asked_at`,
  `feedback.practice_question_id`, and the `PRACTICE_QUESTION` feedback target.
- `20261105113000_practice_feedback_constraint`: the feedback check constraint now allows question
  feedback, with one rating per student and question.

### 4. Next
- Lessons for the new subtopics: only *Chunking strategies* has one. Generation needs the API key.
  The real interview questions per subtopic can be fed into generation as playbooks and checks.
- Decide the daily target with the manager: 75 min/day fits the 3–6 LPA track in 30 days.
- Sync solved status from the portal.

---

## Pilot v2 report: ML Engineer focus (2026-11-05)
After the 2026-11-05 review with the manager, the first rollout is narrowed. It is for **one role, ML Engineer**, for the students who cleared the assessments, with a **plan the team sets** instead of choices students make. Every removed choice is **hidden, not deleted**: an admin can switch it back on. See docs/01 §4.1 "Pilot v2".

### 1. What was implemented
- **Study plan (admin → Study plan)**: one plan for every student.
  - Daily minutes and study days.
  - A deadline: none, a fixed date, or *N days after joining* (fair for late joiners).
  - A note to students, with a live preview of how it looks to them.
  - The package students are placed in, with the study time per package.
  - A live estimate: how long the ML Engineer track takes on this plan, the finish date, days to spare or days over the deadline, and one-click paces that fit.
  - Two switches: *students choose their own study time* and *students choose their package*. Both are off for the pilot.
  - **Save and apply**: brings every current student in line. A new package means a new goal (the old one stays as history). New time means a re-planned roadmap from today. Progress is always kept.
- **Students (while the team decides)**:
  - Onboarding is two steps (role, self-check) plus a review showing "Your study plan · set by your mentors". There is no package step and no time step.
  - ML Engineer is preselected. The other roles show *Opening soon · Notify me*.
  - Home shows the mentors' note at the top, the role tagline instead of the package, "See my plan", and a Practice card.
  - My plan shows "Your study plan": the note, daily target, study days and finish date, plus the read-only timeline. The schedule editor is hidden.
  - Roadmap: no package in the title, "See my plan", and a read-only deadline warning (no fix buttons).
  - No package anywhere on student screens: the topic depth note, the calendar file name and the done screen included.
  - `PUT /student/goal/schedule` is refused (403) while the team sets the time.
- **Practice tab** (student nav: Home · Roadmap · My plan · **Practice**, also in the phone tab bar):
  - Questions for the student's role, grouped by category, with search and difficulty filters, and an opened count.
  - **Solve** opens the question on the NxtWave learning portal in a new tab (like the manager's prototype), and the click is recorded. Opened questions get a tick.
  - The topic page's Practice tile links to the tab once there are questions.
- **Admin → Practice**:
  - Add or edit a question: name, portal link, category, skill, difficulty, minutes, roles (none = all roles), order, published.
  - **Import from sheet**: paste rows from Google Sheets or CSV, header detected automatically. Every row is checked before import, links already listed are skipped, and rows arrive as drafts unless *Publish right away* is ticked. "Publish all drafts" publishes them in one go.
  - Per question: students who opened it and total Solve clicks.
  - Links must be https on NxtWave hosts (`ccbp.in`, `nxtwave.tech`, `nxtwave.in`, `nxtwave.co.in`), checked in the form and on the server.
- **ML Engineer pilot bootstrap** (`pnpm db:bootstrap` and the dev seed):
  - ML Engineer goes LIVE and AI Engineer becomes NEXT_UP.
  - ML Engineer gets published curricula at 3–6 and 8–12 LPA. They reuse the three built topics as an **interim** track, with GenAI marked Medium priority as an extra on top of core ML.
  - The pilot plan is saved: 60 min, Mon–Sat, 30 days after joining, 3–6 LPA, both pickers hidden.
  - Active AI Engineer goals move to ML Engineer on the plan.
  - The switch runs once (marker `bootstrap.mle-pilot`), so later admin changes are never undone.
- **Lesson step titles: professional and technical**:
  - A title rule for every style: 2–6 words, leading with the concept or action ("Tune chunk size and overlap", "Evaluate chunking with recall@k"), one term per idea, and no questions, puns, emoji or filler like "Free play" or "Your turn".
  - Enforced by a computed `title` check (shown in the AI review) and by the prompts (all four bumped to `@2`).
  - The Gen Z style keeps its hook in the content, not the heading.
  - All 22 titles of the reference lesson are rewritten. It is the AI's style example, so new drafts follow.

### 2. Verified end to end
- Browser check in headless Edge on an isolated stack (own database, API and both apps): **32 of 32 checks pass, 0 console errors**.
- Covered: admin saves and applies the plan; a foreign link is refused; the import flags a bad row and skips a duplicate; the lesson shows the new titles at both depths; sign-up → two-step onboarding → review with the mentors' plan; no package on Home, My plan or Roadmap; nav order; Practice lists, filters and opens the portal in a new tab; the click is counted in admin; phone layout with 4 tabs and no horizontal scroll.
- The dev database was switched with `pnpm db:bootstrap`: 7 students moved to ML Engineer, all with active roadmaps.
- The published Chunking lesson got **v2 In review** with only the 22 titles changed. v1 stays live until someone approves and publishes v2.

### 3. Database and API changes
- Migration `20261105100131_practice_links`: `practice_question` (unique `solve_url`), `practice_question_role`, `practice_open` (one row per student and question, with first and last opened time and a count).
- Study plan: platform setting `study.plan` (no schema change). Until it is saved, students choose time and package exactly as before.
- Contracts:
  - `CompleteOnboardingBody.bracketId` / `.schedule`, `ChangeTargetBody.bracketId` and `OnboardingPlanPreviewBody.bracketId` / `.schedule` are optional. The server requires them only while students choose.
  - New: `study-plan.ts`, `practice.ts`.
- Admin API: `GET|PUT /admin/study-plan`, `POST /admin/study-plan/preview`, `GET|POST /admin/practice`, `POST /admin/practice/import`, `PATCH|DELETE /admin/practice/:id`.
- Student API: `GET /student/study-plan`, `GET /student/practice`, `POST /student/practice/:id/open`.

### 4. Tests
- 39 new tests across study plan, practice, the ML Engineer pilot bootstrap, the title rule and the reference lesson's titles.
- `pnpm check` is green: lint, typecheck, **373 tests** (344 API, 16 content, 10 renderers, 3 contracts) and production builds.

### 5. Known gaps and next steps
- **The MLE topic list is interim.** Share the hiring-intelligence export (companies, rounds, questions for MLE) to derive the real ML / DL / NLP / CV / coding / project-explanation topics. At 60 min a day the interim track takes about 2 weeks (3–6 LPA) of the 30-day window.
- Solved status on the portal is not synced yet; the Practice tab records opens only (a Metabase sync, as in the prototype, is the next step).
- The plan is one global plan. Per-cohort plans can come later if batches start on different dates.
- The manager asked for a PRD (objective, 1-month scope, deployment, login, success metric: at least 50% of the students spending 1 hour a day). It is not written yet.

---

## Phase 4B report: AI content agents (2026-11-05)
4B adds the AI side of the content engine: the content team can have a lesson drafted, reviewed and improved by AI, in a short Gen Z style by default, while a person still approves everything before students see it. Real generation needs an API key in the server `.env`. Without one, AI is off (the buttons say so), and a **simulated** provider lets the whole workflow be tried and tested.

### 1. What was implemented
- **"Write with AI"** on any lesson, with a style:
  - **Gen Z bites** (default): punchy, one idea per card, story cards with emoji, ≤ 28 words per card and ≤ 16 per sentence.
  - **Standard**.
  - **Deep dive**.
  - Optional instructions ("use a cricket example", "show pandas").
- **The generation pipeline** (Content Generation agent):
  1. Read the curriculum: each package's depth, objectives, concepts and prerequisites. No student data is used.
  2. **Plan** the lesson (steps, depth layers, objectives), checked structurally. Every depth in use must open with a hook, have something to try, have a check, and end with a summary.
  3. **Write the steps in batches of 5.**
  4. **Run every piece of code** in a sandbox. Real outputs replace whatever the AI claimed. Playground solutions must pass their checks. "Predict the output" questions must mark what the code really prints.
  5. **Save as an "AI draft"** (version status `AI_GENERATED`, origin AI). Every step records its job, prompt version, model and code-check results.
  6. **Queue the AI review.**
- **AI review** (Content Evaluation agent), on its own tab:
  - Computed checks run first: code runs, readability per step against the style's word budgets, and the depth checklist.
  - Then an AI reviewer scores 9 dimensions: correctness, depth per package, objectives, style, code, prerequisites, repetition, made-up claims, interview relevance.
  - It lists issues per step (blocking, major or minor) with a concrete fix.
  - Failed code checks are always blocking. Verdict: ready for human review, needs changes, or blocking issues.
  - It can be re-run on any version, including imported lessons.
- **Rewrite one step with AI** (Section Regeneration agent):
  - From Preview, Edit or an issue in the AI review ("Fix with AI").
  - One-tap presets: ✂️ Shorter · 🧩 Simpler words · ✨ More Gen Z · 🔁 Add an analogy · 📍 Add an example · 🎛️ Make it interactive · 🛠️ Fix review notes. A free-text instruction can be added.
  - Reviewer notes and evaluator findings for that step are passed to the AI.
  - Only that step changes. Its code is re-run, and **Undo** restores the previous version (identical content reuses the original revision).
  - A rewrite is refused if someone edited the step in the meantime.
- **Story cards for students**: a new card layout, `swipe`, with an optional emoji per card.
  - One idea per card, with story-style progress bars and a big emoji.
  - Works with touch or mouse drag, arrow keys and buttons; screen readers announce "Card 2 of 3".
  - Emoji also show on flip and grid cards.
- **Live job tracking** in the lesson workspace:
  - stage and progress ("Writing steps (part 2 of 2)"), cost so far, a log, and a **Stop** button;
  - failures shown with their reason;
  - the new draft opens automatically when it is ready.
- **Admin → AI page**:
  - provider status (Claude, simulated or off; **never the key**);
  - spend today, 7 days and 30 days; spend by task; recent jobs; prices;
  - **which model and effort each task uses**, editable by super admins only and audited.
- **AI gateway** (server only), the single path for every AI call:
  - model route per task, provider call, Zod validation, **one repair attempt** with the exact problems, and a usage record per call (tokens, cost, latency, prompt key@version);
  - a per-job budget (`AI_JOB_BUDGET_USD`, default $5) stops a job as soon as it is exceeded;
  - cancel stops a job at its next checkpoint and aborts the in-flight AI call;
  - refusals and errors are recorded and shown, never retried blindly.
- **Claude adapter** (official `@anthropic-ai/sdk` 1.4.0):
  - Claude Opus 5.5 for every task by default, at effort "high";
  - streaming, structured outputs (JSON Schema from our Zod schemas), prompt caching of the stable instructions and the reference lesson;
  - **server-side refusal fallback enabled** (`fallbacks: "default"`), so a safety false positive retries on another model instead of failing the job.

### 2. Functional and verified end to end
Browser check in headless Edge on an isolated stack (its own database, API, **worker** and apps) with the simulated provider and the real code sandbox. 0 console errors.

| Flow | Result |
|---|---|
| AI page shows "Simulated AI", routes and usage | ✓ |
| RAG fundamentals (no lesson) → Write with AI → Gen Z bites + "Use a cricket example" → live job card → draft opens in Preview | ✓ |
| AI review tab: verdict, 9 scores, issue with "Fix with AI", code checks, readability per step | ✓ |
| Rewrite one step (Shorter + More Gen Z) → "AI rewrote …" banner → Undo restores it | ✓ |
| Submit → approve → publish → student swipes the story cards on desktop and phone | ✓ |

### 3. Decisions
- **Human approval stays mandatory.** AI writes drafts and reviews; it never submits, approves or publishes. The reference lesson I wrote stays "In review" for the content team.
- **AI-friendly schemas, real validation.** Structured outputs can't express open maps or tuples, so the AI fills a generation-friendly shape that is converted and validated by the real lesson schema. Anything invalid gets one repair, with the exact problems listed.
- **Outputs are never trusted from the AI.** Code runs in a sandbox: Pyodide (the same runtime students use) in a separate Node process with **no environment variables**. Node's permission model allows file access only to Pyodide and its package cache. Each snippet has a time limit, and endless loops are killed.
- **Prompts are versioned in code** (`lesson.plan@1`, …). Every revision and usage row records the version, so prompt changes can be compared before they're trusted. An admin prompt editor is deferred.
- **Gen Z, but plain English:** punchy and fun, at most one emoji per card, no slang that English-as-a-second-language learners would need explained, and accuracy never traded away.
- **The simulated provider is never allowed in production** (the environment check refuses it).

### 4. Database and API changes
- Migrations:
  - `20261105051702_ai_agents`: `agent_job`, `agent_job_log`, `ai_usage_record`, `ai_model_route`, `ai_model_pricing`, `content_evaluation`. Partial unique indexes allow **one running generation per lesson** and **one rewrite per step**.
  - `lesson_style`: `module_version.style`.
- Admin API:
  - `/admin/content`: `POST lessons/:id/generate`, `POST versions/:id/evaluate`, `GET versions/:id/evaluation`, `POST versions/:id/sections/:key/rewrite`. Each returns 202 and the job.
  - `/admin/ai`: `GET status`, `PUT routes/:task` (super admin), `GET jobs`, `GET jobs/:id`, `POST jobs/:id/cancel`.
- Worker: queues `ai.lesson.generate`, `ai.lesson.evaluate` and `ai.section.rewrite`, never auto-retried. A finished draft queues its own review.
- Environment: `ANTHROPIC_API_KEY`, `AI_PROVIDER` (auto | anthropic | simulated | off), `AI_JOB_BUDGET_USD`, `PYODIDE_CACHE_DIR`.
- Packages:
  - `@app/content`: styles and readability checks, generation schemas and converters, plan checks, evaluation report, JSON Schema sanitizer, `swipe` layout and card emoji.
  - `@app/contracts`: `ai.ts`.

### 5. Tests and results
`pnpm check` is green: lint, typecheck on all 7 packages, **334 tests** (308 API, 13 content, 10 renderers, 3 contracts), and production builds. No keys, SDK or demo credentials are in the browser bundles.

New tests:
- **6 AI integration tests:**
  - full generation (plan → write → run code → AI draft → review), with provenance and usage records;
  - one-repair success and failure;
  - refusal and budget stops;
  - cancel, no curriculum, and no key;
  - rewrite with stale and duplicate guards, plus undo;
  - AI settings permissions.
- **2 sandbox tests:**
  - reproduces every output of the reference lesson;
  - replaces claimed outputs, catches a wrong answer key, and kills an endless loop.
- **2 schema tests:** the AI schemas use only accepted JSON Schema, and every reference step converts both ways.

### 6. Known issues and notes
- **Real Claude generation has not been run yet:** there is no API key on this machine. Everything is built and tested with the simulated provider. Once a key is in `.env`, the first real lessons should be generated and reviewed (Phase 4C).
- **Cost** at default settings (Opus 5.5, effort high) is estimated at about $1–3 per lesson draft plus review. The job budget stops anything above $5.
- The first code check after a restart takes a few seconds while Python loads, and numpy or pandas download once.
- Prompt templates are edited in code for now (versioned). An admin prompt editor and golden-set comparisons come with Phase 6 tooling.

### 7. Next
- **Add the API key** to `.env` (`ANTHROPIC_API_KEY=…`), then restart the API and worker.
- **4C**: generate the pilot lessons (9 subtopics), review and publish them.
- Or the **question bank import** (no key needed).

---

## Phase 4A report: Lessons, lesson player and content review (2026-11-04)
Phase 4 is split in three. **4A** (this report) delivers everything that does not need an LLM: lesson storage with full history, the admin review and publishing workflow, the shared renderers, the student lesson player with in-browser Python, server-graded checks, progress feeding the roadmap, and feedback on every step. **4B** adds the AI gateway and the generation, evaluation and section-regeneration agents (needs an LLM API key). **4C** generates and reviews the pilot lessons.

### 1. What was implemented
- **Lesson storage with history** (docs/03 §7).
  - One lesson per subtopic, shared by every role and package. Each student sees the depth their target needs.
  - A version is an ordered list of pointers to **immutable section revisions**. Editing one step creates exactly one new revision, and identical content reuses its revision (SHA-256 of the canonical JSON). History, "what changed vs live", rollback and "updated since you finished" all come from this.
  - Status flow: Draft / AI draft → In review → Approved → Published (the previous one becomes Superseded). A reviewer can request changes (back to draft, with notes per step) or reject (archived). At most one published and one working version per lesson, enforced in SQL.
  - Concurrent edits are safe: every save carries the version's edit counter, so two editors can never overwrite each other silently.
  - **Nothing reaches students until a person approves and publishes it.** AI output (4B) will arrive as "AI draft" and go through the same review.
- **Admin → Lessons** (new menu item).
  - Index: every subtopic with the curricula that use it and how deep (e.g. AI 3–6 LPA · Beginner, AI 8–12 LPA · Advanced), status counts, and filters (needs review, not started).
  - Lesson workspace with five tabs:
    - **Preview**: the lesson exactly as a student with a given target and prior knowledge sees it, with the same renderers. Checks grade, code runs, and reviewers can add a note to any step.
    - **Compare packages**: two targets side by side (steps, minutes, objectives), highlighting what only one side gets.
    - **Edit**: a step-by-step JSON editor with live validation and a live preview, a full-document editor (reorder, add, remove), and JSON download. Errors point to the exact field (e.g. `sections.3.body.items.0.answer`).
    - **Checklist & history**: for each depth in use, whether it opens with a hook, has something to try, has a check, ends with a summary, and shows real outputs, plus lesson minutes vs the roadmap budget. Also the review history and all versions.
    - **Student feedback**: average rating, thumbs per step with reasons, and comments. Students are anonymous here.
  - Actions by status: import JSON, submit, approve / request changes / reject, publish (with a change note), unpublish, discard, start a new draft from any version (rollback).
- **Shared lesson renderers** (`packages/learning-ui`), used by the student player and the admin preview:
  - All 12 step kinds: hook (scenario, analogy, where it breaks), explanation blocks, flip / stepper / compare cards, flow diagrams with step-by-step highlights (vertical on phones), code with line annotations, the **code explorer** (flip settings and watch the code, output and verdict change), the **chunker widget**, knowledge checks, the coding playground, callouts, the interview playbook and the summary.
  - Six check types: single and multiple choice, fill in the blank, predict the output, put steps in order, and written answers that the student compares with a model answer before rating themselves.
  - **Python in the browser** (Pyodide v314.0.7, pinned): runs in a Web Worker with a 10-second limit and a fresh namespace per run. "Run it yourself" shows whether the result matches the lesson's verified output. The playground checks the output, offers hints one at a time, keeps the student's draft in their browser, and shows the solution only when asked.
  - Safe rich text: bold, italic, code, http(s) links and glossary chips, rendered as text nodes. HTML in content is rejected on save and never interpreted.
- **Student lesson player** (`/learn/:topic/:subtopic`, full screen, loaded only when opened):
  - One step at a time, with a progress bar, a step outline (a sheet on phones), resume where you left off, and a lesson intro with objectives for your depth.
  - Fast-track: steps the student said they already know are marked "Quick refresher" and can be skipped. They are optional for completion.
  - Continue on a check unlocks once every question has an answer, right or wrong.
  - Completion screen: time, checks right, objectives met, a 5-face rating with tags and "What would make this an 11★ lesson?", the next lesson on the roadmap, and Practice (coming with the question bank).
- **Progress feeds the roadmap.** A finished lesson marks its roadmap item Done, adds to done minutes and stops it being scheduled on re-plans. The topic page shows each lesson's state (Start / Continue x% / Review) and minutes at the student's depth. The Learn tile turns "Ready".
- **Feedback everywhere (the 11★ loop):** thumbs on every step, with reasons on thumbs-down (too fast, hard words, the visual didn't help, something looks wrong, too basic). Each one is tied to the exact revision shown, so a fix can target it. Plus the end-of-lesson rating and a floating Feedback button on every page.
- **Reference lesson** "Chunking strategies" (22 steps, depth-layered: 10 steps for 3–6 LPA, 20 for 8–12 LPA). It is loaded by `pnpm db:bootstrap` and the dev seed **as In review**. It is never published automatically.

### 2. Functional and verified end to end
Browser check in headless Edge on an **isolated stack** (its own database, API on 4100 and apps on 5410/5420), so your local data was not touched. Desktop and phone sizes, 0 console errors.

| Flow | Result |
|---|---|
| Admin opens Lessons → sees 1 waiting for review → previews as 3–6 LPA (checks grade locally) → compares 3–6 (10 steps, 19 min) vs 8–12 (20 steps, 48 min) → checklist → edit is read-only while in review → approves → publishes | ✓ |
| Student (8–12 LPA) opens RAG → Learn tile "Ready" → starts the lesson → runs the fixed-size example in the browser (matches the lesson output) → explores size × overlap (verdict changes; a live run matches the stored output) → answers checks graded by the server → solves the playground (all checks pass) → thumbs-down with a reason on a step → finishes all 20 steps → rates the lesson | ✓ |
| Topic page then shows "Review lesson"; roadmap marks the subtopic Done | ✓ |
| Phone: lesson intro, steps sheet, vertical diagram, topic page | ✓ |
| Admin sees the rating, the flagged step and the comment in Student feedback | ✓ |

### 3. Decisions
- **Lessons are not tied to a package.** One lesson per subtopic with depth-ranked steps and variant slots. Each package sees its own depth, so content written once serves 3–6 and 8–12 differently. Reviewers see both in Compare.
- **Role-specific steps use role slugs** (e.g. `ai-engineer`), so lesson files stay portable between environments.
- **Answers never reach the browser before an attempt.** Students get a stripped copy, and the response schema strips again. Grading only accepts revisions in the student's current published lesson at their depth, so drafts and deeper sections cannot be probed.
- **Access follows the student's own track.** A lesson outside their roadmap looks exactly like one that doesn't exist (404).
- **Learning progress is tracked separately from practice.** Finishing a lesson is not mastery. Checks are reinforcement and every try is kept.
- **Study time is capped** at 30 minutes per save and pauses while the tab is hidden.
- **The admin preview grades in the browser** with the full document (admins can see answers anyway), using the same grading code as the server.

### 4. Database and API changes
- Migration `20261104055121_content_progress`:
  - `learning_module`, `module_version`, `section_revision`, `section_concept`, `module_version_section`, `content_review`, `module_progress`, `knowledge_check_attempt`, `feedback`.
  - Partial unique indexes: one published and one working version per lesson; one thumbs per student per step revision; one rating per student per lesson version.
  - CHECK constraints on depth, minutes, rating, completion consistency and feedback targets.
  - Concepts used by lesson steps can't be deleted (friendly 409). They can still be renamed.
- Admin API, under `/api/v1/admin/content`:
  - `GET lessons`, `GET lessons/:subtopicId`, `GET lessons/:subtopicId/feedback`, `POST lessons/:subtopicId/versions` (import or copy).
  - `GET versions/:id`, `PUT versions/:id/document`, `PUT versions/:id/sections/:key`.
  - `POST versions/:id/submit | review | publish | unpublish | discard`.
- Student API, under `/api/v1/student`:
  - `GET lessons/:topic/:subtopic`, `PUT …/progress`, `POST …/checks`, `POST …/solution`, `POST …/complete`.
  - `POST feedback`.
  - The topic page gains per-subtopic lesson state and learn counts.
- Packages:
  - `@app/content`: canonical form, reviewer checklist (`depthReport`), written answers rated after the model answer.
  - New `@app/learning-ui`.
  - `@app/contracts`: `content.ts`.
- Dev tooling: the Vite proxy target can be overridden (`API_PROXY_TARGET`), used for the isolated browser check.

### 5. Tests and results
`pnpm check` is green:
- lint;
- typecheck on all 7 packages;
- **306 tests** (282 API, 11 content, 10 renderers, 3 contracts);
- production builds, with no demo credentials in the bundles.

New:
- 16 lesson integration tests: import validation with exact paths, one working version, the full review flow, one new revision per edited step, the stale-edit guard, reject / unpublish / discard, concept protection, exemplar loaded once and never published, depth per package, answers never sent, own-track only, server grading and draft probing refused, written-answer flow, progress → completion → roadmap Done → topic page, "updated since you finished", fast-track completion, solution on request, and feedback aggregation.
- 10 renderer unit tests: rich-text safety, the highlighter, the chunker against the lesson's Python output, and the diagram layout.

Fixed along the way: two older admin-login tests had a date bug (a fixed 3 Nov test clock against a real "today"). They now use the test clock.

### 6. Known issues and notes
- **Lesson time vs roadmap budget:** the reference lesson takes about 19 min at 3–6 LPA and 48 min at 8–12 LPA. The planner budgets 40 and 90 min, plus 25% for practice. The checklist flags the gap. Recommendation: let the planner use the published lesson's real minutes once more lessons exist. That would re-plan roadmaps, so it should arrive as a proposal students accept.
- When the SPAs get a Content-Security-Policy (Phase 9), it must allow `cdn.jsdelivr.net` (Pyodide) and `'wasm-unsafe-eval'`.
- The first Run downloads Python (about 10 MB, cached afterwards). The player says so while it loads.
- Not yet built: video steps (Phase 7), question primers (Phase 5), analytics events beyond progress, attempts and feedback (Phase 8).

### 7. Next
- **4B · AI gateway and agents**: provider config (keys only in server env), Content Generation, Evaluation and Section Regeneration agents, prompt versions, cost tracking, and code execution that replaces claimed outputs. **Needs an LLM API key.**
- **Question bank** (planned Phase 5): it does not need an LLM, so it can come before 4B if the key takes time. See the open questions.

---

## Phase 3.1: Smart planner (2026-11-03)
Requested after Phase 3: instead of only saving study time, tell students how long their prep takes, suggest a pace that fits their deadline, and show them the plan.

- **Live prep timeline** in onboarding (time step and review) and on My plan, updating as the student edits.
  - Example: "Your target needs about 15 h 45 min of study across 9 subtopics. At 60 min on Mon–Sat, you finish in 3 weeks, by Fri, 20 Nov."
  - It works before a goal exists, so students see the timeline before they commit.
- **Deadline fit with revision time:**
  - Fits with room: "That leaves 64 days before your deadline for revision and practice."
  - Tight: "You finish right on your deadline. Leave about 2 days for revision and mock interviews."
  - Late: by how many days, with the existing one-tap fixes.
  - The revision buffer is about 15% of the time to the deadline, kept between 2 and 7 days.
- **Suggested paces** (tap to fill the form; nothing saves until the student confirms):
  - With a deadline: **Recommended** (the lightest daily time that still leaves the revision buffer), **Just in time**, or **Study every day** when the chosen days can't make it. When the chosen time already leaves plenty of room, these show as lighter options.
  - Without a deadline: Light / Steady / Intensive (30 / 60 / 90 min) with their finish dates.
- **Week-by-week planner**: Roadmap → *Week by week*. Each week shows its study days and minutes, what you study and what you finish, and highlights "This week". The same weeks appear in onboarding review and My plan.
- **Add to calendar**: an `.ics` download with one event per study day, listing the subtopics and their minutes (RFC 5545, stable event IDs per plan version). Works with Google Calendar, Outlook and Apple Calendar.
- The finish-date card shows the days before (or after) the deadline. The plan save button is now "Save and re-plan", with "Undo changes".
- API:
  - `POST /student/onboarding/plan-preview`
  - `GET /student/roadmap/calendar.ics`
  - `POST /student/roadmap/preview-schedule` now also returns paces, revision days, spare days and weeks.
  - The roadmap response gains `weeks` and `daysToSpare`.
- Planner engine:
  - New: `allocateDays` (minutes per study day), `groupByWeek`, `minDailyMinutes` (search over 5-minute steps) and `suggestPaces`.
  - Fixed a zero-minute weekend entry in the day allocation, found by the new tests.
- Tests: 5 new planner unit tests and 4 integration tests. These cover exact paces for a deadline (25 min recommended, 20 just in time), the onboarding preview, the week plan matching the roadmap dates, and a calendar file with 16 events and ≤ 75-octet lines. Browser checks on desktop and mobile showed 0 console errors.

---

## Phase 3 report: Curriculum and planner (2026-11-03)

### 1. What was implemented
- **Curriculum structure** (shared by every role): topics → subtopics → concepts, with prerequisites between topics and between subtopics.
  - Concepts are the finest skill tag (e.g. `rag.retrieval.rrf`). Lessons (Phase 4) and questions (Phase 5) will link to them.
  - Prerequisite loops are rejected when saving, so the planner can always find an order.
- **Role × package curricula, versioned**: for each target, which subtopics are in, at what depth (1–5), how important, whether optional, the learning objectives, a hands-on expectation, an optional time override and the reasoning behind the depth.
  - Draft → publish, with one live version and at most one draft, both enforced by the database.
  - Every publish keeps history with a change note and is audited.
- **Pilot curriculum v1** (`pnpm db:bootstrap`, insert-only like the catalog): AI Engineer at 3–6 and 8–12 LPA, over **Python & NumPy → Embeddings & Vector Search → RAG**: 3 topics, 9 subtopics, 28 concepts.
  - 3–6 LPA: lighter depths, and advanced retrieval is optional.
  - 8–12 LPA: Advanced depth on the GenAI topics.
  - Marked as a draft for content-team review and Research Agent validation (Phase 6).
- **Planner engine** (pure, unit-tested):
  - Orders subtopics by prerequisites, with stable tie-breaks: topic order, priority, then subtopic order.
  - Estimates time from depth × complexity, plus 25% for practice. Admins can override any estimate.
  - **Fast-tracks** topics the student rated themselves well in (15–30% quicker). The **depth never drops**.
  - Packs the work onto the student's study days at their daily minutes.
  - **Deadline check with explicit options**: study N min a day, add a study day, move the deadline, or leave the optional items for last. Nothing is dropped silently.
- **Roadmaps with immutable versions**: one roadmap per goal.
  - It is created when onboarding finishes. If the target has no published curriculum yet, it waits and is built the moment one is published.
  - Changing your time or self-check re-plans from today as a new version. Saving the same settings again changes nothing.
  - **Re-plan from today** when behind. It is a no-op if the dates would not change.
  - Changing your target gives the new goal its own roadmap; the old one is kept.
  - **When admins publish an update, students get a proposal, never a silent change.** It lists what is new, what is removed, depth changes, time and finish-date changes, and the student accepts or declines.
    - Wording-only edits (objectives, rationale) apply directly, with the same dates.
    - A pending proposal survives a schedule change and is re-made after it.
  - Statuses (Done / In progress / Behind / Up next / Coming up) are derived when the roadmap is read, never stored.
- **Student UI**:
  - **Roadmap** page: a topic journey with status icons, a depth meter, Must-know / Optional / Fast-track badges, dates, minutes, expandable learning objectives, a finish date, total and weekly time, a deadline card with one-tap fixes, a behind-schedule banner with re-plan, and the update banner and dialog.
  - **Topic page with both "Learn the Concept" and "Practice Questions" visible from day one.** Both are marked "Coming soon", and Practice has a working *Notify me*. It also shows a plain-language note on why this depth for your package, plus each subtopic's objectives and concepts.
  - **Home**: an "Up next" card with *Start here*, plus journey progress by topic.
  - **My plan**: a **live preview** before saving ("If you save, you finish on Wed, 11 Nov (3 days earlier). That fits your deadline.").
  - Phones get a bottom tab bar (Home · Roadmap · My plan).
- **Admin UI**:
  - **Curriculum → Role curricula**: a role × package matrix (version, item count, students, draft badge). The editor groups subtopics by topic, with include, depth, priority and optional controls, and expandable objectives, rationale, expectation and time override.
    - Live diff against the published version (New · Removing · Was Advanced).
    - Save draft, discard, and publish with a change note. The publish dialog says how many students will get an update.
    - Version history.
  - **Curriculum → Topics & subtopics**: create and edit topics and subtopics, prerequisite pickers, archive, and concept add/delete.
  - **Students → detail** now shows the student's own roadmap (read-only, the same plan the student sees), flagging when they are behind, will miss the deadline, or have an update waiting.

### 2. Functional and verified end to end
| Flow | Verified by |
|---|---|
| Onboarding creates the first roadmap in prerequisite order; exact minutes and dates (945 min, ends Thu 19 Nov at 60 min Mon–Sat) | Integration test |
| 3–6 vs 8–12 LPA give different roadmaps (455 vs 945 min; optional/Foundational vs Advanced retrieval) | Integration test |
| Fast-track shortens confident topics without lowering depth | Integration test |
| No curriculum → "almost ready" → admin publishes → first roadmap (not a proposal) | Integration test |
| Schedule preview saves nothing; saving re-plans as v2; an identical save is a no-op; self-check changes re-plan | Integration tests |
| Impossible deadline → exact options (90 min/day, add Sunday, move deadline) | Integration test |
| Time travel 5 days → items "Behind" → re-plan from today → no-op on repeat | Integration test |
| Publish → proposal with named changes → accept / decline; only that target's students; wording-only applies directly; proposal survives a schedule change (v2 active, v3 proposed) | Integration tests |
| Change target → new roadmap, old kept | Integration test |
| Topic page: subtopics, concepts, depth note, Learn + Practice tiles, topic notify-me; 404 outside the student's track | Integration tests |
| Admins can open any student's roadmap; students cannot | Integration test + authorization matrix |
| Taxonomy CRUD, duplicate slugs and keys, prerequisite loops (subtopic, self, topic), draft/discard/publish/history, draft validation, audit | Integration tests (`admin-curriculum.test.ts`) |
| Student Home, Roadmap (collapsed and expanded), Topic and Plan preview on desktop and mobile; admin matrix, editor diff, publish dialog, taxonomy, subtopic dialog, student roadmap | Headless Edge, 0 console errors. The update banner and deadline card were rendered by modifying responses in the browser, so no test data was published to the dev database |

### 3. Decisions
- **Curriculum updates are proposals.** A student's plan only changes when they say so (settings changes and re-plans are their own actions). Wording-only edits apply directly because no dates change.
- **Feasibility is computed live** ("if you keep going from today"), while dates come from the saved version. Students see reality without the plan moving under them.
- Proposals are created inline when publishing. That is a few milliseconds per student, fine for pilot cohorts; it moves to a queue job before scale (Phase 9).
- Learning progress arrives with lessons (Phase 4). Until then nothing can be marked done, so "Behind" appears as dates pass, and re-planning fixes it.
- The pilot depths and objectives are a v1 for the content team to review. Everything is editable in the console without a deploy.

### 4. Database and API changes
- Migration `curriculum_roadmaps`:
  - New tables: `topic`, `topic_prerequisite`, `subtopic`, `subtopic_prerequisite`, `concept`, `role_curriculum`, `role_curriculum_item`, `roadmap`, `roadmap_version`, `roadmap_item`.
  - Partial unique indexes: one published and one draft curriculum per target; one active and one proposed version per roadmap.
  - CHECK constraints on complexity and against self-prerequisites.
- Student API: `/student/roadmap`, `roadmap/preview-schedule`, `roadmap/replan`, `roadmap/proposal/{accept,decline}`, `topics/:slug`.
- Admin API:
  - `/admin/curriculum/{taxonomy, topics, subtopics, concepts}`
  - `/admin/curriculum/curricula`, plus `curricula/target` (overview), `target/draft` (PUT, DELETE) and `target/publish`
  - `/admin/students/:id/roadmap`

### 5. Tests and results
`pnpm check` → **lint clean · typecheck clean · 225 tests passed** (13 planner unit, 19 roadmap, 9 curriculum admin, plus everything earlier) **· all apps build.** Production bundles were re-checked: no demo credentials.

### 6. Known issues and notes
- The Learn and Practice tiles are "Coming soon" by design until Phases 4 and 5.
- The dev database has extra test students from browser runs, so the 8–12 LPA cell shows several students.

### 7. Next: Phase 4 · Content engine ⭐
Structured lesson JSON for each subtopic × depth, an AI generation pipeline behind a provider-agnostic gateway, automatic evaluation, admin review and approval, and the explorable lesson player. Learning progress feeds the roadmap statuses. **Needed from you:** an LLM provider API key.

---

## Phase 2.1: Google sign-in and demo accounts (2026-11-03)
- **Continue with Google** for students and admins: Authorization Code flow with PKCE, ID token verified against Google keys (issuer, audience, expiry, nonce), single-use server-side state bound to the browser by a cookie (login-CSRF safe), and open-redirect-safe `next`.
  - Students are created (verified email, respecting the sign-up policy and cohorts) or linked to an existing account by Google id or email.
  - Admins are **never created** by Google: the account must exist, a pending invite is accepted by signing in, and an optional company-domain lock applies.
  - The button is hidden until Google credentials are configured.
  - New tables: `user_identity`, `oauth_login_attempt` (purged daily).
- **Demo accounts for local checks**: a demo super admin and a demo student with a goal (dev seed), shown on the login screens with **Fill demo details** in local development only. Verified that production bundles contain neither the credentials nor local paths.
- **Signup hint follows the sign-up policy** (any email · enrolled email · closed).
- Fixed a build issue found along the way: loading the repo-root `.env` into Vite silently produced development builds. Removed; demo values now live in dev-only `apps/*/.env.development`.
- Tests: 10 new Google sign-in tests (PKCE, linking, CSRF, single use, cancel/failure/unverified, policy, staff-vs-student, open redirect, admin-only, invite acceptance, domain lock). **150 tests passing.**

---

## Phase 2 report: Catalog and onboarding

### 1. What was implemented
- **Catalog (admin-configurable, no deploys)**:
  - Career roles: title, badge code and colour, tagline, description, competencies, interview focus, and skill areas with importance. Availability `LIVE / NEXT_UP / PLANNED / HIDDEN`.
  - Package brackets: LPA range, headline, and plain-language expectations, with a per-bracket **question difficulty mix**.
  - The 5-level **depth scale**, with editable generation guidance.
  - Skill areas and companies.
- **Catalog bootstrap** (`pnpm db:bootstrap`): real initial configuration.
  - AI Engineer is LIVE; ML Engineer is Next up; Data Scientist, Data Analyst and Data Engineer are Planned.
  - 3–6 and 8–12 LPA are LIVE; 6–8 and 12+ are Next up.
  - Also seeds 5 depth levels, 8 skill areas and 25 companies.
  - Idempotent: only inserts what's missing and never overwrites admin edits.
- **Student onboarding**: role → package → self-check → time → review → celebration.
  - Only LIVE options are selectable. Upcoming ones show "Notify me", which is captured as demand.
  - A **draft is saved at every step**, so a refresh resumes where the student left off.
  - Focus moves to each new question for keyboard and screen-reader users.
  - Deadline validation runs in the student's timezone (1 week to 3 years).
- **Goal model**:
  - Exactly one active goal per student, enforced by a **database partial unique index**.
  - Schedule edits.
  - Changing role or package starts a new goal and keeps the old one as history.
  - Skill self-ratings can be updated later.
- **Student UI**: the onboarding flow, a personalized Home (target, weekly hours, deadline countdown, study days, self-check), and **My plan** (change target, edit time, edit self-check).
- **Admin UI**:
  - **Students**: search, role, package, cohort, onboarding and status filters, shareable filter URLs, pagination. A detail view shows the goal, self-check and cohorts, with **suspend** (signed out instantly) and reactivate.
  - **Catalog**: tabbed editors for roles, packages (difficulty-mix sliders), depth levels, skill areas and companies, with usage and demand counts.
  - **Access**: registration policy (super admin), cohorts, and a **bulk enrollment list** of emails or whole domains. Students who sign up through it join the cohort automatically.
  - **Overview**: adds a "Goal set" KPI and students by role and by package.
- **Email moved to the job queue**: the API enqueues, and the worker delivers with retries and backoff. Payloads with links are deleted an hour after delivery. User actions never wait on SMTP: signup went from tens of seconds (SMTP timeout) to **0.26 s**.

### 2. Functional and verified end to end
| Flow | Verified by |
|---|---|
| Signup → onboarding (all 4 steps + review) → celebration → personalized Home → My plan → change-target dialog | Headless-Edge journey on desktop and mobile, including a **page reload mid-onboarding** that resumes the draft, 0 console errors |
| Only LIVE roles and packages selectable, deadline window, minutes and days validation | Integration tests |
| One active goal per student (the DB rejects a second one) | Integration test |
| Change target keeps history, schedule and skills update | Integration tests |
| Notify-me is idempotent and shown in the catalog | Integration test |
| Admin catalog edits are audited with before/after. Bootstrap is idempotent and preserves edits. | Integration tests |
| Students list filters (role, package, cohort, onboarding, search) and overview breakdowns | Integration tests |
| Suspend → signed out immediately and login refused | Integration test |
| Enrollment list (emails + domains, invalid lines reported, duplicates skipped) → ALLOWLIST policy → auto cohort membership | Integration test |
| Only super admins change the registration policy | Integration test |
| Every new route is protected (authorization matrix auto-covers them) | Matrix test |
| Email is enqueued by the API and delivered by the worker to Mailpit | Unit tests + live run |

### 3. Decisions
- Pilot defaults were applied as configuration, so admins can change them any time.
- Email is delivered through the queue (production-grade, retryable) instead of inline SMTP.
- In dev, `127.0.0.1` is used instead of `localhost`, because on this machine WSL's relay intercepts IPv6 `localhost` on our ports.

### 4. Database and API changes
- Migration `catalog_goals_cohorts`:
  - New tables: `career_role`, `package_bracket`, `depth_level`, `skill_area`, `role_skill_area`, `company`, `bracket_difficulty_policy`, `cohort`, `cohort_member`, `student_goal`, `student_skill_rating`, `interest_signal`.
  - New columns: `student_profile.onboarding_draft`, `enrollment_allowlist.cohort_id`.
  - Constraints: a partial unique index for the active goal, plus CHECK constraints.
- Student API: `/student/{catalog, onboarding, onboarding/complete, goal, goal/schedule, goal/target, skills, interest}`.
- Admin API:
  - `/admin/catalog/{roles, brackets, brackets/:id/difficulty-policy, depth-levels/:rank, skill-areas, companies}`
  - `/admin/students` (list, detail, update)
  - `/admin/access/{cohorts, allowlist, registration}`

### 5. Tests and results
`pnpm check` → **lint clean · typecheck clean · 140 tests passed · all apps build.**

### 6. Known issues and notes
- The Home "Your roadmap" card states honestly that the roadmap opens in the next update (Phase 3).
- The dev database contains test students created by the browser runs.

### 7. Next: Phase 3 · Curriculum and planner
Topics, subtopics, concepts and prerequisites. The role × package curriculum editor with publish and versions. The planner engine (ordering, packing, feasibility) and roadmap versions and proposals. The roadmap UI and the **topic page with both Learn and Practice tiles**. The pilot curriculum seed.

---

## Phase 1 report: Foundation

### 1. What was implemented
- **Monorepo** (pnpm workspaces): `apps/api`, `apps/student`, `apps/admin`, `packages/contracts`, `packages/ui`. Biome lint and format, strict TypeScript, and a single `pnpm check` quality gate.
- **Infrastructure**: Docker Compose with Postgres 17 and Mailpit. Env validated with Zod at startup. In production, config comes only from real environment variables.
- **API** (Fastify 5): structured JSON logs (pino, secrets redacted), request IDs, the documented error envelope, Helmet security headers, global and per-route rate limits, a CSRF origin guard (the admin namespace accepts only the admin origin), OpenAPI docs (non-production), and health/readiness endpoints.
- **Identity**:
  - Student signup, login, logout and a session probe.
  - Email verification (resend invalidates older links).
  - Forgot and reset password (no account enumeration; signs out every session).
  - Change password (keeps only the current session) and profile edit (name, timezone).
  - Admin login, logout and session, invite-only admin onboarding, and a super-admin invite API and UI.
  - A CLI to create the first admin, and a dev seed.
- **Security model**:
  - Argon2id hashing (OWASP parameters).
  - Opaque random session tokens, stored hashed. HttpOnly, SameSite=Lax cookies, separate per audience (`nwp_sid` on `/api/v1`, `nwp_asid` on `/api/v1/admin`).
  - Student sessions slide for 30 days. Admin sessions last 12 hours absolute with a 2-hour idle timeout.
  - Guards run at `onRequest`, so unauthenticated calls are refused before body parsing.
  - Registration policy: `OPEN` / `ALLOWLIST` (enrolled emails or domains) / `INVITE_ONLY`.
  - Audit log for admin logins, failed admin logins, invites, password resets and changes, and registrations.
- **Worker** (pg-boss): runs as its own process, with a daily scheduled job that purges dead sessions and tokens.
- **Student app**:
  - Signup, login, forgot, reset and verify-email screens in the prototype's split layout.
  - Signed-in shell, Home (verification banner with resend), and Profile & security.
  - Client-side validation uses the same Zod contracts as the server.
  - A global 401 handler returns the student to sign-in when the session ends.
- **Admin app**: a separate build and origin, with login, accept-invite, forgot and reset screens, a sidebar shell, an Overview with live KPIs, and an Admins page (list plus invite with a copyable link).
- **Design system**: NxtWave-blue tokens (light and dark), Geist and JetBrains Mono (self-hosted), and shared components: Button, TextField with show/hide password, Alert, Card, Logo, PasswordMeter. Reduced-motion support.

### 2. Functional and verified end to end
| Flow | Verified by |
|---|---|
| Signup → session cookie → verification email (Mailpit) → verify → verified | Integration tests, and a live run through the Vite proxy and Mailpit |
| Login (generic errors), logout revokes the server session (cookie replay fails) | Integration tests |
| Forgot → reset → all sessions revoked → old password fails, new works, link single-use | Integration tests |
| Change password keeps only the current device | Integration tests |
| ALLOWLIST and INVITE_ONLY registration policies | Integration tests |
| Admin login, invite → accept → admin session. A regular admin can't manage admins. | Integration tests, and live via the admin proxy |
| Session expiry (student sliding 30 days; admin 2h idle / 12h absolute) | Tests with an injected clock |
| **Authorization matrix**: every non-public route refuses anonymous callers and wrong-audience sessions. New routes are covered automatically. | Test auto-enumerates routes. A mutation test (guard removed) made it fail as expected. |
| CSRF origin guard, rate limiting (11th login attempt → 429), security headers | Tests and a live production-bundle smoke test |
| Production bundle boots, connects to the DB, hides API docs | `node dist/main.js` smoke test |
| UI renders correctly (desktop 1440 px and mobile 390 px, light and dark) with no unexpected console errors | Headless Edge screenshots of every screen |

### 3. Important architectural decisions
- **TypeScript end to end**, so Zod contracts are shared by the API validation, the frontend forms, and (from Phase 4) the LLM structured outputs.
- **In-house session auth** instead of JWTs or a SaaS provider: instant revocation, audience separation, no per-student cost.
- **Two separate SPAs**: the admin code is never shipped to students.
- **Postgres-backed queue (pg-boss)**: no Redis needed yet.
- **Pinned mature versions**: TypeScript 5.9 (not 7), Prisma 7.10 (not the 8 RC), React Router 7. Very new releases are avoided because pnpm's minimum release age is enforced and not bypassed.

### 4. Database and API changes
- Migration `init_identity`: `app_user`, `student_profile`, `admin_profile`, `session`, `auth_token`, `enrollment_allowlist`, `audit_log`, `platform_setting`.
- Endpoints:
  - `/api/health`, `/api/ready`
  - `/api/v1/auth/{session,register,login,logout,me,verify-email,resend-verification,forgot-password,reset-password,change-password}`
  - `/api/v1/student/profile` (GET, PATCH)
  - `/api/v1/admin/auth/{session,login,logout,me,forgot-password,reset-password,accept-invite}`
  - `/api/v1/admin/{overview,admins,admins/invites}`

### 5. Tests and results
`pnpm check` → **lint clean · typecheck clean · 52 tests passed** (49 API integration and unit tests against real Postgres, 3 contract tests) **· all 3 apps build.**

### 6. Known issues and notes
- Dev ports: Postgres uses **45432** (first 56432, moved on 2026-11-04 after Windows reserved 56374–56473; ports below 49152 stay outside those dynamic reservations). This machine also runs a native PostgreSQL on 5433. The apps use **5310/5320** because 5173 was taken by another local app.
- Per-email login throttling is IP-based only for now (per-account lockout comes with Redis-backed rate limits at scale).
- The JS bundle is about 145 KB gzipped per app. Route-level code splitting arrives with the larger Phase 2–4 screens.
- Email uses Mailpit in development. A production SMTP or SES provider still needs choosing.

### 7. Remaining (carried to later phases)
Cohorts and allowlist management UI (Phase 2), Playwright E2E suite (Phase 9), deployment pipeline (Phase 9).

### 8. Next phase: Phase 2 · Catalog and onboarding
Roles and brackets (`LIVE / NEXT_UP / PLANNED / HIDDEN`), depth levels, skill areas, companies, cohorts and allowlist (admin CRUD). Student onboarding (role → package → self-check → time). Goal storage, "Notify me" interest, and the personalized dashboard shell.

### Open questions for the product owner
1. **LLM provider access**: which API keys can we use (Anthropic / OpenAI / Gemini / Azure)? Needed by Phase 4.
2. **Question bank**: please share the existing ~1,000-question file (or a sample), and **confirm its source and licence**. Several prototype question slugs match public StrataScratch titles. The bank is in a Google Sheet (asked 2026-11-04). The importer will take a sheet link shared as "Anyone with the link can view", or a CSV/XLSX download, with a column-mapping step. Please share the header row and 5–10 sample rows.
3. **Pilot brackets** (proposed: 3–6 LPA and 8–12 LPA) and **pilot topics** (proposed: Python & NumPy → Embeddings & Vector Search → RAG).
4. **Registration**: open sign-up, or enrolled-only (`ALLOWLIST`) as in the prototype?
5. **Brand**: final product name and logo (tokens are ready to re-theme).
6. **NxtWave Learning Portal**: do we get API or Metabase access for solved-status sync?
