---
sidebar_position: 7
---

# Environment Variables

Peaque Framework provides built-in support for environment variables with automatic `.env` file loading.

## .env Files

Create a `.env` file in your project root:

```bash title=".env"
# Server-side variables
DATABASE_URL=postgresql://localhost:5432/mydb
API_SECRET=your-secret-key

```

## Server-Side Variables

Use environment variables in API routes and server code:

```typescript title="src/api/db/route.ts"
import type { PeaqueRequest } from '@peaque/framework';

export async function GET(req: PeaqueRequest) {
  const dbUrl = process.env.DATABASE_URL;
  const apiSecret = process.env.API_SECRET;

  // Use these variables server-side only
  return { connected: true };
}
```

:::warning
Server-side environment variables are **never** exposed to the client.
:::


## Environment-Specific Files

Use different `.env` files for different environments:

- `.env` - Default environment variables
- `.env.local` - Local overrides (not committed to git, development only)

### Loading Priority

Peaque loads environment variables in this order (highest priority first):

1. `process.env` (system environment)
2. `.env.local` (development only)
3. `.env`

Note: In production, only `.env` is loaded. `.env.local` is ignored in production builds.

## Default Variables

Peaque provides these default environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |

## TypeScript Support

Add type definitions for your environment variables:

```typescript title="src/env.d.ts"
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DATABASE_URL: string;
      API_SECRET: string;
    }
  }
}

export {};
```

This provides autocomplete and type checking for your environment variables.

## Example: Database Configuration

```typescript title="src/lib/db.ts"
import { createConnection } from 'your-db-library';

export const db = createConnection({
  url: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production',
});
```

```typescript title="src/api/posts/route.ts"
import type { PeaqueRequest } from '@peaque/framework';
import { db } from '../../lib/db';

export async function GET(req: PeaqueRequest) {
  const posts = await db.query('SELECT * FROM posts');
  return { posts };
}
```

## Best Practices

1. **Never commit `.env.local`** - Add it to `.gitignore`
2. **Validate required variables** - Check on startup
3. **Document your variables** - Add comments in `.env.example`

### .env.example

Create a `.env.example` file to document required variables:

```bash title=".env.example"
# Database
DATABASE_URL=postgresql://localhost:5432/mydb

# Authentication
API_SECRET=your-secret-here
```

Commit this file to git to help other developers set up their environment.
