import { Text } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { sdk } from "../lib/client"
export function StoreBrandingFilePreview({
  fileId,
}: {
  fileId: string | null
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!fileId) {
      setUrl(null)
      return
    }
    let cancelled = false
    setLoading(true)
    void sdk.admin.upload
      .retrieve(fileId)
      .then(({ file }) => {
        if (!cancelled) {
          setUrl((file.url as string) ?? null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUrl(null)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [fileId])

  if (!fileId) {
    return null
  }

  if (loading) {
    return (
      <Text size="small" className="text-ui-fg-subtle">
        Loading preview…
      </Text>
    )
  }

  if (!url) {
    return null
  }

  return (
    <img
      src={url}
      alt=""
      className="max-h-28 max-w-full rounded-md border border-ui-border-base object-contain bg-ui-bg-base"
    />
  )
}
