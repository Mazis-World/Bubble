# Android & iOS Deployment Guide

This guide will help you deploy FamilyBubble as native Android and iOS apps using Capacitor.

## ✅ What's Set Up

- ✅ Capacitor core and platform packages installed
- ✅ Capacitor configuration file created
- ✅ Build scripts added to package.json
- ✅ Support for both Android and iOS platforms

## Prerequisites

### For Android Development
1. **Android Studio** - Download from [developer.android.com](https://developer.android.com/studio)
2. **Java Development Kit (JDK)** - Version 11 or higher
3. **Android SDK** - Installed via Android Studio
4. **Environment Variables** (Windows):
   ```powershell
   # Add to your system environment variables
   ANDROID_HOME=C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk
   JAVA_HOME=C:\Program Files\Java\jdk-11
   ```

### For iOS Development (Mac only)
1. **Xcode** - Download from Mac App Store (requires macOS)
2. **CocoaPods** - Install via: `sudo gem install cocoapods`
3. **Apple Developer Account** - Required for App Store deployment ($99/year)

## Initial Setup

### 1. Install Dependencies

```bash
cd pwa
npm install
```

This will install Capacitor and all required packages.

### 2. Initialize Capacitor (First Time Only)

```bash
cd pwa
npx cap init
```

When prompted:
- **App name**: FamilyBubble
- **App ID**: com.familybubble.app (or your custom package name)
- **Web dir**: build

**Note**: The `capacitor.config.ts` file is already created, so you can skip this step if the file exists.

### 3. Add Android Platform

```bash
cd pwa
npx cap add android
```

This creates the `android/` directory with the native Android project.

### 4. Add iOS Platform (Mac only)

```bash
cd pwa
npx cap add ios
```

This creates the `ios/` directory with the native iOS project.

## Building for Android

### Step 1: Build Your Web App

```bash
cd pwa
npm run build:prod
```

This creates an optimized production build in the `build/` directory.

### Step 2: Sync with Capacitor

```bash
cd pwa
npx cap sync
```

This copies your web build to the native Android project and updates native dependencies.

### Step 3: Open in Android Studio

```bash
cd pwa
npx cap open android
```

Or use the npm script:
```bash
npm run cap:open:android
```

### Step 4: Build APK/AAB in Android Studio

1. **Open Android Studio** (should open automatically)
2. **Wait for Gradle sync** to complete
3. **Build → Generate Signed Bundle / APK**
4. Choose **Android App Bundle (AAB)** for Play Store or **APK** for direct distribution
5. Create or select a keystore (see "Signing Your App" below)
6. Select build variant: **release**
7. Click **Finish**

The signed APK/AAB will be generated in `android/app/release/`

### Quick Build Script

You can also use the combined script:
```bash
npm run android:build
```

This builds the web app, syncs with Capacitor, and opens Android Studio.

## Building for iOS (Mac only)

### Step 1: Build Your Web App

```bash
cd pwa
npm run build:prod
```

### Step 2: Sync with Capacitor

```bash
cd pwa
npx cap sync
```

### Step 3: Open in Xcode

```bash
cd pwa
npx cap open ios
```

Or use the npm script:
```bash
npm run ios:build
```

### Step 4: Configure in Xcode

1. **Select your project** in the navigator
2. **Select the "FamilyBubble" target**
3. **Signing & Capabilities** tab:
   - Select your **Team** (Apple Developer account)
   - Xcode will automatically manage provisioning profiles
4. **General** tab:
   - Set **Display Name**: FamilyBubble
   - Set **Bundle Identifier**: com.familybubble.app
   - Set **Version** and **Build** numbers

### Step 5: Build and Archive

1. **Product → Destination → Any iOS Device**
2. **Product → Archive**
3. Wait for the archive to complete
4. **Distribute App**:
   - **App Store Connect** - For App Store submission
   - **Ad Hoc** - For testing on specific devices
   - **Development** - For development builds
   - **Enterprise** - For enterprise distribution

## App Configuration

### Android App Configuration

Edit `android/app/src/main/res/values/strings.xml`:

```xml
<resources>
    <string name="app_name">FamilyBubble</string>
</resources>
```

### iOS App Configuration

Edit `ios/App/App/Info.plist` or use Xcode's interface to configure:
- App name
- Bundle identifier
- Version number
- Required permissions

## App Icons and Splash Screens

### Android Icons

Place your app icons in:
- `android/app/src/main/res/mipmap-mdpi/ic_launcher.png` (48x48)
- `android/app/src/main/res/mipmap-hdpi/ic_launcher.png` (72x72)
- `android/app/src/main/res/mipmap-xhdpi/ic_launcher.png` (96x96)
- `android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png` (144x144)
- `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` (192x192)

Or use Android Studio's **Image Asset Studio**:
1. Right-click `res` folder → **New → Image Asset**
2. Select **Launcher Icons**
3. Upload your icon image

### iOS Icons

Use Xcode's **Assets.xcassets**:
1. Open `ios/App/App/Assets.xcassets`
2. Select **AppIcon**
3. Drag and drop icons for all required sizes

### Splash Screens

Capacitor automatically generates splash screens. You can customize them:

**Android**: Edit `android/app/src/main/res/drawable/splash.xml`

**iOS**: Configure in Xcode under **Launch Screen**

## Signing Your App

### Android Signing

1. **Generate a keystore** (first time only):
   ```bash
   keytool -genkey -v -keystore familybubble-release.keystore -alias familybubble -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Store the keystore securely** - Never commit it to version control!

3. **Create `android/key.properties`** (add to .gitignore):
   ```properties
   storePassword=YOUR_STORE_PASSWORD
   keyPassword=YOUR_KEY_PASSWORD
   keyAlias=familybubble
   storeFile=../familybubble-release.keystore
   ```

4. **Update `android/app/build.gradle`** to use the keystore for release builds.

### iOS Signing

iOS signing is handled automatically by Xcode when you:
1. Select your Team in **Signing & Capabilities**
2. Xcode creates and manages certificates and provisioning profiles

## Environment Variables for Native Apps

Native apps need environment variables at build time. You have a few options:

### Option 1: Build-time Environment Variables (Recommended)

Create platform-specific config files:

**Android**: Create `android/app/src/main/assets/env.json`:
```json
{
  "FIREBASE_API_KEY": "your_key_here",
  "REVENUECAT_API_KEY": "your_key_here"
}
```

**iOS**: Create `ios/App/App/env.plist`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
  <key>FIREBASE_API_KEY</key>
  <string>your_key_here</string>
  <key>REVENUECAT_API_KEY</key>
  <string>your_key_here</string>
</dict>
</plist>
```

Then update your React code to read from these files in native environments.

### Option 2: Capacitor Preferences

Add to `capacitor.config.ts`:
```typescript
plugins: {
  // ... existing plugins
  Preferences: {
    // Store sensitive data securely
  }
}
```

## Testing Your App

### Android Testing

1. **Connect an Android device** via USB
2. **Enable Developer Options** and **USB Debugging** on your device
3. In Android Studio, click **Run** (green play button)
4. Select your device and click **OK**

Or use an emulator:
1. **Tools → Device Manager → Create Device**
2. Select a device template and system image
3. Click **Run** in Android Studio

### iOS Testing

1. **Connect an iOS device** via USB
2. **Trust the computer** on your device
3. In Xcode, select your device from the device dropdown
4. Click **Run** (play button)

Or use the iOS Simulator:
1. Select a simulator from the device dropdown
2. Click **Run**

## Publishing to App Stores

### Google Play Store

1. **Create a Google Play Developer account** ($25 one-time fee)
2. **Create a new app** in Google Play Console
3. **Upload your AAB** (Android App Bundle) file
4. **Fill in store listing** (description, screenshots, etc.)
5. **Set up pricing and distribution**
6. **Submit for review**

### Apple App Store

1. **Create an Apple Developer account** ($99/year)
2. **Create a new app** in App Store Connect
3. **Archive and upload** from Xcode (Product → Archive → Distribute App)
4. **Fill in App Store listing** (description, screenshots, etc.)
5. **Submit for review**

## Troubleshooting

### Android Issues

**Gradle sync fails:**
- Check Java version: `java -version` (should be 11+)
- Check ANDROID_HOME environment variable
- In Android Studio: **File → Invalidate Caches / Restart**

**Build fails:**
- Clean build: **Build → Clean Project**
- Rebuild: **Build → Rebuild Project**
- Check `android/build.gradle` and `android/app/build.gradle` for errors

**App crashes on launch:**
- Check Android logcat: **View → Tool Windows → Logcat**
- Verify web build is synced: `npx cap sync`
- Check for JavaScript errors in logcat

### iOS Issues

**Xcode build fails:**
- Run `pod install` in `ios/App` directory
- Clean build folder: **Product → Clean Build Folder** (Shift+Cmd+K)
- Check signing and provisioning profiles

**App crashes on launch:**
- Check Xcode console for errors
- Verify web build is synced: `npx cap sync`
- Check Info.plist for required permissions

**CocoaPods issues:**
```bash
cd ios/App
pod deintegrate
pod install
```

## Useful Commands

```bash
# Sync web build to native projects
npm run cap:sync

# Copy web assets only (faster than sync)
npm run cap:copy

# Update Capacitor and plugins
npm run cap:update

# Open Android project
npm run cap:open:android

# Open iOS project
npm run cap:open:ios

# Build and open Android
npm run android:build

# Build and open iOS
npm run ios:build
```

## Next Steps

1. ✅ Install Android Studio (for Android) or Xcode (for iOS)
2. ✅ Run `npm install` to install Capacitor dependencies
3. ✅ Run `npx cap add android` (and/or `npx cap add ios`)
4. ✅ Build your web app: `npm run build:prod`
5. ✅ Sync with Capacitor: `npx cap sync`
6. ✅ Open in Android Studio/Xcode and configure
7. ✅ Test on device or emulator
8. ✅ Build release version
9. ✅ Submit to app stores

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Developer Guide](https://developer.android.com/guide)
- [iOS Developer Guide](https://developer.apple.com/documentation/)
- [Google Play Console](https://play.google.com/console)
- [App Store Connect](https://appstoreconnect.apple.com)

---

**Status: ✅ Ready for Android & iOS Deployment**

Your app is configured to work on both Android and iOS! Follow the steps above to build and deploy.

