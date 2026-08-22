"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import type {
  FormEvent,
  KeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import agentsData from "@/lib/agents.json";

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

type ThinkingAgent = {
  id: string;
  status: string;
  agentId: string;
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

const STATUS_POOL: string[] = [
  "Strategizing...",
  "Writing...",
  "Creating...",
  "Researching...",
  "Designing...",
  "Reviewing...",
  "Optimizing...",
  "Testing...",
  "Summarizing...",
  "Deploying...",
];

const SIDEBAR_AGENTS_IDLE: SidebarAgent[] = AGENTS.map((agent) => ({
  id: agent.id,
  bg: "bg-zinc-200",
}));

const SIDEBAR_AGENTS_DEPLOYED: SidebarAgent[] = AGENTS.map((agent) => ({
  id: agent.id,
  bg: agent.avatarBg,
}));

const NODE_WIDTH = 150;

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function randomThinkingAgents(): ThinkingAgent[] {
  const count = Math.floor(Math.random() * AGENTS.length) + 1; // 1-8 agents
  const agents = shuffle(AGENTS).slice(0, count);
  const statuses = shuffle(STATUS_POOL);
  return agents.map((agent, index) => ({
    id: `agent-${index}`,
    status: statuses[index % statuses.length],
    agentId: agent.id,
  }));
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
      className="w-full max-w-md cursor-pointer rounded-2xl bg-white p-5 shadow-lg transition-shadow hover:shadow-xl"
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
      className="w-full max-w-md cursor-pointer rounded-2xl bg-white p-5 shadow-lg transition-shadow hover:shadow-xl"
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
  }, [submittedPrompt, thinkingAgents, visibleAgents, qaHistory]);

  useEffect(() => {
    if (!submittedPrompt) return;
    function handleResize() {
      computePaths();
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [submittedPrompt]);

  function handleAgentSelect(id: string) {
    setSelectedAgentId((prev) => (prev === id ? null : id));
  }

  useEffect(() => {
    if (!selectedAgentId) return;

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setSelectedAgentId(null);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedAgentId]);

  useEffect(() => {
    setSelectedAgentId(null);
  }, [submittedPrompt]);

  async function runClarification(history: QAPair[]) {
    if (history.length >= MAX_CLARIFICATION_QUESTIONS) {
      finalizePrompt(history);
      return;
    }
    setClarifyLoading(true);
    try {
      const response = await fetchClarifyWithRetry(originalPromptRef.current, history);
      const data = await response.json();
      if (data?.needsClarification && Array.isArray(data.questions) && data.questions.length > 0) {
        setCurrentQuestion(data.questions[0]);
      } else {
        finalizePrompt(history);
      }
    } catch (error) {
      console.error("Clarification request failed:", error);
      finalizePrompt(history);
    } finally {
      setClarifyLoading(false);
    }
  }

  function finalizePrompt(history: QAPair[]) {
    const finalPromptText =
      history.length === 0
        ? originalPromptRef.current
        : `${originalPromptRef.current}\n\nAdditional details:\n${history
            .map((qa) => `- ${qa.question} ${qa.answer}`)
            .join("\n")}`;

    console.log("Final clarified prompt:", finalPromptText);

    fetch("/api/initial-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: finalPromptText }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (typeof data?.output !== "string") {
          console.log("Deploy plan:", data);
          return;
        }
        try {
          console.log("Deploy plan:", JSON.parse(data.output));
        } catch {
          console.log("Deploy plan:", data.output);
        }
      })
      .catch((error) => {
        console.error("Deploy plan request failed:", error);
      });

    const agents = randomThinkingAgents();
    setThinkingAgents(agents);
    setVisibleAgents(agents.map(() => false));
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
    if (target.closest("textarea, button, input")) return;
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
                className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-full transition-colors duration-300 ${agent.bg} ring-offset-2 hover:ring-2 hover:ring-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
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
                <div className="flex w-[50%] aspect-[1] flex-none items-center justify-center overflow-hidden rounded-full bg-zinc-100">
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
              className="pointer-events-none absolute inset-0 overflow-visible"
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
              className="max-w-md rounded-2xl bg-white px-6 py-4 text-center text-sm text-zinc-900 shadow-lg"
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
              <div className="mt-12 flex flex-nowrap items-start justify-center gap-x-8">
                {thinkingAgents.map((agent, index) => (
                  <div
                    key={agent.id}
                    ref={(el) => {
                      nodeRefs.current[index] = el;
                    }}
                    className={`flex-shrink-0 transition-all duration-300 ${
                      visibleAgents[index]
                        ? "translate-y-0 opacity-100"
                        : "-translate-y-2 opacity-0"
                    }`}
                    style={{ width: NODE_WIDTH }}
                  >
                    <button
                      type="button"
                      onClick={() => handleAgentSelect(agent.agentId)}
                      aria-label={`View ${AGENT_INFO[agent.agentId]?.name ?? agent.agentId} details`}
                      aria-expanded={selectedAgentId === agent.agentId}
                      className={`flex w-full items-center gap-2 rounded-2xl bg-white px-3 py-2.5 shadow-lg transition-shadow hover:shadow-xl ${
                        selectedAgentId === agent.agentId ? "ring-2 ring-zinc-400" : ""
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 flex-none animate-pulse items-center justify-center rounded-full ${
                          AGENT_BG[agent.agentId] ?? "bg-zinc-100"
                        }`}
                      >
                        <AgentIcon agentId={agent.agentId} />
                      </span>
                      <span className="truncate text-sm text-zinc-700">{agent.status}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
