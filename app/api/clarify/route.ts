import OpenAI from "openai";
import agentsData from "@/lib/agents.json";

type QAPair = { question: string; answer: string };

type ClarifyQuestion = {
  question: string;
  reason: string;
  options: string[];
};

const CLARIFICATION_AGENT = agentsData.agents.find(
  (agent) => agent.id === "clarification"
);

function formatHistory(history: QAPair[]): string {
  if (history.length === 0) {
    return "No execution plan has been generated yet — this is the first pass at understanding the request.";
  }
  return history
    .map((qa, index) => `${index + 1}. Q: ${qa.question}\n   A: ${qa.answer}`)
    .join("\n");
}

export async function POST(request: Request) {
  if (!CLARIFICATION_AGENT?.prompt) {
    return Response.json(
      { error: "Clarification agent prompt is not configured." },
      { status: 500 }
    );
  }

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

  const history: QAPair[] = Array.isArray((body as { history?: unknown })?.history)
    ? (body as { history: QAPair[] }).history
    : [];

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

  const systemPrompt = CLARIFICATION_AGENT.prompt
    .replace("{{USER_PROMPT}}", prompt)
    .replace("{{DEPLOY_PLAN}}", formatHistory(history));

  const openai = new OpenAI({ apiKey, timeout: 15_000 });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: "Evaluate the request now and respond with the JSON object only.",
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";

    let parsed: { needsClarification?: boolean; questions?: ClarifyQuestion[] };
    try {
      parsed = JSON.parse(raw);
    } catch (parseError) {
      console.error("Failed to parse clarification response:", parseError, raw);
      parsed = { needsClarification: false, questions: [] };
    }

    return Response.json({
      needsClarification: Boolean(parsed.needsClarification),
      questions: Array.isArray(parsed.questions) ? parsed.questions : [],
    });
  } catch (error) {
    console.error("Clarification request failed:", error);

    return Response.json(
      { error: "Clarification request failed. Check the API key and model access." },
      { status: 500 },
    );
  }
}
