/** Online payment is switched off with PAYMENTS_ENABLED=false (until a payment provider is configured). */
export const paymentsEnabled = () => process.env.PAYMENTS_ENABLED !== "false"
