---
sidebar_position: 10
---

# Head Management

Peaque provides a powerful head management system to dynamically add metadata, scripts, styles, and other head elements to your pages. This is essential for SEO, social media sharing, and customizing the document head per page.

## Overview

The `head.ts` module exports types and utilities for defining and merging head elements. It allows you to specify titles, meta tags, links, scripts, styles, and custom elements that get rendered into the HTML `<head>` tag.

## HeadDefinition Interface

The core interface for defining head elements:

```typescript
interface HeadDefinition {
  title?: string
  meta?: Array<{
    name?: string
    property?: string
    httpEquiv?: string
    charset?: string
    content?: string
  }>
  link?: Array<{
    rel: string
    href: string
    as?: string
    type?: string
    sizes?: string
    media?: string
    crossOrigin?: "anonymous" | "use-credentials" | ""
  }>
  script?: Array<{
    src?: string
    type?: string
    async?: boolean
    defer?: boolean
    innerHTML?: string
  }>
  style?: Array<{
    type?: string
    innerHTML: string
  }>
  extra?: Array<Record<string, any>>
}
```

## Usage in Pages

Head definitions are specified in separate `head.ts` files alongside your page components. The framework automatically discovers and merges these files based on the route hierarchy.

Create a `head.ts` file in the same directory as your page:

```typescript
import { HeadDefinition } from '@peaque/framework'

const head: HeadDefinition = {
  title: 'My Page Title',
  meta: [
    { name: 'description', content: 'Page description for SEO' },
    { property: 'og:title', content: 'Open Graph title' },
    { property: 'og:description', content: 'Open Graph description' },
    { property: 'og:image', content: '/images/og-image.png' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' },
    { rel: 'stylesheet', href: '/custom-styles.css' }
  ]
}

export default head
```

The head definition must be the **default export** of the `head.ts` file.

## File Location and Naming

Head files must be named `head.ts` and placed in the same directory as your page components. The framework automatically discovers them based on the file-based routing structure:

```
src/pages/
├── page.tsx          # Your page component
├── head.ts           # Head definition for this page
├── about/
│   ├── page.tsx      # About page
│   └── head.ts       # Head for about page
└── blog/
    ├── page.tsx      # Blog listing
    ├── head.ts       # Head for blog listing
    └── [slug]/
        ├── page.tsx  # Individual blog post
        └── head.ts   # Head for blog post (can be dynamic)
```

Like layouts, head definitions are **stacked** - parent head files are merged with child head files following the same hierarchy as your route structure.

## Merging Head Definitions

When using layouts or nested components, head definitions are merged automatically. Child head definitions override parent ones where they conflict:

- **Title**: Child title takes precedence
- **Meta tags**: Merged by `name`, `property`, or `httpEquiv`; child overrides parent
- **Links**: Merged by `rel` + `href`; child overrides parent
- **Scripts**: Merged by `src`; child overrides parent
- **Styles**: Merged by `type` + `innerHTML`; child overrides parent
- **Extra elements**: Simply concatenated

## Advanced Examples

### Adding Scripts

```typescript
import { HeadDefinition } from '@peaque/framework'

const head: HeadDefinition = {
  script: [
    {
      src: 'https://example.com/analytics.js',
      async: true
    },
    {
      innerHTML: 'console.log("Inline script");'
    }
  ]
}

export default head
```

### Adding Styles

```typescript
import { HeadDefinition } from '@peaque/framework'

const head: HeadDefinition = {
  style: [
    {
      type: 'text/css',
      innerHTML: 'body { background-color: #f0f0f0; }'
    }
  ]
}

export default head
```

### Custom Elements

Use the `extra` array for any custom head elements:

```typescript
import { HeadDefinition } from '@peaque/framework'

const head: HeadDefinition = {
  extra: [
    { tag: 'base', href: '/app/' },
    { tag: 'noscript', innerHTML: '<p>JavaScript is required</p>' }
  ]
}

export default head
```

## Asset Prefixing

URLs in `href` and `src` attributes are automatically prefixed with the asset prefix (if configured) for proper asset loading in production.

## Rendering

The framework automatically renders the merged head definition into the HTML document head. You don't need to manually call any rendering functions in your page code.