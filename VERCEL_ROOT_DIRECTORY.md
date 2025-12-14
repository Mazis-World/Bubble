# Vercel Root Directory Configuration

## CRITICAL: Set Root Directory in Vercel

The Firebase module resolution error is likely because Vercel needs to know the project root.

### Steps to Fix:

1. **Go to Vercel Dashboard**
   - Open your project
   - Click **Settings** → **General**

2. **Set Root Directory**
   - Find **Root Directory** setting
   - Set it to: `pwa`
   - Click **Save**

3. **Update vercel.json** (already done)
   - The `vercel.json` at root has been updated to work with Root Directory = `pwa`
   - Build commands no longer need `cd pwa`

4. **Redeploy**
   - After setting Root Directory, trigger a new deployment
   - The build should now work correctly

## Why This Fixes It

When Root Directory is set to `pwa`:
- Vercel treats `pwa/` as the project root
- `package.json` and `package-lock.json` are found correctly
- Dependencies install in the right location
- Firebase's internal modules resolve properly

## Alternative: If You Can't Set Root Directory

If you must keep root as the project root, the `vercel.json` will use `cd pwa` commands, but you may still encounter issues. Setting Root Directory is the recommended solution.
