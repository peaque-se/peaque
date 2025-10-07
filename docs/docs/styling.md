---
sidebar_position: 7
---

# Styling with Tailwind CSS

Peaque Framework comes with built-in support for Tailwind CSS 4, providing a modern utility-first CSS framework.

## Getting Started

Create a `styles.css` file in your project root:

```css title="styles.css"
@import "tailwindcss";
```

That's it! Tailwind CSS 4 is automatically configured and ready to use.

## Using Tailwind in Components

Use Tailwind utility classes directly in your components:

```tsx title="src/pages/page.tsx"
export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-white mb-4">
          Welcome to Peaque
        </h1>
        <p className="text-lg text-white/90">
          The last JavaScript framework you'll ever need.
        </p>
        <button className="mt-8 px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg shadow-lg hover:bg-gray-100 transition">
          Get Started
        </button>
      </div>
    </div>
  );
}
```

## Custom Styles

Add custom CSS alongside Tailwind utilities:

```css title="styles.css"
@import "tailwindcss";

/* Custom styles */
.custom-gradient {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.glass-effect {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}
```

Use them in your components:

```tsx
<div className="custom-gradient p-8">
  <div className="glass-effect p-6 rounded-xl">
    <h2>Glass Effect Card</h2>
  </div>
</div>
```

## Tailwind Configuration

Customize Tailwind by adding CSS variables and custom utilities:

```css title="styles.css"
@import "tailwindcss";

@theme {
  --color-primary: #3b82f6;
  --color-secondary: #8b5cf6;
  --font-display: 'Inter', sans-serif;
}

/* Custom utilities */
.text-balance {
  text-wrap: balance;
}
```

Then use them:

```tsx
<h1 className="text-primary font-display text-balance">
  Beautifully Balanced Heading
</h1>
```

## Responsive Design

Use Tailwind's responsive modifiers:

```tsx
export default function ResponsiveCard() {
  return (
    <div className="
      w-full
      sm:w-1/2
      md:w-1/3
      lg:w-1/4
      p-4
      bg-white
      rounded-lg
      shadow-md
      hover:shadow-xl
      transition
    ">
      <h3 className="text-lg md:text-xl lg:text-2xl font-bold">
        Responsive Card
      </h3>
      <p className="text-sm md:text-base text-gray-600">
        Adapts to screen size
      </p>
    </div>
  );
}
```

## Dark Mode

Enable dark mode with the `dark:` modifier:

```tsx
export default function DarkModeExample() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <h1 className="text-gray-900 dark:text-white">
        Automatically adapts to system preference
      </h1>
      <p className="text-gray-600 dark:text-gray-300">
        Use dark: prefix for dark mode styles
      </p>
    </div>
  );
}
```

## Component Patterns

### Button Component

```tsx title="src/components/Button.tsx"
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline';
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({ variant = 'primary', children, onClick }: ButtonProps) {
  const baseStyles = "px-6 py-3 font-semibold rounded-lg transition";

  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-600 text-white hover:bg-gray-700",
    outline: "border-2 border-blue-600 text-blue-600 hover:bg-blue-50",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
```

### Card Component

```tsx title="src/components/Card.tsx"
interface CardProps {
  title: string;
  description: string;
  children?: React.ReactNode;
}

export function Card({ title, description, children }: CardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition">
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-300 mb-4">
        {description}
      </p>
      {children}
    </div>
  );
}
```

## Hot Module Replacement

CSS changes are automatically reflected in the browser without a full page reload during development. Just save your `styles.css` file and see the changes instantly.

## Production Optimization

In production builds, Peaque automatically:

- Purges unused CSS
- Minifies the output
- Optimizes for performance

No configuration needed!

## Best Practices

1. **Use utility classes first** - Tailwind provides most of what you need
2. **Extract components** - Create reusable React components for repeated patterns
3. **Use CSS variables** - For theme values that change
4. **Keep styles close to components** - Co-locate styles with their components
5. **Leverage responsive modifiers** - Build mobile-first, then enhance for larger screens
