import { Github } from "@medusajs/icons"
import { Button, Heading } from "@medusajs/ui"
import type { StoreBrandingPublic } from "@lib/data/store-branding"

type HeroProps = {
  branding: StoreBrandingPublic
}

const Hero = ({ branding }: HeroProps) => {
  const title =
    branding.store_name?.trim() || "Welcome"
  const subtitle =
    branding.tagline?.trim() || ""
  const accent = branding.primary_color?.trim() || undefined

  return (
    <div className="h-[75vh] w-full border-b border-ui-border-base relative bg-ui-bg-subtle overflow-hidden">
      {branding.hero_url ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${branding.hero_url})` }}
          aria-hidden
        />
      ) : null}
      <div
        className="absolute inset-0 bg-ui-bg-subtle/85"
        aria-hidden
      />
      <div className="absolute inset-0 z-10 flex flex-col justify-center items-center text-center small:p-32 gap-6 px-4">
        {branding.logo_url ? (
          <img
            src={branding.logo_url}
            alt=""
            className="h-16 w-auto max-w-[200px] object-contain mb-2"
          />
        ) : null}
        <span>
          <Heading
            level="h1"
            className="text-3xl leading-10 text-ui-fg-base font-normal"
            style={accent ? { color: accent } : undefined}
          >
            {title}
          </Heading>
          <Heading
            level="h2"
            className="text-3xl leading-10 text-ui-fg-subtle font-normal mt-2"
          >
            {subtitle}
          </Heading>
        </span>
      </div>
    </div>
  )
}

export default Hero
