import { HttpTypes } from '@medusajs/types';
import { Button, Drawer, Input, Label, Select, Text, toast } from '@medusajs/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { sdk } from '../../lib/client';

type WarehouseAddressDrawerProps = {
  locationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type GhnAddressMetadata = {
  ghn_province_id?: number;
  ghn_province_name?: string;
  ghn_district_id?: number;
  ghn_district_name?: string;
  ghn_ward_code?: string;
  ghn_ward_name?: string;
};

function readGhnMeta(metadata: Record<string, unknown> | null | undefined): GhnAddressMetadata {
  if (!metadata || typeof metadata !== 'object') {
    return {};
  }
  const m = metadata as Record<string, unknown>;
  return {
    ghn_province_id: typeof m.ghn_province_id === 'number' ? m.ghn_province_id : undefined,
    ghn_province_name: typeof m.ghn_province_name === 'string' ? m.ghn_province_name : undefined,
    ghn_district_id: typeof m.ghn_district_id === 'number' ? m.ghn_district_id : undefined,
    ghn_district_name: typeof m.ghn_district_name === 'string' ? m.ghn_district_name : undefined,
    ghn_ward_code:
      typeof m.ghn_ward_code === 'string'
        ? m.ghn_ward_code
        : typeof m.ghn_ward_code === 'number'
          ? String(m.ghn_ward_code)
          : undefined,
    ghn_ward_name: typeof m.ghn_ward_name === 'string' ? m.ghn_ward_name : undefined,
  };
}

export function WarehouseAddressDrawer({
  locationId,
  open,
  onOpenChange,
}: WarehouseAddressDrawerProps) {
  const queryClient = useQueryClient();
  const [countryMode, setCountryMode] = useState<'vn' | 'other'>('vn');
  const [otherCountryCode, setOtherCountryCode] = useState('');
  const [name, setName] = useState('');
  const [address1, setAddress1] = useState('');
  const [phone, setPhone] = useState('');
  const [cityFree, setCityFree] = useState('');
  const [provinceId, setProvinceId] = useState<string>('');
  const [districtId, setDistrictId] = useState<string>('');
  const [wardCode, setWardCode] = useState<string>('');

  const { data: locationRes, isLoading: loadingLocation } = useQuery({
    queryKey: ['settings-shipping-stock-location', locationId],
    queryFn: async () => {
      const res = await sdk.admin.stockLocation.retrieve(locationId!, {
        fields: '+address',
      });
      return res.stock_location;
    },
    enabled: open && Boolean(locationId),
  });

  const location = locationRes as HttpTypes.AdminStockLocation | undefined;

  useEffect(() => {
    if (!location) {
      return;
    }
    setName(location.name || '');
    const addr = location.address;
    const cc = (addr?.country_code || '').toLowerCase();
    if (cc === 'vn') {
      setCountryMode('vn');
    } else if (cc) {
      setCountryMode('other');
      setOtherCountryCode(cc);
    } else {
      setCountryMode('vn');
    }
    setAddress1(addr?.address_1 || '');
    setPhone(addr?.phone || '');
    setCityFree(addr?.city || '');
    const meta = readGhnMeta(addr?.metadata as Record<string, unknown> | undefined);
    setProvinceId(meta.ghn_province_id !== undefined ? String(meta.ghn_province_id) : '');
    setDistrictId(meta.ghn_district_id !== undefined ? String(meta.ghn_district_id) : '');
    setWardCode(meta.ghn_ward_code || '');
  }, [location]);

  const { data: provincesRes, isLoading: loadingProvinces } = useQuery({
    queryKey: ['ghn-master-provinces'],
    queryFn: async () => {
      return sdk.client.fetch<{ provinces: { ProvinceID: number; ProvinceName: string }[] }>(
        '/admin/shipping/ghn/provinces'
      );
    },
    enabled: open && countryMode === 'vn',
  });

  const provinces = provincesRes?.provinces ?? [];

  const selectedProvinceId = provinceId ? Number(provinceId) : undefined;

  const { data: districtsRes, isLoading: loadingDistricts } = useQuery({
    queryKey: ['ghn-master-districts', selectedProvinceId],
    queryFn: async () => {
      return sdk.client.fetch<{
        districts: { DistrictID: number; DistrictName: string }[];
      }>(`/admin/shipping/ghn/districts?province_id=${selectedProvinceId}`);
    },
    enabled: open && countryMode === 'vn' && Boolean(selectedProvinceId),
  });

  const districts = districtsRes?.districts ?? [];

  const selectedDistrictId = districtId ? Number(districtId) : undefined;

  const { data: wardsRes, isLoading: loadingWards } = useQuery({
    queryKey: ['ghn-master-wards', selectedDistrictId],
    queryFn: async () => {
      return sdk.client.fetch<{
        wards: { WardCode: number | string; WardName: string }[];
      }>('/admin/shipping/ghn/wards', {
        method: 'POST',
        body: { district_id: selectedDistrictId },
      });
    },
    enabled: open && countryMode === 'vn' && Boolean(selectedDistrictId),
  });

  const wards = wardsRes?.wards ?? [];

  const provinceName = useMemo(() => {
    const p = provinces.find((x) => String(x.ProvinceID) === provinceId);
    return p?.ProvinceName ?? '';
  }, [provinces, provinceId]);

  const districtName = useMemo(() => {
    const d = districts.find((x) => String(x.DistrictID) === districtId);
    return d?.DistrictName ?? '';
  }, [districts, districtId]);

  const wardName = useMemo(() => {
    const w = wards.find((x) => String(x.WardCode) === String(wardCode));
    return w?.WardName ?? '';
  }, [wards, wardCode]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!locationId) {
        return;
      }
      const country_code = countryMode === 'vn' ? 'vn' : otherCountryCode.trim().toLowerCase();
      if (country_code.length !== 2) {
        throw new Error('Country code must be exactly 2 letters (ISO 3166-1).');
      }
      if (countryMode === 'vn') {
        if (!selectedProvinceId || !selectedDistrictId || !wardCode) {
          throw new Error('Select province, district, and ward for Vietnam warehouse addresses.');
        }
      }

      const cityValue =
        countryMode === 'vn'
          ? [districtName, wardName].filter(Boolean).join(', ') || cityFree
          : cityFree;

      const ghnMetadata: Record<string, string | number> =
        countryMode === 'vn'
          ? {
              ghn_province_id: selectedProvinceId!,
              ghn_province_name: provinceName,
              ghn_district_id: selectedDistrictId!,
              ghn_district_name: districtName,
              ghn_ward_code: wardCode,
              ghn_ward_name: wardName,
            }
          : {};

      await sdk.admin.stockLocation.update(locationId, {
        name,
        address: {
          address_1: address1,
          country_code,
          city: cityValue || undefined,
          phone: phone || undefined,
          metadata: countryMode === 'vn' ? ghnMetadata : {},
        },
      });
    },
    onSuccess: () => {
      toast.success('Warehouse address saved.');
      queryClient.invalidateQueries({
        queryKey: ['admin-settings-shipping-locations'],
      });
      queryClient.invalidateQueries({
        queryKey: ['settings-shipping-stock-location', locationId],
      });
      onOpenChange(false);
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Failed to save warehouse.');
    },
  });

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <Drawer.Content className="flex max-w-lg flex-1 flex-col">
        <Drawer.Header>
          <Drawer.Title>Warehouse address</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex max-w-full flex-1 flex-col gap-y-4 overflow-y-auto px-6 py-4">
          {loadingLocation ? (
            <Text size="small" className="text-ui-fg-subtle">
              Loading…
            </Text>
          ) : (
            <>
              <div className="flex flex-col gap-y-2">
                <Label size="small">Name</Label>
                <Input size="small" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-y-2">
                <Label size="small">Country</Label>
                <Select
                  value={countryMode}
                  onValueChange={(v) => {
                    const next = v as 'vn' | 'other';
                    setCountryMode(next);
                    if (next === 'other') {
                      setProvinceId('');
                      setDistrictId('');
                      setWardCode('');
                    }
                  }}
                >
                  <Select.Trigger size="small">
                    <Select.Value placeholder="Country" />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="vn">Vietnam (GHN)</Select.Item>
                    <Select.Item value="other">Other</Select.Item>
                  </Select.Content>
                </Select>
              </div>
              {countryMode === 'other' ? (
                <div className="flex flex-col gap-y-2">
                  <Label size="small">Country code (ISO 3166-1 alpha-2)</Label>
                  <Input
                    size="small"
                    value={otherCountryCode}
                    onChange={(e) => setOtherCountryCode(e.target.value.toUpperCase())}
                    maxLength={2}
                  />
                  <Text size="small" className="text-ui-fg-subtle">
                    Use a 2-letter code (for example DE, US). GHN address fields apply only to
                    Vietnam.
                  </Text>
                </div>
              ) : null}
              <div className="flex flex-col gap-y-2">
                <Label size="small">Street address</Label>
                <Input
                  size="small"
                  value={address1}
                  onChange={(e) => setAddress1(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-y-2">
                <Label size="small">Phone</Label>
                <Input size="small" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              {countryMode === 'vn' ? (
                <>
                  <div className="flex flex-col gap-y-2">
                    <Label size="small">Province / City (GHN)</Label>
                    <Select
                      value={provinceId || undefined}
                      onValueChange={(v) => {
                        setProvinceId(v);
                        setDistrictId('');
                        setWardCode('');
                      }}
                      disabled={loadingProvinces}
                    >
                      <Select.Trigger size="small">
                        <Select.Value
                          placeholder={loadingProvinces ? 'Loading provinces…' : 'Select'}
                        />
                      </Select.Trigger>
                      <Select.Content className="max-h-60">
                        {provinces.map((p) => (
                          <Select.Item key={p.ProvinceID} value={String(p.ProvinceID)}>
                            {p.ProvinceName}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-y-2">
                    <Label size="small">District</Label>
                    <Select
                      value={districtId || undefined}
                      onValueChange={(v) => {
                        setDistrictId(v);
                        setWardCode('');
                      }}
                      disabled={!provinceId || loadingDistricts}
                    >
                      <Select.Trigger size="small">
                        <Select.Value
                          placeholder={
                            !provinceId
                              ? 'Select province first'
                              : loadingDistricts
                                ? 'Loading…'
                                : 'Select'
                          }
                        />
                      </Select.Trigger>
                      <Select.Content className="max-h-60">
                        {districts.map((d) => (
                          <Select.Item key={d.DistrictID} value={String(d.DistrictID)}>
                            {d.DistrictName}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-y-2">
                    <Label size="small">Ward</Label>
                    <Select
                      value={wardCode || undefined}
                      onValueChange={setWardCode}
                      disabled={!districtId || loadingWards}
                    >
                      <Select.Trigger size="small">
                        <Select.Value
                          placeholder={
                            !districtId
                              ? 'Select district first'
                              : loadingWards
                                ? 'Loading…'
                                : 'Select'
                          }
                        />
                      </Select.Trigger>
                      <Select.Content className="max-h-60">
                        {wards.map((w) => (
                          <Select.Item key={String(w.WardCode)} value={String(w.WardCode)}>
                            {w.WardName}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-y-2">
                  <Label size="small">City</Label>
                  <Input
                    size="small"
                    value={cityFree}
                    onChange={(e) => setCityFree(e.target.value)}
                  />
                </div>
              )}
            </>
          )}
        </Drawer.Body>
        <Drawer.Footer className="flex items-center justify-end gap-2">
          <Button
            size="small"
            variant="secondary"
            type="button"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="small"
            type="button"
            isLoading={updateMutation.isPending}
            disabled={loadingLocation || !locationId}
            onClick={() => updateMutation.mutate()}
          >
            Save
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
}
