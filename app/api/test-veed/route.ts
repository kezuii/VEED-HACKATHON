// app/api/test-veed/route.ts
import { NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;
    const script = (formData.get("text") as string) || "";
    const resolution = (formData.get("resolution") as string) || "480p";

    if (!imageFile || !script) {
      return NextResponse.json(
        { error: "Both an image and text are required." },
        { status: 400 }
      );
    }
    if (!ACCEPTED_TYPES.includes(imageFile.type)) {
      return NextResponse.json(
        { error: `Unsupported image type: ${imageFile.type}` },
        { status: 400 }
      );
    }
    if (imageFile.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Image is too large (max 10MB, got ${(imageFile.size / 1024 / 1024).toFixed(1)}MB)` },
        { status: 400 }
      );
    }

    const imageUrl = await fal.storage.upload(imageFile);

    const ttsResult = await fal.subscribe("fal-ai/elevenlabs/tts/multilingual-v2", {
      input: { text: script, voice: "Aria" },
    });
    const audioUrl = (ttsResult.data as any)?.audio?.url;

    if (!audioUrl) {
      return NextResponse.json(
        { error: "Failed to generate TTS audio.", ttsData: ttsResult.data },
        { status: 500 }
      );
    }

    const fabricResult = await fal.subscribe("veed/fabric-1.0", {
      input: { image_url: imageUrl, audio_url: audioUrl, resolution },
      logs: true,
    });

    const videoUrl = (fabricResult.data as any)?.video?.url || null;

    return NextResponse.json({
      success: true,
      videoUrl,
      imageUrl,
      audioUrl,
      data: fabricResult.data,
    });
  } catch (error: any) {
    console.error("VEED Fabric 1.0 pipeline error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate video" },
      { status: 500 }
    );
  }
}