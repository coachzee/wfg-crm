/**
 * Test Setup File
 * 
 * Sets up mock environment variables for tests before any modules are loaded.
 * This file is loaded before each test file via vitest setupFiles.
 */

// Set mock environment variables for tests
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "mysql://test:test@localhost:3306/test";
process.env.JWT_SECRET = "test-jwt-secret-must-be-at-least-32-characters-long";
process.env.VITE_APP_ID = "test-app-id";
process.env.OAUTH_SERVER_URL = "https://test-oauth.example.com";
process.env.ENCRYPTION_KEY = "test-encryption-key-must-be-32-chars";
process.env.SYNC_SECRET = "test-sync-secret-16ch";
process.env.MYWFG_USERNAME = "test-user";
process.env.MYWFG_PASSWORD = "test-password";
process.env.MYWFG_EMAIL = "test@example.com";
process.env.MYWFG_APP_PASSWORD = "test-app-password";
process.env.TRANSAMERICA_USERNAME = "test-user";
process.env.TRANSAMERICA_PASSWORD = "test-password";
process.env.TRANSAMERICA_EMAIL = "test@example.com";
process.env.TRANSAMERICA_APP_PASSWORD = "test-app-password";
process.env.TRANSAMERICA_SECURITY_Q_FIRST_JOB_CITY = "TestCity";
process.env.TRANSAMERICA_SECURITY_Q_PET_NAME = "TestPet";
process.env.BUILT_IN_FORGE_API_URL = "https://test-forge.example.com";
process.env.BUILT_IN_FORGE_API_KEY = "test-forge-api-key";

console.log("[Test Setup] Mock environment variables configured");
