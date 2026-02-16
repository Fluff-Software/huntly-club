import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
  initializePurchases,
  updatePurchasesUserId,
  resetPurchasesUser,
  getOfferings,
  purchasePackage,
  checkSubscriptionStatus,
  restorePurchases,
  UserSubscriptionInfo,
} from '@/services/purchasesService';
import {
  presentPaywall as doPresentPaywall,
  presentPaywallIfNeeded as doPresentPaywallIfNeeded,
  presentCustomerCenter as doPresentCustomerCenter,
} from '@/services/paywallService';

type PurchasesContextType = {
  offerings: PurchasesOffering | null;
  subscriptionInfo: UserSubscriptionInfo;
  isLoading: boolean;
  purchasePackage: (pkg: PurchasesPackage) => Promise<CustomerInfo | null>;
  restorePurchases: () => Promise<CustomerInfo | null>;
  refreshSubscriptionStatus: () => Promise<void>;
  /** Present RevenueCat paywall (always show). */
  presentPaywall: () => Promise<void>;
  /** Present paywall only if user does not have "club" entitlement. */
  presentPaywallIfNeeded: () => Promise<void>;
  /** Present Customer Center (manage subscription, restore, cancel). */
  presentCustomerCenter: () => Promise<void>;
};

const PurchasesContext = createContext<PurchasesContextType | undefined>(undefined);

export const PurchasesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionInfo, setSubscriptionInfo] = useState<UserSubscriptionInfo>({
    isSubscribed: false,
    status: 'unknown',
    expirationDate: null,
    productIdentifier: null,
  });

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        await initializePurchases();
        const offerings = await getOfferings();
        setOfferings(offerings);
        await refreshSubscriptionStatus();
      } catch (error) {
        console.error('Error initializing purchases:', error);
      } finally {
        setIsLoading(false);
      }
    };

    void init();
  }, []);

  // Update user ID on login/logout
  useEffect(() => {
    const handleUserChange = async () => {
      if (user?.id) {
        await updatePurchasesUserId(user.id);
      } else {
        await resetPurchasesUser();
      }
      await refreshSubscriptionStatus();
    };

    handleUserChange();
  }, [user]);

  const refreshSubscriptionStatus = useCallback(async () => {
    try {
      const status = await checkSubscriptionStatus();
      setSubscriptionInfo(status);
    } catch (error) {
      console.error('Error refreshing subscription status:', error);
    }
  }, []);

  const handlePurchasePackage = async (pkg: PurchasesPackage) => {
    setIsLoading(true);
    try {
      const customerInfo = await purchasePackage(pkg);
      await refreshSubscriptionStatus();
      return customerInfo;
    } catch (error) {
      console.error('Error purchasing package:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestorePurchases = async () => {
    setIsLoading(true);
    try {
      const customerInfo = await restorePurchases();
      await refreshSubscriptionStatus();
      return customerInfo;
    } catch (error) {
      console.error('Error restoring purchases:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handlePresentPaywall = useCallback(async () => {
    const result = await doPresentPaywall();
    if (result?.customerInfo) await refreshSubscriptionStatus();
  }, [refreshSubscriptionStatus]);

  const handlePresentPaywallIfNeeded = useCallback(async () => {
    const result = await doPresentPaywallIfNeeded();
    if (result && result !== 'not_presented' && result?.customerInfo) {
      await refreshSubscriptionStatus();
    }
  }, [refreshSubscriptionStatus]);

  const handlePresentCustomerCenter = useCallback(async () => {
    await doPresentCustomerCenter();
    await refreshSubscriptionStatus();
  }, [refreshSubscriptionStatus]);

  return (
    <PurchasesContext.Provider
      value={{
        offerings,
        subscriptionInfo,
        isLoading,
        purchasePackage: handlePurchasePackage,
        restorePurchases: handleRestorePurchases,
        refreshSubscriptionStatus,
        presentPaywall: handlePresentPaywall,
        presentPaywallIfNeeded: handlePresentPaywallIfNeeded,
        presentCustomerCenter: handlePresentCustomerCenter,
      }}>
      {children}
    </PurchasesContext.Provider>
  );
};

export const usePurchases = () => {
  const context = useContext(PurchasesContext);
  if (context === undefined) {
    throw new Error('usePurchases must be used within a PurchasesProvider');
  }
  return context;
}; 