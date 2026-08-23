import "server-only";

import { Resend } from "resend";
import { requireEnv } from "@/lib/db/supabase";

let resendClient: Resend | null = null;

export function isResendConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL,
  );
}

export function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(requireEnv("RESEND_API_KEY"));
  }
  return resendClient;
}

export function getResendFromAddress(): string {
  return requireEnv("RESEND_FROM_EMAIL");
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  if (!isResendConfigured()) {
    throw new Error(
      "Email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.",
    );
  }

  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: getResendFromAddress(),
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  if (error) {
    throw new Error(error.message);
  }
}
