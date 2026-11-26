/**
 * Moving pictures a lesson can show: small looping animations drawn by the platform (vetted SVG,
 * themeable, still when the student prefers reduced motion). Content picks one by name and never
 * ships drawing code. Each description says what the animation shows: it guides authors and the
 * AI writer, and it is what screen readers announce.
 */
export const ANIMATIONS = {
  // Python
  'name-tags':
    'Variables are name tags: a and b point at the same list, so b.append(4) changes what a shows too.',
  'list-vs-tuple':
    'A list (a shopping cart) takes a new item; a tuple (a map pin) is locked and refuses a change with a TypeError.',
  'set-dedupe':
    'Hashtags drop into a set one by one; the repeats bounce off, so only unique ones stay.',
  'dict-lookup':
    'A contacts dict: the key "Ravi" finds its row and returns the number in one step.',
  'function-machine':
    'A function as a machine: 3 goes into square(x) and 9 comes out, then 5 goes in and 25 comes out.',
  'decorator-wrap':
    "A decorator wraps a function like gift paper: each call runs the wrapper's before step, the function, then the after step.",
  'comprehension-filter':
    'A list comprehension: numbers 1 to 6 pass a filter that keeps the even ones, which are squared into [4, 16, 36].',
  'generator-belt':
    'A list builds every item at once and fills memory; a generator hands out one item per next() on a conveyor belt and uses little memory.',
  'try-except-net':
    'Code runs step by step; when a step raises an error, except catches it like a net, and finally runs either way.',
  'async-waiter':
    'Three 1-second waits: one after another they take 3 seconds; with async the waits overlap and take about 1 second.',
  'gil-baton':
    'Two threads share one key, the GIL: only the thread holding it runs Python, so CPU work takes turns.',
  // Python: object-oriented programming
  'class-blueprint':
    'One class, Restaurant, works as a blueprint: three objects come out of it, each with its own name and rating and the same accept_order() method.',
  'self-binding':
    'One describe(self) method and two objects: r1.describe() points self at r1 and returns "Dosa Corner, rated 4.5"; r2.describe() points it at r2.',
  'inheritance-tree':
    'Bike and Car inherit start() and fare() from Vehicle; Car then overrides fare() with its own version.',
  'polymorphism-pay':
    'One call, p.pay(500), goes to UPI, card and cash-on-delivery objects, and each one pays in its own way.',
  'encapsulation-wallet':
    'A wallet balance changes only through methods: spend(200) is checked and saved (₹500 to ₹300), while spend(1000) is refused for lack of balance.',
  'abstraction-panel':
    "A model's inner workings (gradients, matrix maths, the loss loop) slide behind a panel that shows only fit() and predict().",
  'class-vs-instance':
    'A class attribute, User.total_users, is one shared counter that goes up as each object is made; every object keeps its own name.',
  // Interviews and HR
  'intro-trailer':
    'A self-introduction as a movie trailer: four quick frames (who you are, skills, best project, why this role) in about a minute.',
  'star-timeline':
    'A STAR answer on a timeline: a short Situation and Task, the longest part on your Action, then a Result with a number.',
  'ctc-split':
    'CTC is the full yearly cost to the company: the bar splits into in-hand pay, PF, and tax and other deductions.',
  // Machine learning
  'scatter-line':
    'Points of flat size against rent, and a straight line that tilts into place through them.',
  residuals:
    'Red gaps grow between each point and the fitted line: each gap is a residual, the real value minus the prediction.',
  'loss-bowl':
    'A ball rolls down a bowl-shaped loss curve in smaller and smaller steps until it rests at the lowest point.',
  'learning-rate':
    'Three learning rates on the same loss curve: too small creeps, just right settles, too big bounces around.',
  'train-test-split':
    'Ten data blocks split apart: eight train the model and two are held back to test it.',
  'overfit-underfit':
    'Three fits of the same points: a flat line underfits, a smooth curve fits well and a zigzag overfits.',
  'labels-vs-no-labels':
    'Labelled points already have their colours; unlabelled points start grey and the model finds the groups.',
  'decision-boundary': 'Two classes of points, and a boundary line that draws itself between them.',
  clusters:
    'Grey points take their group colours as three centres slide to the middle of each group.',
  neuron:
    'Inputs flow along weighted lines into one neuron, which adds them with a bias and passes the sum through an activation.',
  network: 'Signals pulse from the input layer through a hidden layer to the output layer.',
  'activation-curves':
    'Sigmoid (0 to 1), tanh (−1 to 1) and ReLU (0 for negatives, then a straight line) draw themselves on the same axes.',
  // Deep learning
  'forward-backward':
    'A small network makes a guess (values flow forward), the loss measures the error, and gradients flow back to every weight before the update.',
  'optimizer-paths':
    'Three paths down the same narrow valley: SGD zig-zags, momentum is smoother and Adam heads more directly to the lowest loss.',
  'dropout-net':
    'At each training step a different random set of hidden neurons is switched off; at test time every neuron is on.',
  'early-stopping':
    'Training loss keeps falling while validation loss falls, then rises; training stops at the lowest validation loss, before overfitting.',
  'batch-norm':
    'A batch of layer outputs (mean 8.4, spread 2.1) is shifted and scaled to mean 0 and spread 1, before a learned scale and shift.',
  'vanishing-gradient':
    'Gradient bars flowing back through six layers: with sigmoid they shrink to almost nothing by layer 1; with ReLU and good initialisation they stay strong.',
  'conv-filter':
    'A 3 × 3 vertical-edge filter slides over a 5 × 5 image, multiplying and adding at each position to fill a 3 × 3 feature map of 0, 3, 3 rows.',
  'max-pool':
    'Max pooling turns a 4 × 4 feature map into 2 × 2 by keeping the largest value in each 2 × 2 block: 6, 2, 3 and 9.',
  'cnn-pipeline':
    'An image passes through convolution and pooling layers (maps get smaller but more numerous), is flattened, and dense layers score each digit: "7" gets 0.91.',
  'feature-hierarchy':
    'Layer 1 finds edges, layer 2 combines them into shapes, and layer 3 combines shapes into an object such as a car.',
  'transfer-learning':
    'Five pretrained blocks are frozen while a new head learns your classes; then the last block is unfrozen and fine-tuned with a small learning rate.',
  'iou-boxes':
    'A predicted box overlaps the true box: IoU = overlap / union is 0.35 (a miss below 0.5), then 0.75 (a hit) when the box moves closer.',
  'nms-boxes':
    "Non-maximum suppression keeps the highest-scoring box (0.92), drops boxes that overlap it by more than 0.5 IoU, and keeps a separate object's 0.88 box.",
  // NLP: text preprocessing and representation
  'review-sorter':
    'Three food-app reviews are cleaned into words, turned into rows of word counts, and a model sorts them: two complaints and one praise.',
  'token-pipeline':
    'The review "Delivery was LATE, but the biryani was amazing!!" is lowercased and split into eight words; the stop words drop out, leaving delivery, late, biryani and amazing.',
  'stem-vs-lemma':
    'Stemming cuts endings by rule (studies to studi, better stays better, running to run); lemmatization looks words up with their part of speech (studies to study, better to good, running to run).',
  'bag-of-words':
    'Three reviews become rows of counts over the vocabulary delivery, food, great and late: "late food late" gets a 2 under late.',
  'tfidf-weights':
    'In one review "food" appears twice, "late" and "refund" once. Weighted by IDF (food is in 950 of 1,000 reviews, refund in 20), the rare word "refund" scores highest: 3.91.',
  'embedding-space':
    'Words drift into place on a map: dosa, idli and biryani group together, cricket and football elsewhere. Cosine similarity is 0.99 for dosa and idli, 0.30 for dosa and cricket.',
  'word-analogy':
    'The step from "man" to "woman" matches the step from "king" to "queen", so king − man + woman lands nearest to queen (leaving out the three input words).',
  // NLP: sequence models, attention and transformers
  'seq-vs-parallel':
    'An RNN reads "I like hot tea" one word per step, four steps in a row; a transformer reads all four at once, with every word linked to every other.',
  'rnn-unroll':
    'An RNN reads "the dosa was cold" one word at a time and passes its memory (the hidden state) along; by the fourth word, the first word\'s share of the memory has faded.',
  'lstm-gates':
    'An LSTM carries a cell state like a notebook: the forget gate erases the old subject "dosa", the input gate writes the new subject "idli", and the output gate reads it out.',
  'attention-weights':
    'In "The dosa was cold so I sent it back", the word "it" weighs every word, itself included (0.04); its strongest attention goes to "dosa" (0.58), then "cold" (0.12) and "sent" (0.10).',
  'qkv-lookup':
    'The query for "it" is compared with the keys "dosa", "cold" and "I" (scores 3, 1 and 0); softmax turns them into weights 0.84, 0.11 and 0.04, which mix the values: mostly "dosa".',
  'multi-head':
    'Two attention heads read the same sentence: one links "it" to "dosa" (what was sent back), the other links "sent" to "I" (who sent it); their outputs are joined.',
  'transformer-blocks':
    'An encoder reads "I like tea" all at once; the decoder writes the French "J\'aime le thé" one word at a time, using masked self-attention and cross-attention to the encoder.',
  'bert-vs-gpt':
    'BERT fills "[MASK]" in "The dosa was [MASK] so I sent it back" using the words on both sides; GPT sees only the words before and predicts the next word, "back".',
  'causal-mask':
    'A 4 × 4 attention grid for "I like hot tea": future words are masked, so "I" attends only to itself (1.0) and "tea" spreads over all four words (0.08, 0.13, 0.21, 0.58).',
  // LLMs: how they work
  'next-token-loop':
    'An LLM reads "Plan a 3-day Goa trip.", scores possible next tokens, picks the likeliest ("Day", then "1:", then "North"), appends it and predicts again.',
  'tokenizer-split':
    'A tokenizer cuts "unbelievable biryani" into pieces it knows (un, believ, able, bir, yani) and turns each piece into a number, its token ID.',
  'context-window':
    'Chat messages fill a 70-token chat budget; to fit the travel plan and a new question, the two oldest messages ("I am Asha" and the greeting) fall out, so the model forgets her name.',
  'llm-training-stages':
    'Asked "Capital of India?", a pre-trained base model only continues the list; after instruction tuning it answers "New Delhi."; after preference tuning it answers the way people preferred, in a full sentence.',
  'genai-types':
    'A discriminative model sorts a review into "spam" or "not spam"; a generative model turns one prompt into new text, an image, audio or code.',
  'bpe-merges':
    'Byte-pair encoding builds tokens by merging the most frequent pair: "lowest" goes from single letters to l+o, then lo+w, then e+s, ending as low, es, t.',
  // LLMs: prompting, sampling and hallucinations
  'prompt-anatomy':
    'A prompt is built from four parts (role: support agent, task: reply to a late order, context: 40 minutes late, format: two short sentences); the LLM then writes a short, fitting apology.',
  'few-shot-pattern':
    'Two solved examples ("Food arrived cold" is a complaint, "Loved the quick delivery" is praise) come before the new input "Rider was rude", and the model answers "complaint" in the same format.',
  'chain-of-thought':
    'For "Bill ₹240, coupon ₹60, 3 friends", answering directly gives the wrong ₹80; thinking step by step (240 − 60 = 180, then 180 ÷ 3) gives the right ₹60.',
  'temperature-dial':
    'The same next-word scores at three temperatures: at 0.2 "hot" gets 0.99, at 1 it gets 0.61, and at 2 only 0.43, with cold, sweet and tough sharing the rest.',
  'top-p-nucleus':
    'With top-p 0.9, words are added from the likeliest down (hot 0.61, sweet 0.22, cold 0.14) until the running total passes 0.9 at 0.97; "tough" (0.03) is cut and never sampled.',
  'hallucination-grounding':
    'Asked for the refund window, the model alone invents "30 days"; with the policy text "refund in 7 days" placed in the prompt, it answers "7 days", read from the policy.',
  'guardrails-pipeline':
    'Messages pass an input check, the LLM and an output check: a normal question is answered, an "ignore your rules" message is blocked at the input check, and a reply containing a phone number is masked at the output check.',
  // LLMs: agents, tools and frameworks
  'agent-loop':
    'For the goal "Where is my order?", an agent goes round a loop of think, act and observe twice (get_order gives "out for delivery", get_eta gives "10 minutes"), then answers "Out for delivery, 10 minutes away."',
  'tool-call-roundtrip':
    'The user asks "Where is order 42?"; the LLM replies with a request, get_order(order_id=42); the app runs the function and returns "out for delivery"; the LLM then answers the user.',
  'chain-vs-graph':
    'A chain runs one fixed path (prompt, model, parser, output). A graph has nodes and shared state: "write" runs, a check sends it round again until tries reaches 2, then it ends with the draft "Hi!!".',
  'mcp-hub':
    'Without a standard, three AI apps and three tools need nine custom connections; with MCP in the middle, each app and each tool connects once, three plus three.',
  'multi-agent-orchestrator':
    'An orchestrator agent splits "Plan a 3-day Goa trip under ₹15,000" among a flights agent, a hotels agent and a budget agent, each with its own tool, then combines their results.',
  // Python: the coding round
  'coding-round-steps':
    'Four steps for a coding question light up in turn: restate the problem, try a small example, write the code while explaining it, and test edge cases such as an empty string.',
  'two-pointer-palindrome':
    'Two pointers start at the ends of "level": l matches l, e matches e, and the pointers meet at v, so the word is a palindrome.',
  'char-frequency-count':
    'Each letter of "hello" drops into a dictionary of counts: h 1, e 1, l 1 and then l 2, o 1, using counts.get(ch, 0) + 1.',
  'second-largest-scan':
    'One pass over 4, 9, 2, 9, 7 keeps two values: the largest becomes 9 and the second moves from 4 to 7, while 2 and the repeated 9 are skipped.',
  'prime-divisor-check':
    'For 29, the divisors 2 to 5 all leave a remainder, so 29 is prime; for 91, the divisor 7 leaves remainder 0, so 91 is 7 times 13 and not prime.',
  'fibonacci-window':
    'A window of two numbers, a and b, slides along 0, 1, 1, 2, 3, 5, 8, 13: each step adds them to make the next number, ending with 5 + 8 = 13.',
  // Machine learning fundamentals
  'ai-ml-dl-circles':
    'Three nested areas appear: artificial intelligence (any system that acts intelligently, even with hand-written rules), machine learning inside it (learns from data, like a spam filter) and deep learning inside that (many-layer networks, like face unlock).',
  'rl-loop':
    'An agent acts on an environment and gets back a reward and a new state, again and again; over three episodes its total score rises from 2 to 5 to 9 as it learns which actions pay off.',
  'ml-lifecycle':
    'Six stages light up in a loop for a delivery-time model: frame the problem, gather data, train, evaluate on held-out orders, deploy as an API and monitor; when errors creep up, it goes back to the data and retrains.',
  'bias-variance-darts':
    'Three dartboards fill with throws: high bias lands in a tight group away from the centre, high variance scatters all around it, and a good model lands in a tight group on the centre.',
  'kfold-rotation':
    'Five rounds of 5-fold cross-validation: each round a different fold validates while the other four train, and the five scores (0.82, 0.79, 0.85, 0.80, 0.84) average to 0.82.',
  'l1-l2-shrink':
    'Five feature weights (3.0, −2.0, 0.6, −0.4, 0.3) under two penalties: L2 shrinks every one a little; L1 pulls each towards zero by the same amount, so the two smallest become exactly 0.',
  // Python: data structures and algorithms
  'big-o-growth':
    'A table fills in as n grows from 10 to 100 to 1,000: O(1) stays at 1 step, O(log n) reaches about 10, O(n) 1,000, O(n log n) about 10,000 and O(n²) a million.',
  'two-sum-hashmap':
    'One pass over [3, 2, 7, 11] for target 9: each number asks the dict for its partner (9 minus itself); 3 and 2 are stored, then 7 finds 2 at index 1, so the answer is [1, 2].',
  'container-water':
    'Bars 1, 8, 6, 2, 5, 4, 8, 3, 7 with a pointer at each end: the water between them is the width times the shorter bar; the shorter side moves inward, and the best area is 7 × 7 = 49.',
  'binary-search-halving':
    'Searching a sorted row of 15 numbers for 66: each check looks at the middle and drops half the row (44, then 71, then 59), and 66 is found on the 4th check.',
  'fixed-window-sum':
    'A window of 3 slides along 4, 2, 7, 1, 5, 3: each move adds the new number and drops the oldest (13, then 13 + 1 − 4 = 10, then 13, then 9), so the best window sum is 13.',
  'sliding-window-unique':
    'A window slides over "abcabcbb": it grows to "abc" (length 3); when a letter repeats, the left edge jumps past the old copy, so the window never holds a repeat and the best length stays 3.',
  'bracket-stack':
    'Reading "([{}])": each opening bracket is pushed on a stack; each closing bracket must match the top one and pops it; the stack ends empty, so the brackets are balanced.',
  'recursion-call-stack':
    'factorial(3) waits for factorial(2), which waits for factorial(1); the base case returns 1, and each answer goes back to the call that waited: 1, then 2, then 6.',
  // Data preparation
  'missing-fill':
    'A salary column (in thousands) has two gaps among 30, 32, 35 and 250. Filling them with the mean gives 86.8, pulled up by the one 250; the median gives 33.5, a typical salary.',
  'iqr-fences':
    'Delivery times on a number line: the box runs from Q1 = 28.75 to Q3 = 38.5, so IQR = 9.75. The fences sit 1.5 IQR outside the box, at 14.1 and 53.1, and the 95 and 160 minute deliveries fall outside and turn red.',
  'dedupe-rows':
    'An orders table: drop_duplicates() removes the exact repeat of order 101; drop_duplicates(subset="order_id") then removes the second row for order 102, keeping the first. Five rows become three.',
  'one-hot-vs-label':
    'A city column of Delhi, Mumbai, Chennai and Delhi. Label encoding gives Chennai 0, Delhi 1, Mumbai 2, which wrongly says Mumbai is "more" than Delhi. One-hot encoding gives three 0/1 columns instead, one per city.',
  'scaling-squash':
    'Age (22 to 58) and monthly income (30,000 to 95,000) on one axis: the age range is a sliver. Min-max scaling maps both to 0 to 1, and a customer aged 26 earning 52,000 becomes (0.11, 0.34).',
  'fit-on-train':
    'Wrong: the scaler learns its mean and spread from all the rows, so the test rows leak in. Right: split first, fit the scaler on the training rows only, then transform both. A pipeline does this in every fold.',
  'loc-vs-iloc':
    'A table whose row labels are 10, 20, 30 and 40. df.loc[20] finds the row labelled 20; df.iloc[2] finds the third row, labelled 30. df.loc[10:30] includes 30; df.iloc[0:2] stops before position 2.',
  'groupby-split-apply':
    'Orders for customers A, B and C are split into groups, each group sums its amounts, and the results combine into one table: A 750, B 300, C 520. That is df.groupby("customer")["amount"].sum().',
  'merge-joins':
    'Customers 1, 2 and 3 and orders for customers 1, 1, 2 and 4. An inner merge keeps the 3 matching rows; a left merge keeps every customer, so Meera appears with no order (4 rows); an outer merge also keeps the order from unknown customer 4 (5 rows).',
  // Statistics
  'same-mean-spread':
    'Two delivery apps both average 30 minutes. App A always takes 28 to 32 minutes (standard deviation 1.4); App B swings from 10 to 50 (standard deviation 15.1). Same mean, very different spread.',
  'mean-median-skew':
    'Salaries pile up between 28 and 41 thousand, with one at 250. The median stays at 33, while the mean is pulled right to 57.1 by the one large value.',
  'normal-68-95':
    'Exam scores with mean 70 and standard deviation 10 form a bell curve: about 68% fall between 60 and 80, 95% between 50 and 90, and 99.7% between 40 and 100.',
  'correlation-scatter':
    'Three scatter plots: study hours and marks rise together (r ≈ 0.9), shoe size and marks show no pattern (r near 0), screen time and sleep fall together (r ≈ −0.8). Correlation is not causation.',
  'pvalue-tail':
    'If two models were equally good, the new one would win about 50 of 100 comparisons. It wins 60. Results at least that far from 50, on both sides, have a total chance of 0.057: the p-value. That is above 0.05, so the win is not significant.',
  // Classical ML: linear regression
  'line-of-best-fit':
    'Six employees plotted by years of experience and salary in LPA: 1 and 6, 2 and 6, 3 and 9, 4 and 11, 5 and 12, 6 and 16. A straight line tilts into place through them, ŷ = 2x + 3, and reading it at 7 years predicts 17 LPA.',
  'regression-plane':
    'Six employees drawn in three dimensions: years of experience and projects shipped along the floor, salary upwards. With two features the fitted model is a flat, tilted plane instead of a line, ŷ = 3.35 + 1.625 × years + 0.525 × projects, and each employee sits a little above or below it.',
  'polynomial-degrees':
    'The same sixteen points fitted three times. A degree 1 line misses the bend and scores 0.87 on held-back points. A degree 2 curve follows the shape and scores 0.96. A degree 7 curve passes through every training point, swings wildly between them, and scores far below zero on the held-back points.',
  'bias-variance-curve':
    'Error against polynomial degree, from 1 to 7. Training error falls all the way to zero. Error on held-back points falls until degree 3, then climbs steeply. Low degrees underfit, which is high bias; high degrees overfit, which is high variance; the best model sits at the bottom of the held-back curve.',
  // Classical ML: logistic regression
  'line-vs-sigmoid':
    'Ten students at 0 (did not clear) or 1 (cleared), by hours of practice. A straight line fitted to them drops below 0 on the left and climbs above 1 on the right, to 1.48 at 14 hours, which no probability can be. The S-shaped sigmoid curve replaces it and stays between 0 and 1 everywhere, crossing 0.5 at 5.5 hours.',
  'log-loss-curve':
    'The log loss for a row whose true label is 1, as the predicted probability goes from 0 to 1. At 0.9 the loss is 0.105, at 0.5 it is 0.693, and at 0.1 it is 2.303. The curve rises without limit as the probability nears 0: a confident wrong answer costs the most.',
  'threshold-tradeoff':
    'The ten students lined up by predicted probability, from 0.045 to 0.955. A threshold slides from 0.3 to 0.5 to 0.7. At 0.3 there are 2 false alarms and 1 miss; at 0.5 there is 1 of each; at 0.7 there is 1 false alarm and 2 misses. A lower threshold catches more positives and raises more false alarms.',
  // NumPy: arrays and vectorization
  'list-vs-array':
    'A Python list holds pointers to four separate number objects scattered around memory; a NumPy array stores the same numbers (12, 7, 30, 5) side by side in one block, all of one type (int64), so maths can sweep through them in one pass.',
  'vectorized-vs-loop':
    "Adding 18% GST to five orders: a Python loop handles one amount per step, five steps in a row; NumPy's prices * 1.18 handles all five in one step, turning 100, 250, 400, 80 and 120 into 118, 295, 472, 94.4 and 141.6.",
  'array-axes':
    'A 1-D array of 4 numbers has shape (4,). A 2-D array of 3 rows and 4 columns has shape (3, 4): axis 0 runs down the rows and axis 1 across the columns. A colour photo adds a third axis for red, green and blue: (height, width, 3).',
  'slice-2d':
    'In a 4 × 5 grid holding 0 to 19, a[1] picks the second row (5 to 9), a[:, 2] picks the third column (2, 7, 12, 17) and a[1:3, 1:4] picks a 2 × 3 block (6, 7, 8 and 11, 12, 13).',
  'boolean-mask':
    'Daily temperatures 31, 36, 29, 38 and 35: temps > 35 gives False, True, False, True, False, and temps[temps > 35] keeps only 36 and 38. 35 is not above 35, so it is left out.',
  'view-vs-copy':
    'a holds 10, 20, 30, 40. b = a[1:3] is a view of the same memory, so b[0] = 99 changes a to 10, 99, 30, 40. c = a[a > 15] is a copy, so c[0] = 0 leaves a unchanged.',
  // NumPy: broadcasting and array operations
  'axis-collapse':
    'Sales of 3 stores over 4 days. sum(axis=0) collapses the rows into one total per day (40, 39, 41, 46); sum(axis=1) collapses the columns into one total per store (50, 31, 85).',
  'broadcast-stretch':
    'A column of three prices (100, 200, 300), shape (3, 1), times a row of four discount factors (1, 0.9, 0.8, 0.5), shape (1, 4): both are stretched to 3 × 4 without copying, giving every price at every discount, from 100, 90, 80, 50 to 300, 270, 240, 150.',
  'broadcast-rules':
    'Shapes are compared from the right. (4, 3) with (3,): 3 matches 3 and the missing axis counts as 1, so the result is (4, 3). (4, 3) with (4,): 3 and 4 differ and neither is 1, so NumPy raises an error; reshaping to (4, 1) fixes it.',
  'reshape-flow':
    'The twelve numbers 0 to 11, shape (12,), refill a grid row by row: reshape(3, 4) gives 3 rows of 4 and reshape(4, 3) gives 4 rows of 3. The order never changes and the sizes must multiply to 12; with -1, NumPy works out one size, so reshape(2, -1) gives (2, 6).',
  // NumPy: linear algebra
  'dot-product-steps':
    'A final grade as a dot product: marks 80, 90 and 70 times weights 0.5, 0.3 and 0.2 give 40, 27 and 14, which add up to 81.',
  'dot-angle':
    'Vector a stays fixed (length 4) while b (length 2) turns: at 0 degrees a · b is 8 and the cosine 1; at 60 degrees, 4 and 0.5; at 90 degrees, 0 and 0; pointing the opposite way, −8 and −1.',
  'l1-vs-l2-norm':
    'On a city grid from (0, 0) to (3, 4): the straight line is 5 blocks long, the L2 norm; walking along the streets takes 3 + 4 = 7 blocks, the L1 norm.',
  'matmul-row-col':
    "Marks of two students (2 × 3) times two weighting schemes (3 × 2): each result cell is one row times one column. Asha's 80, 90, 70 times scheme 1 (0.5, 0.3, 0.2) gives 81. The inner sizes match (3 and 3), so the result is 2 × 2: 81 and 78 for Asha, 71.5 and 82 for Ravi.",
  'batch-similarity':
    'Two queries, shape (2, 3), are scored against four documents, shape (4, 3), in one step: Q @ D.T has shape (2, 4). Row 1 holds 0.8, 0.6, 0.96, 0.36 and row 2 holds 0, 0, 0, 0.8; the best document lights up in each row: document 3 for query 1 and document 4 for query 2.',
} as const;

export type AnimationName = keyof typeof ANIMATIONS;
export const ANIMATION_NAMES = Object.keys(ANIMATIONS) as [AnimationName, ...AnimationName[]];
