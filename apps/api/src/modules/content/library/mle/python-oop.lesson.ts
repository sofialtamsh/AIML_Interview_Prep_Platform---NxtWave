/**
 * Python for Interviews → OOP in Python.
 *
 * Evidence (Hiring Intelligence, ML/AI families, Jan–Oct 2026; internal only, never quoted to
 * students): about 60 OOP questions. Under 8 LPA the favourite by far is "explain OOP and its four
 * pillars, with real-world examples", then "write an inheritance example (base and derived
 * class)", `self`, constructors and `super()`, an abstract class, is-a vs has-a, method
 * overloading, and small "write a class" tasks (a Counter, a calculator). 8+ LPA adds class vs
 * instance attributes, class and static methods, `_protected` / `__private` names, abstract-class
 * rules, abstraction vs encapsulation, OOP in ML code and bug-spotting in class code.
 * 3–6 LPA teaches this at depth 1; 8–12 LPA at depth 2, where slot keys swap in a payment
 * hierarchy playground (abstract class + polymorphism) and a deeper check, and a deeper deck adds
 * class attributes, class/static methods, name mangling, dunder methods and OOP in ML.
 * Every concept opens on a short real-world story with a moving picture, then the code.
 * Every code output is checked by running it with Python 3.14, the in-browser runner's version.
 */
import type { LessonDocumentInput } from '@app/content';

const CLASSES = 'py.oop.classes';
const PILLARS = 'py.oop.pillars';

const VEHICLES = (make: string, call: string) => `class Vehicle:
    def start(self):
        return "Engine on"

    def fare(self, km):
        return 15 * km


class Bike(Vehicle):
    pass  # inherits everything


class Car(Vehicle):
    def fare(self, km):  # overrides fare only
        return super().fare(km) + 50


ride = ${make}()
print(ride.${call})
`;

const RIDE_VERDICT: Record<string, { tone: 'ok' | 'info'; text: string }> = {
  'Vehicle|start()': {
    tone: 'info',
    text: '`Vehicle` defines `start()` itself, so its own method runs.',
  },
  'Vehicle|fare(10)': { tone: 'info', text: "`Vehicle`'s own `fare()`: 15 × 10 = 150." },
  'Bike|start()': {
    tone: 'ok',
    text: '`Bike` has no `start()`, so Python looks in its parent, `Vehicle`. That is inheritance.',
  },
  'Bike|fare(10)': { tone: 'ok', text: '`Bike` inherits `fare()` unchanged: 15 × 10 = 150.' },
  'Car|start()': {
    tone: 'ok',
    text: "`Car` doesn't override `start()`, so it still inherits `Vehicle`'s version.",
  },
  'Car|fare(10)': {
    tone: 'ok',
    text: '`Car` overrides `fare()`. `super().fare(10)` gives 150, and Car adds a ₹50 base fee.',
  },
};
const RIDE_OUTPUT: Record<string, string> = {
  'start()': 'Engine on\n',
  'fare(10)': '150\n',
};

const EMPLOYEE_START = `class Employee:
    def __init__(self, name, pay):
        self.name = name
        self.pay = pay

    def describe(self):
        n, p = self.name, self.pay
        return f"{n} earns ₹{p}"


# Make Manager inherit from Employee
class Manager:
    def __init__(self, name, pay, team):
        # call super().__init__(...)
        # and save team
        pass

    def describe(self):
        # reuse the parent's describe()
        # and add the team size
        pass


asha = Employee("Asha", 50000)
ravi = Manager("Ravi", 90000, 4)
print(asha.describe())
print(ravi.describe())
print(isinstance(ravi, Employee))
`;

const EMPLOYEE_SOLUTION = `class Employee:
    def __init__(self, name, pay):
        self.name = name
        self.pay = pay

    def describe(self):
        n, p = self.name, self.pay
        return f"{n} earns ₹{p}"


class Manager(Employee):
    def __init__(self, name, pay, team):
        super().__init__(name, pay)
        self.team = team

    def describe(self):
        base = super().describe()
        t = self.team
        return f"{base}, leads {t}"


asha = Employee("Asha", 50000)
ravi = Manager("Ravi", 90000, 4)
print(asha.describe())
print(ravi.describe())
print(isinstance(ravi, Employee))
`;

const PAYMENT_START = `from abc import ABC, abstractmethod


class Payment(ABC):
    @abstractmethod
    def fee(self, amount):
        ...

    def total(self, amount):
        return amount + self.fee(amount)


# Write class Upi: no fee
# Write class Card: a 2% fee


for p in [Upi(), Card()]:
    name = type(p).__name__
    print(name, p.total(1000))
print(issubclass(Card, Payment))
`;

const PAYMENT_SOLUTION = `from abc import ABC, abstractmethod


class Payment(ABC):
    @abstractmethod
    def fee(self, amount):
        ...

    def total(self, amount):
        return amount + self.fee(amount)


class Upi(Payment):
    def fee(self, amount):
        return 0


class Card(Payment):
    def fee(self, amount):
        return amount * 0.02


for p in [Upi(), Card()]:
    name = type(p).__name__
    print(name, p.total(1000))
print(issubclass(Card, Payment))
`;

export const PYTHON_OOP_LESSON: LessonDocumentInput = {
  title: 'OOP in Python',
  subtitle:
    'Classes, objects and self, then the four pillars, each told as a small real-world story with code you can run.',
  objectives: [
    {
      key: 'classes',
      text: 'Define a class with __init__ and methods, and explain what self is',
      minDepthRank: 1,
    },
    {
      key: 'pillars',
      text: 'Explain encapsulation, inheritance, polymorphism and abstraction with one real example each',
      minDepthRank: 1,
    },
    {
      key: 'design',
      text: 'Design a small class hierarchy with an abstract class, and explain class attributes and method types',
      minDepthRank: 2,
    },
  ],
  sections: [
    {
      key: 'hook',
      kind: 'HOOK',
      title: 'Objects in everyday apps',
      depthRank: 1,
      conceptKeys: [CLASSES],
      body: {
        scenario:
          'A food-delivery app lists thousands of restaurants. Each one has a name, a rating and a menu, and each can accept an order. Nobody writes that code thousands of times. The app writes one **blueprint**, a class called `Restaurant`, and makes one **object** per restaurant.',
        animation: { name: 'class-blueprint', caption: 'One class, one object per restaurant' },
        realWorld: {
          title: 'Where you see OOP',
          items: [
            {
              icon: 'store',
              label: 'Restaurants: objects',
              sub: 'One Restaurant class, many objects',
            },
            {
              icon: 'wallet',
              label: 'Wallet: encapsulation',
              sub: 'The balance changes only through checks',
            },
            {
              icon: 'card',
              label: 'Checkout: polymorphism',
              sub: 'One pay() for UPI, card or cash',
            },
            {
              icon: 'brain',
              label: 'ML models: inheritance',
              sub: 'Every PyTorch model extends nn.Module',
            },
          ],
        },
        provocation: 'Could you explain OOP in one minute, with an example for each pillar?',
        bridge:
          '"Explain OOP and its four pillars with real examples" is a classic technical-round question. The follow-up is often "write a small class with inheritance". This lesson builds both, one story at a time.',
      },
    },
    {
      key: 'slides.classes',
      kind: 'SLIDES',
      title: 'Classes, objects and self',
      depthRank: 1,
      conceptKeys: [CLASSES],
      body: {
        slides: [
          {
            kicker: 'Class vs object',
            title: 'A blueprint, and the things built from it',
            body: 'A class describes what every object has and can do. An object is one real thing made from it, with its own values.',
            visual: {
              type: 'icons',
              items: [
                { icon: 'file', label: 'Class', sub: 'The blueprint: Restaurant' },
                { icon: 'store', label: 'Object', sub: 'One restaurant: "Dosa Corner"' },
                { icon: 'braces', label: 'Attribute', sub: 'Data it holds: name, rating' },
                {
                  icon: 'function',
                  label: 'Method',
                  sub: 'What it can do: accept_order(), describe()',
                },
              ],
            },
          },
          {
            kicker: 'Your first class',
            title: 'A class with __init__ and a method',
            points: [
              '`__init__` runs when you create an object and sets its starting values',
              'Every **instance** method takes `self` as its first parameter',
            ],
            visual: {
              type: 'code',
              code: 'class Restaurant:\n    def __init__(self, name, rating):\n        self.name = name\n        self.rating = rating\n\n    def describe(self):\n        return f"{self.name}, rated {self.rating}"\n\nr1 = Restaurant("Dosa Corner", 4.5)\nr2 = Restaurant("Green Bowl", 4.2)\nprint(r1.describe())\nprint(r2.name)',
              output: 'Dosa Corner, rated 4.5\nGreen Bowl',
            },
            note: 'Interviewers call `__init__` the constructor. Strictly, `__new__` creates the object and `__init__` sets it up.',
            narration:
              'Here is the restaurant blueprint as real code. The class called Restaurant has an init method, which runs every time you create an object and saves the name and the rating on self. The method describe returns one sentence built from those 2 values. We create 2 objects, r1 for Dosa Corner and r2 for Green Bowl. It prints Dosa Corner, rated 4.5, and then Green Bowl, because each object keeps its own values. In interviews, the init method is usually called the constructor.',
          },
          {
            kicker: 'self',
            title: 'self is the object before the dot',
            body: '`r2.describe()` runs `describe` with `self` set to `r2`. That is how one method serves every object.',
            animation: { name: 'self-binding', caption: 'One method, the right object every time' },
            note: 'Python passes `self` for you. `r2.describe()` is really `Restaurant.describe(r2)`.',
          },
          {
            kicker: 'Try it',
            title: 'Finish a Counter class',
            try: {
              type: 'code',
              prompt: 'Add `decrement()` and `reset()` so the file prints 1, then 0.',
              starter:
                'class Counter:\n    def __init__(self):\n        self.count = 0\n\n    def increment(self):\n        self.count += 1\n\n    # add decrement() and reset()\n\nc = Counter()\nc.increment()\nc.increment()\nc.decrement()\nprint(c.count)\nc.reset()\nprint(c.count)',
              expected: '1\n0',
              hint: 'Inside the class: `def decrement(self):` with `self.count -= 1`, and `def reset(self):` with `self.count = 0`.',
            },
          },
          {
            kicker: 'Overloading',
            title: 'Python has no method overloading',
            body: "A calculator's add button works for two numbers or three. Python does that with one method and a default value; defining it twice just replaces the first.",
            visual: {
              type: 'code',
              code: 'class Calculator:\n    def add(self, a, b, c=0):\n        return a + b + c\n\ncalc = Calculator()\nprint(calc.add(2, 3))\nprint(calc.add(2, 3, 4))',
              output: '5\n9',
            },
            note: "Overriding is different: a child class replaces its parent's method. That is runtime polymorphism, and Python fully supports it.",
            narration:
              'This short program shows how Python handles a calculator that adds 2 numbers or 3. The class Calculator has one method called add, with the parameters a, b and c, and c has a default value of 0. So you can pass 2 numbers or 3. It prints 5 for 2 plus 3, and then 9 for 2 plus 3 plus 4. If you define add twice, the second one simply replaces the first. Overriding is different: there, a child class replaces a method of its parent.',
          },
        ],
      },
    },
    {
      key: 'slides.pillars',
      kind: 'SLIDES',
      title: 'The four pillars, one story each',
      depthRank: 1,
      conceptKeys: [PILLARS],
      body: {
        slides: [
          {
            kicker: 'Four pillars',
            title: 'Four ideas that keep big code tidy',
            visual: {
              type: 'icons',
              items: [
                { icon: 'lock', label: 'Encapsulation', sub: 'Keep data safe behind methods' },
                { icon: 'layers', label: 'Inheritance', sub: 'Reuse a parent class' },
                { icon: 'repeat', label: 'Polymorphism', sub: 'Same call, different behaviour' },
                { icon: 'eye', label: 'Abstraction', sub: 'Show what it does, hide how' },
              ],
            },
          },
          {
            kicker: 'Encapsulation · the story',
            title: 'Your wallet balance is guarded',
            body: 'Your payment wallet shows ₹500. No screen of the app can simply write a new number into it. Every change goes through methods that check the amount first.',
            animation: {
              name: 'encapsulation-wallet',
              caption: 'Real use: wallets, bank accounts, stock counts',
            },
          },
          {
            kicker: 'Encapsulation · the code',
            title: 'Keep data with the methods that guard it',
            visual: {
              type: 'code',
              code: 'class Wallet:\n    def __init__(self, balance):\n        self._balance = balance  # internal\n\n    def spend(self, amount):\n        if amount <= 0:\n            return "Refused: invalid amount"\n        if amount > self._balance:\n            return "Refused: not enough balance"\n        self._balance -= amount\n        return f"Paid ₹{amount}, ₹{self._balance} left"\nw = Wallet(500)\nprint(w.spend(200))\nprint(w.spend(1000))',
              output: 'Paid ₹200, ₹300 left\nRefused: not enough balance',
            },
            note: 'One `_` means "internal, use the methods". Python doesn\'t block it; it trusts you.',
            narration:
              'Now the wallet story in code. The class Wallet keeps the money in a variable called balance, written with one leading underscore to say it is internal. The method spend checks the amount first: it refuses 0 or a negative amount, and it refuses anything more than the balance. We start with 500 rupees. Spending 200 works, so it prints paid 200 rupees, 300 rupees left. Spending 1000 prints refused, not enough balance. Python does not block the underscore name; it trusts you to use the methods.',
          },
          {
            kicker: 'Inheritance · the story',
            title: 'Write the shared part once',
            body: 'On a ride app, every vehicle has a number plate and can start a trip. A bike and a car differ only in how they price a ride. So the shared code lives in `Vehicle`, and each type inherits it.',
            animation: {
              name: 'inheritance-tree',
              caption: 'Real use: every PyTorch model inherits from nn.Module',
            },
          },
          {
            kicker: 'Inheritance · the code',
            title: 'A child class reuses and overrides',
            visual: {
              type: 'code',
              code: 'class Vehicle:\n    def __init__(self, plate):\n        self.plate = plate\n    def fare(self, km):\n        return 15 * km\n\nclass Car(Vehicle):\n    def fare(self, km):  # overrides the parent\n        # reuse the parent\'s fare, then add a fee\n        return super().fare(km) + 50\n\nprint(Vehicle("KA01").fare(4))\nprint(Car("KA02").fare(4))\nprint(Car("KA02").plate)',
              output: '60\n110\nKA02',
            },
            note: "`super()` calls the parent's version. `Car` has no `__init__` of its own, so it inherits `Vehicle`'s.",
            narration:
              "Let's walk through the ride app in code. The class Vehicle saves the number plate and has a method called fare, which charges 15 rupees for each kilometre. The class Car inherits from Vehicle and overrides fare: it uses super to call the fare of the parent, then adds a fee of 50. For 4 kilometres, a Vehicle prints 60 and a Car prints 110. The last line prints KA02, because Car has no init method of its own, so it inherits the one from Vehicle.",
          },
          {
            kicker: 'Try it',
            title: 'Which start() runs',
            try: {
              type: 'choice',
              prompt:
                '`Car` inherits from `Vehicle`. Both define `start()`: Vehicle\'s prints "Vehicle starting", Car\'s prints "Car starting". What does `Car("KA02").start()` print?',
              options: [
                {
                  text: 'Car starting',
                  correct: true,
                  feedback:
                    "Right. The child's own method overrides the parent's. Python looks in `Car` first, then `Vehicle`.",
                },
                {
                  text: 'Vehicle starting',
                  correct: false,
                  feedback:
                    "The parent's version runs only if `Car` has no `start()`, or calls `super().start()`.",
                },
                {
                  text: 'Both lines, Vehicle first',
                  correct: false,
                  feedback:
                    "Only if Car's `start()` calls `super().start()` first. Overriding replaces the method.",
                },
              ],
            },
          },
          {
            kicker: 'Polymorphism · the story',
            title: 'One Pay button, many ways to pay',
            body: 'At checkout you tap Pay. The app calls the same `pay()` whether you chose UPI, a card or cash on delivery. Each one does it in its own way.',
            animation: {
              name: 'polymorphism-pay',
              caption: 'Real use: scikit-learn models share fit() and predict()',
            },
          },
          {
            kicker: 'Polymorphism · the code',
            title: 'Same method name, different behaviour',
            visual: {
              type: 'code',
              code: 'class Upi:\n    def pay(self, amount):\n        return f"Paid ₹{amount} by UPI"\n\nclass Card:\n    def pay(self, amount):\n        return f"Card charged ₹{amount}"\n\nfor p in [Upi(), Card()]:\n    print(p.pay(500))',
              output: 'Paid ₹500 by UPI\nCard charged ₹500',
            },
            note: 'The loop never checks the type; each object answers its own way. Python calls this duck typing: no shared parent needed.',
            narration:
              'Here is the Pay button idea in code. There are 2 classes, Upi and Card, and each one has its own method called pay. The loop takes one Upi object and one Card object, and calls pay with 500 on each. It prints paid 500 rupees by UPI, and then card charged 500 rupees. The loop never checks the type; each object answers in its own way. Python calls this duck typing, and the 2 classes do not even need a shared parent.',
          },
          {
            kicker: 'Abstraction · the story',
            title: 'Use it without knowing the inside',
            body: 'You drive a car with a steering wheel and pedals, not by tuning the engine. A machine learning model gives you `fit()` and `predict()` and hides the maths.',
            animation: {
              name: 'abstraction-panel',
              caption: 'Real use: model libraries, payment SDKs, any API',
            },
          },
          {
            kicker: 'Abstraction · the code',
            title: 'An abstract class sets the rules',
            visual: {
              type: 'code',
              code: 'from abc import ABC, abstractmethod\nclass Payment(ABC):\n    @abstractmethod\n    def pay(self, amount): ...\n\nclass Upi(Payment):\n    def pay(self, amount):\n        return f"Paid ₹{amount} by UPI"\n\nprint(Upi().pay(300))\ntry:\n    Payment()\nexcept TypeError:\n    print("Can\'t create a Payment directly")',
              output: "Paid ₹300 by UPI\nCan't create a Payment directly",
            },
            note: "Every subclass must write `pay()`, or it can't be created. In one line: abstraction hides complexity; encapsulation protects data.",
            narration:
              "This program shows how an abstract class sets the rules. The class Payment inherits from ABC and marks the method pay as abstract, so it only says that every payment must have a pay method. The class Upi inherits from Payment and writes the real pay, so calling it with 300 prints paid 300 rupees by UPI. Then we try to create a plain Payment object. Python raises a TypeError, and the program prints that you can't create a Payment directly. In one line: abstraction hides complexity, encapsulation protects data.",
          },
          {
            kicker: 'Is-a or has-a',
            title: 'Inheritance or composition',
            body: 'A car **is a** vehicle, so `Car` inherits from `Vehicle`. A car **has an** engine, so a `Car` keeps an `Engine` object as an attribute.',
            visual: {
              type: 'compare',
              left: {
                title: 'Is-a: inheritance',
                items: ['class Car(Vehicle)', 'Car reuses Vehicle code'],
              },
              right: {
                title: 'Has-a: composition',
                items: ['self.engine = Engine()', 'Swap the engine without a new class'],
              },
              better: 'none',
            },
            note: 'When in doubt, prefer has-a. It keeps classes small and easy to change.',
          },
          {
            kicker: 'Try it',
            title: 'Name the missing pillar',
            try: {
              type: 'choice',
              prompt:
                'In a `BankAccount` class, any code can set `account.balance = -5000` directly, with no check. Which pillar is missing?',
              options: [
                {
                  text: 'Encapsulation',
                  correct: true,
                  feedback:
                    'Right. Changes should go through a method like `withdraw()` that checks the amount.',
                },
                {
                  text: 'Inheritance',
                  correct: false,
                  feedback:
                    'Inheritance is about reusing a parent class. The problem here is unguarded data.',
                },
                {
                  text: 'Polymorphism',
                  correct: false,
                  feedback:
                    'Polymorphism is one call with many behaviours. The problem here is unguarded data.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'explorer.override',
      kind: 'CODE_EXPLORER',
      title: 'Which method runs',
      depthRank: 1,
      conceptKeys: [PILLARS],
      body: {
        prompt:
          'Pick a vehicle and a call. Watch where Python finds the method: in the class itself, or in its parent.',
        controls: [
          {
            id: 'make',
            label: 'The object',
            options: [
              { value: 'Vehicle', label: 'Vehicle()' },
              { value: 'Bike', label: 'Bike()' },
              { value: 'Car', label: 'Car()' },
            ],
          },
          {
            id: 'call',
            label: 'The call',
            options: [
              { value: 'start()', label: '.start()' },
              { value: 'fare(10)', label: '.fare(10)' },
            ],
          },
        ],
        states: ['Vehicle', 'Bike', 'Car'].flatMap((make) =>
          ['start()', 'fare(10)'].map((call) => ({
            when: { make, call },
            code: VEHICLES(make, call),
            output: {
              kind: 'text' as const,
              value: make === 'Car' && call === 'fare(10)' ? '200\n' : (RIDE_OUTPUT[call] ?? ''),
            },
            verdict: RIDE_VERDICT[`${make}|${call}`] ?? { tone: 'info' as const, text: '' },
          })),
        ),
        defaultState: { make: 'Car', call: 'fare(10)' },
      },
    },
    {
      key: 'check.oop',
      slotKey: 'check',
      kind: 'KNOWLEDGE_CHECK',
      title: 'Classes and pillars check',
      depthRank: 1,
      conceptKeys: [CLASSES, PILLARS],
      body: {
        items: [
          {
            key: 'self',
            type: 'predict_output',
            prompt: 'What does this print?',
            language: 'python',
            code: 'class Student:\n    def __init__(self, name):\n        self.name = name\n\n    def greet(self):\n        return "Hi, " + self.name\n\na = Student("Asha")\nb = Student("Ravi")\nprint(b.greet())',
            options: [
              { id: 'a', text: 'Hi, Ravi' },
              { id: 'b', text: 'Hi, Asha' },
              { id: 'c', text: 'Hi, self' },
              { id: 'd', text: 'An error: greet() needs an argument' },
            ],
            answer: { correct: ['a'] },
            explanation:
              '`b.greet()` passes `b` as `self`, so `self.name` is "Ravi". Python fills in `self` for you.',
          },
          {
            key: 'super',
            type: 'predict_output',
            prompt: 'What does this print?',
            language: 'python',
            code: 'class Vehicle:\n    def describe(self):\n        return "vehicle"\n\nclass Bike(Vehicle):\n    def describe(self):\n        return "bike, a " + super().describe()\n\nprint(Bike().describe())',
            options: [
              { id: 'a', text: 'bike, a vehicle' },
              { id: 'b', text: 'vehicle' },
              { id: 'c', text: 'bike, a ' },
              { id: 'd', text: 'An error' },
            ],
            answer: { correct: ['a'] },
            explanation:
              "`Bike` overrides `describe()`, and `super().describe()` still calls the parent's version.",
          },
          {
            key: 'has-a',
            type: 'mcq',
            prompt:
              'A `Car` object stores an `Engine` object in `self.engine`. Which relationship is this?',
            options: [
              { id: 'a', text: 'Composition (has-a)' },
              { id: 'b', text: 'Inheritance (is-a)' },
              { id: 'c', text: 'Polymorphism' },
              { id: 'd', text: 'Abstraction' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'The car keeps an engine as an attribute, so it has an engine. Inheritance would be `class Car(Engine)`, which says a car is an engine.',
          },
          {
            key: 'pillars-answer',
            type: 'reasoning',
            prompt:
              'The interviewer asks: *"Explain the four pillars of OOP, with a real example for each."* Answer in four or five sentences.',
            modelAnswer:
              'Encapsulation keeps data with the methods that change it, like a wallet whose balance changes only through spend(), which checks the amount. Inheritance lets a class reuse another: Car inherits fare() from Vehicle and overrides it.\n\nPolymorphism means one call works on many types: pay() works for UPI and card, each in its own way. Abstraction shows what an object does and hides how: a model gives fit() and predict() and hides the maths.',
            rubric: [
              'Encapsulation: data changed only through methods, with an example',
              'Inheritance: reuse of a parent class, ideally with overriding',
              'Polymorphism: one call, different behaviour per class',
              'Abstraction: shows what, hides how',
              'A concrete example for each pillar',
            ],
          },
        ],
      },
    },
    {
      key: 'interview.oop',
      kind: 'INTERVIEW_PLAYBOOK',
      title: 'Four pillars answer structure',
      depthRank: 1,
      conceptKeys: [PILLARS],
      body: {
        question: '"Explain OOP and its four pillars."',
        totalMinutes: 2,
        steps: [
          {
            title: 'One-line definition',
            detail:
              'OOP organises code into objects: data plus the methods that work on it, made from classes.',
          },
          {
            title: 'Encapsulation',
            detail: 'Data changes only through methods that check it. Example: a wallet balance.',
          },
          {
            title: 'Inheritance',
            detail:
              "A child class reuses a parent's code and can override it. Example: Car from Vehicle.",
          },
          {
            title: 'Polymorphism',
            detail:
              'One method name, different behaviour per class. Example: `pay()` for UPI or card.',
          },
          {
            title: 'Abstraction',
            detail: 'Show what an object does, hide how. Example: an abstract `Payment` class.',
          },
          {
            title: 'Why it helps',
            detail:
              'Less repeated code, safer data, and new types added without changing old code.',
          },
        ],
        followUps: [
          'What is the difference between abstraction and encapsulation?',
          'What does `self` mean?',
          'Does Python support method overloading?',
          'What does `super()` do?',
          'Is-a or has-a: when would you prefer composition?',
          'Can you create an object of an abstract class?',
        ],
      },
    },
    {
      key: 'playground.inheritance',
      slotKey: 'practice',
      kind: 'PLAYGROUND',
      title: 'Write a base and child class',
      depthRank: 1,
      conceptKeys: [PILLARS],
      body: {
        language: 'python',
        instructions:
          "Make `Manager` **inherit** from `Employee`. Its `__init__` should call `super().__init__(name, pay)` and save `team`. Its `describe()` should reuse the parent's and add `, leads ` followed by the team size. The file should print `Ravi earns ₹90000, leads 4` and `True`.",
        starterCode: EMPLOYEE_START,
        hints: [
          'Write `class Manager(Employee):` to inherit.',
          'In `__init__`: `super().__init__(name, pay)`, then `self.team = team`.',
          'In `describe()`: `base = super().describe()`, then return `f"{base}, leads {self.team}"`.',
        ],
        solution: EMPLOYEE_SOLUTION,
        checks: [
          { type: 'stdout_contains', value: 'Asha earns ₹50000', label: 'Employee still works' },
          {
            type: 'stdout_contains',
            value: 'Ravi earns ₹90000, leads 4',
            label: 'Manager reuses and extends describe()',
          },
          { type: 'stdout_contains', value: 'True', label: 'A Manager is an Employee' },
        ],
      },
    },
    {
      key: 'slides.deeper',
      kind: 'SLIDES',
      title: 'Deeper OOP questions',
      depthRank: 2,
      conceptKeys: [CLASSES, PILLARS],
      body: {
        slides: [
          {
            kicker: 'Class vs instance',
            title: 'Shared by the class, or owned by each object',
            body: 'A classroom has one shared whiteboard, and each student has their own notebook. A class attribute is the whiteboard; attributes on `self` are the notebooks.',
            animation: {
              name: 'class-vs-instance',
              caption: 'Real use: a user counter, a shared config',
            },
            visual: {
              type: 'code',
              code: 'class User:\n    total_users = 0  # shared by all objects\n\n    def __init__(self, name):\n        self.name = name  # one per object\n        User.total_users += 1\n\na = User("asha")\nb = User("ravi")\nc = User("meena")\nprint(User.total_users, a.name, c.name)',
              output: '3 asha meena',
            },
            note: 'Write `User.total_users += 1`, not `self.total_users += 1`. The second makes a new attribute on that one object.',
            narration:
              'Think of the shared whiteboard and the personal notebooks. In the class User, the variable total users sits on the class itself, so all objects share it. The name is saved on self, so each object has its own. Every time the init method runs, it adds 1 to the shared counter. We create 3 users, so it prints 3, then asha, then meena. Notice that the counter is updated through the class name User. Using self there would create a new attribute on that one object only.',
          },
          {
            kicker: 'Method types',
            title: 'Instance, class and static methods',
            body: 'In a restaurant chain, a branch takes orders (instance), head office counts them all (class) and a GST calculator needs neither (static).',
            points: [
              'A class method gets the class as `cls`: use it for shared counters and alternative constructors',
              'A static method gets nothing extra: a helper that lives in the class',
            ],
            visual: {
              type: 'code',
              code: 'class Metrics:\n    requests = 0\n    def hit(self):  # gets the object\n        Metrics.requests += 1\n    @classmethod\n    def total(cls):  # gets the class\n        return cls.requests\n    @staticmethod\n    def is_error(code):  # gets nothing extra\n        return code >= 400\n\nm = Metrics()\nm.hit()\nprint(Metrics.total(), Metrics.is_error(404))',
              output: '1 True',
            },
            narration:
              'Here are the 3 kinds of method in one class called Metrics. The method hit is a normal instance method: it gets the object and adds 1 to the shared counter called requests. The method total is a class method: it gets the class as cls and returns that counter. The method is error is a static method: it gets nothing extra and only checks whether a code is 400 or more. We call hit once, so it prints 1, and then True, because 404 is an error code.',
          },
          {
            kicker: 'Private names',
            title: '_protected and __private',
            body: 'One underscore means "internal, use the methods". Two underscores make Python add the class name, like a surname on a locker. Then a subclass or outside code can\'t clash with it by accident.',
            visual: {
              type: 'code',
              code: 'class Account:\n    def __init__(self):\n        self._rate = 0.05  # internal by convention\n        self.__pin = 1234  # renamed to _Account__pin\n\nacc = Account()\nprint(acc._rate)\ntry:\n    print(acc.__pin)\nexcept AttributeError:\n    print("No attribute __pin")\nprint(acc._Account__pin)',
              output: '0.05\nNo attribute __pin\n1234',
            },
            note: 'This is name mangling. It prevents accidents, not determined access: Python has no truly private attributes.',
            narration:
              "Let's see the 2 kinds of underscore names in code. In the class Account, the variable rate has one underscore, which only means internal by convention. The variable pin has 2 underscores, so Python quietly renames it by adding the class name in front. It prints 0.05 for the rate. Asking for the pin by its short name fails, so it prints no attribute pin. The renamed version still works and prints 1234. This is called name mangling: it prevents accidents, but nothing in Python is truly private.",
          },
          {
            kicker: 'Dunder methods',
            title: 'Magic methods plug into Python',
            body: 'A plug shaped for the socket just works. Write `__len__`, and `len(cart)` just works too.',
            points: [
              '`__len__` makes `len(cart)` work; `__str__` controls `print(cart)`',
              'Others: `__eq__` for `==`, `__repr__` for debugging. `__add__` for `+` is operator overloading',
            ],
            visual: {
              type: 'code',
              code: 'class Cart:\n    def __init__(self, items):\n        self.items = items\n\n    def __len__(self):\n        return len(self.items)\n\n    def __str__(self):\n        return f"Cart with {len(self)} items"\n\ncart = Cart(["dosa", "tea"])\nprint(len(cart))\nprint(cart)',
              output: '2\nCart with 2 items',
            },
            narration:
              'This short program shows how special methods plug your class into Python. The class Cart stores a list called items. It defines the special method len, which returns how many items there are, and the special method str, which returns the text to show when the cart is printed. We create a cart with dosa and tea. Calling len on the cart prints 2, and printing the cart shows Cart with 2 items. Python calls these methods for you, so your object behaves like a built-in type.',
          },
          {
            kicker: '__str__ vs __repr__',
            title: 'Two ways to show an object',
            body: 'A food app shows you "2 x dosa", while its logs record the exact order. `__str__` is the friendly text for users; `__repr__` is the exact text for developers.',
            visual: {
              type: 'code',
              code: 'class Order:\n    def __init__(self, dish, qty):\n        self.dish, self.qty = dish, qty\n\n    def __str__(self):  # for users\n        return f"{self.qty} x {self.dish}"\n\n    def __repr__(self):  # for developers\n        return f"Order(\'{self.dish}\', {self.qty})"\n\no = Order("dosa", 2)\nprint(o)\nprint([o])',
              output: "2 x dosa\n[Order('dosa', 2)]",
            },
            note: 'A list shows its items with `__repr__`. If a class has only `__repr__`, `print()` uses it too.',
            narration:
              'One object, two ways to show it. The class Order saves a dish and a quantity. The str method returns friendly text for users, and print uses it, so the first line prints 2 x dosa. The repr method returns exact text for developers, written like the code that builds the object. A list shows its items using repr, so printing a list that holds the order shows Order, dosa in quotes, and 2. If a class defines only repr, print uses that too.',
          },
          {
            kicker: 'Often mixed up',
            title: 'Abstraction vs encapsulation',
            visual: {
              type: 'compare',
              left: {
                title: 'Abstraction',
                items: [
                  'Hides how it works',
                  'Design level: what to show',
                  'Example: an abstract Payment class',
                ],
              },
              right: {
                title: 'Encapsulation',
                items: [
                  'Guards the data',
                  'Code level: who can change it',
                  'Example: _balance changed via spend()',
                ],
              },
              better: 'none',
            },
            note: 'In one line: abstraction hides complexity; encapsulation protects data.',
          },
          {
            kicker: 'Abstract class rules',
            title: "What an abstract class can and can't do",
            body: "Like a form with required fields: you can't submit it until every one is filled in.",
            points: [
              "You can't create an object of the abstract class itself",
              'A subclass can be created only once it writes every abstract method',
              'It can still have `__init__` and normal methods that subclasses share',
              '`@abstractmethod` is enforced only when the class inherits from `ABC`',
            ],
            note: 'The payment playground below uses these rules.',
          },
          {
            kicker: 'MRO',
            title: 'Multiple inheritance and the MRO',
            body: 'A smartphone is a camera and a phone. If both parents define a method, Python checks them in a fixed order. First the class, then its parents left to right, then the shared grandparent.',
            visual: {
              type: 'code',
              code: 'class Device:\n    def kind(self): return "device"\n\nclass Camera(Device):\n    def kind(self): return "camera"\n\nclass Phone(Device):\n    def kind(self): return "phone"\n\nclass SmartPhone(Camera, Phone):\n    pass\n\nprint(SmartPhone().kind())\nprint([c.__name__ for c in SmartPhone.__mro__])',
              output: "camera\n['SmartPhone', 'Camera', 'Phone', 'Device', 'object']",
            },
            note: 'This order is the MRO, the method resolution order. For a `SmartPhone`, `super()` inside `Camera` reaches `Phone`, not `Device`.',
            narration:
              'Here is multiple inheritance with one shared grandparent. Device, Camera and Phone each define a method called kind. SmartPhone inherits from Camera first and Phone second, and writes nothing itself. Calling kind on a SmartPhone prints camera, because Python checks Camera before Phone. The second line prints the full search order: SmartPhone, Camera, Phone, Device and finally object. This order is called the method resolution order, or MRO, and super follows it too.',
          },
          {
            kicker: 'OOP in ML',
            title: 'You already use OOP in ML code',
            body: 'A PyTorch model is a class: it inherits from `nn.Module`, calls `super().__init__()` and overrides `forward()`.',
            points: [
              'Polymorphism: scikit-learn classifiers and regressors share `fit()` and `predict()`',
              'Abstraction: `model.fit()` hides the training maths',
            ],
            visual: {
              type: 'code',
              code: 'import torch.nn as nn\n\nclass Net(nn.Module):\n    def __init__(self):\n        super().__init__()\n        self.fc = nn.Linear(4, 2)\n\n    def forward(self, x):\n        return self.fc(x)',
            },
            note: 'Skip `super().__init__()` and PyTorch raises an error as soon as you add a layer.',
            narration:
              'Here is a tiny PyTorch model, and it is plain OOP. The class Net inherits from the PyTorch class called Module. Its init method first calls the init of the parent through super, then creates one linear layer named fc that takes 4 numbers in and gives 2 numbers out. The method forward overrides the parent version and passes the input x through that layer. Nothing is printed here; it only defines the model. If you skip the super call, PyTorch raises an error as soon as you add a layer.',
          },
          {
            kicker: 'Try it',
            title: 'The class attribute trap',
            try: {
              type: 'choice',
              prompt:
                'Class `C` has `count = 0`. Then `a = C()`, `a.count += 1`, `print(C.count, a.count)`. What prints?',
              options: [
                {
                  text: '0 1',
                  correct: true,
                  feedback:
                    '`a.count += 1` reads the class value, then creates `a.count` on that object only. `C.count` stays 0.',
                },
                {
                  text: '1 1',
                  correct: false,
                  feedback: 'That needs `C.count += 1`, which changes the shared class attribute.',
                },
                {
                  text: 'An error',
                  correct: false,
                  feedback: 'Reading `a.count` finds the class attribute, so it works.',
                },
              ],
            },
          },
          {
            kicker: 'Spot the bug',
            title: 'A method without self',
            visual: {
              type: 'code',
              code: 'class Database:\n    def __init__(self, host):\n        self.host = host\n\n    def connect():\n        return f"Connecting to {self.host}"\n\ndb = Database("localhost")\nprint(db.connect())',
            },
            try: {
              type: 'choice',
              prompt: 'What happens when the last line runs?',
              options: [
                {
                  text: 'A TypeError: `Database.connect()` takes 0 positional arguments but 1 was given',
                  correct: true,
                  feedback:
                    'Right. Python passes `db` in as the first argument, but `connect()` has no parameter for it. Add `self`.',
                },
                {
                  text: 'It prints "Connecting to localhost"',
                  correct: false,
                  feedback:
                    'The call fails before the body runs, because `connect()` cannot accept the object Python passes in.',
                },
                {
                  text: 'A NameError, because `self` is not defined',
                  correct: false,
                  feedback:
                    'The argument check fails first, at the call. A NameError would come only if the body ran.',
                },
              ],
            },
            note: 'Fix: `def connect(self):`. `db.connect()` is really `Database.connect(db)`, so every instance method needs `self` first.',
            narration:
              'This class has a bug that interviewers like to show. The init method saves the host on self, which is fine. But the method connect is written with no parameters at all. When we call connect on db, Python quietly passes db in as the first argument. Since connect accepts nothing, Python raises a TypeError before the body even runs. The fix is to add self as the first parameter of connect, like every instance method.',
          },
        ],
      },
    },
    {
      key: 'playground.payment',
      slotKey: 'practice',
      kind: 'PLAYGROUND',
      title: 'Design a payment hierarchy',
      depthRank: 2,
      conceptKeys: [PILLARS],
      body: {
        language: 'python',
        instructions:
          'Write `Upi` (no fee) and `Card` (a 2% fee). Both inherit from the abstract `Payment` and write only their own `fee()`. The shared `total()` does the rest, so the file prints `Upi 1000`, `Card 1020.0` and `True`.',
        starterCode: PAYMENT_START,
        hints: [
          'Each class inherits from `Payment`: `class Upi(Payment):`.',
          'Each one needs only `def fee(self, amount):`.',
          'A 2% fee is `amount * 0.02`.',
        ],
        solution: PAYMENT_SOLUTION,
        checks: [
          { type: 'stdout_contains', value: 'Upi 1000', label: 'Upi adds no fee' },
          { type: 'stdout_contains', value: 'Card 1020', label: 'Card adds 2%' },
          { type: 'stdout_contains', value: 'True', label: 'Card inherits from Payment' },
        ],
      },
    },
    {
      key: 'check.deeper',
      slotKey: 'check',
      kind: 'KNOWLEDGE_CHECK',
      title: 'OOP depth check',
      depthRank: 2,
      conceptKeys: [CLASSES, PILLARS],
      body: {
        items: [
          {
            key: 'super',
            type: 'predict_output',
            prompt: 'What does this print?',
            language: 'python',
            code: 'class Vehicle:\n    def describe(self):\n        return "vehicle"\n\nclass Bike(Vehicle):\n    def describe(self):\n        return "bike, a " + super().describe()\n\nprint(Bike().describe())',
            options: [
              { id: 'a', text: 'bike, a vehicle' },
              { id: 'b', text: 'vehicle' },
              { id: 'c', text: 'bike, a ' },
              { id: 'd', text: 'An error' },
            ],
            answer: { correct: ['a'] },
            explanation:
              "`Bike` overrides `describe()`, and `super().describe()` still calls the parent's version.",
          },
          {
            key: 'shared-list',
            type: 'predict_output',
            prompt: 'This class has a bug. What does it print?',
            language: 'python',
            code: 'class Cart:\n    items = []\n\n    def add(self, item):\n        self.items.append(item)\n\na, b = Cart(), Cart()\na.add("pen")\nprint(b.items)',
            options: [
              { id: 'a', text: "['pen']" },
              { id: 'b', text: '[]' },
              { id: 'c', text: 'An error' },
              { id: 'd', text: 'None' },
            ],
            answer: { correct: ['a'] },
            explanation:
              '`items` is a class attribute, so every cart shares one list. Set `self.items = []` in `__init__` to give each cart its own.',
          },
          {
            key: 'mangling',
            type: 'mcq',
            prompt:
              'Inside `class Account`, `__init__` sets `self.__pin = 1234`. What does `acc.__pin` do outside the class?',
            options: [
              {
                id: 'a',
                text: 'Raises an AttributeError, because Python renamed it to `_Account__pin`',
              },
              { id: 'b', text: 'Returns 1234' },
              { id: 'c', text: 'Returns None' },
              { id: 'd', text: 'Raises a PermissionError' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Two leading underscores trigger name mangling. `acc._Account__pin` still works, so it guards against accidents, not access.',
          },
          {
            key: 'pillars-answer',
            type: 'reasoning',
            prompt:
              'The interviewer asks: *"Explain the four pillars of OOP, and how abstraction differs from encapsulation."* Answer in four or five sentences.',
            modelAnswer:
              'Encapsulation keeps data with the methods that change it, like a wallet whose balance changes only through spend(). Inheritance lets Car reuse and override Vehicle.\n\nPolymorphism means one call, like pay(), behaves differently for UPI and card. Abstraction shows what an object does and hides how, like an abstract Payment class or a model with fit() and predict(). Abstraction hides complexity at the design level; encapsulation protects data at the code level.',
            rubric: [
              'One clear example for each of the four pillars',
              'Abstraction hides how something works',
              'Encapsulation protects data behind methods',
              'States the difference in one clear line',
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
      conceptKeys: [CLASSES, PILLARS],
      body: {
        layout: 'flip',
        cards: [
          {
            title: 'The four pillars',
            front: 'Explain the four pillars of OOP, with a real example for each.',
            back: "Encapsulation: data changes only through methods that check it, like a wallet's `spend()`. Inheritance: a child class reuses a parent, like `Car` from `Vehicle`. Polymorphism: one call, different behaviour, like `pay()` for UPI or card. Abstraction: show what, hide how, like a model's `fit()` and `predict()`.",
          },
          {
            title: 'Abstraction vs encapsulation',
            front: 'What is the difference between abstraction and encapsulation?',
            back: 'Abstraction hides how something works and shows only what it does, like an abstract `Payment` class with `pay()`. Encapsulation protects data by keeping it with the methods that change it, like `_balance` changed only through `spend()`. In one line: abstraction hides complexity at the design level; encapsulation protects data at the code level.',
          },
          {
            title: 'Overloading vs overriding',
            front: 'Does Python support method overloading? How is it different from overriding?',
            back: 'Not in the Java sense. If you define a method twice, the second one replaces the first, so use default values or `*args` instead. Overriding is fully supported: a child class redefines a parent method, and `super()` can still call the original. Operators can be overloaded with methods like `__add__`.',
          },
          {
            title: 'Composition vs inheritance',
            front:
              'A car is a vehicle, and a car has an engine. When do you use inheritance, and when composition?',
            back: 'Use inheritance for a true is-a link that shares behaviour: `class Car(Vehicle)`. Use composition for has-a: the car keeps an `Engine` object in `self.engine`. When unsure, prefer composition. You can swap the engine without a new class, and long inheritance chains get hard to change.',
          },
          {
            title: 'Abstract classes',
            front: 'What is an abstract class in Python? Can you create an object of it?',
            back: 'An abstract class inherits from `ABC` and marks methods with `@abstractmethod`. Every subclass must write those methods. You cannot create an object of it, and a subclass can be created only once it writes all of them. It can still have `__init__` and normal methods that subclasses share.',
          },
          {
            title: 'Class vs instance attributes',
            front:
              '`User` has `total_users = 0`, and `__init__` runs `User.total_users += 1`. After two users, what do `User.total_users` and `user1.total_users` print?',
            back: 'Both print 2. `total_users` lives on the class, so every object shares one value. `user1` has no attribute of that name, so Python looks in the class. With `self.total_users += 1` instead, each object would get its own 1, and the class value would stay 0.',
          },
          {
            title: 'Multiple inheritance and MRO',
            front: 'With multiple inheritance, how does Python decide which parent method runs?',
            back: 'It follows the MRO, the method resolution order. Python checks the class first, then its parents from left to right, then shared grandparents. `ClassName.__mro__` shows the order. `super()` calls the next class in that order, which is not always the direct parent. This solves the diamond problem, where two parents share one grandparent.',
          },
          {
            title: '__str__ vs __repr__',
            front: 'What is the difference between `__str__` and `__repr__`?',
            back: "`__str__` gives friendly text for users, used by `print()` and `str()`. `__repr__` gives exact text for developers, used in the shell, inside lists and by `repr()`. A good `__repr__` looks like code that rebuilds the object, like `Order('dosa', 2)`. If only `__repr__` exists, `print()` uses it too.",
          },
          {
            title: 'Missing super().__init__()',
            front:
              'A child class writes its own `__init__` but never calls `super().__init__()`. An inherited method then uses `self.db`. What happens, and how do you fix it?',
            back: "The parent's `__init__` never runs, so `self.db = db_connection` never happens. Calling the inherited method raises an AttributeError. Fix it by calling `super().__init__(db_connection)` first in the child's `__init__`, then setting the child's own attributes. PyTorch models fail the same way if you skip it.",
          },
        ],
      },
    },
    {
      key: 'summary.basic',
      slotKey: 'summary',
      kind: 'SUMMARY',
      title: 'OOP key takeaways',
      depthRank: 1,
      conceptKeys: [CLASSES, PILLARS],
      body: {
        takeaways: [
          'A class is the blueprint; an object is one thing made from it, with its own values.',
          '`__init__` sets up each new object, and `self` is the object before the dot.',
          'Encapsulation guards data behind methods; inheritance reuses a parent class.',
          'Polymorphism is one call with different behaviour; abstraction shows what, hides how.',
          'A car is a vehicle (inheritance); a car has an engine (composition).',
        ],
        remember: [
          'self = the object before the dot',
          'Is-a: inherit. Has-a: keep as an attribute',
        ],
      },
    },
    {
      key: 'summary.mid',
      slotKey: 'summary',
      kind: 'SUMMARY',
      title: 'OOP key takeaways',
      depthRank: 2,
      conceptKeys: [CLASSES, PILLARS],
      body: {
        takeaways: [
          '`__init__` sets up each object, and `self` is the object before the dot.',
          'Encapsulation guards data; inheritance reuses; polymorphism varies behaviour; abstraction hides how.',
          'Class attributes are shared; attributes on `self` belong to one object.',
          'Class methods get `cls`; static methods get nothing extra; `__name` is renamed, not private.',
          "You can't create an abstract class; a subclass works once it writes every abstract method.",
        ],
        remember: [
          'Abstraction hides complexity; encapsulation protects data',
          'Shared counter: ClassName.attr += 1',
          'Is-a: inherit. Has-a: keep as an attribute',
        ],
      },
    },
  ],
};
