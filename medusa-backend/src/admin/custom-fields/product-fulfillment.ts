import { z } from 'zod';

const unstable_defineCustomFieldsConfig = (config) => config;

const readIsPhysical = (data) => {
  const v = data?.metadata?.is_physical;
  if (v === false || v === 'false') {
    return false;
  }
  return true;
};

export default unstable_defineCustomFieldsConfig({
  model: 'product',
  link: [],
  forms: [
    {
      zone: 'create',
      tab: 'general',
      fields: {
        is_physical: {
          validation: z.boolean(),
          defaultValue: true,
          label: 'Physical product (requires shipping)',
          description:
            'Turn off for digital products to skip shipping and bypass inventory/location limits.',
        },
      },
    },
    {
      zone: 'edit',
      fields: {
        is_physical: {
          validation: z.boolean(),
          defaultValue: (data) => readIsPhysical(data),
          label: 'Physical product (requires shipping)',
          description:
            'Turn off for digital products to skip shipping and bypass inventory/location limits.',
        },
      },
    },
  ],
});
