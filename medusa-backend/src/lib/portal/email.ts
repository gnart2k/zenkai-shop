import type { MedusaContainer } from '@medusajs/framework/types';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { renderPortalEmail } from './email-templates';

type Container = Pick<MedusaContainer, 'resolve'>;

/**
 * Sends a portal email. Provider is chosen by env:
 *   ZENKAI_MAIL_BASE_URL      -> the Zenkai Mail service (POST /send, optional X-API-Key); its sender
 *                                address/domain (Zoho, SPF/DKIM) is configured in that service
 *   RESEND_API_KEY            -> Resend HTTP API
 *   SMTP_URL (smtp[s]://...)  -> any SMTP server (nodemailer)
 * with EMAIL_FROM ("Zenkai Shop <no-reply@zenkai.com.vn>"). With none set nothing is sent and a
 * warning is logged. A missing or failing mailer never breaks a request, approval or payout.
 */
export function emailConfigured() {
  return !!(process.env.ZENKAI_MAIL_BASE_URL || process.env.RESEND_API_KEY || process.env.SMTP_URL);
}

export const portalUrl = () =>
  (process.env.PORTAL_URL || 'http://localhost:4100/portal').replace(/\/$/, '');

async function deliver(msg: { to: string; subject: string; html: string; text: string }) {
  const from = process.env.EMAIL_FROM || 'Zenkai Shop <no-reply@zenkai.com.vn>';
  if (process.env.ZENKAI_MAIL_BASE_URL) {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (process.env.ZENKAI_MAIL_API_KEY) headers['X-API-Key'] = process.env.ZENKAI_MAIL_API_KEY;
    const res = await fetch(`${process.env.ZENKAI_MAIL_BASE_URL.replace(/\/$/, '')}/send`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        to: [msg.to],
        cc: [],
        bcc: [],
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
        reply_to: process.env.EMAIL_REPLY_TO || undefined,
        // Only override the service's own sender when one is configured explicitly.
        from_email: process.env.EMAIL_FROM_ADDRESS || undefined,
        from_name: process.env.EMAIL_FROM_NAME || 'Zenkai Shop',
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string; details?: unknown };
    if (!res.ok) {
      throw new Error(
        `Zenkai Mail ${res.status}: ${body.error ?? (typeof body.details === 'string' ? body.details : '')}`
      );
    }
    return;
  }
  if (process.env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return;
  }
  const nodemailer = await import('nodemailer');
  const transport = nodemailer.createTransport(process.env.SMTP_URL!);
  await transport.sendMail({
    from,
    to: msg.to,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
  });
}

async function storeNameOf(container: Container, storeId: unknown): Promise<string | null> {
  if (typeof storeId !== 'string') return null;
  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const { data } = await query.graph({
      entity: 'store',
      fields: ['name'],
      filters: { id: storeId },
    });
    return (data[0] as { name?: string } | undefined)?.name ?? null;
  } catch {
    return null;
  }
}

export async function sendPortalEmail(
  container: Container,
  input: { to: string | null | undefined; template: string; data: Record<string, unknown> }
) {
  if (!input.to) return;
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as {
    warn: (m: string) => void;
    info: (m: string) => void;
  };
  try {
    const rendered = renderPortalEmail(input.template, {
      storeName: await storeNameOf(container, input.data.store_id),
      portalUrl: portalUrl(),
      data: input.data,
    });
    if (!rendered) {
      logger.warn(`[portal] no email template "${input.template}"`);
      return;
    }
    if (!emailConfigured()) {
      logger.warn(
        `[portal] email "${input.template}" to ${input.to} not sent: set RESEND_API_KEY or SMTP_URL (and EMAIL_FROM)`
      );
      return;
    }
    await deliver({ to: input.to, ...rendered });
    logger.info(`[portal] email "${input.template}" sent to ${input.to}`);
  } catch (e) {
    logger.warn(
      `[portal] email "${input.template}" to ${input.to} failed: ${(e as Error).message}`
    );
  }
}
