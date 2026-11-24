import { sdk } from '@lib/config';
import { HttpTypes } from '@medusajs/types';
import { getCacheOptions } from './cookies';

export type CategoryImage = {
  id: string;
  url: string;
  file_id: string | null;
  type: 'thumbnail' | 'image';
  category_id: string;
};

export const getCategoryImages = async (categoryId: string) => {
  const next = {
    ...(await getCacheOptions('categories')),
  };

  try {
    const response = await sdk.client.fetch<{ images: CategoryImage[] }>(
      `/store/product-categories/${categoryId}/images`,
      {
        next,
        cache: 'force-cache',
      }
    );
    return response.images || [];
  } catch {
    return [];
  }
};

/** Category ids that hold products of THIS store (categories are shared across stores in Medusa). */
const getVisibleCategoryIds = async (): Promise<Set<string> | null> => {
  try {
    const { category_ids } = await sdk.client.fetch<{ category_ids: string[] | null }>(
      '/store/visible-categories',
      { next: { tags: ['categories'], revalidate: 60 } }
    );
    return category_ids ? new Set(category_ids) : null;
  } catch {
    return null;
  }
};

export const listCategories = async (query?: Record<string, any>) => {
  const next = {
    ...(await getCacheOptions('categories')),
  };

  const limit = query?.limit || 100;

  return sdk.client
    .fetch<{ product_categories: HttpTypes.StoreProductCategory[] }>('/store/product-categories', {
      query: {
        fields: '*category_children, *products, *parent_category, *parent_category.parent_category',
        limit,
        ...query,
      },
      next,
      cache: 'force-cache',
    })
    .then(async ({ product_categories }) => {
      const visible = await getVisibleCategoryIds();
      if (!visible) return product_categories;
      const keep = (c: HttpTypes.StoreProductCategory) => visible.has(c.id);
      return product_categories.filter(keep).map((c) => ({
        ...c,
        category_children: (c.category_children ?? []).filter(keep),
      }));
    });
};

export const getCategoryByHandle = async (categoryHandle: string[]) => {
  const handle = `${categoryHandle.join('/')}`;

  const next = {
    ...(await getCacheOptions('categories')),
  };

  return sdk.client
    .fetch<HttpTypes.StoreProductCategoryListResponse>(`/store/product-categories`, {
      query: {
        fields: '*category_children, *products',
        handle,
      },
      next,
      cache: 'force-cache',
    })
    .then(({ product_categories }) => product_categories[0]);
};
