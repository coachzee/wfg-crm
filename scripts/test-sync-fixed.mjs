/**
 * Test script for the fixed MyWFG Downline Status scraper
 */

import 'dotenv/config';
import { fetchDownlineStatus } from '../server/mywfg-downline-scraper.js';

async function main() {
  console.log('=== Testing Fixed MyWFG Downline Scraper ===\n');
  
  const result = await fetchDownlineStatus('73DXR', 'BASE_SHOP');
  
  console.log('\n=== Results ===');
  console.log('Success:', result.success);
  console.log('Run Date:', result.runDate);
  console.log('Report Info:', result.reportInfo);
  console.log('Total Agents:', result.agents.length);
  
  if (result.error) {
    console.log('Error:', result.error);
  }
  
  if (result.agents.length > 0) {
    console.log('\n=== Sample Agents ===');
    for (const agent of result.agents.slice(0, 10)) {
      console.log(`- ${agent.firstName} ${agent.lastName} (${agent.agentCode}): ${agent.titleLevel}, Licensed: ${agent.isLifeLicensed}`);
    }
    
    // Check for the specific agents mentioned by user
    console.log('\n=== Checking Specific Agents ===');
    const targetNames = [
      { first: 'Adeyinka', last: 'Adedire' },
      { first: 'Adejare', last: 'Adetona' },
      { first: 'Fredrick', last: 'Chukwuedo' },
    ];
    
    for (const target of targetNames) {
      const found = result.agents.find(a => 
        a.firstName.toLowerCase() === target.first.toLowerCase() &&
        a.lastName.toLowerCase() === target.last.toLowerCase()
      );
      if (found) {
        console.log(`✓ ${found.firstName} ${found.lastName} (${found.agentCode}): Licensed = ${found.isLifeLicensed}, llFlag = ${found.llFlag}`);
      } else {
        console.log(`✗ ${target.first} ${target.last} not found in results`);
      }
    }
    
    // Count licensed vs unlicensed
    const licensed = result.agents.filter(a => a.isLifeLicensed).length;
    const unlicensed = result.agents.filter(a => !a.isLifeLicensed).length;
    console.log(`\n=== Summary ===`);
    console.log(`Licensed agents: ${licensed}`);
    console.log(`Unlicensed agents: ${unlicensed}`);
  }
}

main().catch(console.error);
