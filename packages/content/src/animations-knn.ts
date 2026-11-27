/**
 * Moving pictures for the K-nearest neighbours unit: name → what the picture shows (it guides authors and is
 * what screen readers announce). Drawn in @app/learning-ui (src/anim/knn.tsx).
 */
export const KNN_ANIMATIONS = {
  'knn-lazy-fit':
    'The 13 films one user rated, on an action and comedy chart: circles were liked, squares skipped. Fitting only stores them and learns no weights. A new film at action 6, comedy 6 then measures its distance to all 13, keeps the 3 nearest (two liked, one skipped) and is predicted Liked, 2 votes to 1.',
  'knn-query-cost':
    "Two copies of the 13 films, with a new film at action 2, comedy 6. Brute force draws a line to every film, 13 of 13 checked, and finds the 3 nearest within a distance of 2. A KD-tree splits the chart at action 4.5, then at comedy 5.5 on the left and 3.5 on the right. The search checks the new film's region and the one below it, finds the same 3 nearest, and skips the 7 films past the split, which is 2.5 away: 6 of 13 checked.",
  'knn-missing-value':
    'The 13 films, and a new film with action 6 and no comedy score. Its distance to the film at (7, 6) is the square root of 1 plus (? − 6) squared, which cannot be worked out. The missing score decides the answer: at comedy 2 the 3 nearest films are all liked, so it is Liked; at comedy 8 two of them were skipped, so it is Skipped. Fill the gap before KNN.',
  'knn-similar-films':
    'The 13 films as plain grey dots, with no liked or skipped labels. A search circle grows around the film at action 7, comedy 6 until it holds three films: (8, 5) at 1.41, then (6, 4) and (5, 7) at 2.24. Those three are returned as the films most like it.',
} as const;
