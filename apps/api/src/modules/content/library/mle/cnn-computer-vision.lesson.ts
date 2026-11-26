/**
 * Deep Learning → CNNs and computer vision.
 *
 * Evidence (Hiring Intelligence, ML/AI families, Jan–Oct 2026; internal only, never quoted to
 * students): about 55 computer-vision questions. Under 8 LPA: "what is a CNN and how does it
 * work", "draw and explain its architecture, layer by layer", the dropout layer in a CNN, how
 * many layers to use, classification vs detection, "how does YOLO work" and why it beats older
 * detectors, real-world uses of computer vision. 8+ LPA adds "how does a convolution layer work
 * and why filters", IoU, NMS, IoU vs confidence thresholds, YOLO internals and object tracking.
 * 3–6 LPA teaches this at depth 1 (convolution, pooling, the architecture, transfer learning, IoU
 * and YOLO's idea, an IoU playground); 8–12 LPA at depth 3 adds NMS with code, thresholds,
 * one- vs two-stage detectors, tracking and classic architectures. Every concept opens on a
 * short real-world story with a moving picture, then the code. Every code output is checked by
 * running it with Python 3.14 and NumPy, as in the in-browser runner.
 */
import type { LessonDocumentInput } from '@app/content';

const CONV = 'cv.convolution';
const TRANSFER = 'cv.transfer-learning';
const DETECT = 'cv.object-detection';

const FILTERS: Record<string, { name: string; kernel: string }> = {
  vertical: { name: 'vertical edge', kernel: 'np.array([[1, 0, -1]] * 3)' },
  horizontal: { name: 'horizontal edge', kernel: 'np.array([[1, 1, 1], [0, 0, 0], [-1, -1, -1]])' },
  blur: { name: 'blur', kernel: 'np.ones((3, 3)) / 9' },
};
const FILTER_CODE = (key: string) => `import numpy as np

# bright left, dark right
img = np.array([[1, 1, 1, 0, 0]] * 5)
# ${FILTERS[key]?.name ?? ''}
k = ${FILTERS[key]?.kernel ?? ''}

out = np.array([[np.sum(img[r:r+3, c:c+3] * k)
                 for c in range(3)] for r in range(3)])
print(np.round(out, 2))
`;

const IOU_START = `def iou(a, b):
    # boxes are (x1, y1, x2, y2)
    # 1. width and height of the
    #    overlap (0 if none)
    # 2. overlap = width * height
    # 3. union = area(a) + area(b)
    #           - overlap
    return 0.0


truth = (40, 30, 160, 120)
a = (80, 50, 200, 140)
b = (50, 36, 170, 126)
far = (200, 200, 250, 250)
print(round(iou(truth, a), 2))
print(round(iou(truth, b), 2))
print("no overlap:", float(iou(truth, far)))
`;

const IOU_SOLUTION = `def iou(a, b):
    w = max(0, min(a[2], b[2]) - max(a[0], b[0]))
    h = max(0, min(a[3], b[3]) - max(a[1], b[1]))
    overlap = w * h

    def area(r):
        return (r[2] - r[0]) * (r[3] - r[1])

    return overlap / (area(a) + area(b) - overlap)


truth = (40, 30, 160, 120)
a = (80, 50, 200, 140)
b = (50, 36, 170, 126)
far = (200, 200, 250, 250)
print(round(iou(truth, a), 2))
print(round(iou(truth, b), 2))
print("no overlap:", float(iou(truth, far)))
`;

export const CNN_COMPUTER_VISION_LESSON: LessonDocumentInput = {
  title: 'CNNs and computer vision',
  subtitle:
    'How a CNN sees, how transfer learning saves you months, and how detectors draw and grade boxes, one story at a time.',
  objectives: [
    {
      key: 'cnn',
      text: 'Explain convolution, filters, stride, padding and pooling, and the layers of a CNN',
      minDepthRank: 1,
    },
    {
      key: 'transfer',
      text: 'Explain transfer learning: feature extraction vs fine-tuning',
      minDepthRank: 1,
    },
    {
      key: 'detection',
      text: 'Tell classification from detection, and explain IoU and the idea behind YOLO',
      minDepthRank: 1,
    },
    {
      key: 'detection-deep',
      text: 'Explain NMS, IoU vs confidence thresholds, one- vs two-stage detectors and tracking',
      minDepthRank: 3,
    },
  ],
  sections: [
    {
      key: 'hook',
      kind: 'HOOK',
      title: 'Computer vision in everyday apps',
      depthRank: 1,
      conceptKeys: [CONV],
      body: {
        scenario:
          'Point your phone at a friend and a box appears around their face before you tap the button. Traffic cameras read number plates as cars pass. A farmer photographs a leaf and an app names the disease. All three usually run on **convolutional neural networks (CNNs)**.',
        animation: {
          name: 'feature-hierarchy',
          caption: 'Early layers see edges; deeper layers see objects',
        },
        realWorld: {
          title: 'Where you see CNNs',
          items: [
            { icon: 'camera', label: 'Face boxes', sub: 'Found while you frame a photo' },
            {
              icon: 'car',
              label: 'Number plates',
              sub: 'Read at parking gates and by traffic cameras',
            },
            { icon: 'image', label: 'Leaf disease', sub: 'Named from a single photo' },
            { icon: 'eye', label: 'Medical scans', sub: 'Spots flagged for a doctor to check' },
          ],
        },
        provocation: 'How does a network find a face anywhere in the frame?',
        bridge:
          '"Explain the architecture of a CNN" and "how does a convolution layer work?" are common technical-round questions. Detection follow-ups, like IoU and YOLO, come next.',
      },
    },
    {
      key: 'slides.cnn',
      kind: 'SLIDES',
      title: 'How a CNN sees',
      depthRank: 1,
      conceptKeys: [CONV],
      body: {
        slides: [
          {
            kicker: 'Why not dense',
            title: "Dense layers don't fit images",
            body: 'A 224 × 224 colour photo is 150,528 numbers. A dense layer of just 1,000 neurons would need over 150 million weights. It would also ignore that nearby pixels belong together.',
            visual: {
              type: 'stat',
              value: '150 million',
              label: 'weights for one dense layer on a small photo',
              sub: '150,528 inputs × 1,000 neurons',
            },
          },
          {
            kicker: 'Convolution · the story',
            title: 'A magnifying glass sliding over a page',
            body: 'To find every "the" on a page, you slide a magnifying glass along each line, looking for one pattern. A filter does the same over an image, with the same few weights everywhere.',
            animation: {
              name: 'conv-filter',
              caption: 'Real use: edge, texture and shape detectors, all learned',
            },
          },
          {
            kicker: 'Convolution · the code',
            title: 'Slide, multiply, add',
            visual: {
              type: 'code',
              code: 'import numpy as np\n\n# bright left, dark right\nimg = np.array([[1, 1, 1, 0, 0]] * 5)\n# vertical-edge filter\nk = np.array([[1, 0, -1]] * 3)\n\nout = np.zeros((3, 3), dtype=int)\nfor r in range(3):\n    for c in range(3):\n        out[r, c] = np.sum(img[r:r+3, c:c+3] * k)\nprint(out)',
              output: '[[0 3 3]\n [0 3 3]\n [0 3 3]]',
            },
            note: 'The 3s mark where bright meets dark: the filter found the edge. Its 9 weights are reused at every position.',
            narration:
              'Here is the sliding magnifying glass in code. The array img is a 5 by 5 image, bright on the left with 1s and dark on the right with 0s. The array k is a 3 by 3 vertical edge filter. The two loops slide the filter over every position, multiply it with the patch of image under it, and add everything up into the array out. It prints a 3 by 3 grid where every row is 0, 3, 3. The 3s appear where bright meets dark, so the filter found the edge, using the same 9 weights at every position.',
          },
          {
            kicker: 'Many filters',
            title: 'Each filter makes its own feature map',
            body: 'A layer learns many filters, say 64: edges, corners, textures. Each one makes its own feature map. On a colour image a 3 × 3 filter is really 3 × 3 × 3, one slice per channel.',
            visual: {
              type: 'stat',
              value: '1,792',
              label: 'parameters in a layer of 64 filters, 3 × 3, on RGB',
              sub: '3 × 3 × 3 × 64 weights + 64 biases, against 150 million',
            },
          },
          {
            kicker: 'Stride and padding',
            title: 'Size in, size out',
            points: [
              '**Stride**: how far the filter moves each step',
              '**Padding**: a border of zeros, so the size can stay the same and edge pixels are used more',
              'Output size = ⌊(n + 2p − k) / s⌋ + 1, rounding down',
            ],
            visual: {
              type: 'code',
              code: "def out_size(n, k, p=0, s=1):\n    return (n + 2 * p - k) // s + 1\n\n# our 5 x 5 example\nprint(out_size(5, 3))\n# padding 1 keeps a 3 x 3 filter's size\nprint(out_size(32, 3, p=1))\n# stride 2 halves it\nprint(out_size(32, 3, p=1, s=2))",
              output: '3\n32\n16',
            },
            narration:
              'This small function turns the output size formula into code. The function out size takes n, the input size, k, the filter size, p, the padding, and s, the stride. For our 5 by 5 image and a 3 by 3 filter, it prints 3. For a 32 pixel image, a padding of 1 keeps the size at 32. With a stride of 2 as well, it prints 16, because the filter jumps 2 pixels at a time, so the size is halved.',
          },
          {
            kicker: 'Pooling · the story',
            title: 'Keep the strongest signal',
            body: 'A topper list keeps only the best score in each section. Max pooling keeps the largest value in each small window, so the map shrinks but the strongest signals stay.',
            animation: {
              name: 'max-pool',
              caption: 'Real use: halves the size after a conv block',
            },
          },
          {
            kicker: 'The architecture',
            title: 'Conv, pool, repeat, then decide',
            animation: { name: 'cnn-pipeline', caption: 'The shape behind most image classifiers' },
            points: [
              'Convolution + ReLU find patterns (often with batch norm); pooling shrinks the maps',
              'Flatten, then dense layers and softmax give the class scores',
              "**Dropout** between the dense layers switches off random neurons in training, so the head can't lean on one",
              'How many layers? Start from a proven design, and go deeper only while validation improves',
            ],
            note: 'Conv layers share their weights and usually use batch norm rather than dropout.',
          },
          {
            kicker: 'The architecture · the code',
            title: 'A small CNN in PyTorch',
            visual: {
              type: 'code',
              code: 'import torch\nfrom torch import nn\nmodel = nn.Sequential(\n    nn.Conv2d(3, 16, 3, padding=1), nn.ReLU(),   # 16 x 32 x 32\n    nn.MaxPool2d(2),                             # 16 x 16 x 16\n    nn.Conv2d(16, 32, 3, padding=1), nn.ReLU(),  # 32 x 16 x 16\n    nn.MaxPool2d(2),                             # 32 x 8 x 8\n    nn.Flatten(), nn.Dropout(0.5),               # 2,048 numbers\n    nn.Linear(32 * 8 * 8, 10),                   # 10 class scores\n)\nx = torch.randn(1, 3, 32, 32)    # one 32 x 32 colour image\nprint(model(x).shape)            # torch.Size([1, 10])\nprint(sum(p.numel() for p in model.parameters()))  # 25578',
            },
            note: 'Padding 1 keeps the size and each pooling halves it, so Flatten gives 32 × 8 × 8 = 2,048 numbers.',
            narration:
              'Here is the conv, pool, repeat recipe as a PyTorch model for 32 by 32 colour images, the size used in CIFAR-10. The first convolution turns 3 colour channels into 16 feature maps, and padding 1 keeps them 32 by 32. Max pooling halves them to 16 by 16. The second convolution makes 32 maps, and pooling halves them again to 8 by 8. Flatten lines up 32 times 8 times 8, which is 2,048 numbers, and dropout guards the head. The linear layer gives 10 class scores, so the output shape is 1 by 10. The model has 25,578 parameters.',
          },
          {
            kicker: 'Try it',
            title: 'Work out the output size',
            try: {
              type: 'choice',
              prompt:
                'A 28 × 28 image goes through a 5 × 5 filter with stride 1 and no padding. What size is the output?',
              options: [
                { text: '24 × 24', correct: true, feedback: 'Right: (28 − 5) / 1 + 1 = 24.' },
                {
                  text: '28 × 28',
                  correct: false,
                  feedback: 'Keeping 28 × 28 needs a padding of 2 on each side.',
                },
                {
                  text: '23 × 23',
                  correct: false,
                  feedback: 'Remember the + 1: (28 − 5) + 1 = 24.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'explorer.filters',
      kind: 'CODE_EXPLORER',
      title: 'Try three filters',
      depthRank: 1,
      conceptKeys: [CONV],
      body: {
        prompt:
          'The image is bright on the left and dark on the right. Swap the filter and see what each one picks up.',
        packages: ['numpy'],
        controls: [
          {
            id: 'filter',
            label: 'Filter',
            options: [
              { value: 'vertical', label: 'Vertical edge' },
              { value: 'horizontal', label: 'Horizontal edge' },
              { value: 'blur', label: 'Blur' },
            ],
          },
        ],
        states: [
          {
            when: { filter: 'vertical' },
            code: FILTER_CODE('vertical'),
            output: { kind: 'text', value: '[[0 3 3]\n [0 3 3]\n [0 3 3]]\n' },
            verdict: {
              tone: 'ok',
              text: 'It fires where bright changes to dark from left to right: the vertical edge in the middle.',
            },
          },
          {
            when: { filter: 'horizontal' },
            code: FILTER_CODE('horizontal'),
            output: { kind: 'text', value: '[[0 0 0]\n [0 0 0]\n [0 0 0]]\n' },
            verdict: {
              tone: 'info',
              text: 'All zeros: nothing changes from top to bottom, so there is no horizontal edge to find.',
            },
          },
          {
            when: { filter: 'blur' },
            code: FILTER_CODE('blur'),
            output: {
              kind: 'text',
              value: '[[1.   0.67 0.33]\n [1.   0.67 0.33]\n [1.   0.67 0.33]]\n',
            },
            verdict: {
              tone: 'info',
              text: 'Each output is the average of a 3 × 3 window, so the sharp edge becomes a smooth fade.',
            },
          },
        ],
        defaultState: { filter: 'vertical' },
      },
    },
    {
      key: 'slides.transfer',
      kind: 'SLIDES',
      title: 'Transfer learning',
      depthRank: 1,
      conceptKeys: [TRANSFER],
      body: {
        slides: [
          {
            kicker: 'Transfer learning · the story',
            title: 'A trained chef learns a new cuisine fast',
            body: 'A chef who already knows knife skills and spices learns a new cuisine in weeks, not years. A network trained on millions of photos already knows edges, textures and shapes. You reuse that and teach only the new part.',
            animation: {
              name: 'transfer-learning',
              caption: 'Real use: most vision projects start from a pretrained model',
            },
          },
          {
            kicker: 'Transfer learning · the code',
            title: 'Freeze the backbone, add a new head',
            visual: {
              type: 'code',
              code: 'import torch.nn as nn\nfrom torchvision import models\n\n# pretrained on ImageNet\nmodel = models.resnet18(weights="IMAGENET1K_V1")\n# freeze every layer\nfor p in model.parameters():\n    p.requires_grad = False\n# a new head for 3 classes\nmodel.fc = nn.Linear(model.fc.in_features, 3)',
            },
            note: 'Only the new head trains. With more data, unfreeze the last block too and use a small learning rate.',
            narration:
              'Here is the chef story in PyTorch. First we load resnet18, a model already trained on the ImageNet photos. The loop goes through every parameter and sets requires grad to False, which freezes those layers so they will not change. Then the last layer, called fc, is replaced with a new linear layer that gives 3 outputs, one for each of our classes. Nothing is printed here, but when you train, only this new head learns. With more data, you can also unfreeze the last block and use a small learning rate.',
          },
          {
            kicker: 'Which one',
            title: 'Feature extraction or fine-tuning',
            visual: {
              type: 'compare',
              left: {
                title: 'Feature extraction',
                items: ['Freeze the backbone, train the head', 'Small dataset, similar images'],
              },
              right: {
                title: 'Fine-tuning',
                items: ['Also unfreeze the top layers', 'More data, or quite different images'],
              },
              better: 'none',
            },
          },
          {
            kicker: 'Try it',
            title: 'Five hundred leaf photos',
            try: {
              type: 'choice',
              prompt: 'You have 500 leaf photos in 3 classes. What is the best start?',
              options: [
                {
                  text: 'A pretrained CNN with a new 3-class head',
                  correct: true,
                  feedback:
                    'Right. 500 photos are too few to learn edges and shapes from scratch, so reuse a network that already knows them. Add augmentation, like flips and crops, too.',
                },
                {
                  text: 'Train a large CNN from scratch',
                  correct: false,
                  feedback: 'With 500 photos a big network from scratch would overfit badly.',
                },
                {
                  text: 'A dense network on the raw pixels',
                  correct: false,
                  feedback:
                    'Dense layers need huge numbers of weights for images and ignore which pixels are neighbours.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'slides.detection',
      kind: 'SLIDES',
      title: 'From classifying to detecting',
      depthRank: 1,
      conceptKeys: [DETECT],
      body: {
        slides: [
          {
            kicker: 'Classification vs detection',
            title: 'What is in it, or where is each one',
            body: 'Classification answers "is there a dog in this photo?". Detection answers "where is each dog?", with a box and a label for every one.',
            visual: {
              type: 'compare',
              left: { title: 'Classification', items: ['One label per image', '"dog: 0.97"'] },
              right: {
                title: 'Detection',
                items: ['A box and label per object', '"dog 0.94 at (40, 30, 160, 120)"'],
              },
              better: 'none',
            },
          },
          {
            kicker: 'IoU · the story',
            title: 'How well does the box fit',
            body: 'Two friends each circle the same person in a group photo. The more their circles overlap, the more they agree. IoU scores a predicted box against the true box the same way: shared area ÷ total area, from 0 to 1.',
            animation: {
              name: 'iou-boxes',
              caption: 'Real use: a detection usually counts as correct at IoU 0.5 or more',
            },
          },
          {
            kicker: 'IoU · the steps',
            title: 'Overlap divided by union',
            points: [
              "Overlap: the shared rectangle's width × height",
              'Union: area A + area B − overlap',
              'IoU = overlap ÷ union',
            ],
            note: 'You will write this function in the playground below.',
          },
          {
            kicker: 'YOLO · the story',
            title: 'Look once, find everything',
            body: 'A fielding captain glances once at the whole ground and knows where everyone stands. YOLO ("You Only Look Once") looks at the whole image once. The grid cell holding an object\'s centre predicts its box, score and class.',
            visual: {
              type: 'flow',
              steps: [
                { label: 'Image', icon: 'image' },
                { label: 'Grid of cells', icon: 'layers' },
                { label: 'Boxes and scores per cell', icon: 'target' },
                { label: 'Keep the best boxes', icon: 'check' },
              ],
            },
            note: 'The last step drops low-score boxes, then removes duplicates with non-maximum suppression (NMS). It is fast enough for live video.',
          },
          {
            kicker: 'Try it',
            title: 'Hit or miss',
            try: {
              type: 'choice',
              prompt:
                'A predicted box and the true box share 30 units of area, and together cover 100. What is the IoU, and is it a hit at the usual 0.5?',
              options: [
                {
                  text: '0.3, a miss',
                  correct: true,
                  feedback: 'Right: 30 ÷ 100 = 0.3, below 0.5.',
                },
                {
                  text: '0.3, a hit',
                  correct: false,
                  feedback: '0.3 is below the 0.5 threshold, so it counts as a miss.',
                },
                {
                  text: '0.7, a hit',
                  correct: false,
                  feedback: 'IoU is overlap ÷ union: 30 ÷ 100 = 0.3, not 70 ÷ 100.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'playground.iou',
      kind: 'PLAYGROUND',
      title: 'Write the IoU function',
      depthRank: 1,
      conceptKeys: [DETECT],
      body: {
        language: 'python',
        instructions:
          'Finish `iou(a, b)` for boxes given as `(x1, y1, x2, y2)`. The file should print `0.35` and `0.75` (the two boxes from the animation) and `no overlap: 0.0`.',
        starterCode: IOU_START,
        hints: [
          'Overlap width: `max(0, min(a[2], b[2]) - max(a[0], b[0]))`. The height is the same with indexes 1 and 3.',
          'Area of a box: `(x2 - x1) * (y2 - y1)`.',
          'Return `overlap / (area(a) + area(b) - overlap)`.',
        ],
        solution: IOU_SOLUTION,
        checks: [
          { type: 'stdout_contains', value: '0.35', label: 'IoU of the first box is 0.35' },
          { type: 'stdout_contains', value: '0.75', label: 'IoU of the closer box is 0.75' },
          { type: 'stdout_contains', value: 'no overlap: 0.0', label: 'No overlap gives 0' },
        ],
      },
    },
    {
      key: 'check.basics',
      slotKey: 'check',
      kind: 'KNOWLEDGE_CHECK',
      title: 'CNN and vision check',
      depthRank: 1,
      conceptKeys: [CONV, TRANSFER, DETECT],
      body: {
        items: [
          {
            key: 'size',
            type: 'mcq',
            prompt:
              'A 32 × 32 image, a 3 × 3 filter, stride 1, no padding. What is the output size?',
            options: [
              { id: 'a', text: '30 × 30' },
              { id: 'b', text: '32 × 32' },
              { id: 'c', text: '29 × 29' },
              { id: 'd', text: '16 × 16' },
            ],
            answer: { correct: ['a'] },
            explanation: '(32 − 3) / 1 + 1 = 30. With padding 1 it would stay 32 × 32.',
          },
          {
            key: 'pool',
            type: 'mcq',
            prompt: 'Max pooling with a 2 × 2 window on the block [[1, 5], [3, 2]] gives what?',
            options: [
              { id: 'a', text: '5' },
              { id: 'b', text: '2.75' },
              { id: 'c', text: '1' },
              { id: 'd', text: '11' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Max pooling keeps the largest value in the window. Average pooling would give 2.75.',
          },
          {
            key: 'why-conv',
            type: 'mcq',
            prompt: 'Why do CNNs use convolution layers for images instead of dense layers?',
            options: [
              {
                id: 'a',
                text: 'A small filter reuses the same weights everywhere and looks at neighbouring pixels together',
              },
              { id: 'b', text: 'Convolution layers have more weights, so they learn more detail' },
              { id: 'c', text: 'Convolution needs no training' },
              { id: 'd', text: 'Convolution layers need no activation function' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Shared weights mean far fewer parameters, and a filter finds a pattern wherever it appears in the image.',
          },
          {
            key: 'transfer',
            type: 'mcq',
            prompt:
              'In transfer learning with a small dataset, which part do you usually train first?',
            options: [
              {
                id: 'a',
                text: 'Only a new final layer (the head), with the pretrained layers frozen',
              },
              { id: 'b', text: 'Every layer from random weights' },
              { id: 'c', text: 'Only the first convolution layer' },
              { id: 'd', text: 'Nothing: pretrained models need no training' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'The frozen backbone already knows edges and shapes. The new head learns your classes.',
          },
        ],
      },
    },
    {
      key: 'interview.cnn',
      kind: 'INTERVIEW_PLAYBOOK',
      title: 'CNN architecture answer structure',
      depthRank: 1,
      conceptKeys: [CONV],
      body: {
        question: '"Explain the architecture of a CNN."',
        totalMinutes: 2,
        steps: [
          {
            title: 'Input',
            detail: 'An image as a grid of pixel values, with 3 channels for colour.',
          },
          {
            title: 'Convolution',
            detail:
              'Small filters slide over the image to find edges, textures and shapes, with shared weights.',
          },
          {
            title: 'Activation',
            detail:
              'ReLU after each convolution adds non-linearity, so the network can learn complex patterns.',
          },
          {
            title: 'Pooling',
            detail: 'Max pooling shrinks the maps and keeps the strongest signals.',
          },
          {
            title: 'Stack',
            detail: 'Repeat conv and pool: deeper layers see bigger, more complex patterns.',
          },
          {
            title: 'Head',
            detail: 'Flatten, dense layers with dropout, and softmax for the class scores.',
          },
        ],
        followUps: [
          'Why use convolution instead of a dense layer?',
          'What do stride and padding do?',
          'What is the purpose of a dropout layer in a CNN?',
          'What is transfer learning?',
          'How is object detection different from classification?',
          'What is IoU?',
        ],
      },
    },
    {
      key: 'slides.deeper',
      kind: 'SLIDES',
      title: 'Deeper vision questions',
      depthRank: 3,
      conceptKeys: [DETECT, CONV],
      body: {
        slides: [
          {
            kicker: 'NMS · the story',
            title: 'One box per object',
            body: 'Five people report the same pothole on a city app. The city keeps the clearest report and drops the duplicates. NMS keeps the most confident box and deletes boxes that overlap it too much.',
            animation: {
              name: 'nms-boxes',
              caption: 'Real use: the last step of most detectors; some new ones skip it',
            },
          },
          {
            kicker: 'NMS · the code',
            title: 'Keep the best, drop its duplicates',
            visual: {
              type: 'code',
              code: 'def iou(a, b):\n    w = max(0, min(a[2], b[2]) - max(a[0], b[0]))\n    h = max(0, min(a[3], b[3]) - max(a[1], b[1]))\n    area = lambda r: (r[2] - r[0]) * (r[3] - r[1])\n    return w * h / (area(a) + area(b) - w * h)\ndef nms(boxes, scores, thr=0.5):\n    keep = []\n    for i in sorted(range(len(boxes)), key=lambda j: -scores[j]):\n        if all(iou(boxes[i], boxes[j]) <= thr for j in keep):\n            keep.append(i)\n    return keep\nboxes = [(36, 44, 154, 134), (48, 56, 158, 140),\n         (30, 52, 134, 138), (194, 54, 296, 136)]\nprint(nms(boxes, [0.92, 0.85, 0.78, 0.88]))',
              output: '[0, 3]',
            },
            note: 'Boxes 1 and 2 overlap box 0 with IoU 0.71 and 0.70, so they go. Box 3 is a different object.',
            narration:
              'Here is the pothole story as code. The function iou measures how much two boxes overlap, from 0 to 1. The function nms visits the boxes from the highest score to the lowest, and keeps a box only if its overlap with every box already kept is at most the threshold, 0.5. There are 4 boxes, with scores 0.92, 0.85, 0.78 and 0.88. It prints the list 0, 3. Boxes 1 and 2 overlap box 0 by about 0.7, so they are dropped as duplicates. Box 3 is a different object, so it stays.',
          },
          {
            kicker: 'Two thresholds',
            title: 'Confidence vs IoU threshold',
            visual: {
              type: 'compare',
              left: {
                title: 'Confidence threshold',
                items: ["Drops boxes the model isn't sure of", 'For example, keep scores ≥ 0.5'],
              },
              right: {
                title: 'IoU threshold',
                items: [
                  'In NMS: when two boxes are duplicates (often 0.45–0.7)',
                  'In evaluation: when a prediction is a hit (often 0.5)',
                ],
              },
              better: 'none',
            },
            note: "Can IoU replace confidence? No: IoU compares two boxes; confidence is the model's own score.",
          },
          {
            kicker: 'Thresholds in production',
            title: 'Tuning thresholds without retraining',
            body: 'You often cannot retrain a deployed detector, but you can move its thresholds. Check the raw boxes first.',
            points: [
              '**Confidence up**: fewer false alarms, more missed objects; down, the reverse',
              '**NMS IoU down**: fewer duplicates, but a close neighbour may be removed',
              '**NMS IoU up**: close objects survive, but duplicates return',
              '**Evaluation IoU**: 0.5 is usual; 0.8 marks loose but correct boxes as false positives',
            ],
            note: 'Change one knob at a time, then re-check precision and recall.',
          },
          {
            kicker: 'Try it',
            title: 'False positives on helmets',
            try: {
              type: 'choice',
              prompt:
                'A helmet detector finds every helmet, yet many boxes count as false positives at confidence 0.6 and IoU 0.8. Without retraining, what do you change first?',
              options: [
                {
                  text: 'Lower the IoU threshold to about 0.5',
                  correct: true,
                  feedback:
                    'Right. At 0.8, loose but correct boxes fail the match, and NMS keeps near-duplicates. Both become false positives.',
                },
                {
                  text: 'Raise confidence to 0.9',
                  correct: false,
                  feedback:
                    'Scores are fine: every helmet is found. Raising it drops real helmets too.',
                },
                {
                  text: 'Lower confidence to 0.3',
                  correct: false,
                  feedback: 'More low-score boxes get in, so false positives rise.',
                },
              ],
            },
          },
          {
            kicker: 'Detectors',
            title: 'One stage or two',
            points: [
              '**One-stage** (YOLO, SSD): one pass for boxes and classes; fast',
              '**Two-stage** (Faster R-CNN): propose, then classify and refine; slower, often better on small objects',
              'In YOLOv1, each of 7 × 7 cells outputs 2 boxes (x, y, w, h, confidence) and 20 class scores: 30 numbers',
              '**Anchors** are preset box shapes each cell adjusts; newer YOLOs (v8 onwards) predict boxes without them',
            ],
          },
          {
            kicker: 'Tracking · the story',
            title: 'Detection finds; tracking follows',
            body: 'A commentator keeps naming the same fielder as he runs. YOLO finds the cars in each frame; a tracker gives each car one ID across frames.',
            points: [
              'Counting people or cars needs IDs, not just boxes',
              'SORT predicts where each box moves next (a Kalman filter), then matches by IoU; DeepSORT also compares appearance',
            ],
          },
          {
            kicker: 'Scoring a detector',
            title: 'From IoU to mAP',
            body: "An exam marks right and wrong answers. A detector's report card counts correct boxes and false alarms at every confidence level.",
            points: [
              'A prediction is a hit if it matches a true box at IoU 0.5 or more',
              'Sweep the confidence: precision and recall at each level',
              'The area under that curve is AP; the mean over classes is mAP',
              'mAP@0.5 uses one IoU; mAP@0.5:0.95 averages ten, from 0.5 to 0.95',
            ],
          },
          {
            kicker: 'Architectures',
            title: 'Three names worth knowing',
            visual: {
              type: 'icons',
              items: [
                {
                  icon: 'layers',
                  label: 'VGG',
                  sub: 'Stacks of 3 × 3 filters: two see as much as one 5 × 5',
                },
                {
                  icon: 'link',
                  label: 'ResNet',
                  sub: 'Skip connections let very deep nets (18 to 152 layers) train',
                },
                {
                  icon: 'smartphone',
                  label: 'MobileNet',
                  sub: 'Splits each convolution into two cheap steps: light enough for phones',
                },
              ],
            },
          },
          {
            kicker: 'Try it',
            title: 'A duplicate box',
            try: {
              type: 'choice',
              prompt:
                'NMS keeps a box scored 0.9. Another box on the same object scores 0.8, with IoU 0.7 to it. The threshold is 0.5. What happens?',
              options: [
                {
                  text: 'It is removed as a duplicate',
                  correct: true,
                  feedback:
                    'Right. Its IoU with the kept box (0.7) is above 0.5, so NMS deletes it.',
                },
                {
                  text: 'It is kept, because 0.8 is a high score',
                  correct: false,
                  feedback: 'Scores decide the order. Overlap with a kept box decides removal.',
                },
                {
                  text: 'Both boxes are merged into one',
                  correct: false,
                  feedback: 'Standard NMS deletes the weaker box. Merging is a different method.',
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
      title: 'Vision depth check',
      depthRank: 3,
      conceptKeys: [CONV, TRANSFER, DETECT],
      body: {
        items: [
          {
            key: 'size',
            type: 'mcq',
            prompt:
              'A 64 × 64 input, a 3 × 3 filter, padding 1, stride 2. What is the output size?',
            options: [
              { id: 'a', text: '32 × 32' },
              { id: 'b', text: '64 × 64' },
              { id: 'c', text: '31 × 31' },
              { id: 'd', text: '62 × 62' },
            ],
            answer: { correct: ['a'] },
            explanation: '(64 + 2 − 3) / 2 = 31.5, which rounds down to 31. Then + 1 gives 32.',
          },
          {
            key: 'conv-params',
            type: 'mcq',
            prompt:
              'A conv layer has 32 filters of size 3 × 3 on an RGB image. How many parameters, with biases?',
            options: [
              { id: 'a', text: '896' },
              { id: 'b', text: '288' },
              { id: 'c', text: '864' },
              { id: 'd', text: '9' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Each filter is 3 × 3 × 3 = 27 weights plus 1 bias: 28 × 32 = 896. 288 forgets the channels; 864 forgets the biases.',
          },
          {
            key: 'fine-tune',
            type: 'mcq',
            prompt:
              'Your frozen-backbone model has plateaued, and you now have 20,000 labelled photos. What next?',
            options: [
              {
                id: 'a',
                text: 'Unfreeze the last block or two and fine-tune with a small learning rate',
              },
              { id: 'b', text: 'Retrain everything from random weights with a high learning rate' },
              { id: 'c', text: 'Freeze the new head as well' },
              { id: 'd', text: 'Remove the pretrained layers and keep only the head' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'More data lets the top layers adapt to your images. A small learning rate keeps the useful pretrained weights.',
          },
          {
            key: 'tracking',
            type: 'mcq',
            prompt:
              'Why add object tracking when a detector already finds every car in each frame?',
            options: [
              {
                id: 'a',
                text: 'To give each car the same ID across frames, for counting and following',
              },
              { id: 'b', text: 'To make each frame detect more cars' },
              { id: 'c', text: 'To replace the detector entirely' },
              { id: 'd', text: "To improve the accuracy of each frame's boxes" },
            ],
            answer: { correct: ['a'] },
            explanation:
              'A detector sees each frame alone. A tracker links the boxes over time, by overlap, motion and appearance.',
          },
          {
            key: 'explain-yolo',
            type: 'reasoning',
            prompt:
              'The interviewer asks: *"How does YOLO work?"* Answer in three or four sentences.',
            modelAnswer:
              'YOLO is a one-stage detector: it looks at the whole image once with a CNN. The image is split into a grid, and each cell predicts boxes, a confidence score and class probabilities.\n\nLow-confidence boxes are dropped, and NMS removes duplicates by IoU, leaving one box per object. Because it runs in a single pass, it is fast enough for live video.',
            rubric: [
              'One pass over the whole image (one-stage)',
              'A grid whose cells predict boxes, confidence and classes',
              'Confidence filtering and NMS to remove duplicates',
              'Fast enough for real time',
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
      conceptKeys: [CONV, TRANSFER, DETECT],
      body: {
        layout: 'flip',
        cards: [
          {
            title: 'Convolution layer and filters',
            front: 'What is a CNN, and how does a convolution layer with filters work?',
            back: 'A CNN is a neural network built for images. Its filters are small grids of weights, say 3 × 3. Each slides over the image, multiplying and adding at every position to make a feature map. Reusing the same weights everywhere means few parameters, and a pattern is found anywhere.',
          },
          {
            title: 'CNN architecture',
            front: 'Explain the architecture of a CNN, layer by layer.',
            back: 'The input is an image with 3 colour channels. Convolution layers with ReLU find edges, then shapes; pooling shrinks the maps but keeps strong signals. This repeats a few times. Then the maps are flattened into dense layers, often with dropout, and softmax gives class scores.',
          },
          {
            title: 'Transfer learning, small data',
            front:
              'What is transfer learning, and how would you use it with only 600 labelled photos?',
            back: 'Transfer learning reuses a model pretrained on millions of photos, which already knows edges and shapes. With few photos, freeze that backbone and train only a new head, with augmentation. With more data, or very different images, also unfreeze the top layers and fine-tune with a small learning rate.',
          },
          {
            title: 'Detection and YOLO',
            front:
              'How is object detection different from classification, and why is YOLO faster than older detectors?',
            back: 'Classification gives one label per image; detection gives a box, label and score per object. Older detectors classified many regions one by one. YOLO looks at the whole image once: grid cells predict boxes, scores and classes in one pass, fast enough for video.',
          },
          {
            title: 'IoU vs confidence',
            front: 'What is IoU? Can it be used as a confidence threshold?',
            back: "IoU is the overlap of two boxes divided by the area they cover together, from 0 to 1. It cannot replace confidence: IoU needs a second box, such as the true box. Confidence is the model's own score for one box, used to drop unsure boxes.",
          },
          {
            title: 'Non-maximum suppression',
            front: 'What is non-maximum suppression, and what does its IoU threshold control?',
            back: 'A detector often draws several boxes on one object. NMS keeps the highest-scoring box, deletes boxes overlapping it above the IoU threshold, then repeats. A lower threshold removes more duplicates but can delete a close neighbour; a higher one keeps neighbours but lets duplicates through.',
          },
          {
            title: 'Object tracking',
            front:
              'Why track objects when YOLO already detects them? How does a tracker match the same object?',
            back: 'A detector sees each frame alone, so it cannot link a car to the last frame. A tracker gives each object one ID across frames, which counting needs. SORT predicts where each box moves next and matches new boxes by IoU. DeepSORT also compares appearance.',
          },
          {
            title: 'Too many false positives',
            front:
              'A helmet detector finds every helmet, yet many boxes count as false positives at confidence 0.6 and IoU 0.8. Without retraining, what do you change first?',
            back: 'I lower the IoU threshold to about 0.5. In evaluation, 0.8 is so strict that a slightly loose box on a real helmet counts as false. In NMS, 0.8 lets near-duplicates survive as extra false positives. The helmets are found, so raising confidence would only drop real ones.',
          },
          {
            title: 'Close objects, one box',
            front:
              'Two close people get one box over both, with NMS IoU 0.8 and confidence 0.6. Without retraining, what do you check first?',
            back: 'I look at the raw boxes before filtering. Partly hidden people often score lower, so their own boxes may fall below 0.6; if so, I lower confidence slightly. NMS at 0.8 is rarely the cause: a box over both overlaps each person by only about 0.5.',
          },
        ],
      },
    },
    {
      key: 'summary.basic',
      slotKey: 'summary',
      kind: 'SUMMARY',
      title: 'CNN key takeaways',
      depthRank: 1,
      conceptKeys: [CONV, TRANSFER, DETECT],
      body: {
        takeaways: [
          'A filter slides over the image, multiplying and adding: the same few weights everywhere.',
          'Output size = ⌊(n + 2p − k) / s⌋ + 1; max pooling keeps the strongest value per window.',
          'A CNN stacks conv, ReLU and pooling, then flattens into dense layers and softmax.',
          'Transfer learning reuses a pretrained backbone and trains a new head.',
          'IoU = overlap ÷ union grades a box; YOLO predicts every box in one pass.',
        ],
        remember: ['⌊(n + 2p − k) / s⌋ + 1', 'IoU ≥ 0.5 usually counts as a hit'],
      },
    },
    {
      key: 'summary.advanced',
      slotKey: 'summary',
      kind: 'SUMMARY',
      title: 'CNN key takeaways',
      depthRank: 3,
      conceptKeys: [CONV, TRANSFER, DETECT],
      body: {
        takeaways: [
          'A CNN stacks conv, ReLU and pooling, then dense layers; filters share weights.',
          'Transfer learning: freeze and add a head, or fine-tune the top with a small learning rate.',
          'IoU grades boxes; NMS keeps the best box and drops overlaps above the threshold.',
          'Confidence filters unsure boxes; the IoU threshold finds duplicates.',
          'One-stage detectors are fast; two-stage ones propose, then classify; trackers keep IDs.',
          'Detectors are scored by mAP: precision and recall across confidence levels, averaged over classes.',
        ],
        remember: [
          '⌊(n + 2p − k) / s⌋ + 1',
          'IoU ≥ 0.5 usually counts as a hit',
          'NMS: sort, keep the best, drop overlaps',
        ],
      },
    },
  ],
};
