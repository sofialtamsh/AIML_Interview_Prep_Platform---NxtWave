/**
 * LLMs, Prompting & Agents → Agents, tools and LLM frameworks.
 *
 * Evidence (Hiring Intelligence, ML/AI families, Jan–Oct 2026; internal only, never quoted to
 * students): under 8 LPA asks "what is LangChain" again and again, what AI agents and agentic AI
 * are and how they differ from generative AI, from a plain model and from automation, what
 * LangGraph is and how it differs from LangChain, what MCP and MCP servers are, how function
 * calling works, what multi-agent systems and orchestrators are, how a parent agent controls a
 * child, why to use several agents, and what n8n does. 8+ LPA adds workflow versus agent and
 * when a fixed workflow is better for latency, how to build and deploy agents, the structural
 * difference between LangChain and LangGraph, what to do when an agent posts wrong details,
 * diagnosing an agent in production, and how voice agents work. 3–6 LPA teaches this at depth 2;
 * 8–12 LPA at depth 3 swaps the tool-request explorer for a deck on agent design, a tool
 * definition and its call, the MCP call flow, routing in LangGraph, human approval and
 * checkpoints, latency, predictability, memory, debugging and voice agents. Every level gets the
 * interview-questions card deck. RAG belongs to its own topic. The plain-Python code runs with
 * Python 3.14; the three LangChain and LangGraph slides were run with langchain-core 1.8.0 and
 * langgraph 1.2.21.
 */
import type { LessonDocumentInput } from '@app/content';

const TOOLS = 'llm.tool-calling';
const FRAMEWORKS = 'llm.frameworks';
const MCP = 'llm.mcp';

const TOOL_CODE = `import json

def get_order(order_id):
    return "out for delivery"

TOOLS = {"get_order": get_order}

# what the model writes: a request, not an answer
reply = '{"tool": "get_order", "args": {"order_id": 42}}'

call = json.loads(reply)
result = TOOLS[call["tool"]](**call["args"])
print(result)`;

const REPLIES: Record<string, { ask: string; reply: string }> = {
  order: {
    ask: 'Where is order 42?',
    reply: '{"tool": "get_order", "args": {"order_id": 42}}',
  },
  cancel: {
    ask: 'Please cancel order 42.',
    reply: '{"tool": "cancel_order", "args": {"order_id": 42}}',
  },
  joke: {
    ask: 'Tell me a joke.',
    reply: '{"answer": "I can only help with orders."}',
  },
};
const ROUTE_CODE = (key: string) => `import json

def get_order(order_id):
    return "out for delivery"

def cancel_order(order_id):
    return "cancelled, refund in 3 days"

TOOLS = {"get_order": get_order,
         "cancel_order": cancel_order}

# the customer wrote:
# "${REPLIES[key]?.ask ?? ''}"
# and the model replied:
reply = '${REPLIES[key]?.reply ?? ''}'

msg = json.loads(reply)
if "tool" in msg:
    tool = TOOLS[msg["tool"]]
    result = tool(**msg["args"])
    print("tool:", msg["tool"], "->", result)
else:
    print("answer:", msg["answer"])
`;

const AGENT_HEAD = `def get_order(order_id):
    return "out for delivery"

def get_eta(order_id):
    return "10 minutes"

TOOLS = {"get_order": get_order,
         "get_eta": get_eta}

FINAL = "Out for delivery, 10 minutes away."

# a scripted stand-in for the LLM
SCRIPT = [
    {"tool": "get_order",
     "args": {"order_id": 42}},
    {"tool": "get_eta",
     "args": {"order_id": 42}},
    {"answer": FINAL},
]

def model(history):
    # 0 results so far: reply 1
    # 1 result so far: reply 2 ...
    return SCRIPT[len(history)]

`;
const AGENT_TAIL = `

print(run_agent())
`;
const AGENT_START = `${AGENT_HEAD}
def run_agent(max_steps=5):
    history = []
    # repeat up to max_steps times:
    # 1. reply = model(history)
    # 2. if "answer" is in reply,
    #    return reply["answer"]
    # 3. else run the tool:
    #    TOOLS[name](**args)
    # 4. print the step, like
    #    step 1: get_order -> ...
    # 5. append result to history
    return "stopped: step limit"
${AGENT_TAIL}`;
const AGENT_SOLUTION = `${AGENT_HEAD}
def run_agent(max_steps=5):
    history = []
    for step in range(1, max_steps + 1):
        reply = model(history)
        if "answer" in reply:
            return reply["answer"]
        name = reply["tool"]
        args = reply["args"]
        result = TOOLS[name](**args)
        line = f"{name} -> {result}"
        print(f"step {step}: {line}")
        history.append(result)
    return "stopped: step limit"
${AGENT_TAIL}`;

const CHAIN_CODE = `from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableLambda

prompt = ChatPromptTemplate.from_template(
    "Summarise in one line: {text}")
# stand-in for a real chat model (needs an API key)
model = RunnableLambda(lambda p: "Cold food, late delivery.")

chain = prompt | model | StrOutputParser()
print(chain.invoke({"text": "Food was cold and late."}))`;

const GRAPH_CODE = `from typing import TypedDict
from langgraph.graph import END, START, StateGraph
State = TypedDict("State", {"draft": str, "tries": int})

def write(s):
    return {"draft": s["draft"] + "!", "tries": s["tries"] + 1}
def route(s):
    return END if s["tries"] >= 2 else "write"

g = StateGraph(State)
g.add_node("write", write)
g.add_edge(START, "write")
g.add_conditional_edges("write", route)
print(g.compile().invoke({"draft": "Hi", "tries": 0}))`;

const TOOL_DEF_CODE = `import json
tool = {"name": "get_order",
        "description": "Get the delivery status of one order",
        "parameters": {"type": "object",
                       "properties": {"order_id": {"type": "integer"}},
                       "required": ["order_id"]}}
# the model's reply: a tool call with an ID, not an answer
call = {"id": "call_1", "name": "get_order",
        "arguments": '{"order_id": 42}'}
args = json.loads(call["arguments"])
assert isinstance(args["order_id"], int)  # check before running
result = {"role": "tool", "tool_call_id": call["id"],
          "content": "out for delivery"}
print(call["name"], args, "->", result["content"])`;

const BRANCH_CODE = `from typing import TypedDict
from langgraph.graph import END, START, StateGraph
State = TypedDict("State", {"msg": str, "reply": str})
def greet(s): return {"reply": "Hello. Ask me about the weather."}
def weather(s): return {"reply": "Pune: sunny, 31 °C"}
def route(s):  # reads the state, returns the next node's name
    return "greet" if s["msg"].lower() in ("hi", "hello") else "weather"

g = StateGraph(State)
for name, fn in [("greet", greet), ("weather", weather)]:
    g.add_node(name, fn)
    g.add_edge(name, END)
g.add_conditional_edges(START, route)
print(g.compile().invoke({"msg": "hi"})["reply"])`;

export const AGENTS_FRAMEWORKS_LESSON: LessonDocumentInput = {
  title: 'Agents, tools and LLM frameworks',
  subtitle:
    'Tool calling, the agent loop, LangChain, LangGraph, MCP and multi-agent systems, one story at a time.',
  objectives: [
    {
      key: 'agents',
      text: 'Explain what an AI agent is, and how it differs from a chatbot, automation and a workflow',
      minDepthRank: 1,
    },
    {
      key: 'tools',
      text: 'Explain how tool calling works, and build a simple agent loop',
      minDepthRank: 1,
    },
    {
      key: 'frameworks',
      text: 'Explain what LangChain and LangGraph are, and when to use each',
      minDepthRank: 1,
    },
    {
      key: 'mcp',
      text: 'Explain what MCP is, its parts, and why multi-agent systems are used',
      minDepthRank: 1,
    },
    {
      key: 'deep',
      text: 'Design an agent with limits, approval, memory and tracing, and reason about latency',
      minDepthRank: 3,
    },
  ],
  sections: [
    {
      key: 'hook',
      kind: 'HOOK',
      title: 'From answering to doing',
      depthRank: 1,
      conceptKeys: [TOOLS],
      body: {
        scenario:
          'Ask a plain chatbot "Where is my order?" and it can only guess. Give the model a **tool**, a function it can ask the app to run, such as an order lookup. Now it checks first, then answers. An LLM that uses tools, step by step, to reach a goal is an **AI agent**.',
        animation: {
          name: 'agent-loop',
          caption: 'An agent thinks, acts and checks until the job is done',
        },
        realWorld: {
          title: 'Where agents work',
          items: [
            { icon: 'code', label: 'Coding assistants', sub: 'Read files, run tests, fix the bug' },
            { icon: 'bot', label: 'Support agents', sub: 'Look up orders and start refunds' },
            { icon: 'phone', label: 'Voice agents', sub: 'Take calls and book appointments' },
            {
              icon: 'search',
              label: 'Research assistants',
              sub: 'Search, read and write a report',
            },
          ],
        },
        provocation:
          'A model can only write text. So how does it look up an order or send an email?',
        bridge:
          '"What is an AI agent?", "what is LangChain?" and "what is MCP?" are common technical-round questions. This lesson answers each with a story, a picture and code.',
      },
    },
    {
      key: 'slides.agents',
      kind: 'SLIDES',
      title: 'Agents and tool calling',
      depthRank: 1,
      conceptKeys: [TOOLS],
      body: {
        slides: [
          {
            kicker: 'Agents · the story',
            title: 'An advisor tells, an assistant does',
            body: 'An advisor tells you how to book a train ticket. An assistant books it for you. A chatbot is the advisor. An **AI agent** is the assistant: an LLM that plans, uses tools and checks results until the goal is met.',
            visual: {
              type: 'compare',
              left: {
                title: 'Chatbot',
                items: ['Answers from what it already knows'],
              },
              right: {
                title: 'AI agent',
                items: ['Uses tools: search, databases, email, code'],
              },
              better: 'none',
            },
          },
          {
            kicker: 'Three terms',
            title: 'Automation, generative AI and agentic AI',
            body: 'Take a late order. Automation sends a fixed SMS. Generative AI writes an apology. Agentic AI finds the order, checks why it is late, and starts the refund.',
            visual: {
              type: 'icons',
              items: [
                {
                  icon: 'settings',
                  label: 'Automation',
                  sub: 'Fixed rules: if this happens, do that',
                },
                {
                  icon: 'sparkles',
                  label: 'Generative AI',
                  sub: 'Creates text, images or code when asked',
                },
                {
                  icon: 'bot',
                  label: 'Agentic AI',
                  sub: 'Works towards a goal: plans, acts and checks',
                },
              ],
            },
            note: 'An **AI agent** is one agentic system: a generative model as the brain, plus tools and a loop.',
          },
          {
            kicker: 'Tool calling · the story',
            title: 'The model asks, your code acts',
            body: 'A doctor does not run the blood test. They write a request, the lab runs it, and the report comes back. In **tool calling**, also called **function calling**, the model writes a request; your app runs the function and returns the result.',
            animation: {
              name: 'tool-call-roundtrip',
              caption: 'Real use: order lookups, web search, sending email',
            },
          },
          {
            kicker: 'Tool calling · the code',
            title: 'A request in, a result out',
            narration:
              'Here is tool calling in a few lines. The function get order is the tool, and the dictionary called TOOLS maps its name to the function. The model does not run anything. It only writes a small JSON request with the tool name and the order number. Our code reads that request, finds the function by name, calls it with order 42, and prints the result: out for delivery.',
            visual: {
              type: 'code',
              code: TOOL_CODE,
              output: 'out for delivery',
            },
            note: '`TOOLS[...]` finds the function by name. `**` passes the args as named values, so this runs `get_order(order_id=42)`.',
          },
          {
            kicker: 'Function calling · the steps',
            title: 'Four steps, every time',
            points: [
              'The app sends the question and a list of tools, each with a description',
              'The model replies with a JSON request: a tool name and arguments',
              'The app runs the function and sends the result back',
              'The model reads the result and answers the user',
            ],
            note: 'The model picks a tool by its description, so write it clearly.',
          },
          {
            kicker: 'The agent loop',
            title: 'Think, act, observe, repeat',
            points: [
              '**Think**: the model reads the goal and the history, and picks a step',
              '**Act**: it requests a tool',
              '**Observe**: the result joins the history',
              '**Stop**: at a final answer, or at a step limit',
            ],
            note: 'The **history** is the list of messages and tool results so far. **ReAct** is short for reasoning and acting.',
          },
          {
            kicker: 'Workflow or agent',
            title: 'Who decides the next step',
            body: 'A train follows a fixed track; a taxi driver picks the route. A **workflow** is the train: your code fixes the steps. An **agent** is the taxi driver: the model picks each step.',
            visual: {
              type: 'compare',
              left: {
                title: 'Workflow',
                items: [
                  'Your code fixes the steps and their order',
                  'Predictable, faster and cheaper',
                ],
              },
              right: {
                title: 'Agent',
                items: ['The model chooses each next step', 'Flexible, but slower and costlier'],
              },
              better: 'none',
            },
            note: '**n8n** is a low-code tool: you build a workflow by joining nodes on a screen. A node can call an LLM.',
          },
          {
            kicker: 'Try it',
            title: 'The nightly report',
            try: {
              type: 'choice',
              prompt:
                'Every night, an app must download a sales file, total it and email the report. The steps never change. What fits best?',
              options: [
                {
                  text: 'A fixed workflow, written in code',
                  correct: true,
                  feedback: 'Right. Known steps in a known order need no model to decide.',
                },
                {
                  text: 'An agent with three tools',
                  correct: false,
                  feedback: 'It is slower, costlier and can pick a wrong step.',
                },
                {
                  text: 'A chatbot with no tools',
                  correct: false,
                  feedback: 'It cannot download a file or send an email.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'explorer.tools',
      slotKey: 'practice',
      kind: 'CODE_EXPLORER',
      title: 'Three messages, two kinds of reply',
      depthRank: 1,
      conceptKeys: [TOOLS],
      body: {
        prompt:
          'A support agent has two tools. Pick a customer message and see what the model replies: a tool request, or a direct answer. The app runs a tool only when the model asks for it.',
        controls: [
          {
            id: 'ask',
            label: 'Customer message',
            options: [
              { value: 'order', label: 'Where is order 42?' },
              { value: 'cancel', label: 'Please cancel order 42.' },
              { value: 'joke', label: 'Tell me a joke.' },
            ],
          },
        ],
        states: [
          {
            when: { ask: 'order' },
            code: ROUTE_CODE('order'),
            output: { kind: 'text', value: 'tool: get_order -> out for delivery\n' },
            verdict: {
              tone: 'ok',
              text: 'The model asked for `get_order`. The app ran it and got the status back.',
            },
          },
          {
            when: { ask: 'cancel' },
            code: ROUTE_CODE('cancel'),
            output: { kind: 'text', value: 'tool: cancel_order -> cancelled, refund in 3 days\n' },
            verdict: {
              tone: 'info',
              text: 'A different message, a different tool. The model matched the request to a tool it was offered.',
            },
          },
          {
            when: { ask: 'joke' },
            code: ROUTE_CODE('joke'),
            output: { kind: 'text', value: 'answer: I can only help with orders.\n' },
            verdict: {
              tone: 'info',
              text: 'No tool fits, so the model answers directly. Not every message needs a tool.',
            },
          },
        ],
        defaultState: { ask: 'order' },
      },
    },
    {
      key: 'playground.agent',
      kind: 'PLAYGROUND',
      title: 'Build the agent loop',
      depthRank: 1,
      conceptKeys: [TOOLS],
      body: {
        language: 'python',
        instructions:
          'Finish `run_agent`. Here `model(history)` stands in for the LLM: it returns a tool request or a final answer. Run each requested tool, add the result to `history`, and print each step like `step 1: get_order -> out for delivery`. Return the final answer. It should print two steps, then `Out for delivery, 10 minutes away.`',
        starterCode: AGENT_START,
        hints: [
          'Loop with `for step in range(1, max_steps + 1):` and call `reply = model(history)`.',
          'If `"answer" in reply`, return `reply["answer"]`.',
          'Else `name = reply["tool"]` and `args = reply["args"]`, then `result = TOOLS[name](**args)`.',
          'Print `f"step {step}: {name} -> {result}"` and `history.append(result)`.',
        ],
        solution: AGENT_SOLUTION,
        checks: [
          {
            type: 'stdout_contains',
            value: 'step 1: get_order -> out for delivery',
            label: 'Step 1 runs get_order',
          },
          {
            type: 'stdout_contains',
            value: 'step 2: get_eta -> 10 minutes',
            label: 'Step 2 runs get_eta',
          },
          {
            type: 'stdout_contains',
            value: 'Out for delivery, 10 minutes away.',
            label: 'The final answer is returned',
          },
        ],
      },
    },
    {
      key: 'slides.frameworks',
      kind: 'SLIDES',
      title: 'LangChain and LangGraph',
      depthRank: 1,
      conceptKeys: [FRAMEWORKS],
      body: {
        slides: [
          {
            kicker: 'LangChain · the story',
            title: 'Ready-made parts that fit together',
            note: 'A **prompt template** is a prompt with blanks to fill. An **output parser** turns the model reply into clean text or JSON.',
            body: 'A plumber does not make pipes and taps. They buy standard parts and join them. **LangChain** is an open-source **framework**, a ready set of code, with standard parts for LLM apps. You join the parts into a **chain**: the output of one flows into the next.',
            visual: {
              type: 'flow',
              steps: [
                { label: 'Prompt template', icon: 'file' },
                { label: 'Model', icon: 'cpu' },
                { label: 'Output parser', icon: 'list' },
              ],
            },
          },
          {
            kicker: 'LangChain · the code',
            title: 'Join the parts with a pipe',
            narration:
              'This is a small LangChain chain. The prompt template has a blank called text. The model here is only a stand-in that returns a fixed reply, because a real chat model needs an API key. The pipe symbol joins the three parts, so the output of each one flows into the next. Calling invoke fills the blank and runs the chain. It prints the one line summary: Cold food, late delivery.',
            visual: { type: 'code', code: CHAIN_CODE, output: 'Cold food, late delivery.' },
            note: '`{text}` is a blank that `invoke` fills, and `invoke` runs the chain. With a real chat model, the parser pulls the text out of its reply.',
          },
          {
            kicker: 'LangGraph · the story',
            title: 'A map with turns and loops',
            body: 'A one-way street only goes forward. A city map has junctions and U-turns, so you can turn or go back. A chain is the street. **LangGraph** is the map: a **graph** of steps joined by arrows. **Nodes** are steps, **edges** are arrows, and a shared **state** carries the data.',
            animation: {
              name: 'chain-vs-graph',
              caption: 'Real use: agents that retry, branch or wait for approval',
            },
          },
          {
            kicker: 'LangGraph · the code',
            title: 'A node that loops until done',
            narration:
              'Here is a tiny LangGraph app. State lists the data the graph carries: a draft, and a count of tries. The node called write adds an exclamation mark to the draft and adds 1 to tries. The function called route then decides what happens next: go back to write, or stop once tries reaches 2. So the node runs twice. The final state has the draft Hi with two exclamation marks, and tries equal to 2.',
            visual: { type: 'code', code: GRAPH_CODE, output: "{'draft': 'Hi!!', 'tries': 2}" },
            note: '`State` lists the data. `write` is a node. `route` picks the next node, or `END` to stop. `compile()` builds the graph and `invoke()` runs it.',
          },
          {
            kicker: 'Side by side',
            title: 'LangChain and LangGraph side by side',
            visual: {
              type: 'compare',
              left: {
                title: 'LangChain',
                items: [
                  'Parts and chains for LLM apps',
                  'Mostly one direction, start to finish',
                  'Good for simple prompt pipelines',
                ],
              },
              right: {
                title: 'LangGraph',
                items: [
                  'Graphs with state, loops and branches',
                  'Can pause for a person and resume later',
                  'Good for agents and multi-step work',
                ],
              },
              better: 'none',
            },
            note: 'LangGraph comes from the LangChain team and also works alone. The ready-made agent in LangChain, `create_agent`, runs on LangGraph underneath.',
          },
          {
            kicker: 'Try it',
            title: 'Draft, check, rewrite',
            try: {
              type: 'choice',
              prompt:
                'Your app must draft an email, check it, and rewrite it until the check passes. Which fits best?',
              options: [
                {
                  text: 'LangGraph: the rewrite step needs a loop',
                  correct: true,
                  feedback:
                    'Right. Going back to an earlier step is what a graph with a conditional edge does.',
                },
                {
                  text: 'A plain LangChain chain, run once',
                  correct: false,
                  feedback: 'A chain runs once from start to finish; it has no way back.',
                },
                {
                  text: 'Neither: an LLM cannot check a draft',
                  correct: false,
                  feedback: 'It can. A second prompt, or plain code, can check the draft.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'slides.mcp',
      kind: 'SLIDES',
      title: 'MCP and multi-agent systems',
      depthRank: 1,
      conceptKeys: [MCP],
      body: {
        slides: [
          {
            kicker: 'MCP · the story',
            title: 'One plug for every tool',
            body: 'Phones once needed a different charger for each brand. Then one standard plug fitted them all. **MCP** (Model Context Protocol) is that plug for AI apps. Anthropic introduced it in 2024 as an open **protocol**, a shared set of rules, for connecting AI apps to tools and data.',
            animation: {
              name: 'mcp-hub',
              caption: 'Real use: connecting an assistant to GitHub, files or a database',
            },
          },
          {
            kicker: 'MCP · the parts',
            title: 'Host, client and server',
            visual: {
              type: 'icons',
              items: [
                { icon: 'laptop', label: 'Host', sub: 'The AI app the user works in' },
                {
                  icon: 'link',
                  label: 'Client',
                  sub: 'Inside the host: one connection per server',
                },
                {
                  icon: 'server',
                  label: 'Server',
                  sub: 'Offers tools, resources (data) and prompts',
                },
              ],
            },
            note: 'Example: a chat app is the host; a GitHub MCP server offers it tools like "create issue". Messages use JSON-RPC, a JSON request-and-reply format.',
          },
          {
            kicker: 'MCP and tool calling',
            title: 'They solve different problems',
            points: [
              '**Tool calling** is how a model asks for a tool: a structured request',
              '**MCP** is how tools are packaged, so any compatible app can find and use them',
              'Write an MCP server once; many AI apps can use it',
            ],
          },
          {
            kicker: 'Multi-agent · the story',
            title: 'A team with a coordinator',
            body: 'A building contractor does not do the wiring or the plumbing. They give each job to a specialist, check the work, and hand over the house. In a **multi-agent system**, an **orchestrator** agent splits the work among specialist agents, then combines their results.',
            animation: {
              name: 'multi-agent-orchestrator',
              caption: 'Real use: research, travel planning and coding tools',
            },
          },
          {
            kicker: 'Multi-agent · the trade-off',
            title: 'When more agents help',
            points: [
              'Each agent gets a short prompt and few tools, so it makes fewer mistakes',
              'Each has its own context window, and tasks can run in parallel',
              'The cost: more tokens, extra hand-offs between agents and harder debugging',
              'The orchestrator (parent) controls each specialist (child) through its brief, its tools, and a check of its result',
            ],
            note: 'Start with one agent. Split only when its prompt or tool list grows too large.',
          },
          {
            kicker: 'Try it',
            title: 'Forty tools, one agent',
            try: {
              type: 'choice',
              prompt:
                'An agent has 40 tools and a very long prompt. It often picks the wrong tool. What is a sensible fix?',
              options: [
                {
                  text: 'Split it into a few specialist agents, each with a small tool set',
                  correct: true,
                  feedback: 'Right. Fewer tools and a shorter prompt make each choice easier.',
                },
                {
                  text: 'Raise the temperature so it tries other tools',
                  correct: false,
                  feedback: 'That makes its choices more random, not more accurate.',
                },
                {
                  text: 'Add more tools so one of them always fits',
                  correct: false,
                  feedback: 'A longer tool list makes the choice harder still.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'check.basics',
      slotKey: 'check',
      kind: 'KNOWLEDGE_CHECK',
      title: 'Agents and frameworks check',
      depthRank: 1,
      conceptKeys: [TOOLS, FRAMEWORKS, MCP],
      body: {
        items: [
          {
            key: 'agent',
            type: 'mcq',
            prompt: 'What makes an LLM app an agent, not a plain chatbot?',
            options: [
              {
                id: 'a',
                text: 'The model uses tools in a loop, choosing each next step, until the goal is met',
              },
              {
                id: 'b',
                text: 'It uses a bigger model with a longer context window than a chatbot',
              },
              { id: 'c', text: 'It always answers in JSON, never in plain sentences' },
              { id: 'd', text: 'It was trained on the private data of the company' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'An agent plans, calls tools, reads the results and repeats. Model size, output format and training data do not make an agent.',
          },
          {
            key: 'who-runs',
            type: 'mcq',
            prompt: 'In tool calling, what runs the function?',
            options: [
              { id: 'a', text: 'Your app: the model only writes the request' },
              { id: 'b', text: 'The model: it executes the code inside itself' },
              { id: 'c', text: 'The user: they must run it by hand' },
              { id: 'd', text: 'The tokenizer: it turns the call into IDs' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'The model writes the tool name and arguments. The app runs the function and sends the result back to the model.',
          },
          {
            key: 'dispatch',
            type: 'predict_output',
            prompt: 'What does this print?',
            language: 'python',
            code: 'TOOLS = {"add": lambda a, b: a + b,\n         "mul": lambda a, b: a * b}\ncalls = [\n    {"tool": "add", "args": {"a": 2, "b": 3}},\n    {"tool": "mul", "args": {"a": 4, "b": 5}},\n]\nfor c in calls:\n    result = TOOLS[c["tool"]](**c["args"])\n    print(c["tool"], result)',
            options: [
              { id: 'a', text: 'add 5\nmul 20' },
              { id: 'b', text: 'add 20\nmul 5' },
              { id: 'c', text: 'add 5\nmul 9' },
              { id: 'd', text: 'An error' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Each request names a tool and its arguments. The app looks the tool up and calls it: 2 + 3 = 5, then 4 × 5 = 20.',
          },
          {
            key: 'graph',
            type: 'mcq',
            prompt: 'When is LangGraph a better fit than a plain LangChain chain?',
            options: [
              {
                id: 'a',
                text: 'When the app needs loops, branches or saved state, as agents do',
              },
              { id: 'b', text: 'When the app is one prompt and one model call, start to finish' },
              { id: 'c', text: 'When you want to avoid using any LLM at all' },
              { id: 'd', text: 'When the prompt must be shorter than 100 tokens' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'A chain runs one way. A graph has nodes, edges and state, so it can go back, branch and pause.',
          },
          {
            key: 'mcp',
            type: 'mcq',
            prompt: 'What is MCP?',
            options: [
              {
                id: 'a',
                text: 'An open standard for connecting AI apps to tools and data sources',
              },
              { id: 'b', text: 'A limit on how much data a model can process at once' },
              { id: 'c', text: 'A method for training models on private company data' },
              { id: 'd', text: 'A setting that controls how random the replies are' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'MCP, the Model Context Protocol, standardises how apps reach tools. A server is written once and used by many apps.',
          },
        ],
      },
    },
    {
      key: 'interview.agent',
      kind: 'INTERVIEW_PLAYBOOK',
      title: 'AI agent answer structure',
      depthRank: 1,
      conceptKeys: [TOOLS, FRAMEWORKS, MCP],
      body: {
        question: '"What is an AI agent, and how does it work?"',
        totalMinutes: 2,
        steps: [
          {
            title: 'Define',
            detail:
              'An AI agent is an LLM that works towards a goal: it plans, uses tools and checks the results.',
          },
          {
            title: 'Tools',
            detail:
              'Through tool calling, the model writes a request with a tool name and arguments. The app runs the function and returns the result.',
          },
          {
            title: 'Loop',
            detail:
              'It repeats think, act, observe. It stops at a final answer or at a step limit.',
          },
          {
            title: 'Example',
            detail:
              'For "Where is my order?", it calls an order-lookup tool, reads the status, then answers.',
          },
          {
            title: 'Versus a workflow',
            detail:
              'In a workflow, code fixes the steps. In an agent, the model picks each step, which is flexible but slower and less predictable.',
          },
          {
            title: 'Building it',
            detail:
              'Frameworks such as LangGraph manage the loop and state. MCP is a standard way to plug in tools.',
          },
        ],
        followUps: [
          'What is the difference between generative AI and agentic AI?',
          'How does function calling work?',
          'What is LangChain, and how is LangGraph different?',
          'What is MCP, and what is an MCP server?',
          'Why use several agents instead of one?',
          'What is n8n, and how is a workflow different from an agent?',
        ],
      },
    },
    {
      key: 'slides.deeper',
      slotKey: 'practice',
      kind: 'SLIDES',
      title: 'Deeper agent questions',
      depthRank: 3,
      conceptKeys: [TOOLS, FRAMEWORKS, MCP],
      body: {
        slides: [
          {
            kicker: 'Designing an agent',
            title: 'Four things to decide',
            note: 'To deploy: put the agent behind an API, save its state, log every step, and set cost and step limits.',
            points: [
              '**Goal and scope**: what it may do, and what it must never do',
              '**Tools**: few, clearly described, with inputs checked in code',
              '**Memory**: what stays in the history, and what is saved for later',
              '**Limits**: a step cap, timeouts, and approval before risky actions',
            ],
          },
          {
            kicker: 'Function calling · in detail',
            title: 'A tool definition and its call',
            narration:
              'Here is function calling closer to a real API. The tool definition has a name, a description that the model reads to choose it, and a JSON schema saying order id must be a whole number. The model replies with a tool call: an ID, the tool name and the arguments as a JSON string. Our code parses the arguments and checks the type before running anything. The result goes back in a tool message that carries the same ID. It prints the tool name, the arguments and the result: out for delivery.',
            visual: {
              type: 'code',
              code: TOOL_DEF_CODE,
              output: "get_order {'order_id': 42} -> out for delivery",
            },
            note: 'Field names differ by provider; the parts are the same. The ID links each result to its call, so the model can request several tools at once.',
          },
          {
            kicker: 'MCP · step by step',
            title: 'How an MCP tool call flows',
            points: [
              'The client connects, and the server lists its tools with names, descriptions and schemas',
              'The host passes those tools to the model, like any other tool definitions',
              'When the model calls one, the client asks the server to run it and returns the result',
              'Local servers talk over standard input and output; remote ones over HTTP',
            ],
            note: 'Tool calling is how the model asks. MCP is how the app reaches the tool, the same way for every server.',
          },
          {
            kicker: 'LangGraph · branching',
            title: 'Route each message to a node',
            narration:
              'Here is how you add a branch to a LangGraph bot, a typical take-home task. There are two nodes: greet answers hi or hello, and weather answers everything else. The function called route reads the state and returns the name of the next node. Add conditional edges connects route to the start, so each message takes one branch, and both nodes then lead to the end. With the message hi, the graph runs greet and prints its reply.',
            visual: {
              type: 'code',
              code: BRANCH_CODE,
              output: 'Hello. Ask me about the weather.',
            },
            note: 'To add a feature: add a node, teach the router its name, and give the node an edge out. Then test every branch.',
          },
          {
            kicker: 'Human in the loop · the story',
            title: 'Approve before it posts',
            body: 'A bank clerk prepares a large transfer, but a manager must approve it. Give agents the same rule for actions that cannot be undone: posting, paying, deleting. The agent drafts; a person approves. This is called **human in the loop**.',
            note: 'A **checkpointer** saves the graph state after every step. `interrupt()` pauses a node for a person, and the graph resumes from that **checkpoint**.',
          },
          {
            kicker: 'Latency',
            title: 'Not every step needs an LLM',
            narration:
              'This small calculation shows why not every step should use an LLM. We assume an LLM call takes 2 seconds and a plain code step takes 0.05 seconds. With an LLM at all 5 steps, the total is 10 seconds. With 1 LLM step and 4 code steps, it is only 2.2 seconds. So use plain code for fixed steps, and keep the model for steps that need judgement.',
            visual: {
              type: 'code',
              code: '# seconds per step: an LLM call, plain code\nllm, code = 2.0, 0.05\n\n# 5 steps, an LLM agent at every step\nagent_everywhere = 5 * llm\n# 1 LLM step, 4 steps in plain code\nmostly_code = 1 * llm + 4 * code\nprint(agent_everywhere, round(mostly_code, 2))',
              output: '10.0 2.2',
            },
            note: 'Each LLM call adds seconds and cost. Use plain code for fixed steps, and keep the model for steps that need judgement.',
          },
          {
            kicker: 'Predictability',
            title: 'Constrain the agent, check the workflow',
            points: [
              'An agent becomes predictable with few tools, strict output formats and a step limit',
              'A workflow becomes unpredictable when its LLM steps return free text',
              'Validate the output of each LLM step before the next step uses it',
              'A low temperature and fixed prompts keep runs similar',
            ],
          },
          {
            kicker: 'Memory',
            title: 'Short-term and long-term',
            visual: {
              type: 'compare',
              left: {
                title: 'Short-term',
                items: [
                  'The message history or graph state',
                  'Lives in the context window',
                  'Trimmed or summarised when long',
                ],
              },
              right: {
                title: 'Long-term',
                items: [
                  'Facts saved to a database',
                  'Fetched when they are relevant',
                  'Survives across sessions',
                ],
              },
              better: 'none',
            },
            note: 'Long-term memory can hold facts (semantic), past conversations (episodic) or learned rules (procedural).',
          },
          {
            kicker: 'Debugging',
            title: 'When an agent misbehaves in production',
            points: [
              'Read the **trace**: every prompt, tool call and result, step by step',
              'Check tool descriptions and tool errors first; they cause many wrong choices',
              'Build test tasks with known answers, and rerun them after each change',
              'Add retries and a backup plan for tool failures, and a step limit against endless loops',
            ],
            note: 'Tools such as **LangSmith**, from the LangChain team, record these traces and run test sets. LangGraph builds the agent; LangSmith watches it.',
          },
          {
            kicker: 'Voice agents',
            title: 'Speech in, speech out',
            visual: {
              type: 'flow',
              steps: [
                { label: 'Speech to text', icon: 'mic' },
                { label: 'LLM with tools', icon: 'cpu' },
                { label: 'Text to speech', icon: 'phone' },
              ],
            },
            note: 'Delay matters most: stream each stage and keep replies short. Detect when the caller stops talking, and stop speaking when they interrupt.',
          },
          {
            kicker: 'Try it',
            title: 'A wrong post on LinkedIn',
            try: {
              type: 'choice',
              prompt:
                'An agent drafts LinkedIn posts and publishes them. Sometimes it posts wrong details. What is the best first safeguard?',
              options: [
                {
                  text: 'A person approves each post before it is published',
                  correct: true,
                  feedback:
                    'Right. A post cannot be taken back once people see it, so a person checks first.',
                },
                {
                  text: 'A higher step limit, so it can post again',
                  correct: false,
                  feedback: 'More steps do not stop a wrong post from going out.',
                },
                {
                  text: 'A higher temperature, for fresher wording',
                  correct: false,
                  feedback: 'That adds randomness, which makes wrong details more likely.',
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
      title: 'Agent design check',
      depthRank: 3,
      conceptKeys: [TOOLS, FRAMEWORKS, MCP],
      body: {
        items: [
          {
            key: 'latency',
            type: 'mcq',
            prompt:
              'A pipeline has 8 steps. An LLM call takes 2 seconds and a code step 0.1 seconds. With 3 LLM steps and 5 code steps, how long does it take?',
            options: [
              { id: 'a', text: '6.5 seconds' },
              { id: 'b', text: '16 seconds' },
              { id: 'c', text: '8 seconds' },
              { id: 'd', text: '2.1 seconds' },
            ],
            answer: { correct: ['a'] },
            explanation:
              '3 × 2 = 6 seconds for the LLM steps, and 5 × 0.1 = 0.5 seconds for the code steps: 6.5 in all. With an LLM at all 8 steps it would be 16.',
          },
          {
            key: 'approval',
            type: 'mcq',
            prompt: 'An agent can issue refunds. Where does human approval belong?',
            options: [
              {
                id: 'a',
                text: 'Before the refund tool runs, because the action cannot be undone',
              },
              { id: 'b', text: 'After the refund is sent, as a weekly summary report' },
              { id: 'c', text: 'Before every step, including reading the order status' },
              { id: 'd', text: 'Nowhere: a good system prompt is enough protection' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Approve the risky, irreversible action, not harmless reads. A prompt alone cannot guarantee the agent behaves.',
          },
          {
            key: 'server',
            type: 'mcq',
            prompt: 'In MCP, which part offers the tools, resources and prompts?',
            options: [
              { id: 'a', text: 'The server' },
              { id: 'b', text: 'The host' },
              { id: 'c', text: 'The client' },
              { id: 'd', text: 'The model' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'The host is the AI app, and it holds one client per server. Each server offers its tools, resources and prompts.',
          },
          {
            key: 'frameworks',
            type: 'reasoning',
            prompt:
              'The interviewer asks: *"How do LangChain and LangGraph differ, and when would you use each?"* Answer in four or five sentences.',
            modelAnswer:
              'LangChain gives ready parts for LLM apps, such as prompt templates, model connectors, parsers and retrievers, joined into chains. A chain mostly runs one way, from start to finish.\n\nLangGraph models the app as a graph with nodes, edges and a shared state. So it supports loops, branches, pausing for a person and saved checkpoints. I would use LangChain for a simple pipeline, and LangGraph for agents and multi-step work. The ready-made agent in LangChain itself runs on LangGraph.',
            rubric: [
              'LangChain: ready parts joined into chains',
              'Chains mostly run in one direction',
              'LangGraph: nodes, edges and shared state',
              'Graphs allow loops, branches, pauses and checkpoints',
              'A fitting use for each',
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
      conceptKeys: [TOOLS, FRAMEWORKS, MCP],
      body: {
        layout: 'flip',
        cards: [
          {
            title: 'What LangChain is',
            front: 'What is LangChain, and how is it different from the LLM itself?',
            back: 'LangChain is an open-source framework, not a model. It gives standard parts for LLM apps: prompt templates, model connectors, output parsers, retrievers and tools. You join them into chains, each output feeding the next. Typical uses are chatbots, document question answering with RAG, and extraction pipelines.',
          },
          {
            title: 'LangChain versus LangGraph',
            front:
              'What is the difference between LangChain and LangGraph, and when would you choose LangGraph?',
            back: 'LangChain joins parts into chains that mostly run one way. LangGraph builds a graph: nodes are steps, edges connect them, and a shared state carries the data. So it supports loops, branches, checkpoints and human approval. A travel planner that loops back when over budget needs LangGraph.',
          },
          {
            title: 'Decision logic in LangGraph',
            front:
              'How do you add decision logic in LangGraph, such as a new greeting node in a weather bot?',
            back: 'Add the node with `add_node`. Write a router function that reads the state and returns the next node\'s name. Connect it with `add_conditional_edges`, so "hi" goes to the greet node and everything else to weather. Give each branch an edge to END, and test both paths.',
          },
          {
            title: 'Function calling end to end',
            front: 'Walk me through function calling, end to end.',
            back: 'The app sends the question and a list of tools. Each tool has a name, a description and a JSON schema for its arguments. The model replies with a tool call, not an answer. Code validates the arguments, runs the function and returns the result. The model then answers or calls another tool.',
          },
          {
            title: 'When a tool fails',
            front: 'How does your agent handle a tool that fails?',
            back: 'Code handles it first: a timeout, and a retry for brief errors. If it still fails, the error goes back to the model as the tool result. The model can then try another tool or tell the user. A step limit stops endless loops, and the trace logs every failure.',
          },
          {
            title: 'Agent or fixed workflow',
            front:
              'When would you build an agent instead of a fixed workflow? What makes a project an agent, not a chatbot?',
            back: 'If the steps are known in advance, a fixed workflow is faster, cheaper and easier to test. Use an agent when the next step depends on what the model finds. It is an agent only if the model chooses actions in a loop; a chatbot only replies.',
          },
          {
            title: 'Memory in agents',
            front: 'What types of memory can an agent have, and which are harder to build?',
            back: 'Short-term memory is the chat history or graph state in the context window: easy, but it must be trimmed or summarised. Long-term memory saves facts or past episodes to a database and fetches relevant ones later. That is harder: what to save, when to fetch, how to update stale facts.',
          },
          {
            title: 'MCP in one answer',
            front: 'What is MCP, and what does it standardise?',
            back: 'MCP, the Model Context Protocol, is an open standard for connecting AI apps to tools and data. The host app runs one client per server; each server offers tools, resources and prompts. Messages use JSON-RPC, sent locally or over HTTP. Write a server once, and any MCP app can use it.',
          },
          {
            title: 'LangGraph versus LangSmith',
            front: 'What is the difference between LangGraph and LangSmith?',
            back: 'LangGraph is a library for building the agent: nodes, edges, state and checkpoints. LangSmith is a platform for watching and testing it. It records traces of every prompt, tool call and result, and runs evaluations. Both come from the LangChain team; LangSmith also works without LangChain.',
          },
        ],
      },
    },
    {
      key: 'summary.basic',
      slotKey: 'summary',
      kind: 'SUMMARY',
      title: 'Agents and frameworks: key takeaways',
      depthRank: 1,
      conceptKeys: [TOOLS, FRAMEWORKS, MCP],
      body: {
        takeaways: [
          'An AI agent is an LLM that uses tools in a loop: think, act, observe, repeat.',
          'In tool calling the model writes a request; your app runs the function.',
          'A workflow has fixed steps, in code or a tool such as n8n; an agent lets the model choose each step.',
          'LangChain joins ready parts into chains; LangGraph adds state, loops and branches.',
          'MCP is an open standard plug between AI apps (hosts) and tools (servers).',
          'A multi-agent system has an orchestrator that splits work among specialist agents.',
        ],
        remember: [
          'The model asks, your code acts',
          'Known steps: workflow. Unknown steps: agent',
          'MCP: host, client, server',
        ],
      },
    },
    {
      key: 'summary.advanced',
      slotKey: 'summary',
      kind: 'SUMMARY',
      title: 'Agents and frameworks: key takeaways',
      depthRank: 3,
      conceptKeys: [TOOLS, FRAMEWORKS, MCP],
      body: {
        takeaways: [
          'An agent loops over think, act and observe; tool calling is a request that your app runs.',
          'LangChain builds chains; LangGraph builds graphs with state, loops, pauses and checkpoints.',
          'MCP standardises how hosts reach servers that offer tools, resources and prompts.',
          'Design an agent with a clear scope, few tools, memory, a step limit and human approval.',
          'Every LLM step adds seconds; use plain code for fixed steps.',
          'Debug with traces and test tasks; add retries and fallbacks for tool failures.',
        ],
        remember: [
          'Approve before actions that cannot be undone',
          'Fixed steps in code, judgement in the model',
          'Trace first, then fix',
        ],
      },
    },
  ],
};
