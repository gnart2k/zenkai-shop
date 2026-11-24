import { HttpTypes } from "@medusajs/types"
import React from "react"

import { cn } from "@/lib/utils"

type OptionSelectProps = {
  option: HttpTypes.StoreProductOption
  current: string | undefined
  updateOption: (title: string, value: string) => void
  title: string
  disabled: boolean
  "data-testid"?: string
}

const OptionSelect: React.FC<OptionSelectProps> = ({
  option,
  current,
  updateOption,
  title,
  "data-testid": dataTestId,
  disabled,
}) => {
  const filteredOptions = (option.values ?? []).map((v) => v.value)

  return (
    <div className="flex flex-col gap-y-3">
      <span className="text-xs font-medium text-muted-foreground">
        {title}
      </span>
      <div
        className="flex flex-wrap gap-2"
        data-testid={dataTestId}
      >
        {filteredOptions.map((v) => (
          <button
            onClick={() => updateOption(option.id, v)}
            key={v}
            className={cn(
              "h-9 rounded-full border px-4 text-sm transition-all",
              v === current
                ? "border-foreground bg-foreground text-white"
                : "border-border bg-transparent text-muted-foreground hover:border-foreground/30 hover:text-foreground"
            )}
            disabled={disabled}
            data-testid="option-button"
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  )
}

export default OptionSelect
