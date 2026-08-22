import { NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import { readFile } from "node:fs/promises";
import path from "node:path";
import agentsData from "@/lib/agents.json";

const AGENTS = agentsData.agents;

const AVATAR_FULL_FILENAME: Record<string, string> = {
  strategist: "Ava_Full.png",
  copywriter: "Beau_Full.png",
  "video-producer": "Cleo_Full.png",
  researcher: "Dex_Full.png",
  "creative-director": "Elle_Full.png",
  reviewer: "Finn_Full.png",
  analyst: "Nia_Full.png",
  clarification: "Quinn_Full.png",
};

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const agentId =
    typeof (body as { agentId?: unknown })?.agentId === "string"
      ? (body as { agentId: string }).agentId
      : "";

  const script =
    typeof (body as { script?: unknown })?.script === "string"
      ? (body as { script: string }).script
      : "";

  const agent = AGENTS.find((candidate) => candidate.id === agentId);
  const avatarFilename = AVATAR_FULL_FILENAME[agentId];

  if (!agent || !avatarFilename) {
    return NextResponse.json({ error: "Unknown agent." }, { status: 400 });
  }

  if (!script.trim()) {
    return NextResponse.json({ error: "Script is required." }, { status: 400 });
  }

  if (!process.env.FAL_KEY) {
    return NextResponse.json(
      { error: "FAL_KEY is missing. Check your .env.local file." },
      { status: 500 },
    );
  }

  try {
    const imagePath = path.join(process.cwd(), "public", "images", avatarFilename);
    const imageBuffer = await readFile(imagePath);
    const imageBlob = new Blob([imageBuffer], { type: "image/png" });
    const imageUrl = await fal.storage.upload(imageBlob);

    const voice = agent.voice || "Aria";

    const ttsResult = await fal.subscribe("fal-ai/elevenlabs/tts/multilingual-v2", {
      input: { text: script, voice },
    });
    const audioUrl = (ttsResult.data as { audio?: { url?: string } })?.audio?.url;

    if (!audioUrl) {
      return NextResponse.json(
        { error: "Failed to generate voiceover audio." },
        { status: 500 },
      );
    }

    const fabricResult = await fal.subscribe("veed/fabric-1.0", {
      input: { image_url: imageUrl, audio_url: audioUrl, resolution: "480p" },
      logs: true,
    });
    const videoUrl = (fabricResult.data as { video?: { url?: string } })?.video?.url ?? null;

    if (!videoUrl) {
      return NextResponse.json({ error: "Failed to generate video." }, { status: 500 });
    }

    return NextResponse.json({ videoUrl });
  } catch (error) {
    console.error(`${agent.name} avatar video generation failed:`, error);
    return NextResponse.json(
      { error: `${agent.name}'s avatar video failed to generate.` },
      { status: 500 },
    );
  }
}
