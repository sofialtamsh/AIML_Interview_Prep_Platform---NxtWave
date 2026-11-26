/**
 * Lesson content schema (docs/07-content-schema.md). Lessons are typed, versioned JSON:
 * generated or written once, validated here, rendered by the same components everywhere.
 * No HTML or JavaScript is ever stored; interactivity comes from vetted widgets that
 * content can only configure.
 */
import { z } from 'zod';
import { ANIMATION_NAMES } from './animations';

// ───────────── Primitives ─────────────

/** Stable identifier inside a lesson, e.g. "explore.chunk-size". */
export const ContentKey = z
  .string()
  .regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/, 'Use lowercase words joined by dots or dashes')
  .max(80);

const HTML_TAG = /<\/?[a-z][a-z0-9-]*(\s[^>]*)?>/i;

/**
 * A safe markdown subset: **bold**, _italic_, `code`, [links](https://…) and glossary
 * chips [[term:embedding]]. Raw HTML is rejected.
 */
export const Rich = z
  .string()
  .trim()
  .min(1)
  .max(4000)
  .refine((s) => !HTML_TAG.test(s), 'Use markdown, not HTML');
export type Rich = z.infer<typeof Rich>;

const Short = (max = 120) => z.string().trim().min(1).max(max);
const Code = z.string().min(1).max(8000);
export const CodeLanguage = z.enum(['python']);
/** Packages the in-browser Python runtime may load. */
export const PythonPackage = z.enum(['numpy', 'pandas']);
export const DepthRank = z.number().int().min(1).max(5);

// ───────────── Explanation blocks ─────────────

export const Block = z.discriminatedUnion('type', [
  z.object({ type: z.literal('paragraph'), text: Rich }),
  z.object({ type: z.literal('steps'), items: z.array(Rich).min(1).max(12) }),
  z.object({ type: z.literal('bullets'), items: z.array(Rich).min(1).max(12) }),
  z.object({ type: z.literal('term'), term: Short(60), definition: Rich }),
  z.object({
    type: z.literal('table'),
    columns: z.array(Short(60)).min(2).max(6),
    rows: z
      .array(z.array(Short(200)))
      .min(1)
      .max(12),
    caption: Short(200).optional(),
  }),
  z.object({
    type: z.literal('compare'),
    left: z.object({ title: Short(60), points: z.array(Rich).min(1).max(6) }),
    right: z.object({ title: Short(60), points: z.array(Rich).min(1).max(6) }),
  }),
  z.object({ type: z.literal('note'), text: Rich }),
  z.object({ type: z.literal('analogy_vs_reality'), analogy: Rich, reality: Rich }),
]);
export type Block = z.infer<typeof Block>;

// ───────────── Pictures shared by several kinds ─────────────

/** One emoji (with an optional skin tone or joiners), shown big on story cards. */
export const Emoji = z
  .string()
  .regex(
    /^\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}|[\u{1F3FB}-\u{1F3FF}]){0,7}$/u,
    'Use a single emoji',
  );

/** A moving picture from the platform's animation library (see animations.ts), picked by name. */
export const AnimationRef = z.object({
  name: z.enum(ANIMATION_NAMES),
  /** A short line under the picture; the library's description is read to screen readers. */
  caption: Short(90).optional(),
});
export type AnimationRef = z.infer<typeof AnimationRef>;

/** Icons lessons may show (rendered from a vetted line-icon set, never from content). */
export const SLIDE_ICONS = [
  'mic',
  'user',
  'users',
  'briefcase',
  'code',
  'terminal',
  'brain',
  'chart',
  'target',
  'clock',
  'check',
  'x',
  'star',
  'rocket',
  'book',
  'message',
  'lightbulb',
  'trophy',
  'graduation',
  'laptop',
  'database',
  'server',
  'cloud',
  'shield',
  'search',
  'zap',
  'heart',
  'flag',
  'map',
  'compass',
  'calendar',
  'building',
  'rupee',
  'handshake',
  'sparkles',
  'puzzle',
  'list',
  'bug',
  'play',
  'layers',
  'file',
  'home',
  'phone',
  'smile',
  'alert',
  'link',
  'lock',
  'box',
  'repeat',
  'filter',
  'cpu',
  'globe',
  'award',
  'pen',
  'key',
  'gift',
  'eye',
  'hash',
  'braces',
  'function',
  'cart',
  'bag',
  'store',
  'pin',
  'contacts',
  'tag',
  'film',
  'video',
  'camera',
  'music',
  'headphones',
  'image',
  'wallet',
  'card',
  'receipt',
  'bell',
  'mail',
  'truck',
  'car',
  'plane',
  'food',
  'smartphone',
  'download',
  'gauge',
  'settings',
  'wifi',
  'bot',
] as const;
export const SlideIcon = z.enum(SLIDE_ICONS);
export type SlideIcon = z.infer<typeof SlideIcon>;

/** Where students meet the idea in real life: one card (a line icon, a label, one line). */
export const UseCase = z.object({
  icon: SlideIcon,
  label: Short(40),
  sub: Short(90).optional(),
});

// ───────────── Section bodies ─────────────

export const HookBody = z.object({
  scenario: Rich,
  /** A moving picture beside the scenario. */
  animation: AnimationRef.optional(),
  /** "Where you see it": 2–4 everyday places the idea shows up, as picture cards. */
  realWorld: z
    .object({ title: Short(60).optional(), items: z.array(UseCase).min(2).max(4) })
    .optional(),
  provocation: Short(200).optional(),
  analogy: z
    .object({
      text: Rich,
      mapping: z
        .array(z.object({ everyday: Short(80), technical: Short(80) }))
        .min(1)
        .max(5),
      whereItBreaks: Rich,
    })
    .optional(),
  bridge: Rich,
});

export const ExplanationBody = z.object({ blocks: z.array(Block).min(1).max(16) });

export const CardDeckBody = z.object({
  /** swipe: story-style cards, one idea per card, swiped like a reel. */
  layout: z.enum(['flip', 'stepper', 'compare', 'grid', 'swipe']),
  cards: z
    .array(
      z.object({
        title: Short(80),
        front: Rich,
        back: Rich.optional(),
        tag: Short(40).optional(),
        emoji: Emoji.optional(),
      }),
    )
    .min(2)
    // Twelve: an interview deck mirrors the questions a panel actually asks, and for one topic
    // that runs past ten.
    .max(12),
});

export const DiagramBody = z
  .object({
    type: z.literal('flow'),
    nodes: z
      .array(z.object({ id: ContentKey, label: Short(40), detail: Short(160).optional() }))
      .min(2)
      .max(8),
    edges: z.array(z.object({ from: ContentKey, to: ContentKey, label: Short(40).optional() })),
    steps: z
      .array(z.object({ title: Short(80), narration: Rich, highlight: z.array(ContentKey).min(1) }))
      .max(8)
      .default([]),
    caption: Short(200).optional(),
    altText: Short(400),
  })
  .superRefine((d, ctx) => {
    const ids = new Set(d.nodes.map((n) => n.id));
    if (ids.size !== d.nodes.length)
      ctx.addIssue({ code: 'custom', message: 'Node ids must be unique' });
    for (const e of d.edges) {
      if (!ids.has(e.from) || !ids.has(e.to)) {
        ctx.addIssue({ code: 'custom', message: `Edge ${e.from}→${e.to} uses an unknown node` });
      }
    }
    for (const s of d.steps) {
      for (const h of s.highlight) {
        if (!ids.has(h))
          ctx.addIssue({ code: 'custom', message: `Step highlights unknown node ${h}` });
      }
    }
  });

const lineCount = (code: string) => code.split('\n').length;

export const CodeExampleBody = z
  .object({
    language: CodeLanguage,
    code: Code,
    annotations: z
      .array(
        z.object({
          lines: z.tuple([z.number().int().min(1), z.number().int().min(1)]),
          note: Rich,
        }),
      )
      .max(10)
      .default([]),
    runnable: z.boolean(),
    packages: z.array(PythonPackage).default([]),
    /** The real output. Set by execution during generation, never trusted from an LLM. */
    expectedOutput: z.string().max(4000).optional(),
  })
  .superRefine((b, ctx) => {
    const n = lineCount(b.code);
    for (const a of b.annotations) {
      if (a.lines[0] > a.lines[1] || a.lines[1] > n) {
        ctx.addIssue({
          code: 'custom',
          message: `Annotation lines ${a.lines.join('–')} are outside the code`,
        });
      }
    }
  });

const ExplorerOutput = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('text'), value: z.string().max(4000) }),
  z.object({
    kind: z.literal('table'),
    columns: z.array(Short(60)).min(1).max(8),
    rows: z.array(z.array(z.string().max(200))).max(30),
    highlightRows: z.array(z.number().int().min(0)).default([]),
  }),
]);
const Tone = z.enum(['ok', 'bad', 'info']);

/** The prototype's signature interaction: flip controls and watch code, output and verdict change. */
export const CodeExplorerBody = z
  .object({
    prompt: Rich.optional(),
    /** Shared definitions and data, run before every state's code (shown collapsed). */
    setup: Code.optional(),
    controls: z
      .array(
        z.object({
          id: ContentKey,
          label: Short(60),
          options: z
            .array(z.object({ value: Short(40), label: Short(40) }))
            .min(2)
            .max(5),
        }),
      )
      .min(1)
      .max(3),
    states: z
      .array(
        z.object({
          when: z.record(z.string(), z.string()),
          code: Code,
          output: ExplorerOutput,
          verdict: z.object({ tone: Tone, text: Rich }),
        }),
      )
      .min(2)
      .max(30),
    defaultState: z.record(z.string(), z.string()),
    packages: z.array(PythonPackage).default([]),
  })
  .superRefine((b, ctx) => {
    // Every combination of control values must have exactly one state.
    const combos = b.controls.reduce<Array<Record<string, string>>>(
      (acc, c) => acc.flatMap((a) => c.options.map((o) => ({ ...a, [c.id]: o.value }))),
      [{}],
    );
    const sig = (w: Record<string, string>) =>
      b.controls.map((c) => `${c.id}=${w[c.id] ?? ''}`).join('&');
    const states = b.states.map((s) => sig(s.when));
    for (const combo of combos) {
      const n = states.filter((s) => s === sig(combo)).length;
      if (n !== 1) {
        ctx.addIssue({
          code: 'custom',
          message: `Need exactly one state for ${sig(combo)} (found ${n})`,
        });
      }
    }
    if (!combos.some((c) => sig(c) === sig(b.defaultState))) {
      ctx.addIssue({ code: 'custom', message: 'defaultState is not a valid combination' });
    }
  });

// ───────────── Widgets (vetted components; content only fills params) ─────────────

const Range = z
  .object({
    min: z.number().int().min(0),
    max: z.number().int().min(1),
    step: z.number().int().min(1),
    default: z.number().int().min(0),
  })
  .refine((r) => r.min < r.max && r.default >= r.min && r.default <= r.max, 'Bad range');

export const ChunkerParams = z
  .object({
    text: z.string().trim().min(40).max(3000),
    size: Range,
    overlap: Range,
    highlight: z.object({ phrase: Short(120), label: Short(80) }).optional(),
  })
  .superRefine((p, ctx) => {
    if (p.overlap.max >= p.size.min) {
      ctx.addIssue({ code: 'custom', message: 'Overlap must stay below the smallest chunk size' });
    }
    if (p.highlight && !p.text.includes(p.highlight.phrase)) {
      ctx.addIssue({ code: 'custom', message: 'The highlight phrase must appear in the text' });
    }
  });

/** Things to try with an explorer, shown as a short practice list beside it. */
const ExplorerTasks = z.array(Short(160)).max(4).default([]);

/** A choice among a few preset values, one of which is selected at the start. */
const choices = (min: number, max: number, count: [number, number]) =>
  z
    .object({
      options: z.array(z.number().min(min).max(max)).min(count[0]).max(count[1]),
      default: z.number(),
    })
    .refine((c) => c.options.includes(c.default), 'The default must be one of the options')
    .refine(
      (c) => c.options.every((v, i) => i === 0 || v > (c.options[i - 1] as number)),
      'List the options from smallest to largest',
    );

/**
 * Train a small model live and watch the training and validation loss per epoch, with the model's
 * fit drawn over the data. The data is a noisy sine wave from a fixed seed, so every student sees
 * the same thing; the model is a polynomial of the chosen degree, trained by gradient descent.
 */
export const TrainingExplorerParams = z
  .object({
    degree: choices(1, 12, [1, 4]),
    learningRate: choices(0.0001, 2, [1, 6]),
    l2: choices(0, 10, [1, 5]),
    epochs: z.object({
      max: z.number().int().min(50).max(20000),
      default: z.number().int().min(1),
    }),
    seed: z.number().int().min(1).max(100000),
    points: z.number().int().min(6).max(40).default(12),
    noise: z.number().min(0).max(1).default(0.3),
    tasks: ExplorerTasks,
  })
  .refine((p) => p.epochs.default <= p.epochs.max, 'The default epochs must be within the maximum');

export const OPTIMIZERS = ['sgd', 'momentum', 'adam'] as const;

/** SGD, momentum and Adam race down the same narrow valley from the same start. */
export const OptimizerRaceParams = z
  .object({
    optimizers: z.array(z.enum(OPTIMIZERS)).min(1).max(3),
    learningRate: choices(0.001, 2, [1, 6]),
    momentum: choices(0, 0.99, [1, 5]),
    steps: z.object({ max: z.number().int().min(5).max(300), default: z.number().int().min(1) }),
    /** Offer a "mini-batch noise" switch that adds noise to every gradient. */
    allowNoise: z.boolean().default(false),
    tasks: ExplorerTasks,
  })
  .refine((p) => p.steps.default <= p.steps.max, 'The default steps must be within the maximum')
  .refine((p) => new Set(p.optimizers).size === p.optimizers.length, 'List each optimizer once');

export const ACTIVATIONS = ['sigmoid', 'tanh', 'relu', 'leaky-relu'] as const;

/** One neuron's activation, a(w·x + b): change the function, weight, bias and leak, and see the curve and its slope. */
export const ActivationExplorerParams = z
  .object({
    functions: z.array(z.enum(ACTIVATIONS)).min(1).max(4),
    default: z.enum(ACTIVATIONS),
    /** Draw the slope a′(z) and shade where it is almost zero (vanishing gradients). */
    showSlope: z.boolean().default(true),
    tasks: ExplorerTasks,
  })
  .refine((p) => p.functions.includes(p.default), 'The default must be one of the functions');

const Num = z.number().finite();
/** A slider over whole numbers: the new point's value, or one adjustable data value. */
const SliderRange = z
  .object({
    label: Short(60),
    min: z.number().int(),
    max: z.number().int(),
    step: z.number().int().min(1).default(1),
    default: z.number().int(),
  })
  .refine((r) => r.min < r.max && r.default >= r.min && r.default <= r.max, 'Bad range');

export const OUTLIER_METHODS = ['iqr', 'zscore'] as const;
export const OUTLIER_TREATMENTS = ['keep', 'remove', 'cap'] as const;

/**
 * One numeric column on a number line with its box plot: flag outliers with the IQR rule or the
 * z-score rule, then keep, remove or cap them, and watch the mean, median and spread respond.
 * `extra` adds one value the student can drag (to show how one extreme value moves the mean).
 */
export const OutlierExplorerParams = z
  .object({
    label: Short(60),
    values: z.array(Num).min(8).max(60),
    extra: SliderRange.optional(),
    methods: z.array(z.enum(OUTLIER_METHODS)).min(1).max(2),
    defaultMethod: z.enum(OUTLIER_METHODS),
    iqrK: choices(0.5, 5, [1, 3]),
    zThreshold: choices(1, 5, [1, 3]),
    treatments: z.array(z.enum(OUTLIER_TREATMENTS)).min(1).max(3),
    tasks: ExplorerTasks,
  })
  .refine((p) => p.methods.includes(p.defaultMethod), 'The default method must be offered')
  .refine((p) => new Set(p.methods).size === p.methods.length, 'List each method once')
  .refine((p) => new Set(p.treatments).size === p.treatments.length, 'List each treatment once');

export const FILL_STRATEGIES = [
  'drop',
  'mean',
  'median',
  'mode',
  'ffill',
  'bfill',
  'interpolate',
] as const;

/**
 * A column with gaps, drawn row by row: fill them by dropping, mean, median, mode, forward or
 * backward fill or interpolation, and compare the summary before and after. Up to three datasets
 * (for example skewed salaries, ratings and a daily series) show where each method fits.
 */
export const ImputationExplorerParams = z
  .object({
    datasets: z
      .array(
        z.object({
          name: Short(30),
          label: Short(60),
          values: z.array(Num.nullable()).min(6).max(40),
          /** Rows follow time order, so a line joins them and forward fill makes sense. */
          ordered: z.boolean().default(false),
        }),
      )
      .min(1)
      .max(3),
    strategies: z.array(z.enum(FILL_STRATEGIES)).min(2).max(7),
    defaultStrategy: z.enum(FILL_STRATEGIES),
    tasks: ExplorerTasks,
  })
  .refine((p) => p.strategies.includes(p.defaultStrategy), 'The default must be offered')
  .refine((p) => new Set(p.strategies).size === p.strategies.length, 'List each strategy once')
  .refine(
    (p) => p.datasets.every((d) => d.values.some((v) => v === null)),
    'Every dataset needs at least one missing value',
  )
  .refine(
    (p) => p.datasets.every((d) => d.values.filter((v) => v !== null).length >= 3),
    'Every dataset needs at least three known values',
  );

export const SCALERS = ['none', 'minmax', 'standard'] as const;

/**
 * Two features on very different scales and a k-nearest-neighbours model: change the scaling and
 * watch which neighbours are nearest, how much each feature counts and whether the prediction
 * flips. Students can move the new point with two sliders.
 */
export const ScalingExplorerParams = z
  .object({
    xLabel: Short(40),
    yLabel: Short(40),
    /** The names of class 0 and class 1. */
    classes: z.array(Short(24)).length(2),
    points: z
      .array(z.object({ x: Num, y: Num, cls: z.union([z.literal(0), z.literal(1)]) }))
      .min(6)
      .max(40),
    queryX: SliderRange,
    queryY: SliderRange,
    k: choices(1, 9, [1, 3]),
    scalers: z.array(z.enum(SCALERS)).min(2).max(3),
    defaultScaler: z.enum(SCALERS),
    tasks: ExplorerTasks,
  })
  .refine((p) => p.scalers.includes(p.defaultScaler), 'The default scaler must be offered')
  .refine((p) => new Set(p.scalers).size === p.scalers.length, 'List each scaler once')
  .refine((p) => p.k.options.every((k) => k <= p.points.length), 'k cannot exceed the points');

/**
 * An exact two-sided binomial test against 50/50: choose how many trials and how many went one
 * way, see the distribution if there were no real difference, the tail that makes the p-value,
 * and the decision at the chosen significance level.
 */
export const PValueExplorerParams = z
  .object({
    /** What one trial is, for example "test questions" or "coin flips". */
    trialsLabel: Short(30),
    /** What a success is, for example "won by the new model" or "heads". */
    successLabel: Short(40),
    n: choices(4, 500, [1, 5]),
    /** The share of successes when the explorer opens (kept when n changes). */
    defaultShare: z.number().min(0).max(1),
    alpha: choices(0.001, 0.2, [1, 3]),
    tasks: ExplorerTasks,
  })
  .refine((p) => p.n.options.every(Number.isInteger), 'Trial counts must be whole numbers');

/** A Python variable name shown in the explorer's code, for example "marks". */
const PyName = z
  .string()
  .trim()
  .regex(/^[a-z_][a-z0-9_]{0,15}$/, 'Use a short lower-case Python name');
/** Names for a table's rows or columns: none, or exactly one per row or column. */
const AxisNames = z.array(Short(16)).max(8).default([]);
/** A small table of whole numbers; every row has the same length. */
const IntGrid = (rows: [number, number], cols: [number, number]) =>
  z
    .array(z.array(z.number().int().min(-999).max(999)).min(cols[0]).max(cols[1]))
    .min(rows[0])
    .max(rows[1])
    .refine((g) => g.every((r) => r.length === g[0]?.length), 'Every row needs the same length');
const namesFit = (names: string[], size: number) => names.length === 0 || names.length === size;

export const ARRAY_INDEX_MODES = ['slice', 'mask', 'rows'] as const;

/**
 * A small 2-D NumPy array drawn as a grid. Pick rows and columns (all, a slice or one index), keep
 * the cells above a value (a boolean mask), or keep the rows whose chosen column is above a value.
 * The explorer shows the exact expression, the cells it picks, the result's shape and printout, and
 * whether the result is a view of the array or a new copy.
 */
export const ArrayIndexExplorerParams = z
  .object({
    name: PyName,
    rowLabel: Short(24),
    colLabel: Short(24),
    rowNames: AxisNames,
    colNames: AxisNames,
    values: IntGrid([2, 8], [2, 8]),
    modes: z.array(z.enum(ARRAY_INDEX_MODES)).min(1).max(3),
    defaultMode: z.enum(ARRAY_INDEX_MODES),
    /** The value a mask compares with, for example "Mark above". */
    threshold: SliderRange,
    tasks: ExplorerTasks,
  })
  .refine((p) => p.modes.includes(p.defaultMode), 'The default mode must be offered')
  .refine((p) => new Set(p.modes).size === p.modes.length, 'List each mode once')
  .refine((p) => namesFit(p.rowNames, p.values.length), 'Give one name per row, or none')
  .refine((p) => namesFit(p.colNames, p.values[0]?.length ?? 0), 'Give one name per column');

export const AXIS_OPS = ['sum', 'mean', 'max', 'min', 'argmax'] as const;

/**
 * Aggregate a small table along an axis: sum, mean, max, min or argmax with axis None, 0 or 1, and
 * keepdims on or off. The cells that collapse into each answer share a colour, and the explorer
 * shows the result and its shape.
 */
export const AxisExplorerParams = z
  .object({
    name: PyName,
    rowLabel: Short(24),
    colLabel: Short(24),
    rowNames: AxisNames,
    colNames: AxisNames,
    values: IntGrid([2, 6], [2, 8]),
    ops: z.array(z.enum(AXIS_OPS)).min(1).max(5),
    defaultOp: z.enum(AXIS_OPS),
    tasks: ExplorerTasks,
  })
  .refine((p) => p.ops.includes(p.defaultOp), 'The default operation must be offered')
  .refine((p) => new Set(p.ops).size === p.ops.length, 'List each operation once')
  .refine((p) => namesFit(p.rowNames, p.values.length), 'Give one name per row, or none')
  .refine((p) => namesFit(p.colNames, p.values[0]?.length ?? 0), 'Give one name per column');

/** An array shape with up to two axes; [] is a single number (a scalar). */
const SmallShape = z.array(z.number().int().min(1).max(6)).max(2);

/**
 * Broadcasting: pick the shapes of A and B from a few presets and see NumPy's rule applied axis by
 * axis from the right, the stretched copies, the result of A + B, or the exact error NumPy raises.
 * A holds 0, 10, 20, … and B holds 1, 2, 3, …, so every sum shows which values met.
 */
export const BroadcastExplorerParams = z
  .object({
    shapes: z.array(SmallShape).min(3).max(8),
    /** Positions in `shapes` of the shapes selected at the start. */
    defaultA: z.number().int().min(0),
    defaultB: z.number().int().min(0),
    tasks: ExplorerTasks,
  })
  .refine(
    (p) => p.defaultA < p.shapes.length && p.defaultB < p.shapes.length,
    'The defaults must point at a listed shape',
  )
  .refine(
    (p) => new Set(p.shapes.map((s) => s.join(','))).size === p.shapes.length,
    'List each shape once',
  );

const Vec2 = z.object({ x: z.number().int(), y: z.number().int() });

/**
 * Two 2-D vectors with whole-number coordinates: move them and watch the dot product, both norms
 * (L1 and L2), the cosine similarity, the angle and the distance between them. A switch shrinks
 * both to length 1, where the dot product equals the cosine.
 */
export const VectorExplorerParams = z
  .object({
    /** The sliders run from −range to range. */
    range: z.number().int().min(3).max(8),
    a: Vec2,
    b: Vec2,
    tasks: ExplorerTasks,
  })
  .refine(
    (p) => [p.a.x, p.a.y, p.b.x, p.b.y].every((v) => Math.abs(v) <= p.range),
    'The starting vectors must fit the range',
  );

export const MATMUL_OPS = ['a@b', 'b@a', 'a@a', 'a@a.T', 'a*b'] as const;

/**
 * Matrix multiplication on two small named tables, for example marks (students × subjects) and
 * weights (subjects × schemes). Pick a result cell to see the row and column that make it and the
 * sum of products; switch the operation to see why order matters, when shapes clash, and how
 * `*` differs from `@`.
 */
export const MatmulExplorerParams = z
  .object({
    aName: PyName,
    bName: PyName,
    /** A's rows (for example students), A's columns = B's rows (subjects), B's columns (schemes). */
    rowNames: AxisNames,
    innerNames: AxisNames,
    colNames: AxisNames,
    a: z.array(z.array(z.number().finite()).min(2).max(4)).min(2).max(4),
    b: z.array(z.array(z.number().finite()).min(2).max(4)).min(2).max(4),
    ops: z.array(z.enum(MATMUL_OPS)).min(1).max(5),
    defaultOp: z.enum(MATMUL_OPS),
    tasks: ExplorerTasks,
  })
  .refine(
    (p) =>
      p.a.every((r) => r.length === p.a[0]?.length) &&
      p.b.every((r) => r.length === p.b[0]?.length),
    'Every row needs the same length',
  )
  .refine((p) => p.a[0]?.length === p.b.length, "A's columns must match B's rows")
  .refine((p) => p.ops.includes(p.defaultOp), 'The default operation must be offered')
  .refine((p) => new Set(p.ops).size === p.ops.length, 'List each operation once')
  .refine((p) => namesFit(p.rowNames, p.a.length), 'Give one name per row of A, or none')
  .refine((p) => namesFit(p.innerNames, p.b.length), 'Give one name per column of A, or none')
  .refine((p) => namesFit(p.colNames, p.b[0]?.length ?? 0), 'Give one name per column of B');

export const KNN_DATASETS = ['custom', 'blobs', 'moons', 'circles', 'xor'] as const;
export const KNN_METRICS = ['euclidean', 'manhattan', 'minkowski3'] as const;
/** What the picture reveals at a story step. Each level includes the ones before it. */
export const KNN_SHOW = ['points', 'query', 'distances', 'neighbours', 'vote'] as const;
export const KNN_CONTROLS = [
  'k',
  'metric',
  'weighted',
  'boundary',
  'dataset',
  'add-points',
] as const;
export const KNN_PANELS = ['calculation', 'accuracy'] as const;

const Coord = z.number().min(0).max(10);
/** A story step's text: rich text, kept short enough to read beside the picture. */
const StoryText = z
  .string()
  .trim()
  .min(1)
  .max(520)
  .refine((t) => !HTML_TAG.test(t), 'Use markdown, not HTML');

/**
 * One step of a KNN lab story: a short explanation beside the live picture, and what the picture
 * shows while the student reads it. A step may also set K, the vote type, the metric, the decision
 * regions or the new point's position, so the picture always matches the words.
 */
export const KnnStoryStep = z.object({
  kicker: Short(40),
  title: Short(70),
  body: StoryText,
  show: z.enum(KNN_SHOW),
  k: z.number().int().min(1).max(15).optional(),
  weighted: z.boolean().optional(),
  boundary: z.boolean().optional(),
  metric: z.enum(KNN_METRICS).optional(),
  query: z.object({ x: Coord, y: Coord }).optional(),
  /** Switch to another of the lab's datasets on entering this step. */
  dataset: z.enum(KNN_DATASETS).optional(),
});

/**
 * The KNN lab: labelled points on a 0–10 square and a new point the student can drag. It shows
 * every distance with its working, the K nearest neighbours, the plain or distance-weighted vote
 * with its arithmetic, class probabilities, ties, the decision regions and accuracy against K.
 * Numbers follow scikit-learn's KNeighborsClassifier. The lesson's own `points` (whole numbers are
 * easiest to check by hand) form the "custom" dataset; the others are fixed generated patterns
 * with held-out points for the accuracy chart.
 */
export const KnnLabParams = z
  .object({
    xLabel: Short(40),
    yLabel: Short(40),
    /** Class names for the lesson's own points. Generated datasets use Class A, B and C. */
    classes: z.array(Short(24)).min(2).max(3),
    points: z
      .array(z.object({ x: Coord, y: Coord, cls: z.number().int().min(0).max(2) }))
      .max(40)
      .default([]),
    datasets: z.array(z.enum(KNN_DATASETS)).min(1).max(5),
    defaultDataset: z.enum(KNN_DATASETS),
    /** Where the new point starts. */
    query: z.object({ x: Coord, y: Coord }),
    k: z.object({
      max: z.number().int().min(1).max(15),
      default: z.number().int().min(1),
    }),
    metrics: z.array(z.enum(KNN_METRICS)).min(1).max(3),
    defaultMetric: z.enum(KNN_METRICS),
    /** Start with distance-weighted votes instead of one vote each. */
    weighted: z.boolean().default(false),
    /** Start with the decision regions drawn. */
    boundary: z.boolean().default(false),
    /** What sits under the picture: the calculation table, the accuracy-against-K chart. */
    panels: z.array(z.enum(KNN_PANELS)).max(2).default(['calculation']),
    /** The controls students may use once the story has introduced them. */
    controls: z.array(z.enum(KNN_CONTROLS)).max(6).default([]),
    tasks: ExplorerTasks,
  })
  .refine((p) => p.datasets.includes(p.defaultDataset), 'The default dataset must be offered')
  .refine((p) => new Set(p.datasets).size === p.datasets.length, 'List each dataset once')
  .refine((p) => p.metrics.includes(p.defaultMetric), 'The default metric must be offered')
  .refine((p) => new Set(p.metrics).size === p.metrics.length, 'List each metric once')
  .refine((p) => p.k.default <= p.k.max, 'The default K must be within the maximum')
  .refine(
    (p) => !p.datasets.includes('custom') || p.points.length >= 6,
    'The custom dataset needs at least six points',
  )
  .refine(
    (p) => p.points.every((pt) => pt.cls < p.classes.length),
    'A point uses a class that has no name',
  );

export const LINREG_SHOW = ['points', 'line', 'residuals', 'squares'] as const;
export const LINREG_PANELS = ['calculation', 'ols', 'descent', 'residual-plot'] as const;
export const LINREG_CONTROLS = ['line', 'best-fit', 'predict', 'dataset', 'move-points'] as const;
export const LINREG_DATASETS = ['custom', 'outlier', 'curved', 'funnel'] as const;

const LineSpec = z.object({ m: Num, b: Num });
const XY = z.object({ x: Num, y: Num });
const Span = z.object({ min: Num, max: Num }).refine((r) => r.min < r.max, 'min must be below max');
const SliderSpan = z
  .object({ min: Num, max: Num, step: z.number().positive() })
  .refine((r) => r.min < r.max, 'min must be below max');

/**
 * One step of a linear regression lab story. Besides its words it sets the picture: what is
 * drawn, which line (a given one, or the least-squares line), which dataset, which panel sits
 * under the picture, and for gradient descent the learning rate, whether x is standardised and
 * how many steps have already run. Whatever a step leaves out goes back to the lab's own start.
 */
export const LinregStoryStep = z.object({
  kicker: Short(40),
  title: Short(70),
  body: StoryText,
  show: z.enum(LINREG_SHOW),
  line: LineSpec.optional(),
  /** Draw the least-squares line instead of `line`. */
  best: z.boolean().optional(),
  dataset: z.enum(LINREG_DATASETS).optional(),
  panel: z.enum(LINREG_PANELS).optional(),
  learningRate: z.number().positive().max(2).optional(),
  scaled: z.boolean().optional(),
  /** Gradient-descent steps already taken from `line` when the step opens. */
  steps: z.number().int().min(0).max(1000).optional(),
  /** Mark the prediction at this x. */
  predict: Num.optional(),
});

/**
 * The linear regression lab: points, a line the student can move, the residuals and their
 * squares, live MSE, RMSE, MAE and R², a table that works every prediction out, the closed-form
 * least-squares working, gradient descent one step at a time (raw or standardised feature) and a
 * residual plot. The lesson's own `points` form the "custom" dataset; "outlier" adds one extreme
 * point, and "curved" and "funnel" are fixed generated patterns that each break one assumption.
 * Numbers follow NumPy and scikit-learn.
 */
export const LinregLabParams = z
  .object({
    xLabel: Short(40),
    yLabel: Short(40),
    /** Short lower-case names for sentences, for example "years" and "salary". */
    xName: Short(20),
    yName: Short(20),
    points: z.array(XY).min(4).max(20),
    /** The extra point of the "outlier" dataset. */
    outlier: XY.optional(),
    xRange: Span,
    yRange: Span,
    /** The line when the lab opens, and how far its two sliders reach. */
    line: LineSpec,
    slope: SliderSpan,
    intercept: SliderSpan,
    datasets: z.array(z.enum(LINREG_DATASETS)).min(1).max(4),
    defaultDataset: z.enum(LINREG_DATASETS),
    /** Learning rates offered for the raw feature and for the standardised one. */
    learningRates: z.array(z.number().positive().max(2)).min(1).max(5),
    scaledLearningRates: z.array(z.number().positive().max(2)).max(5).default([]),
    /** Panels available under the picture in free play (a story step names its own). */
    panels: z.array(z.enum(LINREG_PANELS)).max(4).default(['calculation']),
    controls: z.array(z.enum(LINREG_CONTROLS)).max(5).default([]),
    tasks: ExplorerTasks,
  })
  .refine((p) => p.datasets.includes(p.defaultDataset), 'The default dataset must be offered')
  .refine((p) => new Set(p.datasets).size === p.datasets.length, 'List each dataset once')
  .refine(
    (p) => !p.datasets.includes('outlier') || p.outlier !== undefined,
    'The outlier dataset needs its extra point',
  )
  .refine(
    (p) =>
      [...p.points, ...(p.outlier ? [p.outlier] : [])].every(
        (q) =>
          q.x >= p.xRange.min && q.x <= p.xRange.max && q.y >= p.yRange.min && q.y <= p.yRange.max,
      ),
    'Every point must lie inside the axis ranges',
  );

export const MULTI_VIEWS = ['features', 'curve'] as const;
export const MULTI_PANELS = ['table', 'working', 'scores'] as const;
/** The second column: one that adds information, or one that merely repeats the first. */
export const MULTI_SECOND = ['extra', 'duplicate'] as const;

/**
 * One step of the lab that goes beyond a single feature. A step picks the view — a table of rows
 * with one weight per feature, or a curve fitted to bending data — and sets what the picture
 * shows: which columns are in the model, the weights, the degree, and whether half the points are
 * held back for scoring. Whatever a step leaves out goes back to the lab's own start.
 */
export const LinregMultiStoryStep = z.object({
  kicker: Short(40),
  title: Short(70),
  body: StoryText,
  view: z.enum(MULTI_VIEWS),
  /** How many columns are in the model: 1 is the first alone, 2 adds the second. */
  features: z.number().int().min(1).max(2).optional(),
  second: z.enum(MULTI_SECOND).optional(),
  /** Weights and intercept set by hand; `best` fits them exactly instead. */
  weights: z.array(Num).max(2).optional(),
  intercept: Num.optional(),
  best: z.boolean().optional(),
  /** Work one row's prediction out in full, by its position in `rows`. */
  row: z.number().int().min(0).max(19).optional(),
  panel: z.enum(MULTI_PANELS).optional(),
  /** The polynomial degree of the fitted curve. */
  degree: z.number().int().min(1).max(9).optional(),
  /** Score the curve on points it never saw: every second one is held back. */
  holdOut: z.boolean().optional(),
});

/**
 * The lab beyond one feature. Its table view fits one weight per column, by hand or exactly, and
 * reports MSE, R² and adjusted R², so a feature that does not earn its place can be caught. Its
 * curve view adds powers of x as further columns and scores each degree on points the fit never
 * saw, which is under- and overfitting in one picture. Numbers follow NumPy and scikit-learn.
 */
export const LinregMultiLabParams = z
  .object({
    yLabel: Short(40),
    yName: Short(20),
    /** The two feature columns, in model order. */
    columns: z.array(z.object({ label: Short(40), name: Short(20) })).length(2),
    rows: z
      .array(z.object({ x1: Num, x2: Num, y: Num }))
      .min(4)
      .max(12),
    /** The column that duplicates the first, one value per row, for the collinearity step. */
    duplicate: z.array(Num).optional(),
    duplicateLabel: Short(40).optional(),
    /** Its short lower-case name, for sentences and narrow tables, such as "months". */
    duplicateName: Short(20).optional(),
    /** How far the weight and intercept sliders reach. */
    weight: SliderSpan,
    intercept: SliderSpan,
    /** The bending data of the curve view, and the axes it is drawn on. */
    curve: z.array(XY).min(6).max(24),
    xRange: Span,
    yRange: Span,
    /** The degrees offered in the curve view, lowest first. */
    degrees: z.array(z.number().int().min(1).max(9)).min(2).max(6),
    tasks: ExplorerTasks,
  })
  .refine(
    (p) => p.duplicate === undefined || p.duplicate.length === p.rows.length,
    'Give one duplicated value per row',
  )
  .refine(
    (p) =>
      p.duplicate === undefined ||
      (p.duplicateLabel !== undefined && p.duplicateName !== undefined),
    'Name the duplicated column, long and short',
  )
  .refine(
    (p) => p.degrees.every((d, i) => i === 0 || d > (p.degrees[i - 1] ?? 0)),
    'List the degrees lowest first, each one once',
  )
  .refine(
    (p) =>
      p.curve.every(
        (q) =>
          q.x >= p.xRange.min && q.x <= p.xRange.max && q.y >= p.yRange.min && q.y <= p.yRange.max,
      ),
    'Every curve point must lie inside the axis ranges',
  );

export const LOGREG_VIEWS = ['curve', 'plane'] as const;
/** How much of the one-feature picture is drawn: each level adds to the one before. */
export const LOGREG_SHOW = ['points', 'line', 'sigmoid', 'threshold'] as const;
export const LOGREG_PANELS = ['table', 'descent', 'confusion', 'roc'] as const;

const Label01 = z.union([z.literal(0), z.literal(1)]);

/**
 * One step of a logistic regression lab story. Besides its words it sets the picture: the view
 * (a probability curve over one feature, or a boundary over two), how much is drawn, the weights
 * (given, fitted by maximum likelihood, or fitted the way scikit-learn does by default), the
 * threshold, which panel sits under the picture, and for gradient descent the learning rate and
 * the steps already run. Whatever a step leaves out goes back to the lab's own start.
 */
export const LogregStoryStep = z.object({
  kicker: Short(40),
  title: Short(70),
  body: StoryText,
  view: z.enum(LOGREG_VIEWS),
  show: z.enum(LOGREG_SHOW).optional(),
  weights: z.array(Num).max(2).optional(),
  intercept: Num.optional(),
  /** Fit by maximum likelihood instead of using `weights`. */
  best: z.boolean().optional(),
  /** Fit with scikit-learn's default L2 penalty (C = 1) instead. */
  penalised: z.boolean().optional(),
  threshold: z.number().min(0.01).max(0.99).optional(),
  panel: z.enum(LOGREG_PANELS).optional(),
  /** Work one row out in full, by its position in the data. */
  row: z.number().int().min(0).max(29).optional(),
  learningRate: z.number().positive().max(5).optional(),
  /** Gradient-descent steps already taken from the step's weights when it opens. */
  steps: z.number().int().min(0).max(5000).optional(),
});

/**
 * The logistic regression lab. Its curve view turns a linear score into a probability with the
 * sigmoid, shows every row's score, probability and log loss, runs gradient descent on that loss
 * one step at a time, and counts the confusion matrix as the threshold moves. Its plane view
 * draws the decision boundary of a two-feature model. Numbers follow scikit-learn.
 */
export const LogregLabParams = z
  .object({
    xLabel: Short(40),
    /** Short lower-case names for sentences, such as "hours". */
    xName: Short(20),
    /** What a 1 and a 0 mean, such as "cleared" and "did not clear". */
    positive: Short(24),
    negative: Short(24),
    points: z
      .array(z.object({ x: Num, y: Label01 }))
      .min(4)
      .max(20),
    xRange: Span,
    /** The second feature and the rows of the plane view; empty leaves that view out. */
    x2Label: Short(40).optional(),
    x2Name: Short(20).optional(),
    plane: z
      .array(z.object({ x1: Num, x2: Num, y: Label01 }))
      .max(24)
      .default([]),
    x2Range: Span.optional(),
    /** How far the weight and intercept sliders reach. */
    weight: SliderSpan,
    intercept: SliderSpan,
    learningRates: z.array(z.number().positive().max(5)).min(1).max(5),
    tasks: ExplorerTasks,
  })
  .refine(
    (p) => p.points.every((q) => q.x >= p.xRange.min && q.x <= p.xRange.max),
    'Every point must lie inside the x range',
  )
  .refine(
    (p) =>
      p.plane.length === 0 ||
      (p.x2Label !== undefined && p.x2Name !== undefined && p.x2Range !== undefined),
    'The plane view needs its second feature named and its range set',
  )
  .refine(
    (p) => new Set(p.points.map((q) => q.y)).size === 2,
    'The data needs rows of both classes',
  );

export const WidgetBody = z.discriminatedUnion('widget', [
  z.object({ widget: z.literal('chunker'), prompt: Rich.optional(), params: ChunkerParams }),
  z.object({
    widget: z.literal('training-explorer'),
    prompt: Rich.optional(),
    params: TrainingExplorerParams,
  }),
  z.object({
    widget: z.literal('optimizer-race'),
    prompt: Rich.optional(),
    params: OptimizerRaceParams,
  }),
  z.object({
    widget: z.literal('activation-explorer'),
    prompt: Rich.optional(),
    params: ActivationExplorerParams,
  }),
  z.object({
    widget: z.literal('outlier-explorer'),
    prompt: Rich.optional(),
    params: OutlierExplorerParams,
  }),
  z.object({
    widget: z.literal('imputation-explorer'),
    prompt: Rich.optional(),
    params: ImputationExplorerParams,
  }),
  z.object({
    widget: z.literal('scaling-explorer'),
    prompt: Rich.optional(),
    params: ScalingExplorerParams,
  }),
  z.object({
    widget: z.literal('pvalue-explorer'),
    prompt: Rich.optional(),
    params: PValueExplorerParams,
  }),
  z.object({
    widget: z.literal('array-index-explorer'),
    prompt: Rich.optional(),
    params: ArrayIndexExplorerParams,
  }),
  z.object({
    widget: z.literal('axis-explorer'),
    prompt: Rich.optional(),
    params: AxisExplorerParams,
  }),
  z.object({
    widget: z.literal('broadcast-explorer'),
    prompt: Rich.optional(),
    params: BroadcastExplorerParams,
  }),
  z.object({
    widget: z.literal('vector-explorer'),
    prompt: Rich.optional(),
    params: VectorExplorerParams,
  }),
  z.object({
    widget: z.literal('matmul-explorer'),
    prompt: Rich.optional(),
    params: MatmulExplorerParams,
  }),
  z.object({
    widget: z.literal('linreg-lab'),
    prompt: Rich.optional(),
    /** The guided steps beside the live picture. Empty: a free sandbox. */
    story: z.array(LinregStoryStep).max(10).default([]),
    params: LinregLabParams,
  }),
  z.object({
    widget: z.literal('linreg-multi'),
    prompt: Rich.optional(),
    story: z.array(LinregMultiStoryStep).max(10).default([]),
    params: LinregMultiLabParams,
  }),
  z.object({
    widget: z.literal('logreg-lab'),
    prompt: Rich.optional(),
    story: z.array(LogregStoryStep).max(10).default([]),
    params: LogregLabParams,
  }),
  z.object({
    widget: z.literal('knn-lab'),
    prompt: Rich.optional(),
    /** The guided steps, read like slides beside the live picture. Empty: a free sandbox. */
    story: z.array(KnnStoryStep).max(10).default([]),
    params: KnnLabParams,
  }),
]);
export type WidgetBody = z.infer<typeof WidgetBody>;

// ───────────── Visuals: animated scenes (vetted renderers; content only fills data) ─────────────

/** Rich text with a tighter length cap, for bubbles and labels that must stay short. */
const RichMax = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((s) => !HTML_TAG.test(s), 'Use markdown, not HTML');

const NoteTone = z.enum(['ok', 'bad', 'info']);

/**
 * A mock interview that plays message by message, with a coach's note on the lines that matter.
 * Up to three takes of the same moment (for example a weak and a strong answer) to switch between.
 */
export const ChatScene = z
  .object({
    type: z.literal('chat'),
    interviewer: Short(40).default('Interviewer'),
    candidate: Short(40).default('You'),
    takes: z
      .array(
        z.object({
          label: Short(40),
          tone: NoteTone.default('info'),
          messages: z
            .array(
              z.object({
                from: z.enum(['interviewer', 'candidate']),
                text: RichMax(900),
                note: z.object({ tone: NoteTone, text: Short(160) }).optional(),
              }),
            )
            .min(1)
            .max(12),
          /** Shown when the take finishes: what this answer did well or badly. */
          verdict: z.object({ tone: NoteTone, text: Rich }).optional(),
        }),
      )
      .min(1)
      .max(3),
  })
  .superRefine((s, ctx) => {
    const labels = s.takes.map((t) => t.label);
    if (new Set(labels).size !== labels.length)
      ctx.addIssue({ code: 'custom', message: 'Each take needs its own label' });
  });

/**
 * One passage (an answer, a prompt, a query) taken apart: each part is colour-coded and plays in
 * order, optionally on a timeline when the parts have durations (e.g. a 60-second introduction).
 */
export const AnatomyScene = z
  .object({
    type: z.literal('anatomy'),
    heading: Short(80).optional(),
    parts: z
      .array(
        z.object({
          label: Short(40),
          /** The words of this part, as the student would say or write them. */
          text: RichMax(700),
          /** Why this part is there, shown while it plays. */
          note: Rich.optional(),
          seconds: z.number().int().min(1).max(300).optional(),
        }),
      )
      .min(2)
      .max(5),
  })
  .superRefine((s, ctx) => {
    const timed = s.parts.filter((p) => p.seconds !== undefined).length;
    if (timed !== 0 && timed !== s.parts.length)
      ctx.addIssue({ code: 'custom', message: 'Give every part a duration, or none' });
  });

const Cell = z.string().trim().min(1).max(12);
const At = z.number().int().min(0);

/**
 * A row of boxes that changes frame by frame: number patterns, pointers moving through an array,
 * a window sliding, values being swapped or revealed.
 */
export const ArrayScene = z
  .object({
    type: z.literal('array'),
    label: Short(60).optional(),
    cells: z.array(Cell).min(2).max(16),
    frames: z
      .array(
        z.object({
          title: Short(80),
          narration: Rich,
          /** Cell values in this frame (same length as `cells`), e.g. to reveal or swap them. */
          values: z.array(Cell).optional(),
          highlight: z.array(At).max(16).default([]),
          tone: z.enum(['brand', 'ok', 'bad']).default('brand'),
          pointers: z
            .array(z.object({ index: At, label: z.string().trim().min(1).max(10) }))
            .max(4)
            .default([]),
          /** Labels between neighbouring cells, e.g. "+4" between cell 0 and cell 1. */
          gaps: z
            .array(z.object({ after: At, label: z.string().trim().min(1).max(10) }))
            .max(15)
            .default([]),
          window: z.object({ from: At, to: At, label: Short(30).optional() }).optional(),
        }),
      )
      .min(1)
      .max(12),
  })
  .superRefine((s, ctx) => {
    const n = s.cells.length;
    s.frames.forEach((f, i) => {
      const bad = (message: string) =>
        ctx.addIssue({ code: 'custom', message: `Frame ${i + 1}: ${message}` });
      if (f.values && f.values.length !== n) bad(`values must have ${n} cells`);
      if (f.highlight.some((h) => h >= n)) bad('highlights a cell that does not exist');
      if (f.pointers.some((p) => p.index >= n)) bad('points at a cell that does not exist');
      if (f.gaps.some((g) => g.after >= n - 1)) bad('labels a gap that does not exist');
      if (f.window && (f.window.from > f.window.to || f.window.to >= n))
        bad('the window is outside the row');
    });
  });

export const VisualScene = z.discriminatedUnion('type', [ChatScene, AnatomyScene, ArrayScene]);
export type VisualScene = z.infer<typeof VisualScene>;

export const VisualBody = z.object({
  scene: VisualScene,
  caption: Short(200).optional(),
  /** What the animation shows, in words, for screen readers and reduced-motion users. */
  altText: Short(600),
});

// ───────────── Slides: a PPT-style deck with visuals and small try-it moments ─────────────

const lineCountOf = (code: string) => code.split('\n').length;
const ShortCode = (maxLines: number) =>
  Code.refine((c) => lineCountOf(c) <= maxLines, `Keep it to ${maxLines} lines`);

/** The picture on a slide: built from vetted shapes and icons, so it is crisp and themeable. */
export const SlideVisual = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('icons'),
    items: z
      .array(z.object({ icon: SlideIcon, label: Short(36), sub: Short(70).optional() }))
      .min(1)
      .max(6),
  }),
  z.object({ type: z.literal('emoji'), emoji: Emoji, caption: Short(48).optional() }),
  z.object({
    type: z.literal('stat'),
    value: Short(14),
    label: Short(90),
    sub: Short(90).optional(),
  }),
  z.object({
    type: z.literal('flow'),
    steps: z
      .array(z.object({ label: Short(30), icon: SlideIcon.optional() }))
      .min(2)
      .max(5),
  }),
  /** A row of terms, like a number series or a list, with the step between neighbours. */
  z
    .object({
      type: z.literal('sequence'),
      terms: z.array(Short(8)).min(2).max(8),
      /** One label per step between neighbours ("+5", "×3"); "" leaves a step unlabelled. */
      ops: z.array(z.string().trim().max(8)).default([]),
      /** The last term is the answer: it is highlighted and appears after the steps. */
      answer: z.boolean().default(false),
    })
    .refine(
      (v) => v.ops.length === 0 || v.ops.length === v.terms.length - 1,
      'Give one step label per pair of neighbours (one fewer than the terms), or none',
    ),
  /** A small worked table: one row per example, so a result can be traced cell by cell. */
  z
    .object({
      type: z.literal('table'),
      columns: z.array(Short(28)).min(2).max(6),
      cells: z
        .array(z.array(Short(28)).min(2).max(6))
        .min(1)
        .max(10),
      /** A closing row set apart from the rest: the totals, or the result. */
      totals: z.array(Short(28)).min(2).max(6).optional(),
      /** The column being introduced (counted from 0); it is tinted. */
      highlight: z.number().int().min(0).max(5).optional(),
    })
    .refine(
      (v) =>
        v.cells.every((r) => r.length === v.columns.length) &&
        (v.totals === undefined || v.totals.length === v.columns.length),
      'Give every row one cell per column',
    ),
  z.object({
    type: z.literal('compare'),
    left: z.object({ title: Short(32), items: z.array(Short(90)).min(1).max(4) }),
    right: z.object({ title: Short(32), items: z.array(Short(90)).min(1).max(4) }),
    /** Which side is the one to follow ("none" for a neutral comparison). */
    better: z.enum(['left', 'right', 'none']).default('right'),
  }),
  z.object({
    type: z.literal('code'),
    code: ShortCode(14),
    language: CodeLanguage.default('python'),
    /** What it prints (checked by running it, like every code sample). */
    output: z.string().max(600).optional(),
    filename: Short(30).optional(),
  }),
  z.object({
    type: z.literal('chat'),
    lines: z
      .array(z.object({ from: z.enum(['interviewer', 'candidate']), text: RichMax(200) }))
      .min(1)
      .max(4),
  }),
  z.object({
    type: z.literal('checklist'),
    items: z
      .array(z.object({ text: Short(90), ok: z.boolean() }))
      .min(2)
      .max(6),
  }),
  z.object({ type: z.literal('quote'), text: RichMax(220), by: Short(60).optional() }),
]);
export type SlideVisual = z.infer<typeof SlideVisual>;

/**
 * A small, ungraded try-it moment inside a slide (a warm-up, not a knowledge check, so its
 * feedback travels to the browser with the slide).
 */
export const SlideTry = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('choice'),
      prompt: RichMax(220),
      options: z
        .array(z.object({ text: RichMax(170), correct: z.boolean(), feedback: RichMax(240) }))
        .min(2)
        .max(4),
    })
    .refine((t) => t.options.some((o) => o.correct), 'Mark at least one option as correct'),
  z.object({
    type: z.literal('code'),
    prompt: RichMax(220),
    starter: ShortCode(16),
    /** Text the output should contain when it works (checked by running the solution). */
    expected: Short(200).optional(),
    hint: RichMax(200).optional(),
    packages: z.array(PythonPackage).default([]),
  }),
  z.object({
    type: z.literal('write'),
    prompt: RichMax(220),
    placeholder: Short(100).optional(),
    /** A good answer to compare with, shown after the student writes theirs. */
    sample: RichMax(700),
  }),
]);
export type SlideTry = z.infer<typeof SlideTry>;

export const Slide = z
  .object({
    /** A small label above the headline, e.g. "Rule 1" or "Myth". */
    kicker: Short(40).optional(),
    title: Short(80),
    body: RichMax(280).optional(),
    /** Bullets that build in one by one, like a presentation. */
    points: z.array(RichMax(120)).max(4).default([]),
    visual: SlideVisual.optional(),
    /** A moving picture beside the headline (it can sit with a code or other visual below). */
    animation: AnimationRef.optional(),
    try: SlideTry.optional(),
    /** A one-line tip shown at the foot of the slide. */
    note: RichMax(180).optional(),
    /**
     * What the narrator says in play mode, in place of the script built from the slide. Spoken
     * English that explains the slide; every code slide has one, so code is never read out.
     */
    narration: z.string().trim().min(20).max(700).optional(),
    accent: z.enum(['g0', 'g1', 'g2', 'g3', 'g4']).optional(),
  })
  .refine(
    (s) => s.body || s.points.length > 0 || s.visual || s.animation || s.try,
    'A slide needs a body, points, a visual, an animation or a try-it',
  );
export type Slide = z.infer<typeof Slide>;

export const SlidesBody = z
  .object({ slides: z.array(Slide).min(2).max(12) })
  .refine(
    (b) => b.slides.filter((s) => s.try).length <= 4,
    'At most four try-it slides per deck, so it stays a walkthrough',
  );

// ───────────── Knowledge checks (graded on the server) ─────────────

const Option = z.object({ id: ContentKey, text: Rich });
const ids = (opts: Array<{ id: string }>) => new Set(opts.map((o) => o.id));

export const CheckItem = z
  .discriminatedUnion('type', [
    z.object({
      key: ContentKey,
      type: z.literal('mcq'),
      prompt: Rich,
      options: z.array(Option).min(2).max(6),
      answer: z.object({ correct: z.array(ContentKey).length(1) }),
      explanation: Rich,
    }),
    z.object({
      key: ContentKey,
      type: z.literal('multi'),
      prompt: Rich,
      options: z.array(Option).min(2).max(6),
      answer: z.object({ correct: z.array(ContentKey).min(1) }),
      explanation: Rich,
    }),
    z.object({
      key: ContentKey,
      type: z.literal('fill_blank'),
      prompt: Rich.optional(),
      /** Text with blanks, e.g. "Overlap repeats the last {{b1}} words." */
      template: Short(400),
      answer: z.record(ContentKey, z.array(Short(60)).min(1)),
      explanation: Rich,
    }),
    z.object({
      key: ContentKey,
      type: z.literal('predict_output'),
      prompt: Rich.optional(),
      language: CodeLanguage,
      code: Code,
      options: z.array(Option).min(2).max(6),
      answer: z.object({ correct: z.array(ContentKey).length(1) }),
      explanation: Rich,
    }),
    z.object({
      key: ContentKey,
      type: z.literal('order_steps'),
      prompt: Rich,
      steps: z.array(Option).min(3).max(8),
      answer: z.object({ order: z.array(ContentKey) }),
      explanation: Rich,
    }),
    z.object({
      key: ContentKey,
      type: z.literal('reasoning'),
      prompt: Rich,
      modelAnswer: Rich,
      rubric: z.array(Short(200)).min(1).max(6),
    }),
  ])
  .superRefine((item, ctx) => {
    if (item.type === 'mcq' || item.type === 'multi' || item.type === 'predict_output') {
      const known = ids(item.options);
      if (known.size !== item.options.length)
        ctx.addIssue({ code: 'custom', message: 'Option ids must be unique' });
      if (item.answer.correct.some((c) => !known.has(c))) {
        ctx.addIssue({ code: 'custom', message: 'The answer must be one of the options' });
      }
    }
    if (item.type === 'order_steps') {
      const known = ids(item.steps);
      const order = item.answer.order;
      if (
        order.length !== item.steps.length ||
        new Set(order).size !== order.length ||
        order.some((o) => !known.has(o))
      ) {
        ctx.addIssue({
          code: 'custom',
          message: 'The answer order must use every step exactly once',
        });
      }
    }
    if (item.type === 'fill_blank') {
      const blanks = [...item.template.matchAll(/\{\{([a-z0-9-]+)\}\}/g)].map((m) => m[1]);
      const keys = Object.keys(item.answer);
      if (
        blanks.length === 0 ||
        blanks.some((b) => !keys.includes(b as string)) ||
        keys.length !== blanks.length
      ) {
        ctx.addIssue({
          code: 'custom',
          message: 'Every {{blank}} needs an answer, and only those',
        });
      }
    }
  });
export type CheckItem = z.infer<typeof CheckItem>;

/** The most questions a quiz pool may hold, and the most one attempt may draw from it. */
export const QUIZ_POOL_MAX = 24;
export const QUIZ_DRAW_MAX = 10;

export const KnowledgeCheckBody = z
  .object({
    items: z.array(CheckItem).min(1).max(QUIZ_POOL_MAX),
    /**
     * Makes the check a quiz with a pool: each attempt shows this many questions, drawn afresh
     * from `items`, so a second attempt is not a memory test of the first. Left out, every
     * question is shown, as before.
     */
    draw: z.number().int().min(1).max(QUIZ_DRAW_MAX).optional(),
  })
  .refine(
    (b) => new Set(b.items.map((i) => i.key)).size === b.items.length,
    'Item keys must be unique',
  )
  .refine(
    (b) => (b.draw === undefined ? b.items.length <= 6 : b.draw < b.items.length),
    'A check shows at most 6 questions at once; a quiz pool must hold more questions than it draws',
  );

export const PlaygroundBody = z.object({
  language: CodeLanguage,
  instructions: Rich,
  starterCode: Code,
  hints: z.array(Rich).max(5).default([]),
  solution: Code,
  checks: z
    .array(z.object({ type: z.literal('stdout_contains'), value: Short(200), label: Short(120) }))
    .min(1)
    .max(6),
  packages: z.array(PythonPackage).default([]),
});

export const CalloutBody = z.object({
  tone: z.enum(['interview_tip', 'misconception', 'pitfall', 'real_world', 'remember']),
  title: Short(80),
  body: Rich,
});

export const InterviewPlaybookBody = z.object({
  question: Rich,
  totalMinutes: z.number().int().min(1).max(60).optional(),
  steps: z
    .array(
      z.object({ title: Short(80), minutes: z.number().min(0).max(30).optional(), detail: Rich }),
    )
    .min(2)
    .max(8),
  followUps: z.array(Short(200)).max(6).default([]),
});

export const SummaryBody = z.object({
  takeaways: z.array(Rich).min(1).max(8),
  remember: z.array(Short(160)).max(6).default([]),
});

// ───────────── Section envelope ─────────────

const envelope = {
  key: ContentKey,
  title: Short(100).optional(),
  /** The minimum target depth that sees this section. */
  depthRank: DepthRank,
  /** Variant group: of the sections sharing a slot, the deepest one at or below the student's depth is shown. */
  slotKey: ContentKey.optional(),
  /** Role slugs (e.g. "ai-engineer"); empty means every role. Slugs keep content portable. */
  roleScope: z
    .array(
      z
        .string()
        .regex(/^[a-z0-9-]+$/)
        .max(60),
    )
    .max(10)
    .default([]),
  /** Concept keys from the curriculum, e.g. "rag.chunking.size-overlap". */
  conceptKeys: z.array(z.string().min(1).max(120)).max(12).default([]),
  /** Computed from the content when omitted. */
  estimatedMinutes: z.number().int().min(1).max(60).optional(),
};

export const Section = z.discriminatedUnion('kind', [
  z.object({ ...envelope, kind: z.literal('HOOK'), body: HookBody }),
  z.object({ ...envelope, kind: z.literal('EXPLANATION'), body: ExplanationBody }),
  z.object({ ...envelope, kind: z.literal('CARD_DECK'), body: CardDeckBody }),
  z.object({ ...envelope, kind: z.literal('DIAGRAM'), body: DiagramBody }),
  z.object({ ...envelope, kind: z.literal('VISUAL'), body: VisualBody }),
  z.object({ ...envelope, kind: z.literal('SLIDES'), body: SlidesBody }),
  z.object({ ...envelope, kind: z.literal('CODE_EXAMPLE'), body: CodeExampleBody }),
  z.object({ ...envelope, kind: z.literal('CODE_EXPLORER'), body: CodeExplorerBody }),
  z.object({ ...envelope, kind: z.literal('WIDGET'), body: WidgetBody }),
  z.object({ ...envelope, kind: z.literal('KNOWLEDGE_CHECK'), body: KnowledgeCheckBody }),
  z.object({ ...envelope, kind: z.literal('PLAYGROUND'), body: PlaygroundBody }),
  z.object({ ...envelope, kind: z.literal('CALLOUT'), body: CalloutBody }),
  z.object({ ...envelope, kind: z.literal('INTERVIEW_PLAYBOOK'), body: InterviewPlaybookBody }),
  z.object({ ...envelope, kind: z.literal('SUMMARY'), body: SummaryBody }),
]);
export type Section = z.infer<typeof Section>;
export type SectionKind = Section['kind'];
export const SECTION_KINDS = Section.options.map((o) => o.shape.kind.value) as SectionKind[];

export const Objective = z.object({ key: ContentKey, text: Short(200), minDepthRank: DepthRank });
export type Objective = z.infer<typeof Objective>;

/** A whole lesson as authored, imported or generated. */
export const LessonDocument = z
  .object({
    title: Short(100),
    subtitle: Short(200).optional(),
    objectives: z.array(Objective).min(1).max(12),
    sections: z.array(Section).min(1).max(60),
  })
  .superRefine((d, ctx) => {
    const keys = d.sections.map((s) => s.key);
    const dup = keys.find((k, i) => keys.indexOf(k) !== i);
    if (dup)
      ctx.addIssue({
        code: 'custom',
        message: `Section key "${dup}" is used twice`,
        path: ['sections'],
      });
    const slots = new Map<string, number[]>();
    for (const s of d.sections) {
      if (s.slotKey) slots.set(s.slotKey, [...(slots.get(s.slotKey) ?? []), s.depthRank]);
    }
    for (const [slot, ranks] of slots) {
      if (new Set(ranks).size !== ranks.length) {
        ctx.addIssue({
          code: 'custom',
          message: `Slot "${slot}" has two variants at the same depth`,
          path: ['sections'],
        });
      }
    }
  });
export type LessonDocument = z.infer<typeof LessonDocument>;

/** The authored shape (defaults not yet applied), e.g. for exemplar files. */
export type LessonDocumentInput = z.input<typeof LessonDocument>;
