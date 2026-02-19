import { describe, it, expect, vi } from 'vitest';
import { resolveChromePath } from './lib/browser';

// Mock fs to control which paths "exist"
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    existsSync: vi.fn((p: string) => {
      // Simulate system chromium available
      if (p === '/usr/bin/chromium-browser') return true;
      // Simulate puppeteer cache
      if (p.includes('.cache/puppeteer/chrome')) return false;
      return actual.existsSync(p);
    }),
    readdirSync: actual.readdirSync,
  };
});

describe('Browser Launcher', () => {
  it('resolveChromePath returns a string or undefined', () => {
    const path = resolveChromePath();
    // In test env, it should find /usr/bin/chromium-browser from our mock
    expect(path).toBe('/usr/bin/chromium-browser');
  });

  it('launchBrowser module exports the expected functions', async () => {
    const mod = await import('./lib/browser');
    expect(typeof mod.launchBrowser).toBe('function');
    expect(typeof mod.resolveChromePath).toBe('function');
  });
});
