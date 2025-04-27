import Purchases, { PurchasesOffering, PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// User property types
export type SubscriptionStatus = 'active' | 'inactive' | 'grace_period' | 'unknown';

export type UserSubscriptionInfo = {
  isSubscribed: boolean;
  status: SubscriptionStatus;
  expirationDate: Date | null;
  productIdentifier: string | null;
};

// Initialize RevenueCat with your API keys
export const initializePurchases = async (userId?: string) => {
  try {
    if (Platform.OS === 'android') {
      await Purchases.configure({
        apiKey: Constants.expoConfig?.extra?.revenuecat.androidApiKey,
        appUserID: userId,
      });
    } else if (Platform.OS === 'ios') {
      await Purchases.configure({
        apiKey: Constants.expoConfig?.extra?.revenuecat.iosApiKey,
        appUserID: userId,
      });
    }
    
    if (__DEV__) {
      Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    }

    console.log('RevenueCat SDK initialized');
  } catch (error) {
    console.error('Error initializing RevenueCat:', error);
  }
};

// Update the user ID when they log in
export const updatePurchasesUserId = async (userId: string) => {
  try {
    await Purchases.logIn(userId);
    return true;
  } catch (error) {
    console.error('Error logging in to RevenueCat:', error);
    return false;
  }
};

// Clear the user ID when they log out
export const resetPurchasesUser = async () => {
  try {
    await Purchases.logOut();
    return true;
  } catch (error) {
    console.error('Error logging out from RevenueCat:', error);
    return false;
  }
};

// Get current offerings
export const getOfferings = async (): Promise<PurchasesOffering | null> => {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (error) {
    console.error('Error getting offerings:', error);
    return null;
  }
};

// Purchase a package
export const purchasePackage = async (
  purchasesPackage: PurchasesPackage
): Promise<CustomerInfo | null> => {
  try {
    const { customerInfo } = await Purchases.purchasePackage(purchasesPackage);
    return customerInfo;
  } catch (error) {
    console.error('Error purchasing package:', error);
    return null;
  }
};

// Check subscription status
export const checkSubscriptionStatus = async (): Promise<UserSubscriptionInfo> => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    
    // Default values
    const defaultInfo: UserSubscriptionInfo = {
      isSubscribed: false,
      status: 'unknown',
      expirationDate: null,
      productIdentifier: null,
    };
    
    if (!customerInfo || !customerInfo.entitlements.active || Object.keys(customerInfo.entitlements.active).length === 0) {
      return defaultInfo;
    }
    
    // Assuming you have an entitlement called "premium" or similar
    // Adjust the entitlement name based on your RevenueCat setup
    const entitlementId = Object.keys(customerInfo.entitlements.active)[0];
    const entitlement = customerInfo.entitlements.active[entitlementId];
    
    if (!entitlement) {
      return defaultInfo;
    }
    
    // If there's an active entitlement, the user is subscribed
    return {
      isSubscribed: true,
      status: 'active',
      expirationDate: entitlement.expirationDate ? new Date(entitlement.expirationDate) : null,
      productIdentifier: entitlement.productIdentifier,
    };
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return {
      isSubscribed: false,
      status: 'unknown',
      expirationDate: null,
      productIdentifier: null,
    };
  }
};

// Restore purchases
export const restorePurchases = async (): Promise<CustomerInfo | null> => {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo;
  } catch (error) {
    console.error('Error restoring purchases:', error);
    return null;
  }
}; 