import { tavilySearch } from "@/lib/tavily";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const query =
    typeof (body as { query?: unknown })?.query === "string"
      ? (body as { query: string }).query
      : "";

  if (!query.trim()) {
    return Response.json({ error: "Query is required." }, { status: 400 });
  }

  if (!process.env.TAVILY_KEY) {
    return Response.json(
      { error: "TAVILY_KEY is missing. Check your .env.local file." },
      { status: 500 },
    );
  }

  const search = await tavilySearch(query);

  if (!search) {
    return Response.json({ error: "Tavily search failed." }, { status: 502 });
  }

  return Response.json(search);
}
