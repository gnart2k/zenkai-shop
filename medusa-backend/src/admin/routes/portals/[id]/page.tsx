import { Badge, Container, Heading, Table, Text } from '@medusajs/ui';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { sdk } from '../../../lib/client';

type Catalog = {
  store: { id: string; name: string };
  products: {
    id: string;
    title: string;
    status: string;
    thumbnail: string | null;
    sku: string | null;
    price: number | null;
    currency_code: string | null;
    categories: { id: string; name: string }[];
  }[];
  categories: {
    id: string;
    name: string;
    handle: string;
    is_active: boolean;
    owned: boolean;
    product_count: number;
  }[];
};

type Tenant = { id: string; name: string; settings: { address: string | null } };

const money = (n: number | null, c: string | null) =>
  n === null ? '—' : `${new Intl.NumberFormat('vi-VN').format(n)} ${c?.toUpperCase() ?? ''}`;

/** One store's own products and categories (Medusa lists them all together; this is per store). */
const StorePage = () => {
  const storeId = window.location.pathname.split('/').filter(Boolean).pop() as string;
  const [tab, setTab] = useState<'products' | 'categories'>('products');
  const { data } = useQuery({
    queryKey: ['admin-portal-catalog', storeId],
    queryFn: () => sdk.client.fetch<Catalog>(`/admin/portal/stores/${storeId}/catalog`),
  });
  const { data: list } = useQuery({
    queryKey: ['admin-portal-tenants'],
    queryFn: () => sdk.client.fetch<{ stores: Tenant[] }>('/admin/portal/stores'),
  });
  const stores = list?.stores ?? [];
  const me = stores.find((s) => s.id === storeId);

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div>
          <a className="text-ui-fg-subtle text-xs underline" href="/app/portals">
            ← All stores
          </a>
          <Heading>{data?.store.name ?? 'Store'}</Heading>
          {me?.settings.address ? (
            <Text size="small" className="text-ui-fg-subtle">
              {me.settings.address}
            </Text>
          ) : null}
        </div>
        <label className="flex items-center gap-2 text-sm">
          Store
          <select
            className="bg-ui-bg-field border-ui-border-base h-8 rounded-md border px-2"
            value={storeId}
            onChange={(e) => window.location.assign(`/app/portals/${e.target.value}`)}
          >
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex gap-2 px-6 py-3">
        {(['products', 'categories'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1 text-sm ${tab === t ? 'bg-ui-bg-base-pressed font-medium' : 'text-ui-fg-subtle'}`}
          >
            {t === 'products'
              ? `Products (${data?.products.length ?? 0})`
              : `Categories (${data?.categories.length ?? 0})`}
          </button>
        ))}
      </div>

      <div className="px-2 pb-4">
        {tab === 'products' ? (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Product</Table.HeaderCell>
                <Table.HeaderCell>SKU</Table.HeaderCell>
                <Table.HeaderCell>Categories</Table.HeaderCell>
                <Table.HeaderCell>Price</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {(data?.products ?? []).map((p) => (
                <Table.Row key={p.id}>
                  <Table.Cell>
                    <a className="flex items-center gap-2 underline" href={`/app/products/${p.id}`}>
                      {p.thumbnail ? (
                        <img src={p.thumbnail} alt="" className="size-8 rounded object-cover" />
                      ) : null}
                      {p.title}
                    </a>
                  </Table.Cell>
                  <Table.Cell>{p.sku ?? '—'}</Table.Cell>
                  <Table.Cell>{p.categories.map((c) => c.name).join(', ') || '—'}</Table.Cell>
                  <Table.Cell>{money(p.price, p.currency_code)}</Table.Cell>
                  <Table.Cell>
                    <Badge size="2xsmall" color={p.status === 'published' ? 'green' : 'grey'}>
                      {p.status}
                    </Badge>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Category</Table.HeaderCell>
                <Table.HeaderCell>Handle</Table.HeaderCell>
                <Table.HeaderCell>Products in this store</Table.HeaderCell>
                <Table.HeaderCell>Created by</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {(data?.categories ?? []).map((c) => (
                <Table.Row key={c.id}>
                  <Table.Cell>
                    <a className="underline" href={`/app/categories/${c.id}`}>
                      {c.name}
                    </a>
                  </Table.Cell>
                  <Table.Cell>/{c.handle}</Table.Cell>
                  <Table.Cell>{c.product_count}</Table.Cell>
                  <Table.Cell>{c.owned ? 'This store' : 'Shared'}</Table.Cell>
                  <Table.Cell>
                    <Badge size="2xsmall" color={c.is_active ? 'green' : 'grey'}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </div>
    </Container>
  );
};

export default StorePage;
