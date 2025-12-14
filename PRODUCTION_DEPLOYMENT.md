# Production Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Variables Setup

Create a `.env.production` file in the `pwa/` directory with your production credentials:

```bash
# Firebase Configuration (Production)
REACT_APP_FIREBASE_API_KEY=your_production_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_production_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_production_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_production_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_production_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_production_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=your_production_measurement_id

# RevenueCat Configuration (Production)
# IMPORTANT: Use your PRODUCTION API key, not the test key
REACT_APP_REVENUECAT_API_KEY=your_production_revenuecat_api_key
```

**⚠️ CRITICAL:** 
- Never commit `.env.production` to version control
- Use production API keys, not test keys
- Verify all environment variables are set before building

### 2. Firebase Security Rules Deployment

Deploy Firestore security rules and Storage rules:

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Storage rules
firebase deploy --only storage

# Or deploy both at once
firebase deploy --only firestore:rules,storage
```

### 3. Build Production Bundle

```bash
cd pwa
npm run build:prod
```

This creates an optimized production build in `pwa/build/`.

### 4. Test Production Build Locally

Before deploying, test the production build:

```bash
cd pwa
npm install -g serve
serve -s build -l 3000
```

Visit `http://localhost:3000` and verify:
- ✅ All features work correctly
- ✅ No console errors (except intentional warnings)
- ✅ API calls use production endpoints
- ✅ Authentication works
- ✅ Images load correctly
- ✅ RevenueCat uses production API key

### 5. Deploy to Firebase Hosting

```bash
# From project root
firebase deploy --only hosting
```

Or deploy everything:

```bash
firebase deploy
```

### 6. Post-Deployment Verification

After deployment, verify:

- [ ] Application loads correctly
- [ ] Authentication works
- [ ] Database reads/writes work
- [ ] File uploads work
- [ ] RevenueCat subscriptions work
- [ ] No console errors in production
- [ ] Performance is acceptable
- [ ] Mobile responsiveness works
- [ ] PWA features work (if implemented)

## Security Checklist

- [x] ✅ API keys moved to environment variables
- [x] ✅ Debug logging disabled in production
- [x] ✅ Firestore security rules implemented
- [x] ✅ Storage security rules implemented
- [x] ✅ Error boundaries added
- [x] ✅ `.env` files excluded from git

## Performance Optimizations

The production build includes:
- ✅ Code minification
- ✅ Tree shaking
- ✅ Asset optimization
- ✅ Caching headers configured in `firebase.json`
- ✅ Service worker (if configured)

## Monitoring & Error Tracking

Consider integrating:
- **Error Tracking**: Sentry, LogRocket, or Firebase Crashlytics
- **Analytics**: Google Analytics, Firebase Analytics
- **Performance**: Web Vitals, Lighthouse CI

## Rollback Procedure

If issues occur after deployment:

```bash
# List recent deployments
firebase hosting:channel:list

# Rollback to previous version
firebase hosting:clone <previous-site-id> <current-site-id>
```

## Environment-Specific Configurations

### Development
- Uses `.env.development.local` or `.env.local`
- Debug logging enabled
- Development API keys

### Production
- Uses `.env.production` or `.env.production.local`
- Error logging only
- Production API keys
- Optimized builds

## Troubleshooting

### Build Fails
- Check all environment variables are set
- Verify Node.js version compatibility
- Clear `node_modules` and reinstall: `rm -rf node_modules package-lock.json && npm install`

### Runtime Errors
- Check browser console for errors
- Verify Firebase project configuration
- Check Firestore/Storage rules are deployed
- Verify API keys are correct

### Performance Issues
- Run Lighthouse audit
- Check bundle size: `npm run build` and review build output
- Optimize images before upload
- Enable compression in Firebase Hosting

## Support

For issues or questions, check:
- Firebase Console: https://console.firebase.google.com
- RevenueCat Dashboard: https://app.revenuecat.com
- Application logs in browser console
