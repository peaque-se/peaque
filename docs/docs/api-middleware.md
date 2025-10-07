---
sidebar_position: 5
---

# API Middleware

Middleware functions allow you to run code before and after your API route handlers execute. They are useful for authentication, logging, CORS handling, and other cross-cutting concerns.

## Global Middleware

Global middleware applies to all API routes in your application. Create a `middleware.ts` file in your `src/` directory:

```typescript title="src/middleware.ts"
import type { RequestMiddleware } from '@peaque/framework';

export const middleware: RequestMiddleware = async (req, next) => {
  // Code to run before the route handler
  console.log(`${req.method()} ${req.path()}`);

  // Call the next middleware or route handler
  await next(req);

  // Code to run after the route handler
  console.log('Request completed');
};
```

## Route-Specific Middleware

You can also create middleware files specific to API routes. Create a `middleware.ts` file in your API route directory:

```typescript title="src/api/users/middleware.ts"
import type { RequestMiddleware } from '@peaque/framework';

export const middleware: RequestMiddleware = async (req, next) => {
  // Authentication middleware for user routes
  const authHeader = req.requestHeader('authorization');

  if (!authHeader) {
    req.code(401).send({ error: 'Unauthorized' });
    return;
  }

  await next(req);
};
```

This middleware will apply to all routes in the `src/api/users/` directory and its subdirectories.

## Middleware Chain

Middleware functions are executed in a chain, allowing you to compose multiple middleware functions:

```typescript title="src/middleware.ts"
import type { RequestMiddleware } from '@peaque/framework';

const loggingMiddleware: RequestMiddleware = async (req, next) => {
  const start = Date.now();
  console.log(`Started ${req.method()} ${req.path()}`);

  await next(req);

  const duration = Date.now() - start;
  console.log(`Completed in ${duration}ms`);
};

const corsMiddleware: RequestMiddleware = async (req, next) => {
  req.header('Access-Control-Allow-Origin', '*');
  req.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  req.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  await next(req);
};

export const middleware: RequestMiddleware = async (req, next) => {
  await loggingMiddleware(req, async () => {
    await corsMiddleware(req, next);
  });
};
```

## Authentication Middleware

A common use case for middleware is authentication:

```typescript title="src/api/auth/middleware.ts"
import type { RequestMiddleware } from '@peaque/framework';

export const middleware: RequestMiddleware = async (req, next) => {
  const token = req.cookies().get('auth_token') || req.requestHeader('authorization')?.replace('Bearer ', '');

  if (!token) {
    req.code(401).send({ error: 'Authentication required' });
    return;
  }

  // Verify token (implement your own verification logic)
  try {
    const user = verifyToken(token);
    // You can add user info to the request for use in handlers
    req.header('X-User-ID', user.id);
    req.header('X-User-Role', user.role);

    await next(req);
  } catch (error) {
    req.code(401).send({ error: 'Invalid token' });
  }
};
```

## Error Handling Middleware

Middleware can also handle errors that occur in route handlers:

```typescript title="src/middleware.ts"
import type { RequestMiddleware } from '@peaque/framework';

export const middleware: RequestMiddleware = async (req, next) => {
  try {
    await next(req);
  } catch (error) {
    console.error('Unhandled error:', error);
    req.code(500).send({ error: 'Internal server error' });
  }
};
```

## Request/Response Modification

Middleware can modify the request before it reaches the handler or the response before it's sent:

```typescript title="src/api/data/middleware.ts"
import type { RequestMiddleware } from '@peaque/framework';

export const middleware: RequestMiddleware = async (req, next) => {
  // Add timestamp to request
  req.header('X-Request-Time', new Date().toISOString());

  await next(req);

  // Add response metadata
  if (req.responseCode() === 200) {
    req.header('X-Response-Time', new Date().toISOString());
  }
};
```

## Conditional Middleware

You can create middleware that only applies under certain conditions:

```typescript title="src/middleware.ts"
import type { RequestMiddleware } from '@peaque/framework';

export const middleware: RequestMiddleware = async (req, next) => {
  // Only apply to API routes
  if (req.path().startsWith('/api/')) {
    req.header('X-API-Version', '1.0');
  }

  await next(req);
};
```

## Middleware Order

Middleware is executed in the following order:
1. Global middleware (from `src/middleware.ts`)
2. Route-specific middleware (from innermost to outermost directory)
3. Route handler

For a request to `/api/users/profile`, the order would be:
1. `src/middleware.ts`
2. `src/api/middleware.ts`
3. `src/api/users/middleware.ts`
4. `src/api/users/profile/route.ts`

## Best Practices

- Keep middleware functions focused on a single responsibility
- Use early returns for authentication failures to avoid unnecessary processing
- Handle errors appropriately in middleware
- Avoid long-running operations in middleware that could block requests
- Use TypeScript types for better development experience
- Test your middleware functions thoroughly