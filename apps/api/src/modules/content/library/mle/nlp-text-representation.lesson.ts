/**
 * Deep Learning → Text preprocessing and representation.
 *
 * Evidence (Hiring Intelligence, ML/AI families, Jan–Oct 2026; internal only, never quoted to
 * students): under 8 LPA, "what is NLP" with real-world uses, tokenization, stemming vs
 * lemmatization, a preprocessing script (tokenize, stop words, stemming), "what are word
 * embeddings and how do they work", code that makes embeddings, embeddings in RAG, sentiment and
 * text classification, and choosing a cosine-similarity threshold. 8+ LPA asks the same basics
 * plus many embedding questions: dimensions (384, 512, 768) and how to choose them, which model
 * and why, where embeddings sit in RAG, why a plain SQL database cannot do semantic search, and a
 * script that normalises raw text. 3–6 LPA teaches this at depth 2; 8–12 LPA at depth 3 adds
 * Word2Vec, static vs contextual vectors, dimensions, thresholds and a classification pipeline.
 * Every concept opens on a short real-world story with a moving picture, then the code. Every
 * code output is checked by running it with Python 3.14, NumPy and scikit-learn.
 */
import type { LessonDocumentInput } from '@app/content';

const PRE = 'nlp.preprocessing';
const TFIDF = 'nlp.tfidf';
const EMB = 'nlp.word-embeddings';

const PIPELINE_HEAD = `import re

text = "The studies were better than the earlier studies"
tokens = re.findall(r"[a-z]+", text.lower())
`;
const PIPELINE_STOP = `stop = {"the", "were", "than", "a", "is"}
words = [t for t in tokens if t not in stop]
`;
const PIPELINE: Record<string, string> = {
  tokens: `${PIPELINE_HEAD}print(tokens)
`,
  stop: `${PIPELINE_HEAD}${PIPELINE_STOP}print(words)
`,
  stem: `${PIPELINE_HEAD}${PIPELINE_STOP}

def stem(w):
    # toy rules; real stemmers (Porter) have dozens
    if w.endswith("ies"):
        return w[:-3] + "i"
    if w.endswith("s"):
        return w[:-1]
    return w


print([stem(w) for w in words])
`,
  lemma: `${PIPELINE_HEAD}${PIPELINE_STOP}
# a real lemmatizer looks each word up in a dictionary,
# using its part of speech; this table stands in for it
lemmas = {"studies": "study", "better": "good", "earlier": "early"}
print([lemmas.get(w, w) for w in words])
`,
};

const SEARCH_HEAD = `import numpy as np

reviews = ["loved the biryani", "food was cold and late",
           "late delivery again", "great taste, fast delivery"]
query = "delivery was late"
vocab = sorted({w for r in reviews for w in r.replace(",", "").split()})


def vec(text):
    # word counts
    words = text.replace(",", "").split()
    return np.array([words.count(w) for w in vocab], dtype=float)

`;
const SEARCH_TAIL = `

scores = [float(cosine(vec(query), vec(r))) for r in reviews]
print([round(s, 2) for s in scores])
best = int(np.argmax(scores))
print("best match:", reviews[best])
print("score:", round(scores[best], 2))
`;
const SEARCH_START = `${SEARCH_HEAD}
def cosine(a, b):
    # dot product / (|a| * |b|)
    return 0.0
${SEARCH_TAIL}`;
const SEARCH_SOLUTION = `${SEARCH_HEAD}
def cosine(a, b):
    return a @ b / (np.linalg.norm(a) * np.linalg.norm(b))
${SEARCH_TAIL}`;

export const NLP_TEXT_REPRESENTATION_LESSON: LessonDocumentInput = {
  title: 'Text preprocessing and representation',
  subtitle:
    'How text becomes numbers: cleaned, counted, weighted and placed on a map of meaning, one story at a time.',
  objectives: [
    {
      key: 'preprocess',
      text: 'Preprocess text: tokenization, stop words, stemming and lemmatization',
      minDepthRank: 1,
    },
    {
      key: 'represent',
      text: 'Explain bag of words, TF-IDF and word embeddings, with cosine similarity',
      minDepthRank: 1,
    },
    {
      key: 'compare',
      text: 'Compare bag of words, TF-IDF and embeddings, and choose an embedding model',
      minDepthRank: 3,
    },
    { key: 'classify', text: 'Build a text-classification pipeline', minDepthRank: 3 },
  ],
  sections: [
    {
      key: 'hook',
      kind: 'HOOK',
      title: 'Text that a computer can sort',
      depthRank: 1,
      conceptKeys: [PRE],
      body: {
        scenario:
          'A food app gets thousands of reviews a day: "Delivery was LATE!!", "Loved the biryani", "Food was cold and late". Nobody reads them all. A model sorts them into complaints and praise, but a model only understands numbers. Turning words into numbers is where **NLP** (natural language processing) begins.',
        animation: { name: 'review-sorter', caption: 'Clean the text, count it, then classify' },
        realWorld: {
          title: 'Where text becomes numbers',
          items: [
            { icon: 'mail', label: 'Spam filters', sub: 'Mail sorted by the words inside it' },
            { icon: 'star', label: 'Review sentiment', sub: 'Complaints reach support first' },
            {
              icon: 'search',
              label: 'Search',
              sub: '"cheap phones" also finds "budget smartphones"',
            },
            { icon: 'bot', label: 'Support bots', sub: 'The help article closest to a question' },
          ],
        },
        provocation:
          'How does a computer know "late delivery" and "delivery was late" are the same complaint?',
        bridge:
          '"What is NLP?", "stemming vs lemmatization" and "what are word embeddings?" are common technical-round questions. Each one gets a story, a picture and code here.',
      },
    },
    {
      key: 'slides.preprocess',
      kind: 'SLIDES',
      title: 'Cleaning text',
      depthRank: 1,
      conceptKeys: [PRE],
      body: {
        slides: [
          {
            kicker: 'What is NLP',
            title: 'Teaching computers to read',
            body: '**NLP** (natural language processing) lets computers work with human language: sort reviews, filter spam, answer questions. Models only take numbers, so every pipeline turns text into **vectors**: lists of numbers.',
            visual: {
              type: 'flow',
              steps: [
                { label: 'Raw text', icon: 'message' },
                { label: 'Clean tokens', icon: 'filter' },
                { label: 'Numbers (vectors)', icon: 'hash' },
                { label: 'Model', icon: 'brain' },
              ],
            },
          },
          {
            kicker: 'Preprocessing · the story',
            title: 'Wash and chop before you cook',
            body: 'A cook washes and chops vegetables before cooking. Preprocessing does the same for text. Lowercase it, split it into words (**tokens**), and drop filler words (**stop words**) such as "the".',
            animation: {
              name: 'token-pipeline',
              caption: 'Real use: the first step in search, spam filters and sentiment models',
            },
          },
          {
            kicker: 'Preprocessing · the code',
            title: 'Tokenize, lowercase, drop stop words',
            visual: {
              type: 'code',
              code: 'import re\n\ntext = "Delivery was LATE, but the biryani was amazing!!"\n# lowercase, then keep runs of letters\ntokens = re.findall(r"[a-z]+", text.lower())\nstop = {"was", "but", "the", "a", "is"}\nkept = [t for t in tokens if t not in stop]\nprint(tokens)\nprint(kept)',
              output:
                "['delivery', 'was', 'late', 'but', 'the', 'biryani', 'was', 'amazing']\n['delivery', 'late', 'biryani', 'amazing']",
            },
            note: '`[a-z]+` means one or more letters in a row, so spaces, digits and punctuation split the words. NLTK and spaCy offer ready tokenizers.',
            narration:
              'Here is the wash and chop step in code. The variable text is a messy review with capital letters and punctuation. We make it lowercase, and then the function findall keeps only runs of letters, so spaces and punctuation split the words into the list called tokens. The set called stop holds filler words such as was, but and the, and the list kept leaves them out. The first line printed has all 8 tokens. The second has only 4: delivery, late, biryani and amazing, the words that carry the meaning.',
          },
          {
            kicker: 'Stemming vs lemmatization · the story',
            title: 'Cut the ending, or look it up',
            body: 'Stemming trims word endings by rule, like scissors: "studies" becomes "studi". Lemmatization looks each word up in a dictionary, using its part of speech (noun, verb or adjective). So "studies" becomes "study", and the adjective "better" becomes "good".',
            animation: {
              name: 'stem-vs-lemma',
              caption: 'Real use: search matches "running" with "run"',
            },
          },
          {
            kicker: 'Stemming vs lemmatization · the code',
            title: 'Both in NLTK',
            visual: {
              type: 'code',
              code: 'import nltk\nfrom nltk.stem import PorterStemmer, WordNetLemmatizer\n\nnltk.download("wordnet", quiet=True)\nstem = PorterStemmer().stem\nlemma = WordNetLemmatizer().lemmatize\nprint([stem(w) for w in ["studies", "running", "better"]])\nprint(lemma("studies", pos="n"), lemma("running", pos="v"),\n      lemma("better", pos="a"))',
              output: "['studi', 'run', 'better']\nstudy run good",
            },
            note: '`pos` is the part of speech: "n" noun, "v" verb, "a" adjective. Without it, "better" stays "better". Stemming suits fast search; lemmatization suits accurate analysis.',
            narration:
              'This program runs both methods with the NLTK library. The function stem comes from the Porter stemmer, and the function lemma comes from the WordNet lemmatizer. Stemming the words studies, running and better prints studi, run and better, because it only cuts the endings. Lemmatizing the same words prints study, run and good, because it looks each word up in a dictionary. The parameter pos gives the part of speech: n for noun, v for verb, a for adjective. Without it, better would stay as better.',
          },
          {
            kicker: 'Careful',
            title: 'Keep "not" when meaning needs it',
            body: 'Many stop-word lists, including the ones in NLTK and scikit-learn, contain "not". For sentiment, that turns "not good" into "good".',
            visual: {
              type: 'code',
              code: 'import re\n\ntext = "The food was not good"\ntokens = re.findall(r"[a-z]+", text.lower())\ncommon = {"the", "was", "not"}  # like many lists\ncustom = {"the", "was"}  # keeps "not"\nprint([t for t in tokens if t not in common])\nprint([t for t in tokens if t not in custom])',
              output: "['food', 'good']\n['food', 'not', 'good']",
            },
            narration:
              'This short program shows how a stop word list can change the meaning. The sentence says the food was not good. The set called common contains the word not, like many ready-made lists, while the set called custom leaves it out. With common, it prints food and good, so the review now looks positive. With custom, it prints food, not and good, and the real meaning is kept. For sentiment work, always check what your stop word list removes.',
          },
          {
            kicker: 'Try it',
            title: 'Write clean()',
            try: {
              type: 'code',
              prompt:
                'Finish `clean(text)`: lowercase the text, keep runs of letters, and drop the words in `STOP`. "not" is not in `STOP`, so it stays.',
              starter:
                'import re\n\nSTOP = {"the", "a", "is", "was", "and", "but"}\n\n\ndef clean(text):\n    # lowercase, find the words, drop STOP words\n    return []\n\n\nprint(clean("The Paneer was AMAZING, but delivery was slow!"))\nprint(clean("Food is not hot."))',
              expected: "['food', 'not', 'hot']",
              hint: 'Use `re.findall(r"[a-z]+", text.lower())`, then a list comprehension that skips words in `STOP`.',
            },
          },
        ],
      },
    },
    {
      key: 'explorer.pipeline',
      slotKey: 'practice',
      kind: 'CODE_EXPLORER',
      title: 'Clean one sentence, step by step',
      depthRank: 1,
      conceptKeys: [PRE],
      body: {
        prompt:
          'Step through a cleaning pipeline on one sentence. Compare what stemming and lemmatization do to the same words.',
        controls: [
          {
            id: 'step',
            label: 'Step',
            options: [
              { value: 'tokens', label: 'Tokenize' },
              { value: 'stop', label: 'Drop stop words' },
              { value: 'stem', label: 'Stem' },
              { value: 'lemma', label: 'Lemmatize' },
            ],
          },
        ],
        states: [
          {
            when: { step: 'tokens' },
            code: PIPELINE.tokens ?? '',
            output: {
              kind: 'text',
              value: "['the', 'studies', 'were', 'better', 'than', 'the', 'earlier', 'studies']\n",
            },
            verdict: {
              tone: 'info',
              text: 'Eight lowercase tokens. "the" and "studies" each appear twice.',
            },
          },
          {
            when: { step: 'stop' },
            code: PIPELINE.stop ?? '',
            output: { kind: 'text', value: "['studies', 'better', 'earlier', 'studies']\n" },
            verdict: {
              tone: 'info',
              text: 'The filler words are gone. Four words carry the meaning.',
            },
          },
          {
            when: { step: 'stem' },
            code: PIPELINE.stem ?? '',
            output: { kind: 'text', value: "['studi', 'better', 'earlier', 'studi']\n" },
            verdict: {
              tone: 'info',
              text: 'Both "studies" become "studi", so they still match in a search. But "studi" is not a word, and "better" is not linked to "good". The Porter stemmer in NLTK gives the same result.',
            },
          },
          {
            when: { step: 'lemma' },
            code: PIPELINE.lemma ?? '',
            output: { kind: 'text', value: "['study', 'good', 'early', 'study']\n" },
            verdict: {
              tone: 'ok',
              text: 'Dictionary words: "studies" becomes "study" and "better" becomes "good". A real lemmatizer needs the part of speech: as a noun, "better" stays "better".',
            },
          },
        ],
        defaultState: { step: 'tokens' },
      },
    },
    {
      key: 'slides.preprocess-pro',
      slotKey: 'practice',
      kind: 'SLIDES',
      title: 'Preprocessing in real projects',
      depthRank: 3,
      conceptKeys: [PRE],
      body: {
        slides: [
          {
            kicker: 'Transformers · preprocessing',
            title: 'BERT-style models need less cleaning',
            body: 'Models such as BERT read whole sentences and bring their own tokenizer. Stemming or dropping stop words throws away meaning they use, such as "not". Light cleaning, like removing HTML tags or links, is still fine.',
            visual: {
              type: 'compare',
              left: {
                title: 'Counts and TF-IDF',
                items: ['Lowercase, drop stop words, stem', 'They only see exact words'],
              },
              right: {
                title: 'BERT-style models',
                items: ['Light cleaning only: HTML, links', 'Every word is context, "not" too'],
              },
              better: 'none',
            },
          },
          {
            kicker: 'Subword tokens',
            title: 'Rare words split into known pieces',
            body: 'Transformer tokenizers (WordPiece, or BPE: byte-pair encoding) break a rare word into smaller pieces they already know. So a new word almost never becomes unknown. Only rare symbols, such as some emoji, may map to [UNK], the unknown token.',
            visual: {
              type: 'flow',
              steps: [
                { label: 'A rare word', icon: 'message' },
                { label: 'Known pieces', icon: 'puzzle' },
                { label: 'One vector each', icon: 'hash' },
              ],
            },
            points: [
              'Word2Vec has no vector for a word it never saw in training',
              '**FastText** builds word vectors from character pieces, so new words and typos still get one',
            ],
          },
          {
            kicker: 'Try it',
            title: 'Cleaning before BERT',
            try: {
              type: 'choice',
              prompt:
                'You will fine-tune BERT to classify reviews. Should you stem words and drop stop words first?',
              options: [
                {
                  text: 'No: its tokenizer takes raw text, and "not" and word endings carry meaning',
                  correct: true,
                  feedback:
                    'Right. Contextual models use every word. Only light cleaning, such as removing HTML, helps.',
                },
                {
                  text: 'Yes: stemming always improves accuracy',
                  correct: false,
                  feedback: 'Stemming throws away word endings that BERT uses for meaning.',
                },
                {
                  text: 'Yes: BERT cannot read stop words',
                  correct: false,
                  feedback:
                    'BERT reads every token, stop words included, and uses them as context.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'slides.vectors',
      kind: 'SLIDES',
      title: 'Counting and weighting words',
      depthRank: 1,
      conceptKeys: [TFIDF],
      body: {
        slides: [
          {
            kicker: 'Bag of words · the story',
            title: 'Count the words, forget the order',
            body: 'Pour the words of a sentence into a bag and shake it. The order is lost, but you can still count each word. **Bag of words** turns each review into a row of counts, one column for each word in the **vocabulary** (every distinct word).',
            animation: {
              name: 'bag-of-words',
              caption: 'Real use: early spam filters ran on word counts',
            },
          },
          {
            kicker: 'Bag of words · the code',
            title: 'A vocabulary, then counts',
            visual: {
              type: 'code',
              code: 'docs = ["late delivery", "great food", "late food late"]\nvocab = sorted({w for d in docs for w in d.split()})\nprint(vocab)\nfor d in docs:\n    print([d.split().count(w) for w in vocab])',
              output:
                "['delivery', 'food', 'great', 'late']\n[1, 0, 0, 1]\n[0, 1, 1, 0]\n[0, 1, 0, 2]",
            },
            note: "scikit-learn's `CountVectorizer` does this in one line.",
            narration:
              'Here is the bag of words in code. The list docs holds 3 tiny reviews. The variable vocab collects every distinct word and sorts them, so it prints delivery, food, great, late. Then, for each review, the loop counts how many times each vocabulary word appears. The first review prints 1, 0, 0, 1. The third prints 0, 1, 0, 2, because late appears twice in it. Each review is now a row of numbers, and CountVectorizer in scikit-learn does all of this in one line.',
          },
          {
            kicker: 'TF-IDF · the story',
            title: 'Rare words say more',
            body: 'Almost every review on a food app says "food", so the word tells you little. Few say "refund", and those need attention. **TF-IDF** scores a word high when it is frequent in this review but rare across the rest.',
            animation: {
              name: 'tfidf-weights',
              caption: 'Real use: ranking documents for a keyword search',
            },
          },
          {
            kicker: 'TF-IDF · the formula',
            title: 'Term frequency × inverse document frequency',
            points: [
              "**TF** (term frequency): the word's count in this document, often divided by the document's length",
              '**IDF** (inverse document frequency) = log(N ÷ df), where df is how many of the N documents contain the word',
              '**TF-IDF** = TF × IDF',
              'A word in every document gets IDF = log 1 = 0, so it carries no weight',
            ],
            note: 'Natural log here. scikit-learn adds 1 to every IDF, so a word in every document keeps a small weight, not zero.',
          },
          {
            kicker: 'TF-IDF · the code',
            title: 'Score two words',
            visual: {
              type: 'code',
              code: 'import math\n\ndocs = [["late", "delivery"], ["great", "food"],\n        ["late", "food", "late"]]\n\ndef tfidf(word, doc):\n    tf = doc.count(word) / len(doc)\n    df = sum(word in d for d in docs)\n    idf = math.log(len(docs) / df)\n    return round(tf * idf, 3)\n\nprint(tfidf("late", docs[2]))\nprint(tfidf("delivery", docs[0]))',
              output: '0.27\n0.549',
            },
            note: '"late" appears twice in review 3, but also in review 1. "delivery" is in one review only, so it scores higher.',
            narration:
              'Now the formula becomes code. Inside the function tfidf, tf is how often the word appears in this review, divided by the length of the review. The variable df counts how many reviews contain the word, and idf is the log of the number of reviews divided by df. The function returns tf times idf. For late in the third review it prints 0.27, and for delivery in the first review it prints 0.549. Late appears twice, but it is also in another review. Delivery is in only one review, so the rarer word scores higher.',
          },
          {
            kicker: 'Limits',
            title: 'What counts cannot see',
            points: [
              'No order: "dog bites man" and "man bites dog" get the same row',
              'No meaning: "good" and "great" are as unrelated as "good" and "cold"',
              'Long, sparse rows: one column per vocabulary word, mostly zeros',
            ],
            note: 'N-grams (word runs such as "not good") keep a little order. Word embeddings, next, fix the meaning problem.',
          },
          {
            kicker: 'Try it',
            title: 'A word in every review',
            try: {
              type: 'choice',
              prompt:
                'With IDF = log(N ÷ df), the word "food" appears in all 1,000 reviews. What is its IDF?',
              options: [
                {
                  text: '0, so its TF-IDF is 0 in every review',
                  correct: true,
                  feedback:
                    'Right: log(1,000 ÷ 1,000) = log 1 = 0. A word in every review cannot tell them apart.',
                },
                {
                  text: 'Very high, because it is so common',
                  correct: false,
                  feedback: 'IDF is high for rare words, not common ones.',
                },
                {
                  text: '1,000, one for each review',
                  correct: false,
                  feedback: 'IDF is the log of N ÷ df. Here that is log 1 = 0.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'slides.embeddings',
      kind: 'SLIDES',
      title: 'Word embeddings',
      depthRank: 1,
      conceptKeys: [EMB],
      body: {
        slides: [
          {
            kicker: 'Embeddings · the story',
            title: 'Words as places on a map',
            body: 'On a map, nearby places sit close together. An **embedding** gives each word a position, so words used in similar ways land close: "dosa" near "idli", far from "cricket".',
            animation: {
              name: 'embedding-space',
              caption: 'Real use: search that matches meaning, not exact words',
            },
          },
          {
            kicker: 'Embeddings · what they are',
            title: 'Short, dense vectors learned from text',
            points: [
              'Each word or sentence becomes a few hundred numbers: about 300 for Word2Vec, 384 or 768 for sentence models',
              'Learned from huge amounts of text: words in similar contexts get similar vectors',
              'Dense: almost every number is non-zero, unlike a bag-of-words row of mostly zeros',
              'Word2Vec and GloVe give one vector per word; transformer models also embed whole sentences',
            ],
          },
          {
            kicker: 'Embeddings · how they are learned',
            title: 'You know a word by its neighbours',
            body: 'Fill the gap: "I had hot ___ with chutney." The words around the gap tell you it is a food. **Word2Vec** learns the same way, from millions of sentences. Words that fit the same gaps get similar vectors.',
            animation: {
              name: 'word-analogy',
              caption: 'Relations become directions: man → woman matches king → queen',
            },
          },
          {
            kicker: 'Similarity · the code',
            title: 'Cosine similarity measures closeness',
            visual: {
              type: 'code',
              code: 'import numpy as np\n\ndef cosine(a, b):\n    # dot product ÷ (length of a × length of b)\n    return a @ b / (np.linalg.norm(a) * np.linalg.norm(b))\n\n# toy 3-number embeddings\ndosa = np.array([0.9, 0.8, 0.1])\nidli = np.array([0.8, 0.9, 0.2])\ncricket = np.array([0.1, 0.2, 0.9])\nprint(round(float(cosine(dosa, idli)), 2))\nprint(round(float(cosine(dosa, cricket)), 2))',
              output: '0.99\n0.3',
            },
            note: 'Cosine measures the angle between two vectors, not their length: near 1 is similar, near 0 unrelated. So short and long texts on one topic still match.',
            narration:
              'This program measures how close two words are on the map. The function cosine takes two vectors, a and b, and divides their dot product by their two lengths multiplied together. Then we make toy embeddings of 3 numbers each for dosa, idli and cricket. For dosa and idli it prints 0.99, almost 1, so they are very similar. For dosa and cricket it prints 0.3, so they are far less related. Cosine looks at the angle between the vectors, not their length, so short and long texts on one topic still match.',
          },
          {
            kicker: 'One-hot vs embeddings',
            title: 'Why one-hot vectors fall short',
            body: 'A **one-hot** vector has one slot per vocabulary word: a 1 for this word, 0 everywhere else. Any two different words have a cosine similarity of 0. So "good" is no closer to "great" than to "cold".',
            visual: {
              type: 'compare',
              left: {
                title: 'One-hot',
                items: [
                  'As long as the vocabulary: 50,000 words, 50,000 numbers',
                  'A single 1, the rest zeros',
                  'Every pair of words equally unrelated',
                ],
              },
              right: {
                title: 'Embedding',
                items: [
                  'A few hundred numbers, whatever the vocabulary size',
                  'Almost every number non-zero, learned from text',
                  'Similar words sit close together',
                ],
              },
              better: 'right',
            },
            note: 'An embedding layer is a lookup table with one learned row per word. Multiplying a one-hot vector by it picks out that row.',
          },
          {
            kicker: 'Embeddings · in practice',
            title: 'Embed sentences with a pretrained model',
            visual: {
              type: 'code',
              code: 'from sentence_transformers import SentenceTransformer\n\nmodel = SentenceTransformer("all-MiniLM-L6-v2")\nvecs = model.encode(["delivery was late",\n                     "my order came late"])\nprint(vecs.shape)  # (2, 384): 384 numbers each',
            },
            note: 'Bigger models give 768 or 1,024 numbers: often more accurate, but more storage and slower search. Install with `pip install sentence-transformers`.',
            narration:
              'In real projects you do not train embeddings yourself. Here we load a pretrained model named all MiniLM L6 v2 from the sentence transformers library. The function encode takes our 2 sentences and returns one vector for each, stored in vecs. Printing the shape of vecs should give 2 and 384, which means 2 sentences with 384 numbers each. Bigger models give 768 or 1024 numbers. They are often more accurate, but they need more storage and make search slower.',
          },
          {
            kicker: 'Where they are used',
            title: 'Semantic search and RAG',
            body: '**Semantic search** finds text by meaning. A support bot embeds chunks of its help articles once. Each question is embedded too, and the closest chunks are fetched. A language model answers from them: **RAG**, retrieval-augmented generation.',
            visual: {
              type: 'flow',
              steps: [
                { label: 'Embed every chunk', icon: 'file' },
                { label: 'Embed the question', icon: 'message' },
                { label: 'Find the closest by cosine', icon: 'search' },
                { label: 'A language model answers', icon: 'bot' },
              ],
            },
            note: 'SQL `LIKE` matches character patterns, not meaning. A vector index finds the nearest vectors fast, even among millions.',
          },
          {
            kicker: 'Which one',
            title: 'Counts, weights or meaning',
            visual: {
              type: 'icons',
              items: [
                {
                  icon: 'hash',
                  label: 'Bag of words',
                  sub: 'Counts words: simple, but no order and no meaning',
                },
                {
                  icon: 'filter',
                  label: 'TF-IDF',
                  sub: 'Weights rare words up, but still needs exact words',
                },
                {
                  icon: 'map',
                  label: 'Embeddings',
                  sub: 'Dense vectors: similar meanings land close together',
                },
              ],
            },
            note: 'Start with TF-IDF for a quick baseline; use embeddings when meaning matters. Many RAG systems combine both (hybrid search).',
          },
          {
            kicker: 'Try it',
            title: 'Cheap phones, budget smartphones',
            try: {
              type: 'choice',
              prompt:
                'A user searches "cheap phones". Which method can match a review that says "budget smartphones"?',
              options: [
                {
                  text: 'Embeddings with cosine similarity',
                  correct: true,
                  feedback:
                    'Right. The words differ but the meanings are close, so the vectors are close.',
                },
                {
                  text: 'Bag of words',
                  correct: false,
                  feedback: 'The two share no words, so their count rows have nothing in common.',
                },
                {
                  text: 'TF-IDF',
                  correct: false,
                  feedback:
                    'Word-level TF-IDF still needs the same words; "phones" and "smartphones" are different tokens.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'playground.search',
      kind: 'PLAYGROUND',
      title: 'Find the closest review',
      depthRank: 1,
      conceptKeys: [EMB, TFIDF],
      body: {
        language: 'python',
        instructions:
          'These vectors are word counts; cosine works the same on embeddings. Finish `cosine(a, b)`: the dot product divided by (length of a × length of b). It should print `best match: late delivery again` and `score: 0.67`.',
        starterCode: SEARCH_START,
        hints: [
          "The dot product is `a @ b`; a vector's length is `np.linalg.norm(a)`.",
          'Review 2 scores 0.52 partly because it shares "was" with the query. Dropping stop words first fixes that.',
        ],
        solution: SEARCH_SOLUTION,
        checks: [
          { type: 'stdout_contains', value: '[0.0, 0.52, 0.67, 0.29]', label: 'All four scores' },
          {
            type: 'stdout_contains',
            value: 'best match: late delivery again',
            label: 'Closest review',
          },
          { type: 'stdout_contains', value: 'score: 0.67', label: 'Best score 0.67' },
        ],
        packages: ['numpy'],
      },
    },
    {
      key: 'check.basics',
      slotKey: 'check',
      kind: 'KNOWLEDGE_CHECK',
      title: 'Text representation check',
      depthRank: 1,
      conceptKeys: [PRE, TFIDF, EMB],
      body: {
        items: [
          {
            key: 'lemma',
            type: 'mcq',
            prompt: 'A lemmatizer is told "ran" is a verb. What does it return?',
            options: [
              { id: 'a', text: 'run' },
              { id: 'b', text: 'ran' },
              { id: 'c', text: 'ra' },
              { id: 'd', text: 'running' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'A lemmatizer looks up the dictionary form, so the irregular verb "ran" becomes "run". A stemmer only cuts endings, so "ran" stays "ran".',
          },
          {
            key: 'tokens',
            type: 'predict_output',
            prompt: 'What does this print?',
            language: 'python',
            code: 'import re\n\nprint(re.findall(r"[a-z]+", "Hi!! It\'s 5pm".lower()))',
            options: [
              { id: 'a', text: "['hi', 'it', 's', 'pm']" },
              { id: 'b', text: "['hi', \"it's\", '5pm']" },
              { id: 'c', text: "['Hi', 'It', 's', 'pm']" },
              { id: 'd', text: "['hi', 'its', 'pm']" },
            ],
            answer: { correct: ['a'] },
            explanation:
              'After lowercasing, `[a-z]+` keeps runs of letters only. The apostrophe splits "it\'s" into "it" and "s", and the "5" is dropped. Real tokenizers add rules for such cases.',
          },
          {
            key: 'idf',
            type: 'mcq',
            prompt: "Which change raises a word's IDF?",
            options: [
              { id: 'a', text: 'It appears in fewer documents of the collection' },
              { id: 'b', text: 'It appears more times in this document' },
              { id: 'c', text: 'This document gets longer' },
              { id: 'd', text: 'It appears in more documents of the collection' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'IDF = log(N ÷ df). Fewer documents with the word means a smaller df and a bigger IDF. Counts inside one document change TF, not IDF.',
          },
          {
            key: 'cosine',
            type: 'mcq',
            prompt:
              'Two sentence embeddings have a cosine similarity of 0.92. What does that suggest?',
            options: [
              { id: 'a', text: 'The sentences are close in meaning' },
              { id: 'b', text: 'They share 92% of their words' },
              { id: 'c', text: 'One sentence is 92% as long as the other' },
              { id: 'd', text: 'They are unrelated' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'A cosine near 1 means the vectors point the same way: similar meaning, even with different words.',
          },
          {
            key: 'negation',
            type: 'mcq',
            prompt:
              'Your sentiment model reads "not happy at all" as positive. Which preprocessing step is the likely cause?',
            options: [
              { id: 'a', text: 'Stop-word removal dropped "not"' },
              { id: 'b', text: 'Lowercasing' },
              { id: 'c', text: 'Splitting on spaces' },
              { id: 'd', text: 'Removing punctuation' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Many stop-word lists contain "not". Without it, "not happy" looks like "happy".',
          },
        ],
      },
    },
    {
      key: 'interview.embeddings',
      kind: 'INTERVIEW_PLAYBOOK',
      title: 'Word embeddings answer structure',
      depthRank: 1,
      conceptKeys: [EMB],
      body: {
        question: '"What are word embeddings, and how do they work?"',
        totalMinutes: 2,
        steps: [
          {
            title: 'Define',
            detail:
              'Dense vectors of numbers that represent words or sentences, such as 384 or 768 numbers each.',
          },
          {
            title: 'Why',
            detail:
              'Counts and TF-IDF match exact words only. Embeddings place similar meanings close together.',
          },
          {
            title: 'How they are learned',
            detail:
              'Learned from huge amounts of text: words in similar contexts get similar vectors. Word2Vec gives one vector per word; BERT-style models give one per context.',
          },
          {
            title: 'Measure similarity',
            detail: 'Cosine similarity measures closeness: near 1 is similar, near 0 is unrelated.',
          },
          {
            title: 'Use',
            detail:
              'Semantic search, the retrieval step in RAG, recommendations, and features for classifiers.',
          },
          {
            title: 'Trade-off',
            detail:
              'More dimensions can hold finer meaning but cost storage and search speed. Test on your own data.',
          },
        ],
        followUps: [
          'What is the difference between stemming and lemmatization?',
          'What is TF-IDF, and why use it over plain counts?',
          'Why use cosine similarity instead of Euclidean distance?',
          'How do you choose an embedding model and its dimension?',
          'Where do embeddings fit in a RAG pipeline?',
          'Why can a plain SQL query not do semantic search?',
        ],
      },
    },
    {
      key: 'slides.deeper',
      kind: 'SLIDES',
      title: 'Deeper NLP questions',
      depthRank: 3,
      conceptKeys: [EMB, TFIDF],
      body: {
        slides: [
          {
            kicker: 'Word2Vec · how',
            title: 'Two ways to train',
            points: [
              '**Skip-gram**: from a word, predict the words around it; good for rare words',
              '**CBOW** (continuous bag of words): from the words around a gap, predict the missing word; faster',
              'Word2Vec is a small neural network; after training, its weights become the word vectors',
              'Relations become directions: king − man + woman lands near queen',
            ],
            note: '**GloVe** learns from word co-occurrence counts across the corpus; both give one fixed vector per word.',
          },
          {
            kicker: 'Static vs contextual',
            title: '"Bank" has two meanings',
            body: 'Word2Vec gives "bank" one vector, for a river bank and a bank account alike. Contextual models such as BERT give it a new vector in each sentence, from the words around it.',
            note: 'The next unit shows how transformers mix in that context.',
          },
          {
            kicker: 'Choosing a model',
            title: 'Fit the model to your text',
            points: [
              'Language: non-English or mixed-language reviews need a multilingual model',
              'Domain: legal or medical text may need a model trained on such text',
              'Length: many models read only 256 or 512 word pieces, so split long documents into chunks',
              'Shortlist from a public benchmark (MTEB), then test the top few on your own queries',
            ],
            note: 'Test with 50 real queries and their right documents: how often is the right one in the top 5 (recall@5)?',
          },
          {
            kicker: 'Choosing dimensions',
            title: '384, 768 or more',
            points: [
              'More dimensions can hold finer meaning, but cost storage and search speed',
              '384 numbers at 4 bytes each take 1.5 KB, so a million vectors need about 1.5 GB',
              'Start small (384); move up only if recall@5 on your own queries improves',
              'Embed documents and queries with the same model: vectors from different models do not compare',
            ],
          },
          {
            kicker: 'Dimensions · the source',
            title: 'The model fixes the size',
            points: [
              "The size is the width of the model's final layer",
              'all-MiniLM-L6-v2 gives 384; BERT-base models give 768; BERT-large gives 1,024',
              'Most models have one size; to change it, pick another model',
              "Some newer models, such as OpenAI's text-embedding-3, can return shorter vectors",
            ],
            note: 'No single number means anything alone; together they place the text by meaning.',
          },
          {
            kicker: 'Similarity thresholds',
            title: 'Choose the cut-off on your data',
            body: 'A support bot answers only when the match scores above a cut-off, the **threshold**. The right value depends on the model. Label 50 to 100 pairs, score them, and pick the cut-off with the precision you need.',
            note: 'A higher threshold gives fewer, surer matches; a lower one catches more but lets in noise.',
          },
          {
            kicker: 'Text classification · the pipeline',
            title: 'From raw reviews to labels',
            visual: {
              type: 'flow',
              steps: [
                { label: 'Clean the text', icon: 'filter' },
                { label: 'TF-IDF vectors', icon: 'hash' },
                { label: 'Classifier', icon: 'brain' },
                { label: 'Complaint or praise', icon: 'tag' },
              ],
            },
            points: [
              'Split into train and test first; fit TF-IDF on the training text only, so no test words leak in',
              'A strong, fast baseline: TF-IDF with Naive Bayes or logistic regression',
              'More data or subtle meaning: fine-tune a transformer',
              'Judge by precision, recall and F1, not accuracy alone: complaints may be a small share',
            ],
          },
          {
            kicker: 'Text classification · the code',
            title: 'A complete pipeline in scikit-learn',
            visual: {
              type: 'code',
              code: 'from sklearn.feature_extraction.text import TfidfVectorizer\nfrom sklearn.naive_bayes import MultinomialNB\nfrom sklearn.pipeline import make_pipeline\n\ntexts = ["delivery was late again", "loved the biryani",\n         "food was cold and late", "great taste, fast delivery",\n         "order came late", "amazing food"]\nlabels = ["complaint", "praise", "complaint", "praise",\n          "complaint", "praise"]\n\nclf = make_pipeline(TfidfVectorizer(), MultinomialNB())\nclf.fit(texts, labels)\nprint(clf.predict(["my food came late", "loved the taste"]))',
              output: "['complaint' 'praise']",
            },
            note: '`fit` learns the vocabulary and IDF from training text; `predict` reuses them. Real projects use thousands of labelled reviews.',
            narration:
              'Here is the whole pipeline in scikit-learn. The list texts holds 6 short reviews, and the list labels says whether each one is a complaint or praise. The function make pipeline joins a TF-IDF vectorizer and a Naive Bayes classifier into one model called clf. Calling fit learns the vocabulary, the IDF weights and the classifier from the training reviews. Then predict reuses them on 2 new reviews and prints complaint, then praise. This toy example has only 6 reviews, while real projects use thousands of labelled ones.',
          },
          {
            kicker: 'Try it',
            title: 'Two models, random results',
            try: {
              type: 'choice',
              prompt:
                'You embed documents with model A and queries with model B. Both give 384 numbers. Search results look random. Why?',
              options: [
                {
                  text: 'Each model learns its own space, so their vectors cannot be compared',
                  correct: true,
                  feedback:
                    'Right. The same length does not mean the same meaning. Re-embed everything with one model.',
                },
                {
                  text: '384 dimensions are too few',
                  correct: false,
                  feedback: 'Many good models use 384. The problem is mixing two models.',
                },
                {
                  text: 'Cosine similarity only works on words, not sentences',
                  correct: false,
                  feedback: 'Cosine works on any vectors; these two sets live in different spaces.',
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
      title: 'NLP depth check',
      depthRank: 3,
      conceptKeys: [PRE, TFIDF, EMB],
      body: {
        items: [
          {
            key: 'tfidf',
            type: 'mcq',
            prompt:
              'Use TF = count ÷ words in the document, and IDF = ln(N ÷ df). A word appears once in a 2-word document and in 1 of 4 documents. What is its TF-IDF?',
            options: [
              { id: 'a', text: '0.69' },
              { id: 'b', text: '1.39' },
              { id: 'c', text: '0.5' },
              { id: 'd', text: '0.35' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'TF = 1 ÷ 2 = 0.5, and IDF = ln(4 ÷ 1) = 1.39. So TF-IDF = 0.5 × 1.39 = 0.69; 1.39 drops the TF, and 0.5 drops the IDF.',
          },
          {
            key: 'pipeline',
            type: 'order_steps',
            prompt: 'Put the steps of a text-classification project in order.',
            steps: [
              { id: 'a', text: 'Collect and label the reviews' },
              { id: 'b', text: 'Split into training and test sets' },
              { id: 'c', text: 'Fit TF-IDF on the training text only' },
              { id: 'd', text: 'Train the classifier on those vectors' },
              { id: 'e', text: 'Evaluate on the test set: precision, recall, F1' },
            ],
            answer: { order: ['a', 'b', 'c', 'd', 'e'] },
            explanation:
              "Split before fitting TF-IDF, so the test set's words do not leak into the vocabulary and IDF. A scikit-learn pipeline fits the vectorizer only on the data passed to `fit`.",
          },
          {
            key: 'dimensions',
            type: 'mcq',
            prompt:
              'You move from a 384- to a 1,024-dimension embedding model. What should you expect?',
            options: [
              {
                id: 'a',
                text: 'More storage and slower search; better results only if your tests show it',
              },
              { id: 'b', text: 'Better retrieval, always' },
              { id: 'c', text: 'Smaller vectors and faster search' },
              { id: 'd', text: 'No change, because cosine ignores dimensions' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Each vector is almost three times bigger. Quality often improves, but measure it on your own queries before paying the cost.',
          },
          {
            key: 'compare',
            type: 'reasoning',
            prompt:
              'The interviewer asks: *"Compare bag of words, TF-IDF and word embeddings."* Answer in three or four sentences.',
            modelAnswer:
              'Bag of words counts each vocabulary word per document: simple, but it loses word order and treats every word as unrelated. TF-IDF reweights those counts, raising words that are frequent in a document but rare in the collection.\n\nBoth are sparse and match exact words only. Embeddings are short, dense vectors learned from text, so similar meanings land close and synonyms match, at a higher compute cost.',
            rubric: [
              'Bag of words: counts, no order or meaning',
              'TF-IDF: raises rare, informative words; still exact words',
              'Embeddings: dense, learned, capture meaning and synonyms',
              'A trade-off: simplicity and speed against meaning',
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
      conceptKeys: [PRE, TFIDF, EMB],
      body: {
        layout: 'flip',
        cards: [
          {
            title: 'What NLP is',
            front: 'What is NLP? Give a few real-world applications.',
            back: 'NLP, natural language processing, lets computers work with human language. Models only take numbers, so a pipeline cleans the text, turns it into vectors and feeds a model. Uses include spam filters, review sentiment, search that matches meaning, support chatbots and translation.',
          },
          {
            title: 'Tokenization',
            front: 'What is tokenization? How is it different in a transformer model such as BERT?',
            back: 'Tokenization splits text into units called tokens, usually words, so they can be counted or looked up. Classic pipelines lowercase the text and split on spaces and punctuation. Transformer tokenizers, such as WordPiece or BPE (byte-pair encoding), split a rare word into smaller pieces they already know.',
          },
          {
            title: 'Stemming vs lemmatization',
            front:
              'What is the difference between stemming and lemmatization? When would you use each?',
            back: 'Stemming cuts endings by rule, so "studies" becomes "studi", not a real word. Lemmatization looks the word up in a dictionary using its part of speech. So "studies" becomes "study", and the adjective "better" becomes "good". Stem for fast search; lemmatize when you need real words.',
          },
          {
            title: 'Stop words and negation',
            front:
              'After preprocessing, your sentiment model reads "not good at all" as positive. What do you check first, and why?',
            back: 'I check the stop-word list. Many ready-made lists, including those in NLTK and scikit-learn, contain "not", which turns "not good" into "good". Remove stop words only when they carry no meaning for the task. For sentiment, keep negations; for BERT-style models, skip stop-word removal.',
          },
          {
            title: 'TF-IDF over counts',
            front: 'What is TF-IDF, and why would you use it over plain bag-of-words counts?',
            back: 'Plain counts let common words like "food" dominate every row. TF-IDF multiplies the count by IDF, log(N ÷ df), which is high for words in few documents. So "refund", frequent in one review but rare elsewhere, scores high. In the plain formula, a word in every document scores zero.',
          },
          {
            title: 'Embeddings vs one-hot',
            front: 'What are word embeddings, and why are they better than one-hot vectors?',
            back: 'A one-hot vector is as long as the vocabulary, with a single 1, so every pair of words looks equally unrelated. An embedding is a dense vector of a few hundred numbers, learned from text. Words used in similar contexts get similar vectors, so "good" lands near "great".',
          },
          {
            title: 'Static vs contextual vectors',
            front:
              'Word2Vec gives "bank" one vector. Why is that a problem, and how do BERT-style models fix it?',
            back: 'Word2Vec learns one fixed vector per word, so a river bank and a bank account share it. BERT-style models read the whole sentence and give each word a vector shaped by its neighbours. So "bank" gets a different vector in each sentence: a contextual embedding.',
          },
          {
            title: 'Choosing a representation',
            front:
              'Bag of words, TF-IDF or embeddings: which would you use for a new text project, and why?',
            back: 'I start with TF-IDF plus Naive Bayes or logistic regression: a fast baseline that works when exact words matter, as in spam. When meaning matters, such as "cheap phones" matching "budget smartphones", I use embeddings. Many search systems combine both, called hybrid search.',
          },
          {
            title: 'Embedding dimensions',
            front:
              'Your embedding model returns 384 numbers per text. Where does that size come from, and when would you pick a bigger model?',
            back: 'The model fixes it: it is the width of its final layer. all-MiniLM-L6-v2 gives 384; BERT-base models give 768. More dimensions can hold finer meaning but cost storage and search speed. Move up only if recall on your own queries improves, and embed documents and queries with one model.',
          },
        ],
      },
    },
    {
      key: 'summary.basic',
      slotKey: 'summary',
      kind: 'SUMMARY',
      title: 'Text representation key takeaways',
      depthRank: 1,
      conceptKeys: [PRE, TFIDF, EMB],
      body: {
        takeaways: [
          'Clean text first: lowercase, tokenize and drop stop words, but keep "not" when meaning needs it.',
          'Stemming cuts endings by rule ("studi"); lemmatization gives dictionary words ("study").',
          'Bag of words counts words per document; order and meaning are lost.',
          'TF-IDF = TF × log(N ÷ df): frequent here and rare elsewhere scores high.',
          'Embeddings are dense vectors where similar meanings sit close; cosine similarity measures how close.',
        ],
        remember: ['IDF = log(N ÷ df)', 'cosine = a · b ÷ (|a| × |b|)'],
      },
    },
    {
      key: 'summary.advanced',
      slotKey: 'summary',
      kind: 'SUMMARY',
      title: 'Text representation key takeaways',
      depthRank: 3,
      conceptKeys: [PRE, TFIDF, EMB],
      body: {
        takeaways: [
          'Clean text and keep negations; stem for speed, lemmatize for real words; skip both for BERT.',
          'Bag of words counts; TF-IDF weights rare words up; both are sparse and need exact words.',
          'Embeddings are dense, learned vectors: Word2Vec learns from neighbours, BERT adds context.',
          'Cosine compares directions; choose thresholds by testing on labelled pairs.',
          'Use one embedding model for documents and queries; choose it by language, length and recall@5.',
          'A classification baseline: TF-IDF with Naive Bayes or logistic regression, in a pipeline.',
        ],
        remember: [
          'IDF = log(N ÷ df)',
          'cosine = a · b ÷ (|a| × |b|)',
          'Split before fitting the vectorizer',
        ],
      },
    },
  ],
};
