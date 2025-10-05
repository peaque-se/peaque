# Usage Guide

## Quick Start

### Creating a New Project

```bash
# Using npm
npm create @peaque/framework@latest

# Using yarn
yarn create @peaque/framework

# Using pnpm
pnpm create @peaque/framework

# With project name
npm create @peaque/framework@latest my-awesome-app
```

## Interactive Prompts

The CLI will guide you through:

1. **Project Name** - Enter your project name (letters, numbers, hyphens, underscores)
2. **Template Selection** - Choose from available templates (currently: basic)
3. **Dependency Installation** - Optionally auto-install dependencies

## Command Line Arguments

You can pass the project name as the first argument:

```bash
npm create @peaque/framework@latest my-project
```

This will pre-fill the project name prompt.

## What Gets Created

```
my-project/
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

## After Creation

Navigate to your project and start developing:

```bash
cd my-project

# Start development server
npm run dev

# Or with your preferred package manager
yarn dev
pnpm dev
```

Your app will be running at [http://localhost:3000](http://localhost:3000)

## Package Manager Detection

The CLI automatically detects which package manager you're using:

- **npm** - Default
- **yarn** - Detected from `yarn create` or environment
- **pnpm** - Detected from `pnpm create` or environment

Installation commands and next steps are tailored to your package manager.

## Environment Variables

The created project includes:

- `.env.example` - Template with all available variables
- `.env` - Your local environment file (git-ignored)

## Customization

After creation, you can:

1. Modify `src/pages/page.tsx` to change the home page
2. Add new pages in `src/pages/`
3. Create API routes in `src/api/`
4. Update `src/styles.css` for global styles
5. Configure TypeScript in `tsconfig.json`

## Troubleshooting

### "Project already exists"

The CLI won't overwrite existing directories. Choose a different name or remove the existing directory.

### Installation fails

If automatic installation fails:

```bash
cd your-project
npm install  # or yarn/pnpm
```

### Permission errors on Windows

Run your terminal as administrator or use `npx` instead of `npm create`.

## Next Steps

Check out the [Peaque Framework documentation](https://peaque.dev/framework/docs) to learn about:

- File-based routing
- API routes
- Route guards
- Layouts
- WebSocket support
- Cookie management

Happy coding! 🚀
