const TAVILY_SEARCH_URL = "https://api.tavily.com/search";
const TAVILY_MAX_RESULTS = 5;
const TAVILY_QUERY_MAX_LENGTH = 380;

export type TavilySource = {
  title?: string;
  url?: string;
  content?: string;
};

export type TavilySearchPayload = {
  answer?: string;
  results?: TavilySource[];
};

export async function tavilySearch(query: string): Promise<TavilySearchPayload | null> {
  const tavilyKey = process.env.TAVILY_KEY;
  if (!tavilyKey) return null;

  try {
    const response = await fetch(TAVILY_SEARCH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: tavilyKey,
        query: query.slice(0, TAVILY_QUERY_MAX_LENGTH),
        search_depth: "advanced",
        include_answer: true,
        max_results: TAVILY_MAX_RESULTS,
      }),
    });

    if (!response.ok) {
      console.error("Tavily search failed:", response.status, await response.text());
      return null;
    }

    return (await response.json()) as TavilySearchPayload;
  } catch (error) {
    console.error("Tavily search request failed:", error);
    return null;
  }
}

export function formatTavilyContext(search: TavilySearchPayload): string {
  const parts: string[] = [];

  if (search.answer) {
    parts.push(`Quick answer: ${search.answer}`);
  }

  const results = search.results ?? [];
  if (results.length > 0) {
    const sources = results
      .map((result, index) => {
        const title = result.title ?? "Untitled source";
        const url = result.url ?? "";
        const snippet = (result.content ?? "").slice(0, 600);
        return `${index + 1}. ${title} (${url})\n${snippet}`;
      })
      .join("\n\n");
    parts.push(`Sources:\n${sources}`);
  }

  return parts.join("\n\n");
}
