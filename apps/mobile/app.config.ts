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

// TEMPORARY: One Android applicationId for every variant so the committed google-services.json
// (single Firebase Android app) matches dev/preview EAS builds without registering extra packages.
// Restore distinct ids (e.g. huntlyclubdev / huntlyclubpreview) once those apps exist in Firebase
// and google-services.json lists every client. Tradeoff: only one build can be installed at a
// time per device—dev or internal APKs replace the Play build with the same package name.
const ANDROID_APPLICATION_ID = 'software.fluff.huntlyclub';

/** MapTiler tiles for Android walk/cycle maps (MapLibre). See .env.example. */
const maptilerApiKey = process.env.EXPO_PUBLIC_MAPTILER_API_KEY?.trim();

const isEasBuild = process.env.EAS_BUILD === "true" || process.env.EAS_BUILD === "1";
if (isEasBuild && process.env.EAS_BUILD_PLATFORM === "android" && !maptilerApiKey) {
  throw new Error(
    "EAS Android build: EXPO_PUBLIC_MAPTILER_API_KEY is unset. " +
      "In Expo (expo.dev) open this project → Environment variables → add EXPO_PUBLIC_MAPTILER_API_KEY for the environment used by this profile, then rebuild."
  );
}

const androidPackage: Record<AppVariant, string> = {
  production: ANDROID_APPLICATION_ID,
  preview: ANDROID_APPLICATION_ID,
  development: ANDROID_APPLICATION_ID,
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
        "Huntly World uses motion data to count your steps during walks, so your family can track how active you've been on your adventures.",
      NSLocationWhenInUseUsageDescription:
        "Huntly World uses your location to track your walk and cycle routes during activities.",
      NSLocationAlwaysAndWhenInUseUsageDescription:
        "Huntly World uses your location while an adventure is active so your route can keep tracking when the app is in the background.",
      NSUserNotificationUsageDescription:
        "Huntly World sends notifications to let your family know about new missions, photo reviews, and club updates.",
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: adaptiveIcon[variant],
      backgroundColor: "#1A62A3",
    },
    package: androidPackage[variant],
    googleServicesFile: "./google-services.json",
    permissions: [
      "ACTIVITY_RECOGNITION",
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
      "ACCESS_BACKGROUND_LOCATION",
      "FOREGROUND_SERVICE",
      "FOREGROUND_SERVICE_LOCATION",
    ],
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
    "expo-router",
    [
      "expo-notifications",
      {
        icon: icon[variant],
        color: "#4F6F52",
      },
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "Huntly World uses your location to track your walk and cycle routes during activities.",
        locationAlwaysAndWhenInUsePermission:
          "Huntly World uses your location while an adventure is active so your route can keep tracking when the app is in the background.",
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      },
    ],
    "./plugins/withAndroidLocationNotification.js",
    [
      "@maplibre/maplibre-react-native",
      {
        android: {
          // Matches existing Play Services usage (Firebase).
          locationEngine: "google",
        },
      },
    ],
    // ActivityMap.ios (Apple Maps). Android uses MapLibre — react-native-maps excluded via autolinking.
    "react-native-maps",
    [
      "expo-widgets",
      {
        bundleIdentifier: `${bundleId[variant]}.widgets`,
        groupIdentifier: `group.${bundleId[variant]}`,
        widgets: [
          {
            name: "ActivityLiveActivity",
            displayName: "Active Adventure",
            description: "Shows the current walk or cycle while tracking is active",
            supportedFamilies: ["systemSmall", "systemMedium"],
            contentMarginsDisabled: false,
          },
        ],
      },
    ],
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
      ],
    [
      "expo-navigation-bar",
      {
        visibility: "hidden",
        enforceContrast: false,
      },
    ],
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