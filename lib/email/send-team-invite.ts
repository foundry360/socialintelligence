import "server-only";

import { roleLabel } from "@/lib/tenancy/team-shared";
import type { TenantRole } from "@/domains/shared/types";
import { sendEmail } from "@/lib/email/resend";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendTeamInviteEmail(input: {
  to: string;
  tenantName: string;
  inviterEmail: string;
  role: TenantRole;
  acceptUrl: string;
}): Promise<void> {
  const tenantName = escapeHtml(input.tenantName);
  const inviterEmail = escapeHtml(input.inviterEmail);
  const role = escapeHtml(roleLabel(input.role));
  const acceptUrl = escapeHtml(input.acceptUrl);

  const subject = `Join ${input.tenantName} on Social Intelligence`;
  const text = [
    `You have been invited to join ${input.tenantName} on Social Intelligence.`,
    ``,
    `${input.inviterEmail} invited you as ${roleLabel(input.role)}.`,
    ``,
    `Accept your invite and set your password:`,
    input.acceptUrl,
    ``,
    `If you did not expect this invite, you can ignore this email.`,
  ].join("\n");

  const html = `
    <div style="font-family: ui-sans-serif, system-ui, sans-serif; line-height: 1.5; color: #0a0a0b; max-width: 560px;">
      <p style="font-size: 14px; color: #6b7280; margin: 0 0 8px;">Social Intelligence</p>
      <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 16px;">You are invited to ${tenantName}</h1>
      <p style="margin: 0 0 12px;">
        <strong>${inviterEmail}</strong> invited you to join <strong>${tenantName}</strong> as <strong>${role}</strong>.
      </p>
      <p style="margin: 0 0 20px;">
        Accept your invite to create your account and set a password.
      </p>
      <p style="margin: 0 0 24px;">
        <a href="${acceptUrl}" style="display: inline-block; background: #2084C7; color: #ffffff; text-decoration: none; padding: 10px 16px; border-radius: 6px; font-size: 14px; font-weight: 500;">
          Accept invite
        </a>
      </p>
      <p style="margin: 0; font-size: 12px; color: #6b7280;">
        If the button does not work, copy and paste this link into your browser:<br />
        <a href="${acceptUrl}" style="color: #2084C7; word-break: break-all;">${acceptUrl}</a>
      </p>
    </div>
  `.trim();

  await sendEmail({
    to: input.to,
    subject,
    html,
    text,
  });
}

export async function sendTeamAddedEmail(input: {
  to: string;
  tenantName: string;
  inviterEmail: string;
  role: TenantRole;
  workspaceUrl: string;
}): Promise<void> {
  const tenantName = escapeHtml(input.tenantName);
  const inviterEmail = escapeHtml(input.inviterEmail);
  const role = escapeHtml(roleLabel(input.role));
  const workspaceUrl = escapeHtml(input.workspaceUrl);

  const subject = `You now have access to ${input.tenantName}`;
  const text = [
    `${input.inviterEmail} added you to ${input.tenantName} as ${roleLabel(input.role)}.`,
    ``,
    `Open your workspace:`,
    input.workspaceUrl,
  ].join("\n");

  const html = `
    <div style="font-family: ui-sans-serif, system-ui, sans-serif; line-height: 1.5; color: #0a0a0b; max-width: 560px;">
      <p style="font-size: 14px; color: #6b7280; margin: 0 0 8px;">Social Intelligence</p>
      <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 16px;">You have been added to ${tenantName}</h1>
      <p style="margin: 0 0 20px;">
        <strong>${inviterEmail}</strong> added you as <strong>${role}</strong>.
      </p>
      <p style="margin: 0 0 24px;">
        <a href="${workspaceUrl}" style="display: inline-block; background: #2084C7; color: #ffffff; text-decoration: none; padding: 10px 16px; border-radius: 6px; font-size: 14px; font-weight: 500;">
          Open workspace
        </a>
      </p>
    </div>
  `.trim();

  await sendEmail({
    to: input.to,
    subject,
    html,
    text,
  });
}
