export type PayOSPaymentProviderOptions = {
  client_id: string;
  api_key: string;
  checksum_key: string;
  return_url: string;
  cancel_url: string;
};

export type PayOSCreatePaymentLinkPayload = {
  orderCode: number;
  amount: number;
  description: string;
  returnUrl: string;
  cancelUrl: string;
};

export type PayOSPaymentLinkData = {
  paymentLinkId?: string;
  orderCode?: number;
  amount?: number;
  status?: string;
  checkoutUrl?: string;
  qrCode?: string;
};
