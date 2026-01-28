#!/usr/bin/env node

/**
 * Bundle Size Monitoring Script
 * 
 * Checks that no JavaScript chunk exceeds the configured size limit.
 * Designed to run in CI to prevent bundle bloat.
 * 
 * Usage:
 *   node scripts/check-bundle-size.mjs [--max-size=200] [--vendor-max=450]
 * 
 * Options:
 *   --max-size    Maximum allowed chunk size in KB for app code (default: 200)
 *   --vendor-max  Maximum allowed chunk size in KB for vendor chunks (default: 450)
 */

import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const DEFAULT_MAX_SIZE_KB = 200;
const DEFAULT_VENDOR_MAX_KB = 450;
const DIST_DIR = join(__dirname, '..', 'dist', 'public', 'assets');

// Vendor chunk patterns
const VENDOR_PATTERNS = ['vendor-', 'node_modules'];

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  let maxSizeKB = DEFAULT_MAX_SIZE_KB;
  let vendorMaxKB = DEFAULT_VENDOR_MAX_KB;
  
  for (const arg of args) {
    if (arg.startsWith('--max-size=')) {
      maxSizeKB = parseInt(arg.split('=')[1], 10);
    }
    if (arg.startsWith('--vendor-max=')) {
      vendorMaxKB = parseInt(arg.split('=')[1], 10);
    }
  }
  
  return { maxSizeKB, vendorMaxKB };
}

// Check if a file is a vendor chunk
function isVendorChunk(filename) {
  return VENDOR_PATTERNS.some(pattern => filename.includes(pattern));
}

// Get all JS files in the dist directory
async function getJsFiles(dir) {
  try {
    const files = await readdir(dir);
    return files.filter(f => f.endsWith('.js'));
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
    return [];
  }
}

// Get file size in KB
async function getFileSizeKB(filePath) {
  const stats = await stat(filePath);
  return Math.round(stats.size / 1024);
}

// Format size with color
function formatSize(sizeKB, maxSizeKB, isVendor) {
  const percentage = Math.round((sizeKB / maxSizeKB) * 100);
  const label = isVendor ? ' (vendor)' : '';
  
  if (sizeKB > maxSizeKB) {
    return `\x1b[31m${sizeKB} KB (${percentage}% - EXCEEDS LIMIT)${label}\x1b[0m`;
  } else if (percentage > 80) {
    return `\x1b[33m${sizeKB} KB (${percentage}%)${label}\x1b[0m`;
  } else {
    return `\x1b[32m${sizeKB} KB (${percentage}%)${label}\x1b[0m`;
  }
}

// Main function
async function main() {
  const { maxSizeKB, vendorMaxKB } = parseArgs();
  
  console.log('\\n📦 Bundle Size Check');
  console.log('='.repeat(50));
  console.log(`Max allowed app chunk size: ${maxSizeKB} KB`);
  console.log(`Max allowed vendor chunk size: ${vendorMaxKB} KB\\n`);
  
  const jsFiles = await getJsFiles(DIST_DIR);
  
  if (jsFiles.length === 0) {
    console.log('\\n⚠️  No JavaScript files found in dist/public/assets/');
    console.log('   Run "pnpm build" first to generate the bundle.\\n');
    process.exit(1);
  }
  
  const results = [];
  let hasFailure = false;
  
  for (const file of jsFiles) {
    const filePath = join(DIST_DIR, file);
    const sizeKB = await getFileSizeKB(filePath);
    const isVendor = isVendorChunk(file);
    const limit = isVendor ? vendorMaxKB : maxSizeKB;
    
    results.push({ file, sizeKB, isVendor, limit });
    
    if (sizeKB > limit) {
      hasFailure = true;
    }
  }
  
  // Sort by size descending
  results.sort((a, b) => b.sizeKB - a.sizeKB);
  
  // Print results
  console.log('Chunk Sizes:');
  console.log('-'.repeat(50));
  
  for (const { file, sizeKB, isVendor, limit } of results) {
    const formattedSize = formatSize(sizeKB, limit, isVendor);
    console.log(`  ${file.padEnd(40)} ${formattedSize}`);
  }
  
  // Summary
  const totalSizeKB = results.reduce((sum, r) => sum + r.sizeKB, 0);
  const appChunks = results.filter(r => !r.isVendor);
  const vendorChunks = results.filter(r => r.isVendor);
  const oversizedChunks = results.filter(r => r.sizeKB > r.limit);
  
  console.log('\\n' + '='.repeat(50));
  console.log(`Total bundle size: ${totalSizeKB} KB`);
  console.log(`App chunks: ${appChunks.length} (${appChunks.reduce((s, r) => s + r.sizeKB, 0)} KB)`);
  console.log(`Vendor chunks: ${vendorChunks.length} (${vendorChunks.reduce((s, r) => s + r.sizeKB, 0)} KB)`);
  
  if (hasFailure) {
    console.log(`\\n❌ FAILED: ${oversizedChunks.length} chunk(s) exceed their size limits:`);
    for (const { file, sizeKB, limit, isVendor } of oversizedChunks) {
      const type = isVendor ? 'vendor' : 'app';
      console.log(`   - ${file}: ${sizeKB} KB (limit: ${limit} KB, type: ${type})`);
    }
    console.log('\\nSuggestions:');
    console.log('  1. Use React.lazy() for route-level code splitting');
    console.log('  2. Move large dependencies to separate vendor chunks');
    console.log('  3. Check for duplicate dependencies with "pnpm why <package>"');
    console.log('  4. Consider dynamic imports for rarely-used features\\n');
    process.exit(1);
  } else {
    console.log(`\\n✅ PASSED: All chunks are within their size limits\\n`);
    process.exit(0);
  }
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
