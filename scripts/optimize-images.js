/**
 * Image Optimization Script
 * Converts images to WebP and creates responsive sizes
 */

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

// Image optimization settings
const OPTIMIZATION_CONFIG = {
  // Icons - keep original format for compatibility
  icons: {
    sizes: [96, 72, 512, 384, 192, 152, 144, 128],
    formats: ['png'], // Keep PNG for icons
    quality: 90
  },
  // Content images - convert to WebP
  content: {
    formats: ['webp', 'png'], // WebP + PNG fallback
    quality: 85,
    sizes: [400, 800, 1200] // Responsive sizes
  }
};

function optimizeImage(inputPath, outputPath, options) {
  try {
    // Create output directory if it doesn't exist
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Sharp is removed for F-Droid compliance.
    // In a production environment, you should use a FOSS alternative or pre-optimize assets.
    console.warn(`⚠️ Sharp optimization skipped for ${path.basename(inputPath)} (F-Droid compliance)`);
    fs.copyFileSync(inputPath, outputPath);
    
    console.log(`✅ Copied: ${inputPath} -> ${outputPath}`);
  } catch (error) {
    console.error(`❌ Failed to process ${inputPath}:`, error.message);
  }
}

function processImages() {
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
  
  contentImages.forEach(file => {
    const inputPath = path.join(publicDir, file);
    if (fs.existsSync(inputPath)) {
      const outputPath = path.join(outputDir, file);
      optimizeImage(inputPath, outputPath, { quality: 85 });
      
      // Create placeholders for responsive sizes
      OPTIMIZATION_CONFIG.content.sizes.forEach(size => {
        const resizedPath = path.join(outputDir, `${size}-${file}`);
         try {
           fs.copyFileSync(inputPath, resizedPath);
           console.log(`📐 Copied ${size}px placeholder: ${resizedPath}`);
         } catch (error) {
           console.error(`❌ Failed to copy ${size}px placeholder:`, error.message);
         }
      });
    }
  });
}

// Fixed path for ES modules
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);

if (__filename === process.argv[1]) {
  processImages();
}

export { processImages, OPTIMIZATION_CONFIG };
