export const STOREFRONT_BASE_URL = 'https://www.skynova-tr.com';

export const AFFILIATE_COOKIE_NAME = 'affiliate-code';
export const AD_VISITOR_COOKIE_NAME = 'ad-visitor-id';
export type AffiliateCommissionMode = 'flat' | 'percentage';

export function normalizeAccountType(accountType?: string | null) {
  return String(accountType || '').trim().toUpperCase();
}

export function isAffiliateAccount(accountType?: string | null, isAffiliate?: boolean | null) {
  const normalizedAccountType = normalizeAccountType(accountType);

  if (normalizedAccountType === 'STAFF') {
    return false;
  }

  return normalizedAccountType === 'AFFILIATE' || Boolean(isAffiliate);
}

export function buildAffiliateFullUrl(
  seoSlug?: string | null,
  uniqueCode?: string | null,
  productId?: number | null
) {
  const normalizedCode = String(uniqueCode || '').trim();
  if (!normalizedCode) {
    return STOREFRONT_BASE_URL;
  }

  void seoSlug;
  void productId;
  return `${STOREFRONT_BASE_URL}/ref/${normalizedCode}`;
}

export function usesFlatAffiliateCommission(affiliatePrice?: number | null) {
  return Number(affiliatePrice || 0) > 0;
}

export function resolveAffiliateCommissionConfig(
  affiliatePrice?: number | null,
  productRate?: number | null,
  linkRate?: number | null,
) {
  if (usesFlatAffiliateCommission(affiliatePrice)) {
    return {
      mode: 'flat' as AffiliateCommissionMode,
      value: Number(linkRate || 0),
    };
  }

  const normalizedProductRate = Number(productRate || 0);
  if (normalizedProductRate > 0) {
    return {
      mode: 'percentage' as AffiliateCommissionMode,
      value: normalizedProductRate,
    };
  }

  return {
    mode: 'percentage' as AffiliateCommissionMode,
    value: Number(linkRate || 0),
  };
}

export function calculateAffiliateCommissionAmount(input: {
  affiliatePrice?: number | null;
  orderPrice?: number | null;
  quantity?: number | null;
  productRate?: number | null;
  linkRate?: number | null;
}) {
  const quantity = Number(input.quantity || 0);
  if (quantity <= 0) {
    return 0;
  }

  const { mode, value } = resolveAffiliateCommissionConfig(
    input.affiliatePrice,
    input.productRate,
    input.linkRate,
  );

  const normalizedOrderPrice = Number(input.orderPrice || 0);
  const amount =
    mode === 'flat'
      ? value * quantity
      : (normalizedOrderPrice * quantity * value) / 100;

  return Number(amount.toFixed(2));
}

export function buildAdFullUrl(productId?: number | string | null) {
  const normalizedProductId = Number(productId || 0);
  if (!Number.isInteger(normalizedProductId) || normalizedProductId <= 0) {
    return STOREFRONT_BASE_URL;
  }

  return `${STOREFRONT_BASE_URL}/ad/${normalizedProductId}`;
}