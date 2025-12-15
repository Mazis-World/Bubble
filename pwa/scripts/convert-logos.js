const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const publicDir = path.join(__dirname, '../public');
const logos = [
  { name: 'familybubble-logo.svg', sizes: [{ width: 200, height: 200 }] },
  { name: 'familybubble-logo-square.svg', sizes: [{ width: 512, height: 512 }, { width: 1024, height: 1024 }] },
  { name: 'familybubble-logo-with-text.svg', sizes: [{ width: 600, height: 200 }, { width: 1200, height: 400 }] },
  { name: 'familybubble-logo-icon-only.svg', sizes: [{ width: 128, height: 128 }, { width: 256, height: 256 }, { width: 512, height: 512 }] },
];

async function convertLogos() {
  console.log('Converting SVG logos to PNG...\n');

  for (const logo of logos) {
    const svgPath = path.join(publicDir, logo.name);
    
    if (!fs.existsSync(svgPath)) {
      console.log(`⚠️  ${logo.name} not found, skipping...`);
      continue;
    }

    for (const size of logo.sizes) {
      const pngName = logo.name.replace('.svg', `-${size.width}x${size.height}.png`);
      const pngPath = path.join(publicDir, pngName);

      try {
        await sharp(svgPath)
          .resize(size.width, size.height, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .png()
          .toFile(pngPath);

        console.log(`✅ Created ${pngName}`);
      } catch (error) {
        console.error(`❌ Error converting ${logo.name} to ${pngName}:`, error.message);
      }
    }
  }

  console.log('\n✨ Conversion complete!');
}

convertLogos().catch(console.error);
