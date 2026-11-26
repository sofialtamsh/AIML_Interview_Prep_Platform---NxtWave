/**
 * LLMs, Prompting & Agents → How LLMs work.
 *
 * Evidence (Hiring Intelligence, ML/AI families, Jan–Oct 2026; internal only, never quoted to
 * students): under 8 LPA asks "what is an LLM" and "how do LLMs work" again and again, "what is
 * generative AI" and its types, what tokens are and how they are processed, the context window and
 * what happens when it overflows, pre-trained models and why fine-tuning starts from them, how to
 * estimate cost from token use, and "how does a chat assistant know my name". 8+ LPA adds how an
 * LLM generates a response, its core components, whether developers can train foundation models or
 * only fine-tune and prompt, open models, "do LLMs understand English?", and documents bigger than
 * the window. 3–6 LPA teaches this at depth 2; 8–12 LPA at depth 3 swaps the hands-on explorer for
 * BPE, the training loss and perplexity, model memory and quantization, open vs API models, SFT
 * and RLHF, reasoning models, long-context limits, the chat request flow, and cost and latency.
 * Every level gets the interview-questions card deck. Temperature, hallucinations in depth and RAG
 * belong to other units and are only pointed to. Every code output is checked by running it with
 * Python 3.14.
 */
import type { LessonDocumentInput } from '@app/content';

const PRETRAIN = 'llm.pretraining';
const TOKENS = 'llm.tokens-context';
const GENAI = 'llm.genai-types';

const CONTEXTS: Record<string, { text: string; logits: string }> = {
  tea: { text: 'The tea is', logits: '[2.0, 0.5, 1.0, -1.0]' },
  icecream: { text: 'The ice cream is', logits: '[-1.0, 2.2, 1.2, -1.5]' },
  exam: { text: 'The exam was', logits: '[-1.0, -0.5, -1.0, 2.0]' },
};
const CONTEXT_CODE = (key: string) => `import numpy as np

vocab = ["hot", "cold", "sweet", "tough"]
# toy scores (logits) for the word after "${CONTEXTS[key]?.text ?? ''}"
logits = np.array(${CONTEXTS[key]?.logits ?? '[0, 0, 0, 0]'})
probs = np.exp(logits) / np.exp(logits).sum()  # softmax
for w, p in zip(vocab, probs):
    print(f"{w:6} {p:.2f}")
print("next:", vocab[int(np.argmax(probs))])
`;

const CHAT = `chat = [
    ("system", "You plan trips in India.", 7),
    ("user", "Hi, I am Asha from Pune.", 9),
    ("assistant", "Hi Asha! Where to?", 7),
    ("user", "Goa, 3 days, under 15,000 rupees.", 14),
    ("assistant", "Day 1: North Goa beaches...", 40),
    ("user", "What is my name?", 6),
]
`;
const CHAT_TAIL = `

kept = fit(chat, 70)  # 100-token window, 30 kept for the reply
for role, text, n in kept:
    print(role, "|", text)
print("tokens:", sum(n for _, _, n in kept))
print("name still in context:", any("Asha" in t for _, t, _ in kept))
`;
const FIT_START = `${CHAT}

def fit(chat, budget):
    # each message is (role, text, tokens)
    # 1. always keep chat[0], the system message
    # 2. walk from the newest message backwards,
    #    stopping when the next one would not fit
    # 3. return the system message + the kept ones,
    #    oldest first
    return chat
${CHAT_TAIL}`;
const FIT_SOLUTION = `${CHAT}

def fit(chat, budget):
    system = chat[0]
    used = system[2]
    picked = []
    for msg in reversed(chat[1:]):
        if used + msg[2] > budget:
            break
        picked.append(msg)
        used += msg[2]
    return [system] + picked[::-1]
${CHAT_TAIL}`;

const COST_CODE = `# one support-bot call, with example prices in rupees
tokens_in, tokens_out = 1200, 300
price_in, price_out = 0.50 / 1000, 1.50 / 1000
cost = tokens_in * price_in + tokens_out * price_out
per_month = cost * 10_000 * 30  # 10,000 calls a day
print("cost:", round(cost, 2), "per month:", round(per_month))

# example speed: first token after 0.5 s, then 50 tokens a second
first, speed = 0.5, 50
print("reply time:", first + tokens_out / speed, "s")`;

export const HOW_LLMS_WORK_LESSON: LessonDocumentInput = {
  title: 'How LLMs work',
  subtitle:
    'Tokens, the context window, next-token prediction and the training stages behind every chat assistant, one story at a time.',
  objectives: [
    {
      key: 'llm',
      text: 'Explain what an LLM is and how it generates text, token by token',
      minDepthRank: 1,
    },
    {
      key: 'tokens',
      text: 'Explain tokens, tokenization and the context window, and estimate token cost',
      minDepthRank: 1,
    },
    {
      key: 'training',
      text: 'Explain pre-training, instruction tuning and preference tuning',
      minDepthRank: 1,
    },
    {
      key: 'genai',
      text: 'Tell generative from discriminative AI and name the types of generative AI',
      minDepthRank: 1,
    },
    {
      key: 'deep',
      text: 'Explain BPE, perplexity, model memory and quantization, and the limits of long contexts',
      minDepthRank: 3,
    },
  ],
  sections: [
    {
      key: 'hook',
      kind: 'HOOK',
      title: 'The model behind every chat reply',
      depthRank: 1,
      conceptKeys: [PRETRAIN],
      body: {
        scenario:
          'Type "Plan a 3-day Goa trip under ₹15,000" into a chat assistant, and a plan appears word by word. Behind it sits a **large language model** (LLM). It learned one skill from a huge amount of text: guessing the next word.',
        animation: {
          name: 'next-token-loop',
          caption: 'Each reply is written one token at a time',
        },
        realWorld: {
          title: 'Where LLMs work',
          items: [
            { icon: 'bot', label: 'Support chat', sub: 'Answers questions at any hour' },
            { icon: 'code', label: 'Code help', sub: 'Explains and completes code' },
            { icon: 'file', label: 'Summaries', sub: 'Long reports cut to a paragraph' },
            { icon: 'mail', label: 'Drafting', sub: 'Emails, posts and replies' },
          ],
        },
        provocation: 'If an LLM only predicts the next word, how does it write a whole trip plan?',
        bridge:
          '"What is an LLM?", "what are tokens?" and "what is a context window?" are common technical-round questions. This lesson answers each with a story, a picture and code.',
      },
    },
    {
      key: 'slides.llm',
      kind: 'SLIDES',
      title: 'Next-token prediction',
      depthRank: 1,
      conceptKeys: [PRETRAIN],
      body: {
        slides: [
          {
            kicker: 'What is an LLM',
            title: 'A very large next-word predictor',
            body: 'A **large language model** (LLM) is usually a decoder-only transformer, the GPT-style model from the last unit. It has billions of learned numbers, its **parameters** or weights. Its one skill: predicting the next **token**, a word or a piece of a word.',
            visual: {
              type: 'stat',
              value: '7 billion',
              label:
                'parameters in a small LLM; the largest have hundreds of billions, some over a trillion',
            },
          },
          {
            kicker: 'Generation · the story',
            title: 'Autocomplete, again and again',
            body: 'Your phone keyboard suggests one next word. An LLM does the same, adds that word to the text, and predicts again. A few hundred rounds later, you have a full trip plan.',
            visual: {
              type: 'flow',
              steps: [
                { label: 'Score each next token', icon: 'chart' },
                { label: 'Pick one', icon: 'check' },
                { label: 'Append, then repeat', icon: 'repeat' },
              ],
            },
          },
          {
            kicker: 'Generation · the code',
            title: 'Predict, append, repeat',
            narration:
              'Here is text generation as a tiny program. The dictionary called next word plays the model: for each word, it stores the likeliest word that follows. We start with the word tea. The loop predicts the next word, appends it, and repeats until it meets the end marker. It prints: tea is hot and sweet. A real LLM runs the same loop, but it looks at all the text so far, not just the last word.',
            visual: {
              type: 'code',
              code: '# a toy model: the likeliest word after each word\nnext_word = {"tea": "is", "is": "hot", "hot": "and",\n             "and": "sweet", "sweet": "<end>"}\ntext = ["tea"]\nwhile True:\n    nxt = next_word[text[-1]]  # predict\n    if nxt == "<end>":  # the stop token\n        break\n    text.append(nxt)  # append, then repeat\nprint(" ".join(text))',
              output: 'tea is hot and sweet',
            },
            note: 'A real LLM looks at all the text so far, not just the last word. It scores every token in a vocabulary of tens of thousands to a few hundred thousand.',
          },
          {
            kicker: 'Under the hood',
            title: 'From your question to the first word',
            visual: {
              type: 'flow',
              steps: [
                { label: 'Text into tokens', icon: 'hash' },
                { label: 'Token vectors plus position', icon: 'layers' },
                { label: 'Transformer layers', icon: 'cpu' },
                { label: 'Scores for the next token', icon: 'chart' },
              ],
            },
            note: 'Softmax turns the scores into probabilities, and one token is picked. Each new token passes through every layer again, so long answers take longer.',
          },
          {
            kicker: 'Does it understand',
            title: 'Patterns, not a database',
            points: [
              'It learned patterns of language, and many facts, from text; they live in its parameters',
              'No live lookup: anything after its training data is unknown unless you put it in the prompt',
              'Fluent is not the same as true: it can state wrong facts confidently (a **hallucination**)',
              'Its "understanding" is patterns of meaning, with no experience of the world and no built-in fact check',
            ],
          },
          {
            kicker: 'Try it',
            title: 'A 200-token answer',
            try: {
              type: 'choice',
              prompt:
                'A chat assistant writes a 200-token answer. How many times does the model predict a next token?',
              options: [
                {
                  text: 'About 200, one for each token',
                  correct: true,
                  feedback:
                    'Right. Each token is predicted, appended, and used to predict the next.',
                },
                {
                  text: 'Once, for the whole answer',
                  correct: false,
                  feedback: 'The model writes one token per step, not the whole answer at once.',
                },
                {
                  text: 'Once per sentence',
                  correct: false,
                  feedback: 'It works in tokens, not sentences: one prediction per token.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'explorer.context',
      slotKey: 'practice',
      kind: 'CODE_EXPLORER',
      title: 'Change the text, change the next word',
      depthRank: 1,
      conceptKeys: [PRETRAIN],
      body: {
        prompt:
          'The same four words get different scores, called **logits**, after different text. Softmax turns them into probabilities. Pick the text so far and see the likeliest next word.',
        packages: ['numpy'],
        controls: [
          {
            id: 'context',
            label: 'Text so far',
            options: [
              { value: 'tea', label: 'The tea is' },
              { value: 'icecream', label: 'The ice cream is' },
              { value: 'exam', label: 'The exam was' },
            ],
          },
        ],
        states: [
          {
            when: { context: 'tea' },
            code: CONTEXT_CODE('tea'),
            output: {
              kind: 'text',
              value: 'hot    0.61\ncold   0.14\nsweet  0.22\ntough  0.03\nnext: hot\n',
            },
            verdict: {
              tone: 'ok',
              text: 'After "The tea is", "hot" wins with 0.61. Always taking the top word is greedy decoding; sampling sometimes picks "sweet".',
            },
          },
          {
            when: { context: 'icecream' },
            code: CONTEXT_CODE('icecream'),
            output: {
              kind: 'text',
              value: 'hot    0.03\ncold   0.70\nsweet  0.26\ntough  0.02\nnext: cold\n',
            },
            verdict: {
              tone: 'info',
              text: 'Same four words, new text before them: now "cold" wins.',
            },
          },
          {
            when: { context: 'exam' },
            code: CONTEXT_CODE('exam'),
            output: {
              kind: 'text',
              value: 'hot    0.04\ncold   0.07\nsweet  0.04\ntough  0.85\nnext: tough\n',
            },
            verdict: {
              tone: 'info',
              text: '"tough" wins: the model picks what usually follows this kind of text.',
            },
          },
        ],
        defaultState: { context: 'tea' },
      },
    },
    {
      key: 'slides.tokens',
      kind: 'SLIDES',
      title: 'Tokens and the context window',
      depthRank: 1,
      conceptKeys: [TOKENS],
      body: {
        slides: [
          {
            kicker: 'Tokens · the story',
            title: 'Text cut into known pieces',
            body: 'A shopkeeper makes ₹87 in change biggest first: ₹50, ₹20, ₹10, ₹5, ₹2. A **tokenizer** cuts text the same way, into **tokens** from a fixed set of pieces. Common words stay whole; rare ones split. Each token gets an ID.',
            animation: {
              name: 'tokenizer-split',
              caption: 'Real use: every prompt becomes token IDs before the model sees it',
            },
          },
          {
            kicker: 'Tokens · the code',
            title: 'Longest known piece first',
            narration:
              'This is a toy tokenizer. The dictionary called vocab holds the pieces it knows and their ID numbers. The function tokenize takes the longest piece it knows from the start of the word, cuts it off, and repeats on what is left. So unbelievable becomes un, believ, able, and biryani becomes bir, yani. The last line turns the pieces of unbelievable into their IDs: 1, 2, 3.',
            visual: {
              type: 'code',
              code: 'vocab = {"un": 1, "believ": 2, "able": 3, "bir": 4, "yani": 5}\n\ndef tokenize(word):\n    tokens = []\n    while word:\n        # the longest piece the vocabulary knows\n        end = max(e for e in range(1, len(word) + 1)\n                  if word[:e] in vocab)\n        tokens.append(word[:end])\n        word = word[end:]\n    return tokens\n\nprint(tokenize("unbelievable"), tokenize("biryani"))\nprint([vocab[t] for t in tokenize("unbelievable")])',
              output: "['un', 'believ', 'able'] ['bir', 'yani']\n[1, 2, 3]",
            },
            note: 'Real tokenizers learn their pieces from data, with BPE or WordPiece. LLM vocabularies hold tens of thousands to a few hundred thousand tokens.',
          },
          {
            kicker: 'Rules of thumb',
            title: 'How many tokens is my text',
            visual: {
              type: 'stat',
              value: '≈ 750 words',
              label: 'in 1,000 English tokens, as a rough rule',
            },
            points: [
              'Indian languages often need more tokens than English for the same meaning',
              'Numbers, code and rare names split into many tokens',
              'Cost = prompt tokens × input price + reply tokens × output price; reply tokens usually cost more',
            ],
            note: "Count exactly with the model's own tokenizer before you estimate cost.",
          },
          {
            kicker: 'Context window · the story',
            title: 'A desk that holds only so many pages',
            body: 'An LLM works on a desk of fixed size: the **context window**. Instructions, the chat so far, any documents and its reply must all fit, counted in tokens. When it is full, something must go: usually the app drops the oldest pages.',
            animation: {
              name: 'context-window',
              caption: 'Real use: why a long chat forgets what you said at the start',
            },
          },
          {
            kicker: 'Context window · the facts',
            title: 'One budget for the prompt and the reply',
            points: [
              'The prompt and the reply share the same token budget',
              'Many current models hold 128,000 tokens or more; older ones held a few thousand',
              'Too long, and the request fails, the reply is cut short, or the app trims old text',
              'Longer contexts cost more, run slower, and miss details in the middle more often',
            ],
            note: 'For documents bigger than the window, send only the relevant chunks: that is **RAG** (retrieval-augmented generation), a later unit.',
          },
          {
            kicker: 'Memory',
            title: 'How a chat assistant remembers you',
            body: 'The model itself remembers nothing between messages. Each time, the app resends the chat so far, plus saved notes such as your name. All of it must fit in the window, and you pay for it every turn.',
          },
          {
            kicker: 'Try it',
            title: 'Room for the reply',
            try: {
              type: 'choice',
              prompt:
                'A model has an 8,000-token context window. Your prompt uses 7,500 tokens. About how long can the reply be?',
              options: [
                {
                  text: 'About 500 tokens',
                  correct: true,
                  feedback: 'Right: the prompt and the reply share the same 8,000 tokens.',
                },
                {
                  text: '8,000 tokens',
                  correct: false,
                  feedback: 'The prompt already uses 7,500 of them.',
                },
                {
                  text: 'As long as it likes',
                  correct: false,
                  feedback: 'Every token, read or written, counts against the window.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'playground.context',
      kind: 'PLAYGROUND',
      title: 'Fit a chat into the context window',
      depthRank: 1,
      conceptKeys: [TOKENS],
      body: {
        language: 'python',
        instructions:
          'Finish `fit(chat, budget)`. The window holds 100 tokens and 30 stay free for the reply, so the chat gets 70. Keep the system message (the standing instructions), then add messages from the newest backwards, stopping at the first that does not fit. It should print `tokens: 67` and `name still in context: False`. The model can no longer answer "What is my name?"; real apps save such facts and resend them.',
        starterCode: FIT_START,
        hints: [
          'Start with `system = chat[0]` and `used = system[2]`.',
          'Loop over `reversed(chat[1:])`, and `break` when `used + msg[2] > budget`.',
          'You collected the newest first, so return `[system] + picked[::-1]`.',
        ],
        solution: FIT_SOLUTION,
        checks: [
          {
            type: 'stdout_contains',
            value: 'tokens: 67',
            label: 'Uses 67 of the 70-token chat budget',
          },
          {
            type: 'stdout_contains',
            value: 'name still in context: False',
            label: "Asha's name has been trimmed away",
          },
          {
            type: 'stdout_contains',
            value: 'system | You plan trips in India.\nuser | Goa',
            label: 'System message kept, oldest turns dropped',
          },
        ],
      },
    },
    {
      key: 'slides.training',
      kind: 'SLIDES',
      title: 'How an LLM is trained',
      depthRank: 1,
      conceptKeys: [PRETRAIN],
      body: {
        slides: [
          {
            kicker: 'Pre-training · the story',
            title: 'Reading a whole library',
            body: 'Imagine reading billions of pages and guessing every next word before you look. Each wrong guess nudges your memory a little. That is **pre-training**: next-token prediction over a huge amount of text. The result is a **base model**, also called a **foundation model**.',
            animation: {
              name: 'llm-training-stages',
              caption: 'Real use: every chat model starts as a pre-trained base model',
            },
          },
          {
            kicker: 'From base to chat',
            title: 'Three training stages',
            visual: {
              type: 'flow',
              steps: [
                { label: 'Pre-training on huge text', icon: 'book' },
                { label: 'Instruction tuning', icon: 'list' },
                { label: 'Preference tuning (RLHF)', icon: 'users' },
              ],
            },
            points: [
              'A base model only continues text: ask a question and it may write more questions',
              'Instruction tuning trains on example requests and good answers',
              'Preference tuning (**RLHF**, reinforcement learning from human feedback) favours answers people rank higher',
            ],
          },
          {
            kicker: 'Who trains what',
            title: 'Pre-train, fine-tune or prompt',
            visual: {
              type: 'icons',
              items: [
                {
                  icon: 'cpu',
                  label: 'Pre-training',
                  sub: 'Thousands of GPUs for weeks; done by large labs',
                },
                {
                  icon: 'settings',
                  label: 'Fine-tuning',
                  sub: 'Adjusts a pre-trained model on your own examples',
                },
                {
                  icon: 'message',
                  label: 'Prompting and RAG',
                  sub: 'No training: instructions and documents at question time',
                },
              ],
            },
            note: 'Fine-tuning reuses everything pre-training learned, like transfer learning with CNNs, so it needs far less data.',
          },
          {
            kicker: 'Try it',
            title: 'Asking a base model',
            try: {
              type: 'choice',
              prompt:
                'You send "What is the capital of India?" to a base model that is only pre-trained. What is a likely reply?',
              options: [
                {
                  text: 'More quiz-style questions, such as "What is the capital of China?"',
                  correct: true,
                  feedback:
                    'Right. A base model just continues text, often with more questions; following requests comes from instruction tuning.',
                },
                {
                  text: 'A polite, complete answer',
                  correct: false,
                  feedback: 'That behaviour comes from instruction and preference tuning.',
                },
                {
                  text: 'An error, because it never saw any facts',
                  correct: false,
                  feedback:
                    'It saw plenty of facts in pre-training; it was just never taught to answer.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'slides.genai',
      kind: 'SLIDES',
      title: 'Types of generative AI',
      depthRank: 1,
      conceptKeys: [GENAI],
      body: {
        slides: [
          {
            kicker: 'Generative AI · the story',
            title: 'Sort what exists, or make something new',
            body: 'A spam filter sorts customer reviews into spam and not spam: that is **discriminative** AI. A model that writes a reply, draws a poster or speaks a sentence creates something new: that is **generative** AI.',
            animation: {
              name: 'genai-types',
              caption: 'Real use: the same idea behind text, image, audio and code tools',
            },
            note: 'Formally, discriminative models learn P(label | input); generative models learn how the data itself is spread, so they can sample new data.',
          },
          {
            kicker: 'The types',
            title: 'What generative models make',
            visual: {
              type: 'icons',
              items: [
                { icon: 'message', label: 'Text: LLMs', sub: 'Chat, summaries, emails' },
                {
                  icon: 'image',
                  label: 'Images and video',
                  sub: 'Diffusion: start from noise and remove it step by step',
                },
                { icon: 'music', label: 'Audio', sub: 'Speech, voices and music' },
                { icon: 'code', label: 'Code', sub: 'Complete, explain and fix code' },
              ],
            },
            note: '**Multimodal** models mix kinds, such as a photo plus a question. Older image models were **GANs**: a generator learns to fool a critic.',
          },
          {
            kicker: 'Try it',
            title: 'Generative or not',
            try: {
              type: 'choice',
              prompt: 'Which of these tasks is generative?',
              options: [
                {
                  text: 'Writing a product description from five bullet points',
                  correct: true,
                  feedback: 'Right. It creates new text that did not exist before.',
                },
                {
                  text: 'Flagging a review as spam',
                  correct: false,
                  feedback: 'That sorts existing text into a label: discriminative.',
                },
                {
                  text: "Predicting next month's sales figure",
                  correct: false,
                  feedback: 'That predicts one number from data: a regression, not generation.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'check.basics',
      slotKey: 'check',
      kind: 'KNOWLEDGE_CHECK',
      title: 'LLM basics check',
      depthRank: 1,
      conceptKeys: [PRETRAIN, TOKENS, GENAI],
      body: {
        items: [
          {
            key: 'step',
            type: 'mcq',
            prompt: 'What does an LLM do at each step of writing a reply?',
            options: [
              { id: 'a', text: 'Predicts the next token from all the text so far' },
              { id: 'b', text: 'Looks the answer up in a database' },
              { id: 'c', text: 'Writes the whole reply in one step' },
              { id: 'd', text: 'Copies the closest sentence from its training data' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Generation is a loop: score every possible next token, pick one, append it, and repeat.',
          },
          {
            key: 'tokenize',
            type: 'predict_output',
            prompt: 'What does this print?',
            language: 'python',
            code: 'vocab = {"to": 1, "ken": 2, "token": 3, "s": 4}\nword, ids = "tokens", []\nwhile word:\n    end = max(e for e in range(1, len(word) + 1)\n              if word[:e] in vocab)\n    ids.append(vocab[word[:end]])\n    word = word[end:]\nprint(ids)',
            options: [
              { id: 'a', text: '[3, 4]' },
              { id: 'b', text: '[1, 2, 4]' },
              { id: 'c', text: '[3]' },
              { id: 'd', text: '[1, 2]' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'The longest known piece at the start is "token" (ID 3), which leaves "s" (ID 4). "to" + "ken" is never chosen, because "token" is longer.',
          },
          {
            key: 'trim',
            type: 'mcq',
            prompt:
              'Your app keeps the system message and trims the oldest chat turns to fit the window. What is a side effect?',
            options: [
              {
                id: 'a',
                text: 'The model may forget early details, such as the name the user gave',
              },
              { id: 'b', text: 'The model becomes more accurate' },
              { id: 'c', text: 'The reply can be longer than the window' },
              { id: 'd', text: 'Nothing changes' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'The model sees only what is in the window. Trimmed turns are gone, unless the app saves key facts and sends them again.',
          },
          {
            key: 'stage',
            type: 'mcq',
            prompt: 'Which training stage turns a base model into one that follows instructions?',
            options: [
              { id: 'a', text: 'Instruction tuning on example requests and answers' },
              { id: 'b', text: 'More pre-training on web text' },
              { id: 'c', text: 'Tokenization' },
              { id: 'd', text: 'A bigger context window' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Pre-training teaches language; instruction tuning teaches the request-and-answer format. Preference tuning then polishes the answers.',
          },
          {
            key: 'cost',
            type: 'mcq',
            prompt:
              'Suppose input costs ₹0.50 and output ₹1.50 per 1,000 tokens. A call uses 1,200 prompt tokens and 300 reply tokens. What does it cost?',
            options: [
              { id: 'a', text: '₹1.05' },
              { id: 'b', text: '₹0.75' },
              { id: 'c', text: '₹2.25' },
              { id: 'd', text: '₹1.50' },
            ],
            answer: { correct: ['a'] },
            explanation:
              '1.2 × ₹0.50 = ₹0.60 for the prompt, and 0.3 × ₹1.50 = ₹0.45 for the reply: ₹1.05 in all.',
          },
        ],
      },
    },
    {
      key: 'interview.llm',
      kind: 'INTERVIEW_PLAYBOOK',
      title: 'LLM answer structure',
      depthRank: 1,
      conceptKeys: [PRETRAIN, TOKENS],
      body: {
        question: '"What is an LLM, and how does it generate text?"',
        totalMinutes: 2,
        steps: [
          {
            title: 'Define',
            detail:
              'Usually a large decoder-only transformer, with billions of parameters, trained on a huge amount of text to predict the next token.',
          },
          {
            title: 'Tokens',
            detail:
              "Text becomes token IDs, then vectors that carry each token's position. Masked self-attention lets each token use all the tokens before it.",
          },
          {
            title: 'Generation',
            detail:
              'Softmax turns its scores for every vocabulary token into probabilities. It picks one (greedy or sampled), appends it, and repeats until an end token.',
          },
          {
            title: 'Context window',
            detail: 'Everything it can see, prompt and reply, must fit in a fixed token budget.',
          },
          {
            title: 'Training',
            detail:
              'Pre-training on huge text, then instruction tuning and preference tuning (RLHF) make a helpful assistant.',
          },
          {
            title: 'Limits',
            detail:
              'It predicts likely text, so it can be confidently wrong. It knows nothing newer than its training data unless you supply it.',
          },
        ],
        followUps: [
          'What is a token, and how does tokenization work?',
          'What is a context window, and what happens when you exceed it?',
          'How do you estimate the cost of an LLM call?',
          'What is the difference between pre-training and fine-tuning?',
          'How does a chat assistant remember earlier messages?',
          'What is generative AI, and what are its types?',
        ],
      },
    },
    {
      key: 'slides.deeper',
      slotKey: 'practice',
      kind: 'SLIDES',
      title: 'Deeper LLM questions',
      depthRank: 3,
      conceptKeys: [TOKENS, PRETRAIN],
      body: {
        slides: [
          {
            kicker: 'BPE · the story',
            title: 'Shortcuts that everyone starts using',
            body: 'People typed "by the way" so often that it became one shortcut, "btw". **Byte-pair encoding** (BPE) does the same: the most frequent pair of pieces becomes one new token, again and again.',
            animation: {
              name: 'bpe-merges',
              caption: 'Real use: the tokenizers of most GPT-style models',
            },
          },
          {
            kicker: 'BPE · the code',
            title: 'Merge the most frequent pair',
            narration:
              'Here is byte pair encoding in a few lines. Each word starts as a list of single letters. In every round, the counter finds the pair of neighbours that appears most often, and the inner loop merges that pair into one piece everywhere. Round 1 merges l and o. Round 2 merges lo and w. Round 3 merges e and s. Real tokenizers repeat this tens of thousands of times.',
            visual: {
              type: 'code',
              code: 'from collections import Counter\n\nwords = ["low", "low", "lower", "lowest", "newest", "widest"]\ncorpus = [list(w) for w in words]\nfor step in range(3):\n    pairs = Counter(p for w in corpus for p in zip(w, w[1:]))\n    best = max(pairs, key=pairs.get)\n    for w in corpus:\n        i = 0\n        while i < len(w) - 1:\n            if (w[i], w[i + 1]) == best:\n                w[i:i + 2] = [w[i] + w[i + 1]]\n            i += 1\n    print(step + 1, best, pairs[best])',
              output: "1 ('l', 'o') 4\n2 ('lo', 'w') 4\n3 ('e', 's') 3",
            },
            note: 'Real tokenizers learn tens of thousands of merges, often on bytes so any text fits. They replay the merges in order on new text.',
          },
          {
            kicker: 'Training · the loss',
            title: 'How wrong was each guess',
            narration:
              'This shows how training measures a wrong guess. The array p correct holds the probability the model gave to the true next token at 3 steps: 0.5, 0.25 and 0.8. The loss is the average of the negative logs, which comes to 0.768. Perplexity is e to the power of the loss, here 2.15. It means the model was about as unsure as choosing between 2 tokens. Lower is better.',
            visual: {
              type: 'code',
              code: 'import numpy as np\n\n# probability given to the true next token, at 3 steps\np_correct = np.array([0.5, 0.25, 0.8])\nloss = -np.mean(np.log(p_correct))  # cross-entropy\nperplexity = np.exp(loss)\nprint(round(float(loss), 3), round(float(perplexity), 2))',
              output: '0.768 2.15',
            },
            note: 'Perplexity 2.15: on average the model was as unsure as choosing between about 2 tokens. Lower is better.',
          },
          {
            kicker: 'Model size',
            title: 'How much memory the weights need',
            narration:
              'This small loop works out how much memory a model needs. We take 7 billion parameters and store each one in 16, 8 or 4 bits. Bits divided by 8 gives bytes, and dividing by a billion gives gigabytes. The result is 14 gigabytes at 16 bit, 7 at 8 bit, and 3.5 at 4 bit. Storing weights in fewer bits is called quantization, and it lets a large model fit on a laptop.',
            visual: {
              type: 'code',
              code: 'params = 7_000_000_000\nfor bits in (16, 8, 4):\n    gb = params * bits / 8 / 1e9\n    print(f"{bits}-bit: {gb} GB")',
              output: '16-bit: 14.0 GB\n8-bit: 7.0 GB\n4-bit: 3.5 GB',
            },
            note: '**Quantization** stores each weight in fewer bits, like saving a photo at lower quality. A 7-billion-parameter model then fits on a laptop.',
          },
          {
            kicker: 'Open or API',
            title: 'Run it yourself, or call a provider',
            visual: {
              type: 'compare',
              left: {
                title: 'Open-weight models',
                items: [
                  'Download the weights; run and fine-tune them on your own machines',
                  'Full control and privacy; you handle the hardware',
                  'Examples: Llama, Qwen, Gemma, DeepSeek',
                  'Laptop: Ollama or llama.cpp; many users: vLLM on a GPU server',
                ],
              },
              right: {
                title: 'API models',
                items: [
                  'Send text to a provider; pay per token',
                  'No hardware to run; often the strongest models',
                  'Examples: GPT, Claude, Gemini',
                ],
              },
              better: 'none',
            },
            note: 'Often called open-source, though the training data and code are usually not released.',
          },
          {
            kicker: 'Inside the tuning',
            title: 'SFT, reward models and RLHF',
            points: [
              '**SFT** (supervised fine-tuning, the instruction-tuning step): train on example prompts with written answers',
              '**Reward model**: learns to score answers the way human raters ranked them',
              '**RLHF**: reinforcement learning, often the PPO algorithm, raises the reward but stays close to the SFT model',
              '**DPO** (direct preference optimisation) skips the reward model and learns from ranked pairs',
            ],
          },
          {
            kicker: 'Reasoning models',
            title: 'Models that think before answering',
            points: [
              'An extra training stage uses reinforcement learning on tasks with checkable answers, such as maths and code',
              'They write thinking tokens before the answer, often hidden or summarised, but billed as output',
              'Stronger on multi-step problems; slower and costlier on simple ones',
              'Many APIs let you set how much the model thinks, trading quality for speed and cost',
            ],
            note: 'Use a reasoning model for planning, maths or tricky code. Use a fast standard model for chat, extraction and labels.',
          },
          {
            kicker: 'Long contexts',
            title: 'Why a bigger window is not free',
            points: [
              'Attention compares every pair of tokens, so its cost grows with the square of the length',
              'The KV cache, the stored keys and values of past tokens, grows with every token kept',
              'Facts buried in the middle of a long prompt are recalled less reliably',
              'Put key instructions at the start or end; for huge documents, retrieve chunks or summarise in stages',
            ],
          },
          {
            kicker: 'Chat apps · the flow',
            title: 'A chat request, end to end',
            body: "In a real chat app, the user's message does not go straight to the model. On every turn, the app builds one request: the system prompt, recent history, any retrieved documents, then the new question.",
            visual: {
              type: 'flow',
              steps: [
                { label: 'Check the input', icon: 'shield' },
                { label: 'Load session history', icon: 'database' },
                { label: 'Add documents', icon: 'file' },
                { label: 'Call the model', icon: 'cpu' },
                { label: 'Stream and check, then save', icon: 'check' },
              ],
            },
            note: 'Store each session under an ID, in Redis or a database. Stream the reply token by token, so users see it start at once.',
          },
          {
            kicker: 'Cost and latency',
            title: 'Price and speed of a feature',
            narration:
              'This estimates the price and speed of one support bot call, with example prices. The call sends 1200 tokens in and gets 300 tokens out, so it costs about 1 rupee and 5 paise. At 10 thousand calls a day for 30 days, that is about 315 thousand rupees a month. For speed, assume the first token arrives after half a second, then 50 tokens a second. The 300 token reply takes 6.5 seconds. Each output token costs three times an input token, and output drives most of the wait.',
            visual: {
              type: 'code',
              code: COST_CODE,
              output: 'cost: 1.05 per month: 315000\nreply time: 6.5 s',
            },
            note: 'Levers: shorter prompts, caching, a smaller model for easy steps, and capped output. Long prompts delay the first token; streaming makes the wait feel shorter.',
          },
          {
            kicker: 'Try it',
            title: 'A 13-billion-parameter model',
            try: {
              type: 'choice',
              prompt:
                'Roughly how much memory do the weights of a 13-billion-parameter model need in 16-bit?',
              options: [
                {
                  text: '26 GB',
                  correct: true,
                  feedback: 'Right: 13 billion weights × 2 bytes each.',
                },
                {
                  text: '13 GB',
                  correct: false,
                  feedback: 'That is 8-bit: 1 byte per weight.',
                },
                {
                  text: '6.5 GB',
                  correct: false,
                  feedback: 'That is 4-bit: half a byte per weight.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'check.deep',
      slotKey: 'check',
      kind: 'KNOWLEDGE_CHECK',
      title: 'LLM depth check',
      depthRank: 3,
      conceptKeys: [PRETRAIN, TOKENS, GENAI],
      body: {
        items: [
          {
            key: 'perplexity',
            type: 'mcq',
            prompt:
              'A model gives the true next token a probability of 0.25 at every step. What is its perplexity?',
            options: [
              { id: 'a', text: '4' },
              { id: 'b', text: '0.25' },
              { id: 'c', text: '25' },
              { id: 'd', text: '1.39' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Loss = −ln 0.25 = 1.39, and perplexity = e^1.39 = 4: as unsure as choosing among 4 tokens. 1.39 is the loss itself.',
          },
          {
            key: 'quantize',
            type: 'mcq',
            prompt: 'What does moving a 7B model from 16-bit to 4-bit weights do?',
            options: [
              {
                id: 'a',
                text: 'Cuts weight memory from about 14 GB to 3.5 GB, with a small quality loss',
              },
              { id: 'b', text: 'Makes the model 4 times more accurate' },
              { id: 'c', text: 'Shrinks the context window' },
              { id: 'd', text: 'Changes which tokens it knows' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Each weight goes from 2 bytes to half a byte: a quarter of the memory. Accuracy drops a little; the tokenizer is unchanged.',
          },
          {
            key: 'reward',
            type: 'mcq',
            prompt: 'What does the reward model in RLHF learn?',
            options: [
              { id: 'a', text: 'To score answers the way human raters ranked them' },
              { id: 'b', text: 'To predict the next token' },
              { id: 'c', text: 'To split text into tokens' },
              { id: 'd', text: 'To fetch documents for the prompt' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'People rank pairs of answers; the reward model learns those preferences, and the LLM is then tuned to score well on it.',
          },
          {
            key: 'too-long',
            type: 'mcq',
            prompt: 'A 300-page report will not fit in the context window. What is the usual fix?',
            options: [
              {
                id: 'a',
                text: 'Split it into chunks and send only the relevant ones, or summarise it in stages',
              },
              { id: 'b', text: 'Send it anyway; the model reads the rest later' },
              { id: 'c', text: 'Switch to a smaller model' },
              { id: 'd', text: 'Train a new tokenizer' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Retrieval (RAG) picks the chunks that matter. Staged summaries condense the rest. The model never sees text beyond the window.',
          },
          {
            key: 'foundation',
            type: 'reasoning',
            prompt:
              'The interviewer asks: *"Can developers train their own foundation model, or only fine-tune and prompt?"* Answer in three or four sentences.',
            modelAnswer:
              'Developers can, but pre-training needs huge amounts of text and thousands of GPUs for weeks, so mostly large labs do it.\n\nMost teams start from a pre-trained model. They prompt it, add documents at question time with RAG, or fine-tune it on their own examples. Fine-tuning reuses what pre-training learned, so it needs far less data and compute.',
            rubric: [
              'Pre-training is possible but needs huge data and compute',
              'Most teams start from a pre-trained foundation model',
              'Prompting and RAG need no training',
              'Fine-tuning adapts the model with far less data',
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
      conceptKeys: [PRETRAIN, TOKENS],
      body: {
        layout: 'flip',
        cards: [
          {
            title: 'LLM in one answer',
            front: 'What is a large language model, and how does it generate a reply?',
            back: 'An LLM is a large decoder-only transformer trained on huge text to predict the next token. To reply, it scores every possible next token, picks one, appends it and repeats until an end token. It writes likely text, so it can sound sure and still be wrong.',
          },
          {
            title: 'Tokens and tokenization',
            front: 'What is a token, and how does tokenization work?',
            back: 'A token is a word or a piece of a word, with its own ID. A tokenizer splits text into pieces learned from data, often by byte-pair encoding. Common words stay whole; rare words, numbers and code split up. Roughly, 1,000 English tokens are 750 words.',
          },
          {
            title: 'Context window limits',
            front: 'What is a context window, and what happens when a conversation grows past it?',
            back: "It is the most tokens the model can see at once: instructions, history, documents and its reply. Past it, the API rejects the request or cuts the reply short. Chat apps trim or summarise the oldest turns, so early details, like the user's name, get forgotten.",
          },
          {
            title: 'Estimating token cost',
            front: 'How would you estimate the cost of an LLM feature from its token usage?',
            back: "Cost per call is input tokens times the input price, plus output tokens times the output price. Output usually costs more, and a reasoning model's thinking counts as output. At ₹0.50 and ₹1.50 per 1,000 tokens, 1,200 input and 300 output tokens cost ₹1.05. Multiply by monthly calls.",
          },
          {
            title: 'Three training stages',
            front:
              'Explain pre-training, instruction tuning and RLHF. Why does a chat assistant need all three?',
            back: 'Pre-training teaches language and facts by next-token prediction, but the base model only continues text. Instruction tuning, or supervised fine-tuning (SFT), trains it on example requests and good answers, so it follows instructions. RLHF, reinforcement learning from human feedback, then favours answers people rank higher.',
          },
          {
            title: 'Open and closed models',
            front:
              'What is the difference between open-source and closed-source LLMs, and when would you choose each?',
            back: 'Open-weight models, often called open-source, such as Llama, Qwen or DeepSeek, can be downloaded and run on your own servers. Closed models, such as GPT, Claude or Gemini, are used through a paid API. Choose open weights for privacy and control; an API for top quality without hardware.',
          },
          {
            title: 'Running a model locally',
            front: 'How would you host an LLM locally instead of calling an API?',
            back: "Download an open-weight model, for example from Hugging Face. Check memory first: a 7-billion-parameter model's weights need 14 GB at 16-bit, 3.5 GB at 4-bit. On a laptop, run a quantized model, stored in fewer bits, with Ollama or llama.cpp. For many users, serve it from a GPU server with vLLM.",
          },
          {
            title: 'Chat request flow',
            front:
              "Does a user's message go straight to the LLM? Walk me through a chatbot's request flow.",
            back: 'No. The app checks the input, loads the session history and, if needed, retrieves documents. It sends the system prompt, history, documents and question in one request. Then it streams the reply back, checking it as it goes, and saves the turn. The model keeps nothing between calls.',
          },
          {
            title: 'Chat session memory',
            front: 'How do you maintain a session in a chatbot, and where do you store it?',
            back: "Give each conversation a session ID and store its messages: Redis for fast access, a database for long-term history. Each turn, load recent messages, a summary of older ones and saved facts, like the user's name. Resend them with the new message, within the token budget.",
          },
        ],
      },
    },
    {
      key: 'summary.basic',
      slotKey: 'summary',
      kind: 'SUMMARY',
      title: 'How LLMs work: key takeaways',
      depthRank: 1,
      conceptKeys: [PRETRAIN, TOKENS, GENAI],
      body: {
        takeaways: [
          'An LLM is a large decoder-only transformer that predicts the next token, again and again.',
          'Text becomes tokens (common words whole, rare words in pieces), then IDs, then vectors.',
          'The context window is one token budget, shared by the prompt and the reply.',
          'Pre-training makes a base model; instruction and preference tuning make an assistant.',
          'Generative AI creates text, images, audio and code; discriminative AI sorts and labels.',
          'The model remembers nothing; the app resends the chat, so trimmed turns are forgotten.',
        ],
        remember: [
          '1,000 tokens ≈ 750 English words',
          'Prompt + reply ≤ context window',
          'Cost = input tokens × input price + output tokens × output price',
        ],
      },
    },
    {
      key: 'summary.advanced',
      slotKey: 'summary',
      kind: 'SUMMARY',
      title: 'How LLMs work: key takeaways',
      depthRank: 3,
      conceptKeys: [PRETRAIN, TOKENS, GENAI],
      body: {
        takeaways: [
          'An LLM generates by predicting, appending and repeating; generative AI creates content, discriminative AI labels it.',
          'BPE tokenizers merge frequent pairs; the context window is a shared token budget.',
          'Pre-training minimises cross-entropy; perplexity is e^loss, and lower is better.',
          'SFT, then a reward model and RLHF (or DPO), turn a base model into an assistant.',
          'Weight memory is parameters × bytes: 7B needs 14 GB at 16-bit and 3.5 GB at 4-bit.',
          'Long contexts cost more and miss middle details; retrieve only what you need.',
        ],
        remember: [
          '1,000 tokens ≈ 750 English words',
          'perplexity = e^loss',
          'memory ≈ parameters × bytes per weight',
        ],
      },
    },
  ],
};
