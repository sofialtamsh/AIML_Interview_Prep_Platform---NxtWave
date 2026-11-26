/**
 * Deep Learning → Training deep networks.
 *
 * Evidence (Hiring Intelligence, ML/AI families, Jan–Oct 2026; internal only, never quoted to
 * students): training questions sit inside neural-network and project rounds. Under 8 LPA: "how
 * does the Adam optimizer work (under the hood)", "how do you handle overfitting: dropout,
 * regularisation, early stopping", "what is batch normalisation for", hyperparameter tuning, the
 * dropout layer in a CNN. 8+ LPA adds regularisation techniques in depth and debugging training.
 * 3–6 LPA treats this as optional at depth 1 (optimizers, dropout, early stopping, batch norm);
 * 8–12 LPA at depth 3 adds Adam's update, vanishing and exploding gradients, debugging a stuck
 * loss, and train() vs eval(). Every concept opens on a short real-world story with a moving
 * picture or a worked example. Every code output is checked by running it with Python 3.14 and
 * NumPy, as in the in-browser runner.
 */
import type { LessonDocumentInput } from '@app/content';

const OPT = 'dl.optimizers';
const REG = 'dl.regularization';
const GRAD = 'dl.gradients';

const STOP_START = `def best_epoch(val_losses, patience):
    # Walk through the epochs, keeping
    # the best (lowest) loss so far.
    # Stop once \`patience\` epochs in a
    # row fail to beat it, and return
    # the epoch of the best loss.
    return None


losses = [0.9, 0.7, 0.6, 0.62, 0.61,
          0.64, 0.58]
p3 = best_epoch(losses, patience=3)
p5 = best_epoch(losses, patience=5)
print("patience 3 ->", p3)
print("patience 5 ->", p5)
`;

const STOP_SOLUTION = `def best_epoch(val_losses, patience):
    best, best_i, wait = float("inf"), 0, 0
    for epoch, loss in enumerate(val_losses):
        if loss < best:
            best, best_i, wait = loss, epoch, 0
        else:
            wait += 1
            if wait == patience:
                break
    return best_i


losses = [0.9, 0.7, 0.6, 0.62, 0.61,
          0.64, 0.58]
p3 = best_epoch(losses, patience=3)
p5 = best_epoch(losses, patience=5)
print("patience 3 ->", p3)
print("patience 5 ->", p5)
`;

export const TRAINING_DEEP_NETWORKS_LESSON: LessonDocumentInput = {
  title: 'Training deep networks',
  subtitle:
    'Optimizers, dropout, early stopping and batch norm, each told as a small story, then the fixes for gradients that vanish or explode.',
  objectives: [
    {
      key: 'optimizers',
      text: 'Explain gradient descent, the learning rate, momentum and Adam',
      minDepthRank: 1,
    },
    {
      key: 'overfitting',
      text: 'Fight overfitting with dropout, early stopping, augmentation and weight decay, and explain batch norm',
      minDepthRank: 1,
    },
    {
      key: 'debugging',
      text: "Explain Adam's update, vanishing and exploding gradients, and debug a loss that won't go down",
      minDepthRank: 3,
    },
  ],
  sections: [
    {
      key: 'hook',
      kind: 'HOOK',
      title: 'When training goes wrong',
      depthRank: 1,
      conceptKeys: [REG],
      body: {
        scenario:
          "You train a model to read handwritten digits. After 30 epochs it scores 99% on its training images but only 82% on new ones. A friend's model is worse: its loss jumps up and down and never settles. Both are training problems, and each has a standard fix.",
        animation: {
          name: 'early-stopping',
          caption: 'Training keeps improving; validation turns around',
        },
        realWorld: {
          title: 'Where you see these tools',
          items: [
            { icon: 'zap', label: 'optim.Adam', sub: 'The usual first choice of optimizer' },
            { icon: 'filter', label: 'nn.Dropout', sub: 'Fights overfitting in big models' },
            { icon: 'gauge', label: 'nn.BatchNorm2d', sub: 'Inside most CNNs, such as ResNet' },
            { icon: 'flag', label: 'Early stopping', sub: 'Stops before the model memorises' },
          ],
        },
        provocation: 'Which fix would you try first for each model?',
        bridge:
          '"How do you handle overfitting in a deep network?" and "how does Adam work?" are common interview questions. This lesson gives each fix a simple story and a few lines of code.',
      },
    },
    {
      key: 'slides.optimizers',
      kind: 'SLIDES',
      title: 'Optimizers: how the weights move',
      depthRank: 1,
      conceptKeys: [OPT],
      body: {
        slides: [
          {
            kicker: 'Gradient descent · the story',
            title: 'Walking downhill in fog',
            body: 'In thick fog you can only feel the slope under your feet. So you take a step downhill, feel again and repeat. That is gradient descent.',
            animation: { name: 'loss-bowl', caption: 'Each step goes downhill on the loss' },
          },
          {
            kicker: 'Learning rate · the story',
            title: 'The step size matters most',
            body: 'Tiny steps take forever to reach the bottom. Giant steps leap over the valley and bounce around it.',
            animation: {
              name: 'learning-rate',
              caption: 'Real use: the first setting to tune when training misbehaves',
            },
          },
          {
            kicker: 'SGD',
            title: 'Stochastic gradient descent',
            points: [
              '**Batch GD**: all the data per step. **SGD**: one example. **Mini-batch**: 32–256 examples',
              'In practice "SGD" means mini-batches: cheap and noisy, but heading downhill',
            ],
            visual: {
              type: 'code',
              code: 'w = 1.0\nlr = 0.1\nfor step in range(3):\n    # gradient of the loss w**2\n    grad = 2 * w\n    w = w - lr * grad\n    print(step, round(w, 3))',
              output: '0 0.8\n1 0.64\n2 0.512',
            },
            narration:
              'Here is gradient descent in a few lines. The weight w starts at 1, and lr, the learning rate, is 0.1. The loss is w squared, so its gradient, called grad, is 2 times w. In each round of the loop, w moves a small step against the gradient. It prints 0.8, then 0.64, then 0.512. The weight is walking downhill towards 0, where the loss is lowest, just like the walker in the fog.',
          },
          {
            kicker: 'Momentum and Adam · the story',
            title: 'A rolling ball keeps its speed',
            body: 'A ball rolling downhill keeps its speed through small bumps. Momentum adds this memory of past steps. Adam also gives each weight its own step size.',
            animation: {
              name: 'optimizer-paths',
              caption: 'Real use: Adam with lr = 0.001 is a common default',
            },
          },
          {
            kicker: 'Compare',
            title: 'Three optimizers in one line each',
            visual: {
              type: 'icons',
              items: [
                { icon: 'repeat', label: 'SGD', sub: 'One step size for every weight; noisy' },
                { icon: 'rocket', label: 'Momentum', sub: 'Remembers past steps, so less zig-zag' },
                { icon: 'zap', label: 'Adam', sub: 'Momentum plus a step size per weight' },
              ],
            },
            note: 'Adam usually works well out of the box. Well-tuned SGD with momentum sometimes generalises better.',
          },
          {
            kicker: 'Try it',
            title: 'A loss that jumps around',
            try: {
              type: 'choice',
              prompt:
                'Your loss jumps up and down wildly and never settles. What do you try first?',
              options: [
                {
                  text: 'Lower the learning rate',
                  correct: true,
                  feedback: 'Right. Steps that are too big overshoot the valley again and again.',
                },
                {
                  text: 'Train for more epochs',
                  correct: false,
                  feedback:
                    'More epochs of the same big steps keep bouncing. Fix the step size first.',
                },
                {
                  text: 'Add more layers',
                  correct: false,
                  feedback:
                    'A bigger model does not cure overshooting. The learning rate is the usual cause.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'widget.optimizers',
      kind: 'WIDGET',
      title: 'Race SGD, momentum and Adam',
      depthRank: 1,
      conceptKeys: [OPT],
      body: {
        widget: 'optimizer-race',
        prompt:
          'Three optimizers start from the same point in a narrow valley, gentle one way and steep the other. Change the settings and watch how each one moves towards the lowest point.',
        params: {
          optimizers: ['sgd', 'momentum', 'adam'],
          learningRate: { options: [0.1, 0.3, 0.9, 1.05], default: 0.3 },
          momentum: { options: [0, 0.5, 0.9], default: 0.9 },
          steps: { max: 100, default: 40 },
          allowNoise: true,
          tasks: [
            'At learning rate 0.3, which optimizer gets closest to the star in 40 steps?',
            'Set momentum β to 0. What does the momentum path turn into?',
            'Set β to 0.5. Try learning rates 0.9 and 1.05: how do SGD and momentum handle the steep side?',
            'Turn on mini-batch noise. How do the paths change?',
          ],
        },
      },
    },
    {
      key: 'slides.regularization',
      kind: 'SLIDES',
      title: 'Fighting overfitting',
      depthRank: 1,
      conceptKeys: [REG],
      body: {
        slides: [
          {
            kicker: 'Overfitting · the story',
            title: "Memorising last year's paper",
            body: "A student who memorises last year's answers scores full marks on that paper, then fails on new questions. A model can memorise its training data the same way. Underfitting is the opposite: too simple, poor on both.",
            animation: { name: 'overfit-underfit', caption: 'Too simple, just right, too wiggly' },
          },
          {
            kicker: 'Dropout · the story',
            title: 'Practise with players benched at random',
            body: 'A cricket team that practises with random players benched learns not to rely on one star. Dropout switches off random neurons at each training step for the same reason.',
            animation: {
              name: 'dropout-net',
              caption: 'Real use: nn.Dropout(0.5) before the final layers',
            },
          },
          {
            kicker: 'Dropout · the code',
            title: 'Drop some outputs, scale up the rest',
            visual: {
              type: 'code',
              code: "import numpy as np\n\nrng = np.random.default_rng(1)\n# one layer's outputs\nh = np.array([0.8, 1.5, 0.3, 2.0, 0.9, 1.1])\n# drop 20%: keep about 80%\nkeep = rng.random(6) > 0.2\nprint(keep.astype(int))\n# divide by the keep rate, 0.8\nprint(np.round(h * keep / 0.8, 2))",
              output: '[1 1 0 1 1 1]\n[1.   1.88 0.   2.5  1.12 1.38]',
            },
            note: 'This is **inverted dropout**: divide by the keep rate, so each output stays the same on average. At test time dropout is off, with no scaling.',
            narration:
              'This short program shows dropout on one layer. The array h holds 6 outputs of a layer, and keep is a random mask where each output stays with about 80 percent chance. The first line printed is the mask, 1 1 0 1 1 1, so the third output is switched off. Then h is multiplied by keep and divided by the keep rate, 0.8. The third value becomes 0 and the others grow a little: 0.8 becomes 1, and 1.5 becomes 1.88. This is inverted dropout. Scaling up keeps the average the same, and at test time dropout is simply off.',
          },
          {
            kicker: 'Early stopping · the story',
            title: 'Save at every new high score',
            body: 'In a game you save at every new high score. After three bad rounds in a row, you quit and reload your best save. Early stopping does the same with the validation loss.',
            visual: {
              type: 'flow',
              steps: [
                { label: 'Train one epoch', icon: 'play' },
                { label: 'Check validation loss', icon: 'search' },
                { label: 'Better: save the model', icon: 'check' },
                { label: 'No gain for 3: stop', icon: 'flag' },
              ],
            },
          },
          {
            kicker: 'Batch norm · the story',
            title: 'Put every batch on the same scale',
            body: "Marks from two exam centres are hard to compare until you rescale both to the same average and spread. Batch norm rescales each layer's outputs that way, so training is faster and steadier.",
            animation: {
              name: 'batch-norm',
              caption: 'Real use: nn.BatchNorm2d after convolution layers',
            },
            note: 'Batch norm is mainly for speed and stability, not a cure for overfitting.',
          },
          {
            kicker: 'More tools',
            title: 'Three more ways to generalise',
            body: 'You recognise a friend in photos from any angle and in any light. Augmentation teaches a model the same thing.',
            points: [
              '**Weight decay (L2)**: penalise large weights',
              '**Data augmentation**: small shifts, crops and rotations that keep the label true',
              '**More data**: the most reliable fix of all',
            ],
            note: 'Never mirror or turn digits upside down: a mirrored 2 is no longer a 2, and an upside-down 6 is a 9.',
          },
          {
            kicker: 'Try it',
            title: 'Spot the problem',
            try: {
              type: 'choice',
              prompt: 'Training accuracy is 99% and validation accuracy is 82%. What is happening?',
              options: [
                {
                  text: 'Overfitting: add dropout, augmentation or early stopping',
                  correct: true,
                  feedback:
                    'Right. A big gap between training and validation means the model memorised.',
                },
                {
                  text: 'Underfitting: train a bigger model for longer',
                  correct: false,
                  feedback:
                    'Underfitting shows low accuracy on both. Here training is high and validation lags.',
                },
                {
                  text: 'The learning rate is too low',
                  correct: false,
                  feedback:
                    'A low learning rate slows training down. It does not make validation lag far behind.',
                },
              ],
            },
          },
          {
            kicker: 'Loss curves',
            title: 'Read the two loss curves',
            body: 'Plot the training and validation loss after every epoch. The shape of the two curves tells you which fix to try first.',
            visual: {
              type: 'icons',
              items: [
                {
                  icon: 'alert',
                  label: 'Both high and flat',
                  sub: 'Underfitting: bigger model, longer training, less regularisation',
                },
                {
                  icon: 'filter',
                  label: 'Train falls, validation rises',
                  sub: 'Overfitting: more data, dropout, weight decay, stop early',
                },
                {
                  icon: 'zap',
                  label: 'Loss jumps or turns NaN',
                  sub: 'Learning rate too high: divide it by 10, clip gradients',
                },
                {
                  icon: 'clock',
                  label: 'Loss falls very slowly',
                  sub: 'Learning rate too low, or inputs not normalised',
                },
              ],
            },
            note: 'Underfitting is also called high bias; overfitting is high variance.',
          },
          {
            kicker: 'Try it',
            title: 'Both curves stuck high',
            try: {
              type: 'choice',
              prompt:
                'Training and validation accuracy are both stuck near 60%, close together, and the loss has flattened. What do you try first?',
              options: [
                {
                  text: 'A bigger model, with less dropout',
                  correct: true,
                  feedback:
                    'Right. Both scores are low and close, so the model is underfitting: it is too weak to fit even the training data.',
                },
                {
                  text: 'More dropout and stronger weight decay',
                  correct: false,
                  feedback:
                    'Those fight overfitting. They would make an underfitting model weaker still.',
                },
                {
                  text: 'Early stopping',
                  correct: false,
                  feedback:
                    'Early stopping helps when validation gets worse while training improves. Here neither improves.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'widget.early-stopping',
      kind: 'WIDGET',
      title: 'Find the early-stopping point',
      depthRank: 1,
      conceptKeys: [REG],
      body: {
        widget: 'training-explorer',
        prompt:
          'Now train a model yourself. Drag the epochs, watch both loss curves, and find the epoch where you would stop.',
        params: {
          degree: { options: [9], default: 9 },
          learningRate: { options: [0.01, 0.05, 0.2, 0.5], default: 0.05 },
          l2: { options: [0, 0.1], default: 0 },
          epochs: { max: 3000, default: 3000 },
          seed: 56,
          points: 12,
          noise: 0.3,
          tasks: [
            'Drag the epochs and stop where validation loss is lowest. That is early stopping.',
            'Raise the learning rate to 0.2. Does the best epoch come sooner or later?',
            'Try 0.5. What happens to training?',
            'Set the learning rate back to 0.05 and add L2 of 0.1. Does the gap between the two curves still grow?',
          ],
        },
      },
    },
    {
      key: 'check.basics',
      slotKey: 'check',
      kind: 'KNOWLEDGE_CHECK',
      title: 'Training basics check',
      depthRank: 1,
      conceptKeys: [OPT, REG],
      body: {
        items: [
          {
            key: 'dropout',
            type: 'mcq',
            prompt: 'What does dropout do during training?',
            options: [
              {
                id: 'a',
                text: "Switches off random neurons at each step, so the network can't rely on any one",
              },
              { id: 'b', text: 'Removes the worst training examples' },
              { id: 'c', text: 'Lowers the learning rate when the loss stalls' },
              { id: 'd', text: 'Deletes neurons for good to make the model smaller' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'A new random set is dropped at every step, and at test time every neuron is on.',
          },
          {
            key: 'adam',
            type: 'mcq',
            prompt: 'What does Adam add to plain SGD?',
            options: [
              { id: 'a', text: 'Momentum, plus its own step size for each weight' },
              { id: 'b', text: 'A bigger batch size' },
              { id: 'c', text: 'Dropout between the layers' },
              { id: 'd', text: 'A way to skip the backward pass' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Adam keeps a running average of the gradients (momentum) and of their squares, which scales each step.',
          },
          {
            key: 'gap',
            type: 'mcq',
            prompt:
              'Training loss keeps falling, but validation loss has started to rise. What is the best move?',
            options: [
              {
                id: 'a',
                text: 'Stop and keep the model from the epoch with the lowest validation loss',
              },
              { id: 'b', text: 'Train for many more epochs' },
              { id: 'c', text: 'Raise the learning rate' },
              { id: 'd', text: 'Remove the validation set' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Rising validation loss means overfitting has begun. Early stopping keeps the best model.',
          },
          {
            key: 'batchnorm',
            type: 'mcq',
            prompt: 'Why add batch normalisation to a network?',
            options: [
              {
                id: 'a',
                text: "It rescales each layer's outputs, so training is faster and more stable",
              },
              { id: 'b', text: 'It switches off random neurons to fight overfitting' },
              { id: 'c', text: 'It sets a separate learning rate for each layer' },
              { id: 'd', text: 'It replaces the activation function' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Each batch is shifted and scaled to mean 0 and spread 1, then a learned scale and shift is applied.',
          },
        ],
      },
    },
    {
      key: 'playground.early-stop',
      kind: 'PLAYGROUND',
      title: 'Write early stopping',
      depthRank: 1,
      conceptKeys: [REG],
      body: {
        language: 'python',
        instructions:
          'Finish `best_epoch`. Walk through the validation losses, track the best so far, and stop once `patience` epochs in a row fail to beat it. Return the epoch of the best loss (epochs count from 0). The file should print `patience 3 -> 2` and `patience 5 -> 6`.',
        starterCode: STOP_START,
        hints: [
          'Keep three values: the best loss so far, its epoch, and how many epochs you have waited.',
          'If a loss beats the best, save it and reset the wait to 0. Otherwise add 1 to the wait.',
          'When the wait reaches `patience`, `break` and return the best epoch.',
        ],
        solution: STOP_SOLUTION,
        checks: [
          {
            type: 'stdout_contains',
            value: 'patience 3 -> 2',
            label: 'Stops early with patience 3',
          },
          {
            type: 'stdout_contains',
            value: 'patience 5 -> 6',
            label: 'Waits long enough with patience 5',
          },
        ],
      },
    },
    {
      key: 'slides.in-practice',
      kind: 'SLIDES',
      title: 'The training loop in practice',
      depthRank: 3,
      conceptKeys: [OPT, REG],
      body: {
        slides: [
          {
            kicker: 'The training loop · the code',
            title: 'Four lines run every step',
            visual: {
              type: 'code',
              code: 'import torch\nfrom torch import nn\nx = torch.tensor([[1.0], [2.0], [3.0], [4.0]])\ny = 2 * x + 1                     # the rule to learn\nmodel = nn.Linear(1, 1)           # one weight, one bias\nopt = torch.optim.SGD(model.parameters(), lr=0.05)\nloss_fn = nn.MSELoss()\nfor epoch in range(1000):\n    opt.zero_grad()               # 1. clear old gradients\n    loss = loss_fn(model(x), y)   # 2. forward pass and loss\n    loss.backward()               # 3. gradients, by autograd\n    opt.step()                    # 4. update the weights\nw, b = model.weight.item(), model.bias.item()\nprint(round(w, 2), round(b, 2))   # 2.0 1.0',
            },
            note: 'It learns y = 2x + 1, and autograd finds the gradients for you.',
            narration:
              'Here is a full training loop in PyTorch. The tensors x and y hold four examples of the rule y equals 2 x plus 1. The model is one linear layer, with one weight and one bias. The optimizer is SGD with a learning rate of 0.05, and the loss is the mean squared error. Inside the loop, four lines run every step: clear the old gradients, run the forward pass and the loss, call backward to fill the gradients, and step to update the weights. After training it prints 2.0 and 1.0, the rule it was meant to learn.',
          },
          {
            kicker: 'Each line, one job',
            title: 'What each line does',
            body: 'Forget one line and training breaks quietly, with no error message. Interviewers often ask what each line is for.',
            points: [
              '`zero_grad()`: PyTorch adds new gradients to the old ones, so clear them every step',
              '`backward()`: autograd fills `.grad` for every weight, using the chain rule',
              '`step()`: the optimizer moves each weight using its `.grad`',
              '`model.train()` for training; `model.eval()` with `torch.no_grad()` for validation',
            ],
          },
          {
            kicker: 'Choosing settings',
            title: 'Pick the optimizer and learning rate',
            body: 'There is no perfect value to look up. Start from a safe default, then test a few values for a few epochs each.',
            points: [
              'Start with **Adam** at 0.001; it needs little tuning',
              '**SGD with momentum** (0.9) at 0.01 to 0.1 sometimes generalises better, for example on CNNs',
              'Try learning rates 10 times apart, like 0.1, 0.01 and 0.001; keep the fastest steady one',
              'Then add a schedule that lowers the rate later in training',
            ],
          },
          {
            kicker: 'Try it',
            title: 'A missing zero_grad',
            try: {
              type: 'choice',
              prompt: 'You delete `opt.zero_grad()` from the loop. What happens when you train?',
              options: [
                {
                  text: 'Gradients pile up across steps, so the updates overshoot and the loss never settles',
                  correct: true,
                  feedback:
                    'Right. PyTorch adds each new gradient to the old ones. Without clearing, every step uses a growing sum.',
                },
                {
                  text: 'PyTorch raises an error',
                  correct: false,
                  feedback: 'It runs with no error, which is why this bug is easy to miss.',
                },
                {
                  text: 'Nothing changes, because step() clears them',
                  correct: false,
                  feedback:
                    'step() only updates the weights. Only zero_grad() clears the old gradients.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'slides.deeper',
      kind: 'SLIDES',
      title: 'Deeper training questions',
      depthRank: 3,
      conceptKeys: [OPT, GRAD, REG],
      body: {
        slides: [
          {
            kicker: 'Adam under the hood',
            title: 'Two running averages per weight',
            points: [
              '`m`: the average gradient, which is momentum',
              '`v`: the average squared gradient; dividing by √v evens out the scales',
              '**AdamW** applies weight decay straight to the weights, outside the √v step',
            ],
            visual: {
              type: 'code',
              code: 'import numpy as np\n\nm, v = 0.0, 0.0\n# a big lr, so the steps are easy to see\nb1, b2, lr, eps = 0.9, 0.999, 0.1, 1e-8\nw = 1.0\nfor t in range(1, 4):\n    g = 2 * w  # gradient of w**2\n    m = b1 * m + (1 - b1) * g\n    v = b2 * v + (1 - b2) * g**2\n    m_hat, v_hat = m / (1 - b1**t), v / (1 - b2**t)\n    w -= lr * m_hat / (np.sqrt(v_hat) + eps)\n    print(t, round(w, 3))',
              output: '1 0.9\n2 0.8\n3 0.702',
            },
            note: '`m_hat` and `v_hat` correct the early steps, when both averages start at 0. With steady gradients each step is about `lr`; noisy ones make it smaller.',
            narration:
              'Here is Adam updating a single weight. The variable m is the running average of the gradient, which is the momentum, and v is the running average of the squared gradient. The values m hat and v hat correct the early steps, because both averages start at 0. The weight w then moves by the learning rate times m hat, divided by the square root of v hat. It prints 0.9, then 0.8, then 0.702. Each step is about 0.1, the learning rate, because the gradients here are steady.',
          },
          {
            kicker: 'Learning-rate schedules · the story',
            title: 'Big steps first, small steps later',
            body: 'Parking, you drive in quickly, then creep the last metre. Schedules do the same: a high learning rate early, a low one late.',
            points: [
              '**Step decay** or **cosine**: shrink the rate over the epochs',
              '**Warm-up**: start small for the first steps; common for transformers',
              '**ReduceLROnPlateau**: lower it when the validation loss stalls',
            ],
          },
          {
            kicker: 'Vanishing gradients · the story',
            title: 'A whisper down a long line',
            body: 'Pass a whisper down a line of 20 people: almost nothing reaches the end. Gradients shrink the same way as they flow back through many sigmoid layers.',
            animation: {
              name: 'vanishing-gradient',
              caption: 'Real use: why deep nets use ReLU, good init and skip connections',
            },
          },
          {
            kicker: 'Vanishing gradients · the numbers',
            title: 'Multiply 0.25 ten times',
            body: "Sigmoid's slope is at most 0.25. Backprop multiplies one slope per layer, so 10 layers shrink it to about a millionth. The weights multiply in too, which is why initialisation matters.",
            points: [
              '**ReLU** activations: a slope of 1 for positive inputs',
              '**He or Xavier initialisation**, plus **batch norm**',
              '**Residual (skip) connections**, as in ResNet',
            ],
            visual: {
              type: 'code',
              code: '# 10 sigmoid layers, at best\nprint(f"{0.25 ** 10:.7f}")',
              output: '0.0000010',
            },
            narration:
              'This one line puts a number on the whisper story. The slope of sigmoid is at most 0.25, and backprop multiplies one slope for each layer. So for 10 layers, the code raises 0.25 to the power 10. It prints 0.0000010, which is about one millionth. Almost no learning signal reaches the first layers, and that is the vanishing gradient problem.',
          },
          {
            kicker: 'Exploding gradients · the story',
            title: 'The opposite problem',
            body: 'A microphone near its speaker squeals ever louder. If each layer multiplies the gradient by more than 1, it grows until the loss becomes NaN.',
            points: [
              'Clip: if the total gradient size passes 1.0, scale it down to 1.0',
              'Call `clip_grad_norm_` after `loss.backward()`, before `optimizer.step()`',
              'Lower the learning rate and check the initialisation',
            ],
            visual: {
              type: 'code',
              code: '# each of 10 layers multiplies by 1.5\nprint(round(1.5 ** 10, 1))',
              output: '57.7',
            },
            narration:
              'Now the opposite case, in one line. Suppose each of 10 layers multiplies the gradient by 1.5 instead of shrinking it. The code raises 1.5 to the power 10 and rounds the answer. It prints 57.7, so the gradient is almost 58 times bigger by the time it reaches the first layer. With more layers it keeps growing until the loss becomes NaN, which is why we clip gradients.',
          },
          {
            kicker: 'Debugging',
            title: "When the loss won't go down",
            body: "A mechanic whose car won't start checks the fuel and battery before opening the engine. Ticks are checks to run; crosses are classic bugs.",
            visual: {
              type: 'checklist',
              items: [
                { text: 'Overfit one small batch first: it should reach near-zero loss', ok: true },
                { text: 'Check inputs and labels line up, and normalise the inputs', ok: true },
                { text: 'Try the learning rate 10 times lower or higher', ok: true },
                {
                  text: 'Print gradient norms: tiny means vanishing; huge or NaN means exploding',
                  ok: true,
                },
                { text: 'Skip optimizer.zero_grad(), so gradients pile up', ok: false },
                {
                  text: 'Softmax or sigmoid before a loss that wants raw scores, like CrossEntropyLoss',
                  ok: false,
                },
              ],
            },
          },
          {
            kicker: 'train() vs eval()',
            title: 'Dropout and batch norm switch modes',
            body: 'At practice the team benches random players; in the real match, everyone plays. Dropout works the same way.',
            points: [
              "`model.train()`: dropout on; batch norm uses each batch's statistics and updates its averages",
              '`model.eval()`: dropout off; batch norm uses the saved running averages',
            ],
            note: 'Forgetting `model.eval()` makes test results noisy and batch-dependent. `torch.no_grad()` is separate: it only stops tracking gradients.',
          },
          {
            kicker: 'Batch norm, deeper',
            title: 'Batch norm vs layer norm',
            points: [
              'Batch norm normalises each feature (channel) across the batch',
              'It allows higher learning rates and cares less about initialisation',
              'Its batch-to-batch noise gives a slight regularising effect',
              '**Layer norm** works per example: fine with batch size 1, used in transformers',
            ],
          },
          {
            kicker: 'Try it',
            title: 'A deep sigmoid network',
            try: {
              type: 'choice',
              prompt:
                "A 30-layer network with sigmoid activations barely learns: the early layers' weights hardly change. What is the most likely cause?",
              options: [
                {
                  text: 'Vanishing gradients',
                  correct: true,
                  feedback:
                    'Right. Thirty small sigmoid slopes multiply into almost nothing. Try ReLU, batch norm or skip connections.',
                },
                {
                  text: 'The learning rate is too low',
                  correct: false,
                  feedback:
                    'A low rate slows every layer, not just the early ones. Here the gradient fades on its way back.',
                },
                {
                  text: 'Dropout is turned off',
                  correct: false,
                  feedback:
                    'Dropout fights overfitting. Here the early layers are not learning at all.',
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
      title: 'Training depth check',
      depthRank: 3,
      conceptKeys: [OPT, REG, GRAD],
      body: {
        items: [
          {
            key: 'adam',
            type: 'mcq',
            prompt: 'In Adam, what does the running average of squared gradients (`v`) do?',
            options: [
              {
                id: 'a',
                text: "Divides each weight's step by its typical gradient size, so big and small gradients give similar steps",
              },
              { id: 'b', text: 'Adds momentum in the gradient direction' },
              { id: 'c', text: 'Drops random neurons' },
              { id: 'd', text: 'Decides when to stop training' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'The step is lr × m_hat / √v_hat. A big gradient is divided by a big √v, a small one by a small √v, so each weight moves about lr. `m` is the momentum part.',
          },
          {
            key: 'vanish',
            type: 'predict_output',
            prompt:
              'Three sigmoid layers, each with its largest possible slope. Ignoring the weights, what fraction of the gradient survives?',
            language: 'python',
            code: 'print(0.25 ** 3)',
            options: [
              { id: 'a', text: '0.015625' },
              { id: 'b', text: '0.75' },
              { id: 'c', text: '0.25' },
              { id: 'd', text: '0.0625' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Backprop multiplies one slope per layer: 0.25 × 0.25 × 0.25 = 0.015625. Deeper networks shrink it further.',
          },
          {
            key: 'eval-mode',
            type: 'mcq',
            prompt:
              'Your test accuracy changes every time you run it on the same data. What did you most likely forget?',
            options: [
              { id: 'a', text: '`model.eval()`, so dropout is still switching neurons off' },
              { id: 'b', text: '`optimizer.step()`' },
              { id: 'c', text: 'To shuffle the test data' },
              { id: 'd', text: 'To add more layers' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'In training mode, dropout is random and batch norm uses each batch. `model.eval()` makes testing repeatable.',
          },
          {
            key: 'gap',
            type: 'mcq',
            prompt:
              'Training loss keeps falling, but validation loss has started to rise. What is the best move?',
            options: [
              {
                id: 'a',
                text: 'Stop and keep the model from the epoch with the lowest validation loss',
              },
              { id: 'b', text: 'Train for many more epochs' },
              { id: 'c', text: 'Raise the learning rate' },
              { id: 'd', text: 'Remove the validation set' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Rising validation loss means overfitting has begun. Early stopping keeps the best model.',
          },
          {
            key: 'debug',
            type: 'reasoning',
            prompt:
              'The interviewer asks: *"Your training loss won\'t go down. How do you debug it?"* Answer in four or five sentences.',
            modelAnswer:
              'First I check the data: inputs and labels line up, and the inputs are normalised. Then I try to overfit one small batch. If even that fails, the bug is in the model, the loss or the training step.\n\nNext I check the training step: `optimizer.zero_grad()` every step, a loss that fits the output layer, and no zero or NaN gradients. Finally I tune the learning rate by factors of 10. If gradients vanish or explode, I use ReLU, batch norm or gradient clipping.',
            rubric: [
              'Checks the data and normalisation first',
              'Overfits a small batch as a sanity check',
              'Checks zero_grad, the loss choice and the gradients',
              'Tunes the learning rate; mentions vanishing or exploding gradients',
            ],
          },
        ],
      },
    },
    {
      key: 'interview.overfitting',
      kind: 'INTERVIEW_PLAYBOOK',
      title: 'Overfitting answer structure',
      depthRank: 1,
      conceptKeys: [REG],
      body: {
        question: '"How do you handle overfitting in a deep network?"',
        totalMinutes: 2,
        steps: [
          {
            title: 'Spot it',
            detail: 'Training keeps improving while validation stalls or gets worse.',
          },
          {
            title: 'More data',
            detail:
              'Collect more, or augment with shifts, crops and rotations that keep the label true.',
          },
          {
            title: 'Dropout',
            detail: 'Switch off random neurons during training; all are on at test time.',
          },
          { title: 'Weight decay', detail: 'An L2 penalty keeps the weights small.' },
          {
            title: 'Early stopping',
            detail: 'Stop at the lowest validation loss and keep that model.',
          },
          { title: 'Simpler model', detail: 'Fewer layers or neurons if the data is small.' },
        ],
        followUps: [
          'What does dropout do at test time?',
          'Why does batch norm help training?',
          'How does Adam differ from SGD?',
          'What happens if the learning rate is too high?',
          'What is data augmentation?',
          'What is the difference between overfitting and underfitting?',
        ],
      },
    },
    {
      key: 'interview-questions',
      kind: 'CARD_DECK',
      title: 'Interview questions and answers',
      depthRank: 1,
      conceptKeys: [OPT, REG, GRAD],
      body: {
        layout: 'flip',
        cards: [
          {
            title: 'Overfitting or underfitting',
            front:
              'A stop-sign model scores 99% on its training track but 62% on a new street. What is wrong, and what do the loss curves show?',
            back: 'That is overfitting: the model memorised its training data. On the curves, training loss keeps falling while validation loss stalls or rises. Underfitting looks different: both losses stay high and close. Fix overfitting with more data and regularisation; fix underfitting with a bigger model or longer training.',
          },
          {
            title: 'Regularisation techniques',
            front: 'Which regularisation techniques do you use in neural networks?',
            back: 'Dropout switches off random neurons in training, so the network cannot rely on one; it is off at test time. Weight decay (L2) keeps weights small. Early stopping keeps the model with the lowest validation loss. Augmentation adds shifted or cropped copies that keep the label true.',
          },
          {
            title: 'Batch norm at inference',
            front: 'What does batch normalisation do, and how does it behave at inference time?',
            back: 'In training, batch norm rescales each feature to mean 0 and spread 1 using the batch. Then it applies a learned scale and shift. It also keeps a running mean and spread. After `model.eval()`, it uses those, so one image gets the same answer in any batch. It mainly speeds up training.',
          },
          {
            title: 'Adam vs SGD',
            front: 'How does Adam update the weights, and how is it different from SGD?',
            back: 'SGD moves every weight by one learning rate times its gradient. Adam keeps two running averages per weight: the gradient, which acts as momentum, and the squared gradient. Dividing the first by the square root of the second gives each weight its own step size. Bias correction fixes the early steps.',
          },
          {
            title: 'Choosing a learning rate',
            front: 'How do you choose an optimizer and learning rate?',
            back: 'I start with Adam at 0.001, the usual default. Then I try learning rates 10 times apart for a few epochs. If the loss bounces or turns NaN, the rate is too high; if it crawls, too low. Later a schedule shrinks it. Well-tuned SGD with momentum sometimes generalises better.',
          },
          {
            title: 'Loss will not go down',
            front: 'Your training loss will not go down. How do you debug it?',
            back: 'First I check the data: inputs and labels line up, and inputs are normalised. Then I try to overfit one small batch; if that fails, the bug is in the model, loss or training step. I check `zero_grad()` runs every step, then tune the learning rate by factors of 10.',
          },
          {
            title: 'Vanishing and exploding gradients',
            front: 'What are vanishing and exploding gradients, and how do you fix each?',
            back: 'Backprop multiplies one factor per layer. Factors below 1, like sigmoid slopes of at most 0.25, make the gradient vanish, so early layers stop learning. Fix: ReLU, good initialisation, batch norm or skip connections. Factors above 1 make it explode until the loss is NaN: clip gradients and lower the learning rate.',
          },
          {
            title: 'The PyTorch training loop',
            front: 'Walk me through a PyTorch training loop. What does each line do?',
            back: "For each batch, `optimizer.zero_grad()` clears old gradients, since PyTorch adds new ones to them. The forward pass predicts and the loss scores it. `loss.backward()` fills each weight's `.grad`, and `optimizer.step()` updates the weights. For validation, use `model.eval()` and `torch.no_grad()`.",
          },
          {
            title: 'TensorFlow and PyTorch',
            front: 'What is TensorFlow, and how does it compare with PyTorch?',
            back: 'Both are open-source deep learning libraries: they build networks, compute gradients for you and run on GPUs. TensorFlow, from Google, is often used through Keras and has strong tools for serving and phones. PyTorch feels like plain Python and leads in research and new models. Use what your team uses.',
          },
        ],
      },
    },
    {
      key: 'summary.basic',
      slotKey: 'summary',
      kind: 'SUMMARY',
      title: 'Training key takeaways',
      depthRank: 1,
      conceptKeys: [OPT, REG],
      body: {
        takeaways: [
          'Gradient descent steps downhill on the loss; the learning rate sets the step size.',
          'Momentum remembers past steps; Adam adds a step size per weight.',
          'Overfitting shows as a gap: training improves while validation gets worse.',
          'Dropout, augmentation, weight decay and early stopping fight overfitting.',
          'Batch norm rescales layer outputs, so training is faster and steadier.',
        ],
        remember: ['Loss jumping around: lower the learning rate', 'Validation rising: stop early'],
      },
    },
    {
      key: 'summary.advanced',
      slotKey: 'summary',
      kind: 'SUMMARY',
      title: 'Training key takeaways',
      depthRank: 3,
      conceptKeys: [OPT, REG, GRAD],
      body: {
        takeaways: [
          'The learning rate is the first knob: too high bounces, too low crawls; schedules shrink it.',
          'Adam keeps an average gradient (momentum) and an average squared gradient (step scale).',
          'Dropout, augmentation, weight decay and early stopping fight overfitting.',
          'Sigmoid gradients vanish over many layers; ReLU, good init, batch norm and skips help.',
          'Exploding gradients turn the loss to NaN; clip them and lower the learning rate.',
          'model.train() and model.eval() switch dropout and batch norm between modes.',
        ],
        remember: ['Stuck loss: overfit one batch first', 'Testing: always model.eval()'],
      },
    },
  ],
};
