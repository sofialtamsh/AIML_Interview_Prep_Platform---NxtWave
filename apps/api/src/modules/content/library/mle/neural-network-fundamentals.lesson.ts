/**
 * Deep Learning → Neural network fundamentals.
 *
 * Evidence (Hiring Intelligence, ML/AI families, Jan–Oct 2026; internal only, never quoted to
 * students): about 60 neural-network questions. Under 8 LPA: "what is a neural network / deep
 * learning", AI vs ML vs DL, traditional ML vs DL, activation functions (ReLU vs sigmoid vs tanh),
 * "how does backpropagation work, with a mathematical example", fully connected layers, how a
 * deep network works under the hood. 8+ LPA adds implementing a network, trees vs networks,
 * autograd, and reasoning about small ReLU networks. 3–6 LPA teaches this at depth 2 (the
 * worked chain-rule example and a train-a-neuron playground); 8–12 LPA at depth 3, which adds
 * autograd, parameter counts, initialisation, softmax with cross-entropy and trees vs networks.
 * Every concept opens on a short real-world story with a moving picture, then the code. Every
 * code output is checked by running it with Python 3.14 and NumPy, as in the in-browser runner.
 */
import type { LessonDocumentInput } from '@app/content';

const NEURONS = 'dl.neurons-layers';
const BACKPROP = 'dl.backprop';

const FORWARD = `import numpy as np

# one example with 2 features
x = np.array([1.0, 2.0])

# 2 inputs -> 3 hidden neurons
W1 = np.array([[0.5, -0.2, 0.1],
               [0.3, 0.4, -0.6]])
b1 = np.array([0.0, 0.1, 0.2])

# 3 hidden neurons -> 1 output
W2 = np.array([0.7, -0.5, 0.2])
b2 = 0.1

h = np.maximum(0, x @ W1 + b1)      # hidden layer, ReLU
z = h @ W2 + b2
y_hat = 1 / (1 + np.exp(-z))        # output, sigmoid

print("hidden:", h)
print("prediction:", round(float(y_hat), 3))
`;

const NEURON_START = `import numpy as np

x = np.array([1.0, 2.0, 3.0, 4.0])
# the rule to learn: y = 2x + 1
y = 2 * x + 1

w, b = 0.0, 0.0
lr = 0.05
for epoch in range(500):
    y_hat = w * x + b
    error = y_hat - y
    # gradients of the mean squared
    # error: replace the two zeros
    dw = 0.0
    db = 0.0
    w = w - lr * dw
    b = b - lr * db

print(f"w = {w:.2f}, b = {b:.2f}")
`;

const NEURON_SOLUTION = `import numpy as np

x = np.array([1.0, 2.0, 3.0, 4.0])
# the rule to learn: y = 2x + 1
y = 2 * x + 1

w, b = 0.0, 0.0
lr = 0.05
for epoch in range(500):
    y_hat = w * x + b
    error = y_hat - y
    # gradients of the mean squared
    # error
    dw = np.mean(2 * error * x)
    db = np.mean(2 * error)
    w = w - lr * dw
    b = b - lr * db

print(f"w = {w:.2f}, b = {b:.2f}")
`;

const ACT_CODE: Record<string, (z: string) => string> = {
  relu: (z) => `import numpy as np\n\nz = ${z}\nprint(np.maximum(0, z))  # ReLU\n`,
  sigmoid: (z) =>
    `import numpy as np\n\nz = ${z}\nprint(round(1 / (1 + np.exp(-z)), 3))  # sigmoid\n`,
  tanh: (z) => `import numpy as np\n\nz = ${z}\nprint(round(np.tanh(z), 3))  # tanh\n`,
};
const ACT_STATES: Array<{
  act: string;
  z: string;
  out: string;
  tone: 'ok' | 'info' | 'bad';
  text: string;
}> = [
  {
    act: 'relu',
    z: '-3.0',
    out: '0.0',
    tone: 'info',
    text: 'ReLU outputs 0 for every negative input, with slope 0. A neuron stuck there stops learning: a "dead" ReLU. Leaky ReLU keeps a small slope.',
  },
  {
    act: 'relu',
    z: '3.0',
    out: '3.0',
    tone: 'ok',
    text: 'For positive inputs ReLU passes the value straight through, so its gradient is 1. That keeps deep networks learning.',
  },
  {
    act: 'sigmoid',
    z: '-3.0',
    out: '0.047',
    tone: 'info',
    text: 'Sigmoid squashes any input into 0 to 1. Far from 0 the curve is flat: slope 0.045 here, never above 0.25. Over many layers these multiply, and gradients vanish.',
  },
  {
    act: 'sigmoid',
    z: '3.0',
    out: '0.953',
    tone: 'ok',
    text: 'Close to 1, like a confident "yes". That is why sigmoid suits a yes/no output.',
  },
  {
    act: 'tanh',
    z: '-3.0',
    out: '-0.995',
    tone: 'info',
    text: 'Tanh goes from −1 to 1, centred on 0, so negative inputs stay negative.',
  },
  {
    act: 'tanh',
    z: '3.0',
    out: '0.995',
    tone: 'info',
    text: 'Like sigmoid, tanh flattens at the ends (slope 0.0099 here), so deep tanh networks suffer from vanishing gradients too.',
  },
];

export const NEURAL_NETWORK_FUNDAMENTALS_LESSON: LessonDocumentInput = {
  title: 'Neural network fundamentals',
  subtitle:
    'Neurons, layers and activations, then how a network learns from its mistakes, with a small network you can run.',
  objectives: [
    {
      key: 'neurons',
      text: 'Explain a neuron, a layer and an activation function, and compare ReLU, sigmoid and tanh',
      minDepthRank: 1,
    },
    {
      key: 'backprop',
      text: 'Explain the training loop and backpropagation in plain words',
      minDepthRank: 1,
    },
    {
      key: 'chain-rule',
      text: 'Work through one backpropagation step with the chain rule, and train a neuron with gradient descent',
      minDepthRank: 2,
    },
    {
      key: 'deeper',
      text: 'Explain autograd, parameter counts, weight initialisation and softmax with cross-entropy',
      minDepthRank: 3,
    },
  ],
  sections: [
    {
      key: 'hook',
      kind: 'HOOK',
      title: 'Neural networks in everyday apps',
      depthRank: 1,
      conceptKeys: [NEURONS],
      body: {
        scenario:
          'Search your phone gallery for "beach" and it finds your beach photos, though you never tagged one. Nobody wrote rules like "sand is yellow, water is blue". A **neural network** learned them from millions of examples.',
        animation: {
          name: 'network',
          caption: 'Inputs flow through a hidden layer to the outputs',
        },
        realWorld: {
          title: 'Where you meet neural networks',
          items: [
            {
              icon: 'smartphone',
              label: 'Face unlock',
              sub: 'Matches your face in under a second',
            },
            { icon: 'mic', label: 'Voice typing', sub: 'Turns speech into text as you talk' },
            { icon: 'image', label: 'Photo search', sub: 'Finds "beach" with no tags' },
            { icon: 'globe', label: 'Translation', sub: 'Turns a sentence into another language' },
          ],
        },
        provocation: 'How can a stack of simple maths units learn what a beach looks like?',
        bridge:
          '"What is a neural network?" and "how does backpropagation work?" are classic technical-round questions. This lesson answers both with a small network you can run.',
      },
    },
    {
      key: 'slides.basics',
      slotKey: 'basics',
      kind: 'SLIDES',
      title: 'Neurons, layers and activations',
      depthRank: 1,
      conceptKeys: [NEURONS],
      body: {
        slides: [
          {
            kicker: 'AI, ML and DL',
            title: 'Each one sits inside the last',
            body: 'Deep learning is a kind of machine learning, which is a kind of AI.',
            visual: {
              type: 'icons',
              items: [
                {
                  icon: 'brain',
                  label: 'AI',
                  sub: 'Any system that acts smart, even with hand-written rules',
                },
                {
                  icon: 'chart',
                  label: 'Machine learning',
                  sub: 'Learns patterns from data, like a spam filter',
                },
                {
                  icon: 'layers',
                  label: 'Deep learning',
                  sub: 'ML with many-layer neural networks, like face unlock',
                },
              ],
            },
            note: 'Classic ML needs hand-made features. Deep learning learns its own from raw pixels or text, but needs more data and compute.',
          },
          {
            kicker: 'The neuron · the story',
            title: 'A neuron is a weighted vote',
            body: 'Should you go to a cricket match? Good weather counts a lot, a long trip counts against, and a friend going counts too. You weigh each reason, add them up and decide.',
            animation: {
              name: 'neuron',
              caption: 'Real use: every dense layer is a row of these',
            },
          },
          {
            kicker: 'The neuron · the code',
            title: 'Weighted sum, plus bias, through an activation',
            visual: {
              type: 'code',
              code: 'import numpy as np\n\nx = np.array([0.9, 0.2, 1.0])   # weather, trip, friend\nw = np.array([0.7, -0.3, 0.5])  # how much each matters\nb = -0.4                        # bias: the starting tilt\n\nz = x @ w + b                   # weighted sum\nout = 1 / (1 + np.exp(-z))      # sigmoid: 0 to 1\nprint(f"z = {z:.2f}, output = {out:.2f}")',
              output: 'z = 0.67, output = 0.66',
            },
            note: '`x @ w` multiplies each input by its weight and adds them up: 0.63 − 0.06 + 0.5.',
            narration:
              'Here is the cricket match decision as one neuron. The array x holds the 3 inputs: weather, trip and friend. The array w holds how much each one matters, and the trip has a negative weight because it counts against going. The bias b is the starting tilt, minus 0.4. The variable z is the weighted sum: 0.63 minus 0.06 plus 0.5, then the bias, which gives 0.67. Sigmoid squeezes that between 0 and 1, so it prints z as 0.67 and the output as 0.66, a fairly confident yes.',
          },
          {
            kicker: 'Activations · the story',
            title: 'Activations add the bends',
            body: 'Convert rupees to dollars, then dollars to euros: one fixed rate could do both. Layers without activations collapse the same way, into one. Activations add the bends that let a network learn curves.',
            animation: {
              name: 'activation-curves',
              caption: 'Real use: ReLU in hidden layers; sigmoid, softmax or nothing at the output',
            },
          },
          {
            kicker: 'Activations · the code',
            title: 'Sigmoid, tanh and ReLU side by side',
            points: [
              '**ReLU**: `max(0, z)`. Fast and simple, the default for hidden layers',
              '**Sigmoid**: 0 to 1. Fits a yes/no output; stacked in many hidden layers, its gradients vanish',
              '**Tanh**: −1 to 1, centred on zero',
            ],
            visual: {
              type: 'code',
              code: 'import numpy as np\n\nz = np.array([-2.0, 0.0, 2.0])\nprint("sigmoid", np.round(1 / (1 + np.exp(-z)), 2))\nprint("tanh   ", np.round(np.tanh(z), 2))\nprint("relu   ", np.maximum(0, z))',
              output: 'sigmoid [0.12 0.5  0.88]\ntanh    [-0.96  0.    0.96]\nrelu    [0. 0. 2.]',
            },
            note: 'For many classes the output uses **softmax**: scores that add up to 1. For a number, like a price, use no activation.',
            narration:
              'This short program runs the same 3 numbers through each activation. The array z holds minus 2, 0 and 2. Sigmoid squeezes them between 0 and 1, so it prints 0.12, 0.5 and 0.88. Tanh is centred on zero and prints minus 0.96, 0 and 0.96. ReLU turns the negative number into 0 and keeps the positive one, so it prints 0, 0 and 2. Use ReLU in hidden layers and sigmoid for a yes or no output. For many classes the output uses softmax, and for a number like a price it uses no activation.',
          },
          {
            kicker: 'Layers',
            title: 'Layers build up the picture',
            body: 'In an image network, early layers find edges, middle layers find eyes and noses, and later layers find whole faces.',
            points: [
              'A **fully connected** (dense) layer links every input to every neuron',
              '"Deep" means many hidden layers between input and output',
            ],
            visual: {
              type: 'flow',
              steps: [
                { label: 'Input layer: raw numbers', icon: 'list' },
                { label: 'Hidden layers: features', icon: 'layers' },
                { label: 'Output layer: the answer', icon: 'target' },
              ],
            },
          },
          {
            kicker: 'Try it',
            title: 'Five layers, no activation',
            try: {
              type: 'choice',
              prompt:
                'You stack five dense layers but use no activation function. What do you get?',
              options: [
                {
                  text: 'A model no more powerful than one layer',
                  correct: true,
                  feedback:
                    'Right. Straight-line steps combine into one straight-line step, so the extra layers add nothing.',
                },
                {
                  text: 'A deeper, more powerful model',
                  correct: false,
                  feedback:
                    'Depth only helps with activations between the layers. Without them, it all collapses into one layer.',
                },
                {
                  text: 'An error from the framework',
                  correct: false,
                  feedback: "It runs fine. It just can't learn curves.",
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'slides.basics-r',
      slotKey: 'basics',
      kind: 'SLIDES',
      title: 'Neurons, layers and activations, quickly',
      depthRank: 3,
      conceptKeys: [NEURONS],
      body: {
        slides: [
          {
            kicker: 'AI, ML and DL',
            title: 'Each one sits inside the last',
            body: 'Deep learning is a kind of machine learning, which is a kind of AI.',
            visual: {
              type: 'icons',
              items: [
                {
                  icon: 'brain',
                  label: 'AI',
                  sub: 'Any system that acts smart, even with hand-written rules',
                },
                {
                  icon: 'chart',
                  label: 'Machine learning',
                  sub: 'Learns patterns from data, like a spam filter',
                },
                {
                  icon: 'layers',
                  label: 'Deep learning',
                  sub: 'ML with many-layer neural networks, like face unlock',
                },
              ],
            },
            note: 'Classic ML needs hand-made features. Deep learning learns its own from raw pixels or text, but needs more data and compute.',
          },
          {
            kicker: 'The neuron · the story',
            title: 'A neuron is a weighted vote',
            body: 'Should you go to a cricket match? Good weather counts a lot, a long trip counts against, and a friend going counts too. You weigh each reason, add them up and decide.',
            animation: {
              name: 'neuron',
              caption: 'Real use: every dense layer is a row of these',
            },
          },
          {
            kicker: 'Activations · the story',
            title: 'Activations add the bends',
            body: 'Convert rupees to dollars, then dollars to euros: one fixed rate could do both. Layers without activations collapse the same way, into one. Activations add the bends that let a network learn curves.',
            animation: {
              name: 'activation-curves',
              caption: 'Real use: ReLU in hidden layers; sigmoid, softmax or nothing at the output',
            },
            points: [
              '**ReLU** for hidden layers; **Leaky ReLU** if neurons die',
              '**Sigmoid** and **tanh** flatten out, so deep stacks make gradients vanish',
              'Output: sigmoid for yes/no, softmax for classes, nothing for a number',
            ],
          },
          {
            kicker: 'Layers',
            title: 'Layers build up the picture',
            points: [
              'A **fully connected** (dense) layer links every input to every neuron',
              '"Deep" means many hidden layers between input and output',
            ],
            visual: {
              type: 'flow',
              steps: [
                { label: 'Input layer: raw numbers', icon: 'list' },
                { label: 'Hidden layers: features', icon: 'layers' },
                { label: 'Output layer: the answer', icon: 'target' },
              ],
            },
          },
          {
            kicker: 'Try it',
            title: 'Five layers, no activation',
            try: {
              type: 'choice',
              prompt:
                'You stack five dense layers but use no activation function. What do you get?',
              options: [
                {
                  text: 'A model no more powerful than one layer',
                  correct: true,
                  feedback:
                    'Right. Straight-line steps combine into one straight-line step, so the extra layers add nothing.',
                },
                {
                  text: 'A deeper, more powerful model',
                  correct: false,
                  feedback:
                    'Depth only helps with activations between the layers. Without them, it all collapses into one layer.',
                },
                {
                  text: 'An error from the framework',
                  correct: false,
                  feedback: "It runs fine. It just can't learn curves.",
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'code.forward',
      kind: 'CODE_EXAMPLE',
      title: 'A forward pass in NumPy',
      depthRank: 1,
      conceptKeys: [NEURONS],
      body: {
        language: 'python',
        packages: ['numpy'],
        code: FORWARD,
        annotations: [
          {
            lines: [6, 9],
            note: "Each column of `W1` holds one hidden neuron's weights, one per input.",
          },
          {
            lines: [15, 15],
            note: '`x @ W1 + b1` gives all three weighted sums at once: [1.1, 0.7, −0.9]. ReLU turns the negative one into 0.',
          },
          {
            lines: [16, 17],
            note: 'The output neuron weighs the hidden values (0.77 − 0.35 + 0 = 0.42), adds the bias 0.1, and sigmoid turns 0.52 into 0.627.',
          },
        ],
        runnable: true,
        expectedOutput: 'hidden: [1.1 0.7 0. ]\nprediction: 0.627\n',
      },
    },
    {
      key: 'explorer.activations',
      kind: 'CODE_EXPLORER',
      title: 'Activations up close',
      depthRank: 1,
      conceptKeys: [NEURONS],
      body: {
        prompt:
          'Pick an activation and an input. Watch what each one does to negative and positive numbers.',
        packages: ['numpy'],
        controls: [
          {
            id: 'act',
            label: 'Activation',
            options: [
              { value: 'relu', label: 'ReLU' },
              { value: 'sigmoid', label: 'Sigmoid' },
              { value: 'tanh', label: 'Tanh' },
            ],
          },
          {
            id: 'z',
            label: 'Input z',
            options: [
              { value: '-3.0', label: '−3' },
              { value: '3.0', label: '3' },
            ],
          },
        ],
        states: ACT_STATES.map((s) => ({
          when: { act: s.act, z: s.z },
          code: ACT_CODE[s.act]?.(s.z) ?? '',
          output: { kind: 'text' as const, value: `${s.out}\n` },
          verdict: { tone: s.tone, text: s.text },
        })),
        defaultState: { act: 'relu', z: '-3.0' },
      },
    },
    {
      key: 'widget.activations',
      kind: 'WIDGET',
      title: 'Explore activation functions',
      depthRank: 1,
      conceptKeys: [NEURONS],
      body: {
        widget: 'activation-explorer',
        prompt:
          'One neuron computes a(w·x + b). Pick an activation, then move the input, weight and bias. The dashed line is the slope that backpropagation uses.',
        params: {
          functions: ['sigmoid', 'tanh', 'relu', 'leaky-relu'],
          default: 'sigmoid',
          showSlope: true,
          tasks: [
            'With sigmoid, move x to 5. How big is the slope now, and why does that slow learning?',
            'Switch to ReLU and move x below 0. What happens to the output and the slope?',
            'Switch to leaky ReLU. What do negative inputs keep that plain ReLU loses?',
            'Raise the weight w to 3. How does the curve change?',
          ],
        },
      },
    },
    {
      key: 'slides.backprop',
      kind: 'SLIDES',
      title: 'How a network learns',
      depthRank: 1,
      conceptKeys: [BACKPROP],
      body: {
        slides: [
          {
            kicker: 'Backprop · the story',
            title: 'Learning from a wrong guess',
            body: 'A coach watches you miss a shot, then adjusts your grip and stance, most where the mistake came from. Backpropagation does that for every weight.',
            animation: {
              name: 'forward-backward',
              caption: 'Real use: every network you train learns this way',
            },
          },
          {
            kicker: 'The training loop',
            title: 'Four steps, repeated',
            visual: {
              type: 'flow',
              steps: [
                { label: 'Forward pass: predict', icon: 'play' },
                { label: 'Loss: how wrong', icon: 'target' },
                { label: 'Backward pass: gradients', icon: 'repeat' },
                { label: 'Update the weights', icon: 'zap' },
              ],
            },
            note: 'The data goes in small **batches**. One pass over all the data is an **epoch**, and training runs many.',
          },
          {
            kicker: 'Gradient',
            title: 'A gradient says which way to turn each knob',
            body: 'For each weight, the gradient says how the loss changes if that weight grows a little. Move each weight a small step the other way.',
            visual: {
              type: 'code',
              code: 'w = 0.8\ngradient = 2.5        # the loss rises if w grows\nlearning_rate = 0.1\n\nw = w - learning_rate * gradient\nprint(round(w, 2))',
              output: '0.55',
            },
            note: 'The learning rate sets the step size: too big overshoots, too small crawls.',
            narration:
              "Let's see one update step in code. The weight w starts at 0.8. The gradient is 2.5, a positive number, which means the loss goes up if w grows. So we move w the other way: we take the learning rate, 0.1, times the gradient, and subtract it from w. That is 0.8 minus 0.25, so it prints 0.55. The learning rate sets the size of the step: too big and you overshoot, too small and training crawls.",
          },
          {
            kicker: 'Try it',
            title: 'Put one training step in order',
            try: {
              type: 'choice',
              prompt: 'In what order does one training step run?',
              options: [
                {
                  text: 'Forward pass, loss, backward pass, update',
                  correct: true,
                  feedback:
                    'Right. You need a prediction and its loss before you can send the error back.',
                },
                {
                  text: 'Backward pass, forward pass, update, loss',
                  correct: false,
                  feedback:
                    'The backward pass needs the loss, so the forward pass and loss come first.',
                },
                {
                  text: 'Update, forward pass, loss, backward pass',
                  correct: false,
                  feedback: 'You update with the gradients, so the update comes last.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'slides.chain',
      kind: 'SLIDES',
      title: 'Backpropagation with real numbers',
      depthRank: 2,
      conceptKeys: [BACKPROP],
      body: {
        slides: [
          {
            kicker: 'Chain rule · the story',
            title: 'Blame passes back link by link',
            body: 'Each km of traffic delays your bus 2 minutes, and each minute late costs you 3 marks. So one km costs 2 × 3 = 6 marks. Effects multiply along a chain: that is the chain rule.',
            points: [
              'The weight changes the prediction: ∂ŷ/∂w',
              'The prediction changes the loss: ∂L/∂ŷ',
              'Multiply them: ∂L/∂w = ∂L/∂ŷ × ∂ŷ/∂w',
            ],
          },
          {
            kicker: 'Worked example',
            title: 'One weight, worked by hand',
            points: ['Model: ŷ = w·x. Loss: (ŷ − y)²', 'Chain rule: ∂L/∂w = 2(ŷ − y) × x'],
            visual: {
              type: 'code',
              code: 'x, y = 2.0, 10.0      # input and true answer\nw = 3.0               # current weight\n\ny_hat = w * x                 # forward: 6.0\nloss = (y_hat - y) ** 2       # 16.0\ngrad = 2 * (y_hat - y) * x    # chain rule: -16.0\nw = w - 0.05 * grad           # learning rate 0.05\nprint(y_hat, loss, grad, w)',
              output: '6.0 16.0 -16.0 3.8',
            },
            note: 'The gradient is negative, so the weight goes up. The next prediction is 7.6, closer to 10.',
            narration:
              "Let's walk through one full training step with real numbers. The input x is 2, the true answer y is 10, and the weight w starts at 3. The prediction, y hat, is w times x, which is 6. The loss is the squared error, 16. The chain rule gives the gradient: 2 times the error times x, which is minus 16. We subtract 0.05 times that gradient, so w rises from 3 to 3.8. It prints 6.0, 16.0, minus 16.0 and 3.8. The next prediction would be 7.6, closer to 10.",
          },
          {
            kicker: 'Try it',
            title: 'Run three more steps',
            try: {
              type: 'code',
              prompt:
                'Add the update line just above the print, so `w` keeps learning. Does it head towards 5, where 5 × 2 = 10?',
              starter:
                'x, y = 2.0, 10.0\nw = 3.8\nfor step in range(3):\n    y_hat = w * x\n    grad = 2 * (y_hat - y) * x\n    # update w (learning rate 0.05)\n    print(step, round(w, 3))\n',
              expected: '2 4.741',
              hint: 'Add `w = w - 0.05 * grad` just above the print, at the same indent.',
            },
          },
        ],
      },
    },
    {
      key: 'check.basics',
      slotKey: 'check',
      kind: 'KNOWLEDGE_CHECK',
      title: 'Neural network basics check',
      depthRank: 1,
      conceptKeys: [NEURONS, BACKPROP],
      body: {
        items: [
          {
            key: 'ai-ml-dl',
            type: 'mcq',
            prompt: 'Which statement is true?',
            options: [
              {
                id: 'a',
                text: 'Deep learning is a kind of machine learning, which is a kind of AI',
              },
              { id: 'b', text: 'Machine learning is a kind of deep learning' },
              { id: 'c', text: 'AI and deep learning mean the same thing' },
              { id: 'd', text: 'Deep learning needs no data' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'The three are nested circles: AI is the biggest, then machine learning, then deep learning.',
          },
          {
            key: 'neuron',
            type: 'predict_output',
            prompt: 'What does this neuron print?',
            language: 'python',
            code: 'import numpy as np\n\nx = np.array([1.0, 2.0])\nw = np.array([0.5, -1.0])\nb = 1.0\nprint(np.maximum(0, x @ w + b))',
            options: [
              { id: 'a', text: '0.0' },
              { id: 'b', text: '-0.5' },
              { id: 'c', text: '1.5' },
              { id: 'd', text: '0.5' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'The weighted sum is 0.5 − 2.0 + 1.0 = −0.5. ReLU turns any negative number into 0.',
          },
          {
            key: 'loop-order',
            type: 'order_steps',
            prompt: 'Put one training step in order.',
            steps: [
              { id: 'a', text: 'Forward pass: make a prediction' },
              { id: 'b', text: 'Compute the loss' },
              { id: 'c', text: 'Backward pass: compute the gradients' },
              { id: 'd', text: 'Update the weights' },
            ],
            answer: { order: ['a', 'b', 'c', 'd'] },
            explanation:
              'Predict, measure the error, send it back as gradients, then step each weight against its gradient.',
          },
        ],
      },
    },
    {
      key: 'check.mid',
      slotKey: 'check',
      kind: 'KNOWLEDGE_CHECK',
      title: 'Neural networks and backprop check',
      depthRank: 2,
      conceptKeys: [NEURONS, BACKPROP],
      body: {
        items: [
          {
            key: 'ai-ml-dl',
            type: 'mcq',
            prompt: 'Which statement is true?',
            options: [
              {
                id: 'a',
                text: 'Deep learning is a kind of machine learning, which is a kind of AI',
              },
              { id: 'b', text: 'Machine learning is a kind of deep learning' },
              { id: 'c', text: 'Deep learning needs hand-made features, like classic ML' },
              { id: 'd', text: 'AI and deep learning mean the same thing' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'They are nested: AI, then machine learning, then deep learning. Deep learning learns its own features from raw data.',
          },
          {
            key: 'neuron',
            type: 'predict_output',
            prompt: 'What does this neuron print?',
            language: 'python',
            code: 'import numpy as np\n\nx = np.array([1.0, 2.0])\nw = np.array([0.5, -1.0])\nb = 1.0\nprint(np.maximum(0, x @ w + b))',
            options: [
              { id: 'a', text: '0.0' },
              { id: 'b', text: '-0.5' },
              { id: 'c', text: '1.5' },
              { id: 'd', text: '0.5' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'The weighted sum is 0.5 − 2.0 + 1.0 = −0.5. ReLU turns any negative number into 0.',
          },
          {
            key: 'output-activation',
            type: 'mcq',
            prompt:
              'A model must say "spam" or "not spam". Which activation turns its output into a probability of spam?',
            options: [
              { id: 'a', text: 'Sigmoid' },
              { id: 'b', text: 'ReLU' },
              { id: 'c', text: 'No activation at all' },
              { id: 'd', text: 'Tanh' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Sigmoid gives a number between 0 and 1, read as the chance of spam. ReLU and tanh suit hidden layers; a number like a price needs no activation.',
          },
          {
            key: 'chain-step',
            type: 'predict_output',
            prompt:
              'One step of gradient descent on ŷ = w·x with loss (ŷ − y)². What is the new `w`?',
            language: 'python',
            code: 'x, y = 1.0, 4.0\nw = 2.0\ngrad = 2 * (w * x - y) * x\nw = w - 0.1 * grad\nprint(w)',
            options: [
              { id: 'a', text: '2.4' },
              { id: 'b', text: '1.6' },
              { id: 'c', text: '2.0' },
              { id: 'd', text: '-2.0' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'The prediction is 2, so the gradient is 2 × (2 − 4) × 1 = −4. Then w = 2 − 0.1 × (−4) = 2.4.',
          },
          {
            key: 'explain-backprop',
            type: 'reasoning',
            prompt:
              'The interviewer asks: *"How does backpropagation work?"* Answer in four or five sentences, with the chain rule.',
            modelAnswer:
              'Backpropagation finds how much each weight contributed to the error. After the forward pass and the loss, it applies the chain rule from the output back, layer by layer. That gives a gradient for every weight.\n\nThe optimiser, such as SGD, then moves each weight against its gradient: w = w − learning rate × gradient. For one weight with ŷ = w·x and loss (ŷ − y)², the gradient is 2(ŷ − y)·x.',
            rubric: [
              'Starts from the loss after a forward pass',
              'Uses the chain rule, from the output back to the input',
              'Gets a gradient for every weight',
              'Updates each weight against its gradient, with a learning rate',
            ],
          },
        ],
      },
    },
    {
      key: 'slides.deeper',
      kind: 'SLIDES',
      title: 'Deeper neural network questions',
      depthRank: 3,
      conceptKeys: [NEURONS, BACKPROP],
      body: {
        slides: [
          {
            kicker: 'Autograd',
            title: 'PyTorch finds the gradients for you',
            body: 'A bank passbook records every transaction, so any balance can be traced back. Autograd records each operation of your forward pass in a graph. `loss.backward()` walks it back with the chain rule and fills `.grad`.',
            visual: {
              type: 'code',
              code: 'import torch\n\nw = torch.tensor(3.0, requires_grad=True)\nx, y = 2.0, 10.0\nloss = (w * x - y) ** 2\nloss.backward()\nprint(w.grad)   # tensor(-16.)',
            },
            note: 'The same −16 as the worked example. TensorFlow does the same with `GradientTape`.',
            narration:
              'Here is the same worked example, but PyTorch does the calculus. The weight w is a tensor holding 3, created with requires grad set to True, which tells PyTorch to record every operation on it. The loss is built exactly as before, from w times x minus y, squared. Calling backward on the loss walks that record back with the chain rule and stores the result in the grad of w. Printing it shows minus 16, the same gradient we found by hand. TensorFlow does the same job with GradientTape.',
          },
          {
            kicker: 'Backprop · through a hidden neuron',
            title: 'The error is reused on its way back',
            points: [
              'Output weight: ∂L/∂w2 = d × h',
              'Hidden weight: ∂L/∂w1 = (d × w2) × ReLU slope × x',
            ],
            visual: {
              type: 'code',
              code: 'x, y = 2.0, 5.0\nw1, w2 = 0.5, 3.0\n\n# forward\nh = max(0.0, w1 * x)    # hidden, ReLU: 1.0\ny_hat = w2 * h          # 3.0\n# backward, from the loss (y_hat - y)**2\nd = 2 * (y_hat - y)     # -4.0\ndw2 = d * h             # -4.0\ndh = d * w2             # sent back: -12.0\ndw1 = dh * 1.0 * x      # ReLU slope 1: -24.0\nprint(dw2, dw1)',
              output: '-4.0 -24.0',
            },
            note: 'The −4 found at the output is reused for w1. That reuse is what makes backprop fast.',
            narration:
              'This program sends the error back through one hidden neuron. Going forward, h is the hidden value after ReLU, which is 1, and the prediction y hat is w2 times h, which is 3, while the true answer is 5. Going backward, d is the error signal at the output, minus 4. The gradient for w2 is d times h, minus 4. Then d times w2, minus 12, is sent back to the hidden neuron, and times x it gives minus 24 for w1. It prints minus 4.0 and minus 24.0. That same minus 4 is reused, which is what makes backprop fast.',
          },
          {
            kicker: 'Initialisation',
            title: 'Why weights start random',
            body: 'Give four new hires identical training and identical tasks, and you get four clones, not a team. If every weight starts equal, every neuron computes the same thing and gets the same gradient. Random starts break the symmetry.',
            visual: {
              type: 'code',
              code: 'import numpy as np\n\nx = np.array([1.0, 2.0])\nW_same = np.full((2, 3), 0.5)\nW_rand = np.random.default_rng(0).normal(0, 0.5, (2, 3))\nprint(x @ W_same)               # three identical neurons\nprint(np.round(x @ W_rand, 2))  # three different ones',
              output: '[1.5 1.5 1.5]\n[ 0.17 -0.6   0.68]',
            },
            note: 'Scale matters too: too large and signals explode, too small and they fade. **He** initialisation (variance 2 ÷ number of inputs) suits ReLU; **Xavier** suits tanh.',
            narration:
              'Here is the clone problem in code. The input x has 2 values, and each weight table connects them to 3 neurons. In W same, every weight is 0.5, so all 3 neurons compute the same thing and the first line prints 1.5, 1.5 and 1.5. In W rand, the weights are small random numbers, so the second line prints 3 different values: 0.17, minus 0.6 and 0.68. Different outputs mean different gradients, so the neurons can learn different things. The scale matters too: too large and signals explode, too small and they fade.',
          },
          {
            kicker: 'Softmax and cross-entropy',
            title: 'Scores into probabilities, then a loss',
            body: 'Exit-poll vote shares always add up to 100%. Softmax turns raw scores (logits) into shares like that. Cross-entropy then charges more the less share the true answer got.',
            visual: {
              type: 'code',
              code: 'import numpy as np\n\nlogits = np.array([2.0, 1.0, 0.1])  # cat, dog, car\ne = np.exp(logits - logits.max())   # stable: no overflow\nprobs = e / e.sum()\nprint(np.round(probs, 2))           # adds up to 1\nprint(round(float(-np.log(probs[0])), 2))  # loss if cat\nprint(round(float(-np.log(probs[2])), 2))  # loss if car',
              output: '[0.66 0.24 0.1 ]\n0.42\n2.32',
            },
            note: "A confident wrong answer costs far more: 2.32 against 0.42. PyTorch's CrossEntropyLoss takes the raw logits.",
            narration:
              "Let's turn raw scores into probabilities. The array logits holds the scores for cat, dog and car. Softmax takes the exponential of each score and divides by the total; subtracting the largest score first just keeps the numbers safe from overflow. The result, probs, prints 0.66, 0.24 and 0.1, which add up to 1. Cross-entropy is the negative log of the share given to the true answer. If the truth is cat, the loss is 0.42. If the truth is car, it is 2.32, because a confident wrong answer costs far more.",
          },
          {
            kicker: 'Trees or networks',
            title: 'Pick the model for the data',
            body: 'A spreadsheet of loan applicants and a folder of X-rays need different tools.',
            visual: {
              type: 'compare',
              left: {
                title: 'Tree models',
                items: [
                  'Tabular data, even when it is large',
                  'Fast, less tuning, easier to explain',
                ],
              },
              right: {
                title: 'Neural networks',
                items: [
                  'Images, audio, text, very large data',
                  'Learn their own features; need more compute',
                ],
              },
              better: 'none',
            },
            note: 'Interviewers like this trade-off: choose by the data type and size, not by fashion.',
          },
          {
            kicker: 'Try it',
            title: 'Count the parameters',
            try: {
              type: 'choice',
              prompt:
                'A dense layer takes 10 inputs and has 4 neurons. How many parameters does it have?',
              options: [
                {
                  text: '44',
                  correct: true,
                  feedback: 'Right: 10 × 4 = 40 weights, plus 4 biases.',
                },
                {
                  text: '40',
                  correct: false,
                  feedback: 'That counts the weights. Each neuron also has a bias.',
                },
                {
                  text: '14',
                  correct: false,
                  feedback:
                    'Every input connects to every neuron, so multiply: 10 × 4 weights, plus 4 biases.',
                },
              ],
            },
          },
          {
            kicker: 'ReLU puzzles',
            title: 'ReLU scales with its input',
            body: 'In symbols, ReLU(2z) = 2 × ReLU(z). Double every weight of a ReLU network without biases, and each layer doubles the signal.',
            points: [
              'Two layers, each doubled: the output is 4 times bigger. `max(0, z / 4)` at the output undoes it',
              'Duplicate every hidden neuron instead: the output only doubles, so use `max(0, z / 2)`',
            ],
            visual: {
              type: 'code',
              code: 'import numpy as np\n\nrelu = lambda z: np.maximum(0, z)\nx = np.array([1.0, 2.0])\nW1 = np.array([[0.5, -0.2],\n               [0.3, 0.4]])\nw2 = np.array([0.7, 0.5])\n\nout = relu(relu(x @ W1) @ w2)\nout2 = relu(relu(x @ (2 * W1)) @ (2 * w2))\nprint(round(float(out), 2), round(float(out2), 2))',
              output: '1.07 4.28',
            },
            note: 'Sigmoid breaks this trick: sigmoid(2z) is not 2 × sigmoid(z).',
            narration:
              'Here is a small puzzle about ReLU networks. The network has 2 inputs, 2 hidden ReLU neurons and 1 output, with no biases. The variable out is the normal output, 1.07. For out2, every weight is doubled. Each hidden value doubles, because ReLU of 2 z is 2 times ReLU of z, and the doubled output weights double it again. So it prints 1.07 and 4.28, exactly 4 times bigger. To get the old answer back without touching any weight, divide by 4 inside the output activation.',
          },
          {
            kicker: 'Try it',
            title: 'Duplicate the hidden neurons',
            try: {
              type: 'choice',
              prompt:
                'A one-hidden-layer ReLU network has no biases. You copy every hidden neuron, with the same weights in and out. How do you get the old output back without changing any weight?',
              options: [
                {
                  text: 'Use max(0, z / 2) at the output',
                  correct: true,
                  feedback:
                    'Right. Each copy adds the same amount again, so the output doubles. Halving the hidden ReLU instead also works.',
                },
                {
                  text: 'Nothing: the output stays the same',
                  correct: false,
                  feedback: 'Each copy sends the same value to the output, so the sum doubles.',
                },
                {
                  text: 'Use sigmoid at the output',
                  correct: false,
                  feedback: 'Sigmoid squashes the output into 0 to 1, so the answer changes.',
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
      title: 'Neural network depth check',
      depthRank: 3,
      conceptKeys: [NEURONS, BACKPROP],
      body: {
        items: [
          {
            key: 'chain-step',
            type: 'predict_output',
            prompt:
              'One step of gradient descent on ŷ = w·x with loss (ŷ − y)². What is the new `w`?',
            language: 'python',
            code: 'x, y = 1.0, 4.0\nw = 2.0\ngrad = 2 * (w * x - y) * x\nw = w - 0.1 * grad\nprint(w)',
            options: [
              { id: 'a', text: '2.4' },
              { id: 'b', text: '1.6' },
              { id: 'c', text: '2.0' },
              { id: 'd', text: '-2.0' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'The prediction is 2, so the gradient is 2 × (2 − 4) × 1 = −4. Then w = 2 − 0.1 × (−4) = 2.4.',
          },
          {
            key: 'cross-entropy',
            type: 'mcq',
            prompt:
              'Softmax gives [0.66, 0.24, 0.10] for cat, dog and car. The true answer is car. What is the cross-entropy loss?',
            options: [
              { id: 'a', text: 'About 2.30' },
              { id: 'b', text: 'About 0.42' },
              { id: 'c', text: '0.10' },
              { id: 'd', text: '1.00' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'The loss is −ln(0.10) ≈ 2.30. The slide shows 2.32 because it keeps more decimals (0.0986). Had the answer been cat, it would be −ln(0.66) ≈ 0.42: confident mistakes cost more.',
          },
          {
            key: 'symmetry',
            type: 'mcq',
            prompt: 'Why not start every weight at 0?',
            options: [
              {
                id: 'a',
                text: 'Every neuron in a layer would stay identical and learn the same thing',
              },
              { id: 'b', text: 'Gradients would explode on the first step' },
              { id: 'c', text: 'The biases could no longer learn' },
              { id: 'd', text: 'Zero weights make the loss infinite' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Equal weights give equal outputs and equal gradients, so the neurons never become different. Random starts break the symmetry.',
          },
          {
            key: 'explain-backprop',
            type: 'reasoning',
            prompt:
              'The interviewer asks: *"How does backpropagation work, and what does autograd do?"* Answer in four sentences.',
            modelAnswer:
              'After the forward pass and the loss, backpropagation applies the chain rule from the output back through each layer. That gives the gradient of the loss for every weight; the optimiser then moves each weight against it.\n\nAutograd records the operations in the forward pass and runs this chain rule for you: in PyTorch, `loss.backward()` fills `w.grad`. For ŷ = w·x and loss (ŷ − y)², the gradient is 2(ŷ − y)·x.',
            rubric: [
              'Chain rule from the output back to the input',
              'A gradient for every weight, then an update with a learning rate',
              'Autograd records the forward pass and computes the gradients',
              'A concrete example or formula',
            ],
          },
        ],
      },
    },
    {
      key: 'playground.neuron',
      kind: 'PLAYGROUND',
      title: 'Train a neuron with gradient descent',
      depthRank: 2,
      conceptKeys: [BACKPROP],
      body: {
        language: 'python',
        packages: ['numpy'],
        instructions:
          'The neuron should learn the rule **y = 2x + 1** on its own. Replace the `0.0` in `dw` and `db` with the gradients of the mean squared error, then run. It should print `w = 2.00, b = 1.00`.',
        starterCode: NEURON_START,
        hints: [
          'For each point the error is `y_hat - y`. The gradient for `w` is the mean of `2 * error * x`.',
          'The gradient for `b` is the mean of `2 * error`, with no `x`.',
          'Use `np.mean(...)` for both.',
        ],
        solution: NEURON_SOLUTION,
        checks: [
          { type: 'stdout_contains', value: 'w = 2.00', label: 'Learns the slope 2' },
          { type: 'stdout_contains', value: 'b = 1.00', label: 'Learns the bias 1' },
        ],
      },
    },
    {
      key: 'interview.backprop',
      kind: 'INTERVIEW_PLAYBOOK',
      title: 'Backpropagation answer structure',
      depthRank: 1,
      conceptKeys: [BACKPROP],
      body: {
        question: '"How does a neural network learn? Explain backpropagation."',
        totalMinutes: 2,
        steps: [
          {
            title: 'The goal',
            detail: 'Find how much each weight caused the error, then adjust it.',
          },
          {
            title: 'Forward pass',
            detail:
              'Inputs flow through the layers to a prediction, and the loss measures the error.',
          },
          {
            title: 'Backward pass',
            detail:
              'The chain rule runs from the output back, layer by layer, giving a gradient for every weight.',
          },
          {
            title: 'Update',
            detail:
              'The optimiser moves each weight a small step against its gradient: w = w − lr × gradient.',
          },
          {
            title: 'Repeat',
            detail: 'Over many batches and epochs, until the loss stops falling.',
          },
          {
            title: 'One example',
            detail: 'For ŷ = w·x and loss (ŷ − y)², the gradient is 2(ŷ − y)·x.',
          },
        ],
        followUps: [
          'Why do we need activation functions?',
          'Compare ReLU, sigmoid and tanh.',
          'What is the vanishing gradient problem?',
          'What is the difference between an epoch and a batch?',
          'What is a fully connected layer?',
          'How is deep learning different from machine learning?',
        ],
      },
    },
    {
      key: 'interview-questions',
      kind: 'CARD_DECK',
      title: 'Interview questions and answers',
      depthRank: 1,
      conceptKeys: [NEURONS, BACKPROP],
      body: {
        layout: 'flip',
        cards: [
          {
            title: 'Neural network in plain words',
            front: 'What is a neural network, and how does it learn?',
            back: 'A neural network is layers of neurons. Each neuron takes a weighted sum of its inputs, adds a bias and applies an activation. In training, a loss measures the error, backpropagation finds the gradients and gradient descent nudges each weight. Over many examples, the layers learn their own features.',
          },
          {
            title: 'Deep learning vs classic ML',
            front:
              'What is deep learning, and how is it different from traditional machine learning?',
            back: 'Deep learning is machine learning with many-layer neural networks, and machine learning is part of AI. Classic ML usually needs hand-made features, like word counts. Deep learning learns its own features from raw pixels, audio or text. The price is more data and more compute.',
          },
          {
            title: 'Why activation functions',
            front: 'Why do we need activation functions?',
            back: 'Activations add the bends that let a network learn curves. Without them, each layer is a straight-line step, and stacked straight-line steps collapse into one. So five dense layers with no activation are no more powerful than one. The code still runs; it just cannot learn curved patterns.',
          },
          {
            title: 'ReLU, sigmoid and tanh',
            front: 'Compare ReLU, sigmoid and tanh. Where would you use each?',
            back: 'ReLU, max(0, z), is fast and has slope 1 for positive inputs: the default for hidden layers. Sigmoid squashes to 0 to 1 and suits a yes/no output. Tanh gives −1 to 1, centred on zero. Both flatten at the ends, so deep stacks of them make gradients vanish.',
          },
          {
            title: 'Backpropagation with numbers',
            front: 'How does backpropagation work? Show a small mathematical example.',
            back: 'After the forward pass and the loss, the chain rule runs back from the output, giving every weight a gradient. Take ŷ = w·x and loss (ŷ − y)², with x = 2, y = 10 and w = 3. The gradient 2(ŷ − y)·x is −16. A learning rate of 0.05 moves w to 3.8.',
          },
          {
            title: 'Autograd in PyTorch',
            front: 'What is automatic differentiation (autograd) in PyTorch?',
            back: 'Autograd records each operation of the forward pass in a graph. `loss.backward()` walks that graph back with the chain rule and fills `.grad` for every tensor made with `requires_grad=True`. You never write derivatives by hand. TensorFlow does the same with `GradientTape`.',
          },
          {
            title: 'Parameters and memory',
            front:
              'A network has 2 inputs, 2 hidden neurons, 1 output and no biases. At 64 bits per weight, how many bits? With biases? With duplicated hidden neurons?',
            back: 'Weights: 2 × 2 into the hidden layer plus 2 × 1 into the output make 6, so 384 bits. Biases add one per hidden and output neuron: 9 numbers, 576 bits. Duplicated hidden neurons give 2 × 4 + 4 × 1 = 12 weights, 768 bits.',
          },
          {
            title: 'Scaling a ReLU network',
            front:
              'Every weight of a one-hidden-layer ReLU network without biases is doubled. How does the output change, and how can activations undo it?',
            back: 'ReLU scales with its input: ReLU(2z) = 2 × ReLU(z). The hidden outputs double, and the doubled output weights double them again, so the output is 4 times bigger. Use max(0, z / 4) at the output. Duplicating every hidden neuron only doubles the output, so use max(0, z / 2).',
          },
          {
            title: 'Trees or neural networks',
            front:
              'A deep model beats a tree model by 5%, but compute is tight. Which do you deploy?',
            back: 'I check whether the 5% gain pays for its cost in latency, hardware and explainability; often the tree model wins. Trees suit tabular data and are fast to train and explain. Neural networks win on images, audio, text and very large data, where they learn their own features.',
          },
        ],
      },
    },
    {
      key: 'summary.basic',
      slotKey: 'summary',
      kind: 'SUMMARY',
      title: 'Neural network key takeaways',
      depthRank: 1,
      conceptKeys: [NEURONS, BACKPROP],
      body: {
        takeaways: [
          'A neuron takes a weighted sum of its inputs, adds a bias and applies an activation.',
          'Activations add the bends; without them, many layers act like one.',
          'ReLU for hidden layers; sigmoid for yes/no, softmax for classes, nothing for a number.',
          'Training repeats: forward pass, loss, backward pass, update.',
        ],
        remember: ['neuron = activation(w · x + b)', 'w ← w − lr × gradient'],
      },
    },
    {
      key: 'summary.mid',
      slotKey: 'summary',
      kind: 'SUMMARY',
      title: 'Neural network key takeaways',
      depthRank: 2,
      conceptKeys: [NEURONS, BACKPROP],
      body: {
        takeaways: [
          'A neuron takes a weighted sum of its inputs, adds a bias and applies an activation.',
          'Activations add the bends; ReLU for hidden layers, sigmoid or softmax for classes.',
          'Backpropagation uses the chain rule to get a gradient for every weight.',
          'Gradient descent moves each weight against its gradient, scaled by the learning rate.',
        ],
        remember: ['∂L/∂w = ∂L/∂ŷ × ∂ŷ/∂w', 'w ← w − lr × gradient'],
      },
    },
    {
      key: 'summary.advanced',
      slotKey: 'summary',
      kind: 'SUMMARY',
      title: 'Neural network key takeaways',
      depthRank: 3,
      conceptKeys: [NEURONS, BACKPROP],
      body: {
        takeaways: [
          'Activations add the bends; ReLU for hidden layers, sigmoid or softmax at the output.',
          'Backpropagation is the chain rule from the output back; autograd runs it for you.',
          'A dense layer has inputs × neurons weights plus one bias per neuron.',
          'Random initialisation breaks symmetry; He initialisation suits ReLU, Xavier suits tanh.',
          'Softmax turns scores into probabilities; cross-entropy punishes confident mistakes.',
        ],
        remember: ['loss.backward() fills .grad', 'Params = in × out + out'],
      },
    },
  ],
};
