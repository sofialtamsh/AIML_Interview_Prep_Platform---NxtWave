/**
 * Moving pictures for the K-nearest neighbours unit, drawn from the unit's own example and numbers. Each is
 * registered here and described in @app/content (animations-knn.ts); see anim-kit.tsx for the
 * helpers and the rules every picture follows.
 *
 * Every number is computed with the lab's own maths (../knn.ts) from the lesson's 13 films, so a
 * picture cannot drift from the lab.
 */
import type { AnimationName } from '@app/content';
import type { ReactNode } from 'react';
import { Anim, Box, drawKeys, Move, Show, T } from '../anim-kit';
import { distance, type Pt as Film, type Neighbour, rankAll, vote, type XY } from '../knn';

/**
 * The films one user rated, as in the lesson (FILMS in k-nearest-neighbors.lesson.ts) and its lab:
 * action score, comedy score, and class 0 = liked, 1 = skipped. Same order, so ties break the same way.
 */
const FILMS: readonly Film[] = [
  { x: 7, y: 3, cls: 0 },
  { x: 8, y: 5, cls: 0 },
  { x: 6, y: 4, cls: 0 },
  { x: 9, y: 2, cls: 0 },
  { x: 7, y: 6, cls: 0 },
  { x: 5, y: 2, cls: 0 },
  { x: 4, y: 6, cls: 0 },
  { x: 2, y: 7, cls: 1 },
  { x: 3, y: 5, cls: 1 },
  { x: 1, y: 4, cls: 1 },
  { x: 4, y: 8, cls: 1 },
  { x: 2, y: 2, cls: 1 },
  { x: 5, y: 7, cls: 1 },
];
const NAMES = ['Liked', 'Skipped'] as const;
const nameOf = (cls: number) => NAMES[cls === 1 ? 1 : 0];
const FILL = ['fill-brand', 'fill-warn'] as const;
const STROKE = ['stroke-brand', 'stroke-warn'] as const;

const n2 = (v: number) => String(+v.toFixed(2));
const at = (p: XY) => `${p.x}-${p.y}`;
const coords = (p: XY) => `(${p.x}, ${p.y})`;

/** Action 0–10 across and comedy 0–10 up, `u` px per score point, the origin at (x0, y0). */
function chart(x0: number, y0: number, u: number) {
  return { px: (a: number) => x0 + a * u, py: (c: number) => y0 - c * u };
}
type Chart = ReturnType<typeof chart>;

/**
 * A film as the lab draws it: a circle if liked, a square if skipped; grey when labels are not
 * used. `kept` draws it larger with an ink edge, as the lab marks the K nearest.
 */
function Mark({
  p,
  c,
  r = 4,
  plain = false,
  kept = false,
}: {
  p: Film;
  c: Chart;
  r?: number;
  plain?: boolean;
  kept?: boolean;
}) {
  const x = c.px(p.x);
  const y = c.py(p.y);
  const edge = kept ? 'stroke-ink' : 'stroke-surface';
  const width = kept ? 1.3 : 1;
  if (plain)
    return <circle cx={x} cy={y} r={r} className={`fill-muted ${edge}`} strokeWidth={width} />;
  if (p.cls === 1)
    return (
      <rect
        x={x - r}
        y={y - r}
        width={2 * r}
        height={2 * r}
        rx={1.2}
        className={`fill-warn ${edge}`}
        strokeWidth={width}
      />
    );
  return <circle cx={x} cy={y} r={r} className={`fill-brand ${edge}`} strokeWidth={width} />;
}

/** The action and comedy axes, 0 to 10. */
function Axes({ c }: { c: Chart }) {
  return (
    <>
      <line
        x1={c.px(0)}
        y1={c.py(10)}
        x2={c.px(0)}
        y2={c.py(0)}
        className="stroke-line-2"
        strokeWidth={1}
      />
      <line
        x1={c.px(0)}
        y1={c.py(0)}
        x2={c.px(10)}
        y2={c.py(0)}
        className="stroke-line-2"
        strokeWidth={1}
      />
      {[0, 5, 10].map((v) => (
        <T key={`y${v}`} x={c.px(0) - 5} y={c.py(v) + 3} size={7.5} anchor="end" mono>
          {v}
        </T>
      ))}
      {[5, 10].map((v) => (
        <T key={`x${v}`} x={c.px(v)} y={c.py(0) + 10} size={7.5} mono>
          {v}
        </T>
      ))}
      <T x={(c.px(0) + c.px(10)) / 2} y={c.py(0) + 21} size={8}>
        action score
      </T>
      <T x={c.px(0)} y={c.py(10) - 6} size={8} anchor="start">
        comedy score
      </T>
    </>
  );
}

/** Shown from `from` until `to` with no fade, for a counter that ticks faster than a fade. */
function Swap({
  from,
  to,
  final,
  children,
}: {
  from: number;
  to?: number;
  final: boolean;
  children: ReactNode;
}) {
  const keys: Array<readonly [number, number]> = [
    [0, 0],
    [from, 1],
  ];
  if (to !== undefined) keys.push([to, 0]);
  return (
    <g opacity={final ? 1 : 0}>
      <Anim attr="opacity" keys={keys} discrete />
      {children}
    </g>
  );
}

/** A line that draws itself from `a` (or `gap` past it) to `b` between two loop times. */
function DrawLine({
  a,
  b,
  from,
  className,
  width = 0.9,
  gap = 0,
}: {
  a: readonly [number, number];
  b: readonly [number, number];
  from: number;
  className: string;
  width?: number;
  gap?: number;
}) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const sx = a[0] + ((b[0] - a[0]) / len) * gap;
  const sy = a[1] + ((b[1] - a[1]) / len) * gap;
  return (
    <path
      d={`M${+sx.toFixed(2)} ${+sy.toFixed(2)} L${b[0]} ${b[1]}`}
      pathLength={1}
      strokeDasharray="1"
      strokeWidth={width}
      strokeLinecap="round"
      className={`fill-none ${className}`}
    >
      <Anim attr="stroke-dashoffset" keys={drawKeys(from, from + 0.03)} />
    </path>
  );
}

/** The new film: a "?" that takes the colour of its prediction once the vote is in. */
function Query({ x, y, r = 7, cls }: { x: number; y: number; r?: number; cls?: number }) {
  const filled = cls !== undefined;
  return (
    <>
      <circle
        cx={x}
        cy={y}
        r={r}
        className={filled ? `${FILL[cls % 2]} stroke-ink` : 'fill-surface stroke-ink'}
        strokeWidth={1.4}
      />
      <T x={x} y={y + 3.2} size={9} bold tone={filled ? 'surface' : 'ink'}>
        ?
      </T>
    </>
  );
}

// ───────────── 1. Lazy: fitting stores the films, predicting does the work ─────────────

function KnnLazyFit() {
  const c = chart(30, 186, 15);
  const q = { x: 6, y: 6 };
  const k = 3;
  const near = rankAll(FILMS, q, 'euclidean').slice(0, k);
  const v = vote(near, 2, false);
  const other = v.winner === 0 ? 1 : 0;
  const qx = c.px(q.x);
  const qy = c.py(q.y);
  // The films arrive one by one (fit), then the new film measures each in the same order (predict).
  const shown = (i: number) => 0.03 + i * 0.014;
  const drawn = (i: number) => 0.36 + i * 0.013;
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Fitting stores the films; predicting does the work
      </T>
      <Axes c={c} />
      <circle cx={142} cy={43} r={3.5} className="fill-brand stroke-surface" strokeWidth={1} />
      <T x={149} y={46} size={7.5} anchor="start">
        liked
      </T>
      <rect x={138.5} y={51.5} width={7} height={7} rx={1.2} className="fill-warn stroke-surface" />
      <T x={149} y={58} size={7.5} anchor="start">
        skipped
      </T>

      {/* One distance per stored film; once the 3 nearest are kept, the rest fade back. */}
      <g opacity={0.35}>
        <Anim
          attr="opacity"
          keys={[
            [0, 1],
            [0.6, 1],
            [0.65, 0.35],
          ]}
        />
        {FILMS.map((p, i) => (
          <DrawLine
            key={at(p)}
            a={[qx, qy]}
            b={[c.px(p.x), c.py(p.y)]}
            from={drawn(i)}
            className="stroke-muted"
          />
        ))}
      </g>
      <Show from={0.62}>
        {near.map((n) => (
          <line
            key={at(n.point)}
            x1={qx}
            y1={qy}
            x2={c.px(n.point.x)}
            y2={c.py(n.point.y)}
            strokeWidth={2.4}
            strokeLinecap="round"
            className={STROKE[n.point.cls % 2]}
          />
        ))}
      </Show>
      {FILMS.map((p, i) => (
        <Show key={at(p)} from={shown(i)}>
          <Mark p={p} c={c} />
        </Show>
      ))}
      <Show from={0.62}>
        {near.map((n) => (
          <Mark key={at(n.point)} p={n.point} c={c} r={5.4} kept />
        ))}
      </Show>
      <Show from={0.32} to={0.76} final={false}>
        <Query x={qx} y={qy} />
      </Show>
      <Show from={0.76}>
        <Query x={qx} y={qy} cls={v.winner} />
      </Show>

      {/* Step 1: fit. */}
      <Box x={196} y={34} w={118} h={64} />
      <Show to={0.3} final={false}>
        <Box x={196} y={34} w={118} h={64} tone="brand" />
      </Show>
      <T x={204} y={49} size={9} anchor="start" mono bold tone="ink">
        fit(X, y)
      </T>
      <T x={306} y={49} size={7.5} anchor="end">
        training
      </T>
      <Show from={0.06}>
        <T x={204} y={65} size={8.5} anchor="start" tone="ink">
          stores the {FILMS.length} films
        </T>
      </Show>
      <Show from={0.2}>
        <T x={204} y={78} size={8.5} anchor="start" tone="ink">
          learns no weights
        </T>
      </Show>
      <Show from={0.24}>
        <T x={204} y={91} size={8.5} anchor="start" bold tone="brand">
          the data is the model
        </T>
      </Show>

      {/* Step 2: predict. */}
      <Box x={196} y={106} w={118} h={80} />
      <Show from={0.32}>
        <Box x={196} y={106} w={118} h={80} tone="brand" />
      </Show>
      <T x={204} y={121} size={9} anchor="start" mono bold tone="ink">
        predict(?)
      </T>
      <T x={306} y={121} size={7.5} anchor="end">
        every query
      </T>
      <Show from={0.5}>
        <T x={204} y={137} size={8.5} anchor="start" tone="ink">
          measures {FILMS.length} distances
        </T>
      </Show>
      <Show from={0.62}>
        <T x={204} y={150} size={8.5} anchor="start" tone="ink">
          keeps the {k} nearest
        </T>
      </Show>
      <Show from={0.7}>
        <T x={204} y={163} size={8.5} anchor="start" tone="ink">
          {`${v.counts[v.winner]} ${nameOf(v.winner).toLowerCase()}, ${v.counts[other]} ${nameOf(other).toLowerCase()}`}
        </T>
      </Show>
      <Show from={0.76}>
        <T x={204} y={177} size={8.5} anchor="start" bold tone={v.winner === 0 ? 'brand' : 'warn'}>
          {`→ predicts ${nameOf(v.winner)}`}
        </T>
      </Show>
    </>
  );
}

// ───────────── 2. The cost of one query: every film, or a tree that skips regions ─────────────

interface Box2 {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}
type KdNode =
  | { leaf: true; pts: number[]; box: Box2 }
  | {
      leaf: false;
      axis: 'x' | 'y';
      split: number;
      lo: KdNode;
      hi: KdNode;
      box: Box2;
      pts: number[];
    };

/** A KD-tree over the films: split at the median gap, action first, until a region holds 4 or fewer. */
function buildKd(idx: number[], depth: number, box: Box2): KdNode {
  if (idx.length <= 4) return { leaf: true, pts: idx, box };
  const axis = depth % 2 === 0 ? 'x' : 'y';
  const of = (i: number) => (FILMS[i] as Film)[axis];
  const sorted = [...idx].sort((a, b) => of(a) - of(b) || a - b);
  const m = Math.floor(sorted.length / 2);
  const split = (of(sorted[m - 1] as number) + of(sorted[m] as number)) / 2;
  const loBox = axis === 'x' ? { ...box, x1: split } : { ...box, y1: split };
  const hiBox = axis === 'x' ? { ...box, x0: split } : { ...box, y0: split };
  return {
    leaf: false,
    axis,
    split,
    lo: buildKd(sorted.slice(0, m), depth + 1, loBox),
    hi: buildKd(sorted.slice(m), depth + 1, hiBox),
    box,
    pts: idx,
  };
}

/** The splits, root first, with the depth each is drawn at. */
function splitsOf(
  node: KdNode,
  depth = 0,
): Array<{ box: Box2; axis: 'x' | 'y'; split: number; depth: number }> {
  if (node.leaf) return [];
  return [
    { box: node.box, axis: node.axis, split: node.split, depth },
    ...splitsOf(node.lo, depth + 1),
    ...splitsOf(node.hi, depth + 1),
  ];
}

/**
 * The exact K-nearest search on the tree: go down to the query's region, then visit another
 * region only if it could hold a film nearer than the K-th found so far.
 */
function searchKd(root: KdNode, q: XY, k: number) {
  const best: Neighbour[] = [];
  const visited: KdNode[] = [];
  const pruned: KdNode[] = [];
  const kth = () => (best.length < k ? Number.POSITIVE_INFINITY : (best[k - 1] as Neighbour).d);
  const walk = (node: KdNode) => {
    if (node.leaf) {
      visited.push(node);
      for (const i of node.pts) {
        const point = FILMS[i] as Film;
        best.push({ index: i, point, d: distance(point, q, 'euclidean'), rank: 0 });
        best.sort((a, b) => a.d - b.d || a.index - b.index);
        best.splice(k);
      }
      return;
    }
    const v = node.axis === 'x' ? q.x : q.y;
    const [near, far] = v < node.split ? [node.lo, node.hi] : [node.hi, node.lo];
    walk(near);
    if (Math.abs(v - node.split) < kth()) walk(far);
    else pruned.push(far);
  };
  walk(root);
  return { best, visited, pruned, radius: kth() };
}

function KnnQueryCost() {
  const u = 13;
  const A = chart(16, 174, u);
  const B = chart(174, 174, u);
  const q = { x: 2, y: 6 };
  const k = 3;
  const all = FILMS.map((_, i) => i);
  const tree = buildKd(all, 0, { x0: 0, x1: 10, y0: 0, y1: 10 });
  const found = searchKd(tree, q, k);
  const checked = found.visited.flatMap((leaf) => leaf.pts);
  // The brute-force K-th distance: the tree must find the same neighbourhood.
  const brute = (rankAll(FILMS, q, 'euclidean')[k - 1] as Neighbour).d;
  const skipped = new Set(found.pruned.flatMap((n) => n.pts));
  const splits = splitsOf(tree);
  // Brute force: one line per stored film, in storage order, with a running count.
  const line = (i: number) => 0.06 + i * 0.024;
  // The tree: splits draw by depth, then each region the search visits, then the radius, then the skip.
  const splitAt = (depth: number) => 0.43 + depth * 0.05;
  const regionAt = (j: number) => 0.56 + j * 0.1;
  const radiusAt = 0.56 + found.visited.length * 0.1 + 0.01;
  const skipAt = radiusAt + 0.05;
  const doneAt = skipAt + 0.06;
  const rect = (b: Box2) => ({
    x: B.px(b.x0),
    y: B.py(b.y1),
    width: (b.x1 - b.x0) * u,
    height: (b.y1 - b.y0) * u,
  });
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        One prediction, two ways to find the 3 nearest films
      </T>
      <T x={A.px(5)} y={36} size={9} bold tone="ink">
        Brute force
      </T>
      <T x={B.px(5)} y={36} size={9} bold tone="ink">
        KD-tree
      </T>

      {/* Brute force: the query measures every stored film, one after another. */}
      {FILMS.map((p, i) => (
        <DrawLine
          key={at(p)}
          a={[A.px(q.x), A.py(q.y)]}
          b={[A.px(p.x), A.py(p.y)]}
          from={line(i)}
          className="stroke-muted"
          width={0.8}
          gap={6}
        />
      ))}
      {/* Once every distance is in, the 3 nearest are the films within the 3rd-nearest distance. */}
      <Show from={line(FILMS.length) + 0.03}>
        <circle
          cx={A.px(q.x)}
          cy={A.py(q.y)}
          r={brute * u}
          className="fill-none stroke-brand"
          strokeWidth={1.3}
          strokeDasharray="3 2.5"
        />
      </Show>
      {FILMS.map((p) => (
        <Mark key={at(p)} p={p} c={A} r={3.6} />
      ))}
      <Show from={0.03}>
        <Query x={A.px(q.x)} y={A.py(q.y)} r={6} />
      </Show>
      {FILMS.map((p, i) => (
        <Swap
          key={at(p)}
          from={line(i) + 0.02}
          to={i < FILMS.length - 1 ? line(i + 1) + 0.02 : undefined}
          final={i === FILMS.length - 1}
        >
          <T x={A.px(5)} y={190} size={8.5} mono bold tone="ink">
            {`${i + 1} of ${FILMS.length} films checked`}
          </T>
        </Swap>
      ))}

      {/* KD-tree: the regions the search visits are tinted; the films in a region it rules out fade. */}
      {found.visited.map((leaf, j) => (
        <Show key={at({ x: leaf.box.x0, y: leaf.box.y0 })} from={regionAt(j)}>
          <rect {...rect(leaf.box)} className="fill-brand-soft" />
        </Show>
      ))}
      {[A, B].map((c) => (
        <rect
          key={c.px(0)}
          x={c.px(0)}
          y={c.py(10)}
          width={10 * u}
          height={10 * u}
          rx={4}
          className="fill-none stroke-line-2"
          strokeWidth={1}
        />
      ))}
      {splits.map((s) => (
        <path
          key={`${s.axis}${s.split}${s.box.x0}${s.box.y0}`}
          d={
            s.axis === 'x'
              ? `M${B.px(s.split)} ${B.py(s.box.y1)} V${B.py(s.box.y0)}`
              : `M${B.px(s.box.x0)} ${B.py(s.split)} H${B.px(s.box.x1)}`
          }
          pathLength={1}
          strokeDasharray="1"
          strokeWidth={1.4}
          className="fill-none stroke-ink"
        >
          <Anim
            attr="stroke-dashoffset"
            keys={drawKeys(splitAt(s.depth), splitAt(s.depth) + 0.04)}
          />
        </path>
      ))}
      {found.visited.flatMap((leaf, j) =>
        leaf.pts.map((i, n) => {
          const p = FILMS[i] as Film;
          return (
            <DrawLine
              key={at(p)}
              a={[B.px(q.x), B.py(q.y)]}
              b={[B.px(p.x), B.py(p.y)]}
              from={regionAt(j) + 0.02 + n * 0.02}
              className="stroke-muted"
              width={0.8}
              gap={6}
            />
          );
        }),
      )}
      <Show from={radiusAt}>
        <circle
          cx={B.px(q.x)}
          cy={B.py(q.y)}
          r={found.radius * u}
          className="fill-none stroke-brand"
          strokeWidth={1.3}
          strokeDasharray="3 2.5"
        />
      </Show>
      {FILMS.map((p, i) =>
        skipped.has(i) ? (
          <g key={at(p)} opacity={0.3}>
            <Anim
              attr="opacity"
              keys={[
                [0, 1],
                [skipAt, 1],
                [skipAt + 0.03, 0.3],
              ]}
            />
            <Mark p={p} c={B} r={3.6} />
          </g>
        ) : (
          <Mark key={at(p)} p={p} c={B} r={3.6} />
        ),
      )}
      {found.pruned.map((n) => (
        <Show key={at({ x: n.box.x0, y: n.box.y0 })} from={skipAt}>
          <T x={B.px((n.box.x0 + n.box.x1) / 2)} y={B.py(8.6)} size={8} bold>
            {`${n.pts.length} skipped`}
          </T>
        </Show>
      ))}
      <Show from={0.03}>
        <Query x={B.px(q.x)} y={B.py(q.y)} r={6} />
      </Show>
      <Show from={doneAt}>
        <T x={B.px(5)} y={190} size={8.5} mono bold tone="ok">
          {`${checked.length} of ${FILMS.length} films checked`}
        </T>
      </Show>
      <T x={160} y={207} size={8.5}>
        With no index, every stored film is one more distance per query
      </T>
    </>
  );
}

// ───────────── 3. Search with no labels: the films most like this one ─────────────

function KnnSimilarFilms() {
  const u = 15;
  const c = chart(30, 186, u);
  const watched = { x: 7, y: 6 };
  const k = 3;
  const others = FILMS.filter((p) => !(p.x === watched.x && p.y === watched.y));
  const near = rankAll(others, watched, 'euclidean').slice(0, k);
  const R = (near[k - 1] as Neighbour).d;
  const wx = c.px(watched.x);
  const wy = c.py(watched.y);
  // The search circle grows at a steady pace; each film lights up as the circle reaches it.
  const grow = [0.12, 0.5] as const;
  const reached = (d: number) => grow[0] + (grow[1] - grow[0]) * (d / R);
  // Rank numbers sit on the side of each film away from the watched one.
  const label = (p: XY) => {
    const dx = c.px(p.x) - wx;
    const dy = c.py(p.y) - wy;
    const len = Math.hypot(dx, dy) || 1;
    return { x: c.px(p.x) + (dx / len) * 10, y: c.py(p.y) + (dy / len) * 10 + 3 };
  };
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        More like this: the {k} nearest films
      </T>
      <Axes c={c} />
      <circle
        cx={wx}
        cy={wy}
        r={R * u}
        className="fill-brand-soft stroke-brand"
        fillOpacity={0.55}
        strokeWidth={1.3}
        strokeDasharray="4 3"
      >
        <Anim
          attr="r"
          keys={[
            [0, 0],
            [grow[0], 0],
            [grow[1], R * u],
          ]}
        />
      </circle>
      <Show from={0.56}>
        {near.map((n) => (
          <line
            key={at(n.point)}
            x1={wx}
            y1={wy}
            x2={c.px(n.point.x)}
            y2={c.py(n.point.y)}
            strokeWidth={1.6}
            strokeLinecap="round"
            className="stroke-brand"
          />
        ))}
      </Show>
      {others.map((p) => (
        <Mark key={at(p)} p={p} c={c} plain />
      ))}
      {near.map((n) => (
        <Show key={at(n.point)} from={reached(n.d)}>
          <circle
            cx={c.px(n.point.x)}
            cy={c.py(n.point.y)}
            r={4.6}
            className="fill-brand stroke-surface"
            strokeWidth={1}
          />
          <T x={label(n.point).x} y={label(n.point).y} size={8.5} mono bold tone="brand">
            {n.rank}
          </T>
        </Show>
      ))}
      <circle cx={wx} cy={wy} r={5} className="fill-ink stroke-surface" strokeWidth={1.2} />

      {/* What a "more like this" row would return. */}
      <Box x={196} y={34} w={118} h={38} />
      <T x={204} y={48} size={7.5} anchor="start">
        just watched
      </T>
      <circle cx={208} cy={60} r={3.6} className="fill-ink" />
      <T x={216} y={63.5} size={9} anchor="start" mono bold tone="ink">
        {coords(watched)}
      </T>
      <T x={204} y={90} size={9} anchor="start" bold tone="ink">
        More like this
      </T>
      {near.map((n, i) => (
        <Show key={at(n.point)} from={reached(n.d)}>
          <Box x={196} y={98 + i * 24} w={118} h={20} r={6} tone="brand" />
          <T x={206} y={111.5 + i * 24} size={9} mono bold tone="brand">
            {n.rank}
          </T>
          <T x={218} y={111.5 + i * 24} size={9} anchor="start" mono tone="ink">
            {coords(n.point)}
          </T>
          <T x={306} y={111.5 + i * 24} size={8.5} anchor="end" mono>
            {`d ${n2(n.d)}`}
          </T>
        </Show>
      ))}
      <Show from={0.6}>
        <T x={196} y={182} size={8} anchor="start">
          No labels are used,
        </T>
        <T x={196} y={194} size={8} anchor="start">
          only the distances
        </T>
      </Show>
    </>
  );
}

// ───────────── 4. A missing value: no distance, and the gap decides the vote ─────────────

function KnnMissingValue() {
  const c = chart(30, 186, 15);
  const action = 6;
  const k = 3;
  const probe = (to: number) => c.py(to);
  // Two values the missing comedy score could take, one low and one high on the same line.
  const stops = [
    { comedy: 2, at: 0.3 },
    { comedy: 8, at: 0.58 },
  ].map((s) => {
    const q = { x: action, y: s.comedy };
    const near = rankAll(FILMS, q, 'euclidean').slice(0, k);
    return { ...s, q, near, v: vote(near, 2, false) };
  });
  const [low, high] = stops as [(typeof stops)[number], (typeof stops)[number]];
  // The working for one stored film, with the gap left in.
  const ref = FILMS[4] as Film;
  const x = c.px(action);
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        A missing comedy score: no distance, no vote
      </T>
      <Axes c={c} />
      <circle cx={146} cy={43} r={3.5} className="fill-brand stroke-surface" strokeWidth={1} />
      <T x={153} y={46} size={7.5} anchor="start">
        liked
      </T>
      <rect x={142.5} y={51.5} width={7} height={7} rx={1.2} className="fill-warn stroke-surface" />
      <T x={153} y={58} size={7.5} anchor="start">
        skipped
      </T>

      {/* The new film can sit anywhere on this line: its comedy score is unknown. */}
      <Show from={0.06}>
        <line
          x1={x}
          y1={c.py(10)}
          x2={x}
          y2={c.py(0)}
          strokeWidth={1.3}
          strokeDasharray="4 3"
          className="stroke-ink"
        />
      </Show>
      <Show from={0.1}>
        <T x={x} y={31} size={8.5} mono bold tone="ink">
          {`(${action}, ?)`}
        </T>
      </Show>
      {stops.map((s) => (
        <Show key={s.comedy} from={s.at}>
          {s.near.map((n) => (
            <line
              key={at(n.point)}
              x1={x}
              y1={probe(s.comedy)}
              x2={c.px(n.point.x)}
              y2={c.py(n.point.y)}
              strokeWidth={1.8}
              strokeLinecap="round"
              className={STROKE[n.point.cls % 2]}
            />
          ))}
        </Show>
      ))}
      {FILMS.map((p) => (
        <Mark key={at(p)} p={p} c={c} />
      ))}
      {stops.map((s) => (
        <Show key={s.comedy} from={s.at}>
          <Query x={x} y={probe(s.comedy)} r={6.5} cls={s.v.winner} />
        </Show>
      ))}
      {/* Between the two, the "?" slides up the line: any value gives a different neighbourhood. */}
      <Show from={low.at + 0.18} to={high.at} final={false}>
        <Move
          keys={[
            [0, [0, 0]],
            [low.at + 0.18, [0, 0]],
            [high.at, [0, probe(high.comedy) - probe(low.comedy)]],
          ]}
        >
          <Query x={x} y={probe(low.comedy)} r={6.5} />
        </Move>
      </Show>

      {/* The working, with the gap left in. */}
      <Box x={196} y={34} w={118} h={40} />
      <T x={204} y={48} size={7.5} anchor="start">
        new film
      </T>
      <T x={204} y={64} size={9} anchor="start" mono bold tone="ink">
        {`action ${action}, comedy ?`}
      </T>
      <Show from={0.16}>
        <T x={204} y={92} size={8} anchor="start">
          {`distance to ${coords(ref)}`}
        </T>
        <T x={204} y={106} size={8.5} anchor="start" mono bold tone="bad">
          {`√(${(action - ref.x) ** 2} + (? − ${ref.y})²) = ?`}
        </T>
      </Show>
      {stops.map((s, i) => (
        <Show key={s.comedy} from={s.at + 0.04}>
          <Box
            x={196}
            y={118 + i * 26}
            w={118}
            h={21}
            r={6}
            tone={s.v.winner === 0 ? 'brand' : 'warn'}
          />
          <T x={204} y={132 + i * 26} size={8.5} anchor="start" mono tone="ink">
            {`comedy ${s.comedy}`}
          </T>
          <T
            x={306}
            y={132 + i * 26}
            size={8.5}
            anchor="end"
            bold
            tone={s.v.winner === 0 ? 'brand' : 'warn'}
          >
            {`${nameOf(s.v.winner)} ${s.v.counts[s.v.winner]}–${s.v.counts[s.v.winner === 0 ? 1 : 0]}`}
          </T>
        </Show>
      ))}
      <Show from={0.74}>
        <T x={204} y={186} size={8.5} anchor="start" bold tone="ink">
          Fill the gap before KNN
        </T>
      </Show>
    </>
  );
}

// `satisfies`, not a Partial annotation: the entries must stay required when the shared library
// spreads them into its Record of every animation name.
export const KNN_LIBRARY = {
  'knn-lazy-fit': { viewBox: '0 0 320 214', dur: 11, Draw: KnnLazyFit },
  'knn-query-cost': { viewBox: '0 0 320 214', dur: 12, Draw: KnnQueryCost },
  'knn-similar-films': { viewBox: '0 0 320 214', dur: 10, Draw: KnnSimilarFilms },
  'knn-missing-value': { viewBox: '0 0 320 214', dur: 11, Draw: KnnMissingValue },
} satisfies Partial<Record<AnimationName, { viewBox: string; dur: number; Draw: () => ReactNode }>>;
