/**
 * Self-Introduction & HR Round → HR and behavioural questions.
 *
 * Evidence (Hiring Intelligence, 72 ML/AI companies, Jan–Oct 2026): motivation and behavioural
 * questions at 23 companies, logistics (relocation, joining, CTC) at 21. Within those: bonds,
 * PPOs and full-time offers at 14 companies, CTC and salary at 12, "why this company / what do
 * you know about us" at 10, relocation at 9 (Pune, Chennai, Bengaluru, Gurugram, Noida),
 * pressure and deadlines at 5, strengths and weaknesses at 4. 3–6 LPA teaches this at depth 1
 * (motivation and logistics, answered honestly); 8–12 LPA at depth 2 (behavioural answers with
 * evidence, and a salary answer pitched at that band). People and numbers are illustrative.
 *
 * Review v1 → v2 (independent reviewer, 2026-11-06): salary examples per depth (no low anchor
 * for 8–12), CTC vs in-hand pay, bond red flags and fee scams, the PPO question, "Why should we
 * hire you?" at depth 1, accurate data tags, a consistent analogy, distractors that test clarity
 * rather than admit dishonesty, titles without questions.
 *
 * v3 (2026-11-09, user request): teaching moved into PPT-style slide decks with try-its
 * (the HR flip cards, in-hand and bond callouts and the behavioural cards became slides).
 *
 * Audit (2026-11-18, 8–12 LPA bar): an interview-questions card deck (strengths and the five-year
 * question now reach depth 1), a "Why you chose this field" slide, gratuity explained, and a depth-2
 * `slides.switching` deck (other offers, notice period, current CTC, why you are leaving) placed
 * with the other money and logistics slides.
 */
import type { LessonDocumentInput } from '@app/content';

const MOTIVATION = 'hr.behavioural.motivation';
const STRENGTHS = 'hr.behavioural.strengths';
const LOGISTICS = 'hr.behavioural.logistics';

const logisticsRows = (salary: string) => [
  [
    'Willing to relocate to Pune?',
    '"Yes. I\'ve checked PG options near the office, and my family is fine with it."',
  ],
  ['By when can you join?', '"My final exams end on 20 May, so I can join from 1 June."'],
  [
    'Okay with the offered CTC?',
    '"Yes, it works for me. Could you share the breakup, like fixed pay, variable pay and any joining bonus?"',
  ],
  ['Salary expectations?', salary],
  [
    'Six days from the office?',
    '"That works for me. Working in person will help me learn faster."',
  ],
];

const RANGE_NOTE =
  'Quote a range you would really accept, never below the posted range, and say how you got it.';
const CONSTRAINT_NOTE =
  'Have a constraint? Say it early, with an option: *"Pune is hard for me now, but Bengaluru or Hyderabad works"*. A late surprise costs more trust than an honest no.';

export const HR_BEHAVIOURAL_LESSON: LessonDocumentInput = {
  title: 'HR and behavioural questions',
  subtitle: 'Why this company, relocation, joining date, CTC, PPOs and bonds, answered honestly.',
  objectives: [
    {
      key: 'motivation',
      text: 'Answer "Why do you want to join us?" with something specific to the company',
      minDepthRank: 1,
    },
    {
      key: 'logistics',
      text: 'Answer relocation, joining-date, CTC, PPO and bond questions honestly and clearly',
      minDepthRank: 1,
    },
    {
      key: 'behavioural',
      text: 'Answer strengths, weakness and pressure questions with real examples',
      minDepthRank: 2,
    },
  ],
  sections: [
    {
      key: 'hook',
      kind: 'HOOK',
      title: 'What HR rounds check',
      depthRank: 1,
      conceptKeys: [MOTIVATION, LOGISTICS],
      body: {
        scenario:
          'You cleared the technical round. Then HR calls: **"Are you comfortable relocating to Pune? The role is six days a week, from the office. And are you okay with the offered CTC?"** You want the job, so you say yes to everything.',
        provocation: 'Is "yes to everything" really the safe answer?',
        analogy: {
          text: 'Think of renting a flat. The owner checks that the rent suits you, that you will stay long enough and that you chose this flat on purpose. Saying yes and moving out in a month hurts both of you.',
          mapping: [
            { everyday: 'Does the rent suit your budget?', technical: 'Is the CTC acceptable?' },
            { everyday: 'How long will you stay?', technical: 'Bond and PPO' },
            { everyday: 'Is the location fine?', technical: 'Relocation and office days' },
            { everyday: 'Why this flat?', technical: 'Why this company' },
          ],
          whereItBreaks:
            'In a flat, you pay the owner. Here the company pays you, so you can also ask questions, like the CTC breakup.',
        },
        bridge:
          'HR is checking **fit and commitment**: will you join, stay and do well here? Clear, honest answers build more trust than a nervous "yes".',
      },
    },
    {
      key: 'slides.hr',
      kind: 'SLIDES',
      title: 'Why us and why you',
      depthRank: 1,
      conceptKeys: [MOTIVATION, LOGISTICS],
      body: {
        slides: [
          {
            kicker: 'The HR round',
            title: 'Four things HR is checking',
            visual: {
              type: 'icons',
              items: [
                { icon: 'target', label: 'Why us', sub: 'Did you choose them on purpose?' },
                { icon: 'map', label: 'Will you join', sub: 'Location, joining date, office days' },
                { icon: 'rupee', label: 'Does the pay work', sub: 'CTC and the breakup' },
                { icon: 'handshake', label: 'Will you stay', sub: 'Bonds, PPOs, your plans' },
              ],
            },
          },
          {
            kicker: 'Why us',
            title: 'One fact, one link, one goal',
            body: 'Five minutes on their website, blog or news page is enough to find one real fact.',
            visual: {
              type: 'flow',
              steps: [
                { label: 'A real fact', icon: 'search' },
                { label: 'Your link', icon: 'link' },
                { label: 'Your goal', icon: 'target' },
              ],
            },
          },
          {
            kicker: 'Try it',
            title: 'Pick the strongest "Why us"',
            body: 'The company builds an app that spots crop disease from photos farmers take.',
            try: {
              type: 'choice',
              prompt: 'Which answer uses fact, link and goal?',
              options: [
                {
                  text: '"You spot crop disease from farmers\' photos. My project classified leaf images with a CNN, and I want my models used in the field."',
                  correct: true,
                  feedback: 'A real fact, a link to your project and a goal.',
                },
                {
                  text: '"You are an innovative company with a great work culture."',
                  correct: false,
                  feedback: 'This fits every company, so it shows no research.',
                },
                {
                  text: '"You were founded in 2018 and have about 500 employees."',
                  correct: false,
                  feedback: 'A fact, but nothing about why it fits you.',
                },
              ],
            },
          },
          {
            kicker: 'Why hire you',
            title: 'Proof beats adjectives',
            points: [
              'Pick two needs from the job description',
              'Give proof from your work for each',
              "End with: you're ready to join",
            ],
            visual: {
              type: 'compare',
              left: {
                title: 'Adjectives',
                items: ['"I\'m hard-working"', '"I\'m a quick learner"'],
              },
              right: {
                title: 'Proof',
                items: [
                  '"You need speech models. My final-year project was Telugu speech-to-text."',
                  '"You need SQL. I built my project\'s data pipeline with it."',
                ],
              },
              better: 'right',
            },
          },
          {
            kicker: 'Why AI',
            title: 'Why you chose this field',
            body: 'When asked why you chose AI, give the moment you got interested, what you built since and why this role is next. The same works for "Why not your own branch?"',
            visual: {
              type: 'chat',
              lines: [
                {
                  from: 'candidate',
                  text: 'ECE gave me signals and maths. In third year, I cleaned noisy sensor data in Python and enjoyed it.',
                },
                {
                  from: 'candidate',
                  text: 'Since then I have built ML projects, like anomaly detection on transactions. This role lets me do that full time.',
                },
              ],
            },
            note: 'Respect your branch. Say what it gave you, not what was wrong with it.',
          },
        ],
      },
    },
    {
      key: 'visual.why-us',
      kind: 'VISUAL',
      title: 'Generic vs specific motivation',
      depthRank: 1,
      conceptKeys: [MOTIVATION],
      body: {
        scene: {
          type: 'chat',
          interviewer: 'HR',
          candidate: 'Kiran',
          takes: [
            {
              label: 'Generic',
              tone: 'bad',
              messages: [
                { from: 'interviewer', text: 'Why do you want to join our company?' },
                {
                  from: 'candidate',
                  text: 'Your company is a leading company with a good work culture and growth opportunities. I want to learn and grow with you.',
                  note: { tone: 'bad', text: 'This fits every company. It shows no research.' },
                },
                {
                  from: 'interviewer',
                  text: 'Okay. What do you know about our products?',
                  note: { tone: 'info', text: 'The follow-up tests the claim.' },
                },
              ],
              verdict: {
                tone: 'bad',
                text: '"Good culture and growth" could be said about any company, so HR hears "I applied everywhere". Five minutes on their website would have changed this answer.',
              },
            },
            {
              label: 'Specific',
              tone: 'ok',
              messages: [
                { from: 'interviewer', text: 'Why do you want to join our company?' },
                {
                  from: 'candidate',
                  text: 'You build voice bots that handle loan calls in Hindi and Telugu. I liked that your models run in production, for real customers.',
                  note: { tone: 'ok', text: 'One real fact about the company.' },
                },
                {
                  from: 'candidate',
                  text: "My final-year project was speech-to-text for Telugu, so I've already faced its data problems, like noisy audio and accents. I want to keep working on exactly this problem.",
                  note: { tone: 'ok', text: 'Links the fact to his own work.' },
                },
              ],
              verdict: {
                tone: 'ok',
                text: 'One fact, one link to his project, one goal. It takes 20 seconds, and HR now knows Kiran chose this company on purpose.',
              },
            },
          ],
        },
        altText:
          'Two answers to "Why do you want to join our company?". The generic answer praises culture and growth and is tested with a follow-up about products. The specific answer names what the company builds and links it to the candidate\'s own speech project.',
      },
    },
    {
      key: 'logistics.basic',
      slotKey: 'logistics',
      kind: 'EXPLANATION',
      title: 'Relocation, joining date and CTC',
      depthRank: 1,
      conceptKeys: [LOGISTICS],
      body: {
        blocks: [
          {
            type: 'paragraph',
            text: 'These questions have no trick. HR wants a clear, honest answer they can plan with. Decide your answers **before** the interview.',
          },
          {
            type: 'table',
            columns: ['Question', 'A clear, honest answer'],
            rows: logisticsRows(
              "\"I've checked your posted range and similar fresher ML roles, so I'm expecting 4.5 to 5.5 LPA. I'm open to discussing the breakup.\"",
            ),
          },
          { type: 'note', text: RANGE_NOTE },
          { type: 'note', text: CONSTRAINT_NOTE },
        ],
      },
    },
    {
      key: 'logistics.advanced',
      slotKey: 'logistics',
      kind: 'EXPLANATION',
      title: 'Relocation, joining date and CTC',
      depthRank: 2,
      conceptKeys: [LOGISTICS],
      body: {
        blocks: [
          {
            type: 'paragraph',
            text: 'These questions have no trick. HR wants a clear, honest answer they can plan with. Decide your answers **before** the interview.',
          },
          {
            type: 'table',
            columns: ['Question', 'A clear, honest answer'],
            rows: logisticsRows(
              '"Based on similar ML roles and your posted range, I\'m expecting 9 to 11 LPA. Could you share how much of it is fixed?"',
            ),
          },
          { type: 'note', text: RANGE_NOTE },
          { type: 'note', text: CONSTRAINT_NOTE },
        ],
      },
    },
    {
      key: 'slides.money',
      kind: 'SLIDES',
      title: 'Money and commitments',
      depthRank: 1,
      conceptKeys: [LOGISTICS],
      body: {
        slides: [
          {
            kicker: 'Money',
            title: 'CTC is not in-hand pay',
            body: "CTC is the company's total yearly cost for you.",
            points: [
              'CTC can include employer PF (retirement savings), gratuity (usually paid after five years), insurance and bonuses',
              'In-hand is fixed pay minus deductions: your PF, professional tax and, at higher pay, income tax',
            ],
            animation: { name: 'ctc-split', caption: 'Read the breakup, not just the CTC number' },
          },
          {
            kicker: 'Try it',
            title: 'Work out your in-hand pay',
            try: {
              type: 'choice',
              prompt:
                'Your offer says **4.5 LPA CTC**. About how much reaches your bank each month?',
              options: [
                {
                  text: '₹37,500, because 4.5 lakh ÷ 12 = 37,500',
                  correct: false,
                  feedback: 'That splits the whole CTC, including parts never paid monthly.',
                },
                {
                  text: 'Often nearer ₹32,000. The breakup gives the exact number.',
                  correct: true,
                  feedback: 'Fixed pay minus PF and professional tax. Check the breakup.',
                },
                {
                  text: '₹25,000, because about a third goes to income tax',
                  correct: false,
                  feedback: 'At 4.5 LPA, income tax is usually nil. PF is the main cut.',
                },
              ],
            },
          },
          {
            kicker: 'Bonds',
            title: 'Ask for the terms first',
            visual: {
              type: 'checklist',
              items: [
                { text: 'Ask how long the bond lasts', ok: true },
                { text: 'Ask what you pay if you leave early', ok: true },
                { text: 'Get the terms in writing', ok: true },
                { text: 'Hand over original certificates or a blank cheque', ok: false },
                { text: 'Pay any fee to get the job', ok: false },
                { text: 'Agree to a bond you plan to break', ok: false },
              ],
            },
          },
          {
            kicker: 'Try it',
            title: 'Original certificates',
            try: {
              type: 'choice',
              prompt:
                'HR wants to keep your original degree certificate until the bond ends. Best response?',
              options: [
                {
                  text: 'Offer to show the originals for checking, and give self-attested copies to keep',
                  correct: true,
                  feedback: 'Checking originals is normal. Keeping them is not.',
                },
                {
                  text: 'Hand it over, because every company does this',
                  correct: false,
                  feedback: 'Holding your originals can trap you in a job.',
                },
                {
                  text: 'Agree now, and ask for it back after a month',
                  correct: false,
                  feedback: 'Once they hold it, getting it back early is hard.',
                },
              ],
            },
          },
          {
            kicker: 'PPO',
            title: 'The "no PPO" question',
            body: 'A PPO (pre-placement offer) is a job offer after an internship. No PPO? Own it.',
            visual: {
              type: 'chat',
              lines: [
                { from: 'interviewer', text: 'Your internship ran six months. Why no PPO?' },
                {
                  from: 'candidate',
                  text: "Two of eight interns got PPOs, and I wasn't one. My mentor said I shared work too late, so now I share a first version in week one.",
                },
              ],
            },
            note: 'No interns hired that year? Just say so.',
          },
        ],
      },
    },
    {
      key: 'slides.switching',
      kind: 'SLIDES',
      title: 'Offers, notice period and switching',
      depthRank: 2,
      conceptKeys: [LOGISTICS, MOTIVATION],
      body: {
        slides: [
          {
            kicker: 'Other offers',
            title: 'The other-offers question',
            body: '"Do you have other offers?" checks whether you will join. Answer truthfully, then say where this role stands.',
            visual: {
              type: 'chat',
              lines: [
                {
                  from: 'candidate',
                  text: 'I have one offer from a services company. This role is my first choice: it is hands-on ML work.',
                },
              ],
            },
            note: 'Never invent an offer; HR can ask for the letter. Call a role your first choice only if it is.',
          },
          {
            kicker: 'Joining date',
            title: 'Notice period and joining date',
            body: 'Students give their exam end date. Working? Give your notice period, the time you must work after resigning.',
            visual: {
              type: 'icons',
              items: [
                {
                  icon: 'graduation',
                  label: 'Final-year student',
                  sub: '"Exams end on 20 May, so I can join from 1 June."',
                },
                {
                  icon: 'briefcase',
                  label: 'Working now',
                  sub: '"My notice period is 60 days. I can ask for an early release."',
                },
              ],
            },
            note: 'Never promise a date your employer will not allow.',
          },
          {
            kicker: 'Current CTC',
            title: 'Current and expected CTC',
            body: 'Give your current CTC exactly, since companies often check payslips. Then give your expected range and how you got it.',
            visual: {
              type: 'chat',
              lines: [
                {
                  from: 'candidate',
                  text: "My current CTC is 4.5 LPA, in software testing. For this ML role, I'm expecting 8 to 9 LPA, based on similar roles and your range.",
                },
              ],
            },
            note: 'Decide your lowest acceptable offer before the call.',
          },
          {
            kicker: 'Switching jobs',
            title: 'Why you are leaving',
            body: '"Why are you leaving?" Talk about what you are moving towards, and never criticise your employer or manager.',
            visual: {
              type: 'compare',
              left: {
                title: 'Running from',
                items: ['"My manager is strict and the pay is low."'],
              },
              right: {
                title: 'Moving towards',
                items: [
                  '"I automated our test reports in Python. Now I want to build ML models full time."',
                ],
              },
              better: 'right',
            },
          },
          {
            kicker: 'Try it',
            title: 'Answer the offers question',
            try: {
              type: 'choice',
              prompt:
                'HR asks about other offers. You have none yet, but two interviews are in progress. Best answer?',
              options: [
                {
                  text: '"Not yet. Two interviews are in progress, and this role is my first choice."',
                  correct: true,
                  feedback: 'True and calm, and it shows you are likely to join.',
                },
                {
                  text: 'Say you have one at 12 LPA, to push the salary up',
                  correct: false,
                  feedback: 'HR can ask for the letter, and a made-up offer can end the process.',
                },
                {
                  text: '"I would rather not say."',
                  correct: false,
                  feedback: 'A short, true answer builds more trust.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'check.basics',
      kind: 'KNOWLEDGE_CHECK',
      title: 'Motivation and logistics check',
      depthRank: 1,
      conceptKeys: [MOTIVATION, LOGISTICS],
      body: {
        items: [
          {
            key: 'why-us',
            type: 'mcq',
            prompt:
              'Priya tells HR: *"You build fraud models for UPI payments. I find fintech really exciting."* What would make her answer strongest?',
            options: [
              {
                id: 'a',
                text: 'Link it to her work: "My final-year project used anomaly detection on transactions."',
              },
              { id: 'b', text: 'Add praise: "You also have a great work culture."' },
              { id: 'c', text: 'Add facts: "You were founded in 2015 and have offices in Pune."' },
              { id: 'd', text: 'Say it again with more energy and confidence' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'She has a real fact but no link to her own work. One line about her anomaly-detection project turns interest into evidence. More facts or praise still say nothing about fit.',
          },
          {
            key: 'bond',
            type: 'mcq',
            prompt:
              'HR asks: *"Can you commit to a one-year bond?"* You are not sure. What is the best first response?',
            options: [
              {
                id: 'a',
                text: 'Ask about the terms: how long it lasts and the early-exit amount',
              },
              { id: 'b', text: 'Say yes now, and decide later' },
              { id: 'c', text: 'Refuse, because bonds are always unfair' },
              { id: 'd', text: 'Say yes, because bond penalties are never enforced' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Reasonable bond amounts can be enforced, so a careless yes can cost you money. You can only answer honestly once you know the terms. A blanket no can cost you an offer you would have liked.',
          },
          {
            key: 'clear',
            type: 'multi',
            prompt: 'Which answers are clear enough for HR to plan with? Pick all that apply.',
            options: [
              { id: 'a', text: '"I can join from 1 June, after my final exams."' },
              { id: 'b', text: '"I can join soon, whenever you need me."' },
              {
                id: 'c',
                text: '"Yes, I can relocate to Chennai. I\'ve already looked at places to stay."',
              },
              { id: 'd', text: '"Relocation should be okay, I think. I\'ll ask at home."' },
            ],
            answer: { correct: ['a', 'c'] },
            explanation:
              'Clear answers give a date or a plan. "Soon" and "I think" tell HR you haven\'t decided yet.',
          },
        ],
      },
    },
    {
      key: 'interview.basic',
      slotKey: 'interview',
      kind: 'INTERVIEW_PLAYBOOK',
      title: 'Why-this-company answer structure',
      depthRank: 1,
      conceptKeys: [MOTIVATION],
      body: {
        question: '"Why do you want to join our company?"',
        totalMinutes: 1,
        steps: [
          {
            title: 'One real fact',
            detail:
              'What they build, for whom, or a recent launch. From their website, blog or news page.',
          },
          { title: 'Your link', detail: 'The project or skill of yours that connects to it.' },
          { title: 'Your goal', detail: 'What you want to learn or build there.' },
        ],
        followUps: [
          'What do you know about our products?',
          'Why should we hire you?',
          'Are you willing to relocate?',
          'Are you okay with the offered CTC?',
        ],
      },
    },
    {
      key: 'slides.behavioural',
      kind: 'SLIDES',
      title: 'Behavioural questions with proof',
      depthRank: 2,
      conceptKeys: [STRENGTHS],
      body: {
        slides: [
          {
            kicker: 'Behavioural',
            title: 'Every claim needs proof',
            body: 'For 8–12 LPA roles, interviewers test each claim with "Give me an example".',
            visual: {
              type: 'compare',
              left: {
                title: 'Claim only',
                items: [
                  '"I\'m good at debugging"',
                  '"I work well under pressure"',
                  '"I\'m a team player"',
                ],
              },
              right: {
                title: 'Claim + proof',
                items: [
                  '"I debug data well. I caught test clips that reused training speakers."',
                  '"Before a demo, I cut two extras and shipped the core."',
                  '"We settled a model debate by testing both."',
                ],
              },
              better: 'right',
            },
          },
          {
            kicker: 'Strengths',
            title: 'The strengths question',
            body: '"What are your strengths?" Pick two that matter for ML work, not five adjectives, and prove each one.',
            visual: {
              type: 'chat',
              lines: [
                {
                  from: 'candidate',
                  text: 'I debug data problems well. In my project, test clips came from the same speakers as training, and I caught it.',
                },
              ],
            },
          },
          {
            kicker: 'Pressure',
            title: 'The pressure question',
            body: '"How do you handle pressure?" Give a method, as a short story: situation, task, action, result (STAR).',
            visual: {
              type: 'flow',
              steps: [
                { label: 'The deadline', icon: 'clock' },
                { label: 'Split the work', icon: 'list' },
                { label: 'Drop extras', icon: 'filter' },
                { label: 'Ship the core', icon: 'check' },
              ],
            },
          },
          {
            kicker: 'Try it',
            title: 'Answer the pressure question',
            try: {
              type: 'choice',
              prompt: 'Which answer to *"How do you handle pressure?"* is strongest?',
              options: [
                {
                  text: '"I stay calm and work hard until it\'s done."',
                  correct: false,
                  feedback: 'A claim with no method and no example.',
                },
                {
                  text: '"Two days before our hackathon demo, I cut two features and finished the core model first. We demoed on time."',
                  correct: true,
                  feedback: 'A short story with a method and a result.',
                },
                {
                  text: '"Honestly, pressure doesn\'t affect me."',
                  correct: false,
                  feedback: 'Sounds unrealistic, and gives them nothing to judge.',
                },
              ],
            },
          },
          {
            kicker: 'Conflict',
            title: '"Tell me about a conflict"',
            body: 'They check that you disagree with respect and settle it with facts.',
            visual: {
              type: 'chat',
              lines: [
                {
                  from: 'candidate',
                  text: 'My teammate wanted a random forest and I wanted logistic regression. We compared both on the same validation set and kept the better one.',
                },
              ],
            },
          },
          {
            kicker: 'Five years',
            title: 'The five-year question',
            body: '"Where do you see yourself in five years?" They are checking whether you will grow here or leave soon.',
            visual: {
              type: 'chat',
              lines: [
                {
                  from: 'candidate',
                  text: 'I want to grow here: owning ML features end to end, from data to deployment, and mentoring juniors.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'visual.weakness',
      kind: 'VISUAL',
      title: 'Anatomy of a weakness answer',
      depthRank: 2,
      conceptKeys: [STRENGTHS],
      body: {
        scene: {
          type: 'anatomy',
          heading: 'Kiran answers "What is your biggest weakness?"',
          parts: [
            {
              label: 'A real weakness',
              seconds: 8,
              text: 'I used to spend too long polishing a model before showing anyone.',
              note: 'Real, but not a core skill of the role. Avoid fake ones like "I am a perfectionist".',
            },
            {
              label: 'Its cost',
              seconds: 8,
              text: 'In my internship, I spent four days tuning a model my mentor would have redirected on day one.',
              note: 'One short example shows you really noticed it.',
            },
            {
              label: 'What you changed',
              seconds: 10,
              text: 'Now I share a simple baseline and its score within the first day, then improve it.',
              note: 'The most important part: a concrete habit.',
            },
            {
              label: 'Proof it works',
              seconds: 6,
              text: 'On my last project, that early feedback saved a week.',
              note: 'End on progress, not on the problem.',
            },
          ],
        },
        caption: 'Real weakness, its cost, the fix, the proof. About 30 seconds.',
        altText:
          'A weakness answer in four parts on a 32-second timeline. A real weakness: over-polishing before sharing. Its cost: four lost days in an internship. The new habit: sharing a baseline on day one. The proof: a week saved.',
      },
    },
    {
      key: 'check.advanced',
      kind: 'KNOWLEDGE_CHECK',
      title: 'Strength and weakness check',
      depthRank: 2,
      conceptKeys: [STRENGTHS, MOTIVATION],
      body: {
        items: [
          {
            key: 'weakness',
            type: 'mcq',
            prompt: 'Which weakness answer works best for an ML Engineer interview?',
            options: [
              {
                id: 'a',
                text: '"I used to stay stuck for hours before asking. Now I ask after 30 minutes, with what I tried."',
              },
              { id: 'b', text: '"I am a perfectionist, and I work too hard."' },
              { id: 'c', text: '"I am not good at Python."' },
              { id: 'd', text: '"I get nervous presenting, so I avoid presentations."' },
            ],
            answer: { correct: ['a'] },
            explanation:
              "A real weakness with a fix shows self-awareness. A disguised strength sounds rehearsed, and a core-skill weakness hurts your case. A weakness with no fix shows you haven't worked on it.",
          },
          {
            key: 'strength',
            type: 'reasoning',
            prompt:
              'Answer *"What is your biggest strength?"* for an ML Engineer role, with one example from your projects or internship.',
            modelAnswer:
              'My biggest strength is debugging data problems. In my final-year project, our Telugu speech-to-text model worked in tests but failed on real phone calls. The test clips came from the same speakers as training. So I re-split by speaker and added noisy phone recordings. Word error rate on real calls dropped from 38% to 21%.',
            rubric: [
              'Names one strength that matters for ML work',
              'Links the strength to what an ML Engineer does',
              'Proves it with a specific example',
              'The example has a clear result',
              'Avoids generic adjectives like "hard-working"',
              'Fits in about 100 words (under a minute spoken)',
            ],
          },
        ],
      },
    },
    {
      key: 'interview.advanced',
      slotKey: 'interview',
      kind: 'INTERVIEW_PLAYBOOK',
      title: 'Why-hire-you answer structure',
      depthRank: 2,
      conceptKeys: [MOTIVATION, STRENGTHS, LOGISTICS],
      body: {
        question: '"Why should we hire you?"',
        totalMinutes: 1,
        steps: [
          { title: 'Match', detail: 'Two needs from the job description that you meet.' },
          { title: 'Proof', detail: 'One project or internship result for each.' },
          {
            title: 'Commitment',
            detail: 'Why you want this role here, and that you are ready to join.',
          },
        ],
        followUps: [
          'What is your biggest weakness?',
          'Tell me about a time you worked under pressure.',
          'Where do you see yourself in five years?',
          'What are your salary expectations?',
        ],
      },
    },
    {
      key: 'interview-questions',
      kind: 'CARD_DECK',
      title: 'Interview questions and answers',
      depthRank: 1,
      conceptKeys: [MOTIVATION, STRENGTHS, LOGISTICS],
      body: {
        layout: 'flip',
        cards: [
          {
            title: 'Why this company',
            front: 'Why do you want to join our company?',
            back: "Use one fact, one link and one goal. For example: You build voice bots that handle loan calls in Hindi and Telugu. My final-year project was Telugu speech-to-text, so I've already handled noisy audio and accents. I want to keep solving this problem for real customers.",
          },
          {
            title: 'Why hire you',
            front: 'Why should we hire you over other candidates?',
            back: "Match two needs from the job description with proof, then show you are ready to join. For example: You need speech models, and my final-year project was Telugu speech-to-text. You need SQL, and I built my project's data pipeline with it. Proof works better than adjectives like hard-working.",
          },
          {
            title: 'Why AI as a career',
            front: 'Why did you choose AI? You studied ECE, so why not a core electronics job?',
            back: 'Give the moment you got interested, what you built since and why this role is next. For example: ECE gave me signals and maths. In third year, I cleaned noisy sensor data in Python and enjoyed it. Since then I have built ML projects, like anomaly detection on transactions. Never criticise your branch.',
          },
          {
            title: 'Relocation',
            front: 'Are you willing to relocate to Pune and work from the office six days a week?',
            back: "Give a clear yes with a plan, or an honest limit with an option. For example: Yes. I've checked PG options near the office, and my family is fine with it. If Pune is hard, say so now and offer Bengaluru or Hyderabad. A late surprise costs more trust than an honest no.",
          },
          {
            title: 'Salary expectations',
            front: 'What are your salary expectations?',
            back: "Give a range you would really accept, say how you got it, and ask about the breakup. Suppose the role is posted at 8 to 12 LPA. You could say: Based on similar ML roles and your range, I'm expecting 9 to 11 LPA. Could you share how much is fixed?",
          },
          {
            title: 'Other offers',
            front: 'Are you holding any other job offers right now?',
            back: 'Answer truthfully and briefly, then say where this role stands for you. With an offer: I have one offer, but this role is my first choice because it is hands-on ML work. With none: I have interviews in progress, and this is my priority. Never invent an offer; HR can ask for the letter.',
          },
          {
            title: 'Strengths and growth area',
            front: 'What are your core strengths, and what is one area you are still working on?',
            back: 'Name one strength that matters for ML work and prove it. For example: I debug data problems well. In my speech project, test clips came from training speakers, and I caught it. Then add a real growth area and its fix. I used to polish too long, so now I share a baseline on day one.',
          },
          {
            title: 'Five and ten years',
            front: 'Where do you see yourself in five or ten years?',
            back: "Show that you plan to grow in this kind of role. For example: In five years, I want to own ML features end to end, from data to deployment, and mentor juniors. Link it to the company's work. Avoid vague answers, and never promise plans you do not have.",
          },
          {
            title: 'Getting unblocked',
            front: 'You hit a blocker on a technical task. What is your first move?',
            back: 'Isolate it first: read the full error, reproduce it with the smallest example and check the official docs. Give it a fixed time, like 30 minutes. Then ask a teammate, and say what you already tried. AI tools can help, but check their answer before you use it.',
          },
        ],
      },
    },
    {
      key: 'summary.basic',
      slotKey: 'summary',
      kind: 'SUMMARY',
      title: 'HR round key takeaways',
      depthRank: 1,
      conceptKeys: [MOTIVATION, LOGISTICS],
      body: {
        takeaways: [
          'HR checks fit and commitment: will you join, stay and do well here?',
          '"Why us?" needs one real fact about the company and your link to it.',
          'Decide your relocation, joining-date and CTC answers before the interview.',
          'CTC is not in-hand pay: ask for the fixed part and the breakup.',
          'Ask for bond terms before you agree, never pay a fee, and never promise what you will break.',
        ],
        remember: ['One fact, one link, one goal', 'Honest beats a nervous yes'],
      },
    },
    {
      key: 'summary.advanced',
      slotKey: 'summary',
      kind: 'SUMMARY',
      title: 'HR round key takeaways',
      depthRank: 2,
      conceptKeys: [MOTIVATION, STRENGTHS, LOGISTICS],
      body: {
        takeaways: [
          'HR checks fit and commitment: will you join, stay and do well here?',
          '"Why us?" needs one real fact about the company and your link to it.',
          'CTC is not in-hand pay: ask for the fixed part and the breakup.',
          'Back every strength with an example, and give a real weakness with a fix.',
          'Behavioural questions are STAR stories: situation, task, action, result.',
        ],
        remember: ['One fact, one link, one goal', 'Strength + proof, weakness + fix'],
      },
    },
  ],
};
