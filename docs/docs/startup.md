---
sidebar_position: 8
---

# Startup Tasks

Startup tasks allow you to run initialization code when your Peaque application starts up. This is useful for setting up databases, loading configuration, initializing services, or performing any other one-time setup operations.

## Creating a Startup Script

Create a `startup.ts` file in the `src/` directory. This file will be automatically executed when the server starts.

```typescript title="src/startup.ts"
// Example startup script
console.log('Application is starting up...');

// Initialize database connection
await initializeDatabase();

// Load configuration
const config = await loadConfig();

// Set up external services
await setupExternalServices();

// Any other initialization logic
console.log('Startup complete!');
```

## When Startup Scripts Run

Startup scripts are executed:

- **Development**: When you run `npm run dev` or `peaque dev`
- **Production**: When the built application starts
- **Only once**: At server startup, not on every request or hot reload

## Use Cases

Startup scripts are perfect for:

- Database migrations and seeding
- Establishing database connections
- Loading and validating environment configuration
- Initializing third-party services (payment processors, email services, etc.)
- Setting up caches or in-memory data structures
- Registering background services
- Loading machine learning models
- Any other initialization that should happen once at startup

## Best Practices

### Error Handling

Always wrap your startup logic in proper error handling. If your startup script throws an error, the server will fail to start.

```typescript title="src/startup.ts"
try {
  console.log('Starting application initialization...');

  // Your initialization code here
  await initializeDatabase();
  await setupServices();

  console.log('Application initialized successfully!');
} catch (error) {
  console.error('Failed to initialize application:', error);
  process.exit(1); // Exit with error code to prevent server from starting
}
```

### Async Operations

Startup scripts support async operations. The server will wait for your startup script to complete before accepting requests.

```typescript title="src/startup.ts"
export async function initializeApp() {
  // Database setup
  const db = await connectToDatabase();

  // Load initial data
  await db.seedInitialData();

  // Start background services
  startBackgroundWorkers();

  return db;
}

// This will be called automatically
initializeApp();
```

### Environment-Specific Logic

You can use environment variables to run different logic in different environments:

```typescript title="src/startup.ts"
if (process.env.NODE_ENV === 'production') {
  // Production-specific initialization
  await setupProductionServices();
} else {
  // Development-specific initialization
  await setupDevelopmentServices();
}
```

### Logging

Use console logging to track startup progress. The framework will display startup script execution in the console.

```typescript title="src/startup.ts"
console.log('🚀 Starting application...');
console.log('📊 Initializing database...');
// ... initialization code ...
console.log('✅ Database ready');
console.log('🔧 Setting up services...');
// ... more code ...
console.log('✅ Services configured');
console.log('🎉 Application startup complete!');
```

## File Location

The startup script must be located at `src/startup.ts` in your project root. The framework automatically detects and executes this file if it exists.

## Comparison with Jobs

Startup scripts are different from [scheduled jobs](./jobs.md):

- **Startup scripts**: Run once when the server starts
- **Jobs**: Run repeatedly on a schedule

Use startup scripts for initialization, and jobs for ongoing background tasks.