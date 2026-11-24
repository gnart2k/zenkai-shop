import { defineWidgetConfig } from '@medusajs/admin-sdk';
import { Container, Text } from '@medusajs/ui';
import { useQuery } from '@tanstack/react-query';
import { sdk } from '../lib/client';

/** Medusa lists products/categories of every store together; these links open one store's own view. */
const StoreLinks = () => {
  const { data } = useQuery({
    queryKey: ['admin-portal-tenants'],
    queryFn: () =>
      sdk.client.fetch<{ stores: { id: string; name: string }[] }>('/admin/portal/stores'),
  });
  const stores = data?.stores ?? [];
  if (stores.length < 2) return null;
  return (
    <Container className="flex flex-wrap items-center gap-2 px-6 py-3">
      <Text size="small" className="text-ui-fg-subtle">
        View one store only:
      </Text>
      {stores.map((s) => (
        <a
          key={s.id}
          href={`/app/portals/${s.id}`}
          className="bg-ui-bg-base hover:bg-ui-bg-base-hover border-ui-border-base rounded-md border px-2 py-1 text-xs"
        >
          {s.name}
        </a>
      ))}
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: ['product.list.before', 'product_category.list.before'],
});

export default StoreLinks;
