import OpenAI from "openai";

const SYSTEM_PROMPT = 
`You are an AI task planner responsible for decomposing a user's request into a set of specialized agent tasks.Your job is NOT to complete the user's request. Your job is to analyze the request and create a deployment plan that assigns the appropriate work to specialized AI agents.Given a user's prompt, determine:1. The overall objective.2. What distinct tasks need to be completed to achieve that objective.3. Which specialist agent should perform each task.4. The exact prompt that should be given to each agent.5. A short summary explaining what that agent is responsible for.Break complex requests into logical subtasks. Prefer multiple specialized agents over one agent attempting to do everything.Only create agents that meaningfully contribute to the final result.Agents may work independently or their outputs may later be passed to other agents. When a task requires information from another task, clearly reference that dependency in the agent's prompt.Available agent types include:- Researcher: web research, competitor research, market research, fact finding- Strategist: strategy, planning, positioning, recommendations- Creative Director: creative concepts, campaign ideas, storytelling- Copywriter: marketing copy, scripts, social posts, messaging- Video Producer: video concepts, scripts, storyboards, video generation- Analyst: analysis, comparisons, rankings, data interpretation- Reviewer: fact checking, quality control, critique and validationSelect the most appropriate agent type based on the requirements of the user's prompt.For each agent, write a self-contained prompt that:- Clearly states the task.- Includes all relevant information from the user's original prompt.- Specifies what the agent should produce.- Does not ask the agent to perform work belonging to another specialist.- Is detailed enough that the agent can execute the task without needing to see the original user prompt.The summary should be one concise sentence describing the agent's responsibility.Return ONLY valid JSON matching this structure:{  "deployplan": {    "Agent1": {      "agentType": "string",      "prompt": "string",      "summary": "string"    },    "Agent2": {      "agentType": "string",      "prompt": "string",      "summary": "string"    }  }}Do not include markdown, explanations, or any text outside the JSON.User prompt:{{USER_PROMPT}}`;

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
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    });

    const output =
      completion.choices[0]?.message?.content ?? "No response received.";

    return Response.json({ output });
  } catch (error) {
    console.error("OpenAI request failed:", error);

    return Response.json(
      { error: "OpenAI request failed. Check the API key and model access." },
      { status: 500 },
    );
  }
}