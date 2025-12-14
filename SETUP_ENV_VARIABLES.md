# Environment Variables Setup

## ✅ Quick Fix Applied

I've created a `.env` file in the `pwa/` directory with your original API keys so the app works immediately.

## 📍 Where to Update API Keys

### For Development
The `.env` file in `pwa/.env` is already created with your keys. This file is gitignored, so it won't be committed.

### For Production
When you're ready to deploy to production:

1. **Create `.env.production` file** in the `pwa/` directory:
   ```bash
   cd pwa
   cp .env .env.production
   ```

2. **Update with production keys:**
   - Replace Firebase keys with your production Firebase project keys
   - Replace RevenueCat test key with your production RevenueCat API key

3. **Build for production:**
   ```bash
   npm run build:prod
   ```

## 🔑 Current Keys (Development)

The `.env` file contains:
- ✅ Firebase API keys (from your original config)
- ✅ RevenueCat test key (replace with production key before going live)

## ⚠️ Important Notes

1. **`.env` file is gitignored** - Your keys are safe and won't be committed
2. **For production**: Create `.env.production` with production keys
3. **RevenueCat**: The current key is a TEST key - replace it with your production key before going live

## 🔄 Restart Required

After creating/updating the `.env` file:
1. Stop your development server (Ctrl+C)
2. Restart it: `npm start`

React needs to be restarted to pick up new environment variables.

---

**Status: ✅ Environment variables configured**

Your app should now work with the API keys in the `.env` file!
