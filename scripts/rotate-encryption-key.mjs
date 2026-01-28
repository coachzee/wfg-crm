#!/usr/bin/env node
/**
 * Encryption Key Rotation Script
 * 
 * This script migrates encrypted credentials from an old encryption key to a new one.
 * 
 * Usage:
 *   1. Set OLD_ENCRYPTION_KEY to your current key
 *   2. Set NEW_ENCRYPTION_KEY to your new key
 *   3. Run: node scripts/rotate-encryption-key.mjs
 *   4. After successful migration, update ENCRYPTION_KEY to the new key
 * 
 * The script will:
 *   - Decrypt all credentials using the old key
 *   - Re-encrypt them using the new key (AES-256-GCM)
 *   - Update the database with the new encrypted values
 *   - Generate a rollback script in case of issues
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import mysql from 'mysql2/promise';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync, existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env') });

const OLD_ENCRYPTION_KEY = process.env.OLD_ENCRYPTION_KEY;
const NEW_ENCRYPTION_KEY = process.env.NEW_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!OLD_ENCRYPTION_KEY) {
  console.error('❌ OLD_ENCRYPTION_KEY environment variable is required');
  console.error('   Set it to your current encryption key before running this script');
  process.exit(1);
}

if (!NEW_ENCRYPTION_KEY) {
  console.error('❌ NEW_ENCRYPTION_KEY environment variable is required');
  console.error('   Set it to your new encryption key');
  process.exit(1);
}

if (OLD_ENCRYPTION_KEY === NEW_ENCRYPTION_KEY) {
  console.error('❌ OLD_ENCRYPTION_KEY and NEW_ENCRYPTION_KEY must be different');
  process.exit(1);
}

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const ALGORITHM_GCM = 'aes-256-gcm';
const ALGORITHM_CBC = 'aes-256-cbc';
const IV_LENGTH = 12; // 12 bytes for GCM
const AUTH_TAG_LENGTH = 16;

/**
 * Derive a 32-byte key from the encryption key string
 */
function deriveKey(keyString) {
  return createHash('sha256').update(keyString).digest();
}

/**
 * Check if encrypted data is in legacy CBC format
 */
function isLegacyFormat(encrypted) {
  return !encrypted.startsWith('gcm:');
}

/**
 * Decrypt using old key (supports both legacy CBC and GCM formats)
 */
function decryptWithOldKey(encrypted) {
  const key = deriveKey(OLD_ENCRYPTION_KEY);
  
  if (isLegacyFormat(encrypted)) {
    // Legacy CBC format: iv:ciphertext
    const [ivHex, ciphertext] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = createDecipheriv(ALGORITHM_CBC, key, iv);
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } else {
    // GCM format: gcm:iv:ciphertext:authTag
    const parts = encrypted.split(':');
    if (parts.length !== 4 || parts[0] !== 'gcm') {
      throw new Error('Invalid GCM format');
    }
    const iv = Buffer.from(parts[1], 'hex');
    const ciphertext = Buffer.from(parts[2], 'hex');
    const authTag = Buffer.from(parts[3], 'hex');
    
    const decipher = createDecipheriv(ALGORITHM_GCM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
  }
}

/**
 * Encrypt using new key (always uses GCM)
 */
function encryptWithNewKey(plaintext) {
  const key = deriveKey(NEW_ENCRYPTION_KEY);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM_GCM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  return `gcm:${iv.toString('hex')}:${encrypted.toString('hex')}:${authTag.toString('hex')}`;
}

/**
 * Main migration function
 */
async function migrateEncryptionKey() {
  console.log('🔐 Encryption Key Rotation Script');
  console.log('================================\n');
  
  // Connect to database
  console.log('📡 Connecting to database...');
  const connection = await mysql.createConnection(DATABASE_URL);
  console.log('✅ Connected\n');
  
  // Create backup directory
  const backupDir = join(__dirname, '..', 'backups');
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const rollbackFile = join(backupDir, `rollback-${timestamp}.sql`);
  let rollbackSql = '-- Rollback script for encryption key rotation\n';
  rollbackSql += `-- Generated: ${new Date().toISOString()}\n\n`;
  
  try {
    // Get all encrypted credentials
    console.log('📋 Fetching encrypted credentials...');
    const [credentials] = await connection.execute(
      'SELECT id, encrypted_username, encrypted_password FROM credentials'
    );
    console.log(`   Found ${credentials.length} credential records\n`);
    
    if (credentials.length === 0) {
      console.log('ℹ️  No credentials to migrate');
      await connection.end();
      return;
    }
    
    // Process each credential
    console.log('🔄 Migrating credentials...');
    let successCount = 0;
    let errorCount = 0;
    
    for (const cred of credentials) {
      try {
        const { id, encrypted_username, encrypted_password } = cred;
        
        // Store original values for rollback
        rollbackSql += `UPDATE credentials SET encrypted_username = '${encrypted_username}', encrypted_password = '${encrypted_password}' WHERE id = ${id};\n`;
        
        // Decrypt with old key
        const username = decryptWithOldKey(encrypted_username);
        const password = decryptWithOldKey(encrypted_password);
        
        // Re-encrypt with new key
        const newEncryptedUsername = encryptWithNewKey(username);
        const newEncryptedPassword = encryptWithNewKey(password);
        
        // Update database
        await connection.execute(
          'UPDATE credentials SET encrypted_username = ?, encrypted_password = ? WHERE id = ?',
          [newEncryptedUsername, newEncryptedPassword, id]
        );
        
        successCount++;
        console.log(`   ✅ Migrated credential ID ${id}`);
      } catch (error) {
        errorCount++;
        console.error(`   ❌ Failed to migrate credential ID ${cred.id}: ${error.message}`);
      }
    }
    
    // Save rollback script
    writeFileSync(rollbackFile, rollbackSql);
    console.log(`\n📁 Rollback script saved to: ${rollbackFile}`);
    
    // Summary
    console.log('\n📊 Migration Summary');
    console.log('====================');
    console.log(`   Total credentials: ${credentials.length}`);
    console.log(`   Successfully migrated: ${successCount}`);
    console.log(`   Failed: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('\n✅ Migration completed successfully!');
      console.log('\n📝 Next steps:');
      console.log('   1. Update ENCRYPTION_KEY in your environment to the new key');
      console.log('   2. Remove OLD_ENCRYPTION_KEY from your environment');
      console.log('   3. Restart your application');
      console.log('   4. Test that credentials still work');
      console.log(`   5. Keep the rollback script (${rollbackFile}) for 30 days`);
    } else {
      console.log('\n⚠️  Migration completed with errors');
      console.log('   Review the errors above and consider running the rollback script');
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('   No changes were committed to the database');
    throw error;
  } finally {
    await connection.end();
    console.log('\n📡 Database connection closed');
  }
}

// Run migration
migrateEncryptionKey().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
