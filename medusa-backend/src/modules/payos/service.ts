import {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  BigNumberInput,
  Logger,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"
import {
  AbstractPaymentProvider,
  BigNumber,
  MedusaError,
  PaymentActions,
} from "@medusajs/framework/utils"
import { PayOS, type Webhook, type WebhookData } from "@payos/node"
import {
  PayOSCreatePaymentLinkPayload,
  PayOSPaymentLinkData,
  PayOSPaymentProviderOptions,
} from "./types"

type InjectedDependencies = {
  logger: Logger
}

const buildOrderCode = (sessionId: string) => {
  const timestamp = Date.now().toString().slice(-8)
  const sessionSuffix = sessionId.replace(/\D/g, "").slice(-8) || "1"
  return Number(`${timestamp}${sessionSuffix}`.slice(0, 12))
}

const toAmountNumber = (amount: BigNumberInput) => {
  const value = Number(amount)

  if (!Number.isFinite(value) || value <= 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "PayOS requires a positive payment amount."
    )
  }

  return Math.round(value)
}

class PayOSPaymentProviderService extends AbstractPaymentProvider<PayOSPaymentProviderOptions> {
  static identifier = "payos"

  static validateOptions(options: Record<string, unknown>): void {
    if (!options.client_id || !options.api_key || !options.checksum_key) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PayOS: PAYOS_CLIENT_ID, PAYOS_API_KEY, and PAYOS_CHECKSUM_KEY are required."
      )
    }
  }

  protected readonly logger_: Logger
  protected readonly options_: PayOSPaymentProviderOptions
  protected readonly client_: PayOS

  constructor(
    { logger }: InjectedDependencies,
    options: PayOSPaymentProviderOptions
  ) {
    super({ logger }, options)

    this.logger_ = logger
    this.options_ = options

    if (!options.client_id || !options.api_key || !options.checksum_key) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Missing PayOS credentials. Set PAYOS_CLIENT_ID, PAYOS_API_KEY, and PAYOS_CHECKSUM_KEY."
      )
    }

    this.client_ = new PayOS({
      clientId: options.client_id,
      apiKey: options.api_key,
      checksumKey: options.checksum_key,
    })
  }

  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    if (!this.options_.return_url || !this.options_.cancel_url) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Missing PayOS return/cancel URL. Set PAYOS_RETURN_URL and PAYOS_CANCEL_URL."
      )
    }

    const sessionId = String(input.data?.session_id || "")

    if (!sessionId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Missing payment session ID while creating PayOS payment link."
      )
    }

    const orderCode = buildOrderCode(sessionId)
    const amount = toAmountNumber(input.amount)

    const payload: PayOSCreatePaymentLinkPayload = {
      orderCode,
      amount,
      description: `DH ${orderCode}`,
      returnUrl: this.options_.return_url,
      cancelUrl: this.options_.cancel_url,
    }

    const response = (await this.client_.paymentRequests.create(
      payload
    )) as PayOSPaymentLinkData

    return {
      id: String(response.paymentLinkId || orderCode),
      data: {
        order_code: response.orderCode || orderCode,
        payment_link_id: response.paymentLinkId,
        checkout_url: response.checkoutUrl,
        qr_code: response.qrCode,
        amount,
        session_id: sessionId,
      },
    }
  }

  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    const orderCode = Number(input.data?.order_code)

    if (!orderCode) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PayOS order code is missing from payment session data."
      )
    }

    const payment = (await this.client_.paymentRequests.get(
      orderCode
    )) as PayOSPaymentLinkData
    const status = (payment.status || "").toUpperCase()

    switch (status) {
      case "PAID":
        return {
          status: "authorized",
          data: {
            ...input.data,
            status,
          },
        }
      case "CANCELLED":
      case "EXPIRED":
        return {
          status: "canceled",
          data: {
            ...input.data,
            status,
          },
        }
      default:
        return {
          status: "requires_more",
          data: {
            ...input.data,
            status: status || "PENDING",
          },
        }
    }
  }

  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    return { data: input.data }
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    return { data: input.data }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: input.data }
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    const status = String(input.data?.status || "").toUpperCase()

    switch (status) {
      case "PAID":
        return { status: "authorized", data: input.data }
      case "CANCELLED":
      case "EXPIRED":
        return { status: "canceled", data: input.data }
      default:
        return { status: "pending", data: input.data }
    }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    return { data: input.data }
  }

  async retrievePayment(
    input: RetrievePaymentInput
  ): Promise<RetrievePaymentOutput> {
    return { data: input.data }
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    return { data: input.data }
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const empty = {
      session_id: "",
      amount: new BigNumber(0),
    }

    const raw = (payload.data || {}) as Record<string, unknown>

    const webhookBody: Webhook = {
      code: String(raw.code ?? ""),
      desc: String(raw.desc ?? ""),
      success: Boolean(raw.success),
      data: raw.data as WebhookData,
      signature: String(raw.signature ?? ""),
    }

    let verified: WebhookData

    try {
      verified = await this.client_.webhooks.verify(webhookBody)
    } catch (e) {
      this.logger_.warn(
        `[PayOS] webhook verify failed: ${e instanceof Error ? e.message : String(e)}`
      )
      return {
        action: PaymentActions.FAILED,
        data: empty,
      }
    }

    this.logger_.info(
      `[PayOS] verified webhook for orderCode=${verified.orderCode} paymentLinkId=${verified.paymentLinkId}`
    )
    return {
      action: PaymentActions.NOT_SUPPORTED,
      data: empty,
    }
  }
}

export default PayOSPaymentProviderService
