import 'dotenv/config';
import { waitForOTP } from './server/gmail-otp.js';

function mustGetEnv(name) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    console.error(`❌ Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

const creds = {
  email: mustGetEnv('MYWFG_EMAIL'),
  appPassword: mustGetEnv('MYWFG_APP_PASSWORD')
};

console.log('Waiting for new OTP from Transamerica...');
const otp = await waitForOTP(creds, 'transamerica', 90000);
console.log('OTP found:', otp);
