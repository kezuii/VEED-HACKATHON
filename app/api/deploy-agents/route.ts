import OpenAI from "openai";

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
        {
          role: "system",
          content:
            "You are an AI systems architect. Turn the user's request into a concise deployment plan for a set of agents.",
        },
        {
          role: "user",
          content: `Create a short deployment plan for this request:\n\n${prompt}`,
        },
      ],
    });

    const output =
      completion.choices[0]?.message?.content ?? "No deployment plan generated.";

    return Response.json({ output });
  } catch (error) {
    console.error("Deploy agents request failed:", error);

    return Response.json(
      { error: "Deployment plan generation failed. Check the API key and model access." },
      { status: 500 },
    );
  }
}
