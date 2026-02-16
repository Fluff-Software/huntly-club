# RevenueCat integration (Huntly Club)

This app uses [RevenueCat](https://www.revenuecat.com/) for subscriptions and entitlement checking.

## Setup summary

- **SDK**: `react-native-purchases` + `react-native-purchases-ui` (installed via `npx expo install react-native-purchases react-native-purchases-ui`).
- **Entitlement**: `club` — used to gate premium / subscription features.
- **API keys**: Set in `.env` as `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` and `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`. Use **Test Store** keys for development; use **platform-specific** keys for production builds. Never submit to App Store / Play Store with a Test Store key.

## Product configuration

### RevenueCat dashboard

1. **Entitlement**  
   Create an entitlement with identifier **`club`** and attach your products to it.

2. **Products**  
   - **Monthly subscription**: product identifier `subscription_monthly_test` (for Test Store).  
   - For production, create the same product in App Store Connect (iOS) and Google Play Console (Android), then add them in RevenueCat with the same entitlement `club`.

3. **Offerings**  
   Create an Offering (e.g. "default") and add the monthly package. Set it as **Current** so the SDK and paywall use it.

4. **Paywalls**  
   In **Tools → Paywalls**, create a paywall and assign it to your offering. The app uses `RevenueCatUI.presentPaywall()` / `presentPaywallIfNeeded()` to show it.

5. **Customer Center** (optional, Pro/Enterprise)  
   Configure under **Tools → Customer Center**. The app calls `RevenueCatUI.presentCustomerCenter()` so users can manage subscription, restore, and cancel.

## App usage

- **Initialization**: `PurchasesProvider` in `_layout.tsx` calls `initializePurchases()` on mount and `updatePurchasesUserId` / `resetPurchasesUser` when the auth user changes.
- **Entitlement check**: `usePurchases().subscriptionInfo.isSubscribed` is derived from the `club` entitlement.
- **Paywall**: Use `presentPaywall()` to always show the paywall, or `presentPaywallIfNeeded()` to show it only when the user does not have `club`.
- **Customer Center**: Use `presentCustomerCenter()` (e.g. from the subscription screen for subscribed users).

## Testing

- Use a **development build** (e.g. `eas build --profile development`) to test real IAP; Expo Go uses RevenueCat’s preview/mock mode.
- With the **Test Store** API key, you can test purchases without connecting App Store Connect or Google Play.
- For production, switch to platform-specific API keys and ensure products and entitlements match the dashboard.

## Troubleshooting

### "Purchases-TrackedEvent is not a supported event type for RNPurchases"

This happens when the **native iOS/Android binary** was built with an older version of `react-native-purchases` that doesn’t include `Purchases-TrackedEvent` in its supported events, while the JS bundle uses a newer SDK that subscribes to it.

**Fix:** Rebuild the native app so it uses the current native code from `node_modules`.

- **EAS:** Create a new development build and run that:
  ```bash
  cd apps/mobile && eas build --platform ios --profile ios-simulator
  ```
  (or your usual iOS dev profile). Install the new build and run the app from it.
- **Local:** If you use `expo prebuild` and Xcode, run a clean prebuild and build again:
  ```bash
  npx expo prebuild --clean
  ```
  then open the `ios` project and build/run. After that, the simulator will use the updated native module and the error should go away.

## References

- [RevenueCat Expo installation](https://www.revenuecat.com/docs/getting-started/installation/expo)
- [Configuring the SDK](https://www.revenuecat.com/docs/getting-started/configuring-sdk)
- [Displaying Paywalls (React Native)](https://www.revenuecat.com/docs/tools/paywalls/displaying-paywalls#react-native)
- [Customer Center (React Native)](https://www.revenuecat.com/docs/tools/customer-center/customer-center-react-native)
