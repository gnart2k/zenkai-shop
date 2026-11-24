import { defineWidgetConfig } from '@medusajs/admin-sdk';
import StoreBrandingWidget from '../components/store-branding-widget';

export const config = defineWidgetConfig({
  zone: 'store.details.after',
});

export default StoreBrandingWidget;
