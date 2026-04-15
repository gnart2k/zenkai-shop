import { HttpTypes } from "@medusajs/types"
import Input from "@modules/common/components/input"
import { useParams } from "next/navigation"
import React, { useState } from "react"
import CountrySelect from "../country-select"
import GhnAddressPicker from "../ghn-address-picker"

const getAddressMetadataValue = (
  metadata: Record<string, unknown> | null | undefined,
  key: string
) => {
  const value = metadata?.[key]

  if (typeof value === "string") {
    return value
  }

  if (typeof value === "number") {
    return String(value)
  }

  return ""
}

type BillingAddressFormData = {
  "billing_address.first_name": string
  "billing_address.last_name": string
  "billing_address.address_1": string
  "billing_address.address_2": string
  "billing_address.company": string
  "billing_address.postal_code": string
  "billing_address.city": string
  "billing_address.country_code": string
  "billing_address.province": string
  "billing_address.phone": string
  "billing_address.metadata.ghn_province_id": string
  "billing_address.metadata.ghn_district_id": string
  "billing_address.metadata.ghn_ward_code": string
}

const BillingAddress = ({ cart }: { cart: HttpTypes.StoreCart | null }) => {
  const [formData, setFormData] = useState<BillingAddressFormData>({
    "billing_address.first_name": cart?.billing_address?.first_name || "",
    "billing_address.last_name": cart?.billing_address?.last_name || "",
    "billing_address.address_1": cart?.billing_address?.address_1 || "",
    "billing_address.address_2": cart?.billing_address?.address_2 || "",
    "billing_address.company": cart?.billing_address?.company || "",
    "billing_address.postal_code": cart?.billing_address?.postal_code || "",
    "billing_address.city": cart?.billing_address?.city || "",
    "billing_address.country_code": cart?.billing_address?.country_code || "",
    "billing_address.province": cart?.billing_address?.province || "",
    "billing_address.phone": cart?.billing_address?.phone || "",
    "billing_address.metadata.ghn_province_id": getAddressMetadataValue(
      cart?.billing_address?.metadata as Record<string, unknown> | null,
      "ghn_province_id"
    ),
    "billing_address.metadata.ghn_district_id": getAddressMetadataValue(
      cart?.billing_address?.metadata as Record<string, unknown> | null,
      "ghn_district_id"
    ),
    "billing_address.metadata.ghn_ward_code": getAddressMetadataValue(
      cart?.billing_address?.metadata as Record<string, unknown> | null,
      "ghn_ward_code"
    ),
  })
  const { locale } = useParams() as { locale?: string }
  const billingCountryCode = formData["billing_address.country_code"]?.toLowerCase()
  const isGhnBillingEnabled = locale === "vi" && billingCountryCode === "vn"

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const fieldName = e.target.name as keyof BillingAddressFormData
    setFormData((prevState) => ({
      ...prevState,
      [fieldName]: e.target.value,
    }))
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="First name"
          name="billing_address.first_name"
          autoComplete="given-name"
          value={formData["billing_address.first_name"]}
          onChange={handleChange}
          required
          data-testid="billing-first-name-input"
        />
        <Input
          label="Last name"
          name="billing_address.last_name"
          autoComplete="family-name"
          value={formData["billing_address.last_name"]}
          onChange={handleChange}
          required
          data-testid="billing-last-name-input"
        />
        <Input
          label="Address"
          name="billing_address.address_1"
          autoComplete="address-line1"
          value={formData["billing_address.address_1"]}
          onChange={handleChange}
          required
          data-testid="billing-address-input"
        />
        <Input
          label="Company"
          name="billing_address.company"
          value={formData["billing_address.company"]}
          onChange={handleChange}
          autoComplete="organization"
          data-testid="billing-company-input"
        />
        <Input
          label="Postal code"
          name="billing_address.postal_code"
          autoComplete="postal-code"
          value={formData["billing_address.postal_code"]}
          onChange={handleChange}
          required
          data-testid="billing-postal-input"
        />
        <CountrySelect
          name="billing_address.country_code"
          autoComplete="country"
          region={cart?.region}
          value={formData["billing_address.country_code"]}
          onChange={handleChange}
          required
          data-testid="billing-country-select"
        />
        {isGhnBillingEnabled ? (
          <>
            <GhnAddressPicker
              province={formData["billing_address.province"]}
              district={formData["billing_address.city"]}
              ward={formData["billing_address.address_2"]}
              provinceId={formData["billing_address.metadata.ghn_province_id"]}
              districtId={formData["billing_address.metadata.ghn_district_id"]}
              wardCode={formData["billing_address.metadata.ghn_ward_code"]}
              testIdPrefix="billing"
              onProvinceChange={(value) =>
                setFormData((prevState) => ({
                  ...prevState,
                  "billing_address.province": value,
                }))
              }
              onDistrictChange={(value) =>
                setFormData((prevState) => ({
                  ...prevState,
                  "billing_address.city": value,
                }))
              }
              onWardChange={(value) =>
                setFormData((prevState) => ({
                  ...prevState,
                  "billing_address.address_2": value,
                }))
              }
              onProvinceIdChange={(value) =>
                setFormData((prevState) => ({
                  ...prevState,
                  "billing_address.metadata.ghn_province_id": value,
                }))
              }
              onDistrictIdChange={(value) =>
                setFormData((prevState) => ({
                  ...prevState,
                  "billing_address.metadata.ghn_district_id": value,
                }))
              }
              onWardCodeChange={(value) =>
                setFormData((prevState) => ({
                  ...prevState,
                  "billing_address.metadata.ghn_ward_code": value,
                }))
              }
            />
            <input
              type="hidden"
              name="billing_address.city"
              value={formData["billing_address.city"]}
            />
            <input
              type="hidden"
              name="billing_address.province"
              value={formData["billing_address.province"]}
            />
            <input
              type="hidden"
              name="billing_address.address_2"
              value={formData["billing_address.address_2"]}
            />
            <input
              type="hidden"
              name="billing_address.metadata.ghn_province_id"
              value={formData["billing_address.metadata.ghn_province_id"]}
            />
            <input
              type="hidden"
              name="billing_address.metadata.ghn_district_id"
              value={formData["billing_address.metadata.ghn_district_id"]}
            />
            <input
              type="hidden"
              name="billing_address.metadata.ghn_ward_code"
              value={formData["billing_address.metadata.ghn_ward_code"]}
            />
          </>
        ) : (
          <>
            <Input
              label="City"
              name="billing_address.city"
              autoComplete="address-level2"
              value={formData["billing_address.city"]}
              onChange={handleChange}
              required
              data-testid="billing-city-input"
            />
            <Input
              label="State / Province"
              name="billing_address.province"
              autoComplete="address-level1"
              value={formData["billing_address.province"]}
              onChange={handleChange}
              data-testid="billing-province-input"
            />
          </>
        )}
        <div className="col-span-2">
          <Input
            label="Phone"
            name="billing_address.phone"
            autoComplete="tel"
            value={formData["billing_address.phone"]}
            onChange={handleChange}
            data-testid="billing-phone-input"
          />
        </div>
      </div>
    </>
  )
}

export default BillingAddress
