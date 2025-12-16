const fs = require('fs');
const path = require('path');

// Get the site URL from environment variable
// Priority: REACT_APP_SITE_URL > VERCEL_URL > fallback
let siteUrl = process.env.REACT_APP_SITE_URL;
if (!siteUrl && process.env.VERCEL_URL) {
  siteUrl = `https://${process.env.VERCEL_URL}`;
}
if (!siteUrl) {
  // If no URL is set, skip replacement (user should set it manually)
  console.log('⚠️  REACT_APP_SITE_URL or VERCEL_URL not set. Using placeholder in index.html');
  console.log('   Set REACT_APP_SITE_URL in Vercel environment variables for automatic replacement.');
  process.exit(0);
}

// Read index.html
const indexPath = path.join(__dirname, '../public/index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Replace placeholder with actual domain
html = html.replace(/YOUR_DOMAIN_HERE/g, siteUrl);

// Write back
fs.writeFileSync(indexPath, html, 'utf8');

console.log(`✅ Updated Open Graph URLs with: ${siteUrl}`);
