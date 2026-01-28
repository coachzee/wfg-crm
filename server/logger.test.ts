import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  logger, 
  generateRequestId, 
  runWithRequestContext, 
  getRequestContext, 
  getRequestId 
} from './_core/logger';

describe('Logger Module', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateRequestId', () => {
    it('should generate unique request IDs', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });

    it('should generate IDs with expected format', () => {
      const id = generateRequestId();
      
      // Format: timestamp-random (e.g., "m1abc123-xyz789")
      expect(id).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
    });
  });

  describe('runWithRequestContext', () => {
    it('should run function with request context', () => {
      const result = runWithRequestContext(
        { requestId: 'test-123', userId: 1 },
        () => {
          const ctx = getRequestContext();
          return ctx?.requestId;
        }
      );
      
      expect(result).toBe('test-123');
    });

    it('should generate requestId if not provided', () => {
      const result = runWithRequestContext({}, () => {
        const ctx = getRequestContext();
        return ctx?.requestId;
      });
      
      expect(result).toBeDefined();
      expect(result).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
    });

    it('should include startTime in context', () => {
      const before = Date.now();
      
      runWithRequestContext({}, () => {
        const ctx = getRequestContext();
        expect(ctx?.startTime).toBeGreaterThanOrEqual(before);
        expect(ctx?.startTime).toBeLessThanOrEqual(Date.now());
      });
    });
  });

  describe('getRequestId', () => {
    it('should return undefined outside of context', () => {
      const id = getRequestId();
      expect(id).toBeUndefined();
    });

    it('should return requestId inside context', () => {
      runWithRequestContext({ requestId: 'ctx-456' }, () => {
        const id = getRequestId();
        expect(id).toBe('ctx-456');
      });
    });
  });

  describe('logger methods', () => {
    it('should log info messages', () => {
      logger.info('Test info message');
      
      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain('[INFO]');
      expect(logOutput).toContain('Test info message');
    });

    it('should log warn messages', () => {
      logger.warn('Test warning');
      
      expect(consoleWarnSpy).toHaveBeenCalled();
      const logOutput = consoleWarnSpy.mock.calls[0][0];
      expect(logOutput).toContain('[WARN]');
      expect(logOutput).toContain('Test warning');
    });

    it('should log error messages', () => {
      const testError = new Error('Test error');
      logger.error('Error occurred', testError);
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain('[ERROR]');
      expect(logOutput).toContain('Error occurred');
      expect(logOutput).toContain('Test error');
    });

    it('should include request ID in logs when in context', () => {
      runWithRequestContext({ requestId: 'req-789' }, () => {
        logger.info('Contextual log');
      });
      
      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain('[req-789]');
    });

    it('should include additional data in logs', () => {
      logger.info('Log with data', { userId: 123, action: 'test' });
      
      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain('userId');
      expect(logOutput).toContain('123');
    });
  });

  describe('child logger', () => {
    it('should create child logger with additional context', () => {
      const childLogger = logger.child({ module: 'test-module' });
      childLogger.info('Child log message');
      
      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain('module');
      expect(logOutput).toContain('test-module');
    });

    it('should merge child context with log data', () => {
      const childLogger = logger.child({ module: 'auth' });
      childLogger.info('Login attempt', { userId: 456 });
      
      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain('module');
      expect(logOutput).toContain('auth');
      expect(logOutput).toContain('userId');
      expect(logOutput).toContain('456');
    });
  });
});
