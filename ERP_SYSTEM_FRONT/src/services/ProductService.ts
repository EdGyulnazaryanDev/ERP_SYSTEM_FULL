import type { Product } from '@/api/products';

/**
 * ProductService - Utility service for product operations
 */
export class ProductService {
  /**
   * Convert string or number to number, safely handling TypeORM decimal fields
   */
  static toNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    if (value != null && typeof (value as any).toString === 'function') {
      const s = (value as any).toString();
      const parsed = parseFloat(s);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }

  /**
   * Format price as currency
   */
  static formatPrice(price: unknown): string {
    const n = Number(ProductService.toNumber(price));
    if (!Number.isFinite(n)) return '-';
    return `$${n.toFixed(2)}`;
  }

  /**
   * Calculate profit margin percentage
   */
  static calculateMargin(selling: unknown, cost: unknown): number {
    const sellingPrice = ProductService.toNumber(selling);
    const costPrice = ProductService.toNumber(cost);
    if (costPrice === 0) return 0;
    return ((sellingPrice - costPrice) / costPrice) * 100;
  }

  /**
   * Get margin color class based on percentage
   */
  static getMarginColorClass(margin: number): string {
    if (margin > 20) return 'text-green-600';
    if (margin > 0) return 'text-blue-600';
    return 'text-red-600';
  }

  /**
   * Validate product prices
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static validatePrices(costPrice: unknown, sellingPrice: unknown): {
    valid: boolean;
    error?: string;
  } {
    const cost = ProductService.toNumber(costPrice);
    const selling = ProductService.toNumber(sellingPrice);

    if (cost < 0 || selling < 0) {
      return { valid: false, error: 'Prices cannot be negative' };
    }

    if (selling < cost) {
      return { valid: false, error: 'Selling price must be >= cost price' };
    }

    return { valid: true };
  }

  /**
   * Normalize product data from API (convert string prices to numbers)
   */
  static normalizeProduct(product: Product): Product {
    return {
      ...product,
      cost_price: ProductService.toNumber(product.cost_price),
      selling_price: ProductService.toNumber(product.selling_price),
      tax_rate: product.tax_rate ? ProductService.toNumber(product.tax_rate) : undefined,
    };
  }

  /**
   * Normalize product list
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static normalizeProducts(products: Product[]): Product[] {
    return products.map((p) => ProductService.normalizeProduct(p));
  }
}
