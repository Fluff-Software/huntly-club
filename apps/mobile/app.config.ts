import 'dotenv/config';

import { ExpoConfig, ConfigContext } from 'expo/config';

type AppVariant = 'production' | 'preview' | 'development';

const variant = (process.env.APP_VARIANT ?? 'production') as AppVariant;

const appName: Record<AppVariant, string> = {
  production: 'Huntly World',
  preview: 'Huntly Preview',
  development: 'Huntly Dev',
};

const bundleId: Record<AppVariant, string> = {
  production: 'software.fluff.huntly-club',
  preview: 'software.fluff.huntly-club.preview',
  development: 'software.fluff.huntly-club.dev',
};

const androidPackage: Record<AppVariant, string> = {
  production: 'software.fluff.huntlyclub',
  preview: 'software.fluff.huntlyclubpreview',
  development: 'software.fluff.huntlyclubdev',
};

const icon: Record<AppVariant, string> = {
  production: './assets/images/ios-light.png',
  preview: './assets/images/ios-light-preview.png',
  development: './assets/images/ios-light-dev.png',
};

const iconDark: Record<AppVariant, string> = {
  production: './assets/images/ios-dark.png',
  preview: './assets/images/ios-dark-preview.png',
  development: './assets/images/ios-dark-dev.png',
};

const iconTinted: Record<AppVariant, string> = {
  production: './assets/images/ios-tinted.png',
  preview: './assets/images/ios-tinted-preview.png',
  development: './assets/images/ios-tinted-dev.png',
};

const adaptiveIcon: Record<AppVariant, string> = {
  production: './assets/images/adaptive-icon.png',
  preview: './assets/images/adaptive-icon-preview.png',
  development: './assets/images/adaptive-icon-dev.png',
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  name: appName[variant],
  slug: "huntly-club",
  version: "1.0.2",
  orientation: "portrait",
  icon: icon[variant],
  scheme: "huntlyclub",
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: true,
    bundleIdentifier: bundleId[variant],
    requireFullScreen: true,
    associatedDomains: [
      'applinks:huntly.app',
      'applinks:*.huntly.app'
    ],
    config: {
      usesNonExemptEncryption: false
    },
    "icon": {
        "dark": iconDark[variant],
        "light": icon[variant],
        "tinted": iconTinted[variant],
      }
    ,
    infoPlist: {
      NSMotionUsageDescription:
        "Huntly World uses motion data to count your steps during walks.",
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: adaptiveIcon[variant],
      backgroundColor: "#1A62A3",
    },
    package: androidPackage[variant],
    googleServicesFile: "./google-services.json",
    permissions: ["ACTIVITY_RECOGNITION"],
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
  runtimeVersion: {
    policy: "appVersion",
  },
  updates: {
    url: "https://u.expo.dev/" + (process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? ""),
    checkAutomatically: "NEVER",
  },
  plugins: [
    "./plugins/withLiveActivities",
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