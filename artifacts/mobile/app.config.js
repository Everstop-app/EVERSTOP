/** @type {import('expo/config').ExpoConfig} */
const config = {
  name: "EverStop",
  slug: "everstop",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "everstop",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  splash: {
    image: "./assets/images/splash.png",
    resizeMode: "contain",
    backgroundColor: "#2080DF",
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.everstop.app",
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "EverStop uses your location to show nearby delivery stops and calculate routes.",
      NSLocationAlwaysAndWhenInUseUsageDescription:
        "EverStop uses your location to show nearby delivery stops and calculate routes.",
    },
  },
  android: {
    package: "com.everstop.app",
    adaptiveIcon: {
      foregroundImage: "./assets/images/icon.png",
      backgroundColor: "#2080DF",
    },
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY,
      },
    },
    permissions: [
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_COARSE_LOCATION",
    ],
  },
  web: {
    favicon: "./assets/images/icon.png",
  },
  plugins: [
    [
      "expo-router",
      {
        origin: "https://replit.com/",
      },
    ],
    "expo-font",
    "expo-web-browser",
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "EverStop uses your location to show nearby delivery stops and calculate routes.",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: {
      projectId: "a97a6f29-d614-4098-b822-7c003ea080b1",
    },
  },
};

module.exports = { expo: config };
