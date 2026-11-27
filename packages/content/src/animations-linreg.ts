/**
 * Moving pictures for the linear regression unit: name → what the picture shows (it guides authors and is
 * what screen readers announce). Drawn in @app/learning-ui (src/anim/linreg.tsx).
 */
export const LINREG_ANIMATIONS = {
  'mse-rmse-mae':
    'The six employees and the line ŷ = 2x + 3, each residual drawn as a square: four squares of 1 and two of 0. MSE is 0.67, RMSE 0.82 LPA and MAE 0.67 LPA. Then one more employee, 7 years on 4 LPA, sits 13 below the line, a square of 169: MSE jumps 37 times to 24.7, RMSE 6.1 times to 4.97, and MAE only 3.6 times to 2.43.',
  'r-squared-gaps':
    'The six employees with a flat line at the mean salary, 10. Their gaps to it, squared, are 16, 16, 1, 1, 4 and 36: SST = 74. The line then tilts onto ŷ = 2x + 3, and the gaps it leaves, squared, are 1, 1, 0, 0, 1 and 1: SSE = 4, a sliver of the first bar. R² = 1 − 4 / 74 = 0.946.',
  'coefficient-held-fixed':
    'Three predictions from ŷ = 3.35 + 1.625 × years + 0.525 × projects, each a bar made of the intercept, the years part and the projects part. 4 years and 3 projects give 11.425. With projects held at 3, a fifth year lengthens only the years part: 13.05, exactly 1.625 more. With years held at 4, a fourth project gives 11.95, exactly 0.525 more.',
  'adjusted-r2-penalty':
    'Two models on the six employees. Adding projects lifts R² from 0.946 to 0.953, but adjusted R² falls from 0.932 to 0.922. The reason: the share left unexplained, 1 − R², is charged (n − 1) / (n − p − 1) times. With one feature, 0.054 × 5/4 = 0.068; with two, 0.047 × 5/3 = 0.078, so the charge grew more than the leftover shrank.',
  'collinear-weights':
    'Years of experience alone gets a weight of 2. Add months of experience, about 12 times years, and the weight on years swings to −8.75 while months gets 0.9. The six predictions barely move: 5, 7, 9, 11, 13 and 15 become 5.36, 6.58, 9.24, 10.46, 13.21 and 15.15, none by more than 0.54.',
  'polynomial-columns':
    'One feature x becomes three columns. Over x = 1 to 4, x runs from 1 to 4, x² climbs to 16 and x³ to 64. Least squares on those three columns, fitted to the lab’s sixteen points, draws a curve: ŷ = 2.82 + 1.03x − 0.08x² + 0.05x³.',
  'degree-cross-validation':
    'The lab’s sixteen points in two alternating halves. Round 1 fits each degree on one half and scores it on the other; round 2 swaps them. Held-back R² for degrees 1, 2, 3, 5 and 7 is 0.869, 0.957, 0.964, 0.910 and −7.37 in round 1, and 0.796, 0.925, 0.930, 0.906 and −6.48 in round 2. The means are 0.833, 0.941, 0.947, 0.908 and −6.92, so degree 3 is kept.',
  'dummy-columns':
    'A city column with Chennai, Hyderabad and Pune becomes two 0/1 columns, Hyderabad and Pune: Chennai is (0, 0), Hyderabad (1, 0) and Pune (0, 1). A third column for Chennai would make every row add up to 1, exactly like the intercept’s column of ones, so Chennai is left out and each weight becomes the gap from Chennai.',
  'residual-patterns':
    'Three residual plots, residuals against x. The six employees scatter evenly around zero, within 1 LPA: a line suits them. The lab’s curved data leaves a U, positive at both ends and negative in the middle: add a squared term. The lab’s growing-spread data fans out from small residuals on the left to large ones on the right: try a log on y.',
} as const;
