// app/api/test-veed/route.ts
import { NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const imageFiles = formData.getAll("images").filter((item): item is File => item instanceof File);
    const fallbackImage = formData.get("image");
    const selectedImages = imageFiles.length > 0 ? imageFiles : fallbackImage instanceof File ? [fallbackImage] : [];
    const script = (formData.get("text") as string) || "";
    const requestedResolution = formData.get("resolution");
    const resolution: "480p" | "720p" = requestedResolution === "720p" ? "720p" : "480p";
    const voice = (formData.get("voice") as string) || "Aria";

    if (selectedImages.length === 0 || !script) {
      return NextResponse.json(
        { error: "At least one image and text are required." },
        { status: 400 }
      );
    }

    const firstImage = selectedImages[0];

    if (!ACCEPTED_TYPES.includes(firstImage.type)) {
      return NextResponse.json(
        { error: `Unsupported image type: ${firstImage.type}` },
        { status: 400 }
      );
    }
    if (firstImage.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Image is too large (max 10MB, got ${(firstImage.size / 1024 / 1024).toFixed(1)}MB)` },
        { status: 400 }
      );
    }

    const imageUrl = await fal.storage.upload(firstImage);

    const ttsResult = await fal.subscribe("fal-ai/elevenlabs/tts/multilingual-v2", {
      input: { text: script, voice },
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
      selectedImageCount: selectedImages.length,
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