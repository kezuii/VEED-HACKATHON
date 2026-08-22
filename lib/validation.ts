export type ContactPayload = {
  name: string;
  email: string;
  message: string;
};

export type ValidationResult =
  | { success: true; data: ContactPayload }
  | { success: false; errors: Partial<Record<keyof ContactPayload, string>> };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContactPayload(input: unknown): ValidationResult {
  const errors: Partial<Record<keyof ContactPayload, string>> = {};

  const record =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};

  const name = typeof record.name === "string" ? record.name.trim() : "";
  const email = typeof record.email === "string" ? record.email.trim() : "";
  const message =
    typeof record.message === "string" ? record.message.trim() : "";

  if (!name) errors.name = "Name is required.";
  if (!email) {
    errors.email = "Email is required.";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!message) errors.message = "Message is required.";

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: { name, email, message } };
}
