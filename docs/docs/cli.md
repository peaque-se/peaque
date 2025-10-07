---
sidebar_position: 11
---

# Peaque CLI

The Peaque CLI is the primary command-line interface for developing, building, and running Peaque Framework applications.

## Installation

Install the Peaque CLI globally to access framework commands:

```bash
npm install -g @peaque/framework
```

Or install locally in your project:

```bash
npm install @peaque/framework
```

## Commands

### Development Server

Start the development server with Hot Module Replacement:

```bash
peaque dev
```

**Options:**
- `-p, --port <port>`: Change the port (default: 3000)
- `-b, --base <path>`: Load project from different directory
- `-n, --no-strict`: Disable React Strict Mode

**Example:**
```bash
# Start on port 8080
peaque dev --port 8080

# Run from different directory
peaque dev --base ./my-project

# Disable strict mode
peaque dev --no-strict
```

### Build for Production

Build your application for production deployment:

```bash
peaque build
```

**Options:**
- `-o, --output <output>`: Specify output directory (default: ./dist)
- `-b, --base <path>`: Load project from different directory
- `--analyze`: Print bundle size breakdown
- `--no-asset-rewrite`: Disable automatic asset path rewriting
- `--serverless-frontend`: Build for serverless deployment (AWS S3 + CloudFront)

**Examples:**
```bash
# Build to custom directory
peaque build --output ./build

# Analyze bundle sizes
peaque build --analyze

# Build for serverless deployment
peaque build --serverless-frontend
```

### Production Server

Start the production server from built files:

```bash
peaque start
```

**Options:**
- `-b, --base <path>`: Load project from different directory
- `-p, --port <port>`: Change the port (default: 3000)

**Example:**
```bash
# Start on port 8080
peaque start --port 8080
```

## Workflow Examples

### Complete Development Workflow

```bash
# 1. Create a new project (using the create CLI)
npm create @peaque/framework@latest my-app
cd my-app

# 2. Start development
peaque dev

# 3. Build for production
peaque build

# 4. Start production server
peaque start
```

### Custom Build Configuration

```bash
# Build with analysis and custom output
peaque build --analyze --output ./production-build

# Start from custom directory
peaque start --base ./production-build --port 8080
```

## Configuration

The CLI automatically detects your project structure and uses sensible defaults. Configuration is primarily done through command-line flags. The CLI does load your project's `.env` files when running the development server, but does not read environment variables for its own configuration.

## Troubleshooting

### Common Issues

**"Command not found"**
```bash
# Ensure global installation
npm install -g @peaque/framework

# Or use npx
npx @peaque/framework dev

# Or install locally
npm install @peaque/framework
npx peaque dev
```

**Port already in use**
```bash
# Use a different port
peaque dev --port 3001
```

**Build fails**
```bash
# Check for TypeScript errors
npx tsc --noEmit

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Production server won't start**
```bash
# Ensure you've built the project first
peaque build

# Check if dist/main.cjs exists
ls -la dist/
```

### Debug Mode

Enable full stack traces for debugging:

```bash
peaque dev --full-stack-traces
```

## Advanced Usage

### Monorepo Support

Use the `--base` flag to work with Peaque apps in monorepos:

```bash
# From monorepo root
peaque dev --base packages/my-app
peaque build --base packages/my-app --output packages/my-app/dist
```

### CI/CD Integration

The CLI is designed for automation:

```yaml
# GitHub Actions example
- name: Install Peaque CLI
  run: npm install -g @peaque/framework

- name: Build application
  run: peaque build --output ./dist

- name: Start production server
  run: peaque start --port 8080
```

### Environment Variables

Note: The Peaque CLI does not currently read environment variables for its own configuration. All settings must be provided via command-line flags. However, when running `peaque dev`, the CLI does load your project's `.env` files so they are available to your application code.

## Version Information

Check your CLI version:

```bash
peaque --version
```

The CLI automatically checks for updates on startup and will notify you when new versions are available.