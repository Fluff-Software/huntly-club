// Stub purchase types (no external IAP SDK)
export type SubscriptionStatus = 'active' | 'inactive' | 'grace_period' | 'unknown';

export type UserSubscriptionInfo = {
  isSubscribed: boolean;
  status: SubscriptionStatus;
  expirationDate: Date | null;
  productIdentifier: string | null;
};

export type PurchasesProduct = {
  title: string;
  description: string;
  priceString: string;
};

export type PurchasesPackage = {
  identifier: string;
  packageType: string;
  product: PurchasesProduct;
};

export type CustomerInfo = {
  entitlements: { active: Record<string, { expirationDate?: string; productIdentifier?: string }> };
};

export type PurchasesOffering = {
  availablePackages: PurchasesPackage[];
};

const defaultSubscriptionInfo: UserSubscriptionInfo = {
  isSubscribed: false,
  status: 'unknown',
  expirationDate: null,
  productIdentifier: null,
};

export const initializePurchases = async (_userId?: string) => {
  // No-op: no IAP SDK
};

export const updatePurchasesUserId = async (_userId: string) => {
  return true;
};

export const resetPurchasesUser = async () => {
  return true;
};

export const getOfferings = async (): Promise<PurchasesOffering | null> => {
  return null;
};

export const purchasePackage = async (
  _pkg: PurchasesPackage
): Promise<CustomerInfo | null> => {
  return null;
};

export const checkSubscriptionStatus = async (): Promise<UserSubscriptionInfo> => {
  return defaultSubscriptionInfo;
};

export const restorePurchases = async (): Promise<CustomerInfo | null> => {
  return null;
};
