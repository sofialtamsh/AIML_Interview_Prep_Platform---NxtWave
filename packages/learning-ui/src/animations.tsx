/**
 * Moving pictures for lessons: small looping diagrams (SVG + SMIL), drawn in the platform's
 * colours and type, so they stay crisp, cost nothing to load and follow light and dark themes.
 * Content picks one by name (ANIMATIONS in @app/content); it never ships drawing code.
 *
 * Every element's plain attributes are the picture's final, most telling frame. The animations
 * play the story towards it, and are dropped when the student prefers reduced motion.
 */
import { ANIMATIONS, type AnimationName } from '@app/content';
import { cn } from '@app/ui';
import { type ReactNode, useContext, useId } from 'react';
import { KNN_LIBRARY } from './anim/knn';
import { LINREG_LIBRARY } from './anim/linreg';
import { LOGREG_LIBRARY } from './anim/logreg';
import {
  Anim,
  AnimCtx,
  Arrow,
  type BOX,
  Box,
  Chip,
  drawKeys,
  FADE,
  type Keys,
  Markers,
  Move,
  type Pt,
  Show,
  Spin,
  T,
  TONE,
  Travel,
  useReducedMotion,
} from './anim-kit';
import { polyFit, splitHalves } from './linreg-multi';
import { sigmoid } from './logreg';

// ───────────── Python ─────────────

function NameTags() {
  const code = ['a = [1, 2, 3]', 'b = a', 'b.append(4)', 'print(a)    # [1, 2, 3, 4]'];
  return (
    <>
      <Box x={10} y={8} w={300} h={28} r={7} tone="soft" />
      <T x={20} y={26} anchor="start" mono size={11}>
        &gt;&gt;&gt;
      </T>
      {code.map((c, i) => (
        <Show
          key={c}
          from={i * 0.25}
          to={i === 3 ? undefined : (i + 1) * 0.25 - FADE}
          final={i === 3}
        >
          <T x={46} y={26} anchor="start" mono size={11.5} tone="ink">
            {c}
          </T>
        </Show>
      ))}
      <T x={226} y={62} size={9} mono>
        one list in memory
      </T>
      <Box x={150} y={68} w={152} h={46} r={10} tone="brand" width={1.5} />
      {['1', '2', '3'].map((v, i) => (
        <Chip key={v} x={158 + i * 36} y={77} w={30} h={28} label={v} size={12} />
      ))}
      <Show from={0.5}>
        <Move
          keys={[
            [0, [0, -36]],
            [0.5, [0, -36]],
            [0.56, [0, 0]],
          ]}
        >
          <Chip x={266} y={77} w={30} h={28} label="4" tone="ok" text="ok" size={12} />
        </Move>
      </Show>
      {/* Two name tags */}
      <Box x={18} y={58} w={60} h={28} r={14} tone="ink" />
      <T x={48} y={77} size={13} tone="surface" mono bold>
        a
      </T>
      <Arrow x1={80} y1={72} x2={146} y2={84} />
      <Show from={0.25}>
        <Box x={18} y={110} w={60} h={28} r={14} tone="ink" />
        <T x={48} y={129} size={13} tone="surface" mono bold>
          b
        </T>
        <Arrow x1={80} y1={124} x2={146} y2={102} />
      </Show>
      <Show from={0.75}>
        <Arrow x1={80} y1={72} x2={146} y2={84} tone="brand" width={2} />
        <Arrow x1={80} y1={124} x2={146} y2={102} tone="brand" width={2} />
        <T x={160} y={164} size={11} tone="ok">
          Two names, one list: a change through b shows in a
        </T>
      </Show>
    </>
  );
}

function Lock({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path
        d={`M${x + 3} ${y} v-3 a4 4 0 0 1 8 0 v3`}
        strokeWidth={1.6}
        className="fill-none stroke-muted"
      />
      <rect x={x} y={y} width={14} height={11} rx={2} className="fill-muted" />
    </g>
  );
}

function ListVsTuple() {
  return (
    <>
      <T x={22} y={21} anchor="start" mono bold size={12} tone="brand">
        list
      </T>
      <T x={58} y={21} anchor="start" size={10}>
        can change
      </T>
      <Box x={12} y={30} w={140} h={104} r={12} />
      <Chip x={26} y={42} w={112} label="'milk'" />
      <Chip x={26} y={72} w={112} label="'bread'" />
      <Show from={0.2}>
        <Move
          keys={[
            [0, [-30, 0]],
            [0.2, [-30, 0]],
            [0.28, [0, 0]],
          ]}
        >
          <Chip x={26} y={102} w={112} label="'eggs'" tone="ok" text="ok" />
        </Move>
      </Show>
      <T x={82} y={152} mono size={10}>
        cart.append('eggs')
      </T>
      <Show from={0.3}>
        <T x={82} y={170} size={10} tone="ok">
          ✓ changed in place
        </T>
      </Show>

      <T x={178} y={21} anchor="start" mono bold size={12} tone="brand">
        tuple
      </T>
      <T x={222} y={21} anchor="start" size={10}>
        fixed once made
      </T>
      <Box x={168} y={30} w={140} h={104} r={12} />
      <Lock x={286} y={44} />
      <Chip x={180} y={72} w={116} h={26} label="(12.97, 77.59)" tone="soft" size={11} />
      <Show from={0.56} to={0.66} final={false}>
        <Box x={168} y={30} w={140} h={104} r={12} tone="ringBad" width={2} />
      </Show>
      <Show from={0.45} to={0.72} final={false}>
        <Move
          keys={[
            [0, [110, 0]],
            [0.45, [110, 0]],
            [0.56, [0, 0]],
            [0.6, [0, 0]],
            [0.7, [60, 0]],
          ]}
        >
          <Chip x={218} y={104} w={40} label="13.0" tone="bad" text="bad" />
        </Move>
      </Show>
      <T x={238} y={152} mono size={10}>
        pin[0] = 13.0
      </T>
      <Show from={0.58}>
        <T x={238} y={170} size={10} tone="bad">
          ✗ TypeError
        </T>
      </Show>
    </>
  );
}

function SetDedupe() {
  const tags = ['#python', '#ml', '#python', '#ai', '#ml'];
  const slot: Record<string, number> = { '#python': 72, '#ml': 131, '#ai': 190 };
  const seen = new Set<string>();
  return (
    <>
      <T x={12} y={16} anchor="start" mono size={10}>
        tags = [ … ]
      </T>
      <Box x={40} y={96} w={240} h={48} r={24} tone="brand" width={1.5} />
      <T x={54} y={128} mono size={22} tone="brand">
        {'{'}
      </T>
      <T x={266} y={128} mono size={22} tone="brand">
        {'}'}
      </T>
      {tags.map((tag, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed list with repeats
        <g key={`ghost-${i}`} opacity={0.4}>
          <rect
            x={12 + i * 61}
            y={26}
            width={58}
            height={22}
            rx={6}
            strokeDasharray="3 3"
            className="fill-none stroke-line-2"
          />
          <T x={41 + i * 61} y={41} mono size={10.5}>
            {tag}
          </T>
        </g>
      ))}
      {tags.map((tag, i) => {
        const x0 = 12 + i * 61;
        const s = 0.06 + i * 0.15;
        const dup = seen.has(tag);
        seen.add(tag);
        const target = slot[tag] ?? 0;
        const dx = dup ? 0 : target - x0;
        const dy = dup ? 46 : 83;
        const moved: ReadonlyArray<readonly [number, Pt]> = [
          [0, [0, 0]],
          [s, [0, 0]],
          [s + 0.07, [dx, dy]],
        ];
        return dup ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed list
          <Show key={i} to={s + 0.13} final={false}>
            <Move keys={moved} at={[dx, dy]}>
              <Chip x={x0} y={26} w={58} label={tag} />
              <Show from={s + 0.07} final={false}>
                <Box x={x0} y={26} w={58} h={22} r={6} tone="ringBad" width={2} />
              </Show>
            </Move>
          </Show>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed list
          <Move key={i} keys={moved} at={[dx, dy]}>
            <Chip x={x0} y={26} w={58} label={tag} />
          </Move>
        );
      })}
      <Show from={0.82}>
        <T x={160} y={170} mono size={10} tone="ink">
          len(set(tags)) → 3 unique tags
        </T>
      </Show>
    </>
  );
}

function DictLookup() {
  const rows = [
    ['"Asha"', '98450 11223'],
    ['"Ravi"', '91234 56789'],
    ['"Meena"', '99887 66554'],
  ] as const;
  return (
    <>
      <Box x={118} y={18} w={190} h={128} r={12} />
      <T x={132} y={38} anchor="start" mono size={11}>
        contacts
      </T>
      <line x1={118} y1={46} x2={308} y2={46} className="stroke-line" />
      <Show from={0.32}>
        <Box x={124} y={82} w={178} h={24} r={6} tone="brand" />
      </Show>
      {rows.map(([k, v], i) => (
        <g key={k}>
          <T x={132} y={70 + i * 28} anchor="start" mono size={10.5} tone="ink">
            {k}
          </T>
          <T x={200} y={70 + i * 28} mono size={10.5}>
            →
          </T>
          <T x={214} y={70 + i * 28} anchor="start" mono size={10.5} tone="ink">
            {v}
          </T>
        </g>
      ))}
      <Move
        keys={[
          [0, [-130, 0]],
          [0.08, [-130, 0]],
          [0.25, [0, 0]],
        ]}
      >
        <Chip x={4} y={83} w={106} label='contacts["Ravi"]' tone="ink" text="surface" size={9.5} />
      </Move>
      <Show from={0.45}>
        <T x={213} y={166} mono size={11} tone="brand">
          → "91234 56789"
        </T>
      </Show>
      <Show from={0.5}>
        <T x={60} y={166} size={10} tone="ok">
          found in one step
        </T>
      </Show>
    </>
  );
}

function Gear({ cx, cy }: { cx: number; cy: number }) {
  return (
    <Spin cx={cx} cy={cy} seconds={2.4}>
      <circle cx={cx} cy={cy} r={8} strokeWidth={2} className="fill-none stroke-brand" />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        return (
          <line
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed teeth
            key={i}
            x1={cx + Math.cos(a) * 8}
            y1={cy + Math.sin(a) * 8}
            x2={cx + Math.cos(a) * 12}
            y2={cy + Math.sin(a) * 12}
            strokeWidth={3}
            strokeLinecap="round"
            className="stroke-brand"
          />
        );
      })}
    </Spin>
  );
}

function Ball({
  x,
  y,
  label,
  tone = 'plain',
}: {
  x: number;
  y: number;
  label: string;
  tone?: 'plain' | 'ok';
}) {
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={14}
        strokeWidth={1.5}
        className={tone === 'ok' ? 'fill-ok-bg stroke-ok' : 'fill-surface stroke-line-2'}
      />
      <T x={x} y={y + 4.5} mono bold size={12} tone={tone === 'ok' ? 'ok' : 'ink'}>
        {label}
      </T>
    </g>
  );
}

function FunctionMachine() {
  return (
    <>
      <Show to={0.48 - FADE} final={false}>
        <T x={160} y={26} mono size={11.5} tone="ink">
          square(3) → 9
        </T>
      </Show>
      <Show from={0.5}>
        <T x={160} y={26} mono size={11.5} tone="ink">
          square(5) → 25
        </T>
      </Show>
      <line x1={20} y1={84} x2={118} y2={84} strokeWidth={2} className="stroke-line-2" />
      <line x1={202} y1={84} x2={300} y2={84} strokeWidth={2} className="stroke-line-2" />
      <Show to={0.24} final={false}>
        <Move
          keys={[
            [0, [0, 0]],
            [0.06, [0, 0]],
            [0.22, [100, 0]],
          ]}
        >
          <Ball x={40} y={84} label="3" />
        </Move>
      </Show>
      <Show from={0.5} to={0.72}>
        <Move
          keys={[
            [0, [0, 0]],
            [0.56, [0, 0]],
            [0.7, [100, 0]],
          ]}
        >
          <Ball x={40} y={84} label="5" />
        </Move>
      </Show>
      <Show from={0.28} to={0.48} final={false}>
        <Move
          keys={[
            [0, [-60, 0]],
            [0.28, [-60, 0]],
            [0.4, [0, 0]],
          ]}
        >
          <Ball x={280} y={84} label="9" tone="ok" />
        </Move>
      </Show>
      <Show from={0.76}>
        <Move
          keys={[
            [0, [-60, 0]],
            [0.76, [-60, 0]],
            [0.88, [0, 0]],
          ]}
        >
          <Ball x={280} y={84} label="25" tone="ok" />
        </Move>
      </Show>
      <Box x={118} y={50} w={84} h={68} r={12} tone="brand" width={1.5} />
      <Gear cx={160} cy={74} />
      <T x={160} y={106} mono size={10.5} tone="brand">
        square(x)
      </T>
      <T x={40} y={124} mono size={9.5}>
        argument
      </T>
      <T x={280} y={124} mono size={9.5}>
        return value
      </T>
      <T x={160} y={150} size={10}>
        Same steps every call; only the input changes
      </T>
    </>
  );
}

function DecoratorWrap() {
  const steps = [
    { x: 98, label: '1 before', from: 0.28, to: 0.4 },
    { x: 160, label: '2 run', from: 0.42, to: 0.56 },
    { x: 222, label: '3 after', from: 0.62, to: 0.74 },
  ];
  return (
    <>
      <T x={160} y={18} mono size={10}>
        @log def greet(name): …
      </T>
      <Show from={0.08}>
        <Box x={70} y={30} w={180} h={106} r={16} tone="brand" width={1.5} dashed />
        <T x={82} y={46} anchor="start" mono size={9.5} tone="brand">
          wrapper from @log
        </T>
        <line x1={98} y1={88} x2={98} y2={108} strokeWidth={2} className="stroke-brand" />
        <line x1={222} y1={88} x2={222} y2={108} strokeWidth={2} className="stroke-brand" />
      </Show>
      <Box x={125} y={60} w={70} h={50} r={10} />
      <T x={160} y={82} mono size={11} tone="ink">
        greet()
      </T>
      <Show from={0.42} to={0.56} final={false}>
        <Box x={125} y={60} w={70} h={50} r={10} tone="ringOk" width={2.5} />
      </Show>
      {steps.map((s) => (
        <g key={s.label}>
          <T x={s.x} y={156} mono size={9.5}>
            {s.label}
          </T>
          <Show from={s.from} to={s.to} final={false}>
            <T x={s.x} y={156} mono size={9.5} tone="brand" bold>
              {s.label}
            </T>
          </Show>
        </g>
      ))}
      <Show from={0.16} to={0.8} final={false}>
        <circle cx={300} cy={98} r={5.5} className="fill-g1">
          <Anim
            attr="cx"
            keys={[
              [0, 20],
              [0.18, 20],
              [0.28, 98],
              [0.36, 98],
              [0.42, 160],
              [0.56, 160],
              [0.62, 222],
              [0.7, 222],
              [0.8, 300],
            ]}
          />
        </circle>
      </Show>
      <T x={160} y={174} size={10}>
        Every call goes through the wrapper
      </T>
    </>
  );
}

function ComprehensionFilter() {
  const out = [196, 228, 260];
  return (
    <>
      <T x={160} y={16} mono size={10} tone="ink">
        [x * x for x in nums if x % 2 == 0]
      </T>
      <T x={14} y={46} anchor="start" mono size={9.5}>
        nums
      </T>
      <line
        x1={168}
        y1={38}
        x2={168}
        y2={92}
        strokeWidth={1.5}
        strokeDasharray="4 3"
        className="stroke-brand"
      />
      <T x={168} y={104} mono size={9} tone="brand">
        if x % 2 == 0
      </T>
      <Box x={200} y={48} w={50} h={34} r={8} tone="brand" />
      <T x={225} y={69} mono size={10} tone="brand">
        x * x
      </T>
      <T x={186} y={141} anchor="end" mono size={9.5}>
        result
      </T>
      {[1, 2, 3, 4, 5, 6].map((v, i) => {
        const x0 = 14 + i * 24;
        const s = 0.05 + i * 0.12;
        const dx1 = 156 - x0;
        if (v % 2 === 1) {
          return (
            <Show key={v} to={s + 0.08} final={false}>
              <Move
                keys={[
                  [0, [0, 0]],
                  [s, [0, 0]],
                  [s + 0.05, [dx1, 0]],
                  [s + 0.08, [dx1, 40]],
                ]}
              >
                <Chip x={x0} y={54} w={22} label={String(v)} size={10.5} />
              </Move>
            </Show>
          );
        }
        const j = v / 2 - 1;
        const end: Pt = [(out[j] ?? 0) - x0, 70];
        return (
          <Move
            key={v}
            at={end}
            keys={[
              [0, [0, 0]],
              [s, [0, 0]],
              [s + 0.05, [dx1, 0]],
              [s + 0.08, [214 - x0, 0]],
              [s + 0.11, [214 - x0, 0]],
              [s + 0.15, end],
            ]}
          >
            <Show to={s + 0.1} final={false}>
              <Chip x={x0} y={54} w={22} label={String(v)} size={10.5} />
            </Show>
            <Show from={s + 0.1}>
              <Chip x={x0} y={54} w={26} label={String(v * v)} tone="ok" text="ok" size={10.5} />
            </Show>
          </Move>
        );
      })}
    </>
  );
}

function Meter({
  x,
  y,
  fill,
  tone,
  grow,
}: {
  x: number;
  y: number;
  fill: number;
  tone: 'bad' | 'ok';
  grow?: readonly [number, number];
}) {
  return (
    <g>
      <T x={x} y={y - 6} anchor="start" size={9}>
        memory
      </T>
      <rect x={x} y={y} width={76} height={8} rx={4} className="fill-surface-2 stroke-line" />
      <rect
        x={x}
        y={y}
        width={fill}
        height={8}
        rx={4}
        className={tone === 'bad' ? 'fill-g1' : 'fill-ok'}
      >
        {grow && (
          <Anim
            attr="width"
            keys={[
              [0, 0],
              [grow[0], 0],
              [grow[1], fill],
            ]}
          />
        )}
      </rect>
    </g>
  );
}

function GeneratorBelt() {
  const values = ['0', '1', '4', '9', '16'];
  return (
    <>
      <T x={14} y={18} anchor="start" mono bold size={10.5} tone="ink">
        list
      </T>
      <T x={44} y={18} anchor="start" size={10}>
        builds every item now
      </T>
      <Show from={0.04}>
        {values.map((v, i) => (
          <Chip key={v} x={14 + i * 36} y={28} w={30} h={28} label={v} />
        ))}
      </Show>
      <Meter x={232} y={36} fill={76} tone="bad" grow={[0.04, 0.12]} />

      <T x={14} y={98} anchor="start" mono bold size={10.5} tone="ink">
        generator
      </T>
      <T x={82} y={98} anchor="start" size={10}>
        one item per next()
      </T>
      <line
        x1={14}
        y1={142}
        x2={200}
        y2={142}
        strokeWidth={2}
        strokeDasharray="6 4"
        className="stroke-line-2"
      />
      {[30, 80, 130, 180].map((x) => (
        <circle key={x} cx={x} cy={146} r={3} className="fill-line-2" />
      ))}
      {values.map((v, k) => {
        const s = 0.12 + k * 0.16;
        return (
          <Show key={v} from={s} to={s + 0.15} final={k === 2}>
            <Move
              keys={[
                [0, [0, 0]],
                [s, [0, 0]],
                [s + 0.13, [160, 0]],
              ]}
              at={[80, 0]}
            >
              <Chip x={14} y={108} w={30} h={28} label={v} tone="brand" text="brand" />
            </Move>
          </Show>
        );
      })}
      <T x={110} y={166} mono size={9.5} tone="brand">
        next(gen)
      </T>
      <Meter x={232} y={112} fill={12} tone="ok" />
    </>
  );
}

function TryExceptNet() {
  return (
    <>
      <Box x={10} y={14} w={190} h={34} />
      <T x={20} y={35} anchor="start" mono size={9.5} tone="ink">
        try: amount = int(text)
      </T>
      <Show from={0.05} to={0.25} final={false}>
        <Box x={10} y={14} w={190} h={34} tone="ring" width={2} />
      </Show>
      <Box x={10} y={74} w={190} h={34} />
      <Show from={0.4}>
        <Box x={10} y={74} w={190} h={34} tone="warn" width={1.5} />
      </Show>
      <T x={20} y={95} anchor="start" mono size={9.5} tone="ink">
        except ValueError: ask again
      </T>
      <Box x={10} y={134} w={190} h={34} />
      <Show from={0.7}>
        <Box x={10} y={134} w={190} h={34} tone="ok" width={1.5} />
      </Show>
      <T x={20} y={155} anchor="start" mono size={9.5} tone="ink">
        finally: close_form()
      </T>

      <path
        d="M104 48 V72"
        pathLength={1}
        strokeDasharray="1"
        strokeWidth={2}
        className="fill-none stroke-bad"
      >
        <Anim attr="stroke-dashoffset" keys={drawKeys(0.3, 0.4)} />
      </path>
      <path
        d="M104 108 V132"
        pathLength={1}
        strokeDasharray="1"
        strokeWidth={2}
        className="fill-none stroke-muted"
      >
        <Anim attr="stroke-dashoffset" keys={drawKeys(0.6, 0.7)} />
      </path>
      <Show from={0.3}>
        <T x={112} y={64} anchor="start" mono size={9} tone="bad">
          ValueError
        </T>
      </Show>

      <Chip x={218} y={20} w={96} h={28} label='text = "abc"' tone="soft" size={10} />
      <Show from={0.22}>
        <path d="M209 22 L203 34 L209 34 L205 46 L215 30 L209 30 Z" className="fill-bad" />
      </Show>
      <Show from={0.45}>
        <T x={206} y={88} anchor="start" size={9.5} tone="ok" bold>
          caught
        </T>
        <T x={206} y={101} anchor="start" size={9.5} tone="ok">
          the app keeps running
        </T>
      </Show>
      <Show from={0.72}>
        <T x={206} y={155} anchor="start" size={9.5}>
          runs either way
        </T>
      </Show>
    </>
  );
}

function AsyncWaiter() {
  const axis = (y: number) => (
    <g>
      <line x1={56} y1={y} x2={308} y2={y} className="stroke-line" />
      {['0 s', '1 s', '2 s', '3 s'].map((t, i) => (
        <T key={t} x={56 + i * 84} y={y + 11} mono size={8}>
          {t}
        </T>
      ))}
    </g>
  );
  return (
    <>
      <T x={14} y={16} anchor="start" mono bold size={10} tone="ink">
        one by one
      </T>
      <Show from={0.9}>
        <T x={308} y={16} anchor="end" mono bold size={10.5} tone="bad">
          3 s
        </T>
      </Show>
      {[0, 1, 2].map((k) => (
        <g key={k}>
          <T x={14} y={33 + k * 16} anchor="start" mono size={8.5}>
            {`task ${k + 1}`}
          </T>
          <rect
            x={56 + k * 84}
            y={25 + k * 16}
            width={84}
            height={10}
            rx={3}
            className="fill-brand"
          >
            <Anim
              attr="width"
              keys={[
                [0, 0],
                [k * 0.3, 0],
                [(k + 1) * 0.3, 84],
              ]}
            />
          </rect>
        </g>
      ))}
      {axis(76)}

      <T x={14} y={108} anchor="start" mono bold size={10} tone="ink">
        async
      </T>
      <T x={54} y={108} anchor="start" size={9.5}>
        the waits overlap
      </T>
      <Show from={0.33}>
        <T x={308} y={108} anchor="end" mono bold size={10.5} tone="ok">
          ≈ 1 s
        </T>
      </Show>
      {[0, 1, 2].map((k) => (
        <g key={k}>
          <T x={14} y={125 + k * 16} anchor="start" mono size={8.5}>
            {`task ${k + 1}`}
          </T>
          <rect x={56 + k * 4} y={117 + k * 16} width={84} height={10} rx={3} className="fill-ok">
            <Anim
              attr="width"
              keys={[
                [0, 0],
                [k * 0.02, 0],
                [0.3 + k * 0.02, 84],
              ]}
            />
          </rect>
        </g>
      ))}
      {axis(168)}
    </>
  );
}

function GilBaton() {
  const seg = (a: number, b: number) => [((a - 80) / 220) * 0.9, ((b - 80) / 220) * 0.9] as const;
  const t1 = [
    [80, 124],
    [168, 212],
    [256, 300],
  ] as const;
  const t2 = [
    [124, 168],
    [212, 256],
  ] as const;
  const lane = (y: number, label: string) => (
    <g>
      <T x={14} y={y + 14} anchor="start" mono size={10} tone="ink">
        {label}
      </T>
      <rect x={80} y={y} width={220} height={20} rx={4} className="fill-surface-2 stroke-line" />
    </g>
  );
  return (
    <>
      {lane(40, 'thread 1')}
      {lane(100, 'thread 2')}
      {t1.map(([a, b]) => {
        const [s, e] = seg(a, b);
        return (
          <rect key={a} x={a} y={40} width={b - a} height={20} rx={4} className="fill-brand">
            <Anim
              attr="width"
              keys={[
                [0, 0],
                [s, 0],
                [e, b - a],
              ]}
            />
          </rect>
        );
      })}
      {t2.map(([a, b]) => {
        const [s, e] = seg(a, b);
        return (
          <rect key={a} x={a} y={100} width={b - a} height={20} rx={4} className="fill-g2">
            <Anim
              attr="width"
              keys={[
                [0, 0],
                [s, 0],
                [e, b - a],
              ]}
            />
          </rect>
        );
      })}
      <Move
        keys={[
          [0, [0, 0]],
          [0.9, [220, 0]],
        ]}
        at={[220, 0]}
      >
        <line x1={80} y1={30} x2={80} y2={130} strokeWidth={1.5} className="stroke-ink" />
        <Move
          discrete
          keys={[
            [0, [0, 0]],
            [seg(124, 0)[0], [0, 60]],
            [seg(168, 0)[0], [0, 0]],
            [seg(212, 0)[0], [0, 60]],
            [seg(256, 0)[0], [0, 0]],
          ]}
        >
          <Chip x={42} y={20} w={34} h={16} label="GIL" tone="ink" text="surface" size={8.5} />
        </Move>
      </Move>
      <T x={190} y={152} size={10}>
        One thread runs Python code at a time
      </T>
    </>
  );
}

// ───────────── Python: object-oriented programming ─────────────

function ClassBlueprint() {
  const objects = [
    { id: 'r1', name: '"Dosa Corner"', rating: '4.5', y: 14, cls: 'fill-brand' },
    { id: 'r2', name: '"Green Bowl"', rating: '4.2', y: 66, cls: 'fill-g2' },
    { id: 'r3', name: '"Tiffin House"', rating: '3.9', y: 118, cls: 'fill-g3' },
  ];
  return (
    <>
      <Box x={10} y={22} w={124} h={128} r={12} tone="brand" width={1.5} dashed />
      <T x={20} y={41} anchor="start" mono bold size={10.5} tone="brand">
        class Restaurant
      </T>
      <line x1={10} y1={50} x2={134} y2={50} className="stroke-brand" opacity={0.35} />
      <T x={20} y={68} anchor="start" mono size={10} tone="ink">
        name
      </T>
      <T x={20} y={84} anchor="start" mono size={10} tone="ink">
        rating
      </T>
      <line x1={10} y1={94} x2={134} y2={94} className="stroke-brand" opacity={0.35} />
      <T x={20} y={114} anchor="start" mono size={9.5} tone="ink">
        accept_order()
      </T>
      <T x={72} y={168} size={9.5}>
        the blueprint
      </T>
      {objects.map((o, k) => {
        const s = 0.12 + k * 0.22;
        return (
          <g key={o.id}>
            <Show from={s + 0.04}>
              <Arrow x1={136} y1={86} x2={166} y2={o.y + 22} />
            </Show>
            <Show from={s} to={s + 0.08} final={false}>
              <Box x={10} y={22} w={124} h={128} r={12} tone="ring" width={2.5} />
            </Show>
            <Show from={s}>
              <Move
                keys={[
                  [0, [-60, 0]],
                  [s, [-60, 0]],
                  [s + 0.08, [0, 0]],
                ]}
              >
                <Box x={170} y={o.y} w={140} h={44} r={10} />
                <rect x={178} y={o.y + 8} width={24} height={16} rx={8} className={o.cls} />
                <T x={190} y={o.y + 19.5} mono bold size={9} tone="surface">
                  {o.id}
                </T>
                <T x={208} y={o.y + 20} anchor="start" mono size={9.5} tone="ink">
                  {o.name}
                </T>
                <T x={178} y={o.y + 36} anchor="start" mono size={8.5}>
                  {`rating ${o.rating}`}
                </T>
              </Move>
            </Show>
          </g>
        );
      })}
      <Show from={0.8}>
        <T x={240} y={176} size={9.5} tone="ok">
          one class, many objects
        </T>
      </Show>
    </>
  );
}

function SelfBinding() {
  const objects = [
    { id: 'r1', name: '"Dosa Corner"', rating: '4.5', y: 22, cls: 'fill-brand' },
    { id: 'r2', name: '"Green Bowl"', rating: '4.2', y: 78, cls: 'fill-g2' },
  ];
  const phase = (k: number, children: ReactNode) =>
    k === 0 ? (
      <Show to={0.5 - FADE} final={false}>
        {children}
      </Show>
    ) : (
      <Show from={0.5}>{children}</Show>
    );
  return (
    <>
      <Box x={10} y={22} w={130} h={58} r={10} tone="soft" />
      <T x={20} y={44} anchor="start" mono size={9.5} tone="ink">
        def describe(self):
      </T>
      <T x={40} y={64} anchor="start" mono size={9.5} tone="ink">
        return f"{'{'}self.name{'}'}, …"
      </T>
      {objects.map((o) => (
        <g key={o.id}>
          <Box x={196} y={o.y} w={114} h={40} r={10} />
          <rect x={203} y={o.y + 12} width={24} height={16} rx={8} className={o.cls} />
          <T x={215} y={o.y + 23.5} mono bold size={9} tone="surface">
            {o.id}
          </T>
          <T x={232} y={o.y + 24} anchor="start" mono size={9} tone="ink">
            {o.name}
          </T>
        </g>
      ))}
      {objects.map((o, k) => (
        <g key={o.id}>
          {phase(
            k,
            <g>
              <Box x={196} y={o.y} w={114} h={40} r={10} tone="ring" width={2.5} />
              <Chip
                x={146}
                y={o.y + 10}
                w={34}
                h={20}
                label="self"
                tone="ink"
                text="surface"
                size={9}
              />
              <Arrow x1={180} y1={o.y + 20} x2={193} y2={o.y + 20} tone="brand" width={2} />
              <T x={14} y={116} anchor="start" mono size={11} tone="ink">
                {`>>> ${o.id}.describe()`}
              </T>
              <T x={14} y={136} anchor="start" mono size={11} tone="ok">
                {`'${o.name.replaceAll('"', '')}, rated ${o.rating}'`}
              </T>
            </g>,
          )}
        </g>
      ))}
      <T x={160} y={164} size={10}>
        self is the object before the dot
      </T>
    </>
  );
}

function InheritanceTree() {
  const kids = [
    { x: 20, label: 'class Bike(Vehicle)', note: 'inherits both', override: false },
    { x: 180, label: 'class Car(Vehicle)', note: 'overrides fare()', override: true },
  ];
  return (
    <>
      <Box x={92} y={8} w={136} h={56} r={10} tone="brand" width={1.5} />
      <T x={160} y={26} mono bold size={10.5} tone="brand">
        class Vehicle
      </T>
      <Chip x={104} y={34} w={54} h={20} label="start()" size={9.5} />
      <Chip x={164} y={34} w={52} h={20} label="fare()" size={9.5} />
      {kids.map((c, i) => {
        const cx = c.x + 60;
        return (
          <g key={c.label}>
            <Arrow x1={cx} y1={108} x2={i === 0 ? 132 : 188} y2={68} />
            <Box x={c.x} y={108} w={120} h={56} r={10} />
            <T x={cx} y={125} mono size={9.5} tone="ink" bold>
              {c.label}
            </T>
            <Show from={0.18}>
              <Move
                keys={[
                  [0, [104 - (c.x + 8), -98]],
                  [0.18, [104 - (c.x + 8), -98]],
                  [0.3, [0, 0]],
                ]}
              >
                <Chip x={c.x + 8} y={134} w={52} h={20} label="start()" tone="soft" size={9} />
              </Move>
            </Show>
            <Show from={0.38}>
              <Move
                keys={[
                  [0, [164 - (c.x + 64), -98]],
                  [0.38, [164 - (c.x + 64), -98]],
                  [0.5, [0, 0]],
                ]}
              >
                <Chip x={c.x + 64} y={134} w={48} h={20} label="fare()" tone="soft" size={9} />
              </Move>
            </Show>
            {c.override && (
              <Show from={0.6}>
                <Chip
                  x={c.x + 64}
                  y={134}
                  w={48}
                  h={20}
                  label="fare()"
                  tone="warn"
                  text="warn"
                  size={9}
                />
              </Show>
            )}
            <Show from={c.override ? 0.62 : 0.55}>
              <T x={cx} y={178} size={9.5} tone={c.override ? 'warn' : 'muted'}>
                {c.note}
              </T>
            </Show>
          </g>
        );
      })}
    </>
  );
}

function PolymorphismPay() {
  const ways = [
    { cls: 'Upi', says: 'Paid ₹500 by UPI', y: 12 },
    { cls: 'Card', says: 'Card charged ₹500', y: 66 },
    { cls: 'CashOnDelivery', says: 'Pay ₹500 at the door', y: 120 },
  ];
  return (
    <>
      <T x={12} y={24} anchor="start" mono size={10} tone="ink">
        for p in methods:
      </T>
      <Chip x={12} y={74} w={98} h={28} label="p.pay(500)" tone="ink" text="surface" size={10.5} />
      {ways.map((w, k) => {
        const s = 0.08 + k * 0.27;
        return (
          <g key={w.cls}>
            <line
              x1={112}
              y1={88}
              x2={150}
              y2={w.y + 22}
              strokeWidth={1.25}
              className="stroke-line-2"
            />
            <Box x={152} y={w.y} w={158} h={44} r={10} />
            <T x={162} y={w.y + 18} anchor="start" mono bold size={10} tone="brand">
              {w.cls}
            </T>
            <Show from={s + 0.1} to={s + 0.2} final={false}>
              <Box x={152} y={w.y} w={158} h={44} r={10} tone="ringOk" width={2.5} />
            </Show>
            <Show from={s + 0.1}>
              <T x={162} y={w.y + 35} anchor="start" mono size={9.5} tone="ok">
                {w.says}
              </T>
            </Show>
            <Show from={s} to={s + 0.1} final={false}>
              <Move
                keys={[
                  [0, [0, 0]],
                  [s, [0, 0]],
                  [s + 0.09, [38, w.y + 22 - 88]],
                ]}
              >
                <circle cx={112} cy={88} r={4.5} className="fill-g1" />
              </Move>
            </Show>
          </g>
        );
      })}
      <T x={60} y={140} size={9.5}>
        same call,
      </T>
      <T x={60} y={153} size={9.5}>
        different behaviour
      </T>
    </>
  );
}

function EncapsulationWallet() {
  return (
    <>
      <Box x={112} y={30} w={112} h={104} r={14} tone="brand" width={1.5} />
      <T x={168} y={48} mono bold size={10.5} tone="brand">
        wallet
      </T>
      <Box x={128} y={58} w={80} h={42} r={8} tone="soft" />
      <Lock x={192} y={66} />
      <T x={156} y={74} mono size={9}>
        _balance
      </T>
      <Show to={0.3} final={false}>
        <T x={160} y={93} mono bold size={13} tone="ink">
          ₹500
        </T>
      </Show>
      <Show from={0.3}>
        <T x={160} y={93} mono bold size={13} tone="ink">
          ₹300
        </T>
      </Show>
      <T x={168} y={124} mono size={8.5}>
        add() · spend()
      </T>

      <Show from={0.05}>
        <Move
          keys={[
            [0, [0, 0]],
            [0.08, [0, 0]],
            [0.22, [16, 0]],
          ]}
        >
          <Chip x={8} y={50} w={84} h={24} label="spend(200)" tone="ok" text="ok" size={10} />
        </Move>
      </Show>
      <Arrow x1={110} y1={62} x2={124} y2={66} tone="ok" />
      <Show from={0.3}>
        <T x={232} y={60} anchor="start" size={9.5} tone="ok">
          ✓ checked,
        </T>
        <T x={232} y={73} anchor="start" size={9.5} tone="ok">
          then saved
        </T>
      </Show>

      <Show from={0.45}>
        <Move
          keys={[
            [0, [0, 0]],
            [0.48, [0, 0]],
            [0.6, [16, 0]],
            [0.68, [0, 0]],
          ]}
        >
          <Chip x={8} y={100} w={84} h={24} label="spend(1000)" tone="bad" text="bad" size={9.5} />
        </Move>
      </Show>
      <Show from={0.6} to={0.72} final={false}>
        <Box x={112} y={30} w={112} h={104} r={14} tone="ringBad" width={2.5} />
      </Show>
      <Show from={0.62}>
        <T x={232} y={108} anchor="start" size={9.5} tone="bad">
          ✗ refused:
        </T>
        <T x={232} y={121} anchor="start" size={9.5} tone="bad">
          not enough
        </T>
      </Show>
      <T x={160} y={164} size={10}>
        Data changes only through methods that check it
      </T>
    </>
  );
}

function AbstractionPanel() {
  const { uid } = useContext(AnimCtx);
  const parts = [
    ['gradients', 104, 64],
    ['matrix maths', 200, 70],
    ['loss loop', 112, 96],
    ['weights', 206, 104],
    ['learning rate', 150, 126],
  ] as const;
  return (
    <>
      <defs>
        <clipPath id={`${uid}-inside`}>
          <rect x={62} y={42} width={196} height={96} rx={10} />
        </clipPath>
      </defs>
      <Box x={60} y={16} w={200} h={124} r={14} />
      <T x={74} y={33} anchor="start" mono bold size={10.5} tone="ink">
        model
      </T>
      {parts.map(([p, x, y]) => (
        <T key={p} x={x} y={y} mono size={9}>
          {p}
        </T>
      ))}
      <g clipPath={`url(#${uid}-inside)`}>
        <Move
          keys={[
            [0, [0, -100]],
            [0.3, [0, -100]],
            [0.45, [0, 0]],
          ]}
        >
          <rect x={62} y={42} width={196} height={96} className="fill-surface-2" />
          <line x1={62} y1={42} x2={258} y2={42} className="stroke-line-2" />
        </Move>
      </g>
      <Show from={0.47}>
        <Chip x={84} y={70} w={74} h={26} label="fit(X, y)" tone="brand" text="brand" size={10} />
        <Chip x={166} y={70} w={74} h={26} label="predict(X)" tone="brand" text="brand" size={10} />
      </Show>
      <Show from={0.62}>
        <T x={203} y={116} mono size={10} tone="ok">
          → [1, 0, 1]
        </T>
      </Show>
      <T x={160} y={160} size={10}>
        Use what it does; how it does it stays hidden
      </T>
    </>
  );
}

function ClassVsInstance() {
  const users = [
    { id: 'u1', name: '"asha"', x: 14, at: 0.2 },
    { id: 'u2', name: '"ravi"', x: 116, at: 0.45 },
    { id: 'u3', name: '"meena"', x: 218, at: 0.7 },
  ];
  return (
    <>
      <Box x={92} y={8} w={136} h={50} r={10} tone="brand" width={1.5} />
      <T x={160} y={25} mono size={9.5} tone="brand">
        User.total_users
      </T>
      {[0, 1, 2, 3].map((n) => (
        <Show
          key={n}
          from={n === 0 ? 0 : (users[n - 1]?.at ?? 0)}
          to={n === 3 ? undefined : (users[n]?.at ?? 1) - FADE}
          final={n === 3}
        >
          <T x={160} y={48} mono bold size={15} tone="ink">
            {String(n)}
          </T>
        </Show>
      ))}
      <T x={234} y={30} anchor="start" size={9}>
        class attribute:
      </T>
      <T x={234} y={42} anchor="start" size={9}>
        one, shared
      </T>
      {users.map((u) => (
        <Show key={u.id} from={u.at}>
          <Arrow x1={u.x + 44} y1={108} x2={u.x < 100 ? 120 : u.x > 200 ? 200 : 160} y2={62} />
          <Box x={u.x} y={108} w={88} h={46} r={10} />
          <T x={u.x + 44} y={126} mono bold size={10} tone="ink">
            {u.id}
          </T>
          <T x={u.x + 44} y={143} mono size={9}>
            {`name=${u.name}`}
          </T>
        </Show>
      ))}
      <T x={160} y={174} size={9.5}>
        instance attributes: one set per object
      </T>
    </>
  );
}

// ───────────── Interviews and HR ─────────────

function IntroTrailer() {
  const frames = [
    ['Who you', 'are'],
    ['Your', 'skills'],
    ['Best', 'project'],
    ['Why this', 'role'],
  ];
  return (
    <>
      <Box x={10} y={30} w={300} h={98} r={10} tone="ink" />
      {Array.from({ length: 15 }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed sprocket holes
        <g key={i}>
          <rect
            x={18 + i * 20}
            y={35}
            width={8}
            height={5}
            rx={1.5}
            className="fill-surface"
            opacity={0.45}
          />
          <rect
            x={18 + i * 20}
            y={118}
            width={8}
            height={5}
            rx={1.5}
            className="fill-surface"
            opacity={0.45}
          />
        </g>
      ))}
      {frames.map(([a, b], k) => {
        const x = 22 + k * 72;
        return (
          <g key={a}>
            <rect x={x} y={47} width={64} height={64} rx={6} className="fill-surface" />
            <T x={x + 7} y={61} anchor="start" mono size={8.5}>
              {`0${k + 1}`}
            </T>
            <T x={x + 32} y={84} size={10} tone="ink" bold>
              {a}
            </T>
            <T x={x + 32} y={98} size={10} tone="ink" bold>
              {b}
            </T>
            <Show from={k * 0.225} to={(k + 1) * 0.225} final={false}>
              <rect
                x={x}
                y={47}
                width={64}
                height={64}
                rx={6}
                strokeWidth={3}
                className="fill-none stroke-g1"
              />
            </Show>
          </g>
        );
      })}
      <rect x={10} y={142} width={300} height={6} rx={3} className="fill-surface-2" />
      <rect x={10} y={142} width={300} height={6} rx={3} className="fill-brand">
        <Anim
          attr="width"
          keys={[
            [0, 0],
            [0.9, 300],
          ]}
        />
      </rect>
      <T x={10} y={164} anchor="start" mono size={9}>
        0 s
      </T>
      <T x={310} y={164} anchor="end" mono size={9}>
        about 60 s
      </T>
      <T x={160} y={20} size={10}>
        Show the best scenes, then stop
      </T>
    </>
  );
}

function StarTimeline() {
  const parts = [
    { l: 'S', name: 'Situation', time: 'context', x: 14, w: 46, fill: 'fill-g3', t: [0, 0.12] },
    { l: 'T', name: 'Task', time: 'goal', x: 62, w: 38, fill: 'fill-brand', t: [0.12, 0.22] },
    {
      l: 'A',
      name: 'Action',
      time: 'what you did',
      x: 102,
      w: 148,
      fill: 'fill-g2',
      t: [0.22, 0.6],
    },
    { l: 'R', name: 'Result', time: 'the outcome', x: 252, w: 56, fill: 'fill-g1', t: [0.6, 0.75] },
  ] as const;
  return (
    <>
      {parts.map((p) => (
        <g key={p.l}>
          <rect x={p.x} y={58} width={p.w} height={40} rx={6} className={p.fill}>
            <Anim
              attr="width"
              keys={[
                [0, 0],
                [p.t[0], 0],
                [p.t[1], p.w],
              ]}
            />
          </rect>
          <Show from={p.t[0] + 0.02}>
            <T x={p.x + p.w / 2} y={83} mono bold size={15} tone="surface">
              {p.l}
            </T>
            <T x={p.x + p.w / 2} y={50} mono size={8.5}>
              {p.time}
            </T>
            <T x={p.x + p.w / 2} y={116} size={9.5} tone="ink">
              {p.name}
            </T>
          </Show>
        </g>
      ))}
      <Show to={0.77} final={false}>
        <Move
          keys={[
            [0, [0, 0]],
            [0.75, [296, 0]],
          ]}
        >
          <line x1={14} y1={52} x2={14} y2={104} strokeWidth={1.5} className="stroke-ink" />
        </Move>
      </Show>
      <Show from={0.75}>
        <T x={160} y={146} size={10.5} tone="ink" bold>
          Most of the time on what you did
        </T>
      </Show>
      <Show from={0.8}>
        <T x={160} y={164} size={9.5}>
          and end on a result with a number
        </T>
      </Show>
    </>
  );
}

function CtcSplit() {
  const parts = [
    { x: 14, w: 212, fill: 'fill-ok', label: 'In-hand pay', sub: 'to your bank' },
    { x: 230, w: 34, fill: 'fill-g3', label: 'PF', sub: 'saved' },
    { x: 268, w: 38, fill: 'fill-g1', label: 'Tax, other', sub: 'deducted' },
  ];
  const move: ReadonlyArray<readonly [number, Pt]> = [
    [0, [0, 0]],
    [0.3, [0, 0]],
    [0.42, [0, 52]],
  ];
  return (
    <>
      <T x={14} y={20} anchor="start" mono bold size={11} tone="ink">
        CTC
      </T>
      <T x={44} y={20} anchor="start" size={10}>
        the company's full yearly cost
      </T>
      <Move keys={move} at={[0, 52]}>
        {parts.map((p) => (
          <rect key={p.label} x={p.x} y={30} width={p.w} height={30} rx={6} className={p.fill} />
        ))}
      </Move>
      <Show to={0.3} final={false}>
        <rect x={14} y={30} width={292} height={30} rx={7} className="fill-brand" />
        <T x={160} y={49} size={10.5} tone="surface" bold>
          CTC on the offer letter
        </T>
      </Show>
      <Show from={0.45}>
        {parts.map((p) => (
          <g key={p.label}>
            <T x={p.x + p.w / 2} y={128} size={p.w > 40 ? 10 : 8.5} tone="ink" bold>
              {p.label}
            </T>
            <T x={p.x + p.w / 2} y={141} size={8.5}>
              {p.sub}
            </T>
          </g>
        ))}
      </Show>
      <Show from={0.5}>
        <T x={160} y={166} size={10}>
          Ask HR for the monthly in-hand amount
        </T>
      </Show>
    </>
  );
}

// ───────────── Machine learning (240 × 130) ─────────────

const SCATTER: ReadonlyArray<Pt> = [
  [20, 96],
  [40, 84],
  [60, 80],
  [80, 66],
  [100, 64],
  [120, 50],
  [140, 52],
  [160, 38],
  [180, 34],
  [200, 22],
];

function Axes() {
  return (
    <>
      <line x1={10} y1={112} x2={230} y2={112} className="stroke-line-2" />
      <line x1={10} y1={8} x2={10} y2={112} className="stroke-line-2" />
    </>
  );
}

function ScatterLine() {
  return (
    <>
      <Axes />
      <T x={16} y={14} anchor="start" mono size={8}>
        rent
      </T>
      <T x={228} y={106} anchor="end" mono size={8}>
        size
      </T>
      {SCATTER.map(([x, y]) => (
        <circle key={x} cx={x} cy={y} r={4} className="fill-brand" />
      ))}
      <line
        x1={12}
        y1={100}
        x2={220}
        y2={18}
        strokeWidth={2.5}
        strokeLinecap="round"
        className="stroke-g1"
      >
        <Anim
          attr="y1"
          keys={[
            [0, 60],
            [0.2, 60],
            [0.55, 100],
            [0.9, 100],
            [1, 60],
          ]}
        />
        <Anim
          attr="y2"
          keys={[
            [0, 60],
            [0.2, 60],
            [0.55, 18],
            [0.9, 18],
            [1, 60],
          ]}
        />
      </line>
      <T x={120} y={126} size={9}>
        Fit the line that misses the points least
      </T>
    </>
  );
}

function Residuals() {
  const line = (x: number) => 100 - (x - 12) * (82 / 208);
  return (
    <>
      <line x1={12} y1={100} x2={220} y2={18} strokeWidth={2.5} className="stroke-g1" />
      {SCATTER.map(([x, y], i) => {
        const yl = line(x);
        const py = y + (i % 2 ? 10 : -9);
        return (
          <g key={x}>
            <line x1={x} y1={yl} x2={x} y2={py} strokeWidth={2} className="stroke-bad">
              <Anim
                attr="y2"
                keys={[
                  [0, yl],
                  [0.4, py],
                ]}
              />
            </line>
            <circle cx={x} cy={py} r={4} className="fill-brand" />
          </g>
        );
      })}
      <T x={120} y={124} size={9}>
        Residual = real value − predicted value
      </T>
    </>
  );
}

/** A bowl: highest at the edges, lowest (largest y) in the middle. */
const bowl = (x: number) => 100 - ((x - 120) / 100) ** 2 * 80;

function LossBowl() {
  const curve = Array.from({ length: 41 }, (_, i) => `${20 + i * 5},${bowl(20 + i * 5)}`).join(' ');
  const steps = [30, 62, 86, 102, 112, 117, 120];
  const last = steps[steps.length - 1] ?? 120;
  return (
    <>
      <polyline points={curve} strokeWidth={2} className="fill-none stroke-ink" />
      {steps.map((x) => (
        <circle key={x} cx={x} cy={bowl(x) - 6} r={2} className="fill-muted" opacity={0.5} />
      ))}
      <circle
        cx={last}
        cy={bowl(last) - 7}
        r={7}
        strokeWidth={2}
        className="fill-g1 stroke-surface"
      >
        <Anim
          attr="cx"
          keys={[...steps.map((x, i) => [i / steps.length, x] as const), [1, steps[0] ?? 30]]}
        />
        <Anim
          attr="cy"
          keys={[
            ...steps.map((x, i) => [i / steps.length, bowl(x) - 7] as const),
            [1, bowl(steps[0] ?? 30) - 7],
          ]}
        />
      </circle>
      <T x={120} y={124} size={9}>
        Step downhill until the loss stops dropping
      </T>
    </>
  );
}

function LearningRate() {
  const mini = (
    dx: number,
    xs: number[],
    title: string,
    cls: string,
    t: readonly [number, number],
  ) => {
    const f = (x: number) => 84 - ((x - 40) / 32) ** 2 * 60;
    return (
      <g transform={`translate(${dx},0)`}>
        <polyline
          points={Array.from({ length: 17 }, (_, i) => `${8 + i * 4},${f(8 + i * 4)}`).join(' ')}
          strokeWidth={2}
          className="fill-none stroke-line-2"
        />
        <polyline
          points={xs.map((x) => `${x},${f(x) - 3}`).join(' ')}
          pathLength={1}
          strokeDasharray="1"
          strokeWidth={1.5}
          className={cn('fill-none', cls.replace('fill-', 'stroke-'))}
        >
          <Anim attr="stroke-dashoffset" keys={drawKeys(t[0], t[1])} />
        </polyline>
        {xs.map((x) => (
          <circle key={x} cx={x} cy={f(x) - 3} r={2.5} className={cls} />
        ))}
        <T x={40} y={106} size={8.5}>
          {title}
        </T>
      </g>
    );
  };
  return (
    <>
      {mini(0, [10, 13, 16, 19, 22, 25], 'Too small: slow', 'fill-g3', [0.05, 0.3])}
      {mini(80, [10, 30, 37, 40], 'Just right', 'fill-ok', [0.35, 0.6])}
      {mini(160, [30, 52, 26, 58, 18, 66], 'Too big: bounces', 'fill-bad', [0.65, 0.9])}
    </>
  );
}

function TrainTestSplit() {
  return (
    <>
      {Array.from({ length: 10 }, (_, i) => {
        const test = i >= 8;
        const x = 24 + i * 19;
        const to = test ? x + 18 : x - 6;
        return (
          <rect
            key={x}
            x={to}
            y={44}
            width={15}
            height={28}
            rx={4}
            className={test ? 'fill-g1' : 'fill-brand'}
          >
            <Anim
              attr="x"
              keys={[
                [0, x],
                [0.25, x],
                [0.45, to],
                [0.85, to],
                [1, x],
              ]}
            />
          </rect>
        );
      })}
      <T x={86} y={96} size={9}>
        Train (80%): learn
      </T>
      {/* Right-aligned to the frame: centred on the test blocks it ran past the picture's edge. */}
      <T x={236} y={96} size={9} anchor="end">
        Test (20%): judge
      </T>
    </>
  );
}

function OverfitUnderfit() {
  const pts: ReadonlyArray<Pt> = [
    [12, 70],
    [24, 58],
    [36, 62],
    [48, 42],
    [60, 46],
    [72, 30],
  ];
  const panel = (
    dx: number,
    path: string,
    title: string,
    cls: string,
    t: readonly [number, number],
  ) => (
    <g transform={`translate(${dx},0)`}>
      <rect x={2} y={12} width={76} height={80} rx={8} className="fill-surface-2 stroke-line" />
      {pts.map(([x, y]) => (
        <circle key={x} cx={x} cy={y + 8} r={3} className="fill-brand" />
      ))}
      <path
        d={path}
        pathLength={1}
        strokeDasharray="1"
        strokeWidth={2}
        className={cn('fill-none', cls)}
      >
        <Anim attr="stroke-dashoffset" keys={drawKeys(t[0], t[1])} />
      </path>
      <T x={40} y={106} size={8.5}>
        {title}
      </T>
    </g>
  );
  return (
    <>
      {panel(0, 'M6 58 H76', 'Underfit', 'stroke-bad', [0.05, 0.25])}
      {panel(80, 'M6 82 C30 74 50 52 76 34', 'Just right', 'stroke-ok', [0.35, 0.55])}
      {panel(
        160,
        'M6 84 L12 78 L24 60 L36 76 L48 44 L60 60 L72 32 L76 30',
        'Overfit',
        'stroke-bad',
        [0.65, 0.85],
      )}
    </>
  );
}

const BLUE_PTS: ReadonlyArray<Pt> = [
  [30, 30],
  [42, 44],
  [26, 52],
  [50, 28],
  [38, 60],
  [22, 38],
];
const ORANGE_PTS: ReadonlyArray<Pt> = [
  [70, 72],
  [84, 60],
  [76, 88],
  [92, 80],
  [64, 92],
  [88, 96],
];

/** A grey point that takes its group colour during [from, to] (and in the still frame). */
function Reveal({
  x,
  y,
  r = 4.5,
  cls,
  from,
  to,
}: {
  x: number;
  y: number;
  r?: number;
  cls: string;
  from: number;
  to: number;
}) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} className="fill-line-2" />
      <Show from={from} to={to}>
        <circle cx={x} cy={y} r={r} className={cls} />
      </Show>
    </g>
  );
}

function LabelsVsNoLabels() {
  return (
    <>
      <rect x={4} y={12} width={112} height={100} rx={10} className="fill-surface-2 stroke-line" />
      {BLUE_PTS.map(([x, y]) => (
        <circle key={`a${x}${y}`} cx={x} cy={y} r={4.5} className="fill-brand" />
      ))}
      {ORANGE_PTS.map(([x, y]) => (
        <circle key={`b${x}${y}`} cx={x} cy={y} r={4.5} className="fill-g1" />
      ))}
      <T x={60} y={124} size={9}>
        With labels
      </T>
      <rect
        x={124}
        y={12}
        width={112}
        height={100}
        rx={10}
        className="fill-surface-2 stroke-line"
      />
      {[...BLUE_PTS, ...ORANGE_PTS].map(([x, y], i) => (
        <Reveal
          key={`u${x}${y}`}
          x={x + 120}
          y={y}
          cls={i < 6 ? 'fill-g2' : 'fill-g3'}
          from={0.4}
          to={0.9}
        />
      ))}
      <T x={180} y={124} size={9}>
        No labels: find the groups
      </T>
    </>
  );
}

function DecisionBoundary() {
  return (
    <>
      <path
        d="M10 10 H230 V40 C170 40 150 110 90 110 H10 Z"
        className="fill-brand"
        opacity={0.08}
      />
      <path d="M230 40 C170 40 150 110 90 110 H230 Z" className="fill-g1" opacity={0.1} />
      {BLUE_PTS.map(([x, y]) => (
        <circle key={`a${x}${y}`} cx={x * 1.4} cy={y * 0.9} r={4.5} className="fill-brand" />
      ))}
      {ORANGE_PTS.map(([x, y]) => (
        <circle key={`b${x}${y}`} cx={x * 1.9} cy={y} r={4.5} className="fill-g1" />
      ))}
      <path
        d="M230 40 C170 40 150 110 90 110"
        pathLength={1}
        strokeDasharray="1"
        strokeWidth={2}
        className="fill-none stroke-ink"
      >
        <Anim attr="stroke-dashoffset" keys={drawKeys(0, 0.6)} />
      </path>
      <T x={120} y={124} size={9}>
        The model learns a boundary
      </T>
    </>
  );
}

function Clusters() {
  const groups = [
    {
      c: [50, 40] as Pt,
      pts: [
        [40, 30],
        [58, 34],
        [46, 50],
        [62, 48],
        [36, 44],
      ] as Pt[],
      cls: 'fill-brand',
    },
    {
      c: [180, 40] as Pt,
      pts: [
        [170, 30],
        [190, 32],
        [176, 52],
        [194, 48],
        [184, 24],
      ] as Pt[],
      cls: 'fill-g1',
    },
    {
      c: [115, 92] as Pt,
      pts: [
        [104, 84],
        [122, 82],
        [110, 102],
        [128, 98],
        [116, 108],
      ] as Pt[],
      cls: 'fill-g2',
    },
  ];
  const starts: Pt[] = [
    [110, 60],
    [130, 50],
    [120, 70],
  ];
  return (
    <>
      {groups.map((g) =>
        g.pts.map(([x, y]) => (
          <Reveal key={`${x}-${y}`} x={x} y={y} r={4} cls={g.cls} from={0.35} to={0.9} />
        )),
      )}
      {groups.map((g, gi) => {
        const s = starts[gi] ?? g.c;
        return (
          <Move
            key={g.cls}
            at={[0, 0]}
            keys={[
              [0, [s[0] - g.c[0], s[1] - g.c[1]]],
              [0.2, [s[0] - g.c[0], s[1] - g.c[1]]],
              [0.55, [0, 0]],
              [0.9, [0, 0]],
              [1, [s[0] - g.c[0], s[1] - g.c[1]]],
            ]}
          >
            <path
              d={`M${g.c[0] - 6} ${g.c[1]} H${g.c[0] + 6} M${g.c[0]} ${g.c[1] - 6} V${g.c[1] + 6}`}
              strokeWidth={3}
              strokeLinecap="round"
              className="stroke-ink"
            />
          </Move>
        );
      })}
      <T x={120} y={124} size={9}>
        Centres slide to the middle of each group
      </T>
    </>
  );
}

function Neuron() {
  const inputs = [24, 60, 96];
  return (
    <>
      {inputs.map((y, i) => (
        <g key={y}>
          <line
            x1={34}
            y1={y}
            x2={112}
            y2={60}
            strokeWidth={[3, 1.5, 2.5][i]}
            className={i === 1 ? 'stroke-g1' : 'stroke-brand'}
          />
          <circle cx={24} cy={y} r={11} strokeWidth={1.5} className="fill-surface stroke-ink" />
          <T x={24} y={y + 3.5} size={10} tone="ink" mono>
            {`x${i + 1}`}
          </T>
          <Travel path={`M34 ${y} L112 60`} begin={i * 0.2} />
        </g>
      ))}
      <circle cx={132} cy={60} r={20} strokeWidth={2.5} className="fill-surface stroke-g3" />
      <T x={132} y={57} size={10.5} tone="ink" mono>
        Σ + b
      </T>
      <T x={132} y={70} size={9} mono>
        σ(·)
      </T>
      <Arrow x1={152} y1={60} x2={204} y2={60} />
      <T x={218} y={64} size={11} tone="ink" bold mono>
        a
      </T>
      <T x={120} y={124} size={9}>
        Weighted sum plus bias, then an activation
      </T>
    </>
  );
}

function Network() {
  const layers = [
    [30, 60, 90],
    [20, 47, 74, 101],
    [45, 75],
  ];
  const xs = [40, 120, 200];
  const edges: Array<[number, number, number, number]> = [];
  for (let l = 0; l < 2; l++)
    for (const y1 of layers[l] ?? [])
      for (const y2 of layers[l + 1] ?? []) edges.push([xs[l] ?? 0, y1, xs[l + 1] ?? 0, y2]);
  return (
    <>
      {edges.map(([x1, y1, x2, y2], i) => (
        <line
          key={`${x1}${y1}${x2}${y2}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          strokeOpacity={0.4}
          strokeWidth={1 + (i % 3)}
          className={i % 3 ? 'stroke-brand' : 'stroke-g1'}
        />
      ))}
      {edges
        .filter((_, i) => i % 4 === 0)
        .map(([x1, y1, x2, y2], i) => (
          <Travel
            key={`p${x1}${y1}${x2}${y2}`}
            path={`M${x1} ${y1} L${x2} ${y2}`}
            begin={(i % 5) * 0.25 + (x1 > 100 ? 0.8 : 0)}
            seconds={1.6}
            r={2.5}
          />
        ))}
      {layers.map((ys, l) =>
        ys.map((y) => (
          <circle
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed layers
            key={`${l}-${y}`}
            cx={xs[l]}
            cy={y}
            r={9}
            strokeWidth={2}
            className={cn('fill-surface', l === 1 ? 'stroke-g3' : 'stroke-ink')}
          />
        )),
      )}
      <T x={40} y={122} size={9}>
        Input
      </T>
      <T x={120} y={122} size={9}>
        Hidden
      </T>
      <T x={200} y={122} size={9}>
        Output
      </T>
    </>
  );
}

// ───────────── Deep learning ─────────────

/** A dot that travels from a to b between two loop times (hidden otherwise). */
function Pulse({
  a,
  b,
  t0,
  t1,
  cls = 'fill-brand',
  r = 3.5,
}: {
  a: Pt;
  b: Pt;
  t0: number;
  t1: number;
  cls?: string;
  r?: number;
}) {
  return (
    <Show from={t0} to={t1} final={false}>
      <Move
        keys={[
          [0, [0, 0]],
          [t0, [0, 0]],
          [t1, [b[0] - a[0], b[1] - a[1]]],
        ]}
      >
        <circle cx={a[0]} cy={a[1]} r={r} className={cls} />
      </Move>
    </Show>
  );
}

function Node({
  x,
  y,
  label,
  ring = 'stroke-ink',
}: {
  x: number;
  y: number;
  label: string;
  ring?: string;
}) {
  return (
    <g>
      <circle cx={x} cy={y} r={13} strokeWidth={1.5} className={cn('fill-surface', ring)} />
      <T x={x} y={y + 3.5} mono size={9.5} tone="ink">
        {label}
      </T>
    </g>
  );
}

function ForwardBackward() {
  const I: Pt[] = [
    [40, 60],
    [40, 116],
  ];
  const H: Pt[] = [
    [132, 44],
    [132, 88],
    [132, 132],
  ];
  const O: Pt = [222, 88];
  const L: Pt = [258, 88];
  const ih = I.flatMap((a) => H.map((b) => [a, b] as const));
  return (
    <>
      {ih.map(([a, b]) => (
        <line
          key={`${a}-${b}`}
          x1={a[0]}
          y1={a[1]}
          x2={b[0]}
          y2={b[1]}
          strokeWidth={1.25}
          className="stroke-line-2"
        />
      ))}
      {H.map((h) => (
        <line
          key={`${h}`}
          x1={h[0]}
          y1={h[1]}
          x2={O[0]}
          y2={O[1]}
          strokeWidth={1.25}
          className="stroke-line-2"
        />
      ))}
      <line x1={O[0]} y1={O[1]} x2={L[0]} y2={L[1]} strokeWidth={1.25} className="stroke-line-2" />
      <Show from={0.58} to={0.86} final={false}>
        {ih.map(([a, b]) => (
          <line
            key={`g${a}-${b}`}
            x1={a[0]}
            y1={a[1]}
            x2={b[0]}
            y2={b[1]}
            strokeWidth={2.5}
            className="stroke-g1"
            opacity={0.6}
          />
        ))}
        {H.map((h) => (
          <line
            key={`g${h}`}
            x1={h[0]}
            y1={h[1]}
            x2={O[0]}
            y2={O[1]}
            strokeWidth={2.5}
            className="stroke-g1"
            opacity={0.6}
          />
        ))}
      </Show>
      {ih.map(([a, b]) => (
        <Pulse key={`f${a}-${b}`} a={a} b={b} t0={0.05} t1={0.18} />
      ))}
      {H.map((h) => (
        <Pulse key={`f2${h}`} a={h} b={O} t0={0.2} t1={0.32} />
      ))}
      <Pulse a={O} b={L} t0={0.34} t1={0.42} />
      <Pulse a={L} b={O} t0={0.52} t1={0.6} cls="fill-g1" />
      {H.map((h) => (
        <Pulse key={`b2${h}`} a={O} b={h} t0={0.6} t1={0.72} cls="fill-g1" />
      ))}
      {ih.map(([a, b]) => (
        <Pulse key={`b${a}-${b}`} a={b} b={a} t0={0.72} t1={0.84} cls="fill-g1" />
      ))}
      {I.map((p, i) => (
        <Node key={`i${p}`} x={p[0]} y={p[1]} label={`x${i + 1}`} />
      ))}
      {H.map((p, i) => (
        <Node key={`h${p}`} x={p[0]} y={p[1]} label={`h${i + 1}`} ring="stroke-brand" />
      ))}
      <Node x={O[0]} y={O[1]} label="ŷ" ring="stroke-g3" />
      <Box x={258} y={70} w={54} h={36} r={8} />
      <T x={285} y={84} mono size={9}>
        loss
      </T>
      <Show from={0.42}>
        <T x={285} y={99} mono bold size={10.5} tone="bad">
          0.36
        </T>
      </Show>
      <Show from={0.42} to={0.52} final={false}>
        <Box x={258} y={70} w={54} h={36} r={8} tone="ringBad" width={2.5} />
      </Show>
      <Show to={0.5} final={false}>
        <T x={14} y={18} anchor="start" mono bold size={10} tone="brand">
          1 forward: make a guess
        </T>
      </Show>
      <Show from={0.5} to={0.88} final={false}>
        <T x={14} y={18} anchor="start" mono bold size={10} tone="g1">
          2 backward: send the error back
        </T>
      </Show>
      <Show from={0.88}>
        <T x={14} y={18} anchor="start" mono bold size={10} tone="ok">
          3 update: w ← w − lr × gradient
        </T>
      </Show>
      <circle cx={20} cy={166} r={4} className="fill-brand" />
      <T x={28} y={169} anchor="start" size={9}>
        forward pass
      </T>
      <circle cx={120} cy={166} r={4} className="fill-g1" />
      <T x={128} y={169} anchor="start" size={9}>
        gradients flow back
      </T>
    </>
  );
}

function OptimizerPaths() {
  const paths = [
    {
      name: 'SGD: zig-zags',
      cls: 'stroke-g3',
      dot: 'fill-g3',
      pts: '70,60 95,118 118,72 140,110 160,80 178,104 194,86 206,98 215,90',
    },
    {
      name: 'Momentum: smoother',
      cls: 'stroke-brand',
      dot: 'fill-brand',
      pts: '70,60 110,104 150,98 185,93 210,92 226,92',
    },
    {
      name: 'Adam: adapts each step',
      cls: 'stroke-g2',
      dot: 'fill-g2',
      pts: '70,60 120,82 170,90 205,92 228,92',
    },
  ];
  return (
    <>
      {[30, 60, 90, 120].map((rx, i) => (
        <ellipse
          key={rx}
          cx={230}
          cy={92}
          rx={rx}
          ry={12 * (i + 1)}
          className="fill-none stroke-line-2"
        />
      ))}
      <path d="M225 87 L235 97 M235 87 L225 97" strokeWidth={2} className="stroke-ink" />
      <circle cx={70} cy={60} r={4} className="fill-ink" />
      {paths.map((p, i) => {
        const last = p.pts.split(' ').at(-1)?.split(',').map(Number) ?? [0, 0];
        return (
          <g key={p.name}>
            <polyline
              points={p.pts}
              pathLength={1}
              strokeDasharray="1"
              strokeWidth={2}
              className={cn('fill-none', p.cls)}
            >
              <Anim attr="stroke-dashoffset" keys={drawKeys(0.05, 0.75)} />
            </polyline>
            <Show from={0.75}>
              <circle cx={last[0]} cy={last[1]} r={3.5} className={p.dot} />
            </Show>
            <rect x={14} y={12 + i * 14} width={12} height={3} rx={1.5} className={p.dot} />
            <T x={32} y={17 + i * 14} anchor="start" size={9.5} tone="ink">
              {p.name}
            </T>
          </g>
        );
      })}
      <T x={230} y={160} size={9}>
        lowest loss
      </T>
      <T x={160} y={176} size={9.5}>
        Same valley, three ways down
      </T>
    </>
  );
}

function DropoutNet() {
  const layers: Array<{ x: number; ys: number[]; ring: string }> = [
    { x: 40, ys: [52, 92, 132], ring: 'stroke-ink' },
    { x: 122, ys: [38, 74, 110, 146], ring: 'stroke-brand' },
    { x: 204, ys: [38, 74, 110, 146], ring: 'stroke-brand' },
    { x: 284, ys: [72, 112], ring: 'stroke-ink' },
  ];
  // Hidden neurons switched off at each training step: [layer, index].
  const off: Array<Array<[number, number]>> = [
    [
      [1, 1],
      [2, 0],
      [2, 3],
    ],
    [
      [1, 0],
      [1, 3],
      [2, 2],
    ],
    [
      [1, 2],
      [2, 1],
    ],
    [
      [1, 1],
      [1, 3],
      [2, 0],
    ],
  ];
  return (
    <>
      {layers
        .slice(0, -1)
        .map((l, li) =>
          l.ys.flatMap((y1) =>
            (layers[li + 1]?.ys ?? []).map((y2) => (
              <line
                key={`${l.x}-${y1}-${y2}`}
                x1={l.x}
                y1={y1}
                x2={layers[li + 1]?.x}
                y2={y2}
                strokeWidth={1}
                className="stroke-line-2"
              />
            )),
          ),
        )}
      {layers.map((l) =>
        l.ys.map((y) => (
          <circle
            key={`${l.x}-${y}`}
            cx={l.x}
            cy={y}
            r={10}
            strokeWidth={1.5}
            className={cn('fill-surface', l.ring)}
          />
        )),
      )}
      {off.map((nodes, k) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a fixed drawing; positions never reorder
        <Show key={k} from={0.04 + k * 0.2} to={0.04 + (k + 1) * 0.2 - FADE} final={false}>
          {nodes.map(([li, ni]) => {
            const x = layers[li]?.x ?? 0;
            const y = layers[li]?.ys[ni] ?? 0;
            return (
              <g key={`${li}-${ni}`}>
                <circle cx={x} cy={y} r={11} className="fill-surface-2 stroke-line" />
                <path
                  d={`M${x - 5} ${y - 5} L${x + 5} ${y + 5} M${x + 5} ${y - 5} L${x - 5} ${y + 5}`}
                  strokeWidth={2}
                  className="stroke-bad"
                />
              </g>
            );
          })}
          <T x={14} y={16} anchor="start" mono bold size={10} tone="ink">
            {`training step ${k + 1}: ${nodes.length} neurons off`}
          </T>
        </Show>
      ))}
      <Show from={0.84}>
        <T x={14} y={16} anchor="start" mono bold size={10} tone="ok">
          test time: every neuron on
        </T>
      </Show>
      <T x={160} y={172} size={9.5}>
        A new random set is switched off at every step
      </T>
    </>
  );
}

function EarlyStopping() {
  const px = (e: number) => 34 + e * 13.5;
  const py = (l: number) => 150 - l * 130;
  const train = (e: number) => 0.1 + 0.85 * Math.exp(-e / 5);
  const val = (e: number) => 0.2 + 0.75 * Math.exp(-e / 5) + 0.0025 * Math.max(0, e - 8) ** 2;
  const pts = (f: (e: number) => number) =>
    Array.from({ length: 41 }, (_, i) => `${px(i / 2).toFixed(1)},${py(f(i / 2)).toFixed(1)}`).join(
      ' ',
    );
  const best = 11;
  return (
    <>
      <line x1={34} y1={150} x2={304} y2={150} className="stroke-line-2" />
      <line x1={34} y1={14} x2={34} y2={150} className="stroke-line-2" />
      <T x={40} y={12} anchor="start" mono size={8.5}>
        loss
      </T>
      <T x={304} y={164} anchor="end" mono size={8.5}>
        epochs
      </T>
      <Show from={0.6}>
        <rect
          x={px(best)}
          y={14}
          width={304 - px(best)}
          height={136}
          className="fill-bad"
          opacity={0.06}
        />
        <T x={250} y={40} size={9.5} tone="bad">
          overfitting
        </T>
      </Show>
      <polyline
        points={pts(train)}
        pathLength={1}
        strokeDasharray="1"
        strokeWidth={2.25}
        className="fill-none stroke-brand"
      >
        <Anim attr="stroke-dashoffset" keys={drawKeys(0.05, 0.8)} />
      </polyline>
      <polyline
        points={pts(val)}
        pathLength={1}
        strokeDasharray="1"
        strokeWidth={2.25}
        className="fill-none stroke-g1"
      >
        <Anim attr="stroke-dashoffset" keys={drawKeys(0.05, 0.8)} />
      </polyline>
      <Show from={0.47}>
        <line
          x1={px(best)}
          y1={20}
          x2={px(best)}
          y2={150}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          className="stroke-ok"
        />
        <circle cx={px(best)} cy={py(val(best))} r={4.5} className="fill-ok" />
        <T x={px(best) + 6} y={py(val(best)) - 30} anchor="start" size={9.5} tone="ok">
          stop here:
        </T>
        <T x={px(best) + 6} y={py(val(best)) - 18} anchor="start" size={9.5} tone="ok">
          best validation loss
        </T>
      </Show>
      <rect x={80} y={18} width={12} height={3} rx={1.5} className="fill-brand" />
      <T x={98} y={23} anchor="start" size={9.5} tone="ink">
        training loss
      </T>
      <rect x={80} y={32} width={12} height={3} rx={1.5} className="fill-g1" />
      <T x={98} y={37} anchor="start" size={9.5} tone="ink">
        validation loss
      </T>
    </>
  );
}

function BatchNorm() {
  const raw = [5, 6.5, 7, 8, 9, 9.5, 10.5, 12];
  const mean = raw.reduce((a, b) => a + b, 0) / raw.length;
  const std = Math.sqrt(raw.reduce((a, b) => a + (b - mean) ** 2, 0) / raw.length);
  const px = (v: number) => 20 + (v + 4) * 17.5;
  return (
    <>
      <T x={160} y={18} mono size={10.5} tone="ink">
        x̂ = (x − mean) / std
      </T>
      <Show from={0.5}>
        <rect
          x={px(-1)}
          y={58}
          width={px(1) - px(-1)}
          height={40}
          rx={6}
          className="fill-brand-soft"
        />
      </Show>
      <line x1={20} y1={98} x2={300} y2={98} className="stroke-line-2" />
      {[-4, 0, 4, 8, 12].map((v) => (
        <g key={v}>
          <line x1={px(v)} y1={95} x2={px(v)} y2={101} className="stroke-line-2" />
          <T x={px(v)} y={113} mono size={8.5}>
            {String(v)}
          </T>
        </g>
      ))}
      {raw.map((v, i) => {
        const z = (v - mean) / std;
        return (
          <circle key={v} cx={px(z)} cy={78 - (i % 2) * 10} r={5} className="fill-brand">
            <Anim
              attr="cx"
              keys={[
                [0, px(v)],
                [0.3, px(v)],
                [0.5, px(z)],
                [0.95, px(z)],
                [1, px(v)],
              ]}
            />
          </circle>
        );
      })}
      <Show to={0.45} final={false}>
        <T x={160} y={140} size={10} tone="ink">
          {`layer outputs: mean ${mean.toFixed(1)}, spread ${std.toFixed(1)}`}
        </T>
      </Show>
      <Show from={0.5}>
        <T x={160} y={140} size={10} tone="ok">
          after batch norm: mean 0, spread 1
        </T>
      </Show>
      <T x={160} y={160} size={9}>
        then a learned scale and shift (γ, β)
      </T>
    </>
  );
}

function VanishingGradient() {
  const rows = [
    {
      label: 'sigmoid layers',
      base: 64,
      heights: [40, 10, 2.5, 0.8, 0.4, 0.3],
      cls: 'fill-bad',
      note: '×0.25 or less per layer',
      tone: 'bad' as const,
    },
    {
      label: 'ReLU + good init',
      base: 148,
      heights: [40, 36, 38, 35, 37, 34],
      cls: 'fill-ok',
      note: 'still strong at layer 1',
      tone: 'ok' as const,
    },
  ];
  return (
    <>
      <T x={306} y={14} anchor="end" size={9}>
        ← gradient flows back from the output
      </T>
      {rows.map((r) => (
        <g key={r.label}>
          <T x={14} y={r.base - 46} anchor="start" mono bold size={9.5} tone="ink">
            {r.label}
          </T>
          {r.heights.map((h, k) => {
            const layer = 6 - k;
            const x = 20 + (layer - 1) * 34;
            const t = 0.08 + k * 0.1;
            return (
              <g key={layer}>
                <rect x={x} y={r.base - h} width={24} height={h} rx={2} className={r.cls}>
                  <Anim
                    attr="height"
                    keys={[
                      [0, 0],
                      [t, 0],
                      [t + 0.08, h],
                    ]}
                  />
                  <Anim
                    attr="y"
                    keys={[
                      [0, r.base],
                      [t, r.base],
                      [t + 0.08, r.base - h],
                    ]}
                  />
                </rect>
                <T x={x + 12} y={r.base + 12} mono size={8}>
                  {`L${layer}`}
                </T>
              </g>
            );
          })}
          <line x1={16} y1={r.base} x2={222} y2={r.base} className="stroke-line-2" />
          <Show from={0.7}>
            <T x={230} y={r.base - 18} anchor="start" size={9} tone={r.tone}>
              {r.note.split(' ').slice(0, 3).join(' ')}
            </T>
            <T x={230} y={r.base - 6} anchor="start" size={9} tone={r.tone}>
              {r.note.split(' ').slice(3).join(' ')}
            </T>
          </Show>
        </g>
      ))}
    </>
  );
}

function ConvFilter() {
  const img = [1, 1, 1, 0, 0];
  const out = [0, 3, 3];
  const C = 22;
  const ix = 14;
  const iy = 42;
  const ox = 232;
  const oy = 64;
  return (
    <>
      <T x={ix + (5 * C) / 2} y={34} size={9.5} tone="ink">
        image 5 × 5
      </T>
      {Array.from({ length: 25 }, (_, k) => {
        const r = Math.floor(k / 5);
        const c = k % 5;
        const v = img[c] ?? 0;
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed drawing; positions never reorder
          <g key={k}>
            <rect
              x={ix + c * C}
              y={iy + r * C}
              width={C}
              height={C}
              className={v ? 'fill-brand-soft stroke-line' : 'fill-surface stroke-line'}
            />
            <T
              x={ix + c * C + C / 2}
              y={iy + r * C + 15}
              mono
              size={10}
              tone={v ? 'brand' : 'muted'}
            >
              {String(v)}
            </T>
          </g>
        );
      })}
      <T x={170} y={50} size={9.5} tone="ink">
        filter
      </T>
      {Array.from({ length: 9 }, (_, k) => {
        const r = Math.floor(k / 3);
        const c = k % 3;
        const v = [1, 0, -1][c] ?? 0;
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed drawing; positions never reorder
          <g key={k}>
            <rect
              x={146 + c * 16}
              y={58 + r * 16}
              width={16}
              height={16}
              className="fill-warn-bg stroke-warn"
            />
            <T x={146 + c * 16 + 8} y={58 + r * 16 + 11.5} mono size={8.5} tone="warn">
              {String(v)}
            </T>
          </g>
        );
      })}
      <T x={170} y={124} size={8.5}>
        vertical-edge
      </T>
      <T x={170} y={134} size={8.5}>
        detector
      </T>
      <T x={ox + (3 * C) / 2} y={56} size={9.5} tone="ink">
        feature map 3 × 3
      </T>
      {Array.from({ length: 9 }, (_, k) => {
        const r = Math.floor(k / 3);
        const c = k % 3;
        const t = 0.05 + k * 0.1;
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed drawing; positions never reorder
          <g key={k}>
            <rect
              x={ox + c * C}
              y={oy + r * C}
              width={C}
              height={C}
              className="fill-surface stroke-line"
            />
            <Show from={t + 0.02}>
              <rect
                x={ox + c * C}
                y={oy + r * C}
                width={C}
                height={C}
                className={out[c] ? 'fill-ok-bg stroke-line' : 'fill-surface-2 stroke-line'}
              />
              <T
                x={ox + c * C + C / 2}
                y={oy + r * C + 15}
                mono
                bold
                size={10.5}
                tone={out[c] ? 'ok' : 'muted'}
              >
                {String(out[c])}
              </T>
            </Show>
            <Show from={t} to={t + 0.1 - FADE} final={false}>
              <rect
                x={ox + c * C}
                y={oy + r * C}
                width={C}
                height={C}
                strokeWidth={2.5}
                className="fill-none stroke-brand"
              />
            </Show>
          </g>
        );
      })}
      <Move
        discrete
        at={[44, 44]}
        keys={Array.from(
          { length: 9 },
          (_, k) => [0.05 + k * 0.1, [(k % 3) * C, Math.floor(k / 3) * C]] as const,
        ).map((kv, i) => (i === 0 ? ([0, kv[1]] as const) : kv))}
      >
        <rect
          x={ix}
          y={iy}
          width={3 * C}
          height={3 * C}
          rx={3}
          strokeWidth={2.5}
          className="fill-none stroke-brand"
        />
      </Move>
      <T x={160} y={166} size={9.5}>
        Slide the filter, multiply, add: one number per position
      </T>
    </>
  );
}

function MaxPool() {
  const grid = [
    [1, 3, 2, 0],
    [5, 6, 1, 2],
    [0, 2, 9, 4],
    [3, 1, 8, 7],
  ];
  const C = 26;
  const ix = 24;
  const iy = 38;
  const quads = [
    { r: 0, c: 0, max: [1, 1] },
    { r: 0, c: 2, max: [1, 3] },
    { r: 2, c: 0, max: [3, 0] },
    { r: 2, c: 2, max: [2, 2] },
  ];
  return (
    <>
      <T x={ix + 2 * C} y={30} size={9.5} tone="ink">
        feature map 4 × 4
      </T>
      {grid.flatMap((row, r) =>
        row.map((v, c) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed drawing; positions never reorder
          <g key={`${r}-${c}`}>
            <rect
              x={ix + c * C}
              y={iy + r * C}
              width={C}
              height={C}
              className="fill-surface stroke-line"
            />
            <T x={ix + c * C + C / 2} y={iy + r * C + 17} mono size={11} tone="ink">
              {String(v)}
            </T>
          </g>
        )),
      )}
      <T x={244} y={54} size={9.5} tone="ink">
        after max pooling
      </T>
      {quads.map((q, k) => {
        const t = 0.06 + k * 0.2;
        const [mr, mc] = q.max as [number, number];
        const v = grid[mr]?.[mc] ?? 0;
        const or = q.r / 2;
        const oc = q.c / 2;
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed drawing; positions never reorder
          <g key={k}>
            <Show from={t} to={t + 0.2 - FADE} final={false}>
              <rect
                x={ix + q.c * C}
                y={iy + q.r * C}
                width={2 * C}
                height={2 * C}
                strokeWidth={2.5}
                className="fill-none stroke-brand"
              />
              <rect
                x={ix + mc * C + 2}
                y={iy + mr * C + 2}
                width={C - 4}
                height={C - 4}
                rx={4}
                strokeWidth={2}
                className="fill-none stroke-ok"
              />
            </Show>
            <rect
              x={214 + oc * 30}
              y={62 + or * 30}
              width={30}
              height={30}
              className="fill-surface stroke-line"
            />
            <Show from={t + 0.06}>
              <rect
                x={214 + oc * 30}
                y={62 + or * 30}
                width={30}
                height={30}
                className="fill-ok-bg stroke-line"
              />
              <T x={229 + oc * 30} y={82 + or * 30} mono bold size={12} tone="ok">
                {String(v)}
              </T>
            </Show>
          </g>
        );
      })}
      <T x={160} y={164} size={9.5}>
        Keep the strongest value in each 2 × 2 block
      </T>
    </>
  );
}

function CnnPipeline() {
  const stages = [
    { label: 'image', x: 10, w: 40, h: 40, n: 1 },
    { label: 'conv', x: 64, w: 32, h: 40, n: 3 },
    { label: 'pool', x: 112, w: 22, h: 26, n: 3 },
    { label: 'conv', x: 148, w: 18, h: 26, n: 5 },
    { label: 'pool', x: 184, w: 12, h: 16, n: 5 },
  ];
  const cx = (s: (typeof stages)[number]) => s.x + s.w / 2 + s.n * 1.5;
  const outs = [
    { label: '"7"', p: 0.91 },
    { label: '"1"', p: 0.06 },
    { label: '"9"', p: 0.03 },
  ];
  const seven: Array<[number, number]> = [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [3, 1],
    [2, 2],
    [2, 3],
    [1, 4],
  ];
  return (
    <>
      <T x={160} y={18} size={9.5} tone="ink">
        Learns edges, then shapes, then whole objects
      </T>
      {stages.map((s, i) => {
        const top = 90 - s.h / 2;
        const t = 0.06 + i * 0.12;
        return (
          <g key={`${s.label}${s.x}`}>
            {Array.from({ length: s.n }, (_, k) => (
              <rect
                // biome-ignore lint/suspicious/noArrayIndexKey: stacked maps
                key={k}
                x={s.x + k * 3}
                y={top - k * 3}
                width={s.w}
                height={s.h}
                rx={2}
                className={i === 0 ? 'fill-surface stroke-ink' : 'fill-brand-soft stroke-brand'}
              />
            ))}
            {i === 0 &&
              seven.map(([c, r]) => (
                <rect
                  key={`${c}${r}`}
                  x={s.x + 6 + c * 7}
                  y={top + 4 + r * 7}
                  width={6}
                  height={6}
                  className="fill-ink"
                />
              ))}
            <T x={s.x + s.w / 2} y={132} size={8.5}>
              {s.label}
            </T>
            <Show from={t} to={t + 0.12} final={false}>
              <rect
                x={s.x - 3}
                y={top - s.n * 3 - 3}
                width={s.w + s.n * 3 + 6}
                height={s.h + s.n * 3 + 6}
                rx={4}
                strokeWidth={2}
                className="fill-none stroke-g1"
              />
            </Show>
            {i < stages.length - 1 && (
              <Pulse
                a={[cx(s) + s.w / 2, 90]}
                b={[stages[i + 1]?.x ?? 0, 90]}
                t0={t + 0.06}
                t1={t + 0.12}
                cls="fill-g1"
              />
            )}
          </g>
        );
      })}
      {Array.from({ length: 6 }, (_, k) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a fixed drawing; positions never reorder
        <circle key={k} cx={222} cy={60 + k * 12} r={3.5} className="fill-brand" />
      ))}
      <T x={222} y={132} size={8.5}>
        flatten
      </T>
      {outs.map((o, k) => (
        <g key={o.label}>
          <T x={246} y={72 + k * 18} anchor="start" mono size={8.5} tone="ink">
            {o.label}
          </T>
          <rect
            x={268}
            y={64 + k * 18}
            width={Math.max(1, o.p * 42)}
            height={10}
            rx={2}
            className={k === 0 ? 'fill-ok' : 'fill-line-2'}
          >
            <Anim
              attr="width"
              keys={[
                [0, 0],
                [0.7, 0],
                [0.82, Math.max(1, o.p * 42)],
              ]}
            />
          </rect>
        </g>
      ))}
      <Show from={0.82}>
        <T x={290} y={128} mono bold size={9} tone="ok">
          "7" 0.91
        </T>
      </Show>
      <T x={160} y={164} size={9.5}>
        The maps get smaller but more numerous; dense layers decide
      </T>
    </>
  );
}

function FeatureHierarchy() {
  const panels = [
    { x: 12, label: 'layer 1: edges', t: 0.05 },
    { x: 116, label: 'layer 2: shapes', t: 0.35 },
    { x: 220, label: 'layer 3: objects', t: 0.65 },
  ];
  return (
    <>
      <T x={160} y={18} size={9.5} tone="ink">
        Early layers see edges; deeper layers see whole objects
      </T>
      {panels.map((p, i) => (
        <g key={p.label}>
          <Box x={p.x} y={30} w={88} h={96} r={10} />
          <T x={p.x + 44} y={144} mono size={9} tone="ink">
            {p.label}
          </T>
          {i < 2 && <Arrow x1={p.x + 90} y1={78} x2={p.x + 102} y2={78} />}
          <Show from={p.t}>
            {i === 0 && (
              <g strokeWidth={2.5} strokeLinecap="round" className="stroke-brand">
                <line x1={26} y1={48} x2={46} y2={48} />
                <line x1={62} y1={44} x2={62} y2={66} />
                <line x1={76} y1={52} x2={90} y2={66} />
                <line x1={28} y1={86} x2={44} y2={70} />
                <line x1={54} y1={96} x2={78} y2={96} />
                <line x1={84} y1={80} x2={84} y2={110} />
              </g>
            )}
            {i === 1 && (
              <g strokeWidth={2.5} strokeLinecap="round" className="fill-none stroke-g2">
                <circle cx={142} cy={58} r={12} />
                <path d="M172 46 L172 70 L192 70" />
                <path d="M130 104 A14 14 0 0 1 158 104" />
                <rect x={168} y={88} width={24} height={20} rx={3} />
              </g>
            )}
            {i === 2 && (
              <g strokeWidth={2.5} strokeLinecap="round" className="fill-none stroke-g3">
                <path d="M232 94 L232 80 L246 80 L254 66 L282 66 L290 80 L298 80 L298 94 Z" />
                <rect x={256} y={70} width={24} height={10} rx={2} />
                <circle cx={248} cy={98} r={8} />
                <circle cx={284} cy={98} r={8} />
              </g>
            )}
          </Show>
        </g>
      ))}
      <T x={160} y={164} size={9.5}>
        Each layer builds on the patterns found by the one before
      </T>
    </>
  );
}

function TransferLearning() {
  return (
    <>
      <T x={112} y={34} size={9.5} tone="ink">
        pretrained on millions of photos
      </T>
      {Array.from({ length: 5 }, (_, i) => {
        const x = 14 + i * 42;
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed drawing; positions never reorder
          <g key={i}>
            <Box x={x} y={46} w={36} h={60} r={6} tone="soft" />
            <T x={x + 18} y={98} mono size={8}>
              {`block ${i + 1}`}
            </T>
            {i < 4 && <Arrow x1={x + 37} y1={76} x2={x + 41} y2={76} />}
            {i < 4 ? (
              <Lock x={x + 11} y={64} />
            ) : (
              <Show to={0.5} final={false}>
                <Lock x={x + 11} y={64} />
              </Show>
            )}
          </g>
        );
      })}
      <Arrow x1={221} y1={76} x2={238} y2={76} tone="brand" />
      <Box x={240} y={46} w={68} h={60} r={8} tone="brand" width={1.5} />
      <T x={274} y={72} mono bold size={9.5} tone="brand">
        new head
      </T>
      <T x={274} y={88} mono size={8.5} tone="brand">
        3 classes
      </T>
      <Show from={0.08} to={0.9} final={false}>
        <Box x={240} y={46} w={68} h={60} r={8} tone="ringOk" width={2.5} />
      </Show>
      <Show from={0.55} to={0.9} final={false}>
        <Box x={182} y={46} w={36} h={60} r={6} tone="ringOk" width={2.5} />
      </Show>
      <Show from={0.05}>
        <T x={14} y={132} anchor="start" size={9.5} tone="ink">
          1 freeze the pretrained blocks, train a new head
        </T>
      </Show>
      <Show from={0.5}>
        <T x={14} y={150} anchor="start" size={9.5} tone="ok">
          2 fine-tune: unfreeze the last block, small learning rate
        </T>
      </Show>
      <T x={160} y={172} size={9}>
        Reuse what the network already learned about images
      </T>
    </>
  );
}

function IouBoxes() {
  const g = { x: 40, y: 30, w: 120, h: 90 };
  const a: Pt = [80, 50];
  const b: Pt = [50, 36];
  const move: ReadonlyArray<readonly [number, Pt]> = [
    [0, [0, 0]],
    [0.5, [0, 0]],
    [0.6, [b[0] - a[0], b[1] - a[1]]],
    [0.95, [b[0] - a[0], b[1] - a[1]]],
    [1, [0, 0]],
  ];
  const ov = (p: Pt) => ({
    x: Math.max(g.x, p[0]),
    y: Math.max(g.y, p[1]),
    w: Math.min(g.x + g.w, p[0] + 120) - Math.max(g.x, p[0]),
    h: Math.min(g.y + g.h, p[1] + 90) - Math.max(g.y, p[1]),
  });
  const o1 = ov(a);
  const o2 = ov(b);
  const keys = (k: 'x' | 'y' | 'w' | 'h'): Keys => [
    [0, o1[k]],
    [0.5, o1[k]],
    [0.6, o2[k]],
    [0.95, o2[k]],
    [1, o1[k]],
  ];
  return (
    <>
      <rect x={o2.x} y={o2.y} width={o2.w} height={o2.h} className="fill-brand" opacity={0.22}>
        <Anim attr="x" keys={keys('x')} />
        <Anim attr="y" keys={keys('y')} />
        <Anim attr="width" keys={keys('w')} />
        <Anim attr="height" keys={keys('h')} />
      </rect>
      <rect
        x={g.x}
        y={g.y}
        width={g.w}
        height={g.h}
        strokeWidth={2}
        strokeDasharray="6 4"
        className="fill-none stroke-ok"
      />
      <T x={g.x} y={g.y - 6} anchor="start" size={9} tone="ok">
        ground truth
      </T>
      <Move keys={move} at={[b[0] - a[0], b[1] - a[1]]}>
        <rect
          x={a[0]}
          y={a[1]}
          width={120}
          height={90}
          strokeWidth={2}
          className="fill-none stroke-brand"
        />
        <T x={a[0] + 120} y={a[1] + 102} anchor="end" size={9} tone="brand">
          prediction
        </T>
      </Move>
      <T x={250} y={36} mono bold size={10} tone="ink">
        IoU =
      </T>
      <T x={250} y={50} mono size={9.5} tone="ink">
        overlap / union
      </T>
      <Show to={0.55} final={false}>
        <T x={250} y={78} mono size={9.5}>
          5,600 / 16,000
        </T>
        <T x={250} y={96} mono bold size={13} tone="bad">
          0.35
        </T>
        <T x={250} y={114} size={9} tone="bad">
          below 0.5: a miss
        </T>
      </Show>
      <Show from={0.6}>
        <T x={250} y={78} mono size={9.5}>
          9,240 / 12,360
        </T>
        <T x={250} y={96} mono bold size={13} tone="ok">
          0.75
        </T>
        <T x={250} y={114} size={9} tone="ok">
          above 0.5: a hit
        </T>
      </Show>
      <T x={160} y={166} size={9.5}>
        How well a predicted box matches the true box
      </T>
    </>
  );
}

function NmsBoxes() {
  const boxes = [
    { x: 36, y: 44, w: 118, h: 90, s: '0.92', keep: true, at: 0.35 },
    { x: 48, y: 56, w: 110, h: 84, s: '0.85', keep: false, at: 0.5 },
    { x: 30, y: 52, w: 104, h: 86, s: '0.78', keep: false, at: 0.58 },
    { x: 194, y: 54, w: 102, h: 82, s: '0.88', keep: true, at: 0.68 },
  ];
  return (
    <>
      <rect x={52} y={64} width={86} height={58} rx={14} className="fill-surface-3" />
      <rect x={210} y={70} width={70} height={54} rx={14} className="fill-surface-3" />
      {boxes.map((b) => (
        <g key={b.s}>
          {b.keep ? (
            <g>
              <rect
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                strokeWidth={1.75}
                className="fill-none stroke-brand"
              />
              <Show from={b.at}>
                <rect
                  x={b.x}
                  y={b.y}
                  width={b.w}
                  height={b.h}
                  strokeWidth={2.5}
                  className="fill-none stroke-ok"
                />
              </Show>
            </g>
          ) : (
            <Show to={b.at + 0.08} final={false}>
              <rect
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                strokeWidth={1.75}
                className="fill-none stroke-brand"
              />
              <Show from={b.at}>
                <rect
                  x={b.x}
                  y={b.y}
                  width={b.w}
                  height={b.h}
                  strokeWidth={2.5}
                  className="fill-none stroke-bad"
                />
              </Show>
            </Show>
          )}
          {b.keep ? (
            <Chip x={b.x} y={b.y - 16} w={36} h={15} label={b.s} tone="soft" size={8.5} />
          ) : (
            <Show to={b.at + 0.08} final={false}>
              <Chip
                x={b.s === '0.78' ? b.x : b.x + b.w - 36}
                y={b.y + b.h + 2}
                w={36}
                h={15}
                label={b.s}
                tone="soft"
                size={8.5}
              />
            </Show>
          )}
        </g>
      ))}
      <Show from={0.2} to={0.34} final={false}>
        <T x={160} y={14} size={9.5} tone="ink">
          1 sort the boxes by score
        </T>
      </Show>
      <Show from={0.35} to={0.66} final={false}>
        <T x={160} y={14} size={9.5} tone="ink">
          2 keep 0.92; drop boxes overlapping it (IoU over 0.5)
        </T>
      </Show>
      <Show from={0.68}>
        <T x={160} y={14} size={9.5} tone="ok">
          3 repeat for the rest: 0.88 overlaps nothing, so keep it
        </T>
      </Show>
      <T x={160} y={166} size={9.5}>
        Non-maximum suppression: one box per object
      </T>
    </>
  );
}

function ActivationCurves() {
  const px = (z: number) => 120 + z * 36;
  const py = (v: number) => 70 - v * 36;
  const curve = (f: (z: number) => number) =>
    Array.from({ length: 41 }, (_, i) => {
      const z = -3 + i * 0.15;
      return `${px(z).toFixed(1)},${py(f(z)).toFixed(1)}`;
    }).join(' ');
  const lines = [
    { pts: curve((z) => 1 / (1 + Math.exp(-z))), cls: 'stroke-brand', t: [0.05, 0.35] as const },
    { pts: curve(Math.tanh), cls: 'stroke-g2', t: [0.3, 0.6] as const },
    {
      pts: `${px(-3)},${py(0)} ${px(0)},${py(0)} ${px(1.7)},${py(1.7)}`,
      cls: 'stroke-g1',
      t: [0.55, 0.85] as const,
    },
  ];
  return (
    <>
      <line x1={10} y1={py(0)} x2={230} y2={py(0)} className="stroke-line-2" />
      <line x1={120} y1={6} x2={120} y2={118} className="stroke-line-2" />
      <line x1={10} y1={py(1)} x2={230} y2={py(1)} strokeDasharray="3 3" className="stroke-line" />
      <line
        x1={10}
        y1={py(-1)}
        x2={230}
        y2={py(-1)}
        strokeDasharray="3 3"
        className="stroke-line"
      />
      <T x={114} y={py(1) - 3} anchor="end" mono size={7.5}>
        1
      </T>
      <T x={114} y={py(-1) - 3} anchor="end" mono size={7.5}>
        −1
      </T>
      {lines.map((l) => (
        <polyline
          key={l.cls}
          points={l.pts}
          pathLength={1}
          strokeDasharray="1"
          strokeWidth={2.5}
          className={cn('fill-none', l.cls)}
        >
          <Anim attr="stroke-dashoffset" keys={drawKeys(l.t[0], l.t[1])} />
        </polyline>
      ))}
      <T x={196} y={54} size={10} tone="brand" bold mono>
        sigmoid
      </T>
      <T x={42} y={100} size={10} tone="g2" bold mono>
        tanh
      </T>
      <T x={150} y={20} anchor="end" size={10} tone="g1" bold mono>
        ReLU
      </T>
    </>
  );
}

// ───────────── NLP: text preprocessing and representation ─────────────

/** Mono chips laid out left to right from x, `gap` apart (char width ≈ 0.6 × font size). */
function chipRow(words: ReadonlyArray<string>, x0: number, size: number, gap = 3) {
  return words.reduce<Array<{ word: string; x: number; w: number }>>((row, word) => {
    const last = row[row.length - 1];
    const x = last ? last.x + last.w + gap : x0;
    row.push({ word, x, w: word.length * size * 0.6 + 10 });
    return row;
  }, []);
}

function ReviewSorter() {
  const reviews = [
    { text: 'Delivery was LATE!!', tokens: 'delivery late', vec: [1, 1, 0, 0, 0, 0], ok: false },
    { text: 'Loved the biryani', tokens: 'loved biryani', vec: [0, 0, 1, 1, 0, 0], ok: true },
    {
      text: 'Food was cold and late',
      tokens: 'food cold late',
      vec: [0, 1, 0, 0, 1, 1],
      ok: false,
    },
  ];
  const at = (i: number) => 0.05 + i * 0.3;
  const counts = { bad: [0.3, 0.9], ok: [0.6] };
  return (
    <>
      <T x={160} y={16} size={9.5} tone="ink">
        Text in, numbers in the middle, a decision out
      </T>
      <T x={62} y={34} size={8.5}>
        reviews
      </T>
      <Box x={132} y={44} w={76} h={78} r={8} tone="soft" />
      <T x={170} y={57} size={8}>
        clean
      </T>
      <T x={170} y={92} size={8}>
        count words
      </T>
      <Arrow x1={209} y1={83} x2={219} y2={83} />
      <Box x={221} y={70} w={34} h={26} r={6} tone="brand" width={1.5} />
      <T x={238} y={86} mono size={8.5} tone="brand" bold>
        model
      </T>
      <Arrow x1={256} y1={78} x2={263} y2={64} />
      <Arrow x1={256} y1={88} x2={263} y2={102} />
      <Box x={265} y={44} w={50} h={34} r={6} tone="bad" />
      <T x={290} y={57} mono size={8} tone="bad">
        complaint
      </T>
      <Box x={265} y={92} w={50} h={34} r={6} tone="ok" />
      <T x={290} y={105} mono size={8} tone="ok">
        praise
      </T>
      {[0, 1, 2].map((n) => {
        const from = n === 0 ? 0 : (counts.bad[n - 1] ?? 1);
        const to = counts.bad[n];
        return (
          <Show key={`bad${n}`} from={from} to={to} final={n === 2}>
            <T x={290} y={72} mono bold size={11} tone="bad">
              {String(n)}
            </T>
          </Show>
        );
      })}
      <Show to={0.6} final={false}>
        <T x={290} y={120} mono bold size={11} tone="ok">
          0
        </T>
      </Show>
      <Show from={0.6}>
        <T x={290} y={120} mono bold size={11} tone="ok">
          1
        </T>
      </Show>
      {reviews.map((r, i) => {
        const t = at(i);
        const y = 40 + i * 34;
        const last = i === reviews.length - 1;
        return (
          <g key={r.text}>
            <Box x={6} y={y} w={116} h={24} r={6} />
            <T x={12} y={y + 15} anchor="start" mono size={8} tone="ink">
              {r.text}
            </T>
            <Show from={t} to={t + 0.25} final={false}>
              <Box x={6} y={y} w={116} h={24} r={6} tone="ring" width={2} />
            </Show>
            <Show from={t + 0.25}>
              <Box x={6} y={y} w={116} h={24} r={6} tone={r.ok ? 'ringOk' : 'ringBad'} width={2} />
            </Show>
            <Pulse a={[122, y + 12]} b={[132, 70]} t0={t + 0.02} t1={t + 0.07} />
            <Show from={t + 0.07} to={last ? undefined : t + 0.28} final={last}>
              <T x={170} y={74} mono size={8} tone="ink">
                {r.tokens}
              </T>
            </Show>
            <Show from={t + 0.12} to={last ? undefined : t + 0.28} final={last}>
              {r.vec.map((v, k) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: a fixed drawing; positions never reorder
                <g key={k}>
                  <rect
                    x={134 + k * 12}
                    y={98}
                    width={12}
                    height={14}
                    className={v ? 'fill-brand-soft stroke-brand' : 'fill-surface stroke-line'}
                  />
                  <T x={140 + k * 12} y={108.5} mono size={8.5} tone={v ? 'brand' : 'muted'}>
                    {String(v)}
                  </T>
                </g>
              ))}
            </Show>
            <Pulse a={[208, 83]} b={[238, 83]} t0={t + 0.16} t1={t + 0.2} />
            <Pulse
              a={[256, 83]}
              b={[270, r.ok ? 109 : 61]}
              t0={t + 0.2}
              t1={t + 0.25}
              cls={r.ok ? 'fill-ok' : 'fill-bad'}
            />
          </g>
        );
      })}
      <T x={160} y={160} size={9.5}>
        Every NLP model needs the text turned into numbers first
      </T>
    </>
  );
}

function TokenPipeline() {
  const tokens = ['delivery', 'was', 'late', 'but', 'the', 'biryani', 'was', 'amazing'];
  const stop = new Set(['was', 'but', 'the']);
  const row = chipRow(tokens, 10, 8.5);
  const kept = chipRow(
    tokens.filter((t) => !stop.has(t)),
    10,
    8.5,
    5,
  );
  return (
    <>
      <T x={12} y={16} anchor="start" size={8.5}>
        raw review
      </T>
      <Box x={8} y={22} w={304} h={22} r={6} tone="soft" />
      <T x={16} y={36.5} anchor="start" mono size={8.5} tone="ink">
        Delivery was LATE, but the biryani was amazing!!
      </T>
      <Show from={0.1}>
        <T x={12} y={62} anchor="start" size={8.5} tone="ink">
          1 lowercase it and split it into words (tokens)
        </T>
      </Show>
      {row.map((c, k) => {
        const isStop = stop.has(c.word);
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: "was" appears twice; positions never reorder
          <Show key={k} from={0.12 + k * 0.04}>
            <Chip x={c.x} y={68} w={c.w} h={20} label={c.word} size={8.5} />
            {isStop && (
              <Show from={0.52}>
                <Chip
                  x={c.x}
                  y={68}
                  w={c.w}
                  h={20}
                  label={c.word}
                  tone="bad"
                  text="bad"
                  size={8.5}
                />
                <line
                  x1={c.x + 4}
                  y1={78}
                  x2={c.x + c.w - 4}
                  y2={78}
                  strokeWidth={1.25}
                  className="stroke-bad"
                />
              </Show>
            )}
          </Show>
        );
      })}
      <Show from={0.5}>
        <T x={12} y={108} anchor="start" size={8.5} tone="ink">
          2 drop stop words (filler such as was, but, the)
        </T>
      </Show>
      {kept.map((c, k) => (
        <Show key={c.word} from={0.62 + k * 0.05}>
          <Chip x={c.x} y={114} w={c.w} h={20} label={c.word} tone="ok" text="ok" size={8.5} />
        </Show>
      ))}
      <T x={160} y={152} size={9.5}>
        Fewer words, and each one carries meaning
      </T>
    </>
  );
}

function StemVsLemma() {
  const rows = [
    { word: 'studies', stem: 'studi', stemTone: 'warn', lemma: 'study' },
    { word: 'better', stem: 'better', stemTone: 'soft', lemma: 'good' },
    { word: 'running', stem: 'run', stemTone: 'ok', lemma: 'run' },
  ] as const;
  const text = { warn: 'warn', soft: 'muted', ok: 'ok' } as const;
  return (
    <>
      <T x={52} y={18} size={9.5} tone="ink" bold>
        stemming
      </T>
      <T x={52} y={30} size={8}>
        cuts endings by rule
      </T>
      <T x={160} y={18} size={9.5} tone="ink" bold>
        word
      </T>
      <T x={268} y={18} size={9.5} tone="ink" bold>
        lemmatization
      </T>
      <T x={268} y={30} size={8}>
        uses a dictionary
      </T>
      {rows.map((r, k) => {
        const y = 42 + k * 34;
        const ts = 0.1 + k * 0.12;
        const tl = 0.5 + k * 0.12;
        return (
          <g key={r.word}>
            <Chip x={120} y={y} w={80} label={r.word} tone="soft" />
            <Show from={ts}>
              <Arrow x1={118} y1={y + 11} x2={96} y2={y + 11} />
              <Chip x={12} y={y} w={80} label={r.stem} tone={r.stemTone} text={text[r.stemTone]} />
            </Show>
            <Show from={tl}>
              <Arrow x1={202} y1={y + 11} x2={224} y2={y + 11} />
              <Chip x={228} y={y} w={80} label={r.lemma} tone="ok" text="ok" />
            </Show>
          </g>
        );
      })}
      <T x={160} y={154} size={9.5}>
        Stems can be non-words (studi); lemmas are dictionary words
      </T>
    </>
  );
}

function BagOfWords() {
  const vocab = ['delivery', 'food', 'great', 'late'];
  const docs = [
    { text: 'late delivery', counts: [1, 0, 0, 1] },
    { text: 'great food', counts: [0, 1, 1, 0] },
    { text: 'late food late', counts: [0, 1, 0, 2] },
  ];
  const col = (j: number) => 126 + j * 47;
  return (
    <>
      <T x={160} y={16} size={9.5} tone="ink">
        Each review becomes a row of word counts
      </T>
      <T x={60} y={40} size={8.5}>
        review
      </T>
      {vocab.map((v, j) => (
        <T key={v} x={col(j) + 22.5} y={40} mono size={8.5} tone="ink" bold>
          {v}
        </T>
      ))}
      {docs.map((d, i) => {
        const y = 48 + i * 30;
        const t = 0.06 + i * 0.28;
        return (
          <g key={d.text}>
            <Chip x={8} y={y} w={104} h={24} label={d.text} size={9} />
            <Show from={t} to={t + 0.26} final={false}>
              <Box x={8} y={y} w={104} h={24} r={6} tone="ring" width={2} />
            </Show>
            <Arrow x1={114} y1={y + 12} x2={123} y2={y + 12} />
            {d.counts.map((c, j) => {
              const tc = t + 0.04 + j * 0.04;
              const twice = c === 2;
              return (
                // biome-ignore lint/suspicious/noArrayIndexKey: one cell per vocabulary column
                <g key={j}>
                  <rect
                    x={col(j)}
                    y={y}
                    width={45}
                    height={24}
                    className="fill-surface stroke-line"
                  />
                  {c > 0 && (
                    <Show from={tc}>
                      <rect
                        x={col(j)}
                        y={y}
                        width={45}
                        height={24}
                        className="fill-brand-soft stroke-line"
                      />
                    </Show>
                  )}
                  {twice && (
                    <Show from={tc} to={tc + 0.08} final={false}>
                      <T x={col(j) + 22.5} y={y + 16} mono bold size={11} tone="brand">
                        1
                      </T>
                    </Show>
                  )}
                  <Show from={twice ? tc + 0.08 : tc}>
                    <T
                      x={col(j) + 22.5}
                      y={y + 16}
                      mono
                      bold={c > 0}
                      size={11}
                      tone={c ? 'brand' : 'muted'}
                    >
                      {String(c)}
                    </T>
                  </Show>
                </g>
              );
            })}
          </g>
        );
      })}
      <T x={160} y={152} size={9.5}>
        Order is lost: "late food" and "food late" get the same row
      </T>
    </>
  );
}

function TfidfWeights() {
  const rows = [
    {
      word: 'food',
      count: 2,
      score: '0.10',
      value: 0.1026,
      df: 'in 950 of 1,000 reviews · IDF 0.05',
    },
    { word: 'late', count: 1, score: '1.20', value: 1.204, df: 'in 300 of 1,000 · IDF 1.20' },
    { word: 'refund', count: 1, score: '3.91', value: 3.912, df: 'in 20 of 1,000 · IDF 3.91' },
  ];
  const x0 = 72;
  return (
    <>
      <Show to={0.48} final={false}>
        <T x={160} y={16} size={9.5} tone="ink">
          Count in this review: "food" leads
        </T>
      </Show>
      <Show from={0.5}>
        <T x={160} y={16} size={9.5} tone="ink">
          Weighted by IDF (how rare): "refund" leads
        </T>
      </Show>
      {rows.map((r, i) => {
        const y = 32 + i * 38;
        const w1 = r.count * 48;
        const w2 = Math.max(3, r.value * 38);
        return (
          <g key={r.word}>
            <T x={12} y={y + 10} anchor="start" mono size={10} tone="ink" bold>
              {r.word}
            </T>
            <rect x={x0} y={y} width={w2} height={12} rx={2} className="fill-brand">
              <Anim
                attr="width"
                keys={[
                  [0, 0],
                  [0.08, w1],
                  [0.45, w1],
                  [0.6, w2],
                ]}
              />
            </rect>
            <Show from={0.04} to={0.47} final={false}>
              <T x={x0 + w1 + 5} y={y + 10} anchor="start" mono size={9.5} tone="ink">
                {String(r.count)}
              </T>
            </Show>
            <Show from={0.6}>
              <T x={x0 + w2 + 5} y={y + 10} anchor="start" mono bold size={9.5} tone="brand">
                {r.score}
              </T>
            </Show>
            <Show from={0.52}>
              <T x={x0} y={y + 25} anchor="start" mono size={8}>
                {r.df}
              </T>
            </Show>
          </g>
        );
      })}
      <T x={160} y={154} size={9.5}>
        TF-IDF: frequent in this review × rare across all reviews
      </T>
    </>
  );
}

function EmbeddingSpace() {
  const O: Pt = [34, 148];
  const R = 112;
  const at = (deg: number, len: number): Pt => [
    O[0] + R * len * Math.cos((deg * Math.PI) / 180),
    O[1] - R * len * Math.sin((deg * Math.PI) / 180),
  ];
  const words = [
    { w: 'dosa', deg: 79, len: 1, from: [70, 60], label: [6, 3], anchor: 'start' },
    { w: 'idli', deg: 85, len: 0.88, from: [96, 40], label: [-6, 3], anchor: 'end' },
    { w: 'biryani', deg: 70, len: 0.9, from: [40, 66], label: [6, 4], anchor: 'start' },
    { w: 'football', deg: 15, len: 0.88, from: [-70, -60], label: [-5, -5], anchor: 'end' },
    { w: 'cricket', deg: 6.5, len: 1, from: [-96, -80], label: [6, 4], anchor: 'start' },
  ] as const;
  const p = Object.fromEntries(words.map((w) => [w.w, at(w.deg, w.len)])) as Record<string, Pt>;
  const tip = (q: Pt): Pt => {
    const dx = q[0] - O[0];
    const dy = q[1] - O[1];
    const d = Math.hypot(dx, dy);
    return [O[0] + (dx * (d - 6)) / d, O[1] + (dy * (d - 6)) / d];
  };
  const arc = (r: number, a: number, b: number) => {
    const [x1, y1] = [
      O[0] + r * Math.cos((a * Math.PI) / 180),
      O[1] - r * Math.sin((a * Math.PI) / 180),
    ];
    const [x2, y2] = [
      O[0] + r * Math.cos((b * Math.PI) / 180),
      O[1] - r * Math.sin((b * Math.PI) / 180),
    ];
    return `M${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 0 0 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  };
  const dosa = p.dosa ?? O;
  const idli = p.idli ?? O;
  const cricket = p.cricket ?? O;
  return (
    <>
      <T x={160} y={14} size={9.5} tone="ink">
        Words used in similar ways sit close together
      </T>
      <line x1={O[0]} y1={O[1]} x2={176} y2={O[1]} className="stroke-line-2" />
      <line x1={O[0]} y1={O[1]} x2={O[0]} y2={26} className="stroke-line-2" />
      <Show from={0.3}>
        <ellipse cx={54} cy={48} rx={32} ry={20} className="fill-brand-soft" opacity={0.8} />
        <ellipse cx={138} cy={131} rx={27} ry={14} className="fill-surface-3" />
      </Show>
      <Show from={0.38}>
        <Arrow x1={O[0]} y1={O[1]} x2={tip(dosa)[0]} y2={tip(dosa)[1]} tone="brand" width={1.25} />
        <Arrow x1={O[0]} y1={O[1]} x2={tip(idli)[0]} y2={tip(idli)[1]} tone="brand" width={1.25} />
        <path d={arc(66, 79, 85)} strokeWidth={2} className="fill-none stroke-ok" />
      </Show>
      <Show from={0.64}>
        <Arrow
          x1={O[0]}
          y1={O[1]}
          x2={tip(cricket)[0]}
          y2={tip(cricket)[1]}
          tone="bad"
          width={1.25}
        />
        <path d={arc(24, 6.5, 79)} strokeWidth={1.75} className="fill-none stroke-bad" />
      </Show>
      {words.map((w) => {
        const q = p[w.w] ?? O;
        return (
          <Move
            key={w.w}
            keys={[
              [0, [w.from[0], w.from[1]]],
              [0.04, [w.from[0], w.from[1]]],
              [0.3, [0, 0]],
            ]}
          >
            <circle cx={q[0]} cy={q[1]} r={3.5} className="fill-ink" />
            <T
              x={q[0] + w.label[0]}
              y={q[1] + w.label[1]}
              anchor={w.anchor}
              mono
              size={9}
              tone="ink"
            >
              {w.w}
            </T>
          </Move>
        );
      })}
      <T x={198} y={46} anchor="start" size={9.5} tone="ink" bold>
        cosine similarity
      </T>
      <T x={198} y={59} anchor="start" size={8}>
        1 = same direction
      </T>
      <Show from={0.4}>
        <T x={198} y={86} anchor="start" mono size={9} tone="ink">
          dosa · idli
        </T>
        <T x={312} y={86} anchor="end" mono bold size={12} tone="ok">
          0.99
        </T>
        <T x={198} y={99} anchor="start" size={8} tone="ok">
          small angle: similar
        </T>
      </Show>
      <Show from={0.66}>
        <T x={198} y={122} anchor="start" mono size={9} tone="ink">
          dosa · cricket
        </T>
        <T x={312} y={122} anchor="end" mono bold size={12} tone="bad">
          0.30
        </T>
        <T x={198} y={135} anchor="start" size={8} tone="bad">
          wide angle: unrelated
        </T>
      </Show>
      <T x={160} y={170} size={9}>
        Real embeddings have hundreds of dimensions; this map shows two
      </T>
    </>
  );
}

function WordAnalogy() {
  const man: Pt = [62, 128];
  const woman: Pt = [102, 70];
  const king: Pt = [196, 120];
  const queen: Pt = [236, 62];
  const short = (a: Pt, b: Pt, by = 7): Pt => {
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return [b[0] - ((b[0] - a[0]) * by) / d, b[1] - ((b[1] - a[1]) * by) / d];
  };
  const eq = [
    { text: 'king ', t: 0.05 },
    { text: '− man ', t: 0.15 },
    { text: '+ woman ', t: 0.3 },
    { text: '≈ queen', t: 0.72 },
  ];
  return (
    <>
      <text
        x={160}
        y={20}
        fontSize={11}
        textAnchor="middle"
        fontWeight={700}
        xmlSpace="preserve"
        className="fill-ink font-mono"
      >
        {eq.map((e) => (
          <tspan key={e.text} className={e.text.startsWith('≈') ? 'fill-ok' : undefined}>
            <Anim
              attr="fill-opacity"
              keys={[
                [0, 0],
                [e.t, 0],
                [e.t + FADE, 1],
              ]}
            />
            {e.text}
          </tspan>
        ))}
      </text>
      <Show from={0.74}>
        <line
          x1={man[0]}
          y1={man[1]}
          x2={king[0]}
          y2={king[1]}
          strokeDasharray="3 4"
          className="stroke-line-2"
        />
        <line
          x1={woman[0]}
          y1={woman[1]}
          x2={queen[0]}
          y2={queen[1]}
          strokeDasharray="3 4"
          className="stroke-line-2"
        />
      </Show>
      <Show from={0.18}>
        <Arrow
          x1={man[0]}
          y1={man[1]}
          x2={short(man, woman)[0]}
          y2={short(man, woman)[1]}
          tone="brand"
          width={2}
        />
        <T x={70} y={104} anchor="end" size={8} tone="brand">
          man → woman
        </T>
      </Show>
      <Show from={0.42}>
        <line
          x1={king[0]}
          y1={king[1]}
          x2={short(king, queen)[0]}
          y2={short(king, queen)[1]}
          strokeWidth={2}
          strokeDasharray="5 4"
          className="stroke-brand"
        />
        <T x={224} y={100} anchor="start" size={8} tone="brand">
          same step from king
        </T>
      </Show>
      <Show from={0.42} to={0.7} final={false}>
        <circle
          cx={queen[0]}
          cy={queen[1]}
          r={9}
          strokeWidth={1.5}
          strokeDasharray="3 3"
          className="fill-none stroke-brand"
        />
      </Show>
      {[
        { p: man, label: 'man', dx: 0, dy: 18, anchor: 'middle' as const },
        { p: woman, label: 'woman', dx: -9, dy: -6, anchor: 'end' as const },
        { p: king, label: 'king', dx: 0, dy: 18, anchor: 'middle' as const },
      ].map((w) => (
        <g key={w.label}>
          <circle cx={w.p[0]} cy={w.p[1]} r={4} className="fill-ink" />
          <T x={w.p[0] + w.dx} y={w.p[1] + w.dy} anchor={w.anchor} mono size={10} tone="ink">
            {w.label}
          </T>
        </g>
      ))}
      <Show from={0.7}>
        <circle cx={queen[0]} cy={queen[1]} r={4.5} className="fill-ok" />
        <circle cx={queen[0]} cy={queen[1]} r={9} strokeWidth={2} className="fill-none stroke-ok" />
        <T x={queen[0] + 13} y={queen[1] + 4} anchor="start" mono bold size={10} tone="ok">
          queen
        </T>
      </Show>
      <T x={160} y={160} size={9.5}>
        One direction, one relation: man → woman, king → queen
      </T>
    </>
  );
}

// ───────────── NLP: sequence models, attention and transformers ─────────────

/** A curved link between two x positions on a baseline, bulging up (or down) by h. */
const arcD = (x1: number, x2: number, y: number, h: number, down = false) =>
  `M${x1.toFixed(1)} ${y} Q${((x1 + x2) / 2).toFixed(1)} ${(down ? y + h : y - h).toFixed(1)} ${x2.toFixed(1)} ${y}`;

const mid = (c: { x: number; w: number }) => c.x + c.w / 2;

/** A path that draws itself between two loop times (whole in the still frame). */
function DrawPath({
  d,
  t0,
  t1,
  cls,
  width = 1.5,
  opacity = 1,
}: {
  d: string;
  t0: number;
  t1: number;
  cls: string;
  width?: number;
  opacity?: number;
}) {
  return (
    <path
      d={d}
      pathLength={1}
      strokeDasharray="1"
      strokeWidth={width}
      strokeLinecap="round"
      opacity={opacity}
      className={cn('fill-none', cls)}
    >
      <Anim attr="stroke-dashoffset" keys={drawKeys(t0, t1)} />
    </path>
  );
}

function SeqVsParallel() {
  const words = ['I', 'like', 'hot', 'tea'];
  const xs = [20, 92, 164, 236];
  const W = 60;
  const at = (i: number) => xs[i] ?? 0;
  const pairs: Array<[number, number]> = [
    [0, 1],
    [0, 2],
    [0, 3],
    [1, 2],
    [1, 3],
    [2, 3],
  ];
  return (
    <>
      <T x={12} y={16} anchor="start" size={9.5} tone="ink" bold>
        RNN: one word per step
      </T>
      {words.map((w, i) => {
        const t = 0.05 + i * 0.1;
        return (
          <g key={`r-${w}`}>
            <Chip x={at(i)} y={24} w={W} h={20} label={w} size={9} />
            <Show from={t} to={t + 0.1} final={false}>
              <Box x={at(i)} y={24} w={W} h={20} r={6} tone="ring" width={2} />
            </Show>
            {i < words.length - 1 && (
              <Arrow x1={at(i) + W + 1} y1={34} x2={at(i + 1) - 2} y2={34} tone="brand" />
            )}
          </g>
        );
      })}
      <Show from={0.45}>
        <T x={160} y={60} size={8.5}>
          4 steps, one after another; early words fade
        </T>
      </Show>
      <T x={12} y={84} anchor="start" size={9.5} tone="ink" bold>
        Transformer: all words at once
      </T>
      {pairs.map(([a, b]) => (
        <Show key={`p${a}${b}`} from={0.58}>
          <path
            d={arcD(at(a) + W / 2, at(b) + W / 2, 112, 10 + (b - a) * 12, true)}
            strokeWidth={1.25}
            opacity={0.65}
            className="fill-none stroke-brand"
          />
        </Show>
      ))}
      {words.map((w, i) => (
        <g key={`t-${w}`}>
          <Chip x={at(i)} y={92} w={W} h={20} label={w} size={9} />
          <Show from={0.55} to={0.8} final={false}>
            <Box x={at(i)} y={92} w={W} h={20} r={6} tone="ring" width={2} />
          </Show>
        </g>
      ))}
      <Show from={0.62}>
        <T x={160} y={152} size={8.5} tone="brand">
          1 step: every word sees every word
        </T>
      </Show>
    </>
  );
}

function RnnUnroll() {
  const words = ['the', 'dosa', 'was', 'cold'];
  const shares = [[1], [0.5, 0.5], [0.25, 0.35, 0.4], [0.1, 0.2, 0.3, 0.4]];
  const fills = ['fill-g1', 'fill-g2', 'fill-g3', 'fill-g4'];
  const segs = (row: number[]) =>
    row.reduce<Array<{ x: number; w: number }>>((acc, s) => {
      const last = acc[acc.length - 1];
      acc.push({ x: last ? last.x + last.w : 0, w: s * 52 });
      return acc;
    }, []);
  return (
    <>
      <T x={160} y={16} size={9.5} tone="ink">
        An RNN reads one word at a time
      </T>
      {words.map((w, i) => {
        const x = 18 + i * 76;
        const t = 0.05 + i * 0.2;
        return (
          <g key={w}>
            <Chip x={x + 6} y={124} w={52} h={20} label={w} size={9} />
            <rect x={x + 10} y={131} width={6} height={6} rx={1} className={fills[i]} />
            <Show from={t} to={t + 0.2} final={false}>
              <Box x={x + 6} y={124} w={52} h={20} r={6} tone="ring" width={2} />
            </Show>
            <Show from={t}>
              <Arrow x1={x + 32} y1={122} x2={x + 32} y2={98} />
              <Box x={x} y={40} w={64} h={56} r={8} tone="brand" />
              <T x={x + 32} y={56} mono bold size={9.5} tone="brand">
                {`h${i + 1}`}
              </T>
              {segs(shares[i] ?? []).map((sg, k) => (
                <rect
                  // biome-ignore lint/suspicious/noArrayIndexKey: one segment per word seen so far
                  key={k}
                  x={x + 6 + sg.x}
                  y={64}
                  width={sg.w}
                  height={12}
                  className={fills[k]}
                />
              ))}
              <T x={x + 32} y={90} size={7.5}>
                memory
              </T>
            </Show>
            {i < words.length - 1 && (
              <Show from={t + 0.14}>
                <Arrow x1={x + 65} y1={70} x2={x + 75} y2={70} tone="brand" />
              </Show>
            )}
          </g>
        );
      })}
      <T x={160} y={164} size={9.5}>
        The first word's share of the memory shrinks at every step
      </T>
    </>
  );
}

function LstmGates() {
  const gates = [
    { x: 100, sym: '×', name: 'forget gate', role: 'erase old', t: 0.28 },
    { x: 180, sym: '+', name: 'input gate', role: 'write new', t: 0.45 },
    { x: 262, sym: '→', name: 'output gate', role: 'read out', t: 0.72 },
  ];
  return (
    <>
      <T x={160} y={14} size={9.5} tone="ink">
        An LSTM keeps a notebook: the cell state
      </T>
      {gates.map((g) => (
        <g key={g.name}>
          <T x={g.x} y={30} mono size={8.5} tone="ink" bold>
            {g.name}
          </T>
          <T x={g.x} y={40} size={8}>
            {g.role}
          </T>
        </g>
      ))}
      <rect x={14} y={52} width={292} height={8} rx={4} className="fill-brand-soft" />
      <line x1={14} y1={56} x2={306} y2={56} strokeWidth={1.5} className="stroke-brand" />
      <T x={14} y={74} anchor="start" size={8}>
        cell state
      </T>
      <Arrow x1={180} y1={98} x2={180} y2={68} tone="brand" />
      <line x1={262} y1={62} x2={262} y2={84} strokeWidth={1.5} className="stroke-brand" />
      <Arrow x1={262} y1={106} x2={262} y2={113} tone="brand" />
      <Move
        keys={[
          [0, [0, 0]],
          [0.05, [0, 0]],
          [0.25, [60, 0]],
        ]}
        at={[60, 0]}
      >
        <Show to={0.34} final={false}>
          <Chip x={20} y={47} w={44} h={18} label="dosa" size={8.5} tone="soft" />
        </Show>
      </Move>
      <Show from={0.3} to={0.5} final={false}>
        <T x={100} y={84} size={8} tone="bad">
          old subject erased
        </T>
      </Show>
      <Show from={0.38}>
        <Move
          keys={[
            [0, [0, 0]],
            [0.42, [0, 0]],
            [0.52, [0, -53]],
            [0.68, [62, -53]],
          ]}
          at={[62, -53]}
        >
          <Chip x={158} y={100} w={44} h={18} label="idli" size={8.5} tone="ok" text="ok" />
        </Move>
      </Show>
      {gates.map((g) => (
        <g key={`c-${g.name}`}>
          <circle
            cx={g.x}
            cy={g.name === 'output gate' ? 96 : 56}
            r={10}
            strokeWidth={1.5}
            className="fill-surface stroke-brand"
          />
          <T x={g.x} y={(g.name === 'output gate' ? 96 : 56) + 4} mono bold size={11} tone="brand">
            {g.sym}
          </T>
          <Show from={g.t} to={g.t + 0.12} final={false}>
            <circle
              cx={g.x}
              cy={g.name === 'output gate' ? 96 : 56}
              r={12}
              strokeWidth={2}
              className="fill-none stroke-ok"
            />
          </Show>
        </g>
      ))}
      <Show from={0.74}>
        <Chip x={228} y={115} w={68} h={20} label="h: idli" size={8.5} tone="ok" text="ok" />
      </Show>
      <T x={14} y={146} anchor="start" mono size={8}>
        Reading: "The dosa was cold. The idli was hot."
      </T>
      <T x={160} y={166} size={9.5}>
        Gates decide what to erase, what to write and what to pass on
      </T>
    </>
  );
}

const DOSA_SENTENCE = ['The', 'dosa', 'was', 'cold', 'so', 'I', 'sent', 'it', 'back'];

function AttentionWeights() {
  const row = chipRow(DOSA_SENTENCE, 30, 8.5, 4);
  const weight: Record<string, number> = {
    The: 0.03,
    dosa: 0.58,
    was: 0.03,
    cold: 0.12,
    so: 0.02,
    I: 0.04,
    sent: 0.1,
    it: 0.04,
    back: 0.04,
  };
  const it = row[7] ?? { x: 0, w: 0, word: 'it' };
  const targets = row.filter((c) => c.word !== 'it');
  return (
    <>
      <T x={160} y={14} size={9.5} tone="ink">
        "it" weighs every word, itself included
      </T>
      {targets.map((c, k) => {
        const wgt = weight[c.word] ?? 0;
        const dx = Math.abs(mid(c) - mid(it));
        const t = 0.08 + k * 0.06;
        return (
          <DrawPath
            key={c.word}
            d={arcD(mid(it), mid(c), 98, 10 + dx * 0.38)}
            t0={t}
            t1={t + 0.08}
            cls={c.word === 'dosa' ? 'stroke-ok' : 'stroke-brand'}
            width={0.75 + wgt * 8}
            opacity={0.35 + wgt}
          />
        );
      })}
      {row.map((c) => {
        const isIt = c.word === 'it';
        const isDosa = c.word === 'dosa';
        return (
          <g key={c.word}>
            <Chip
              x={c.x}
              y={100}
              w={c.w}
              h={20}
              label={c.word}
              size={8.5}
              tone={isIt ? 'brand' : 'plain'}
              text={isIt ? 'brand' : 'ink'}
            />
            {isDosa && (
              <Show from={0.62}>
                <Chip
                  x={c.x}
                  y={100}
                  w={c.w}
                  h={20}
                  label={c.word}
                  size={8.5}
                  tone="ok"
                  text="ok"
                />
              </Show>
            )}
            {
              <Show from={0.6}>
                <T x={mid(c)} y={134} mono bold={isDosa} size={7.5} tone={isDosa ? 'ok' : 'muted'}>
                  {(weight[c.word] ?? 0).toFixed(2)}
                </T>
              </Show>
            }
          </g>
        );
      })}
      <Show from={0.64}>
        <T x={160} y={150} size={9}>
          The weights add up to 1; "dosa" gets the most
        </T>
      </Show>
    </>
  );
}

function QkvLookup() {
  const rows = [
    { word: 'dosa', score: 3, w: 0.84, fill: 'fill-g1' },
    { word: 'cold', score: 1, w: 0.11, fill: 'fill-g2' },
    { word: 'I', score: 0, w: 0.04, fill: 'fill-g3' },
  ];
  const y = (i: number) => 34 + i * 34;
  return (
    <>
      <T x={160} y={12} size={9} tone="ink">
        Score the keys, turn scores into weights, mix the values
      </T>
      <T x={132} y={28} size={8}>
        key
      </T>
      <T x={176} y={28} size={8}>
        q · k
      </T>
      <T x={222} y={28} size={8}>
        weight
      </T>
      <T x={288} y={28} size={8}>
        value
      </T>
      <Chip x={8} y={67} w={64} h={22} label="q: it" tone="brand" text="brand" size={9} />
      {rows.map((r, i) => {
        const yy = y(i);
        const t = 0.1 + i * 0.06;
        const bw = Math.max(2, r.w * 62);
        return (
          <g key={r.word}>
            <Show from={t}>
              <line
                x1={73}
                y1={78}
                x2={103}
                y2={yy + 11}
                strokeWidth={1.25}
                className="stroke-line-2"
              />
              <T x={176} y={yy + 15} mono bold size={10} tone="ink">
                {String(r.score)}
              </T>
            </Show>
            <Chip x={104} y={yy} w={56} h={22} label={`k: ${r.word}`} size={8.5} />
            <rect x={192} y={yy + 12} width={bw} height={8} rx={2} className={r.fill}>
              <Anim
                attr="width"
                keys={[
                  [0, 0],
                  [0.35, 0],
                  [0.5, bw],
                ]}
              />
            </rect>
            <Show from={0.45}>
              <T x={192} y={yy + 9} anchor="start" mono size={8} tone="ink">
                {r.w.toFixed(2)}
              </T>
            </Show>
            <Chip x={262} y={yy} w={52} h={22} label={`v: ${r.word}`} size={8.5} />
            <rect x={253} y={yy + 8} width={6} height={6} rx={1} className={r.fill} />
          </g>
        );
      })}
      <T x={8} y={159} anchor="start" size={8.5} tone="ink" bold>
        output
      </T>
      {rows.map((r, i) => {
        const x0 = 52 + rows.slice(0, i).reduce((a, p) => a + p.w * 200, 0);
        const w = r.w * 200;
        return (
          <rect key={`o-${r.word}`} x={x0} y={150} width={w} height={12} className={r.fill}>
            <Anim
              attr="width"
              keys={[
                [0, 0],
                [0.6 + i * 0.05, 0],
                [0.66 + i * 0.05, w],
              ]}
            />
          </rect>
        );
      })}
      <Show from={0.78}>
        <T x={312} y={159} anchor="end" size={8.5} tone="ok">
          mostly "dosa"
        </T>
      </Show>
    </>
  );
}

function MultiHead() {
  const row = chipRow(DOSA_SENTENCE, 30, 8.5, 4);
  const c = (w: string) => row.find((r) => r.word === w) ?? { x: 0, w: 0, word: w };
  const up = [
    { from: 'it', to: 'dosa', w: 5, o: 0.95 },
    { from: 'it', to: 'cold', w: 1.25, o: 0.45 },
  ];
  const down = [
    { from: 'sent', to: 'I', w: 5, o: 0.95 },
    { from: 'sent', to: 'back', w: 1.25, o: 0.45 },
  ];
  return (
    <>
      <T x={160} y={12} size={9.5} tone="ink">
        Two heads ask two questions of one sentence
      </T>
      <Show from={0.08}>
        <T x={30} y={30} anchor="start" size={8.5} tone="brand" bold>
          head 1: what was sent back
        </T>
      </Show>
      {up.map((l, k) => {
        const a = mid(c(l.from));
        const b = mid(c(l.to));
        return (
          <DrawPath
            key={`u${l.to}`}
            d={arcD(a, b, 70, 8 + Math.abs(a - b) * 0.3)}
            t0={0.1 + k * 0.08}
            t1={0.22 + k * 0.08}
            cls="stroke-brand"
            width={l.w}
            opacity={l.o}
          />
        );
      })}
      {down.map((l, k) => {
        const a = mid(c(l.from));
        const b = mid(c(l.to));
        return (
          <DrawPath
            key={`d${l.to}`}
            d={arcD(a, b, 92, 8 + Math.abs(a - b) * 0.6, true)}
            t0={0.4 + k * 0.08}
            t1={0.52 + k * 0.08}
            cls="stroke-g3"
            width={l.w}
            opacity={l.o}
          />
        );
      })}
      {row.map((r) => (
        <Chip key={r.word} x={r.x} y={72} w={r.w} h={20} label={r.word} size={8.5} />
      ))}
      <Show from={0.4}>
        <T x={30} y={126} anchor="start" size={8.5} tone="g3" bold>
          head 2: who sent it
        </T>
      </Show>
      <Show from={0.7}>
        <rect
          x={60}
          y={142}
          width={60}
          height={14}
          rx={3}
          className="fill-brand-soft stroke-brand"
        />
        <T x={90} y={152} mono size={8} tone="brand">
          head 1
        </T>
        <rect x={120} y={142} width={60} height={14} rx={3} className="fill-surface-2 stroke-g3" />
        <T x={150} y={152} mono size={8} tone="g3">
          head 2
        </T>
        <Arrow x1={184} y1={149} x2={204} y2={149} />
        <T x={208} y={152} anchor="start" size={8.5} tone="ink">
          joined, then mixed
        </T>
      </Show>
    </>
  );
}

function TransformerBlocks() {
  const enc = { x: 12, w: 120 };
  const dec = { x: 188, w: 120 };
  const outs = [
    { word: "J'aime", from: 0.5, to: 0.62, input: '<start>' },
    { word: 'le', from: 0.62, to: 0.74, input: "<start> J'aime" },
    { word: 'thé', from: 0.74, to: undefined, input: "<start> J'aime le" },
  ];
  const rowChip = (x: number, y: number, label: string, tone: 'soft' | 'brand' = 'soft') => (
    <Chip x={x + 6} y={y} w={108} h={18} label={label} size={8} tone={tone} />
  );
  return (
    <>
      <T x={72} y={12} size={9.5} tone="ink" bold>
        Encoder
      </T>
      <T x={72} y={22} size={8}>
        reads the whole input at once
      </T>
      <T x={248} y={12} size={9.5} tone="ink" bold>
        Decoder
      </T>
      <T x={248} y={22} size={8}>
        writes one word at a time
      </T>
      {/* encoder column */}
      <Box x={enc.x} y={62} w={enc.w} h={78} r={8} tone="soft" dashed />
      <T x={enc.x + enc.w - 4} y={136} anchor="end" mono size={7.5}>
        × N
      </T>
      {rowChip(enc.x, 108, 'self-attention')}
      {rowChip(enc.x, 74, 'feed-forward')}
      <Arrow x1={72} y1={106} x2={72} y2={94} />
      {rowChip(enc.x, 148, 'embedding + position')}
      <Arrow x1={72} y1={146} x2={72} y2={128} />
      <T x={72} y={180} mono size={8} tone="ink">
        I like tea
      </T>
      <Arrow x1={72} y1={60} x2={72} y2={48} />
      <Chip
        x={enc.x + 6}
        y={28}
        w={108}
        h={18}
        label="a vector per word"
        size={8}
        tone="brand"
        text="brand"
      />
      <Pulse a={[72, 172]} b={[72, 64]} t0={0.05} t1={0.22} cls="fill-g1" />
      {/* decoder column */}
      <Box x={dec.x} y={62} w={dec.w} h={78} r={8} tone="soft" dashed />
      <T x={dec.x + dec.w - 4} y={136} anchor="end" mono size={7.5}>
        × N
      </T>
      {rowChip(dec.x, 114, 'masked self-attention')}
      {rowChip(dec.x, 92, 'cross-attention', 'brand')}
      {rowChip(dec.x, 68, 'feed-forward')}
      {rowChip(dec.x, 148, 'embedding + position')}
      <Arrow x1={248} y1={146} x2={248} y2={134} />
      <Arrow x1={248} y1={60} x2={248} y2={48} />
      {/* cross-attention: the decoder's queries read the encoder's keys and values */}
      <path
        d={`M${enc.x + enc.w + 1} 37 C 160 37, 160 101, ${dec.x + 4} 101`}
        strokeWidth={1.5}
        className="fill-none stroke-brand"
      />
      <Arrow x1={dec.x - 6} y1={101} x2={dec.x + 4} y2={101} tone="brand" />
      <T x={164} y={60} anchor="start" mono size={7.5} tone="brand">
        K, V
      </T>
      <Pulse a={[134, 37]} b={[188, 101]} t0={0.3} t1={0.42} cls="fill-g1" />
      <Pulse a={[248, 172]} b={[248, 64]} t0={0.42} t1={0.5} cls="fill-g1" />
      {outs.map((o) => (
        <g key={o.word}>
          <Show from={o.from} to={o.to} final={o.to === undefined}>
            <Chip
              x={dec.x + 6}
              y={28}
              w={108}
              h={18}
              label={`next word: ${o.word}`}
              size={8}
              tone="ok"
              text="ok"
            />
          </Show>
          <Show from={o.from === 0.5 ? 0 : o.from} to={o.to} final={o.to === undefined}>
            <T x={248} y={180} mono size={8} tone="ink">
              {o.input}
            </T>
          </Show>
        </g>
      ))}
    </>
  );
}

function BertVsGpt() {
  const top = chipRow(['The', 'dosa', 'was', '[MASK]', 'so', 'I', 'sent', 'it', 'back'], 34, 8, 3);
  const bottom = chipRow(['The', 'dosa', 'was', 'cold', 'so', 'I', 'sent', 'it', 'back'], 34, 8, 3);
  const mask = top[3] ?? { x: 0, w: 0, word: '' };
  const next = bottom[8] ?? { x: 0, w: 0, word: '' };
  return (
    <>
      <T x={12} y={14} anchor="start" size={9.5} tone="ink" bold>
        BERT (encoder): reads both sides to fill a gap
      </T>
      {top
        .filter((c) => c !== mask)
        .map((c, k) => (
          <DrawPath
            key={`t${c.word}`}
            d={arcD(mid(c), mid(mask), 54, 6 + Math.abs(mid(c) - mid(mask)) * 0.2)}
            t0={0.05 + k * 0.03}
            t1={0.1 + k * 0.03}
            cls="stroke-brand"
            width={1.1}
            opacity={0.6}
          />
        ))}
      {top.map((c) =>
        c === mask ? (
          <g key="mask">
            <Show to={0.4} final={false}>
              <Chip
                x={c.x}
                y={56}
                w={c.w}
                h={18}
                label="[MASK]"
                size={8}
                tone="brand"
                text="brand"
              />
            </Show>
            <Show from={0.4}>
              <Chip x={c.x} y={56} w={c.w} h={18} label="cold" size={8} tone="ok" text="ok" />
            </Show>
          </g>
        ) : (
          <Chip key={`tc${c.word}`} x={c.x} y={56} w={c.w} h={18} label={c.word} size={8} />
        ),
      )}
      <T x={12} y={100} anchor="start" size={9.5} tone="ink" bold>
        GPT (decoder): reads only the left, predicts the next word
      </T>
      {bottom
        .filter((c) => c !== next)
        .map((c, k) => (
          <DrawPath
            key={`b${c.word}`}
            d={arcD(mid(c), mid(next), 140, 6 + Math.abs(mid(c) - mid(next)) * 0.2)}
            t0={0.5 + k * 0.03}
            t1={0.55 + k * 0.03}
            cls="stroke-brand"
            width={1.1}
            opacity={0.6}
          />
        ))}
      {bottom.map((c) =>
        c === next ? (
          <g key="next">
            <Show to={0.82} final={false}>
              <Chip x={c.x} y={142} w={c.w} h={18} label="?" size={8} tone="brand" text="brand" />
            </Show>
            <Show from={0.82}>
              <Chip x={c.x} y={142} w={c.w} h={18} label="back" size={8} tone="ok" text="ok" />
            </Show>
          </g>
        ) : (
          <Chip key={`bc${c.word}`} x={c.x} y={142} w={c.w} h={18} label={c.word} size={8} />
        ),
      )}
    </>
  );
}

function CausalMask() {
  const words = ['I', 'like', 'hot', 'tea'];
  const w = [
    [1, 0, 0, 0],
    [0.27, 0.73, 0, 0],
    [0.14, 0.23, 0.63, 0],
    [0.08, 0.13, 0.21, 0.58],
  ];
  const C = { w: 34, h: 26, x: 70, y: 40 };
  return (
    <>
      <T x={160} y={14} size={9.5} tone="ink">
        Masked self-attention: no looking ahead
      </T>
      {words.map((wd, j) => (
        <T key={`c${wd}`} x={C.x + j * C.w + C.w / 2} y={34} mono size={8.5} tone="ink">
          {wd}
        </T>
      ))}
      {words.map((wd, i) => (
        <T
          key={`r${wd}`}
          x={C.x - 6}
          y={C.y + i * C.h + 17}
          anchor="end"
          mono
          size={8.5}
          tone="ink"
        >
          {wd}
        </T>
      ))}
      {w.flatMap((row, i) =>
        row.map((v, j) => {
          const x = C.x + j * C.w;
          const y = C.y + i * C.h;
          const masked = j > i;
          const t = 0.45 + i * 0.1;
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: a fixed grid; positions never reorder
            <g key={`${i}-${j}`}>
              <rect x={x} y={y} width={C.w} height={C.h} className="fill-surface stroke-line" />
              {masked ? (
                <>
                  <rect
                    x={x}
                    y={y}
                    width={C.w}
                    height={C.h}
                    className="fill-surface-3 stroke-line"
                  />
                  <Show from={0.1} to={0.42} final={false}>
                    <rect
                      x={x}
                      y={y}
                      width={C.w}
                      height={C.h}
                      className="fill-bad-bg stroke-line"
                    />
                    <T x={x + C.w / 2} y={y + 17} mono size={9} tone="bad">
                      −∞
                    </T>
                  </Show>
                  <Show from={0.42}>
                    <T x={x + C.w / 2} y={y + 17} mono size={9} tone="muted">
                      0
                    </T>
                  </Show>
                </>
              ) : (
                <Show from={t}>
                  <rect
                    x={x}
                    y={y}
                    width={C.w}
                    height={C.h}
                    opacity={0.15 + v * 0.6}
                    className="fill-brand"
                  />
                  <T x={x + C.w / 2} y={y + 17} mono bold size={9} tone="ink">
                    {v === 1 ? '1.0' : v.toFixed(2)}
                  </T>
                </Show>
              )}
            </g>
          );
        }),
      )}
      <T x={218} y={52} anchor="start" size={8}>
        rows: the word asking
      </T>
      <T x={218} y={66} anchor="start" size={8}>
        columns: words it sees
      </T>
      <Show from={0.1}>
        <T x={218} y={86} anchor="start" size={8} tone="bad">
          future words: −∞
        </T>
      </Show>
      <Show from={0.45}>
        <T x={218} y={100} anchor="start" size={8} tone="brand">
          each row sums to 1
        </T>
      </Show>
      <T x={160} y={164} size={9}>
        In training, every position predicts its next word at once
      </T>
    </>
  );
}

// ───────────── LLMs: how they work ─────────────

function NextTokenLoop() {
  const steps = [
    {
      pick: 'Day',
      x: 14,
      cands: [
        { w: 'Day', p: 0.58 },
        { w: 'Here', p: 0.22 },
        { w: 'Sure', p: 0.12 },
      ],
    },
    {
      pick: '1:',
      x: 34.4,
      cands: [
        { w: '1:', p: 0.78 },
        { w: 'One', p: 0.1 },
        { w: '2:', p: 0.06 },
      ],
    },
    {
      pick: 'North',
      x: 49.7,
      cands: [
        { w: 'North', p: 0.52 },
        { w: 'Beach', p: 0.27 },
        { w: 'Arrive', p: 0.13 },
      ],
    },
  ];
  const at = (i: number) => 0.06 + i * 0.3;
  return (
    <>
      <T x={160} y={14} size={9.5} tone="ink">
        Predict, pick, append, repeat
      </T>
      <Box x={8} y={26} w={150} h={58} r={8} tone="soft" />
      <T x={14} y={38} anchor="start" size={7.5}>
        text so far
      </T>
      <T x={14} y={55} anchor="start" mono size={8.5} tone="ink">
        Plan a 3-day Goa trip.
      </T>
      <Arrow x1={160} y1={55} x2={175} y2={55} />
      <Box x={177} y={36} w={44} h={38} r={8} tone="brand" width={1.5} />
      <T x={199} y={59} mono bold size={10} tone="brand">
        LLM
      </T>
      <Arrow x1={223} y1={55} x2={234} y2={55} />
      <T x={274} y={22} size={7.5}>
        top 3 next tokens
      </T>
      {steps.map((s, i) => {
        const t = at(i);
        const last = i === steps.length - 1;
        return (
          <g key={s.pick}>
            <Show from={t} to={last ? undefined : t + 0.3} final={last}>
              {s.cands.map((c, k) => {
                const y = 30 + k * 18;
                const top = k === 0;
                return (
                  <g key={c.w}>
                    <T x={238} y={y + 7} anchor="start" mono size={8} tone={top ? 'ok' : 'muted'}>
                      {`${c.w} ${c.p.toFixed(2)}`}
                    </T>
                    <rect
                      x={238}
                      y={y + 10}
                      width={Math.max(2, c.p * 74)}
                      height={4}
                      rx={2}
                      className={top ? 'fill-ok' : 'fill-line-2'}
                    />
                  </g>
                );
              })}
            </Show>
            <Pulse a={[270, 88]} b={[s.x + 8, 74]} t0={t + 0.16} t1={t + 0.22} cls="fill-ok" />
            <Show from={t + 0.22}>
              <T x={s.x} y={74} anchor="start" mono bold size={8.5} tone="brand">
                {s.pick}
              </T>
            </Show>
          </g>
        );
      })}
      <path
        d="M270 88 C 270 112, 90 112, 84 88"
        strokeWidth={1.25}
        strokeDasharray="4 3"
        className="fill-none stroke-line-2"
      />
      <T x={177} y={118} size={8}>
        append the pick, then predict again
      </T>
      <T x={160} y={148} size={9}>
        One token per step: a 200-token answer takes about 200 steps
      </T>
    </>
  );
}

function TokenizerSplit() {
  const pieces = [
    { t: 'un', id: 1 },
    { t: 'believ', id: 2 },
    { t: 'able', id: 3 },
    { t: 'bir', id: 4 },
    { t: 'yani', id: 5 },
  ];
  const widths = pieces.map((p) => p.t.length * 6 + 12);
  const xs = widths.reduce<number[]>((acc, _w, i) => {
    const prev = acc[i - 1];
    const gap = i === 3 ? 18 : 8;
    acc.push(prev === undefined ? 62 : prev + (widths[i - 1] ?? 0) + gap);
    return acc;
  }, []);
  return (
    <>
      <T x={8} y={40} anchor="start" size={8}>
        text
      </T>
      <Box x={94} y={26} w={132} h={22} r={6} tone="soft" />
      <T x={160} y={41} mono size={10} tone="ink">
        unbelievable biryani
      </T>
      <Arrow x1={160} y1={50} x2={160} y2={64} />
      <T x={8} y={84} anchor="start" size={8}>
        tokens
      </T>
      <T x={8} y={128} anchor="start" size={8}>
        token IDs
      </T>
      {pieces.map((p, k) => {
        const x = xs[k] ?? 0;
        const w = widths[k] ?? 0;
        return (
          <g key={p.t}>
            <Show from={0.15 + k * 0.08}>
              <Chip x={x} y={70} w={w} h={22} label={p.t} size={10} tone="brand" text="brand" />
            </Show>
            <Show from={0.6 + k * 0.06}>
              <Arrow x1={x + w / 2} y1={94} x2={x + w / 2} y2={108} />
              <Chip
                x={x + w / 2 - 14}
                y={112}
                w={28}
                h={22}
                label={String(p.id)}
                size={10}
                tone="ok"
                text="ok"
              />
            </Show>
          </g>
        );
      })}
      <T x={160} y={156} size={9}>
        Each known piece becomes a number: its token ID
      </T>
    </>
  );
}

function ContextWindow() {
  const S = 2.9;
  const fx = 62;
  const fy = 56;
  const right = fx + 70 * S + 3;
  const msgs = [
    { label: 'sys', n: 7, x1: 0, x2: 0, drop: false, tone: 'soft' as const },
    { label: 'Asha', n: 9, x1: 7, x2: 0, drop: true, tone: 'plain' as const },
    { label: 'Hi', n: 7, x1: 16, x2: 0, drop: true, tone: 'plain' as const },
    { label: 'Goa', n: 14, x1: 23, x2: 7, drop: false, tone: 'plain' as const },
    { label: 'Day 1 plan', n: 40, x1: 37, x2: 21, drop: false, tone: 'plain' as const },
    { label: '?', n: 6, x1: 77, x2: 61, drop: false, tone: 'brand' as const },
  ];
  return (
    <>
      <T x={160} y={14} size={9.5} tone="ink">
        When the budget is full, the oldest messages fall out
      </T>
      <T x={fx} y={46} anchor="start" size={8.5} tone="ink">
        chat budget: 70 tokens
      </T>
      <rect
        x={fx - 3}
        y={fy - 3}
        width={70 * S + 6}
        height={36}
        rx={8}
        strokeWidth={1.75}
        className="fill-none stroke-brand"
      />
      {msgs.map((m, k) => {
        const t = 0.05 + k * 0.07;
        const dx = (m.x2 - m.x1) * S;
        const w = m.n * S - 2;
        return (
          <Show key={m.label} from={t}>
            <Move
              keys={
                m.drop
                  ? [
                      [0, [0, 0]],
                      [0.58, [0, 0]],
                      [0.68, [0, 44]],
                    ]
                  : [
                      [0, [0, 0]],
                      [0.6, [0, 0]],
                      [0.72, [dx, 0]],
                    ]
              }
              at={m.drop ? [0, 44] : [dx, 0]}
            >
              <Chip
                x={fx + m.x1 * S}
                y={fy}
                w={w}
                h={30}
                label={m.label}
                size={8}
                tone={m.tone}
                text={m.tone === 'brand' ? 'brand' : 'ink'}
              />
              {m.drop && (
                <Show from={0.62}>
                  <Chip
                    x={fx + m.x1 * S}
                    y={fy}
                    w={w}
                    h={30}
                    label={m.label}
                    size={8}
                    tone="bad"
                    text="bad"
                  />
                </Show>
              )}
            </Move>
          </Show>
        );
      })}
      <Show from={0.44} to={0.6} final={false}>
        <rect
          x={right}
          y={fy - 3}
          width={13 * S}
          height={36}
          rx={4}
          strokeWidth={1.75}
          strokeDasharray="4 3"
          className="fill-none stroke-bad"
        />
        <T x={312} y={104} anchor="end" size={8} tone="bad">
          13 tokens too many
        </T>
      </Show>
      <Show from={0.74}>
        <T x={right} y={46} anchor="end" mono size={8} tone="ok">
          67 used
        </T>
        <T x={right} y={104} anchor="end" mono size={8} tone="brand">
          new: What is my name?
        </T>
      </Show>
      <Show from={0.68}>
        <T x={fx} y={146} anchor="start" size={8.5} tone="bad">
          dropped: "I am Asha", so the model forgets her name
        </T>
      </Show>
    </>
  );
}

function LlmTrainingStages() {
  const cols = [
    {
      name: 'pre-training',
      sub: 'next token, huge text',
      model: 'base model',
      lines: ['Capital of China?', 'Capital of Japan?'],
      verdict: 'only continues text',
      tone: 'bad' as const,
    },
    {
      name: 'instruction tuning',
      sub: 'example Q&A pairs',
      model: 'follows requests',
      lines: ['New Delhi.'],
      verdict: 'answers',
      tone: 'ok' as const,
    },
    {
      name: 'preference tuning',
      sub: 'people rank answers',
      model: 'chat model',
      lines: ['The capital of', 'India is New', 'Delhi.'],
      verdict: 'answers as people prefer',
      tone: 'ok' as const,
    },
  ];
  return (
    <>
      <T x={160} y={12} size={9} tone="ink">
        Same question after each stage: "Capital of India?"
      </T>
      {cols.map((c, i) => {
        const x = 8 + i * 104;
        const t = 0.05 + i * 0.3;
        return (
          <g key={c.name}>
            <Box x={x} y={22} w={96} h={34} r={8} tone="brand" />
            <T x={x + 48} y={36} mono bold size={8} tone="brand">
              {c.name}
            </T>
            <T x={x + 48} y={49} size={7}>
              {c.sub}
            </T>
            {i < cols.length - 1 && <Arrow x1={x + 97} y1={39} x2={x + 103} y2={39} tone="brand" />}
            <Chip x={x + 8} y={62} w={80} h={18} label={c.model} size={7.5} tone="soft" />
            <Show from={t} to={t + 0.26} final={false}>
              <Box x={x - 2} y={20} w={100} h={62} r={9} tone="ring" width={2} />
            </Show>
            <Show from={t + 0.12}>
              <Box x={x} y={88} w={96} h={44} r={8} tone={c.tone} />
              {c.lines.map((l, k) => (
                <T key={l} x={x + 48} y={102 + k * 11} mono size={7.5} tone="ink">
                  {l}
                </T>
              ))}
              <T x={x + 48} y={146} size={8} tone={c.tone}>
                {c.verdict}
              </T>
            </Show>
          </g>
        );
      })}
    </>
  );
}

function GenaiTypes() {
  return (
    <>
      <T x={79} y={14} size={9} tone="ink" bold>
        discriminative: sorts
      </T>
      <T x={241} y={14} size={9} tone="ink" bold>
        generative: creates
      </T>
      <line x1={160} y1={6} x2={160} y2={160} strokeDasharray="3 4" className="stroke-line-2" />
      {/* discriminative */}
      <Chip x={29} y={26} w={100} h={20} label="a customer review" size={8} />
      <Arrow x1={79} y1={48} x2={79} y2={60} />
      <Box x={57} y={62} w={44} h={26} r={6} tone="brand" />
      <T x={79} y={79} mono bold size={8.5} tone="brand">
        model
      </T>
      <Arrow x1={79} y1={90} x2={79} y2={102} />
      <Chip x={18} y={106} w={52} h={20} label="spam" size={8} tone="soft" />
      <Chip x={84} y={106} w={60} h={20} label="not spam" size={8} />
      <Show from={0.2}>
        <Chip x={84} y={106} w={60} h={20} label="not spam" size={8} tone="ok" text="ok" />
      </Show>
      <T x={79} y={146} size={8}>
        picks one of a few labels
      </T>
      {/* generative */}
      <Chip x={181} y={26} w={120} h={20} label="a poster for a tea stall" size={7.5} />
      <Arrow x1={241} y1={48} x2={241} y2={60} />
      <Box x={219} y={62} w={44} h={26} r={6} tone="brand" />
      <T x={241} y={79} mono bold size={8.5} tone="brand">
        model
      </T>
      <Arrow x1={241} y1={90} x2={241} y2={98} />
      <Show from={0.45}>
        <Box x={176} y={100} w={60} h={24} r={5} tone="soft" />
        <rect x={182} y={106} width={44} height={3} rx={1.5} className="fill-line-2" />
        <rect x={182} y={112} width={36} height={3} rx={1.5} className="fill-line-2" />
        <rect x={182} y={118} width={40} height={3} rx={1.5} className="fill-line-2" />
      </Show>
      <Show from={0.55}>
        <Box x={246} y={100} w={60} h={24} r={5} tone="soft" />
        <circle cx={292} cy={107} r={3.5} className="fill-warn" />
        <path
          d="M250 122 L264 108 L274 118 L282 111 L302 122 Z"
          className="fill-g2"
          opacity={0.8}
        />
      </Show>
      <Show from={0.65}>
        <Box x={176} y={128} w={60} h={24} r={5} tone="soft" />
        <polyline
          points="182,140 188,134 194,146 200,131 206,149 212,135 218,143 224,138 230,140"
          strokeWidth={1.5}
          className="fill-none stroke-g3"
        />
      </Show>
      <Show from={0.75}>
        <Box x={246} y={128} w={60} h={24} r={5} tone="soft" />
        <T x={276} y={144} mono bold size={9} tone="brand">
          {'{ code }'}
        </T>
      </Show>
      <Show from={0.8}>
        <T x={241} y={164} size={8}>
          text, image, audio, code
        </T>
      </Show>
    </>
  );
}

function BpeMerges() {
  const rows = [
    { parts: ['l', 'o', 'w', 'e', 's', 't'], note: 'start: single letters' },
    { parts: ['lo', 'w', 'e', 's', 't'], note: 'merge l + o (seen 4 times)' },
    { parts: ['low', 'e', 's', 't'], note: 'merge lo + w (4 times)' },
    { parts: ['low', 'es', 't'], note: 'merge e + s (3 times)' },
  ];
  return (
    <>
      <T x={160} y={14} size={9.5} tone="ink">
        BPE: merge the most frequent pair, again and again
      </T>
      {rows.map((r, i) => {
        const y = 26 + i * 30;
        const chips = chipRow(r.parts, 14, 9, 3);
        return (
          <Show key={r.note} from={0.05 + i * 0.22}>
            {chips.map((c, k) => (
              <Chip
                // biome-ignore lint/suspicious/noArrayIndexKey: letters repeat; positions never reorder
                key={k}
                x={c.x}
                y={y}
                w={c.w}
                h={22}
                label={c.word}
                size={9}
                tone={c.word.length > 1 ? 'brand' : 'plain'}
                text={c.word.length > 1 ? 'brand' : 'ink'}
              />
            ))}
            <T x={150} y={y + 15} anchor="start" size={8.5} tone={i === 0 ? 'muted' : 'ink'}>
              {r.note}
            </T>
          </Show>
        );
      })}
      <T x={160} y={154} size={9}>
        Frequent pieces become single tokens
      </T>
    </>
  );
}

// ───────────── LLMs: prompting, sampling and hallucinations ─────────────

function PromptAnatomy() {
  const rows = [
    { tag: 'role', text: 'You are a support agent' },
    { tag: 'task', text: 'Reply to a late order' },
    { tag: 'context', text: 'Order is 40 min late' },
    { tag: 'format', text: 'Two short sentences' },
  ];
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        A clear prompt has parts
      </T>
      <Box x={8} y={22} w={190} h={96} r={8} tone="soft" />
      {rows.map((r, k) => {
        const y = 29 + k * 22;
        return (
          <Show key={r.tag} from={0.06 + k * 0.12}>
            <Chip x={14} y={y} w={46} h={16} label={r.tag} size={7.5} tone="brand" text="brand" />
            <T x={66} y={y + 11.5} anchor="start" mono size={8} tone="ink">
              {r.text}
            </T>
          </Show>
        );
      })}
      <Arrow x1={200} y1={70} x2={228} y2={70} />
      <Box x={230} y={51} w={56} h={38} r={8} tone="brand" width={1.5} />
      <T x={258} y={74} mono bold size={10} tone="brand">
        LLM
      </T>
      <Pulse a={[200, 70]} b={[230, 70]} t0={0.54} t1={0.62} />
      <Arrow x1={258} y1={91} x2={258} y2={122} />
      <Pulse a={[258, 91]} b={[258, 122]} t0={0.64} t1={0.72} cls="fill-ok" />
      <Show from={0.72}>
        <Box x={8} y={124} w={304} h={22} r={6} tone="ok" />
        <T x={160} y={138.5} mono size={7.5} tone="ink">
          Sorry for the delay. I am checking with the rider now.
        </T>
      </Show>
      <T x={160} y={161} size={9}>
        Role, task, context, format: each part removes a guess
      </T>
    </>
  );
}

function FewShotPattern() {
  const rows = [
    { tag: 'example 1', text: 'Food arrived cold', label: 'complaint', y: 26 },
    { tag: 'example 2', text: 'Loved the quick delivery', label: 'praise', y: 52 },
  ];
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Show examples, then ask
      </T>
      {rows.map((r, k) => (
        <Show key={r.tag} from={0.06 + k * 0.14}>
          <T x={8} y={r.y + 13.5} anchor="start" size={8}>
            {r.tag}
          </T>
          <Chip x={62} y={r.y} w={150} h={20} label={r.text} size={8} />
          <Arrow x1={214} y1={r.y + 10} x2={230} y2={r.y + 10} />
          <Chip x={234} y={r.y} w={78} h={20} label={r.label} size={8} tone="soft" />
        </Show>
      ))}
      <line
        x1={8}
        y1={84}
        x2={312}
        y2={84}
        strokeWidth={1}
        strokeDasharray="4 3"
        className="stroke-line-2"
      />
      <Show from={0.38}>
        <T x={8} y={111.5} anchor="start" size={8} tone="brand">
          new input
        </T>
        <Chip x={62} y={98} w={150} h={20} label="Rider was rude" size={8} tone="brand" />
        <Arrow x1={214} y1={108} x2={230} y2={108} tone="brand" />
      </Show>
      <Show from={0.38} to={0.7} final={false}>
        <Chip x={234} y={98} w={78} h={20} label="?" size={9} tone="soft" />
      </Show>
      <Pulse a={[273, 46]} b={[273, 98]} t0={0.56} t1={0.68} cls="fill-ok" />
      <Pulse a={[273, 72]} b={[273, 98]} t0={0.6} t1={0.68} cls="fill-ok" />
      <Show from={0.7}>
        <Chip x={234} y={98} w={78} h={20} label="complaint" size={8} tone="ok" text="ok" />
      </Show>
      <T x={160} y={140} size={9}>
        The model copies the pattern: same labels, same format
      </T>
    </>
  );
}

function ChainOfThought() {
  const steps = ['240 − 60 = 180', '180 ÷ 3 = 60', 'Each pays ₹60'];
  return (
    <>
      <Box x={8} y={8} w={304} h={22} r={6} tone="soft" />
      <T x={160} y={22.5} mono size={8} tone="ink">
        Bill ₹240, coupon ₹60, 3 friends. Each pays?
      </T>
      <T x={78} y={46} size={8.5} tone="ink" bold>
        Answer directly
      </T>
      <T x={240} y={46} size={8.5} tone="ink" bold>
        Think step by step
      </T>
      <line x1={160} y1={38} x2={160} y2={132} strokeWidth={1} className="stroke-line" />
      <Show from={0.1}>
        <Chip x={48} y={56} w={60} h={22} label="₹80" size={10} tone="bad" text="bad" />
        <T x={78} y={92} size={8} tone="bad">
          240 ÷ 3: forgot the coupon
        </T>
      </Show>
      {steps.map((s, k) => {
        const last = k === steps.length - 1;
        return (
          <Show key={s} from={0.3 + k * 0.16}>
            <Chip
              x={184}
              y={54 + k * 26}
              w={112}
              h={20}
              label={s}
              size={8.5}
              tone={last ? 'ok' : 'plain'}
              text={last ? 'ok' : 'ink'}
            />
            {!last && <Arrow x1={240} y1={75 + k * 26} x2={240} y2={79 + k * 26} />}
          </Show>
        );
      })}
      <T x={160} y={150} size={9}>
        Writing the steps first makes multi-step answers more reliable
      </T>
    </>
  );
}

function TemperatureDial() {
  const words = ['hot', 'cold', 'sweet', 'tough'];
  const panels = [
    { t: 'T = 0.2', sub: 'almost always "hot"', p: [0.99, 0.0, 0.01, 0.0], x: 10 },
    { t: 'T = 1', sub: 'usually "hot"', p: [0.61, 0.14, 0.22, 0.03], x: 114 },
    { t: 'T = 2', sub: 'much more varied', p: [0.43, 0.21, 0.26, 0.1], x: 218 },
  ];
  const base = 122;
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Next word after "The tea is": same scores, three temperatures
      </T>
      {panels.map((pn, i) => (
        <Show key={pn.t} from={0.06 + i * 0.28}>
          <Box x={pn.x} y={22} w={92} h={118} r={8} tone="soft" />
          <T x={pn.x + 46} y={35} mono bold size={9} tone="brand">
            {pn.t}
          </T>
          {pn.p.map((p, k) => {
            const h = Math.max(1.5, p * 62);
            const x = pn.x + 8 + k * 20;
            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: bars are positional
              <g key={k}>
                <rect
                  x={x}
                  y={base - h}
                  width={15}
                  height={h}
                  rx={2}
                  className={k === 0 ? 'fill-brand' : 'fill-g2'}
                />
                <T x={x + 7.5} y={base - h - 3} mono size={6.5} tone="ink">
                  {p.toFixed(2)}
                </T>
                <T x={x + 7.5} y={base + 9} mono size={6} tone="muted">
                  {words[k]}
                </T>
              </g>
            );
          })}
        </Show>
      ))}
      {panels.map((pn, i) => (
        <Show key={pn.sub} from={0.16 + i * 0.28}>
          <T x={pn.x + 46} y={152} size={8} tone="ink">
            {pn.sub}
          </T>
        </Show>
      ))}
      <T x={160} y={168} size={9}>
        Low T: focused and repeatable. High T: varied and riskier
      </T>
    </>
  );
}

function TopPNucleus() {
  const rows = [
    { w: 'hot', p: 0.61, cum: '0.61' },
    { w: 'sweet', p: 0.22, cum: '0.83' },
    { w: 'cold', p: 0.14, cum: '0.97' },
    { w: 'tough', p: 0.03, cum: '' },
  ];
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Top-p = 0.9: keep the smallest set that covers 90%
      </T>
      <T x={58} y={30} anchor="start" size={7.5}>
        probability
      </T>
      <T x={300} y={30} anchor="end" size={7.5}>
        running total
      </T>
      {rows.map((r, k) => {
        const y = 36 + k * 24;
        const cut = k === rows.length - 1;
        const t = 0.08 + k * 0.16;
        return (
          <Show key={r.w} from={t}>
            <T x={12} y={y + 12} anchor="start" mono size={9} tone={cut ? 'muted' : 'ink'}>
              {r.w}
            </T>
            <rect
              x={58}
              y={y + 3}
              width={Math.max(3, r.p * 150)}
              height={12}
              rx={3}
              className={cut ? 'fill-line-2' : 'fill-brand'}
            />
            <T
              x={64 + Math.max(3, r.p * 150)}
              y={y + 12.5}
              anchor="start"
              mono
              size={8}
              tone={cut ? 'muted' : 'ink'}
            >
              {r.p.toFixed(2)}
            </T>
            {!cut && (
              <T x={300} y={y + 12.5} anchor="end" mono size={8.5} tone={k === 2 ? 'ok' : 'ink'}>
                {k === 2 ? `${r.cum} ≥ 0.9` : r.cum}
              </T>
            )}
          </Show>
        );
      })}
      <Show from={0.66}>
        <line
          x1={8}
          y1={105}
          x2={312}
          y2={105}
          strokeWidth={1.25}
          strokeDasharray="4 3"
          className="stroke-bad"
        />
        <T x={300} y={120.5} anchor="end" size={8.5} tone="bad">
          cut: never sampled
        </T>
      </Show>
      <Show from={0.74}>
        <Box x={6} y={34} w={308} h={68} r={8} tone="ringOk" width={1.5} />
      </Show>
      <T x={160} y={150} size={9}>
        Sample only from the kept words; the unlikely tail is dropped
      </T>
    </>
  );
}

function HallucinationGrounding() {
  return (
    <>
      <T x={8} y={14} anchor="start" size={8.5} tone="ink" bold>
        Model alone
      </T>
      <Chip x={8} y={22} w={112} h={22} label="Refund window?" size={8} />
      <Arrow x1={122} y1={33} x2={156} y2={33} />
      <Box x={158} y={19} w={42} h={28} r={8} tone="brand" width={1.5} />
      <T x={179} y={36.5} mono bold size={9} tone="brand">
        LLM
      </T>
      <Arrow x1={202} y1={33} x2={212} y2={33} />
      <Pulse a={[122, 33]} b={[158, 33]} t0={0.06} t1={0.14} />
      <Show from={0.18}>
        <Chip x={214} y={22} w={56} h={22} label="30 days" size={8.5} tone="bad" text="bad" />
        <T x={242} y={56} size={8} tone="bad">
          made up, sounds right
        </T>
      </Show>
      <line
        x1={8}
        y1={66}
        x2={312}
        y2={66}
        strokeWidth={1}
        strokeDasharray="4 3"
        className="stroke-line-2"
      />
      <T x={8} y={80} anchor="start" size={8.5} tone="ink" bold>
        Model with the policy in the prompt
      </T>
      <Show from={0.4}>
        <Chip
          x={8}
          y={88}
          w={136}
          h={20}
          label="Policy: refund in 7 days"
          size={7.5}
          tone="brand"
          text="brand"
        />
      </Show>
      <Chip x={8} y={112} w={112} h={22} label="Refund window?" size={8} />
      <path
        d="M146 98 C 152 98, 152 110, 156 110"
        strokeWidth={1.5}
        className="fill-none stroke-brand"
      />
      <Arrow x1={122} y1={123} x2={156} y2={118} />
      <Box x={158} y={100} w={42} h={28} r={8} tone="brand" width={1.5} />
      <T x={179} y={117.5} mono bold size={9} tone="brand">
        LLM
      </T>
      <Arrow x1={202} y1={114} x2={212} y2={114} />
      <Pulse a={[146, 98]} b={[158, 110]} t0={0.5} t1={0.58} />
      <Pulse a={[122, 123]} b={[158, 118]} t0={0.5} t1={0.58} />
      <Show from={0.64}>
        <Chip x={214} y={103} w={56} h={22} label="7 days" size={8.5} tone="ok" text="ok" />
        <T x={242} y={138} size={8} tone="ok">
          read from the policy
        </T>
      </Show>
      <T x={160} y={156} size={9}>
        With the facts in the prompt, the model reads instead of guessing
      </T>
    </>
  );
}

function GuardrailsPipeline() {
  const y = 41;
  const rows = [
    {
      msg: 'Where is my order?',
      res: 'passes both checks, answered',
      tone: 'ok' as const,
      t: 0.04,
      end: 306,
    },
    {
      msg: 'Ignore your rules and...',
      res: 'blocked at the input check',
      tone: 'bad' as const,
      t: 0.34,
      end: 76,
    },
    {
      msg: "What is the rider's number?",
      res: 'reply had a phone number: masked',
      tone: 'warn' as const,
      t: 0.62,
      end: 238,
    },
  ];
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Guardrails check what goes in and what comes out
      </T>
      <circle cx={14} cy={y} r={5} className="fill-g2" />
      <Arrow x1={21} y1={y} x2={38} y2={y} />
      <Box x={40} y={26} w={72} h={30} r={8} tone="plain" />
      <T x={76} y={44.5} size={8.5} tone="ink">
        Input check
      </T>
      <Arrow x1={114} y1={y} x2={132} y2={y} />
      <Box x={134} y={26} w={44} h={30} r={8} tone="brand" width={1.5} />
      <T x={156} y={44.5} mono bold size={9} tone="brand">
        LLM
      </T>
      <Arrow x1={180} y1={y} x2={198} y2={y} />
      <Box x={200} y={26} w={76} h={30} r={8} tone="plain" />
      <T x={238} y={44.5} size={8.5} tone="ink">
        Output check
      </T>
      <Arrow x1={278} y1={y} x2={296} y2={y} />
      <circle cx={304} cy={y} r={5} className="fill-g2" />
      <Show from={0.42} to={0.6} final={false}>
        <Box x={40} y={26} w={72} h={30} r={8} tone="ringBad" width={2} />
      </Show>
      <Show from={0.78} to={0.96} final={false}>
        <Box x={200} y={26} w={76} h={30} r={8} tone="warn" width={2} />
        <T x={238} y={44.5} size={8.5} tone="ink">
          Output check
        </T>
      </Show>
      {rows.map((r, k) => {
        const ry = 70 + k * 23;
        const span = ((r.end - 14) / 292) * 0.18;
        return (
          <g key={r.msg}>
            <Show from={r.t}>
              <Chip x={8} y={ry} w={138} h={18} label={r.msg} size={7.5} />
            </Show>
            <Pulse
              a={[14, y]}
              b={[r.end, y]}
              t0={r.t + 0.03}
              t1={r.t + 0.03 + span}
              cls={r.tone === 'ok' ? 'fill-ok' : r.tone === 'bad' ? 'fill-bad' : 'fill-warn'}
            />
            <Show from={r.t + 0.05 + span}>
              <T x={154} y={ry + 12.5} anchor="start" size={8} tone={r.tone}>
                {r.res}
              </T>
            </Show>
          </g>
        );
      })}
      <T x={160} y={152} size={9}>
        Checks around the model catch what a prompt alone cannot
      </T>
    </>
  );
}

// ───────────── LLMs: agents, tools and frameworks ─────────────

function AgentLoop() {
  const stations = [
    { x: 20, label: 'Think', sub: 'the LLM decides' },
    { x: 120, label: 'Act', sub: 'call a tool' },
    { x: 220, label: 'Observe', sub: 'read the result' },
  ];
  const loops = [
    { t: 0.08, text: 'loop 1: get_order(42) → out for delivery', y: 122 },
    { t: 0.34, text: 'loop 2: get_eta(42) → 10 minutes', y: 135 },
  ];
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        An agent loops until the goal is met
      </T>
      <T x={160} y={31} mono size={8} tone="brand">
        goal: "Where is my order?"
      </T>
      {stations.map((s, k) => (
        <g key={s.label}>
          <Box x={s.x} y={42} w={80} h={34} r={8} tone={k === 0 ? 'brand' : 'plain'} />
          <T x={s.x + 40} y={57} size={9.5} tone={k === 0 ? 'brand' : 'ink'} bold>
            {s.label}
          </T>
          <T x={s.x + 40} y={69} size={7.5}>
            {s.sub}
          </T>
          {k < 2 && <Arrow x1={s.x + 82} y1={59} x2={s.x + 98} y2={59} />}
        </g>
      ))}
      <path
        d="M260 78 C 260 104, 60 104, 60 80"
        strokeWidth={1.25}
        strokeDasharray="4 3"
        className="fill-none stroke-line-2"
      />
      <T x={160} y={108} size={7.5}>
        not done yet: go round again
      </T>
      {loops.map((l) => (
        <g key={l.text}>
          <Pulse a={[100, 59]} b={[120, 59]} t0={l.t} t1={l.t + 0.05} />
          <Pulse a={[200, 59]} b={[220, 59]} t0={l.t + 0.06} t1={l.t + 0.11} />
          <Pulse a={[260, 92]} b={[60, 92]} t0={l.t + 0.13} t1={l.t + 0.22} cls="fill-g2" />
          <Show from={l.t + 0.11}>
            <T x={160} y={l.y} mono size={8} tone="ink">
              {l.text}
            </T>
          </Show>
        </g>
      ))}
      <Show from={0.64}>
        <Box x={52} y={142} w={216} h={20} r={6} tone="ok" />
        <T x={160} y={155.5} mono size={8} tone="ink">
          Out for delivery, 10 minutes away.
        </T>
      </Show>
    </>
  );
}

function ToolCallRoundtrip() {
  const lanes = [
    { x: 50, label: 'User', w: 50 },
    { x: 160, label: 'LLM', w: 50 },
    { x: 266, label: 'Your app', w: 66 },
  ];
  const msgs = [
    { from: 50, to: 160, y: 58, text: 'Where is order 42?', tone: 'muted' as const, t: 0.05 },
    { from: 160, to: 266, y: 84, text: 'get_order(order_id=42)', tone: 'brand' as const, t: 0.25 },
    { from: 266, to: 160, y: 116, text: '"out for delivery"', tone: 'ok' as const, t: 0.47 },
    { from: 160, to: 50, y: 144, text: 'It is out for delivery.', tone: 'muted' as const, t: 0.69 },
  ];
  return (
    <>
      {lanes.map((l, k) => (
        <g key={l.label}>
          <Chip
            x={l.x - l.w / 2}
            y={6}
            w={l.w}
            h={20}
            label={l.label}
            size={8.5}
            tone={k === 1 ? 'brand' : 'soft'}
            text={k === 1 ? 'brand' : 'ink'}
          />
          <line
            x1={l.x}
            y1={28}
            x2={l.x}
            y2={152}
            strokeWidth={1}
            strokeDasharray="3 3"
            className="stroke-line-2"
          />
        </g>
      ))}
      {msgs.map((m) => {
        const dir = m.to > m.from ? 1 : -1;
        return (
          <g key={m.text}>
            <Show from={m.t}>
              <T x={(m.from + m.to) / 2} y={m.y - 5} mono size={7.5} tone="ink">
                {m.text}
              </T>
              <Arrow x1={m.from + dir * 3} y1={m.y} x2={m.to - dir * 5} y2={m.y} tone={m.tone} />
            </Show>
            <Pulse
              a={[m.from, m.y]}
              b={[m.to, m.y]}
              t0={m.t}
              t1={m.t + 0.12}
              cls={m.tone === 'ok' ? 'fill-ok' : 'fill-brand'}
            />
          </g>
        );
      })}
      <Show from={0.3}>
        <T x={213} y={94} size={7} tone="brand">
          a structured request
        </T>
      </Show>
      <Show from={0.5}>
        <T x={213} y={126} size={7} tone="ok">
          the app ran the function
        </T>
      </Show>
      <T x={160} y={166} size={9}>
        The model only asks; your code runs the tool
      </T>
    </>
  );
}

function ChainVsGraph() {
  const chain = ['prompt', 'model', 'parser', 'output'];
  const states = [
    { text: '{"draft": "Hi", "tries": 0}', from: 0.4, to: 0.56 },
    { text: '{"draft": "Hi!", "tries": 1}', from: 0.56, to: 0.74 },
    { text: '{"draft": "Hi!!", "tries": 2}', from: 0.74, to: undefined },
  ];
  return (
    <>
      <T x={12} y={14} anchor="start" size={9} tone="ink" bold>
        Chain: one fixed path
      </T>
      {chain.map((c, k) => (
        <g key={c}>
          <Chip x={14 + k * 76} y={22} w={60} h={20} label={c} size={8.5} />
          {k < chain.length - 1 && (
            <Arrow x1={76 + k * 76} y1={32} x2={88 + k * 76} y2={32} tone="brand" />
          )}
        </g>
      ))}
      <Pulse a={[44, 32]} b={[272, 32]} t0={0.05} t1={0.3} />
      <line
        x1={8}
        y1={54}
        x2={312}
        y2={54}
        strokeWidth={1}
        strokeDasharray="4 3"
        className="stroke-line-2"
      />
      <T x={12} y={70} anchor="start" size={9} tone="ink" bold>
        Graph: nodes, shared state, branches and loops
      </T>
      <Chip x={14} y={82} w={48} h={22} label="START" size={8} tone="soft" />
      <Arrow x1={64} y1={93} x2={82} y2={93} />
      <Chip x={84} y={82} w={60} h={22} label="write" size={9} tone="brand" text="brand" />
      <Arrow x1={146} y1={93} x2={166} y2={93} />
      <Chip x={168} y={82} w={76} h={22} label="tries ≥ 2 ?" size={8} tone="warn" />
      <Arrow x1={246} y1={93} x2={266} y2={93} tone="ok" />
      <T x={256} y={87} size={7} tone="ok">
        done
      </T>
      <Chip x={268} y={82} w={40} h={22} label="END" size={8} tone="soft" />
      <path
        d="M206 106 C 206 126, 114 126, 114 108"
        strokeWidth={1.5}
        className="fill-none stroke-brand"
      />
      <Arrow x1={114} y1={112} x2={114} y2={106} tone="brand" />
      <T x={160} y={131} size={7.5} tone="brand">
        again
      </T>
      <Pulse a={[62, 93]} b={[168, 93]} t0={0.4} t1={0.5} />
      <Pulse a={[206, 118]} b={[114, 118]} t0={0.52} t1={0.6} />
      <Pulse a={[144, 93]} b={[268, 93]} t0={0.66} t1={0.78} cls="fill-ok" />
      <T x={12} y={150} anchor="start" size={8}>
        state
      </T>
      {states.map((s) => (
        <Show key={s.text} from={s.from} to={s.to} final={s.to === undefined}>
          <T x={44} y={150} anchor="start" mono size={8.5} tone="ink">
            {s.text}
          </T>
        </Show>
      ))}
    </>
  );
}

function McpHub() {
  const names = ['Chat', 'IDE', 'Agent'];
  const tools = ['GitHub', 'DB', 'Files'];
  const ys = [38, 66, 94];
  return (
    <>
      <T x={78} y={14} size={9} tone="ink" bold>
        Without a standard
      </T>
      <T x={242} y={14} size={9} tone="ink" bold>
        With MCP
      </T>
      <line x1={160} y1={6} x2={160} y2={136} strokeWidth={1} className="stroke-line" />
      {ys.map((y, k) => (
        <g key={y}>
          <Chip x={10} y={y} w={44} h={20} label={names[k] ?? ''} size={8} />
          <Chip x={102} y={y} w={48} h={20} label={tools[k] ?? ''} size={8} tone="soft" />
          <Chip x={170} y={y} w={40} h={20} label={names[k] ?? ''} size={8} />
          <Chip x={268} y={y} w={44} h={20} label={tools[k] ?? ''} size={8} tone="soft" />
        </g>
      ))}
      <Show from={0.08}>
        {ys.flatMap((a) =>
          ys.map((b) => (
            <line
              key={`${a}-${b}`}
              x1={55}
              y1={a + 10}
              x2={101}
              y2={b + 10}
              strokeWidth={1}
              className="stroke-bad"
              opacity={0.7}
            />
          )),
        )}
      </Show>
      <Show from={0.28}>
        <T x={78} y={130} size={8.5} tone="bad">
          3 × 3 = 9 custom connections
        </T>
      </Show>
      <Show from={0.46}>
        <Box x={224} y={34} w={30} h={84} r={8} tone="brand" width={1.5} />
        <T x={239} y={79} mono bold size={8.5} tone="brand">
          MCP
        </T>
      </Show>
      <Show from={0.56}>
        {ys.map((y) => (
          <g key={y}>
            <line
              x1={211}
              y1={y + 10}
              x2={223}
              y2={y + 10}
              strokeWidth={1.5}
              className="stroke-brand"
            />
            <line
              x1={255}
              y1={y + 10}
              x2={267}
              y2={y + 10}
              strokeWidth={1.5}
              className="stroke-brand"
            />
          </g>
        ))}
      </Show>
      <Show from={0.68}>
        <T x={242} y={130} size={8.5} tone="ok">
          3 + 3: each side speaks MCP once
        </T>
      </Show>
      <T x={160} y={154} size={9}>
        One standard plug between AI apps and tools
      </T>
    </>
  );
}

function MultiAgentOrchestrator() {
  const kids = [
    { x: 10, label: 'Flights agent', tool: 'tool: flight search' },
    { x: 114, label: 'Hotels agent', tool: 'tool: hotel search' },
    { x: 218, label: 'Budget agent', tool: 'tool: calculator' },
  ];
  return (
    <>
      <T x={160} y={14} mono size={8.5} tone="ink">
        "Plan a 3-day Goa trip under ₹15,000"
      </T>
      <Arrow x1={160} y1={18} x2={160} y2={28} />
      <Box x={100} y={30} w={120} h={26} r={8} tone="brand" width={1.5} />
      <T x={160} y={47} size={9.5} tone="brand" bold>
        Orchestrator agent
      </T>
      {kids.map((k, i) => {
        const cx = k.x + 46;
        return (
          <g key={k.label}>
            <Arrow x1={i === 1 ? 160 : i === 0 ? 124 : 196} y1={58} x2={cx} y2={86} />
            <Box x={k.x} y={88} w={92} h={26} r={8} tone="plain" />
            <T x={cx} y={105} size={9} tone="ink">
              {k.label}
            </T>
            <T x={cx} y={127} mono size={7.5}>
              {k.tool}
            </T>
            <Pulse
              a={[i === 1 ? 160 : i === 0 ? 124 : 196, 58]}
              b={[cx, 86]}
              t0={0.1 + i * 0.06}
              t1={0.24 + i * 0.06}
            />
            <Pulse
              a={[cx, 86]}
              b={[i === 1 ? 160 : i === 0 ? 124 : 196, 58]}
              t0={0.46 + i * 0.06}
              t1={0.6 + i * 0.06}
              cls="fill-ok"
            />
          </g>
        );
      })}
      <Show from={0.12} to={0.4} final={false}>
        <T x={272} y={47} size={8} tone="brand">
          splits the work
        </T>
      </Show>
      <Show from={0.72}>
        <T x={272} y={47} size={8} tone="ok">
          combines results
        </T>
      </Show>
      <T x={160} y={150} size={9}>
        Each agent has one small job, its own prompt and its own tools
      </T>
    </>
  );
}

// ───────────── Python: the coding round ─────────────

function CodingRoundSteps() {
  const steps = [
    { label: 'Restate', say: '"So I return True or False?"' },
    { label: 'Example', say: '"For level, the answer is True."' },
    { label: 'Code aloud', say: '"I compare the two ends, then move in."' },
    { label: 'Test', say: '"What about an empty string?"' },
  ];
  const span = 0.22;
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Four steps for every coding question
      </T>
      {steps.map((s, k) => {
        const x = 8 + k * 78;
        const t = 0.06 + k * span;
        const last = k === steps.length - 1;
        return (
          <g key={s.label}>
            <Box x={x} y={26} w={70} h={34} r={8} tone="plain" />
            <T x={x + 14} y={47} mono bold size={11} tone="brand">
              {String(k + 1)}
            </T>
            <T x={x + 42} y={46.5} size={8.5} tone="ink">
              {s.label}
            </T>
            {k < 3 && <Arrow x1={x + 71} y1={43} x2={x + 77} y2={43} />}
            <Show from={t} to={last ? undefined : t + span} final={last}>
              <Box x={x} y={26} w={70} h={34} r={8} tone="ring" width={2} />
              <Box x={28} y={78} w={264} h={26} r={8} tone="soft" />
              <T x={160} y={95} size={9} tone="ink">
                {s.say}
              </T>
            </Show>
          </g>
        );
      })}
      <T x={160} y={73} size={7.5}>
        what you say
      </T>
      <T x={160} y={128} size={9}>
        Keep talking: the interviewer marks your thinking, not just the code
      </T>
    </>
  );
}

function TwoPointerPalindrome() {
  const letters = ['l', 'e', 'v', 'e', 'l'];
  const bx = (k: number) => 62 + k * 42;
  const steps = [
    { a: 0, b: 4, text: 'compare "l" and "l": same', t: 0.08 },
    { a: 1, b: 3, text: 'compare "e" and "e": same', t: 0.36 },
  ];
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Is "level" a palindrome
      </T>
      {letters.map((c, k) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: letters repeat and never reorder
        <g key={k}>
          <Box x={bx(k)} y={28} w={34} h={34} r={8} tone="plain" />
          <T x={bx(k) + 17} y={50} mono bold size={13} tone="ink">
            {c}
          </T>
          <T x={bx(k) + 17} y={72} mono size={7}>
            {String(k)}
          </T>
        </g>
      ))}
      {steps.map((s) => (
        <Show key={s.text} from={s.t} to={s.t + 0.28} final={false}>
          <Box x={bx(s.a)} y={28} w={34} h={34} r={8} tone="ringOk" width={2} />
          <Box x={bx(s.b)} y={28} w={34} h={34} r={8} tone="ringOk" width={2} />
          <Arrow x1={bx(s.a) + 17} y1={96} x2={bx(s.a) + 17} y2={80} tone="brand" />
          <Arrow x1={bx(s.b) + 17} y1={96} x2={bx(s.b) + 17} y2={80} tone="brand" />
          <T x={bx(s.a) + 17} y={106} size={7.5} tone="brand">
            left
          </T>
          <T x={bx(s.b) + 17} y={106} size={7.5} tone="brand">
            right
          </T>
          <T x={160} y={124} mono size={8.5} tone="ok">
            {s.text}
          </T>
        </Show>
      ))}
      <Show from={0.64}>
        <Box x={bx(2)} y={28} w={34} h={34} r={8} tone="ring" width={2} />
        <Arrow x1={bx(2) + 17} y1={96} x2={bx(2) + 17} y2={80} tone="brand" />
        <T x={bx(2) + 17} y={106} size={7.5} tone="brand">
          left meets right
        </T>
        <T x={160} y={124} mono size={8.5} tone="ok">
          every pair matched: True
        </T>
      </Show>
      <T x={160} y={146} size={9}>
        Check the two ends, then move both pointers inward
      </T>
    </>
  );
}

function CharFrequencyCount() {
  const letters = ['h', 'e', 'l', 'l', 'o'];
  const lx = (k: number) => 72 + k * 38;
  const keys = [
    { ch: 'h', x: 22, from: 0 },
    { ch: 'e', x: 94, from: 1 },
    { ch: 'l', x: 166, from: 2 },
    { ch: 'o', x: 238, from: 4 },
  ];
  const at = (k: number) => 0.08 + k * 0.15;
  const keyOf = (ch: string) => keys.find((q) => q.ch === ch) ?? keys[0];
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Count each letter of "hello" in a dictionary
      </T>
      {letters.map((c, k) => {
        const target = keyOf(c);
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: letters repeat and never reorder
          <g key={k}>
            <Chip x={lx(k)} y={22} w={30} h={24} label={c} size={11} />
            <Show from={at(k)} to={at(k) + 0.14} final={false}>
              <Box x={lx(k)} y={22} w={30} h={24} r={6} tone="ring" width={2} />
            </Show>
            <Pulse
              a={[lx(k) + 15, 48]}
              b={[(target?.x ?? 0) + 30, 80]}
              t0={at(k)}
              t1={at(k) + 0.09}
            />
          </g>
        );
      })}
      <T x={12} y={74} anchor="start" size={7.5}>
        counts
      </T>
      {keys.map((q) => {
        const t = at(q.from) + 0.09;
        const twice = q.ch === 'l';
        return (
          <g key={q.ch}>
            <Show from={t} to={twice ? at(3) + 0.09 : undefined} final={!twice}>
              <Chip x={q.x} y={82} w={60} h={24} label={`"${q.ch}": 1`} size={9.5} tone="soft" />
            </Show>
            {twice && (
              <Show from={at(3) + 0.09}>
                <Chip
                  x={q.x}
                  y={82}
                  w={60}
                  h={24}
                  label={`"${q.ch}": 2`}
                  size={9.5}
                  tone="ok"
                  text="ok"
                />
              </Show>
            )}
          </g>
        );
      })}
      <T x={160} y={128} mono size={8.5} tone="brand">
        counts[ch] = counts.get(ch, 0) + 1
      </T>
      <T x={160} y={150} size={9}>
        One pass over the string, one counter per letter
      </T>
    </>
  );
}

function SecondLargestScan() {
  const nums = [4, 9, 2, 9, 7];
  const nx = (k: number) => 44 + k * 50;
  const steps = [
    { big: '4', sec: 'None', say: '4: the first number, so it is the largest' },
    { big: '9', sec: '4', say: '9: a new largest, the old one becomes second' },
    { big: '9', sec: '4', say: '2: smaller than both, ignore it' },
    { big: '9', sec: '4', say: '9 again: equal to the largest, skip it' },
    { big: '9', sec: '7', say: '7: between the two, so it is the new second' },
  ];
  const span = 0.17;
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Second largest in one pass
      </T>
      {nums.map((n, k) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: numbers repeat and never reorder
        <Chip key={k} x={nx(k)} y={22} w={38} h={26} label={String(n)} size={12} />
      ))}
      <T x={110} y={72} size={8}>
        largest
      </T>
      <T x={210} y={72} size={8}>
        second
      </T>
      {steps.map((s, k) => {
        const t = 0.06 + k * span;
        const last = k === steps.length - 1;
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: steps are positional
          <Show key={k} from={t} to={last ? undefined : t + span} final={last}>
            <Box x={nx(k)} y={22} w={38} h={26} r={6} tone="ring" width={2} />
            <Chip x={72} y={78} w={76} h={26} label={s.big} size={12} tone="brand" text="brand" />
            <Chip
              x={172}
              y={78}
              w={76}
              h={26}
              label={s.sec}
              size={s.sec === 'None' ? 10 : 12}
              tone={last ? 'ok' : 'soft'}
              text={last ? 'ok' : 'ink'}
            />
            <T x={160} y={126} size={8.5} tone="ink">
              {s.say}
            </T>
          </Show>
        );
      })}
      <T x={160} y={150} size={9}>
        Two variables, no sorting, duplicates handled
      </T>
    </>
  );
}

function PrimeDivisorCheck() {
  const rows = [
    {
      n: 29,
      y: 26,
      rems: [1, 2, 1, 4],
      verdict: 'prime',
      tone: 'ok' as const,
      why: 'stop at 5: 6 × 6 is already more than 29',
      t: 0.05,
    },
    {
      n: 91,
      y: 86,
      rems: [1, 1, 3, 1, 1, 0],
      verdict: '7 × 13',
      tone: 'bad' as const,
      why: 'remainder 0 at 7: a divisor, so 91 is not prime',
      t: 0.48,
    },
  ];
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Try each divisor from 2; a remainder of 0 means not prime
      </T>
      {rows.map((r) => (
        <g key={r.n}>
          <Chip
            x={8}
            y={r.y}
            w={34}
            h={24}
            label={String(r.n)}
            size={11}
            tone="brand"
            text="brand"
          />
          {r.rems.map((rem, k) => {
            const hit = rem === 0;
            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: divisors are positional
              <Show key={k} from={r.t + k * 0.055}>
                <Chip
                  x={48 + k * 36}
                  y={r.y}
                  w={32}
                  h={24}
                  label={`÷${k + 2}: ${rem}`}
                  size={7.5}
                  tone={hit ? 'bad' : 'plain'}
                  text={hit ? 'bad' : 'ink'}
                />
              </Show>
            );
          })}
          <Show from={r.t + r.rems.length * 0.055 + 0.03}>
            <Chip
              x={52 + r.rems.length * 36}
              y={r.y}
              w={48}
              h={24}
              label={r.verdict}
              size={8.5}
              tone={r.tone}
              text={r.tone}
            />
            <T x={48} y={r.y + 38} anchor="start" size={8} tone={r.tone}>
              {r.why}
            </T>
          </Show>
        </g>
      ))}
      <T x={160} y={150} size={9}>
        Only test divisors up to the square root of the number
      </T>
    </>
  );
}

function FibonacciWindow() {
  const seq = [0, 1, 1, 2, 3, 5, 8, 13];
  const fx = (k: number) => 14 + k * 37;
  const steps = 6;
  const at = (k: number) => 0.06 + k * 0.145;
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Each number is the sum of the two before it
      </T>
      {seq.map((n, k) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: numbers repeat and never reorder
        <Show key={k} from={k < 2 ? 0 : at(k - 2) + 0.07}>
          <Chip x={fx(k)} y={36} w={31} h={28} label={String(n)} size={11} />
        </Show>
      ))}
      <Move
        keys={Array.from({ length: steps }, (_, k) => [k === 0 ? 0 : at(k), [k * 37, 0]] as const)}
        at={[(steps - 1) * 37, 0]}
        discrete
      >
        <Box x={fx(0) - 3} y={32} w={74} h={36} r={8} tone="ring" width={2} />
        <T x={fx(0) + 15.5} y={28} mono size={8} tone="brand">
          a
        </T>
        <T x={fx(1) + 15.5} y={28} mono size={8} tone="brand">
          b
        </T>
      </Move>
      {Array.from({ length: steps }, (_, k) => {
        const last = k === steps - 1;
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: steps are positional
          <Show key={k} from={at(k)} to={last ? undefined : at(k + 1)} final={last}>
            <T x={160} y={92} mono size={10} tone="ink">
              {`${seq[k]} + ${seq[k + 1]} = ${seq[k + 2]}`}
            </T>
          </Show>
        );
      })}
      <T x={160} y={114} mono size={8.5} tone="brand">
        a, b = b, a + b
      </T>
      <T x={160} y={138} size={9}>
        Keep only the last two numbers, and slide forward
      </T>
    </>
  );
}

// ───────────── Python: data structures and algorithms ─────────────

function BigOGrowth() {
  const cols = [
    { n: 'n = 10', x: 150, t: 0.05 },
    { n: 'n = 100', x: 210, t: 0.3 },
    { n: 'n = 1,000', x: 274, t: 0.55 },
  ];
  const rows: Array<{ o: string; v: [string, string, string]; tone: 'ok' | 'ink' | 'bad' }> = [
    { o: 'O(1)', v: ['1', '1', '1'], tone: 'ok' },
    { o: 'O(log n)', v: ['3', '7', '10'], tone: 'ok' },
    { o: 'O(n)', v: ['10', '100', '1,000'], tone: 'ink' },
    { o: 'O(n log n)', v: ['33', '664', '9,966'], tone: 'ink' },
    { o: 'O(n²)', v: ['100', '10,000', '1,000,000'], tone: 'bad' },
  ];
  const ry = (k: number) => 56 + k * 22;
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Steps a solution takes as the input grows
      </T>
      <T x={14} y={36} anchor="start" size={8}>
        growth
      </T>
      {cols.map((c) => (
        <Show key={c.n} from={c.t}>
          <T x={c.x} y={36} mono size={8}>
            {c.n}
          </T>
        </Show>
      ))}
      {rows.map((r, k) => (
        <g key={r.o}>
          <Box x={8} y={ry(k) - 14} w={304} h={19} r={5} tone="soft" width={0.75} />
          <T x={14} y={ry(k)} anchor="start" mono bold size={9} tone="ink">
            {r.o}
          </T>
          {cols.map((c, i) => (
            <Show key={c.n} from={c.t + 0.04 + k * 0.025}>
              <T x={c.x} y={ry(k)} mono size={9} tone={r.tone}>
                {r.v[i]}
              </T>
            </Show>
          ))}
        </g>
      ))}
      <Show from={0.8}>
        <Box x={236} y={ry(4) - 15} w={76} h={21} r={5} tone="ringBad" width={2} />
      </Show>
      <T x={160} y={170} size={9}>
        Drop the constants: how the steps grow decides if it scales
      </T>
    </>
  );
}

function TwoSumHashmap() {
  const nums = [3, 2, 7, 11];
  const nx = (k: number) => 40 + k * 62;
  const steps = [
    { k: 0, say: 'need 9 − 3 = 6: not seen yet, so store 3 → index 0', t: 0.06 },
    { k: 1, say: 'need 9 − 2 = 7: not seen yet, so store 2 → index 1', t: 0.32 },
    { k: 2, say: 'need 9 − 7 = 2: seen at index 1, so the pair is found', t: 0.58 },
  ];
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Two sum, target 9: ask the dict for each partner
      </T>
      {nums.map((n, k) => (
        <g key={n}>
          <Chip x={nx(k)} y={24} w={44} h={26} label={String(n)} size={12} />
          <T x={nx(k) + 22} y={62} mono size={7.5}>
            {`i = ${k}`}
          </T>
        </g>
      ))}
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        return (
          <Show key={s.k} from={s.t} to={last ? undefined : s.t + 0.26} final={last}>
            <Box x={nx(s.k)} y={24} w={44} h={26} r={6} tone={last ? 'ringOk' : 'ring'} width={2} />
            <T x={160} y={124} size={8.5} tone={last ? 'ok' : 'ink'}>
              {s.say}
            </T>
          </Show>
        );
      })}
      <T x={14} y={96} anchor="start" size={8}>
        seen
      </T>
      <Show from={0.17}>
        <Chip x={44} y={82} w={56} h={22} label="3: 0" size={9.5} tone="soft" />
      </Show>
      <Show from={0.43}>
        <Chip x={108} y={82} w={56} h={22} label="2: 1" size={9.5} tone="soft" />
      </Show>
      <Show from={0.72}>
        <Chip x={196} y={82} w={110} h={22} label="return [1, 2]" size={9.5} tone="ok" text="ok" />
      </Show>
      <T x={160} y={154} size={9}>
        One pass: O(n) time, with a dict as O(n) extra space
      </T>
    </>
  );
}

function ContainerWater() {
  const h = [1, 8, 6, 2, 5, 4, 8, 3, 7];
  const bx = (k: number) => 30 + k * 30;
  const base = 136;
  const unit = 10.5;
  const steps = [
    { l: 0, r: 8, say: 'width 8 × shorter wall 1 = 8: move the shorter left wall', t: 0.05 },
    { l: 1, r: 8, say: 'width 7 × shorter wall 7 = 49: best so far', t: 0.3 },
    { l: 1, r: 7, say: 'width 6 × shorter wall 3 = 18: move the shorter right wall', t: 0.53 },
  ];
  const water = (l: number, r: number) => {
    const level = Math.min(h[l] ?? 0, h[r] ?? 0) * unit;
    return { x: bx(l) + 18, w: bx(r) - bx(l) - 18, y: base - level, hgt: level };
  };
  const best = water(1, 8);
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Container with most water: move the shorter wall
      </T>
      {steps.map((s, i) => {
        const w = water(s.l, s.r);
        return (
          <Show key={s.t} from={s.t} to={s.t + 0.22} final={false}>
            <Box x={w.x} y={w.y} w={w.w} h={w.hgt} r={2} tone={i === 1 ? 'ok' : 'brand'} />
            <Arrow x1={bx(s.l) + 9} y1={156} x2={bx(s.l) + 9} y2={142} tone="brand" />
            <Arrow x1={bx(s.r) + 9} y1={156} x2={bx(s.r) + 9} y2={142} tone="brand" />
            <T x={160} y={30} size={8.5} tone={i === 1 ? 'ok' : 'ink'}>
              {s.say}
            </T>
          </Show>
        );
      })}
      <Show from={0.78}>
        <Box x={best.x} y={best.y} w={best.w} h={best.hgt} r={2} tone="ok" />
        <T x={160} y={30} size={8.5} tone="ok">
          best: 7 × 7 = 49, found in one pass from both ends
        </T>
      </Show>
      {h.map((v, k) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: heights repeat and never reorder
        <g key={k}>
          <Box x={bx(k)} y={base - v * unit} w={18} h={v * unit} r={2} tone="soft" width={1} />
          <T x={bx(k) + 9} y={base - v * unit - 3} mono size={7}>
            {String(v)}
          </T>
        </g>
      ))}
      <T x={160} y={170} size={9}>
        Area = width × the shorter wall; the taller wall cannot help
      </T>
    </>
  );
}

function BinarySearchHalving() {
  const nums = [3, 8, 12, 17, 23, 31, 38, 44, 52, 59, 66, 71, 78, 85, 93];
  const cx = (k: number) => 11 + k * 20;
  const checks = [
    { lo: 0, hi: 14, mid: 7, say: 'check 1: middle 44 < 66, so drop the left half', t: 0.05 },
    { lo: 8, hi: 14, mid: 11, say: 'check 2: middle 71 > 66, so drop the right half', t: 0.27 },
    { lo: 8, hi: 10, mid: 9, say: 'check 3: middle 59 < 66, so drop it and the left', t: 0.49 },
    { lo: 10, hi: 10, mid: 10, say: 'check 4: middle 66 is the target, found', t: 0.71 },
  ];
  const drops = [
    { from: 0, to: 7, t: 0.22 },
    { from: 11, to: 14, t: 0.44 },
    { from: 8, to: 9, t: 0.66 },
  ];
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Binary search for 66 in a sorted row of 15
      </T>
      {nums.map((n) => (
        <Chip key={n} x={cx(nums.indexOf(n))} y={30} w={18} h={24} label={String(n)} size={7.5} />
      ))}
      {drops.map((d) => (
        <Show key={d.t} from={d.t}>
          <rect
            x={cx(d.from) - 1}
            y={29}
            width={cx(d.to) - cx(d.from) + 20}
            height={26}
            rx={4}
            className="fill-surface"
            opacity={0.78}
          />
        </Show>
      ))}
      {checks.map((c, i) => {
        const last = i === checks.length - 1;
        return (
          <Show key={c.t} from={c.t} to={last ? undefined : c.t + 0.2} final={last}>
            <Box
              x={cx(c.lo) - 2}
              y={26}
              w={cx(c.hi) - cx(c.lo) + 22}
              h={32}
              r={6}
              tone="ring"
              width={1.5}
              dashed
            />
            <Box
              x={cx(c.mid)}
              y={30}
              w={18}
              h={24}
              r={4}
              tone={last ? 'ringOk' : 'ringBad'}
              width={2}
            />
            <Arrow
              x1={cx(c.mid) + 9}
              y1={80}
              x2={cx(c.mid) + 9}
              y2={62}
              tone={last ? 'ok' : 'brand'}
            />
            <T x={cx(c.mid) + 9} y={90} size={7.5} tone="brand">
              mid
            </T>
            <T x={160} y={116} size={8.5} tone={last ? 'ok' : 'ink'}>
              {c.say}
            </T>
          </Show>
        );
      })}
      <T x={160} y={144} mono size={8.5} tone="brand">
        {'mid = (lo + hi) // 2'}
      </T>
      <T x={160} y={164} size={9}>
        Each check halves the range: a million items need about 20
      </T>
    </>
  );
}

function FixedWindowSum() {
  const nums = [4, 2, 7, 1, 5, 3];
  const fx = (k: number) => 36 + k * 42;
  const at = (k: number) => 0.06 + k * 0.2;
  const steps = [
    { sum: '4 + 2 + 7 = 13', tone: 'ok' as const },
    { sum: '13 + 1 − 4 = 10', tone: 'ink' as const },
    { sum: '10 + 5 − 2 = 13', tone: 'ok' as const },
    { sum: '13 + 3 − 7 = 9', tone: 'ink' as const },
  ];
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        A window of 3 slides: add the new number, drop the oldest
      </T>
      {nums.map((n, k) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: numbers repeat and never reorder
        <Chip key={k} x={fx(k)} y={34} w={34} h={28} label={String(n)} size={12} />
      ))}
      <Move
        keys={steps.map((_, k) => [k === 0 ? 0 : at(k), [k * 42, 0]] as const)}
        at={[(steps.length - 1) * 42, 0]}
        discrete
      >
        <Box x={fx(0) - 4} y={29} w={42 * 2 + 42} h={38} r={8} tone="ring" width={2} />
      </Move>
      {steps.map((s, k) => {
        const last = k === steps.length - 1;
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: steps are positional
          <Show key={k} from={at(k)} to={last ? undefined : at(k + 1)} final={last}>
            <T x={160} y={96} mono size={10} tone={s.tone}>
              {s.sum}
            </T>
          </Show>
        );
      })}
      <Show from={0.12}>
        <Chip x={122} y={108} w={76} h={22} label="best = 13" size={9.5} tone="ok" text="ok" />
      </Show>
      <T x={160} y={150} size={9}>
        Two steps per move, however wide the window is
      </T>
    </>
  );
}

function SlidingWindowUnique() {
  const s = 'abcabcbb';
  const cx = (k: number) => 40 + k * 30;
  const wins = [
    { l: 0, r: 0, say: 'add "a": window "a"', t: 0.04 },
    { l: 0, r: 1, say: 'add "b": window "ab"', t: 0.14 },
    { l: 0, r: 2, say: 'add "c": window "abc", length 3, the best so far', t: 0.24 },
    { l: 1, r: 3, say: '"a" repeats: the left edge jumps past the old "a"', t: 0.38 },
    { l: 2, r: 4, say: '"b" repeats: the left edge moves again, "cab"', t: 0.52 },
    { l: 3, r: 5, say: '"c" repeats: window "abc", still length 3', t: 0.64 },
    { l: 5, r: 6, say: '"b" repeats: the window shrinks to "cb"', t: 0.76 },
    { l: 7, r: 7, say: '"b" again: the window is just "b"; the best stays 3', t: 0.88 },
  ];
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Longest substring without a repeated letter
      </T>
      {s.split('').map((ch, k) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: letters repeat and never reorder
        <g key={k}>
          <Chip x={cx(k)} y={32} w={26} h={28} label={ch} size={12} />
          <T x={cx(k) + 13} y={72} mono size={7}>
            {String(k)}
          </T>
        </g>
      ))}
      {wins.map((w, i) => {
        const last = i === wins.length - 1;
        return (
          <Show key={w.t} from={w.t} to={last ? undefined : wins[i + 1]?.t} final={last}>
            <Box
              x={cx(w.l) - 3}
              y={28}
              w={cx(w.r) - cx(w.l) + 32}
              h={36}
              r={8}
              tone={i === 2 ? 'ringOk' : 'ring'}
              width={2}
            />
            <T x={160} y={96} size={8.5} tone="ink">
              {w.say}
            </T>
          </Show>
        );
      })}
      <Show from={0.3}>
        <Chip x={124} y={108} w={72} h={22} label="best = 3" size={9.5} tone="ok" text="ok" />
      </Show>
      <T x={160} y={154} size={9}>
        Each letter enters and leaves the window once: O(n)
      </T>
    </>
  );
}

function BracketStack() {
  const input = ['(', '[', '{', '}', ']', ')'];
  const ix = (k: number) => 20 + k * 27;
  const level = (n: number) => 128 - n * 24;
  const items = [
    { ch: '(', n: 0, from: 0.08, to: 0.74 },
    { ch: '[', n: 1, from: 0.2, to: 0.6 },
    { ch: '{', n: 2, from: 0.32, to: 0.46 },
  ];
  const steps = [
    { k: 0, say: '"(" opens: push it', t: 0.05 },
    { k: 1, say: '"[" opens: push it', t: 0.17 },
    { k: 2, say: '"{" opens: push it', t: 0.29 },
    { k: 3, say: '"}" matches the top "{": pop', t: 0.43 },
    { k: 4, say: '"]" matches the top "[": pop', t: 0.57 },
    { k: 5, say: '")" matches the top "(": pop', t: 0.71 },
  ];
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Balanced brackets with a stack
      </T>
      {input.map((ch, k) => (
        <Chip key={ch} x={ix(k)} y={26} w={22} h={26} label={ch} size={12} />
      ))}
      {steps.map((s, i) => (
        <Show
          key={s.t}
          from={s.t}
          to={i === steps.length - 1 ? 0.84 : steps[i + 1]?.t}
          final={false}
        >
          <Box x={ix(s.k)} y={26} w={22} h={26} r={6} tone="ring" width={2} />
          <T x={20} y={84} anchor="start" size={8.5} tone="ink">
            {s.say}
          </T>
        </Show>
      ))}
      <Show from={0.84}>
        <T x={20} y={84} anchor="start" size={8.5} tone="ok">
          the stack is empty: balanced
        </T>
      </Show>
      <T x={258} y={26} size={8}>
        stack
      </T>
      <path d="M 222 36 V 154 H 294 V 36" fill="none" strokeWidth={1.5} className="stroke-line-2" />
      {items.map((it) => (
        <Show key={it.ch} from={it.from} to={it.to} final={false}>
          <Chip
            x={228}
            y={level(it.n)}
            w={60}
            h={22}
            label={it.ch}
            size={11}
            tone="brand"
            text="brand"
          />
        </Show>
      ))}
      <T x={20} y={112} anchor="start" mono size={8} tone="brand">
        open: push
      </T>
      <T x={20} y={128} anchor="start" mono size={8} tone="brand">
        close: must match the top, then pop
      </T>
      <T x={160} y={172} size={9}>
        Last opened, first closed: that is what a stack does
      </T>
    </>
  );
}

function RecursionCallStack() {
  // The stack grows upward: factorial(3) at the bottom, the base case on top.
  const frames = [
    {
      call: 'factorial(3)',
      wait: 'waits: 3 × factorial(2)',
      done: '3 × 2 = 6',
      y: 106,
      from: 0.05,
      back: 0.66,
    },
    {
      call: 'factorial(2)',
      wait: 'waits: 2 × factorial(1)',
      done: '2 × 1 = 2',
      y: 78,
      from: 0.19,
      back: 0.52,
    },
    {
      call: 'factorial(1)',
      wait: 'base case: return 1',
      done: 'return 1',
      y: 50,
      from: 0.33,
      back: 0.4,
    },
  ];
  const notes = [
    { say: 'Each call waits for a call on a smaller number', t: 0.05, to: 0.3 },
    { say: 'The base case stops the calls and returns 1', t: 0.34, to: 0.45 },
    { say: 'Each answer goes back to the call that waited for it', t: 0.49, to: 0.79 },
  ];
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        factorial(3): calls pile up, then answers come back
      </T>
      <T x={160} y={38} size={8}>
        the call stack
      </T>
      {frames.map((f, i) => (
        <g key={f.call}>
          <Show from={f.from} to={i === 0 ? 0.82 : f.back + 0.14} final={false}>
            <Box x={40} y={f.y} w={240} h={24} r={6} tone={i === 2 ? 'ok' : 'soft'} />
            <T x={50} y={f.y + 16} anchor="start" mono bold size={8.5} tone="ink">
              {f.call}
            </T>
          </Show>
          <Show from={f.from + 0.04} to={f.back} final={false}>
            <T x={270} y={f.y + 16} anchor="end" mono size={8} tone={i === 2 ? 'ok' : 'muted'}>
              {f.wait}
            </T>
          </Show>
          <Show from={f.back} to={i === 0 ? 0.82 : f.back + 0.14} final={false}>
            <T x={270} y={f.y + 16} anchor="end" mono size={8} tone="ok">
              {f.done}
            </T>
          </Show>
        </g>
      ))}
      {notes.map((n) => (
        <Show key={n.t} from={n.t} to={n.to} final={false}>
          <T x={160} y={150} size={8.5} tone="ink">
            {n.say}
          </T>
        </Show>
      ))}
      <Show from={0.82}>
        <Chip
          x={110}
          y={106}
          w={100}
          h={24}
          label="factorial(3) = 6"
          size={9}
          tone="ok"
          text="ok"
        />
        <T x={160} y={150} size={8.5} tone="ok">
          All calls have returned: the answer is 6
        </T>
      </Show>
      <T x={160} y={172} size={9}>
        Every call needs a base case and a smaller input
      </T>
    </>
  );
}

// ───────────── Machine learning fundamentals ─────────────

function AiMlDlCircles() {
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Each field sits inside the bigger one
      </T>
      <Show from={0.05}>
        <Box x={8} y={22} w={304} h={140} r={26} tone="soft" />
        <T x={22} y={40} anchor="start" bold size={9.5} tone="ink">
          Artificial intelligence
        </T>
        <T x={22} y={53} anchor="start" size={8}>
          Any system that acts smart, even with rules people write
        </T>
      </Show>
      <Show from={0.3}>
        <Box x={36} y={62} w={248} h={92} r={22} tone="brand" />
        <T x={50} y={79} anchor="start" bold size={9.5} tone="brand">
          Machine learning
        </T>
        <T x={50} y={92} anchor="start" size={8}>
          Learns the rules from data: spam filters
        </T>
      </Show>
      <Show from={0.55}>
        <Box x={66} y={102} w={188} h={44} r={16} tone="ok" />
        <T x={160} y={119} bold size={9.5} tone="ok">
          Deep learning
        </T>
        <T x={160} y={133} size={8}>
          Many-layer neural networks: face unlock
        </T>
      </Show>
    </>
  );
}

function RlLoop() {
  const cycles = [0.06, 0.34, 0.62];
  const scores = [
    { h: 16, label: '2', t: 0.28 },
    { h: 38, label: '5', t: 0.56 },
    { h: 68, label: '9', t: 0.84 },
  ];
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Act, get a reward, adjust, and try again
      </T>
      <Box x={20} y={28} w={100} h={40} r={8} tone="brand" />
      <T x={70} y={45} bold size={9.5} tone="brand">
        Agent
      </T>
      <T x={70} y={58} size={7.5}>
        the learner
      </T>
      <Box x={200} y={28} w={100} h={40} r={8} tone="soft" />
      <T x={250} y={45} bold size={9.5} tone="ink">
        Environment
      </T>
      <T x={250} y={58} size={7.5}>
        the game or the world
      </T>
      <Arrow x1={122} y1={38} x2={198} y2={38} tone="brand" />
      <T x={160} y={33} size={7.5} tone="brand">
        action
      </T>
      <Arrow x1={198} y1={60} x2={122} y2={60} tone="ok" />
      <T x={160} y={74} size={7.5} tone="ok">
        reward and new state
      </T>
      {cycles.map((t) => (
        <g key={t}>
          <Pulse a={[124, 38]} b={[196, 38]} t0={t} t1={t + 0.1} />
          <Pulse a={[196, 60]} b={[124, 60]} t0={t + 0.12} t1={t + 0.22} cls="fill-ok" />
        </g>
      ))}
      <path d="M 90 150 H 230" strokeWidth={1} className="stroke-line-2" />
      {scores.map((s, k) => (
        <Show key={s.label} from={s.t}>
          <Box x={104 + k * 44} y={150 - s.h} w={28} h={s.h} r={3} tone="ok" />
          <T x={118 + k * 44} y={146 - s.h} mono size={8} tone="ok">
            {s.label}
          </T>
          <T x={118 + k * 44} y={162} size={7}>
            {`episode ${k + 1}`}
          </T>
        </Show>
      ))}
      <T x={40} y={118} anchor="middle" size={8}>
        total
      </T>
      <T x={40} y={130} anchor="middle" size={8}>
        reward
      </T>
    </>
  );
}

function MlLifecycle() {
  const stages = [
    { label: 'Problem', x: 20, y: 30, say: 'Problem: predict delivery time in minutes' },
    { label: 'Data', x: 120, y: 30, say: 'Data: past orders, distance and traffic' },
    { label: 'Train', x: 220, y: 30, say: 'Train: fit a baseline, then better models' },
    { label: 'Evaluate', x: 220, y: 92, say: 'Evaluate: error on orders it has not seen' },
    { label: 'Deploy', x: 120, y: 92, say: 'Deploy: an API the app calls on each order' },
    { label: 'Monitor', x: 20, y: 92, say: 'Monitor: errors creep up in the rains, so retrain' },
  ];
  const at = (k: number) => 0.05 + k * 0.15;
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        The ML lifecycle is a loop, not a straight line
      </T>
      <Arrow x1={102} y1={43} x2={118} y2={43} />
      <Arrow x1={202} y1={43} x2={218} y2={43} />
      <Arrow x1={260} y1={58} x2={260} y2={90} />
      <Arrow x1={218} y1={105} x2={202} y2={105} />
      <Arrow x1={118} y1={105} x2={102} y2={105} />
      <Arrow x1={70} y1={90} x2={150} y2={60} tone="ok" />
      {stages.map((s, k) => (
        <g key={s.label}>
          <Chip x={s.x} y={s.y} w={82} h={26} label={s.label} size={9.5} />
          <Show
            from={at(k)}
            to={k === stages.length - 1 ? undefined : at(k + 1)}
            final={k === stages.length - 1}
          >
            <Box x={s.x} y={s.y} w={82} h={26} r={6} tone={k === 5 ? 'ringOk' : 'ring'} width={2} />
            <T x={160} y={142} size={8.5} tone="ink">
              {s.say}
            </T>
          </Show>
        </g>
      ))}
      <T x={160} y={164} size={9}>
        Monitoring sends you back to the data
      </T>
    </>
  );
}

function BiasVarianceDarts() {
  const boards = [
    {
      cx: 58,
      title: 'High bias',
      sub: 'tight, but off target',
      darts: [
        [12, 10],
        [15, 13],
        [13, 16],
        [17, 11],
        [14, 8],
      ],
      tone: 'fill-bad',
    },
    {
      cx: 160,
      title: 'High variance',
      sub: 'all over the board',
      darts: [
        [-18, 4],
        [12, -16],
        [6, 18],
        [-12, -12],
        [20, 6],
      ],
      tone: 'fill-warn',
    },
    {
      cx: 262,
      title: 'A good model',
      sub: 'tight and on target',
      darts: [
        [1, -2],
        [-2, 1],
        [2, 2],
        [-1, -1],
        [0, 1],
      ],
      tone: 'fill-ok',
    },
  ];
  const cy = 64;
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Bias is the aim; variance is the spread
      </T>
      {boards.map((b, i) => (
        <g key={b.title}>
          {[30, 20, 10].map((r) => (
            <circle
              key={r}
              cx={b.cx}
              cy={cy}
              r={r}
              fill="none"
              strokeWidth={1}
              className="stroke-line-2"
            />
          ))}
          <circle cx={b.cx} cy={cy} r={3} className="fill-ink" />
          {b.darts.map(([dx, dy], k) => (
            <Show key={`${dx},${dy}`} from={0.06 + i * 0.25 + k * 0.035}>
              <circle cx={b.cx + (dx ?? 0)} cy={cy + (dy ?? 0)} r={3.2} className={b.tone} />
            </Show>
          ))}
          <T x={b.cx} y={112} bold size={9} tone="ink">
            {b.title}
          </T>
          <T x={b.cx} y={125} size={8}>
            {b.sub}
          </T>
        </g>
      ))}
      <T x={160} y={150} size={9}>
        Simple models lean to bias; very flexible ones to variance
      </T>
    </>
  );
}

function KfoldRotation() {
  const scores = ['0.82', '0.79', '0.85', '0.80', '0.84'];
  const bx = (j: number) => 62 + j * 42;
  const ry = (k: number) => 24 + k * 21;
  const at = (k: number) => 0.05 + k * 0.15;
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        5-fold cross-validation: every fold validates once
      </T>
      {scores.map((s, k) => (
        <Show key={s} from={at(k)}>
          <T x={14} y={ry(k) + 12} anchor="start" size={7.5}>
            {`round ${k + 1}`}
          </T>
          {scores.map((_, j) => (
            <Box
              // biome-ignore lint/suspicious/noArrayIndexKey: folds are positional
              key={j}
              x={bx(j)}
              y={ry(k)}
              w={38}
              h={16}
              r={4}
              tone={j === k ? 'brand' : 'soft'}
            />
          ))}
          <T x={bx(k) + 19} y={ry(k) + 11.5} size={7} tone="brand">
            validate
          </T>
          <T x={290} y={ry(k) + 12} mono size={8.5} tone="ink">
            {s}
          </T>
        </Show>
      ))}
      <Show from={0.82}>
        <T x={160} y={142} mono size={9} tone="ok">
          mean 0.82, spread about ± 0.02
        </T>
      </Show>
      <T x={160} y={162} size={9}>
        Train on four folds, validate on the fifth, five times
      </T>
    </>
  );
}

function L1L2Shrink() {
  const start = [3.0, -2.0, 0.6, -0.4, 0.3];
  const ridge = start.map((w) => w * 0.7);
  const lasso = start.map((w) => Math.sign(w) * Math.max(0, Math.abs(w) - 0.5));
  const zero = 82;
  const unit = 13;
  const panels = [
    { x: 14, title: 'L2 (Ridge)', after: ridge, note: 'all shrink a little' },
    { x: 170, title: 'L1 (Lasso)', after: lasso, note: 'small ones become 0' },
  ];
  const bar = (w: number) => ({ y: w >= 0 ? zero - w * unit : zero, h: Math.abs(w) * unit });
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        The same weights under two penalties
      </T>
      {panels.map((p) => (
        <g key={p.title}>
          <T x={p.x + 68} y={30} bold size={9} tone="ink">
            {p.title}
          </T>
          <path d={`M ${p.x} ${zero} H ${p.x + 136}`} strokeWidth={1} className="stroke-line-2" />
          {start.map((w, k) => {
            const from = bar(w);
            const to = bar(p.after[k] ?? 0);
            const x = p.x + 8 + k * 26;
            const gone = (p.after[k] ?? 0) === 0;
            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: weights are positional
              <g key={k}>
                <rect
                  x={x}
                  y={to.y}
                  width={18}
                  height={to.h}
                  rx={2}
                  className={w >= 0 ? 'fill-brand' : 'fill-warn'}
                >
                  <Anim
                    attr="y"
                    keys={[
                      [0, from.y],
                      [0.3, from.y],
                      [0.6, to.y],
                    ]}
                  />
                  <Anim
                    attr="height"
                    keys={[
                      [0, from.h],
                      [0.3, from.h],
                      [0.6, to.h],
                    ]}
                  />
                </rect>
                {gone && (
                  <Show from={0.62}>
                    <T x={x + 9} y={zero - 4} mono bold size={8} tone="bad">
                      0
                    </T>
                  </Show>
                )}
                <T x={x + 9} y={128} mono size={7}>
                  {`f${k + 1}`}
                </T>
              </g>
            );
          })}
          <Show from={0.62}>
            <T x={p.x + 68} y={144} size={8} tone="ink">
              {p.note}
            </T>
          </Show>
        </g>
      ))}
      <T x={160} y={164} size={9}>
        L1 also picks features: their weights drop to zero
      </T>
    </>
  );
}

// ───────────── Data preparation ─────────────

/** Stack levels for dots on a number line, so close values sit on top of each other. */
function dotLevels(xs: readonly number[], gap = 6): number[] {
  const placed: Array<[number, number]> = [];
  return xs.map((x) => {
    let level = 0;
    while (placed.some(([px, l]) => l === level && Math.abs(px - x) < gap)) level++;
    placed.push([x, level]);
    return level;
  });
}

function MissingFill() {
  const rows: Array<number | null> = [30, 32, null, 35, 250, null];
  const y = (i: number) => 34 + i * 20;
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Two salaries are missing: fill with the mean or the median?
      </T>
      <T x={56} y={29} size={8}>
        salary (thousands)
      </T>
      {rows.map((v, i) =>
        v === null ? (
          <g key={`gap${y(i)}`}>
            <Show to={0.3} final={false}>
              <Chip x={20} y={y(i)} w={72} h={17} label="?" tone="warn" text="warn" />
            </Show>
            <Show from={0.3} to={0.6} final={false}>
              <Chip x={20} y={y(i)} w={72} h={17} label="86.8" tone="bad" text="bad" />
            </Show>
            <Show from={0.62}>
              <Chip x={20} y={y(i)} w={72} h={17} label="33.5" tone="ok" text="ok" />
            </Show>
          </g>
        ) : (
          <Chip key={`v${y(i)}`} x={20} y={y(i)} w={72} h={17} label={String(v)} />
        ),
      )}
      <Show from={0.3} to={0.6} final={false}>
        <Box x={17} y={y(4) - 3} w={78} h={23} r={7} tone="ringBad" width={1.75} />
      </Show>
      <Show to={0.3} final={false}>
        <T x={118} y={66} anchor="start" size={9} tone="ink">
          Rows 3 and 6 are empty.
        </T>
        <T x={118} y={82} anchor="start" size={9}>
          Most models cannot train on a gap.
        </T>
      </Show>
      <Show from={0.3} to={0.6} final={false}>
        <T x={118} y={58} anchor="start" size={9} tone="ink" mono>
          mean = (30 + 32 + 35 + 250) ÷ 4
        </T>
        <T x={118} y={74} anchor="start" size={9} tone="bad" mono bold>
          = 86.8
        </T>
        <T x={118} y={96} anchor="start" size={9} tone="bad">
          One 250 pulls it far above
        </T>
        <T x={118} y={110} anchor="start" size={9} tone="bad">
          every typical salary
        </T>
      </Show>
      <Show from={0.62}>
        <T x={118} y={58} anchor="start" size={9} tone="ink" mono>
          median of 30, 32, 35, 250
        </T>
        <T x={118} y={74} anchor="start" size={9} tone="ok" mono bold>
          = 33.5, the middle
        </T>
        <T x={118} y={96} anchor="start" size={9} tone="ok">
          A typical salary: the 250
        </T>
        <T x={118} y={110} anchor="start" size={9} tone="ok">
          barely moves it
        </T>
      </Show>
      <T x={160} y={162} size={9}>
        Skewed data or outliers: the median is the safer fill
      </T>
    </>
  );
}

function IqrFences() {
  const vals = [22, 24, 25, 27, 28, 29, 30, 30, 31, 32, 33, 34, 35, 36, 38, 40, 42, 44, 95, 160];
  // A broken axis: 10 to 60 minutes wide on the left, 90 to 165 squeezed on the right.
  const sx = (v: number) => (v <= 60 ? 24 + (v - 10) * 4.2 : 254 + (v - 90) * 0.62);
  const xs = vals.map(sx);
  const lv = dotLevels(xs, 6);
  const base = 118;
  const [q1, q3, lo, hi] = [28.75, 38.5, 14.125, 53.125];
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        The IQR rule: fences 1.5 × IQR outside the box
      </T>
      <line x1={24} x2={236} y1={126} y2={126} className="stroke-line-2" />
      <line x1={252} x2={302} y1={126} y2={126} className="stroke-line-2" />
      <T x={244} y={129} size={9}>
        {'//'}
      </T>
      {[10, 20, 30, 40, 50, 60, 100, 160].map((t) => (
        <T key={t} x={sx(t)} y={138} size={7.5} mono>
          {String(t)}
        </T>
      ))}
      <Show from={0.04}>
        {vals.map((_, i) => (
          <circle
            // biome-ignore lint/suspicious/noArrayIndexKey: values repeat and never reorder
            key={i}
            cx={xs[i]}
            cy={base - (lv[i] ?? 0) * 6}
            r={2.6}
            className="fill-g0"
          />
        ))}
      </Show>
      <Show from={0.22}>
        <Box x={sx(q1)} y={46} w={sx(q3) - sx(q1)} h={22} r={3} tone="brand" />
        <line x1={sx(32.5)} x2={sx(32.5)} y1={46} y2={68} strokeWidth={2} className="stroke-g2" />
        <T x={sx(q1) - 3} y={42} anchor="end" size={8} mono tone="ink">
          Q1 28.75
        </T>
        <T x={sx(q3) + 3} y={42} anchor="start" size={8} mono tone="ink">
          Q3 38.5
        </T>
      </Show>
      <Show from={0.38}>
        <path
          d={`M ${sx(q1)} 72 V 77 H ${sx(q3)} V 72`}
          fill="none"
          strokeWidth={1.25}
          className="stroke-brand"
        />
        <T x={(sx(q1) + sx(q3)) / 2} y={88} size={8} mono tone="brand">
          IQR = 9.75
        </T>
      </Show>
      <Show from={0.55}>
        {[lo, hi].map((f) => (
          <line
            key={f}
            x1={sx(f)}
            x2={sx(f)}
            y1={30}
            y2={126}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            className="stroke-bad"
          />
        ))}
        <T x={sx(lo) + 3} y={30} anchor="start" size={7.5} mono tone="bad">
          Q1 − 1.5 × IQR = 14.1
        </T>
        <T x={sx(hi) + 3} y={30} anchor="start" size={7.5} mono tone="bad">
          Q3 + 1.5 × IQR = 53.1
        </T>
      </Show>
      <Show from={0.72}>
        {[18, 19].map((i) => (
          <circle key={i} cx={xs[i]} cy={base} r={3.4} className="fill-bad" />
        ))}
        <T x={278} y={104} size={8.5} tone="bad" bold>
          outliers
        </T>
      </Show>
      <T x={160} y={160} size={9}>
        Check each one: fix a typo, cap it, or keep a real extreme
      </T>
    </>
  );
}

function DedupeRows() {
  const rows = [
    ['101', 'Pune', '450'],
    ['102', 'Delhi', '300'],
    ['101', 'Pune', '450'],
    ['103', 'Chennai', '520'],
    ['102', 'Delhi', '310'],
  ];
  const cols = [
    { x: 30, w: 64, head: 'order_id' },
    { x: 98, w: 78, head: 'city' },
    { x: 180, w: 60, head: 'amount' },
  ];
  const y = (i: number) => 36 + i * 21;
  const fadeAt: Record<number, number> = { 2: 0.38, 4: 0.74 };
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Remove repeated rows, then repeated keys
      </T>
      {cols.map((c) => (
        <T key={c.head} x={c.x + c.w / 2} y={30} size={8} mono bold>
          {c.head}
        </T>
      ))}
      {rows.map((r, i) => {
        const t = fadeAt[i];
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: rows repeat on purpose
          <g key={i} opacity={t ? 0.3 : 1}>
            {t && (
              <Anim
                attr="opacity"
                keys={[
                  [0, 1],
                  [t, 1],
                  [t + 0.04, 0.3],
                ]}
              />
            )}
            {cols.map((c, j) => (
              <Chip key={c.head} x={c.x} y={y(i)} w={c.w} h={17} label={r[j] ?? ''} size={9.5} />
            ))}
          </g>
        );
      })}
      {[2, 4].map((i) => (
        <Show key={i} from={(fadeAt[i] ?? 0) + 0.02}>
          <line
            x1={26}
            x2={244}
            y1={y(i) + 8.5}
            y2={y(i) + 8.5}
            strokeWidth={1.5}
            className="stroke-bad"
          />
        </Show>
      ))}
      <Show from={0.12} to={0.4} final={false}>
        <Box x={26} y={y(2) - 3} w={218} h={23} r={6} tone="ringBad" width={1.75} />
        <T x={250} y={y(2) + 12} anchor="start" size={8} tone="bad">
          exact repeat
        </T>
      </Show>
      <Show from={0.5} to={0.76} final={false}>
        <Box x={26} y={y(1) - 3} w={72} h={23} r={6} tone="ring" width={1.75} />
        <Box x={26} y={y(4) - 3} w={218} h={23} r={6} tone="ringBad" width={1.75} />
        <T x={250} y={y(4) + 12} anchor="start" size={8} tone="bad">
          same order_id
        </T>
      </Show>
      <Show from={0.38} to={0.74} final={false}>
        <Chip x={70} y={148} w={180} h={20} label="df.drop_duplicates()" size={9} tone="brand" />
      </Show>
      <Show from={0.74}>
        <Chip
          x={30}
          y={148}
          w={260}
          h={20}
          label='df.drop_duplicates(subset="order_id")'
          size={9}
          tone="brand"
        />
        <T x={160} y={180} size={9} tone="ok">
          5 rows become 3; the first row of each order is kept
        </T>
      </Show>
    </>
  );
}

function OneHotVsLabel() {
  const cities = ['Delhi', 'Mumbai', 'Chennai', 'Delhi'];
  const code: Record<string, number> = { Chennai: 0, Delhi: 1, Mumbai: 2 };
  const hot = ['Chennai', 'Delhi', 'Mumbai'];
  const y = (i: number) => 46 + i * 20;
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Encoding a city column: labels or one-hot
      </T>
      <T x={44} y={40} size={8} mono bold>
        city
      </T>
      {cities.map((c, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: cities repeat on purpose
        <Chip key={i} x={14} y={y(i)} w={60} h={17} label={c} size={9} />
      ))}
      <Show from={0.12}>
        <T x={104} y={28} size={8} tone="brand" bold>
          label encoding
        </T>
        <T x={104} y={40} size={8} mono bold>
          label
        </T>
        {cities.map((c, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: cities repeat on purpose
          <Chip key={i} x={84} y={y(i)} w={40} h={17} label={String(code[c])} size={9.5} />
        ))}
      </Show>
      <Show from={0.3}>
        <line x1={20} x2={128} y1={140} y2={140} className="stroke-line-2" />
        {hot.map((c, k) => (
          <g key={c}>
            <circle cx={24 + k * 50} cy={140} r={3} className="fill-bad" />
            <T x={24 + k * 50} y={134} size={8} mono tone="ink">
              {String(k)}
            </T>
            <T x={24 + k * 50} y={152} size={7.5}>
              {c}
            </T>
          </g>
        ))}
        <T x={74} y={168} size={8.5} tone="bad">
          Mumbai {'>'} Delhi? A false order
        </T>
      </Show>
      <Show from={0.55}>
        <T x={224} y={28} size={8} tone="brand" bold>
          one-hot encoding
        </T>
        {hot.map((h, k) => (
          <T key={h} x={172 + k * 48} y={40} size={7.5} mono bold>
            {h}
          </T>
        ))}
        {cities.map((c, i) =>
          hot.map((h, k) => (
            <Chip
              // biome-ignore lint/suspicious/noArrayIndexKey: cities repeat on purpose
              key={`${i}${h}`}
              x={152 + k * 48}
              y={y(i)}
              w={40}
              h={17}
              label={c === h ? '1' : '0'}
              size={9.5}
              tone={c === h ? 'brand' : 'plain'}
            />
          )),
        )}
        <T x={224} y={140} size={8.5} tone="ok">
          One column per city, no order
        </T>
        <T x={224} y={156} size={8} mono>
          pd.get_dummies(df, columns=["city"])
        </T>
      </Show>
    </>
  );
}

function ScalingSquash() {
  const X0 = 30;
  const X1 = 296;
  const SPAN = X1 - X0;
  const raw = (v: number) => X0 + (v / 100000) * SPAN;
  const bars = [
    {
      label: 'Age: 22 to 58',
      y: 40,
      lo: 22,
      hi: 58,
      dot: 26,
      scaled: (26 - 22) / 36,
      say: '26 → 0.11',
    },
    {
      label: 'Monthly income: 30,000 to 95,000',
      y: 82,
      lo: 30000,
      hi: 95000,
      dot: 52000,
      scaled: (52000 - 30000) / 65000,
      say: '52,000 → 0.34',
    },
  ];
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Min-max scaling puts every feature on 0 to 1
      </T>
      {bars.map((b) => {
        const rx = raw(b.lo);
        const rw = Math.max(2, raw(b.hi) - raw(b.lo));
        return (
          <g key={b.label}>
            <T x={X0} y={b.y - 5} anchor="start" size={8.5} tone="ink">
              {b.label}
            </T>
            <rect
              x={X0}
              y={b.y}
              width={SPAN}
              height={13}
              rx={3}
              strokeWidth={1}
              className="fill-brand-soft stroke-brand"
            >
              <Anim
                attr="x"
                keys={[
                  [0, rx],
                  [0.35, rx],
                  [0.55, X0],
                ]}
              />
              <Anim
                attr="width"
                keys={[
                  [0, rw],
                  [0.35, rw],
                  [0.55, SPAN],
                ]}
              />
            </rect>
            <Show from={0.65}>
              <circle cx={X0 + b.scaled * SPAN} cy={b.y + 6.5} r={4} className="fill-ink" />
              <T x={X0 + b.scaled * SPAN + 8} y={b.y + 10} anchor="start" size={8} mono tone="ink">
                {b.say}
              </T>
            </Show>
          </g>
        );
      })}
      <Show from={0.08} to={0.35} final={false}>
        <T x={40} y={68} anchor="start" size={8.5} tone="bad">
          ← the age range is a sliver next to income
        </T>
      </Show>
      <line x1={X0} x2={X1} y1={112} y2={112} className="stroke-line-2" />
      <Show to={0.35} final={false}>
        {[0, 50000, 100000].map((t) => (
          <T key={t} x={raw(t)} y={124} size={8} mono>
            {t.toLocaleString('en-IN')}
          </T>
        ))}
      </Show>
      <Show from={0.37}>
        {[0, 0.5, 1].map((t) => (
          <T key={t} x={X0 + t * SPAN} y={124} size={8} mono>
            {String(t)}
          </T>
        ))}
        <T x={160} y={142} size={9} mono tone="ink">
          x′ = (x − min) / (max − min)
        </T>
      </Show>
      <T x={160} y={162} size={9}>
        Now age and income count fairly in a distance
      </T>
    </>
  );
}

function FitOnTrain() {
  const panel = (y0: number, wrong: boolean) => (
    <>
      <Box x={16} y={y0} w={70} h={20} r={5} tone="brand" />
      <T x={51} y={y0 + 13.5} size={8.5} tone="ink">
        train rows
      </T>
      <Box x={16} y={y0 + 25} w={70} h={17} r={5} tone="warn" />
      <T x={51} y={y0 + 36.5} size={8.5} tone="ink">
        test rows
      </T>
      <Chip
        x={130}
        y={y0 + 10}
        w={84}
        h={22}
        label="fit: mean, std"
        size={9}
        tone={wrong ? 'bad' : 'ok'}
        text={wrong ? 'bad' : 'ok'}
      />
      <Arrow x1={88} y1={y0 + 10} x2={128} y2={y0 + 18} tone="brand" />
    </>
  );
  return (
    <>
      <T x={16} y={24} anchor="start" size={9} tone="bad" bold>
        Wrong: fit the scaler on all the rows
      </T>
      {panel(32, true)}
      <Show from={0.18}>
        <Arrow x1={88} y1={66} x2={128} y2={56} tone="bad" />
        <T x={222} y={50} anchor="start" size={8.5} tone="bad">
          test rows leak
        </T>
        <T x={222} y={62} anchor="start" size={8.5} tone="bad">
          into the mean
        </T>
      </Show>
      <Show from={0.45}>
        <T x={16} y={100} anchor="start" size={9} tone="ok" bold>
          Right: split first, fit on the training rows only
        </T>
        {panel(108, false)}
      </Show>
      <Show from={0.62}>
        <Arrow x1={216} y1={124} x2={244} y2={114} tone="ok" />
        <Arrow x1={216} y1={124} x2={244} y2={140} tone="ok" />
        <Chip x={246} y={104} w={66} h={18} label="transform" size={8.5} tone="ok" text="ok" />
        <Chip x={246} y={132} w={66} h={18} label="transform" size={8.5} tone="ok" text="ok" />
        <T x={279} y={160} size={7.5}>
          both use train stats
        </T>
      </Show>
      <Show from={0.8}>
        <T x={160} y={176} size={9}>
          A pipeline repeats this inside every cross-validation fold
        </T>
      </Show>
    </>
  );
}

function LocVsIloc() {
  const labels = [10, 20, 30, 40];
  const names = ['Asha', 'Ravi', 'Meera', 'Kiran'];
  const y = (i: number) => 40 + i * 22;
  const steps = [
    { code: 'df.loc[20]', rows: [1], note: 'the row labelled 20', from: 0.04, to: 0.27 },
    { code: 'df.iloc[2]', rows: [2], note: 'position 2: the third row', from: 0.27, to: 0.5 },
    {
      code: 'df.loc[10:30]',
      rows: [0, 1, 2],
      note: 'labels 10 to 30: end included',
      from: 0.5,
      to: 0.74,
    },
    { code: 'df.iloc[0:2]', rows: [0, 1], note: 'positions 0, 1: end excluded', from: 0.74, to: 1 },
  ];
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        loc uses row labels; iloc uses positions
      </T>
      <T x={24} y={32} size={7.5}>
        position
      </T>
      <T x={63} y={32} size={8} mono bold>
        label
      </T>
      <T x={119} y={32} size={8} mono bold>
        name
      </T>
      {labels.map((l, i) => (
        <g key={l}>
          <T x={24} y={y(i) + 12} size={9} mono>
            {String(i)}
          </T>
          <Chip x={46} y={y(i)} w={34} h={17} label={String(l)} size={9.5} tone="soft" />
          <Chip x={84} y={y(i)} w={70} h={17} label={names[i] ?? ''} size={9.5} />
        </g>
      ))}
      {steps.map((s, k) => {
        const last = k === steps.length - 1;
        const first = s.rows[0] ?? 0;
        return (
          <Show key={s.code} from={s.from} to={last ? undefined : s.to} final={last}>
            <Box
              x={42}
              y={y(first) - 3}
              w={116}
              h={s.rows.length * 22 + 1}
              r={6}
              tone={s.code.includes('iloc') ? 'ringBad' : 'ring'}
              width={2}
            />
            <Chip
              x={176}
              y={56}
              w={132}
              h={22}
              label={s.code}
              size={10}
              tone={s.code.includes('iloc') ? 'warn' : 'brand'}
            />
            <T x={242} y={98} size={8.5} tone="ink">
              {s.note}
            </T>
          </Show>
        );
      })}
      <T x={160} y={150} size={9}>
        loc slices include the end label; iloc slices stop before the end
      </T>
    </>
  );
}

function GroupbySplitApply() {
  const rows = [
    ['A', '450'],
    ['B', '300'],
    ['A', '300'],
    ['C', '520'],
  ] as const;
  const tone = { A: 'brand', B: 'warn', C: 'ok' } as const;
  const y = (i: number) => 36 + i * 22;
  const target = [36, 84, 56, 112];
  const groups = [
    { key: 'A' as const, y: 46, sum: '750' },
    { key: 'B' as const, y: 84, sum: '300' },
    { key: 'C' as const, y: 112, sum: '520' },
  ];
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        groupby: split, apply, combine
      </T>
      <T x={44} y={28} size={8} tone="ink">
        orders
      </T>
      <T x={150} y={28} size={8} tone="ink">
        split
      </T>
      <T x={216} y={28} size={8} tone="ink">
        apply: sum
      </T>
      <T x={282} y={28} size={8} tone="ink">
        combine
      </T>
      {rows.map(([c, a], i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: rows repeat on purpose
        <g key={i}>
          <Chip x={12} y={y(i)} w={22} h={18} label={c} size={9.5} tone={tone[c]} />
          <Chip x={36} y={y(i)} w={42} h={18} label={a} size={9.5} />
        </g>
      ))}
      {rows.map(([c, a], i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: rows repeat on purpose
        <Show key={i} from={0.2}>
          <Move
            keys={[
              [0, [0, 0]],
              [0.22, [0, 0]],
              [0.4, [116, (target[i] ?? 0) - y(i)]],
            ]}
            at={[116, (target[i] ?? 0) - y(i)]}
          >
            <Chip x={12} y={y(i)} w={22} h={18} label={c} size={9.5} tone={tone[c]} />
            <Chip x={36} y={y(i)} w={42} h={18} label={a} size={9.5} />
          </Move>
        </Show>
      ))}
      <Show from={0.52}>
        {groups.map((g) => (
          <g key={g.key}>
            <Arrow x1={196} y1={g.y + 9} x2={206} y2={g.y + 9} />
            <Chip x={208} y={g.y} w={40} h={18} label={g.sum} size={9.5} tone={tone[g.key]} />
          </g>
        ))}
      </Show>
      <Show from={0.72}>
        <Box x={258} y={44} w={54} h={70} r={8} tone="soft" />
        {groups.map((g, k) => (
          <g key={g.key}>
            <T x={272} y={60 + k * 20} size={9.5} mono bold tone="ink">
              {g.key}
            </T>
            <T x={298} y={60 + k * 20} size={9.5} mono tone="ink">
              {g.sum}
            </T>
          </g>
        ))}
        <T x={160} y={152} size={9} mono tone="ink">
          df.groupby("customer")["amount"].sum()
        </T>
      </Show>
      <T x={160} y={170} size={9}>
        One answer per customer: the total they spent
      </T>
    </>
  );
}

function MergeJoins() {
  const customers = [
    ['1', 'Asha'],
    ['2', 'Ravi'],
    ['3', 'Meera'],
  ];
  const orders = [
    ['1', '450'],
    ['1', '300'],
    ['2', '520'],
    ['4', '200'],
  ];
  const result = [
    { r: ['1', 'Asha', '450'], from: 0.06 },
    { r: ['1', 'Asha', '300'], from: 0.06 },
    { r: ['2', 'Ravi', '520'], from: 0.06 },
    { r: ['3', 'Meera', 'NaN'], from: 0.38 },
    { r: ['4', 'NaN', '200'], from: 0.7 },
  ];
  const how = [
    { label: 'how="inner": 3 rows, matches only', from: 0.06, to: 0.38 },
    { label: 'how="left": 4 rows, every customer', from: 0.38, to: 0.7 },
    { label: 'how="outer": 5 rows, everything', from: 0.7, to: 1 },
  ];
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        merge on customer_id: inner, left, outer
      </T>
      <T x={48} y={28} size={8} tone="ink">
        customers
      </T>
      {customers.map(([id, n]) => (
        <g key={id}>
          <Chip
            x={12}
            y={33 + Number(id) * 17 - 17}
            w={22}
            h={15}
            label={id ?? ''}
            size={9}
            tone="soft"
          />
          <Chip x={36} y={33 + Number(id) * 17 - 17} w={48} h={15} label={n ?? ''} size={9} />
        </g>
      ))}
      <T x={48} y={96} size={8} tone="ink">
        orders
      </T>
      {orders.map(([id, a], i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: customer ids repeat on purpose
        <g key={i}>
          <Chip x={12} y={101 + i * 17} w={22} h={15} label={id ?? ''} size={9} tone="soft" />
          <Chip x={36} y={101 + i * 17} w={48} h={15} label={a ?? ''} size={9} />
        </g>
      ))}
      <T x={146} y={28} size={7.5} mono bold>
        id
      </T>
      <T x={192} y={28} size={7.5} mono bold>
        name
      </T>
      <T x={252} y={28} size={7.5} mono bold>
        amount
      </T>
      {result.map(({ r, from }, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: result rows are positional
        <Show key={i} from={from}>
          {[
            { x: 134, w: 24 },
            { x: 162, w: 60 },
            { x: 226, w: 52 },
          ].map((c, j) => (
            <Chip
              key={c.x}
              x={c.x}
              y={33 + i * 19}
              w={c.w}
              h={16}
              label={r[j] ?? ''}
              size={9}
              tone={r[j] === 'NaN' ? 'soft' : 'plain'}
              text={r[j] === 'NaN' ? 'muted' : 'ink'}
            />
          ))}
        </Show>
      ))}
      {how.map((h, k) => {
        const last = k === how.length - 1;
        return (
          <Show key={h.label} from={h.from} to={last ? undefined : h.to} final={last}>
            <T x={210} y={146} size={8.5} mono tone="brand" bold>
              {h.label}
            </T>
          </Show>
        );
      })}
      <T x={210} y={164} size={8}>
        NaN marks a value with no match
      </T>
    </>
  );
}

// ───────────── Statistics ─────────────

function SameMeanSpread() {
  const A = [28, 29, 30, 30, 31, 32];
  const B = [10, 18, 25, 35, 42, 50];
  const sx = (v: number) => 30 + v * 4.5;
  const rows = [
    { name: 'App A: 28 to 32 minutes', vals: A, y: 62, sd: 1.41, from: 0.05, sdText: 'std 1.4' },
    { name: 'App B: 10 to 50 minutes', vals: B, y: 116, sd: 15.09, from: 0.2, sdText: 'std 15.1' },
  ];
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Same average, very different spread
      </T>
      {rows.map((r) => {
        const xs = r.vals.map(sx);
        const lv = dotLevels(xs, 6);
        return (
          <Show key={r.name} from={r.from}>
            <T x={30} y={r.y - 22} anchor="start" size={8.5} tone="ink">
              {r.name}
            </T>
            <Show from={0.6}>
              <rect
                x={sx(30 - r.sd)}
                y={r.y - 10}
                width={sx(30 + r.sd) - sx(30 - r.sd)}
                height={18}
                rx={3}
                strokeWidth={1}
                className="fill-brand/15 stroke-brand"
              />
              <T x={300} y={r.y - 22} anchor="end" size={8.5} mono bold tone="brand">
                {r.sdText}
              </T>
            </Show>
            {r.vals.map((_, i) => (
              <circle
                // biome-ignore lint/suspicious/noArrayIndexKey: values repeat
                key={i}
                cx={xs[i]}
                cy={r.y - (lv[i] ?? 0) * 6}
                r={2.8}
                className="fill-g0"
              />
            ))}
          </Show>
        );
      })}
      <Show from={0.4}>
        <line
          x1={sx(30)}
          x2={sx(30)}
          y1={40}
          y2={128}
          strokeDasharray="4 3"
          strokeWidth={1.5}
          className="stroke-g1"
        />
        <T x={sx(30) + 4} y={36} anchor="start" size={8.5} tone="g1" bold>
          mean 30 for both
        </T>
      </Show>
      <line x1={30} x2={300} y1={132} y2={132} className="stroke-line-2" />
      {[0, 10, 20, 30, 40, 50, 60].map((t) => (
        <T key={t} x={sx(t)} y={144} size={7.5} mono>
          {String(t)}
        </T>
      ))}
      <T x={160} y={164} size={9}>
        Report the spread, not just the average
      </T>
    </>
  );
}

function MeanMedianSkew() {
  const s = [28, 32, 35, 30, 41, 33, 250, 29, 36];
  const sx = (v: number) => 24 + (v - 20) * (276 / 240);
  const xs = s.map(sx);
  const lv = dotLevels(xs, 7);
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        One very large value pulls the mean, not the median
      </T>
      <Show from={0.05}>
        {s.map((v, i) => (
          <circle
            key={v}
            cx={xs[i]}
            cy={108 - (lv[i] ?? 0) * 7}
            r={3.2}
            className={v === 250 ? 'fill-bad' : 'fill-g0'}
          />
        ))}
      </Show>
      <Show from={0.3}>
        <line x1={sx(33)} x2={sx(33)} y1={34} y2={114} strokeWidth={2} className="stroke-g2" />
        <T x={sx(33) + 4} y={40} anchor="start" size={8.5} tone="g2" bold>
          median 33
        </T>
      </Show>
      <Show from={0.5}>
        <line
          x1={sx(57.1)}
          x2={sx(57.1)}
          y1={50}
          y2={114}
          strokeWidth={2}
          strokeDasharray="4 3"
          className="stroke-g1"
        >
          <Anim
            attr="x1"
            keys={[
              [0, sx(33)],
              [0.5, sx(33)],
              [0.66, sx(57.1)],
            ]}
          />
          <Anim
            attr="x2"
            keys={[
              [0, sx(33)],
              [0.5, sx(33)],
              [0.66, sx(57.1)],
            ]}
          />
        </line>
      </Show>
      <Show from={0.66}>
        <T x={sx(57.1) + 4} y={56} anchor="start" size={8.5} tone="g1" bold>
          mean 57.1
        </T>
        <T x={300} y={90} anchor="end" size={8} tone="bad">
          one salary of 250
        </T>
      </Show>
      <line x1={24} x2={300} y1={118} y2={118} className="stroke-line-2" />
      {[50, 100, 150, 200, 250].map((t) => (
        <T key={t} x={sx(t)} y={130} size={7.5} mono>
          {String(t)}
        </T>
      ))}
      <T x={160} y={144} size={8}>
        monthly salary (thousands)
      </T>
      <T x={160} y={162} size={9}>
        With skew or outliers, the median shows the typical value
      </T>
    </>
  );
}

function Normal689599() {
  const sx = (v: number) => 20 + (v - 30) * 3.5;
  const base = 126;
  const f = (v: number) => base - 92 * Math.exp(-((v - 70) ** 2) / 200);
  const line = (a: number, b: number) => {
    const pts: string[] = [];
    for (let v = a; v <= b + 1e-9; v += 0.5) pts.push(`${sx(v).toFixed(1)} ${f(v).toFixed(1)}`);
    return pts;
  };
  const area = (a: number, b: number) =>
    `M ${sx(a)} ${base} L ${line(a, b).join(' L ')} L ${sx(b)} ${base} Z`;
  const bands = [
    { k: 3, from: 0.62, cls: 'fill-brand/10', label: '99.7% between 40 and 100', y: 62 },
    { k: 2, from: 0.38, cls: 'fill-brand/20', label: '95% between 50 and 90', y: 48 },
    { k: 1, from: 0.14, cls: 'fill-brand/35', label: '68% between 60 and 80', y: 34 },
  ];
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        The normal curve: 68, 95 and 99.7 percent
      </T>
      {bands.map((b) => (
        <Show key={b.k} from={b.from}>
          <path d={area(70 - 10 * b.k, 70 + 10 * b.k)} className={b.cls} />
          <T x={14} y={b.y} anchor="start" size={8} tone="ink" mono>
            {b.label}
          </T>
        </Show>
      ))}
      <path
        d={`M ${line(30, 110).join(' L ')}`}
        fill="none"
        strokeWidth={2}
        className="stroke-brand"
      />
      <line x1={20} x2={300} y1={base} y2={base} className="stroke-line-2" />
      {[40, 50, 60, 70, 80, 90, 100].map((t) => (
        <T key={t} x={sx(t)} y={base + 12} size={7.5} mono>
          {String(t)}
        </T>
      ))}
      <T x={160} y={160} size={9}>
        Exam scores: mean 70, standard deviation 10
      </T>
    </>
  );
}

const CORR_POS: ReadonlyArray<Pt> = [
  [0.1, 0.15],
  [0.2, 0.35],
  [0.3, 0.2],
  [0.4, 0.5],
  [0.5, 0.38],
  [0.6, 0.65],
  [0.7, 0.52],
  [0.8, 0.8],
  [0.9, 0.74],
  [0.25, 0.42],
  [0.65, 0.78],
  [0.85, 0.95],
];
const CORR_ZERO: ReadonlyArray<Pt> = [
  [0.1, 0.6],
  [0.2, 0.2],
  [0.3, 0.85],
  [0.4, 0.4],
  [0.5, 0.7],
  [0.6, 0.15],
  [0.7, 0.55],
  [0.8, 0.3],
  [0.9, 0.55],
  [0.35, 0.1],
  [0.55, 0.9],
  [0.15, 0.35],
  [0.85, 0.12],
];
const CORR_NEG: ReadonlyArray<Pt> = [
  [0.1, 0.8],
  [0.2, 0.6],
  [0.3, 0.85],
  [0.4, 0.5],
  [0.5, 0.68],
  [0.6, 0.35],
  [0.7, 0.58],
  [0.8, 0.25],
  [0.9, 0.35],
  [0.25, 0.9],
  [0.45, 0.4],
  [0.85, 0.15],
];

function CorrelationScatter() {
  const panels = [
    { x: 12, title: 'study hours vs marks', r: 'r ≈ 0.9', pts: CORR_POS, from: 0.04 },
    { x: 116, title: 'shoe size vs marks', r: 'r near 0', pts: CORR_ZERO, from: 0.3 },
    { x: 220, title: 'screen time vs sleep', r: 'r ≈ −0.8', pts: CORR_NEG, from: 0.56 },
  ];
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Correlation: how two things move together
      </T>
      {panels.map((p) => (
        <Show key={p.title} from={p.from}>
          <T x={p.x + 44} y={28} size={7.5} tone="ink">
            {p.title}
          </T>
          <Box x={p.x} y={33} w={88} h={84} r={6} tone="soft" />
          {p.pts.map(([px, py]) => (
            <circle
              key={`${px}-${py}`}
              cx={p.x + 6 + px * 76}
              cy={33 + 84 - 6 - py * 72}
              r={2.6}
              className="fill-g0"
            />
          ))}
          <T x={p.x + 44} y={132} size={9} mono bold tone="brand">
            {p.r}
          </T>
        </Show>
      ))}
      <Show from={0.8}>
        <T x={160} y={152} size={9.5} tone="ink" bold>
          Correlation is not causation
        </T>
        <T x={160} y={166} size={8}>
          Ice-cream sales and drownings both rise in summer: heat drives both
        </T>
      </Show>
    </>
  );
}

function PValueTail() {
  const n = 100;
  const logf = (m: number) => {
    let s = 0;
    for (let i = 2; i <= m; i++) s += Math.log(i);
    return s;
  };
  const pmf = (k: number) => Math.exp(logf(n) - logf(k) - logf(n - k) - n * Math.LN2);
  const ks = Array.from({ length: 41 }, (_, i) => 30 + i);
  const sx = (k: number) => 20 + (k - 30) * 7;
  const base = 126;
  const peak = pmf(50);
  const h = (k: number) => (pmf(k) / peak) * 76;
  const tail = (k: number) => Math.abs(k - 50) >= 10;
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        The new model wins 60 of 100: is it really better?
      </T>
      {ks.map((k) => (
        <rect
          key={k}
          x={sx(k) - 3}
          y={base - h(k)}
          width={6}
          height={h(k)}
          rx={1}
          className="fill-line-2"
        />
      ))}
      <Show from={0.45}>
        {ks.filter(tail).map((k) => (
          <rect
            key={k}
            x={sx(k) - 3}
            y={base - h(k)}
            width={6}
            height={h(k)}
            rx={1}
            className="fill-bad/70"
          />
        ))}
      </Show>
      <Show from={0.08}>
        <T x={sx(50)} y={40} size={8} tone="ink">
          no real difference: about 50
        </T>
      </Show>
      <Show from={0.28}>
        <line x1={sx(60)} x2={sx(60)} y1={52} y2={base} strokeWidth={1.75} className="stroke-ink" />
        <T x={sx(60) + 4} y={58} anchor="start" size={8.5} tone="ink" bold>
          observed 60
        </T>
      </Show>
      <line x1={18} x2={302} y1={base} y2={base} className="stroke-line-2" />
      {[30, 40, 50, 60, 70].map((t) => (
        <T key={t} x={sx(t)} y={base + 12} size={7.5} mono>
          {String(t)}
        </T>
      ))}
      <Show from={0.55}>
        <T x={160} y={152} size={9} tone="bad">
          Both red tails together: p = 0.057
        </T>
      </Show>
      <Show from={0.75}>
        <T x={160} y={167} size={9} tone="ink">
          0.057 is above 0.05: not significant, it could be luck
        </T>
      </Show>
    </>
  );
}

// ───────────── NumPy ─────────────

/** Mono text that keeps its spaces, for NumPy's aligned printouts. */
function Pre({
  x,
  y,
  children,
  size = 9,
  tone = 'ink',
  anchor = 'start',
}: {
  x: number;
  y: number;
  children: string;
  size?: number;
  tone?: keyof typeof TONE;
  anchor?: 'start' | 'middle' | 'end';
}) {
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      textAnchor={anchor}
      fontWeight={500}
      xmlSpace="preserve"
      style={{ whiteSpace: 'pre' }}
      className={cn(TONE[tone], 'font-mono')}
    >
      {children}
    </text>
  );
}

function ListVsArray() {
  const nums = ['12', '7', '30', '5'];
  // Where each list item's object happens to sit: anywhere in memory.
  const objects: ReadonlyArray<Pt> = [
    [92, 118],
    [8, 86],
    [106, 86],
    [44, 128],
  ];
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        A list points to objects; an array packs the numbers
      </T>
      <T x={80} y={30} size={8.5} tone="ink">
        Python list: 4 pointers
      </T>
      <T x={240} y={30} size={8.5} tone="ink">
        NumPy array: one block
      </T>
      {nums.map((n, i) => (
        <g key={n}>
          <Box x={22 + i * 30} y={38} w={26} h={18} r={4} tone="soft" />
          <circle cx={35 + i * 30} cy={47} r={2.4} className="fill-ink" />
        </g>
      ))}
      {nums.map((n, i) => {
        const [ox, oy] = objects[i] ?? [0, 0];
        return (
          <Show key={n} from={0.06 + i * 0.06}>
            <Arrow x1={35 + i * 30} y1={57} x2={ox + 21} y2={oy - 2} />
            <Chip x={ox} y={oy} w={42} h={18} label={`int ${n}`} size={8.5} />
          </Show>
        );
      })}
      <T x={80} y={162} size={8}>
        objects anywhere in memory
      </T>
      <Show from={0.36}>
        <Box x={176} y={60} w={128} h={28} r={6} tone="brand" />
        {[1, 2, 3].map((k) => (
          <line
            key={k}
            x1={176 + k * 32}
            x2={176 + k * 32}
            y1={60}
            y2={88}
            strokeWidth={1}
            className="stroke-brand"
          />
        ))}
        {nums.map((n, i) => (
          <T key={n} x={192 + i * 32} y={78} size={10.5} mono tone="ink">
            {n}
          </T>
        ))}
        <T x={240} y={51} size={8} mono>
          dtype int64, 8 bytes each
        </T>
      </Show>
      <Show from={0.56} to={0.84} final={false}>
        <Move
          keys={[
            [0, [0, 0]],
            [0.58, [0, 0]],
            [0.82, [96, 0]],
          ]}
        >
          <rect x={178} y={62} width={28} height={24} rx={5} className="fill-brand/30" />
        </Move>
      </Show>
      <Show from={0.8}>
        <Arrow x1={180} y1={102} x2={300} y2={102} tone="brand" />
        <T x={240} y={118} size={8} tone="ink">
          maths sweeps through in one pass
        </T>
      </Show>
      <T x={160} y={178} size={9}>
        Compact and one type, so array maths runs fast
      </T>
    </>
  );
}

function VectorizedVsLoop() {
  const ins = ['100', '250', '400', '80', '120'];
  const outs = ['118', '295', '472', '94.4', '141.6'];
  const x = (i: number) => 14 + i * 50;
  const step = (i: number) => 0.08 + i * 0.07;
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Add 18% GST: a loop, or one vectorised step
      </T>
      <T x={14} y={30} anchor="start" size={8.5} tone="ink">
        Python loop: one amount per step
      </T>
      {ins.map((v, i) => (
        <Chip key={v} x={x(i)} y={36} w={44} h={18} label={v} size={9} />
      ))}
      <Show from={0.06} to={0.46} final={false}>
        <Move discrete keys={ins.map((_, i) => [i === 0 ? 0 : step(i), [i * 50, 0]] as const)}>
          <Box x={x(0) - 2} y={34} w={48} h={22} r={7} tone="ring" width={2} />
        </Move>
      </Show>
      {outs.map((v, i) => (
        <Show key={v} from={step(i) + 0.02}>
          <Chip x={x(i)} y={60} w={44} h={18} label={v} size={9} tone="ok" />
        </Show>
      ))}
      <Show from={0.44}>
        <T x={290} y={62} size={9} bold tone="ink">
          5 steps
        </T>
      </Show>
      <T x={14} y={100} anchor="start" size={8.5} tone="ink">
        NumPy: prices * 1.18
      </T>
      {ins.map((v, i) => (
        <Chip key={v} x={x(i)} y={106} w={44} h={18} label={v} size={9} />
      ))}
      <Show from={0.55}>
        <Box x={x(0) - 3} y={103} w={250} h={24} r={8} tone="ring" width={2} />
      </Show>
      <Show from={0.62}>
        {outs.map((v, i) => (
          <Chip key={v} x={x(i)} y={130} w={44} h={18} label={v} size={9} tone="ok" />
        ))}
        <T x={290} y={132} size={9} bold tone="ink">
          1 step
        </T>
      </Show>
      <T x={160} y={168} size={9}>
        Same five answers: NumPy handles the whole array at once
      </T>
    </>
  );
}

function ArrayAxes() {
  const layers = [
    { c: 'B', tone: 'brand', text: 'brand', k: 2 },
    { c: 'G', tone: 'ok', text: 'ok', k: 1 },
    { c: 'R', tone: 'bad', text: 'bad', k: 0 },
  ] as const;
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Shape counts the items along each axis
      </T>
      <Show from={0.04}>
        <T x={46} y={32} size={8.5} tone="ink">
          1-D
        </T>
        {[0, 1, 2, 3].map((i) => (
          <Box key={i} x={14 + i * 17} y={66} w={15} h={15} r={3} tone="brand" />
        ))}
        <T x={46} y={124} size={9.5} mono bold tone="ink">
          (4,)
        </T>
        <T x={46} y={137} size={7.5}>
          4 numbers
        </T>
      </Show>
      <Show from={0.26}>
        <T x={158} y={32} size={8.5} tone="ink">
          2-D
        </T>
        {[0, 1, 2].map((r) =>
          [0, 1, 2, 3].map((c) => (
            <Box
              key={`${r}-${c}`}
              x={120 + c * 20}
              y={48 + r * 18}
              w={18}
              h={16}
              r={3}
              tone="soft"
            />
          )),
        )}
        <T x={158} y={124} size={9.5} mono bold tone="ink">
          (3, 4)
        </T>
        <T x={158} y={137} size={7.5}>
          3 rows, 4 columns
        </T>
      </Show>
      <Show from={0.42}>
        <Arrow x1={111} y1={48} x2={111} y2={100} tone="brand" />
        <T x={111} y={112} size={7.5} tone="brand">
          axis 0
        </T>
        <Arrow x1={120} y1={41} x2={196} y2={41} tone="ok" />
        <T x={201} y={44} anchor="start" size={7.5} tone="ok">
          axis 1
        </T>
      </Show>
      <Show from={0.62}>
        <T x={272} y={32} size={8.5} tone="ink">
          3-D: a colour photo
        </T>
        {layers.map((l) => (
          <g key={l.c}>
            <Box x={240 + l.k * 10} y={66 - l.k * 10} w={50} h={40} r={4} tone={l.tone} />
            <T x={283 + l.k * 10} y={74 - l.k * 10} size={7.5} bold tone={l.text}>
              {l.c}
            </T>
          </g>
        ))}
        <T x={272} y={124} size={9.5} mono bold tone="ink">
          (h, w, 3)
        </T>
        <T x={272} y={137} size={7.5}>
          height, width, colour
        </T>
      </Show>
      <T x={160} y={158} size={9}>
        ndim counts the axes; shape gives the size along each
      </T>
    </>
  );
}

function Slice2d() {
  const colX = (c: number) => 24 + c * 26;
  const rowY = (r: number) => 40 + r * 20;
  const steps = [
    {
      code: 'a[1]',
      r: [1, 1],
      c: [0, 4],
      out: ['[5 6 7 8 9]'],
      shape: 'shape (5,)',
      from: 0.04,
      to: 0.34,
      ring: 'ring',
      chip: 'brand',
    },
    {
      code: 'a[:, 2]',
      r: [0, 3],
      c: [2, 2],
      out: ['[ 2  7 12 17]'],
      shape: 'shape (4,)',
      from: 0.34,
      to: 0.64,
      ring: 'ringOk',
      chip: 'ok',
    },
    {
      code: 'a[1:3, 1:4]',
      r: [1, 2],
      c: [1, 3],
      out: ['[[ 6  7  8]', ' [11 12 13]]'],
      shape: 'shape (2, 3)',
      from: 0.64,
      to: 1,
      ring: 'ring',
      chip: 'brand',
    },
  ] as const;
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Slicing a 2-D array: a[rows, columns]
      </T>
      {[0, 1, 2, 3, 4].map((c) => (
        <T key={c} x={colX(c) + 12} y={34} size={7.5} mono>
          {String(c)}
        </T>
      ))}
      {[0, 1, 2, 3].map((r) => (
        <g key={r}>
          <T x={12} y={rowY(r) + 12} size={7.5} mono>
            {String(r)}
          </T>
          {[0, 1, 2, 3, 4].map((c) => (
            <Chip
              key={c}
              x={colX(c)}
              y={rowY(r)}
              w={24}
              h={18}
              label={String(r * 5 + c)}
              size={9}
              tone="soft"
            />
          ))}
        </g>
      ))}
      {steps.map((s, k) => {
        const last = k === steps.length - 1;
        const y0 = 44 + k * 36;
        return (
          <g key={s.code}>
            <Show from={s.from} to={last ? undefined : s.to} final={last}>
              <Box
                x={colX(s.c[0]) - 3}
                y={rowY(s.r[0]) - 3}
                w={(s.c[1] - s.c[0]) * 26 + 30}
                h={(s.r[1] - s.r[0]) * 20 + 24}
                r={6}
                tone={s.ring}
                width={2}
              />
            </Show>
            <Show from={s.from}>
              <Chip x={166} y={y0} w={72} h={18} label={s.code} size={9} tone={s.chip} />
              {s.out.map((line, j) => (
                <Pre key={line} x={244} y={y0 + 12 + j * 10} size={8.5}>
                  {line}
                </Pre>
              ))}
              <T x={244} y={y0 + 13 + s.out.length * 11} anchor="start" size={7.5}>
                {s.shape}
              </T>
            </Show>
          </g>
        );
      })}
      <T x={160} y={164} size={9}>
        Rows first, then columns; a slice stops before its end index
      </T>
    </>
  );
}

function BooleanMask() {
  const temps = [31, 36, 29, 38, 35];
  const x = (i: number) => 14 + i * 58;
  const kept = [
    [1, 0],
    [3, 1],
  ] as const;
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        A boolean mask keeps the values that pass a test
      </T>
      <T x={14} y={30} anchor="start" size={8.5} mono tone="ink">
        temps
      </T>
      {temps.map((t, i) => (
        <Chip key={t} x={x(i)} y={35} w={50} h={20} label={String(t)} size={10} />
      ))}
      <Show from={0.16}>
        <T x={14} y={72} anchor="start" size={8.5} mono tone="ink">
          {'temps > 35'}
        </T>
      </Show>
      {temps.map((t, i) => {
        const on = t > 35;
        return (
          <Show key={t} from={0.2 + i * 0.05}>
            <Chip
              x={x(i)}
              y={77}
              w={50}
              h={20}
              label={on ? 'True' : 'False'}
              size={9.5}
              tone={on ? 'ok' : 'soft'}
              text={on ? 'ink' : 'muted'}
            />
          </Show>
        );
      })}
      <Show from={0.46}>
        <T x={x(4) + 25} y={110} size={7.5}>
          {'35 > 35 is False'}
        </T>
      </Show>
      <Show from={0.56}>
        <T x={14} y={126} anchor="start" size={8.5} mono tone="ink">
          {'temps[temps > 35]'}
        </T>
      </Show>
      {kept.map(([src, dst]) => (
        <Show key={src} from={0.6}>
          <Move
            keys={[
              [0, [x(src) - x(dst), 35 - 131]],
              [0.6, [x(src) - x(dst), 35 - 131]],
              [0.76, [0, 0]],
            ]}
          >
            <Chip x={x(dst)} y={131} w={50} h={20} label={String(temps[src])} size={10} tone="ok" />
          </Move>
        </Show>
      ))}
      <Show from={0.8}>
        <T x={300} y={145} anchor="end" size={8}>
          a new, shorter array
        </T>
      </Show>
      <T x={160} y={172} size={9}>
        {'Count the matches with (temps > 35).sum(): here 2'}
      </T>
    </>
  );
}

function ViewVsCopy() {
  const x = (i: number) => 50 + i * 38;
  const chip = (i: number, y: number, label: string, tone: keyof typeof BOX = 'plain') => (
    <Chip x={x(i)} y={y} w={34} h={20} label={label} size={9.5} tone={tone} />
  );
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        A slice is a view; a mask makes a copy
      </T>
      <T x={32} y={44} size={10} mono bold tone="ink">
        a
      </T>
      {chip(0, 30, '10')}
      <Show to={0.32} final={false}>
        {chip(1, 30, '20')}
      </Show>
      <Show from={0.32}>{chip(1, 30, '99', 'warn')}</Show>
      {chip(2, 30, '30')}
      {chip(3, 30, '40')}

      <Show from={0.08}>
        <Box x={x(1) - 3} y={27} w={78} h={26} r={7} tone="ring" dashed />
        {[1, 2].map((i) => (
          <line
            key={i}
            x1={x(i) + 17}
            x2={x(i) + 17}
            y1={53}
            y2={74}
            strokeDasharray="3 3"
            className="stroke-brand"
          />
        ))}
        <T x={32} y={88} size={10} mono bold tone="ink">
          b
        </T>
        {chip(2, 74, '30')}
        <T x={214} y={80} anchor="start" size={8.5} mono tone="ink">
          b = a[1:3]
        </T>
        <T x={214} y={92} anchor="start" size={8}>
          a view: same memory
        </T>
      </Show>
      <Show from={0.08} to={0.32} final={false}>
        {chip(1, 74, '20')}
      </Show>
      <Show from={0.32}>
        {chip(1, 74, '99', 'warn')}
        <T x={214} y={104} anchor="start" size={8} tone="warn">
          b[0] = 99 changes a too
        </T>
      </Show>

      <Show from={0.55}>
        <T x={32} y={138} size={10} mono bold tone="ink">
          c
        </T>
        {chip(1, 124, '30')}
        {chip(2, 124, '40')}
        <T x={214} y={130} anchor="start" size={8.5} mono tone="ink">
          {'c = a[a > 15]'}
        </T>
        <T x={214} y={142} anchor="start" size={8}>
          a copy: new memory
        </T>
      </Show>
      <Show from={0.55} to={0.76} final={false}>
        {chip(0, 124, '99')}
      </Show>
      <Show from={0.76}>
        {chip(0, 124, '0', 'ok')}
        <T x={214} y={154} anchor="start" size={8} tone="ok">
          c[0] = 0: a unchanged
        </T>
      </Show>
      <T x={160} y={174} size={9}>
        Need an independent array? Call .copy()
      </T>
    </>
  );
}

function AxisCollapse() {
  const data = [
    [12, 15, 9, 14],
    [8, 6, 10, 7],
    [20, 18, 22, 25],
  ];
  const stores = ['store A', 'store B', 'store C'];
  const days = ['Mon', 'Tue', 'Wed', 'Thu'];
  const colSums = [40, 39, 41, 46];
  const rowSums = [50, 31, 85];
  const colX = (c: number) => 60 + c * 37;
  const rowY = (r: number) => 40 + r * 23;
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Sales of 3 stores over 4 days: sum along an axis
      </T>
      {days.map((d, c) => (
        <T key={d} x={colX(c) + 17} y={34} size={7.5}>
          {d}
        </T>
      ))}
      <Show from={0.08} to={0.48} final={false}>
        {days.map((d, c) => (
          <rect
            key={d}
            x={colX(c) - 2}
            y={rowY(0) - 3}
            width={38}
            height={72}
            rx={6}
            className="fill-brand/15"
          />
        ))}
      </Show>
      <Show from={0.52}>
        {stores.map((s, r) => (
          <rect
            key={s}
            x={colX(0) - 3}
            y={rowY(r) - 1}
            width={150}
            height={22}
            rx={6}
            className="fill-ok/15"
          />
        ))}
      </Show>
      {data.map((row, r) => (
        <g key={stores[r]}>
          <T x={52} y={rowY(r) + 14} anchor="end" size={7.5}>
            {stores[r] ?? ''}
          </T>
          {row.map((v, c) => (
            <Chip
              key={days[c]}
              x={colX(c)}
              y={rowY(r)}
              w={34}
              h={20}
              label={String(v)}
              size={9.5}
            />
          ))}
        </g>
      ))}
      <Show from={0.2}>
        {colSums.map((v, c) => (
          <Chip
            key={days[c]}
            x={colX(c)}
            y={118}
            w={34}
            h={20}
            label={String(v)}
            size={9.5}
            tone="brand"
          />
        ))}
        <T x={212} y={132} anchor="start" size={8} mono bold tone="brand">
          sum(axis=0)
        </T>
      </Show>
      <Show from={0.6}>
        <T x={244} y={34} size={8} mono bold tone="ok">
          sum(axis=1)
        </T>
        {rowSums.map((v, r) => (
          <Chip
            key={stores[r]}
            x={227}
            y={rowY(r)}
            w={34}
            h={20}
            label={String(v)}
            size={9.5}
            tone="ok"
          />
        ))}
      </Show>
      <T x={160} y={156} size={8.5}>
        axis=0: one total per day · axis=1: one total per store
      </T>
      <T x={160} y={172} size={9} tone="ink">
        The axis you name is the one that disappears
      </T>
    </>
  );
}

function BroadcastStretch() {
  const prices = ['100', '200', '300'];
  const factors = ['1', '0.9', '0.8', '0.5'];
  const out = [
    ['100', '90', '80', '50'],
    ['200', '180', '160', '100'],
    ['300', '270', '240', '150'],
  ];
  const colX = (c: number) => 92 + c * 54;
  const rowY = (r: number) => 62 + r * 26;
  const PX = 20;
  const ghost = (x: number, y: number, label: string) => (
    <>
      <Box x={x} y={y} w={46} h={20} r={6} tone="soft" dashed />
      <T x={x + 23} y={y + 14} size={9} mono>
        {label}
      </T>
    </>
  );
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Broadcasting: (3, 1) times (1, 4) gives (3, 4)
      </T>
      <T x={42} y={41} size={8} tone="ink">
        factors
      </T>
      <T x={42} y={52} size={7.5} mono>
        (1, 4)
      </T>
      {factors.map((f, c) => (
        <Chip key={f} x={colX(c)} y={34} w={46} h={20} label={f} size={9.5} />
      ))}
      {prices.map((p, r) => (
        <Chip key={p} x={PX} y={rowY(r)} w={44} h={20} label={p} size={9.5} />
      ))}
      <T x={42} y={150} size={8} tone="ink">
        prices
      </T>
      <T x={42} y={161} size={7.5} mono>
        (3, 1)
      </T>
      {factors.map((f, c) => (
        <Show key={f} from={0.12} to={0.44} final={false}>
          <Move
            keys={[
              [0, [PX - colX(c), 0]],
              [0.14, [PX - colX(c), 0]],
              [0.3, [0, 0]],
            ]}
          >
            {prices.map((p, r) => (
              <g key={p}>{ghost(colX(c), rowY(r), p)}</g>
            ))}
          </Move>
        </Show>
      ))}
      {prices.map((p, r) => (
        <Show key={p} from={0.44} to={0.64} final={false}>
          <Move
            keys={[
              [0, [0, 34 - rowY(r)]],
              [0.46, [0, 34 - rowY(r)]],
              [0.58, [0, 0]],
            ]}
          >
            {factors.map((f, c) => (
              <g key={f}>{ghost(colX(c), rowY(r), f)}</g>
            ))}
          </Move>
        </Show>
      ))}
      <Show from={0.64}>
        {out.map((row, r) =>
          row.map((v, c) => (
            <Chip
              key={`${prices[r]}-${factors[c]}`}
              x={colX(c)}
              y={rowY(r)}
              w={46}
              h={20}
              label={v}
              size={9.5}
              tone="brand"
            />
          )),
        )}
        <T x={196} y={150} size={8.5} bold tone="brand">
          result (3, 4): every price at every discount
        </T>
      </Show>
      <T x={160} y={172} size={9}>
        Size-1 axes stretch virtually: no copies, no loop
      </T>
    </>
  );
}

function BroadcastRules() {
  const dim = (x: number, y: number, label: string, tone: keyof typeof BOX = 'plain') => (
    <Chip x={x} y={y} w={26} h={18} label={label} size={9.5} tone={tone} />
  );
  const missing = (x: number, y: number) => (
    <>
      <Box x={x} y={y} w={26} h={18} r={6} tone="soft" dashed />
      <T x={x + 13} y={y + 13} size={9.5} mono>
        1
      </T>
    </>
  );
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        The broadcasting rule: compare shapes from the right
      </T>

      <T x={14} y={30} anchor="start" size={8.5} mono bold tone="ink">
        (4, 3) with (3,)
      </T>
      <T x={58} y={49} anchor="end" size={8.5} mono>
        A
      </T>
      {dim(66, 36, '4')}
      {dim(96, 36, '3')}
      <T x={58} y={71} anchor="end" size={8.5} mono>
        B
      </T>
      <Show from={0.14}>{missing(66, 58)}</Show>
      {dim(96, 58, '3')}
      <Show from={0.06}>
        <Box x={93} y={33} w={32} h={46} r={7} tone="ringOk" width={1.75} />
        <T x={134} y={46} anchor="start" size={8} tone="ink">
          right: 3 and 3 match
        </T>
      </Show>
      <Show from={0.14}>
        <Box x={63} y={33} w={32} h={46} r={7} tone="ringOk" width={1.75} />
        <T x={134} y={60} anchor="start" size={8} tone="ink">
          left: a missing axis counts as 1
        </T>
      </Show>
      <Show from={0.24}>
        <T x={134} y={75} anchor="start" size={8.5} mono bold tone="ok">
          result (4, 3)
        </T>
      </Show>

      <T x={14} y={102} anchor="start" size={8.5} mono bold tone="ink">
        (4, 3) with (4,)
      </T>
      <T x={58} y={121} anchor="end" size={8.5} mono>
        A
      </T>
      {dim(66, 108, '4')}
      {dim(96, 108, '3')}
      <T x={58} y={143} anchor="end" size={8.5} mono>
        B
      </T>
      <Show to={0.7} final={false}>
        {missing(66, 130)}
        {dim(96, 130, '4')}
      </Show>
      <Show from={0.7}>
        {dim(66, 130, '4', 'ok')}
        {dim(96, 130, '1', 'ok')}
      </Show>
      <Show from={0.4} to={0.7} final={false}>
        <Box x={93} y={105} w={32} h={46} r={7} tone="ringBad" width={1.75} />
      </Show>
      <Show from={0.4}>
        <T x={134} y={116} anchor="start" size={8} tone="bad">
          right: 3 and 4 differ, neither is 1
        </T>
      </Show>
      <Show from={0.48}>
        <T x={134} y={129} anchor="start" size={8.5} mono bold tone="bad">
          ValueError
        </T>
      </Show>
      <Show from={0.7}>
        <T x={134} y={144} anchor="start" size={8} tone="ok">
          fix: B.reshape(4, 1)
        </T>
      </Show>
      <Show from={0.78}>
        <T x={134} y={157} anchor="start" size={8.5} mono bold tone="ok">
          result (4, 3)
        </T>
      </Show>
      <T x={160} y={176} size={9}>
        Each pair of sizes must be equal, or one of them must be 1
      </T>
    </>
  );
}

function ReshapeFlow() {
  const grids = [
    { code: 'reshape(3, 4)', rows: 3, cols: 4, x0: 14, shape: '(3, 4)', from: 0.12 },
    { code: 'reshape(4, 3)', rows: 4, cols: 3, x0: 110, shape: '(4, 3)', from: 0.4 },
    { code: 'reshape(2, -1)', rows: 2, cols: 6, x0: 192, shape: '(2, 6)', from: 0.68 },
  ];
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        reshape changes the shape, never the order
      </T>
      {Array.from({ length: 12 }, (_, i) => (
        <Chip
          // biome-ignore lint/suspicious/noArrayIndexKey: positions are the data
          key={i}
          x={16 + i * 24}
          y={26}
          w={22}
          h={18}
          label={String(i)}
          size={8.5}
          tone="soft"
        />
      ))}
      <T x={160} y={58} size={8} mono>
        np.arange(12): shape (12,)
      </T>
      {grids.map((g) => {
        const w = g.cols * 18 - 2;
        const h = g.rows * 16 - 2;
        return (
          <Show key={g.code} from={g.from}>
            <T x={g.x0 + w / 2} y={78} size={8} mono bold tone="brand">
              {g.code}
            </T>
            {Array.from({ length: 12 }, (_, k) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: positions are the data
              <Show key={k} from={g.from + k * 0.012}>
                <Box
                  x={g.x0 + (k % g.cols) * 18}
                  y={84 + Math.floor(k / g.cols) * 16}
                  w={16}
                  h={14}
                  r={3}
                  tone="brand"
                  width={1}
                />
                <T
                  x={g.x0 + (k % g.cols) * 18 + 8}
                  y={84 + Math.floor(k / g.cols) * 16 + 10}
                  size={7.5}
                  mono
                  tone="ink"
                >
                  {String(k)}
                </T>
              </Show>
            ))}
            <T x={g.x0 + w / 2} y={84 + h + 12} size={9} mono bold tone="ink">
              {g.shape}
            </T>
          </Show>
        );
      })}
      <Show from={0.76}>
        <T x={245} y={140} size={7.5}>
          -1: 12 ÷ 2 = 6 columns
        </T>
      </Show>
      <T x={160} y={176} size={9}>
        The sizes must multiply to 12; -1 lets NumPy work one out
      </T>
    </>
  );
}

function DotProductSteps() {
  const marks = ['80', '90', '70'];
  const weights = ['0.5', '0.3', '0.2'];
  const prods = ['40', '27', '14'];
  const x = (i: number) => 96 + i * 66;
  const at = (i: number) => 0.18 + i * 0.13;
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        A dot product: multiply the pairs, then add
      </T>
      <T x={14} y={42} anchor="start" size={8.5} tone="ink">
        marks
      </T>
      <T x={14} y={80} anchor="start" size={8.5} tone="ink">
        weights
      </T>
      <T x={14} y={118} anchor="start" size={8.5} tone="ink">
        products
      </T>
      {marks.map((m, i) => (
        <g key={m}>
          <Chip x={x(i)} y={28} w={50} h={20} label={m} size={10} />
          <T x={x(i) + 25} y={61} size={10} mono>
            ×
          </T>
          <Chip x={x(i)} y={66} w={50} h={20} label={weights[i] ?? ''} size={10} />
        </g>
      ))}
      {prods.map((p, i) => (
        <g key={p}>
          <Show from={at(i)} to={at(i) + 0.13} final={false}>
            <Box x={x(i) - 3} y={25} w={56} h={64} r={8} tone="ring" width={2} />
          </Show>
          <Show from={at(i) + 0.04}>
            <Arrow x1={x(i) + 25} y1={89} x2={x(i) + 25} y2={102} tone="brand" />
            <Chip x={x(i)} y={104} w={50} h={20} label={p} size={10} tone="ok" />
          </Show>
        </g>
      ))}
      <Show from={0.62}>
        <T x={160} y={146} size={11} mono bold tone="ink">
          40 + 27 + 14 = 81
        </T>
      </Show>
      <Show from={0.7}>
        <T x={160} y={161} size={8.5} mono>
          marks @ weights → 81.0
        </T>
      </Show>
      <T x={160} y={176} size={9}>
        Multiply each matching pair, then add them up
      </T>
    </>
  );
}

function DotAngle() {
  const O: Pt = [86, 104];
  const s = 18;
  const tip = (deg: number): Pt => [
    O[0] + 2 * s * Math.cos((deg * Math.PI) / 180),
    O[1] - 2 * s * Math.sin((deg * Math.PI) / 180),
  ];
  const states = [
    { deg: 0, dot: '8', cos: '1', from: 0.04, to: 0.28, label: [122, 95] as Pt },
    { deg: 60, dot: '4', cos: '0.5', from: 0.28, to: 0.52, label: [114, 70] as Pt },
    { deg: 90, dot: '0', cos: '0', from: 0.52, to: 0.76, label: [96, 64] as Pt },
    { deg: 180, dot: '−8', cos: '−1', from: 0.76, to: 1, label: [50, 95] as Pt },
  ];
  const arc = (deg: number) => {
    if (deg === 0) return null;
    if (deg === 90)
      return `M ${O[0] + 10} ${O[1]} L ${O[0] + 10} ${O[1] - 10} L ${O[0]} ${O[1] - 10}`;
    const r = 13;
    const [ex, ey] = [
      O[0] + r * Math.cos((deg * Math.PI) / 180),
      O[1] - r * Math.sin((deg * Math.PI) / 180),
    ];
    return `M ${O[0] + r} ${O[1]} A ${r} ${r} 0 0 0 ${ex.toFixed(1)} ${ey.toFixed(1)}`;
  };
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        The dot product follows the angle between vectors
      </T>
      <line x1={30} x2={176} y1={O[1]} y2={O[1]} className="stroke-line" />
      <Arrow x1={O[0]} y1={O[1]} x2={O[0] + 4 * s} y2={O[1]} tone="brand" width={2.5} />
      <T x={O[0] + 4 * s} y={O[1] + 15} size={8} mono bold tone="brand">
        a
      </T>
      {states.map((st, k) => {
        const last = k === states.length - 1;
        const [tx, ty] = tip(st.deg);
        const d = arc(st.deg);
        return (
          <Show key={st.deg} from={st.from} to={last ? undefined : st.to} final={last}>
            {d && <path d={d} fill="none" strokeWidth={1.25} className="stroke-muted" />}
            <Arrow x1={O[0]} y1={O[1]} x2={tx} y2={ty} tone="ok" width={2.5} />
            <T x={st.label[0]} y={st.label[1]} size={8} mono bold tone="ok">
              b
            </T>
            <T x={O[0]} y={O[1] + 30} size={8.5} mono tone="ink">
              {`${st.deg}°`}
            </T>
            <Box x={188} y={45 + k * 18} w={124} h={17} r={5} tone="ring" width={1.75} />
          </Show>
        );
      })}
      <T x={206} y={36} size={8} bold tone="ink">
        angle
      </T>
      <T x={252} y={36} size={8} bold tone="ink">
        a · b
      </T>
      <T x={292} y={36} size={8} bold tone="ink">
        cos
      </T>
      {states.map((st) => (
        <Show key={st.deg} from={st.from}>
          <T x={206} y={57 + states.indexOf(st) * 18} size={9} mono tone="ink">
            {`${st.deg}°`}
          </T>
          <T x={252} y={57 + states.indexOf(st) * 18} size={9} mono tone="ink">
            {st.dot}
          </T>
          <T x={292} y={57 + states.indexOf(st) * 18} size={9} mono tone="ink">
            {st.cos}
          </T>
        </Show>
      ))}
      <T x={86} y={148} size={8} mono>
        |a| = 4, |b| = 2
      </T>
      <T x={250} y={130} size={7.5} mono>
        cos = a · b / (|a| |b|)
      </T>
      <T x={160} y={166} size={8.5}>
        Same direction: positive. At 90 degrees: zero. Opposite: negative.
      </T>
    </>
  );
}

function L1VsL2Norm() {
  const u = 26;
  const O: Pt = [44, 136];
  const P = (x: number, y: number): Pt => [O[0] + x * u, O[1] - y * u];
  const [tx, ty] = P(3, 4);
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        L2 is the straight line; L1 walks the grid
      </T>
      {[0, 1, 2, 3].map((i) => (
        <line
          key={`v${i}`}
          x1={P(i, 0)[0]}
          x2={P(i, 0)[0]}
          y1={P(0, 4)[1]}
          y2={O[1]}
          className="stroke-line"
        />
      ))}
      {[0, 1, 2, 3, 4].map((j) => (
        <line
          key={`h${j}`}
          x1={O[0]}
          x2={P(3, 0)[0]}
          y1={P(0, j)[1]}
          y2={P(0, j)[1]}
          className="stroke-line"
        />
      ))}
      <path
        d={`M ${O[0]} ${O[1]} L ${tx} ${ty}`}
        pathLength={1}
        strokeDasharray="1"
        strokeWidth={2.5}
        className="fill-none stroke-brand"
      >
        <Anim attr="stroke-dashoffset" keys={drawKeys(0.08, 0.3)} />
      </path>
      <path
        d={`M ${O[0]} ${O[1]} H ${tx} V ${ty}`}
        pathLength={1}
        strokeDasharray="1"
        strokeWidth={2.5}
        className="fill-none stroke-warn"
      >
        <Anim attr="stroke-dashoffset" keys={drawKeys(0.42, 0.68)} />
      </path>
      <circle cx={O[0]} cy={O[1]} r={3} className="fill-ink" />
      <circle cx={tx} cy={ty} r={3} className="fill-ink" />
      <T x={O[0]} y={O[1] + 13} size={7.5} mono>
        (0, 0)
      </T>
      <T x={tx + 6} y={ty + 3} anchor="start" size={7.5} mono>
        (3, 4)
      </T>
      <Show from={0.3}>
        <T x={74} y={80} size={10} bold tone="brand">
          5
        </T>
      </Show>
      <Show from={0.56}>
        <T x={83} y={O[1] + 13} size={9} bold tone="warn">
          3
        </T>
        <T x={tx + 8} y={88} anchor="start" size={9} bold tone="warn">
          4
        </T>
      </Show>
      <Show from={0.1}>
        <T x={170} y={50} anchor="start" size={9.5} bold tone="brand">
          L2 norm = 5
        </T>
        <T x={170} y={64} anchor="start" size={8} mono>
          √(3² + 4²) = √25 = 5
        </T>
      </Show>
      <Show from={0.44}>
        <T x={170} y={92} anchor="start" size={9.5} bold tone="warn">
          L1 norm = 7
        </T>
        <T x={170} y={106} anchor="start" size={8} mono>
          |3| + |4| = 7
        </T>
      </Show>
      <Show from={0.72}>
        <T x={170} y={128} anchor="start" size={7.5} mono>
          np.linalg.norm(v) → 5.0
        </T>
        <T x={170} y={140} anchor="start" size={7.5} mono>
          np.linalg.norm(v, 1) → 7.0
        </T>
      </Show>
      <T x={160} y={168} size={9}>
        One point, two lengths: straight across or along the streets
      </T>
    </>
  );
}

function MatmulRowCol() {
  const A = [
    ['80', '90', '70'],
    ['60', '75', '95'],
  ];
  const names = ['Asha', 'Ravi'];
  const B = [
    ['0.5', '0.2'],
    ['0.3', '0.3'],
    ['0.2', '0.5'],
  ];
  const C = [
    ['81', '78'],
    ['71.5', '82'],
  ];
  const ax = (c: number) => 46 + c * 26;
  const ay = (r: number) => 52 + r * 22;
  const bx = (c: number) => 146 + c * 38;
  const by = (r: number) => 46 + r * 22;
  const cx = (c: number) => 244 + c * 36;
  const cells = [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
  ] as const;
  const at = (k: number) => 0.06 + k * 0.2;
  const sum = (r: number, c: number) =>
    `${[0, 1, 2].map((i) => `${A[r]?.[i]} × ${B[i]?.[c]}`).join(' + ')} = ${C[r]?.[c]}`;
  const focus = (r: number, c: number) => (
    <>
      <Box x={ax(0) - 3} y={ay(r) - 3} w={82} h={26} r={7} tone="ring" width={2} />
      <Box x={bx(c) - 3} y={by(0) - 3} w={42} h={70} r={7} tone="ringOk" width={2} />
      <Box x={cx(c) - 3} y={ay(r) - 3} w={40} h={26} r={7} tone="ring" width={2} />
      <T x={160} y={136} size={8.5} mono tone="ink">
        {sum(r, c)}
      </T>
    </>
  );
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Matrix multiplication: each cell is a row times a column
      </T>
      <T x={83} y={40} size={8} tone="ink">
        marks (2, 3)
      </T>
      <T x={183} y={28} size={8} tone="ink">
        weights (3, 2)
      </T>
      <T x={278} y={40} size={8} tone="ink">
        result (2, 2)
      </T>
      {names.map((n, r) => (
        <g key={n}>
          <T x={38} y={ay(r) + 14} anchor="end" size={7.5}>
            {n}
          </T>
          {A[r]?.map((v, c) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: marks repeat across rows
            <Chip key={c} x={ax(c)} y={ay(r)} w={24} h={20} label={v} size={9} />
          ))}
        </g>
      ))}
      {['scheme 1', 'scheme 2'].map((h, c) => (
        <T key={h} x={bx(c) + 18} y={40} size={7}>
          {h}
        </T>
      ))}
      {B.map((row, r) =>
        row.map((v, c) => (
          <Chip
            // biome-ignore lint/suspicious/noArrayIndexKey: weights repeat
            key={`${r}-${c}`}
            x={bx(c)}
            y={by(r)}
            w={36}
            h={20}
            label={v}
            size={9}
          />
        )),
      )}
      <T x={135} y={78} size={12} mono tone="ink">
        @
      </T>
      <T x={233} y={78} size={12} mono tone="ink">
        =
      </T>
      {cells.map(([r, c], k) => (
        <g key={`${r}-${c}`}>
          <Show from={at(k)} to={at(k) + 0.2} final={false}>
            {focus(r, c)}
          </Show>
          <Show from={at(k) + 0.06}>
            <Chip x={cx(c)} y={ay(r)} w={34} h={20} label={C[r]?.[c] ?? ''} size={9} tone="brand" />
          </Show>
        </g>
      ))}
      <Show from={0.88}>{focus(0, 0)}</Show>
      <T x={160} y={154} size={8}>
        Inner sizes match (3 and 3), so (2, 3) @ (3, 2) gives (2, 2)
      </T>
      <T x={160} y={170} size={8.5} tone="ink">
        Each cell: a row of the first times a column of the second
      </T>
    </>
  );
}

function BatchSimilarity() {
  const Q = [
    ['0.8', '0.6', '0'],
    ['0', '0', '1'],
  ];
  const DT = [
    ['1', '0', '0.6', '0'],
    ['0', '1', '0.8', '0.6'],
    ['0', '0', '0', '0.8'],
  ];
  const S = [
    ['0.8', '0.6', '0.96', '0.36'],
    ['0', '0', '0', '0.8'],
  ];
  const best = [2, 3];
  const qx = (c: number) => 22 + c * 24;
  const qy = (r: number) => 42 + r * 22;
  const dx = (c: number) => 124 + c * 28;
  const dy = (r: number) => 42 + r * 20;
  const sy = (r: number) => 122 + r * 22;
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Score every query against every document at once
      </T>
      <T x={57} y={27} size={8} tone="ink">
        Q: 2 queries (2, 3)
      </T>
      <T x={177} y={27} size={8} tone="ink">
        D.T: 4 documents
      </T>
      {Q.map((row, r) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional
        <g key={r}>
          <T x={16} y={qy(r) + 14} anchor="end" size={7.5} mono>
            {`q${r + 1}`}
          </T>
          {row.map((v, c) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: values repeat
            <Chip key={c} x={qx(c)} y={qy(r)} w={22} h={20} label={v} size={8.5} />
          ))}
        </g>
      ))}
      <T x={108} y={74} size={12} mono tone="ink">
        @
      </T>
      {[0, 1, 2, 3].map((c) => (
        <T key={c} x={dx(c) + 13} y={38} size={7.5} mono>
          {`d${c + 1}`}
        </T>
      ))}
      {DT.map((row, r) =>
        row.map((v, c) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: values repeat
          <Chip key={`${r}-${c}`} x={dx(c)} y={dy(r)} w={26} h={18} label={v} size={8.5} />
        )),
      )}
      <T x={238} y={66} anchor="start" size={7.5} mono>
        D: (4, 3)
      </T>
      <T x={238} y={78} anchor="start" size={7.5} mono>
        D.T: (3, 4)
      </T>
      <T x={57} y={140} size={8.5} mono bold tone="brand">
        Q @ D.T
      </T>
      <T x={57} y={152} size={7.5} mono>
        shape (2, 4)
      </T>
      {S.map((row, r) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional
        <g key={r}>
          <Show from={0.2 + r * 0.25} to={0.45 + r * 0.25} final={false}>
            <Box x={qx(0) - 3} y={qy(r) - 3} w={76} h={26} r={7} tone="ring" width={2} />
            <Box x={dx(0) - 3} y={sy(r) - 3} w={116} h={26} r={7} tone="ring" width={2} />
          </Show>
          <Show from={0.24 + r * 0.25}>
            <T x={118} y={sy(r) + 14} anchor="end" size={7.5} mono>
              {`q${r + 1}`}
            </T>
            {row.map((v, c) => (
              <Chip
                // biome-ignore lint/suspicious/noArrayIndexKey: values repeat
                key={c}
                x={dx(c)}
                y={sy(r)}
                w={26}
                h={20}
                label={v}
                size={8.5}
              />
            ))}
          </Show>
        </g>
      ))}
      <Show from={0.76}>
        {best.map((c, r) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional
          <g key={r}>
            <Chip x={dx(c)} y={sy(r)} w={26} h={20} label={S[r]?.[c] ?? ''} size={8.5} tone="ok" />
            <Box x={dx(c) - 3} y={sy(r) - 3} w={32} h={26} r={7} tone="ringOk" width={2} />
            <T x={242} y={sy(r) + 14} anchor="start" size={8.5} bold tone="ok">
              {`best: document ${c + 1}`}
            </T>
          </g>
        ))}
      </Show>
      <T x={160} y={180} size={9}>
        One multiply scores them all; argmax picks the best in each row
      </T>
    </>
  );
}

// ───────────── The library ─────────────

// ───────────── Classical ML: linear regression ─────────────

/** Years of experience and salary (LPA) for the six employees the lesson uses throughout. */
const EMPLOYEES: ReadonlyArray<readonly [number, number]> = [
  [1, 6],
  [2, 6],
  [3, 9],
  [4, 11],
  [5, 12],
  [6, 16],
];

function LineOfBestFit() {
  // Plot area: years 0–8 across, salary 0–20 up.
  const px = (years: number) => 42 + (years / 8) * 256;
  const py = (salary: number) => 136 - (salary / 20) * 112;
  const guess = (x: number) => 1 * x + 5; // where the line starts
  const best = (x: number) => 2 * x + 3; // least squares
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        One line through six employees
      </T>
      <line x1={42} y1={24} x2={42} y2={136} className="stroke-line-2" strokeWidth={1} />
      <line x1={42} y1={136} x2={302} y2={136} className="stroke-line-2" strokeWidth={1} />
      {[0, 10, 20].map((v) => (
        <T key={v} x={37} y={py(v) + 3} size={7.5} anchor="end" mono>
          {v}
        </T>
      ))}
      {[2, 4, 6, 8].map((v) => (
        <T key={v} x={px(v)} y={147} size={7.5} mono>
          {v}
        </T>
      ))}
      <T x={42} y={20} size={8} anchor="start">
        salary (LPA)
      </T>
      <T x={172} y={158} size={8}>
        years of experience
      </T>

      {/* The line swings from a first guess onto the least-squares fit, then holds. */}
      <line
        x1={px(0)}
        y1={py(best(0))}
        x2={px(8)}
        y2={py(best(8))}
        strokeWidth={2.4}
        strokeLinecap="round"
        className="stroke-g1"
      >
        <Anim
          attr="y1"
          keys={[
            [0, py(guess(0))],
            [0.18, py(guess(0))],
            [0.5, py(best(0))],
          ]}
        />
        <Anim
          attr="y2"
          keys={[
            [0, py(guess(8))],
            [0.18, py(guess(8))],
            [0.5, py(best(8))],
          ]}
        />
      </line>
      {EMPLOYEES.map(([x, y]) => (
        <circle
          key={x}
          cx={px(x)}
          cy={py(y)}
          r={4}
          className="fill-brand stroke-surface"
          strokeWidth={1}
        />
      ))}

      {/* Reading the fitted line at seven years. */}
      <Show from={0.62}>
        <path
          d={`M${px(7)} 136 L${px(7)} ${py(best(7))} L42 ${py(best(7))}`}
          className="fill-none stroke-ok"
          strokeWidth={1.4}
          strokeDasharray="4 3"
        />
        <circle
          cx={px(7)}
          cy={py(best(7))}
          r={4.5}
          className="fill-ok stroke-surface"
          strokeWidth={1}
        />
        <T x={px(7) - 8} y={py(best(7)) + 14} size={9} anchor="end" mono bold tone="ok">
          17 at 7 years
        </T>
      </Show>
      <Show from={0.4}>
        <T x={px(2.4)} y={py(best(2.4)) - 10} size={9.5} mono bold tone="ink">
          ŷ = 2x + 3
        </T>
      </Show>
      <T x={160} y={170} size={9}>
        The line that misses the six dots by the least
      </T>
    </>
  );
}

/** The six employees with their second column: years, projects shipped, salary (LPA). */
const EMPLOYEES_3D: ReadonlyArray<readonly [number, number, number]> = [
  [1, 0, 6],
  [2, 1, 6],
  [3, 1, 9],
  [4, 3, 11],
  [5, 2, 12],
  [6, 4, 16],
];

function RegressionPlane() {
  // A simple oblique view: years run right, projects run back and right, salary runs up.
  const at = (years: number, projects: number, salary: number): [number, number] => [
    56 + 24 * years + 14 * projects,
    136 + 4 * years - 10 * projects - 5.2 * salary,
  ];
  const plane = (years: number, projects: number) => 3.35 + 1.625 * years + 0.525 * projects;
  const corner = (years: number, projects: number) => at(years, projects, plane(years, projects));
  const poly = (pts: Array<[number, number]>) => pts.map(([x, y]) => `${x},${y}`).join(' ');
  const floor = poly([at(0, 0, 0), at(7, 0, 0), at(7, 5, 0), at(0, 5, 0)]);
  const sheet = poly([corner(0, 0), corner(7, 0), corner(7, 5), corner(0, 5)]);
  const [ox, oy] = at(0, 0, 0);
  const [yx, yy] = at(7, 0, 0);
  const [px, py] = at(0, 5, 0);
  const [sx, sy] = at(0, 0, 20);
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Two features: the line becomes a plane
      </T>
      <polygon points={floor} className="fill-surface-2 stroke-line-2" strokeWidth={1} />
      <line x1={ox} y1={oy} x2={sx} y2={sy} className="stroke-line-2" strokeWidth={1} />
      <T x={sx + 4} y={sy + 2} size={8} anchor="start">
        salary
      </T>
      <T x={yx - 4} y={yy + 12} size={8} anchor="end">
        years of experience
      </T>
      <T x={px + 6} y={py - 4} size={8} anchor="start">
        projects
      </T>

      {/* The fitted plane slides in once the points are up. */}
      <Show from={0.28}>
        <polygon
          points={sheet}
          className="fill-g1 stroke-g1"
          fillOpacity={0.16}
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
      </Show>
      {EMPLOYEES_3D.map(([years, projects, salary]) => {
        const [x, y] = at(years, projects, salary);
        const [, onPlane] = at(years, projects, plane(years, projects));
        const [, onFloor] = at(years, projects, 0);
        return (
          <g key={years}>
            <line
              x1={x}
              y1={onFloor}
              x2={x}
              y2={y}
              className="stroke-line-2"
              strokeWidth={1}
              strokeDasharray="2 2"
            />
            {/* The gap between the employee and the plane: that employee's residual. */}
            <Show from={0.52}>
              <line
                x1={x}
                y1={onPlane}
                x2={x}
                y2={y}
                className={salary >= plane(years, projects) ? 'stroke-warn' : 'stroke-bad'}
                strokeWidth={2.4}
                strokeLinecap="round"
              />
            </Show>
            <circle cx={x} cy={y} r={3.6} className="fill-brand stroke-surface" strokeWidth={1} />
          </g>
        );
      })}
      <Show from={0.66}>
        <T x={160} y={190} size={9} mono bold tone="ink">
          ŷ = 3.35 + 1.625·years + 0.525·projects
        </T>
      </Show>
      <T x={160} y={203} size={8.5}>
        One weight per feature; each employee sits just above or below the plane
      </T>
    </>
  );
}

/** The bending data of the polynomial lab: sixteen points, every second one held back. */
const CURVE_POINTS: ReadonlyArray<readonly [number, number]> = [
  [0, 3.126],
  [0.4, 2.932],
  [0.8, 3.896],
  [1.2, 3.681],
  [1.6, 3.488],
  [2, 4.962],
  [2.4, 6.608],
  [2.8, 7.083],
  [3.2, 6.392],
  [3.6, 6.919],
  [4, 8.777],
  [4.4, 10.785],
  [4.8, 9.891],
  [5.2, 13.597],
  [5.6, 14.298],
  [6, 16.668],
];
const CURVE_SPLIT = splitHalves(CURVE_POINTS.length);
/** The curve each degree fits to the training half, as the lab computes it. */
const curveAt = (degree: number) =>
  polyFit(
    CURVE_SPLIT.train.map((i) => CURVE_POINTS[i]?.[0] ?? 0),
    CURVE_SPLIT.train.map((i) => CURVE_POINTS[i]?.[1] ?? 0),
    degree,
  ).at;

function PolynomialDegrees() {
  const panels = [
    { degree: 1, name: 'Degree 1', verdict: 'underfits', score: '0.87', tone: 'warn', from: 0.04 },
    { degree: 2, name: 'Degree 2', verdict: 'fits', score: '0.96', tone: 'ok', from: 0.34 },
    { degree: 7, name: 'Degree 7', verdict: 'overfits', score: '−7.4', tone: 'bad', from: 0.64 },
  ] as const;
  const held = new Set(CURVE_SPLIT.test);
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        The same points, three degrees
      </T>
      {panels.map((panel, k) => {
        const left = 14 + k * 102;
        const sx = (x: number) => left + 6 + (x / 6) * 78;
        const sy = (y: number) => 124 - (Math.min(18, Math.max(0, y)) / 18) * 92;
        const f = curveAt(panel.degree);
        const path = Array.from({ length: 61 }, (_, i) => {
          const x = (6 * i) / 60;
          return `${i === 0 ? 'M' : 'L'}${sx(x).toFixed(1)} ${sy(f(x)).toFixed(1)}`;
        }).join(' ');
        return (
          <g key={panel.degree}>
            <rect
              x={left}
              y={24}
              width={92}
              height={106}
              rx={8}
              className="fill-surface stroke-line"
              strokeWidth={1}
            />
            {CURVE_POINTS.map(([x, y], i) => (
              <circle
                key={x}
                cx={sx(x)}
                cy={sy(y)}
                r={2.2}
                className={held.has(i) ? 'fill-surface stroke-muted' : 'fill-muted stroke-muted'}
                strokeWidth={1}
              />
            ))}
            <Show from={panel.from}>
              <path
                d={path}
                className={cn(
                  'fill-none',
                  panel.tone === 'ok'
                    ? 'stroke-ok'
                    : panel.tone === 'bad'
                      ? 'stroke-bad'
                      : 'stroke-warn',
                )}
                strokeWidth={2}
                strokeLinejoin="round"
              />
              <T x={left + 46} y={144} size={9} bold tone="ink">
                {panel.name}
              </T>
              <T x={left + 46} y={156} size={8.5} tone={panel.tone}>
                {panel.verdict}
              </T>
              <T x={left + 46} y={168} size={8} mono>
                held-back R² {panel.score}
              </T>
            </Show>
          </g>
        );
      })}
      <T x={160} y={182} size={8.5}>
        Filled dots trained the curve; hollow dots were held back to test it
      </T>
    </>
  );
}

function BiasVarianceCurve() {
  // Error is 1 − R², from the lab's own fits. Degree 7 scores far off the chart on held-back data.
  const degrees = [1, 2, 3, 5, 7];
  const train = [0.107, 0.04, 0.035, 0.023, 0];
  const test = [0.131, 0.043, 0.036, 0.09, 0.2];
  const sx = (i: number) => 58 + i * 58;
  const sy = (error: number) => 132 - (Math.min(error, 0.16) / 0.16) * 96;
  const line = (values: number[]) =>
    values.map((v, i) => `${i === 0 ? 'M' : 'L'}${sx(i)} ${sy(v).toFixed(1)}`).join(' ');
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Training error keeps falling; held-back error turns back up
      </T>
      <line x1={44} y1={132} x2={304} y2={132} className="stroke-line-2" strokeWidth={1} />
      <line x1={44} y1={30} x2={44} y2={132} className="stroke-line-2" strokeWidth={1} />
      <T x={40} y={36} size={7.5} anchor="end">
        error
      </T>
      {degrees.map((d, i) => (
        <T key={d} x={sx(i)} y={144} size={8} mono>
          {d}
        </T>
      ))}
      <T x={174} y={156} size={8}>
        polynomial degree
      </T>

      <path
        d={line(train)}
        className="fill-none stroke-g1"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {train.map((v, i) => (
        <circle key={degrees[i]} cx={sx(i)} cy={sy(v)} r={2.6} className="fill-g1" />
      ))}
      <T x={sx(4) - 6} y={sy(0) - 6} size={8} anchor="end" tone="g1">
        training error
      </T>

      <Show from={0.25}>
        <path
          d={line(test)}
          className="fill-none stroke-bad"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {test.slice(0, 4).map((v, i) => (
          <circle key={degrees[i]} cx={sx(i)} cy={sy(v)} r={2.6} className="fill-bad" />
        ))}
        <T x={sx(4) + 4} y={40} size={8} anchor="end" tone="bad">
          held-back error ↑ off the chart
        </T>
      </Show>

      <Show from={0.5}>
        <T x={sx(0) + 4} y={60} size={8} anchor="start" tone="warn">
          underfitting
        </T>
        <T x={sx(0) + 4} y={70} size={7.5} anchor="start">
          high bias
        </T>
        <T x={sx(3) + 26} y={86} size={8} tone="bad">
          overfitting
        </T>
        <T x={sx(3) + 26} y={96} size={7.5}>
          high variance
        </T>
      </Show>
      <Show from={0.7}>
        <line
          x1={sx(2)}
          y1={sy(0.036) + 5}
          x2={sx(2)}
          y2={132}
          className="stroke-ok"
          strokeWidth={1.4}
          strokeDasharray="3 3"
        />
        <circle
          cx={sx(2)}
          cy={sy(0.036)}
          r={4.2}
          className="fill-ok stroke-surface"
          strokeWidth={1}
        />
        <T x={sx(2)} y={sy(0.036) - 9} size={8.5} bold tone="ok">
          best: degree 3
        </T>
      </Show>
      <T x={160} y={170} size={8.5}>
        Choose the degree where the held-back error is lowest
      </T>
    </>
  );
}

/** Ten students: hours of practice a week, and whether they cleared the test. */
const STUDENTS: ReadonlyArray<readonly [number, 0 | 1]> = [
  [1, 0],
  [2, 0],
  [3, 0],
  [4, 1],
  [5, 0],
  [6, 1],
  [7, 0],
  [8, 1],
  [9, 1],
  [10, 1],
];
/** The maximum-likelihood fit to those ten students: p = sigmoid(0.6767·hours − 3.7219). */
const cleared = (hours: number) => sigmoid(0.6767 * hours - 3.7219);

function LineVsSigmoid() {
  // Hours 0–14 across; the vertical axis runs past 0 and 1 so the line can be seen leaving them.
  const px = (hours: number) => 44 + (hours / 14) * 262;
  const py = (v: number) => 124 - ((v + 0.3) / 1.9) * 100;
  const straight = (hours: number) => 0.11515 * hours - 0.13333; // least squares on the 0/1 labels
  const curve = Array.from({ length: 71 }, (_, i) => {
    const hours = (14 * i) / 70;
    return `${i === 0 ? 'M' : 'L'}${px(hours).toFixed(1)} ${py(cleared(hours)).toFixed(1)}`;
  }).join(' ');
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        A line leaves 0 and 1; the sigmoid cannot
      </T>
      {[0, 0.5, 1].map((v) => (
        <g key={v}>
          <line
            x1={44}
            y1={py(v)}
            x2={306}
            y2={py(v)}
            className="stroke-line-2"
            strokeWidth={1}
            strokeDasharray={v === 0.5 ? '2 4' : undefined}
          />
          <T x={39} y={py(v) + 3} size={7.5} anchor="end" mono>
            {v}
          </T>
        </g>
      ))}
      {[2, 4, 6, 8, 10, 12, 14].map((v) => (
        <T key={v} x={px(v)} y={136} size={7.5} mono>
          {v}
        </T>
      ))}
      <T x={175} y={148} size={8}>
        hours of practice a week
      </T>
      <T x={44} y={22} size={8} anchor="start">
        probability of clearing
      </T>
      {STUDENTS.map(([hours, y]) => (
        <circle
          key={hours}
          cx={px(hours)}
          cy={py(y)}
          r={3.6}
          className={y === 1 ? 'fill-brand stroke-surface' : 'fill-muted stroke-surface'}
          strokeWidth={1}
        />
      ))}

      {/* First the straight line, which a student would try; it strays outside 0 to 1. */}
      <Show from={0.08} to={0.5} final={false}>
        <line
          x1={px(0)}
          y1={py(straight(0))}
          x2={px(14)}
          y2={py(straight(14))}
          className="stroke-bad"
          strokeWidth={2.2}
          strokeLinecap="round"
        />
        <circle cx={px(14)} cy={py(straight(14))} r={3.4} className="fill-bad" />
        <T x={px(14) - 6} y={py(straight(14)) - 5} size={8.5} anchor="end" mono bold tone="bad">
          1.48 at 14 hours
        </T>
        <T x={px(0) + 6} y={py(straight(0)) + 12} size={8.5} anchor="start" mono bold tone="bad">
          below 0
        </T>
      </Show>
      {/* Then the sigmoid, which flattens out at both ends. */}
      <Show from={0.55}>
        <path d={curve} className="fill-none stroke-g1" strokeWidth={2.4} strokeLinejoin="round" />
        <line
          x1={px(5.5)}
          y1={py(0.5)}
          x2={px(5.5)}
          y2={124 + 4}
          className="stroke-ok"
          strokeWidth={1.2}
          strokeDasharray="3 3"
        />
        <circle
          cx={px(5.5)}
          cy={py(0.5)}
          r={3.6}
          className="fill-ok stroke-surface"
          strokeWidth={1}
        />
        <T x={px(5.5) + 6} y={py(0.5) + 12} size={8.5} anchor="start" mono bold tone="ok">
          0.5 at 5.5 hours
        </T>
      </Show>
      <T x={160} y={164} size={9}>
        The sigmoid squeezes any score into a probability between 0 and 1
      </T>
    </>
  );
}

function LogLossCurve() {
  // Predicted probability across; the loss for a row whose true label is 1, which is −ln p.
  const px = (prob: number) => 46 + prob * 256;
  const py = (loss: number) => 132 - (Math.min(loss, 4) / 4) * 100;
  const curve = Array.from({ length: 81 }, (_, i) => {
    const prob = 0.018 + (0.982 * i) / 80;
    return `${i === 0 ? 'M' : 'L'}${px(prob).toFixed(1)} ${py(-Math.log(prob)).toFixed(1)}`;
  }).join(' ');
  const marks = (
    [
      { prob: 0.9, tone: 'ok', from: 0.3, note: 'confident and right' },
      { prob: 0.5, tone: 'warn', from: 0.48, note: 'a coin toss' },
      { prob: 0.2, tone: 'bad', from: 0.66, note: 'confident and wrong' },
    ] as const
  ).map((m) => ({ ...m, loss: -Math.log(m.prob) }));
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Log loss when the true label is 1
      </T>
      <line x1={46} y1={132} x2={302} y2={132} className="stroke-line-2" strokeWidth={1} />
      <line x1={46} y1={28} x2={46} y2={132} className="stroke-line-2" strokeWidth={1} />
      {[0, 1, 2, 3, 4].map((v) => (
        <T key={v} x={41} y={py(v) + 3} size={7.5} anchor="end" mono>
          {v}
        </T>
      ))}
      {[0, 0.25, 0.5, 0.75, 1].map((v) => (
        <T key={v} x={px(v)} y={144} size={7.5} mono>
          {v}
        </T>
      ))}
      <T x={174} y={156} size={8}>
        predicted probability p
      </T>
      <T x={50} y={26} size={8} anchor="start">
        loss = −ln p
      </T>
      <path d={curve} className="fill-none stroke-g1" strokeWidth={2.2} strokeLinejoin="round" />
      {marks.map((m) => (
        <Show key={m.prob} from={m.from}>
          <line
            x1={px(m.prob)}
            y1={py(m.loss)}
            x2={px(m.prob)}
            y2={132}
            className={
              m.tone === 'ok' ? 'stroke-ok' : m.tone === 'bad' ? 'stroke-bad' : 'stroke-warn'
            }
            strokeWidth={1.2}
            strokeDasharray="3 3"
          />
          <circle
            cx={px(m.prob)}
            cy={py(m.loss)}
            r={3.8}
            className={cn(
              'stroke-surface',
              m.tone === 'ok' ? 'fill-ok' : m.tone === 'bad' ? 'fill-bad' : 'fill-warn',
            )}
            strokeWidth={1}
          />
          <T
            x={px(m.prob) + (m.prob < 0.3 ? 7 : 0)}
            y={py(m.loss) - 8}
            size={8.5}
            anchor={m.prob < 0.3 ? 'start' : 'middle'}
            mono
            bold
            tone={m.tone}
          >
            {m.loss.toFixed(3)}
          </T>
          <T
            x={px(m.prob) + (m.prob < 0.3 ? 7 : 0)}
            y={py(m.loss) - 18}
            size={7.5}
            anchor={m.prob < 0.3 ? 'start' : 'middle'}
          >
            {m.note}
          </T>
        </Show>
      ))}
      <T x={160} y={170} size={9}>
        The surer the model is of a wrong answer, the more it pays
      </T>
    </>
  );
}

function ThresholdTradeoff() {
  // The ten students placed by predicted probability; the threshold moves 0.3 → 0.5 → 0.7.
  const px = (prob: number) => 30 + prob * 260;
  const stops = [0.3, 0.5, 0.7];
  const phases = [
    { from: 0.04, to: 0.34, text: 'Threshold 0.3: 2 false alarms, 1 miss' },
    { from: 0.37, to: 0.67, text: 'Threshold 0.5: 1 false alarm, 1 miss' },
    { from: 0.7, to: undefined, text: 'Threshold 0.7: 1 false alarm, 2 misses' },
  ];
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Moving the threshold trades misses for false alarms
      </T>
      <line x1={30} y1={84} x2={290} y2={84} className="stroke-line-2" strokeWidth={1.2} />
      {[0, 0.25, 0.5, 0.75, 1].map((v) => (
        <g key={v}>
          <line x1={px(v)} y1={81} x2={px(v)} y2={87} className="stroke-line-2" strokeWidth={1} />
          <T x={px(v)} y={99} size={7.5} mono>
            {v}
          </T>
        </g>
      ))}
      <T x={160} y={111} size={8}>
        predicted probability of clearing
      </T>
      {STUDENTS.map(([hours, y]) => (
        <circle
          key={hours}
          cx={px(cleared(hours))}
          cy={y === 1 ? 62 : 74}
          r={4.2}
          className={y === 1 ? 'fill-brand stroke-surface' : 'fill-muted stroke-surface'}
          strokeWidth={1}
        />
      ))}
      <T x={296} y={65} size={7.5} anchor="start" tone="brand">
        cleared
      </T>
      <T x={296} y={77} size={7.5} anchor="start">
        did not
      </T>

      {/* The threshold: everything to its right is predicted "cleared". */}
      <g>
        <line x1={0} y1={30} x2={0} y2={90} className="stroke-ink" strokeWidth={1.8}>
          <Anim
            attr="x1"
            keys={[
              [0, px(stops[0] as number)],
              [0.34, px(stops[0] as number)],
              [0.4, px(stops[1] as number)],
              [0.67, px(stops[1] as number)],
              [0.73, px(stops[2] as number)],
              [1, px(stops[2] as number)],
            ]}
          />
          <Anim
            attr="x2"
            keys={[
              [0, px(stops[0] as number)],
              [0.34, px(stops[0] as number)],
              [0.4, px(stops[1] as number)],
              [0.67, px(stops[1] as number)],
              [0.73, px(stops[2] as number)],
              [1, px(stops[2] as number)],
            ]}
          />
        </line>
      </g>
      <T x={160} y={28} size={8} tone="ink">
        predicted "did not" ← threshold → predicted "cleared"
      </T>
      {phases.map((ph) => (
        <Show key={ph.text} from={ph.from} to={ph.to} final={ph.to === undefined}>
          <T x={160} y={132} size={10} bold tone="ink">
            {ph.text}
          </T>
        </Show>
      ))}
      <T x={160} y={150} size={8.5}>
        Lower threshold: more positives caught, more false alarms raised
      </T>
    </>
  );
}

const LIBRARY: Record<AnimationName, { viewBox: string; dur: number; Draw: () => ReactNode }> = {
  ...KNN_LIBRARY,
  ...LINREG_LIBRARY,
  ...LOGREG_LIBRARY,
  'name-tags': { viewBox: '0 0 320 176', dur: 10, Draw: NameTags },
  'list-vs-tuple': { viewBox: '0 0 320 180', dur: 9, Draw: ListVsTuple },
  'set-dedupe': { viewBox: '0 0 320 180', dur: 10, Draw: SetDedupe },
  'dict-lookup': { viewBox: '0 0 320 176', dur: 8, Draw: DictLookup },
  'function-machine': { viewBox: '0 0 320 160', dur: 9, Draw: FunctionMachine },
  'decorator-wrap': { viewBox: '0 0 320 182', dur: 10, Draw: DecoratorWrap },
  'comprehension-filter': { viewBox: '0 0 320 160', dur: 10, Draw: ComprehensionFilter },
  'generator-belt': { viewBox: '0 0 320 174', dur: 10, Draw: GeneratorBelt },
  'try-except-net': { viewBox: '0 0 320 176', dur: 9, Draw: TryExceptNet },
  'async-waiter': { viewBox: '0 0 320 186', dur: 9, Draw: AsyncWaiter },
  'gil-baton': { viewBox: '0 0 320 162', dur: 9, Draw: GilBaton },
  'class-blueprint': { viewBox: '0 0 320 182', dur: 9, Draw: ClassBlueprint },
  'self-binding': { viewBox: '0 0 320 172', dur: 8, Draw: SelfBinding },
  'inheritance-tree': { viewBox: '0 0 320 184', dur: 9, Draw: InheritanceTree },
  'polymorphism-pay': { viewBox: '0 0 320 170', dur: 9, Draw: PolymorphismPay },
  'encapsulation-wallet': { viewBox: '0 0 320 172', dur: 10, Draw: EncapsulationWallet },
  'abstraction-panel': { viewBox: '0 0 320 168', dur: 9, Draw: AbstractionPanel },
  'class-vs-instance': { viewBox: '0 0 320 180', dur: 10, Draw: ClassVsInstance },
  'intro-trailer': { viewBox: '0 0 320 172', dur: 9, Draw: IntroTrailer },
  'star-timeline': { viewBox: '0 0 320 172', dur: 9, Draw: StarTimeline },
  'ctc-split': { viewBox: '0 0 320 176', dur: 8, Draw: CtcSplit },
  'scatter-line': { viewBox: '0 0 240 130', dur: 4, Draw: ScatterLine },
  residuals: { viewBox: '0 0 240 130', dur: 3, Draw: Residuals },
  'loss-bowl': { viewBox: '0 0 240 130', dur: 4, Draw: LossBowl },
  'learning-rate': { viewBox: '0 0 240 112', dur: 6, Draw: LearningRate },
  'train-test-split': { viewBox: '0 0 240 104', dur: 3.5, Draw: TrainTestSplit },
  'overfit-underfit': { viewBox: '0 0 240 112', dur: 6, Draw: OverfitUnderfit },
  'labels-vs-no-labels': { viewBox: '0 0 240 130', dur: 4, Draw: LabelsVsNoLabels },
  'decision-boundary': { viewBox: '0 0 240 130', dur: 3, Draw: DecisionBoundary },
  clusters: { viewBox: '0 0 240 130', dur: 4, Draw: Clusters },
  neuron: { viewBox: '0 0 240 130', dur: 2, Draw: Neuron },
  network: { viewBox: '0 0 240 130', dur: 2, Draw: Network },
  'activation-curves': { viewBox: '0 0 240 124', dur: 5, Draw: ActivationCurves },
  'forward-backward': { viewBox: '0 0 320 178', dur: 10, Draw: ForwardBackward },
  'optimizer-paths': { viewBox: '0 0 320 182', dur: 8, Draw: OptimizerPaths },
  'dropout-net': { viewBox: '0 0 320 178', dur: 9, Draw: DropoutNet },
  'early-stopping': { viewBox: '0 0 320 170', dur: 9, Draw: EarlyStopping },
  'batch-norm': { viewBox: '0 0 320 168', dur: 8, Draw: BatchNorm },
  'vanishing-gradient': { viewBox: '0 0 320 166', dur: 8, Draw: VanishingGradient },
  'conv-filter': { viewBox: '0 0 320 174', dur: 10, Draw: ConvFilter },
  'max-pool': { viewBox: '0 0 320 172', dur: 8, Draw: MaxPool },
  'cnn-pipeline': { viewBox: '0 0 320 172', dur: 9, Draw: CnnPipeline },
  'feature-hierarchy': { viewBox: '0 0 320 172', dur: 9, Draw: FeatureHierarchy },
  'transfer-learning': { viewBox: '0 0 320 180', dur: 10, Draw: TransferLearning },
  'iou-boxes': { viewBox: '0 0 320 174', dur: 9, Draw: IouBoxes },
  'nms-boxes': { viewBox: '0 0 320 174', dur: 9, Draw: NmsBoxes },
  'review-sorter': { viewBox: '0 0 320 168', dur: 10, Draw: ReviewSorter },
  'token-pipeline': { viewBox: '0 0 320 160', dur: 9, Draw: TokenPipeline },
  'stem-vs-lemma': { viewBox: '0 0 320 162', dur: 8, Draw: StemVsLemma },
  'bag-of-words': { viewBox: '0 0 320 160', dur: 9, Draw: BagOfWords },
  'tfidf-weights': { viewBox: '0 0 320 162', dur: 9, Draw: TfidfWeights },
  'embedding-space': { viewBox: '0 0 320 176', dur: 10, Draw: EmbeddingSpace },
  'word-analogy': { viewBox: '0 0 320 168', dur: 9, Draw: WordAnalogy },
  'seq-vs-parallel': { viewBox: '0 0 320 160', dur: 8, Draw: SeqVsParallel },
  'rnn-unroll': { viewBox: '0 0 320 172', dur: 9, Draw: RnnUnroll },
  'lstm-gates': { viewBox: '0 0 320 174', dur: 9, Draw: LstmGates },
  'attention-weights': { viewBox: '0 0 320 158', dur: 9, Draw: AttentionWeights },
  'qkv-lookup': { viewBox: '0 0 320 168', dur: 10, Draw: QkvLookup },
  'multi-head': { viewBox: '0 0 320 164', dur: 9, Draw: MultiHead },
  'transformer-blocks': { viewBox: '0 0 320 186', dur: 10, Draw: TransformerBlocks },
  'bert-vs-gpt': { viewBox: '0 0 320 168', dur: 9, Draw: BertVsGpt },
  'causal-mask': { viewBox: '0 0 320 170', dur: 9, Draw: CausalMask },
  'next-token-loop': { viewBox: '0 0 320 156', dur: 10, Draw: NextTokenLoop },
  'tokenizer-split': { viewBox: '0 0 320 164', dur: 8, Draw: TokenizerSplit },
  'context-window': { viewBox: '0 0 320 156', dur: 10, Draw: ContextWindow },
  'llm-training-stages': { viewBox: '0 0 320 154', dur: 10, Draw: LlmTrainingStages },
  'genai-types': { viewBox: '0 0 320 170', dur: 8, Draw: GenaiTypes },
  'bpe-merges': { viewBox: '0 0 320 162', dur: 9, Draw: BpeMerges },
  'prompt-anatomy': { viewBox: '0 0 320 168', dur: 9, Draw: PromptAnatomy },
  'few-shot-pattern': { viewBox: '0 0 320 148', dur: 9, Draw: FewShotPattern },
  'chain-of-thought': { viewBox: '0 0 320 158', dur: 9, Draw: ChainOfThought },
  'temperature-dial': { viewBox: '0 0 320 176', dur: 10, Draw: TemperatureDial },
  'top-p-nucleus': { viewBox: '0 0 320 158', dur: 9, Draw: TopPNucleus },
  'hallucination-grounding': { viewBox: '0 0 320 164', dur: 10, Draw: HallucinationGrounding },
  'guardrails-pipeline': { viewBox: '0 0 320 160', dur: 11, Draw: GuardrailsPipeline },
  'agent-loop': { viewBox: '0 0 320 168', dur: 11, Draw: AgentLoop },
  'tool-call-roundtrip': { viewBox: '0 0 320 174', dur: 10, Draw: ToolCallRoundtrip },
  'chain-vs-graph': { viewBox: '0 0 320 160', dur: 10, Draw: ChainVsGraph },
  'mcp-hub': { viewBox: '0 0 320 162', dur: 9, Draw: McpHub },
  'multi-agent-orchestrator': { viewBox: '0 0 320 158', dur: 10, Draw: MultiAgentOrchestrator },
  'coding-round-steps': { viewBox: '0 0 320 136', dur: 10, Draw: CodingRoundSteps },
  'two-pointer-palindrome': { viewBox: '0 0 320 154', dur: 9, Draw: TwoPointerPalindrome },
  'char-frequency-count': { viewBox: '0 0 320 158', dur: 10, Draw: CharFrequencyCount },
  'second-largest-scan': { viewBox: '0 0 320 158', dur: 12, Draw: SecondLargestScan },
  'prime-divisor-check': { viewBox: '0 0 320 158', dur: 11, Draw: PrimeDivisorCheck },
  'fibonacci-window': { viewBox: '0 0 320 146', dur: 10, Draw: FibonacciWindow },
  'ai-ml-dl-circles': { viewBox: '0 0 320 168', dur: 9, Draw: AiMlDlCircles },
  'rl-loop': { viewBox: '0 0 320 170', dur: 11, Draw: RlLoop },
  'ml-lifecycle': { viewBox: '0 0 320 172', dur: 12, Draw: MlLifecycle },
  'bias-variance-darts': { viewBox: '0 0 320 158', dur: 10, Draw: BiasVarianceDarts },
  'kfold-rotation': { viewBox: '0 0 320 170', dur: 11, Draw: KfoldRotation },
  'l1-l2-shrink': { viewBox: '0 0 320 172', dur: 10, Draw: L1L2Shrink },
  'big-o-growth': { viewBox: '0 0 320 178', dur: 10, Draw: BigOGrowth },
  'two-sum-hashmap': { viewBox: '0 0 320 162', dur: 11, Draw: TwoSumHashmap },
  'container-water': { viewBox: '0 0 320 178', dur: 12, Draw: ContainerWater },
  'binary-search-halving': { viewBox: '0 0 320 172', dur: 11, Draw: BinarySearchHalving },
  'fixed-window-sum': { viewBox: '0 0 320 158', dur: 10, Draw: FixedWindowSum },
  'sliding-window-unique': { viewBox: '0 0 320 162', dur: 13, Draw: SlidingWindowUnique },
  'bracket-stack': { viewBox: '0 0 320 180', dur: 11, Draw: BracketStack },
  'recursion-call-stack': { viewBox: '0 0 320 180', dur: 11, Draw: RecursionCallStack },
  'missing-fill': { viewBox: '0 0 320 170', dur: 10, Draw: MissingFill },
  'iqr-fences': { viewBox: '0 0 320 168', dur: 11, Draw: IqrFences },
  'dedupe-rows': { viewBox: '0 0 320 188', dur: 11, Draw: DedupeRows },
  'one-hot-vs-label': { viewBox: '0 0 320 176', dur: 10, Draw: OneHotVsLabel },
  'scaling-squash': { viewBox: '0 0 320 170', dur: 11, Draw: ScalingSquash },
  'fit-on-train': { viewBox: '0 0 320 184', dur: 11, Draw: FitOnTrain },
  'loc-vs-iloc': { viewBox: '0 0 320 158', dur: 12, Draw: LocVsIloc },
  'groupby-split-apply': { viewBox: '0 0 320 178', dur: 11, Draw: GroupbySplitApply },
  'merge-joins': { viewBox: '0 0 320 172', dur: 12, Draw: MergeJoins },
  'same-mean-spread': { viewBox: '0 0 320 172', dur: 10, Draw: SameMeanSpread },
  'mean-median-skew': { viewBox: '0 0 320 170', dur: 10, Draw: MeanMedianSkew },
  'normal-68-95': { viewBox: '0 0 320 168', dur: 10, Draw: Normal689599 },
  'correlation-scatter': { viewBox: '0 0 320 174', dur: 11, Draw: CorrelationScatter },
  'pvalue-tail': { viewBox: '0 0 320 174', dur: 11, Draw: PValueTail },
  'line-of-best-fit': { viewBox: '0 0 320 176', dur: 10, Draw: LineOfBestFit },
  'regression-plane': { viewBox: '0 0 320 210', dur: 10, Draw: RegressionPlane },
  'polynomial-degrees': { viewBox: '0 0 320 188', dur: 11, Draw: PolynomialDegrees },
  'bias-variance-curve': { viewBox: '0 0 320 176', dur: 11, Draw: BiasVarianceCurve },
  'line-vs-sigmoid': { viewBox: '0 0 320 170', dur: 11, Draw: LineVsSigmoid },
  'log-loss-curve': { viewBox: '0 0 320 176', dur: 11, Draw: LogLossCurve },
  'threshold-tradeoff': { viewBox: '0 0 320 158', dur: 12, Draw: ThresholdTradeoff },
  'list-vs-array': { viewBox: '0 0 320 184', dur: 11, Draw: ListVsArray },
  'vectorized-vs-loop': { viewBox: '0 0 320 176', dur: 12, Draw: VectorizedVsLoop },
  'array-axes': { viewBox: '0 0 320 166', dur: 10, Draw: ArrayAxes },
  'slice-2d': { viewBox: '0 0 320 172', dur: 12, Draw: Slice2d },
  'boolean-mask': { viewBox: '0 0 320 180', dur: 11, Draw: BooleanMask },
  'view-vs-copy': { viewBox: '0 0 320 182', dur: 12, Draw: ViewVsCopy },
  'axis-collapse': { viewBox: '0 0 320 180', dur: 12, Draw: AxisCollapse },
  'broadcast-stretch': { viewBox: '0 0 320 180', dur: 12, Draw: BroadcastStretch },
  'broadcast-rules': { viewBox: '0 0 320 184', dur: 13, Draw: BroadcastRules },
  'reshape-flow': { viewBox: '0 0 320 184', dur: 12, Draw: ReshapeFlow },
  'dot-product-steps': { viewBox: '0 0 320 184', dur: 11, Draw: DotProductSteps },
  'dot-angle': { viewBox: '0 0 320 174', dur: 12, Draw: DotAngle },
  'l1-vs-l2-norm': { viewBox: '0 0 320 176', dur: 11, Draw: L1VsL2Norm },
  'matmul-row-col': { viewBox: '0 0 320 178', dur: 13, Draw: MatmulRowCol },
  'batch-similarity': { viewBox: '0 0 320 188', dur: 12, Draw: BatchSimilarity },
};

/** One moving picture, framed like a figure, with an optional caption. */
export function AnimationView({
  name,
  caption,
  className,
}: {
  name: AnimationName;
  caption?: string;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const uid = `anim${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const entry = LIBRARY[name];
  if (!entry) return null;
  const { viewBox, dur, Draw } = entry;
  return (
    <figure className={cn('grid gap-2', className)}>
      <div className="rounded-2xl border border-line bg-surface p-3 shadow-soft">
        <svg
          viewBox={viewBox}
          // 260px tall at most, unless the host says how much room it has with --fig-h (slide
          // decks do, from the height the window leaves them): then the picture grows or
          // shrinks to that instead of pushing content out.
          className="mx-auto block h-auto max-h-[var(--fig-h,260px)] w-full"
          role="img"
          aria-label={ANIMATIONS[name]}
          data-anim
        >
          <AnimCtx.Provider value={{ still: reduced, dur, uid }}>
            <Markers />
            <Draw />
          </AnimCtx.Provider>
        </svg>
      </div>
      {caption && (
        <figcaption className="text-center font-mono text-[11.5px] tracking-wide text-muted">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

/** For tests and the admin preview: every animation the library can draw. */
export const ANIMATION_LIBRARY_NAMES = Object.keys(LIBRARY) as AnimationName[];
