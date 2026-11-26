/**
 * Python for Interviews → Coding round: strings, lists and numbers.
 *
 * Evidence (Hiring Intelligence, ML/AI families, Jan–Oct 2026; internal only, never quoted to
 * students): the first live coding question is usually small. Under 8 LPA asks to reverse a
 * string and the words of a sentence, check a palindrome without built-ins, check anagrams, count
 * character and word frequency, find vowels and unique characters, find the largest and the
 * second largest without built-ins, remove or find duplicates without a set, find the missing
 * number, filter evens with a comprehension, swap without a temporary variable, and check a
 * prime, a factorial, Fibonacci, an Armstrong number, a reversed integer and number patterns.
 * 8+ LPA asks the same problems as a warm-up (character frequency most of all, palindromes, text
 * clean-up, factorial) and expects clean code tested on edge cases, explained line by line. Both
 * packages take this unit at depth 2. Two-sum, hashing, two pointers and binary search belong to
 * DSA essentials; sliding windows, stacks and recursion belong to DSA patterns. Every code output
 * is checked by running it with Python 3.14.
 */
import type { LessonDocumentInput } from '@app/content';

const STR = 'py.coding.strings';
const LIST = 'py.coding.lists';
const NUM = 'py.coding.numbers';

const REVERSE_CODE = `s = "python"
# a slice from the end to the start
print(s[::-1])

out = ""
for ch in s:
    # put each letter in front
    out = ch + out
print(out)`;

const PALINDROME_CODE = `def is_palindrome(s):
    left, right = 0, len(s) - 1
    while left < right:
        if s[left] != s[right]:
            return False
        left += 1
        right -= 1
    return True

print(is_palindrome("level"), is_palindrome("lever"))
print(is_palindrome(""), is_palindrome("a"))`;

const ANAGRAM_CODE = `def is_anagram(a, b):
    return sorted(a.lower()) == sorted(b.lower())

print(is_anagram("Listen", "Silent"))
print(is_anagram("rat", "car"))`;

const FREQUENCY_CODE = `text = "hello"
counts = {}
for ch in text:
    # 0 if the letter is new, then add 1
    counts[ch] = counts.get(ch, 0) + 1
print(counts)
print(max(counts, key=counts.get))`;

const WORDS_CODE = `line = "tea is hot"
words = line.split()

# the words in reverse order
print(" ".join(words[::-1]))
# each word reversed, order kept
print(" ".join(w[::-1] for w in words))`;

const NORMALISE_CODE = `text = "Never odd, or EVEN!"
clean = ""
for ch in text.lower():
    # keep letters and digits only
    if ch.isalnum():
        clean += ch
print(clean, clean == clean[::-1])

line = "Tea, tea and DOSA."
out = ""
for ch in line.lower():
    # punctuation becomes a space
    out += ch if ch.isalnum() else " "
print(out.split())`;

const VOWELS_START = `def count_vowels(s):
    count = 0
    # loop over s.lower();
    # add 1 for each vowel
    return count

print(count_vowels("Interview"))
`;

const LARGEST_CODE = `def largest(nums):
    if not nums:
        return None
    best = nums[0]
    for n in nums[1:]:
        if n > best:
            best = n
    return best

print(largest([4, 9, 2, 9, 7]), largest([-5, -2]), largest([]))`;

const SECOND_CODE = `def second_largest(nums):
    big = second = None
    for n in nums:
        if big is None or n > big:
            big, second = n, big
        elif n != big and (second is None or n > second):
            second = n
    return second

print(second_largest([4, 9, 2, 9, 7]))
print(second_largest([5, 5]), second_largest([3]))`;

const DEDUPE_CODE = `ids = [7, 3, 7, 1, 3]

seen = []
for x in ids:
    # keep x only the first time
    if x not in seen:
        seen.append(x)
print(seen)

# the short way: dict keys keep their order
print(list(dict.fromkeys(ids)))`;

const MISSING_CODE = `# the numbers 1 to 5, one is missing
nums = [1, 2, 4, 5]
n = len(nums) + 1
# 1 + 2 + ... + n
expected = n * (n + 1) // 2
print(expected - sum(nums))`;

const QUICK_CODE = `nums = [3, 8, 5, 10, 12]
print([x for x in nums if x % 2 == 0])

a, b = 5, 9
# swap without a third variable
a, b = b, a
print(a, b)`;

const TOPN_HEAD = `words = ["tea", "dosa", "tea",
         "idli", "dosa", "tea"]
`;
const TOPN_TAIL = `
print(top_n(words, 2))
print(top_n(["b", "a"], 1))
`;
const TOPN_START = `${TOPN_HEAD}
def top_n(words, n):
    counts = {}
    # 1. count each word in counts
    # 2. sort the words: highest
    #    count first, ties in a-z
    #    order
    # 3. return the first n words
    return []
${TOPN_TAIL}`;
const TOPN_SOLUTION = `${TOPN_HEAD}
def top_n(words, n):
    counts = {}
    for w in words:
        counts[w] = counts.get(w, 0) + 1
    ranked = sorted(
        counts,
        key=lambda w: (-counts[w], w),
    )
    return ranked[:n]
${TOPN_TAIL}`;

const PRIME_CODE = `def is_prime(n):
    if n < 2:
        return False
    d = 2
    while d * d <= n:
        if n % d == 0:
            return False
        d += 1
    return True

print(is_prime(29), is_prime(91), is_prime(1))
print([n for n in range(2, 20) if is_prime(n)])`;

const FACTORIAL_CODE = `def factorial(n):
    if n < 0:
        raise ValueError("n is negative")
    result = 1
    for k in range(2, n + 1):
        result *= k
    return result

print(factorial(5), factorial(0))
try:
    factorial(-3)
except ValueError as e:
    print("Error:", e)`;

const FIBONACCI_CODE = `def fibonacci(count):
    a, b = 0, 1
    out = []
    for _ in range(count):
        out.append(a)
        a, b = b, a + b
    return out

print(fibonacci(8))`;

const ARMSTRONG_CODE = `def is_armstrong(n):
    if n < 0:  # "-" is not a digit
        return False
    digits = str(n)
    power = len(digits)
    total = 0
    for d in digits:
        total += int(d) ** power
    return total == n

print(is_armstrong(153), is_armstrong(-153))
found = [n for n in range(100, 1000)
         if is_armstrong(n)]
print(found)`;

const REVERSE_INT_CODE = `def reverse_number(n):
    sign = 1
    if n < 0:  # remember the sign
        sign, n = -1, -n
    result = 0
    while n > 0:
        # take the last digit, then drop it
        result = result * 10 + n % 10
        n //= 10
    return sign * result

for n in [1234, 120, -123, 0]:
    print(n, reverse_number(n))`;

const PATTERN_CODE = `num = 1
for row in range(1, 5):
    line = []
    # row 1 has 1 number, row 2 has 2 ...
    for _ in range(row):
        line.append(str(num))
        num += 1
    print(" ".join(line))`;

const DIGITS_START = `def digit_sum(n):
    total = 0
    # while n is above 0:
    #   add the last digit to total
    #   then drop that digit
    return total

print(digit_sum(1234))
`;

export const PYTHON_CODING_ROUND_LESSON: LessonDocumentInput = {
  title: 'Coding round: strings, lists and numbers',
  subtitle:
    'The small problems that open most coding rounds, solved one by one, with the way to talk through each.',
  objectives: [
    {
      key: 'method',
      text: 'Solve a coding question aloud: restate, try an example, code, then test edge cases',
      minDepthRank: 1,
    },
    {
      key: 'strings',
      text: 'Solve string problems: reverse, palindrome, anagram, character frequency',
      minDepthRank: 1,
    },
    {
      key: 'lists',
      text: 'Solve list problems without built-ins: largest, second largest, duplicates, missing number',
      minDepthRank: 1,
    },
    {
      key: 'numbers',
      text: 'Solve number problems: prime, factorial, Fibonacci, Armstrong, digit tricks and patterns',
      minDepthRank: 1,
    },
  ],
  sections: [
    {
      key: 'hook',
      kind: 'HOOK',
      title: 'Ten lines, ten minutes',
      depthRank: 1,
      conceptKeys: [STR],
      body: {
        scenario:
          'The interviewer shares a screen and says: "Write a function to check if a string is a palindrome. You have ten minutes." The problem is small. What they watch is how you think, talk and test.',
        animation: {
          name: 'coding-round-steps',
          caption: 'Restate, try an example, code aloud, then test',
        },
        realWorld: {
          title: 'Where these small problems show up',
          items: [
            {
              icon: 'search',
              label: 'Search boxes',
              sub: 'Cleaning and matching what people type',
            },
            { icon: 'chart', label: 'Reports', sub: 'Counting words, orders and clicks' },
            { icon: 'shield', label: 'Validation', sub: 'Checking IDs, numbers and formats' },
            {
              icon: 'database',
              label: 'Data cleaning',
              sub: 'Removing duplicates and finding gaps',
            },
          ],
        },
        provocation: 'Why ask a ten-line problem when real work uses libraries?',
        bridge:
          'Palindromes, anagrams, the second largest number, primes and Fibonacci are common first coding questions. This lesson solves each one, with a picture and code you can run.',
      },
    },
    {
      key: 'slides.method',
      kind: 'SLIDES',
      title: 'How to solve it aloud',
      depthRank: 1,
      conceptKeys: [STR],
      body: {
        slides: [
          {
            kicker: 'The method · the story',
            title: 'Show your working, like in maths',
            body: 'In a maths exam, the steps earn marks even when the final answer slips. A coding round is the same. Interviewers mark how you understand, plan, explain and test, not only the final code.',
            visual: {
              type: 'flow',
              steps: [
                { label: 'Restate the problem', icon: 'message' },
                { label: 'Try a small example', icon: 'search' },
                { label: 'Code and explain', icon: 'code' },
                { label: 'Test edge cases', icon: 'check' },
              ],
            },
          },
          {
            kicker: 'Edge cases',
            title: 'Inputs that break a first draft',
            visual: {
              type: 'icons',
              items: [
                { icon: 'x', label: 'Empty input', sub: 'An empty string or an empty list' },
                { icon: 'hash', label: 'One item', sub: 'A single character or number' },
                { icon: 'repeat', label: 'Duplicates', sub: 'The same value more than once' },
                {
                  icon: 'alert',
                  label: 'Unusual values',
                  sub: 'Negatives, zero, capitals, spaces',
                },
              ],
            },
            note: 'Ask before you code: "Should capitals and spaces count?" It shows care and saves rework.',
          },
          {
            kicker: 'Without built-ins',
            title: 'Know both ways',
            visual: {
              type: 'compare',
              left: {
                title: 'With built-ins',
                items: ['Short: max, sorted, a reverse slice', 'Use them unless told not to'],
              },
              right: {
                title: 'By hand',
                items: ['A loop and one or two variables', 'Asked to check you know how it works'],
              },
              better: 'none',
            },
            note: 'Say the cost in one line: "one pass, so the time grows with the input length". That is O(n).',
          },
        ],
      },
    },
    {
      key: 'slides.strings',
      kind: 'SLIDES',
      title: 'String problems',
      depthRank: 1,
      conceptKeys: [STR],
      body: {
        slides: [
          {
            kicker: 'Reverse',
            title: 'Reverse a string, two ways',
            body: 'A word in a mirror reads backwards. In Python, a slice with a step of −1 does that. By hand, add each character to the front of a new string.',
            visual: { type: 'code', code: REVERSE_CODE, output: 'nohtyp\nnohtyp' },
            narration:
              'A word in a mirror reads backwards, and here are two ways to do that in Python. The first print uses a slice with a step of minus 1, which walks the string from the end to the start. The second way does it by hand. We start with an empty string called out, and the loop puts each new letter in front of it. Both print nohtyp, which is python reversed.',
          },
          {
            kicker: 'Palindrome · the story',
            title: 'The same forwards and backwards',
            body: 'The word "level" reads the same from both ends. So do "madam" and "noon". Such a word is a **palindrome**. To check one, compare the first and last letters, then move inward.',
            animation: {
              name: 'two-pointer-palindrome',
              caption: 'Real use: the two-pointer idea solves many list problems too',
            },
          },
          {
            kicker: 'Palindrome · the code',
            title: 'Two pointers, no built-ins',
            visual: { type: 'code', code: PALINDROME_CODE, output: 'True False\nTrue True' },
            note: 'An empty string and a single letter count as palindromes. The short form is `s == s[::-1]`.',
            narration:
              'Here is the palindrome check with two pointers. The variable left starts at the first letter and right at the last. While left is before right, we compare the two letters. If they differ, we return False at once. If they match, both pointers move one step inward. When they meet, every pair matched, so we return True. It prints True for level and False for lever. An empty string and a single letter also give True.',
          },
          {
            kicker: 'Anagram',
            title: 'Same letters, different order',
            body: '"listen" and "silent" use exactly the same letters. Such words are **anagrams**. Sort the letters of both words: anagrams give the same sorted list.',
            visual: { type: 'code', code: ANAGRAM_CODE, output: 'True\nFalse' },
            note: 'Without sorting: count the letters of each word in a dictionary, then compare the two dictionaries.',
            narration:
              'Two words are anagrams when they use exactly the same letters. This function makes both words lowercase, sorts the letters of each, and compares the two sorted lists. Listen and Silent give the same sorted letters, so it prints True. Rat and car do not, so it prints False. If the interviewer says no sorting, count the letters of each word in a dictionary and compare the counts.',
          },
          {
            kicker: 'Frequency · the story',
            title: 'A tally for each letter',
            body: 'To count votes, you keep one tally per candidate and add a mark for each vote. Counting characters works the same way: one counter per letter, kept in a **dictionary**.',
            animation: {
              name: 'char-frequency-count',
              caption: 'Real use: word counts, the most common item, duplicates',
            },
          },
          {
            kicker: 'Frequency · the code',
            title: 'One pass, one dictionary',
            visual: {
              type: 'code',
              code: FREQUENCY_CODE,
              output: "{'h': 1, 'e': 1, 'l': 2, 'o': 1}\nl",
            },
            note: 'The last line finds the most frequent letter. `collections.Counter(text)` does the counting in one call.',
            narration:
              'This is the tally idea in code. The dictionary called counts starts empty. For each letter in hello, the get method returns the count so far, or 0 if the letter is new, and we add 1. After one pass, it prints h 1, e 1, l 2 and o 1. The last line asks for the key with the highest count, and prints l. In real work, the Counter class does this counting in one call.',
          },
          {
            kicker: 'Words',
            title: 'Reverse the words of a sentence',
            visual: { type: 'code', code: WORDS_CODE, output: 'hot is tea\naet si toh' },
            note: '`split` cuts the sentence at spaces, and `join` glues the pieces back with a space.',
            narration:
              'A common follow up is to reverse the words, not the letters. The split method cuts the sentence tea is hot into a list of 3 words. Reversing that list and joining with spaces prints hot is tea. The last line does the opposite job: it keeps the word order but reverses each word, and prints aet si toh. Ask the interviewer which of the two they want.',
          },
          {
            kicker: 'Clean the input',
            title: 'Normalise text before you solve',
            body: 'Real input has capitals, spaces and punctuation. Ask whether they count. If not, clean the text first, then run the usual palindrome or frequency logic.',
            visual: {
              type: 'code',
              code: NORMALISE_CODE,
              output: "neveroddoreven True\n['tea', 'tea', 'and', 'dosa']",
            },
            note: '`isalnum()` is True for letters and digits. After cleaning, count the words with the usual dictionary loop.',
            narration:
              'Real input is messy, so clean it before you solve. The first part lowers the sentence and keeps only letters and digits, which the is alnum method checks. That gives never odd or even with no spaces or commas, and comparing it with its reverse prints True. The second part turns every punctuation mark into a space, then split breaks the line into words. It prints tea, tea, and, dosa, ready for a word count. Always ask first whether capitals, spaces and punctuation count.',
          },
          {
            kicker: 'Try it',
            title: 'Count the vowels',
            try: {
              type: 'code',
              prompt:
                'Finish `count_vowels` so it prints 4 for "Interview". Count a, e, i, o and u, in capitals too.',
              starter: VOWELS_START,
              expected: '4',
              hint: 'Use `for ch in s.lower():` and then `if ch in "aeiou": count += 1`.',
            },
          },
        ],
      },
    },
    {
      key: 'slides.lists',
      kind: 'SLIDES',
      title: 'List and dictionary problems',
      depthRank: 1,
      conceptKeys: [LIST],
      body: {
        slides: [
          {
            kicker: 'Largest',
            title: 'Keep the best so far',
            body: 'A judge at a singing contest remembers only the best singer so far. Each new singer is compared with that one. Finding the largest number works the same way.',
            visual: { type: 'code', code: LARGEST_CODE, output: '9 -2 None' },
            note: 'Start from the first item, not from 0. A list of negative numbers would break that.',
            narration:
              'Think of a judge who remembers only the best singer so far. The function largest does the same with numbers. It first handles an empty list by returning None. Then the variable best starts as the first number, and the loop replaces it whenever a bigger number appears. It prints 9 for the first list, minus 2 for the list of negatives, and None for the empty list. Notice that best starts from the first item, not from 0.',
          },
          {
            kicker: 'Second largest · the story',
            title: 'Gold and silver in one pass',
            body: 'At a race, you track gold and silver as runners finish. A faster runner takes gold and pushes the old gold down to silver. A repeat of the gold time changes nothing.',
            animation: {
              name: 'second-largest-scan',
              caption: 'Real use: top results without sorting everything',
            },
          },
          {
            kicker: 'Second largest · the code',
            title: 'Two variables, no sorting',
            visual: { type: 'code', code: SECOND_CODE, output: '7\nNone None' },
            note: 'With no second value, as in [5, 5] or [3], it returns None. Say that case aloud.',
            narration:
              'Here are gold and silver in code. The variable big holds the largest number so far, and second holds the runner up. For each number, if it beats big, the old big moves down to second. Otherwise, if it is different from big and beats second, it becomes the new second. For 4, 9, 2, 9, 7 it prints 7. For a list with no second value, like 5 and 5, or just 3, it prints None. Mention that case to the interviewer.',
          },
          {
            kicker: 'Duplicates',
            title: 'Remove duplicates, keep the order',
            visual: { type: 'code', code: DEDUPE_CODE, output: '[7, 3, 1]\n[7, 3, 1]' },
            note: 'A set also removes duplicates, but it loses the order. To find the duplicates, count each value and keep the counts above 1.',
            narration:
              'This code removes duplicates but keeps the first appearance of each value. The list called seen starts empty. For each ID, we add it only if it is not already in seen. So 7, 3, 7, 1, 3 becomes 7, 3, 1. The last line is the short way: dictionary keys are unique and keep their order, so it prints the same list. A set would also remove duplicates, but the order could change.',
          },
          {
            kicker: 'Missing number · the story',
            title: 'Who is absent from the roll',
            body: 'A class has roll numbers 1 to 5, and one student is absent. Add up all five roll numbers, subtract the sum of those present, and what is left is the absent number.',
            visual: { type: 'code', code: MISSING_CODE, output: '3' },
            narration:
              'Think of a class with roll numbers 1 to 5 and one student absent. The list nums has 4 numbers, so n is 5. The sum of 1 to n is n times n plus 1, divided by 2, which is 15. The numbers present add up to 12. The difference, 3, is the missing number, and that is what it prints. No sorting and no searching is needed.',
          },
          {
            kicker: 'Quick ones',
            title: 'Filter and swap in one line',
            visual: { type: 'code', code: QUICK_CODE, output: '[8, 10, 12]\n9 5' },
            note: '`x % 2 == 0` is True for even numbers. In the swap, Python builds the right side first, then assigns both names.',
            narration:
              'Two quick questions that come up often. The first line of output uses a list comprehension to keep only the even numbers. A number is even when the remainder after dividing by 2 is 0, so it prints 8, 10 and 12. The second part swaps two variables without a third one. Python builds the pair on the right first, then assigns both names, so a becomes 9 and b becomes 5.',
          },
          {
            kicker: 'Time complexity',
            title: 'Say the cost of each answer',
            body: 'After the tests, interviewers usually ask for the time complexity. Count how many times your loops run as the input grows.',
            visual: {
              type: 'icons',
              items: [
                {
                  icon: 'repeat',
                  label: 'Palindrome, frequency: O(n)',
                  sub: 'One pass over the input',
                },
                {
                  icon: 'chart',
                  label: 'Largest, second largest: O(n)',
                  sub: 'One pass with one or two variables',
                },
                { icon: 'search', label: 'Missing number: O(n)', sub: 'One sum, no sorting' },
                {
                  icon: 'filter',
                  label: 'Anagram by sorting: O(n log n)',
                  sub: 'Counting letters in a dict instead is O(n)',
                },
                {
                  icon: 'list',
                  label: 'Dedupe with a list: O(n²)',
                  sub: '`not in` scans the list; a set of seen items makes it O(n)',
                },
              ],
            },
            note: 'O(n) means the work grows in step with the input. With O(n²), double the input and the work grows about four times.',
          },
          {
            kicker: 'Try it',
            title: 'A largest that starts at zero',
            try: {
              type: 'choice',
              prompt:
                'A function finds the largest number, but it starts with `best = 0`. Which input gives a wrong answer?',
              options: [
                {
                  text: '[-5, -2]',
                  correct: true,
                  feedback: 'Right. Every number is below 0, so it wrongly returns 0, not −2.',
                },
                {
                  text: '[4, 9, 2]',
                  correct: false,
                  feedback: 'It works here, because 9 is above 0.',
                },
                {
                  text: '[7]',
                  correct: false,
                  feedback: 'It works here, because 7 is above 0.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'playground.topn',
      kind: 'PLAYGROUND',
      title: 'The most frequent words',
      depthRank: 1,
      conceptKeys: [LIST],
      body: {
        language: 'python',
        instructions:
          "Finish `top_n(words, n)`. It returns the `n` most frequent words, the highest count first. Words with the same count come in a to z order. It should print `['tea', 'dosa']` and then `['a']`.",
        starterCode: TOPN_START,
        hints: [
          'Count with `counts[w] = counts.get(w, 0) + 1` inside a loop over `words`.',
          'Sort the dictionary keys with `sorted(counts, key=...)`.',
          'A key of `(-counts[w], w)` puts high counts first, then sorts ties by the word.',
          'Return a slice: `ranked[:n]`.',
        ],
        solution: TOPN_SOLUTION,
        checks: [
          {
            type: 'stdout_contains',
            value: "['tea', 'dosa']",
            label: 'The two most frequent words, highest count first',
          },
          {
            type: 'stdout_contains',
            value: "['a']",
            label: 'A tie is broken in a to z order',
          },
        ],
      },
    },
    {
      key: 'slides.numbers',
      kind: 'SLIDES',
      title: 'Number problems',
      depthRank: 1,
      conceptKeys: [NUM],
      body: {
        slides: [
          {
            kicker: 'Prime · the story',
            title: 'Tiles that fit in only one row',
            body: 'You can lay 12 tiles as 3 rows of 4. But 7 tiles fit only in a single row. A **prime** number has exactly two divisors: 1 and itself. To test a number, try dividing it by smaller numbers.',
            animation: {
              name: 'prime-divisor-check',
              caption: 'Real use: a classic test of loops and stopping early',
            },
          },
          {
            kicker: 'Prime · the code',
            title: 'Stop at the square root',
            visual: {
              type: 'code',
              code: PRIME_CODE,
              output: 'True False False\n[2, 3, 5, 7, 11, 13, 17, 19]',
            },
            note: 'A divisor above the square root always has a partner below it. So the loop stops once d × d is more than n.',
            narration:
              'Here is the prime check. Numbers below 2 are not prime, so we return False for them first. Then d starts at 2, and the loop runs while d times d is at most n. If n divides exactly by d, the remainder is 0 and we return False. If no divisor is found, we return True. It prints True for 29, False for 91, which is 7 times 13, and False for 1. The last line lists the primes below 20.',
          },
          {
            kicker: 'Factorial',
            title: 'Multiply 1 up to n',
            body: 'Five people can stand in a queue in 5 × 4 × 3 × 2 × 1 = 120 ways. That product is the **factorial** of 5, written 5!.',
            visual: {
              type: 'code',
              code: FACTORIAL_CODE,
              output: '120 1\nError: n is negative',
            },
            note: 'The factorial of 0 is 1, and the loop handles it. A negative number has no factorial, so raise an error. The DSA patterns unit writes it with recursion.',
            narration:
              'Five people can queue in 120 different orders, and that number is the factorial of 5. A negative number has no factorial, so the function raises a ValueError for it first. Then result starts at 1, and the loop multiplies it by every number from 2 up to n. For 5 it prints 120. For 0 the loop does not run at all, so it prints 1, which is the correct factorial of 0. Calling it with minus 3 raises the error, and the except block prints the message.',
          },
          {
            kicker: 'Fibonacci · the story',
            title: 'Add the last two',
            body: 'Start with 0 and 1. Every next number is the sum of the two before it: 0, 1, 1, 2, 3, 5, 8. This is the **Fibonacci** series. You only need to remember the last two numbers.',
            animation: {
              name: 'fibonacci-window',
              caption: 'Real use: a classic test of loops and updating variables',
            },
          },
          {
            kicker: 'Fibonacci · the code',
            title: 'Two variables slide forward',
            visual: { type: 'code', code: FIBONACCI_CODE, output: '[0, 1, 1, 2, 3, 5, 8, 13]' },
            note: '`a, b = b, a + b` updates both at once. A plain recursive version repeats work and slows down quickly.',
            narration:
              'This function builds the Fibonacci series with just two variables. They start as a equal to 0 and b equal to 1. In each round, we save a in the list, then slide forward: a takes the value of b, and b becomes the sum of the two. Python updates both together, so no temporary variable is needed. For a count of 8, it prints 0, 1, 1, 2, 3, 5, 8, 13.',
          },
          {
            kicker: 'Armstrong',
            title: 'Digits raised to a power',
            body: '153 has 3 digits, and 1³ + 5³ + 3³ = 1 + 125 + 27 = 153. A number equal to this sum is an **Armstrong** number. The power is the number of digits.',
            visual: {
              type: 'code',
              code: ARMSTRONG_CODE,
              output: 'True False\n[153, 370, 371, 407]',
            },
            note: 'Without the first check, `int("-")` would crash on a negative number. Test negatives in every digit problem.',
            narration:
              'An Armstrong number equals the sum of its digits, each raised to the number of digits. A minus sign is not a digit, so the function returns False for a negative number first. Then it turns the number into a string to get its digits, and the power is the length of that string. The loop raises each digit to that power and adds it to total. For 153, that is 1 plus 125 plus 27, which is 153 again, so it prints True. Minus 153 gives False. The last lines find all four 3 digit Armstrong numbers.',
          },
          {
            kicker: 'Digits',
            title: 'Reverse a number without strings',
            visual: {
              type: 'code',
              code: REVERSE_INT_CODE,
              output: '1234 4321\n120 21\n-123 -321\n0 0',
            },
            note: '`n % 10` takes the last digit, and `n // 10` drops it. For a negative number, reverse `-n` and put the minus sign back.',
            narration:
              'Sometimes you must reverse a number without turning it into a string. Two operations do all the work. The remainder after dividing by 10 gives the last digit, and whole number division by 10 removes it. A negative number would skip the loop and give 0, so we first save the sign and make n positive. In each round, we shift result one place to the left and add the last digit of n. So 1234 becomes 4321, and 120 becomes 21, because a number cannot start with a zero. Minus 123 becomes minus 321, and 0 stays 0.',
          },
          {
            kicker: 'Patterns',
            title: 'Rows and columns with two loops',
            visual: { type: 'code', code: PATTERN_CODE, output: '1\n2 3\n4 5 6\n7 8 9 10' },
            note: 'The outer loop picks the row; the inner loop fills it. Every pattern question is built from these two loops.',
            narration:
              'Pattern questions always use two loops. The outer loop goes through the rows, from row 1 to row 4. The inner loop runs once for each number in that row, so row 1 gets 1 number and row 4 gets 4. The variable num keeps counting upward across the rows. It prints 1, then 2 3, then 4 5 6, then 7 8 9 10: a number triangle.',
          },
          {
            kicker: 'Try it',
            title: 'Sum of the digits',
            try: {
              type: 'code',
              prompt: 'Finish `digit_sum` using `% 10` and `// 10`, so that it prints 10 for 1234.',
              starter: DIGITS_START,
              expected: '10',
              hint: 'Inside `while n > 0:` write `total += n % 10`, then `n //= 10`.',
            },
          },
        ],
      },
    },
    {
      key: 'check.basics',
      slotKey: 'check',
      kind: 'KNOWLEDGE_CHECK',
      title: 'Coding round check',
      depthRank: 1,
      conceptKeys: [STR, LIST, NUM],
      body: {
        items: [
          {
            key: 'pointers',
            type: 'predict_output',
            prompt: 'What does this print?',
            language: 'python',
            code: 's = "abca"\nleft, right = 0, len(s) - 1\nsteps = 0\nwhile left < right and s[left] == s[right]:\n    left += 1\n    right -= 1\n    steps += 1\nprint(steps, left < right)',
            options: [
              { id: 'a', text: '1 True' },
              { id: 'b', text: '2 False' },
              { id: 'c', text: '0 True' },
              { id: 'd', text: '2 True' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'The ends "a" and "a" match, so the pointers move once. Then "b" and "c" differ, and the loop stops with left still before right. So "abca" is not a palindrome.',
          },
          {
            key: 'frequency',
            type: 'predict_output',
            prompt: 'What does this print?',
            language: 'python',
            code: 'c = {}\nfor ch in "banana":\n    c[ch] = c.get(ch, 0) + 1\nbest = max(c, key=c.get)\nprint(best, c[best])',
            options: [
              { id: 'a', text: 'a 3' },
              { id: 'b', text: 'n 2' },
              { id: 'c', text: 'b 1' },
              { id: 'd', text: 'a 2' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'The counts are b 1, a 3 and n 2. The key with the highest count is "a", with 3.',
          },
          {
            key: 'second',
            type: 'predict_output',
            prompt: 'What does this print?',
            language: 'python',
            code: 'big = second = None\nfor n in [2, 7, 7, 4]:\n    if big is None or n > big:\n        big, second = n, big\n    elif n != big and (second is None or n > second):\n        second = n\nprint(big, second)',
            options: [
              { id: 'a', text: '7 4' },
              { id: 'b', text: '7 7' },
              { id: 'c', text: '7 2' },
              { id: 'd', text: '4 7' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'After 2 and 7, big is 7 and second is 2. The repeated 7 is skipped. Then 4 beats 2, so second becomes 4.',
          },
          {
            key: 'root',
            type: 'mcq',
            prompt:
              'To test whether 97 is prime with the square-root rule, what is the largest divisor you need to try?',
            options: [
              { id: 'a', text: '9' },
              { id: 'b', text: '96' },
              { id: 'c', text: '48' },
              { id: 'd', text: '10' },
            ],
            answer: { correct: ['a'] },
            explanation:
              '9 × 9 is 81, which is at most 97. 10 × 10 is 100, which is more than 97, so the loop stops after 9.',
          },
          {
            key: 'missing',
            type: 'mcq',
            prompt:
              'The list [1, 2, 3, 5, 6] holds the numbers 1 to 6 with one missing. What does n × (n + 1) ÷ 2 − sum give, with n = 6?',
            options: [
              { id: 'a', text: '4' },
              { id: 'b', text: '3' },
              { id: 'c', text: '21' },
              { id: 'd', text: '17' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'The sum of 1 to 6 is 6 × 7 ÷ 2 = 21. The list adds up to 17. The difference, 4, is the missing number.',
          },
        ],
      },
    },
    {
      key: 'interview.palindrome',
      kind: 'INTERVIEW_PLAYBOOK',
      title: 'Live coding answer structure',
      depthRank: 1,
      conceptKeys: [STR, LIST, NUM],
      body: {
        question: '"Write a function to check whether a string is a palindrome."',
        totalMinutes: 5,
        steps: [
          {
            title: 'Restate',
            detail:
              'Say the task back: return True if the string reads the same both ways. Ask whether capitals and spaces should count.',
          },
          {
            title: 'Example',
            detail: 'Give one of each: "level" should give True, and "lever" should give False.',
          },
          {
            title: 'Plan',
            detail:
              'Say the idea before typing: two pointers from the ends, compare, then move inward.',
          },
          {
            title: 'Code',
            detail: 'Write it while explaining each line. Use clear names such as left and right.',
          },
          {
            title: 'Test',
            detail:
              'Trace "level" by hand. Then try an empty string, one letter, and a word that fails.',
          },
          {
            title: 'Cost',
            detail: 'One pass over the string, so the time is O(n), with no extra memory.',
          },
        ],
        followUps: [
          'Can you solve it without slicing or built-in functions?',
          'How would you ignore spaces, punctuation and capitals?',
          'How do you check whether two strings are anagrams?',
          'How do you find the second largest number without sorting?',
          'Why can a prime check stop at the square root?',
          'Print the first n Fibonacci numbers.',
        ],
      },
    },
    {
      key: 'interview-questions',
      kind: 'CARD_DECK',
      title: 'Interview questions and answers',
      depthRank: 1,
      conceptKeys: [STR, LIST, NUM],
      body: {
        layout: 'flip',
        cards: [
          {
            title: 'Character frequency',
            front:
              'Count how often each character appears in a name like "John Doe", ignoring capitals and spaces.',
            back: 'Lower-case the text, skip spaces, and count with `counts[ch] = counts.get(ch, 0) + 1`. One pass, so the time is O(n). "John Doe" gives j 1, o 2, h 1, n 1, d 1 and e 1. `collections.Counter` does the counting in one call.',
          },
          {
            title: 'Palindrome sentence',
            front:
              'Check whether a sentence is a palindrome, ignoring capitals, spaces and punctuation, without slicing.',
            back: 'First keep only letters and digits in lower case, using `ch.isalnum()`. Then move two pointers inward from both ends, and return False at the first mismatch. That is O(n) time. Test an empty string, one letter, and a sentence like "Never odd, or even".',
          },
          {
            title: 'Third most frequent character',
            front:
              'Find the character with the third highest frequency. On a tie, pick the one with the lowest ASCII value.',
            back: 'Count with a dict, then sort the characters with the key `(-counts[ch], ch)`. Higher counts come first, and ties go in ASCII order. Take index 2. First ask whether they mean the third character in that ranking or the third distinct count. Say what you return with fewer than three distinct characters.',
          },
          {
            title: 'Second largest number',
            front:
              'Find the second largest number in a list without sorting or using `max()`. Which edge cases do you test?',
            back: 'Keep two variables in one pass. A bigger number pushes the old largest down to second. A number between them replaces second, and a repeat is skipped. Start both at None, not 0, so negatives work. Test [5, 5], [3] and an empty list.',
          },
          {
            title: 'Anagram check',
            front: 'Check whether two words are anagrams. Can you do it without sorting?',
            back: 'With sorting, compare `sorted(a.lower())` with `sorted(b.lower())`, which is O(n log n). Without sorting, count the letters of each word in a dict and compare the two dicts, which is O(n). Ask first whether spaces count: "Dormitory" and "dirty room" match only after you remove spaces.',
          },
          {
            title: 'Duplicates without a set',
            front:
              'Remove duplicates from a list without converting it to a set, and keep the original order. What is the time complexity?',
            back: 'Loop once and append each item only if it is not already in a `seen` list. That is O(n²), because `x not in seen` scans the list each time. If a helper set is allowed, checking a set of seen items makes it O(n). `list(dict.fromkeys(items))` is the short form.',
          },
          {
            title: 'Items in only one set',
            front:
              'Given `{1, 2, 3, 4}` and `{3, 4, 5, 6}`, return the items that are in only one of them, using a single operator.',
            back: 'Use the symmetric difference operator: `a ^ b` gives `{1, 2, 5, 6}`. It keeps items in either set but not in both. The related operators are `a | b` for all items, `a & b` for common items, and `a - b` for items only in `a`.',
          },
          {
            title: 'Factorial edge cases',
            front:
              'Write a factorial function. What should it return for 0, and for a negative number?',
            back: 'Start `result` at 1 and multiply it by every number from 2 to n. For 0 the loop never runs, so it returns 1, which is correct. A negative number has no factorial, so raise a ValueError instead of quietly returning 1. Test 5, 0 and -3.',
          },
          {
            title: 'Prime check and square root',
            front: 'Why can a prime check stop at the square root of n?',
            back: 'Divisors come in pairs that multiply to n, like 3 × 12 = 36. In each pair, one number is at most the square root. So if nothing up to the square root divides n, nothing above it can. That makes the check about O(√n) steps instead of O(n).',
          },
        ],
      },
    },
    {
      key: 'summary.basic',
      slotKey: 'summary',
      kind: 'SUMMARY',
      title: 'Coding round: key takeaways',
      depthRank: 1,
      conceptKeys: [STR, LIST, NUM],
      body: {
        takeaways: [
          'Restate the problem, try a small example, code while you explain, then test edge cases.',
          'Palindrome: two pointers from the ends. Anagram: the same sorted letters, or the same counts.',
          'Frequency: one pass with a dictionary and counts.get(ch, 0) + 1.',
          'Largest and second largest: one pass with one or two variables; start from the first item or None, never 0.',
          'Prime: try divisors only up to the square root. Fibonacci: keep the last two numbers.',
          'For digits, the remainder by 10 takes the last digit and whole division by 10 drops it.',
        ],
        remember: [
          'Empty, one item, duplicates, negatives',
          'counts[x] = counts.get(x, 0) + 1',
          'a, b = b, a + b',
        ],
      },
    },
  ],
};
