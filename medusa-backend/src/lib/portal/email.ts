import type { MedusaContainer } from '@medusajs/framework/types';
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils';

/**
 * Sends a portal email through the Notification module. No email provider is
 * configured in this project yet, so failures are logged and swallowed: a missing
 * mailer must never break a request, approval or payout.
 */
export async function sendPortalEmail(
  container: Pick<MedusaContainer, 'resolve'>,
  input: { to: string | null | undefined; template: string; data: Record<string, unknown> }
) {
  if (!input.to) {
    return;
  }
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as {
    warn: (m: string) => void;
  };
  try {
    await container.resolve(Modules.NOTIFICATION).createNotifications({
      to: input.to,
      channel: 'email',
      template: input.template,
      data: input.data,
    });
  } catch (e) {
    logger.warn(
      `[portal] email "${input.template}" to ${input.to} not sent (is an email provider configured?): ${(e as Error).message}`
    );
  }
}
