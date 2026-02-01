const sharp = require('sharp');
const path = require('path');

// Lucide file-search icon with purple color
const svg = `<svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="#7c3aed"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
  <path d="M14 2v5a1 1 0 0 0 1 1h5" />
  <circle cx="11.5" cy="14.5" r="2.5" />
  <path d="M13.3 16.3 15 18" />
</svg>`;

const sizes = [16, 32, 48, 128];
const outputDir = path.join(__dirname, '..', 'public', 'icons');

async function generateIcons() {
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon${size}.png`);

    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`Generated: icon${size}.png`);
  }
}

generateIcons().then(() => {
  console.log('All icons generated successfully!');
}).catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
