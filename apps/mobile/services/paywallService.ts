/**
 * RevenueCat Paywall and Customer Center presentation.
 * Use these to show the remote paywall UI or the Customer Center (manage subscription).
 *
 * @see https://www.revenuecat.com/docs/tools/paywalls/displaying-paywalls#react-native
 * @see https://www.revenuecat.com/docs/tools/customer-center/customer-center-react-native
 */

import { Platform } from 'react-native';
import RevenueCatUI from 'react-native-purchases-ui';
import { CLUB_ENTITLEMENT_ID } from './purchasesService';

const isPaywallSupported = (): boolean =>
  Platform.OS === 'ios' || Platform.OS === 'android';

export type PresentPaywallResult = { customerInfo: unknown } | null;
export type PresentPaywallIfNeededResult =
  | { customerInfo: unknown }
  | 'not_presented'
  | null;

/**
 * Present the RevenueCat paywall (current offering). Use when you want to
 * always show the paywall (e.g. "Upgrade" button).
 */
export async function presentPaywall(): Promise<PresentPaywallResult> {
  if (!isPaywallSupported()) return null;
  try {
    const result = await RevenueCatUI.presentPaywall();
    return result;
  } catch (e) {
    console.error('[Paywall] presentPaywall failed:', e);
    return null;
  }
}

/**
 * Present the paywall only if the user does not have the "club" entitlement.
 * Returns 'not_presented' if the user already has access.
 */
export async function presentPaywallIfNeeded(): Promise<PresentPaywallIfNeededResult> {
  if (!isPaywallSupported()) return null;
  try {
    const result = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: CLUB_ENTITLEMENT_ID,
    });
    return result;
  } catch (e) {
    console.error('[Paywall] presentPaywallIfNeeded failed:', e);
    return null;
  }
}

/**
 * Present the Customer Center so the user can manage subscription, restore,
 * cancel, or get help. Best used for subscribed users (e.g. "Manage subscription").
 */
export async function presentCustomerCenter(): Promise<boolean> {
  if (!isPaywallSupported()) return false;
  try {
    await RevenueCatUI.presentCustomerCenter();
    return true;
  } catch (e) {
    console.error('[Paywall] presentCustomerCenter failed:', e);
    return false;
  }
}
