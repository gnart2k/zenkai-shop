"use client"

import { motion } from "motion/react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"

import { Reveal } from "../motion-primitives"

export default function NewsletterPlaceholder() {
  const t = useTranslations("Home")

  return (
    <section className="bg-gradient-to-b from-muted/40 to-background py-20 small:py-28">
      <div className="content-container">
        <Reveal>
          <Card className="mx-auto max-w-2xl overflow-hidden border-border/80 bg-card/90 shadow-lg backdrop-blur-sm">
            <CardHeader className="space-y-2 text-center">
              <CardTitle className="font-serif text-2xl small:text-3xl">
                {t("newsletterTitle")}
              </CardTitle>
              <CardDescription className="text-base">
                {t("newsletterDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <motion.form
                className="flex flex-col gap-3 small:flex-row"
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45 }}
                onSubmit={(e) => e.preventDefault()}
              >
                <Input
                  type="email"
                  placeholder={t("newsletterPlaceholder")}
                  className="h-11 flex-1 rounded-full border-border/80 bg-background/80"
                  disabled
                  aria-label={t("newsletterPlaceholder")}
                />
                <Button type="submit" className="h-11 rounded-full px-8" disabled>
                  {t("newsletterCta")}
                </Button>
              </motion.form>
              <p className="mt-4 text-center text-xs text-muted-foreground">
                {t("newsletterNote")}
              </p>
            </CardContent>
          </Card>
        </Reveal>
      </div>
    </section>
  )
}
