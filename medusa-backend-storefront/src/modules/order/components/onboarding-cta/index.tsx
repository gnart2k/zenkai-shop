"use client"

import { useTranslations } from "next-intl"
import { resetOnboardingState } from "@lib/data/onboarding"
import { Button, Container, Text } from "@medusajs/ui"

const OnboardingCta = ({ orderId }: { orderId: string }) => {
  const t = useTranslations("ShopOrder.onboarding")
  return (
    <Container className="max-w-4xl h-full bg-ui-bg-subtle w-full">
      <div className="flex flex-col gap-y-4 center p-4 md:items-center">
        <Text className="text-ui-fg-base text-xl">
          {t("created")}
        </Text>
        <Text className="text-ui-fg-subtle text-small-regular">
          {t("hint")}
        </Text>
        <Button
          className="w-fit"
          size="xlarge"
          onClick={() => resetOnboardingState(orderId)}
        >
          {t("complete")}
        </Button>
      </div>
    </Container>
  )
}

export default OnboardingCta
