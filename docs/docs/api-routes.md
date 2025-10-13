---
sidebar_position: 4
---

# API Routes

API routes allow you to create backend endpoints alongside your frontend pages.

## Creating API Routes

Create a `route.ts` file in the `api/` directory:

```typescript title="src/api/hello/route.ts"
import type { PeaqueRequest } from '@peaque/framework';

export async function GET(req: PeaqueRequest) {
  req.send({ message: 'Hello, World!' });
}
```

This creates an endpoint at `/api/hello`.

## HTTP Methods

Export functions for different HTTP methods:

```typescript title="src/api/users/route.ts"
import type { PeaqueRequest } from '@peaque/framework';

export async function GET(req: PeaqueRequest) {
  // Fetch all users
  req.send({ users: [] });
}

export async function POST(req: PeaqueRequest) {
  // Create a new user
  const body = req.body();
  req.send({ user: body });
}

export async function PUT(req: PeaqueRequest) {
  // Update a user
  const body = req.body();
  req.send({ user: body });
}

export async function DELETE(req: PeaqueRequest) {
  // Delete a user
  req.send({ success: true });
}
```

## Request Object

The `PeaqueRequest` object provides access to the HTTP request:

```typescript
export async function POST(req: PeaqueRequest) {
  // Get request body
  const body = req.body();

  // Get query parameters
  const search = req.queryParam('search');

  // Get route parameters
  const id = req.pathParam('id');

  // Get headers
  const auth = req.requestHeader('authorization');

  // Get cookies
  const token = req.cookies().get('token');

  req.send({ body, search, id, auth, token });
}
```

## Response Types

Use the request object's methods to send different response types:

### JSON Response (default)

```typescript
export async function GET(req: PeaqueRequest) {
  req.send({ message: 'Hello' });
}
```

### Custom Status Code

```typescript
export async function GET(req: PeaqueRequest) {
  req.code(404).send({ error: 'Not found' });
}
```

### Set Headers

```typescript
export async function GET(req: PeaqueRequest) {
  req
    .header('X-Custom-Header', 'value')
    .send({ message: 'Hello' });
}
```

### Redirect

```typescript
export async function GET(req: PeaqueRequest) {
  req.redirect('/login');
}
```

## Dynamic API Routes

Use square brackets for dynamic segments:

```typescript title="src/api/users/[id]/route.ts"
import type { PeaqueRequest } from '@peaque/framework';

export async function GET(req: PeaqueRequest) {
  const id = req.pathParam('id');
  req.send({ user: { id, name: 'John Doe' } });
}

export async function DELETE(req: PeaqueRequest) {
  const id = req.pathParam('id');
  // Delete user with ID
  req.send({ success: true });
}
```

This creates endpoints:
- `GET /api/users/123`
- `DELETE /api/users/123`

## Cookies

Set and get cookies easily:

```typescript
export async function POST(req: PeaqueRequest) {
  // Set a cookie
  req.cookies().set('token', 'abc123', {
    httpOnly: true,
    secure: true,
    maxAge: 3600
  });

  // Get a cookie
  const token = req.cookies().get('token');

  // Delete a cookie
  req.cookies().remove('token');

  req.send({ success: true });
}
```

## Error Handling

Handle errors gracefully:

```typescript
export async function GET(req: PeaqueRequest) {
  try {
    // Your logic here
    req.send({ data: [] });
  } catch (error) {
    req.code(500).send({
      error: 'Internal server error'
    });
  }
}
```

## CORS

Enable CORS for your API routes:

```typescript
export async function GET(req: PeaqueRequest) {
  req
    .header('Access-Control-Allow-Origin', '*')
    .header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE')
    .send({ message: 'CORS enabled' });
}
```

## Using `useCurrentRequest` in Shared Functions

If you need to access the current request in utility functions called from API routes, you can use the `useCurrentRequest()` hook:

```typescript title="src/utils/auth.ts"
import { useCurrentRequest } from '@peaque/framework/server';

export async function requireAuth(): Promise<string> {
  const req = useCurrentRequest();
  const token = req.cookies().get('auth-token');

  if (!token) {
    throw new Error('Unauthorized');
  }

  // Verify token and return user ID
  return 'user-id-123';
}
```

```typescript title="src/api/profile/route.ts"
import type { PeaqueRequest } from '@peaque/framework';
import { requireAuth } from '../../utils/auth';

export async function GET(req: PeaqueRequest) {
  // The request context is automatically available to requireAuth()
  const userId = await requireAuth();

  req.send({ userId, profile: {} });
}
```

:::info
The `useCurrentRequest()` hook works in API routes, server actions, and middleware. It provides access to the current request context without needing to pass the request object through function parameters.

See the [Server Actions](/docs/server-actions#the-usecurrentrequest-hook) documentation for more details.
:::

## Next Steps

- Learn about [Server Actions](/docs/server-actions) for calling server functions from React components
- Add [Middleware](/docs/api-middleware) to protect routes or transform requests
- Use [Environment Variables](/docs/environment) to configure your API
