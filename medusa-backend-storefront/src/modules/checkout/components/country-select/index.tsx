import { forwardRef, useImperativeHandle, useMemo, useRef } from "react"

import NativeSelect, {
  NativeSelectProps,
} from "@modules/common/components/native-select"
import { HttpTypes } from "@medusajs/types"

const VIETNAM_COUNTRY_OPTION = {
  value: "vn",
  label: "Vietnam",
}

const CountrySelect = forwardRef<
  HTMLSelectElement,
  NativeSelectProps & {
    region?: HttpTypes.StoreRegion
  }
>(({ placeholder = "Country", region, defaultValue, ...props }, ref) => {
  const innerRef = useRef<HTMLSelectElement>(null)

  useImperativeHandle<HTMLSelectElement | null, HTMLSelectElement | null>(
    ref,
    () => innerRef.current
  )

  const countryOptions = useMemo(() => {
    const regionOptions = (region?.countries || []).map((country) => ({
      value: country.iso_2,
      label: country.display_name,
    }))

    // Keep Vietnam selectable in checkout even if cart starts in another region.
    const hasVietnam = regionOptions.some((option) => option.value === "vn")

    if (!hasVietnam) {
      regionOptions.push(VIETNAM_COUNTRY_OPTION)
    }

    return regionOptions
  }, [region])

  return (
    <NativeSelect
      ref={innerRef}
      placeholder={placeholder}
      defaultValue={defaultValue}
      {...props}
    >
      {countryOptions?.map(({ value, label }, index) => (
        <option key={index} value={value}>
          {label}
        </option>
      ))}
    </NativeSelect>
  )
})

CountrySelect.displayName = "CountrySelect"

export default CountrySelect
