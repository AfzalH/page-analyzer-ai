const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const distDir = path.join(__dirname, '..', 'dist');
const outputDir = path.join(__dirname, '..', 'releases');
const packageJson = require('../package.json');
const version = packageJson.version;
const zipName = `page-analyzer-ai-v${version}.zip`;

// Create releases directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const outputPath = path.join(outputDir, zipName);

// Remove existing zip if it exists
if (fs.existsSync(outputPath)) {
  fs.unlinkSync(outputPath);
}

// Create zip file
try {
  execSync(`cd "${distDir}" && zip -r "${outputPath}" .`, { stdio: 'inherit' });

  const stats = fs.statSync(outputPath);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

  console.log('');
  console.log('========================================');
  console.log(`  Chrome Web Store package created!`);
  console.log('========================================');
  console.log(`  File: ${zipName}`);
  console.log(`  Size: ${sizeMB} MB`);
  console.log(`  Path: ${outputPath}`);
  console.log('========================================');
  console.log('');
  console.log('Next steps:');
  console.log('1. Go to https://chrome.google.com/webstore/devconsole');
  console.log('2. Click "New Item" or select existing item');
  console.log('3. Upload the zip file');
  console.log('4. Fill in store listing details');
  console.log('5. Submit for review');
  console.log('');
} catch (error) {
  console.error('Failed to create zip:', error.message);
  process.exit(1);
}
