#!/usr/bin/env node
/**
 * Import Transamerica Pending Policies from CSV to Database
 * 
 * Usage: node scripts/import-pending-policies.mjs [csv-file-path]
 * Default: data/transamerica-pending-2026-01-08.csv
 */

import { createConnection } from 'mysql2/promise';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';

dotenv.config();

const csvPath = process.argv[2] || 'data/transamerica-pending-2026-01-08.csv';

async function main() {
  console.log(`📂 Reading CSV from: ${csvPath}`);
  
  const csvContent = readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });
  
  console.log(`📊 Found ${records.length} pending policies in CSV`);
  
  // Connect to database
  const connection = await createConnection(process.env.DATABASE_URL);
  console.log('🔗 Connected to database');
  
  let inserted = 0;
  let updated = 0;
  let errors = 0;
  
  for (const record of records) {
    const policyNumber = record['Policy Number'];
    const ownerName = record['Insured Name'];
    const status = record['Status'];
    const productType = record['Product Type'];
    const faceAmount = record['Face Amount'];
    const premium = record['Premium'];
    const premiumFrequency = record['Frequency'];
    const submittedDate = record['Submitted Date'];
    
    try {
      // Check if policy exists
      const [existing] = await connection.execute(
        'SELECT id FROM pendingPolicies WHERE policyNumber = ?',
        [policyNumber]
      );
      
      if (existing.length > 0) {
        // Update existing policy
        await connection.execute(
          `UPDATE pendingPolicies 
           SET ownerName = ?, status = ?, productType = ?, faceAmount = ?, 
               premium = ?, premiumFrequency = ?, submittedDate = ?,
               lastSyncedAt = NOW(), updatedAt = NOW()
           WHERE policyNumber = ?`,
          [ownerName, status, productType, faceAmount, premium, premiumFrequency, submittedDate, policyNumber]
        );
        updated++;
        console.log(`  ✏️  Updated: ${policyNumber} - ${ownerName} (${status})`);
      } else {
        // Insert new policy
        await connection.execute(
          `INSERT INTO pendingPolicies 
           (policyNumber, ownerName, status, productType, faceAmount, premium, premiumFrequency, submittedDate, lastSyncedAt, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
          [policyNumber, ownerName, status, productType, faceAmount, premium, premiumFrequency, submittedDate]
        );
        inserted++;
        console.log(`  ✅ Inserted: ${policyNumber} - ${ownerName} (${status})`);
      }
    } catch (err) {
      errors++;
      console.error(`  ❌ Error processing ${policyNumber}: ${err.message}`);
    }
  }
  
  await connection.end();
  
  console.log('\n📊 Import Summary:');
  console.log(`  ✅ Inserted: ${inserted}`);
  console.log(`  ✏️  Updated: ${updated}`);
  console.log(`  ❌ Errors: ${errors}`);
  console.log(`  📦 Total: ${records.length}`);
}

main().catch(console.error);
