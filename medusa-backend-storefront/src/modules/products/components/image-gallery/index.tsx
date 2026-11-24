import { useTranslations } from "next-intl"
import { HttpTypes } from "@medusajs/types"
import Image from "next/image"

type ImageGalleryProps = {
  images: HttpTypes.StoreProductImage[]
  /** Optional product video (product.metadata.video_url), shown before the images. */
  videoUrl?: string | null
}

const ImageGallery = ({ images, videoUrl }: ImageGalleryProps) => {
  const t = useTranslations("ShopProduct")
  return (
    <div className="flex flex-col gap-4">
      {videoUrl && (
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-50">
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src={videoUrl}
            poster={images[0]?.url ?? undefined}
            autoPlay
            muted
            loop
            playsInline
            controls
            preload="metadata"
            data-testid="product-video"
          />
        </div>
      )}
      {images.map((image, index) => (
        <div
          key={image.id}
          className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-50"
        >
          {!!image.url && (
            <Image
              src={image.url}
              priority={!videoUrl && index <= 2}
              className="absolute inset-0 object-cover"
              alt={t("imageAlt", { number: index + 1 })}
              fill
              sizes="(max-width: 576px) 100vw, (max-width: 1024px) 50vw, 600px"
              style={{ objectFit: "cover" }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

export default ImageGallery
