"use client";

import { useState } from "react";
import type { FormEvent } from "react";

function OutputBox({
  loading,
  error,
  output,
}: {
  loading: boolean;
  error: string | null;
  output: string | null;
}) {
  return (
    <div className="min-h-[3rem] rounded-lg border border-dashed border-black/[.08] p-4 text-sm text-zinc-600 dark:border-white/[.145] dark:text-zinc-400">
      {loading ? (
        <span className="italic">Loading...</span>
      ) : error ? (
        <span className="text-red-600 dark:text-red-400">{error}</span>
      ) : output !== null ? (
        output || <span className="italic">(empty response)</span>
      ) : (
        <span className="italic">Output will appear here.</span>
      )}
    </div>
  );
}

export function PromptConsole() {
  const [prompt, setPrompt] = useState("");

  const [initialLoading, setInitialLoading] = useState(false);
  const [initialOutput, setInitialOutput] = useState<string | null>(null);
  const [initialError, setInitialError] = useState<string | null>(null);

  const [deployLoading, setDeployLoading] = useState(false);
  const [deployOutput, setDeployOutput] = useState<string | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);

  async function handleSendPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInitialLoading(true);
    setInitialError(null);

    try {
      const res = await fetch("/api/initial-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const json = await res.json();

      if (!res.ok) {
        setInitialError(json.error ?? "Request failed.");
        return;
      }

      setInitialOutput(json.output ?? "");
    } catch {
      setInitialError("Something went wrong. Please try again.");
    } finally {
      setInitialLoading(false);
    }
  }

  async function handleDeployAgents() {
    if (!prompt.trim()) {
      setDeployError("Please enter a prompt before deploying agents.");
      return;
    }

    setDeployLoading(true);
    setDeployError(null);

    try {
      const res = await fetch("/api/deploy-agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const json = await res.json();

      if (!res.ok) {
        setDeployError(json.error ?? "Request failed.");
        return;
      }

      setDeployOutput(json.output ?? "");
    } catch {
      setDeployError("Something went wrong. Please try again.");
    } finally {
      setDeployLoading(false);
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-24">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Agent Console
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Enter a prompt, send it, then deploy agents.
        </p>
      </div>

      <form onSubmit={handleSendPrompt} className="flex flex-col gap-3">
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={4}
          placeholder="Enter your prompt..."
          className="rounded-lg border border-black/[.08] bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-950 dark:border-white/[.145] dark:focus:border-zinc-50"
        />
        <button
          type="submit"
          disabled={initialLoading || !prompt.trim()}
          className="flex h-11 w-fit items-center justify-center rounded-full bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-60 dark:hover:bg-[#ccc]"
        >
          {initialLoading ? "Sending..." : "Send"}
        </button>
      </form>

      <OutputBox
        loading={initialLoading}
        error={initialError}
        output={initialOutput}
      />

      <button
        type="button"
        onClick={handleDeployAgents}
        disabled={deployLoading || !prompt.trim()}
        className="flex h-11 w-fit items-center justify-center rounded-full border border-solid border-black/[.08] px-6 text-sm font-medium transition-colors hover:border-transparent hover:bg-black/[.04] disabled:opacity-60 dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
      >
        {deployLoading ? "Deploying..." : "Deploy agents"}
      </button>

      <OutputBox
        loading={deployLoading}
        error={deployError}
        output={deployOutput}
      />
    </section>
  );
}
