/**
 * Utility functions for product operations and validation
 */

import type { Product } from '@/lib/query-options';

/**
 * Check if a product is a job readiness product
 * @param product - Product object or product type string
 * @returns boolean indicating if the product is a job readiness product
 */
export function isJobReadinessProduct(product: Product | string): boolean {
  if (typeof product === 'string') {
    return product === 'JOB_READINESS';
  }
  return product.type === 'JOB_READINESS';
}

/**
 * Filter products to get only job readiness products
 * @param products - Array of products
 * @returns Array of job readiness products
 */
export function getJobReadinessProducts(products: Product[]): Product[] {
  return products.filter(isJobReadinessProduct);
}

/**
 * Filter products to get only non-job readiness products
 * @param products - Array of products
 * @returns Array of non-job readiness products
 */
export function getNonJobReadinessProducts(products: Product[]): Product[] {
  return products.filter(product => !isJobReadinessProduct(product));
}

/**
 * Count job readiness products in an array
 * @param products - Array of products
 * @returns Number of job readiness products
 */
export function countJobReadinessProducts(products: Product[]): number {
  return getJobReadinessProducts(products).length;
}

/**
 * Check if a client has reached the maximum number of job readiness products (1)
 * @param assignedProducts - Array of products assigned to a client
 * @returns boolean indicating if the client has reached the limit
 */
export function hasReachedJobReadinessLimit(assignedProducts: Product[]): boolean {
  return countJobReadinessProducts(assignedProducts) >= 1;
}

/**
 * Validate if a job readiness product can be assigned to a client
 * @param productToAssign - Product to be assigned
 * @param currentlyAssignedProducts - Products currently assigned to the client
 * @returns Validation result with eligibility status and reason
 */
export function validateJobReadinessAssignment(
  productToAssign: Product,
  currentlyAssignedProducts: Product[]
): {
  eligible: boolean;
  reason: string;
  existingJobReadinessProduct?: Product;
} {
  // If it's not a job readiness product, assignment is allowed
  if (!isJobReadinessProduct(productToAssign)) {
    return {
      eligible: true,
      reason: 'Product is not a job readiness product'
    };
  }

  // Check if client already has a job readiness product
  const existingJobReadinessProducts = getJobReadinessProducts(currentlyAssignedProducts);
  
  if (existingJobReadinessProducts.length > 0) {
    return {
      eligible: false,
      reason: 'Client already has a job readiness product assigned',
      existingJobReadinessProduct: existingJobReadinessProducts[0]
    };
  }

  // Assignment is allowed
  return {
    eligible: true,
    reason: 'No existing job readiness product found'
  };
}

/**
 * Product type constants for consistency
 */
export const PRODUCT_TYPES = {
  JOB_READINESS: 'JOB_READINESS',
  COURSE: 'COURSE',
  ASSESSMENT: 'ASSESSMENT'
} as const;

export type ProductType = typeof PRODUCT_TYPES[keyof typeof PRODUCT_TYPES];