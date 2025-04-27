import React, { createContext, useContext, useEffect, useState } from 'react';
import { CustomerInfo, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { useAuth } from './AuthContext';
import {
  initializePurchases,
  updatePurchasesUserId,
  resetPurchasesUser,
  getOfferings,
  purchasePackage,
  checkSubscriptionStatus,
  restorePurchases,
  UserSubscriptionInfo
} from '@/services/purchasesService';

type PurchasesContextType = {
  offerings: PurchasesOffering | null;
  subscriptionInfo: UserSubscriptionInfo;
  isLoading: boolean;
  purchasePackage: (pkg: PurchasesPackage) => Promise<CustomerInfo | null>;
  restorePurchases: () => Promise<CustomerInfo | null>;
  refreshSubscriptionStatus: () => Promise<void>;
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

  // Initialize RevenueCat
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        await initializePurchases(user?.id);
        const offerings = await getOfferings();
        setOfferings(offerings);
        await refreshSubscriptionStatus();
      } catch (error) {
        console.error('Error initializing purchases:', error);
      } finally {
        setIsLoading(false);
      }
    };

    init();
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

  const refreshSubscriptionStatus = async () => {
    try {
      const status = await checkSubscriptionStatus();
      setSubscriptionInfo(status);
    } catch (error) {
      console.error('Error refreshing subscription status:', error);
    }
  };

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

  return (
    <PurchasesContext.Provider
      value={{
        offerings,
        subscriptionInfo,
        isLoading,
        purchasePackage: handlePurchasePackage,
        restorePurchases: handleRestorePurchases,
        refreshSubscriptionStatus,
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