import type { ExpoConfig, ConfigContext } from "expo/config";

const APP_IDENTIFIER = "app.haenael";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "해낼게",
  slug: "haenael",
  version: "0.1.0",
  orientation: "portrait",
  scheme: "haenael",
  userInterfaceStyle: "light",
  ios: {
    supportsTablet: false,
    bundleIdentifier: APP_IDENTIFIER,
    buildNumber: "1",
    usesAppleSignIn: true,
    infoPlist: {
      NSUserNotificationsUsageDescription: "친구의 응원과 목표 소식을 알려드려요."
    }
  },
  android: {
    package: APP_IDENTIFIER,
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: "#F7F4EC"
    },
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          { scheme: "https", host: "haenael.app", pathPrefix: "/g" },
          { scheme: "https", host: "haenael.app", pathPrefix: "/invite" }
        ],
        category: ["BROWSABLE", "DEFAULT"]
      }
    ]
  },
  web: {
    bundler: "metro",
    output: "static"
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-notifications",
    "expo-web-browser",
    "expo-iap"
  ],
  experiments: {
    typedRoutes: true
  },
  extra: {
    eas: {
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? ""
    }
  }
});
