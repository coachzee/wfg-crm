/**
 * Import Inforce Policies from Transamerica CSV Export
 * This script reads the downloaded CSV and imports clean data into the database
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { inforcePolicies } from '../drizzle/schema.ts';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

const CSV_FILE = '/home/ubuntu/Downloads/Policy_Date_Export_Thu Jan 08 2026 08_10_13 GMT+0000 (Coordinated Universal Time).csv';

async function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',');
  
  const policies = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const policy = {};
    headers.forEach((header, idx) => {
      policy[header.trim()] = values[idx]?.trim() || '';
    });
    policies.push(policy);
  }
  return policies;
}

// Handle CSV values with potential commas inside quotes
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

async function main() {
  console.log('Reading CSV file...');
  const policies = await parseCSV(CSV_FILE);
  console.log(`Found ${policies.length} policies in CSV`);
  
  // Connect to database
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);
  
  // Clear existing data
  console.log('Clearing existing inforce policies...');
  await db.delete(inforcePolicies);
  
  // Insert new data
  console.log('Inserting policies...');
  let inserted = 0;
  let totalPremium = 0;
  let totalFaceAmount = 0;
  
  for (const policy of policies) {
    const premium = parseFloat(policy['Premium']) || 0;
    const faceAmount = parseFloat(policy['Face Amount']) || 0;
    const commission = premium * 1.25 * 0.55; // 125% * 55% agent level
    
    totalPremium += premium;
    totalFaceAmount += faceAmount;
    
    await db.insert(inforcePolicies).values({
      policyNumber: policy['Policy Number'],
      ownerName: policy['Owner Name'],
      insuredName: policy['Insured Name'] || policy['Owner Name'],
      productType: policy['Product Type'],
      productClass: policy['Product Class'] || 'Indexed Universal Life',
      issueState: policy['Issue State'],
      faceAmount: faceAmount,
      premium: premium,
      premiumDueDate: policy['Premium Due Date'] || null,
      expiryDate: policy['Expiry Date'] || null,
      billingMode: policy['Billing Mode'] || 'Flexible',
      issueDate: policy['Issue Date'] || null,
      status: policy['Status'] || 'Active',
      ownerAddress: [
        policy['Owner Address Line 1'],
        policy['Owner Address Line 2'],
        policy['Owner City'],
        policy['Owner State Code'],
        policy['Owner Zip Code']
      ].filter(Boolean).join(', '),
      calculatedCommission: commission,
      lastSyncedAt: new Date(),
    });
    inserted++;
  }
  
  console.log(`\n=== Import Complete ===`);
  console.log(`Policies inserted: ${inserted}`);
  console.log(`Total Premium: $${totalPremium.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`Total Face Amount: $${totalFaceAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`Total Commission (55% level): $${(totalPremium * 1.25 * 0.55).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  
  // Verify by checking top owners
  console.log('\n=== Top Policy Owners ===');
  const result = await connection.query(`
    SELECT ownerName, COUNT(*) as policyCount, SUM(premium) as totalPremium, SUM(faceAmount) as totalFace
    FROM inforcePolicies
    GROUP BY ownerName
    ORDER BY policyCount DESC
    LIMIT 10
  `);
  
  for (const row of result[0]) {
    console.log(`${row.ownerName}: ${row.policyCount} policies, $${parseFloat(row.totalPremium).toLocaleString()} premium, $${parseFloat(row.totalFace).toLocaleString()} face`);
  }
  
  await connection.end();
  console.log('\nDone!');
}

main().catch(console.error);
