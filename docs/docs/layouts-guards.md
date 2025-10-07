---
sidebar_position: 3
---

# Layouts and Guards

Layouts and guards help you create reusable UI wrappers and protect routes with authentication logic.

## Layouts

Layouts wrap your pages with shared UI elements like headers, footers, and sidebars.

### Creating a Layout

Create a `layout.tsx` file in any directory:

```tsx title="src/pages/dashboard/layout.tsx"
export default function DashboardLayout({ children }) {
  return (
    <div>
      <header>
        <h1>Dashboard</h1>
        <nav>
          <a href="/dashboard">Overview</a>
          <a href="/dashboard/settings">Settings</a>
        </nav>
      </header>
      <main>
        {children}
      </main>
      <footer>© 2025 My App</footer>
    </div>
  );
}
```

### Nested Layouts

Layouts can be nested for complex page structures:

```
pages/
├── layout.tsx              → Root layout (all pages)
├── page.tsx                → /
├── dashboard/
│   ├── layout.tsx          → Dashboard layout
│   ├── page.tsx            → /dashboard
│   └── settings/
│       ├── layout.tsx      → Settings layout
│       └── page.tsx        → /dashboard/settings
```

Each page will be wrapped by all parent layouts:

```
Root Layout
  └── Dashboard Layout
      └── Settings Layout
          └── Page
```

## Guards

Guards protect routes by running authentication or authorization logic before rendering.

### Creating a Guard

Create a `guard.ts` file:

```typescript title="src/pages/dashboard/guard.ts"
export default async function dashboardGuard({ path, params, pattern }) {
  const token = localStorage.getItem('auth_token');

  if (!token) {
    // Redirect to login if not authenticated
    return '/login';
  }

  // Verify token
  const isValid = await verifyToken(token);
  if (!isValid) {
    return '/login';
  }

  // Allow access
  return true;
}
```

### Guard Parameters

Guards receive an object with:

- `path`: The current URL path
- `params`: Route parameters (e.g., `{ id: '123' }` for `/users/:id`)
- `pattern`: The route pattern (e.g., `/users/:id`)

### Guard Return Values

Guards can return:

- `true`: Allow access
- `string`: Redirect to the specified path
- `Promise<boolean | string>`: Async version

```typescript
// Allow access
return true;

// Redirect
return '/login';

// Async guard
export default async function asyncGuard({ path, params, pattern }) {
  const user = await fetchUser(params.id);
  return user ? true : '/login';
}
```

### Multiple Guards

Apply guards at different levels:

```
pages/
├── dashboard/
│   ├── guard.ts          → Applies to all dashboard routes
│   ├── layout.tsx
│   ├── page.tsx
│   └── admin/
│       ├── guard.ts      → Additional guard for admin routes
│       └── page.tsx
```

Guards run from parent to child. All guards must return `true` for the page to render. If any guard returns a string, the user is redirected to that path.

## Example: Protected Dashboard

Complete example with layout and guard:

```typescript title="src/pages/dashboard/guard.ts"
export default async function authGuard({ path, params, pattern }) {
  const session = localStorage.getItem('session');

  if (!session) {
    return '/login';
  }

  const user = await getUserFromSession(session);
  return user ? true : '/login';
}
```

```tsx title="src/pages/dashboard/layout.tsx"
export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-6">
          <h1>Dashboard</h1>
          <nav className="mt-4 space-x-4">
            <a href="/dashboard">Home</a>
            <a href="/dashboard/profile">Profile</a>
            <a href="/dashboard/settings">Settings</a>
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
```

```tsx title="src/pages/dashboard/page.tsx"
export default function DashboardHome() {
  return (
    <div>
      <h2>Welcome back!</h2>
      <p>This is your dashboard.</p>
    </div>
  );
}
```
