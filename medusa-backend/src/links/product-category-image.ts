import { defineLink } from '@medusajs/framework/utils';
import ProductModule from '@medusajs/medusa/product';
import ProductMediaModule from '../modules/product-media';

export default defineLink(
  { linkable: ProductModule.linkable.productCategory, isList: true },
  ProductMediaModule.linkable.productCategoryImage
);
