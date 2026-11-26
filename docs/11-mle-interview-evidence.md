# 11 · ML Engineer interview evidence → curriculum v2

**Status:** draft for content-team review (2026-11-05).
**Used by:** `apps/api/src/modules/curriculum/mle-curriculum.ts` (topics, subtopics, priorities, depths).
**Re-run:** `tools/hiring-intelligence/` (the data itself stays out of the repo).

The manager's direction: build the ML Engineer track **from what interviews actually ask**, as an
interview-preparation path, not as syllabus completion. This page records the evidence and how
each part of the curriculum follows from it.

## 1. Source and scope

| | |
|---|---|
| Source | NxtWave Hiring Intelligence dashboard (`<8 & >8 LPA opportunities`), data 2026-01-01 → 2026-10-30 |
| Whole dataset | 456 companies · 594 opportunities · 25,715 interview questions |
| **ML Engineer family** | **72 companies · 80 opportunities · 3,293 questions** (57 opportunities under 8 LPA, 23 at 8 LPA or more; median CTC 6 LPA) |

**Which roles count as ML Engineer.** Job titles are free text (281 distinct titles), and only one
is literally "Machine Learning Engineer". So:

- **Tier A, ML titles** (27 companies, 1,505 questions): titles with ML / AI-ML / data science /
  computer vision, e.g. *AI/ML Engineer*, *AI/ML Intern*, *DS/ML Engineer*, *Data Science Intern*,
  *Machine Learning Engineer*, *Computer Vision Intern*.
- **Tier B, AI titles** (46 companies, 1,788 questions): generic *AI Engineer / AI Intern / AI
  Developer / Gen AI Engineer* titles.
- **Excluded:** full-stack, web, MERN, prompt-only, automation, product, strategy and business
  titles, and questions in frontend or full-stack domains.

Tier A is the cleanest ML Engineer signal and sets the priorities. The whole family sets the
depth and the CTC split.

## 2. What ML Engineer interviews contain

**Rounds.** Technical Round 1 at 55 of 72 companies, Technical Round 2 at 22, a written test or
assessment at 9, an HR round at 11, and assignments at 19.

**Question types.** Conceptual 1,389 questions (57 companies) · **project discussion 1,045 (55)** ·
general and HR 524 (51) · coding 223 (38) · project assignment 57 (24) · behavioural 55 (17).

**Coding.** Basic coding at 29 companies, DSA at 12, AI/ML assignments at 9, LLM/GenAI assignments
at 15, SQL queries at 7. Live coding is mostly basic Python problems, not hard DSA.

**Themes.** Questions were grouped with explicit keyword rules over topic, subtopic, skill and
question text (`cluster.py`). Share of companies asking each theme:

| Theme | All 72 | Tier A (27) | under 8 LPA | 8 LPA + |
|---|---|---|---|---|
| Project deep-dive | **92%** | 93% | 91% | 94% |
| Self-introduction and HR | **72%** | 67% | 67% | 83% |
| Python (concepts and coding) | **57%** | 56% | 56% | 56% |
| GenAI (LLMs, RAG, agents) | **56%** | 41% | 45% | **83%** |
| ML fundamentals | **49%** | **67%** | 49% | 44% |
| Deployment, APIs, system design | 40% | 30% | 36% | 50% |
| Deep learning (NN, CV, NLP) | 38% | **52%** | 38% | 33% |
| SQL and databases | 31% | 19% | 27% | 39% |
| CS fundamentals and Git | 31% | 26% | 29% | 33% |
| Model evaluation | 25% | 37% | 24% | 28% |
| Classical algorithms | 21% | 26% | 22% | 17% |
| Data preparation | 19% | 22% | 18% | 22% |
| Aptitude | 11% | 19% | 15% | 0% |

Inside the big themes (all 72 companies):

- **Project:** overview and problem statement 78% · architecture, deployment and scale 62% (83%
  at 8+) · "why this model / tool" 54% (78% at 8+) · results 31% · data decisions 28% ·
  challenges 22%.
- **HR:** self-introduction 68% · internship story 47% · motivation and behavioural 32% ·
  relocation and CTC 29%.
- **Python:** coding round (strings, lists, numbers) 39% (44% under 8 LPA) · core concepts 33% ·
  DSA 18% (33% at 8+) · OOP 11%.
- **GenAI:** RAG 40% · LLM basics 35% · agents and frameworks 31% · prompting and hallucinations
  15% · chunking 11% · fine-tuning vs RAG 11% · embeddings and vector stores 8% (all roughly
  double at 8+ LPA).
- **Deep learning:** NLP 25% · neural-network basics 21% · computer vision 15%.

**Difficulty by package.** Under 8 LPA, Python is 60% easy; at 8+ it is 46% easy and 46% medium.
GenAI hard questions rise from 13% to 22%, and project questions move from easy to medium.

## 3. From evidence to curriculum

**Rules applied.**

1. A theme becomes a topic when interviews ask it as its own area. That is why
   *Self-Introduction & HR* and *Project Deep-Dive* are topics, not footnotes.
2. Priority comes from company coverage. Must-know (HIGH) means it is asked at roughly a third or
   more of companies at that package, or it is a core idea every answer depends on.
3. Depth: **3–6 LPA** follows the under-8-LPA evidence (depth 2 for core items, 1 or optional for
   rarely asked ones). **8–12 LPA** follows the 8+ evidence (depth 3, and depth 4 for project
   architecture, where questions are hardest).
4. Time: the 3–6 LPA core (optional items excluded) is designed to fit a 30-day plan at about an
   hour a day, Mon–Sat. Optional items come last.
5. Order follows the interview flow and dependencies: introduction → Python → ML fundamentals →
   data → algorithms → evaluation → project deep-dive → deep learning → LLMs → embeddings → RAG
   → SQL → deployment.

**The 13 topics** (48 subtopics; full objectives and rationales in `mle-curriculum.ts`):

| # | Topic | Evidence | Subtopics |
|---|---|---|---|
| 1 | Self-Introduction & HR Round | 72% | Self-introduction pitch · Internship and experience story · HR and behavioural questions · Aptitude (optional, 3–6 only) |
| 2 | Python for Interviews | 57% | Core Python concepts · OOP in Python · Coding round: strings, lists and numbers · DSA essentials |
| 3 | Machine Learning Fundamentals | 49% (67% tier A) | AI, ML, DL and learning types · Loss functions and gradient descent · Overfitting, bias–variance and regularization |
| 4 | Data Preparation & Feature Engineering | 19% + project data 28% | Missing values, outliers and duplicates · Encoding, scaling and data leakage · Pandas for data wrangling · Statistics for ML (optional) |
| 5 | Classical ML Algorithms | 21% | Linear and logistic regression · Decision trees and ensembles · KNN, SVM and Naive Bayes · Clustering and PCA |
| 6 | Model Evaluation & Selection | 25% (37% tier A) | Classification metrics and imbalanced data · Regression metrics · Model selection and tuning |
| 7 | Project Deep-Dive | **92%** | Project overview and problem statement · Data, model and tool choices · Results, metrics and impact · Architecture, deployment and challenges |
| 8 | Deep Learning | 38% (52% tier A) | Neural network fundamentals · Training deep networks · CNNs and computer vision · Text preprocessing and representation · Attention and transformers |
| 9 | LLMs, Prompting & Agents | 56% GenAI | How LLMs work · Prompting, parameters and hallucinations · Agents, tools and LLM frameworks |
| 10 | Embeddings & Vector Search *(existing)* | in RAG answers | What embeddings are · Similarity measures · Vector databases & ANN search |
| 11 | RAG *(existing + 1)* | 40% | RAG fundamentals · Chunking strategies · Improving retrieval quality · **Fine-tuning vs RAG** (new) |
| 12 | SQL for Interviews | 31% | Filtering, grouping and aggregation · Joins and window functions · Keys, normalization and SQL vs NoSQL |
| 13 | Model Deployment & System Design | 40% | Serving models with FastAPI and REST · Docker, cloud and deployment · ML system design basics · Git and engineering basics (optional) |

*Python & NumPy for AI* (the AI Engineer pilot topic) is not in the ML Engineer track: NumPy itself
is almost never asked (3 questions). Its useful parts (vectorization, linear algebra) are covered
inside the ML and DL subtopics.

**The DSML master sheet** was used only as a coverage check: classical ML, deep learning, NLP,
computer vision, PyTorch, statistics and the AIML interview-prep course are all taught already, so
lessons here can stay interview-focused and point back to the courses. Its *Course-IDs* tab lists
the learning-portal course ids (`c_id`) to use in practice links.

## 4. Limits and next steps

- **The grouping is rule-based.** Some questions land in the wrong theme (e.g. a generic "core
  concepts" label), so treat the percentages as about ±5 points. Every rule is in `cluster.py`.
- **Small numbers at the edges.** Only 23 opportunities are at 8 LPA or more, so 8–12 LPA depths
  are less certain than 3–6.
- **Question text is sometimes a template** ("Solve an aptitude problem…"). Topic and subtopic
  labels were used together with the text.
- **Next:** feed the real questions per subtopic into lesson generation (interview playbooks and
  checks), and refresh this analysis each month as new interviews are logged.
