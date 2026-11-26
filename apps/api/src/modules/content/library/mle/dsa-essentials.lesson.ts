/**
 * Python for Interviews → DSA essentials: complexity, hashing, two pointers and binary search.
 *
 * Evidence (Hiring Intelligence, ML/AI families, Jan–Oct 2026; internal only, never quoted to
 * students): DSA rounds are asked far more at 8+ LPA than below. The questions: two sum (often,
 * under 8 LPA), contains or find the duplicate, the most frequent element and the top three words,
 * the single number (XOR), container with most water (several times, all 8+), move zeros, binary
 * search written and run live, the kth largest (sorting or a min-heap), merge sort and merging two
 * sorted arrays with their median, and time and space complexity after every problem ("brute
 * force first?", "can you optimise?", "is it O(log n²) or O(n²)?", "how many comparisons does
 * binary search need for a million records?"). Sliding windows, stacks and recursion are in the
 * next unit, DSA patterns. The product owner asked for one bar for every package for now, aimed at
 * 8–12 LPA and kept simple, so every section is depth 1. Every code output is checked by running
 * it with Python 3.14.
 */
import type { LessonDocumentInput } from '@app/content';

const O = 'dsa.complexity';
const HASH = 'dsa.arrays-hashing';
const SEARCH = 'dsa.sort-search';

const PAIRS_CODE = `def count_pairs(n):
    steps = 0
    for i in range(n):
        for j in range(n):
            steps += 1
    return steps

for n in [10, 100, 1000]:
    print(n, count_pairs(n))`;

const TWO_SUM_BRUTE = `def two_sum(nums, target):
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
    return []

print(two_sum([3, 2, 7, 11], 9))`;

const TWO_SUM_HASH = `def two_sum(nums, target):
    seen = {}
    for i, x in enumerate(nums):
        need = target - x
        if need in seen:
            return [seen[need], i]
        seen[x] = i
    return []

print(two_sum([3, 2, 7, 11], 9))
print(two_sum([3, 3], 6), two_sum([1, 2], 7))`;

const DUPLICATE_CODE = `def first_duplicate(nums):
    seen = set()
    for x in nums:
        if x in seen:
            return x
        seen.add(x)
    return None

print(first_duplicate([4, 1, 3, 1, 4]))
print(first_duplicate([1, 2]))

nums = [5, 2, 5]
print(len(set(nums)) < len(nums))`;

const COUNTER_CODE = `from collections import Counter

text = "the cat and the dog and the bird"
counts = Counter(text.split())
print(counts.most_common(2))
print(counts["dog"], counts["fish"])`;

const UNIQUE_START = `from collections import Counter

def first_unique(s):
    counts = Counter(s)
    # return the first ch in s
    # whose count is 1
    return None

print(first_unique("swiss"))
`;

const SORTED_PAIR_CODE = `def pair_with_sum(prices, target):
    left, right = 0, len(prices) - 1
    while left < right:
        total = prices[left] + prices[right]
        if total == target:
            return prices[left], prices[right]
        if total < target:
            left += 1
        else:
            right -= 1
    return None

prices = [150, 300, 450, 600, 750]
print(pair_with_sum(prices, 1050))`;

const CONTAINER_CODE = `def max_water(h):
    l, r = 0, len(h) - 1
    best = 0
    while l < r:
        area = (r - l) * min(h[l], h[r])
        best = max(best, area)
        # move the shorter wall
        if h[l] < h[r]:
            l += 1
        else:
            r -= 1
    return best

print(max_water([1, 8, 6, 2, 5, 4, 8, 3, 7]))`;

const MOVE_ZEROS_CODE = `def move_zeros(nums):
    write = 0
    for x in nums:
        if x != 0:
            nums[write] = x
            write += 1
    for i in range(write, len(nums)):
        nums[i] = 0
    return nums

print(move_zeros([0, 4, 0, 3, 12]))`;

const BINARY_SEARCH_CODE = `def binary_search(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
nums = [3, 8, 12, 17, 23, 31, 38, 44]
print(binary_search(nums, 31))
print(binary_search(nums, 5))`;

const MERGE_CODE = `def merge(a, b):
    i = j = 0
    out = []
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:
            out.append(a[i])
            i += 1
        else:
            out.append(b[j])
            j += 1
    return out + a[i:] + b[j:]

m = merge([1, 4, 9], [2, 3])
print(m, m[len(m) // 2])`;

const KTH_CODE = `import heapq

def kth_largest(nums, k):
    heap = []  # a min-heap: heap[0] is the smallest
    for x in nums:
        heapq.heappush(heap, x)
        if len(heap) > k:
            heapq.heappop(heap)  # drop the smallest
    return heap[0]

nums = [1, 2, 6, 3, 8]
print(sorted(nums)[-2])
print(kth_largest(nums, 2))`;

const BUBBLE_CODE = `def bubble_sort(nums):
    n = len(nums)
    for i in range(n - 1):
        # after pass i, the largest i + 1 are in place
        for j in range(n - 1 - i):
            if nums[j] > nums[j + 1]:
                nums[j], nums[j + 1] = nums[j + 1], nums[j]
    return nums

print(bubble_sort([5, 2, 9, 1, 5]))
print(bubble_sort([]), bubble_sort([7]))`;

const PALINDROME_CODE = `def longest_palindrome(s):
    best = ""
    for i in range(len(s)):
        # odd length: centre i; even: between i, i + 1
        for l, r in ((i, i), (i, i + 1)):
            while l >= 0 and r < len(s) and s[l] == s[r]:
                l -= 1
                r += 1
            if r - l - 1 > len(best):
                best = s[l + 1:r]
    return best

print(longest_palindrome("babad"), longest_palindrome("cbbd"))
print(longest_palindrome("a"), len(longest_palindrome("")))`;

const INSERT_START = `def search_insert(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1

print(search_insert([1, 3, 5, 6], 5))
print(search_insert([1, 3, 5, 6], 7))
`;

const SINGLE_TAIL = `
print(single_number([4, 1, 2, 1, 2]))
print(single_number([7]))
`;
const SINGLE_START = `def single_number(nums):
    counts = {}
    # 1. count each number
    # 2. return the one whose
    #    count is 1
    return None
${SINGLE_TAIL}`;
const SINGLE_SOLUTION = `def single_number(nums):
    counts = {}
    for x in nums:
        counts[x] = counts.get(x, 0) + 1
    for x, c in counts.items():
        if c == 1:
            return x
    return None
${SINGLE_TAIL}`;

export const DSA_ESSENTIALS_LESSON: LessonDocumentInput = {
  title: 'DSA essentials: complexity, hashing and binary search',
  subtitle:
    'How to judge the cost of a solution, and the tools that turn a slow answer into a fast one.',
  objectives: [
    {
      key: 'method',
      text: 'Work a DSA question the interview way: the brute force first, then a faster idea',
      minDepthRank: 1,
    },
    {
      key: 'complexity',
      text: 'State the time and space complexity of a solution, and explain why',
      minDepthRank: 1,
    },
    {
      key: 'hashing',
      text: 'Use a dictionary or a set to replace a slow search with an O(1) lookup',
      minDepthRank: 1,
    },
    {
      key: 'pointers',
      text: 'Solve pair problems with two pointers moving in from both ends',
      minDepthRank: 1,
    },
    {
      key: 'search',
      text: 'Write binary search and explain why it needs only O(log n) steps',
      minDepthRank: 1,
    },
  ],
  sections: [
    {
      key: 'hook',
      kind: 'HOOK',
      title: 'Correct, but too slow',
      depthRank: 1,
      conceptKeys: [O],
      body: {
        scenario:
          'The interviewer gives you a list of numbers and a target. Return the positions of two numbers that add up to the target. You write two loops, and it works. Then comes the real question: "Can you do better?"',
        animation: {
          name: 'big-o-growth',
          caption: 'Same answer, very different amounts of work',
        },
        realWorld: {
          title: 'Where fast lookups matter',
          items: [
            { icon: 'search', label: 'Autocomplete', sub: 'Suggestions as you type each letter' },
            {
              icon: 'shield',
              label: 'Fraud checks',
              sub: 'Is this card already on a blocked list',
            },
            { icon: 'cart', label: 'Shopping carts', sub: 'Is this item already in the cart' },
            { icon: 'map', label: 'Maps', sub: 'Routes found in a fraction of a second' },
          ],
        },
        provocation:
          'Both answers give the right output. Why does the interviewer still want a faster one?',
        bridge:
          'With a few thousand items, two loops already take millions of steps. This lesson shows how to measure that cost, then three tools that cut it down: hashing, two pointers and binary search.',
      },
    },
    {
      key: 'slides.complexity',
      kind: 'SLIDES',
      title: 'Time and space complexity',
      depthRank: 1,
      conceptKeys: [O],
      body: {
        slides: [
          {
            kicker: 'Big-O · the story',
            title: 'Count the steps, not the seconds',
            body: 'A stopwatch result depends on the laptop. **Big-O** instead counts how the number of steps grows when the input grows. If 10 items take 100 steps but 1,000 items take a million, that growth is the problem.',
            visual: {
              type: 'compare',
              left: {
                title: 'Seconds',
                items: ['Change with the laptop', 'Change with other apps running'],
              },
              right: {
                title: 'Big-O',
                items: ['How steps grow with the input', 'The same on every machine'],
              },
            },
          },
          {
            kicker: 'Reading the code',
            title: 'Spot the growth in the code',
            visual: {
              type: 'icons',
              items: [
                { icon: 'zap', label: 'O(1)', sub: 'A dict or set lookup, or nums[i]' },
                { icon: 'search', label: 'O(log n)', sub: 'Halve the range at every step' },
                { icon: 'repeat', label: 'O(n)', sub: 'One loop over the input' },
                { icon: 'filter', label: 'O(n log n)', sub: 'Sorting the input' },
                { icon: 'layers', label: 'O(n²)', sub: 'A loop inside a loop' },
              ],
            },
            note: 'Drop constants and smaller terms. 3n + 5 steps is still O(n), and n² + n is O(n²).',
          },
          {
            kicker: 'O(n²) · the code',
            title: 'Ten times the input, 100 times the work',
            visual: { type: 'code', code: PAIRS_CODE, output: '10 100\n100 10000\n1000 1000000' },
            note: 'A loop inside a loop is O(n²). A million items would need a million million steps.',
            narration:
              'This function only counts how often the inner line runs. For each of the n values of i, the inner loop runs n times, so the count is n times n. With 10 items it prints 100 steps. With 100 items, 10 thousand. With a thousand items, a full million. The input grew 100 times, but the work grew 10 thousand times. That is what O of n squared means.',
          },
          {
            kicker: 'The hidden loop',
            title: 'A lookup can hide a loop',
            visual: {
              type: 'compare',
              left: {
                title: 'x in a_list',
                items: ['Checks the items one by one', 'O(n) for every check'],
              },
              right: {
                title: 'x in a_set or a_dict',
                items: ['Jumps straight to the slot', 'O(1) on average'],
              },
            },
            note: 'A loop that runs `x in a_list` on every turn is a loop inside a loop: O(n²).',
          },
          {
            kicker: 'Space',
            title: 'Memory is part of the cost',
            body: '**Space complexity** is the extra memory a solution needs as the input grows. A few variables are O(1). A dict that stores every item is O(n). Interviews often trade some memory for a lot of speed.',
            visual: {
              type: 'compare',
              left: { title: 'Two loops', items: ['O(n²) time', 'O(1) extra space'] },
              right: { title: 'One loop with a dict', items: ['O(n) time', 'O(n) extra space'] },
            },
            note: 'Say both, every time: "O(n) time, and O(n) extra space for the dict."',
          },
          {
            kicker: 'Try it',
            title: 'Find the cost',
            try: {
              type: 'choice',
              prompt:
                'A loop goes over n names, and inside it checks `if name in banned`, where `banned` is a list of about n names. What is the time complexity?',
              options: [
                {
                  text: 'O(n²)',
                  correct: true,
                  feedback:
                    'Right. Each `in` on a list scans it, so it is a loop inside a loop. Make `banned` a set to get O(n).',
                },
                {
                  text: 'O(n)',
                  correct: false,
                  feedback:
                    'The outer loop is O(n), but each `in` on a list is another O(n) scan inside it.',
                },
                {
                  text: 'O(log n)',
                  correct: false,
                  feedback: 'Nothing here halves the input, so there is no log n.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'slides.hashing',
      kind: 'SLIDES',
      title: 'Hashing for fast lookups',
      depthRank: 1,
      conceptKeys: [HASH, O],
      body: {
        slides: [
          {
            kicker: 'The method',
            title: 'Brute force first, then improve',
            body: 'Interviewers want to see how you think. Start with the simple correct answer and say its cost. Then ask what work it repeats, and remove that repeated work.',
            visual: {
              type: 'flow',
              steps: [
                { label: 'Say the brute force', icon: 'message' },
                { label: 'State its cost', icon: 'clock' },
                { label: 'Find repeated work', icon: 'search' },
                { label: 'Remove it', icon: 'zap' },
              ],
            },
          },
          {
            kicker: 'Two sum · brute force',
            title: 'Check every pair',
            visual: { type: 'code', code: TWO_SUM_BRUTE, output: '[1, 2]' },
            note: 'Correct, but O(n²). For every number, it searches the rest of the list again.',
            narration:
              'This is the first answer most people give, and it is a good place to start. The outer loop picks a number, and the inner loop tries every number after it. When a pair adds up to the target, it returns their positions. For the list 3, 2, 7, 11 with target 9, it returns 1 and 2, because 2 plus 7 is 9. It is correct, but it checks almost every pair, so the time is O of n squared.',
          },
          {
            kicker: 'Hashing · the story',
            title: 'A register beats knocking on doors',
            body: 'A hostel warden with a register finds your room from your name at once. Without it, they would knock on every door. A Python **dict** or **set** works like that register: a lookup takes one step on average.',
            animation: {
              name: 'dict-lookup',
              caption: 'Real use: login checks, caches and duplicate detection',
            },
          },
          {
            kicker: 'Two sum · the idea',
            title: 'Remember what you have seen',
            body: 'Walk the list once. For each number, its partner is the target minus that number. Ask a dict whether the partner appeared earlier. If not, store this number with its position.',
            animation: {
              name: 'two-sum-hashmap',
              caption: 'Real use: matching two payments that add up to a bill',
            },
          },
          {
            kicker: 'Two sum · the code',
            title: 'One pass with a dict',
            visual: { type: 'code', code: TWO_SUM_HASH, output: '[1, 2]\n[0, 1] []' },
            note: 'O(n) time and O(n) extra space. Check before you store, so a number never pairs with itself.',
            narration:
              'Here is the faster version. The dict called seen maps each number to its position. For each number x, we work out need, which is the target minus x. If need is already in seen, we found the pair and return both positions. If not, we store x and move on. It prints 1 and 2 for the first list. For 3 and 3 with target 6, it gives 0 and 1, and when no pair exists it returns an empty list. One pass, so O of n time.',
          },
          {
            kicker: 'Duplicates',
            title: 'A set remembers what it has seen',
            visual: { type: 'code', code: DUPLICATE_CODE, output: '1\nNone\nTrue' },
            note: 'The last line answers "does it contain a duplicate?" in one line: a set keeps one copy of each value.',
            narration:
              'A set is a dict with only keys, which makes it perfect for the question, have I seen this before. The function walks the list and returns the first number already in the set. For 4, 1, 3, 1, 4 that is 1. A list with no repeats gives None. The last two lines answer a common short question: does the list contain any duplicate. If the set is smaller than the list, something repeated, so it prints True.',
          },
          {
            kicker: 'Counting',
            title: 'The top k with Counter',
            visual: {
              type: 'code',
              code: COUNTER_CODE,
              output: "[('the', 3), ('and', 2)]\n1 0",
            },
            note: '`Counter` is a dict of counts. A missing key gives 0, not an error. Counting is O(n).',
            narration:
              'For questions like the top three most frequent words, the Counter class does the counting for you. Here we split a sentence into words and count them. The most common method returns the two most frequent words with their counts. The word "the" appears 3 times, and the word "and" appears twice. The last line shows a useful detail. Dog appears once, and fish, which never appears, gives 0 instead of an error.',
          },
          {
            kicker: 'Try it',
            title: 'The first unique character',
            try: {
              type: 'code',
              prompt:
                'Finish `first_unique` so it returns the first character that appears only once. It should print w for "swiss".',
              starter: UNIQUE_START,
              expected: 'w',
              hint: 'Loop with `for ch in s:` and return `ch` as soon as `counts[ch] == 1`.',
            },
          },
        ],
      },
    },
    {
      key: 'playground.single',
      kind: 'PLAYGROUND',
      title: 'The number that appears once',
      depthRank: 1,
      conceptKeys: [HASH],
      body: {
        language: 'python',
        instructions:
          'Every number in the list appears twice, except one. Finish `single_number(nums)` so it returns that number. It should print `4` and then `7`.',
        starterCode: SINGLE_START,
        hints: [
          'Count each number with `counts[x] = counts.get(x, 0) + 1`.',
          'Then loop over `counts.items()` and return the number whose count is 1.',
          'This is O(n) time and O(n) space. For O(1) space, start with `result = 0` and do `result ^= x` for every x. In Python, `^` is XOR: `x ^ x` is 0, so pairs cancel in any order.',
        ],
        solution: SINGLE_SOLUTION,
        checks: [
          { type: 'stdout_contains', value: '4', label: 'Finds 4 in [4, 1, 2, 1, 2]' },
          { type: 'stdout_contains', value: '7', label: 'Works for a list with one number' },
        ],
      },
    },
    {
      key: 'slides.pointers',
      kind: 'SLIDES',
      title: 'Two pointers',
      depthRank: 1,
      conceptKeys: [HASH, O],
      body: {
        slides: [
          {
            kicker: 'Two pointers · the story',
            title: 'Two friends, one budget',
            body: 'Two friends want two gifts that cost exactly ₹1,050. The price list is sorted. One friend starts at the cheapest, the other at the costliest. Too costly? The costly side steps down. Too cheap? The cheap side steps up.',
            visual: {
              type: 'sequence',
              terms: ['150', '300', '450', '600', '750'],
            },
          },
          {
            kicker: 'Sorted pair · the code',
            title: 'Move the pointer that fixes the sum',
            visual: { type: 'code', code: SORTED_PAIR_CODE, output: '(300, 750)' },
            note: 'O(n) time and O(1) extra space, because the list is sorted. Unsorted and asked for positions? Use the dict version: sorting moves the positions.',
            narration:
              'Here is the budget story in code. Left starts at the cheapest price and right at the costliest. If the two prices add up to the target, we return them. If the total is too small, only a costlier left item can help, so left moves right. If it is too big, right moves left. First, 150 plus 750 is 900, too small. Then 300 plus 750 is exactly 1050, so it prints 300 and 750.',
          },
          {
            kicker: 'Container · the story',
            title: 'Water between two walls',
            body: 'Two walls hold water up to the shorter wall, across the gap between them. Start with the widest pair. Then move the shorter wall inward: moving the taller one only shrinks the width, and the water level cannot rise.',
            animation: {
              name: 'container-water',
              caption: 'Real use: the best pair without trying every pair',
            },
          },
          {
            kicker: 'Container · the code',
            title: 'Container with most water',
            visual: { type: 'code', code: CONTAINER_CODE, output: '49' },
            note: 'Trying every pair is O(n²). Two pointers make it O(n) time with O(1) space.',
            narration:
              'Interviewers like this question because every pointer move needs a reason. The pointers l and r start at both ends. The water they hold is the width, r minus l, times the shorter of the two walls. We keep the best area seen. Then we move the pointer at the shorter wall, because the shorter wall is what limits the water. For these heights, the best is the wall of 8 and the wall of 7, seven apart, so it prints 49.',
          },
          {
            kicker: 'Try it',
            title: 'Which wall moves',
            try: {
              type: 'choice',
              prompt:
                'In the water problem, the left wall is 3 high and the right wall is 8 high. Which pointer should move next?',
              options: [
                {
                  text: 'The left one, at the wall of 3',
                  correct: true,
                  feedback:
                    'Right. The water is capped at 3. Only a taller left wall can raise that cap.',
                },
                {
                  text: 'The right one, at the wall of 8',
                  correct: false,
                  feedback:
                    'Moving the taller wall shrinks the width, and the cap stays at 3 or lower. It can only get worse.',
                },
                {
                  text: 'Both at once',
                  correct: false,
                  feedback: 'Moving both can skip the best pair.',
                },
              ],
            },
          },
          {
            kicker: 'In place',
            title: 'Move the zeros to the end',
            visual: { type: 'code', code: MOVE_ZEROS_CODE, output: '[4, 3, 12, 0, 0]' },
            note: 'The loop reads and `write` marks where the next number goes. O(n) time and O(1) extra space: the list changes in place.',
            narration:
              'Two pointers can also move at different speeds. The loop reads every number, and write marks where the next non zero number should go. Each non zero number is copied to position write, and write moves on. When the loop ends, every position from write onward is filled with zeros. The order of 4, 3 and 12 is kept, and no second list is needed.',
          },
          {
            kicker: 'Try it',
            title: 'Zeros to the front',
            try: {
              type: 'code',
              prompt:
                'Change `move_zeros` so the zeros go to the front and the other numbers keep their order. It should print [0, 0, 4, 3, 12].',
              starter: MOVE_ZEROS_CODE,
              expected: '[0, 0, 4, 3, 12]',
              hint: 'Start `write` at the last position and loop `for x in reversed(nums):`. Move `write` down after each copy, then set every position in `range(write + 1)` to 0.',
            },
          },
          {
            kicker: 'Pointers moving out',
            title: 'Longest palindromic substring',
            visual: { type: 'code', code: PALINDROME_CODE, output: 'bab bb\na 0' },
            note: 'Each of the 2n − 1 centres grows at most n steps: O(n²) time and O(1) extra space.',
            narration:
              'Every palindrome mirrors around a centre. The centre is a letter for odd lengths, like b a b, or the gap between two letters for even lengths, like b b. For each centre, two pointers start together and step outward while the letters match. When they stop, the palindrome lies between them, and we keep the longest. For babad it finds bab, and for cbbd it finds bb. An empty string gives an empty answer.',
          },
        ],
      },
    },
    {
      key: 'slides.search',
      kind: 'SLIDES',
      title: 'Sorting and binary search',
      depthRank: 1,
      conceptKeys: [SEARCH, O],
      body: {
        slides: [
          {
            kicker: 'Binary search · the story',
            title: 'Guess the number in 7 tries',
            body: 'Think of a number from 1 to 100. Guess 50; told "higher", guess 75. Each guess throws away half of what is left, so 7 guesses always find it. That halving is **binary search**.',
            animation: {
              name: 'binary-search-halving',
              caption: 'Real use: lookups in sorted data, like a database index',
            },
          },
          {
            kicker: 'Binary search · the code',
            title: 'Halve the range each step',
            visual: { type: 'code', code: BINARY_SEARCH_CODE, output: '5\n-1' },
            note: 'Use `lo <= hi`, and move past mid with + 1 or − 1. Those two details cause most bugs.',
            narration:
              'Binary search needs a sorted list. The range starts as the whole list, from lo to hi. Each round we look at the middle item. If it is the target, we return its position. If it is smaller, the target can only be to the right, so lo moves past the middle. If it is bigger, hi moves before the middle. Searching for 31 returns position 5. Searching for 5, which is missing, returns minus 1.',
          },
          {
            kicker: 'Why log n',
            title: 'A million items, about 20 checks',
            body: 'Each check halves the range. **log₂ n** counts how many halvings it takes to get down to one item. A plain scan of a million items may need a million checks.',
            visual: {
              type: 'stat',
              value: '≈ 20',
              label: 'checks to search 1,000,000 sorted items',
              sub: 'Doubling 20 times gives 1,048,576',
            },
          },
          {
            kicker: 'Sorting',
            title: 'What sorting costs',
            visual: {
              type: 'icons',
              items: [
                { icon: 'zap', label: 'sorted() and .sort()', sub: 'O(n log n), using Timsort' },
                { icon: 'layers', label: 'Merge sort', sub: 'Split, sort each half, merge' },
                { icon: 'alert', label: 'Bubble sort', sub: 'Swaps neighbours: O(n²)' },
                { icon: 'check', label: 'Stable sorting', sub: 'Equal items keep their order' },
              ],
            },
            note: '`sorted(x)` returns a new list. `x.sort()` sorts the list itself and returns None.',
          },
          {
            kicker: 'Sorting by hand',
            title: 'Bubble sort, the brute force',
            visual: { type: 'code', code: BUBBLE_CODE, output: '[1, 2, 5, 5, 9]\n[] [7]' },
            note: 'O(n²) time and O(1) extra space. Asked to sort without built-ins? Write this first, then offer merge sort.',
            narration:
              'When the interviewer says no built in sort, start with bubble sort. Each pass walks the list and swaps any two neighbours that are in the wrong order. After the first pass, the largest number has bubbled to the end. After the next, the second largest sits before it, so each pass can stop one place earlier. Five numbers come out as 1, 2, 5, 5, 9. An empty list and a single number come back unchanged. Two loops, so O of n squared.',
          },
          {
            kicker: 'Merge sort · the idea',
            title: 'Split in half, then merge',
            body: 'Split the list in half, again and again, until each part holds one item. One item is already sorted. Then merge the parts back in pairs, with the merge on the next slide.',
            visual: {
              type: 'flow',
              steps: [
                { label: 'Split in half', icon: 'layers' },
                { label: 'Repeat to single items', icon: 'repeat' },
                { label: 'Merge pairs back', icon: 'link' },
                { label: 'O(n log n)', icon: 'zap' },
              ],
            },
            note: 'Halving gives about log₂ n levels, and each level merges all n items: O(n log n) time, O(n) extra space.',
          },
          {
            kicker: 'Merging',
            title: 'Merge two sorted lists',
            visual: { type: 'code', code: MERGE_CODE, output: '[1, 2, 3, 4, 9] 3' },
            note: 'This merge is the heart of merge sort: O(n + m). With an even count, the median is the average of the two middle items.',
            narration:
              'Two sorted lists can be merged in one pass, with one pointer in each. At every step we take the smaller of the two front items, and move that pointer on. When one list runs out, we add whatever is left of the other. Merging 1, 4, 9 with 2, 3 gives 1, 2, 3, 4, 9. With five items, the middle one, 3, is the median. Merge sort uses exactly this step after sorting each half.',
          },
          {
            kicker: 'Heaps',
            title: 'The kth largest, two ways',
            visual: { type: 'code', code: KTH_CODE, output: '6\n6' },
            note: 'A **heap** keeps its smallest item at `heap[0]`. Each push and pop costs O(log k), so the loop is O(n log k).',
            narration:
              'To find the second largest number, the simplest way sorts the list and takes the second item from the end. That costs O of n log n. The faster way uses a min heap, a list that always keeps its smallest item at position 0. We push every number, and when the heap holds more than k numbers, we pop the smallest. The k largest stay, and the smallest of them is the answer. Both print 6. Each push and pop costs O of log k, so the total is O of n log k.',
          },
          {
            kicker: 'Try it',
            title: 'Where the target would go',
            try: {
              type: 'code',
              prompt:
                'This search returns −1 when the target is missing. Change one line so it returns the position where the target would be inserted. It should print 2 and then 4.',
              starter: INSERT_START,
              expected: '4',
              hint: 'When the loop ends, `lo` is the first position whose value is bigger than the target. Return `lo`.',
            },
          },
        ],
      },
    },
    {
      key: 'check.basics',
      kind: 'KNOWLEDGE_CHECK',
      title: 'DSA essentials check',
      depthRank: 1,
      conceptKeys: [O, HASH, SEARCH],
      body: {
        items: [
          {
            key: 'two-sum-trace',
            type: 'predict_output',
            prompt: 'What does this print?',
            language: 'python',
            code: 'seen = {}\nfor i, x in enumerate([5, 1, 4, 2]):\n    if 6 - x in seen:\n        print(seen[6 - x], i)\n        break\n    seen[x] = i',
            options: [
              { id: 'a', text: '0 1' },
              { id: 'b', text: '2 3' },
              { id: 'c', text: '1 0' },
              { id: 'd', text: '0 2' },
            ],
            answer: { correct: ['a'] },
            explanation:
              '5 is stored first. At 1, its partner 6 − 1 = 5 is already in seen at position 0, so it prints 0 1 and stops. 4 and 2 also make 6, but the loop never reaches them.',
          },
          {
            key: 'halving-loop',
            type: 'mcq',
            prompt: 'How does the number of turns grow for `i = n` then `while i > 1: i = i // 2`?',
            options: [
              { id: 'a', text: 'O(log n)' },
              { id: 'b', text: 'O(n)' },
              { id: 'c', text: 'O(n²)' },
              { id: 'd', text: 'O(1)' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Each turn halves i, so the loop runs about log₂ n times. That is about 10 turns for 1,000 and about 20 for a million.',
          },
          {
            key: 'million',
            type: 'mcq',
            prompt:
              'A table has 1,000,000 sorted records. About how many comparisons does binary search need in the worst case?',
            options: [
              { id: 'a', text: 'About 20' },
              { id: 'b', text: 'About 10' },
              { id: 'c', text: 'About 1,000' },
              { id: 'd', text: 'About 500,000' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Doubling 20 times gives 1,048,576, so about 20 halvings bring a million records down to one.',
          },
          {
            key: 'search-trace',
            type: 'predict_output',
            prompt: 'What does this print?',
            language: 'python',
            code: 'nums = [2, 5, 8, 12, 16, 23, 38]\nlo, hi, steps = 0, len(nums) - 1, 0\nwhile lo <= hi:\n    mid = (lo + hi) // 2\n    steps += 1\n    if nums[mid] == 23:\n        break\n    if nums[mid] < 23:\n        lo = mid + 1\n    else:\n        hi = mid - 1\nprint(mid, steps)',
            options: [
              { id: 'a', text: '5 2' },
              { id: 'b', text: '5 3' },
              { id: 'c', text: '4 2' },
              { id: 'd', text: '6 1' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'First mid is 3, holding 12, which is below 23, so lo becomes 4. The next mid is 5, holding 23: found on step 2.',
          },
          {
            key: 'space',
            type: 'mcq',
            prompt: 'What is the extra space of the one-pass two sum with a dict?',
            options: [
              { id: 'a', text: 'O(n): the dict can hold every number' },
              { id: 'b', text: 'O(1): it uses one loop' },
              { id: 'c', text: 'O(n²): it checks pairs' },
              { id: 'd', text: 'O(log n): lookups are fast' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'In the worst case the pair is at the end, so the dict stores almost every number first. That is O(n) extra space, traded for O(n) time.',
          },
        ],
      },
    },
    {
      key: 'interview.two-sum',
      kind: 'INTERVIEW_PLAYBOOK',
      title: 'DSA answer structure',
      depthRank: 1,
      conceptKeys: [O, HASH],
      body: {
        question:
          '"Given an array of numbers and a target, return the positions of the two numbers that add up to the target."',
        totalMinutes: 6,
        steps: [
          {
            title: 'Clarify',
            detail:
              'Ask: is there exactly one answer? Can one number be used twice? Is the list sorted? Positions or values?',
          },
          {
            title: 'Brute force',
            detail: 'Check every pair with two loops. Say the cost: O(n²) time, O(1) space.',
          },
          {
            title: 'Find the waste',
            detail:
              'For each number, the inner loop searches again for its partner. A lookup can replace that search.',
          },
          {
            title: 'Optimise',
            detail:
              'One pass with a dict from value to position. For each x, look up target − x before storing x.',
          },
          {
            title: 'Code and test',
            detail:
              'Code it while explaining. Test [3, 2, 7, 11] with 9, then [3, 3] with 6, then a list with no answer.',
          },
          {
            title: 'Cost',
            detail:
              'O(n) time and O(n) extra space. If the list is sorted, two pointers need only O(1) space.',
          },
        ],
        followUps: [
          'What changes if the list is already sorted?',
          'How would you find three numbers that add up to the target?',
          'Is a dictionary lookup always O(1)?',
          'Can you do it without extra memory?',
        ],
      },
    },
    {
      key: 'interview-questions',
      kind: 'CARD_DECK',
      title: 'Interview questions and answers',
      depthRank: 1,
      conceptKeys: [O, HASH, SEARCH],
      body: {
        layout: 'flip',
        cards: [
          {
            title: 'Working out complexity',
            front: 'How do you work out the time complexity of your code?',
            back: 'Count how the steps grow with the input size n. One loop over the input is O(n). A loop inside a loop is O(n²). Halving the range each step is O(log n). Keep the biggest term and drop constants, so 3n + 5 is O(n).',
          },
          {
            title: 'log n² against n²',
            front: 'Is O(log n²) the same as O(n²)?',
            back: 'No. log n² equals 2 log n, so O(log n²) is just O(log n), which grows very slowly. O(n²) grows with the square of n. For a million items, log n is about 20 steps, while n² is a million million.',
          },
          {
            title: 'Peak element',
            front:
              'Find the index of a peak, an item bigger than its neighbours. Can you beat O(n)?',
            back: 'Yes, binary search works even on an unsorted list, if neighbours differ. Compare nums[mid] with nums[mid + 1]. If the right one is bigger, the values rise, so a peak lies to the right. Otherwise a peak is at mid or to its left. Each step halves the range: O(log n).',
          },
          {
            title: 'Sorted two sum and three sum',
            front:
              'In two sum, what changes if the list is already sorted? And how would you find three numbers that add up to the target?',
            back: 'Use two pointers from both ends: too small, move left up; too big, move right down. That is O(n) time and O(1) extra space. For three sum, sort first. Fix each number, then run two pointers on the numbers after it: O(n²), not O(n³).',
          },
          {
            title: 'Task scheduler',
            front:
              'Tasks are letters like A A A B B B, and the same task needs at least n slots between runs. What is the fewest slots needed?',
            back: 'Count the tasks with Counter. The most frequent task sets (max count − 1) blocks of n + 1 slots each. Add one slot per task tied at the max count. If other tasks overflow the gaps, nothing idles, so return the larger of that and len(tasks). O(len(tasks)) time.',
          },
          {
            title: 'Cost of a dict lookup',
            front: 'Is a dictionary lookup always O(1)?',
            back: 'On average, yes. Python hashes the key and jumps to its slot. In a rare worst case, many keys land in the same slot, and a lookup can take O(n). Python keeps its tables large enough that this almost never happens.',
          },
          {
            title: 'Find the duplicate',
            front: 'Given an array, find the number that repeats. How, and at what cost?',
            back: 'Walk the array with a set of seen values. The first value already in the set is the duplicate: O(n) time and O(n) space. Without a set, sort in place and compare neighbours, in O(n log n). To list every repeat, keep the Counter keys with a count above 1.',
          },
          {
            title: 'The single number',
            front: 'Every number appears twice except one. Find it with O(1) extra space.',
            back: 'XOR all the numbers together; in Python, ^ is XOR, not power. x ^ x is 0 and x ^ 0 is x, and the order does not matter, so every pair cancels out. Only the single number is left: one pass, O(n) time and O(1) space.',
          },
          {
            title: 'Kth largest element',
            front: 'How do you find the kth largest element in an array?',
            back: 'Simplest: sort and take the kth item from the end, in O(n log n). For small k, keep a min-heap of the k largest so far. Its smallest item is the answer, in O(n log k).',
          },
        ],
      },
    },
    {
      key: 'summary',
      kind: 'SUMMARY',
      title: 'DSA essentials: key takeaways',
      depthRank: 1,
      conceptKeys: [O, HASH, SEARCH],
      body: {
        takeaways: [
          'Big-O counts how the steps grow with the input. One loop is O(n), a loop in a loop is O(n²), halving is O(log n).',
          'Give time and space together, for example "O(n) time and O(n) extra space for the dict".',
          'Start with the brute force and its cost, then remove the work it repeats.',
          'A dict or a set turns a search into an O(1) lookup on average: two sum, duplicates, counting.',
          'On sorted data, two pointers from both ends solve pair problems in O(n) time and O(1) space.',
          'Binary search halves a sorted range at every step: about 20 checks for a million items.',
        ],
        remember: [
          'need = target - x; check, then store',
          'while lo <= hi: mid = (lo + hi) // 2',
          'Sort O(n log n), search sorted O(log n)',
        ],
      },
    },
  ],
};
