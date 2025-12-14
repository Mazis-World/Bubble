# Vercel Deployment Setup

## Current Configuration

The project is set up with:
- Root `vercel.json` pointing to `pwa` subdirectory
- `.npmrc` with `legacy-peer-deps=true` at root
- `pwa/.npmrc` with same setting
- Firebase pinned to exact version `10.7.1`

## Vercel Project Settings

**IMPORTANT:** In your Vercel dashboard:

1. Go to **Project Settings** → **General**
2. Set **Root Directory** to: `pwa`
3. This tells Vercel to treat `pwa/` as the project root

## Alternative: If Root Directory is NOT set

If you can't set Root Directory, the `vercel.json` at root will handle it, but you may need to:

1. Ensure `package-lock.json` is committed
2. Check that all Firebase dependencies are in the lock file
3. The build command will `cd pwa` before running

## Firebase Module Resolution

The error `Can't resolve '@firebase/firestore'` typically means:
- Dependencies aren't installing correctly
- Package-lock.json is out of sync
- Node/npm version mismatch

## Troubleshooting

If build still fails:

1. **Check Vercel Build Logs** - Look for npm install errors
2. **Verify Node Version** - Vercel should use Node 18+ (set in Project Settings → General)
3. **Clear Build Cache** - In Vercel: Settings → General → Clear Build Cache
4. **Check Environment Variables** - Ensure all Firebase env vars are set in Vercel

## Current Build Process

```bash
cd pwa
rm -rf node_modules  # Clean install
npm install --legacy-peer-deps --no-audit
npm run build
```

This ensures:
- Clean dependency installation
- Peer dependencies are installed (legacy mode)
- Firebase internal packages (@firebase/*) are resolved
