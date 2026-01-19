import { waitForOTP } from './server/gmail-otp.js';

const creds = {
  email: process.env.MYWFG_EMAIL || 'zaidshopejuwfg@gmail.com',
  appPassword: process.env.MYWFG_APP_PASSWORD
};

console.log('Waiting for new OTP from Transamerica...');
const otp = await waitForOTP(creds, 'transamerica', 90000);
console.log('OTP found:', otp);
