# V1 scope: ML only, one algorithm at a time, in depth

Written 2026-11-19, after the product review of 2026-11-18. This replaces the breadth-first plan
(13 topics, 48 units) as the plan for the first release. Nothing built earlier is deleted: it is
hidden from students until it is rebuilt to the V1 bar.

## 1. What the review asked for

| The review said | What V1 does |
|---|---|
| Everything is "on a very high level"; a student could not clear an interview from it | Each unit teaches one algorithm to the depth of the reference page (ml-visuals-orcin.vercel.app, KNN), plus interview answers and their follow-ups |
| The reason for this platform is live calculations with real numbers | Every unit is built around a guided lab: a story beside one live picture, with every number worked out and checked against scikit-learn |
| Scope it down: AI/ML only, start with ML and about 10 algorithms; HR grooming is another team's job | V1 shows students one topic, Classical ML, with one unit per algorithm. Other topics are hidden |
| Do not show partly done topics; one algorithm live and the rest "coming soon" is fine | A unit appears as "Coming soon" until its lesson is published |
| Agree one pattern, then scale it with an agent | Section 3 is the pattern. KNN is the first unit built to it |
| First thing: make it responsive | The lesson player, slide decks and labs are fixed for small windows and phones (section 5) |
| The voice sounds robotic; not in phase 1 | Read-aloud is switched off for students. The scripts are kept for later |
| Do not show a snippet's output before the student runs it; make them write the formula | Runnable code shows no output until it is run. Coding exercises are fill-in-the-blank and are checked on results |
| Put it on a real website with a staging and a production copy; test with teammates first | Section 6. This needs hosting decisions from the team |

## 2. What students see in V1

One topic, **Classical ML Algorithms**, with these units. The list follows the DSML master sheet's
Classical ML track; the order puts the most-asked algorithms first.

| # | Unit | Master sheet source | Status |
|---|---|---|---|
| 1 | K-Nearest Neighbors (KNN) | KNN, KNN Advanced, KNN Regression | **Live** |
| 2 | Linear regression | Simple, Multiple, Polynomial, Assumptions, Gradient Descent | **Live** |
| 3 | Logistic regression | Logistic Regression | Coming soon |
| 4 | Decision trees | Decision Tree 1–2, Decision Tree Regression | Coming soon |
| 5 | Random forest and bagging | Bagging, Random Forest, Feature Importance | Coming soon |
| 6 | Boosting: AdaBoost, gradient boosting, XGBoost | Boosting, Gradient Boosting, XGBoost | Coming soon |
| 7 | Naive Bayes | Naive Bayes 1–2 | Coming soon |
| 8 | Support vector machines (SVM) | SVM, Support Vector Regression | Coming soon |
| 9 | K-Means clustering | K-Means 1–3 | Coming soon |
| 10 | Hierarchical clustering and DBSCAN | Hierarchical, DBSCAN | Coming soon |
| 11 | PCA and dimensionality reduction | Dimensionality Reduction 1–3 | Coming soon |

**Phase B, after the algorithms:** the cross-cutting ML topics from the same track, rebuilt to the
same pattern: evaluation metrics (by far the most-asked ML theme in interviews), bias and variance,
regularisation, gradient descent, hyperparameter tuning and cross-validation. Lessons for some of
these exist in the older, lighter format. **Then** deep learning.

**Left out of V1:** Apriori and Eclat (rarely asked), self-introduction and HR, Python, DSA, NumPy,
data preparation, deep learning, LLMs, RAG, SQL and deployment. Their lessons stay in the admin
console, unpublished to the V1 roadmap.

This curriculum is **published** for both ML Engineer packages (2026-11-20), so a student's roadmap
is these 11 units and nothing else: one topic, about six hours, with the units that have no lesson
yet shown as "Coming soon". Everything outside it is **archived**: hidden from the student app and
from Admin → Lessons, still in the database and still in the repo. Admin → Curriculum lists archived
rows with an "Archived" badge, and setting one back to Active restores it with its lessons intact.

The four older combined units in Classical ML (linear and logistic regression together, trees and
ensembles, KNN with SVM and Naive Bayes, clustering with PCA) are archived too: V1 teaches one
algorithm per unit, so linear regression and logistic regression are separate.

**Study time is measured, not guessed.** A V1 unit carries its real length (`estimateMinutes` on the
curriculum seed), so the plan reads 50 minutes a unit and 9 h 10 min in total, instead of the 30
minutes the planner's depth-and-complexity formula produced. On 2026-11-20 the product owner asked
for "as much time as needed" in these units, so the lesson-length check only holds a guided-lab unit
to a sanity limit of 90 minutes.

## 3. The unit pattern

Every algorithm unit has the same parts, in this order. A unit takes a student 40 to 50 minutes.

| Part | What it does | In the KNN unit |
|---|---|---|
| 1. Hook | One everyday use and the question the unit answers | A streaming app predicting whether you will like a film |
| 2. Guided lab: how it works | The algorithm one step at a time beside a live picture. Each step states the numbers the picture shows, and a table works them out | 7 steps: labelled points, the new point, every distance with its working, the K nearest, the vote, a moved point, decision regions |
| 3. How to describe it | The definitions and labels an interviewer expects, costs, and the regression form | Supervised, lazy, non-parametric; cost N × d; KNN regression |
| 4. Guided lab: the main setting | The key hyperparameter, with accuracy on held-out points, so overfitting and underfitting are measured, not asserted | K = 1 scores 100% on training points and 84.4% on unseen ones; a large K fails on rings; choosing K; ties |
| 5. Guided lab: the important variant | The fix for the basic method's weakness, computed by hand | Weighted votes (1 / distance), probabilities, an exact match |
| 6. Where it breaks | Limits, with real-data code and its output | Scaling (72% to 94% on the Wine data), cross-validated K, the curse of dimensionality, KNN vs K-Means |
| 7. Sandbox | Everything open: datasets, settings, the student's own points | Four patterns, three metrics, both votes, add points |
| 8. Coding exercise | Fill in the blanks of a from-scratch version; checked on its results | `knn_predict` in NumPy: distances, the K nearest, the vote |
| 9. Quiz | Five or six items, most needing a calculation | Votes, weights, K = 1, scaling, KNN vs K-Means |
| 10. Interview playbook and cards | The main question as a timed answer, then about ten asked questions with model answers | "Explain KNN in detail" and ten cards, including "why KNN and not Random Forest" |
| 11. Summary | Six takeaways and three things to remember | |

Three rules the product owner added on 2026-11-20, after reading the linear regression unit:

- **Say what the thing is before any jargon.** The subtitle, the four objectives and the hook are
  written for someone who has not met the algorithm. The hook defines it in one paragraph, then an
  everyday analogy with an "Everyday ↔ In this topic" table. The subtopic summary in the taxonomy is
  plain too, because it sits above the lesson.
- **The picture belongs to the example.** A hook's animation must show the unit's own data. Linear
  regression uses `line-of-best-fit`, built from the same six seniors, not a stock scatter plot.
- **Model answers are spoken, not written.** Each interview card gives the direct answer, then how it
  works, then a number from this unit, then the caveat, in the words a candidate would use.

Rules that hold for every unit:

- **Every number is computed, never typed.** The lab's maths is tested against scikit-learn (KNN: about
  20,000 predictions), and each story step is checked in the exact state it describes.
- **Accurate before pretty.** Where the reference page is loose (for example on how scikit-learn breaks
  ties), the unit follows scikit-learn's real behaviour.
- **No interview data in student text.** The asked questions choose the content; they are never quoted.
- **Two independent reviews before publishing**: one for technical accuracy, one for interview depth.

The lab is one reusable widget per algorithm (`knn-lab` is the first). The words of each step live in
the lesson, so the AI writer can draft later units to this pattern; its prompts already describe the lab.

## 4. How a unit is built

1. Read the asked interview questions for the algorithm and the master sheet's sessions.
2. Build or extend the lab's maths and test it against scikit-learn.
3. Write the unit to the pattern; verify every number and run every snippet.
4. Gate: schema, sentence length, time budget, narration scripts.
5. Two independent reviewers; apply their fixes; re-verify.
6. Publish; the unit turns from "Coming soon" to live.

## 5. Platform changes for V1

- **Responsive lesson player, slide decks and labs**, checked from a 390 px phone to a short laptop window.
- **Read-aloud off for students** behind one switch; the admin preview still plays the scripts.
- **No output before Run** for runnable code.
- **The KNN lab** (`knn-lab`) and its phone layout.
- **V1 curriculum published** (11 units) for both ML Engineer packages, and everything outside V1 archived.
- **The lesson preview panel can be hidden** (Admin → Lessons → Preview), so a reviewer sees a step
  at the width a student sees.
- **Guided labs share one shell** (`sections/lab-kit.tsx`): the story card's buttons never move
  between steps, and the layout follows the width the lab has, not the window's.

## 6. Going live

The review asked for a real website with a staging copy and a production copy. The platform has three
parts to host: the student app, the admin app and the API with its PostgreSQL database.

- **Recommended:** both web apps on Vercel (a staging project and a production project); the API on a
  small always-on host; PostgreSQL as a managed database, one for staging and one for production.
- **Order:** staging first, teammates walk the KNN unit and leave ratings and notes (the 11-star rating
  and review notes already reach Admin → Feedback), fixes, then production for the students.
- **Needed from the team:** which accounts to use for hosting and the database, the web address, and
  who may deploy. Nothing is deployed until that is decided.

## 7. Proposed timeline (to be confirmed by the product owner)

| When | What |
|---|---|
| Fri 20 Nov | KNN published; platform fixes in; V1 roadmap live for students; linear regression in review |
| Week of 23 Nov | Linear regression, logistic regression, decision trees; teammates' feedback on KNN applied |
| Week of 30 Nov | Random forest, boosting, K-Means |
| Week of 7 Dec | Naive Bayes, SVM, hierarchical clustering and DBSCAN, PCA |
| After that | Phase B (metrics, bias and variance, regularisation, gradient descent, tuning), then deep learning |

About three units a week is realistic at this depth, because each needs its own lab.

## 8. Open decisions

1. Approve publishing the V1 curriculum (switches student roadmaps to Classical ML only).
2. Hosting accounts for staging and production.
3. Whether a natural voice should be evaluated for a later release.
4. The order of units after KNN, if the team prefers the master sheet's order to "most asked first".
