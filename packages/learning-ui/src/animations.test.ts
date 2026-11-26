import { ANIMATION_NAMES, ANIMATIONS, Slide } from '@app/content';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ANIMATION_LIBRARY_NAMES, AnimationView } from './animations';
import { narrationChunks, narrationOf, slideMillis, spoken } from './deck-play';

describe('animation library', () => {
  it('draws every animation that content can name', () => {
    expect([...ANIMATION_LIBRARY_NAMES].sort()).toEqual([...ANIMATION_NAMES].sort());
    for (const name of ANIMATION_NAMES) expect(ANIMATIONS[name].length).toBeGreaterThan(30);
  });

  it.each(ANIMATION_NAMES)('%s is an accessible, looping SVG in theme colours', (name) => {
    const html = renderToStaticMarkup(
      createElement(AnimationView, { name, caption: 'Real use: a caption' }),
    );
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label=');
    expect(html).toMatch(/<animate|<animateTransform|<animateMotion/);
    // Colours come from the theme tokens (so light and dark both work), never hard-coded.
    expect(html).not.toMatch(/(fill|stroke)="#/);
    // Professional diagrams: no emoji inside the pictures.
    expect(html.replace(/<figcaption[\s\S]*<\/figcaption>/, '')).not.toMatch(
      /\p{Extended_Pictographic}/u,
    );
    expect(html).toContain('Real use: a caption');
  });
});

describe('deck play mode', () => {
  const slide = Slide.parse({
    title: 'Sets keep only unique items',
    body: 'Use a **set** to drop duplicates.',
    points: ['No order, so no index'],
    visual: { type: 'code', code: 'print(set([1, 1]))', output: '{1}' },
    animation: { name: 'set-dedupe', caption: 'Real use: unique visitors' },
  });

  it('explains the slide in spoken words, never the code', () => {
    const said = narrationOf(slide);
    expect(said).toContain('Sets keep only unique items.');
    expect(said).toContain('Use a set to drop duplicates.');
    expect(said).toContain('You will see this in real products: unique visitors.');
    expect(said).not.toContain('print');
    expect(said).not.toContain('**');
  });

  it("uses a slide's own script when it has one", () => {
    const scripted = Slide.parse({
      title: 'Divide the scores',
      visual: { type: 'code', code: 'print(1 / 2)', output: '0.5' },
      narration: 'This code divides one by two, so it prints a half.',
    });
    expect(narrationOf(scripted)).toBe('This code divides one by two, so it prints a half.');
  });

  it('says symbols the way a person would', () => {
    expect(spoken('Cost: ₹240 → 3 × 80, at least 90%')).toBe(
      'Cost: 240 rupees gives 3 times 80, at least 90 percent.',
    );
    expect(spoken('Use `json.loads` & **retry**')).toBe('Use json.loads and retry.');
  });

  it('lists points with joining words and describes a comparison', () => {
    const s = Slide.parse({
      title: 'Workflow or agent',
      points: ['Code fixes the steps', 'The model picks the steps', 'Agents cost more'],
      visual: {
        type: 'compare',
        left: { title: 'Workflow', items: ['Fixed steps'] },
        right: { title: 'Agent', items: ['Flexible steps'] },
        better: 'none',
      },
    });
    const said = narrationOf(s);
    expect(said).toContain('First, Code fixes the steps.');
    expect(said).toContain('And finally, Agents cost more.');
    expect(said).toContain('On the other side, Agent: Flexible steps.');
  });

  it('cuts a long script into short pieces at sentence ends', () => {
    const text = Array.from({ length: 12 }, (_, i) => `This is sentence number ${i + 1}.`).join(
      ' ',
    );
    const chunks = narrationChunks(text, 80);
    expect(chunks.length).toBeGreaterThan(3);
    expect(chunks.every((c) => c.length <= 80 && /[.!?]$/.test(c))).toBe(true);
    expect(chunks.join(' ')).toBe(text);
  });

  it('keeps a slide up long enough to read it and watch its picture', () => {
    const ms = slideMillis(slide);
    expect(ms).toBeGreaterThanOrEqual(5000);
    expect(ms).toBeLessThanOrEqual(30_000);
    expect(ms).toBeGreaterThan(slideMillis({ ...slide, animation: undefined }));
  });
});
