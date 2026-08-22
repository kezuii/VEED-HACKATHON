import OpenAI from "openai";
import agentsData from "@/lib/agents.json";

type AgentProfile = (typeof agentsData.agents)[number];

type DeployTask = {
  agentType: string;
  prompt: string;
  summary: string;
  dependsOn?: string[];
};

const PLANNER_AGENTS: AgentProfile[] = agentsData.agents.filter(
  (agent) => agent.id !== "clarification",
);

const AGENT_TYPE_LIST = PLANNER_AGENTS.map(
  (agent) => `- ${agent.agentType}: ${agent.capabilities.join(", ")}`,
).join("\n");

function buildSystemPrompt(userPrompt: string): string {
  return `You are an AI task planner responsible for decomposing a user's request into a set of specialized agent tasks.

Your job is NOT to complete the user's request. Your job is to analyze the request and create a deployment plan that assigns the appropriate work to specialized AI agents.

Given a user's prompt, determine:
1. The overall objective.
2. What distinct tasks need to be completed to achieve that objective.
3. Which specialist agent should perform each task.
4. The exact prompt that should be given to each agent.
5. A short summary explaining what that agent is responsible for.

Break complex requests into logical subtasks. Prefer multiple specialized agents over one agent attempting to do everything.
Only include agents that meaningfully contribute to the final result — leave out any agent type whose capabilities are not needed for this specific request.

Agents may work independently or their outputs may later be passed to other agents:
- If a task needs no information from any other task, set "dependsOn" to an empty array. That agent can start immediately, in parallel with the others.
- If a task genuinely needs another task's output first (e.g. a copywriter using a researcher's findings), list that task's key (e.g. "Agent1") in "dependsOn", and embed a "{{Agent1.output}}" placeholder in the prompt text at the exact point where that upstream output should be inserted. Use the literal task key from this plan, not the agent type name.
- Only add a dependency when the task truly cannot proceed without the other task's result. Do not chain agents together unnecessarily — most tasks should have an empty "dependsOn".
- Dependencies must not form a cycle.

Available agent types:
${AGENT_TYPE_LIST}

Select only the agent types that are actually relevant to this request based on the capabilities listed above.

For each agent, write a self-contained prompt that:
- Clearly states the task.
- Includes all relevant information from the user's original prompt.
- Specifies what the agent should produce.
- Does not ask the agent to perform work belonging to another specialist.
- Is detailed enough that the agent can execute the task without needing to see the original user prompt (aside from any "{{AgentKey.output}}" placeholders for declared dependencies).

The summary should be one concise sentence describing the agent's responsibility.

Return ONLY valid JSON matching this structure:
{
  "deployplan": {
    "Agent1": {
      "agentType": "string",
      "prompt": "string",
      "summary": "string",
      "dependsOn": []
    },
    "Agent2": {
      "agentType": "string",
      "prompt": "string with a {{Agent1.output}} placeholder if it depends on Agent1",
      "summary": "string",
      "dependsOn": ["Agent1"]
    }
  }
}

Do not include markdown, explanations, or any text outside the JSON.

User prompt:
${userPrompt}`;
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const prompt =
    typeof (body as { prompt?: unknown })?.prompt === "string"
      ? (body as { prompt: string }).prompt
      : "";

  if (!prompt.trim()) {
    return Response.json({ error: "Prompt is required." }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "OPENAI_API_KEY is missing. Check your .env.local file." },
      { status: 500 },
    );
  }

  const openai = new OpenAI({ apiKey });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt(prompt) },
        {
          role: "user",
          content: "Create the deployment plan now and respond with the JSON object only.",
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";

    let parsed: { deployplan?: Record<string, DeployTask> };
    try {
      parsed = JSON.parse(raw);
    } catch (parseError) {
      console.error("Failed to parse deploy plan:", parseError, raw);
      return Response.json(
        { error: "Failed to parse the deployment plan returned by the model." },
        { status: 502 },
      );
    }

    const deployplan = parsed.deployplan ?? {};

    const deployPlan = Object.fromEntries(
      Object.entries(deployplan).map(([key, task]) => {
        const agentId = PLANNER_AGENTS.find(
          (agent) => agent.agentType.toLowerCase() === task.agentType?.toLowerCase(),
        )?.id;
        return [key, { ...task, agentId }];
      }),
    );

    return Response.json({ deployPlan });
  } catch (error) {
    console.error("OpenAI request failed:", error);

    return Response.json(
      { error: "OpenAI request failed. Check the API key and model access." },
      { status: 500 },
    );
  }
}
