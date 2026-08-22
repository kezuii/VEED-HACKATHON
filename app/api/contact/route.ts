import { validateContactPayload } from "@/lib/validation";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, errors: { form: "Invalid JSON body." } },
      { status: 400 }
    );
  }

  const result = validateContactPayload(body);

  if (!result.success) {
    return Response.json(
      { success: false, errors: result.errors },
      { status: 422 }
    );
  }

  // TODO: send an email, store a lead, etc. For now we just acknowledge it.
  console.log("New contact submission:", result.data);

  return Response.json({ success: true });
}
