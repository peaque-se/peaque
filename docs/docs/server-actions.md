---
sidebar_position: 5
---

# Server Actions

Server actions provide a seamless way to call server-side functions directly from your React components, with automatic RPC handling and type safety.

## What are Server Actions?

Server actions are TypeScript functions that run exclusively on the server. They allow you to perform secure operations like database queries, authentication checks, and API calls without exposing sensitive logic to the client.

## Creating a Server Action

Create a file with the `'use server'` directive at the top:

```typescript title="src/actions/user-actions.ts"
'use server'

import { useCurrentRequest } from '@peaque/framework/server'

export async function updateUserProfile(data: { name: string; email: string }) {
  // This code runs only on the server
  const req = useCurrentRequest()

  // Check authentication
  const userId = req.cookies().get('user-id')
  if (!userId) {
    throw new Error('Unauthorized')
  }

  // Perform database operation
  // await db.users.update(userId, data)

  return { success: true, message: 'Profile updated' }
}

export async function deleteAccount() {
  const req = useCurrentRequest()

  const userId = req.cookies().get('user-id')
  if (!userId) {
    throw new Error('Unauthorized')
  }

  // Delete user account
  // await db.users.delete(userId)

  return { success: true }
}
```

You can also use default exports for single-action files:

```typescript title="src/actions/get-user.ts"
'use server'

import { useCurrentRequest } from '@peaque/framework/server'

export default async function getUser() {
  const req = useCurrentRequest()
  const userId = req.cookies().get('user-id')

  if (!userId) {
    throw new Error('Unauthorized')
  }

  // Fetch user from database
  // const user = await db.users.findById(userId)

  return { id: userId, name: 'John Doe', email: 'john@example.com' }
}
```

Then import and use it:

```tsx title="src/pages/profile/page.tsx"
import getUser from '../../actions/get-user'

export default function ProfilePage() {
  // Use the default export
  const user = await getUser()
  // ...
}
```

## Using Server Actions in Components

Import and call server actions directly from your React components:

```tsx title="src/pages/profile/page.tsx"
import { useState } from 'react'
import { updateUserProfile } from '../../actions/user-actions'

export default function ProfilePage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
    }

    try {
      // Call server action - automatically handled as RPC
      const result = await updateUserProfile(data)
      setMessage(result.message)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1>Update Profile</h1>
      <form onSubmit={handleSubmit}>
        <input name="name" placeholder="Name" required />
        <input name="email" type="email" placeholder="Email" required />
        <button type="submit" disabled={loading}>
          {loading ? 'Updating...' : 'Update Profile'}
        </button>
      </form>
      {message && <p>{message}</p>}
    </div>
  )
}
```

## The `useCurrentRequest` Hook

The `useCurrentRequest` hook provides access to the current HTTP request context within server actions. This is essential for authentication, accessing cookies, headers, and request metadata.

### Basic Usage

```typescript
'use server'

import { useCurrentRequest } from '@peaque/framework/server'

export async function getUser() {
  const req = useCurrentRequest()

  // Access cookies
  const sessionToken = req.cookies().get('session')

  // Access headers
  const userAgent = req.requestHeader('user-agent')

  // Access request metadata
  const ip = req.ip()
  const path = req.path()

  return { sessionToken, userAgent, ip, path }
}
```

### Authentication Example

```typescript
'use server'

import { useCurrentRequest } from '@peaque/framework/server'

async function requireAuth(): Promise<string> {
  const req = useCurrentRequest()
  const token = req.cookies().get('auth-token')

  if (!token) {
    throw new Error('Authentication required')
  }

  // Verify token and return user ID
  // const userId = await verifyToken(token)
  return 'user-id-123'
}

export async function updateSettings(settings: Record<string, any>) {
  const userId = await requireAuth()

  // Update user settings in database
  // await db.settings.update(userId, settings)

  return { success: true }
}

export async function getUserData() {
  const userId = await requireAuth()

  // Fetch user data from database
  // const userData = await db.users.findById(userId)

  return { user: { id: userId, name: 'John Doe' } }
}
```

### Request Context API

The `PeaqueRequest` object returned by `useCurrentRequest()` provides:

- **`body<T>(): T`** - Get parsed request body
- **`rawBody(): Buffer | undefined`** - Get raw request body buffer
- **`param(name: string): string | undefined`** - Get path or query parameter
- **`pathParam(name: string): string | undefined`** - Get path parameter
- **`queryParam(name: string): string | undefined`** - Get query parameter
- **`requestHeader(name: string): string | undefined`** - Get request header
- **`cookies(): CookieJar`** - Access cookies
- **`method(): HttpMethod`** - Get HTTP method (GET, POST, etc.)
- **`path(): string`** - Get request path
- **`originalUrl(): string`** - Get original URL with query string
- **`ip(): string`** - Get client IP address

### Error Handling

If `useCurrentRequest()` is called outside of a request context, it throws an error:

```typescript
'use server'

import { useCurrentRequest, tryGetCurrentRequest } from '@peaque/framework/server'

export async function myAction() {
  // This will throw if not in a request context
  const req = useCurrentRequest()

  // Safe alternative that returns undefined if not in context
  const maybeReq = tryGetCurrentRequest()
  if (!maybeReq) {
    // Handle case where no request context is available
    return { error: 'No request context' }
  }
}
```

## How Server Actions Work

When you create a file with the `'use server'` directive, the framework automatically handles the client-server communication:

1. **Build Time**: The framework detects server action files and generates client-side stubs
2. **Runtime**: When you call a server action from your component, it's automatically executed on the server via RPC
3. **Type Safety**: Full TypeScript type inference is maintained between client and server
4. **Serialization**: Data is automatically serialized and deserialized, preserving complex types

This happens seamlessly in both development and production modes, allowing you to focus on your application logic rather than RPC implementation details.

## Data Serialization

Server actions use [SuperJSON](https://github.com/blitz-js/superjson) for serialization, which supports:

- All JSON-compatible types
- Dates
- RegExp
- Maps and Sets
- BigInt
- Typed Arrays
- `undefined` and `NaN`

```typescript
'use server'

export async function getEvents() {
  return {
    events: [
      { name: 'Event 1', date: new Date('2025-01-15') },
      { name: 'Event 2', date: new Date('2025-02-20') },
    ],
    metadata: new Map([['total', 2], ['page', 1]]),
  }
}
```

## Best Practices

### 1. Keep Actions Focused

Each server action should do one thing well:

```typescript
'use server'

// Good: Single responsibility
export async function createPost(data: { title: string; content: string }) {
  const userId = await requireAuth()
  // Create post
  return { postId: 'new-post-id' }
}

// Bad: Multiple responsibilities
export async function createPostAndNotifyUsers(data: any) {
  // Too many things happening in one action
}
```

### 2. Validate Input

Always validate and sanitize input data:

```typescript
'use server'

import { z } from 'zod'

const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(0).max(150).optional(),
})

export async function updateProfile(data: unknown) {
  // Validate input
  const validated = UpdateProfileSchema.parse(data)

  const userId = await requireAuth()
  // Update with validated data
  return { success: true }
}
```

### 3. Handle Errors Properly

Throw descriptive errors that are safe to send to clients:

```typescript
'use server'

export async function deletePost(postId: string) {
  const userId = await requireAuth()

  // const post = await db.posts.findById(postId)
  // if (!post) {
  //   throw new Error('Post not found')
  // }

  // if (post.authorId !== userId) {
  //   throw new Error('Not authorized to delete this post')
  // }

  // await db.posts.delete(postId)

  return { success: true }
}
```

### 4. Use TypeScript Types

Leverage TypeScript for type safety:

```typescript
'use server'

interface User {
  id: string
  name: string
  email: string
}

interface CreateUserInput {
  name: string
  email: string
  password: string
}

export async function createUser(input: CreateUserInput): Promise<User> {
  // Type-safe implementation
  return {
    id: 'new-user-id',
    name: input.name,
    email: input.email,
  }
}
```

### 5. Log Important Actions

Log security-relevant actions for auditing:

```typescript
'use server'

import { useCurrentRequest } from '@peaque/framework/server'

export async function deleteAccount() {
  const req = useCurrentRequest()
  const userId = await requireAuth()
  const ip = req.ip()

  console.log(`Account deletion requested by user ${userId} from IP ${ip}`)

  // Delete account

  return { success: true }
}
```

## Limitations

- Server actions must be `async` functions
- All exported functions in a server action file must be async
- Arguments and return values must be serializable with SuperJSON
- Server actions run in a Node.js environment, not in the browser

## Comparison with API Routes

| Feature | Server Actions | API Routes |
|---------|---------------|------------|
| **Usage** | Called directly from React components | Called via `fetch()` or HTTP client |
| **Type Safety** | Full TypeScript type inference | Manual type definitions needed |
| **RPC** | Automatic | Manual implementation |
| **Authentication** | Via `useCurrentRequest()` | Via `req` parameter |
| **Use Case** | React component data mutations | Public APIs, webhooks, third-party integrations |

Both approaches are valid and can be used together in the same application. Use server actions for component-specific mutations and API routes for REST endpoints.
