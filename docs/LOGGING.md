# Logging Configuration

This document describes the structured logging system in the WFG CRM application.

## Environment Variables

| Variable | Values | Default | Description |
|----------|--------|---------|-------------|
| `LOG_LEVEL` | `debug`, `info`, `warn`, `error` | `info` | Minimum log level to output |
| `LOG_FORMAT` | `json`, `pretty` | `pretty` | Output format (json for production, pretty for development) |

## Log Levels

- **debug**: Detailed debugging information (queries, cache hits, etc.)
- **info**: General operational information (requests, responses, sync events)
- **warn**: Warning conditions that don't prevent operation
- **error**: Error conditions that require attention

## Request Correlation

Every HTTP request is assigned a unique request ID that is:
1. Generated automatically or extracted from `X-Request-ID` header
2. Included in all log entries during the request lifecycle
3. Returned in the `X-Request-ID` response header

This enables tracing a request through the entire system.

## Log Format

### Pretty Format (Development)

```
2026-01-28T05:30:00.000Z [INFO] [m1abc123-xyz789] /api/trpc/dashboard.summary GET /api/trpc/dashboard.summary 200 (45ms)
```

### JSON Format (Production)

```json
{
  "timestamp": "2026-01-28T05:30:00.000Z",
  "level": "info",
  "message": "GET /api/trpc/dashboard.summary 200",
  "requestId": "m1abc123-xyz789",
  "path": "/api/trpc/dashboard.summary",
  "duration": 45,
  "data": { "statusCode": 200 }
}
```

## Usage in Code

```typescript
import { logger } from './server/_core/logger';

// Basic logging
logger.info('User logged in', { userId: 123 });
logger.warn('Rate limit approaching', { remaining: 10 });
logger.error('Database connection failed', new Error('Connection timeout'));

// Child logger with context
const dbLogger = logger.child({ module: 'database' });
dbLogger.info('Query executed', { table: 'users', duration: 15 });
```

## Log Aggregation Recommendations

For production deployments, consider integrating with:

1. **Cloud-native solutions**:
   - AWS CloudWatch Logs
   - Google Cloud Logging
   - Azure Monitor Logs

2. **Self-hosted solutions**:
   - ELK Stack (Elasticsearch, Logstash, Kibana)
   - Grafana Loki
   - Graylog

3. **SaaS solutions**:
   - Datadog
   - Logtail
   - Papertrail

When using JSON format (`LOG_FORMAT=json`), logs can be easily parsed and indexed by these systems.

## Best Practices

1. **Use appropriate log levels**: Don't log everything at `info` level
2. **Include context**: Add relevant data to help debugging
3. **Avoid sensitive data**: Never log passwords, tokens, or PII
4. **Use request IDs**: Reference them in error reports for tracing
5. **Set LOG_LEVEL=warn in production**: Reduce noise while capturing issues
