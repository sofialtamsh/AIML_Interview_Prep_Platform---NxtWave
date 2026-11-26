/**
 * A PPT-style deck: one idea per slide, a picture on most slides, bullets that build in, and
 * small try-it moments, so a student gets comfortable with the topic before the deeper steps.
 * Every slide shares one fixed frame, so the deck never changes size and the controls stay
 * exactly where they are while you move through it.
 *
 * Responsive rules: the frame is sized to the room the window leaves it, and it is a CSS size
 * container. Everything on a slide lays itself out from the frame's own width and height (the
 * `@…:` variants and `cqw` / `cqh` units below), never from the window's, so a deck reads the same
 * in a narrow column, beside a sidebar, on a phone and in full screen.
 */
import { type StudentSection, shuffleStable } from '@app/content';
import { cn } from '@app/ui';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleX,
  Lightbulb,
  Maximize2,
  Minimize2,
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
import { useNarration, useNarratorVoice } from '../context';
import { narrationChunks, narrationOf, slideMillis } from '../deck-play';
import { iconOf } from '../icons';
import { Rich } from '../rich';
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
  const [full, setFull] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const start = useRef<number | null>(null);
  const narrator = useNarratorVoice();
  // The read-aloud voice is offered only where the host turns it on (LessonRuntime.narration).
  const narration = useNarration();
  const last = slides.length - 1;

  const go = (next: number) => {
    const n = Math.max(0, Math.min(last, next));
    if (n === index) return;
    setDirection(n > index ? 'from-right' : 'from-left');
    setIndex(n);
    setSeen((prev) => new Set(prev).add(n));
    setYourTurn(false);
  };
  // The lesson's own "next" button turns the slides before it leaves the deck, so pressing it
  // on the first slide never skips the rest.
  useStepFlow(index, last, go, {
    label: `Slide ${index + 1} of ${slides.length}`,
    next: 'Next slide',
  });

  // Full screen: the browser API where available, a fixed overlay otherwise.
  useEffect(() => {
    const on = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);
  const toggleFull = async () => {
    const el = stage.current?.parentElement;
    if (!el) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (el.requestFullscreen) await el.requestFullscreen();
      else setFull((f) => !f);
    } catch {
      setFull((f) => !f);
    }
  };

  // Play mode: each slide stays up for its reading time (or while the device voice reads it),
  // then the next one glides in. It stops at a try-it, so the student does it, and at the end.
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

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
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
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, a, textarea, input, pre, [role="region"]'))
      return;
    start.current = e.clientX;
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (start.current === null) return;
    const dx = e.clientX - start.current;
    start.current = null;
    if (dx <= -50) go(index + 1);
    else if (dx >= 50) go(index - 1);
  };

  // A deck is one size throughout, so the controls never move: that size is its tallest slide,
  // capped by the room the page has. Only ever growing keeps it from oscillating, because a
  // narrower frame can wrap text onto another line.
  const [tallest, setTallest] = useState(0);
  const reportHeight = useCallback(
    (px: number) => setTallest((was) => (px > was + 1 ? px : was)),
    [],
  );

  return (
    <section
      className={cn(
        'grid gap-3',
        full && 'fixed inset-0 z-50 content-center overflow-y-auto bg-bg p-4 sm:p-8',
      )}
      onKeyDown={onKeyDown}
      aria-roledescription="slide deck"
      aria-label={s.title ?? 'Slides'}
    >
      <div
        ref={stage}
        // One size for every slide of a deck, so the controls below never move. The height is the
        // room the page has for the deck (--lesson-room, set by the lesson player: the frame and
        // its controls then sit inside the window, with no page scrolling) less the controls row;
        // without a host value it is the window less 8rem, as before. A slide with more than fits
        // scrolls inside its own frame. `container-type: size` lets the slide read the frame's
        // width and height.
        className={cn(
          'relative touch-pan-y overflow-hidden rounded-3xl border border-line bg-surface shadow-soft select-text [container-type:size]',
          full
            ? 'h-[calc(100svh-8rem)]'
            : 'h-[clamp(20rem,calc(var(--lesson-room,calc(100svh-4.75rem))-3.25rem),620px)]',
        )}
        style={
          full || !tallest
            ? undefined
            : {
                // The tallest slide plus its padding, never more than the room, never under 20rem.
                height: `clamp(20rem, min(calc(var(--lesson-room, calc(100svh - 4.75rem)) - 3.25rem), ${Math.ceil(tallest + 88)}px), 620px)`,
              }
        }
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        {slides.map((slide, i) => (
          <SlideFrame
            // biome-ignore lint/suspicious/noArrayIndexKey: slides are positional
            key={i}
            slide={slide}
            number={i + 1}
            total={slides.length}
            active={i === index}
            direction={direction}
            onHeight={reportHeight}
          />
        ))}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => go(index - 1)}
          disabled={index === 0}
          className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-surface text-ink transition hover:border-ink-2 disabled:opacity-35"
          aria-label="Previous slide"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={togglePlay}
          className={cn(
            'grid size-10 shrink-0 place-items-center rounded-xl border transition',
            playing
              ? 'border-brand bg-brand-soft text-brand'
              : 'border-line bg-surface text-ink hover:border-ink-2',
          )}
          aria-label={playing ? 'Pause' : 'Play the slides'}
          aria-pressed={playing}
          title={playing ? 'Pause' : 'Play the slides'}
        >
          {playing ? (
            <Pause className="size-4" aria-hidden />
          ) : (
            <Play className="ml-0.5 size-4" aria-hidden />
          )}
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-1">
          {slides.map((slide, i) => (
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: slides are positional
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Slide ${i + 1}: ${slide.title}`}
              aria-current={i === index ? 'step' : undefined}
              className="group grid h-6 flex-1 place-items-center"
            >
              <span
                className={cn(
                  'relative h-1.5 w-full overflow-hidden rounded-full transition-all duration-300',
                  i === index
                    ? playing
                      ? 'bg-brand/30'
                      : 'bg-brand'
                    : seen.has(i)
                      ? 'bg-brand/45 group-hover:bg-brand/70'
                      : 'bg-line-2 group-hover:bg-muted/50',
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
        <span className="shrink-0 font-mono text-[12px] text-muted tabular-nums">
          {index + 1}/{slides.length}
        </span>
        {speechOk && (
          <button
            type="button"
            onClick={() => setVoice((v) => !v)}
            className={cn(
              'grid size-10 shrink-0 place-items-center rounded-xl border transition',
              voice
                ? 'border-brand bg-brand-soft text-brand'
                : 'border-line bg-surface text-muted hover:text-ink',
            )}
            aria-label={voice ? 'Stop reading aloud' : 'Read the slides aloud while playing'}
            aria-pressed={voice}
            title={voice ? 'Reading aloud' : 'Read aloud'}
          >
            {voice ? (
              <Volume2 className="size-4" aria-hidden />
            ) : (
              <VolumeOff className="size-4" aria-hidden />
            )}
          </button>
        )}
        {/* In the controls row, not on the frame: there it covered the corner of a slide. */}
        <button
          type="button"
          onClick={toggleFull}
          className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-surface text-muted transition hover:text-ink"
          aria-label={full ? 'Exit full screen' : 'Show the slides full screen'}
          title={full ? 'Exit full screen' : 'Full screen'}
        >
          {full ? (
            <Minimize2 className="size-4" aria-hidden />
          ) : (
            <Maximize2 className="size-4" aria-hidden />
          )}
        </button>
        <button
          type="button"
          onClick={() => go(index + 1)}
          disabled={index === last}
          className={cn(
            'grid size-10 shrink-0 place-items-center rounded-xl transition disabled:opacity-35',
            index === last
              ? 'border border-line bg-surface text-ok'
              : 'bg-ink text-surface hover:opacity-90',
          )}
          aria-label={index === last ? 'Last slide' : 'Next slide'}
        >
          {index === last ? (
            <Check className="size-5" aria-hidden />
          ) : (
            <ChevronRight className="size-5" aria-hidden />
          )}
        </button>
      </div>
      {yourTurn && slides[index]?.try && (
        <p className="flex items-center gap-2 rounded-xl border border-brand/25 bg-brand-soft px-3.5 py-2 text-[13px] text-ink">
          <Sparkles className="size-4 shrink-0 text-brand" aria-hidden />
          Your turn: try it, then press play to carry on.
        </p>
      )}
      <p className="sr-only" aria-live="polite">
        Slide {index + 1} of {slides.length}: {slides[index]?.title}
      </p>
    </section>
  );
}

function SlideFrame({
  slide,
  number,
  total,
  active,
  direction,
  onHeight,
}: {
  slide: Slide;
  number: number;
  total: number;
  active: boolean;
  direction: 'from-right' | 'from-left';
  /** The height this slide needs, so the deck can size itself to its tallest one. */
  onHeight?: (px: number) => void;
}) {
  const accent = slide.accent ?? ACCENTS[(number - 1) % ACCENTS.length] ?? 'g0';
  const anim = slide.animation;
  // A picture only sits beside the headline when the headline column has enough to say to fill
  // it. A kicker and a title alone next to a dense picture leave half the slide empty and cram
  // the other half; with little text the title goes across the top and the picture takes the
  // full width below, so the slide covers its ground evenly.
  const saysEnough = (slide.body?.length ?? 0) + slide.points.join(' ').length >= 110;
  const side =
    saysEnough &&
    (Boolean(anim) ||
      (slide.visual &&
        !slide.try &&
        // Code, a row of terms and a two-column comparison are all wide by nature: squeezed into
        // half a slide they wrap to shreds, so they take the full width under the headline.
        slide.visual.type !== 'code' &&
        slide.visual.type !== 'sequence' &&
        slide.visual.type !== 'table' &&
        slide.visual.type !== 'compare'));
  let n = 0;
  const next = () => order(n++);
  // A printed result is only worth something if the student has guessed at it first. So the
  // output of a code sample, and the note that explains it, wait for the student to ask.
  const gated = slide.visual?.type === 'code' && slide.visual.output !== undefined;
  const [shown, setShown] = useState(false);
  const reveal = gated ? { shown, onShow: () => setShown(true) } : undefined;

  // The frame never grows: taller content scrolls inside it, with a "More" cue while some is hidden.
  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  // The deck sizes itself to its tallest slide, so it needs each slide's natural height.
  useEffect(() => {
    const el = content.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const report = () => onHeight?.(el.getBoundingClientRect().height);
    report();
    const observer = new ResizeObserver(report);
    observer.observe(el);
    return () => observer.disconnect();
  }, [onHeight]);
  const [scrollable, setScrollable] = useState(false);
  const [more, setMore] = useState(false);
  const measure = () => {
    const el = scroller.current;
    if (!el) return;
    setScrollable(el.scrollHeight > el.clientHeight + 4);
    setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 12);
  };
  // biome-ignore lint/correctness/useExhaustiveDependencies: measure reads refs only
  useEffect(() => {
    if (!active) return;
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = 0;
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (content.current) ro.observe(content.current);
    return () => ro.disconnect();
  }, [active]);

  return (
    <section
      className={cn(
        'deck-slide absolute inset-0',
        // Inactive slides stay mounted (so try-it answers survive) and keep being laid out, so
        // the deck knows every slide's height from the start and its frame never resizes
        // mid-deck. `invisible` also takes them out of the tab order, and aria-hidden out of
        // the reading order.
        active ? `is-active ${direction}` : 'invisible',
      )}
      aria-hidden={!active}
      style={{
        backgroundImage: `radial-gradient(60% 70% at 100% 0%, ${tint(accent, 13)}, transparent 70%), radial-gradient(40% 50% at 0% 100%, ${tint(accent, 7)}, transparent 70%)`,
      }}
    >
      {/* A big, faint slide number, like a designed deck. */}
      <span
        className="pointer-events-none absolute right-14 bottom-3 font-display text-[64px] leading-none font-extrabold text-ink/[0.045] select-none @lg:text-[88px]"
        aria-hidden
      >
        {String(number).padStart(2, '0')}
      </span>
      <div
        ref={scroller}
        onScroll={measure}
        tabIndex={scrollable ? 0 : undefined}
        // Padding and gaps tighten on a short frame (cqh is 1% of the frame's height), so more
        // of a slide fits before it has to scroll; at the full 620px frame they are as designed.
        // touch-pan-y: this scroller takes vertical touches only, so a sideways swipe reaches
        // the deck (the frame's own touch-pan-y does not apply inside a scroll container).
        className="relative flex h-full touch-pan-y flex-col overflow-y-auto px-5 pt-6 pb-5 [scrollbar-width:thin] @lg:px-8 @lg:py-[clamp(1rem,8cqh-0.75rem,2rem)]"
      >
        {/* Shorter slides sit in the middle of the frame, like a designed deck. */}
        <div
          ref={content}
          className="relative my-auto grid grid-cols-[minmax(0,1fr)] gap-[clamp(0.75rem,4cqh-0.3rem,1.25rem)]"
        >
          <div
            className={cn(
              // --fig-h caps a moving picture (see AnimationView). Stacked under the text it may
              // take about a third of the frame; beside the text, the frame's full height.
              'relative grid grid-cols-[minmax(0,1fr)] gap-[clamp(0.875rem,5cqh-0.4rem,1.5rem)] [--fig-h:34cqh]',
              // Side by side when the frame itself is wide enough (42rem), whatever the window is.
              side &&
                '@2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] @2xl:items-center @2xl:gap-8 @2xl:[--fig-h:calc(100cqh-8rem)]',
            )}
          >
            <div className="grid content-start gap-3">
              <span className="build flex items-center gap-2" style={next()}>
                <span
                  className="rounded-full px-2.5 py-1 font-mono text-[10.5px] font-bold tracking-[0.1em] uppercase"
                  style={{ color: `var(--${accent})`, background: tint(accent, 14) }}
                >
                  {slide.kicker ?? `Slide ${number} of ${total}`}
                </span>
              </span>
              <h3
                className="build text-[clamp(21px,3.7cqw,28px)] leading-[1.15] tracking-tight"
                style={next()}
              >
                {slide.title}
              </h3>
              {slide.body && (
                <div className="build" style={next()}>
                  <Rich text={slide.body} className="text-[15.5px] leading-relaxed text-ink-2" />
                </div>
              )}
              {slide.points.length > 0 && (
                <ul className="grid gap-2">
                  {slide.points.map((p) => (
                    <li key={p} className="build flex gap-2.5" style={next()}>
                      <span
                        className="mt-[3px] grid size-5 shrink-0 place-items-center rounded-md"
                        style={{ background: tint(accent, 18), color: `var(--${accent})` }}
                        aria-hidden
                      >
                        <ArrowRight className="size-3" />
                      </span>
                      <Rich text={p} inline className="text-[14.5px] text-ink" />
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {anim ? (
              <div className="build min-w-0" style={next()}>
                {/* Mounted only while showing, so the story plays from its start each time. */}
                {active && <AnimationView name={anim.name} caption={anim.caption} />}
              </div>
            ) : (
              slide.visual && (
                // Each visual's slot is its own container: the visual arranges itself from the
                // width it really has (full width, or the narrower column beside the headline).
                <div className="build @container min-w-0" style={next()}>
                  <VisualView visual={slide.visual} accent={accent} reveal={reveal} />
                </div>
              )
            )}
          </div>
          {anim && slide.visual && (
            <div className="build @container relative min-w-0" style={next()}>
              <VisualView visual={slide.visual} accent={accent} reveal={reveal} />
            </div>
          )}
          {slide.try && (
            <div className="build relative" style={next()}>
              <TryView t={slide.try} accent={accent} />
            </div>
          )}
          {slide.note && (
            <div
              className={cn(
                'build relative flex gap-2.5 rounded-xl border border-line bg-surface/80 px-3.5 py-2.5 text-[13.5px] backdrop-blur',
                gated && !shown && 'invisible',
              )}
              aria-hidden={gated && !shown ? true : undefined}
              style={next()}
            >
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
              <Rich text={slide.note} inline />
            </div>
          )}
        </div>
      </div>
      {more && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 grid h-16 place-items-end justify-center bg-gradient-to-t from-surface to-transparent pb-2.5">
          <button
            type="button"
            onClick={() =>
              scroller.current?.scrollBy({
                top: scroller.current.clientHeight * 0.8,
                behavior: 'smooth',
              })
            }
            className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1 text-[12px] font-semibold text-ink-2 shadow-soft hover:text-ink"
          >
            More <ChevronDown className="size-3.5" aria-hidden />
          </button>
        </div>
      )}
    </section>
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
    const read = () => setWidth(Math.round(el.getBoundingClientRect().width));
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
 * compact list, icon beside the text, so they still fit the frame.
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
              list
                ? 'grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 p-2.5 @md:grid-cols-1 @md:gap-2 @md:p-3.5'
                : 'gap-2 p-3.5',
            )}
            style={order(i + 2)}
          >
            <span
              className={cn(
                'grid place-items-center rounded-xl',
                list ? 'row-span-2 size-9 @md:row-span-1 @md:size-10' : 'size-10',
              )}
              style={{ background: tint(a, 15), color: `var(--${a})` }}
            >
              <Icon className="size-5" aria-hidden />
            </span>
            <span
              className={cn(
                'text-[14px] leading-snug font-semibold [overflow-wrap:anywhere] text-ink',
                list && !it.sub && 'self-center @md:self-auto',
              )}
            >
              {it.label}
            </span>
            {it.sub && (
              <span className="text-[12.5px] leading-snug [overflow-wrap:anywhere] text-muted">
                {it.sub}
              </span>
            )}
          </li>
        );
      })}
    </ul>
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
      const row = visual.steps.length <= 4;
      return (
        <ol
          className={cn(
            'flex flex-col items-stretch gap-1.5',
            row && '@xl:flex-row @xl:items-stretch',
          )}
        >
          {visual.steps.map((st, i) => {
            const Icon = st.icon ? iconOf(st.icon) : null;
            return (
              <li
                key={st.label}
                className={cn('build flex min-w-0 items-center gap-1.5', row && '@xl:flex-1')}
                style={order(i + 2)}
              >
                {i > 0 ? (
                  <ArrowRight
                    className={cn(
                      'size-4 shrink-0 rotate-90 self-center text-muted',
                      row && '@xl:rotate-0',
                    )}
                    aria-hidden
                  />
                ) : (
                  // The first step keeps the arrow gutter empty, so every step lines up.
                  <span className={cn('size-4 shrink-0', row && '@xl:hidden')} aria-hidden />
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
        <div className="grid gap-2.5 @xs:grid-cols-2">
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
    case 'table':
      return (
        // Scrolls sideways inside its own box on a narrow screen; the slide itself never does.
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-soft">
          <table className="w-full border-collapse text-[13.5px] tabular-nums">
            <thead>
              <tr className="border-line border-b bg-surface-2 text-left">
                {visual.columns.map((c, j) => (
                  <th
                    key={c}
                    scope="col"
                    className="px-3 py-2 font-semibold whitespace-nowrap text-ink"
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
                      className="px-3 py-1.5 font-mono text-ink"
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
                      className="px-3 py-2 font-mono font-bold text-ink"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      );
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
