import { waitForOTP, getMyWFGCredentials } from '../server/gmail-otp.ts';

async function main() {
  console.log('Checking for MyWFG OTP from Gmail...');
  const creds = getMyWFGCredentials();
  console.log('Gmail credentials:', creds.email ? 'Found' : 'Not found');
  
  const result = await waitForOTP(creds, 'wfg', 60, 5);
  console.log('OTP Result:', result);
}

main().catch(console.error);
