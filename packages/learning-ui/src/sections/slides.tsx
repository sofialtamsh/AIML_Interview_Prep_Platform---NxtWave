/**
 * A slide deck: one idea per slide, a picture on most slides, bullets that build in, and small
 * try-it moments, so a student gets comfortable with the topic before the deeper steps.
 *
 * A deck is laid out like a lab, on the whole page instead of in a box: what a slide says sits in
 * one card on the left, with the deck's progress at its top, and what it shows (a moving picture,
 * a code sample, a table, a try-it) takes the rest of the width. The lesson's own step bar turns
 * the slides, so "next" is always the same button in the same place.
 *
 * Responsive rules: the deck is a CSS container and lays itself out from its own width (the
 * `@…:` variants), never from the window's, so it reads the same beside a list of steps, in a
 * preview column and on a phone, where it becomes one column in reading order. A slide taller
 * than the window scrolls with the page while its text stays pinned.
 */
import { type StudentSection, shuffleStable } from '@app/content';
import { cn } from '@app/ui';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleX,
  Lightbulb,
  Pause,
  Play,
  Quote,
  Sparkles,
  Volume2,
  VolumeOff,
} from 'lucide-react';
import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AnimationView } from '../animations';
import {
  CodeBlock,
  CodeEditor,
  IdleTerminal,
  OutputPanel,
  RunButton,
  RunHint,
  RunMark,
  useRunner,
} from '../code';
import { useNarration, useNarratorVoice, useOptionalRuntime } from '../context';
import { narrationChunks, narrationOf, slideMillis } from '../deck-play';
import { iconOf } from '../icons';
import { Rich } from '../rich';
import { type TableChart, tableChart } from '../table-chart';
import { useStepFlow } from './lab-kit';

type Deck = Extract<StudentSection, { kind: 'SLIDES' }>;
type Slide = Deck['body']['slides'][number];
type Visual = NonNullable<Slide['visual']>;
type Try = NonNullable<Slide['try']>;

const ACCENTS = ['g0', 'g2', 'g3', 'g1', 'g4'] as const;
const tint = (accent: string, pct: number) =>
  `color-mix(in oklab, var(--${accent}) ${pct}%, transparent)`;

/** Each built-in element gets its place in the build order. */
const order = (i: number) => ({ '--i': i }) as CSSProperties;

// ───────────── Play mode: the deck runs like a short narrated video ─────────────

const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

const FEMALE =
  /female|neerja|heera|swara|ananya|kavya|veena|zira|aria|jenny|sonia|libby|hazel|susan|samantha/i;
const MALE = /male|prabhat|ravi|rishi|hemant|david|mark|guy|ryan|george|daniel/i;
const kindOf = (name: string) => (FEMALE.test(name) ? 'f' : MALE.test(name) ? 'm' : '?');

/**
 * Two narrators, so courses can alternate: the best English voice on this device, and a second
 * one that sounds different (another gender where the names tell). Indian English comes first.
 */
function narrators(): Array<SpeechSynthesisVoice | undefined> {
  const rank = (v: SpeechSynthesisVoice) =>
    (v.lang.replace('_', '-') === 'en-IN' ? 0 : v.lang.startsWith('en-GB') ? 10 : 20) +
    (/natural|online|neural/i.test(v.name) ? 0 : 5);
  const en = window.speechSynthesis
    .getVoices()
    .filter((v) => /^en[-_]/i.test(v.lang))
    .sort((a, b) => rank(a) - rank(b));
  const first = en[0];
  if (!first) return [undefined, undefined];
  const others = en.filter((v) => v.name !== first.name);
  const second =
    others.find((v) => kindOf(v.name) !== '?' && kindOf(v.name) !== kindOf(first.name)) ??
    others[0];
  return [first, second];
}

function speak(text: string, variant: number, onEnd: () => void) {
  const synth = window.speechSynthesis;
  const [first, second] = narrators();
  const alt = variant % 2 === 1;
  const voice = alt ? (second ?? first) : first;
  // One English voice only: the second narrator is the same voice, pitched clearly lower.
  const samePerson = alt && (!second || second.name === first?.name);
  let live = true;
  const chunks = narrationChunks(text);
  const say = (i: number) => {
    if (!live) return;
    const chunk = chunks[i];
    if (chunk === undefined) {
      onEnd();
      return;
    }
    const u = new SpeechSynthesisUtterance(chunk);
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? 'en-IN';
    u.rate = 0.97;
    u.pitch = samePerson ? 0.72 : 1;
    u.onend = () => say(i + 1);
    u.onerror = () => say(i + 1);
    synth.speak(u);
  };
  synth.cancel();
  say(0);
  return () => {
    live = false;
    synth.cancel();
  };
}

export function SlidesView({ s }: { s: Deck }) {
  const slides = s.body.slides;
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<'from-right' | 'from-left'>('from-right');
  const [seen, setSeen] = useState(() => new Set([0]));
  const root = useRef<HTMLElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLDivElement>(null);
  const figures = useRef<HTMLDivElement>(null);
  const start = useRef<number | null>(null);
  const narrator = useNarratorVoice();
  // The read-aloud voice is offered only where the host turns it on (LessonRuntime.narration).
  const narration = useNarration();
  // A lesson's step bar turns the slides with its own button. Where there is no bar (an admin
  // preview), the deck draws its own two.
  const hostTurns = Boolean(useOptionalRuntime()?.reportFlow);
  const last = slides.length - 1;

  const go = (next: number) => {
    const n = Math.max(0, Math.min(last, next));
    if (n === index) return;
    setDirection(n > index ? 'from-right' : 'from-left');
    setIndex(n);
    setSeen((prev) => new Set(prev).add(n));
    setYourTurn(false);
    // A slide is read from its top: after scrolling down a long one, bring the deck's top back.
    const el = root.current;
    if (el && typeof el.scrollIntoView === 'function' && el.getBoundingClientRect().top < 0)
      el.scrollIntoView({ block: 'start' });
  };
  // The lesson's own "next" button turns the slides before it leaves the deck, so pressing it
  // on the first slide never skips the rest.
  useStepFlow(index, last, go, {
    label: `Slide ${index + 1} of ${slides.length}`,
    next: 'Next slide',
  });

  // Play mode, offered with narration only: each slide stays up for its reading time (or while
  // the device voice reads it), then the next one comes in. It stops at a try-it, so the student
  // does it, and at the end.
  const [playing, setPlaying] = useState(false);
  const [voice, setVoice] = useState(false);
  const [progress, setProgress] = useState(0);
  const [yourTurn, setYourTurn] = useState(false);
  const indexRef = useRef(index);
  indexRef.current = index;
  const [speechOk, setSpeechOk] = useState(false);
  // No narration, no listen control: `speechOk` gates the button, so it is never drawn.
  useEffect(() => setSpeechOk(narration && canSpeak()), [narration]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: restart only when the slide, play state or voice changes
  useEffect(() => {
    if (!playing) return;
    const slide = slides[index];
    if (!slide) return;
    setProgress(0);
    if (slide.try) {
      setPlaying(false);
      setYourTurn(true);
      return;
    }
    const advance = () => {
      if (indexRef.current >= last) {
        setPlaying(false);
        setProgress(1);
      } else go(indexRef.current + 1);
    };
    if (narration && voice && canSpeak()) {
      const started = performance.now();
      const est = slideMillis(slide);
      const tick = window.setInterval(
        () => setProgress(Math.min(0.97, (performance.now() - started) / est)),
        120,
      );
      const stop = speak(narrationOf(slide), narrator, () => window.setTimeout(advance, 600));
      return () => {
        window.clearInterval(tick);
        stop();
      };
    }
    const ms = slideMillis(slide);
    const started = performance.now();
    const tick = window.setInterval(() => {
      const p = (performance.now() - started) / ms;
      setProgress(Math.min(1, p));
      if (p >= 1) {
        window.clearInterval(tick);
        advance();
      }
    }, 100);
    return () => window.clearInterval(tick);
  }, [playing, index, voice, narration]);

  // Stop talking when the deck goes away. A deck without narration never touches the voice.
  useEffect(() => {
    if (!narration) return;
    return () => void (canSpeak() && window.speechSynthesis.cancel());
  }, [narration]);

  const togglePlay = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    setYourTurn(false);
    // From a try-it (or the end), play carries on with the next slide (or starts over).
    if (index === last) go(0);
    else if (slides[index]?.try) go(index + 1);
    setPlaying(true);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const t = e.target as HTMLElement;
    if (t.closest('textarea, input')) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(index + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(index - 1);
    }
  };
  // A sideways swipe turns the slide. Touch and pen only: a mouse drag is how text is selected.
  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse') return;
    if ((e.target as HTMLElement).closest('button, a, textarea, input, pre, [role="region"]'))
      return;
    start.current = e.clientX;
  };
  const onPointerUp = (e: PointerEvent<HTMLElement>) => {
    if (start.current === null) return;
    const dx = e.clientX - start.current;
    start.current = null;
    if (dx <= -50) go(index + 1);
    else if (dx >= 50) go(index - 1);
  };

  // A slide with little on it is enlarged until it fills the height the window leaves this step,
  // the way a slide fills a screen, up to MAX_FIT; a full one stays as it is. Only what the slide
  // says and shows is enlarged: the card's header keeps its size, so it never jumps between
  // slides. Heights are read from the card and the figure column, which are not zoomed
  // themselves, so they are real pixels whatever a browser reports for a zoomed element.
  // How often the slide on screen has fitted itself. A slide that keeps doing so (something in it
  // reacts to its own size) stops being enlarged, so it settles instead of pulsing.
  const fitRuns = useRef({ slide: -1, runs: 0 });
  // The deck's size when it last fitted itself, so its own result does not count as a change.
  const fitted = useRef('');
  const sizeNow = useCallback(() => {
    const el = root.current;
    const room = el ? getComputedStyle(el).getPropertyValue('--lesson-room') : '';
    return `${el?.offsetWidth}|${card.current?.offsetHeight}|${figures.current?.offsetHeight}|${room}|${indexRef.current}`;
  }, []);
  const fitSlide = useCallback(() => {
    const el = root.current;
    const g = grid.current;
    const c = card.current;
    const t = text.current;
    const f = figures.current;
    if (!el || !g || !c || !t || !f) return;
    const fig = f.querySelector<HTMLElement>(':scope > .is-active');
    for (const other of f.children) {
      const o = other as HTMLElement;
      o.style.removeProperty('--fig-h');
      if (o !== fig) o.style.zoom = '';
    }
    const set = (z: number) => {
      const v = z === 1 ? '' : z.toFixed(3);
      t.style.zoom = v;
      if (fig) fig.style.zoom = v;
    };
    const before = Number(t.style.zoom) || 1;
    set(1);
    const count = fitRuns.current;
    if (count.slide !== indexRef.current) {
      count.slide = indexRef.current;
      count.runs = 0;
    }
    count.runs += 1;
    // A picture drawn from the slide's own table is an extra: it shows only where it fits.
    const extras = fig?.querySelectorAll<HTMLElement>('[data-extra]') ?? [];
    for (const x of extras) x.style.display = '';
    // The host's figure for the room, less the breathing space the page keeps above its step bar.
    const room = Number.parseFloat(getComputedStyle(el).getPropertyValue('--lesson-room')) - 28;
    const twoUp = getComputedStyle(g).gridTemplateColumns.trim().split(/\s+/).length > 1;
    // One column (a phone) scrolls with the page, and a host that gives no room has none to fill.
    if (!twoUp || !Number.isFinite(room) || !canZoom()) return;
    const tall = () => Math.max(c.scrollHeight, f.offsetHeight);
    // How much wider than its box the widest sideways scroller is (code, a table): 1 when all fit.
    const crowd = () => {
      let worst = 1;
      for (const box of fig?.querySelectorAll<HTMLElement>('pre, .overflow-x-auto') ?? [])
        if (box.clientWidth > 0) worst = Math.max(worst, box.scrollWidth / box.clientWidth);
      return worst;
    };
    const fits = () => tall() <= room + 1 && crowd() <= 1.005;
    if (tall() > room + 1) for (const x of extras) x.style.display = 'none';
    // A moving picture takes the height the rest of its column leaves it, so a slide with a
    // picture fills the room with the picture, never with bigger type. Its width still caps it.
    const art = fig?.querySelector<SVGElement>('svg[data-anim]');
    if (fig && art) {
      const setH = (px: number) => fig.style.setProperty('--fig-h', `${Math.round(px)}px`);
      // Layout sizes, never screen boxes: a slide's entrance animation scales it for a moment, and
      // a measurement taken then would size the picture for a frame that is about to change.
      const svgH = art.clientHeight;
      // Stacked, everything but the picture itself is "the rest". Paired, the rest is what is
      // outside its row (the note), plus the picture's own frame and caption.
      const pair = art.closest<HTMLElement>('[data-pair]');
      const twoUpRow =
        pair && getComputedStyle(pair).gridTemplateColumns.trim().split(/\s+/).length > 1;
      const box = art.closest('figure');
      const chrome = twoUpRow && box ? (box as HTMLElement).offsetHeight - svgH : 0;
      const row = twoUpRow && pair ? pair.offsetHeight : svgH;
      let give = Math.max(160, room - (f.offsetHeight - row) - chrome - 2);
      setH(give);
      // The first guess can be over where text re-wraps beside it: take the overflow back, but
      // only while it is the picture that overflows (a taller visual beside it is not helped).
      for (let i = 0; i < 3; i++) {
        const over = f.offsetHeight - room;
        const less = Math.max(160, give - over);
        if (over <= 1 || less === give) break;
        setH(less);
        if (f.offsetHeight - room >= over - 1) {
          setH(give);
          break;
        }
        give = less;
      }
    }
    const natural = tall();
    if (natural >= room * 0.9 || crowd() > 1.005 || count.runs > 12) return;
    let z = Math.min(MAX_FIT, room / natural);
    // Enlarged text wraps onto more lines and long code lines stop fitting, so the first guess
    // is too big: come down until the slide fits the room both ways.
    for (let i = 0; i < 6 && z > 1.03; i++) {
      set(z);
      const h = tall();
      const w = crowd();
      if (h > room + 1) z *= (room / h) * 0.99;
      else if (w > 1.005) z /= w * 1.01;
      else break;
    }
    if (z <= 1.03) return set(1);
    // Keep the size the slide already had when the new one is all but the same: no shimmer.
    if (before > 1 && Math.abs(z - before) < 0.04) {
      set(before);
      if (fits()) return;
    }
    set(z);
    if (!fits()) set(1);
  }, []);
  const fitAndRemember = useCallback(() => {
    fitSlide();
    fitted.current = sizeNow();
  }, [fitSlide, sizeNow]);
  // Before a slide is first painted; then whenever the deck, the window or the slide's own
  // content changes size (an answer's feedback appearing, cards re-flowing into fewer columns).
  // biome-ignore lint/correctness/useExhaustiveDependencies: fitted again for every slide
  useLayoutEffect(fitAndRemember, [fitAndRemember, index]);
  useEffect(() => {
    // On entering the step the host has only just said how much room there is.
    fitAndRemember();
    if (typeof ResizeObserver === 'undefined') return;
    let frame = 0;
    const again = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (sizeNow() !== fitted.current) fitAndRemember();
      });
    };
    const watcher = new ResizeObserver(again);
    for (const el of [root.current, card.current, figures.current]) if (el) watcher.observe(el);
    // A new window size is a fresh start for the slide on screen.
    const resized = () => {
      fitRuns.current.runs = 0;
      fitted.current = '';
      again();
    };
    window.addEventListener('resize', resized);
    return () => {
      cancelAnimationFrame(frame);
      watcher.disconnect();
      window.removeEventListener('resize', resized);
    };
  }, [fitAndRemember, sizeNow]);

  const slide = slides[index];
  const small =
    'grid size-8 shrink-0 place-items-center rounded-lg border transition-colors disabled:opacity-40';
  return (
    // The deck is the page, not a box on it: what the slide says sits in one card on the left,
    // with where you are in the deck at its top, and what it shows takes the rest of the width.
    // It is laid out from the width the deck really has (`@4xl:` is a deck of 56rem or more),
    // so it reads the same beside a list of steps, in a preview column and on a phone, where it
    // becomes one column in reading order.
    <section
      ref={root}
      // A slide comes in from the side. `overflow-x-clip` keeps that movement inside the deck: on
      // a phone it would otherwise widen the page for a moment and push the step bar off screen.
      // (Clip, not hidden: the text card must still pin to the window.) The side padding, taken
      // back by the margin, leaves the cards' shadows unclipped.
      className="@container -mx-2 grid scroll-mt-32 touch-pan-y grid-cols-[minmax(0,1fr)] gap-3 overflow-x-clip px-2 select-text"
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      aria-roledescription="slide deck"
      aria-label={s.title ?? 'Slides'}
    >
      <div
        ref={grid}
        className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 @4xl:grid-cols-[minmax(17rem,0.9fr)_minmax(0,1.6fr)] @4xl:gap-5"
      >
        {/* Pinned under the lesson's header while a tall picture or code sample scrolls past. */}
        <div
          ref={card}
          className="min-w-0 touch-pan-y rounded-2xl border border-line bg-surface p-4 [scrollbar-width:thin] @4xl:sticky @4xl:top-[4.25rem] @4xl:max-h-[calc(100svh-4.25rem-4.75rem)] @4xl:overflow-y-auto"
        >
          <div className="flex items-center gap-2">
            {/* One line, never wrapping: a label that wrapped would push the slide's text down. */}
            <p className="eyebrow min-w-0 flex-1 truncate">
              Slide {index + 1} of {slides.length}
              {slide?.kicker ? ` · ${slide.kicker}` : ''}
            </p>
            {narration && (
              <button
                type="button"
                onClick={togglePlay}
                className={cn(
                  small,
                  playing
                    ? 'border-brand bg-brand-soft text-brand'
                    : 'border-line-2 bg-surface text-ink hover:border-ink-2',
                )}
                aria-label={playing ? 'Pause' : 'Play the slides'}
                aria-pressed={playing}
                title={playing ? 'Pause' : 'Play the slides'}
              >
                {playing ? (
                  <Pause className="size-3.5" aria-hidden />
                ) : (
                  <Play className="ml-0.5 size-3.5" aria-hidden />
                )}
              </button>
            )}
            {speechOk && (
              <button
                type="button"
                onClick={() => setVoice((v) => !v)}
                className={cn(
                  small,
                  voice
                    ? 'border-brand bg-brand-soft text-brand'
                    : 'border-line-2 bg-surface text-muted hover:text-ink',
                )}
                aria-label={voice ? 'Stop reading aloud' : 'Read the slides aloud while playing'}
                aria-pressed={voice}
                title={voice ? 'Reading aloud' : 'Read aloud'}
              >
                {voice ? (
                  <Volume2 className="size-3.5" aria-hidden />
                ) : (
                  <VolumeOff className="size-3.5" aria-hidden />
                )}
              </button>
            )}
            {!hostTurns && slides.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(index - 1)}
                  disabled={index === 0}
                  className={cn(small, 'border-line-2 bg-surface text-ink hover:border-ink-2')}
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => go(index + 1)}
                  disabled={index === last}
                  className={cn(small, 'border-ink bg-ink text-surface')}
                  aria-label="Next slide"
                >
                  <ChevronRight className="size-4" aria-hidden />
                </button>
              </>
            )}
          </div>
          {slides.length > 1 && (
            <div className="mt-1 flex gap-1.5">
              {slides.map((sl, i) => (
                <button
                  // biome-ignore lint/suspicious/noArrayIndexKey: slides are positional
                  key={i}
                  type="button"
                  onClick={() => go(i)}
                  title={`Slide ${i + 1}: ${sl.title}`}
                  aria-label={`Go to slide ${i + 1}: ${sl.title}`}
                  aria-current={i === index ? 'step' : undefined}
                  // The bar is thin; the button around it is what a finger lands on.
                  className="group min-w-0 flex-1 py-1.5 pointer-coarse:py-3"
                >
                  <span
                    className={cn(
                      'relative block h-1.5 overflow-hidden rounded-full transition-colors group-hover:bg-brand-deep',
                      i === index && playing
                        ? 'bg-brand/30'
                        : i <= index
                          ? 'bg-brand'
                          : seen.has(i)
                            ? 'bg-brand/40'
                            : 'bg-line-2',
                    )}
                  >
                    {i === index && playing && (
                      <span
                        className="absolute inset-y-0 left-0 rounded-full bg-brand"
                        style={{ width: `${Math.round(progress * 100)}%` }}
                      />
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
          {/* What `fitSlide` enlarges on a thin slide; the header above keeps its size. */}
          <div ref={text}>
            {slide && (
              // Keyed by the slide, so each one comes in from the side it was reached from.
              <SlideText key={index} slide={slide} number={index + 1} direction={direction} />
            )}
          </div>
        </div>

        <div ref={figures} className="@container/fig relative min-w-0">
          {slides.map((sl, i) => (
            <SlideFigure
              // biome-ignore lint/suspicious/noArrayIndexKey: slides are positional
              key={i}
              slide={sl}
              number={i + 1}
              active={i === index}
              direction={direction}
            />
          ))}
        </div>
      </div>

      {yourTurn && slide?.try && (
        <p className="flex items-center gap-2 rounded-xl border border-brand/25 bg-brand-soft px-3.5 py-2 text-[13px] text-ink">
          <Sparkles className="size-4 shrink-0 text-brand" aria-hidden />
          Your turn: try it, then press play to carry on.
        </p>
      )}
      <p className="sr-only" aria-live="polite">
        Slide {index + 1} of {slides.length}: {slide?.title}
      </p>
    </section>
  );
}

/**
 * How far a thin slide may be enlarged to fill the room it has. A little, never more: body text
 * goes from 16 to 20px at most, which still reads as a page and not a poster. A slide with room
 * left over after that needs a picture, not bigger type.
 */
const MAX_FIT = 1.25;
const canZoom = () =>
  typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('zoom', '1.5');

const accentOf = (slide: Slide, number: number) =>
  slide.accent ?? ACCENTS[(number - 1) % ACCENTS.length] ?? 'g0';

/** Visuals that read well in half a column, beside a picture. */
function fitsBeside(v: Visual) {
  if (v.type === 'code' || v.type === 'sequence') return false;
  // Three columns of anything, or up to six of short numbers (a threshold's counts and scores).
  if (v.type === 'table')
    return (
      v.columns.length <= 3 ||
      (v.columns.length <= 6 && v.cells.every((r) => r.every((c) => c.length <= 5)))
    );
  return true;
}

/** A slide shows something (a picture, a sample, a try-it) besides what it says. */
const showsSomething = (slide: Slide) => Boolean(slide.animation || slide.visual || slide.try);

function Points({
  points,
  accent,
  from,
  boxed = false,
}: {
  points: readonly string[];
  accent: string;
  /** The place of the first point in the slide's build order. */
  from: number;
  /** As the slide's own figure: a ruled list in a box, in larger type. */
  boxed?: boolean;
}) {
  return (
    <ul
      className={cn(
        'grid',
        boxed ? 'divide-y divide-line rounded-2xl border border-line bg-surface' : 'gap-2',
      )}
    >
      {points.map((p, i) => (
        <li
          key={p}
          className={cn('build flex gap-2.5', boxed && 'px-4 py-3')}
          style={order(from + i)}
        >
          <span
            className="mt-[3px] grid size-5 shrink-0 place-items-center rounded-md"
            style={{ background: tint(accent, 18), color: `var(--${accent})` }}
            aria-hidden
          >
            <ArrowRight className="size-3" />
          </span>
          <Rich
            text={p}
            inline
            className={cn('text-ink', boxed ? 'text-[15.5px]' : 'text-[15px]')}
          />
        </li>
      ))}
    </ul>
  );
}

/** What a slide says: its headline, its paragraph and, beside a figure, its points. */
function SlideText({
  slide,
  number,
  direction,
}: {
  slide: Slide;
  number: number;
  direction: 'from-right' | 'from-left';
}) {
  const accent = accentOf(slide, number);
  return (
    <div
      className={`deck-slide is-active ${direction} mt-1.5 grid grid-cols-[minmax(0,1fr)] gap-2.5`}
    >
      <h3 className="build text-[clamp(19px,5cqw,22px)] leading-[1.2] tracking-tight text-balance">
        {slide.title}
      </h3>
      {slide.body && (
        <div className="build" style={order(1)}>
          <Rich text={slide.body} className="text-[16px] leading-relaxed text-ink-2" />
        </div>
      )}
      {showsSomething(slide) && slide.points.length > 0 && (
        <Points points={slide.points} accent={accent} from={2} />
      )}
    </div>
  );
}

/**
 * What a slide shows: its moving picture, its visual, its try-it and the note about them. A slide
 * with nothing to show puts its points here, so they are read as the slide's figure.
 */
function SlideFigure({
  slide,
  number,
  active,
  direction,
}: {
  slide: Slide;
  number: number;
  active: boolean;
  direction: 'from-right' | 'from-left';
}) {
  const accent = accentOf(slide, number);
  const anim = slide.animation;
  const figure = showsSomething(slide);
  // The text beside this builds in first (headline, paragraph, points), then the figure.
  let n = 2 + (figure ? slide.points.length : 0);
  const next = () => order(n++);
  // A printed result is only worth something if the student has guessed at it first. So the
  // output of a code sample, and the note that explains it, wait for the student to ask.
  const gated = slide.visual?.type === 'code' && slide.visual.output !== undefined;
  const [shown, setShown] = useState(false);
  const reveal = gated ? { shown, onShow: () => setShown(true) } : undefined;
  const pointsHere = !figure && slide.points.length > 0;
  // A picture with cards, a comparison, a flow or a short table beside it, not under it. Code
  // and wide tables need the full width, so they stay underneath.
  const pair = Boolean(anim && slide.visual && fitsBeside(slide.visual));
  if (!figure && !pointsHere && !slide.note) return null;
  return (
    <div
      className={cn(
        'deck-slide grid max-w-[60rem] grid-cols-[minmax(0,1fr)] gap-3',
        // --fig-h caps a moving picture (see AnimationView). Under the text it may take about
        // half a phone screen. Beside the text it gets the height the window has left for this
        // step, less its own frame and caption (4.5rem) and, where there is one, the note under
        // it (5rem more), so the picture and its note are read together without scrolling. On a
        // tall window that is a tall picture: nothing else caps it but the width it has.
        '[--fig-h:min(44svh,20rem)]',
        slide.note
          ? '@4xl:[--fig-h:max(13rem,calc(var(--lesson-room,70svh)-9.5rem))]'
          : '@4xl:[--fig-h:max(13rem,calc(var(--lesson-room,70svh)-4.5rem))]',
        // Slides off screen stay mounted (so try-it answers survive) and keep being laid out at
        // the column's width, so each is already the right shape when it is turned to. They take
        // no room; `invisible` also takes them out of the tab order, aria-hidden out of the
        // reading order.
        active
          ? `is-active ${direction}`
          : 'invisible absolute inset-x-0 top-0 h-0 overflow-hidden',
      )}
      aria-hidden={!active}
    >
      {/* Picture and visual side by side in a wide column (data-pair; `fitSlide` then sizes the
          picture to the row), one above the other otherwise. */}
      <div
        data-pair={pair || undefined}
        className={cn(
          'grid grid-cols-[minmax(0,1fr)] gap-3',
          pair && '@xl/fig:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] @xl/fig:items-center',
        )}
      >
        {anim && (
          <div className="build min-w-0" style={next()}>
            {/* Mounted only while showing, so the story plays from its start each time. */}
            {active && <AnimationView name={anim.name} caption={anim.caption} />}
          </div>
        )}
        {slide.visual && (
          // Each visual's slot is its own container: the visual arranges itself from the width
          // it really has.
          <div className="build @container min-w-0" style={next()}>
            <VisualView visual={slide.visual} accent={accent} reveal={reveal} />
          </div>
        )}
      </div>
      {slide.try && (
        <div className="build min-w-0" style={next()}>
          <TryView t={slide.try} accent={accent} />
        </div>
      )}
      {pointsHere && <Points points={slide.points} accent={accent} from={n} boxed />}
      {slide.note && (
        <div
          className={cn(
            'build flex gap-2.5 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[14px] text-ink-2',
            gated && !shown && 'invisible',
          )}
          aria-hidden={gated && !shown ? true : undefined}
          style={order(n + (pointsHere ? slide.points.length : 0))}
        >
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
          <Rich text={slide.note} inline />
        </div>
      )}
    </div>
  );
}

// ───────────── Visuals ─────────────

/** The slot's own width in px, read as it attaches so the very first paint is already right. */
function useSlotWidth() {
  const [width, setWidth] = useState(0);
  const watcher = useRef<ResizeObserver | null>(null);
  const ref = useCallback((el: HTMLElement | null) => {
    watcher.current?.disconnect();
    watcher.current = null;
    if (!el) return;
    // The width the slot has before a slide is enlarged (see `fitSlide`): its own CSS width
    // times the zoom it sits in. Counting columns from the enlarged width instead would re-flow
    // the cards each time the slide is enlarged, which changes its height and makes the slide
    // fit itself again, round and round.
    const read = () => {
      const own = Number.parseFloat(getComputedStyle(el).width) || el.getBoundingClientRect().width;
      const zoom = (el as HTMLElement & { currentCSSZoom?: number }).currentCSSZoom ?? 1;
      setWidth(Math.round(own * zoom));
    };
    read();
    if (typeof ResizeObserver === 'undefined') return;
    watcher.current = new ResizeObserver(read);
    watcher.current.observe(el);
  }, []);
  return [ref, width] as const;
}

/**
 * Cards, as many to a row as the room allows. The grid measures its own slot (the whole frame, or
 * the narrower column beside a headline), gives each card the width its longest line needs, and
 * drops a column rather than leave one card stranded on a row of its own. Five or more become a
 * compact list, icon beside the text, and so does any set that ends up one card to a row: three
 * rows then take a third of the height of three stacked cards.
 */
function IconCards({ items }: { items: Extract<Visual, { type: 'icons' }>['items'] }) {
  const [ref, width] = useSlotWidth();
  const n = items.length;
  const longestWord = Math.max(
    ...items.flatMap((it) => it.label.split(/\s+/).map((w) => w.length)),
  );
  const list = n >= 5 && !(n % 3 === 0 && longestWord <= 8);
  // The width a card wants before its words start breaking one to a line.
  const longest = Math.max(...items.map((it) => Math.max(it.label.length, it.sub?.length ?? 0)));
  const want = longest > 46 ? 232 : longest > 28 ? 196 : longest > 14 ? 160 : 126;
  const gap = list ? 8 : 10;
  let cols = Math.min(Math.max(1, Math.floor((width + gap) / (want + gap))), n);
  while (cols > 1 && (n % cols === 1 || (n % cols !== 0 && n % (cols - 1) === 0))) cols -= 1;
  const rows = width > 0 && cols === 1;
  return (
    <ul
      ref={ref}
      className={cn('grid', list ? 'gap-2' : 'gap-2.5')}
      style={{
        // Before the first measurement, the shape a designed deck would use.
        gridTemplateColumns: `repeat(${width ? cols : Math.min(n, n === 4 ? 2 : 3)}, minmax(0, 1fr))`,
      }}
    >
      {items.map((it, i) => {
        const Icon = iconOf(it.icon);
        const a = ACCENTS[i % ACCENTS.length] ?? 'g0';
        return (
          <li
            key={it.label}
            className={cn(
              'build grid content-start rounded-2xl border border-line bg-surface shadow-soft',
              rows
                ? 'grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-0.5 p-3'
                : list
                  ? 'grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 p-2.5 @md:grid-cols-1 @md:gap-2 @md:p-3.5'
                  : 'gap-2 p-3.5',
            )}
            style={order(i + 2)}
          >
            <span
              className={cn(
                'grid place-items-center rounded-xl',
                rows
                  ? 'row-span-2 size-10'
                  : list
                    ? 'row-span-2 size-9 @md:row-span-1 @md:size-10'
                    : 'size-10',
              )}
              style={{ background: tint(a, 15), color: `var(--${a})` }}
            >
              <Icon className="size-5" aria-hidden />
            </span>
            <span
              className={cn(
                'text-[14.5px] leading-snug font-semibold [overflow-wrap:anywhere] text-ink',
                !rows && list && !it.sub && 'self-center @md:self-auto',
              )}
            >
              {it.label}
            </span>
            {it.sub && (
              <span className="text-[13.5px] leading-snug [overflow-wrap:anywhere] text-ink-2">
                {it.sub}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * A table's highlighted column as a picture (see table-chart.ts): bars from a zero line, or one
 * bar split into the parts that add up to the table's total. Every bar carries its number, in
 * text colour, so nothing is read off an axis. The table above is the same data for a screen
 * reader, so the picture is hidden from it.
 */
function TableBars({ chart, accent, from }: { chart: TableChart; accent: string; from: number }) {
  const frame = 'build grid gap-2.5 rounded-2xl border border-line bg-surface p-4';
  if (chart.kind === 'sum') {
    const hue = (i: number) => `var(--${ACCENTS[i % ACCENTS.length] ?? 'g0'})`;
    return (
      <figure className={frame} style={order(from)} aria-hidden data-extra>
        <div className="flex h-9 gap-0.5">
          {chart.parts.map((p, i) => (
            <span
              key={p.label}
              className="h-full min-w-1.5 first:rounded-l-lg last:rounded-r-lg"
              style={{ flexGrow: p.value, flexBasis: 0, background: hue(i) }}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-2">
          {chart.parts.map((p, i) => (
            <span key={p.label} className="inline-flex items-center gap-1.5">
              <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: hue(i) }} />
              {p.label}
              <b className="font-mono font-semibold text-ink tabular-nums">{p.shown}</b>
            </span>
          ))}
        </div>
        <figcaption className="text-[13px] text-ink-2">
          The {chart.parts.length} parts add up to
          {chart.total.label ? ` the ${chart.total.label.toLowerCase()}:` : ''}{' '}
          <b className="font-mono font-semibold text-ink tabular-nums">{chart.total.shown}</b>
        </figcaption>
      </figure>
    );
  }
  const most = Math.max(0, ...chart.bars.map((b) => b.value));
  const least = Math.min(0, ...chart.bars.map((b) => b.value));
  const span = most - least;
  // 96px for the whole span of the numbers, and a line of room for the number on each bar.
  const px = (v: number) => Math.max(2, Math.round((Math.abs(v) / span) * 96));
  const above = Math.round((most / span) * 96) + 20;
  const below = least < 0 ? Math.round((-least / span) * 96) + 20 : 0;
  const number = 'font-mono text-[12px] leading-5 font-semibold text-ink tabular-nums';
  const bar = { background: `var(--${accent})` };
  return (
    <figure className={frame} style={order(from)} aria-hidden data-extra>
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${chart.bars.length}, minmax(0, 1fr))` }}
      >
        {chart.bars.map((b, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: one bar per table row, fixed order
            key={i}
            className="grid justify-items-center"
            style={{ gridTemplateRows: `${above}px ${below}px auto` }}
          >
            {/* The zero line runs under every column; bars above it stand on it. */}
            <div className="flex w-full flex-col items-center justify-end border-b border-line-2 px-1.5">
              {b.value >= 0 && <span className={number}>{b.shown}</span>}
              {b.value > 0 && (
                <span
                  className="w-full max-w-12 rounded-t-[4px]"
                  style={{ ...bar, height: px(b.value) }}
                />
              )}
            </div>
            <div className="flex w-full flex-col items-center px-1.5">
              {b.value < 0 && (
                <>
                  <span
                    className="w-full max-w-12 rounded-b-[4px]"
                    style={{ ...bar, height: px(b.value) }}
                  />
                  <span className={number}>{b.shown}</span>
                </>
              )}
            </div>
            <span className="mt-1 max-w-full truncate px-1 text-[12px] text-muted">{b.label}</span>
          </div>
        ))}
      </div>
      <figcaption className="text-center text-[12.5px] text-muted">
        {chart.name} for each row{chart.by ? `, by ${chart.by.toLowerCase()}` : ''}
      </figcaption>
    </figure>
  );
}

function VisualView({
  visual,
  accent,
  reveal,
}: {
  visual: Visual;
  accent: string;
  /** Set for a code sample with output: whether it is showing, and how to show it. */
  reveal?: { shown: boolean; onShow: () => void };
}) {
  switch (visual.type) {
    case 'icons':
      return <IconCards items={visual.items} />;
    case 'emoji':
      return (
        <figure className="grid justify-items-center gap-2 py-2 text-center">
          <span
            className="grid size-32 place-items-center rounded-[2rem] text-[72px] leading-none"
            style={{ background: tint(accent, 12) }}
            aria-hidden
          >
            {visual.emoji}
          </span>
          {visual.caption && (
            <figcaption className="font-mono text-[12px] font-semibold tracking-wide text-muted uppercase">
              {visual.caption}
            </figcaption>
          )}
        </figure>
      );
    case 'stat': {
      // The big number shrinks until its longest word fits the card (the display face is
      // monospaced, about 0.62em a character; 100cqw is the slot, 2.75rem the card's padding).
      const longest = Math.max(1, ...visual.value.split(/\s+/).map((w) => w.length));
      return (
        <div className="grid justify-items-start gap-1 rounded-2xl border border-line bg-surface p-5 shadow-soft">
          <span
            className="max-w-full font-display leading-none font-extrabold tracking-tight [overflow-wrap:anywhere]"
            style={{
              color: `var(--${accent})`,
              fontSize: `min(clamp(44px, 7vw, 72px), calc((100cqw - 2.75rem) / ${(0.62 * longest).toFixed(2)}))`,
            }}
          >
            {visual.value}
          </span>
          <span className="text-[15px] font-semibold text-ink">{visual.label}</span>
          {visual.sub && <span className="text-[13px] text-muted">{visual.sub}</span>}
        </div>
      );
    }
    case 'flow': {
      // One connected line of steps. Left to right only where every step has room on a single
      // row (a wide slot and at most four steps); otherwise top to bottom, with a down arrow in
      // a gutter before each step. A wrapped row left arrows dangling at the start of a line.
      // Four steps need a wider slot than three before a row suits them: squeezed into a narrow
      // one (an enlarged slide) their labels broke mid-word while the height went unused.
      const n = visual.steps.length;
      const row =
        n > 4
          ? null
          : n === 4
            ? {
                list: '@3xl:flex-row @3xl:items-stretch',
                step: '@3xl:flex-1',
                arrow: '@3xl:rotate-0',
                gutter: '@3xl:hidden',
              }
            : {
                list: '@xl:flex-row @xl:items-stretch',
                step: '@xl:flex-1',
                arrow: '@xl:rotate-0',
                gutter: '@xl:hidden',
              };
      return (
        <ol className={cn('flex flex-col items-stretch gap-1.5', row?.list)}>
          {visual.steps.map((st, i) => {
            const Icon = st.icon ? iconOf(st.icon) : null;
            return (
              <li
                key={st.label}
                className={cn('build flex min-w-0 items-center gap-1.5', row?.step)}
                style={order(i + 2)}
              >
                {i > 0 ? (
                  <ArrowRight
                    className={cn('size-4 shrink-0 rotate-90 self-center text-muted', row?.arrow)}
                    aria-hidden
                  />
                ) : (
                  // The first step keeps the arrow gutter empty, so every step lines up.
                  <span className={cn('size-4 shrink-0', row?.gutter)} aria-hidden />
                )}
                <span
                  className="flex h-full min-w-0 flex-1 items-center gap-2 rounded-xl border px-3 py-2.5 text-[13.5px] font-semibold text-ink"
                  style={{ borderColor: tint(accent, 35), background: tint(accent, 9) }}
                >
                  <span
                    className="grid size-6 shrink-0 place-items-center rounded-full font-mono text-[11px] font-bold text-white"
                    style={{ background: `var(--${accent})` }}
                  >
                    {Icon ? <Icon className="size-3.5" aria-hidden /> : i + 1}
                  </span>
                  <span className="min-w-0 [overflow-wrap:anywhere]">{st.label}</span>
                </span>
              </li>
            );
          })}
        </ol>
      );
    }
    case 'sequence': {
      const last = visual.terms.length - 1;
      const spoken = visual.terms
        .map((t, i) => (i > 0 && visual.ops[i - 1] ? `${visual.ops[i - 1]} gives ${t}` : t))
        .join(', ');
      return (
        <figure className="grid gap-1">
          {/* Each term builds in left to right with the step that led to it; the answer comes last. */}
          <ol className="flex items-start gap-1.5 sm:gap-2.5" aria-hidden>
            {visual.terms.map((t, i) => {
              const isAnswer = visual.answer && i === last;
              const op = i > 0 ? visual.ops[i - 1] : undefined;
              return (
                <li
                  // biome-ignore lint/suspicious/noArrayIndexKey: terms repeat and never reorder
                  key={i}
                  className="build relative grid min-w-0 flex-1 justify-items-center pt-7"
                  style={order(isAnswer ? last + 4 : i + 2)}
                >
                  {op && (
                    <span
                      className="absolute top-0 -left-[3px] -translate-x-1/2 rounded-full px-1.5 py-0.5 font-mono text-[11px] font-bold whitespace-nowrap sm:-left-[5px]"
                      style={{ background: tint(accent, 14), color: `var(--${accent})` }}
                    >
                      {op}
                    </span>
                  )}
                  <span
                    className={cn(
                      'grid h-12 w-full max-w-16 place-items-center rounded-xl border font-mono text-[clamp(13px,3.8vw,19px)] font-bold tabular-nums',
                      isAnswer ? 'text-white shadow-soft' : 'border-line bg-surface text-ink',
                    )}
                    style={
                      isAnswer
                        ? { background: `var(--${accent})`, borderColor: `var(--${accent})` }
                        : undefined
                    }
                  >
                    {t}
                  </span>
                </li>
              );
            })}
          </ol>
          <figcaption className="sr-only">Sequence: {spoken}</figcaption>
        </figure>
      );
    }
    case 'compare': {
      const sides = [
        { side: visual.left, good: visual.better === 'left' },
        { side: visual.right, good: visual.better === 'right' },
      ];
      return (
        // Side by side where each side gets a readable width (a 20rem slot), stacked below that.
        <div className="grid gap-2.5 @sm:grid-cols-2">
          {sides.map(({ side, good }, i) => {
            const neutral = visual.better === 'none';
            const Icon = neutral ? null : good ? CircleCheck : CircleX;
            return (
              <div
                key={side.title}
                className={cn(
                  'build grid content-start gap-2 rounded-2xl border p-4',
                  neutral && 'border-line bg-surface',
                  !neutral && good && 'border-ok/40 bg-ok-bg',
                  !neutral && !good && 'border-bad/30 bg-bad-bg/60',
                )}
                style={order(i + 2)}
              >
                <span className="flex items-center gap-1.5 text-[13.5px] font-bold text-ink">
                  {Icon && (
                    <Icon
                      className={cn('size-4', good ? 'text-ok' : 'text-bad')}
                      aria-label={good ? 'Do this' : 'Avoid this'}
                    />
                  )}
                  {side.title}
                </span>
                <ul className="grid gap-1.5 text-[13.5px] text-ink-2">
                  {side.items.map((it) => (
                    <li key={it} className="flex min-w-0 gap-2">
                      <span className="text-muted" aria-hidden>
                        •
                      </span>
                      <span className="min-w-0 [overflow-wrap:anywhere]">{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      );
    }
    case 'code':
      return (
        <div className="grid gap-2">
          <CodeBlock code={visual.code} label={visual.filename ?? 'main.py'} />
          {visual.output !== undefined && (
            <div className="relative">
              {/* Laid out from the start, so the slide is the same height before and after. */}
              <div
                className={cn(reveal && !reveal.shown && 'invisible')}
                aria-hidden={reveal && !reveal.shown ? true : undefined}
              >
                <OutputPanel title="Output" text={visual.output} />
              </div>
              {reveal && !reveal.shown && (
                <div className="absolute inset-0 grid place-items-center rounded-xl border border-dashed border-line-2 bg-surface-2/70">
                  <button
                    type="button"
                    onClick={reveal.onShow}
                    className="inline-flex items-center gap-2 rounded-lg border border-brand bg-brand px-3 py-1.5 text-[13px] font-semibold text-white"
                  >
                    <Play className="size-3.5" aria-hidden /> Predict it, then show the output
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      );
    case 'table': {
      const chart = tableChart(visual);
      return (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
          {/* On a phone the cells tighten and a long column name wraps, so four columns fit the
            screen. A table still too wide scrolls sideways inside its own box; the page never does. */}
          <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-soft">
            <table className="w-full border-collapse text-[13.5px] tabular-nums">
              <thead>
                <tr className="border-line border-b bg-surface-2 text-left">
                  {visual.columns.map((c, j) => (
                    <th
                      key={c}
                      scope="col"
                      className="px-2 py-2 align-bottom font-semibold text-ink @md:px-3 @md:whitespace-nowrap"
                      style={j === visual.highlight ? { color: `var(--${accent})` } : undefined}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visual.cells.map((r, i) => (
                  <tr
                    // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional and may repeat
                    key={i}
                    className="build border-line border-b last:border-0"
                    style={order(i + 2)}
                  >
                    {r.map((cell, j) => (
                      <td
                        // biome-ignore lint/suspicious/noArrayIndexKey: one cell per column, fixed order
                        key={j}
                        className="px-2 py-1.5 font-mono text-ink @md:px-3"
                        style={
                          j === visual.highlight
                            ? { background: tint(accent, 9), fontWeight: 700 }
                            : undefined
                        }
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              {visual.totals && (
                <tfoot>
                  <tr
                    className="build border-line-2 border-t-2 bg-surface-2"
                    style={order(visual.cells.length + 2)}
                  >
                    {visual.totals.map((cell, j) => (
                      <td
                        // biome-ignore lint/suspicious/noArrayIndexKey: one cell per column, fixed order
                        key={j}
                        className="px-2 py-2 font-mono font-bold text-ink @md:px-3"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {chart && <TableBars chart={chart} accent={accent} from={visual.cells.length + 3} />}
        </div>
      );
    }
    case 'chat':
      return (
        <ul className="grid gap-2.5">
          {visual.lines.map((l, i) => {
            const me = l.from === 'candidate';
            return (
              <li
                key={l.text}
                className={cn('build flex items-end gap-2', me && 'flex-row-reverse')}
                style={order(i + 2)}
              >
                <span
                  className={cn(
                    'grid size-7 shrink-0 place-items-center rounded-full font-mono text-[11px] font-bold',
                    me ? 'bg-brand text-brand-ink' : 'bg-ink text-surface',
                  )}
                  aria-label={me ? 'You' : 'Interviewer'}
                  role="img"
                >
                  {me ? 'Y' : 'I'}
                </span>
                <span
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed text-ink',
                    me
                      ? 'rounded-br-md bg-brand-soft'
                      : 'rounded-bl-md border border-line bg-surface',
                  )}
                >
                  <Rich text={l.text} inline />
                </span>
              </li>
            );
          })}
        </ul>
      );
    case 'checklist':
      return (
        <ul className="grid gap-2 rounded-2xl border border-line bg-surface p-4 shadow-soft">
          {visual.items.map((it, i) => (
            <li
              key={it.text}
              className="build flex items-start gap-2.5 text-[14px] text-ink"
              style={order(i + 2)}
            >
              {it.ok ? (
                <CircleCheck className="mt-0.5 size-[18px] shrink-0 text-ok" aria-label="Yes" />
              ) : (
                <CircleX className="mt-0.5 size-[18px] shrink-0 text-bad" aria-label="No" />
              )}
              {it.text}
            </li>
          ))}
        </ul>
      );
    case 'quote':
      return (
        <figure className="grid gap-2 rounded-2xl border border-line bg-surface p-5 shadow-soft">
          <Quote className="size-6" style={{ color: `var(--${accent})` }} aria-hidden />
          <blockquote className="font-display text-[17px] leading-snug font-semibold text-ink">
            <Rich text={visual.text} inline />
          </blockquote>
          {visual.by && <figcaption className="text-[13px] text-muted">{visual.by}</figcaption>}
        </figure>
      );
  }
}

// ───────────── Try-it moments ─────────────

function TryShell({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <div
      className="grid gap-3 rounded-2xl border-2 border-dashed p-4"
      style={{ borderColor: tint(accent, 45), background: tint(accent, 6) }}
    >
      <span
        className="inline-flex w-fit items-center gap-1.5 font-mono text-[11px] font-bold tracking-[0.1em] uppercase"
        style={{ color: `var(--${accent})` }}
      >
        <Sparkles className="size-3.5" aria-hidden /> Try it
      </span>
      {children}
    </div>
  );
}

function TryView({ t, accent }: { t: Try; accent: string }) {
  if (t.type === 'choice') return <TryChoice t={t} accent={accent} />;
  if (t.type === 'write') return <TryWrite t={t} accent={accent} />;
  return <TryCode t={t} accent={accent} />;
}

function TryChoice({ t, accent }: { t: Extract<Try, { type: 'choice' }>; accent: string }) {
  // Authors tend to write the right answer first, so show the options in a stable shuffled order.
  const options = useMemo(() => shuffleStable(t.options, t.prompt), [t.options, t.prompt]);
  const [picked, setPicked] = useState<number | null>(null);
  const choice = picked === null ? null : options[picked];
  return (
    <TryShell accent={accent}>
      <Rich text={t.prompt} className="text-[14.5px] font-semibold text-ink" />
      <fieldset className="grid min-w-0 gap-2">
        <legend className="sr-only">Choose one</legend>
        {options.map((o, i) => {
          const on = picked === i;
          return (
            <button
              key={o.text}
              type="button"
              aria-pressed={on}
              onClick={() => setPicked(i)}
              className={cn(
                'flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-[14px] transition',
                !on && 'border-line bg-surface hover:border-line-2',
                on && o.correct && 'border-ok bg-ok-bg',
                on && !o.correct && 'border-bad/50 bg-bad-bg',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border font-mono text-[10.5px] font-bold',
                  on ? 'border-transparent' : 'border-line-2 text-muted',
                )}
                aria-hidden
              >
                {on ? (
                  o.correct ? (
                    <CircleCheck className="size-5 text-ok" />
                  ) : (
                    <CircleX className="size-5 text-bad" />
                  )
                ) : (
                  String.fromCharCode(65 + i)
                )}
              </span>
              <Rich text={o.text} inline />
            </button>
          );
        })}
      </fieldset>
      {choice && (
        <div
          className={cn(
            'flex gap-2 rounded-xl px-3.5 py-2.5 text-[13.5px] animate-rise',
            choice.correct ? 'bg-ok-bg text-ink' : 'bg-warn-bg text-ink',
          )}
          aria-live="polite"
        >
          <b>{choice.correct ? 'Yes!' : 'Not quite.'}</b>
          <Rich text={choice.feedback} inline />
        </div>
      )}
    </TryShell>
  );
}

function TryWrite({ t, accent }: { t: Extract<Try, { type: 'write' }>; accent: string }) {
  const [text, setText] = useState('');
  const [shown, setShown] = useState(false);
  const ready = text.trim().length >= 10;
  return (
    <TryShell accent={accent}>
      <Rich text={t.prompt} className="text-[14.5px] font-semibold text-ink" />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t.placeholder ?? 'Type your answer…'}
        rows={3}
        aria-label="Your answer"
        className="w-full resize-y rounded-xl border border-line-2 bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none placeholder:text-muted focus:border-brand"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShown(true)}
          disabled={!ready || shown}
          className="rounded-lg bg-ink px-3.5 py-2 text-[13px] font-semibold text-surface disabled:opacity-40"
        >
          Compare with a sample
        </button>
        {!ready && <span className="text-[12px] text-muted">Write a line first.</span>}
      </div>
      {shown && (
        <div className="grid gap-1 rounded-xl border border-ok/35 bg-ok-bg px-3.5 py-2.5 animate-rise">
          <span className="font-mono text-[11px] font-bold tracking-wide text-ok uppercase">
            A strong version
          </span>
          <Rich text={t.sample} className="text-[14px] text-ink" />
        </div>
      )}
    </TryShell>
  );
}

function TryCode({ t, accent }: { t: Extract<Try, { type: 'code' }>; accent: string }) {
  const [code, setCode] = useState(t.starter);
  const [hint, setHint] = useState(false);
  const runner = useRunner();
  const r = runner.result;
  const good = Boolean(r?.ok && t.expected && r.stdout.includes(t.expected));
  const run = () => runner.run(code, t.packages);
  return (
    <TryShell accent={accent}>
      <Rich text={t.prompt} className="text-[14.5px] font-semibold text-ink" />
      <CodeEditor
        value={code}
        onChange={setCode}
        label="Try-it code"
        filename="try.py"
        minRows={Math.min(8, Math.max(3, t.starter.split('\n').length))}
        onRun={run}
      />
      <div className="flex flex-wrap items-center gap-2">
        <RunButton busy={runner.busy} state={runner.state} label="Run" shortcut onClick={run} />
        {t.hint && !hint && (
          <button
            type="button"
            onClick={() => setHint(true)}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-[13px] font-medium text-ink-2 hover:bg-surface-2"
          >
            <Lightbulb className="size-3.5" aria-hidden /> Hint
          </button>
        )}
        <RunHint state={runner.state} busy={runner.busy} />
      </div>
      {hint && t.hint && (
        <div className="rounded-xl border border-warn/30 bg-warn-bg px-3.5 py-2 text-[13.5px] text-ink">
          <Rich text={t.hint} inline />
        </div>
      )}
      {r ? (
        <OutputPanel
          title="Terminal"
          text={r.stdout}
          error={r.error}
          ms={r.ms}
          command="python try.py"
          tone={r.ok ? (good ? 'ok' : 'neutral') : 'bad'}
          // The expected text itself stays hidden: finding it is the exercise.
          badge={t.expected ? <RunMark ok={good} yes="looks right" no="not yet" /> : null}
        />
      ) : (
        <IdleTerminal hint="Edit the code if you like, then Run." />
      )}
    </TryShell>
  );
}
