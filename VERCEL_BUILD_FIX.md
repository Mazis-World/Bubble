# Vercel Build Fix for Firebase Module Resolution

## Issue
`Module not found: Error: Can't resolve '@firebase/firestore'` during Vercel build

## Solution Applied

### 1. Created `.npmrc` in `pwa/` directory
- Added `legacy-peer-deps=true` to handle peer dependency resolution
- This ensures Firebase's internal dependencies are properly installed

### 2. Updated `vercel.json`
- Changed to use `npm ci` instead of `npm install` for more reliable builds
- `npm ci` uses the exact versions from `package-lock.json`

### 3. Updated build script
- Changed to use `npx react-scripts build` to handle permissions

## Vercel Configuration

**Important:** In your Vercel project settings:
1. Go to **Project Settings** → **General**
2. Set **Root Directory** to `pwa`
3. OR keep root and the `vercel.json` will handle it

## Verification

The Firebase dependencies are correctly installed:
- `firebase@10.14.1` (or latest compatible)
- `@firebase/firestore@4.7.3` (installed as dependency of firebase)

## Next Steps

1. **Commit the changes:**
   ```bash
   git add pwa/.npmrc vercel.json pwa/package.json
   git commit -m "fix: Vercel build configuration for Firebase dependencies"
   git push
   ```

2. **Redeploy on Vercel** - the build should now work

3. **If still failing:**
   - Check Vercel build logs for specific errors
   - Ensure `package-lock.json` is committed to the repo
   - Try clearing Vercel build cache in project settings
