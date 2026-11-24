import { useTranslations } from "next-intl"
import Image from "next/image"
import React from "react"

import PlaceholderImage from "@modules/common/icons/placeholder-image"
import { cn } from "@/lib/utils"

type ThumbnailProps = {
  thumbnail?: string | null
  images?: any[] | null
  size?: "small" | "medium" | "large" | "full" | "square"
  isFeatured?: boolean
  className?: string
  "data-testid"?: string
}

const Thumbnail: React.FC<ThumbnailProps> = ({
  thumbnail,
  images,
  size = "small",
  isFeatured,
  className,
  "data-testid": dataTestid,
}) => {
  const t = useTranslations("ShopProduct")
  const initialImage = thumbnail || images?.[0]?.url

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-neutral-50",
        className,
        isFeatured || size === "full" || (!isFeatured && size !== "square")
          ? "aspect-[3/4]"
          : size === "square"
            ? "aspect-square"
            : "",
        {
          "w-[180px]": size === "small",
          "w-[290px]": size === "medium",
          "w-[440px]": size === "large",
          "w-full": size === "full",
        }
      )}
      data-testid={dataTestid}
    >
      {initialImage ? (
        <Image
          src={initialImage}
          alt={t("thumbnailAlt")}
          className="absolute inset-0 object-cover object-center transition-transform duration-500 group-hover:scale-105"
          draggable={false}
          quality={85}
          sizes="(max-width: 576px) 280px, (max-width: 768px) 360px, (max-width: 992px) 480px, 800px"
          fill
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <PlaceholderImage size={size === "small" ? 16 : 24} />
        </div>
      )}
    </div>
  )
}

export default Thumbnail
