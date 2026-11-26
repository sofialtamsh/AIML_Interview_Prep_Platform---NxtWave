/**
 * Self-Introduction & HR Round → Internship and experience story.
 *
 * Evidence (Hiring Intelligence, 72 ML/AI companies, Jan–Oct 2026): internship and experience
 * questions at 34 companies, 80 of 120 of them in Technical Round 1. "Your role / your exact
 * contribution" at 26 companies, "challenges you faced and how you solved them" at 23, failures
 * and mistakes at 13. 3–6 LPA teaches this at depth 1 (one STAR story, your own part); 8–12 LPA
 * at depth 2 (a second, challenge story and quantified impact). Sneha and her numbers are an
 * illustrative example, kept consistent across both stories: the honest baseline is 79%, the
 * final model 87%.
 *
 * Review v1 → v2 (independent reviewer, 2026-11-06): consistent scores across stories, the real
 * root causes (a split that leaked duplicates, plus old training data) owned as Sneha's mistake,
 * a non-leaky feature (delivery delay), reasons for the model choice, realistic timings and
 * sorting times, both playbooks visible at depth 2, a write-your-own STAR item at depth 1, a
 * challenge follow-up at depth 1, stronger distractors, "support agents" (not AI agents).
 *
 * v3 (2026-11-09, user request): teaching moved into PPT-style slide decks with try-its
 * (the STAR explanation, callouts, no-internship cards and the impact table became slides).
 *
 * Audit (2026-11-18, 8–12 LPA bar): an interview-questions card deck that answers the playbook
 * follow-ups, a "What you learned" slide, a "Defend each decision" slide, a general definition of
 * data leakage, the sorting time kept as the agents' estimate, and held-out and F1 glossed.
 */
import type { LessonDocumentInput } from '@app/content';

const STAR = 'hr.experience.star';
const CONTRIBUTION = 'hr.experience.contribution';

const STORY = {
  situation:
    'In my two-month internship at a food-delivery startup, I worked in a three-person team. Support got about 2,000 complaint tickets a day and sorted each one by hand.',
  task: 'My task was to build a model that sorts each ticket into one of six categories, like refund or late delivery.',
  action:
    'The old tags were messy, so I relabelled 3,000 tickets in the labelling tool my teammates built. I started with TF-IDF and logistic regression, because it trains fast and is easy to explain. Late-delivery tickets were often confused with refunds, so I added how late each order was. Then I served the model through a FastAPI endpoint for the support dashboard.',
  result:
    'The model reached 87% accuracy on held-out tickets, and every category scored above 0.8 F1. Support agents now confirm a suggested category, and they estimate sorting time fell from about 60 seconds to 15 a ticket.',
};

const CHALLENGE = {
  situation:
    'Two weeks before our demo, the classifier scored 95% in testing but only 70% on live tickets.',
  task: 'I had to find out why, and fix it before the demo.',
  action:
    "I compared the training data with live tickets that support agents had labelled. My split was the problem: I hadn't removed duplicates first, so the same tickets sat in both training and test sets. That inflated the test score. Live tickets were also newer than my training data. So I removed duplicates before splitting and added two weeks of fresh tickets to training.",
  result:
    'The honest test score fell to 79%, and live accuracy rose to 78%, so the two finally matched. Now I remove duplicates before splitting, every time.',
};

export const INTERNSHIP_EXPERIENCE_LESSON: LessonDocumentInput = {
  title: 'Internship and experience story',
  subtitle: 'Turn an internship or team project into a clear STAR story that shows what you did.',
  objectives: [
    {
      key: 'star',
      text: 'Tell one internship or project story in the STAR format',
      minDepthRank: 1,
    },
    {
      key: 'own-part',
      text: 'Say exactly what you did, separate from what the team did',
      minDepthRank: 1,
    },
    {
      key: 'impact',
      text: 'Turn activities into results with numbers, scale or users',
      minDepthRank: 2,
    },
    {
      key: 'challenge',
      text: 'Tell a second story about a problem or mistake you fixed, and what you learned',
      minDepthRank: 2,
    },
  ],
  sections: [
    {
      key: 'hook',
      kind: 'HOOK',
      title: 'Experience questions in interviews',
      depthRank: 1,
      conceptKeys: [STAR, CONTRIBUTION],
      body: {
        scenario:
          'Your resume says *"ML Intern, 2 months"*. The interviewer reads it and asks: **"Explain your internship experience. What exactly did you do?"** You did a lot. But it all happened in a team, and suddenly it\'s hard to say which part was yours.',
        provocation: 'How do you tell it so they see your part clearly?',
        analogy: {
          text: 'Think of a good cricket match report. It gives the situation, the target, what the batter actually did, and the final result. Nobody writes only "the team played well".',
          mapping: [
            { everyday: 'Chasing 180 in 20 overs', technical: 'Situation' },
            { everyday: 'Score fast without losing wickets', technical: 'Task' },
            { everyday: "The batter's shots, over by over", technical: 'Action' },
            { everyday: 'Won with two balls left', technical: 'Result' },
          ],
          whereItBreaks:
            'A match report covers the whole team. In an interview, the spotlight stays on your own actions, even when the work was shared.',
        },
        bridge:
          'Experience questions usually come in the first technical round, so expect follow-ups on every tool you name. **STAR** gives your story a shape interviewers can follow.',
      },
    },
    {
      key: 'slides.star',
      kind: 'SLIDES',
      title: 'Experience stories in ten slides',
      depthRank: 1,
      conceptKeys: [STAR, CONTRIBUTION],
      body: {
        slides: [
          {
            kicker: 'The question',
            title: '"Explain your internship experience"',
            body: 'Interviewers listen for three things in your answer.',
            visual: {
              type: 'icons',
              items: [
                { icon: 'user', label: 'Your own part', sub: "Not the whole team's work" },
                { icon: 'code', label: 'Tools and why', sub: 'Each one invites a follow-up' },
                { icon: 'chart', label: 'What changed', sub: 'A number, if you have one' },
              ],
            },
          },
          {
            kicker: 'The method',
            title: 'STAR: a story in four parts',
            body: 'Interviewers follow a story easily when it has this shape.',
            animation: { name: 'star-timeline' },
            note: 'Action gets the most time. That is where they learn what you can do.',
          },
          {
            kicker: 'S and T',
            title: 'Set it up in two lines',
            points: ['Where you were and what was wrong', 'What you were responsible for'],
            visual: {
              type: 'chat',
              lines: [
                {
                  from: 'candidate',
                  text: 'At a food-delivery startup, support got 2,000 complaint tickets a day. My task was a model to sort them.',
                },
              ],
            },
          },
          {
            kicker: 'A',
            title: 'Action: say "I", not "we"',
            body: 'Name the team in one line. Then talk only about your part.',
            visual: {
              type: 'compare',
              left: {
                title: 'Only "we"',
                items: ['We collected the data', 'We trained models', 'We deployed it'],
              },
              right: {
                title: 'Clear "I"',
                items: [
                  'I relabelled 3,000 messy tickets',
                  'I added delivery delay as a feature',
                  'I served the model with FastAPI',
                ],
              },
              better: 'right',
            },
            note: 'Saying "I" is not boasting. "What exactly was your role?" is one of the most common follow-ups.',
          },
          {
            kicker: 'R',
            title: 'Result: a number that changed',
            visual: {
              type: 'stat',
              value: '60s → 15s',
              label: 'sorting time per ticket, as estimated by support agents',
              sub: 'Plus 87% accuracy on held-out tickets',
            },
            note: 'Never invent a number. Say how it was measured, even if it was an estimate.',
          },
          {
            kicker: 'Try it',
            title: 'Spot the Action',
            try: {
              type: 'choice',
              prompt: 'Which line is the **Action** part of the story?',
              options: [
                {
                  text: '"Support got 2,000 tickets a day."',
                  correct: false,
                  feedback: 'That is the Situation: the problem before you started.',
                },
                {
                  text: '"I added how late each order was as a feature."',
                  correct: true,
                  feedback: 'Something you did, with "I" and a specific decision.',
                },
                {
                  text: '"Agents estimate sorting time fell to 15 seconds."',
                  correct: false,
                  feedback: 'That is the Result: what changed because of your work.',
                },
              ],
            },
          },
          {
            kicker: 'Follow-up',
            title: 'Challenges you faced',
            body: 'A very common follow-up. Answer in three beats: the problem, what you tried and what worked.',
            visual: {
              type: 'flow',
              steps: [
                { label: 'Late orders tagged as refunds', icon: 'alert' },
                { label: 'Checked the mixed-up tickets', icon: 'search' },
                { label: 'Added delivery delay', icon: 'check' },
              ],
            },
          },
          {
            kicker: 'Follow-up',
            title: 'What you learned',
            body: '"What did you learn from your internship?" Give one technical lesson and one work habit, each tied to a real moment. "Teamwork" alone says nothing.',
            visual: {
              type: 'chat',
              lines: [
                {
                  from: 'candidate',
                  text: 'I learned to check the data before the model. The old tags were messy, so I relabelled 3,000 tickets before training anything.',
                },
                {
                  from: 'candidate',
                  text: 'I also learned to explain my model simply, because support agents had to trust its suggestions.',
                },
              ],
            },
          },
          {
            kicker: 'Without an internship',
            title: 'You still have stories',
            visual: {
              type: 'icons',
              items: [
                { icon: 'graduation', label: 'Final-year project', sub: 'The module you built' },
                { icon: 'zap', label: 'Hackathon', sub: 'What you built in 36 hours' },
                { icon: 'laptop', label: 'Personal project', sub: 'Every decision was yours' },
                { icon: 'globe', label: 'Open source', sub: 'A merged pull request counts' },
                { icon: 'users', label: 'Clubs and events', sub: 'Good for HR rounds' },
                {
                  icon: 'book',
                  label: 'Training program',
                  sub: 'Call it a training program, not an internship',
                },
              ],
            },
          },
          {
            kicker: 'Try it',
            title: 'Write your Action line',
            try: {
              type: 'write',
              prompt: 'Write one Action line from your own project or internship. Start with "I".',
              placeholder: 'I…',
              sample:
                'I cleaned 5,000 product reviews in pandas and trained a logistic regression model to tag complaints.',
            },
          },
        ],
      },
    },
    {
      key: 'visual.star',
      kind: 'VISUAL',
      title: 'STAR story of an internship',
      depthRank: 1,
      conceptKeys: [STAR, CONTRIBUTION],
      body: {
        scene: {
          type: 'anatomy',
          heading: "Sneha's internship story · about a minute",
          parts: [
            {
              label: 'Situation',
              seconds: 13,
              text: STORY.situation,
              note: 'Set the scene in one or two lines: where you were and what was wrong.',
            },
            {
              label: 'Task',
              seconds: 9,
              text: STORY.task,
              note: "Your responsibility, not the whole team's goal.",
            },
            {
              label: 'Action',
              seconds: 26,
              text: STORY.action,
              note: 'The longest part. Say **I**, name your tools and decisions, and give a reason for each.',
            },
            {
              label: 'Result',
              seconds: 15,
              text: STORY.result,
              note: "End with what changed, in numbers if you can. Held-out tickets are ones the model never saw in training. F1 balances precision and recall. (Sneha's numbers are an example.)",
            },
          ],
        },
        caption: 'Notice the "because" and "so" in the Action: each decision comes with a reason.',
        altText:
          'An internship story split into four colour-coded STAR parts on a one-minute timeline: Situation (13 seconds), Task (9), Action (26, the longest part) and Result (15).',
      },
    },
    {
      key: 'visual.we-vs-i',
      kind: 'VISUAL',
      title: 'Team credit vs your contribution',
      depthRank: 1,
      conceptKeys: [CONTRIBUTION],
      body: {
        scene: {
          type: 'chat',
          interviewer: 'Interviewer',
          candidate: 'Sneha',
          takes: [
            {
              label: 'Only "we"',
              tone: 'bad',
              messages: [
                { from: 'interviewer', text: 'Explain your internship experience.' },
                {
                  from: 'candidate',
                  text: 'We built a complaint classifier for a food-delivery app. We collected the data, we trained models and we deployed it. It worked really well.',
                  note: { tone: 'bad', text: 'Four "we"s and no "I". Which part was hers?' },
                },
                {
                  from: 'interviewer',
                  text: 'What exactly did you do in that project?',
                  note: { tone: 'info', text: 'The question every vague answer triggers.' },
                },
                {
                  from: 'candidate',
                  text: 'I helped with everything, basically. Data, model, deployment, all of it.',
                  note: { tone: 'bad', text: '"Everything" sounds like nothing in particular.' },
                },
              ],
              verdict: {
                tone: 'bad',
                text: "The interviewer still can't tell what Sneha can do on her own, so the next questions get harder. Vague credit costs more than small, honest credit.",
              },
            },
            {
              label: 'Team, then "I"',
              tone: 'ok',
              messages: [
                { from: 'interviewer', text: 'Explain your internship experience.' },
                {
                  from: 'candidate',
                  text: 'I interned at a food-delivery startup, in a three-person team building a complaint classifier. I owned the model. My teammates built the labelling tool and the dashboard.',
                  note: { tone: 'ok', text: 'Team context in one line, then her part.' },
                },
                {
                  from: 'candidate',
                  text: 'I relabelled the messy tickets and trained a TF-IDF baseline. Late deliveries looked like refunds, so I added how late each order was. Accuracy went from 79% to 87%.',
                  note: { tone: 'ok', text: 'Specific actions and one number.' },
                },
                {
                  from: 'interviewer',
                  text: 'Why did delivery delay help?',
                  note: {
                    tone: 'info',
                    text: 'A follow-up she can answer, because it was her decision.',
                  },
                },
              ],
              verdict: {
                tone: 'ok',
                text: 'Sneha credits the team in one line, then talks only about her part. The follow-up lands on a decision she made, so she can explain it with confidence.',
              },
            },
          ],
        },
        altText:
          'Two versions of the same answer. In the first, Sneha says "we" throughout and then claims she helped with everything. In the second, she names the team, says she owned the model, gives her specific actions and a result, and the interviewer asks about her own decision.',
      },
    },
    {
      key: 'check.basics',
      kind: 'KNOWLEDGE_CHECK',
      title: 'STAR story basics',
      depthRank: 1,
      conceptKeys: [STAR, CONTRIBUTION],
      body: {
        items: [
          {
            key: 'order',
            type: 'order_steps',
            prompt: "Put Sneha's story in STAR order.",
            steps: [
              { id: 's', text: 'The support team sorted 2,000 tickets a day by hand' },
              { id: 't', text: 'I had to build a model that sorts tickets into six categories' },
              { id: 'a', text: 'I trained a baseline and added how late each order was' },
              { id: 'r', text: 'Agents estimate sorting time fell from 60 to 15 seconds a ticket' },
            ],
            answer: { order: ['s', 't', 'a', 'r'] },
            explanation:
              'Situation sets the scene, Task is your responsibility, Action is what you did, and Result is what changed.',
          },
          {
            key: 'longest',
            type: 'mcq',
            prompt: 'Which part of a STAR answer should take the most time?',
            options: [
              { id: 's', text: 'Situation' },
              { id: 't', text: 'Task' },
              { id: 'a', text: 'Action' },
              { id: 'r', text: 'Result' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Action is where the interviewer learns what you can do. A common mistake is a long Situation: the interviewer cuts in before you reach your own work.',
          },
          {
            key: 'own-part',
            type: 'multi',
            prompt: 'Which lines show **your own** contribution? Pick all that apply.',
            options: [
              { id: 'a', text: '"I wrote the data-cleaning pipeline in pandas."' },
              { id: 'b', text: '"I was part of the team that built the classifier."' },
              {
                id: 'c',
                text: '"I chose F1-score over accuracy because the classes were imbalanced."',
              },
              { id: 'd', text: '"We deployed the model on the cloud."' },
            ],
            answer: { correct: ['a', 'c'] },
            explanation:
              'Saying **I** is not enough; name the action. "Part of the team" names nothing you did, and "we deployed" is specific but team credit.',
          },
          {
            key: 'my-story',
            type: 'reasoning',
            prompt:
              'Write your own internship or project story in STAR. Say **I** for your part and include one number. Then say it aloud and time it.',
            modelAnswer: `${STORY.situation} ${STORY.task}\n\n${STORY.action}\n\n${STORY.result}`,
            rubric: [
              'Situation and team size in one or two lines',
              'Task says what you owned',
              'Action is the longest part, with tools and one reason',
              'Says I for your own work',
              'Result has a number or an honest scale',
              'About a minute when spoken',
            ],
          },
        ],
      },
    },
    {
      key: 'interview.basic',
      kind: 'INTERVIEW_PLAYBOOK',
      title: 'Explaining your internship',
      depthRank: 1,
      conceptKeys: [STAR, CONTRIBUTION],
      body: {
        question: '"Explain your internship experience."',
        totalMinutes: 1,
        steps: [
          {
            title: 'Situation',
            detail: 'Where you were, the problem, and the team size. Two lines at most.',
          },
          { title: 'Task', detail: 'What you were responsible for.' },
          {
            title: 'Action',
            detail: 'Two or three things you did, with the tools you used and why.',
          },
          { title: 'Result', detail: 'What changed, with a number if you have one.' },
        ],
        followUps: [
          'What exactly was your role?',
          'What challenges did you face?',
          'Why not BERT or an LLM?',
          'Were the classes balanced? Why that metric?',
          'What would you do differently now?',
        ],
      },
    },
    {
      key: 'slides.impact',
      kind: 'SLIDES',
      title: 'Impact and challenge stories',
      depthRank: 2,
      conceptKeys: [STAR, CONTRIBUTION],
      body: {
        slides: [
          {
            kicker: 'Level up',
            title: 'Activity vs impact',
            body: 'Strong answers say what changed, not just what you did.',
            visual: {
              type: 'compare',
              left: {
                title: 'Activity',
                items: [
                  'Improved the model',
                  'Built an API for support',
                  'Fixed late-delivery errors',
                ],
              },
              right: {
                title: 'Impact',
                items: [
                  'Accuracy: 79% → 87%',
                  "Sorting time: 60s → 15s a ticket (agents' estimate)",
                  'Late-delivery F1: 0.62 → 0.81',
                ],
              },
              better: 'right',
            },
            note: 'No exact number? Give an honest scale, like "about 2,000 tickets a day".',
          },
          {
            kicker: 'Second story',
            title: 'Keep a challenge story ready',
            body: 'A problem you solved, or a mistake you fixed. Owning it makes the story stronger.',
            visual: {
              type: 'flow',
              steps: [
                { label: 'Problem', icon: 'alert' },
                { label: 'Root cause', icon: 'search' },
                { label: 'Fix', icon: 'zap' },
                { label: 'Lesson', icon: 'lightbulb' },
              ],
            },
          },
          {
            kicker: 'Example',
            title: 'A score that was too good',
            visual: {
              type: 'chat',
              lines: [
                {
                  from: 'candidate',
                  text: 'My model scored 95% in testing but 70% on live tickets. My split had left duplicate tickets in both sets.',
                },
                {
                  from: 'candidate',
                  text: 'I removed duplicates before splitting and added two weeks of fresh tickets. Test fell to an honest 79%, and live rose to 78%.',
                },
              ],
            },
            note: '**Data leakage** means training sees information it would not have in real use, like test tickets. Then the test score looks better than reality.',
          },
          {
            kicker: 'Technical follow-ups',
            title: 'Defend each decision',
            body: 'For each tool you name, know why you chose it and what else you considered. Interviewers often ask, "Why not X?"',
            visual: {
              type: 'chat',
              lines: [
                { from: 'interviewer', text: 'Why logistic regression? Why not BERT?' },
                {
                  from: 'candidate',
                  text: 'It trained in minutes and was easy to explain. With the delay feature it reached 87%, and every category was above 0.8 F1. So BERT was not needed yet.',
                },
              ],
            },
            note: 'Never claim a comparison you did not run. "I would try BERT next if errors stayed high" is honest.',
          },
          {
            kicker: 'Try it',
            title: 'Defend your numbers',
            try: {
              type: 'choice',
              prompt:
                'The interviewer asks how you measured "60 seconds to 15 seconds". In truth, support agents estimated it. Best answer?',
              options: [
                {
                  text: 'Say it was an estimate from agent feedback, and how you would measure it',
                  correct: true,
                  feedback: 'Being honest about an estimate keeps your other numbers believable.',
                },
                {
                  text: 'Say you timed 50 tickets yourself to confirm it',
                  correct: false,
                  feedback: 'A made-up check falls apart at the next question.',
                },
                {
                  text: "Say the company measured it, but you're not sure how",
                  correct: false,
                  feedback: 'This dodges the question and sounds like you never checked.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'visual.challenge',
      kind: 'VISUAL',
      title: 'Challenge story in STAR',
      depthRank: 2,
      conceptKeys: [STAR, CONTRIBUTION],
      body: {
        scene: {
          type: 'anatomy',
          heading: 'Sneha answers "Tell me about a challenge you faced"',
          parts: [
            {
              label: 'Situation',
              seconds: 8,
              text: CHALLENGE.situation,
              note: 'Open with the problem and the stakes.',
            },
            { label: 'Task', seconds: 5, text: CHALLENGE.task, note: 'What you owned.' },
            {
              label: 'Action',
              seconds: 30,
              text: CHALLENGE.action,
              note: 'Diagnose, then fix. Name the root causes: a kind of **data leakage** (the same tickets in training and test), plus old training data.',
            },
            {
              label: 'Result',
              seconds: 12,
              text: CHALLENGE.result,
              note: 'A number, plus what you do differently now. That turns a problem into a growth story.',
            },
          ],
        },
        caption:
          'Owning the mistake makes this story stronger, not weaker. It also answers "Tell me about a mistake you made". (The numbers are an example.)',
        altText:
          'A challenge story in four STAR parts on a timeline of about 55 seconds: the situation (a model scoring 95% in testing but 70% live), the task, the action (finding that her own split left duplicate tickets in both training and test data, and that the training data was old, then fixing both) and the result (an honest 79% test score, 78% live, and a new habit of removing duplicates before splitting).',
      },
    },
    {
      key: 'check.advanced',
      kind: 'KNOWLEDGE_CHECK',
      title: 'Challenge and impact stories',
      depthRank: 2,
      conceptKeys: [STAR, CONTRIBUTION],
      body: {
        items: [
          {
            key: 'story',
            type: 'reasoning',
            prompt:
              'Tell a STAR story about a challenge or mistake from your internship or a project, in about a minute. Include one number and what you learned.',
            modelAnswer: `${CHALLENGE.situation} ${CHALLENGE.task}\n\n${CHALLENGE.action}\n\n${CHALLENGE.result}`,
            rubric: [
              'Sets the situation and stakes in one or two lines',
              'Uses "I" and owns any mistake that was yours',
              'Names the root cause, not just the symptom',
              'Gives a measured result or an honest scale',
              'Ends with what you learned or now do differently',
              'About a minute when spoken',
            ],
          },
        ],
      },
    },
    {
      key: 'interview.advanced',
      kind: 'INTERVIEW_PLAYBOOK',
      title: 'Challenge and contribution stories',
      depthRank: 2,
      conceptKeys: [STAR, CONTRIBUTION],
      body: {
        question: '"Tell me about a challenge you faced in your internship."',
        totalMinutes: 1,
        steps: [
          { title: 'Situation', detail: 'The problem and why it mattered, in two lines.' },
          { title: 'Task', detail: 'What you owned.' },
          {
            title: 'Action',
            detail: 'How you found the root cause, and the decision you made to fix it.',
          },
          {
            title: 'Result and lesson',
            detail: 'The number that changed, and what you do differently now.',
          },
        ],
        followUps: [
          'How did you find the root cause?',
          'How did you measure the improvement?',
          'Tell me about a mistake you made.',
          'Did anyone on the team disagree with your approach?',
        ],
      },
    },
    {
      key: 'interview-questions',
      kind: 'CARD_DECK',
      title: 'Interview questions and answers',
      depthRank: 1,
      conceptKeys: [STAR, CONTRIBUTION],
      body: {
        layout: 'flip',
        cards: [
          {
            title: 'Internship in STAR',
            front: 'Explain your internship experience.',
            back: 'Use STAR. Situation and task: a food-delivery startup got 2,000 complaint tickets a day. In a three-person team, I owned the model to sort them. Action: I relabelled 3,000 tickets, trained a TF-IDF baseline, added delivery delay and served it with FastAPI. Result: 87% accuracy on held-out tickets.',
          },
          {
            title: 'Your role versus the team',
            front: 'What exactly was your role? What did the rest of the team do?',
            back: 'Credit the team in one line, then own your part. For example: We were three. My teammates built the labelling tool and the dashboard. I owned the model: relabelling, features, training and the FastAPI endpoint. Small, clear credit is more believable than saying you did everything.',
          },
          {
            title: 'Challenge you faced',
            front:
              'What challenges did you face during your internship, and how did you overcome them?',
            back: 'Give the problem, root cause, fix and lesson. For example: My model scored 95% in testing but 70% on live tickets. My split had left duplicate tickets in both sets. I removed duplicates before splitting and added fresh tickets. Test fell to an honest 79%, and live rose to 78%.',
          },
          {
            title: 'Why that model',
            front: 'Why did you use TF-IDF and logistic regression? Why not BERT or an LLM?',
            back: "TF-IDF with logistic regression trains in minutes and is easy to explain. With the delay feature it reached 87%, and every category was above 0.8 F1. BERT or an LLM might do slightly better, but they are slower and cost more to run. I'd try BERT if errors stayed high.",
          },
          {
            title: 'Class balance and metric',
            front: 'Were the classes balanced? Why did you report F1 and not just accuracy?',
            back: 'No. Some categories, like refunds, were far more common than others. Then accuracy can look high while a small category fails. So I also checked F1, a score that balances precision and recall, for each category. All six were above 0.8, so the small categories worked too.',
          },
          {
            title: 'Measuring the improvement',
            front: 'How did you measure the improvement you are claiming?',
            back: "Say exactly how each number was measured. Accuracy and F1 came from held-out tickets the model never saw in training. The drop from 60 to 15 seconds a ticket is the support agents' estimate, so call it one. If pushed, offer to time a sample of tickets.",
          },
          {
            title: 'Learnings and changes',
            front:
              'What did you learn from your internship, and what would you do differently now?',
            back: 'Give one technical lesson and one work habit, each tied to a real moment. For example: Duplicate tickets once inflated my test score, so now I remove duplicates before splitting. I also learned to explain my model simply, because support agents had to trust its suggestions. Next time, I would test on live tickets from week one.',
          },
          {
            title: 'AI tools at work',
            front: 'Did you use AI tools during your internship? If so, how?',
            back: 'Say what you used them for and how you checked the output. For example: An AI assistant drafted pandas cleaning code and FastAPI boilerplate. I read every line, tested it on sample tickets and fixed what was wrong. The model choices and the error analysis were mine. If you used none, say so plainly.',
          },
          {
            title: 'Training program on a resume',
            front:
              'Your resume shows a training program. Were you working there or training, and what did you build?',
            back: 'Say clearly that it was training, not a job or an internship. Explain any title or badge in one line. Then give one thing you built and one skill it gave you. Honest labels keep the rest of your resume believable.',
          },
        ],
      },
    },
    {
      key: 'summary.basic',
      slotKey: 'summary',
      kind: 'SUMMARY',
      title: 'Experience story key takeaways',
      depthRank: 1,
      conceptKeys: [STAR, CONTRIBUTION],
      body: {
        takeaways: [
          'Experience questions usually come in the first technical round.',
          'STAR keeps your story clear: Situation, Task, Action, Result.',
          'Spend most of the time on Action, and say **I** for what you did.',
          'Credit the team in one line, then own your part.',
          'No internship? A final-year project, hackathon or personal project works the same way.',
        ],
        remember: ['Situation → Task → Action → Result', 'One line for the team, the rest for you'],
      },
    },
    {
      key: 'summary.advanced',
      slotKey: 'summary',
      kind: 'SUMMARY',
      title: 'Experience story key takeaways',
      depthRank: 2,
      conceptKeys: [STAR, CONTRIBUTION],
      body: {
        takeaways: [
          'STAR keeps your story clear: Situation, Task, Action, Result.',
          'Spend most of the time on Action, and say **I** for what you did.',
          'Credit the team in one line, then own your part.',
          'Turn activities into results with numbers, and never invent one.',
          'Keep a second story ready: a challenge or mistake, its root cause and what you learned.',
        ],
        remember: [
          'Situation → Task → Action → Result',
          'Activity is what you did; impact is what changed',
        ],
      },
    },
  ],
};
