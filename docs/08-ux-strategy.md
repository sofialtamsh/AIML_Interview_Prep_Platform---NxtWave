# 08 · UI/UX Strategy

## 1. Design principles
1. **Learning product, not a document reader.** Every screen has one primary action. Lessons are things you *do* (toggle, predict, run), not walls of text.
2. **Gen Z-friendly, still professional.** Bold type, crisp cards, playful micro-interactions, emoji in feedback, instant celebration, friendly microcopy. No childish styling, no corporate-portal greys.
3. **Show progress constantly.** Rings, step dots, XP, streaks, "x of y". Students always know where they are and what's next.
4. **Low cognitive load.** Short sections, progressive disclosure (expand, flip, reveal), mobile-first layouts, one idea per screen.
5. **Respect the learner.** `prefers-reduced-motion` turns off confetti and motion. No dark patterns in streaks. Copy never shames.
6. **Same renderer everywhere.** The admin preview is pixel-identical to the student view.

## 2. Visual language (aligned with the NxtWave prototype)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--brand` | `#1F5BFF` NxtWave blue | `#6690FF` | Primary actions, progress, focus |
| `--ink` / `--ink-2` / `--muted` | `#0B1526` / `#3B4A62` / `#6A778E` | `#E8EDF7` / `#B4C0D4` / `#8593AB` | Text hierarchy |
| `--bg` / `--surface` / `--surface-2` | `#F7F8FB` / `#FFFFFF` / `#F1F4F9` | `#0A101C` / `#111A2B` / `#172238` | Layers |
| `--easy` / `--med` / `--hard` / `--expert` | green / amber / red / violet | brighter variants | Difficulty pills |
| `--ok` / `--bad` / `--hl` | success / error / highlight-yellow | – | Feedback states |
| `--g0…g4` | blue, orange, teal, violet, pink | – | Categorical (series, chunk colours, groups) |

- **Type:** *Geist* (UI and body) + *JetBrains Mono* (display headings, numbers, code, eyebrows), self-hosted. Display sizes use `clamp()`.
- **Shape and depth:** 14 px card radius, 1 px hairline borders, soft layered shadows, hover lift of 2 px.
- **Texture:** a subtle dot-grid background on hero areas (the prototype's "interview desk"), plus a faint brand aurora on the Home hero.
- **Motion:** 150–250 ms ease-out transitions. Step-in animations on lesson steps. Count-up numbers. Confetti only on real wins (lesson complete, question solved, level up). Everything is disabled under reduced motion.
- **Iconography:** lucide icons. Mono-letter role badges (`AI`, `ML`, `DA`, `DS`) coloured from the categorical palette.

## 3. Student information architecture

```
Desktop top nav:  Home · Roadmap · Learn · Practice · System Design · Progress      [⌘K Search] [🔥 4] [Lv 3 · 610 XP] (avatar)
Mobile bottom nav: Home · Roadmap · Practice · Progress · More
```

### 3.1 Onboarding (one decision per screen, animated stepper)
```
┌──────────────────────────────────────────────┐
│ ● ○ ○ ○   Step 1 of 4                          │
│ What role are you preparing for?               │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│ │ AI  AI   │ │ ML  ML   │ │ DA Data  │ …       │
│ │ Engineer │ │ Engineer │ │ Analyst  │         │
│ │ LIVE     │ │ NEXT UP  │ │ PLANNED  │         │
│ │ LLMs, RAG│ │ 🔔 Notify│ │ 🔔 Notify│         │
│ └──────────┘ └──────────┘ └──────────┘         │
│ What you'll learn ▸ (expands competencies)     │
│                                   [Continue →] │
└──────────────────────────────────────────────┘
Step 2: target package (cards: "8–12 LPA · What interviews expect: …")
Step 3: quick self-check per skill area (😶 New · 🙂 Basics · 😎 Comfortable · 🚀 Confident)
Step 4: your time (minutes/day slider with presets 30/60/120/180 · weekday chips · optional deadline date)
→ "Building your roadmap…" (animated assembling of topic chips) → Roadmap reveal
```

### 3.2 Home (bento dashboard)
```
┌ Hi Priya 👋  AI Engineer · 8–12 LPA ─────────────────────────────────────────┐
│ ┌ Continue ─────────────────────────┐ ┌ Today ───────────┐ ┌ Streak & XP ──┐ │
│ │ RAG › Chunking strategies          │ │ 45 / 60 min      │ │ 🔥 4 days      │ │
│ │ Step 4 of 9 · ~12 min left         │ │ ▓▓▓▓▓▓▓░░        │ │ Lv 3 Solver    │ │
│ │ [Resume lesson →]                  │ │ • Finish chunking│ │ ▓▓▓▓░ 610 XP   │ │
│ └────────────────────────────────────┘ │ • 3 practice Qs  │ └────────────────┘ │
│ ┌ Warm-up (fill the blank, rotates) ─┐ └──────────────────┘ ┌ Roadmap ──────┐ │
│ │ chunk_text.py   ____ = 512          │ ┌ Revisit ─────────┐ │ ◔ 38% · on track│
│ │ [overlap] [stride] [size]  ▶ Run   │ │ Cosine vs dot:   │ │ ends 15 Jan    │ │
│ └────────────────────────────────────┘ │ 2/5 correct →    │ └────────────────┘ │
│ ┌ Question of the day ───────────── Hard · Swiggy ── [Solve →] ┐              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Roadmap
A vertical journey: topic nodes, then subtopic rows with status (✓ done · ◐ in progress · ⚠ delayed · ○ upcoming), planned dates, minutes and a depth badge ("Advanced: because 8–12 LPA AI Engineer interviews probe this"). A *Timeline* toggle shows a week-by-week view. A **Plan settings** drawer edits time or deadline, previews the diff and confirms. A **proposal banner** offers "Your roadmap has an update → See what changed".

### 3.4 Topic page: the dual path
```
┌ Retrieval-Augmented Generation ─────────── Your depth: Advanced ⓘ ┐
│ ┌──────────────────────────────┐  ┌──────────────────────────────┐ │
│ │ 📘 Learn the Concept          │  │ 🎯 Practice Questions         │ │
│ │ 3 lessons · ~2h 10m           │  │ 46 questions for you          │ │
│ │ ▓▓▓▓░░ 1 of 3 done            │  │ 12 attempted · 75% correct    │ │
│ │ [Continue learning →]         │  │ [Start practice →]            │ │
│ └──────────────────────────────┘  └──────────────────────────────┘ │
│ Subtopics: Why RAG ✓ · Chunking ◐ · Retrieval quality ○              │
└─────────────────────────────────────────────────────────────────────┘
```
Practice is visible from day one. With no questions yet, the tile shows "Questions are being added. 🔔 Notify me."

### 3.5 Lesson player
- **Desktop:** the prototype's split layout. Narrative on the left (sticky): title, short text, notes, inline choices. The live visual on the right: code explorer, widget, diagram or cards.
- **Mobile:** stacked, with the visual first and the narrative below.
- **Top:** step dots (numbers, `?` for checks, `★` for summary) and a progress bar. Keyboard ← → navigation.
- **Every step:** "Was this clear? 👍 👎". A thumbs-down opens reason chips.
- **Fast-tracked sections** render collapsed: "⚡ Quick refresher (you said you're comfortable), expand to review".
- **End screen:** takeaways, objectives met ✓, check score, XP gained, a "Practice this now →" CTA, and a 5-face rating with the **11★ question**.

### 3.6 Practice
- **Desktop:** topic tree with counts (left). Filters: search, difficulty, type, company, status. Table rows: status icon, title, concept, "Asked at" tags, lesson dots, difficulty pill.
- **Mobile:** card list with a filter sheet.
- **Question page:** header (difficulty, companies, concepts, suggested time) and tabs **1 · Learn** | **2 · Solve**. First visit asks "How do you want to start?": *Learn the idea first* (recommended, n steps, the concepts it teaches) or *Go straight to the question*. Skipping shows a gentle nudge with skip-reason chips and "Read the takeaways (1 min)".
- **Solve:** MCQ options, code editor (CodeMirror + Pyodide) or the **NxtWave portal deep link** (for portal questions), plus the timer, *Expected output*, *Why interviewers ask this* and *Follow-ups* (collapsible). Submit → result animation, explanation, the correct answer, "Revisit section →" when wrong, and "Next question →".

### 3.7 System Design (case studies)
An outline rail (steps with ✓). The article reveals the next step after the current activity (skip allowed). Widgets are inline. It ends with the 45-minute interview playbook and follow-ups.

### 3.8 Progress (only the student's own)
A level card (XP rules visible), roadmap ring, **Learning** and **Practice** shown as separate panels, a concept mastery list (weak first), a 12-week activity heatmap and a recent activity feed.

## 4. Admin information architecture

```
Sidebar
  Overview
  Students ............ list + filters (role, bracket, cohort, progress, completed topic, last active) → student track
  Catalog ............. Roles · Brackets · Depth levels · Skill areas · Companies · Difficulty policy
  Curriculum .......... Taxonomy (topics/subtopics/concepts/prereqs) · Role curricula (role × bracket editor) · Aliases
  Content ............. Lessons · Question primers · Case studies · Review queue · Publishing
  Question bank ....... Questions · Imports · Duplicates · Untagged
  Agents & jobs ....... Run agent · Job monitor (logs, cost)
  Research ............ Sources · Findings · Reports · Curriculum proposals
  Feedback ............ Ratings · Content issues (triage)
  Analytics ........... Learning · Practice · Lesson impact · Interest · AI usage & cost
  Integrations ........ NxtWave portal & solved-status sync
  AI models ........... Providers · Routes · Prompts · Pricing      (super admin)
  Settings ............ Registration · Publishing policy · Admins · Audit log   (super admin)
```
Style: the same tokens, denser (13–14 px tables), sticky table headers, saved filters, side drawers for details, a split **editor ↔ live preview** for content with a *bracket A vs bracket B* compare mode, and inline diffs between versions.

## 5. Microcopy guide
- Talk like a friendly senior: "Nice! That's the trick interviewers look for." / "Not quite. Look at the Henry row again."
- Plain words, short sentences, no jargon in UI chrome.
- Errors say what to do next: "That email is already registered. Try signing in."
- Celebrate effort, not only results: "3 days in a row. Your future self says thanks 🔥"

## 6. Accessibility
WCAG 2.2 AA contrast in both themes. Every interactive widget is keyboard-operable with visible focus. Diagrams have `altText` and a step list. Videos have captions or a transcript. Charts have data tables. Live regions announce check results. Touch targets are ≥ 44 px.
