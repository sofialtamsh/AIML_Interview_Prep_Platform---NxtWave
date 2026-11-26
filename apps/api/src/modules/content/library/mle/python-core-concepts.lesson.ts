/**
 * Python for Interviews → Core Python concepts.
 *
 * Evidence (Hiring Intelligence, ML/AI families, Jan–Oct 2026; internal only, never quoted to
 * students): 120 core-Python questions. The favourites, in order: list vs tuple (vs set, dict),
 * mutability (including "a list inside a tuple"), decorators ("write a simple decorator"),
 * functions (parameters, return values, scope), lambda, map and filter, generators, yield and
 * next, try/except (catching ValueError and a generic Exception), == vs is, dict keys and None
 * values, slicing and list comprehensions. 8+ LPA rounds add context managers (with open),
 * if __name__ == "__main__", threads vs processes, async/await and call by reference.
 * 3–6 LPA teaches this at depth 2 (collections, functions and decorators, generators and
 * exceptions); 8–12 LPA at depth 3, where 8+ rounds asked almost nothing about decorators or
 * map/filter, so slot keys swap in refresher decks (collections, functions), a batching-generator
 * playground and merged checks, and add references and copying, context managers, __main__,
 * monkey patching, the GIL and async. Every path stays within 45 minutes. Every code output in
 * this file is checked by running it with Python 3.14, the version the in-browser runner uses
 * (scratchpad verify-python.mts: outputs, playground starters fail and solutions pass, try-its).
 */
import type { LessonDocumentInput } from '@app/content';

const TYPES = 'py.core.types-mutability';
const FUNCS = 'py.core.functions-decorators';
const GENEX = 'py.core.generators-exceptions';

const ATTENDANCE = `# Roll numbers scanned at the lab door (some scanned twice)
scans = [101, 104, 101, 107, 104, 110]

present = set(scans)                    # unique students
print("Present:", sorted(present))

counts = {}                             # scans per student
for roll in scans:
    counts[roll] = counts.get(roll, 0) + 1
print("Scanned twice:", [r for r, n in counts.items() if n > 1])

lab = ("AI Lab", 2, 40)                 # name, floor, seats: fixed facts
name, floor, seats = lab                # tuple unpacking
print(f"{name}, floor {floor}: {seats - len(present)} seats free")
`;

const LIST_METHODS_CODE = `cart = ["tea"]
cart.append("dosa")            # one item at the end
cart.extend(["idli", "vada"])  # each item of a list
cart.insert(0, "coffee")       # at a position
print(cart)
cart.remove("idli")            # by value
last = cart.pop()              # by index, the last by default
print(cart, last)`;
const LIST_METHODS_NOTE =
  '`append([1, 2])` adds one item, the whole list; `extend([1, 2])` adds two. `remove` raises a ValueError if the value is missing.';
const LIST_METHODS_NARRATION =
  'These five list methods come up often in interviews. The list cart starts with tea. Append adds one item, dosa, at the end. Extend takes another list and adds each of its items, so idli and vada join separately. Insert puts coffee at index 0, the front. The first print shows coffee, tea, dosa, idli and vada. Then remove deletes idli by its value, and pop removes the last item, vada, and returns it. So the second print shows coffee, tea and dosa, then vada.';

const EXPLORER_CODE = (text: string) => `text = "${text}"  # what the user typed
try:
    # only the risky lines go in try
    people = int(text)
    share = 100 / people
except ValueError:
    print("Please type a number")
except ZeroDivisionError:
    print("People can't be 0")
else:
    # runs only if try had no error
    print(f"Each pays ₹{share}")
finally:
    print("Done")
`;

export const PYTHON_CORE_CONCEPTS_LESSON: LessonDocumentInput = {
  title: 'Core Python concepts',
  subtitle:
    'Lists, tuples, sets and dicts, functions and decorators, generators and exceptions, explained with code you can run.',
  objectives: [
    {
      key: 'collections',
      text: 'Choose between a list, tuple, set and dict, and explain mutability with an example',
      minDepthRank: 1,
    },
    {
      key: 'functions',
      text: 'Write functions, lambdas and a simple decorator, and explain how a decorator wraps a function',
      minDepthRank: 1,
    },
    {
      key: 'generators',
      text: 'Write a generator with yield, and handle errors with try, except, else and finally',
      minDepthRank: 2,
    },
    {
      key: 'deeper',
      text: 'Explain references and copying, context managers, __main__ and the GIL',
      minDepthRank: 3,
    },
  ],
  sections: [
    {
      key: 'hook',
      kind: 'HOOK',
      title: 'Collections in everyday apps',
      depthRank: 1,
      conceptKeys: [TYPES],
      body: {
        scenario:
          "Open any food-delivery app. Your **cart** changes as you add and remove dishes. The restaurant's **location** is a fixed pair of numbers. Its **tags**, like veg or offers, never repeat. The **menu** finds a price by dish name. Each one is a Python collection.",
        animation: { name: 'list-vs-tuple', caption: 'The cart changes; the map pin stays fixed' },
        realWorld: {
          title: 'Where you see them',
          items: [
            { icon: 'cart', label: 'Cart: a list', sub: 'Add, remove and reorder dishes' },
            { icon: 'pin', label: 'Location: a tuple', sub: '(12.97, 77.59) never changes' },
            { icon: 'tag', label: 'Tags: a set', sub: 'Each tag appears once' },
            { icon: 'food', label: 'Menu: a dict', sub: 'Dish name to price' },
          ],
        },
        provocation: 'Which collection would you pick for each, and why?',
        bridge:
          "Interviewers then add a twist: `t = (1, [2, 3])`, then `t[1].append(4)`. Tuples can't change, so what prints? By the end of this lesson you'll know, and why.",
      },
    },
    {
      key: 'slides.collections',
      slotKey: 'collections',
      kind: 'SLIDES',
      title: 'Lists, tuples, sets and dicts',
      depthRank: 1,
      conceptKeys: [TYPES],
      body: {
        slides: [
          {
            kicker: 'Four collections',
            title: 'Pick the right container',
            visual: {
              type: 'icons',
              items: [
                { icon: 'list', label: 'List  [ ]', sub: 'Ordered, can change, allows repeats' },
                { icon: 'lock', label: 'Tuple  ( )', sub: 'Ordered, fixed once created' },
                { icon: 'filter', label: 'Set  { }', sub: 'Unique items, no order' },
                { icon: 'key', label: 'Dict  {key: value}', sub: 'Find a value by its key' },
              ],
            },
          },
          {
            kicker: 'List vs tuple',
            title: "Lists change, tuples don't",
            visual: {
              type: 'compare',
              left: {
                title: 'List [ ]',
                items: ['Add, remove and sort items', 'Use for: marks, a shopping cart'],
              },
              right: {
                title: 'Tuple ( )',
                items: [
                  'Fixed after you create it',
                  'Use for: coordinates, an RGB colour',
                  'Can be a dict key, if all its items are immutable',
                ],
              },
              better: 'none',
            },
          },
          {
            kicker: 'Try it',
            title: 'Try to change a tuple',
            try: {
              type: 'code',
              prompt: 'Run it and read the error. Then fix line 7 by building a new tuple.',
              starter:
                'marks = [78, 85]\nmarks.append(91)\nprint(marks)\n\n# Bengaluru on a map\npoint = (12.97, 77.59)\npoint[0] = 13.0\nprint(point)\n',
              expected: '(13.0, 77.59)',
              hint: 'Replace line 7 with `point = (13.0, point[1])`.',
            },
          },
          {
            kicker: 'Slicing and comprehensions',
            title: 'Take part of a list, or build a new one',
            animation: {
              name: 'comprehension-filter',
              caption: 'Filter, then transform',
            },
            visual: {
              type: 'code',
              code: 'marks = [72, 85, 91, 64, 78]\nprint(marks[1:3])   # index 1 up to, not including, 3\nprint(marks[-2:])   # the last two\nprint([m for m in marks if m >= 75])',
              output: '[85, 91]\n[64, 78]\n[85, 91, 78]',
            },
            note: 'A slice `[start:stop]` stops before `stop`.',
            narration:
              'Here is slicing and a comprehension in code. The list called marks holds 5 scores. The first print takes a slice from index 1 up to index 3, and a slice always stops just before the stop index, so it gives 85 and 91. The second print starts 2 places from the end, so it gives the last two marks, 64 and 78. The last line builds a new list that keeps only the marks of at least 75, so it prints 85, 91 and 78.',
          },
          {
            kicker: 'List methods',
            title: 'Five list methods to know',
            visual: {
              type: 'code',
              code: LIST_METHODS_CODE,
              output: "['coffee', 'tea', 'dosa', 'idli', 'vada']\n['coffee', 'tea', 'dosa'] vada",
            },
            note: LIST_METHODS_NOTE,
            narration: LIST_METHODS_NARRATION,
          },
          {
            kicker: 'Set',
            title: 'Sets keep only unique items',
            body: 'Use a set to drop duplicates or to check membership fast.',
            animation: {
              name: 'set-dedupe',
              caption: 'Real use: unique visitors, duplicate-free email lists',
            },
            visual: {
              type: 'code',
              code: 'cities = ["Pune", "Delhi", "Pune", "Chennai"]\nunique = set(cities)\nprint(len(unique))\nprint("Delhi" in unique)',
              output: '3\nTrue',
            },
            note: 'No order, so `unique[0]` fails. Careful: `{}` is an empty dict; write `set()` for an empty set.',
            narration:
              'This short program shows a set removing duplicates. The list called cities has 4 names, but Pune appears twice. Turning it into a set gives the variable unique, which keeps each city only once, so its length prints 3. The last line asks whether Delhi is in the set, and it prints True. Remember, a set has no order, so you cannot ask for its first item. And to make an empty set, call set, because a pair of empty braces makes a dict.',
          },
          {
            kicker: 'Dict',
            title: 'Dicts map keys to values',
            animation: {
              name: 'dict-lookup',
              caption: 'Real use: phone contacts, JSON from an API',
            },
            points: [
              'Keys must be unique and hashable (unchanging): a str, an int, or a tuple of those',
            ],
            visual: {
              type: 'code',
              code: 'stock = {"apple": 40, "mango": 25}\nstock["apple"] = 35       # update a value\nstock["kiwi"] = None       # None is a valid value\nprint(stock)\nprint({"a": 1, "a": 2})    # a repeated key: the last one wins',
              output: "{'apple': 35, 'mango': 25, 'kiwi': None}\n{'a': 2}",
            },
            note: '`stock["grape"]` raises a KeyError. `stock.get("grape")` gives `None`, the same as kiwi, so check `"grape" in stock` to tell them apart.',
            narration:
              'Let us walk through a dict called stock, which maps each fruit name to how many are left. We update apple to 35, then add kiwi with the value None, which is allowed. Printing stock shows apple 35, mango 25 and kiwi None. The last line builds a dict where the key a is written twice, and it prints a with the value 2, because the last one wins. One caution: asking directly for a missing key like grape raises a KeyError, while the get method quietly gives None.',
          },
          {
            kicker: 'Mutability',
            title: 'Mutable vs immutable',
            body: "Mutable objects change in place. Immutable ones can't; a change gives you a new object.",
            visual: {
              type: 'compare',
              left: { title: 'Mutable', items: ['list', 'dict', 'set'] },
              right: { title: 'Immutable', items: ['int, float, bool', 'str', 'tuple'] },
              better: 'none',
            },
            note: 'Strings are immutable too: `name.upper()` returns a new string.',
          },
          {
            kicker: 'Try it',
            title: 'A list inside a tuple',
            body: 'Back to the interview question.',
            note: 'Like a steel lunch box: fixed compartments, but a bag inside one can still take more.',
            try: {
              type: 'code',
              prompt: 'What does this print? Run it to check.',
              starter: 't = (1, [2, 3])\nt[1].append(4)\nprint(t)\n',
              expected: '(1, [2, 3, 4])',
              hint: 'The tuple still holds the same list. Only the list changed.',
            },
          },
          {
            kicker: '== vs is',
            title: 'Same value, or the same object',
            animation: { name: 'name-tags', caption: 'Two names, one object' },
            visual: {
              type: 'code',
              code: 'a = [1, 2]\nb = [1, 2]\nc = a\nprint(a == b)   # same value?\nprint(a is b)   # same object?\nprint(a is c)',
              output: 'True\nFalse\nTrue',
            },
            note: 'Use `is` mainly for `None` checks: `if x is None`.',
            narration:
              'This code shows the difference between equal values and the same object. The lists a and b are created separately, but both hold 1 and 2. The name c is simply a second name for the list a. The first print compares values, so it gives True. The second asks whether a and b are the very same object, and they are not, so it gives False. The third gives True, because a and c point to one list. In practice, use is mainly to check for None.',
          },
        ],
      },
    },
    {
      key: 'slides.collections-r',
      slotKey: 'collections',
      kind: 'SLIDES',
      title: 'Python collections refresher',
      depthRank: 3,
      conceptKeys: [TYPES],
      body: {
        slides: [
          {
            kicker: 'Mutability',
            title: 'Mutable vs immutable',
            body: "Mutable objects change in place. Immutable ones can't; a change gives you a new object.",
            visual: {
              type: 'compare',
              left: { title: 'Mutable', items: ['list', 'dict', 'set'] },
              right: { title: 'Immutable', items: ['int, float, bool', 'str', 'tuple'] },
              better: 'none',
            },
            note: '`t + (4,)` builds a new tuple, and `t` never changes. The comma matters: `(4)` is just the number 4.',
          },
          {
            kicker: 'Try it',
            title: 'A list inside a tuple',
            body: 'Back to the interview question. Predict the output first, then run it.',
            try: {
              type: 'code',
              prompt: 'What does this print? Run it to check.',
              starter: 't = (1, [2, 3])\nt[1].append(4)\nprint(t)\n',
              expected: '(1, [2, 3, 4])',
              hint: 'The tuple still holds the same list. Only the list changed.',
            },
          },
          {
            kicker: '== vs is',
            title: 'Same value, or the same object',
            visual: {
              type: 'code',
              code: 'a = [1, 2]\nb = [1, 2]\nc = a\nprint(a == b)   # same value?\nprint(a is b)   # same object?\nprint(a is c)',
              output: 'True\nFalse\nTrue',
            },
            note: 'Use `==` to compare values. Use `is` mainly for `None`, as in `if x is None`.',
            narration:
              'A quick reminder of a favourite interview question. The lists a and b are two separate lists with the same contents, 1 and 2, while c is just another name for a. Comparing a and b with double equals checks their values, so it prints True. Checking a is b asks if they are one object in memory, so it prints False. Checking a is c prints True, because both names point to the same list. Compare values with double equals, and keep is for None checks.',
          },
          {
            kicker: 'Slicing and comprehensions',
            title: 'Take part of a list, or build a new one',
            visual: {
              type: 'code',
              code: 'marks = [72, 85, 91, 64, 78]\nprint(marks[1:3])   # index 1 up to, not including, 3\nprint(marks[-2:])   # the last two\nprint([m for m in marks if m >= 75])',
              output: '[85, 91]\n[64, 78]\n[85, 91, 78]',
            },
            note: 'A slice is `[start:stop]` and stops before `stop`. Read the comprehension as: `m`, for each `m` in marks, if `m >= 75`.',
            narration:
              'Two tools you will use all the time: slicing and comprehensions. The list marks has 5 scores. Slicing from index 1 to 3 stops before index 3, so the first line prints 85 and 91. Slicing from minus 2 takes the last two items, 64 and 78. The final line is a list comprehension. Read it as: take m, for each m in marks, if m is at least 75. That gives a new list with 85, 91 and 78.',
          },
          {
            kicker: 'List methods',
            title: 'Five list methods to know',
            visual: {
              type: 'code',
              code: LIST_METHODS_CODE,
              output: "['coffee', 'tea', 'dosa', 'idli', 'vada']\n['coffee', 'tea', 'dosa'] vada",
            },
            note: LIST_METHODS_NOTE,
            narration: LIST_METHODS_NARRATION,
          },
          {
            kicker: 'sort vs sorted',
            title: 'sort() changes the list, sorted() makes a new one',
            visual: {
              type: 'code',
              code: 'marks = [82, 91, 76]\nranked = sorted(marks)    # a new list\nprint(ranked, marks)\nmarks.sort()              # changes marks, returns None\nprint(marks)',
              output: '[76, 82, 91] [82, 91, 76]\n[76, 82, 91]',
            },
            note: '`marks = marks.sort()` is a classic bug: `sort()` returns `None`.',
            narration:
              'Here are two ways to sort, and they behave differently. The function sorted takes the list marks and gives back a new list, which we store in ranked. So the first print shows ranked in order, 76, 82, 91, while marks is still in its old order, 82, 91, 76. Then the sort method changes marks itself, so the second print shows 76, 82, 91. Be careful: the sort method returns None, so never assign its result back to marks.',
          },
          {
            kicker: 'Quick one',
            title: 'A bool is a kind of int',
            visual: {
              type: 'code',
              code: 'print(True + True)\nprint(isinstance(True, int))',
              output: '2\nTrue',
            },
            note: '`True` behaves like 1 and `False` like 0, so `sum()` on a list of booleans counts the `True` values.',
            narration:
              'This tiny example surprises many people. The first line adds True and True, and it prints 2. The second line asks whether True is an instance of int, and it prints True. That is because in Python a bool is a special kind of int, where True behaves like 1 and False behaves like 0. A handy use: calling sum on a list of booleans counts how many of them are True.',
          },
        ],
      },
    },
    {
      key: 'code.attendance',
      kind: 'CODE_EXAMPLE',
      title: 'Attendance with three collections',
      depthRank: 1,
      conceptKeys: [TYPES],
      body: {
        language: 'python',
        code: ATTENDANCE,
        annotations: [
          {
            lines: [4, 5],
            note: 'A set drops the repeated scans. `sorted()` turns it into an ordered list for printing.',
          },
          {
            lines: [7, 9],
            note: '`counts.get(roll, 0)` returns 0 for a new roll number, so the count starts cleanly.',
          },
          {
            lines: [10, 10],
            note: 'A list comprehension: keep each roll number `r` whose count `n` is more than 1.',
          },
          {
            lines: [12, 14],
            note: 'The lab details never change, so a tuple fits. Unpacking gives each value a name.',
          },
        ],
        runnable: true,
        expectedOutput:
          'Present: [101, 104, 107, 110]\nScanned twice: [101, 104]\nAI Lab, floor 2: 36 seats free\n',
      },
    },
    {
      key: 'check.collections',
      slotKey: 'check-early',
      kind: 'KNOWLEDGE_CHECK',
      title: 'Collections and mutability check',
      depthRank: 1,
      conceptKeys: [TYPES],
      body: {
        items: [
          {
            key: 'slice',
            type: 'predict_output',
            prompt: 'What does this print?',
            language: 'python',
            code: 'nums = [10, 20, 30, 40, 50]\nprint(nums[1:4])',
            options: [
              { id: 'a', text: '[20, 30, 40]' },
              { id: 'b', text: '[10, 20, 30]' },
              { id: 'c', text: '[20, 30, 40, 50]' },
              { id: 'd', text: '[20, 30]' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Indexes start at 0, and a slice stops just before its end index. So `[1:4]` gives items 1, 2 and 3.',
          },
          {
            key: 'comprehension',
            type: 'predict_output',
            prompt: 'What does this list comprehension produce?',
            language: 'python',
            code: 'print([x * x for x in range(6) if x % 2 == 1])',
            options: [
              { id: 'a', text: '[0, 4, 16]' },
              { id: 'b', text: '[1, 9, 25]' },
              { id: 'c', text: '[1, 4, 9, 16, 25]' },
              { id: 'd', text: '[1, 3, 5]' },
            ],
            answer: { correct: ['b'] },
            explanation:
              '`range(6)` is 0 to 5. The `if` keeps the odd numbers 1, 3 and 5, and each is squared.',
          },
          {
            key: 'dict-keys',
            type: 'multi',
            prompt: 'Which of these can be dictionary keys? Pick all that apply.',
            options: [
              { id: 'a', text: 'A tuple, like `(12.97, 77.59)`' },
              { id: 'b', text: 'A string, like `"pune"`' },
              { id: 'c', text: 'A list, like `[1, 2]`' },
              { id: 'd', text: 'An integer, like `101`' },
            ],
            answer: { correct: ['a', 'b', 'd'] },
            explanation:
              'Keys must be immutable (hashable), so a list raises a TypeError. A tuple works only if everything inside it is immutable, so `(1, [2, 3])` cannot be a key.',
          },
        ],
      },
    },
    {
      key: 'check.collections-r',
      slotKey: 'check-early',
      kind: 'KNOWLEDGE_CHECK',
      title: 'Collections quick check',
      depthRank: 3,
      conceptKeys: [TYPES],
      body: {
        items: [
          {
            key: 'dict-keys',
            type: 'multi',
            prompt: 'Which of these can be dictionary keys? Pick all that apply.',
            options: [
              { id: 'a', text: 'A tuple, like `(12.97, 77.59)`' },
              { id: 'b', text: 'A string, like `"pune"`' },
              { id: 'c', text: 'A list, like `[1, 2]`' },
              { id: 'd', text: 'An integer, like `101`' },
            ],
            answer: { correct: ['a', 'b', 'd'] },
            explanation:
              'Keys must be immutable (hashable), so a list raises a TypeError. A tuple works only if everything inside it is immutable, so `(1, [2, 3])` cannot be a key.',
          },
        ],
      },
    },
    {
      key: 'interview.collections',
      kind: 'INTERVIEW_PLAYBOOK',
      title: 'List vs tuple answer structure',
      depthRank: 1,
      conceptKeys: [TYPES],
      body: {
        question: '"What is the difference between a list and a tuple?"',
        totalMinutes: 1,
        steps: [
          { title: 'The core difference', detail: 'A list is mutable; a tuple is immutable.' },
          {
            title: 'Show it',
            detail: '`append()` works on a list. Assigning to a tuple item raises a TypeError.',
          },
          {
            title: 'When to use each',
            detail:
              'A list for data that changes, like marks. A tuple for fixed records, like coordinates or a dict key.',
          },
          {
            title: 'The bonus point',
            detail: 'A tuple can hold a list, and that list can still change.',
          },
        ],
        followUps: [
          'Can a list inside a tuple be changed?',
          "Why can a tuple be a dictionary key, but a list can't?",
          'What is the difference between a set and a list?',
          'Is a string mutable or immutable?',
          'Can `(1, [2, 3])` be a dictionary key?',
        ],
      },
    },
    {
      key: 'slides.functions',
      slotKey: 'functions',
      kind: 'SLIDES',
      title: 'Functions, lambdas and decorators',
      depthRank: 1,
      conceptKeys: [FUNCS],
      body: {
        slides: [
          {
            kicker: 'Functions',
            title: 'Parameters in, a value out',
            animation: {
              name: 'function-machine',
              caption: 'Real use: one fee function, called for every order',
            },
            points: [
              'Positional arguments match parameters by their order',
              'Keyword arguments match by name, like `discount=0.25`',
              'A default value makes a parameter optional',
            ],
            visual: {
              type: 'code',
              code: 'def fee(amount, discount=0.1):\n    return amount * (1 - discount)\n\nprint(fee(1000))                  # positional; discount uses the default\nprint(fee(1000, discount=0.25))   # keyword argument',
              output: '900.0\n750.0',
            },
            narration:
              'Let us see a function at work. The function fee takes two parameters: amount, and discount, which has a default value of 0.1, meaning 10 percent. It returns the amount after removing the discount. In the first call we pass only 1000, so the default discount is used and it prints 900.0. In the second call we pass discount by name as 0.25, so it prints 750.0. A default value makes a parameter optional.',
          },
          {
            kicker: 'Scope',
            title: 'Variables inside a function stay inside',
            visual: {
              type: 'code',
              code: 'total = 0\n\ndef add_bonus(marks):\n    total = marks + 5    # a new, local variable\n    return total\n\nprint(add_bonus(80))\nprint(total)             # the outer total is untouched',
              output: '85\n0',
            },
            narration:
              'This program shows what scope means. At the top, a variable called total is set to 0. Inside the function add bonus, we assign to total again, but that creates a new local variable which lives only inside the function. Calling the function with 80 returns 85, so the first print shows 85. The second print shows the outer total, and it is still 0, because the function never touched it.',
          },
          {
            kicker: 'Lambda',
            title: 'A one-line function with no name',
            visual: {
              type: 'code',
              code: 'square = lambda x: x * x\nprint(square(7))\n\nstudents = [("Asha", 82), ("Ravi", 91), ("Meena", 76)]\nstudents.sort(key=lambda s: s[1], reverse=True)\nprint(students[0])',
              output: "49\n('Ravi', 91)",
            },
            note: 'Use a lambda for short, throwaway logic like a sort key. Use `def` when it needs a name or several lines.',
            narration:
              'A lambda is a small function written in one line. Here, square is a lambda that takes x and returns x times x, so calling it with 7 prints 49. Next, students is a list of name and marks pairs. We sort it with a lambda as the key, which picks the marks from each pair, and reverse set to True puts the highest first. So the first student printed is Ravi with 91. Lambdas suit short, one-time logic like this sort key.',
          },
          {
            kicker: 'map vs filter',
            title: 'Change every item, or keep some',
            visual: {
              type: 'compare',
              left: {
                title: 'map',
                items: [
                  'Applies a function to every item',
                  'map(lambda x: x * 2, [1, 2, 3]) gives 2, 4, 6',
                ],
              },
              right: {
                title: 'filter',
                items: [
                  'Keeps items where the function returns True',
                  'filter(lambda x: x > 1, [1, 2, 3]) gives 2, 3',
                ],
              },
              better: 'none',
            },
            note: 'Both return a map or filter object, not a list. Wrap them in `list()` to see the values.',
          },
          {
            kicker: 'Decorators',
            title: 'Wrap a function to add a step',
            body: 'A decorator takes a function and returns a new one that does something extra, like logging or timing.',
            animation: {
              name: 'decorator-wrap',
              caption: 'Real use: login checks, timing and logging in web apps',
            },
            note: 'Like gift wrap: the gift inside is the same, but now there is a layer around it.',
          },
          {
            kicker: 'Decorator code',
            title: 'A logging decorator',
            body: "`wrapper(*args)` accepts any number of arguments and passes them on to `func`. `func.__name__` is the function's name as a string.",
            visual: {
              type: 'code',
              code: 'def log_call(func):\n    def wrapper(*args):\n        print("Calling", func.__name__)\n        return func(*args)\n    return wrapper\n\n@log_call\ndef add(a, b):\n    return a + b\n\nprint(add(2, 3))',
              output: 'Calling add\n5',
            },
            note: '`@log_call` above `def add` is shorthand for `add = log_call(add)`.',
            narration:
              'Here is the gift wrap idea in code. The decorator log call takes a function, named func. Inside it we define wrapper, which accepts any arguments, prints the word Calling with the name of the function, and then runs the original function and returns its result. Writing at log call above add replaces add with this wrapped version. So when we call add with 2 and 3, it first prints Calling add, and then prints 5.',
          },
          {
            kicker: 'Try it',
            title: 'Read the @ line',
            try: {
              type: 'choice',
              prompt: 'In the code above, what does `@log_call` do?',
              options: [
                {
                  text: 'It replaces `add` with `log_call(add)`, the wrapped version',
                  correct: true,
                  feedback: 'Right. Every call to `add` now goes through `wrapper` first.',
                },
                {
                  text: 'It runs `log_call` only at the first call to `add`',
                  correct: false,
                  feedback:
                    'Decorating happens once, when Python reads the `def`, before any call.',
                },
                {
                  text: 'It makes `add` run faster',
                  correct: false,
                  feedback: "A decorator adds behaviour. It doesn't speed anything up by itself.",
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'slides.functions-r',
      slotKey: 'functions',
      kind: 'SLIDES',
      title: 'Functions and decorators refresher',
      depthRank: 3,
      conceptKeys: [FUNCS],
      body: {
        slides: [
          {
            kicker: 'Arguments',
            title: 'Positional, keyword, *args and **kwargs',
            visual: {
              type: 'code',
              code: 'def log(level, *args, sep=" ", **kwargs):\n    print(level, sep.join(args), kwargs)\n\nlog("INFO", "model", "saved")\nlog("WARN", "slow", "epoch", sep="-", epoch=3)',
              output: "INFO model saved {}\nWARN slow-epoch {'epoch': 3}",
            },
            note: '`*args` collects extra positional values into a tuple, `**kwargs` extra keyword values into a dict. A parameter after `*args`, like `sep`, must be passed by name.',
            narration:
              'This function, log, shows every kind of argument together. The first value goes to level. Any extra positional values are collected into a tuple called args, and any extra named values go into a dict called kwargs. The parameter sep is the text used to join the args. The first call prints INFO, then model saved, then an empty dict. The second call sets sep to a dash and passes epoch as 3, so it prints WARN, slow dash epoch, and a dict holding epoch 3.',
          },
          {
            kicker: 'Lambda',
            title: 'A lambda as a sort key',
            visual: {
              type: 'code',
              code: 'students = [("Asha", 82), ("Ravi", 91), ("Meena", 76)]\nstudents.sort(key=lambda s: s[1], reverse=True)\nprint(students[0])',
              output: "('Ravi', 91)",
            },
            note: 'Use a lambda for short, throwaway logic like a sort key. Use `def` when it needs a name or several lines.',
            narration:
              'The most common place for a lambda is a sort key. The list students holds pairs of a name and marks. When we sort, the key is a lambda that takes one student, called s, and returns the marks, which is the second item of the pair. With reverse set to True, the highest marks come first. So printing the first student gives Ravi with 91. For anything longer than one line, write a normal function with def.',
          },
          {
            kicker: 'Decorators',
            title: 'A decorator wraps a function',
            animation: {
              name: 'decorator-wrap',
              caption: 'Real use: login checks, timing and logging',
            },
            visual: {
              type: 'code',
              code: 'def log_call(func):\n    def wrapper(*args, **kwargs):\n        print("Calling", func.__name__)\n        return func(*args, **kwargs)\n    return wrapper\n\n@log_call\ndef add(a, b):\n    return a + b\n\nprint(add(2, 3))',
              output: 'Calling add\n5',
            },
            note: '`@log_call` means `add = log_call(add)`. Put `@functools.wraps(func)` above `def wrapper` so `add.__name__` stays "add", not "wrapper".',
            narration:
              'Let us read a decorator step by step. The function log call receives another function, named func, and returns a new function called wrapper. The wrapper accepts any positional and keyword arguments, prints Calling and the name of the function, then calls the original and returns its result. The at log call line above add is a shortcut for passing add into log call and storing the result back as add. So calling add with 2 and 3 prints Calling add, then 5.',
          },
        ],
      },
    },
    {
      key: 'playground.decorator',
      slotKey: 'practice',
      kind: 'PLAYGROUND',
      title: 'Write a decorator',
      depthRank: 1,
      conceptKeys: [FUNCS],
      body: {
        language: 'python',
        instructions:
          "Finish `shout` so it returns the wrapped function's result in **uppercase**. The file should then print `HELLO, ASHA` and `HELLO, RAVI`.",
        starterCode:
          'def shout(func):\n    def wrapper(*args):\n        pass  # your code here\n    return wrapper\n\n@shout\ndef greet(name):\n    return f"hello, {name}"\n\nprint(greet("asha"))\nprint(greet("ravi"))\n',
        hints: [
          'Call `func(*args)` and store the result.',
          '`text.upper()` gives an uppercase copy.',
        ],
        solution:
          'def shout(func):\n    def wrapper(*args):\n        result = func(*args)\n        return result.upper()\n    return wrapper\n\n@shout\ndef greet(name):\n    return f"hello, {name}"\n\nprint(greet("asha"))\nprint(greet("ravi"))\n',
        checks: [
          {
            type: 'stdout_contains',
            value: 'HELLO, ASHA',
            label: 'Prints HELLO, ASHA',
          },
          { type: 'stdout_contains', value: 'HELLO, RAVI', label: 'Prints HELLO, RAVI' },
        ],
      },
    },
    {
      key: 'check.functions',
      slotKey: 'check-fn',
      kind: 'KNOWLEDGE_CHECK',
      title: 'Functions and decorators check',
      depthRank: 1,
      conceptKeys: [FUNCS],
      body: {
        items: [
          {
            key: 'map-filter',
            type: 'predict_output',
            prompt: 'What does this print?',
            language: 'python',
            code: 'nums = [1, 2, 3]\nprint(list(map(lambda x: x * 2, filter(lambda x: x > 1, nums))))',
            options: [
              { id: 'a', text: '[4, 6]' },
              { id: 'b', text: '[2, 4, 6]' },
              { id: 'c', text: '[2, 3]' },
              { id: 'd', text: '[1, 4, 6]' },
            ],
            answer: { correct: ['a'] },
            explanation: '`filter` keeps 2 and 3. Then `map` doubles each, giving 4 and 6.',
          },
          {
            key: 'decorator-twice',
            type: 'predict_output',
            prompt: 'What does this print?',
            language: 'python',
            code: 'def twice(func):\n    def wrapper(x):\n        return func(func(x))\n    return wrapper\n\n@twice\ndef add_ten(x):\n    return x + 10\n\nprint(add_ten(1))',
            options: [
              { id: 'a', text: '21' },
              { id: 'b', text: '11' },
              { id: 'c', text: '12' },
              { id: 'd', text: 'An error' },
            ],
            answer: { correct: ['a'] },
            explanation:
              '`@twice` means `add_ten = twice(add_ten)`, so the original runs twice: 1 + 10 + 10.',
          },
          {
            key: 'explain-decorator',
            type: 'reasoning',
            prompt:
              'The interviewer asks: *"What is a decorator? Have you used one?"* Answer in three or four sentences, with one real use.',
            modelAnswer:
              'A decorator is a function that takes another function and returns a wrapped version of it. It adds behaviour without changing the original code. The @ syntax is shorthand for `add = log_call(add)`. In my project I used a timing decorator to log how long each data-cleaning step took.',
            rubric: [
              'Says a decorator takes a function and returns a new one',
              'Says it adds behaviour without editing the original function',
              'Mentions the @ syntax',
              'Gives one real use, like logging, timing or checking a login',
            ],
          },
        ],
      },
    },
    {
      key: 'check.functions-r',
      slotKey: 'check-fn',
      kind: 'KNOWLEDGE_CHECK',
      title: 'Functions quick check',
      depthRank: 3,
      conceptKeys: [FUNCS],
      body: {
        items: [
          {
            key: 'decorator-twice',
            type: 'predict_output',
            prompt: 'What does this print?',
            language: 'python',
            code: 'def twice(func):\n    def wrapper(x):\n        return func(func(x))\n    return wrapper\n\n@twice\ndef add_ten(x):\n    return x + 10\n\nprint(add_ten(1))',
            options: [
              { id: 'a', text: '21' },
              { id: 'b', text: '11' },
              { id: 'c', text: '12' },
              { id: 'd', text: 'An error' },
            ],
            answer: { correct: ['a'] },
            explanation:
              '`@twice` means `add_ten = twice(add_ten)`, so the original runs twice: 1 + 10 + 10.',
          },
        ],
      },
    },
    {
      key: 'slides.generators',
      kind: 'SLIDES',
      title: 'Generators and exceptions',
      depthRank: 2,
      conceptKeys: [GENEX],
      body: {
        slides: [
          {
            kicker: 'Generators',
            title: 'Make values one at a time',
            body: 'A function with `yield` returns a generator. It pauses at each `yield`, and resumes there on the next request.',
            visual: {
              type: 'code',
              code: 'def countdown(n):\n    while n > 0:\n        yield n\n        n -= 1\n\ng = countdown(3)\nprint(next(g))\nprint(next(g))\nprint(list(g))   # whatever is left',
              output: '3\n2\n[1]',
            },
            note: 'When nothing is left, `next(g)` raises StopIteration. A `for` loop catches it and stops for you.',
            narration:
              'Here is a generator called countdown. It takes a number n, and inside a loop it yields n, then reduces n by 1. The word yield hands out one value and pauses the function right there. We create the generator g starting at 3. The first next gives 3, the second next resumes and gives 2, and turning the rest into a list gives just 1. If you ask for more after that, Python raises StopIteration, which a for loop handles for you.',
          },
          {
            kicker: 'Why bother',
            title: 'Generators save memory',
            body: 'A generator makes each item only when asked, like streaming a film instead of downloading it.',
            animation: {
              name: 'generator-belt',
              caption: 'Real use: huge log files, AI replies streamed word by word',
            },
          },
          {
            kicker: 'Shortcut',
            title: 'Round brackets make it lazy',
            visual: {
              type: 'code',
              code: 'squares_list = [x * x for x in range(5)]   # a list\nsquares_gen = (x * x for x in range(5))    # a generator\nprint(squares_list)\nprint(sum(squares_gen))',
              output: '[0, 1, 4, 9, 16]\n30',
            },
            narration:
              'There is a shortcut for writing a generator. The first line uses square brackets, so squares list is a real list holding the squares of 0 to 4, all stored in memory. The second line is the same expression in round brackets, which makes squares gen, a generator that produces each square only when asked. Printing the list shows 0, 1, 4, 9 and 16. Passing the generator to sum pulls the values one at a time and prints 30.',
          },
          {
            kicker: 'Try it',
            title: 'Write a generator',
            try: {
              type: 'code',
              prompt: 'Finish `evens(n)` so it yields the even numbers below `n`. Then run it.',
              starter:
                'def evens(n):\n    for i in range(n):\n        # yield i only if it is even\n        pass\n\nprint(list(evens(10)))\n',
              expected: '[0, 2, 4, 6, 8]',
              hint: 'Replace `pass` with `if i % 2 == 0:` and, indented under it, `yield i`.',
            },
          },
          {
            kicker: 'Exceptions',
            title: 'try, except, else, finally',
            animation: {
              name: 'try-except-net',
              caption: 'Real use: a payment form asks again instead of crashing',
            },
            visual: {
              type: 'flow',
              steps: [
                { label: 'try: the risky code', icon: 'zap' },
                { label: 'except: handle an error', icon: 'shield' },
                { label: 'else: no error happened', icon: 'check' },
                { label: 'finally: always runs', icon: 'repeat' },
              ],
            },
            note: '`finally` is for clean-up, like closing a file or a database connection.',
          },
          {
            kicker: 'Catch the right error',
            title: 'Specific errors first, general last',
            visual: {
              type: 'code',
              code: 'def safe_div(a, b):\n    try:\n        return a / int(b)\n    except ValueError:\n        return "b must be a number"\n    except Exception as e:\n        return f"Other error: {e}"\n\nprint(safe_div(10, "4"))\nprint(safe_div(10, "four"))\nprint(safe_div(10, "0"))',
              output: '2.5\nb must be a number\nOther error: division by zero',
            },
            narration:
              'Now the try and except blocks in real code. The function safe div converts b to a whole number and divides a by it. With 10 and the text 4, it works and prints 2.5. With the word four, the conversion fails with a ValueError, so the first except block returns the message b must be a number. With the text 0, the division fails with a different error, so the general Exception block catches it and prints Other error, division by zero. The specific error is listed first, the general one last.',
          },
          {
            kicker: 'Try it',
            title: 'Why the order matters',
            try: {
              type: 'choice',
              prompt: 'Why does `except ValueError` come before `except Exception`?',
              options: [
                {
                  text: 'Python checks except blocks top to bottom, and `Exception` matches almost every error',
                  correct: true,
                  feedback:
                    'Right. Put `Exception` first and the `ValueError` block would never run.',
                },
                {
                  text: '`ValueError` must come first in every Python program',
                  correct: false,
                  feedback:
                    'There is no such rule. Order matters only because Python stops at the first match.',
                },
                {
                  text: '`Exception` cannot catch a `ValueError`, so each needs its own block',
                  correct: false,
                  feedback:
                    '`Exception` catches `ValueError` too. The order decides which block runs.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'playground.batches',
      slotKey: 'practice',
      kind: 'PLAYGROUND',
      title: 'Write a batching generator',
      depthRank: 3,
      conceptKeys: [GENEX],
      body: {
        language: 'python',
        instructions:
          'Models train on data in small batches. Write a generator `batches(items, size)` that yields lists of `size` items, with a shorter last batch if the items run out. Use `yield`, so it hands out one batch at a time.',
        starterCode:
          'def batches(items, size):\n    # Yield items[0:size],\n    # then items[size:2*size], ...\n    pass\n\nprint(type(batches([], 2)).__name__)\nfor b in batches([1, 2, 3, 4, 5, 6, 7], 3):\n    print(b)\n',
        hints: [
          '`range(0, len(items), size)` gives the start of each batch: 0, 3, 6.',
          'A slice like `items[start:start + size]` is safe past the end: it just returns fewer items.',
          'Use `yield`, not `return`, inside the loop.',
        ],
        solution:
          'def batches(items, size):\n    for start in range(0, len(items), size):\n        yield items[start:start + size]\n\nprint(type(batches([], 2)).__name__)\nfor b in batches([1, 2, 3, 4, 5, 6, 7], 3):\n    print(b)\n',
        checks: [
          {
            type: 'stdout_contains',
            value: 'generator',
            label: '`batches` is a generator (it uses yield)',
          },
          { type: 'stdout_contains', value: '[1, 2, 3]', label: 'The first batch has three items' },
          { type: 'stdout_contains', value: '[4, 5, 6]', label: 'The second batch comes next' },
          { type: 'stdout_contains', value: '[7]', label: 'The last batch is shorter' },
        ],
      },
    },
    {
      key: 'explorer.exceptions',
      kind: 'CODE_EXPLORER',
      title: 'Which blocks run',
      depthRank: 2,
      conceptKeys: [GENEX],
      body: {
        prompt:
          'A bill of ₹100 is split between friends. Change what the user types and watch which blocks run.',
        controls: [
          {
            id: 'typed',
            label: 'The user types',
            options: [
              { value: '4', label: '"4"' },
              { value: 'four', label: '"four"' },
              { value: '0', label: '"0"' },
            ],
          },
        ],
        states: [
          {
            when: { typed: '4' },
            code: EXPLORER_CODE('4'),
            output: { kind: 'text', value: 'Each pays ₹25.0\nDone\n' },
            verdict: {
              tone: 'ok',
              text: 'No error, so `try` runs to the end, then `else` prints the share, then `finally` runs.',
            },
          },
          {
            when: { typed: 'four' },
            code: EXPLORER_CODE('four'),
            output: { kind: 'text', value: 'Please type a number\nDone\n' },
            verdict: {
              tone: 'info',
              text: '`int("four")` raises a ValueError. The rest of `try` is skipped, `else` is skipped, and `finally` still runs.',
            },
          },
          {
            when: { typed: '0' },
            code: EXPLORER_CODE('0'),
            output: { kind: 'text', value: "People can't be 0\nDone\n" },
            verdict: {
              tone: 'info',
              text: '`int("0")` works, but dividing by 0 raises a ZeroDivisionError. Each error type gets its own `except`.',
            },
          },
        ],
        defaultState: { typed: '4' },
      },
    },
    {
      key: 'check.generators',
      slotKey: 'check-late',
      kind: 'KNOWLEDGE_CHECK',
      title: 'Generators and exceptions check',
      depthRank: 2,
      conceptKeys: [GENEX],
      body: {
        items: [
          {
            key: 'next',
            type: 'predict_output',
            prompt: 'What does this print?',
            language: 'python',
            code: 'def gen():\n    yield "a"\n    yield "b"\n\ng = gen()\nprint(next(g), next(g))',
            options: [
              { id: 'a', text: 'a b' },
              { id: 'b', text: 'a a' },
              { id: 'c', text: "['a', 'b']" },
              { id: 'd', text: 'An error' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Each `next(g)` resumes the generator where it paused, so you get "a" and then "b". A third `next(g)` would raise StopIteration.',
          },
          {
            key: 'finally',
            type: 'mcq',
            prompt: 'When does a `finally` block run?',
            options: [
              { id: 'a', text: 'Always, whether or not an error happened' },
              { id: 'b', text: 'Only when an error happens' },
              { id: 'c', text: 'Only when no error happens' },
              { id: 'd', text: 'Only when `try` has no `return`' },
            ],
            answer: { correct: ['a'] },
            explanation:
              '`finally` runs every time, even when `try` returns or an error is not caught. That makes it the right place for clean-up.',
          },
        ],
      },
    },
    {
      key: 'slides.deeper',
      kind: 'SLIDES',
      title: 'Deeper Python questions',
      depthRank: 3,
      conceptKeys: [TYPES, FUNCS, GENEX],
      body: {
        slides: [
          {
            kicker: 'References',
            title: 'Assignment never copies',
            body: 'Both names point to the same list, so a change through one shows through the other.',
            animation: { name: 'name-tags', caption: 'Two names, one list' },
            visual: {
              type: 'code',
              code: 'a = [1, 2, 3]\nb = a\nb.append(4)\nprint(a)',
              output: '[1, 2, 3, 4]',
            },
            note: 'Use `b = a.copy()` when you want a separate list.',
            narration:
              'This four line program catches many people. The list a holds 1, 2 and 3. Writing b equals a does not make a second list. It only gives the same list a second name. So when we append 4 through b, the list a changes too, and printing a shows 1, 2, 3, 4. If you want a separate list that you can change safely, use the copy method of a.',
          },
          {
            kicker: 'Call by reference',
            title: 'Python passes object references',
            body: 'Interviewers ask: call by value or by reference? Say "call by object reference". Changing the object shows outside; reassigning the name does not.',
            visual: {
              type: 'code',
              code: "def update(marks, bonus):\n    marks.append(90)     # changes the caller's list\n    bonus = bonus + 5    # makes a new local int\n    marks = [0]          # points the local name elsewhere\n\nmy_marks, my_bonus = [80], 5\nupdate(my_marks, my_bonus)\nprint(my_marks, my_bonus)",
              output: '[80, 90] 5',
            },
            narration:
              'Let us test call by object reference. The function update receives marks and bonus. Appending 90 to marks changes the same list the caller owns. Adding 5 to bonus only creates a new local number. And the last line points the local name marks at a new list, which the caller never sees. So after the call, my marks prints as 80 and 90, and my bonus is still 5. Changing the object shows outside, but reassigning a name does not.',
          },
          {
            kicker: 'Default arguments',
            title: 'The mutable default trap',
            body: 'A favourite bug-hunt question. A default value is built once, when Python runs the `def`, so a list default is shared by every call.',
            visual: {
              type: 'code',
              code: 'def add_item(item, cart=[]):\n    cart.append(item)\n    return cart\n\nprint(add_item("pen"))\nprint(add_item("book"))  # the same list again\n\ndef add_item_safe(item, cart=None):\n    if cart is None:\n        cart = []  # a new list on every call\n    cart.append(item)\n    return cart\n\nprint(add_item_safe("book"))',
              output: "['pen']\n['pen', 'book']\n['book']",
            },
            note: 'Use `None` as the default and create the list inside. The same trap applies to dict and set defaults.',
            narration:
              'Here is a bug that interviewers love to show. The function add item has a default cart, which is an empty list. Python builds that list only once, when it reads the def line. So the first call prints a list with pen, but the second call prints pen and book, because both calls share the same list. The safe version uses None as the default and creates a new list inside the function. Now the call with book prints a list holding only book.',
          },
          {
            kicker: 'Copying',
            title: 'Shallow copy vs deep copy',
            visual: {
              type: 'code',
              code: 'import copy\n\nteam = [["Asha", 82], ["Ravi", 91]]\nshallow = team.copy()\ndeep = copy.deepcopy(team)\n\nteam[0][1] = 99\nprint(shallow[0])\nprint(deep[0])',
              output: "['Asha', 99]\n['Asha', 82]",
            },
            note: 'A shallow copy copies only the outer list; the inner lists are shared. A deep copy copies everything.',
            narration:
              'Here we compare two kinds of copy. The list team holds two inner lists, one for Asha with 82 and one for Ravi with 91. The variable shallow is made with the copy method, and deep is made with deepcopy. Then we change the marks of Asha to 99 in team. The shallow copy prints Asha with 99, because it copied only the outer list and still shares the inner lists. The deep copy prints Asha with 82, because it copied everything.',
          },
          {
            kicker: 'Context managers',
            title: 'with: clean-up you cannot forget',
            points: [
              '`with` runs set-up on entry and clean-up on exit (`__enter__` and `__exit__`)',
              'The file closes even if the code inside fails',
              'Used for files, database connections and locks',
            ],
            visual: {
              type: 'code',
              code: 'with open("notes.txt", "w") as f:\n    f.write("hello")\n\nprint(f.closed)',
              output: 'True',
            },
            narration:
              'This is the most common context manager you will write. The with statement opens a file called notes for writing and gives it the name f. Inside the block we write the word hello. As soon as the block ends, Python closes the file for us, even if the code inside had failed. That is why the last line, which prints whether f is closed, shows True. The same pattern is used for database connections and locks.',
          },
          {
            kicker: 'Context managers',
            title: 'Write your own context manager',
            body: 'Any class with `__enter__` and `__exit__` works with `with`. `__exit__` runs even when the block raises an error, so clean-up always happens.',
            visual: {
              type: 'code',
              code: 'class Step:\n    def __init__(self, name):\n        self.name = name\n    def __enter__(self):\n        print("start", self.name)\n    def __exit__(self, exc_type, exc, tb):\n        print("end", self.name)\n        return False  # do not hide errors\n\ntry:\n    with Step("training"):\n        raise ValueError("bad batch")\nexcept ValueError as e:\n    print("caught:", e)',
              output: 'start training\nend training\ncaught: bad batch',
            },
            note: 'Returning True from `__exit__` would hide the error. `contextlib.contextmanager` builds one from a generator with a single `yield`.',
            narration:
              'Let us write our own context manager. The class Step saves a name. Its enter method runs when the with block starts, and prints start training. Its exit method runs when the block ends, even if something failed, and prints end training. Inside the block we raise a ValueError on purpose. Because exit returns False, the error is not hidden, so the outer except catches it and prints caught, bad batch. Returning True would hide the error instead.',
          },
          {
            kicker: 'Monkey patching',
            title: 'Changing code while it runs',
            body: 'Monkey patching replaces a function or method at runtime, without editing its source.',
            visual: {
              type: 'code',
              code: 'class Payment:\n    def charge(self):\n        return "charged ₹500"\n\ndef fake_charge(self):\n    return "test mode: no charge"\n\nPayment.charge = fake_charge    # patched at runtime\nprint(Payment().charge())',
              output: 'test mode: no charge',
            },
            note: "Handy in tests, to fake a payment or an API. Risky in real code, because others don't expect the change.",
            narration:
              'Here is monkey patching in a few lines. The class Payment has a method called charge, which returns a message saying 500 rupees were charged. Below it, a separate function called fake charge returns the message test mode, no charge. Then we assign fake charge to the charge method of Payment while the program is running. Now creating a Payment and calling charge prints test mode, no charge. This is handy in tests, but risky in real code, because other developers do not expect it.',
          },
          {
            kicker: '__main__',
            title: 'if __name__ == "__main__"',
            body: 'Code under this check runs when you run the file directly, but not when another file imports it.',
            visual: {
              type: 'code',
              code: 'def train():\n    print("training...")\n\nif __name__ == "__main__":\n    train()',
              output: 'training...',
            },
            note: 'Python sets `__name__` to `"__main__"` in the file you run. In an imported file, it holds the module name, like `"train"`.',
            narration:
              'You will see this check at the bottom of many Python files. The function train simply prints training. Below it, the if statement checks a special variable called name. Python sets that variable to the text main only in the file you run directly. Here we run the file directly, so train is called and it prints training. If another file imported this one, the variable would hold the module name instead, and train would not run on its own.',
          },
          {
            kicker: 'Interpreter',
            title: 'How Python runs your code',
            body: 'CPython, the standard Python, works in two steps. It first compiles your file to bytecode, a list of simple instructions. Then the Python Virtual Machine (PVM) runs that bytecode step by step.',
            visual: {
              type: 'flow',
              steps: [
                { label: 'Your .py file', icon: 'file' },
                { label: 'Compiled to bytecode', icon: 'code' },
                { label: 'Cached as .pyc on import', icon: 'database' },
                { label: 'The PVM runs each step', icon: 'cpu' },
              ],
            },
            note: 'It is called interpreted because there is no separate build to machine code. A NameError appears only when that line runs.',
          },
          {
            kicker: 'The GIL',
            title: 'Threads vs processes',
            body: 'The GIL (Global Interpreter Lock) lets only one thread run Python code at a time in standard Python.',
            animation: { name: 'gil-baton', caption: 'CPU-heavy threads take turns' },
            visual: {
              type: 'compare',
              left: {
                title: 'Threads',
                items: [
                  'Share memory, quick to start',
                  'One runs Python code at a time',
                  'Good for waiting: network calls, file reads',
                ],
              },
              right: {
                title: 'Processes',
                items: [
                  'Separate memory, heavier to start',
                  'Each has its own GIL, so they run in parallel',
                  'Good for heavy CPU work, like resizing images',
                ],
              },
              better: 'none',
            },
            note: 'Newer Python versions offer an optional build without the GIL, but the standard build still has it.',
          },
          {
            kicker: 'async',
            title: 'async and await',
            body: 'One thread juggles many waiting tasks. While one task waits for a reply, another runs.',
            animation: {
              name: 'async-waiter',
              caption: 'Real use: a server answering many users at once',
            },
            visual: {
              type: 'code',
              code: 'import asyncio\n\nasync def fetch(name, secs):\n    await asyncio.sleep(secs)    # waiting, like a network call\n    return f"{name} done"\n\nasync def main():\n    results = await asyncio.gather(fetch("A", 0.2), fetch("B", 0.1))\n    print(results)\n\nasyncio.run(main())',
              output: "['A done', 'B done']",
            },
            note: 'The waits overlap, so this takes about 0.2 seconds, not 0.3. `gather` returns results in the order you passed them.',
            narration:
              'Let us watch one thread handle two waiting tasks. The function fetch takes a name and a number of seconds. It waits that long, like a network call, and then returns the name with the word done. In main, gather starts fetch for A with 0.2 seconds and for B with 0.1 seconds together, and waits for both. It prints A done, then B done, because gather keeps the order you passed. The waits overlap, so the whole thing takes about 0.2 seconds, not 0.3.',
          },
          {
            kicker: 'Try it',
            title: 'Pick the right tool',
            try: {
              type: 'choice',
              prompt:
                'You need to resize 10,000 images, which is heavy CPU work. Which fits best in standard Python?',
              options: [
                {
                  text: 'multiprocessing',
                  correct: true,
                  feedback: 'Each process has its own GIL, so all CPU cores can work at once.',
                },
                {
                  text: 'threading',
                  correct: false,
                  feedback:
                    "Threads share one GIL, so CPU-heavy Python code doesn't run in parallel.",
                },
                {
                  text: 'async and await',
                  correct: false,
                  feedback:
                    'async helps when tasks wait, for a network or a disk, not with heavy computing.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'check.advanced',
      slotKey: 'check-late',
      kind: 'KNOWLEDGE_CHECK',
      title: 'Generators, references and concurrency check',
      depthRank: 3,
      conceptKeys: [TYPES, GENEX],
      body: {
        items: [
          {
            key: 'next',
            type: 'predict_output',
            prompt: 'What does this print?',
            language: 'python',
            code: 'def gen():\n    yield "a"\n    yield "b"\n\ng = gen()\nprint(next(g), next(g))',
            options: [
              { id: 'a', text: 'a b' },
              { id: 'b', text: 'a a' },
              { id: 'c', text: "['a', 'b']" },
              { id: 'd', text: 'An error' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Each `next(g)` resumes the generator where it paused, so you get "a" and then "b". A third `next(g)` would raise StopIteration.',
          },
          {
            key: 'alias',
            type: 'predict_output',
            prompt: 'What does this print?',
            language: 'python',
            code: 'def add_item(cart):\n    cart.append("pen")\n\nmy_cart = ["book"]\nadd_item(my_cart)\nprint(my_cart)',
            options: [
              { id: 'a', text: "['book']" },
              { id: 'b', text: "['book', 'pen']" },
              { id: 'c', text: "['pen']" },
              { id: 'd', text: 'None' },
            ],
            answer: { correct: ['b'] },
            explanation:
              'The function gets a reference to the same list, so `append` changes `my_cart` itself.',
          },
          {
            key: 'shallow',
            type: 'predict_output',
            prompt: 'What does this print?',
            language: 'python',
            code: 'grid = [[0, 0], [0, 0]]\ncopy_ = grid.copy()\ncopy_[0][0] = 7\nprint(grid[0][0])',
            options: [
              { id: 'a', text: '0' },
              { id: 'b', text: '7' },
              { id: 'c', text: 'An error' },
            ],
            answer: { correct: ['b'] },
            explanation:
              '`.copy()` is shallow: the outer list is new, but both share the same inner lists. Use `copy.deepcopy()` for a full copy.',
          },
          {
            key: 'io-work',
            type: 'mcq',
            prompt:
              'Your script calls a slow API 50 times and mostly waits for replies. Which is the simplest good fit?',
            options: [
              { id: 'a', text: 'Threads or async/await' },
              { id: 'b', text: 'multiprocessing with 50 processes' },
              { id: 'c', text: 'A plain for loop' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'While one call waits, another can start. Threads release the GIL while they wait, and async switches tasks at each `await`.',
          },
        ],
      },
    },
    {
      key: 'interview-questions',
      kind: 'CARD_DECK',
      title: 'Interview questions and answers',
      depthRank: 1,
      conceptKeys: [TYPES, FUNCS, GENEX],
      body: {
        layout: 'flip',
        cards: [
          {
            title: 'List vs tuple',
            front: 'What is the difference between a list and a tuple? When would you use each?',
            back: 'A list is mutable: you can add, remove and change items, so use it for changing data, like a cart. A tuple is immutable, so use it for fixed records like coordinates. A dict key must never change, so a tuple of immutable items can be a key and a list cannot. A list inside a tuple can still change.',
          },
          {
            title: 'Writing a decorator',
            front: 'What is a decorator? Write a simple one and give a real use.',
            back: 'A decorator takes a function and returns a wrapped version that adds a step, like logging or timing. Inside it, define `wrapper(*args, **kwargs)` that does the extra step, then calls and returns `func(*args, **kwargs)`. The decorator must end with `return wrapper`. Writing `@log_call` above `def add` means `add = log_call(add)`.',
          },
          {
            title: 'Generators, yield and next',
            front: 'What is a generator? How do `yield` and `next()` work together?',
            back: 'A function with `yield` returns a generator object when called, and none of its code runs yet. Each `next()` runs the code up to the next `yield`, hands out that value and pauses there. When nothing is left, `next()` raises StopIteration. Values are made one at a time, which saves memory.',
          },
          {
            title: 'Call by object reference',
            front:
              'A function appends an item to a list you passed in. Does your list change? Is Python call by value or call by reference?',
            back: 'Yes, your list changes. Python passes a reference to the same object, often called call by object reference. Changing a mutable object inside the function shows outside. Reassigning the parameter, like `cart = []`, only points the local name at a new list, so the caller sees no change.',
          },
          {
            title: 'Shallow vs deep copy',
            front:
              'For a list of lists, what is the difference between `b = a`, `b = a.copy()` and `b = copy.deepcopy(a)`?',
            back: '`b = a` copies nothing: both names point to one list. `a.copy()` makes a new outer list, but the inner lists are shared, so changing `a[0][1]` shows in `b` too. `copy.deepcopy(a)` also copies the inner lists, so the two are fully independent.',
          },
          {
            title: 'Mutable default arguments',
            front:
              '`def add_item(item, cart=[])` keeps items from earlier calls. Why does this happen, and how do you fix it?',
            back: 'Default values are created once, when Python runs the `def`, not on every call. So every call without a cart shares one list. Use `cart=None` as the default, then write `if cart is None: cart = []` inside. Now each call gets a fresh list.',
          },
          {
            title: 'Context managers',
            front: 'What is a context manager? How would you write your own?',
            back: 'A context manager runs set-up when a `with` block starts and clean-up when it ends, even if the block fails. `with open(...)` closes the file for you. To write one, give a class `__enter__` and `__exit__`. If `__exit__` returns False, errors still reach the caller.',
          },
          {
            title: 'Interpreted or compiled',
            front:
              'Is Python an interpreted or a compiled language? What happens when you run a file?',
            back: 'Mostly interpreted. CPython, the standard Python, first compiles your file to bytecode, a list of simple steps. The Python Virtual Machine then runs that bytecode step by step. There is no separate build to machine code, so an error like a NameError appears only when that line runs.',
          },
          {
            title: 'Threads vs processes',
            front:
              'Multithreading or multiprocessing: which would you use to resize 10,000 images in Python, and why?',
            back: 'Multiprocessing. In standard Python the GIL, the Global Interpreter Lock, lets only one thread run Python code at a time. So CPU-heavy threads take turns. Each process has its own interpreter and GIL, so processes use several cores. Threads or async suit waiting work, like many API calls.',
          },
        ],
      },
    },
    {
      key: 'summary.basic',
      slotKey: 'summary',
      kind: 'SUMMARY',
      title: 'Core Python key takeaways',
      depthRank: 1,
      conceptKeys: [TYPES, FUNCS],
      body: {
        takeaways: [
          'A list changes; a tuple is fixed; a set keeps unique items; a dict maps keys to values.',
          'Immutable objects (int, str, tuple) never change in place; mutable ones (list, dict, set) do.',
          'A tuple can hold a list, and that list can still change.',
          'Use `==` for equal values and `is` for the same object, mostly with `None`.',
          'A decorator wraps a function to add a step, and `@name` is the shortcut.',
        ],
        remember: ['List changes, tuple stays', '@decorator means f = decorator(f)'],
      },
    },
    {
      key: 'summary.mid',
      slotKey: 'summary',
      kind: 'SUMMARY',
      title: 'Core Python key takeaways',
      depthRank: 2,
      conceptKeys: [TYPES, FUNCS, GENEX],
      body: {
        takeaways: [
          'A list changes; a tuple is fixed; a set keeps unique items; a dict maps keys to values.',
          'A tuple can hold a list, and that list can still change.',
          'A decorator wraps a function to add a step, and `@name` is the shortcut.',
          'A generator uses `yield` to make values one at a time, which saves memory.',
          'Catch specific errors first; `finally` always runs, so clean up there.',
        ],
        remember: ['List changes, tuple stays', 'yield pauses, next resumes'],
      },
    },
    {
      key: 'summary.advanced',
      slotKey: 'summary',
      kind: 'SUMMARY',
      title: 'Core Python key takeaways',
      depthRank: 3,
      conceptKeys: [TYPES, FUNCS, GENEX],
      body: {
        takeaways: [
          'A list changes; a tuple is fixed, though a list inside it can still change.',
          'A decorator wraps a function; a generator uses `yield` to make values on demand.',
          'Assignment never copies. A shallow copy shares inner lists; a deep copy does not.',
          '`with` guarantees clean-up, and `if __name__ == "__main__"` guards script-only code.',
          'Threads and async suit waiting; processes suit heavy CPU work because of the GIL.',
        ],
        remember: [
          'Assignment shares, deepcopy copies',
          'Waiting: threads or async. CPU: processes',
        ],
      },
    },
  ],
};
