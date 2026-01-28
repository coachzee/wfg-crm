/**
 * Retry Utility with Exponential Backoff
 * 
 * Provides robust retry logic for external operations like portal logins,
 * OTP retrieval, and page navigation.
 */

export type RetryOptions = {
  /** Maximum number of retry attempts (default: 3) */
  retries: number;
  /** Base delay in milliseconds (default: 500) */
  baseDelayMs: number;
  /** Maximum delay in milliseconds (default: 10000) */
  maxDelayMs?: number;
  /** Add random jitter to delays (default: true) */
  jitter?: boolean;
  /** Callback on each retry attempt */
  onRetry?: (info: { attempt: number; error: unknown; delayMs: number }) => void;
  /** Custom function to determine if error is retryable */
  shouldRetry?: (error: unknown) => boolean;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with automatic retry on failure.
 * Uses exponential backoff with optional jitter.
 * 
 * @example
 * const result = await retry(
 *   () => loginToPortal(),
 *   { retries: 3, baseDelayMs: 1000 }
 * );
 */
export async function retry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions
): Promise<T> {
  const {
    retries,
    baseDelayMs,
    maxDelayMs = 10_000,
    jitter = true,
    onRetry,
    shouldRetry,
  } = opts;

  let attempt = 0;
  let lastErr: unknown;

  while (attempt <= retries) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;

      // Check if we've exhausted retries
      if (attempt === retries) break;
      
      // Check if error is retryable
      if (shouldRetry && !shouldRetry(err)) break;

      // Calculate delay with exponential backoff
      const exp = baseDelayMs * Math.pow(2, attempt);
      let delayMs = Math.min(exp, maxDelayMs);
      
      // Add jitter (±30% randomness)
      if (jitter) {
        delayMs = Math.floor(delayMs * (0.7 + Math.random() * 0.6));
      }

      // Notify about retry
      onRetry?.({ attempt: attempt + 1, error: err, delayMs });
      
      await sleep(delayMs);
      attempt++;
    }
  }

  throw lastErr;
}

/**
 * Default retry options for portal operations
 */
export const PORTAL_RETRY_OPTIONS: RetryOptions = {
  retries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 15_000,
  jitter: true,
  onRetry: ({ attempt, error, delayMs }) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`[Retry] Attempt ${attempt} failed: ${errorMessage}. Retrying in ${delayMs}ms...`);
  },
  shouldRetry: (error) => {
    // Retry on timeout, network, and navigation errors
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    return (
      message.includes("timeout") ||
      message.includes("navigation") ||
      message.includes("network") ||
      message.includes("connection") ||
      message.includes("econnreset") ||
      message.includes("enotfound")
    );
  },
};

/**
 * Default retry options for OTP retrieval
 */
export const OTP_RETRY_OPTIONS: RetryOptions = {
  retries: 5,
  baseDelayMs: 2000,
  maxDelayMs: 30_000,
  jitter: true,
  onRetry: ({ attempt, error, delayMs }) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`[OTP Retry] Attempt ${attempt} failed: ${errorMessage}. Retrying in ${delayMs}ms...`);
  },
};
