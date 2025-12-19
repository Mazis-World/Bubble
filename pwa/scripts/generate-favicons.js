const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const publicDir = path.join(__dirname, '../public');
const faviconSvg = path.join(publicDir, 'favicon.svg');

const faviconSizes = [
  { name: 'favicon-16x16.png', width: 16, height: 16 },
  { name: 'favicon-32x32.png', width: 32, height: 32 },
  { name: 'apple-touch-icon.png', width: 180, height: 180 },
  { name: 'logo192.png', width: 192, height: 192 },
  { name: 'logo512.png', width: 512, height: 512 },
];

async function generateFavicons() {
  console.log('🎨 Generating favicon PNG files from favicon.svg...\n');

  if (!fs.existsSync(faviconSvg)) {
    console.error(`❌ Error: ${faviconSvg} not found!`);
    process.exit(1);
  }

  for (const size of faviconSizes) {
    const pngPath = path.join(publicDir, size.name);
    
    try {
      await sharp(faviconSvg)
        .resize(size.width, size.height, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(pngPath);

      console.log(`✅ Created ${size.name} (${size.width}×${size.height})`);
    } catch (error) {
      console.error(`❌ Error creating ${size.name}:`, error.message);
    }
  }

  console.log('\n✨ Favicon generation complete!');
  console.log('📝 All favicon files are now updated in pwa/public/');
}

generateFavicons().catch(console.error);
