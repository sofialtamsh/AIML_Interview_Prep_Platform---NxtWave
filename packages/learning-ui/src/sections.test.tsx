import { Section, toStudentSection } from '@app/content';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { type LessonRuntime, LessonRuntimeProvider, useNarration } from './context';
import { SectionBody } from './section-view';

const runtime: LessonRuntime = {
  grade: async () => ({ correct: true }) as never,
  solution: async () => '',
  attempts: new Map(),
  glossary: new Map(),
  storagePrefix: 'test',
};

/** A section as a student gets it, drawn to HTML the way the page first shows it (nothing run). */
function draw(section: unknown, host: Partial<LessonRuntime> = {}) {
  const student = toStudentSection(Section.parse(section), {
    revisionId: 'r1',
    estimatedMinutes: 3,
    fastTrack: false,
  });
  return renderToStaticMarkup(
    <LessonRuntimeProvider value={{ ...runtime, ...host }}>
      <SectionBody section={student} />
    </LessonRuntimeProvider>,
  );
}

/** Says whether a deck drawn here would be offered the read-aloud voice. */
function NarrationProbe() {
  return <i>{useNarration() ? 'narration-on' : 'narration-off'}</i>;
}

const IDLE = 'Click Run to see the output here.';

describe('runnable code never shows its output before it is run', () => {
  const example = {
    key: 'code.sum',
    kind: 'CODE_EXAMPLE',
    depthRank: 1,
    body: {
      language: 'python',
      code: 'print(40 + 2)',
      runnable: true,
      expectedOutput: 'the-answer-42',
    },
  };

  it('starts a runnable example on the idle terminal', () => {
    const html = draw(example);
    expect(html).toContain('Run');
    expect(html).toContain(IDLE);
    expect(html).not.toContain('the-answer-42');
    expect(html).not.toContain('Expected output');
  });

  it('keeps showing the output of code that cannot be run', () => {
    const html = draw({ ...example, body: { ...example.body, runnable: false } });
    expect(html).toContain('the-answer-42');
    expect(html).not.toContain(IDLE);
  });

  it('starts every code explorer state on the idle terminal, without its verdict', () => {
    const html = draw({
      key: 'explorer.sign',
      kind: 'CODE_EXPLORER',
      depthRank: 1,
      body: {
        controls: [
          {
            id: 'x',
            label: 'Input',
            options: [
              { value: 'neg', label: '-3' },
              { value: 'pos', label: '3' },
            ],
          },
        ],
        states: [
          {
            when: { x: 'neg' },
            code: 'print(max(0, -3))',
            output: { kind: 'text', value: 'printed-zero' },
            verdict: { tone: 'info', text: 'Negative inputs are verdict-clipped to zero.' },
          },
          {
            when: { x: 'pos' },
            code: 'print(max(0, 3))',
            output: { kind: 'text', value: 'printed-three' },
            verdict: { tone: 'ok', text: 'Positive inputs pass through.' },
          },
        ],
        defaultState: { x: 'neg' },
      },
    });
    expect(html).toContain('print');
    expect(html).toContain(IDLE);
    expect(html).not.toContain('printed-zero');
    expect(html).not.toContain('verdict-clipped');
  });

  const deck = (slide: object) => ({
    key: 'slides.intro',
    kind: 'SLIDES',
    depthRank: 1,
    body: { slides: [slide, { title: 'A second slide', body: 'Two slides make a deck.' }] },
  });

  it('starts a code try-it on a slide on the idle terminal, and never prints the expected text', () => {
    const html = draw(
      deck({
        title: 'Add the numbers',
        try: {
          type: 'code',
          prompt: 'Make it print the total.',
          starter: 'print(1 + 1)',
          expected: 'expected-total-7',
        },
      }),
    );
    expect(html).toContain('Edit the code if you like, then Run.');
    expect(html).not.toContain('expected-total-7');
  });

  it('keeps the output of a slide’s read-only code', () => {
    const html = draw(
      deck({
        title: 'Read the code',
        visual: { type: 'code', code: 'print("hi")', output: 'shown-on-the-slide' },
      }),
    );
    expect(html).toContain('shown-on-the-slide');
  });
});

describe('a coding exercise never gives its answers away before the student asks', () => {
  const playground = {
    key: 'playground.fit',
    kind: 'PLAYGROUND',
    depthRank: 1,
    body: {
      language: 'python',
      instructions: 'Fill in the blanks, then run the tests.',
      starterCode: 'm = ____\nprint(m)',
      hints: ['The slope is the covariance over the variance.'],
      solution: 'm = 2\nprint(m)',
      checks: [{ type: 'stdout_contains', value: '2.0', label: 'The slope is exactly 2.0' }],
    },
  };

  it('hides what each test expects, and the hints, until the student asks', () => {
    const html = draw(playground);
    expect(html).not.toContain('The slope is exactly 2.0');
    expect(html).not.toContain('covariance over the variance');
    expect(html).toContain('Test 1');
    expect(html).toContain('Show what the tests expect');
    expect(html).toContain('Hint');
  });
});

describe('read-aloud narration is opt-in', () => {
  const under = (host?: Partial<LessonRuntime>) =>
    renderToStaticMarkup(
      host ? (
        <LessonRuntimeProvider value={{ ...runtime, ...host }}>
          <NarrationProbe />
        </LessonRuntimeProvider>
      ) : (
        <NarrationProbe />
      ),
    );

  it('is off unless the host turns it on', () => {
    expect(under()).toContain('narration-off');
    expect(under({})).toContain('narration-off');
    expect(under({ voice: 1 })).toContain('narration-off');
    expect(under({ narration: false })).toContain('narration-off');
    expect(under({ narration: true })).toContain('narration-on');
  });

  it('draws a deck with no listen control when narration is off, and all its other controls', () => {
    const html = draw({
      key: 'slides.voice',
      kind: 'SLIDES',
      depthRank: 1,
      body: {
        slides: [
          { title: 'First slide', body: 'Something to read.' },
          { title: 'Second slide', body: 'Something more to read.' },
        ],
      },
    });
    expect(html).not.toMatch(/aloud/i);
    for (const control of [
      'Previous slide',
      'Next slide',
      'Play the slides',
      'Show the slides full screen',
    ])
      expect(html).toContain(control);
  });
});

describe('interview cards keep the model answer hidden until the student opens the card', () => {
  const deck = {
    key: 'interview-questions',
    kind: 'CARD_DECK',
    depthRank: 1,
    body: {
      layout: 'flip',
      cards: [
        { title: 'What it is', front: 'What is linear regression?', back: 'the-model-answer-one' },
        { title: 'The loss', front: 'Which loss is used?', back: 'the-model-answer-two' },
      ],
    },
  };

  it('lists every question, one line each, with no answer on the page', () => {
    const html = draw(deck);
    expect(html).toContain('What is linear regression?');
    expect(html).toContain('Which loss is used?');
    expect(html).toContain('Show answer');
    expect(html).not.toContain('the-model-answer-one');
    expect(html).not.toContain('the-model-answer-two');
    expect(html.replaceAll('<!-- -->', '')).toContain('0 of 2 opened');
  });
});

describe('a quiz with a pool', () => {
  const quiz = (count: number, drawn?: number) => ({
    key: 'check.pool',
    kind: 'KNOWLEDGE_CHECK',
    depthRank: 1,
    body: {
      items: Array.from({ length: count }, (_, i) => ({
        key: `q${i + 1}`,
        type: 'mcq',
        prompt: `pool-question-${i + 1}-end`,
        options: [
          { id: 'a', text: 'A' },
          { id: 'b', text: 'B' },
        ],
        answer: { correct: ['a'] },
        explanation: 'the-explanation',
      })),
      ...(drawn === undefined ? {} : { draw: drawn }),
    },
  });
  const shown = (html: string) => (html.match(/pool-question-\d+-end/g) ?? []).length;

  it('draws one attempt of questions and shows them one at a time', () => {
    const html = draw(quiz(12, 5));
    // One question on screen at a time, out of the five drawn.
    expect(shown(html)).toBe(1);
    expect(html).toContain('Question 1 of 5');
    expect(html).toContain('aria-label="Question 5"');
    expect(html).not.toContain('aria-label="Question 6"');
    expect(html).toMatch(/pool of (<!-- -->)?12/);
    expect(html).not.toContain('the-explanation');
    // The result and the offer of new questions wait until the attempt is finished.
    expect(html).not.toContain('New questions');
  });

  it('shows every question of a check that has no pool', () => {
    const html = draw(quiz(4));
    expect(shown(html)).toBe(4);
    expect(html).toContain('Question 1 of 4');
    expect(html).not.toContain('pool of');
  });
});

describe('every guided lab draws its first step, its controls and its numbers', () => {
  const films = [
    { x: 7, y: 3, cls: 0 },
    { x: 8, y: 5, cls: 0 },
    { x: 6, y: 4, cls: 0 },
    { x: 2, y: 7, cls: 1 },
    { x: 3, y: 5, cls: 1 },
    { x: 1, y: 4, cls: 1 },
  ];
  const knn = (story: unknown[]) => ({
    key: 'widget.knn',
    kind: 'WIDGET',
    depthRank: 1,
    body: {
      widget: 'knn-lab',
      prompt: 'Each dot is a film.',
      story,
      params: {
        xLabel: 'Action score',
        yLabel: 'Comedy score',
        classes: ['Liked', 'Skipped'],
        points: films,
        datasets: ['custom'],
        defaultDataset: 'custom',
        query: { x: 5, y: 5 },
        k: { max: 6, default: 3 },
        metrics: ['euclidean', 'manhattan'],
        defaultMetric: 'euclidean',
        panels: ['calculation'],
        controls: ['k', 'weighted', 'metric'],
        tasks: ['a-knn-task-to-try'],
      },
    },
  });

  it('KNN: the data first, then the vote with its sliders and working', () => {
    const html = draw(
      knn([
        { kicker: 'Data', title: 'The stored films', body: 'Six films.', show: 'points' },
        { kicker: 'Vote', title: 'The vote', body: 'Three vote.', show: 'vote', k: 3 },
      ]),
    );
    expect(html).toContain('Step 1 of 2');
    expect(html).toContain('Next step');
    // Before there is a new point, the right-hand side shows the rows behind the dots.
    expect(html).toContain('Label');
    expect(html).not.toContain('K (neighbours)');
    // The tasks wait in the card for free play; they are not a separate box under the lab.
    expect(html).toContain('a-knn-task-to-try');
  });

  it('KNN with no story is a sandbox: every control is open and the tasks lead', () => {
    const html = draw(knn([]));
    expect(html).not.toContain('Step 1 of');
    expect(html).toContain('Try this');
    expect(html).toContain('K (neighbours)');
    expect(html).toContain('Each vote');
    expect(html).toContain('Distance');
    expect(html).toContain('Live calculation');
  });

  it('logistic regression: the rows first, then the curve with its sliders and scores', () => {
    const lab = (show: string) => ({
      key: 'widget.logreg',
      kind: 'WIDGET',
      depthRank: 1,
      body: {
        widget: 'logreg-lab',
        prompt: 'Ten students.',
        story: [
          { kicker: 'Start', title: 'First step', body: 'Read this.', view: 'curve', show },
          { kicker: 'Fit', title: 'Second step', body: 'Then this.', view: 'curve', best: true },
        ],
        params: {
          xLabel: 'Hours of practice a week',
          xName: 'hours',
          positive: 'cleared',
          negative: 'did not clear',
          points: [
            { x: 1, y: 0 },
            { x: 2, y: 0 },
            { x: 4, y: 1 },
            { x: 5, y: 0 },
            { x: 6, y: 1 },
            { x: 8, y: 1 },
          ],
          xRange: { min: 0, max: 9 },
          weight: { min: -1, max: 3, step: 0.05 },
          intercept: { min: -12, max: 4, step: 0.1 },
          learningRates: [0.1, 0.3],
          tasks: ['a-logreg-task-to-try'],
        },
      },
    });
    const early = draw(lab('points'));
    expect(early).toContain('Step 1 of 2');
    expect(early).toContain('did not clear');
    expect(early).not.toContain('Best fit');
    const open = draw(lab('threshold'));
    expect(open).toContain('Best fit');
    expect(open).toContain('Weight on hours');
    expect(open).toContain('Threshold');
    expect(open).toContain('Log loss');
    expect(open).toContain('Mean log loss');
  });

  it('linear regression: the data first, then the line with its sliders and working', () => {
    const lab = (show: string, panel?: string) => ({
      key: 'widget.linreg',
      kind: 'WIDGET',
      depthRank: 1,
      body: {
        widget: 'linreg-lab',
        prompt: 'Six employees.',
        story: [
          {
            kicker: 'Start',
            title: 'First step',
            body: 'Read this.',
            show,
            line: { m: 1, b: 5 },
            ...(panel ? { panel } : {}),
          },
          { kicker: 'Best', title: 'Second step', body: 'Then this.', show: 'squares', best: true },
        ],
        params: {
          xLabel: 'Years of experience',
          yLabel: 'Salary (LPA)',
          xName: 'years',
          yName: 'salary',
          points: [
            { x: 1, y: 6 },
            { x: 2, y: 6 },
            { x: 3, y: 9 },
            { x: 4, y: 11 },
            { x: 5, y: 12 },
            { x: 6, y: 16 },
          ],
          xRange: { min: 0, max: 8 },
          yRange: { min: 0, max: 20 },
          line: { m: 1, b: 5 },
          slope: { min: -1, max: 4, step: 0.05 },
          intercept: { min: -2, max: 12, step: 0.25 },
          learningRates: [0.01, 0.05],
          scaledLearningRates: [0.1, 0.3],
          datasets: ['custom'],
          defaultDataset: 'custom',
          panels: ['calculation', 'ols'],
          controls: ['line', 'best-fit'],
          tasks: ['a-linreg-task-to-try'],
        },
      },
    });
    const early = draw(lab('points'));
    expect(early).toContain('Step 1 of 2');
    expect(early).not.toContain('Slope m');
    const open = draw(lab('squares', 'calculation'));
    expect(open).toContain('Slope m');
    expect(open).toContain('Intercept b');
    expect(open).toContain('Best line');
    expect(open).toContain('Live calculation');
    // 35 / 6: the first guess of the lesson, worked out in front of the student.
    expect(open.replaceAll('<!-- -->', '')).toContain('MSE = 35 / 6 = 5.833');
  });
});
