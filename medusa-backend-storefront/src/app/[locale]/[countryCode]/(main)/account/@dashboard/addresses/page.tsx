import { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"

import AddressBook from "@modules/account/components/address-book"

import { getRegion } from "@lib/data/regions"
import { retrieveCustomer } from "@lib/data/customer"

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await props.params
  const t = await getTranslations({ locale, namespace: "AccountAddresses" })
  return { title: t("metaTitle"), description: t("metaDescription") }
}

export default async function Addresses(props: {
  params: Promise<{ locale: string; countryCode: string }>
}) {
  const params = await props.params
  const { countryCode } = params
  const t = await getTranslations("AccountAddresses")
  const customer = await retrieveCustomer()
  const region = await getRegion(countryCode)

  if (!customer || !region) {
    notFound()
  }

  return (
    <div className="w-full" data-testid="addresses-page-wrapper">
      <div className="mb-8 flex flex-col gap-y-4">
        <h1 className="text-2xl-semi">{t("pageTitle")}</h1>
        <p className="text-base-regular">
          {t("pageDescription")}
        </p>
      </div>
      <AddressBook customer={customer} region={region} />
    </div>
  )
}
