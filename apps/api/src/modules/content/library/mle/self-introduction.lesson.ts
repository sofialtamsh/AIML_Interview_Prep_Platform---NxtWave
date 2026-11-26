/**
 * Self-Introduction & HR Round → Self-introduction pitch.
 *
 * Evidence (Hiring Intelligence, 72 ML/AI companies, Jan–Oct 2026): "Tell me about yourself" or
 * "Introduce yourself" was asked at 39 companies, and 82 of those 117 questions came in Technical
 * Round 1, not the HR round. Follow-ups seen: resume-based questions (30 companies), "rate your
 * skills" (13), how you use AI day to day (11), "any questions for us?" (9), family background (8).
 * Both packages teach this at depth 2. Arjun and his numbers are an illustrative example.
 *
 * Review v1 → v2 (independent reviewer, 2026-11-06): graduating year, a precise project metric,
 * "asked in" (not "opened") the technical round, CGPA kept and only school marks cut, a specific
 * closing line, no word-for-word memorising, graduates and non-CS branches, a 30-second version,
 * the follow-up advice tested, family background as a follow-up card.
 *
 * v3 (2026-11-09, user request): teaching moved into two PPT-style slide decks with try-its
 * (simpler words, more profiles and examples); the rules cards, explanation, follow-up flip cards
 * and callouts became slides.
 *
 * Audit (2026-11-18, 8–12 LPA bar): an interview-questions card deck (resume, backlogs, AI use,
 * informal intro), four resume follow-up slides in `slides.follow-ups` and a role-fit close slide.
 */
import type { LessonDocumentInput } from '@app/content';

const STRUCTURE = 'hr.self-intro.structure';
const ROLE_FIT = 'hr.self-intro.role-fit';

const WHO =
  "Good morning, I'm Arjun, a final-year B.Tech CSE student at JNTU Hyderabad, graduating in 2027 with an 8.4 CGPA.";
const SKILLS =
  'I work in Python and SQL, with scikit-learn and PyTorch for machine learning, and FastAPI to deploy models.';
const PROJECT =
  'My strongest project is a resume screener that ranks resumes for a job using sentence embeddings. I tested it on 300 resumes recruiters had already screened. 82% of its top picks were on their shortlist, against 61% for keyword search.';
const EXPERIENCE =
  'Last summer, in a two-month internship at a fintech startup, I built a churn model with scikit-learn.';
const WHY =
  "Your team ships ML inside a live lending app, and that's exactly the work I want to do.";

export const SELF_INTRODUCTION_LESSON: LessonDocumentInput = {
  title: 'Self-introduction pitch',
  subtitle: 'A one-minute answer to "Tell me about yourself", built around your strongest work.',
  objectives: [
    {
      key: 'structure',
      text: 'Structure a self-introduction in five parts that fit in about a minute',
      minDepthRank: 1,
    },
    {
      key: 'lead-with-proof',
      text: 'Lead with your skills and one project with a measurable result',
      minDepthRank: 2,
    },
    {
      key: 'role-fit',
      text: 'Connect your skills to the ML Engineer role and to the company',
      minDepthRank: 2,
    },
    {
      key: 'follow-ups',
      text: 'Handle the follow-up questions your introduction triggers',
      minDepthRank: 2,
    },
  ],
  sections: [
    {
      key: 'hook',
      kind: 'HOOK',
      title: 'Self-introduction in technical rounds',
      depthRank: 1,
      conceptKeys: [STRUCTURE],
      body: {
        scenario:
          'Technical Round 1, on a video call. Camera on. You have revised pandas, overfitting and SQL joins all week. The interviewer smiles and says: **"So, tell me about yourself."**',
        animation: { name: 'intro-trailer', caption: 'Like a trailer: the best scenes, then stop' },
        provocation: 'What do you say in the next minute?',
        analogy: {
          text: "Think of a movie trailer. In two minutes it shows the best scenes, so you want to watch the film. It doesn't play the opening credits.",
          mapping: [
            { everyday: 'The trailer', technical: 'Your introduction' },
            { everyday: 'The best scenes', technical: 'Your skills and strongest project' },
            { everyday: 'Opening credits', technical: 'School marks, hometown, family details' },
            { everyday: 'Buying a ticket', technical: 'The interviewer asking more' },
          ],
          whereItBreaks:
            "A trailer can exaggerate. Your introduction can't: every claim becomes a follow-up question, so only mention what you can explain in depth.",
        },
        bridge:
          '**"Tell me about yourself"** is usually asked early in the **first technical round**, not just in the HR round. So prepare it like a technical answer.',
      },
    },
    {
      key: 'slides.intro',
      kind: 'SLIDES',
      title: 'Self-introduction in eleven slides',
      depthRank: 1,
      conceptKeys: [STRUCTURE, ROLE_FIT],
      body: {
        slides: [
          {
            kicker: 'The question',
            title: 'Your intro steers the technical round',
            body: 'Interviewers often pick their next questions from your answer. So it shapes the rest of the round.',
            visual: {
              type: 'flow',
              steps: [
                { label: 'Your intro', icon: 'mic' },
                { label: 'Their next questions', icon: 'message' },
                { label: 'The rest of the round', icon: 'clock' },
              ],
            },
          },
          {
            kicker: 'The idea',
            title: 'A trailer, not a biography',
            body: 'A movie trailer shows the best scenes. Your intro should too.',
            visual: {
              type: 'compare',
              left: {
                title: 'Biography',
                items: ['School marks', 'Family details', 'A list of hobbies'],
              },
              right: {
                title: 'Trailer',
                items: ['What you build', 'Your best project', 'Why this role'],
              },
              better: 'right',
            },
          },
          {
            kicker: 'The shape',
            title: 'Five parts in about one minute',
            body: 'Each part has one job. The project gets the most time.',
            visual: {
              type: 'flow',
              steps: [
                { label: 'Who you are', icon: 'user' },
                { label: 'Skills', icon: 'code' },
                { label: 'Best project', icon: 'rocket' },
                { label: 'Experience', icon: 'briefcase' },
                { label: 'Why this role', icon: 'target' },
              ],
            },
            note: 'Memorise the five points, not the exact words. A recited script sounds robotic.',
          },
          {
            kicker: 'Parts 1 and 2',
            title: 'Open with who you are and your toolkit',
            points: [
              'Name, degree, college and year',
              'CGPA only if it is strong. Skip school marks.',
              'Three to five skills from the job description',
            ],
            visual: {
              type: 'chat',
              lines: [
                {
                  from: 'candidate',
                  text: "Good morning, I'm Arjun, a final-year CSE student at JNTU Hyderabad. I work in Python and SQL, with scikit-learn and PyTorch.",
                },
              ],
            },
          },
          {
            kicker: 'Part 3',
            title: 'One project, one number',
            body: 'Say the problem, what you built and one result. Compare it with something.',
            visual: {
              type: 'compare',
              left: { title: 'Vague', items: ['"I did a resume project using NLP."'] },
              right: {
                title: 'Specific',
                items: [
                  '"82% of its top picks were on the recruiters\' shortlist, vs 61% for keyword search."',
                ],
              },
              better: 'right',
            },
            note: "Arjun's numbers are an example. Use your own, and know how you measured them.",
          },
          {
            kicker: 'Watch out',
            title: 'Every word is a hook',
            body: 'Interviewers ask about what you mention. Name only what you can explain for ten minutes.',
            visual: {
              type: 'chat',
              lines: [
                {
                  from: 'candidate',
                  text: '…and I know Python, Java, NLP, computer vision, Spark and Docker.',
                },
                { from: 'interviewer', text: 'You mentioned Spark. How does it partition data?' },
              ],
            },
          },
          {
            kicker: 'Try it',
            title: 'Pick the best opening line',
            try: {
              type: 'choice',
              prompt: 'Which first line works best in a technical round?',
              options: [
                {
                  text: '"Myself Arjun. I am from Kurnool and my father runs a medical shop."',
                  correct: false,
                  feedback:
                    'It opens with family, not your work, and "I\'m Arjun" sounds more natural than "Myself Arjun".',
                },
                {
                  text: '"Good morning, I\'m Arjun, a final-year CSE student at JNTU Hyderabad."',
                  correct: true,
                  feedback: 'Name, degree, college and year in one calm line.',
                },
                {
                  text: '"Hello sir, I am hard-working, passionate and a quick learner."',
                  correct: false,
                  feedback: 'Anyone can claim these adjectives, but only a project proves them.',
                },
              ],
            },
          },
          {
            kicker: 'Your profile',
            title: 'Change line one for your background',
            visual: {
              type: 'icons',
              items: [
                {
                  icon: 'code',
                  label: 'CSE fresher',
                  sub: '"Final-year CSE student at JNTU Hyderabad, graduating 2027"',
                },
                {
                  icon: 'cpu',
                  label: 'Non-CS branch',
                  sub: '"ECE graduate, building ML projects for a year"',
                },
                {
                  icon: 'calendar',
                  label: 'Graduated with a gap',
                  sub: 'Say what you built during the gap',
                },
                {
                  icon: 'briefcase',
                  label: 'Working in IT now',
                  sub: '"A year in software testing, now moving into ML"',
                },
              ],
            },
          },
          {
            kicker: 'Before each interview',
            title: 'Tailor it for the company',
            visual: {
              type: 'flow',
              steps: [
                { label: 'Read the job post', icon: 'search' },
                { label: 'Pick matching skills', icon: 'list' },
                { label: 'Change the last line', icon: 'pen' },
              ],
            },
            note: '*"Your team ships ML in a lending app, and that\'s the work I want to do."*',
          },
          {
            kicker: 'Role fit',
            title: 'Link your work to their product',
            body: 'For the last line, name what they build and the part of your work closest to it. One specific link beats general praise.',
            visual: {
              type: 'compare',
              left: {
                title: 'Generic close',
                items: ['"I am passionate about AI and want to grow with you."'],
              },
              right: {
                title: 'Linked close',
                items: [
                  '"You ship ML in a lending app. My fintech churn model predicted customer behaviour too."',
                ],
              },
              better: 'right',
            },
            note: 'The link can come from your internship or a second project. One line is enough.',
          },
          {
            kicker: 'Try it',
            title: 'Write your first line',
            try: {
              type: 'write',
              prompt: 'Write the first line of your introduction: name, degree, college and year.',
              placeholder: "Good morning, I'm…",
              sample:
                "Good morning, I'm Priya, a final-year B.Tech ECE student at VIT Vellore, graduating in 2027.",
            },
          },
        ],
      },
    },
    {
      key: 'visual.anatomy',
      kind: 'VISUAL',
      title: 'Anatomy of a one-minute introduction',
      depthRank: 1,
      conceptKeys: [STRUCTURE],
      body: {
        scene: {
          type: 'anatomy',
          heading: "Arjun's introduction · ML Engineer fresher",
          parts: [
            {
              label: 'Who you are',
              seconds: 10,
              text: WHO,
              note: "Name, degree, college and year in one breath. Add your CGPA if it's strong. Skip school marks.",
            },
            {
              label: 'Skills',
              seconds: 10,
              text: SKILLS,
              note: 'Three to five skills, grouped, all from the job description. Each one is fair game for a follow-up.',
            },
            {
              label: 'Best project',
              seconds: 25,
              text: PROJECT,
              note: "The longest part, because it's your proof: the problem, what you built, one number and what you compared it with. (Arjun's numbers are an example. Use your own.)",
            },
            {
              label: 'Experience',
              seconds: 7,
              text: EXPERIENCE,
              note: 'One line. No internship yet? Use a hackathon, a freelance gig or an open-source contribution.',
            },
            {
              label: 'Why this role',
              seconds: 8,
              text: WHY,
              note: 'End with one specific link to this company. It shows you prepared and hands them an easy next question.',
            },
          ],
        },
        caption: 'About 115 words, spoken in about a minute. Each part has one job.',
        altText:
          "A one-minute self-introduction split into five colour-coded parts on a timeline: who you are (10 seconds), skills (10), best project with a measured result (25, the longest part), one line of internship experience (7), and why this company's role (8).",
      },
    },
    {
      key: 'visual.chat',
      kind: 'VISUAL',
      title: 'Resume read-out vs focused pitch',
      depthRank: 2,
      conceptKeys: [STRUCTURE, ROLE_FIT],
      body: {
        scene: {
          type: 'chat',
          interviewer: 'Interviewer',
          candidate: 'Arjun',
          takes: [
            {
              label: 'Resume read-out',
              tone: 'bad',
              messages: [
                { from: 'interviewer', text: "Let's begin. Tell me about yourself." },
                {
                  from: 'candidate',
                  text: 'Myself Arjun. I did my schooling in Kurnool and scored 94% in 10th. My father runs a medical shop and my mother is a homemaker.',
                  note: {
                    tone: 'bad',
                    text: 'School marks and family first. Nothing about the job yet.',
                  },
                },
                {
                  from: 'candidate',
                  text: 'I am hard-working and a quick learner. I know Python, Java, C, C++, HTML, CSS, SQL, ML, DL, NLP and computer vision.',
                  note: {
                    tone: 'bad',
                    text: 'Generic adjectives, then eleven skills. Each skill is a possible test.',
                  },
                },
                {
                  from: 'interviewer',
                  text: 'Okay. You mentioned NLP. What is the difference between stemming and lemmatization?',
                  note: { tone: 'info', text: 'They pick a word from the list.' },
                },
              ],
              verdict: {
                tone: 'bad',
                text: 'The interviewer still doesn\'t know what Arjun has built, and the skill list handed them a random topic. Language tip: **"I\'m Arjun"** sounds more natural than "Myself Arjun".',
              },
            },
            {
              label: 'Focused pitch',
              tone: 'ok',
              messages: [
                { from: 'interviewer', text: "Let's begin. Tell me about yourself." },
                {
                  from: 'candidate',
                  text: "Good morning. I'm Arjun, a final-year CSE student at JNTU Hyderabad. I work in Python and SQL, with scikit-learn, PyTorch and FastAPI.",
                  note: { tone: 'ok', text: 'Who he is and his toolkit.' },
                },
                {
                  from: 'candidate',
                  text: "My strongest project is a resume screener using sentence embeddings. On 300 screened resumes, 82% of its top picks were on the recruiters' shortlist, against 61% for keyword search.",
                  note: { tone: 'ok', text: 'One project, one measured result.' },
                },
                {
                  from: 'candidate',
                  text: "Your team ships ML inside a live lending app, and that's exactly the work I want to do.",
                  note: { tone: 'ok', text: 'Closes on this company.' },
                },
                {
                  from: 'interviewer',
                  text: 'Interesting. How did you create the embeddings, and why that model?',
                  note: { tone: 'info', text: "The follow-up lands on Arjun's best work." },
                },
              ],
              verdict: {
                tone: 'ok',
                text: 'Same person, same skills. This time the next question is about the project Arjun knows best. What you choose to mention steers the interview.',
              },
            },
          ],
        },
        altText:
          'Two versions of the same mock interview. In the first, Arjun lists school marks, family, generic adjectives and eleven skills, and the interviewer tests him on a random skill from the list. In the second, he gives his college and toolkit, one project with a measured result and why this company, and the interviewer asks about that project.',
      },
    },
    {
      key: 'check.basics',
      kind: 'KNOWLEDGE_CHECK',
      title: 'Self-introduction basics',
      depthRank: 1,
      conceptKeys: [STRUCTURE, ROLE_FIT],
      body: {
        items: [
          {
            key: 'order',
            type: 'order_steps',
            prompt: 'Put the parts of a strong introduction in order.',
            steps: [
              { id: 'who', text: 'Who you are: name, degree, college, year' },
              { id: 'skills', text: 'Three to five relevant skills' },
              { id: 'project', text: 'Your strongest work and its result' },
              { id: 'experience', text: 'One line of supporting experience' },
              { id: 'why', text: 'Why this role at this company' },
            ],
            answer: { order: ['who', 'skills', 'project', 'experience', 'why'] },
            explanation:
              'Start with who you are and what you can do. Prove it with your strongest work, add supporting experience, then close on the company. If your internship is your strongest work, it takes the project slot.',
          },
          {
            key: 'one-project',
            type: 'mcq',
            prompt:
              'You have one strong ML project you know deeply and a small GenAI chatbot you built from a tutorial. Which goes into your introduction?',
            options: [
              { id: 'a', text: 'The strong project, with one measured result' },
              { id: 'b', text: 'Both projects, one line each' },
              { id: 'c', text: 'No projects. Those come later in the interview' },
              { id: 'd', text: 'The GenAI chatbot, since companies want LLM skills now' },
            ],
            answer: { correct: ['a'] },
            explanation:
              "Lead with the work you can defend for ten minutes. A trendy project you can't explain in depth is a risk: the follow-ups will find the gaps.",
          },
          {
            key: 'cut',
            type: 'multi',
            prompt:
              'Which lines would you cut from a **technical-round** introduction for an ML Engineer role? Pick all that apply.',
            options: [
              { id: 'a', text: '"My father works in a bank and my mother is a teacher."' },
              { id: 'b', text: '"I scored 92% in my 10th standard."' },
              { id: 'c', text: '"I deployed my sentiment model as a FastAPI service."' },
              { id: 'd', text: '"I know Python, Java, C, C++, HTML, CSS, SQL, ML, DL and NLP."' },
              { id: 'e', text: '"Your team builds ML for document processing, which I enjoy."' },
              { id: 'f', text: '"I\'m hard-working, passionate about AI and a quick learner."' },
            ],
            answer: { correct: ['a', 'b', 'd', 'f'] },
            explanation:
              "Family details, school marks and generic adjectives don't show job skills, and a long skill list invites random tests. Deployment and a specific link to the company are what an ML Engineer interviewer wants to hear.",
          },
          {
            key: 'hook-word',
            type: 'fill_blank',
            template: 'Every skill you mention in your introduction can become a {{b1}} question.',
            answer: { b1: ['follow-up', 'follow up', 'followup', 'next', 'technical'] },
            explanation:
              'Interviewers build their next question from what you say. Mention what you can explain in depth.',
          },
        ],
      },
    },
    {
      key: 'slides.follow-ups',
      kind: 'SLIDES',
      title: 'Follow-up questions after your intro',
      depthRank: 2,
      conceptKeys: [STRUCTURE, ROLE_FIT],
      body: {
        slides: [
          {
            kicker: 'What comes next',
            title: 'Five follow-ups to prepare',
            body: 'Prepare all five. Some come right after your intro, others at the end or in the HR round.',
            visual: {
              type: 'icons',
              items: [
                { icon: 'file', label: 'Your resume', sub: 'They pick a line and dig in' },
                { icon: 'star', label: 'Rate your skills', sub: 'A number, plus proof' },
                { icon: 'sparkles', label: 'How you use AI', sub: 'One real use you check' },
                { icon: 'message', label: 'Questions for us', sub: 'Keep two ready' },
                { icon: 'home', label: 'Your family', sub: 'Two calm sentences' },
              ],
            },
          },
          {
            kicker: 'Follow-up 1',
            title: '"Walk me through your resume"',
            points: [
              'They usually pick one line and dig in, often a project.',
              'Know every word on your resume, even the skills list.',
              'For a full walk-through, give two lines per item.',
            ],
            visual: {
              type: 'chat',
              lines: [
                {
                  from: 'interviewer',
                  text: 'Your resume says "Docker". Where did you use it?',
                },
              ],
            },
          },
          {
            kicker: 'Follow-up 2',
            title: '"Rate your Python out of 5"',
            body: 'Be honest and give proof in the same breath.',
            visual: {
              type: 'stat',
              value: '3.5 / 5',
              label: '"Fluent with pandas and OOP, still improving at testing."',
              sub: 'A 5 invites their hardest questions. Below 3 makes them doubt your resume.',
            },
          },
          {
            kicker: 'Follow-up 3',
            title: 'How you use AI day to day',
            body: 'They may ask, "How do you use AI day to day?" Give one real use, and show that you check its work.',
            visual: {
              type: 'chat',
              lines: [
                {
                  from: 'candidate',
                  text: 'An AI assistant drafts my unit tests. I read each one, run them and check every failure myself.',
                },
              ],
            },
          },
          {
            kicker: 'Follow-up 4',
            title: '"Tell me about your family"',
            body: 'Often an HR check on stability and relocation. Two calm sentences, then stop.',
            visual: {
              type: 'chat',
              lines: [
                {
                  from: 'candidate',
                  text: "My father runs a medical shop in Kurnool and my mother is a homemaker. They're happy for me to relocate.",
                },
              ],
            },
            note: "Share only what you're comfortable with.",
          },
          {
            kicker: 'Follow-up 5',
            title: 'Questions for the interviewer',
            body: 'Usually the last question: "Any questions for us?" Saying "No" can sound uninterested.',
            visual: {
              type: 'checklist',
              items: [
                { text: '"What would my first project be?"', ok: true },
                { text: '"How do you test models before release?"', ok: true },
                { text: '"No, nothing."', ok: false },
                { text: '"What is the salary?" (save it for HR)', ok: false },
              ],
            },
          },
          {
            kicker: 'Try it',
            title: 'Rate yourself well',
            try: {
              type: 'choice',
              prompt:
                'The interviewer asks: *"Rate your SQL out of 5."* You write joins and GROUP BY daily, but have barely used window functions. Best answer?',
              options: [
                {
                  text: '"5. I use SQL every day."',
                  correct: false,
                  feedback:
                    "A 5 invites their hardest SQL questions, like window functions you haven't used.",
                },
                {
                  text: '"About 3.5. I write joins and GROUP BY daily, and I\'m learning window functions."',
                  correct: true,
                  feedback: 'A realistic number with proof and a named gap shows self-awareness.',
                },
                {
                  text: '"Maybe 2. I don\'t want to sound overconfident."',
                  correct: false,
                  feedback: 'Too low makes them doubt the SQL on your resume.',
                },
              ],
            },
          },
          {
            kicker: 'Resume follow-ups',
            title: 'Audit every line before the interview',
            body: 'Read your resume the way the interviewer will. For each line, ask what they would ask next, and check that you can answer it.',
            visual: {
              type: 'checklist',
              items: [
                { text: 'Every skill: one place you actually used it', ok: true },
                { text: 'Every number: how you measured it', ok: true },
                { text: 'Every title: your exact role and dates', ok: true },
                { text: 'A skill you only saw in one tutorial', ok: false },
              ],
            },
          },
          {
            kicker: 'Resume follow-ups',
            title: 'Lines that are not projects',
            body: 'Mentor roles, club posts, hackathons and certificates get questions too. Prepare two lines for each: what you did and what changed.',
            visual: {
              type: 'chat',
              lines: [
                {
                  from: 'interviewer',
                  text: 'Your resume says student mentor. What did you actually do?',
                },
                {
                  from: 'candidate',
                  text: 'I ran weekly Python doubt sessions for about 40 juniors. It taught me to explain one idea in three different ways.',
                },
              ],
            },
          },
          {
            kicker: 'Resume follow-ups',
            title: 'Gaps, backlogs and marks',
            body: 'Answer in one honest line, then move to what you did. Know your exact CGPA and school marks, because some companies have cut-offs.',
            visual: {
              type: 'chat',
              lines: [
                { from: 'interviewer', text: 'Do you have any backlogs?' },
                {
                  from: 'candidate',
                  text: 'One, in second year. I cleared it the next semester, and none are pending.',
                },
              ],
            },
            note: 'Your resume, LinkedIn profile and spoken answers must match: the same titles and the same dates.',
          },
          {
            kicker: 'Try it',
            title: 'A skill you cannot defend',
            try: {
              type: 'choice',
              prompt:
                'Your resume lists Spark, but you only watched one tutorial. The interview is tomorrow. Best move?',
              options: [
                {
                  text: 'Remove it, or mark it as basics and be ready to say what you learned',
                  correct: true,
                  feedback:
                    'Every line on your resume is a possible question. Claim only what you can explain.',
                },
                {
                  text: 'Keep it, because interviewers rarely ask about every skill',
                  correct: false,
                  feedback:
                    'They often pick one skill from the list. One failed follow-up makes them doubt the rest of your resume.',
                },
                {
                  text: 'Keep it, and say you used it in your project',
                  correct: false,
                  feedback:
                    'An invented use falls apart at the second question, like "How does Spark partition data?"',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'playbook',
      kind: 'INTERVIEW_PLAYBOOK',
      title: 'Answering "Tell me about yourself"',
      depthRank: 2,
      conceptKeys: [STRUCTURE, ROLE_FIT],
      body: {
        question: '"Tell me about yourself."',
        totalMinutes: 1,
        steps: [
          {
            title: 'Who you are',
            detail: 'About 10 seconds. Name, degree, college and year, or your current role.',
          },
          {
            title: 'Your toolkit',
            detail: 'About 10 seconds. Three to five skills from the job description.',
          },
          {
            title: 'Best project',
            detail: 'About 25 seconds. The problem, what you built, one measured result.',
          },
          {
            title: 'Experience (optional)',
            detail: 'About 7 seconds. One line, only if it supports the role.',
          },
          {
            title: 'Why this company',
            detail: 'About 8 seconds. One specific link between your work and theirs. Then stop.',
          },
        ],
        followUps: [
          '"Keep it brief" means about 30 seconds: who you are, your project in one line with its number, and why this company.',
          'Walk me through your resume.',
          'Explain the architecture of your project.',
          'Do you have any questions for us?',
        ],
      },
    },
    {
      key: 'check.write',
      kind: 'KNOWLEDGE_CHECK',
      title: 'Follow-ups and your own draft',
      depthRank: 2,
      conceptKeys: [STRUCTURE, ROLE_FIT],
      body: {
        items: [
          {
            key: 'draft',
            type: 'reasoning',
            prompt:
              'Write your own introduction for an ML Engineer interview, in about 110 to 130 words. Use the five parts, then say it aloud with a timer. On a phone? Write the five parts as short notes.',
            modelAnswer: `${WHO} ${SKILLS}\n\n${PROJECT} I deployed it as a FastAPI service.\n\n${EXPERIENCE} ${WHY}`,
            rubric: [
              'Opens with name, degree, college and year, or current role',
              'Names three to five skills relevant to ML engineering',
              'Describes one project with a real result you can say how you measured',
              'Leaves out school marks, family details and generic adjectives',
              'Ends with a specific reason for wanting this role at this company',
              'Takes about a minute when spoken',
            ],
          },
        ],
      },
    },
    {
      key: 'interview-questions',
      kind: 'CARD_DECK',
      title: 'Interview questions and answers',
      depthRank: 1,
      conceptKeys: [STRUCTURE, ROLE_FIT],
      body: {
        layout: 'flip',
        cards: [
          {
            title: 'One-minute introduction',
            front: 'Tell me about yourself.',
            back: "Use five parts in about a minute. Say who you are, your skills, your best project with one number, one line of experience and why this company. For example: I'm Arjun, a final-year CSE student at JNTU Hyderabad. My resume screener's top picks were on recruiters' shortlists 82% of the time, against 61% for keyword search.",
          },
          {
            title: 'Resume walk-through',
            front: 'Walk me through your resume.',
            back: 'Go from top to bottom, two lines per item: education, then each project or internship with your part and one result. Stop after the highlights and let them choose. They usually pick one line and dig in, so keep only lines you can explain in depth.',
          },
          {
            title: 'A skill on your resume',
            front: 'Your resume lists Docker. Where did you use it, and why?',
            back: 'Name the project, what the tool did there and the problem it solved. For example: I packaged my FastAPI model service in Docker, so it ran the same on my laptop and on the server. If you only followed a tutorial, say so, or remove the skill before the interview.',
          },
          {
            title: 'Gaps, backlogs and marks',
            front:
              'Do you have any backlogs or a gap in your education? What were your 10th and 12th marks?',
            back: 'Answer in one honest line, then move to what you did about it. For example: I had one backlog in second year and cleared it the next semester. None are pending. For a gap, say what you built or learned during it. Know your exact marks, since some companies have cut-offs.',
          },
          {
            title: 'Using AI in your work',
            front:
              'Do you take help from AI when you build projects, or do you do everything on your own?',
            back: "Be honest about what AI does and what you own. For example: An AI assistant drafts my unit tests and some boilerplate. I design the logic myself, read every line and run the tests. If I can't explain a line, it doesn't go in. Then offer to explain any part of your code.",
          },
          {
            title: 'You versus AI',
            front:
              'If AI can write code, what is the difference between you and AI? When would you avoid using it?',
            back: 'AI produces drafts. I decide what to build, check that it is correct and take responsibility for the result. I avoid AI with confidential data or code the company keeps private, and when I cannot check its output. When I learn a new concept, I work it out myself first.',
          },
          {
            title: 'Informal introduction',
            front: 'Introduce yourself without your resume. Who are you outside studies?',
            back: "Give one or two real interests, each with a detail you can talk about. For example: I play cricket every weekend and organise our hostel's matches. Skip a long list of hobbies, because each one can become a question. One true detail says more than five generic ones.",
          },
          {
            title: 'Family background',
            front: 'Tell me about your family background.',
            back: "Two calm sentences, then stop. For example: My father runs a medical shop in Kurnool and my mother is a homemaker. They're happy for me to relocate. HR often asks this to check stability and relocation. Share only what you're comfortable with.",
          },
          {
            title: 'Questions for the interviewer',
            front: 'Do you have any questions for us?',
            back: 'Always ask one or two questions about the work. For example: What would my first project be? Or: How do you test models before release? Saying no can sound uninterested. Save salary questions for the HR round.',
          },
        ],
      },
    },
    {
      key: 'summary',
      kind: 'SUMMARY',
      title: 'Self-introduction key takeaways',
      depthRank: 1,
      conceptKeys: [STRUCTURE, ROLE_FIT],
      body: {
        takeaways: [
          'When "Tell me about yourself" comes up, it is usually in Technical Round 1, so prepare it like a technical answer.',
          'Five parts in about a minute: who you are, skills, best project, experience, why this company.',
          'Lead with one project and one number you can defend in depth.',
          'Anything you mention can become the next question, so mention your strengths.',
          'Keep school marks and family details out of the pitch, and answer them briefly if asked.',
        ],
        remember: [
          'A trailer, not a biography',
          'One project, one number',
          'Memorise points, not words',
        ],
      },
    },
  ],
};
