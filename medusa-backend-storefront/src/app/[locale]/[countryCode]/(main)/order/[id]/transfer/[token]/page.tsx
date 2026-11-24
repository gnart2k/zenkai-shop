import { Heading, Text } from "@medusajs/ui"
import { getTranslations } from "next-intl/server"
import TransferActions from "@modules/order/components/transfer-actions"
import TransferImage from "@modules/order/components/transfer-image"

export default async function TransferPage({
  params,
}: {
  params: Promise<{ id: string; token: string }>
}) {
  const { id, token } = await params
  const t = await getTranslations("ShopOrder.transfer")

  return (
    <div className="flex flex-col gap-y-4 items-start w-2/5 mx-auto mt-10 mb-20">
      <TransferImage />
      <div className="flex flex-col gap-y-6">
        <Heading level="h1" className="text-xl text-zinc-900">
          {t("title", { id })}
        </Heading>
        <Text className="text-zinc-600">
          {t("intro", { id })}
        </Text>
        <div className="w-full h-px bg-zinc-200" />
        <Text className="text-zinc-600">
          {t("accept")}
        </Text>
        <Text className="text-zinc-600">
          {t("ignore")}
        </Text>
        <div className="w-full h-px bg-zinc-200" />
        <TransferActions id={id} token={token} />
      </div>
    </div>
  )
}
