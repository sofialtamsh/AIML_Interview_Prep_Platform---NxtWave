/**
 * Machine Learning Fundamentals → AI, ML, DL and learning types.
 *
 * Evidence (Hiring Intelligence, ML/AI families, Jan–Oct 2026; internal only, never quoted to
 * students): "What is machine learning?", "AI vs ML", "the types of machine learning" and
 * "supervised learning" open many ML rounds, mostly under 8 LPA. Follow-ups: use cases of
 * reinforcement learning and how to improve a weak RL agent, explaining AI to someone with no
 * technical background, classification with an example, train vs test data, what scikit-learn,
 * TensorFlow and Hugging Face do, data mining vs ML, the steps to evaluate and deploy a model, and
 * at 8+ LPA "would a simpler approach be more appropriate?". One bar for every package for now,
 * aimed at 8–12 LPA and kept simple, so every section is depth 1. Code outputs were checked by
 * running them with Python 3.14 and scikit-learn 1.9.
 */
import type { LessonDocumentInput } from '@app/content';

const AIML = 'mlf.ai-ml-dl';
const TYPES = 'mlf.learning-types';
const CYCLE = 'mlf.ml-lifecycle';

const SKLEARN_CODE = `from sklearn.datasets import load_iris
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split

X, y = load_iris(return_X_y=True)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=1)

model = LogisticRegression(max_iter=1000)
model.fit(X_train, y_train)
print(len(X_train), len(X_test))
print(round(model.score(X_test, y_test), 2))`;

export const AI_ML_LEARNING_TYPES_LESSON: LessonDocumentInput = {
  title: 'AI, machine learning, deep learning and the types of learning',
  subtitle:
    'The definitions every ML interview opens with, said simply and backed by real examples.',
  objectives: [
    {
      key: 'define',
      text: 'Explain AI, machine learning and deep learning, and how they fit together',
      minDepthRank: 1,
    },
    {
      key: 'types',
      text: 'Tell supervised, unsupervised and reinforcement learning apart, with examples',
      minDepthRank: 1,
    },
    {
      key: 'tasks',
      text: 'Tell a classification task from a regression task',
      minDepthRank: 1,
    },
    {
      key: 'lifecycle',
      text: 'Walk through the ML lifecycle, from the problem to monitoring',
      minDepthRank: 1,
    },
    {
      key: 'judgement',
      text: 'Say when a simple rule or a simple model beats a complex one',
      minDepthRank: 1,
    },
  ],
  sections: [
    {
      key: 'hook',
      kind: 'HOOK',
      title: 'Nobody wrote that rule',
      depthRank: 1,
      conceptKeys: [AIML],
      body: {
        scenario:
          'Your bank app flags a payment as "unusual" seconds after you pay. Nobody wrote a rule for your exact payment. A model learned what normal looks like from millions of past payments. That is machine learning.',
        animation: {
          name: 'ai-ml-dl-circles',
          caption: 'AI includes machine learning, which includes deep learning',
        },
        realWorld: {
          title: 'Where ML runs every day',
          items: [
            { icon: 'shield', label: 'Fraud alerts', sub: 'Unusual payments flagged in seconds' },
            { icon: 'film', label: 'Recommendations', sub: 'The next show or song to play' },
            { icon: 'mail', label: 'Spam filters', sub: 'Junk mail kept out of your inbox' },
            { icon: 'camera', label: 'Face unlock', sub: 'Your phone recognises your face' },
          ],
        },
        provocation: 'If nobody wrote the rule, where did it come from?',
        bridge:
          '"What is machine learning?" and "supervised or unsupervised?" open many ML interviews. A crisp answer with a real example sets the tone for the rest. This lesson gives you those answers.',
      },
    },
    {
      key: 'slides.definitions',
      kind: 'SLIDES',
      title: 'AI, ML and deep learning',
      depthRank: 1,
      conceptKeys: [AIML],
      body: {
        slides: [
          {
            kicker: 'AI · the story',
            title: 'Rules written by people',
            body: 'Early chess programs followed rules that experts wrote, like "protect the queen". That is **artificial intelligence (AI)**: any system that does a task we think needs intelligence. Hand-written rules are one way to build it.',
            visual: {
              type: 'icons',
              items: [
                { icon: 'puzzle', label: 'Chess engines', sub: 'Search and rules' },
                { icon: 'map', label: 'Route planners', sub: 'Shortest-path search' },
                { icon: 'message', label: 'Old chatbots', sub: 'If the user says X, reply Y' },
              ],
            },
          },
          {
            kicker: 'ML · the story',
            title: 'Rules learned from examples',
            body: 'A spam filter is not given rules. It sees thousands of emails marked spam or not spam, and finds the patterns itself. **Machine learning (ML)** is AI that learns from data instead of hand-written rules.',
            visual: {
              type: 'compare',
              left: {
                title: 'Traditional program',
                items: ['Rules and data go in', 'Answers come out', 'People write every rule'],
              },
              right: {
                title: 'Machine learning',
                items: ['Data and answers go in', 'Rules come out', 'The model learns them'],
              },
            },
          },
          {
            kicker: 'Deep learning · the story',
            title: 'Layers that learn their own features',
            body: 'Face unlock cannot run on rules like "two eyes, one nose". **Deep learning (DL)** is ML with neural networks of many layers. The layers learn useful features from raw pixels, sound or text by themselves.',
            animation: {
              name: 'ai-ml-dl-circles',
              caption: 'Real use: deep learning sits inside machine learning, inside AI',
            },
          },
          {
            kicker: 'Choosing',
            title: 'Classic ML or deep learning',
            visual: {
              type: 'compare',
              left: {
                title: 'Classic ML',
                items: [
                  'Strong on tables of features',
                  'Needs less data and compute',
                  'Easier to explain',
                ],
              },
              right: {
                title: 'Deep learning',
                items: [
                  'Images, audio and text',
                  'Needs far more data and GPUs',
                  'Learns its own features',
                ],
              },
              better: 'none',
            },
            note: 'A sharp answer: "For tabular data like loan records, I would try gradient-boosted trees before a neural network."',
          },
          {
            kicker: 'Generative AI',
            title: 'Models that create',
            body: 'Most models predict a label or a number. **Generative AI** creates new text, images or code, like a chatbot drafting an email. Today it runs on large deep-learning models trained on huge amounts of data. The LLM topic covers it in depth.',
          },
          {
            kicker: 'Try it',
            title: 'Pick the first model',
            try: {
              type: 'choice',
              prompt:
                'A bank has 20,000 rows of loan applications and must explain every decision to a regulator. What is the sensible first model?',
              options: [
                {
                  text: 'A simple model, such as logistic regression or a decision tree',
                  correct: true,
                  feedback:
                    'Right. Tabular data, a modest size and a need to explain all point to a simple model first. Compare stronger models against it later.',
                },
                {
                  text: 'A deep neural network',
                  correct: false,
                  feedback:
                    'It needs more data, is hard to explain, and rarely beats boosted trees on tables.',
                },
                {
                  text: 'A large language model',
                  correct: false,
                  feedback: 'An LLM generates text. It is not built to score loan applications.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'slides.types',
      kind: 'SLIDES',
      title: 'The types of learning',
      depthRank: 1,
      conceptKeys: [TYPES],
      body: {
        slides: [
          {
            kicker: 'Supervised · the story',
            title: 'Learning with an answer key',
            body: 'A student practises with a question bank that has an answer key and checks every answer. **Supervised learning** works the same way: each training example comes with its correct label, and the model learns to predict it.',
            animation: {
              name: 'labels-vs-no-labels',
              caption: 'Real use: spam filters, house prices, disease detection',
            },
          },
          {
            kicker: 'Supervised · two kinds',
            title: 'Classification or regression',
            visual: {
              type: 'compare',
              left: {
                title: 'Classification',
                items: ['Predicts a category', 'Spam or not, which digit, fraud or not'],
              },
              right: {
                title: 'Regression',
                items: ['Predicts a number', 'House price, delivery time, sales'],
              },
              better: 'none',
            },
            note: 'Ask: is the answer a label or a quantity? A model that outputs "probability of fraud" is still classification.',
          },
          {
            kicker: 'Unsupervised · the story',
            title: 'Finding groups with no answer key',
            body: 'A shop has millions of customers and no labels at all. **Unsupervised learning** finds structure by itself: groups of similar shoppers, unusual transactions, or a smaller set of features. Nobody gives it the right answer.',
            animation: {
              name: 'clusters',
              caption: 'Real use: customer segments and anomaly alerts',
            },
          },
          {
            kicker: 'Reinforcement · the story',
            title: 'Learning by trial and reward',
            body: 'A child learning to cycle tries, wobbles and adjusts. In **reinforcement learning (RL)**, an agent takes actions and gets rewards or penalties. Over time it learns the strategy that earns the most reward.',
            animation: {
              name: 'rl-loop',
              caption: 'Real use: game agents, robots, and tuning chatbots with feedback',
            },
          },
          {
            kicker: 'Side by side',
            title: 'Five kinds of learning',
            visual: {
              type: 'icons',
              items: [
                { icon: 'check', label: 'Supervised', sub: 'Labelled data, predict the label' },
                { icon: 'users', label: 'Unsupervised', sub: 'No labels, find the structure' },
                { icon: 'trophy', label: 'Reinforcement', sub: 'Rewards, learn the actions' },
                {
                  icon: 'layers',
                  label: 'Semi-supervised',
                  sub: 'A few labels, many unlabelled rows',
                },
                {
                  icon: 'repeat',
                  label: 'Self-supervised',
                  sub: 'Labels made from the data itself',
                },
              ],
            },
            note: 'LLMs are pre-trained with self-supervision: the next word in a sentence is the label.',
          },
          {
            kicker: 'Try it',
            title: 'Name the learning type',
            try: {
              type: 'choice',
              prompt:
                'A telecom company has call records with no labels and wants to group customers by how they use their phones. Which type of learning fits?',
              options: [
                {
                  text: 'Unsupervised learning, such as clustering',
                  correct: true,
                  feedback: 'Right. There are no labels, and the goal is to find groups.',
                },
                {
                  text: 'Supervised classification',
                  correct: false,
                  feedback: 'Classification needs labelled examples, and these records have none.',
                },
                {
                  text: 'Reinforcement learning',
                  correct: false,
                  feedback: 'Nothing here acts and earns rewards over time.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'slides.lifecycle',
      kind: 'SLIDES',
      title: 'The ML lifecycle',
      depthRank: 1,
      conceptKeys: [CYCLE],
      body: {
        slides: [
          {
            kicker: 'Lifecycle · the story',
            title: 'From a question to a working model',
            body: 'A food app wants to predict delivery time. The work does not start with a model. It starts with the problem and the data. And it never quite ends: a live model must be watched and retrained.',
            animation: {
              name: 'ml-lifecycle',
              caption: 'Real use: the loop every ML team runs',
            },
          },
          {
            kicker: 'The steps',
            title: 'Five stages, then repeat',
            visual: {
              type: 'flow',
              steps: [
                { label: 'Frame the problem', icon: 'target' },
                { label: 'Collect, clean data', icon: 'database' },
                { label: 'Train and tune', icon: 'cpu' },
                { label: 'Evaluate on new data', icon: 'gauge' },
                { label: 'Deploy and monitor', icon: 'rocket' },
              ],
            },
            note: 'Framing includes the metric: "average error under 5 minutes" is a goal you can test.',
          },
          {
            kicker: 'Scenario',
            title: 'Frame the problem first',
            body: 'Suppose you get five years of theft reports and must predict theft risk by area. Before naming a model, answer four questions out loud.',
            points: [
              'Target: will this area have a theft next week? A yes or no label, so classification.',
              'Features: past thefts nearby, day of week, season, street lighting, local events.',
              'Split by time: train on the first four years, test on the most recent year.',
              "Baseline: last year's theft rate per area. Any model must beat it to be worth using.",
            ],
            note: 'Also name a metric, such as the share of real thefts the model flags. Check for bias too: areas patrolled more report more thefts.',
          },
          {
            kicker: 'Train and test',
            title: 'Never grade on the practice paper',
            body: 'A model is trained on one part of the data and tested on rows it has never seen. Testing on the training rows is like grading a student on the exact questions they practised.',
            animation: {
              name: 'train-test-split',
              caption: 'Real use: an honest score before a model goes live',
            },
          },
          {
            kicker: 'In code',
            title: 'The whole loop in scikit-learn',
            visual: { type: 'code', code: SKLEARN_CODE, output: '120 30\n0.97' },
            note: 'Most scikit-learn models share the same calls: `fit` to learn, then `predict` or `score` to use the model.',
            narration:
              'This is the smallest real machine learning workflow. We load the iris flower dataset, where X holds four measurements per flower and y holds the species. The train test split keeps 20 percent of the rows aside: 120 rows train the model and 30 are held back. The model learns with fit, and score measures accuracy on the 30 rows it never saw. It gets 0.97, which means 29 of the 30 flowers are right.',
          },
          {
            kicker: 'Tools',
            title: 'Libraries you will be asked about',
            visual: {
              type: 'icons',
              items: [
                {
                  icon: 'chart',
                  label: 'scikit-learn',
                  sub: 'Classic ML: regression, trees, clustering',
                },
                { icon: 'layers', label: 'PyTorch', sub: 'Deep learning, research and production' },
                { icon: 'cpu', label: 'TensorFlow', sub: 'Deep learning, often used with Keras' },
                { icon: 'box', label: 'Hugging Face', sub: 'Ready-made pretrained models' },
                { icon: 'database', label: 'pandas and NumPy', sub: 'Data tables and fast arrays' },
              ],
            },
          },
          {
            kicker: 'Try it',
            title: 'Explain ML to a non-engineer',
            try: {
              type: 'write',
              prompt:
                'A relative asks what machine learning is. Explain it in two simple sentences, with one everyday example.',
              placeholder: 'Machine learning is…',
              sample:
                'Machine learning is teaching a computer with examples instead of instructions. Show it thousands of past payments marked "fraud" or "fine", and it learns to spot a new suspicious payment by itself.',
            },
          },
        ],
      },
    },
    {
      key: 'slides.deeper',
      kind: 'SLIDES',
      title: 'Four distinctions interviewers probe',
      depthRank: 1,
      conceptKeys: [AIML, TYPES, CYCLE],
      body: {
        slides: [
          {
            kicker: 'Two ways to classify',
            title: 'Generative and discriminative models',
            body: 'A **discriminative** model learns the boundary between classes. A **generative** model learns how each class produces its data, so it can create new examples.',
            visual: {
              type: 'compare',
              left: {
                title: 'Discriminative',
                items: ['Learns the boundary', 'Logistic regression, SVM'],
              },
              right: {
                title: 'Generative',
                items: ['Learns how data is made', 'Naive Bayes, GANs, LLMs'],
              },
              better: 'none',
            },
            note: 'Naive Bayes is generative in this statistical sense, but it is not generative AI.',
          },
          {
            kicker: 'Model size',
            title: 'Parametric and non-parametric models',
            body: 'A **parametric** model has a fixed number of parameters: linear regression keeps one weight per feature. A **non-parametric** model grows with the data: k-nearest neighbours keeps every training row to compare against.',
            visual: {
              type: 'compare',
              left: {
                title: 'Parametric',
                items: ['Fixed size, fast to predict', 'Linear and logistic regression'],
              },
              right: {
                title: 'Non-parametric',
                items: ['Grows with the data', 'k-NN, and decision trees'],
              },
              better: 'none',
            },
          },
          {
            kicker: 'When it learns',
            title: 'Batch and online learning',
            body: '**Batch** learning trains on all the data at once and retrains on a schedule. **Online** learning updates a little with each new example, which suits fast-changing streams like fraud.',
            visual: {
              type: 'compare',
              left: { title: 'Batch', items: ['Train on all the data', 'Retrain on a schedule'] },
              right: {
                title: 'Online',
                items: ['Update with each new row', 'Adapts quickly to change'],
              },
              better: 'none',
            },
          },
          {
            kicker: 'After launch',
            title: 'Data drift and concept drift',
            body: 'Models decay after launch. **Data drift**: the inputs change, like customers from a new city. **Concept drift**: the link between inputs and the answer changes, like fraudsters using a new trick. Monitoring catches both.',
            visual: {
              type: 'icons',
              items: [
                { icon: 'chart', label: 'Data drift', sub: 'The inputs look different' },
                { icon: 'alert', label: 'Concept drift', sub: 'The same inputs, a new answer' },
                { icon: 'repeat', label: 'The fix', sub: 'Monitor, then retrain on fresh data' },
              ],
            },
          },
          {
            kicker: 'Try it',
            title: 'Name the drift',
            try: {
              type: 'choice',
              prompt:
                'A loan model was built before a policy change. Now applicants look the same as before, but far more of them repay late. What has happened?',
              options: [
                {
                  text: 'Concept drift: the link between the inputs and the outcome changed',
                  correct: true,
                  feedback:
                    'Right. The inputs did not change, but what they lead to did. Retrain on recent outcomes.',
                },
                {
                  text: 'Data drift: the inputs changed',
                  correct: false,
                  feedback: 'The applicants look the same, so the inputs did not shift.',
                },
                {
                  text: 'Overfitting',
                  correct: false,
                  feedback: 'Overfitting shows as a gap between training and validation scores.',
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
      title: 'ML basics check',
      depthRank: 1,
      conceptKeys: [AIML, TYPES, CYCLE],
      body: {
        items: [
          {
            key: 'nesting',
            type: 'mcq',
            prompt: 'Which statement about AI, ML and deep learning is true?',
            options: [
              { id: 'a', text: 'Deep learning is a kind of ML, and ML is a kind of AI' },
              { id: 'b', text: 'AI is a kind of deep learning' },
              { id: 'c', text: 'ML and AI are two names for the same thing' },
              { id: 'd', text: 'Deep learning does not use neural networks' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'AI is the broadest field. Machine learning is the part that learns from data, and deep learning is the part of ML that uses many-layer neural networks.',
          },
          {
            key: 'rules',
            type: 'mcq',
            prompt: 'A chess program follows only rules that experts wrote. What is it?',
            options: [
              { id: 'a', text: 'AI, but not machine learning' },
              { id: 'b', text: 'Machine learning' },
              { id: 'c', text: 'Deep learning' },
              { id: 'd', text: 'Not AI at all' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'It does an intelligent task, so it is AI. It learns nothing from data, so it is not machine learning.',
          },
          {
            key: 'regression',
            type: 'mcq',
            prompt: 'Which task is regression?',
            options: [
              { id: 'a', text: 'Predicting a delivery time in minutes' },
              { id: 'b', text: 'Marking an email as spam or not spam' },
              { id: 'c', text: 'Reading a handwritten digit from 0 to 9' },
              { id: 'd', text: 'Grouping customers with no labels' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Regression predicts a number. Spam and digits are categories, so they are classification. Grouping without labels is unsupervised clustering.',
          },
          {
            key: 'unsupervised',
            type: 'mcq',
            prompt:
              'A model groups news articles by topic, with no labels. What kind of learning is this?',
            options: [
              { id: 'a', text: 'Unsupervised learning' },
              { id: 'b', text: 'Supervised learning' },
              { id: 'c', text: 'Reinforcement learning' },
              { id: 'd', text: 'Regression' },
            ],
            answer: { correct: ['a'] },
            explanation: 'With no labels, the model finds the groups by itself.',
          },
          {
            key: 'test-set',
            type: 'mcq',
            prompt: 'Why keep a test set that the model never sees during training?',
            options: [
              { id: 'a', text: 'To estimate how the model will do on new data' },
              { id: 'b', text: 'To make training faster' },
              { id: 'c', text: 'To get a higher score' },
              { id: 'd', text: 'Because scikit-learn requires it' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'A score on seen rows mostly shows memory. Unseen rows show how well the model generalises.',
          },
        ],
      },
    },
    {
      key: 'interview.what-is-ml',
      kind: 'INTERVIEW_PLAYBOOK',
      title: 'Definition answer structure',
      depthRank: 1,
      conceptKeys: [AIML, TYPES],
      body: {
        question: '"What is machine learning, and how is it different from AI?"',
        totalMinutes: 1,
        steps: [
          {
            title: 'Define simply',
            detail:
              'ML is a way for computers to learn patterns from data, instead of following rules people wrote.',
          },
          {
            title: 'Place it',
            detail:
              'AI is the broad goal of intelligent systems. ML is one way to build it. Deep learning is ML with many-layer neural networks.',
          },
          {
            title: 'Example',
            detail: 'A spam filter learns from emails labelled spam or not, then flags new ones.',
          },
          {
            title: 'Types',
            detail:
              'Name supervised, unsupervised and reinforcement learning, with one example each.',
          },
          {
            title: 'Your work',
            detail: 'Link it to your project: "In my project I used supervised learning to…"',
          },
        ],
        followUps: [
          'What is the difference between supervised and unsupervised learning?',
          'What are the use cases of reinforcement learning?',
          'When would you not use machine learning?',
          'What is semi-supervised learning?',
        ],
      },
    },
    {
      key: 'interview-questions',
      kind: 'CARD_DECK',
      title: 'Interview questions and answers',
      depthRank: 1,
      conceptKeys: [AIML, TYPES, CYCLE],
      body: {
        layout: 'flip',
        cards: [
          {
            title: 'AI against ML',
            front: 'What is the difference between AI and machine learning?',
            back: 'AI is the broad goal: systems that do tasks needing intelligence, built with rules or with learning. Machine learning is the part of AI where the system learns patterns from data instead of following hand-written rules. Deep learning is ML that uses many-layer neural networks.',
          },
          {
            title: 'ML in plain words',
            front: 'Explain machine learning to someone with no technical background.',
            back: 'It is teaching a computer with examples instead of instructions. Show it thousands of past payments marked "fraud" or "fine", and it learns what fraud looks like. Then it can flag a new suspicious payment by itself.',
          },
          {
            title: 'Supervised against unsupervised',
            front: 'What is the difference between supervised and unsupervised learning?',
            back: 'Supervised learning trains on examples that carry the right answer, like emails labelled spam, and predicts that label for new data. Unsupervised learning gets no labels and finds structure itself, like groups of similar customers. The labels are the difference.',
          },
          {
            title: 'Classification or regression',
            front: 'How do you decide whether a problem is classification or regression?',
            back: 'Look at the target. A category, such as spam or not, or which of 10 digits, means classification. A continuous number, such as a price or a delivery time in minutes, means regression. Predicting the probability of a class is still classification.',
          },
          {
            title: 'Reinforcement learning uses',
            front: 'What are the use cases of reinforcement learning?',
            back: 'Problems where an agent acts in steps and earns a reward. Examples: game-playing programs, robots learning to walk, and recommendations tuned for long-term engagement. It is also used to fine-tune chatbots with human feedback. It needs a clear reward and many tries, often in simulation.',
          },
          {
            title: 'A weak RL agent',
            front: 'Your reinforcement learning agent performs poorly. What would you check?',
            back: 'First the reward: does it reward the behaviour you want, or a shortcut? Then exploration: does the agent try enough new actions? Then training time, the learning rate and the information it sees. Many RL failures come from a badly designed reward.',
          },
          {
            title: 'Simple before complex',
            front:
              'When would you not use machine learning, or choose a simpler model over a complex one?',
            back: 'Skip ML when a clear rule works, like "block cards reported stolen", or when data is scarce. Otherwise start with a simple baseline. Move to a complex model only if it clearly beats the baseline on validation data. It must also be worth the extra cost to run, explain and maintain.',
          },
          {
            title: 'ML libraries',
            front: 'What do scikit-learn, PyTorch and Hugging Face do?',
            back: 'scikit-learn is the standard library for classic ML on tables: models, preprocessing, metrics and cross-validation, with the same fit-then-predict pattern. PyTorch and TensorFlow build and train neural networks on GPUs. Hugging Face is a hub of shared pretrained models and datasets, and its transformers library loads one in a few lines.',
          },
          {
            title: 'The ML lifecycle',
            front: 'Walk me through the lifecycle of an ML project.',
            back: 'Frame the problem and the metric. Collect and clean the data. Build features, train a baseline, then better models. Evaluate on held-out data. Deploy, then monitor for drift and falling accuracy, and retrain on fresh data. It is a loop, not a straight line.',
          },
        ],
      },
    },
    {
      key: 'summary',
      kind: 'SUMMARY',
      title: 'ML basics: key takeaways',
      depthRank: 1,
      conceptKeys: [AIML, TYPES, CYCLE],
      body: {
        takeaways: [
          'AI is the broad field. ML learns from data instead of hand-written rules. Deep learning is ML with many-layer networks.',
          'Supervised learning has labels; unsupervised finds structure without them; reinforcement learns from rewards.',
          'Classification predicts a category. Regression predicts a number.',
          'Start simple: on tables of data, a simple model or boosted trees often beats a neural network.',
          'The lifecycle is a loop: frame, collect, train, evaluate on unseen data, deploy, monitor, retrain.',
        ],
        remember: [
          'Data and answers in, rules out',
          'Label or quantity: classification or regression',
          'fit, then score on the test set',
        ],
      },
    },
  ],
};
