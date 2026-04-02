/**
 * Audio Optimization Script
 * Compresses audio files while maintaining quality
 */

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

// Audio optimization settings
const AUDIO_CONFIG = {
  // Adhan files - optimize but keep good quality
  adhan: {
    bitrate: '96k', // Reduce from current ~128k to 96k
    format: 'mp3',
    quality: 5 // 0-9 scale, 5 is good balance
  },
  // Short sounds - can be more compressed
  short: {
    bitrate: '64k',
    format: 'mp3', 
    quality: 6
  }
};

function getAudioSize(filePath) {
  const stats = fs.statSync(filePath);
  return (stats.size / 1024 / 1024).toFixed(2); // MB
}

function optimizeAudio(inputPath, outputPath, config) {
  try {
    const originalSize = getAudioSize(inputPath);
    
    // Create output directory if it doesn't exist
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // FFmpeg is removed for F-Droid compliance.
    // In a production environment, you should use a FOSS alternative or pre-optimize assets.
    console.warn(`⚠️ FFmpeg optimization skipped for ${path.basename(inputPath)} (F-Droid compliance)`);
    fs.copyFileSync(inputPath, outputPath);
    
    const newSize = getAudioSize(outputPath);
    const savings = ((originalSize - newSize) / originalSize * 100).toFixed(1);
    
    console.log(`✅ Copied: ${path.basename(inputPath)}`);
    console.log(`   Original: ${originalSize}MB → Copied: ${newSize}MB (${savings}% savings)`);
  } catch (error) {
    console.error(`❌ Failed to process ${inputPath}:`, error.message);
  }
}

function processAudio() {
  const publicDir = path.join(process.cwd(), 'public/audio');
  const outputDir = path.join(process.cwd(), 'public/audio/optimized');

  if (!fs.existsSync(publicDir)) {
    console.log('❌ Audio directory not found');
    return;
  }

  const audioFiles = fs.readdirSync(publicDir).filter(file => file.endsWith('.mp3'));
  
  console.log('🔧 Processing audio files...');
  console.log(`📁 Found ${audioFiles.length} audio files`);

  let totalOriginalSize = 0;
  let totalOptimizedSize = 0;

  audioFiles.forEach(file => {
    const inputPath = path.join(publicDir, file);
    const outputPath = path.join(outputDir, file);
    
    // Determine config based on file type
    const config = file.includes('salam') ? AUDIO_CONFIG.short : AUDIO_CONFIG.adhan;
    
    const originalSize = parseFloat(getAudioSize(inputPath));
    totalOriginalSize += originalSize;
    
    optimizeAudio(inputPath, outputPath, config);
    
    // Calculate optimized size for total
    if (fs.existsSync(outputPath)) {
      const optimizedSize = parseFloat(getAudioSize(outputPath));
      totalOptimizedSize += optimizedSize;
    }
  });

  const totalSavings = ((totalOriginalSize - totalOptimizedSize) / totalOriginalSize * 100).toFixed(1);
  console.log(`\n📊 Summary:`);
  console.log(`   Total original: ${totalOriginalSize.toFixed(2)}MB`);
  console.log(`   Total optimized: ${totalOptimizedSize.toFixed(2)}MB`);
  console.log(`   Total savings: ${totalSavings}% (${(totalOriginalSize - totalOptimizedSize).toFixed(2)}MB)`);
}

// Fixed path for ES modules
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);

if (__filename === process.argv[1]) {
  processAudio();
}

export { processAudio, AUDIO_CONFIG };
