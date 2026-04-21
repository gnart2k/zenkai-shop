import { defineWidgetConfig } from '@medusajs/admin-sdk';
import ProductPhysicalWidget from '../components/product-physical-widget';

export const config = defineWidgetConfig({
  zone: 'product.details.side.after',
});

export default ProductPhysicalWidget;
