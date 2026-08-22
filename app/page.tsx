"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import agentsData from "@/lib/agents.json";

type Agent = {
  id: string;
  name: string;
  title: string;
  description: string;
  capabilities: string[];
  avatarBg: string;
};

const AGENTS: Agent[] = agentsData.agents;
const TOTAL = AGENTS.length;

const AGENT_PORTRAIT: Record<string, string> = {
  strategist: "/images/Ava_Full.png",
  copywriter: "/images/Beau_Full.png",
  "video-producer": "/images/Cleo_Full.png",
  researcher: "/images/Dex_Full.png",
  "creative-director": "/images/Elle_Full.png",
  reviewer: "/images/Finn_Full.png",
  analyst: "/images/Nia_Full.png",
  clarification: "/images/Quinn_Full.png",
};

// Visual recipe for each depth in the stack: 0 = front card, higher = further back.
const STACK_STYLE = [
  { rotate: 0, x: 0, y: 0, scale: 1, opacity: 1, z: 40 },
  { rotate: -9, x: -26, y: 14, scale: 0.94, opacity: 1, z: 30 },
  { rotate: 8, x: 30, y: 24, scale: 0.88, opacity: 1, z: 20 },
  { rotate: -6, x: -14, y: 36, scale: 0.82, opacity: 0.85, z: 10 },
];
const HIDDEN_STYLE = { rotate: 0, x: 0, y: 40, scale: 0.78, opacity: 0, z: 0 };

export default function LandingPage() {
  const [index, setIndex] = useState(0);
  const router = useRouter();

  function next() {
    setIndex((prev) => (prev + 1) % TOTAL);
  }

  function prev() {
    setIndex((prev) => (prev - 1 + TOTAL) % TOTAL);
  }

  const current = AGENTS[index];

  return (
    <div
      className="relative flex h-screen w-full flex-col overflow-hidden"
      style={{
        backgroundColor: "#ffffff",
          // backgroundImage:
          //   "linear-gradient(to right, rgba(0,0,0,0.01) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)",
          // backgroundSize: "32px 32px",
      }}
    >
      {/* Giant background heading, interrupted by the card stack */}
      <div className="pointer-events-none absolute inset-x-0 top-[20%] z-0 flex justify-center sm:top-[10%]">
        <p className="select-none whitespace-nowrap text-[clamp(3rem,13vw,9rem)] font-black uppercase leading-none tracking-tight text-zinc-900">
          AgentClub
        </p>
      </div>

      {/* Card stack */}
      <div className="relative z-10 mx-auto flex flex-shrink-0 items-center justify-center gap-4 sm:gap-8">
        <button
          type="button"
          onClick={prev}
          aria-label="Previous agent"
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-black text-white transition-colors hover:bg-zinc-800"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="relative aspect-[3/4] w-[400px] sm:w-[600px]">
        {AGENTS.map((agent, agentIndex) => {
          const position = (agentIndex - index + TOTAL) % TOTAL;
          const style = STACK_STYLE[position] ?? HIDDEN_STYLE;
          const isFront = position === 0;

          return (
            <button
              key={agent.id}
              type="button"
              onClick={isFront ? next : undefined}
              tabIndex={isFront ? 0 : -1}
              aria-hidden={!isFront}
              aria-label={isFront ? `Next agent, currently viewing ${agent.name}` : undefined}
              className="absolute inset-0 overflow-hidden rounded-[28px] shadow-xl outline-none transition-transform duration-500 ease-out focus-visible:ring-2 focus-visible:ring-zinc-400"
              style={{
                transform: `translate(-50%, -50%) translate(${style.x}px, ${style.y}px) rotate(${style.rotate}deg) scale(${style.scale})`,
                left: "50%",
                top: "50%",
                opacity: style.opacity,
                zIndex: style.z,
                pointerEvents: isFront ? "auto" : "none",
                cursor: isFront ? "pointer" : "default",
                transitionProperty: "transform, opacity",
              }}
            >
              <img
                src={AGENT_PORTRAIT[agent.id]}
                alt={isFront ? agent.name : ""}
                aria-hidden={!isFront}
                className="h-full w-full object-cover object-top transition-[filter] duration-500"
                style={{ filter: isFront ? "none" : "saturate(0.7) brightness(0.96)" }}
              />
              {!isFront && (
                <div className={`absolute inset-0 mix-blend-multiply ${agent.avatarBg}`} style={{ opacity: 0.35 }} />
              )}

              <div className="absolute inset-x-3 bottom-3 rounded-xl bg-black px-3 py-2 text-left">
                <p className="truncate text-sm font-semibold text-white">{agent.name}</p>
                <p className="truncate text-xs text-white/70">{agent.title}</p>
              </div>
            </button>
          );
        })}

        <div className="absolute inset-x-0 bottom-0 z-50 flex flex-col items-center gap-4 px-6 pb-7 pt-20 text-center">
          <p className="text-lg font-semibold leading-snug text-black sm:text-xl">
            Meet your new AI team.
            <br />
            Give them a task and watch your agents research, collaborate, and bring it to life.
          </p>
          <button
            type="button"
            onClick={() => router.push("/chat")}
            className="rounded-full bg-black px-7 py-2.5 text-sm font-semibold text-white"
          >
            Start Now
          </button>
        </div>
        </div>

        <button
          type="button"
          onClick={next}
          aria-label="Next agent"
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-black text-white transition-colors hover:bg-zinc-800"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Bottom bar */}
      <div className="relative z-10 mt-auto flex items-center justify-between px-6 py-8 sm:px-10">
        <p className="flex items-center gap-2 text-sm text-zinc-600">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
          Your AI Crew, On Call.
        </p>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={prev}
            aria-label="Previous agent"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-900"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="text-sm tabular-nums text-zinc-500">
            {String(index + 1).padStart(2, "0")} / {String(TOTAL).padStart(2, "0")}
          </span>
          <button
            type="button"
            onClick={next}
            aria-label="Next agent"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-900"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
