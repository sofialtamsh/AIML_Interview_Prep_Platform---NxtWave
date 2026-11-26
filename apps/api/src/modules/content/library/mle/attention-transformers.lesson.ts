/**
 * Deep Learning → Attention and transformers.
 *
 * Evidence (Hiring Intelligence, ML/AI families, Jan–Oct 2026; internal only, never quoted to
 * students): under 8 LPA asks a lot here: what an RNN is (draw and explain it), LSTM vs RNN,
 * Bi-LSTM, LSTM vs GRU (and which has fewer parameters), "Attention Is All You Need", RNN/LSTM vs
 * transformer, BERT vs LSTM, what transformers are, self-attention, queries, keys and values,
 * single vs multi-head attention, cross-attention, encoder and decoder roles, the transformer
 * architecture, BERT vs GPT, and implementing an RNN or a transformer. 8+ LPA asks for the
 * architecture and its components, how BERT works, which part of the transformer chat models use,
 * encoder-only / decoder-only / encoder-decoder examples, and how transformers process a prompt.
 * 3–6 LPA teaches this at depth 1 (it already covers QKV, multi-head and the three families,
 * since they are asked below 8 LPA); 8–12 LPA at depth 3 swaps the RNN deck for a short
 * refresher and adds masking, positional encoding, head shapes, pre-training and attention cost.
 * Tokens, pre-training in depth and temperature belong to the LLM unit. Every concept opens on a
 * short real-world story with a moving picture, then the code. Every code output is checked by
 * running it with Python 3.14 and NumPy, as in the in-browser runner; PyTorch is static.
 */
import type { LessonDocumentInput } from '@app/content';

const RNN = 'nlp.rnn-lstm';
const ATTN = 'nlp.self-attention';
const FAMILIES = 'nlp.bert-gpt';

const QUERIES: Record<string, { q: string; note: string }> = {
  it: { q: '[1.5, 0.5, 0]', note: 'query for "it": looks for a thing' },
  was: { q: '[0.5, 1.5, 0]', note: 'query for "was": looks for a quality' },
  sent: { q: '[0.5, 0, 1.5]', note: 'query for "sent": looks for a person' },
};
const QUERY_CODE = (key: string) => `import numpy as np

words = ["dosa", "cold", "I"]
# toy keys: [thing, quality, person]
K = np.array([[2, 0, 0], [0, 2, 0], [0, 0, 2]])
# ${QUERIES[key]?.note ?? ''}
q = np.array(${QUERIES[key]?.q ?? '[0, 0, 0]'})

scores = K @ q
weights = np.exp(scores) / np.exp(scores).sum()
for w, a in zip(words, weights):
    print(f"{w:5} {a:.2f}")
`;

const ATTN_DATA = `

# three words, two numbers each
X = np.array([[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]])
out, weights = attention(X, X, X)
print(np.round(weights, 2))
print("row sums:", np.round(weights.sum(axis=1), 2))
print(np.round(out, 2))
`;
const ATTN_START = `import numpy as np


def softmax(scores):
    # exp of each score, divided by its row's sum
    return scores


def attention(Q, K, V):
    d = Q.shape[1]
    # 1. scores = Q @ K.T divided by the square root of d
    # 2. weights = softmax(scores)
    # 3. return weights @ V, weights
    weights = np.zeros((len(Q), len(K)))
    return weights @ V, weights
${ATTN_DATA}`;
const ATTN_SOLUTION = `import numpy as np


def softmax(scores):
    # subtract each row's max first, so exp never overflows
    e = np.exp(scores - scores.max(axis=1, keepdims=True))
    return e / e.sum(axis=1, keepdims=True)


def attention(Q, K, V):
    d = Q.shape[1]
    scores = Q @ K.T / np.sqrt(d)
    weights = softmax(scores)
    return weights @ V, weights
${ATTN_DATA}`;

export const ATTENTION_TRANSFORMERS_LESSON: LessonDocumentInput = {
  title: 'Attention and transformers',
  subtitle:
    'From reading one word at a time to reading them all at once: RNNs, attention, and the BERT and GPT families.',
  objectives: [
    {
      key: 'rnn',
      text: 'Explain RNNs and LSTMs, and why transformers replaced them',
      minDepthRank: 1,
    },
    {
      key: 'attention',
      text: 'Explain self-attention with queries, keys and values, and multi-head attention',
      minDepthRank: 1,
    },
    {
      key: 'families',
      text: 'Compare encoder, decoder and encoder-decoder models: BERT, GPT and T5',
      minDepthRank: 1,
    },
    {
      key: 'deep',
      text: 'Explain masking, positional encoding, head sizes, pre-training and the cost of attention',
      minDepthRank: 3,
    },
  ],
  sections: [
    {
      key: 'hook',
      kind: 'HOOK',
      title: 'Models that read every word at once',
      depthRank: 1,
      conceptKeys: [ATTN],
      body: {
        scenario:
          'A translation app turns a whole sentence into another language in a blink. Your keyboard guesses the next word from everything you typed. A chat assistant writes its answer one word at a time. All three can run on **transformers**: models that look at every word at once and decide which words matter.',
        animation: { name: 'seq-vs-parallel', caption: 'One word at a time, or all words at once' },
        realWorld: {
          title: 'Where transformers work',
          items: [
            { icon: 'globe', label: 'Translation', sub: 'Whole sentences, not word by word' },
            {
              icon: 'smartphone',
              label: 'Keyboard suggestions',
              sub: 'The next word from what you typed',
            },
            { icon: 'bot', label: 'Chat assistants', sub: 'Answers written one token at a time' },
            { icon: 'search', label: 'Search', sub: 'Matches what a query means' },
          ],
        },
        provocation:
          'In "The dosa was cold, so I sent it back", how does a model know "it" means the dosa?',
        bridge:
          '"Explain self-attention", "BERT vs GPT" and "RNN vs transformer" are common technical-round questions. This lesson builds each answer from a story, a picture and code.',
      },
    },
    {
      key: 'slides.sequences',
      slotKey: 'sequences',
      kind: 'SLIDES',
      title: 'Before transformers: RNNs and LSTMs',
      depthRank: 1,
      conceptKeys: [RNN],
      body: {
        slides: [
          {
            kicker: 'RNN · the story',
            title: 'Reading one word at a time',
            body: 'When someone reads out a long phone number, you keep a running memory of it. An **RNN** (recurrent neural network) reads a sentence the same way: one word per step, updating its memory, the **hidden state**.',
            animation: {
              name: 'rnn-unroll',
              caption: 'Real use: early keyboard prediction and speech models',
            },
          },
          {
            kicker: 'RNN · the code',
            title: 'One loop, one memory',
            visual: {
              type: 'code',
              code: 'import numpy as np\n\nx = [1.0, 0.5, -1.0]  # one number per word\nWx, Wh, b = 0.8, 0.5, 0.0\nh = 0.0  # the memory starts empty\nfor t, xt in enumerate(x):\n    # Wx weighs the new word, Wh weighs the old memory\n    h = np.tanh(Wx * xt + Wh * h + b)\n    print(t, round(float(h), 3))',
              output: '0 0.664\n1 0.624\n2 -0.453',
            },
            note: 'The same weights are reused at every step; real RNNs use matrices, but the loop is the same.',
            narration:
              'Here is a recurrent network in a few lines. The list x holds one number per word, and h is the memory, which starts at zero. In the loop, each new word is weighted by W x, the old memory by W h, and tanh squeezes the sum between minus 1 and 1. It prints the memory after each word: 0.664, then 0.624, then minus 0.453. The same two weights are reused at every step.',
          },
          {
            kicker: 'The problem',
            title: 'Slow, and forgetful',
            points: [
              'The learning signal flows back through every step and shrinks each time, so early words fade (vanishing gradients)',
              'Each step waits for the one before, so a long text cannot be processed in parallel',
              'One fixed-size memory has to hold the whole sentence',
            ],
            visual: {
              type: 'stat',
              value: '0.0003',
              label: "what is left of an early word's learning signal after 10 steps",
              sub: 'if each step keeps 45%: 0.45 multiplied 10 times',
            },
            note: 'If each step multiplies by more than 1, gradients explode instead; clipping caps them.',
          },
          {
            kicker: 'LSTM · the story',
            title: 'A notebook with an eraser',
            body: 'An **LSTM** (long short-term memory) adds a notebook, the **cell state**, through every step. **Gates** (0 blocks, 1 lets through) decide what to erase, write and read out. Edits are added, not rewritten, so learning signals fade far less.',
            animation: {
              name: 'lstm-gates',
              caption: 'Real use: speech recognition and forecasting before transformers',
            },
          },
          {
            kicker: 'LSTM vs GRU',
            title: 'Three gates or two',
            visual: {
              type: 'compare',
              left: {
                title: 'LSTM',
                items: [
                  'Forget, input and output gates, plus a cell state',
                  '4 weight sets: one per gate, plus one for the new memory',
                ],
              },
              right: {
                title: 'GRU',
                items: [
                  'Update and reset gates, no separate cell state',
                  '3 weight sets (two gates plus new memory): fewer parameters',
                ],
              },
              better: 'none',
            },
            note: 'A **Bi-LSTM** runs one LSTM forwards and one backwards and joins them, so each word sees both sides.',
          },
          {
            kicker: 'Try it',
            title: 'Fewer parameters',
            try: {
              type: 'choice',
              prompt:
                'An LSTM layer has 2,480 parameters. About how many does a GRU with the same input and hidden sizes have?',
              options: [
                {
                  text: '1,860',
                  correct: true,
                  feedback:
                    "Right. A GRU has 3 weight sets to the LSTM's 4, so 2,480 × 3 ÷ 4 = 1,860. Keras adds a second GRU bias by default, so it reports more.",
                },
                {
                  text: '2,480',
                  correct: false,
                  feedback: 'The GRU drops one weight set, so it has fewer parameters.',
                },
                {
                  text: '3,100',
                  correct: false,
                  feedback: "That adds a set. The GRU has 3 weight sets to the LSTM's 4.",
                },
                {
                  text: 'It depends on the sentence length',
                  correct: false,
                  feedback:
                    'The same weights are reused at every step, so length does not change the count.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'slides.sequences-r',
      slotKey: 'sequences',
      kind: 'SLIDES',
      title: 'Before transformers: a quick refresher',
      depthRank: 3,
      conceptKeys: [RNN],
      body: {
        slides: [
          {
            kicker: 'Refresher',
            title: 'RNNs, LSTMs and GRUs',
            animation: {
              name: 'lstm-gates',
              caption: 'An LSTM gates its cell state: erase, write, read out',
            },
            points: [
              '**RNN**: one word per step with a hidden state; gradients vanish over long text',
              '**LSTM**: forget, input and output gates update a cell state by adding, so gradients fade far less',
              '**GRU**: two gates, 3 weight sets instead of 4, often as accurate',
              '**Bi-LSTM**: one pass forwards, one backwards, joined',
            ],
          },
          {
            kicker: 'The problem',
            title: 'Why they lost to transformers',
            points: [
              'Each step waits for the one before, so the words of a sentence cannot be processed in parallel',
              'Distant words reach each other only through many steps, and fade',
            ],
            visual: {
              type: 'stat',
              value: '0.0003',
              label: "what is left of an early word's learning signal after 10 steps",
              sub: 'if each step keeps 45%: 0.45 multiplied 10 times',
            },
          },
        ],
      },
    },
    {
      key: 'slides.attention',
      kind: 'SLIDES',
      title: 'Self-attention',
      depthRank: 1,
      conceptKeys: [ATTN],
      body: {
        slides: [
          {
            kicker: 'Attention · the origin',
            title: 'One vector was not enough',
            body: 'Early translators used two RNNs. The encoder squeezed the sentence into one vector; the decoder wrote from it. Long sentences lost detail. **Attention** let the decoder look back at every input word.',
            visual: {
              type: 'flow',
              steps: [
                { label: 'Encoder reads', icon: 'message' },
                { label: 'One vector', icon: 'hash' },
                { label: 'Decoder writes', icon: 'pen' },
              ],
            },
            note: 'Attention joined RNN translators in 2014; the 2017 transformer then dropped the RNNs.',
          },
          {
            kicker: 'Attention · the story',
            title: 'Which words matter for this one',
            body: 'In "The dosa was cold, so I sent it back", what does "it" mean? You glance at "dosa". **Attention** lets every word, itself included, weigh how much each word matters.',
            animation: {
              name: 'attention-weights',
              caption: 'Real use: every transformer layer, for every word',
            },
          },
          {
            kicker: 'Query, key, value · the story',
            title: 'Searching a video app',
            body: 'You type a search: the **query**. Each video has a title, its **key**, and the video itself, its **value**. The app scores each title against your query. Attention blends all the values, weighted by score.',
            animation: {
              name: 'qkv-lookup',
              caption: 'Real use: the Q, K and V matrices in every attention layer',
            },
          },
          {
            kicker: 'Query, key, value · the steps',
            title: 'Score, softmax, mix',
            points: [
              'Each word makes a **query** (what it looks for), a **key** (what it offers) and a **value** (what it passes on)',
              'Score: the dot product query · key, for every word',
              '**Softmax** turns the scores into weights that add up to 1',
              'Output: the weighted sum of the values',
            ],
            note: 'Q, K and V all come from the same sentence, hence **self**-attention: each is the word vector times a learned matrix.',
          },
          {
            kicker: 'The formula',
            title: 'Scaled dot-product attention',
            body: '**softmax(QKᵀ ÷ √d) V** is self-attention for every word at once. Q, K and V hold one row per word, so QKᵀ (`Q @ K.T`) holds every query · key score. d is the length of each query and key.',
            points: [
              'The spread of dot products grows with d, so the scores are divided by √d',
              'Without it, softmax piles the weight on one word, and learning stalls',
            ],
            note: 'If q and k hold 64 random numbers around 0 with a spread of 1, q · k spreads about √64 = 8. So divide by 8.',
          },
          {
            kicker: 'Try it',
            title: 'Three equal scores',
            try: {
              type: 'choice',
              prompt:
                'Attention scores for three words are 2, 2 and 2. What are the weights after softmax?',
              options: [
                {
                  text: '0.33 each',
                  correct: true,
                  feedback:
                    'Right. Equal scores give equal weights, and the weights always add up to 1.',
                },
                {
                  text: '2 each',
                  correct: false,
                  feedback: 'Softmax turns scores into weights that add up to 1.',
                },
                {
                  text: '1, 0 and 0',
                  correct: false,
                  feedback: 'That needs one score far larger than the rest.',
                },
              ],
            },
          },
          {
            kicker: 'Multi-head · the story',
            title: 'One panel, several questions',
            body: 'An interview panel has several interviewers, each listening for something different: skills, clarity, attitude. **Multi-head attention** runs several attentions in parallel, each with its own Q, K and V, then joins their answers.',
            animation: {
              name: 'multi-head',
              caption: 'Real use: the original transformer used 8 heads per layer',
            },
            note: 'One head blends every kind of link into one set of weights; several keep them apart.',
          },
          {
            kicker: 'Why it won',
            title: 'Why transformers replaced RNNs',
            visual: {
              type: 'compare',
              left: {
                title: 'RNN or LSTM',
                items: [
                  'One word per step, even in training: slow',
                  'Distant words fade from memory',
                ],
              },
              right: {
                title: 'Transformer',
                items: [
                  'Trains on all words at once: fast on GPUs',
                  'Any word reaches any word in one step',
                ],
              },
              better: 'right',
            },
            note: 'The cost: comparing every pair of words makes the work grow with the square of the length.',
          },
        ],
      },
    },
    {
      key: 'explorer.queries',
      kind: 'CODE_EXPLORER',
      title: 'Change the query, move the attention',
      depthRank: 1,
      conceptKeys: [ATTN],
      body: {
        prompt:
          'The keys stay the same: "dosa" is a thing, "cold" a quality, "I" a person. Each word sends its own query. Pick a word and see where its attention goes. This toy skips √d and the values.',
        packages: ['numpy'],
        controls: [
          {
            id: 'word',
            label: 'Query from',
            options: [
              { value: 'it', label: '"it"' },
              { value: 'was', label: '"was"' },
              { value: 'sent', label: '"sent"' },
            ],
          },
        ],
        states: [
          {
            when: { word: 'it' },
            code: QUERY_CODE('it'),
            output: { kind: 'text', value: 'dosa  0.84\ncold  0.11\nI     0.04\n' },
            verdict: {
              tone: 'ok',
              text: '"it" looks for a thing, so most of its attention lands on "dosa".',
            },
          },
          {
            when: { word: 'was' },
            code: QUERY_CODE('was'),
            output: { kind: 'text', value: 'dosa  0.11\ncold  0.84\nI     0.04\n' },
            verdict: {
              tone: 'info',
              text: '"was" looks for a quality, so "cold" wins.',
            },
          },
          {
            when: { word: 'sent' },
            code: QUERY_CODE('sent'),
            output: { kind: 'text', value: 'dosa  0.11\ncold  0.04\nI     0.84\n' },
            verdict: {
              tone: 'info',
              text: '"sent" looks for who did it, so "I" wins. Same keys, a different query, a different answer.',
            },
          },
        ],
        defaultState: { word: 'it' },
      },
    },
    {
      key: 'playground.attention',
      kind: 'PLAYGROUND',
      title: 'Write scaled dot-product attention',
      depthRank: 1,
      conceptKeys: [ATTN],
      body: {
        language: 'python',
        instructions:
          'Finish `softmax` and `attention`. Each of the three words attends to all three, itself included. The file should print the weights, `row sums: [1. 1. 1.]` and the outputs.',
        starterCode: ATTN_START,
        hints: [
          'softmax: `e = np.exp(scores)`, then `e / e.sum(axis=1, keepdims=True)`.',
          'attention: `scores = Q @ K.T / np.sqrt(d)`, then `weights = softmax(scores)` and `weights @ V`.',
          'Row 3 shows `[0.21 0.21 0.58]`? You forgot to divide by √d.',
        ],
        solution: ATTN_SOLUTION,
        checks: [
          { type: 'stdout_contains', value: 'row sums: [1. 1. 1.]', label: 'Each row sums to 1' },
          { type: 'stdout_contains', value: '[0.25 0.25 0.5 ]', label: 'Scaled weights, row 3' },
          { type: 'stdout_contains', value: '[0.75 0.75]', label: 'Output for word 3' },
        ],
        packages: ['numpy'],
      },
    },
    {
      key: 'slides.transformer',
      kind: 'SLIDES',
      title: 'The transformer, BERT and GPT',
      depthRank: 1,
      conceptKeys: [FAMILIES, ATTN],
      body: {
        slides: [
          {
            kicker: 'The transformer · the story',
            title: 'Read the whole sentence, then write',
            body: 'A translator reads the whole English sentence, then writes French word by word, glancing back. The 2017 paper "Attention Is All You Need" works the same way, with no RNN.',
            animation: {
              name: 'transformer-blocks',
              caption: 'Real use: translation, and the base of BERT and GPT',
            },
          },
          {
            kicker: 'Inside one block',
            title: 'Attention, then a small network',
            body: 'Before the first block, **positional encoding** is added to each word: attention alone cannot tell "Mumbai beat Chennai" from "Chennai beat Mumbai".',
            points: [
              '**Multi-head self-attention**: each word gathers information from the others',
              '**Feed-forward layer**: a small two-layer network for each word on its own',
              '**Residual connection**: each part adds its input back to its output, so learning reaches early layers',
              "**Layer norm**: rescales each word's numbers to a steady average and spread",
            ],
            note: '6 blocks in the original encoder, and 6 in the decoder.',
          },
          {
            kicker: 'Encoder and decoder',
            title: 'One reads, one writes',
            visual: {
              type: 'compare',
              left: {
                title: 'Encoder',
                items: [
                  'Reads the whole input: every word sees every word',
                  'One context-aware vector per word: "bank" differs by sentence',
                ],
              },
              right: {
                title: 'Decoder',
                items: [
                  'Writes one token at a time; each sees itself and earlier ones (masked)',
                  "Cross-attention: reads the encoder's output while writing",
                ],
              },
              better: 'none',
            },
            note: 'In **cross-attention**, queries come from the decoder, and keys and values from the encoder. Writing "thé", it looks back at "tea".',
          },
          {
            kicker: 'BERT vs GPT · the story',
            title: 'Fill the gap, or finish the sentence',
            body: 'A fill-in-the-blanks exam lets you read both sides of the gap. Phone autocomplete knows only what you typed so far. **BERT** learns like the exam; **GPT** learns like autocomplete.',
            animation: {
              name: 'bert-vs-gpt',
              caption: 'Real use: BERT for search and classification, GPT for chat',
            },
            note: 'BERT: Bidirectional Encoder Representations from Transformers. GPT: Generative Pre-trained Transformer.',
          },
          {
            kicker: 'Three families',
            title: 'Encoder, decoder or both',
            visual: {
              type: 'icons',
              items: [
                {
                  icon: 'search',
                  label: 'Encoder-only: BERT',
                  sub: 'Understands text: classification, search, tagging',
                },
                {
                  icon: 'pen',
                  label: 'Decoder-only: GPT',
                  sub: 'Generates text: chat assistants, code, summaries',
                },
                {
                  icon: 'repeat',
                  label: 'Encoder-decoder: T5, BART',
                  sub: 'Turns one text into another: translation, summaries',
                },
              ],
            },
            note: 'Most chat assistants are decoder-only: masked self-attention, with no encoder and no cross-attention.',
          },
          {
            kicker: 'Try it',
            title: 'Sorting support tickets',
            try: {
              type: 'choice',
              prompt: 'You must sort support tickets into 10 topics. Which family fits best?',
              options: [
                {
                  text: 'Encoder-only, such as BERT, with a small classifier on top',
                  correct: true,
                  feedback:
                    'Right. It reads the whole ticket both ways, and needs to write nothing.',
                },
                {
                  text: 'Decoder-only, such as GPT',
                  correct: false,
                  feedback:
                    'It can work, but each word sees only earlier words, and no new text is needed.',
                },
                {
                  text: 'Encoder-decoder, such as T5',
                  correct: false,
                  feedback: 'It turns text into new text; plain labelling does not need a decoder.',
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
      title: 'Attention check',
      depthRank: 1,
      conceptKeys: [RNN, ATTN, FAMILIES],
      body: {
        items: [
          {
            key: 'why',
            type: 'mcq',
            prompt: 'What is the main reason transformers replaced RNNs?',
            options: [
              {
                id: 'a',
                text: 'They process all words in parallel and link distant words directly',
              },
              { id: 'b', text: 'They need much less training data than RNNs' },
              { id: 'c', text: 'They are always smaller than RNNs' },
              { id: 'd', text: 'They understand word order without any extra input' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'RNNs wait for each step and let distant words fade. Attention reaches every word in one step, in parallel. Word order still needs positional encoding.',
          },
          {
            key: 'query',
            type: 'mcq',
            prompt: "In self-attention, what does a word's query do?",
            options: [
              {
                id: 'a',
                text: "It is compared with every key to decide where the word's attention goes",
              },
              { id: 'b', text: 'It is the information the word passes on' },
              { id: 'c', text: "It stores the word's position" },
              { id: 'd', text: 'It is the final output of the layer' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'The query is scored against every key. The value is what gets passed on, weighted by those scores.',
          },
          {
            key: 'softmax',
            type: 'predict_output',
            prompt: 'What does this print?',
            language: 'python',
            code: 'import numpy as np\n\nscores = np.array([0.0, 1.0, 3.0])\nw = np.exp(scores) / np.exp(scores).sum()\nprint(w.round(2), w.argmax())',
            options: [
              { id: 'a', text: '[0.04 0.11 0.84] 2' },
              { id: 'b', text: '[0. 1. 3.] 2' },
              { id: 'c', text: '[0.   0.25 0.75] 2' },
              { id: 'd', text: '[0.04 0.11 0.84] 0' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Softmax: e⁰, e¹ and e³ divided by their sum give 0.04, 0.11 and 0.84. The largest weight is at index 2.',
          },
          {
            key: 'heads',
            type: 'mcq',
            prompt: 'Why use several attention heads instead of one?',
            options: [
              {
                id: 'a',
                text: 'Each head can learn a different kind of link, such as what or who',
              },
              { id: 'b', text: 'So attention can see more words' },
              { id: 'c', text: 'To remove the need for softmax' },
              { id: 'd', text: 'To process the words one at a time' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'One head sees all the words too, but it blends every kind of link into one set of weights. Several heads keep them apart.',
          },
          {
            key: 'families',
            type: 'mcq',
            prompt: 'Which statement about BERT and GPT is right?',
            options: [
              {
                id: 'a',
                text: 'BERT is an encoder that reads both sides; GPT is a decoder that predicts the next token',
              },
              {
                id: 'b',
                text: 'BERT is a decoder that predicts the next token; GPT is an encoder',
              },
              { id: 'c', text: 'Both are RNNs' },
              { id: 'd', text: 'GPT reads the words on both sides of each word' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'BERT fills masked words using both sides. GPT, like most chat models, is a decoder that writes left to right.',
          },
        ],
      },
    },
    {
      key: 'interview.transformer',
      kind: 'INTERVIEW_PLAYBOOK',
      title: 'Transformer answer structure',
      depthRank: 1,
      conceptKeys: [ATTN, FAMILIES],
      body: {
        question: '"Explain the transformer architecture and self-attention."',
        totalMinutes: 2,
        steps: [
          {
            title: 'Problem',
            detail: 'RNNs read one word at a time: slow to train, and distant words fade.',
          },
          {
            title: 'Input',
            detail: 'Token embeddings plus positional encoding, since attention ignores order.',
          },
          {
            title: 'Self-attention',
            detail:
              'Each word makes a query, key and value. Weights from softmax(QKᵀ ÷ √d) decide how much of each value it takes.',
          },
          {
            title: 'Multi-head',
            detail: 'Several heads in parallel learn different links; their outputs are joined.',
          },
          {
            title: 'Block',
            detail:
              'Attention plus a feed-forward layer, with residuals and layer norm, stacked N times.',
          },
          {
            title: 'Encoder and decoder',
            detail:
              'Encoders read everything. The original decoder masks future tokens and cross-attends to the encoder. GPT and chat models are decoder-only, with no cross-attention.',
          },
          {
            title: 'Output',
            detail:
              'A final linear layer and softmax score every token in the vocabulary; the next token is picked from those scores.',
          },
        ],
        followUps: [
          'What are the query, key and value?',
          'Why divide by √d?',
          'What is the difference between single and multi-head attention?',
          'What is cross-attention?',
          'Which part of the transformer do chat models use?',
          'How is an LSTM different from an RNN?',
        ],
      },
    },
    {
      key: 'slides.deeper',
      kind: 'SLIDES',
      title: 'Deeper transformer questions',
      depthRank: 3,
      conceptKeys: [ATTN, FAMILIES],
      body: {
        slides: [
          {
            kicker: 'Masked attention · the story',
            title: 'No peeking at the next word',
            body: 'Practising from a solved guide, you cover the lines below with a sheet. The mask in a decoder is that sheet. It hides every later word, so each position predicts its next token from the past.',
            animation: {
              name: 'causal-mask',
              caption: 'Real use: every GPT-style model trains this way',
            },
          },
          {
            kicker: 'Masked attention · the code',
            title: 'Set the future to minus infinity',
            visual: {
              type: 'code',
              code: 'import numpy as np\n\nscores = np.array([[2.0, 1.0, 0.5, 0.0],\n                   [1.0, 2.0, 1.0, 0.5],\n                   [0.5, 1.0, 2.0, 1.0],\n                   [0.0, 0.5, 1.0, 2.0]])\n# hide every later word\nmask = np.triu(np.ones((4, 4), dtype=bool), k=1)\nscores[mask] = -np.inf\nw = np.exp(scores) / np.exp(scores).sum(axis=1, keepdims=True)\nprint(np.round(w, 2))',
              output:
                '[[1.   0.   0.   0.  ]\n [0.27 0.73 0.   0.  ]\n [0.14 0.23 0.63 0.  ]\n [0.08 0.13 0.21 0.58]]',
            },
            note: 'exp(−∞) = 0, so masked words get exactly zero weight. Training predicts every position in one pass.',
            narration:
              'Here is the covering sheet in code. The array scores holds attention scores for 4 words, one row per word. The array mask marks every position above the diagonal, which means every later word, and those scores are set to minus infinity. Then softmax turns each row into weights, stored in w. It prints a triangle: the first word gives weight 1 to itself, the second row is 0.27 and 0.73, and every later word gets exactly 0. That happens because the exponential of minus infinity is 0, so no word can look ahead.',
          },
          {
            kicker: 'Masks · two kinds',
            title: 'Causal masks and padding masks',
            points: [
              '**Causal mask**: a decoder hides every later token, so no position sees its own answer',
              '**Padding mask**: short sentences in a batch are filled with [PAD] tokens; the mask gives them zero weight',
              'Encoders such as BERT need only the padding mask; decoders also use the causal mask',
              'Hugging Face tokenizers return it as `attention_mask`: 1 for a real token, 0 for padding',
            ],
            note: 'Without a padding mask, real words would also attend to the empty [PAD] slots, and their outputs would shift.',
          },
          {
            kicker: 'Positional encoding',
            title: 'Telling attention the word order',
            body: "Train seat numbers tell passengers apart by where they sit. Positional encoding gives each position its own wave pattern, added to the word's vector.",
            visual: {
              type: 'code',
              code: 'import numpy as np\n\ndef pos_enc(n, d):\n    pe = np.zeros((n, d))\n    for pos in range(n):\n        for i in range(0, d, 2):\n            angle = pos / 10000 ** (i / d)\n            pe[pos, i] = np.sin(angle)\n            pe[pos, i + 1] = np.cos(angle)\n    return pe\n\nprint(np.round(pos_enc(4, 4), 2))',
              output:
                '[[ 0.    1.    0.    1.  ]\n [ 0.84  0.54  0.01  1.  ]\n [ 0.91 -0.42  0.02  1.  ]\n [ 0.14 -0.99  0.03  1.  ]]',
            },
            note: 'BERT and GPT-2 learn positions instead; many newer models rotate Q and K (RoPE).',
            narration:
              'This function builds the seat numbers for words. The function pos enc takes n, the number of positions, and d, the size of each vector, and fills a table called pe. For each position it writes a sine value and a cosine value in pairs of columns, and each pair uses a slower wave than the pair before it. It prints 4 rows, one per position. The first row is 0, 1, 0, 1, and the second starts with 0.84 and 0.54. Every row is different, so adding it to a word vector tells the model where that word sits. BERT and GPT-2 learn their positions instead.',
          },
          {
            kicker: 'Multi-head · the shapes',
            title: 'Splitting 512 numbers into 8 heads',
            visual: {
              type: 'code',
              code: 'import numpy as np\n\ntokens, d_model, heads = 10, 512, 8\nx = np.zeros((tokens, d_model))\n# in practice Q = x @ W_q is split, not x itself\nd_head = d_model // heads\nsplit = x.reshape(tokens, heads, d_head).transpose(1, 0, 2)\nprint(d_head, split.shape)',
              output: '64 (8, 10, 64)',
            },
            note: 'Each head attends with its own 64-number Q, K and V. The 8 outputs are joined back to 512 and mixed by one more weight matrix.',
            narration:
              'This code checks the shapes in multi-head attention. There are 10 tokens, d model is 512 numbers per token, and there are 8 heads. The variable d head is 512 divided by 8, which is 64. Reshape cuts the 512 numbers of each token into 8 pieces of 64, and transpose puts the heads first. It prints 64, and then the shape 8, 10, 64. That means 8 heads, each seeing all 10 tokens with 64 numbers per token. In a real model the queries, keys and values are split this way, and the 8 outputs are joined back to 512 at the end.',
          },
          {
            kicker: 'Pre-training',
            title: 'How BERT and GPT learn',
            visual: {
              type: 'compare',
              left: {
                title: 'BERT',
                items: [
                  'Hides about 15% of tokens and predicts them from both sides (masked language modelling)',
                  'Fine-tuned for a task: a small classifier reads the vector of [CLS], a special first token',
                ],
              },
              right: {
                title: 'GPT',
                items: [
                  'Predicts the next token across huge amounts of text',
                  'Chat models are then tuned on instructions and human feedback',
                ],
              },
              better: 'none',
            },
            note: 'The original BERT also learned whether one sentence follows another. The LLM unit covers pre-training in depth.',
          },
          {
            kicker: 'The cost',
            title: 'Attention grows with the square of the length',
            points: [
              'n tokens make n × n scores: 1,000 tokens make a million',
              'Double the context, and plain attention needs four times the memory and time',
              'The prompt is read in one parallel pass; a **KV cache** reuses past keys and values, so each new token is cheap',
              'For long text: sliding-window attention (each word sees nearby words only), and FlashAttention (same maths, less memory)',
            ],
          },
          {
            kicker: 'In PyTorch',
            title: 'A transformer encoder in a few lines',
            visual: {
              type: 'code',
              code: 'import torch\nimport torch.nn as nn\n\nlayer = nn.TransformerEncoderLayer(d_model=512, nhead=8,\n                                   batch_first=True)\nencoder = nn.TransformerEncoder(layer, num_layers=6)\n# 2 sentences, 10 tokens, 512 numbers each\nx = torch.rand(2, 10, 512)\nprint(encoder(x).shape)',
              output: 'torch.Size([2, 10, 512])',
            },
            note: 'The same shape comes out: one updated 512-number vector per token.',
            narration:
              'PyTorch gives you a full transformer encoder ready to use. The variable layer is one encoder layer with d model set to 512 and nhead set to 8, which means 8 attention heads. The variable encoder stacks 6 of these layers. The input x is random data shaped like 2 sentences of 10 tokens, with 512 numbers per token. It prints the shape 2, 10, 512, the same as the input. That is expected: the encoder keeps the shape and returns one updated vector of 512 numbers for each token.',
          },
          {
            kicker: 'Try it',
            title: 'Why mask',
            try: {
              type: 'choice',
              prompt: 'Why does a GPT-style decoder mask future tokens during training?',
              options: [
                {
                  text: 'So each position learns to predict its next token without seeing it',
                  correct: true,
                  feedback:
                    'Right. Without the mask, the model could copy the answer, and it would fail at generation time.',
                },
                {
                  text: 'To save memory',
                  correct: false,
                  feedback: 'The mask saves nothing; it stops the model from seeing the answer.',
                },
                {
                  text: 'Because GPT reads only one word at a time',
                  correct: false,
                  feedback: 'It reads all earlier words at once; it only cannot see later ones.',
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
      title: 'Transformer depth check',
      depthRank: 3,
      conceptKeys: [RNN, ATTN, FAMILIES],
      body: {
        items: [
          {
            key: 'scale',
            type: 'mcq',
            prompt: 'Why are attention scores divided by √d?',
            options: [
              {
                id: 'a',
                text: 'Large dot products would push softmax onto one word and stall learning',
              },
              { id: 'b', text: 'To make the weights add up to 1' },
              { id: 'c', text: 'To hide the future words' },
              { id: 'd', text: 'To reduce the number of heads' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Dot products spread wider as d grows. Dividing by √d stops softmax piling all the weight on one word. Softmax alone makes the weights add up to 1.',
          },
          {
            key: 'chat-models',
            type: 'mcq',
            prompt: 'Which part of the original transformer do GPT-style chat models keep?',
            options: [
              {
                id: 'a',
                text: 'The decoder stack, with masked self-attention and no cross-attention',
              },
              { id: 'b', text: 'The encoder stack only' },
              { id: 'c', text: 'Both the encoder and the decoder' },
              { id: 'd', text: 'Neither: they use LSTMs' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Chat models are decoder-only. With no encoder there is nothing to cross-attend to, so only masked self-attention remains.',
          },
          {
            key: 'head-size',
            type: 'mcq',
            prompt: "A model has d_model = 768 and 12 heads. How long is each head's query?",
            options: [
              { id: 'a', text: '64' },
              { id: 'b', text: '768' },
              { id: 'c', text: '12' },
              { id: 'd', text: '9,216' },
            ],
            answer: { correct: ['a'] },
            explanation: '768 ÷ 12 = 64. BERT-base uses exactly this split.',
          },
          {
            key: 'bert',
            type: 'mcq',
            prompt: 'How is BERT pre-trained?',
            options: [
              { id: 'a', text: 'By predicting hidden (masked) words from both sides' },
              { id: 'b', text: 'By predicting the next word from the left only' },
              { id: 'c', text: 'By translating sentences' },
              { id: 'd', text: 'By ranking search results' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Masked language modelling reads both sides; the original BERT also used next-sentence prediction. Predicting the next word from the left is how GPT learns.',
          },
          {
            key: 'cost',
            type: 'mcq',
            prompt:
              'The context grows from 2,000 to 8,000 tokens. Roughly how much bigger is the attention score matrix?',
            options: [
              { id: 'a', text: '16 times' },
              { id: 'b', text: '4 times' },
              { id: 'c', text: '2 times' },
              { id: 'd', text: 'The same size' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'The matrix is n × n. Four times the tokens gives 4 × 4 = 16 times the scores.',
          },
          {
            key: 'explain',
            type: 'reasoning',
            prompt:
              'The interviewer asks: *"Explain self-attention."* Answer in three or four sentences.',
            modelAnswer:
              'Self-attention lets every word, itself included, look at every word. Learned weight matrices turn each word into a query, a key and a value.\n\nEach query is scored against all the keys, divided by √d and softmaxed; the weights then mix the values. Multi-head attention runs several of these in parallel and joins them.',
            rubric: [
              'Every word attends to every word',
              'Query, key and value from learned projections',
              'Scores, √d scaling, softmax, weighted sum of values',
              'Multi-head: several in parallel, joined',
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
      conceptKeys: [RNN, ATTN, FAMILIES],
      body: {
        layout: 'flip',
        cards: [
          {
            title: 'RNN, LSTM and GRU',
            front: 'How is an LSTM different from a plain RNN? Where does a GRU fit in?',
            back: 'An RNN reads one word per step with a hidden state, but its learning signal fades over long text. An LSTM adds a cell state with forget, input and output gates. It updates memory by adding, so signals fade far less. A GRU has two gates and fewer parameters.',
          },
          {
            title: 'Why transformers won',
            front: 'Why did transformers replace RNNs and LSTMs? What is the cost of that choice?',
            back: 'An RNN waits for each step, so training is slow, and distant words fade. A transformer processes all words in parallel, and attention links any two words directly. The cost: every pair of words gets a score, so doubling the input makes plain attention about four times the work.',
          },
          {
            title: 'Query, key and value',
            front: 'Explain self-attention. What are the query, key and value?',
            back: 'Each word weighs how much every word, itself included, matters to it. Learned matrices give each word three vectors. The query is what it looks for, the key what it offers, the value what it passes on. Queries are scored against keys, and softmax weights mix the values.',
          },
          {
            title: 'Why divide by root d',
            front:
              'In scaled dot-product attention, why do we divide the scores by the square root of d?',
            back: 'Dot products spread wider as d, the length of each query and key, grows; for d = 64 the spread is about 8. Large scores push softmax to put nearly all the weight on one word, so gradients become tiny. Dividing by root d keeps the scores moderate.',
          },
          {
            title: 'Single vs multi-head',
            front: 'What is the difference between single-head and multi-head attention?',
            back: 'One head blends every kind of link between words into one set of weights. Multi-head attention runs several smaller attentions in parallel, each with its own matrices, so heads learn different links. Their outputs are joined. Eight heads of 64 numbers cost about the same as one head of 512.',
          },
          {
            title: 'Positional encoding',
            front:
              'Attention ignores word order. How does a transformer tell "Mumbai beat Chennai" from "Chennai beat Mumbai"?',
            back: 'A positional encoding is added to each token vector before the first block, so a word at another position looks different. The original transformer used fixed sine and cosine waves. BERT and GPT-2 learn one vector per position. Many newer models instead rotate queries and keys by position: RoPE.',
          },
          {
            title: 'Masked self-attention',
            front:
              'What does masking do in a GPT-style decoder, and what happens in training without it?',
            back: 'The causal mask sets the scores for later tokens to minus infinity, so softmax gives them zero weight. Each position predicts its next token from earlier tokens only. Without the mask, the model could copy the answer in training, then fail at generation, when future words do not exist.',
          },
          {
            title: 'BERT vs GPT',
            front:
              'What is the difference between BERT and GPT? Which part of the transformer does ChatGPT use?',
            back: 'BERT is encoder-only: it reads both sides of each word and learns by predicting masked words. It suits classification and search. GPT is decoder-only: it predicts the next token from the left, so it suits generation. ChatGPT and most chat assistants are decoder-only; T5 and BART use both halves.',
          },
          {
            title: 'Cross-attention',
            front: 'What is cross-attention, and how is it different from self-attention?',
            back: 'In self-attention, queries, keys and values all come from one sequence. In cross-attention, queries come from the decoder, while keys and values come from the encoder output. Writing "thé" in French, the decoder looks back at "tea" in the English input. It has nothing to do with cross-validation.',
          },
        ],
      },
    },
    {
      key: 'summary.basic',
      slotKey: 'summary',
      kind: 'SUMMARY',
      title: 'Attention key takeaways',
      depthRank: 1,
      conceptKeys: [RNN, ATTN, FAMILIES],
      body: {
        takeaways: [
          'RNNs read one word per step; distant words fade, and training is slow.',
          'LSTMs add a cell state and three gates; GRUs use two gates and fewer parameters.',
          "Attention: each word's query scores every key; softmax weights mix the values.",
          'softmax(QKᵀ ÷ √d) V; multi-head runs several attentions and joins them.',
          'Encoders (BERT) read both sides; decoders (GPT, chat models) predict the next token; T5 uses both.',
        ],
        remember: ['softmax(QKᵀ ÷ √d) V', 'Encoder: BERT · Decoder: GPT · Both: T5'],
      },
    },
    {
      key: 'summary.advanced',
      slotKey: 'summary',
      kind: 'SUMMARY',
      title: 'Attention key takeaways',
      depthRank: 3,
      conceptKeys: [RNN, ATTN, FAMILIES],
      body: {
        takeaways: [
          'RNNs fade over long text; LSTMs and GRUs gate their memory; transformers drop recurrence.',
          'Self-attention is softmax(QKᵀ ÷ √d) V; √d stops softmax piling all the weight on one word.',
          'Multi-head splits d_model into heads (512 = 8 × 64) and joins them back.',
          'Decoders mask future tokens; positional encoding adds word order.',
          'BERT predicts masked words from both sides; GPT and chat models are decoder-only; T5 pairs an encoder with a decoder.',
          'Attention costs grow with n²; a KV cache and efficient attention keep long contexts practical.',
        ],
        remember: ['softmax(QKᵀ ÷ √d) V', 'd_head = d_model ÷ heads', 'Cost grows with n²'],
      },
    },
  ],
};
