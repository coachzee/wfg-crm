import { syncMyWFGData } from './server/sync-service.js';

console.log('Starting MyWFG sync...');
try {
  const result = await syncMyWFGData();
  console.log('Sync result:', JSON.stringify(result, null, 2));
} catch (error) {
  console.error('Sync error:', error.message);
}
