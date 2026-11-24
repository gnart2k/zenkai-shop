import { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import OrderOverview from "@modules/account/components/order-overview"
import { notFound } from "next/navigation"
import { listOrders } from "@lib/data/orders"
import Divider from "@modules/common/components/divider"
import TransferRequestForm from "@modules/account/components/transfer-request-form"

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await props.params
  const t = await getTranslations({ locale, namespace: "AccountOrders" })
  return { title: t("pageTitle"), description: t("metaDescription") }
}

export default async function Orders() {
  const t = await getTranslations("AccountOrders")
  const orders = await listOrders().catch(() => null)

  if (!orders) {
    notFound()
  }

  return (
    <div className="w-full" data-testid="orders-page-wrapper">
      <div className="mb-8 flex flex-col gap-y-4">
        <h1 className="text-2xl-semi">{t("pageTitle")}</h1>
        <p className="text-base-regular">
          {t("pageDescription")}
        </p>
      </div>
      <div>
        <OrderOverview orders={orders} />
        <Divider className="my-16" />
        <TransferRequestForm />
      </div>
    </div>
  )
}
