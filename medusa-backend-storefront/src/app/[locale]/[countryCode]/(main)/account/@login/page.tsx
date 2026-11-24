import { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import LoginTemplate from "@modules/account/templates/login-template"

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await props.params
  const t = await getTranslations({ locale, namespace: "AccountLoginMeta" })
  return { title: t("title"), description: t("description") }
}

export default function Login() {
  return <LoginTemplate />
}
