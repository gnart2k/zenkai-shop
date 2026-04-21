import { defineRouteConfig } from '@medusajs/admin-sdk';
import { TruckFast } from '@medusajs/icons';
import { Button, Container, Heading, Table, Text } from '@medusajs/ui';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { WarehouseAddressDrawer } from '../../../components/settings-shipping/warehouse-address-drawer';
import { sdk } from '../../../lib/client';

const ShippingSettingsPage = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editLocationId, setEditLocationId] = useState<string | null>(null);

  const { data: locationsRes, isLoading: loadingLocations } = useQuery({
    queryKey: ['admin-settings-shipping-locations'],
    queryFn: () =>
      sdk.admin.stockLocation.list({
        limit: 100,
        offset: 0,
        fields: 'id,name,*address',
      }),
  });

  const { data: optionsRes, isLoading: loadingOptions } = useQuery({
    queryKey: ['admin-settings-shipping-options'],
    queryFn: () =>
      sdk.admin.shippingOption.list({
        limit: 100,
        offset: 0,
        fields: 'id,name,provider_id,*service_zone,*type',
      }),
  });

  const locations = locationsRes?.stock_locations ?? [];
  const shippingOptions = optionsRes?.shipping_options ?? [];

  const openEdit = (id: string) => {
    setEditLocationId(id);
    setDrawerOpen(true);
  };

  const onDrawerOpenChange = (open: boolean) => {
    setDrawerOpen(open);
    if (!open) {
      setEditLocationId(null);
    }
  };

  return (
    <div className="flex flex-col gap-y-6 px-6 py-4">
      <div className="flex flex-col gap-y-1">
        <Heading level="h1">Shipping</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Warehouse addresses for fulfillment (Vietnam uses GHN province, district, and ward codes).
          Shipping methods are listed for reference; edit them under each location&apos;s
          fulfillment settings if needed.
        </Text>
      </div>

      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Text size="small" leading="compact" weight="plus" className="text-ui-fg-base">
            Warehouses
          </Text>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            Stock locations used as ship-from addresses. Vietnam addresses store GHN metadata on the
            address for rate calculation and checkout.
          </Text>
        </div>
        <div className="overflow-x-auto px-6 py-4">
          {loadingLocations ? (
            <Text size="small" className="text-ui-fg-subtle">
              Loading warehouses…
            </Text>
          ) : locations.length === 0 ? (
            <Text size="small" className="text-ui-fg-subtle">
              No stock locations found. Create one under Settings → Locations.
            </Text>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Name</Table.HeaderCell>
                  <Table.HeaderCell>Country</Table.HeaderCell>
                  <Table.HeaderCell>Address</Table.HeaderCell>
                  <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {locations.map((loc) => {
                  const addr = loc.address;
                  const meta = addr?.metadata as Record<string, unknown> | undefined;
                  const ghn =
                    addr?.country_code?.toLowerCase() === 'vn' &&
                    meta &&
                    typeof meta.ghn_ward_name === 'string'
                      ? `${meta.ghn_district_name ? `${String(meta.ghn_district_name)} · ` : ''}${String(meta.ghn_ward_name)}`
                      : null;
                  return (
                    <Table.Row key={loc.id}>
                      <Table.Cell>
                        <Text size="small">{loc.name}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text size="small">{(addr?.country_code || '—').toUpperCase()}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text size="small" className="text-ui-fg-subtle">
                          {addr?.address_1 || '—'}
                          {ghn ? ` · ${ghn}` : ''}
                        </Text>
                      </Table.Cell>
                      <Table.Cell className="text-right">
                        <Button
                          size="small"
                          variant="secondary"
                          type="button"
                          onClick={() => openEdit(loc.id)}
                        >
                          Edit address
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table>
          )}
        </div>
      </Container>

      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Text size="small" leading="compact" weight="plus" className="text-ui-fg-base">
            Shipping methods
          </Text>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            Options exposed at checkout. Provider IDs reference your fulfillment configuration (for
            example GHN vs manual).
          </Text>
        </div>
        <div className="overflow-x-auto px-6 py-4">
          {loadingOptions ? (
            <Text size="small" className="text-ui-fg-subtle">
              Loading shipping options…
            </Text>
          ) : shippingOptions.length === 0 ? (
            <Text size="small" className="text-ui-fg-subtle">
              No shipping options found.
            </Text>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Name</Table.HeaderCell>
                  <Table.HeaderCell>Provider</Table.HeaderCell>
                  <Table.HeaderCell>Service zone</Table.HeaderCell>
                  <Table.HeaderCell>Type</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {shippingOptions.map((opt) => (
                  <Table.Row key={opt.id}>
                    <Table.Cell>
                      <Text size="small">{opt.name}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small" className="font-mono text-ui-fg-subtle">
                        {opt.provider_id}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small" className="text-ui-fg-subtle">
                        {opt.service_zone?.name ?? '—'}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small" className="text-ui-fg-subtle">
                        {opt.type?.label ?? opt.type?.code ?? '—'}
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          )}
        </div>
      </Container>

      <WarehouseAddressDrawer
        locationId={editLocationId}
        open={drawerOpen}
        onOpenChange={onDrawerOpenChange}
      />
    </div>
  );
};

export const config = defineRouteConfig({
  label: 'Shipping',
  icon: TruckFast,
  rank: 12,
});

export default ShippingSettingsPage;
