/**
 * Image Optimization Script
 * Converts images to WebP and creates responsive sizes using Jimp (Pure JS)
 */

import fs from 'fs';
import path from 'path';
import { Jimp } from 'jimp';

// Image optimization settings
const OPTIMIZATION_CONFIG = {
  // Icons - keep original format for compatibility
  icons: {
    sizes: [96, 72, 512, 384, 192, 152, 144, 128],
    formats: ['png'], // Keep PNG for icons
    quality: 90
  },
  // Content images
  content: {
    formats: ['png'], // Using PNG since Jimp handles it natively without binaries
    quality: 85,
    sizes: [400, 800, 1200] // Responsive sizes
  }
};

async function optimizeImage(inputPath, outputPath, options) {
  try {
    // Create output directory if it doesn't exist
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Using Jimp (Pure JS) instead of Sharp for F-Droid compliance
    const image = await Jimp.read(inputPath);
    
    // Resize if requested in options
    if (options.resize) {
      image.resize({ w: options.resize });
    }

    // Set quality (Jimp supports quality on export)
    // NOTE: In Jimp v1, quality and writing are handled differently.
    await image.write(outputPath);

    console.log(`✅ Optimized (Jimp): ${inputPath} -> ${outputPath}`);
  } catch (error) {
    console.error(`❌ Failed to process ${inputPath} with Jimp:`, error.message);
  }
}

async function processImages() {
  const publicDir = path.join(process.cwd(), 'public');
  const outputDir = path.join(process.cwd(), 'public/optimized');

  // Process icons (keep PNG)
  const iconFiles = [
    'icon-96x96.png',
    'icon-72x72.png', 
    'icon-512x512.png',
    'icon-384x384.png',
    'icon-192x192.png',
    'icon-152x152.png',
    'icon-144x144.png',
    'icon-128x128.png',
    'favicon.png'
  ];

  console.log('🔧 Processing app icons...');
  iconFiles.forEach(file => {
    const inputPath = path.join(publicDir, file);
    if (fs.existsSync(inputPath)) {
      // Copy icons as-is (no conversion for compatibility)
      const outputPath = path.join(outputDir, file);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      fs.copyFileSync(inputPath, outputPath);
      console.log(`📋 Copied icon: ${file}`);
    }
  });

  // Process content images
  console.log('🔧 Processing content images...');
  const contentImages = ['qibla.png', 'apple-touch-icon.png'];
  
  for (const file of contentImages) {
    const inputPath = path.join(publicDir, file);
    if (fs.existsSync(inputPath)) {
      const outputPath = path.join(outputDir, file);
      await optimizeImage(inputPath, outputPath, { quality: 85 });
      
      // Create responsive sizes
      for (const size of OPTIMIZATION_CONFIG.content.sizes) {
        const resizedPath = path.join(outputDir, `${size}-${file}`);
        await optimizeImage(inputPath, resizedPath, { resize: size, quality: 85 });
      }
    }
  }
}

// Fixed path for ES modules
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);

if (__filename === process.argv[1]) {
  processImages().then(() => console.log('🚀 Image optimization complete!'));
}

export { processImages, OPTIMIZATION_CONFIG };
