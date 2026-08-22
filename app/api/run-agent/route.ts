import OpenAI from "openai";
import agentsData from "@/lib/agents.json";
import { formatTavilyContext, tavilySearch, type TavilySearchPayload } from "@/lib/tavily";

const AGENTS = agentsData.agents;

function isTavilyPayload(value: unknown): value is TavilySearchPayload {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const agentId =
    typeof (body as { agentId?: unknown })?.agentId === "string"
      ? (body as { agentId: string }).agentId
      : "";

  const taskPrompt =
    typeof (body as { prompt?: unknown })?.prompt === "string"
      ? (body as { prompt: string }).prompt
      : "";

  const providedSearchContext = (body as { searchContext?: unknown })?.searchContext;

  const agent = AGENTS.find((candidate) => candidate.id === agentId);

  if (!agent) {
    return Response.json({ error: "Unknown agent." }, { status: 400 });
  }

  if (!taskPrompt.trim()) {
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

  let systemPrompt = `You are ${agent.name}, a ${agent.title}. ${agent.description} Focus only on your specialty (${agent.capabilities.join(", ")}) and produce a concise, high-quality result for the task you are given.

Respond ONLY with a valid JSON object of the exact shape {"output": string, "summary": string, "thoughts": string[]} — no markdown fences, no text outside the JSON.
- "output": your full result, formatted in markdown.
- "summary": a plain-text, one-to-two sentence summary of that result written for a short spoken voiceover — no markdown, no links, no bullet points.
- "thoughts": 3-5 short plain-text phrases (3-6 words each) narrating the progress you made on this task in order, e.g. "Reviewing the brief", "Drafting the core message", "Refining the tone". No markdown, no punctuation at the end.`;
  let userMessage = taskPrompt;

  if (agent.id === "researcher") {
    const search = isTavilyPayload(providedSearchContext)
      ? providedSearchContext
      : await tavilySearch(taskPrompt);

    if (search) {
      const context = formatTavilyContext(search);
      systemPrompt += ` You have been given live web search results below — ground your findings in them rather than relying on prior knowledge, and cite sources by URL where relevant. If the results don't cover something, say so instead of guessing.`;
      userMessage = `${taskPrompt}\n\n---\nWeb search results:\n${context || "No results found."}`;
    } else {
      console.warn(
        "Researcher agent ran without live web search results (missing TAVILY_KEY or Tavily request failed).",
      );
    }
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";

    let parsed: { output?: string; summary?: string; thoughts?: unknown };
    try {
      parsed = JSON.parse(raw);
    } catch (parseError) {
      console.error(`Failed to parse ${agent.name}'s response:`, parseError, raw);
      parsed = {};
    }

    const output = parsed.output ?? raw;
    const summary = parsed.summary ?? "";
    const thoughts = Array.isArray(parsed.thoughts)
      ? parsed.thoughts.filter((thought): thought is string => typeof thought === "string")
      : [];

    return Response.json({ output, summary, thoughts });
  } catch (error) {
    console.error(`${agent.name} agent request failed:`, error);

    return Response.json(
      { error: `${agent.name} failed to complete the task.` },
      { status: 500 },
    );
  }
}
