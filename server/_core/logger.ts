/**
 * Structured Logger with Request Correlation
 * 
 * Provides consistent logging across the application with:
 * - Request ID correlation for tracing requests
 * - Log levels (debug, info, warn, error)
 * - Structured JSON output for production
 * - Human-readable output for development
 */

import { AsyncLocalStorage } from 'async_hooks';

// Store request context across async operations
const requestContext = new AsyncLocalStorage<RequestContext>();

interface RequestContext {
  requestId: string;
  userId?: number;
  userEmail?: string;
  path?: string;
  method?: string;
  startTime: number;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  userId?: number;
  path?: string;
  duration?: number;
  data?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Get log level from environment, default to 'info'
const currentLogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

/**
 * Run a function with request context
 */
export function runWithRequestContext<T>(
  context: Partial<RequestContext>,
  fn: () => T
): T {
  const fullContext: RequestContext = {
    requestId: context.requestId || generateRequestId(),
    userId: context.userId,
    userEmail: context.userEmail,
    path: context.path,
    method: context.method,
    startTime: Date.now(),
  };
  return requestContext.run(fullContext, fn);
}

/**
 * Get current request context
 */
export function getRequestContext(): RequestContext | undefined {
  return requestContext.getStore();
}

/**
 * Get current request ID
 */
export function getRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}

/**
 * Format log entry for output
 */
function formatLogEntry(entry: LogEntry): string {
  if (isProduction) {
    // JSON format for production (easier to parse in log aggregators)
    return JSON.stringify(entry);
  }
  
  // Human-readable format for development
  const { timestamp, level, message, requestId, userId, path, duration, data, error } = entry;
  const levelColor = {
    debug: '\x1b[36m', // cyan
    info: '\x1b[32m',  // green
    warn: '\x1b[33m',  // yellow
    error: '\x1b[31m', // red
  }[level];
  const reset = '\x1b[0m';
  
  let output = `${timestamp} ${levelColor}[${level.toUpperCase()}]${reset}`;
  
  if (requestId) {
    output += ` [${requestId}]`;
  }
  
  if (path) {
    output += ` ${path}`;
  }
  
  output += ` ${message}`;
  
  if (duration !== undefined) {
    output += ` (${duration}ms)`;
  }
  
  if (userId) {
    output += ` user:${userId}`;
  }
  
  if (data && Object.keys(data).length > 0) {
    output += ` ${JSON.stringify(data)}`;
  }
  
  if (error) {
    output += `\n  Error: ${error.name}: ${error.message}`;
    if (error.stack && !isProduction) {
      output += `\n  ${error.stack.split('\n').slice(1, 4).join('\n  ')}`;
    }
  }
  
  return output;
}

/**
 * Core log function
 */
function log(level: LogLevel, message: string, data?: Record<string, unknown>, error?: Error): void {
  if (LOG_LEVELS[level] < LOG_LEVELS[currentLogLevel]) {
    return;
  }
  
  const context = getRequestContext();
  const now = new Date();
  
  const entry: LogEntry = {
    timestamp: now.toISOString(),
    level,
    message,
    requestId: context?.requestId,
    userId: context?.userId,
    path: context?.path,
    duration: context ? Date.now() - context.startTime : undefined,
    data,
    error: error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : undefined,
  };
  
  const output = formatLogEntry(entry);
  
  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
  }
}

/**
 * Logger interface
 */
export const logger = {
  debug: (message: string, data?: Record<string, unknown>) => log('debug', message, data),
  info: (message: string, data?: Record<string, unknown>) => log('info', message, data),
  warn: (message: string, data?: Record<string, unknown>) => log('warn', message, data),
  error: (message: string, error?: Error, data?: Record<string, unknown>) => log('error', message, data, error),
  
  /**
   * Create a child logger with additional context
   */
  child: (context: Record<string, unknown>) => ({
    debug: (message: string, data?: Record<string, unknown>) => log('debug', message, { ...context, ...data }),
    info: (message: string, data?: Record<string, unknown>) => log('info', message, { ...context, ...data }),
    warn: (message: string, data?: Record<string, unknown>) => log('warn', message, { ...context, ...data }),
    error: (message: string, error?: Error, data?: Record<string, unknown>) => log('error', message, { ...context, ...data }, error),
  }),
};

/**
 * Express middleware to add request correlation
 */
export function requestCorrelationMiddleware() {
  return (req: any, res: any, next: () => void) => {
    // Get or generate request ID
    const requestId = req.headers['x-request-id'] as string || generateRequestId();
    
    // Set response header for tracing
    res.setHeader('x-request-id', requestId);
    
    // Run the rest of the request with context
    runWithRequestContext(
      {
        requestId,
        path: req.path,
        method: req.method,
        userId: req.user?.id,
        userEmail: req.user?.email,
      },
      () => {
        // Log request start
        logger.info(`${req.method} ${req.path}`, {
          query: Object.keys(req.query).length > 0 ? req.query : undefined,
          userAgent: req.headers['user-agent']?.substring(0, 100),
        });
        
        // Log response on finish
        res.on('finish', () => {
          const context = getRequestContext();
          const duration = context ? Date.now() - context.startTime : 0;
          const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
          
          if (logLevel === 'error') {
            logger.error(`${req.method} ${req.path} ${res.statusCode}`, undefined, { statusCode: res.statusCode, duration });
          } else if (logLevel === 'warn') {
            logger.warn(`${req.method} ${req.path} ${res.statusCode}`, { statusCode: res.statusCode, duration });
          } else {
            logger.info(`${req.method} ${req.path} ${res.statusCode}`, { statusCode: res.statusCode, duration });
          }
        });
        
        next();
      }
    );
  };
}

export default logger;
