---
sidebar_position: 1
---

# Getting Started

Welcome to **Peaque Framework**.

Peaque is a full-stack TypeScript web framework that combines file-based routing, React, Tailwind CSS 4, and Hot Module Replacement with zero configuration.

## Quick Start

### Installation

Create a new Peaque project:

```bash npm2yarn
npm create @peaque/framework@latest my-app
cd my-app
npm run dev
```

Or add Peaque to an existing project:

```bash npm2yarn
npm install @peaque/framework
```

### What you'll need

- [Node.js](https://nodejs.org/en/download/) version 18.0 or above
- A code editor (VS Code recommended)

## Peaque CLI Tool

Peaque comes with a powerful CLI tool that streamlines your development workflow. The `peaque` command provides essential commands for development, building, and running your applications.

Key commands include:
- `peaque dev` - Start the development server with hot reload
- `peaque build` - Build your application for production
- `peaque start` - Run the production server

We're actively developing additional CLI features for deployment, database management, and more advanced workflows. Stay tuned for updates!

## Your First App

Once installed, start the development server:

```bash npm2yarn
npm run dev
```

Your app will be running at `http://localhost:3000` with Hot Module Replacement enabled.

## Project Structure

Peaque automatically detects your project structure:

```
my-app/
├── src/
│   ├── api/
│   │   └── hello/
│   │       └── route.ts      # Example API endpoint
│   ├── pages/
│   │   └── page.tsx          # Home page
│   ├── public/
│   │   └── peaque.png        # Static assets
│   └── styles.css            # Tailwind CSS styles
├── .env                       # Environment variables (copied from .env.example)
├── .env.example               # Environment template
├── .gitignore                 # Git ignore rules
├── package.json               # Project configuration
├── README.md                  # Project documentation
└── tsconfig.json              # TypeScript configuration
```

## What's Next?

- Learn about the [Peaque CLI](./cli) for development commands
- Learn about [File-Based Routing](./routing)
- Create [API Routes](./api-routes)
- Explore [Layouts and Guards](./layouts-guards)
- Configure [Environment Variables](./environment)
