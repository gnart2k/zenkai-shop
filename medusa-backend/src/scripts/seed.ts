import { CreateInventoryLevelInput, ExecArgs } from '@medusajs/framework/types';
import { ContainerRegistrationKeys, Modules, ProductStatus } from '@medusajs/framework/utils';
import {
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
} from '@medusajs/medusa/core-flows';
import { ApiKey } from '../../.medusa/types/query-entry-points';

export default async function seedDemoData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const storeModuleService = container.resolve(Modules.STORE);
  const regionModuleService = container.resolve(Modules.REGION);
  const taxModuleService = container.resolve(Modules.TAX);
  const productModuleService = container.resolve(Modules.PRODUCT);
  const stockLocationModuleService = container.resolve(Modules.STOCK_LOCATION);

  const europeCountries = ['gb', 'de', 'dk', 'se', 'fr', 'es', 'it'];
  const vietnamCountries = ['vn'];
  const shippingCountries = [...europeCountries, ...vietnamCountries];
  const manualProviderId = 'manual_manual';
  const ghnProviderId = 'ghn_ghn';
  const ghnToken = process.env.GHN_API_TOKEN || process.env.GHN_API_KEY;
  const ghnShopId = process.env.GHN_SHOP_ID || process.env.GHN_SHOPID;
  const ghnFromDistrictId =
    process.env.GHN_FROM_DISTRICT_ID || process.env.GHN_FROM_DISTRICT;
  const isGhnReadyForRateCalculation = Boolean(
    ghnToken && ghnShopId && ghnFromDistrictId
  );
  const manualShippingCountries = isGhnReadyForRateCalculation
    ? [...europeCountries]
    : [...shippingCountries];
  const ghnShippingCountries = [...vietnamCountries];

  logger.info('Seeding store data...');
  const [store] = await storeModuleService.listStores();
  let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
    name: 'Default Sales Channel',
  });

  if (!defaultSalesChannel.length) {
    // create the default sales channel
    const { result: salesChannelResult } = await createSalesChannelsWorkflow(container).run({
      input: {
        salesChannelsData: [
          {
            name: 'Default Sales Channel',
          },
        ],
      },
    });
    defaultSalesChannel = salesChannelResult;
  }

  // Use core updateStoresWorkflow (not updateStoresStep alone) so price preferences
  // are created per currency — same path as Admin API / store settings.
  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        supported_currencies: [
          { currency_code: 'eur', is_default: true },
          { currency_code: 'usd', is_default: false },
          { currency_code: 'vnd', is_default: false },
        ],
        default_sales_channel_id: defaultSalesChannel[0].id,
      },
    },
  });
  logger.info('Seeding region data...');
  const existingRegions = await regionModuleService.listRegions(
    {},
    { relations: ['countries'], take: 100 }
  );

  const findEuropeRegion = () =>
    existingRegions.find((r) => r.name === 'Europe') ??
    existingRegions.find((r) => r.currency_code?.toLowerCase() === 'eur');

  const findVietnamRegion = () =>
    existingRegions.find((r) => r.name === 'Vietnam') ??
    existingRegions.find((r) => r.currency_code?.toLowerCase() === 'vnd') ??
    existingRegions.find((r) => r.countries?.some((c) => c.iso_2?.toLowerCase() === 'vn'));

  let europeRegion = findEuropeRegion();
  let vietnamRegion = findVietnamRegion();

  const regionsToCreate: {
    name: string;
    currency_code: string;
    countries: string[];
    payment_providers: string[];
  }[] = [];

  if (!europeRegion) {
    regionsToCreate.push({
      name: 'Europe',
      currency_code: 'eur',
      countries: europeCountries,
      payment_providers: ['pp_system_default'],
    });
  }
  if (!vietnamRegion) {
    regionsToCreate.push({
      name: 'Vietnam',
      currency_code: 'vnd',
      countries: vietnamCountries,
      payment_providers: ['pp_system_default'],
    });
  }

  if (regionsToCreate.length) {
    const { result: createdRegions } = await createRegionsWorkflow(container).run({
      input: { regions: regionsToCreate },
    });
    for (const r of createdRegions) {
      if (r.currency_code?.toLowerCase() === 'eur') {
        europeRegion = r;
      }
      if (r.currency_code?.toLowerCase() === 'vnd') {
        vietnamRegion = r;
      }
    }
  }

  if (!europeRegion || !vietnamRegion) {
    throw new Error(
      'Could not resolve Europe (EUR) and Vietnam (VND) regions. Create or rename regions in Admin, then re-run seed.'
    );
  }

  if (europeRegion.currency_code?.toLowerCase() !== 'eur') {
    europeRegion = await regionModuleService.updateRegions(europeRegion.id, {
      currency_code: 'eur',
    });
  }

  if (vietnamRegion.currency_code?.toLowerCase() !== 'vnd') {
    vietnamRegion = await regionModuleService.updateRegions(vietnamRegion.id, {
      currency_code: 'vnd',
    });
  }

  const manualShippingRegionPrices = isGhnReadyForRateCalculation
    ? [{ region_id: europeRegion.id, amount: 10 }]
    : europeRegion.id === vietnamRegion.id
      ? [{ region_id: europeRegion.id, amount: 10 }]
      : [
          { region_id: europeRegion.id, amount: 10 },
          { region_id: vietnamRegion.id, amount: 30000 },
        ];

  logger.info('Finished seeding regions.');

  logger.info('Seeding tax regions...');
  const existingTaxRegions = await taxModuleService.listTaxRegions({}, { take: 500 });
  const existingTaxCountryCodes = new Set(
    existingTaxRegions.map((tr) => tr.country_code.toLowerCase())
  );
  const taxRegionsToCreate = shippingCountries.filter(
    (code) => !existingTaxCountryCodes.has(code.toLowerCase())
  );
  if (taxRegionsToCreate.length) {
    await createTaxRegionsWorkflow(container).run({
      input: taxRegionsToCreate.map((country_code) => ({
        country_code,
        provider_id: 'tp_system',
      })),
    });
  }
  logger.info('Finished seeding tax regions.');

  logger.info('Seeding stock location data...');
  const stockLocationName = 'European Warehouse';
  const stockLocationList = await stockLocationModuleService.listStockLocations(
    { name: stockLocationName },
    { take: 1 }
  );
  let stockLocation = stockLocationList[0];
  if (!stockLocation) {
    const { result: stockLocationResult } = await createStockLocationsWorkflow(container).run({
      input: {
        locations: [
          {
            name: stockLocationName,
            address: {
              city: 'Copenhagen',
              country_code: 'DK',
              address_1: '',
            },
          },
        ],
      },
    });
    stockLocation = stockLocationResult[0];
  }

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_location_id: stockLocation.id,
      },
    },
  });

  const allStockLocations = await stockLocationModuleService.listStockLocations(
    {},
    { take: 200 }
  );

  for (const location of allStockLocations) {
    try {
      await link.create({
        [Modules.STOCK_LOCATION]: {
          stock_location_id: location.id,
        },
        [Modules.FULFILLMENT]: {
          fulfillment_provider_id: manualProviderId,
        },
      });
    } catch {
      // Link may already exist when re-seeding
    }
  }

  try {
    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_provider_id: ghnProviderId,
      },
    });
  } catch {
    // Link may already exist when re-seeding
  }

  for (const location of allStockLocations) {
    try {
      await link.create({
        [Modules.STOCK_LOCATION]: {
          stock_location_id: location.id,
        },
        [Modules.FULFILLMENT]: {
          fulfillment_provider_id: ghnProviderId,
        },
      });
    } catch {
      // Link may already exist when re-seeding
    }
  }

  if (!isGhnReadyForRateCalculation) {
    logger.warn(
      'GHN provider was linked, but rate calculation is not fully configured. Set GHN_API_TOKEN (or GHN_API_KEY), GHN_SHOP_ID, and GHN_FROM_DISTRICT_ID to enable live GHN rates.'
    );
  }

  logger.info('Seeding fulfillment data...');
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: 'default',
  });
  let shippingProfile = shippingProfiles.length ? shippingProfiles[0] : null;

  if (!shippingProfile) {
    const { result: shippingProfileResult } = await createShippingProfilesWorkflow(container).run({
      input: {
        data: [
          {
            name: 'Default Shipping Profile',
            type: 'default',
          },
        ],
      },
    });
    shippingProfile = shippingProfileResult[0];
  }

  const manualFulfillmentSetName = 'Europe Warehouse delivery';
  const manualFulfillmentSetList = await fulfillmentModuleService.listFulfillmentSets(
    { name: manualFulfillmentSetName },
    { relations: ['service_zones'], take: 1 }
  );
  let manualFulfillmentSet = manualFulfillmentSetList[0];
  if (!manualFulfillmentSet) {
    manualFulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
      name: manualFulfillmentSetName,
      type: 'shipping',
      service_zones: [
        {
          name: 'Europe',
          geo_zones: manualShippingCountries.map((country_code) => ({
            country_code,
            type: 'country' as const,
          })),
        },
      ],
    });
  }

  try {
    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_set_id: manualFulfillmentSet.id,
      },
    });
  } catch {
    // Link may already exist when re-seeding
  }

  for (const location of allStockLocations) {
    try {
      await link.create({
        [Modules.STOCK_LOCATION]: {
          stock_location_id: location.id,
        },
        [Modules.FULFILLMENT]: {
          fulfillment_set_id: manualFulfillmentSet.id,
        },
      });
    } catch {
      // Link may already exist when re-seeding
    }
  }

  let ghnFulfillmentSet:
    | Awaited<ReturnType<typeof fulfillmentModuleService.createFulfillmentSets>>
    | null = null;

  const ghnFulfillmentSetName = 'Vietnam GHN delivery';
  const ghnFulfillmentSetList = await fulfillmentModuleService.listFulfillmentSets(
    { name: ghnFulfillmentSetName },
    { relations: ['service_zones'], take: 1 }
  );
  ghnFulfillmentSet = ghnFulfillmentSetList[0] || null;

  if (!ghnFulfillmentSet) {
    ghnFulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
      name: ghnFulfillmentSetName,
      type: 'shipping',
      service_zones: [
        {
          name: 'Vietnam',
          geo_zones: ghnShippingCountries.map((country_code) => ({
            country_code,
            type: 'country' as const,
          })),
        },
      ],
    });
  }

  try {
    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_set_id: ghnFulfillmentSet.id,
      },
    });
  } catch {
    // Link may already exist when re-seeding
  }

  for (const location of allStockLocations) {
    try {
      await link.create({
        [Modules.STOCK_LOCATION]: {
          stock_location_id: location.id,
        },
        [Modules.FULFILLMENT]: {
          fulfillment_set_id: ghnFulfillmentSet.id,
        },
      });
    } catch {
      // Link may already exist when re-seeding
    }
  }

  const manualShippingOptionDefs = [
    {
      name: 'Standard Shipping',
      price_type: 'flat' as const,
      type: {
        label: 'Standard',
        description: 'Ship in 2-3 days.',
        code: 'standard',
      },
      prices: [
        {
          currency_code: 'usd',
          amount: 10,
        },
        {
          currency_code: 'eur',
          amount: 10,
        },
        ...(!isGhnReadyForRateCalculation
          ? [
              {
                currency_code: 'vnd',
                amount: 30000,
              },
            ]
          : []),
        ...manualShippingRegionPrices,
      ],
    },
    {
      name: 'Express Shipping',
      price_type: 'flat' as const,
      type: {
        label: 'Express',
        description: 'Ship in 24 hours.',
        code: 'express',
      },
      prices: [
        {
          currency_code: 'usd',
          amount: 10,
        },
        {
          currency_code: 'eur',
          amount: 10,
        },
        ...(!isGhnReadyForRateCalculation
          ? [
              {
                currency_code: 'vnd',
                amount: 30000,
              },
            ]
          : []),
        ...manualShippingRegionPrices,
      ],
    },
  ];

  const existingManualOptions = (
    await fulfillmentModuleService.listShippingOptions({}, { take: 100 })
  ).filter((option) => option.provider_id === manualProviderId);
  const existingManualOptionNames = new Set(existingManualOptions.map((option) => option.name));
  const manualOptionsToCreate = manualShippingOptionDefs.filter((option) => {
    return !existingManualOptionNames.has(option.name);
  });

  if (manualOptionsToCreate.length) {
    const manualServiceZoneId = manualFulfillmentSet.service_zones?.[0]?.id;

    if (!manualServiceZoneId) {
      throw new Error('Manual fulfillment set is missing a service zone.');
    }

    await createShippingOptionsWorkflow(container).run({
      input: manualOptionsToCreate.map((option) => ({
        ...option,
        provider_id: manualProviderId,
        service_zone_id: manualServiceZoneId,
        shipping_profile_id: shippingProfile.id,
        rules: [
          {
            attribute: 'enabled_in_store',
            value: 'true',
            operator: 'eq',
          },
          {
            attribute: 'is_return',
            value: 'false',
            operator: 'eq',
          },
        ],
      })),
    });
  }

  if (ghnFulfillmentSet) {
    const ghnShippingOptionDefs = [
      {
        name: 'GHN Fast',
        type: {
          label: 'GHN Fast',
          description: 'GHN fast delivery service.',
          code: 'ghn-fast',
        },
        data: {
          service_type_id: 1,
          service_name: 'Nhanh',
        },
      },
      {
        name: 'GHN Standard',
        type: {
          label: 'GHN Standard',
          description: 'GHN standard delivery service.',
          code: 'ghn-standard',
        },
        data: {
          service_type_id: 2,
          service_name: 'Chuan',
        },
      },
      {
        name: 'GHN Economy',
        type: {
          label: 'GHN Economy',
          description: 'GHN economy delivery service.',
          code: 'ghn-economy',
        },
        data: {
          service_type_id: 3,
          service_name: 'Tiet kiem',
        },
      },
    ];

    const existingGhnOptions = (
      await fulfillmentModuleService.listShippingOptions({}, { take: 100 })
    ).filter((option) => option.provider_id === ghnProviderId);
    const existingGhnOptionNames = new Set(existingGhnOptions.map((option) => option.name));
    const ghnOptionsToCreate = ghnShippingOptionDefs.filter((option) => {
      return !existingGhnOptionNames.has(option.name);
    });

    if (ghnOptionsToCreate.length) {
      const ghnServiceZoneId = ghnFulfillmentSet.service_zones?.[0]?.id;

      if (!ghnServiceZoneId) {
        throw new Error('GHN fulfillment set is missing a service zone.');
      }

      await createShippingOptionsWorkflow(container).run({
        input: ghnOptionsToCreate.map((option) => ({
          ...option,
          provider_id: ghnProviderId,
          price_type: 'calculated' as const,
          service_zone_id: ghnServiceZoneId,
          shipping_profile_id: shippingProfile.id,
          rules: [
            {
              attribute: 'enabled_in_store',
              value: 'true',
              operator: 'eq',
            },
            {
              attribute: 'is_return',
              value: 'false',
              operator: 'eq',
            },
          ],
        })),
      });
    }
  }

  logger.info('Finished seeding fulfillment data.');

  try {
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: {
        id: stockLocation.id,
        add: [defaultSalesChannel[0].id],
      },
    });
  } catch {
    // Sales channel may already be linked when re-seeding
  }
  logger.info('Finished seeding stock location data.');

  logger.info('Seeding publishable API key data...');
  let publishableApiKey: ApiKey | null = null;
  const { data } = await query.graph({
    entity: 'api_key',
    fields: ['id'],
    filters: {
      type: 'publishable',
    },
  });

  publishableApiKey = data?.[0];

  if (!publishableApiKey) {
    const {
      result: [publishableApiKeyResult],
    } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            title: 'Webshop',
            type: 'publishable',
            created_by: '',
          },
        ],
      },
    });

    publishableApiKey = publishableApiKeyResult as ApiKey;
  }

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: publishableApiKey.id,
      add: [defaultSalesChannel[0].id],
    },
  });
  logger.info('Finished seeding publishable API key data.');

  logger.info('Seeding product data...');

  const categoryDefs = [
    { name: 'Shirts', handle: 'shirts', is_active: true },
    { name: 'Sweatshirts', handle: 'sweatshirts', is_active: true },
    { name: 'Pants', handle: 'pants', is_active: true },
    { name: 'Merch', handle: 'merch', is_active: true },
  ];

  const categoryHandles = categoryDefs.map((def) => def.handle);
  const { data: categoryRows = [] } = await query.graph({
    entity: 'product_category',
    fields: ['id', 'handle', 'name'],
  });
  const allListedCategories = categoryRows as {
    id: string;
    handle: string;
    name: string;
  }[];
  let categoriesWithHandles = allListedCategories.filter((c) =>
    categoryHandles.includes(c.handle ?? '')
  );
  const categoriesToCreate = categoryDefs.filter(
    (def) => !categoriesWithHandles.some((c) => c.handle === def.handle)
  );
  if (categoriesToCreate.length) {
    const { result: newCategories } = await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: categoriesToCreate.map((def) => ({
          name: def.name,
          is_active: def.is_active,
        })),
      },
    });
    categoriesWithHandles = [...categoriesWithHandles, ...newCategories];
  }

  const categoryResult = categoryDefs.map((def) => {
    const cat = categoriesWithHandles.find((c) => c.handle === def.handle);
    if (!cat) {
      throw new Error(`Missing product category: ${def.handle}`);
    }
    return cat;
  });

  const demoProductHandles = ['t-shirt', 'sweatshirt', 'sweatpants', 'shorts'];
  const existingDemoProducts = await productModuleService.listProducts(
    { handle: demoProductHandles },
    { take: 10 }
  );

  if (existingDemoProducts.length === demoProductHandles.length) {
    logger.info('Demo products already seeded; skipping product and inventory creation.');
    return;
  }

  if (existingDemoProducts.length > 0) {
    logger.warn(
      'Some demo products already exist; skipping product seed to avoid duplicates. Use a fresh DB or remove demo products to re-seed.'
    );
    return;
  }

  const products = [
    {
      title: 'Medusa T-Shirt',
      category_ids: [categoryResult.find((cat) => cat.name === 'Shirts')!.id],
      description:
        'Reimagine the feeling of a classic T-shirt. With our cotton T-shirts, everyday essentials no longer have to be ordinary.',
      handle: 't-shirt',
      weight: 400,
      status: ProductStatus.PUBLISHED,
      shipping_profile_id: shippingProfile.id,
      images: [
        {
          url: 'https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-front.png',
        },
        {
          url: 'https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-back.png',
        },
        {
          url: 'https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-white-front.png',
        },
        {
          url: 'https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-white-back.png',
        },
      ],
      options: [
        {
          title: 'Size',
          values: ['S', 'M', 'L', 'XL'],
        },
        {
          title: 'Color',
          values: ['Black', 'White'],
        },
      ],
      variants: [
        {
          title: 'S / Black',
          sku: 'SHIRT-S-BLACK',
          options: {
            Size: 'S',
            Color: 'Black',
          },
          prices: [
            {
              amount: 10,
              currency_code: 'eur',
            },
            {
              amount: 15,
              currency_code: 'usd',
            },
          ],
        },
        {
          title: 'S / White',
          sku: 'SHIRT-S-WHITE',
          options: {
            Size: 'S',
            Color: 'White',
          },
          prices: [
            {
              amount: 10,
              currency_code: 'eur',
            },
            {
              amount: 15,
              currency_code: 'usd',
            },
          ],
        },
        {
          title: 'M / Black',
          sku: 'SHIRT-M-BLACK',
          options: {
            Size: 'M',
            Color: 'Black',
          },
          prices: [
            {
              amount: 10,
              currency_code: 'eur',
            },
            {
              amount: 15,
              currency_code: 'usd',
            },
          ],
        },
        {
          title: 'M / White',
          sku: 'SHIRT-M-WHITE',
          options: {
            Size: 'M',
            Color: 'White',
          },
          prices: [
            {
              amount: 10,
              currency_code: 'eur',
            },
            {
              amount: 15,
              currency_code: 'usd',
            },
          ],
        },
        {
          title: 'L / Black',
          sku: 'SHIRT-L-BLACK',
          options: {
            Size: 'L',
            Color: 'Black',
          },
          prices: [
            {
              amount: 10,
              currency_code: 'eur',
            },
            {
              amount: 15,
              currency_code: 'usd',
            },
          ],
        },
        {
          title: 'L / White',
          sku: 'SHIRT-L-WHITE',
          options: {
            Size: 'L',
            Color: 'White',
          },
          prices: [
            {
              amount: 10,
              currency_code: 'eur',
            },
            {
              amount: 15,
              currency_code: 'usd',
            },
          ],
        },
        {
          title: 'XL / Black',
          sku: 'SHIRT-XL-BLACK',
          options: {
            Size: 'XL',
            Color: 'Black',
          },
          prices: [
            {
              amount: 10,
              currency_code: 'eur',
            },
            {
              amount: 15,
              currency_code: 'usd',
            },
          ],
        },
        {
          title: 'XL / White',
          sku: 'SHIRT-XL-WHITE',
          options: {
            Size: 'XL',
            Color: 'White',
          },
          prices: [
            {
              amount: 10,
              currency_code: 'eur',
            },
            {
              amount: 15,
              currency_code: 'usd',
            },
          ],
        },
      ],
      sales_channels: [
        {
          id: defaultSalesChannel[0].id,
        },
      ],
    },
    {
      title: 'Medusa Sweatshirt',
      category_ids: [categoryResult.find((cat) => cat.name === 'Sweatshirts')!.id],
      description:
        'Reimagine the feeling of a classic sweatshirt. With our cotton sweatshirt, everyday essentials no longer have to be ordinary.',
      handle: 'sweatshirt',
      weight: 400,
      status: ProductStatus.PUBLISHED,
      shipping_profile_id: shippingProfile.id,
      images: [
        {
          url: 'https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatshirt-vintage-front.png',
        },
        {
          url: 'https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatshirt-vintage-back.png',
        },
      ],
      options: [
        {
          title: 'Size',
          values: ['S', 'M', 'L', 'XL'],
        },
      ],
      variants: [
        {
          title: 'S',
          sku: 'SWEATSHIRT-S',
          options: {
            Size: 'S',
          },
          prices: [
            {
              amount: 10,
              currency_code: 'eur',
            },
            {
              amount: 15,
              currency_code: 'usd',
            },
          ],
        },
        {
          title: 'M',
          sku: 'SWEATSHIRT-M',
          options: {
            Size: 'M',
          },
          prices: [
            {
              amount: 10,
              currency_code: 'eur',
            },
            {
              amount: 15,
              currency_code: 'usd',
            },
          ],
        },
        {
          title: 'L',
          sku: 'SWEATSHIRT-L',
          options: {
            Size: 'L',
          },
          prices: [
            {
              amount: 10,
              currency_code: 'eur',
            },
            {
              amount: 15,
              currency_code: 'usd',
            },
          ],
        },
        {
          title: 'XL',
          sku: 'SWEATSHIRT-XL',
          options: {
            Size: 'XL',
          },
          prices: [
            {
              amount: 10,
              currency_code: 'eur',
            },
            {
              amount: 15,
              currency_code: 'usd',
            },
          ],
        },
      ],
      sales_channels: [
        {
          id: defaultSalesChannel[0].id,
        },
      ],
    },
    {
      title: 'Medusa Sweatpants',
      category_ids: [categoryResult.find((cat) => cat.name === 'Pants')!.id],
      description:
        'Reimagine the feeling of classic sweatpants. With our cotton sweatpants, everyday essentials no longer have to be ordinary.',
      handle: 'sweatpants',
      weight: 400,
      status: ProductStatus.PUBLISHED,
      shipping_profile_id: shippingProfile.id,
      images: [
        {
          url: 'https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatpants-gray-front.png',
        },
        {
          url: 'https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatpants-gray-back.png',
        },
      ],
      options: [
        {
          title: 'Size',
          values: ['S', 'M', 'L', 'XL'],
        },
      ],
      variants: [
        {
          title: 'S',
          sku: 'SWEATPANTS-S',
          options: {
            Size: 'S',
          },
          prices: [
            {
              amount: 10,
              currency_code: 'eur',
            },
            {
              amount: 15,
              currency_code: 'usd',
            },
          ],
        },
        {
          title: 'M',
          sku: 'SWEATPANTS-M',
          options: {
            Size: 'M',
          },
          prices: [
            {
              amount: 10,
              currency_code: 'eur',
            },
            {
              amount: 15,
              currency_code: 'usd',
            },
          ],
        },
        {
          title: 'L',
          sku: 'SWEATPANTS-L',
          options: {
            Size: 'L',
          },
          prices: [
            {
              amount: 10,
              currency_code: 'eur',
            },
            {
              amount: 15,
              currency_code: 'usd',
            },
          ],
        },
        {
          title: 'XL',
          sku: 'SWEATPANTS-XL',
          options: {
            Size: 'XL',
          },
          prices: [
            {
              amount: 10,
              currency_code: 'eur',
            },
            {
              amount: 15,
              currency_code: 'usd',
            },
          ],
        },
      ],
      sales_channels: [
        {
          id: defaultSalesChannel[0].id,
        },
      ],
    },
    {
      title: 'Medusa Shorts',
      category_ids: [categoryResult.find((cat) => cat.name === 'Merch')!.id],
      description:
        'Reimagine the feeling of classic shorts. With our cotton shorts, everyday essentials no longer have to be ordinary.',
      handle: 'shorts',
      weight: 400,
      status: ProductStatus.PUBLISHED,
      shipping_profile_id: shippingProfile.id,
      images: [
        {
          url: 'https://medusa-public-images.s3.eu-west-1.amazonaws.com/shorts-vintage-front.png',
        },
        {
          url: 'https://medusa-public-images.s3.eu-west-1.amazonaws.com/shorts-vintage-back.png',
        },
      ],
      options: [
        {
          title: 'Size',
          values: ['S', 'M', 'L', 'XL'],
        },
      ],
      variants: [
        {
          title: 'S',
          sku: 'SHORTS-S',
          options: {
            Size: 'S',
          },
          prices: [
            {
              amount: 10,
              currency_code: 'eur',
            },
            {
              amount: 15,
              currency_code: 'usd',
            },
          ],
        },
        {
          title: 'M',
          sku: 'SHORTS-M',
          options: {
            Size: 'M',
          },
          prices: [
            {
              amount: 10,
              currency_code: 'eur',
            },
            {
              amount: 15,
              currency_code: 'usd',
            },
          ],
        },
        {
          title: 'L',
          sku: 'SHORTS-L',
          options: {
            Size: 'L',
          },
          prices: [
            {
              amount: 10,
              currency_code: 'eur',
            },
            {
              amount: 15,
              currency_code: 'usd',
            },
          ],
        },
        {
          title: 'XL',
          sku: 'SHORTS-XL',
          options: {
            Size: 'XL',
          },
          prices: [
            {
              amount: 10,
              currency_code: 'eur',
            },
            {
              amount: 15,
              currency_code: 'usd',
            },
          ],
        },
      ],
      sales_channels: [
        {
          id: defaultSalesChannel[0].id,
        },
      ],
    },
  ];

  await createProductsWorkflow(container).run({
    input: {
      products: products.map((product) => ({
        ...product,
        variants: product.variants.map((variant) => ({
          ...variant,
          prices: [
            ...variant.prices,
            {
              amount: 300000,
              currency_code: 'vnd',
            },
          ],
        })),
      })),
    },
  });
  logger.info('Finished seeding product data.');

  logger.info('Seeding inventory levels.');

  const { data: inventoryItems } = await query.graph({
    entity: 'inventory_item',
    fields: ['id'],
  });

  const inventoryLevels: CreateInventoryLevelInput[] = [];
  for (const inventoryItem of inventoryItems) {
    const inventoryLevel = {
      location_id: stockLocation.id,
      stocked_quantity: 1000000,
      inventory_item_id: inventoryItem.id,
    };
    inventoryLevels.push(inventoryLevel);
  }

  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: inventoryLevels,
    },
  });

  logger.info('Finished seeding inventory levels data.');
}
