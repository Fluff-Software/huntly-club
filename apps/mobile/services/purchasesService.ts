/**
 * RevenueCat-powered purchases service for Huntly Club.
 * Entitlement: "club" — gates premium / subscription features.
 *
 * Product configuration (RevenueCat dashboard):
 * - Monthly: subscription_monthly_test (attach to entitlement "club")
 *
 * @see https://www.revenuecat.com/docs/getting-started/installation/expo
 * @see https://www.revenuecat.com/docs/getting-started/configuring-sdk
 */

import { Platform } from 'react-native';
import Purchases, {
  type CustomerInfo as RCCustomerInfo,
  type PurchasesOffering as RCOffering,
  type PurchasesPackage as RCPackage,
  PURCHASES_ERROR_CODE,
  type PurchasesError,
} from 'react-native-purchases';

/** Entitlement identifier used for club / premium access. */
export const CLUB_ENTITLEMENT_ID = 'club';

/** Re-export app-facing types (aligned with RevenueCat shapes). */
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

/** Web and unsupported platforms: no native IAP. */
const isIAPSupported = (): boolean => {
  return Platform.OS === 'ios' || Platform.OS === 'android';
};

function getApiKey(): string {
  if (Platform.OS === 'ios') {
    const key = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
    if (!key) throw new Error('EXPO_PUBLIC_REVENUECAT_IOS_API_KEY is not set');
    return key;
  }
  if (Platform.OS === 'android') {
    const key = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
    if (!key) throw new Error('EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY is not set');
    return key;
  }
  return '';
}

function mapRCPackageToApp(pkg: RCPackage): PurchasesPackage {
  return {
    identifier: pkg.identifier,
    packageType: pkg.packageType,
    product: {
      title: pkg.product.title,
      description: pkg.product.description,
      priceString: pkg.product.priceString,
    },
  };
}

function mapRCOfferingToApp(offering: RCOffering | null): PurchasesOffering | null {
  if (!offering?.availablePackages?.length) return null;
  return {
    availablePackages: offering.availablePackages.map(mapRCPackageToApp),
  };
}

function mapCustomerInfoToApp(info: RCCustomerInfo | null): CustomerInfo | null {
  if (!info) return null;
  const active: Record<string, { expirationDate?: string; productIdentifier?: string }> = {};
  const ent = info.entitlements?.active;
  if (ent) {
    for (const [id, e] of Object.entries(ent)) {
      active[id] = {
        expirationDate: e.expirationDate ?? undefined,
        productIdentifier: e.productIdentifier ?? undefined,
      };
    }
  }
  return { entitlements: { active } };
}

function customerInfoToSubscriptionInfo(info: RCCustomerInfo | null): UserSubscriptionInfo {
  if (!info) return defaultSubscriptionInfo;
  const club = info.entitlements?.active?.[CLUB_ENTITLEMENT_ID];
  if (!club?.isActive) {
    return {
      ...defaultSubscriptionInfo,
      status: 'inactive',
    };
  }
  return {
    isSubscribed: true,
    status: club.isActive ? 'active' : 'inactive',
    expirationDate: club.expirationDate ? new Date(club.expirationDate) : null,
    productIdentifier: club.productIdentifier ?? null,
  };
}

/** Whether the SDK has been configured (once per app lifecycle). */
let isConfigured = false;

/**
 * Initialize RevenueCat. Call once at app startup (e.g. from PurchasesProvider).
 * Optionally pass existing user id to identify the user; otherwise anonymous.
 */
export const initializePurchases = async (userId?: string | null): Promise<void> => {
  if (!isIAPSupported()) return;

  try {
    const apiKey = getApiKey();
    if (!apiKey) return;

    if (!isConfigured) {
      if (__DEV__) {
        Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
      }
      await Purchases.configure({
        apiKey,
        appUserID: userId ? userId : undefined,
      });
      isConfigured = true;
    } else if (userId) {
      await Purchases.logIn(userId);
    }
  } catch (e) {
    console.error('[Purchases] initializePurchases failed:', e);
    throw e;
  }
};

/**
 * Identify the current user (e.g. after login). Call after initializePurchases.
 */
export const updatePurchasesUserId = async (userId: string): Promise<boolean> => {
  if (!isIAPSupported() || !isConfigured) return true;
  try {
    const { customerInfo } = await Purchases.logIn(userId);
    return !!customerInfo;
  } catch (e) {
    console.error('[Purchases] updatePurchasesUserId failed:', e);
    return false;
  }
};

/**
 * Reset to anonymous user (e.g. on logout).
 */
export const resetPurchasesUser = async (): Promise<boolean> => {
  if (!isIAPSupported() || !isConfigured) return true;
  try {
    await Purchases.logOut();
    return true;
  } catch (e) {
    console.error('[Purchases] resetPurchasesUser failed:', e);
    return false;
  }
};

/**
 * Fetch current offerings (packages) from RevenueCat.
 */
export const getOfferings = async (): Promise<PurchasesOffering | null> => {
  if (!isIAPSupported() || !isConfigured) return null;
  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    return mapRCOfferingToApp(current);
  } catch (e) {
    console.error('[Purchases] getOfferings failed:', e);
    return null;
  }
};

/**
 * Purchase a package. Returns updated customer info on success.
 */
export const purchasePackage = async (
  pkg: PurchasesPackage
): Promise<CustomerInfo | null> => {
  if (!isIAPSupported() || !isConfigured) return null;
  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) {
      console.warn('[Purchases] No current offering');
      return null;
    }
    const rcPackage = current.availablePackages.find((p) => p.identifier === pkg.identifier);
    if (!rcPackage) {
      console.warn('[Purchases] Package not found:', pkg.identifier);
      return null;
    }
    const { customerInfo } = await Purchases.purchasePackage(rcPackage);
    return mapCustomerInfoToApp(customerInfo);
  } catch (e) {
    const err = e as PurchasesError;
    if (err.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return null;
    }
    console.error('[Purchases] purchasePackage failed:', e);
    throw e;
  }
};

/**
 * Current subscription status derived from CustomerInfo and entitlement "club".
 */
export const checkSubscriptionStatus = async (): Promise<UserSubscriptionInfo> => {
  if (!isIAPSupported() || !isConfigured) return defaultSubscriptionInfo;
  try {
    const info = await Purchases.getCustomerInfo();
    return customerInfoToSubscriptionInfo(info);
  } catch (e) {
    console.error('[Purchases] checkSubscriptionStatus failed:', e);
    return defaultSubscriptionInfo;
  }
};

/**
 * Restore previous purchases. Returns updated customer info.
 */
export const restorePurchases = async (): Promise<CustomerInfo | null> => {
  if (!isIAPSupported() || !isConfigured) return null;
  try {
    const info = await Purchases.restorePurchases();
    return mapCustomerInfoToApp(info);
  } catch (e) {
    console.error('[Purchases] restorePurchases failed:', e);
    throw e;
  }
};

/**
 * Get raw CustomerInfo from RevenueCat (e.g. for debugging or custom logic).
 */
export const getCustomerInfo = async (): Promise<CustomerInfo | null> => {
  if (!isIAPSupported() || !isConfigured) return null;
  try {
    const info = await Purchases.getCustomerInfo();
    return mapCustomerInfoToApp(info);
  } catch (e) {
    console.error('[Purchases] getCustomerInfo failed:', e);
    return null;
  }
};
