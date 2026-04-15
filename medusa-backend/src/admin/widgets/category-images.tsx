import { defineWidgetConfig } from '@medusajs/admin-sdk';
import CategoryImagesWidget from '../components/category-images-widget';

export const config = defineWidgetConfig({
  zone: 'product_category.details.after',
});

export default CategoryImagesWidget;
