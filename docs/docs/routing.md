---
sidebar_position: 2
---

# File-Based Routing

Peaque uses a file-based routing system where the file structure in your `pages/` directory determines your application's routes.

## Basic Routes

Create a `page.tsx` file in any directory to define a route:

```tsx title="src/pages/page.tsx"
export default function Home() {
  return <h1>Welcome to Peaque!</h1>;
}
```

This creates a route at `/`.

```tsx title="src/pages/about/page.tsx"
export default function About() {
  return <h1>About Us</h1>;
}
```

This creates a route at `/about`.

## Dynamic Routes

Use square brackets `[param]` to create dynamic route segments:

```tsx title="src/pages/blog/[slug]/page.tsx"
import { useParams } from '@peaque/framework';

export default function BlogPost() {
  const { slug } = useParams();
  return <h1>Blog Post: {slug}</h1>;
}
```

This matches routes like:
- `/blog/hello-world`
- `/blog/my-first-post`


## Nested Routes

Create nested routes by nesting directories:

```
pages/
├── page.tsx              → /
├── dashboard/
│   ├── page.tsx          → /dashboard
│   ├── settings/
│   │   └── page.tsx      → /dashboard/settings
│   └── profile/
│       └── page.tsx      → /dashboard/profile
```

## Route Parameters

Access route parameters in your components:

```tsx
import { useParams, useSearchParams } from '@peaque/framework';

export default function ProductPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const category = searchParams.get('category');

  return (
    <div>
      <h1>Product {id}</h1>
      {category && <p>Category: {category}</p>}
    </div>
  );
}
```

You can also access parameters from dynamic route segments directly as props:

```tsx title="src/pages/blog/[slug]/edit/page.tsx"
type EditBlogPostProps = {
  slug: string
}

export default function EditBlogPost({ slug } : EditBlogPostProps) {
  return <h1>Edit blog Post: {slug}</h1>;
}
```


## Navigation

Use the built-in Link component or navigation hooks:

```tsx
import { Link, useNavigate } from '@peaque/framework';

export default function Navigation() {
  const navigate = useNavigate();

  return (
    <nav>
      <Link to="/">Home</Link>
      <Link to="/about">About</Link>
      <button onClick={() => navigate('/contact')}>
        Contact Us
      </button>
    </nav>
  );
}
```

## Catch-All Routes

Create a catch-all route using `[...slug]`:

```tsx title="src/pages/docs/[...slug]/page.tsx"
import { useParams } from '@peaque/framework';

export default function DocsPage() {
  const { slug } = useParams();
  // slug will be the rest of the path: 'guide/routing/basics'
  return <h1>Docs: {slug}</h1>;
}
```

This matches:
- `/docs/guide`
- `/docs/guide/routing`
- `/docs/guide/routing/basics`

## Route Groups

Use parentheses to group routes without affecting the URL path. This allows you to organize your routes logically without changing the URL structure:

```
pages/
├── (auth)/
│   ├── login/page.tsx     → /login
│   └── register/page.tsx  → /register
├── (dashboard)/
│   ├── page.tsx           → /dashboard
│   └── settings/page.tsx  → /dashboard/settings
```

Route groups are useful for applying layouts or middleware to a group of routes without including the group name in the URL.
