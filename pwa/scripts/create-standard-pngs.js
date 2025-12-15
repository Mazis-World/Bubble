const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const publicDir = path.join(__dirname, '../public');

const standardSizes = [
  { name: 'familybubble-logo.svg', output: 'familybubble-logo.png', width: 200, height: 200 },
  { name: 'familybubble-logo-square.svg', output: 'familybubble-logo-square.png', width: 512, height: 512 },
  { name: 'familybubble-logo-with-text.svg', output: 'familybubble-logo-with-text.png', width: 600, height: 200 },
  { name: 'familybubble-logo-icon-only.svg', output: 'familybubble-logo-icon-only.png', width: 128, height: 128 },
];

async function createStandardPNGs() {
  console.log('Creating standard PNG versions...\n');

  for (const logo of standardSizes) {
    const svgPath = path.join(publicDir, logo.name);
    const pngPath = path.join(publicDir, logo.output);
    
    if (!fs.existsSync(svgPath)) {
      console.log(`⚠️  ${logo.name} not found, skipping...`);
      continue;
    }

    try {
      await sharp(svgPath)
        .resize(logo.width, logo.height, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(pngPath);

      console.log(`✅ Created ${logo.output}`);
    } catch (error) {
      console.error(`❌ Error converting ${logo.name}:`, error.message);
    }
  }

  console.log('\n✨ Standard PNGs created!');
}

createStandardPNGs().catch(console.error);
