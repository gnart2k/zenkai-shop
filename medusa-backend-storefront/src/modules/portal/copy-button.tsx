"use client"

import { Button } from "@/components/ui/button"
import { Check, Copy } from "lucide-react"
import { useState } from "react"

/** Copies text to the clipboard (product descriptions, SKUs, ...). */
export function CopyButton({ text, label, doneLabel }: { text: string; label: string; doneLabel: string }) {
  const [done, setDone] = useState(false)
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setDone(true)
          setTimeout(() => setDone(false), 1800)
        } catch {}
      }}
    >
      {done ? <Check /> : <Copy />}
      {done ? doneLabel : label}
    </Button>
  )
}
