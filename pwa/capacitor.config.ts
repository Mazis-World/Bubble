import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.familybubble.app',
  appName: 'FamilyBubble',
  webDir: 'build',
  server: {
    androidScheme: 'https',
    iosScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#0a0a0a",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    }
  },
  android: {
    allowMixedContent: true,
    // Native shells should request ACCESS_FINE_LOCATION and ACCESS_COARSE_LOCATION.
    // Places geofencing also needs ACCESS_BACKGROUND_LOCATION on Android 10+
    // so arrivals still work after the app is backgrounded or the phone restarts.
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined
    }
  },
  ios: {
    scheme: 'FamilyBubble',
    contentInset: 'automatic'
    // Native shells should include NSLocationWhenInUseUsageDescription.
    // NSLocationAlwaysAndWhenInUseUsageDescription is required for Places
    // background arrival/departure detection after the app is closed.
  }
};

export default config;

