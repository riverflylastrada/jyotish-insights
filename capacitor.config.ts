import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.acharyajyotish.app",
  appName: "Acharya Jyotish",
  webDir: "dist",
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#FBF8F1",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK", // light text on dark (maroon) background
      backgroundColor: "#6B1F2A",
    },
  },
  server: {
    // Use default local asset serving (capacitor://localhost on iOS,
    // http://localhost on Android). Do NOT set `url` to production site —
    // bundle dist locally for offline support and store-review compliance.
    androidScheme: "https",
  },
};

export default config;
