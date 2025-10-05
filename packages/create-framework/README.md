# @peaque/create-framework

Official scaffolding tool for [Peaque Framework](https://peaque.dev/framework) applications.

## Usage

### With NPM

```bash
npm create @peaque/framework@latest
```

### With Yarn

```bash
yarn create @peaque/framework
```

### With PNPM

```bash
pnpm create @peaque/framework
```

### With a project name

```bash
npm create @peaque/framework@latest my-app
cd my-app
npm run dev
```

## Features

- **Interactive CLI** - User-friendly prompts powered by @clack/prompts
- **Package Manager Detection** - Automatically detects and uses npm, yarn, or pnpm
- **Multiple Templates** - Choose from different starter templates
- **Fast Setup** - Get started in seconds with zero configuration
- **Smart Defaults** - Includes .env setup, .gitignore, and more
- **Validation** - Ensures project names are valid and directories don't exist

## What's Included

Each scaffolded project includes:

- **TypeScript** configuration with strict mode
- **Tailwind CSS** with PostCSS setup
- **File-based routing** structure
- **API routes** example
- **Environment variables** template (.env.example)
- **Git ignore** configuration
- **README** with quick start guide

## Templates

### Basic

A simple starter template with:
- Home page example
- API route example
- Tailwind CSS styling
- Static assets support

More templates coming soon!

## Development

To work on this package:

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build the package
npm run build

# Test the CLI
npm test
```

## Project Structure

```
@peaque/create-framework/
├── src/
│   └── cli.ts          # Main CLI logic
├── templates/
│   └── basic/          # Basic template
│       ├── src/
│       │   ├── api/
│       │   ├── pages/
│       │   ├── public/
│       │   └── styles.css
│       ├── .env.example
│       ├── .gitignore
│       ├── package.json
│       ├── README.md
│       └── tsconfig.json
├── dist/               # Built output
├── package.json
└── tsconfig.json
```

## Publishing

This package is designed to be used with `npm create`, which requires publishing to npm registry.

```bash
npm run build
npm publish --access public
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
