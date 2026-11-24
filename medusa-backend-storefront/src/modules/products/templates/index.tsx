import React, { Suspense } from "react"

import ImageGallery from "@modules/products/components/image-gallery"
import ProductActions from "@modules/products/components/product-actions"
import ProductOnboardingCta from "@modules/products/components/product-onboarding-cta"
import ProductTabs from "@modules/products/components/product-tabs"
import RelatedProducts from "@modules/products/components/related-products"
import ProductInfo from "@modules/products/templates/product-info"
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products"
import { getStorefront } from "@lib/data/storefront-config"
import { notFound } from "next/navigation"
import { HttpTypes } from "@medusajs/types"

import ProductActionsWrapper from "./product-actions-wrapper"

type ProductTemplateProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  countryCode: string
  images: HttpTypes.StoreProductImage[]
}

const ProductTemplate = async ({
  product,
  region,
  countryCode,
  images,
}: ProductTemplateProps) => {
  if (!product || !product.id) {
    return notFound()
  }

  const { layout } = await getStorefront()
  const videoUrl =
    typeof product.metadata?.video_url === "string" ? product.metadata.video_url : null

  const details = (
    <>
      <ProductInfo product={product} />
      <Suspense
        fallback={<ProductActions disabled={true} product={product} region={region} />}
      >
        <ProductActionsWrapper id={product.id} region={region} />
      </Suspense>
      <ProductTabs product={product} />
      <ProductOnboardingCta />
    </>
  )

  return (
    <>
      {layout.product === "stacked" ? (
        // Stacked theme layout: a wide gallery on top, the details in a centered column below.
        <div className="content-container py-8 small:py-12" data-testid="product-container" data-product-layout="stacked">
          <div className="mx-auto max-w-3xl">
            <ImageGallery images={images} videoUrl={videoUrl} />
          </div>
          <div className="mx-auto mt-10 flex max-w-2xl flex-col gap-8">{details}</div>
        </div>
      ) : (
        <div className="content-container py-8 small:py-12" data-testid="product-container" data-product-layout="split">
          <div className="grid gap-8 small:grid-cols-2 small:gap-12">
            <div className="small:sticky small:top-24 small:self-start">
              <ImageGallery images={images} videoUrl={videoUrl} />
            </div>
            <div className="flex flex-col gap-8">{details}</div>
          </div>
        </div>
      )}
      <div
        className="content-container pb-16 small:pb-24"
        data-testid="related-products-container"
      >
        <Suspense fallback={<SkeletonRelatedProducts />}>
          <RelatedProducts product={product} countryCode={countryCode} />
        </Suspense>
      </div>
    </>
  )
}

export default ProductTemplate
