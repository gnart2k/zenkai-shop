"use client"

import NativeSelect from "@modules/common/components/native-select"
import { useEffect, useState } from "react"

type GhnProvince = {
  ProvinceID: number
  ProvinceName: string
}

type GhnDistrict = {
  DistrictID: number
  DistrictName: string
}

type GhnWard = {
  WardCode: string
  WardName: string
}

type GhnApiResponse<T> = {
  data?: T[]
  message?: string
}

type GhnAddressPickerProps = {
  province: string
  district: string
  ward: string
  provinceId?: string
  districtId?: string
  wardCode?: string
  onProvinceChange: (value: string) => void
  onDistrictChange: (value: string) => void
  onWardChange: (value: string) => void
  onProvinceIdChange?: (value: string) => void
  onDistrictIdChange?: (value: string) => void
  onWardCodeChange?: (value: string) => void
  testIdPrefix?: string
}

const normalizeName = (value: string) => value.trim().toLowerCase()

const fetchGhnData = async <T,>(path: string) => {
  const response = await fetch(path, { cache: "no-store" })
  const json = (await response.json()) as GhnApiResponse<T>

  if (!response.ok) {
    throw new Error(json.message || "Unable to load GHN data.")
  }

  return json.data || []
}

const sortByName = <T,>(items: T[], getName: (item: T) => string) =>
  [...items].sort((a, b) =>
    getName(a).localeCompare(getName(b), "vi", { sensitivity: "base" })
  )

const GhnAddressPicker = ({
  province,
  district,
  ward,
  provinceId,
  districtId,
  wardCode,
  onProvinceChange,
  onDistrictChange,
  onWardChange,
  onProvinceIdChange,
  onDistrictIdChange,
  onWardCodeChange,
  testIdPrefix = "shipping",
}: GhnAddressPickerProps) => {
  const [provinces, setProvinces] = useState<GhnProvince[]>([])
  const [districts, setDistricts] = useState<GhnDistrict[]>([])
  const [wards, setWards] = useState<GhnWard[]>([])

  const [selectedProvinceId, setSelectedProvinceId] = useState("")
  const [selectedDistrictId, setSelectedDistrictId] = useState("")
  const [selectedWardCode, setSelectedWardCode] = useState("")

  const [isLoadingProvinces, setIsLoadingProvinces] = useState(true)
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false)
  const [isLoadingWards, setIsLoadingWards] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadProvinces = async () => {
      setError(null)
      setIsLoadingProvinces(true)

      try {
        const data = await fetchGhnData<GhnProvince>("/api/ghn/provinces")

        if (!isMounted) {
          return
        }

        setProvinces(sortByName(data, (item) => item.ProvinceName))
        console.info("[GHN][address-picker] provinces loaded", {
          count: data.length,
        })
      } catch (fetchError) {
        if (!isMounted) {
          return
        }

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Unable to load provinces."
        )
      } finally {
        if (isMounted) {
          setIsLoadingProvinces(false)
        }
      }
    }

    loadProvinces()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (provinces.length === 0) {
      return
    }

    if (provinceId) {
      if (provinceId !== selectedProvinceId) {
        setSelectedProvinceId(provinceId)
      }
      return
    }

    if (!province) {
      if (selectedProvinceId) {
        setSelectedProvinceId("")
      }
      return
    }

    const selectedProvince = provinces.find(
      (item) => String(item.ProvinceID) === selectedProvinceId
    )

    if (
      selectedProvince &&
      normalizeName(selectedProvince.ProvinceName) === normalizeName(province)
    ) {
      return
    }

    const matchedProvince = provinces.find(
      (item) => normalizeName(item.ProvinceName) === normalizeName(province)
    )

    setSelectedProvinceId(matchedProvince ? String(matchedProvince.ProvinceID) : "")
  }, [province, provinceId, provinces, selectedProvinceId])

  useEffect(() => {
    if (!selectedProvinceId) {
      setDistricts([])
      setIsLoadingDistricts(false)
      return
    }

    let isMounted = true

    const loadDistricts = async () => {
      setError(null)
      setIsLoadingDistricts(true)

      try {
        const data = await fetchGhnData<GhnDistrict>(
          `/api/ghn/districts?province_id=${selectedProvinceId}`
        )

        if (!isMounted) {
          return
        }

        setDistricts(sortByName(data, (item) => item.DistrictName))
        console.info("[GHN][address-picker] districts loaded", {
          provinceId: selectedProvinceId,
          count: data.length,
        })
      } catch (fetchError) {
        if (!isMounted) {
          return
        }

        setDistricts([])
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Unable to load districts."
        )
      } finally {
        if (isMounted) {
          setIsLoadingDistricts(false)
        }
      }
    }

    loadDistricts()

    return () => {
      isMounted = false
    }
  }, [selectedProvinceId])

  useEffect(() => {
    if (districts.length === 0) {
      return
    }

    if (districtId) {
      if (districtId !== selectedDistrictId) {
        setSelectedDistrictId(districtId)
      }
      return
    }

    if (!district) {
      if (selectedDistrictId) {
        setSelectedDistrictId("")
      }
      return
    }

    const selectedDistrict = districts.find(
      (item) => String(item.DistrictID) === selectedDistrictId
    )

    if (
      selectedDistrict &&
      normalizeName(selectedDistrict.DistrictName) === normalizeName(district)
    ) {
      return
    }

    const matchedDistrict = districts.find(
      (item) => normalizeName(item.DistrictName) === normalizeName(district)
    )

    setSelectedDistrictId(matchedDistrict ? String(matchedDistrict.DistrictID) : "")
  }, [district, districtId, districts, selectedDistrictId])

  useEffect(() => {
    if (!selectedDistrictId) {
      setWards([])
      setIsLoadingWards(false)
      return
    }

    let isMounted = true

    const loadWards = async () => {
      setError(null)
      setIsLoadingWards(true)

      try {
        const data = await fetchGhnData<GhnWard>(
          `/api/ghn/wards?district_id=${selectedDistrictId}`
        )

        if (!isMounted) {
          return
        }

        setWards(sortByName(data, (item) => item.WardName))
        console.info("[GHN][address-picker] wards loaded", {
          districtId: selectedDistrictId,
          count: data.length,
        })
      } catch (fetchError) {
        if (!isMounted) {
          return
        }

        setWards([])
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Unable to load wards."
        )
      } finally {
        if (isMounted) {
          setIsLoadingWards(false)
        }
      }
    }

    loadWards()

    return () => {
      isMounted = false
    }
  }, [selectedDistrictId])

  useEffect(() => {
    if (wards.length === 0) {
      return
    }

    if (wardCode) {
      if (wardCode !== selectedWardCode) {
        setSelectedWardCode(wardCode)
      }
      return
    }

    if (!ward) {
      if (selectedWardCode) {
        setSelectedWardCode("")
      }
      return
    }

    const selectedWard = wards.find((item) => item.WardCode === selectedWardCode)

    if (selectedWard && normalizeName(selectedWard.WardName) === normalizeName(ward)) {
      return
    }

    const matchedWard = wards.find(
      (item) => normalizeName(item.WardName) === normalizeName(ward)
    )

    setSelectedWardCode(matchedWard ? matchedWard.WardCode : "")
  }, [ward, wardCode, wards, selectedWardCode])

  const handleProvinceChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const nextProvinceId = event.target.value
    const selectedProvince = provinces.find(
      (item) => String(item.ProvinceID) === nextProvinceId
    )

    setSelectedProvinceId(nextProvinceId)
    setSelectedDistrictId("")
    setSelectedWardCode("")
    setDistricts([])
    setWards([])

    onProvinceIdChange?.(nextProvinceId)
    onDistrictIdChange?.("")
    onWardCodeChange?.("")
    console.info("[GHN][address-picker] province changed", {
      provinceId: nextProvinceId,
      provinceName: selectedProvince?.ProvinceName || null,
    })
    onProvinceChange(selectedProvince?.ProvinceName || "")
    onDistrictChange("")
    onWardChange("")
  }

  const handleDistrictChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const nextDistrictId = event.target.value
    const selectedDistrict = districts.find(
      (item) => String(item.DistrictID) === nextDistrictId
    )

    setSelectedDistrictId(nextDistrictId)
    setSelectedWardCode("")
    setWards([])

    onDistrictIdChange?.(nextDistrictId)
    onWardCodeChange?.("")
    console.info("[GHN][address-picker] district changed", {
      districtId: nextDistrictId,
      districtName: selectedDistrict?.DistrictName || null,
    })
    onDistrictChange(selectedDistrict?.DistrictName || "")
    onWardChange("")
  }

  const handleWardChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextWardCode = event.target.value
    const selectedWard = wards.find((item) => item.WardCode === nextWardCode)

    setSelectedWardCode(nextWardCode)
    onWardCodeChange?.(nextWardCode)
    console.info("[GHN][address-picker] ward changed", {
      wardCode: nextWardCode,
      wardName: selectedWard?.WardName || null,
    })
    onWardChange(selectedWard?.WardName || "")
  }

  return (
    <div className="col-span-2">
      <div className="grid grid-cols-1 small:grid-cols-3 gap-4">
        <div className="flex flex-col gap-y-2">
          <span className="txt-compact-medium-plus text-ui-fg-base">
            Province / City
          </span>
          <NativeSelect
            value={selectedProvinceId}
            onChange={handleProvinceChange}
            placeholder={isLoadingProvinces ? "Loading provinces..." : "Province"}
            disabled={isLoadingProvinces}
            required
            data-testid={`${testIdPrefix}-ghn-province-select`}
          >
            {provinces.map((item) => (
              <option key={item.ProvinceID} value={item.ProvinceID}>
                {item.ProvinceName}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="flex flex-col gap-y-2">
          <span className="txt-compact-medium-plus text-ui-fg-base">
            District
          </span>
          <NativeSelect
            value={selectedDistrictId}
            onChange={handleDistrictChange}
            placeholder={isLoadingDistricts ? "Loading districts..." : "District"}
            disabled={!selectedProvinceId || isLoadingDistricts}
            required
            data-testid={`${testIdPrefix}-ghn-district-select`}
          >
            {districts.map((item) => (
              <option key={item.DistrictID} value={item.DistrictID}>
                {item.DistrictName}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="flex flex-col gap-y-2">
          <span className="txt-compact-medium-plus text-ui-fg-base">Ward</span>
          <NativeSelect
            value={selectedWardCode}
            onChange={handleWardChange}
            placeholder={isLoadingWards ? "Loading wards..." : "Ward"}
            disabled={!selectedDistrictId || isLoadingWards}
            required
            data-testid={`${testIdPrefix}-ghn-ward-select`}
          >
            {wards.map((item) => (
              <option key={item.WardCode} value={item.WardCode}>
                {item.WardName}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      {error && <p className="mt-2 text-small-regular text-rose-500">{error}</p>}
    </div>
  )
}

export default GhnAddressPicker
