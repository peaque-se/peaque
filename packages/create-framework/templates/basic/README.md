# Peaque Framework App

This is a [Peaque Framework](https://peaque.dev/framework) project bootstrapped with `create-peaque-app`.

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/pages/page.tsx`. The page auto-updates as you edit the file.

API routes can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint is defined in `src/api/hello/route.ts`.

## Project Structure

```
.
├── src/
│   ├── pages/          # Page routes
│   │   └── page.tsx    # Home page (/)
│   ├── api/            # API routes
│   │   └── hello/
│   │       └── route.ts # API endpoint (/api/hello)
│   ├── public/         # Static assets
│   │   └── peaque.png  # Logo
│   └── styles.css      # Global styles (Tailwind CSS)
├── .env.example        # Environment variables template
├── package.json
└── tsconfig.json
```

## Learn More

To learn more about Peaque Framework, check out the following resources:

- [Peaque Framework Documentation](https://peaque.dev/framework/docs) - learn about Peaque features and API.

## Features

- **File-based routing** - Create pages in `src/pages/` and API routes in `src/api/`
- **TypeScript** - Full TypeScript support out of the box
- **Tailwind CSS** - Utility-first CSS framework pre-configured
- **Hot Module Replacement** - Fast refresh during development
- **API Routes** - Build your backend with simple HTTP method exports
- **Route Guards** - Protect routes with authentication logic
- **Layouts** - Share UI components across pages
- **WebSocket Support** - Real-time communication built-in

## Available Scripts

- `npm run dev` - Start development server with HMR
- `npm run build` - Build for production (Coming Soon)
- `npm run start` - Start production server (Coming Soon)

## Deployment

Production build and deployment features are coming soon in future releases.
