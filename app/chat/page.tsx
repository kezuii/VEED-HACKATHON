"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import type {
  FormEvent,
  KeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import agentsData from "@/lib/agents.json";

const MARKDOWN_COMPONENTS: Components = {
  h1: ({ children }) => (
    <h1 className="mb-2 mt-3 text-base font-semibold text-zinc-900 first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-3 text-sm font-semibold text-zinc-900 first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1.5 mt-3 text-sm font-semibold text-zinc-900 first:mt-0">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="mb-2 text-sm leading-relaxed text-zinc-700 last:mb-0">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-zinc-700 last:mb-0">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-zinc-700 last:mb-0">
      {children}
    </ol>
  ),
  li: ({ children }) => <li>{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-zinc-900">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-blue-600 underline underline-offset-2"
    >
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs text-zinc-800">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="mb-2 overflow-x-auto rounded-lg bg-zinc-900 p-3 text-xs text-zinc-100 last:mb-0">
      {children}
    </pre>
  ),
  hr: () => <hr className="my-3 border-zinc-200" />,
  table: ({ children }) => (
    <div className="mb-2 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-zinc-200 bg-zinc-50 px-2 py-1 text-left font-semibold text-zinc-900">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="border border-zinc-200 px-2 py-1 text-zinc-700">{children}</td>,
};

const AGENT_ICON_URL =
  "https://res.cloudinary.com/gneddeqr/image/upload/v1787403068/Group_9.png";

const AGENT_AVATAR: Record<string, string> = {
  strategist: "/images/Ava.png",
  copywriter: "/images/Beau.png",
  "video-producer": "/images/Cleo.png",
  researcher: "/images/Dex.png",
  "creative-director": "/images/Elle.png",
  reviewer: "/images/Finn.png",
  analyst: "/images/Nia.png",
  clarification: "/images/Quinn.png",
};

type TavilySource = {
  title?: string;
  url?: string;
  content?: string;
};

type TavilySearchPayload = {
  answer?: string;
  results?: TavilySource[];
};

type VideoStatus = "idle" | "generating" | "done" | "error";

type ThinkingAgent = {
  id: string;
  taskKey: string;
  agentId: string;
  agentType: string;
  taskPrompt: string;
  summary: string;
  status: string;
  output: string | null;
  error: string | null;
  dependsOn: string[];
  searching: boolean;
  searchSources: TavilySource[] | null;
  resultSummary: string | null;
  thoughts: string[] | null;
  videoStatus: VideoStatus;
  videoUrl: string | null;
};

type DeployTask = {
  agentType: string;
  prompt: string;
  summary: string;
  agentId?: string;
  dependsOn?: string[];
};

type SidebarAgent = {
  id: string;
  bg: string;
};

type AgentProfile = {
  id: string;
  name: string;
  agentType: string;
  title: string;
  summary: string;
  description: string;
  capabilities: string[];
  prompt: string | null;
  avatarBg: string;
};

type AgentInfo = {
  name: string;
  title: string;
  description: string;
  capabilities: string[];
};

type QAPair = {
  question: string;
  answer: string;
};

type ClarifyQuestion = {
  question: string;
  reason?: string;
  options?: string[];
};

const AGENTS: AgentProfile[] = agentsData.agents;

const AGENT_INFO: Record<string, AgentInfo> = Object.fromEntries(
  AGENTS.map((agent) => [
    agent.id,
    {
      name: agent.name,
      title: agent.title,
      description: agent.description,
      capabilities: agent.capabilities,
    },
  ])
);

const AGENT_BG: Record<string, string> = Object.fromEntries(
  AGENTS.map((agent) => [agent.id, agent.avatarBg])
);

const MAX_CLARIFICATION_QUESTIONS = 2;
const CLARIFY_TIMEOUT_MS = 15_000;
const CLARIFY_MAX_ATTEMPTS = 3;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchClarifyWithRetry(
  prompt: string,
  history: QAPair[]
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= CLARIFY_MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CLARIFY_TIMEOUT_MS);
    try {
      const response = await fetch("/api/clarify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, history }),
        signal: controller.signal,
      });
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < CLARIFY_MAX_ATTEMPTS) {
        await sleep(500 * attempt);
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

const STATUS_BY_AGENT_TYPE: Record<string, string> = {
  Strategist: "Strategizing...",
  Copywriter: "Writing...",
  "Video Producer": "Producing...",
  Researcher: "Researching...",
  "Creative Director": "Ideating...",
  Reviewer: "Reviewing...",
  Analyst: "Analyzing...",
};

type RelevantTask = DeployTask & { agentId: string };

// Drops dependsOn entries pointing at unknown/self keys, then breaks any
// dependency cycles (via Kahn's algorithm) by clearing deps for whatever
// remains unresolved, so a malformed plan can never deadlock the scheduler.
function sanitizeDependencies(
  tasks: Record<string, RelevantTask>
): Record<string, string[]> {
  const keys = Object.keys(tasks);
  const keySet = new Set(keys);
  const deps: Record<string, string[]> = {};
  for (const key of keys) {
    const raw = tasks[key].dependsOn ?? [];
    deps[key] = Array.from(new Set(raw.filter((dep) => keySet.has(dep) && dep !== key)));
  }

  const dependents: Record<string, string[]> = Object.fromEntries(keys.map((key) => [key, []]));
  const inDegree: Record<string, number> = {};
  for (const key of keys) {
    inDegree[key] = deps[key].length;
    for (const dep of deps[key]) dependents[dep].push(key);
  }

  const queue = keys.filter((key) => inDegree[key] === 0);
  const visited = new Set<string>();
  while (queue.length > 0) {
    const key = queue.shift() as string;
    visited.add(key);
    for (const dependent of dependents[key]) {
      inDegree[dependent] -= 1;
      if (inDegree[dependent] === 0) queue.push(dependent);
    }
  }

  for (const key of keys) {
    if (!visited.has(key)) {
      console.warn(`Deploy plan dependency cycle detected — clearing dependencies for "${key}".`);
      deps[key] = [];
    }
  }

  return deps;
}

function waitingStatus(dependsOn: string[], tasks: Record<string, RelevantTask>): string {
  const names = dependsOn
    .map((key) => AGENT_INFO[tasks[key]?.agentId ?? ""]?.name)
    .filter((name): name is string => Boolean(name));
  return names.length > 0 ? `Waiting for ${names.join(", ")}...` : "Waiting...";
}

function substitutePlaceholders(prompt: string, outputs: Map<string, string>): string {
  return prompt.replace(/\{\{(\w+)\.output\}\}/g, (match, key: string) => outputs.get(key) ?? match);
}

const SIDEBAR_AGENTS_IDLE: SidebarAgent[] = AGENTS.map((agent) => ({
  id: agent.id,
  bg: "bg-zinc-200",
}));

const SIDEBAR_AGENTS_DEPLOYED: SidebarAgent[] = AGENTS.map((agent) => ({
  id: agent.id,
  bg: agent.avatarBg,
}));

const NODE_WIDTH = 150;
const SEARCH_CARD_WIDTH = 260;
const SUMMARY_CARD_WIDTH = 280;
const VIDEO_CARD_WIDTH = 320;

function getHostname(url?: string): string {
  if (!url) return "source";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function AgentIcon({ agentId, dim = false }: { agentId?: string; dim?: boolean }) {
  const src = (agentId && AGENT_AVATAR[agentId]) || AGENT_ICON_URL;
  return (
    <div className={`relative h-full w-full ${dim ? "" : ""}`}>
      <img
        src={src}
        alt={agentId ? (AGENT_INFO[agentId]?.name ?? "Agent") : "Agent"}
        sizes="48px"
        className="object-cover"
      />
    </div>
  );
}

function ClarificationConnector() {
  return <div className="h-8 w-px bg-zinc-400" />;
}

const THOUGHTS_CYCLE_MS = 2200;

function ThoughtsCycler({ thoughts }: { thoughts: string[] }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (thoughts.length <= 1) return;
    const interval = setInterval(() => {
      setVisible(false);
      const swapTimer = setTimeout(() => {
        setIndex((prev) => (prev + 1) % thoughts.length);
        setVisible(true);
      }, 200);
      return () => clearTimeout(swapTimer);
    }, THOUGHTS_CYCLE_MS);
    return () => clearInterval(interval);
  }, [thoughts.length]);

  const current = thoughts[Math.min(index, thoughts.length - 1)] ?? "";

  return (
    <p
      className={`mt-1.5 text-sm leading-relaxed text-zinc-600 transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {current}
    </p>
  );
}

function ClarificationQuestionCard({
  question,
  options,
  value,
  onChange,
  onSubmit,
  onSelectOption,
  loading,
  onExpandAgent,
}: {
  question: string;
  options?: string[];
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onSelectOption: (option: string) => void;
  loading: boolean;
  onExpandAgent: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onExpandAgent}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onExpandAgent();
        }
      }}
      aria-label="View Quinn details"
      className="relative z-10 w-full max-w-md cursor-pointer rounded-2xl bg-white p-5 shadow-lg transition-shadow hover:shadow-xl"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-full bg-zinc-100">
          <AgentIcon agentId="clarification" />
        </span>
        <p className="text-sm font-medium text-zinc-900">{question}</p>
      </div>
      {options && options.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              disabled={loading}
              onClick={(event) => {
                event.stopPropagation();
                onSelectOption(option);
              }}
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-700 outline-none transition-colors hover:border-zinc-400 hover:bg-zinc-100 disabled:opacity-50"
            >
              {option}
            </button>
          ))}
        </div>
      )}
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onSubmit();
          }
        }}
        disabled={loading}
        autoFocus
        placeholder="Answer here"
        className="mt-4 w-full rounded-full border border-zinc-300 px-4 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 disabled:opacity-50"
      />
    </div>
  );
}

function ClarificationAnsweredCard({
  question,
  answer,
  onExpandAgent,
}: {
  question: string;
  answer: string;
  onExpandAgent: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onExpandAgent}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onExpandAgent();
        }
      }}
      aria-label="View Quinn details"
      className="relative z-10 w-full max-w-md cursor-pointer rounded-2xl bg-white p-5 shadow-lg transition-shadow hover:shadow-xl"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-full bg-zinc-100">
          <AgentIcon agentId="clarification" />
        </span>
        <p className="text-sm font-medium text-zinc-900">{question}</p>
      </div>
      <p className="mt-4 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-600">
        {answer}
      </p>
    </div>
  );
}

export default function TestPage() {
  const [prompt, setPrompt] = useState("");
  const [submittedPrompt, setSubmittedPrompt] = useState<string | null>(null);
  const [thinkingAgents, setThinkingAgents] = useState<ThinkingAgent[]>([]);
  const [visibleAgents, setVisibleAgents] = useState<boolean[]>([]);
  const [paths, setPaths] = useState<string[]>([]);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedOutputTaskKey, setSelectedOutputTaskKey] = useState<string | null>(null);
  const [treeMaxWidth, setTreeMaxWidth] = useState(900);
  const [qaHistory, setQaHistory] = useState<QAPair[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<ClarifyQuestion | null>(null);
  const [answerDraft, setAnswerDraft] = useState("");
  const [clarifyLoading, setClarifyLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const lastQaCardRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const originalPromptRef = useRef("");

  function computePaths() {
    const container = containerRef.current;
    const source = lastQaCardRef.current ?? bubbleRef.current;
    if (!container || !source) return;
    const containerRect = container.getBoundingClientRect();
    const sourceRect = source.getBoundingClientRect();
    const sourceX = sourceRect.left - containerRect.left + sourceRect.width / 2;
    const sourceY = sourceRect.bottom - containerRect.top;

    const next = nodeRefs.current.map((node) => {
      if (!node) return "";
      const rect = node.getBoundingClientRect();
      const targetX = rect.left - containerRect.left + rect.width / 2;
      const targetY = rect.top - containerRect.top;
      const bendY = sourceY + (targetY - sourceY) * 0.6;
      return `M ${sourceX} ${sourceY} C ${sourceX} ${bendY} ${targetX} ${bendY} ${targetX} ${targetY}`;
    });
    setPaths(next);
  }

  useEffect(() => {
    if (!submittedPrompt || thinkingAgents.length === 0) return;

    const timers = thinkingAgents.map((_, index) =>
      setTimeout(() => {
        setVisibleAgents((prev) => {
          const next = [...prev];
          next[index] = true;
          return next;
        });
      }, index * 150)
    );

    return () => timers.forEach(clearTimeout);
  }, [submittedPrompt, thinkingAgents]);

  useLayoutEffect(() => {
    if (!submittedPrompt) {
      setPaths([]);
      return;
    }
    computePaths();
  }, [submittedPrompt, thinkingAgents, visibleAgents, qaHistory, treeMaxWidth]);

  useEffect(() => {
    if (!submittedPrompt) return;
    function handleResize() {
      computePaths();
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [submittedPrompt]);

  // Reserve room for the fixed side panels so wrapped result cards never sit
  // underneath them or spill past the edge of the viewport.
  useEffect(() => {
    function updateTreeMaxWidth() {
      const RIGHT_SIDEBAR_RESERVE = 60 * 4 + 32 + 32; // sidebar width + offset + breathing room
      const LEFT_SIDEBAR_RESERVE =
        selectedAgentId || selectedOutputTaskKey ? 72 * 4 + 32 + 32 : 0;
      const CANVAS_PADDING = 96;
      const next =
        window.innerWidth - RIGHT_SIDEBAR_RESERVE - LEFT_SIDEBAR_RESERVE - CANVAS_PADDING;
      setTreeMaxWidth(Math.max(360, next));
    }
    updateTreeMaxWidth();
    window.addEventListener("resize", updateTreeMaxWidth);
    return () => window.removeEventListener("resize", updateTreeMaxWidth);
  }, [selectedAgentId, selectedOutputTaskKey]);

  function handleAgentSelect(id: string) {
    setSelectedOutputTaskKey(null);
    setSelectedAgentId((prev) => (prev === id ? null : id));
  }

  function handleOutputSelect(taskKey: string) {
    setSelectedAgentId(null);
    setSelectedOutputTaskKey((prev) => (prev === taskKey ? null : taskKey));
  }

  useEffect(() => {
    if (!selectedAgentId && !selectedOutputTaskKey) return;

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedAgentId(null);
        setSelectedOutputTaskKey(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedAgentId, selectedOutputTaskKey]);

  useEffect(() => {
    setSelectedAgentId(null);
    setSelectedOutputTaskKey(null);
  }, [submittedPrompt]);

  async function runClarification(history: QAPair[]) {
    if (history.length >= MAX_CLARIFICATION_QUESTIONS) {
      void finalizePrompt(history);
      return;
    }
    setClarifyLoading(true);
    try {
      const response = await fetchClarifyWithRetry(originalPromptRef.current, history);
      const data = await response.json();
      if (data?.needsClarification && Array.isArray(data.questions) && data.questions.length > 0) {
        setCurrentQuestion(data.questions[0]);
      } else {
        void finalizePrompt(history);
      }
    } catch (error) {
      console.error("Clarification request failed:", error);
      void finalizePrompt(history);
    } finally {
      setClarifyLoading(false);
    }
  }

  async function runAgentTask(
    agent: ThinkingAgent,
    onSettled?: (result: { ok: boolean; output: string }) => void
  ) {
    let searchContext: TavilySearchPayload | null = null;

    if (agent.agentId === "researcher") {
      setThinkingAgents((prev) =>
        prev.map((item) =>
          item.taskKey === agent.taskKey
            ? { ...item, status: "Searching the web...", searching: true }
            : item
        )
      );

      try {
        const searchResponse = await fetch("/api/tavily-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: agent.taskPrompt }),
        });
        const searchData = await searchResponse.json();

        if (searchResponse.ok) {
          searchContext = searchData as TavilySearchPayload;
          const sources = Array.isArray(searchData.results) ? searchData.results : [];
          setThinkingAgents((prev) =>
            prev.map((item) =>
              item.taskKey === agent.taskKey
                ? {
                    ...item,
                    searchSources: sources,
                    status:
                      sources.length > 0
                        ? `Searching ${sources.length} source${sources.length === 1 ? "" : "s"}`
                        : "Searching the web...",
                  }
                : item
            )
          );
        } else {
          console.error("Tavily search failed:", searchData?.error ?? searchData);
        }
      } catch (error) {
        console.error("Tavily search request failed:", error);
      }
    }

    try {
      const response = await fetch("/api/run-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: agent.agentId, prompt: agent.taskPrompt, searchContext }),
      });
      const data = await response.json();
      const output = response.ok ? data.output ?? "" : "";
      const resultSummary = response.ok ? (data.summary ?? "").trim() || null : null;
      const thoughts =
        response.ok && Array.isArray(data.thoughts)
          ? data.thoughts.filter((thought: unknown): thought is string => typeof thought === "string")
          : null;

      setThinkingAgents((prev) =>
        prev.map((item) =>
          item.taskKey === agent.taskKey
            ? response.ok
              ? {
                  ...item,
                  status: "Done",
                  output,
                  error: null,
                  searching: false,
                  resultSummary,
                  thoughts: thoughts && thoughts.length > 0 ? thoughts : null,
                  videoStatus: resultSummary ? "generating" : "idle",
                }
              : {
                  ...item,
                  status: "Error",
                  output: null,
                  error: data.error ?? "Agent failed.",
                  searching: false,
                }
            : item
        )
      );
      onSettled?.({ ok: response.ok, output });

      if (response.ok && resultSummary) {
        void generateAgentVideo(agent.taskKey, agent.agentId, resultSummary);
      }
    } catch (error) {
      console.error(`Agent ${agent.agentId} failed:`, error);
      setThinkingAgents((prev) =>
        prev.map((item) =>
          item.taskKey === agent.taskKey
            ? { ...item, status: "Error", output: null, error: "Request failed.", searching: false }
            : item
        )
      );
      onSettled?.({ ok: false, output: "" });
    }
  }

  async function generateAgentVideo(taskKey: string, agentId: string, script: string) {
    try {
      const response = await fetch("/api/agent-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, script }),
      });
      const data = await response.json();

      setThinkingAgents((prev) =>
        prev.map((item) =>
          item.taskKey === taskKey
            ? response.ok && data.videoUrl
              ? { ...item, videoStatus: "done", videoUrl: data.videoUrl }
              : { ...item, videoStatus: "error", videoUrl: null }
            : item
        )
      );
    } catch (error) {
      console.error(`Avatar video generation failed for ${agentId}:`, error);
      setThinkingAgents((prev) =>
        prev.map((item) =>
          item.taskKey === taskKey ? { ...item, videoStatus: "error", videoUrl: null } : item
        )
      );
    }
  }

  // DAG scheduler: launches every agent with no unmet dependencies right away;
  // agents that declare a dependency wait until their upstream agent(s) finish,
  // then have "{{AgentKey.output}}" placeholders in their prompt replaced with
  // the real output before they run. An upstream failure marks all (transitive)
  // dependents as skipped rather than leaving them waiting forever.
  function runDeploymentGraph(agents: ThinkingAgent[]) {
    const outputs = new Map<string, string>();
    const failed = new Set<string>();
    const launched = new Set<string>();

    function dependentsOf(key: string) {
      return agents.filter((agent) => agent.dependsOn.includes(key));
    }

    function tryLaunch(agent: ThinkingAgent) {
      if (launched.has(agent.taskKey)) return;

      if (agent.dependsOn.some((dep) => failed.has(dep))) {
        launched.add(agent.taskKey);
        failed.add(agent.taskKey);
        setThinkingAgents((prev) =>
          prev.map((item) =>
            item.taskKey === agent.taskKey
              ? { ...item, status: "Error", output: null, error: "Skipped: an upstream agent failed." }
              : item
          )
        );
        dependentsOf(agent.taskKey).forEach(tryLaunch);
        return;
      }

      if (!agent.dependsOn.every((dep) => outputs.has(dep))) return;

      launched.add(agent.taskKey);
      const resolvedPrompt = substitutePlaceholders(agent.taskPrompt, outputs);
      const runningStatus = STATUS_BY_AGENT_TYPE[agent.agentType] ?? "Working...";
      setThinkingAgents((prev) =>
        prev.map((item) => (item.taskKey === agent.taskKey ? { ...item, status: runningStatus } : item))
      );

      void runAgentTask({ ...agent, taskPrompt: resolvedPrompt }, (result) => {
        if (result.ok) {
          outputs.set(agent.taskKey, result.output);
        } else {
          failed.add(agent.taskKey);
        }
        dependentsOf(agent.taskKey).forEach(tryLaunch);
      });
    }

    agents.forEach(tryLaunch);
  }

  async function finalizePrompt(history: QAPair[]) {
    const finalPromptText =
      history.length === 0
        ? originalPromptRef.current
        : `${originalPromptRef.current}\n\nAdditional details:\n${history
            .map((qa) => `- ${qa.question} ${qa.answer}`)
            .join("\n")}`;

    console.log("Final clarified prompt:", finalPromptText);

    try {
      const response = await fetch("/api/initial-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: finalPromptText }),
      });
      const data = await response.json();

      if (!response.ok || !data?.deployPlan) {
        console.error("Deploy plan request failed:", data?.error ?? data);
        setThinkingAgents([]);
        setVisibleAgents([]);
        return;
      }

      const deployPlan = data.deployPlan as Record<string, DeployTask>;
      console.log("Deploy plan:", deployPlan);

      const relevantEntries = Object.entries(deployPlan).filter(
        (entry): entry is [string, RelevantTask] => Boolean(entry[1].agentId)
      );
      const tasksByKey: Record<string, RelevantTask> = Object.fromEntries(relevantEntries);
      const depsByKey = sanitizeDependencies(tasksByKey);

      const agents: ThinkingAgent[] = relevantEntries.map(([key, task]) => {
        const dependsOn = depsByKey[key];
        return {
          id: key,
          taskKey: key,
          agentId: task.agentId,
          agentType: task.agentType,
          taskPrompt: task.prompt,
          summary: task.summary,
          status:
            dependsOn.length > 0
              ? waitingStatus(dependsOn, tasksByKey)
              : STATUS_BY_AGENT_TYPE[task.agentType] ?? "Working...",
          output: null,
          error: null,
          dependsOn,
          searching: false,
          searchSources: null,
          resultSummary: null,
          thoughts: null,
          videoStatus: "idle",
          videoUrl: null,
        };
      });

      setThinkingAgents(agents);
      setVisibleAgents(agents.map(() => false));

      runDeploymentGraph(agents);
    } catch (error) {
      console.error("Deploy plan request failed:", error);
      setThinkingAgents([]);
      setVisibleAgents([]);
    }
  }

  function submitAnswer(directAnswer?: string) {
    if (!currentQuestion) return;
    const answer = (directAnswer ?? answerDraft).trim();
    if (!answer) return;

    const nextHistory = [...qaHistory, { question: currentQuestion.question, answer }];
    setQaHistory(nextHistory);
    setCurrentQuestion(null);
    setAnswerDraft("");
    void runClarification(nextHistory);
  }

  function submitPrompt() {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    originalPromptRef.current = trimmed;
    lastQaCardRef.current = null;
    setQaHistory([]);
    setCurrentQuestion(null);
    setAnswerDraft("");
    setThinkingAgents([]);
    setVisibleAgents([]);
    setSubmittedPrompt(trimmed);
    void runClarification([]);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitPrompt();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitPrompt();
    }
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest('textarea, button, input, [role="button"]')) return;
    setIsDragging(true);
    panStartRef.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isDragging) return;
    const dx = event.clientX - panStartRef.current.x;
    const dy = event.clientY - panStartRef.current.y;
    setPan({ x: panStartRef.current.panX + dx, y: panStartRef.current.panY + dy });
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  const isSubmitted = submittedPrompt !== null;
  const sidebarAgents = isSubmitted ? SIDEBAR_AGENTS_DEPLOYED : SIDEBAR_AGENTS_IDLE;

  nodeRefs.current = [];

  return (
    <div
      className="relative h-[100vh] w-full overflow-hidden"
      style={{
        backgroundColor: "#f2f2f3",
        backgroundImage:
          "linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
      }}
    >
      {/* Floating sidebar */}
      <aside className="absolute bottom-8 right-8 top-8 z-10 w-60 rounded-3xl bg-white p-6 shadow-lg">
        <p className="text-lg font-semibold text-zinc-900">Agents:</p>
        <div className="mt-4 grid grid-cols-3 gap-x-4 gap-y-5">
          {sidebarAgents.map((agent) => (
            <div key={agent.id} className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleAgentSelect(agent.id)}
                aria-label={`View ${AGENT_INFO[agent.id]?.name ?? agent.id} details`}
                aria-expanded={selectedAgentId === agent.id}
                className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl transition-colors duration-300 ${agent.bg} ring-offset-2 hover:ring-2 hover:ring-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                  selectedAgentId === agent.id ? "ring-2 ring-zinc-400" : ""
                }`}
              >
                <AgentIcon agentId={agent.id} dim={!isSubmitted} />
              </button>
              <span className="text-xs text-zinc-700">
                {AGENT_INFO[agent.id]?.name ?? agent.id}
              </span>
            </div>
          ))}
        </div>
      </aside>

      {/* Agent output sidebar */}
      {selectedOutputTaskKey &&
        (() => {
          const agent = thinkingAgents.find((item) => item.taskKey === selectedOutputTaskKey);
          const info = agent ? AGENT_INFO[agent.agentId] : undefined;
          if (!agent || !info || agent.output === null) return null;
          return (
            <aside
              role="dialog"
              aria-label={`${info.name} full result`}
              className="absolute bottom-8 left-8 top-8 z-10 flex w-96 flex-col overflow-hidden rounded-3xl bg-white shadow-lg"
            >
              <div className="flex flex-none items-center justify-between gap-2 border-b border-zinc-100 px-6 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`flex h-10 w-10 flex-none items-center justify-center overflow-hidden rounded-full ${
                      AGENT_BG[agent.agentId] ?? "bg-zinc-100"
                    }`}
                  >
                    <AgentIcon agentId={agent.agentId} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-zinc-900">{info.name}</p>
                    <p className="truncate text-sm text-zinc-500">{info.title}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOutputTaskKey(null)}
                  aria-label="Close full result"
                  className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                    <path
                      d="M6 6l12 12M18 6L6 18"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
                  {agent.output}
                </ReactMarkdown>
              </div>
            </aside>
          );
        })()}

      {/* Agent detail sidebar */}
      {selectedAgentId &&
        (() => {
          const info = AGENT_INFO[selectedAgentId];
          if (!info) return null;
          return (
            <aside
              role="dialog"
              aria-label={`${info.name} details`}
              className="absolute bottom-8 left-8 top-8 z-10 w-72 overflow-y-auto rounded-3xl bg-white p-6 shadow-lg"
            >
              <div className="flex items-start justify-between gap-2">
                <div/>
                <button
                  type="button"
                  onClick={() => setSelectedAgentId(null)}
                  aria-label="Close agent details"
                  className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                    <path
                      d="M6 6l12 12M18 6L6 18"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="flex w-[50%] aspect-[1] flex-none items-center justify-center overflow-hidden rounded-4xl ring-2 ring-zinc-300 ring-offset-2 ring-offset-white bg-zinc-100">
                  <AgentIcon agentId={selectedAgentId} />
                </div>
                <div className="min-w-0 text-center">
                  <p className="truncate text-xl font-semibold text-zinc-900">
                    {info.name}
                  </p>
                  <p className="truncate text-base text-zinc-500">{info.title}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-zinc-600">
                {info.description}
              </p>
              {info.capabilities.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {info.capabilities.map((capability) => (
                    <span
                      key={capability}
                      className="rounded-full bg-zinc-100 px-2.5 py-1 text-sm leading-none text-zinc-600"
                    >
                      {capability}
                    </span>
                  ))}
                </div>
              )}
            </aside>
          );
        })()}

      {/* Canvas content */}
      <div
        className={`relative z-0 flex h-full w-full select-none flex-col items-center px-6 ${
          isSubmitted ? "justify-start pt-20 pb-20" : "justify-center"
        }`}
        style={{ cursor: isDragging ? "grabbing" : "grab", touchAction: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          className="flex flex-col w-full items-center"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
        >
        {!isSubmitted ? (
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-[0_0_14px_0_rgba(0,0,0,0.05)]"
          >
            <label
              htmlFor="prompt"
              className="block text-sm font-medium text-zinc-900"
            >
              Prompt:
            </label>
            <div className="relative mt-3">
              <textarea
                id="prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={handleKeyDown}
                rows={3}
                placeholder="Type a prompt..."
                className="w-full resize-none rounded-2xl bg-zinc-100 px-4 py-3 pr-12 text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
              />
              <button
                type="submit"
                disabled={!prompt.trim()}
                aria-label="Send prompt"
                className="absolute bottom-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-white transition-opacity hover:bg-zinc-700 disabled:opacity-30"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </form>
        ) : (
          <div ref={containerRef} className="relative flex flex-col items-center">
            <svg
              className="pointer-events-none absolute inset-0 z-0 overflow-visible"
              width="100%"
              height="100%"
            >
              {paths.map((d, index) => (
                <path
                  key={thinkingAgents[index]?.id ?? index}
                  d={d}
                  fill="none"
                  stroke="#000"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  className="transition-opacity duration-300"
                  style={{ opacity: visibleAgents[index] ? 0.6 : 0 }}
                />
              ))}
            </svg>

            {/* Prompt bubble */}
            <div
              ref={bubbleRef}
              className="relative z-10 max-w-md rounded-2xl bg-white px-6 py-4 text-center text-sm text-zinc-900 shadow-lg"
            >
              {submittedPrompt}
            </div>

            {/* Clarification stack */}
            {(currentQuestion || qaHistory.length > 0) && (
              <div className="flex flex-col items-center">
                {qaHistory.map((qa, index) => (
                  <div
                    key={index}
                    ref={(el) => {
                      if (index === qaHistory.length - 1) lastQaCardRef.current = el;
                    }}
                    className="flex flex-col items-center"
                  >
                    <ClarificationConnector />
                    <ClarificationAnsweredCard
                      question={qa.question}
                      answer={qa.answer}
                      onExpandAgent={() => handleAgentSelect("clarification")}
                    />
                  </div>
                ))}
                {currentQuestion && (
                  <div className="flex flex-col items-center">
                    <ClarificationConnector />
                    <ClarificationQuestionCard
                      question={currentQuestion.question}
                      options={currentQuestion.options}
                      value={answerDraft}
                      onChange={setAnswerDraft}
                      onSubmit={() => submitAnswer()}
                      onSelectOption={(option) => submitAnswer(option)}
                      loading={clarifyLoading}
                      onExpandAgent={() => handleAgentSelect("clarification")}
                    />
                  </div>
                )}
              </div>
            )}

            {clarifyLoading && !currentQuestion && (
              <div className="mt-6 flex items-center gap-2 text-xs text-zinc-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400" />
                Quinn is reviewing your request…
              </div>
            )}

            {/* Row of thinking agents */}
            {thinkingAgents.length > 0 && (
              <div
                className="mx-auto mt-12 flex flex-wrap items-start justify-center gap-x-8 gap-y-10"
                style={{ maxWidth: treeMaxWidth }}
              >
                {thinkingAgents.map((agent, index) => {
                  const info = AGENT_INFO[agent.agentId];
                  const hasSearchBubble =
                    agent.searching || (agent.searchSources?.length ?? 0) > 0;
                  const hasVideoBubble = agent.videoStatus === "done" && Boolean(agent.videoUrl);
                  const columnWidth = hasVideoBubble
                    ? VIDEO_CARD_WIDTH
                    : agent.resultSummary !== null
                      ? SUMMARY_CARD_WIDTH
                      : hasSearchBubble
                        ? SEARCH_CARD_WIDTH
                        : NODE_WIDTH;
                  return (
                    <div
                      key={agent.id}
                      className="flex flex-shrink-0 flex-col items-center transition-[width] duration-300"
                      style={{ width: columnWidth }}
                    >
                      <div
                        ref={(el) => {
                          nodeRefs.current[index] = el;
                        }}
                        className={`relative z-10 transition-all duration-300 ${
                          visibleAgents[index]
                            ? "translate-y-0 opacity-100"
                            : "-translate-y-2 opacity-0"
                        }`}
                        style={{ width: NODE_WIDTH }}
                      >
                        <button
                          type="button"
                          onClick={() => handleAgentSelect(agent.agentId)}
                          aria-label={`View ${info?.name ?? agent.agentId} details`}
                          aria-expanded={selectedAgentId === agent.agentId}
                          className={`flex w-full items-center gap-2 rounded-2xl bg-white px-3 py-2.5 shadow-lg transition-shadow hover:shadow-xl ${
                            selectedAgentId === agent.agentId ? "ring-2 ring-zinc-400" : ""
                          }`}
                        >
                          <span
                            className={`flex h-8 w-8 flex-none items-center justify-center rounded-full ${
                              agent.output === null && agent.error === null ? "animate-pulse" : ""
                            } ${AGENT_BG[agent.agentId] ?? "bg-zinc-100"}`}
                          >
                            <AgentIcon agentId={agent.agentId} />
                          </span>
                          <span
                            className={`truncate text-sm ${
                              agent.error ? "text-red-600" : "text-zinc-700"
                            }`}
                          >
                            {agent.status}
                          </span>
                        </button>
                      </div>

                      {hasSearchBubble && (
                        <>
                          <ClarificationConnector />
                          <div className="relative z-10 w-full rounded-2xl bg-white px-4 py-3 shadow-lg">
                            <div className="flex items-center gap-2">
                              <span
                                className={`h-2 w-2 flex-none rounded-full bg-sky-500 ${
                                  agent.searching ? "animate-pulse" : ""
                                }`}
                              />
                              <p className="truncate text-sm font-medium text-zinc-700">
                                {(agent.searchSources?.length ?? 0) > 0
                                  ? `Searching ${agent.searchSources!.length} source${
                                      agent.searchSources!.length === 1 ? "" : "s"
                                    }`
                                  : "Searching the web..."}
                              </p>
                            </div>
                            {(agent.searchSources?.length ?? 0) > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {agent.searchSources!.map((source, sourceIndex) => (
                                  <span
                                    key={`${source.url ?? source.title ?? "source"}-${sourceIndex}`}
                                    className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-600"
                                  >
                                    {getHostname(source.url)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {agent.resultSummary !== null && (
                        <>
                          <ClarificationConnector />
                          <div className="relative z-10 w-full rounded-2xl bg-white px-4 py-3 shadow-lg">
                            <div className="flex items-center gap-2">
                              <span
                                className={`h-2 w-2 flex-none rounded-full bg-violet-500 ${
                                  agent.videoStatus === "generating" ? "animate-pulse" : ""
                                }`}
                              />
                              <p className="text-sm font-medium text-zinc-700">
                                {agent.videoStatus === "generating" ? "Thinking it through..." : "Done"}
                              </p>
                            </div>
                            {agent.videoStatus === "generating" ? (
                              agent.thoughts && agent.thoughts.length > 0 ? (
                                <ThoughtsCycler thoughts={agent.thoughts} />
                              ) : (
                                <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">
                                  {agent.resultSummary}
                                </p>
                              )
                            ) : agent.thoughts && agent.thoughts.length > 0 ? (
                              <ul className="mt-1.5 space-y-1">
                                {agent.thoughts.map((thought, thoughtIndex) => (
                                  <li
                                    key={`${agent.taskKey}-thought-${thoughtIndex}`}
                                    className="flex items-start gap-1.5 text-sm leading-relaxed text-zinc-600"
                                  >
                                    <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-violet-400" />
                                    <span>{thought}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">
                                {agent.resultSummary}
                              </p>
                            )}
                          </div>
                        </>
                      )}

                      {hasVideoBubble && (
                        <>
                          <ClarificationConnector />
                          <div className="relative z-10 w-full overflow-hidden rounded-3xl bg-slate-300 shadow-lg">
                            <button
                              type="button"
                              onClick={() => handleOutputSelect(agent.taskKey)}
                              aria-label={`View ${info?.name ?? agent.agentId}'s full result`}
                              className="flex w-full items-center gap-2 bg-white px-4 py-2.5 text-left hover:bg-zinc-50"
                            >
                              <span
                                className={`flex h-7 w-7 flex-none items-center justify-center overflow-hidden rounded-full ${
                                  AGENT_BG[agent.agentId] ?? "bg-zinc-100"
                                }`}
                              >
                                <AgentIcon agentId={agent.agentId} />
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold text-zinc-900">
                                  {info?.name ?? agent.agentId}
                                </span>
                                <span className="block truncate text-xs text-zinc-500">
                                  {info?.title}
                                </span>
                              </span>
                            </button>
                            <video src={agent.videoUrl ?? undefined} controls className="w-full bg-black" />
                          </div>
                        </>
                      )}

                      {agent.videoStatus === "error" && (
                        <>
                          <ClarificationConnector />
                          <div className="relative z-10 w-full rounded-2xl bg-white px-4 py-3 text-sm text-red-600 shadow-lg">
                            Video generation failed.
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
