// app/api/list-images/route.ts
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ACCEPTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"];

export async function GET() {
  try {
    const imagesDir = path.join(process.cwd(), "public", "images");
    const files = fs.readdirSync(imagesDir);

    const images = files
      .filter((f) => ACCEPTED_EXTENSIONS.includes(path.extname(f).toLowerCase()))
      .map((f) => ({
        name: f,
        url: `/images/${f}`,
      }));

    return NextResponse.json({ images });
  } catch (error: any) {
    console.error("Failed to list images:", error);
    return NextResponse.json({ error: "Failed to load image gallery." }, { status: 500 });
  }
}