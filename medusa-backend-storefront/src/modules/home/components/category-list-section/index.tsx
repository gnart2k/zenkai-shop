import { HttpTypes } from '@medusajs/types';
import { ChevronRight, LayoutGrid } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { getCategoryImages, listCategories } from '@lib/data/categories';
import { MOCK_CATEGORIES } from '@modules/home/data/home-mocks';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Link } from '@/i18n/navigation';

import { Reveal } from '../motion-primitives';

function rootCategories(
  categories: HttpTypes.StoreProductCategory[]
): HttpTypes.StoreProductCategory[] {
  return categories.filter((c) => !c.parent_category_id);
}

async function getCategoryImageUrls(categoryId: string) {
  const images = await getCategoryImages(categoryId);
  const mainImage = images.find((img) => img.type === 'image');
  const thumbnail = images.find((img) => img.type === 'thumbnail');
  return mainImage?.url || thumbnail?.url || null;
}

export default async function CategoryListSection({ countryCode }: { countryCode: string }) {
  const t = await getTranslations('Home');

  let categories: HttpTypes.StoreProductCategory[] = [];
  try {
    const fetched = await listCategories({ limit: 100 });
    categories = fetched ?? [];
  } catch {
    categories = [];
  }

  const roots = rootCategories(categories);
  const displayCategories = roots.length > 0 ? roots : categories;
  const useMock = displayCategories.length === 0;

  const categoriesWithImages = await Promise.all(
    displayCategories.map(async (c) => ({
      ...c,
      imageUrl: await getCategoryImageUrls(c.id),
    }))
  );

  const items = useMock
    ? MOCK_CATEGORIES.map((c) => ({
        key: c.id,
        name: c.name,
        description: c.description,
        href: `/${countryCode}/store`,
        imageUrl: null,
      }))
    : categoriesWithImages.map((c) => ({
        key: c.id,
        name: c.name,
        description: c.description?.trim() || t('categoryItemFallback'),
        href: `/${countryCode}/categories/${c.handle}`,
        imageUrl: (c as any).imageUrl,
      }));

  return (
    <section className="border-b border-border bg-background py-16 small:py-20">
      <div className="content-container">
        <Reveal className="flex flex-col gap-4 text-center small:flex-row small:items-end small:justify-between small:text-left">
          <div className="flex flex-col items-center gap-3 small:items-start">
            <Badge
              variant={useMock ? 'secondary' : 'outline'}
              className="w-fit gap-1.5 rounded-full"
            >
              <LayoutGrid className="size-3.5" aria-hidden />
              {useMock ? t('categoryEyebrowMock') : t('categoryEyebrowLive')}
            </Badge>
            <h2 className="font-serif text-3xl font-medium tracking-tight text-foreground small:text-4xl">
              {t('categoryTitle')}
            </h2>
            <p className="max-w-xl text-muted-foreground">
              {useMock ? t('categoryDescriptionMock') : t('categoryDescriptionLive')}
            </p>
          </div>
          <Link
            href={`/${countryCode}/store`}
            className="inline-flex shrink-0 items-center justify-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {t('viewFullCatalog')}
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        </Reveal>

        <Reveal className="mt-12" delay={0.08}>
          <ul className="flex flex-col gap-4 small:grid small:grid-cols-2 large:grid-cols-4">
            {items.map((item) => (
              <li key={item.key}>
                <Link href={item.href} className="group block h-full">
                  <Card
                    className={cn(
                      'h-full border-border/80 bg-card/80 shadow-sm transition-all duration-300',
                      'hover:border-primary/25 hover:shadow-md'
                    )}
                  >
                    {item.imageUrl && (
                      <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                    )}
                    <CardHeader className="flex flex-col gap-2">
                      <CardTitle className="font-serif text-lg leading-snug group-hover:text-primary">
                        {item.name}
                      </CardTitle>
                      <CardDescription className="line-clamp-3 text-sm leading-relaxed">
                        {item.description}
                      </CardDescription>
                      <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                        {t('exploreLink')}
                        <ChevronRight
                          className="size-3.5 transition-transform group-hover:translate-x-0.5"
                          aria-hidden
                        />
                      </span>
                    </CardHeader>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
