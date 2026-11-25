import type { MedusaContainer } from '@medusajs/framework/types';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { renderPortalEmail } from './email-templates';

type Container = Pick<MedusaContainer, 'resolve'>;

/**
 * Sends a portal email. Provider is chosen by env:
 *   RESEND_API_KEY            -> Resend HTTP API
 *   SMTP_URL (smtp[s]://...)  -> any SMTP server (nodemailer)
 * with EMAIL_FROM ("Zenkai Shop <no-reply@zenkai.com.vn>"). With neither set nothing is sent and a
 * warning is logged. A missing or failing mailer never breaks a request, approval or payout.
 */
export function emailConfigured() {
  return !!(process.env.RESEND_API_KEY || process.env.SMTP_URL);
}

export const portalUrl = () =>
  (process.env.PORTAL_URL || 'http://localhost:4100/portal').replace(/\/$/, '');

async function deliver(msg: { to: string; subject: string; html: string; text: string }) {
  const from = process.env.EMAIL_FROM || 'Zenkai Shop <no-reply@zenkai.com.vn>';
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
