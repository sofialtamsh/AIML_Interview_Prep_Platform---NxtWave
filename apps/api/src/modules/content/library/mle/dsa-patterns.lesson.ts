/**
 * Python for Interviews → DSA patterns: sliding window, stacks and recursion.
 *
 * Evidence (Hiring Intelligence, ML/AI families, Jan–Oct 2026; internal only, never quoted to
 * students): after two sum and binary search, the DSA questions that recur are the longest
 * substring without repeating characters (the most repeated DSA question, at both packages),
 * windows of three unique characters, the longest subarray with sum k (with and without negative
 * numbers, 8+), balanced brackets, the longest palindromic substring and trapping rain water (8+),
 * min cost climbing stairs (8+), an LRU cache question, and "loops or recursion, and what are the
 * time and memory trade-offs?". This unit follows DSA essentials and was added in curriculum v3.
 * One bar for every package for now, aimed at 8–12 LPA and kept simple, so every section is
 * depth 1. Every code output is checked by running it with Python 3.14.
 */
import type { LessonDocumentInput } from '@app/content';

const WIN = 'dsa.sliding-window';
const STACK = 'dsa.stack';
const REC = 'dsa.recursion';

const WINDOW_SUM_CODE = `def max_window_sum(nums, k):
    total = sum(nums[:k])
    best = total
    for i in range(k, len(nums)):
        # add the new item, drop the oldest
        total += nums[i] - nums[i - k]
        best = max(best, total)
    return best

print(max_window_sum([4, 2, 7, 1, 5, 3], 3))`;

const LONGEST_UNIQUE_CODE = `def longest_unique(s):
    last = {}
    left = best = 0
    for right, ch in enumerate(s):
        # a repeat inside the window?
        if ch in last and last[ch] >= left:
            left = last[ch] + 1
        last[ch] = right
        best = max(best, right - left + 1)
    return best

print(longest_unique("abcabcbb"))
print(longest_unique("bbbb"), longest_unique(""))`;

const SUM_K_CODE = `def longest_sum_k(nums, k):
    first = {0: -1}
    total = best = 0
    for i, x in enumerate(nums):
        total += x
        if total - k in first:
            best = max(best, i - first[total - k])
        # keep only the earliest index
        if total not in first:
            first[total] = i
    return best

print(longest_sum_k([1, -1, 5, -2, 3], 3))`;

const POSITIVE_SUM_CODE = `def longest_sum_k(nums, k):
    # every number is positive
    left = total = best = 0
    for right, x in enumerate(nums):
        total += x
        while total > k:
            total -= nums[left]
            left += 1
        if total == k:
            best = max(best, right - left + 1)
    return best

print(longest_sum_k([2, 1, 1, 1, 4, 1], 4))`;

const RAIN_CODE = `def trap(h):
    n = len(h)
    left, right = h[:], h[:]
    for i in range(1, n):
        left[i] = max(left[i - 1], h[i])
    for i in range(n - 2, -1, -1):
        right[i] = max(right[i + 1], h[i])
    # water above each bar
    return sum(min(left[i], right[i]) - h[i]
               for i in range(n))

print(trap([3, 0, 2, 0, 4]))
print(trap([]), trap([5]))`;

const GOOD_START = `def good_windows(s):
    count = 0
    # look at every window of 3 letters;
    # count it if the 3 letters differ
    return count

print(good_windows("xyzzaz"))
print(good_windows("aababcabc"))
`;

const BRACKETS_CODE = `def is_balanced(s):
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in s:
        if ch in "([{":
            stack.append(ch)
        elif ch in pairs:
            if not stack or stack.pop() != pairs[ch]:
                return False
    return not stack

print(is_balanced("([{}])"), is_balanced("(]"))
print(is_balanced("(("), is_balanced(""))`;

const QUEUE_CODE = `from collections import deque

stack = [1, 2, 3]
print(stack.pop())

queue = deque([1, 2, 3])
print(queue.popleft())`;

const FACTORIAL_CODE = `def factorial(n):
    if n < 0:
        raise ValueError("n is negative")
    # base case: stops the calls
    if n <= 1:
        return 1
    # a smaller problem each time
    return n * factorial(n - 1)

print(factorial(5))`;

const MEMO_CODE = `from functools import lru_cache

@lru_cache(maxsize=None)
def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)

print(fib(50))
print(fib.cache_info().misses)`;

const MIN_COST_CODE = `def min_cost(cost):
    # best[i]: the cheapest total that lands on step i
    best = cost[:2]
    for i in range(2, len(cost)):
        best.append(cost[i] + min(best[i - 1], best[i - 2]))
    # the top is one past the last step
    return min(best[-1], best[-2])

print(min_cost([10, 15, 20]))
print(min_cost([1, 100, 1, 1, 1, 100, 1, 1, 100, 1]))`;

const TOTAL_START = `def total(nums):
    # base case: an empty list sums to 0
    # otherwise: the first item plus
    # the total of the rest
    return 0

print(total([4, 1, 5]))
`;

const VOWELS_TAIL = `
print(max_vowels("abciiidef", 3))
print(max_vowels("leetcode", 3))
`;
const VOWELS_START = `def max_vowels(s, k):
    best = 0
    # 1. count vowels in the first k letters
    # 2. slide: add the new letter, drop the
    #    oldest, and keep the best count
    return best
${VOWELS_TAIL}`;
const VOWELS_SOLUTION = `def max_vowels(s, k):
    vowels = set("aeiou")
    count = sum(ch in vowels for ch in s[:k])
    best = count
    for i in range(k, len(s)):
        count += s[i] in vowels
        count -= s[i - k] in vowels
        best = max(best, count)
    return best
${VOWELS_TAIL}`;

export const DSA_PATTERNS_LESSON: LessonDocumentInput = {
  title: 'DSA patterns: sliding window, stacks and recursion',
  subtitle:
    'Three patterns behind the harder coding questions: a window over a sequence, a stack for nesting, and problems that call themselves.',
  objectives: [
    {
      key: 'window',
      text: 'Solve substring and subarray questions with a fixed or a growing window',
      minDepthRank: 1,
    },
    {
      key: 'prefix',
      text: 'Use running totals with a dictionary when the numbers can be negative',
      minDepthRank: 1,
    },
    {
      key: 'stack',
      text: 'Use a stack to check nesting, such as balanced brackets',
      minDepthRank: 1,
    },
    {
      key: 'recursion',
      text: 'Write a recursive function with a base case, and state its memory cost',
      minDepthRank: 1,
    },
    {
      key: 'dp',
      text: 'Speed up repeated work with memoisation, the first step of dynamic programming',
      minDepthRank: 1,
    },
  ],
  sections: [
    {
      key: 'hook',
      kind: 'HOOK',
      title: 'Do not start over',
      depthRank: 1,
      conceptKeys: [WIN],
      body: {
        scenario:
          'Your phone shows "steps in the last 7 days". It does not add up seven days from scratch every morning. It adds today and drops the day that left the week. Many substring and subarray questions work the same way.',
        animation: {
          name: 'fixed-window-sum',
          caption: 'Add the new day, drop the oldest',
        },
        realWorld: {
          title: 'Where these patterns run',
          items: [
            { icon: 'chart', label: 'Fitness apps', sub: 'Steps over the last 7 days' },
            { icon: 'code', label: 'Code editors', sub: 'Brackets matched as you type' },
            { icon: 'repeat', label: 'Undo', sub: 'The latest change is undone first' },
            { icon: 'layers', label: 'Folders', sub: 'Folders inside folders inside folders' },
          ],
        },
        provocation: 'Why recount the whole week when only two days changed?',
        bridge:
          'The longest substring without repeats, balanced brackets and climbing stairs are classic coding questions. Each one uses a pattern from this lesson: a sliding window, a stack or recursion.',
      },
    },
    {
      key: 'slides.window',
      kind: 'SLIDES',
      title: 'Sliding windows',
      depthRank: 1,
      conceptKeys: [WIN],
      body: {
        slides: [
          {
            kicker: 'Fixed window · the story',
            title: 'Add the new day, drop the oldest',
            body: 'To get the best 3-day total in a list, do not add every group of 3 from scratch. Move the window one step: add the number that enters and subtract the one that leaves. Each move costs two steps, however wide the window is.',
            visual: { type: 'sequence', terms: ['4', '2', '7', '1', '5', '3'] },
          },
          {
            kicker: 'Fixed window · the code',
            title: 'The best sum of k in a row',
            visual: { type: 'code', code: WINDOW_SUM_CODE, output: '13' },
            note: 'O(n) time and O(1) space. Re-adding every window from scratch would be O(n × k).',
            narration:
              'We start by adding the first k numbers, here 4, 2 and 7, which makes 13. That is also the best so far. Then the loop slides the window one step at a time. It adds the number entering on the right and subtracts the one leaving on the left. The totals go 13, then 10, then 13, then 9, so it prints 13. Each step costs the same, however big k is.',
          },
          {
            kicker: 'Growing window · the story',
            title: 'Grow on the right, shrink on the left',
            body: 'For the longest stretch without a repeated letter, the size is not fixed. Grow the window on the right. When a letter repeats, move the left edge just past its earlier copy. The window never holds a repeat.',
            animation: {
              name: 'sliding-window-unique',
              caption: 'Real use: the longest session without a repeated event',
            },
          },
          {
            kicker: 'Longest substring · the code',
            title: 'Longest substring without repeats',
            visual: { type: 'code', code: LONGEST_UNIQUE_CODE, output: '3\n1 0' },
            note: 'O(n) time: each letter enters and leaves once. The dict holds at most one entry per distinct letter.',
            narration:
              'This is a classic interview question, so practise it until you can write it from memory. The dict called last remembers the latest position of each letter. Right walks through the string. If the current letter was seen inside the window, left jumps to just past that earlier copy. Then we save the position and measure the window. For a b c a b c b b, the best window is 3 letters long. Four b letters give 1, and an empty string gives 0.',
          },
          {
            kicker: 'Growing window · sums',
            title: 'Sum k with positive numbers',
            visual: { type: 'code', code: POSITIVE_SUM_CODE, output: '3' },
            note: 'O(n) time and O(1) space. It works only because adding a positive number raises the sum and removing one lowers it.',
            narration:
              'When every number is positive, a growing window finds the longest stretch that adds up to k. Right adds each number to total. While total is bigger than k, the number at left is removed and left moves on. Whenever total equals k, we measure the window. For 2, 1, 1, 1, 4, 1 with k equal to 4, the stretch 2, 1, 1 is the longest, so it prints 3.',
          },
          {
            kicker: 'Prefix sums · the idea',
            title: 'Running totals find any stretch',
            body: 'Keep a running total, starting at 0 before the list. The sum of any stretch is the total at its end minus the total just before it. So if total − k appeared earlier, the numbers in between add up to k, even with negatives.',
            visual: {
              type: 'sequence',
              terms: ['0', '1', '0', '5', '3', '6'],
              ops: ['+1', '−1', '+5', '−2', '+3'],
            },
          },
          {
            kicker: 'Prefix sums · the code',
            title: 'The longest stretch that sums to k',
            visual: { type: 'code', code: SUM_K_CODE, output: '4' },
            note: 'A window cannot handle negative numbers: removing one can raise the sum. Running totals with a dict work for any numbers, in O(n).',
            narration:
              'The dict called first stores the earliest position of each running total, starting with 0 before the list. For each number, we update total. If total minus k was seen before, the stretch after that position adds up to k, so we measure its length. Then we record total, but only if it is new, to keep the earliest position. For 1, minus 1, 5, minus 2, 3 and k equal to 3, the longest stretch is the first four numbers, so it prints 4.',
          },
          {
            kicker: 'Running maxima',
            title: 'Trapping rain water',
            visual: { type: 'code', code: RAIN_CODE, output: '7\n0 0' },
            note: 'O(n) time and O(n) space. The same running maximum, or minimum, from either end answers prefix and suffix questions.',
            narration:
              'Water above a bar rises to the shorter of two walls: the tallest bar on its left and the tallest on its right. So we build two lists. Left holds the running maximum from the start, and right holds the running maximum from the end. Both include the bar itself, so the water is never negative. For bars 3, 0, 2, 0 and 4, the water is 3, then 1, then 3, so it prints 7. An empty list and a single bar hold no water.',
          },
          {
            kicker: 'Try it',
            title: 'Windows of three different letters',
            try: {
              type: 'code',
              prompt:
                'Finish `good_windows(s)`: count the windows of 3 letters where all 3 letters differ. It should print 1 and then 4.',
              starter: GOOD_START,
              expected: '4',
              hint: 'Loop `for i in range(len(s) - 2):` and add 1 when `len(set(s[i:i + 3])) == 3`.',
            },
          },
        ],
      },
    },
    {
      key: 'playground.vowels',
      kind: 'PLAYGROUND',
      title: 'Most vowels in a window',
      depthRank: 1,
      conceptKeys: [WIN],
      body: {
        language: 'python',
        instructions:
          'Finish `max_vowels(s, k)`: return the largest number of vowels in any `k` letters in a row. Slide the window instead of recounting it. It should print `3` and then `2`.',
        starterCode: VOWELS_START,
        hints: [
          'Set `vowels = set("aeiou")`, then count the vowels in `s[:k]`: `sum(ch in vowels for ch in s[:k])`.',
          'For each new position `i`, add 1 if `s[i]` is a vowel and subtract 1 if `s[i - k]` was one.',
          'Keep `best = max(best, count)` after every move. The whole thing is O(n).',
        ],
        solution: VOWELS_SOLUTION,
        checks: [
          { type: 'stdout_contains', value: '3', label: '"iii" in "abciiidef" gives 3' },
          { type: 'stdout_contains', value: '2', label: '"leetcode" with k = 3 gives 2' },
        ],
      },
    },
    {
      key: 'slides.stack',
      kind: 'SLIDES',
      title: 'Stacks',
      depthRank: 1,
      conceptKeys: [STACK],
      body: {
        slides: [
          {
            kicker: 'Stack · the story',
            title: 'Last in, first out',
            body: 'In a stack of plates, you add to the top and take from the top. The last plate placed is the first one used. The undo button works the same way: the latest change is undone first.',
            animation: {
              name: 'bracket-stack',
              caption: 'Real use: code editors matching brackets as you type',
            },
          },
          {
            kicker: 'Brackets · the code',
            title: 'Balanced brackets',
            visual: { type: 'code', code: BRACKETS_CODE, output: 'True False\nFalse True' },
            note: 'A Python list is a stack: `append` pushes and `pop` takes the top, both O(1). The whole check is O(n).',
            narration:
              'An opening bracket is pushed on the stack. A closing bracket must match the bracket on top, which is the most recent one still open. If the stack is empty or the top does not match, the string is not balanced. At the end, the stack must be empty, or some bracket never closed. So the nested string is True, round then square is False, two open rounds is False, and an empty string is True.',
          },
          {
            kicker: 'Stack or queue',
            title: 'Take from the top, or the front',
            visual: { type: 'code', code: QUEUE_CODE, output: '3\n1' },
            note: 'Use a list as a stack. For a queue, use `collections.deque`: `popleft` is O(1), while `list.pop(0)` is O(n).',
            narration:
              'A stack and a queue differ in which end you take from. The list called stack gives back 3, the last item added. A queue gives back the first item added, so the deque returns 1. Use a deque for queues, because taking the first item from a plain list shifts every other item.',
          },
          {
            kicker: 'Try it',
            title: 'Crossed brackets',
            try: {
              type: 'choice',
              prompt: 'Which string fails the balanced-brackets check?',
              options: [
                {
                  text: '([)]',
                  correct: true,
                  feedback:
                    'Right. When ")" arrives, the top of the stack is "[", so they do not match.',
                },
                {
                  text: '([])',
                  correct: false,
                  feedback: 'This one is balanced: "[" closes first, then "(".',
                },
                {
                  text: '{}()',
                  correct: false,
                  feedback: 'This one is balanced: each pair opens and closes in turn.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'slides.recursion',
      kind: 'SLIDES',
      title: 'Recursion and memoisation',
      depthRank: 1,
      conceptKeys: [REC],
      body: {
        slides: [
          {
            kicker: 'Recursion · the story',
            title: 'A problem that calls itself',
            body: 'To count a queue without leaving your spot, ask the person in front. They ask the person in front of them. The first person says "1". The answers come back, each person adding one. That is **recursion**.',
            animation: {
              name: 'recursion-call-stack',
              caption: 'Real use: folders, trees and nested data',
            },
          },
          {
            kicker: 'Recursion · the code',
            title: 'A base case and a smaller problem',
            visual: { type: 'code', code: FACTORIAL_CODE, output: '120' },
            note: 'Each waiting call sits on the call stack, so this uses O(n) memory. A loop needs O(1). Python stops at about 1,000 nested calls.',
            narration:
              'A negative number has no factorial, so the function first raises an error for it. Then come the two parts every recursive function needs. The base case stops the calls: here, when n is 1 or less, we simply return 1. The other line solves a smaller problem, factorial of n minus 1, and multiplies by n. Factorial of 5 calls factorial of 4, down to factorial of 1. Then the answers come back up, and it prints 120.',
          },
          {
            kicker: 'Repeated work · the story',
            title: 'Fibonacci asks the same thing twice',
            body: 'Plain recursive Fibonacci works out the same small answers again and again: fib(50) would make about 40 billion calls. Saving each answer the first time, called **memoisation**, means each number is worked out once.',
          },
          {
            kicker: 'Memoisation · the code',
            title: 'Cache each answer once',
            visual: { type: 'code', code: MEMO_CODE, output: '12586269025\n51' },
            note: 'The cache turns exponential time into O(n). fib(50) needs only 51 real calls, one per value from 0 to 50.',
            narration:
              'The recursive code is the same as before. The only change is the lru cache decorator on top. The first time fib is asked for a number, it computes it and saves the answer. Every later request for that number reads the saved answer. So fib of 50 comes back instantly, and the cache reports only 51 real calculations, one for each value from 0 to 50.',
          },
          {
            kicker: 'Dynamic programming · the story',
            title: 'Climbing stairs, one or two at a time',
            body: 'To reach a step, you come from the step below or the one below that. So the ways to reach step n are the ways to the two steps before it, added. Building answers up from the smallest case is **dynamic programming**.',
            visual: {
              type: 'sequence',
              terms: ['1', '2', '3', '5', '8'],
              ops: ['', '1+2', '2+3', '3+5'],
            },
          },
          {
            kicker: 'Dynamic programming · the code',
            title: 'Min cost climbing stairs',
            visual: { type: 'code', code: MIN_COST_CODE, output: '15\n6' },
            note: 'O(n) time and O(n) space. Keep only the last two totals instead of the list, and space drops to O(1).',
            narration:
              'Each step has a cost, and you climb one or two steps at a time. The list called best holds the cheapest total that lands on each step. The first two steps cost only themselves, because you may start on either. Every later step costs its own price plus the cheaper of the two steps before it. The top is one past the last step, so the answer is the smaller of the last two totals. For costs 10, 15 and 20, the best is 15. For the longer list it is 6.',
          },
          {
            kicker: 'Trade-offs',
            title: 'Recursion or a loop',
            visual: {
              type: 'compare',
              left: {
                title: 'Recursion',
                items: [
                  'Natural for trees and nested data',
                  'O(depth) memory on the call stack',
                  'Python stops near 1,000 deep calls',
                ],
              },
              right: {
                title: 'A loop',
                items: ['O(1) extra memory', 'No depth limit', 'Sometimes harder to read'],
              },
              better: 'none',
            },
            note: 'Asked "loop or recursion?", give both costs, then pick by the depth of the input and by readability.',
          },
          {
            kicker: 'Try it',
            title: 'Add up a list recursively',
            try: {
              type: 'code',
              prompt:
                'Finish `total(nums)` with recursion, not a loop: the first item plus the total of the rest. It should print 10.',
              starter: TOTAL_START,
              expected: '10',
              hint: 'Write `if not nums: return 0`, then `return nums[0] + total(nums[1:])`.',
            },
          },
        ],
      },
    },
    {
      key: 'check.basics',
      kind: 'KNOWLEDGE_CHECK',
      title: 'DSA patterns check',
      depthRank: 1,
      conceptKeys: [WIN, STACK, REC],
      body: {
        items: [
          {
            key: 'window-trace',
            type: 'predict_output',
            prompt: 'What does this print?',
            language: 'python',
            code: 'nums, k = [2, 1, 5, 1, 3, 2], 3\ntotal = sum(nums[:k])\nbest = total\nfor i in range(k, len(nums)):\n    total += nums[i] - nums[i - k]\n    best = max(best, total)\nprint(best)',
            options: [
              { id: 'a', text: '9' },
              { id: 'b', text: '8' },
              { id: 'c', text: '7' },
              { id: 'd', text: '14' },
            ],
            answer: { correct: ['a'] },
            explanation: 'The windows add up to 8, 7, 9 and 6. The best is 5 + 1 + 3 = 9.',
          },
          {
            key: 'negatives',
            type: 'mcq',
            prompt:
              'The question asks for the longest subarray that sums to k, and the numbers can be negative. Which approach works?',
            options: [
              { id: 'a', text: 'Running totals with a dict of first positions' },
              { id: 'b', text: 'A window that shrinks whenever the sum is too big' },
              { id: 'c', text: 'Sorting the array, then two pointers' },
              { id: 'd', text: 'Binary search on the array' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'With negatives, removing a number can raise the sum, so a shrinking window can go the wrong way. Sorting breaks the order of the subarray. Running totals work for any numbers.',
          },
          {
            key: 'undo',
            type: 'mcq',
            prompt: 'Which structure fits the undo button of a text editor?',
            options: [
              { id: 'a', text: 'A stack: the latest change comes off first' },
              { id: 'b', text: 'A queue: the oldest change comes off first' },
              { id: 'c', text: 'A set: changes are unique' },
              { id: 'd', text: 'A sorted list of changes' },
            ],
            answer: { correct: ['a'] },
            explanation: 'Undo reverses the most recent change first: last in, first out.',
          },
          {
            key: 'recursion-trace',
            type: 'predict_output',
            prompt: 'What does this print?',
            language: 'python',
            code: 'def f(n):\n    if n == 0:\n        return 0\n    return n + f(n - 1)\n\nprint(f(4))',
            options: [
              { id: 'a', text: '10' },
              { id: 'b', text: '4' },
              { id: 'c', text: '24' },
              { id: 'd', text: '0' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'f(4) is 4 + f(3), which is 4 + 3 + 2 + 1 + f(0). The base case gives 0, so the total is 10.',
          },
          {
            key: 'no-base',
            type: 'mcq',
            prompt: 'What happens when a recursive function has no base case?',
            options: [
              { id: 'a', text: 'It keeps calling itself until Python raises a RecursionError' },
              { id: 'b', text: 'It returns None after the first call' },
              { id: 'c', text: 'Python adds a base case for you' },
              { id: 'd', text: 'It runs forever without any error' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Nothing stops the calls, so the call stack grows until Python hits its limit of about 1,000 calls and raises RecursionError.',
          },
        ],
      },
    },
    {
      key: 'interview.longest-substring',
      kind: 'INTERVIEW_PLAYBOOK',
      title: 'Sliding window answer structure',
      depthRank: 1,
      conceptKeys: [WIN],
      body: {
        question:
          '"Given a string, return the length of the longest substring without repeating characters."',
        totalMinutes: 8,
        steps: [
          {
            title: 'Clarify',
            detail:
              'Ask: are upper and lower case different? Spaces and digits too? An empty string gives 0.',
          },
          {
            title: 'Brute force',
            detail:
              'Try every start, and extend it with a set until a letter repeats. Say the cost: O(n²) time and O(n) space.',
          },
          {
            title: 'Pattern',
            detail:
              'The answer is a contiguous stretch, so use a window that grows on the right and shrinks on the left.',
          },
          {
            title: 'Track',
            detail:
              'Keep a dict of the last position of each letter. On a repeat inside the window, move left past it.',
          },
          {
            title: 'Test',
            detail:
              'Trace "abcabcbb" to get 3. Then try "bbbb" for 1, "" for 0 and "pwwkew" for 3.',
          },
          {
            title: 'Cost',
            detail:
              'O(n) time, since each letter enters and leaves once. The dict holds at most one entry per distinct letter.',
          },
        ],
        followUps: [
          'Why does a window fail for subarray sums with negative numbers?',
          'How would you find the longest palindromic substring?',
          'What are the memory costs of recursion compared with a loop?',
          'What is dynamic programming?',
        ],
      },
    },
    {
      key: 'interview-questions',
      kind: 'CARD_DECK',
      title: 'Interview questions and answers',
      depthRank: 1,
      conceptKeys: [WIN, STACK, REC],
      body: {
        layout: 'flip',
        cards: [
          {
            title: 'Spotting a window problem',
            front: 'How do you know a question needs a sliding window?',
            back: 'Look for a contiguous run: a substring, a subarray, or the last k items. If one step changes only the two ends, slide instead of recounting. Fixed size: add the new item and drop the oldest. Changing size: grow on the right, shrink on the left.',
          },
          {
            title: 'Windows and negative numbers',
            front: 'Why does a sliding window fail for subarray sums when numbers can be negative?',
            back: 'Shrinking assumes the sum drops when you remove an item. With negatives, removing an item can raise the sum, so you cannot tell which way to move. Use running totals with a dict instead: O(n) time and O(n) space.',
          },
          {
            title: 'Longest palindromic substring',
            front: 'How do you find the longest palindromic substring?',
            back: 'Expand around centres. Every palindrome has a middle: one letter, or the gap between two letters. From each of the 2n − 1 centres, grow outwards while both ends match, and keep the longest. That is O(n²) time and O(1) extra space.',
          },
          {
            title: 'Trapping rain water',
            front: 'How would you approach the trapping rain water problem?',
            back: 'Water above a bar is the smaller of the tallest bar on its left and on its right, minus its own height. Count the bar itself in both maxima, so the water is never negative. Two passes give O(n) time and space; two pointers cut space to O(1).',
          },
          {
            title: 'Recursion against a loop',
            front: 'What are the time and memory trade-offs between recursion and a loop?',
            back: 'Time is often the same. But each recursive call waits on the call stack, so memory grows with the depth. Python stops near 1,000 nested calls. A loop needs O(1) extra memory. Prefer recursion for trees and nested data.',
          },
          {
            title: 'Dynamic programming',
            front: 'What is dynamic programming?',
            back: 'Solving a problem from the answers to smaller versions of it, and storing those answers so each is worked out once. Top-down means recursion with a cache. Bottom-up means a loop that builds from the smallest case. Fibonacci drops from exponential time to O(n).',
          },
          {
            title: 'Min cost climbing stairs',
            front:
              'Each step has a cost, and you climb one or two steps at a time. How do you find the cheapest way to the top?',
            back: 'The cheapest total that lands on a step is its cost plus the cheaper of the two steps before it. Build that from the bottom, keeping only two values. The top is one past the last step, so return the smaller of the last two. O(n) time, O(1) space.',
          },
          {
            title: 'Stack or queue',
            front: 'When do you use a stack, and when a queue?',
            back: 'A stack is last in, first out: undo, matching brackets, function calls and depth-first search. A queue is first in, first out: print jobs, task queues and breadth-first search. In Python, use a list as a stack and collections.deque as a queue.',
          },
          {
            title: 'An LRU cache',
            front:
              'A cache holds 3 items and drops the least recently used. After A, B, C, D, A, E, what is left?',
            back: 'D removes A, the oldest, leaving B, C, D. A comes back and removes B: C, D, A. E removes C: D, A, E. In Python, an OrderedDict that moves each used key to the end gives O(1) operations.',
          },
        ],
      },
    },
    {
      key: 'summary',
      kind: 'SUMMARY',
      title: 'DSA patterns: key takeaways',
      depthRank: 1,
      conceptKeys: [WIN, STACK, REC],
      body: {
        takeaways: [
          'A contiguous run means a window: slide it instead of recounting, for O(n).',
          'Fixed window: add the new item and drop the oldest. Growing window: grow right, shrink left on a repeat.',
          'With negative numbers, use running totals and a dict of earlier totals instead of a window.',
          'A stack is last in, first out: brackets, undo and nesting. Use collections.deque for a queue.',
          'Recursion needs a base case and a smaller input. It costs O(depth) memory on the call stack.',
          'Memoisation saves each answer once. Dynamic programming builds answers up from the smallest case.',
        ],
        remember: [
          'total += nums[i] - nums[i - k]',
          'if ch in last and last[ch] >= left',
          'if total not in first: first[total] = i',
          '@lru_cache(maxsize=None)',
        ],
      },
    },
  ],
};
