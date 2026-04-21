import type { AdminProduct, DetailWidgetProps } from '@medusajs/types';
import { Container, Label, Switch, Text, toast } from '@medusajs/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { sdk } from '../lib/client';

function readIsPhysical(metadata: Record<string, unknown> | null | undefined): boolean {
  if (!metadata || typeof metadata !== 'object') {
    return true;
  }
  const v = metadata.is_physical;
  if (v === false) {
    return false;
  }
  if (v === 'false') {
    return false;
  }
  return true;
}

const ProductPhysicalWidget = ({ data: product }: DetailWidgetProps<AdminProduct>) => {
  const queryClient = useQueryClient();

  const [isPhysical, setIsPhysical] = useState(() =>
    readIsPhysical(product.metadata as Record<string, unknown> | undefined)
  );

  useEffect(() => {
    setIsPhysical(readIsPhysical(product.metadata as Record<string, unknown> | undefined));
  }, [product.metadata]);

  const mutation = useMutation({
    mutationFn: async (physical: boolean) => {
      const prevMeta =
        product.metadata && typeof product.metadata === 'object'
          ? (product.metadata as Record<string, unknown>)
          : {};
      await sdk.admin.product.update(product.id, {
        metadata: {
          ...prevMeta,
          is_physical: physical,
        },
      });

      // Digital products should always be purchasable regardless of inventory/location.
      if (!physical) {
        const variants: { id: string }[] = [];
        let offset = 0;
        const limit = 100;

        while (true) {
          const res = await sdk.admin.product.listVariants(product.id, {
            fields: 'id',
            limit,
            offset,
          });
          variants.push(...(res.variants ?? []));
          if (!res.variants?.length || res.variants.length < limit) {
            break;
          }
          offset += limit;
        }

        await Promise.all(
          variants.map((variant) =>
            sdk.admin.product.updateVariant(product.id, variant.id, {
              manage_inventory: false,
              allow_backorder: true,
            })
          )
        );
      }
    },
    onSuccess: () => {
      toast.success('Product fulfillment setting saved.');
      void queryClient.invalidateQueries({ queryKey: ['products', product.id] });
      void queryClient.invalidateQueries({ queryKey: ['product', product.id] });
    },
    onError: (e: Error) => {
      setIsPhysical(readIsPhysical(product.metadata as Record<string, unknown> | undefined));
      toast.error(e.message || 'Failed to save.');
    },
  });

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col gap-y-2 px-6 py-4">
        <Text size="small" weight="plus" leading="compact">
          Fulfillment
        </Text>
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          Physical products require shipping. Turn off for digital goods — checkout will skip the
          delivery step when the cart only contains digital products.
        </Text>
        <div className="mt-3 flex items-center justify-between gap-4">
          <Label htmlFor="product-is-physical" className="cursor-pointer">
            Physical product (requires shipping)
          </Label>
          <Switch
            id="product-is-physical"
            checked={isPhysical}
            disabled={mutation.isPending}
            onCheckedChange={(checked) => {
              setIsPhysical(checked);
              mutation.mutate(checked);
            }}
          />
        </div>
      </div>
    </Container>
  );
};

export default ProductPhysicalWidget;
