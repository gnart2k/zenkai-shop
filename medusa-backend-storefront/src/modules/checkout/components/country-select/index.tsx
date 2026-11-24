import { forwardRef, useImperativeHandle, useMemo, useRef } from "react"

import NativeSelect, {
  NativeSelectProps,
} from "@modules/common/components/native-select"
import { HttpTypes } from "@medusajs/types"
import { useTranslations } from "next-intl"

const VIETNAM_COUNTRY_OPTION = {
  value: "vn",
  label: "Vietnam",
}


const CountrySelect = forwardRef<
  HTMLSelectElement,
  NativeSelectProps & {
    region?: HttpTypes.StoreRegion
  }
>(({ placeholder, region, defaultValue, ...props }, ref) => {
  const t = useTranslations("CheckoutFlowCountry")
  const resolvedPlaceholder = placeholder ?? t("placeholder")
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
      regionOptions.push({ ...VIETNAM_COUNTRY_OPTION, label: t("vietnam") })
    }

    return regionOptions
  }, [region, t])

  return (
    <NativeSelect
      ref={innerRef}
      placeholder={resolvedPlaceholder}
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
