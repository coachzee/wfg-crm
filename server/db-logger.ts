/**
 * Database Query Logger
 * 
 * Provides query timing metrics and logging for performance monitoring.
 * Wraps database operations to track execution time and log slow queries.
 */

import { getEnv } from './_core/env';

// Configuration
const SLOW_QUERY_THRESHOLD_MS = parseInt(getEnv('SLOW_QUERY_THRESHOLD_MS', '1000'), 10);
const ENABLE_QUERY_LOGGING = getEnv('ENABLE_QUERY_LOGGING', 'false') === 'true';
const LOG_LEVEL = getEnv('LOG_LEVEL', 'info');

// Query metrics storage
interface QueryMetric {
  query: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  error?: string;
}

// In-memory metrics (last 1000 queries)
const queryMetrics: QueryMetric[] = [];
const MAX_METRICS = 1000;

// Aggregate stats
interface QueryStats {
  totalQueries: number;
  totalDuration: number;
  avgDuration: number;
  slowQueries: number;
  failedQueries: number;
  queriesByType: Record<string, number>;
}

let stats: QueryStats = {
  totalQueries: 0,
  totalDuration: 0,
  avgDuration: 0,
  slowQueries: 0,
  failedQueries: 0,
  queriesByType: {},
};

/**
 * Log a query execution
 */
export function logQuery(
  query: string,
  duration: number,
  success: boolean = true,
  error?: string
): void {
  const metric: QueryMetric = {
    query: truncateQuery(query),
    duration,
    timestamp: new Date(),
    success,
    error,
  };
  
  // Add to metrics array (circular buffer)
  queryMetrics.push(metric);
  if (queryMetrics.length > MAX_METRICS) {
    queryMetrics.shift();
  }
  
  // Update aggregate stats
  stats.totalQueries++;
  stats.totalDuration += duration;
  stats.avgDuration = stats.totalDuration / stats.totalQueries;
  
  if (duration > SLOW_QUERY_THRESHOLD_MS) {
    stats.slowQueries++;
  }
  
  if (!success) {
    stats.failedQueries++;
  }
  
  // Track query type
  const queryType = getQueryType(query);
  stats.queriesByType[queryType] = (stats.queriesByType[queryType] || 0) + 1;
  
  // Log based on conditions
  if (ENABLE_QUERY_LOGGING) {
    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      console.warn(`[DB] SLOW QUERY (${duration}ms): ${truncateQuery(query)}`);
    } else if (LOG_LEVEL === 'debug') {
      console.log(`[DB] Query (${duration}ms): ${truncateQuery(query)}`);
    }
  }
  
  if (!success && error) {
    console.error(`[DB] Query failed (${duration}ms): ${truncateQuery(query)} - ${error}`);
  }
}

/**
 * Wrap a database operation with timing
 */
export async function withQueryTiming<T>(
  operation: () => Promise<T>,
  queryDescription: string
): Promise<T> {
  const startTime = performance.now();
  
  try {
    const result = await operation();
    const duration = Math.round(performance.now() - startTime);
    logQuery(queryDescription, duration, true);
    return result;
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    logQuery(queryDescription, duration, false, String(error));
    throw error;
  }
}

/**
 * Get current query statistics
 */
export function getQueryStats(): QueryStats {
  return { ...stats };
}

/**
 * Get recent query metrics
 */
export function getRecentQueries(limit: number = 100): QueryMetric[] {
  return queryMetrics.slice(-limit);
}

/**
 * Get slow queries
 */
export function getSlowQueries(limit: number = 50): QueryMetric[] {
  return queryMetrics
    .filter(m => m.duration > SLOW_QUERY_THRESHOLD_MS)
    .slice(-limit);
}

/**
 * Reset statistics (useful for testing)
 */
export function resetStats(): void {
  stats = {
    totalQueries: 0,
    totalDuration: 0,
    avgDuration: 0,
    slowQueries: 0,
    failedQueries: 0,
    queriesByType: {},
  };
  queryMetrics.length = 0;
}

/**
 * Get query type from SQL string
 */
function getQueryType(query: string): string {
  const normalized = query.trim().toUpperCase();
  
  if (normalized.startsWith('SELECT')) return 'SELECT';
  if (normalized.startsWith('INSERT')) return 'INSERT';
  if (normalized.startsWith('UPDATE')) return 'UPDATE';
  if (normalized.startsWith('DELETE')) return 'DELETE';
  if (normalized.startsWith('CREATE')) return 'CREATE';
  if (normalized.startsWith('ALTER')) return 'ALTER';
  if (normalized.startsWith('DROP')) return 'DROP';
  
  return 'OTHER';
}

/**
 * Truncate long queries for logging
 */
function truncateQuery(query: string, maxLength: number = 200): string {
  const normalized = query.replace(/\s+/g, ' ').trim();
  
  if (normalized.length <= maxLength) {
    return normalized;
  }
  
  return normalized.substring(0, maxLength) + '...';
}

/**
 * Format stats for display
 */
export function formatStats(): string {
  const lines: string[] = [
    '=== Database Query Statistics ===',
    `Total Queries: ${stats.totalQueries}`,
    `Average Duration: ${stats.avgDuration.toFixed(2)}ms`,
    `Slow Queries (>${SLOW_QUERY_THRESHOLD_MS}ms): ${stats.slowQueries}`,
    `Failed Queries: ${stats.failedQueries}`,
    '',
    'Queries by Type:',
  ];
  
  for (const [type, count] of Object.entries(stats.queriesByType)) {
    lines.push(`  ${type}: ${count}`);
  }
  
  return lines.join('\n');
}

/**
 * Export for use in dashboard
 */
export interface QueryMetricsResponse {
  stats: QueryStats;
  recentQueries: QueryMetric[];
  slowQueries: QueryMetric[];
}

export function getQueryMetrics(): QueryMetricsResponse {
  return {
    stats: getQueryStats(),
    recentQueries: getRecentQueries(50),
    slowQueries: getSlowQueries(20),
  };
}
