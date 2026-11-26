/**
 * Self-Introduction & HR Round → Aptitude and logical reasoning (optional, 3–6 LPA only).
 *
 * Evidence (Hiring Intelligence, 72 ML/AI companies, Jan–Oct 2026): aptitude at 8 companies, all
 * hiring under 8 LPA; 22 of their 33 aptitude questions came in assessments and written tests.
 * Question types seen: number series (successive differences, cubes, alternating operations),
 * function iteration, task scheduling, syllogisms, reading a data table, time–speed–distance,
 * time and work, and a guesstimate ("estimate the number of new cars bought in India in a year",
 * at 4 companies). The quiz series are the real ones; the cards use fresh series so they don't
 * give the quiz away. Every answer was checked by hand, twice.
 *
 * Review v1 → v2 (independent reviewer, 2026-11-06): current SIAM range with its fleet caveat,
 * households not people, exact (not rough) train answer with mistake-based distractors, complete
 * puzzle statements, a fair checklist order, test rules before skipping, fresh card series.
 *
 * v3 (2026-11-09, user request): the pattern and puzzle cards became slide decks, with series
 * shown as sequence visuals, a Python gaps playground and every puzzle as a try-it (answers re-run).
 *
 * Audit (2026-11-18): an interview-questions card deck for the missing types (profit and loss,
 * seating, sprint ratios, a closed-list syllogism) and the guesstimate follow-ups.
 */
import type { LessonDocumentInput } from '@app/content';

const NUMERICAL = 'apt.numerical';
const LOGICAL = 'apt.logical';

const DIFF_GAPS = [
  { after: 0, label: '+2' },
  { after: 1, label: '+5' },
  { after: 2, label: '+10' },
  { after: 3, label: '+17' },
  { after: 4, label: '+26' },
];
const ALT_GAPS = [
  { after: 0, label: '+1' },
  { after: 1, label: '×3' },
  { after: 2, label: '+1' },
  { after: 3, label: '×3' },
  { after: 4, label: '+1' },
];

export const APTITUDE_REASONING_LESSON: LessonDocumentInput = {
  title: 'Aptitude and logical reasoning',
  subtitle: 'The number series, puzzles and guesstimates that ML assessments actually use.',
  objectives: [
    {
      key: 'series',
      text: 'Find the rule behind a number series using differences and operations',
      minDepthRank: 1,
    },
    {
      key: 'logic',
      text: 'Solve scheduling, function and syllogism puzzles step by step',
      minDepthRank: 1,
    },
    {
      key: 'estimate',
      text: 'Structure a guesstimate out loud, from assumptions to a sanity check',
      minDepthRank: 1,
    },
  ],
  sections: [
    {
      key: 'hook',
      kind: 'HOOK',
      title: 'Aptitude in online assessments',
      depthRank: 1,
      conceptKeys: [NUMERICAL, LOGICAL],
      body: {
        scenario:
          'The online assessment opens: **30 questions, 30 minutes.** Question 1 asks what comes next in **1, 3, 8, 18, 35, 61, ?** The timer is running, and you have never seen this exact series.',
        provocation: 'How do you crack a series you have never seen, in under a minute?',
        analogy: {
          text: "Think of a detective at a crime scene. They don't guess the culprit. They check the usual clues in a fixed order until one fits.",
          mapping: [
            { everyday: 'The usual clues', technical: 'Common series patterns' },
            { everyday: 'Checking clues in order', technical: 'Differences, then operations' },
            { everyday: 'Naming the culprit', technical: 'Finding the rule' },
            { everyday: 'Testing the story', technical: 'Checking the rule on every number' },
          ],
          whereItBreaks:
            'A detective has days. You have about a minute, so you check the most common patterns first and skip a question you cannot solve quickly.',
        },
        bridge:
          'Aptitude shows up mostly in online assessments and written tests for fresher roles. The good news: the same few patterns repeat, so a fixed checklist works.',
      },
    },
    {
      key: 'visual.differences',
      kind: 'VISUAL',
      title: 'Successive differences in a series',
      depthRank: 1,
      conceptKeys: [NUMERICAL],
      body: {
        scene: {
          type: 'array',
          label: 'What comes next?',
          cells: ['1', '3', '8', '18', '35', '61', '?'],
          frames: [
            {
              title: 'The series',
              narration:
                'Six numbers and a blank. No obvious multiplication, so start with the most common check: the **differences** between neighbours.',
              highlight: [0, 1, 2, 3, 4, 5],
            },
            {
              title: 'First differences',
              narration: 'The gaps are 2, 5, 10, 17 and 26. Not equal, but they keep growing.',
              gaps: DIFF_GAPS,
            },
            {
              title: 'Second differences',
              narration:
                'Now look at the gaps themselves: they grow by 3, 5, 7 and 9, the odd numbers. So the next gap grows by 11.',
              gaps: DIFF_GAPS,
              window: { from: 0, to: 5, label: '+3, +5, +7, +9 → next +11' },
            },
            {
              title: 'The answer',
              narration: 'The next gap is 26 + 11 = 37, so the answer is 61 + 37 = **98**.',
              values: ['1', '3', '8', '18', '35', '61', '98'],
              gaps: [...DIFF_GAPS, { after: 5, label: '+37' }],
              highlight: [6],
              tone: 'ok',
            },
          ],
        },
        caption:
          'When the first differences are not equal, take the differences of the differences.',
        altText:
          'The series 1, 3, 8, 18, 35, 61 and a blank. The gaps between neighbours are 2, 5, 10, 17 and 26. Those gaps grow by 3, 5, 7 and 9, so the next gap is 37 and the answer is 98.',
      },
    },
    {
      key: 'visual.alternating',
      kind: 'VISUAL',
      title: 'Alternating operations in a series',
      depthRank: 1,
      conceptKeys: [NUMERICAL],
      body: {
        scene: {
          type: 'array',
          label: 'What comes next?',
          cells: ['3', '4', '12', '13', '39', '40', '?'],
          frames: [
            {
              title: 'The series',
              narration:
                'The numbers barely move, then jump, again and again. Big jumps often mean **multiplication**, so check operations, not just differences.',
              highlight: [0, 1, 2, 3, 4, 5],
            },
            {
              title: 'Two operations take turns',
              narration: 'Add 1, multiply by 3, add 1, multiply by 3. Two rules alternate.',
              gaps: ALT_GAPS,
              highlight: [5],
            },
            {
              title: 'The answer',
              narration: 'The next step is "multiply by 3", so 40 × 3 = **120**.',
              values: ['3', '4', '12', '13', '39', '40', '120'],
              gaps: [...ALT_GAPS, { after: 5, label: '×3' }],
              highlight: [6],
              tone: 'ok',
            },
          ],
        },
        caption: 'Small steps and big jumps taking turns usually mean two operations.',
        altText:
          'The series 3, 4, 12, 13, 39, 40 and a blank. The steps alternate between adding 1 and multiplying by 3, so the next number is 40 times 3, which is 120.',
      },
    },
    {
      key: 'slides.patterns',
      kind: 'SLIDES',
      title: 'Five series patterns',
      depthRank: 1,
      conceptKeys: [NUMERICAL],
      body: {
        slides: [
          {
            kicker: 'Series toolkit',
            title: 'Check the patterns in this order',
            body: 'Most series use one of five patterns. Stop when a rule fits every number.',
            visual: {
              type: 'flow',
              steps: [
                { label: 'Equal gaps' },
                { label: 'Growing gaps' },
                { label: 'Squares or cubes' },
                { label: 'Two operations' },
                { label: 'Two series mixed' },
              ],
            },
          },
          {
            kicker: 'Pattern 1',
            title: 'Equal gaps',
            body: 'Each step adds the same number. Check this first; it takes five seconds.',
            visual: {
              type: 'sequence',
              terms: ['4', '9', '14', '19', '24'],
              ops: ['+5', '+5', '+5', '+5'],
              answer: true,
            },
          },
          {
            kicker: 'Pattern 2',
            title: 'Growing gaps',
            body: 'The gaps 1, 2, 3, 4 grow by 1 each time, so the next gap is 5. Gaps can also grow by 2, or double.',
            visual: {
              type: 'sequence',
              terms: ['1', '2', '4', '7', '11', '16'],
              ops: ['+1', '+2', '+3', '+4', '+5'],
              answer: true,
            },
          },
          {
            kicker: 'Pattern 3',
            title: 'Squares and cubes',
            body: 'Numbers close to 1, 4, 9, 16, 25 are often a square plus or minus a little.',
            points: ['Here each term is n² − 1: 1 − 1, 4 − 1, 9 − 1…', 'Next: 36 − 1 = **35**'],
            visual: {
              type: 'sequence',
              terms: ['0', '3', '8', '15', '24', '35'],
              answer: true,
            },
            note: 'Know squares up to 20 × 20 and cubes up to 10 × 10 × 10.',
          },
          {
            kicker: 'Pattern 4',
            title: 'Two operations take turns',
            body: 'Here +2 and ×3 take turns. Write the step between each pair, and the pattern shows.',
            visual: {
              type: 'sequence',
              terms: ['2', '4', '12', '14', '42', '44', '132'],
              ops: ['+2', '×3', '+2', '×3', '+2', '×3'],
              answer: true,
            },
          },
          {
            kicker: 'Pattern 5',
            title: 'Two series mixed together',
            body: 'Odd places go 2, 4, 6. Even places go 20, 17, 14. The next term is in an odd place, so it is **8**.',
            visual: {
              type: 'sequence',
              terms: ['2', '20', '4', '17', '6', '14', '8'],
              answer: true,
            },
          },
          {
            kicker: 'Python shortcut',
            title: 'Let Python find the gaps',
            body: 'In the test you work on paper, but the idea is the same.',
            try: {
              type: 'code',
              prompt: 'Run it to see the gaps. Then add code that prints the **gaps of the gaps**.',
              starter:
                's = [1, 3, 8, 18, 35, 61]\ngaps = [b - a for a, b in zip(s, s[1:])]\nprint("gaps:", gaps)\n\n# Your turn: print the gaps of the gaps\n',
              expected: '[3, 5, 7, 9]',
              hint: 'Copy the `gaps` line as `gaps2 = …`, use `gaps` where it says `s`, then `print(gaps2)`.',
            },
          },
          {
            kicker: 'Try it',
            title: 'Find the next number',
            try: {
              type: 'choice',
              prompt: 'What comes next: **2, 3, 5, 9, 17, ?**',
              options: [
                {
                  text: '25',
                  correct: false,
                  feedback: 'That adds 8 again. The gaps 1, 2, 4, 8 double each time.',
                },
                {
                  text: '33',
                  correct: true,
                  feedback: 'The gaps double, so the next gap is 16: 17 + 16 = 33.',
                },
                {
                  text: '34',
                  correct: false,
                  feedback: 'Doubling the last number fails earlier: 9 × 2 is 18, not 17.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'check.series',
      kind: 'KNOWLEDGE_CHECK',
      title: 'Number series practice',
      depthRank: 1,
      conceptKeys: [NUMERICAL],
      body: {
        items: [
          {
            key: 'cubes',
            type: 'mcq',
            prompt: 'What comes next: **2, 9, 28, 65, 126, ?**',
            options: [
              { id: 'a', text: '187' },
              { id: 'b', text: '215' },
              { id: 'c', text: '217' },
              { id: 'd', text: '216' },
            ],
            answer: { correct: ['c'] },
            explanation:
              'Each term is one more than a cube: 1³+1, 2³+1, 3³+1, 4³+1, 5³+1. The next is 6³ + 1 = 216 + 1 = 217. 216 forgets the +1, and 187 just repeats the last gap.',
          },
          {
            key: 'alternate',
            type: 'mcq',
            prompt: 'What comes next: **5, 7, 14, 16, 32, 34, ?**',
            options: [
              { id: 'a', text: '36' },
              { id: 'b', text: '64' },
              { id: 'c', text: '68' },
              { id: 'd', text: '70' },
            ],
            answer: { correct: ['c'] },
            explanation:
              'The steps alternate: +2, ×2, +2, ×2, +2. The next step is ×2, so 34 × 2 = 68. Picking 36 means you only saw the +2 steps.',
          },
          {
            key: 'checklist',
            type: 'order_steps',
            prompt: 'Put your series checklist in order, from the quickest check to the last.',
            steps: [
              { id: 'diff', text: 'Check the differences between neighbours' },
              { id: 'second', text: 'If they change, check the differences of the differences' },
              {
                id: 'ops',
                text: 'Check multiplication, alternating steps, squares and cubes',
              },
              {
                id: 'skip',
                text: 'No pattern after about 40 seconds? Skip it, or guess if wrong answers cost nothing',
              },
            ],
            answer: { order: ['diff', 'second', 'ops', 'skip'] },
            explanation:
              'Differences are the quickest check and catch the most series. Operations and powers come next. In a timed test, skipping a stubborn question is a strategy, not a failure.',
          },
        ],
      },
    },
    {
      key: 'slides.puzzles',
      kind: 'SLIDES',
      title: 'Logic puzzles step by step',
      depthRank: 1,
      conceptKeys: [LOGICAL],
      body: {
        slides: [
          {
            kicker: 'Puzzles',
            title: 'Write every step down',
            body: 'Logic puzzles punish mental shortcuts. One line per step catches slips.',
            visual: {
              type: 'icons',
              items: [
                { icon: 'function', label: 'Function puzzles', sub: 'Work from the inside out' },
                { icon: 'calendar', label: 'Scheduling', sub: 'Find the longest chain' },
                { icon: 'brain', label: 'Syllogisms', sub: 'Only what must be true' },
                { icon: 'chart', label: 'Data tables', sub: 'Add the columns, subtract once' },
                {
                  icon: 'clock',
                  label: 'Speed and work',
                  sub: 'Convert units, then add the rates',
                },
              ],
            },
          },
          {
            kicker: 'Function puzzle',
            title: 'Work from the inside out',
            body: 'If x is even, f(x) = x/2. If x is odd, f(x) = 3x + 1.',
            try: {
              type: 'choice',
              prompt: 'What is **f(f(f(7)))**?',
              options: [
                {
                  text: '22',
                  correct: false,
                  feedback: 'That is only f(7). Apply f two more times.',
                },
                {
                  text: '11',
                  correct: false,
                  feedback: 'That is f(f(7)). One more step: f(11) = 34.',
                },
                {
                  text: '34',
                  correct: true,
                  feedback: 'Inside out: f(7) = 22, f(22) = 11, f(11) = 34.',
                },
              ],
            },
          },
          {
            kicker: 'Scheduling',
            title: 'Find the longest chain',
            body: 'P must finish before Q, and Q before R. S depends on nothing. Each task takes one slot, and two tasks can run at once.',
            try: {
              type: 'choice',
              prompt: 'What is the minimum number of slots?',
              options: [
                {
                  text: '2',
                  correct: false,
                  feedback: 'P, Q and R must run one after another, so at least 3.',
                },
                {
                  text: '3',
                  correct: true,
                  feedback:
                    'Slot 1: P and S. Slot 2: Q. Slot 3: R. The chain P → Q → R sets the minimum.',
                },
                {
                  text: '4',
                  correct: false,
                  feedback: 'S can run beside P, so it needs no slot of its own.',
                },
              ],
            },
          },
          {
            kicker: 'Syllogism',
            title: 'Only what must be true',
            body: 'All CS students know Python. No ME student knows Python. Raj, a student here, knows Python.',
            try: {
              type: 'choice',
              prompt: 'What **must** be true?',
              options: [
                {
                  text: 'Raj is a CS student',
                  correct: false,
                  feedback: 'Not certain. Students from other departments can know Python too.',
                },
                {
                  text: 'Raj is not an ME student',
                  correct: true,
                  feedback: 'No ME student knows Python, and Raj does. So he cannot be ME.',
                },
                {
                  text: 'Everyone who knows Python is in CS',
                  correct: false,
                  feedback:
                    'The rule only goes one way: every CS student knows Python, not the reverse.',
                },
              ],
            },
          },
          {
            kicker: 'Data table',
            title: 'Add the columns, subtract once',
            body: 'A team tracks bugs over four sprints (two-week work cycles). No bugs were open at the start. Found: 12, 8, 15, 6. Fixed: 10, 9, 11, 8.',
            try: {
              type: 'choice',
              prompt: 'How many bugs are unfixed at the end?',
              options: [
                {
                  text: '3',
                  correct: true,
                  feedback: 'Found 41, fixed 38, so 41 − 38 = 3.',
                },
                {
                  text: '6',
                  correct: false,
                  feedback: 'Sprints 2 and 4 fixed more than they found. Subtract those too.',
                },
                {
                  text: '41',
                  correct: false,
                  feedback: 'That is the total found. Subtract the 38 fixed.',
                },
              ],
            },
          },
          {
            kicker: 'Trains',
            title: 'Relative speed for trains',
            body: 'Trains facing each other: add the speeds. Same direction: subtract them. To pass fully, a train covers its own length plus whatever it passes.',
            visual: {
              type: 'stat',
              value: '× 5/18',
              label: 'Turns km/h into m/s',
              sub: 'Example: 54 km/h × 5/18 = 15 m/s',
            },
            note: 'A 300 m train at 54 km/h passes a pole in 300 ÷ 15 = 20 seconds.',
          },
          {
            kicker: 'Time and work',
            title: 'Count the job in units',
            body: 'Meena paints a wall in 4 days and Arjun in 12. Call the wall 12 units, a number both 4 and 12 divide into.',
            visual: {
              type: 'flow',
              steps: [
                { label: 'Wall = 12 units' },
                { label: 'Meena 3 + Arjun 1 a day' },
                { label: '12 ÷ 4 = 3 days' },
              ],
            },
          },
          {
            kicker: 'Live puzzles',
            title: 'Think aloud',
            body: 'Some interviewers ask you to show your thinking. Say each step and assumption as you go.',
            visual: {
              type: 'chat',
              lines: [
                {
                  from: 'candidate',
                  text: 'Seven is odd, so f(7) is 3 × 7 + 1 = 22. Twenty-two is even, so the next step gives 11.',
                },
              ],
            },
            note: 'A clear method with a small slip beats a silent, lucky answer.',
          },
        ],
      },
    },
    {
      key: 'check.logic',
      kind: 'KNOWLEDGE_CHECK',
      title: 'Logic puzzle practice',
      depthRank: 1,
      conceptKeys: [LOGICAL],
      body: {
        items: [
          {
            key: 'iterate',
            type: 'mcq',
            prompt: 'With the same rule (even: x/2, odd: 3x + 1), what is **f(f(f(10)))**?',
            options: [
              { id: 'a', text: '8' },
              { id: 'b', text: '16' },
              { id: 'c', text: '5' },
              { id: 'd', text: '4' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'f(10) = 5, f(5) = 16, f(16) = 8. Working inside out keeps you from skipping a step.',
          },
          {
            key: 'speed',
            type: 'mcq',
            prompt:
              'Two trains, 100 m and 150 m long, run towards each other at 40 km/h and 50 km/h. How long until they have fully passed each other?',
            options: [
              { id: 'a', text: '10 seconds' },
              { id: 'b', text: '6 seconds' },
              { id: 'c', text: '90 seconds' },
              { id: 'd', text: '2.8 seconds' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Facing each other, speeds add: 90 km/h × 5/18 = 25 m/s. Both lengths, 250 m, ÷ 25 = 10 seconds. 6 s counts only one train, 90 s subtracts the speeds, and 2.8 s skips the unit conversion.',
          },
          {
            key: 'work',
            type: 'fill_blank',
            prompt: 'Asha finishes a job in 6 days and Ravi in 3 days.',
            template: 'Working together, they finish it in {{b1}} days.',
            answer: { b1: ['2', 'two', '2 days'] },
            explanation:
              'Add the work rates: 1/6 + 1/3 = 1/2 of the job per day, so 2 days. Or take the job as 6 units. Asha does 1 a day and Ravi 2, so together they do 3 a day: 6 ÷ 3 = 2.',
          },
        ],
      },
    },
    {
      key: 'visual.guesstimate',
      kind: 'VISUAL',
      title: 'Guesstimate structure',
      depthRank: 1,
      conceptKeys: [LOGICAL],
      body: {
        scene: {
          type: 'anatomy',
          heading: '"Estimate the number of new cars bought in India in a year"',
          parts: [
            {
              label: 'Clarify',
              text: 'New four-wheelers bought by households in one year. Not used cars, not company fleets.',
              note: 'Fix the scope first. It decides every number after it.',
            },
            {
              label: 'Start big',
              text: 'India has about 140 crore people. At about 4.5 people per household, that is roughly 30 crore households.',
              note: 'Start from a number you know, and round freely.',
            },
            {
              label: 'Cut down',
              text: 'Assume about 1 in 10 households owns a car. That gives about 3 crore households.',
              note: 'Say every assumption out loud. Interviewers follow your reasoning, step by step.',
            },
            {
              label: 'Yearly rate',
              text: 'Say each of these households buys a new car about once every 8 years. Then 3 crore ÷ 8 is roughly 37 lakh cars a year.',
              note: 'Turn a stock (households with a car) into a flow (new cars bought per year).',
            },
            {
              label: 'Sanity check',
              text: "SIAM, the carmakers' industry body, reports about 46 lakh passenger vehicles sold to dealers in 2025–26. My 37 lakh is lower because it skips first-time buyers and taxi fleets, so it is in the right range.",
              note: "If you don't know a real figure, check an assumption instead: how many families in your building own a car?",
            },
          ],
        },
        caption: 'A classic interview guesstimate. Show each step; the exact number matters less.',
        altText:
          'A guesstimate in five parts. Clarify the scope. Start from about 140 crore people and 30 crore households. Assume 1 in 10 households owns a car, which gives 3 crore. Divide by an 8-year buying cycle to get about 37 lakh cars a year. Sanity-check against about 46 lakh sold in 2025–26, which includes first-time buyers and fleets.',
      },
    },
    {
      key: 'interview',
      kind: 'INTERVIEW_PLAYBOOK',
      title: 'Answering a guesstimate',
      depthRank: 1,
      conceptKeys: [LOGICAL],
      body: {
        question: '"Estimate the number of smartphones sold in India in a year."',
        totalMinutes: 3,
        steps: [
          { title: 'Clarify', detail: 'New phones only? Sold to people in India in one year?' },
          { title: 'Start big', detail: 'Population of India. Round freely.' },
          {
            title: 'Cut down',
            detail: 'The share who own a smartphone. Say the number out loud.',
          },
          {
            title: 'Yearly rate',
            detail: 'Owners ÷ years between replacements gives phones per year.',
          },
          {
            title: 'Sanity check',
            detail: 'Compare with anything you know, and say which assumption you trust least.',
          },
        ],
        followUps: [
          'Which assumption changes the answer the most?',
          'How would you get real data for that number?',
          'How would the estimate differ for rural and urban India?',
        ],
      },
    },
    {
      key: 'interview-questions',
      kind: 'CARD_DECK',
      title: 'Aptitude questions and answers',
      depthRank: 1,
      conceptKeys: [NUMERICAL, LOGICAL],
      body: {
        layout: 'flip',
        cards: [
          {
            title: 'Approach to logic problems',
            front: 'Explain how you approach a logical reasoning problem.',
            back: 'Restate the question and list the rules. Then write each step on paper and check the common patterns in a fixed order. Test the answer against every clue. Stuck after about a minute? Mark it and come back if the test allows.',
          },
          {
            title: 'Sprints needed at average pace',
            front:
              'A team completed 16, 20, 18 and 17 stories (tasks) in four sprints. At that pace, how many more sprints are needed for 40 stories?',
            back: 'Three. The total is 71 stories, so the average is 71 ÷ 4 = 17.75 a sprint. Then 40 ÷ 17.75 is about 2.25. You cannot run a quarter of a sprint, so round up to 3. Rounding down to 2 would leave stories unfinished.',
          },
          {
            title: 'Highest completion rate',
            front:
              'Four sprints planned 20, 22, 25 and 18 stories and completed 16, 20, 18 and 17. Which sprint had the highest completion rate?',
            back: 'Sprint 4. Divide completed by planned for each sprint: 0.80, 0.91, 0.72 and 0.94. Sprint 2 completed the most stories, but the question asks for a rate, not a count. Compute the exact ratio the question names.',
          },
          {
            title: 'Profit percentage',
            front:
              'A shopkeeper buys a phone cover for ₹400 and sells it for ₹500. What is the profit percentage?',
            back: '25%. The profit is ₹500 − ₹400 = ₹100. Profit percentage is taken on the cost price unless the question says otherwise, so 100 ÷ 400 = 25%. Dividing by the selling price gives 20%, a common wrong option.',
          },
          {
            title: 'Seating arrangement',
            front:
              'A, B and C sit in a row facing north. A is not at either end, and B sits to the right of A. Who sits at the left end?',
            back: 'C. A is not at an end, so A is in the middle. B is to the right of A, so B takes the right end. That leaves the left end for C. Draw the seats, then place fixed clues before relative ones.',
          },
          {
            title: 'Syllogism with a closed list',
            front:
              'A college has only three departments: CS, EE and ME. All CS students know Python, some EE students do, and no ME student does. Raj, a student there, knows Python. What must be true?',
            back: 'Raj is not in ME, because no ME student knows Python. With only three departments, he must be in CS or EE. He need not be in CS, because some EE students know Python too.',
          },
          {
            title: 'Affording versus buying',
            front:
              'In your car estimate, will every household that can afford a car buy one this year?',
            back: 'No. Split those households into first-time buyers, owners replacing an old car, and those with no need. Only a share of the first two groups buys in any one year. For replacements, divide the owners by the years between purchases, like the 8-year cycle.',
          },
          {
            title: 'Weakest assumption',
            front:
              'Which assumption in your car estimate affects the answer most, and how would you check it?',
            back: 'Every step multiplies, so the least certain one matters most: here, the share of households that own a car. Changing 1 in 10 to 1 in 12 cuts the answer by about a sixth. I would check it against household surveys or vehicle registration data.',
          },
        ],
      },
    },
    {
      key: 'summary',
      kind: 'SUMMARY',
      title: 'Aptitude key takeaways',
      depthRank: 1,
      conceptKeys: [NUMERICAL, LOGICAL],
      body: {
        takeaways: [
          'For a series, check differences, then second differences, then operations and powers.',
          'Small steps and big jumps taking turns usually mean two operations.',
          'Logic puzzles: write each step down; for nested functions, work from the inside out.',
          'Guesstimates: clarify, start big, cut down with stated assumptions, then sanity-check.',
          'Read the test rules first: can you go back, and do wrong answers lose marks? Then never spend over a minute on one question.',
        ],
        remember: ['Differences first', 'Say every assumption out loud'],
      },
    },
  ],
};
