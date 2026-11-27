/**
 * Moving pictures for the logistic regression unit: name → what the picture shows (it guides authors and is
 * what screen readers announce). Drawn in @app/learning-ui (src/anim/logreg.tsx).
 */
export const LOGREG_ANIMATIONS = {
  'logreg-score-to-p':
    'The student with 8 hours: the score z = 0.6767 × 8 − 3.7219 = 1.692 is found on the sigmoid curve and read across as p = 0.844, an 84% chance of clearing.',
  'logreg-odds-scales':
    'Three aligned scales for the probabilities 0.2, 0.5, 0.8 and 0.9: odds 0.25, 1, 4 and 9, and log-odds −1.386, 0, 1.386 and 2.197. Probability 0.5 is odds 1 and log-odds 0, and 0.2 and 0.8 mirror each other.',
  'logreg-squared-vs-log':
    'For a row whose true label is 1, squared error (1 − p)² never passes 1 while log loss −ln p climbs as p falls. At p = 0.01 they cost 0.98 and 4.6.',
  'logreg-likelihood-bars':
    "Bars for the probability the model gave each of the ten students' real outcome. Multiplied, they give a likelihood of 0.0131; −ln turns them into losses that total 4.335, a mean log loss of 0.4335.",
  'logreg-gradient-pushes':
    'At w = 0 and b = 0 every student gets p = 0.5, so each error p − y is +0.5 or −0.5 and they cancel. Scaled by hours they average −0.95, so one step at a rate of 0.1 raises w to 0.095.',
  'logreg-confusion-drop':
    'The ten students, sorted by predicted probability, drop into the four boxes at a threshold of 0.5: 4 true positives, 1 false negative at 4 hours, 1 false positive at 7 hours and 4 true negatives.',
  'logreg-metric-boxes':
    'The confusion matrix 4, 1, 1, 4 with what each metric divides by: accuracy the whole table (8 / 10), precision the predicted-cleared column (4 / 5), recall the actually-cleared row (4 / 5).',
  'logreg-precision-recall':
    'Precision and recall of the ten students at every threshold: as it rises, recall falls from 1 to 0.2 and precision climbs towards 1. At 0.3 they are 0.67 and 0.80, at 0.5 both 0.80, at 0.7 0.75 and 0.60.',
  'logreg-imbalance-grid':
    'A grid of 100 transactions with 1 fraud. A model that always says "not fraud" is right on 99 and misses the fraud: accuracy 99%, recall 0 / 1 = 0.',
  'logreg-roc-pairs':
    'The ROC curve of the ten students climbs one step per student as the threshold falls. Each square pairs a student who cleared with one who did not; 22 of the 25 pairs are ranked the right way, so the AUC is 0.88.',
  'logreg-boundary-point':
    'The ten students on the hours axis, with the score z on a ruler beneath it: z rises 0.6767 per hour and is 0 at 5.5 hours, the decision boundary. Left of it the model predicts 0, right of it 1. The students at 4 and 7 hours sit on the wrong side.',
  'logreg-ring-features':
    'Three point sets: two classes split by a straight line; a ring that no straight line can split; and the ring plotted with a new feature, x₁² + x₂², where a straight line splits it. That line is a circle back in x₁ and x₂.',
  'logreg-softmax':
    'Softmax for three classes with scores 1, 2 and 0: e to each score gives 2.72, 7.39 and 1, which sum to 11.11. Dividing gives probabilities 0.245, 0.665 and 0.090, which add to 1.',
} as const;
