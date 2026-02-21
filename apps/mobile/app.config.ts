import 'dotenv/config';

import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  name: "huntly-club",
  slug: "huntly-club",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/ios-light.png",
  scheme: "huntlyclub",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'software.fluff.huntly-club',
    associatedDomains: [
      'applinks:huntly.app',
      'applinks:*.huntly.app'
    ],
    config: {
      usesNonExemptEncryption: false
    },
    "icon": {
        "dark": "./assets/images/ios-dark.png",
        "light": "./assets/images/ios-light.png",
        "tinted": "./assets/images/ios-tinted.png"
      }
  },
  android: {
    // adaptiveIcon: {
    //   foregroundImage: "./assets/images/adaptive-icon.png",
    //   backgroundColor: "#ffffff",
    // },
    package: 'software.fluff.huntlyclub',
    googleServicesFile: "./google-services.json",
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: "https",
            host: "*.huntly.app",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-notifications",
    [
      "expo-image-picker",
      {
        photosPermission:
          "Huntly World needs access to your photo library so you can choose and upload photos for activities and mission completion.",
        cameraPermission:
          "Huntly World needs camera access so you can take photos for activity and mission completion.",
      },
    ],
    [
      "expo-splash-screen",
      {
          "image": "./assets/images/logo.png",
          "imageWidth": 240,
          "resizeMode": "contain",
          "backgroundColor": "#114094"
        }
      ]
    ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnon: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    eas: {
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
    },
    revenueCat: {
      iosApiKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
      androidApiKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
    },
  },
  owner: process.env.EXPO_PUBLIC_OWNER,
  splash: {
    image: "./assets/images/logo.png",
    resizeMode: "contain",
    backgroundColor: "#4F6F52"
  },
});