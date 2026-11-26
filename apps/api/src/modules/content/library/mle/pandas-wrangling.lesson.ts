/**
 * Data Preparation → Pandas for data wrangling.
 *
 * Evidence (Hiring Intelligence, ML/AI families, Jan–Oct 2026; internal only, never quoted to
 * students): loc vs iloc, filtering rows where a column is above a value, groupby (and passing a
 * list of columns), total revenue per customer, total and average order value at the same time,
 * merge vs join vs concat, apply vs vectorisation, why to use .copy(), NumPy vs pandas, filtering
 * and renaming in a live chat-based coding task, and processing a CSV with millions of rows. One
 * bar for every package for now, aimed at 8–12 LPA and kept simple, so every section is depth 1.
 * Code outputs were checked with Python 3.14 and pandas 3.1 (the browser runs pandas 3.0, whose
 * copy-on-write rules make chained assignment never change the original).
 */
import type { LessonDocumentInput } from '@app/content';

const SEL = 'data.pandas-selection';
const GM = 'data.pandas-groupby-merge';

const BASICS = `import pandas as pd

df = pd.DataFrame({
    "customer": ["A", "B", "A", "C", "B"],
    "amount": [450, 12000, 300, 520, 15500],
})
print(df.shape)
print(df.head(2))
print(type(df["amount"]).__name__)
print(type(df[["amount"]]).__name__)`;

const FILTER = `import pandas as pd

df = pd.DataFrame({
    "customer": ["A", "B", "A", "C", "B"],
    "amount": [450, 12000, 300, 520, 15500],
})
big = df[df["amount"] > 10000]
print(big.index.tolist())
both = df[(df["customer"] == "B") & (df["amount"] > 13000)]
print(both.index.tolist())`;

const LOC = `import pandas as pd

df = pd.DataFrame({"name": ["Asha", "Ravi", "Meera", "Kiran"]},
                  index=[10, 20, 30, 40])
print(df.loc[20, "name"], df.iloc[2]["name"])
print(df.loc[10:30, "name"].tolist())
print(df.iloc[0:2]["name"].tolist())`;

const SET = `import pandas as pd

df = pd.DataFrame({"amount": [450, 12000, 300]})
df["tier"] = "small"
df.loc[df["amount"] > 10000, "tier"] = "big"
print(df["tier"].tolist())`;

const GROUPBY = `import pandas as pd

df = pd.DataFrame({
    "customer": ["A", "B", "A", "C"],
    "amount": [450, 300, 300, 520],
})
total = df.groupby("customer")["amount"].sum()
print(total.to_dict())
out = df.groupby("customer").agg(total=("amount", "sum"),
                                 avg=("amount", "mean"))
print(out.reset_index().values.tolist())`;

const MULTI = `import pandas as pd

df = pd.DataFrame({
    "city": ["Pune", "Pune", "Delhi", "Pune"],
    "customer": ["A", "B", "A", "A"],
    "amount": [100, 200, 300, 50],
})
g = df.groupby(["city", "customer"])["amount"].sum()
print(g.to_dict())`;

const TRANSFORM = `import pandas as pd

df = pd.DataFrame({
    "customer": ["A", "B", "A", "C"],
    "amount": [450, 300, 300, 520],
})
total = df.groupby("customer")["amount"].transform("sum")
df["share"] = df["amount"] / total
print(df["share"].round(2).tolist())`;

const MERGE = `import pandas as pd

customers = pd.DataFrame({"customer_id": [1, 2, 3],
                          "name": ["Asha", "Ravi", "Meera"]})
orders = pd.DataFrame({"customer_id": [1, 1, 2, 4],
                       "amount": [450, 300, 520, 200]})
for how in ["inner", "left", "outer"]:
    m = customers.merge(orders, on="customer_id", how=how)
    print(how, len(m))`;

const VECTOR = `import numpy as np
import pandas as pd

df = pd.DataFrame({"amount": [450, 12000, 300]})
df["tax"] = df["amount"] * 0.18
df["tier"] = np.where(df["amount"] > 10000, "big", "small")
print(df.values.tolist())`;

const PIVOT = `import pandas as pd

sales = pd.DataFrame({
    "city": ["Pune", "Pune", "Delhi", "Delhi"],
    "month": ["Jan", "Feb", "Jan", "Feb"],
    "amount": [100, 150, 200, 120],
})
p = sales.pivot_table(index="city", columns="month",
                      values="amount", aggfunc="sum")
print(list(p.columns))
print(p.reset_index().values.tolist())`;

const REPORT_HEAD = `import pandas as pd

orders = pd.DataFrame({
    "customer_id": [1, 2, 1, 3, 2, 1],
    "amount": [450, 300, 300, 520, 150, 250],
})
customers = pd.DataFrame({
    "customer_id": [1, 2, 3],
    "name": ["Asha", "Ravi", "Meera"],
})
`;
const REPORT_START = `${REPORT_HEAD}
# 1. total and avg of amount per customer_id
# 2. merge in the names from customers
# 3. sort by total, highest first
# 4. round avg to 1 decimal; keep name, total, avg
report = orders
print(report.values.tolist())
`;
const REPORT_SOLUTION = `${REPORT_HEAD}
stats = orders.groupby("customer_id")["amount"].agg(
    total="sum", avg="mean").reset_index()
report = stats.merge(customers, on="customer_id")
report = report.sort_values("total", ascending=False)
report["avg"] = report["avg"].round(1)
report = report[["name", "total", "avg"]]
print(report.values.tolist())
`;

export const PANDAS_WRANGLING_LESSON: LessonDocumentInput = {
  title: 'Pandas for data wrangling',
  subtitle:
    'The pandas moves interviewers ask you to type live: select, filter, group, join and reshape, plus the traps they like.',
  objectives: [
    {
      key: 'select',
      text: 'Select columns and filter rows, and explain loc versus iloc',
      minDepthRank: 1,
    },
    {
      key: 'group',
      text: 'Summarise data with groupby, agg and transform',
      minDepthRank: 1,
    },
    {
      key: 'combine',
      text: 'Combine tables with merge and concat, and choose the right join',
      minDepthRank: 1,
    },
    {
      key: 'fast',
      text: 'Write fast, vectorised pandas, and reshape data with pivot tables',
      minDepthRank: 1,
    },
  ],
  sections: [
    {
      key: 'hook',
      kind: 'HOOK',
      title: 'A million orders, one question',
      depthRank: 1,
      conceptKeys: [GM],
      body: {
        scenario:
          'An online shop exports a million orders. The manager asks who the top ten customers are, and how much each spends per order. A spreadsheet struggles with a file that size. In pandas, it is a few lines.',
        animation: {
          name: 'groupby-split-apply',
          caption: 'Real use: revenue per customer, city or month',
        },
        realWorld: {
          title: 'Where pandas does the work',
          items: [
            { icon: 'cart', label: 'Sales reports', sub: 'Revenue per customer and city' },
            { icon: 'chart', label: 'Dashboards', sub: 'Monthly totals and trends' },
            { icon: 'database', label: 'Data pipelines', sub: 'Joining orders with customers' },
            { icon: 'bot', label: 'ML features', sub: 'Average spend per user' },
          ],
        },
        provocation: 'How would you get each customer’s total and average order value in one line?',
        bridge:
          'Pandas questions are often live: filter these rows, total by customer, join two tables. This lesson covers the moves you will be asked to type, and the traps interviewers like.',
      },
    },
    {
      key: 'slides.basics',
      kind: 'SLIDES',
      title: 'DataFrames and Series',
      depthRank: 1,
      conceptKeys: [SEL],
      body: {
        slides: [
          {
            kicker: 'The tool',
            title: 'A table you can program',
            body: 'A **DataFrame** is a table with named columns and row labels, called the **index**. One column on its own is a **Series**. pandas is built on NumPy, which handles fast arrays of a single type.',
            visual: {
              type: 'compare',
              left: {
                title: 'NumPy',
                items: [
                  'Fast arrays of one type',
                  'Positions only: a[0], a[1:3]',
                  'Maths on whole arrays',
                ],
              },
              right: {
                title: 'pandas',
                items: [
                  'Tables with mixed column types',
                  'Named columns and row labels',
                  'Grouping, joining, reading files',
                ],
              },
              better: 'none',
            },
          },
          {
            kicker: 'In code',
            title: 'Build and inspect a DataFrame',
            visual: {
              type: 'code',
              code: BASICS,
              output:
                '(5, 2)\n  customer  amount\n0        A     450\n1        B   12000\nSeries\nDataFrame',
            },
            note: 'One name in the brackets gives a Series. A list of names gives a DataFrame, even with one column.',
            narration:
              'We build a table of five orders. shape says 5 rows and 2 columns. head shows the first two rows, with the index, 0 and 1, on the left. Selecting one column by its name gives a Series. Selecting with a list of names, even a list of one, gives a DataFrame.',
          },
        ],
      },
    },
    {
      key: 'slides.selection',
      kind: 'SLIDES',
      title: 'Selecting and filtering rows',
      depthRank: 1,
      conceptKeys: [SEL],
      body: {
        slides: [
          {
            kicker: 'Filter',
            title: 'Rows that pass a test',
            body: 'A condition like `df["amount"] > 10000` gives True or False for every row. Put it inside `df[...]` to keep the True rows. Combine conditions with `&` for and, `|` for or, with each condition in brackets.',
            visual: { type: 'code', code: FILTER, output: '[1, 4]\n[4]' },
            note: 'Use `&` and `|`, not `and` and `or`. Python’s `and` needs one True or False, not a whole column, so pandas raises a ValueError.',
            narration:
              'The condition amount greater than 10,000 marks each row True or False. Putting it inside the brackets keeps rows 1 and 4. For two conditions, wrap each one in brackets and join them with the and symbol. Only row 4 is customer B with more than 13,000.',
          },
          {
            kicker: 'loc and iloc',
            title: 'Labels or positions',
            body: '`loc` selects by row label and column name. `iloc` selects by position, counting from 0. Even with the default index 0, 1, 2, their slices differ: loc includes the end, iloc does not. After a filter or sort, labels no longer match positions.',
            animation: { name: 'loc-vs-iloc', caption: 'Real use: rows indexed by ID or by date' },
          },
          {
            kicker: 'In code',
            title: 'loc and iloc side by side',
            visual: {
              type: 'code',
              code: LOC,
              output: "Ravi Meera\n['Asha', 'Ravi', 'Meera']\n['Asha', 'Ravi']",
            },
            note: '`loc` slices include the end label. `iloc` slices stop before the end, like Python lists.',
            narration:
              'The row labels are 10, 20, 30 and 40. loc with 20 finds the row labelled 20, Ravi. iloc with 2 counts positions from zero, so it finds the third row, Meera. A loc slice from 10 to 30 includes 30, giving three names. An iloc slice from 0 to 2 stops before position 2, giving two.',
          },
          {
            kicker: 'Change values',
            title: 'Set values with loc',
            body: 'To change some rows, write `df.loc[condition, "column"] = value` in one step. Chained indexing, `df[condition]["column"] = value`, edits a temporary copy. In pandas 3 it never changes `df`, and it warns you.',
            visual: { type: 'code', code: SET, output: "['small', 'big', 'small']" },
            note: 'Taking a subset to edit later? Call `.copy()` on it. That makes your intent clear in any pandas version.',
            narration:
              'Every row starts as small. Then, in one step, loc picks the tier cells of rows with an amount above 10,000, and sets them to big. Only the second row changes. Doing the same with two separate pairs of brackets would edit a temporary copy instead.',
          },
          {
            kicker: 'Try it',
            title: 'Filter big orders',
            try: {
              type: 'code',
              prompt:
                'Keep the rows where amount is greater than 10,000, then print their amounts as a list.',
              starter:
                'import pandas as pd\n\ndf = pd.DataFrame({"amount": [8500, 12000, 300, 15500]})\n# keep rows with amount > 10000',
              expected: '[12000, 15500]',
              hint: 'Use `df[df["amount"] > 10000]`, then print its `"amount"` column with `.tolist()`.',
              packages: ['pandas'],
            },
          },
          {
            kicker: 'Try it',
            title: 'Filter and rename',
            try: {
              type: 'code',
              prompt:
                'Keep employees older than 20 with sales above 30. Rename "name" to "employee_name", then print the names as a list.',
              starter:
                'import pandas as pd\n\nemp = pd.DataFrame({\n    "name": ["Asha", "Ravi", "Meera", "Kiran", "Arjun"],\n    "age": [19, 24, 31, 22, 45],\n    "sales": [25, 40, 35, 28, 60],\n})\n# filter, rename, then print the names',
              expected: "['Ravi', 'Meera', 'Arjun']",
              hint: 'Filter with `(emp["age"] > 20) & (emp["sales"] > 30)`, then `.rename(columns={"name": "employee_name"})`.',
              packages: ['pandas'],
            },
          },
        ],
      },
    },
    {
      key: 'slides.groupby',
      kind: 'SLIDES',
      title: 'Grouping and aggregating',
      depthRank: 1,
      conceptKeys: [GM],
      body: {
        slides: [
          {
            kicker: 'In code',
            title: 'Totals and averages per group',
            body: '`groupby` splits the rows into groups, applies a function like `sum` to each, and combines the answers. It is the pandas version of SQL’s GROUP BY.',
            visual: {
              type: 'code',
              code: GROUPBY,
              output:
                "{'A': 750, 'B': 300, 'C': 520}\n[['A', 750, 375.0], ['B', 300, 300.0], ['C', 520, 520.0]]",
            },
            note: 'Named aggregation, `total=("amount", "sum")`, gives clean column names. `reset_index()` turns the group keys back into a column.',
            narration:
              'Four orders from customers A, B and C. groupby customer, then sum on the amount, gives one total per customer: A spent 750. To get the total and the average in one step, agg takes named pairs. total is the sum of amount, and avg is its mean. Customer A has two orders, so the average is 375.',
          },
          {
            kicker: 'More than one key',
            title: 'Group by a list of columns',
            body: 'Pass a list to group by several columns at once, such as city and customer. Each combination becomes its own group.',
            visual: {
              type: 'code',
              code: MULTI,
              output: "{('Delhi', 'A'): 300, ('Pune', 'A'): 150, ('Pune', 'B'): 200}",
            },
            narration:
              'Now customer A buys in two cities. Grouping by the list city and customer makes one group per pair. A in Pune has two orders, 100 and 50, so that total is 150. A in Delhi is a separate group, with 300.',
          },
          {
            kicker: 'Keep every row',
            title: 'transform instead of agg',
            body: '`agg` returns one row per group. `transform` returns one value per original row, so you can add a group statistic as a new column. A common use is each order’s share of its customer’s total.',
            visual: { type: 'code', code: TRANSFORM, output: '[0.6, 1.0, 0.4, 1.0]' },
            narration:
              'transform with sum gives every row its customer’s total, so both of A’s orders get 750. Dividing each amount by that total gives its share. A’s first order is 450 out of 750, which is 0.6. B and C have one order each, so each share is 1.',
          },
          {
            kicker: 'Rank and count',
            title: 'Top customers and counts',
            body: '`sort_values("total", ascending=False)` ranks the totals, and `head(10)` keeps the top ten. `value_counts()` counts how often each value appears, most common first. Filter the result like any table: `out[out["total"] > 500]` keeps A and C, like SQL’s HAVING.',
          },
          {
            kicker: 'Try it',
            title: 'Total and count together',
            try: {
              type: 'choice',
              prompt:
                'You need each customer’s total spend and number of orders in one table. Which call fits?',
              options: [
                {
                  text: '`df.groupby("customer").agg(total=("amount", "sum"), orders=("amount", "count"))`',
                  correct: true,
                  feedback: 'Right. Named aggregation gives both columns, one row per customer.',
                },
                {
                  text: '`df.groupby("customer")["amount"].sum()`',
                  correct: false,
                  feedback: 'That gives only the totals, not the order counts.',
                },
                {
                  text: '`df["amount"].sum()`',
                  correct: false,
                  feedback: 'That is one number for the whole table, not one per customer.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'slides.combine',
      kind: 'SLIDES',
      title: 'Merge, join and concat',
      depthRank: 1,
      conceptKeys: [GM],
      body: {
        slides: [
          {
            kicker: 'Joining tables',
            title: 'merge works like a SQL join',
            body: '`merge` matches rows from two tables on a key column. `how` decides what happens to rows without a match. Inner keeps only matches, left keeps every row of the left table, and outer keeps everything.',
            animation: { name: 'merge-joins', caption: 'Real use: orders with customer details' },
          },
          {
            kicker: 'In code',
            title: 'Three joins, three row counts',
            visual: { type: 'code', code: MERGE, output: 'inner 3\nleft 4\nouter 5' },
            note: 'Add `indicator=True` to see which side each row came from. It is the quickest way to find unmatched orders.',
            narration:
              'Three customers and four orders, one of them from customer 4, who is not in the customer table. An inner merge keeps the three orders that match a customer. A left merge keeps every customer, so Meera appears with an empty amount: four rows. An outer merge also keeps the order from customer 4: five rows.',
          },
          {
            kicker: 'Three tools',
            title: 'merge, join and concat',
            visual: {
              type: 'icons',
              items: [
                { icon: 'link', label: 'merge', sub: 'Match rows on key columns, like SQL' },
                { icon: 'key', label: 'join', sub: 'Match on the index; a shortcut for merge' },
                {
                  icon: 'layers',
                  label: 'concat',
                  sub: 'Stack tables on top of or beside each other',
                },
              ],
            },
            note: '`pd.concat([jan, feb], ignore_index=True)` stacks January and February orders and numbers the rows again from 0.',
          },
          {
            kicker: 'Pitfall',
            title: 'Repeated keys multiply rows',
            body: 'If a key repeats on both sides, every pair matches. Two rows for customer 1 on each side become four. Add `validate="many_to_one"` to `orders.merge(customers, ...)`: many orders, one customer each. pandas then raises an error if an ID repeats in customers.',
          },
          {
            kicker: 'Try it',
            title: 'Keep every customer',
            try: {
              type: 'choice',
              prompt:
                'The report must list every customer, including those with no orders. Which merge fits?',
              options: [
                {
                  text: '`customers.merge(orders, on="customer_id", how="left")`',
                  correct: true,
                  feedback:
                    'Right. A left merge keeps every customer; those with no orders get empty order columns.',
                },
                {
                  text: '`customers.merge(orders, on="customer_id", how="inner")`',
                  correct: false,
                  feedback: 'An inner merge drops customers with no orders.',
                },
                {
                  text: '`pd.concat([customers, orders])`',
                  correct: false,
                  feedback: 'concat stacks the tables without matching customer IDs.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'slides.speed',
      kind: 'SLIDES',
      title: 'Fast pandas and reshaping',
      depthRank: 1,
      conceptKeys: [SEL, GM],
      body: {
        slides: [
          {
            kicker: 'Speed',
            title: 'Vectorise instead of apply',
            body: '`apply` with a lambda calls Python once per row. A **vectorised** operation, like `df["amount"] * 0.18`, runs on the whole column at once in compiled code. It is often tens of times faster.',
            visual: {
              type: 'code',
              code: VECTOR,
              output: "[[450, 81.0, 'small'], [12000, 2160.0, 'big'], [300, 54.0, 'small']]",
            },
            note: '`np.where(condition, a, b)` is the vectorised if-else. Keep `apply` for logic that truly needs Python per row.',
            narration:
              'Tax is 18 percent of every amount, computed for the whole column in one multiplication. For an if else, np where takes a condition and two choices. Here it gives big where the amount is above 10,000, and small elsewhere. There is no loop and no apply, and on a million rows this is far faster.',
          },
          {
            kicker: 'Reshape',
            title: 'Pivot tables for reports',
            body: '`pivot_table` averages by default, so pass `aggfunc="sum"` for totals. Plain `pivot` only reshapes, and raises an error if a city and month pair repeats.',
            visual: {
              type: 'code',
              code: PIVOT,
              output: "['Feb', 'Jan']\n[['Delhi', 120, 200], ['Pune', 150, 100]]",
            },
            note: 'A pivot table is a groupby on two keys, laid out as a grid: one row per city, one column per month.',
            narration:
              'Sales for two cities over two months. pivot table puts the cities down the side and the months across the top, and sums the amounts in each cell. The months come out in alphabetical order, February before January. Delhi sold 120 in February and 200 in January. Leave out aggfunc, and pivot table would average instead.',
          },
          {
            kicker: 'Scenario',
            title: 'A file with millions of rows',
            body: 'For a CSV too big for memory, read only the columns you need with `usecols`, and set compact `dtype`s. Read it in pieces with `chunksize`, aggregate each piece, then combine the results. For an average, keep each piece’s sum and count, and divide at the end.',
          },
        ],
      },
    },
    {
      key: 'playground.report',
      kind: 'PLAYGROUND',
      title: 'Build a revenue report',
      depthRank: 1,
      conceptKeys: [GM],
      body: {
        language: 'python',
        instructions:
          'For each customer, compute the total and the average order value, and add their name from `customers`. Sort by total, highest first. Round the average to one decimal, and keep the columns name, total and avg.',
        starterCode: REPORT_START,
        hints: [
          '`orders.groupby("customer_id")["amount"].agg(total="sum", avg="mean").reset_index()` gives both numbers per customer.',
          'Then `.merge(customers, on="customer_id")` adds the names, and `.sort_values("total", ascending=False)` ranks them.',
          'Finish with `report["avg"] = report["avg"].round(1)` and `report = report[["name", "total", "avg"]]`.',
        ],
        solution: REPORT_SOLUTION,
        checks: [
          {
            type: 'stdout_contains',
            value: "['Asha', 1000, 333.3]",
            label: 'Asha: total 1,000 and average 333.3',
          },
          {
            type: 'stdout_contains',
            value: "[['Asha', 1000, 333.3], ['Meera', 520, 520.0], ['Ravi', 450, 225.0]]",
            label: 'Sorted by total, highest first, with names',
          },
        ],
        packages: ['pandas'],
      },
    },
    {
      key: 'check.basics',
      kind: 'KNOWLEDGE_CHECK',
      title: 'Pandas check',
      depthRank: 1,
      conceptKeys: [SEL, GM],
      body: {
        items: [
          {
            key: 'slices',
            type: 'predict_output',
            prompt: 'What does this print?',
            language: 'python',
            code: 'import pandas as pd\n\nx = pd.DataFrame({"v": [5, 6, 7, 8]})\nprint(len(x.loc[0:2]), len(x.iloc[0:2]))',
            options: [
              { id: 'a', text: '3 2' },
              { id: 'b', text: '2 2' },
              { id: 'c', text: '3 3' },
              { id: 'd', text: '2 3' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'loc includes the end label 2, so it returns rows 0, 1 and 2. iloc stops before position 2, so it returns two rows.',
          },
          {
            key: 'mask',
            type: 'mcq',
            prompt: 'Which line keeps rows where city is Pune and amount is above 500?',
            options: [
              { id: 'a', text: 'df[(df["city"] == "Pune") & (df["amount"] > 500)]' },
              { id: 'b', text: 'df[df["city"] == "Pune" and df["amount"] > 500]' },
              { id: 'c', text: 'df[df["city"] == "Pune" & df["amount"] > 500]' },
              { id: 'd', text: 'df.loc["Pune", 500]' },
            ],
            answer: { correct: ['a'] },
            explanation:
              '`and` needs one True or False, not a whole column. Without brackets, `&` runs before `==`, so each condition needs its own brackets.',
          },
          {
            key: 'inner',
            type: 'mcq',
            prompt:
              'customers has 100 rows, and 20 of them have no orders. After customers.merge(orders, how="inner"), who is missing?',
            options: [
              { id: 'a', text: 'The 20 customers with no orders' },
              { id: 'b', text: 'Nobody; inner keeps every customer' },
              { id: 'c', text: 'Every customer with more than one order' },
              { id: 'd', text: 'All 100 customers' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'An inner merge keeps only rows with a match on both sides. Use how="left" to keep them.',
          },
          {
            key: 'transform',
            type: 'mcq',
            prompt: 'Which returns one value for every original row?',
            options: [
              { id: 'a', text: 'df.groupby("customer")["amount"].transform("sum")' },
              { id: 'b', text: 'df.groupby("customer")["amount"].sum()' },
              { id: 'c', text: 'df.groupby("customer")["amount"].agg("sum")' },
              { id: 'd', text: 'df["amount"].sum()' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'transform repeats each group’s result on every row of that group. sum and agg give one row per group.',
          },
          {
            key: 'vectorise',
            type: 'mcq',
            prompt: 'Which is the fastest way to compute 18% tax on a million amounts?',
            options: [
              { id: 'a', text: 'df["amount"] * 0.18' },
              { id: 'b', text: 'df["amount"].apply(lambda x: x * 0.18)' },
              { id: 'c', text: 'A for loop over df.iterrows()' },
              { id: 'd', text: 'df.apply(lambda row: row["amount"] * 0.18, axis=1)' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'The vectorised version runs on the whole column in compiled code. The others call Python once per row.',
          },
        ],
      },
    },
    {
      key: 'interview.live-pandas',
      kind: 'INTERVIEW_PLAYBOOK',
      title: 'Live pandas task structure',
      depthRank: 1,
      conceptKeys: [SEL, GM],
      body: {
        question: '"Here is an orders table. Find each customer’s total revenue."',
        totalMinutes: 5,
        steps: [
          {
            title: 'Look',
            detail:
              'Print `df.head()` and `df.dtypes` first, and say what you see. Text columns show as `str` in pandas 3 and `object` in older versions.',
          },
          {
            title: 'Clarify',
            detail:
              'Ask about edge cases: missing amounts, refunds as negative amounts, repeated orders.',
          },
          {
            title: 'Write',
            detail: 'Write the one-liner: `df.groupby("customer_id")["amount"].sum()`.',
          },
          {
            title: 'Check',
            detail:
              'Check one customer by hand, and check the totals add up to `df["amount"].sum()`. If they do not, look for missing customer IDs: groupby drops them by default.',
          },
          {
            title: 'Extend',
            detail:
              'Offer the next step: averages with `agg`, the top ten with `sort_values`, names with `merge`.',
          },
        ],
        followUps: [
          'What is the difference between loc and iloc?',
          'What is the difference between merge, join and concat?',
          'Why is apply slower than a vectorised operation?',
          'How would you process a CSV with millions of rows?',
        ],
      },
    },
    {
      key: 'interview-questions',
      kind: 'CARD_DECK',
      title: 'Interview questions and answers',
      depthRank: 1,
      conceptKeys: [SEL, GM],
      body: {
        layout: 'flip',
        cards: [
          {
            title: 'loc vs iloc',
            front: 'What is the difference between loc and iloc?',
            back: '`loc` selects by label: row index labels and column names, and its slices include the end. `iloc` selects by integer position from 0, and its slices exclude the end, like Python lists. Even with the default index, `df.loc[0:2]` gives three rows and `df.iloc[0:2]` gives two. After filtering or sorting, labels and positions stop matching.',
          },
          {
            title: 'Filtering rows',
            front: 'How do you filter rows where sales is greater than 10,000?',
            back: 'Use a boolean mask: `df[df["sales"] > 10000]`. For several conditions, wrap each in brackets and join them with `&` for and, or `|` for or, such as `df[(df["sales"] > 10000) & (df["city"] == "Pune")]`. Python’s `and` fails on whole columns, because it needs a single True or False. `df.query("sales > 10000")` is a readable alternative.',
          },
          {
            title: 'groupby',
            front: 'What does groupby do? Give an example.',
            back: 'It splits rows into groups by one or more columns, applies a function to each group, and combines the results. For example, `df.groupby("customer_id")["amount"].sum()` gives total revenue per customer. You can pass a list of columns to group by several keys at once.',
          },
          {
            title: 'Total and average together',
            front:
              'How would you calculate total revenue and average order value per customer at the same time?',
            back: 'Use named aggregation: `df.groupby("customer_id").agg(total=("amount", "sum"), avg=("amount", "mean"))`. It returns one row per customer with two clearly named columns. Add `.reset_index()` to turn customer_id back into a column, and `sort_values("total", ascending=False)` to rank them. The shorter `df.groupby("customer_id")["amount"].agg(["sum", "mean"])` also works, but its columns are just called sum and mean.',
          },
          {
            title: 'merge, join and concat',
            front: 'What is the difference between merge, join and concat?',
            back: '`merge` matches rows from two tables on key columns, like a SQL join, with `how` set to inner, left, right or outer. Its default is inner. `join` does the same on the index, and its default is left. `concat` stacks tables on top of each other or side by side, without matching any keys.',
          },
          {
            title: 'apply vs vectorisation',
            front: 'What is the difference between apply and vectorised operations?',
            back: '`apply` runs a Python function once per row or value, which is slow on big data. Vectorised operations, like `df["a"] * 2` or `np.where`, work on the whole column in compiled code and are often tens of times faster. Use apply only when the logic cannot be vectorised.',
          },
          {
            title: 'Why .copy()',
            front: 'Why use .copy() when you duplicate a DataFrame or take part of one?',
            back: '`df2 = df` copies nothing: both names point to one table, so a change through `df2` shows in `df`. `df2 = df.copy()` makes a new table with its own data, so changes to one never reach the other. Older pandas sometimes let a subset share data with the original, and warned with SettingWithCopyWarning. In pandas 3 every subset acts as a copy; to change the original, use `df.loc[rows, col] = value`.',
          },
          {
            title: 'NumPy and pandas',
            front: 'What are NumPy and pandas used for?',
            back: 'NumPy gives fast arrays of one type and maths on whole arrays, and most ML libraries build on it. pandas adds tables: named columns of mixed types, row labels, missing values, grouping, joining and reading files. Use NumPy for numeric computation and pandas for tabular data.',
          },
          {
            title: 'A huge CSV',
            front: 'You get a CSV with millions of transactions. How do you process it?',
            back: 'Read only the needed columns with `usecols`, with compact `dtype`s, and parse dates on load. If it still does not fit, read it in pieces with `chunksize`, aggregate each piece and combine. For an average, add up the sums and counts, then divide once. Check types and duplicates first, then save a clean copy in a columnar format like Parquet.',
          },
        ],
      },
    },
    {
      key: 'summary',
      kind: 'SUMMARY',
      title: 'Pandas: key takeaways',
      depthRank: 1,
      conceptKeys: [SEL, GM],
      body: {
        takeaways: [
          'A DataFrame is a table with labelled rows and named columns; one column is a Series.',
          'Filter with boolean masks: bracket each condition and join them with & or |.',
          'loc uses labels and includes the slice end; iloc uses positions and excludes it.',
          'groupby splits, applies and combines. agg gives one row per group; transform gives one value per row.',
          'merge joins on keys like SQL; concat stacks tables. Watch for repeated keys.',
          'Prefer vectorised operations to apply, and edit with loc in one step.',
        ],
        remember: [
          'loc: labels, end included',
          'agg per group, transform per row',
          'A left merge keeps every left row',
        ],
      },
    },
  ],
};
